/**
 * Sync Status Indicator — Premium Sync State Visualization
 *
 * Shows users exactly what's happening with their data:
 * - Last synced timestamp (builds trust)
 * - Pending changes count with queue visualization
 * - Real-time sync progress
 * - iOS-optimized visual feedback
 *
 * Design Philosophy:
 * - Unobtrusive when everything is fine
 * - Clear visibility when offline or syncing
 * - Reduce user anxiety about data loss
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Cloud, CloudOff, Check, RefreshCw, ChevronDown, AlertCircle, Loader2 } from 'lucide-react';
import { usePWA } from './PWAProvider';
import { useSyncQueue } from './OfflineIndicator';
import { cn } from '@/lib/utils';

interface SyncStatusIndicatorProps {
  /** Display variant */
  variant?: 'compact' | 'full' | 'minimal';
  /** Custom class name */
  className?: string;
  /** Show even when fully synced */
  showAlways?: boolean;
}

// Format relative time in a human-friendly way
function formatRelativeTime(date: Date | null): string {
  if (!date) return 'Never synced';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 10) return 'Just now';
  if (diffSecs < 60) return `${diffSecs}s ago`;
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

// Hook to track last sync time
export function useLastSyncTime() {
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(() => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem('golf-app-last-sync');
    return stored ? new Date(stored) : null;
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Update last sync time
  const recordSync = useCallback(() => {
    const now = new Date();
    setLastSyncTime(now);
    localStorage.setItem('golf-app-last-sync', now.toISOString());
  }, []);

  // Simulate sync (in production, integrate with actual sync service)
  const triggerSync = useCallback(async () => {
    if (isSyncing) return;

    setIsSyncing(true);

    // Clear any existing timeout
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    // Simulate sync delay (in production, this would be actual API calls)
    syncTimeoutRef.current = setTimeout(() => {
      recordSync();
      setIsSyncing(false);
    }, 1500);
  }, [isSyncing, recordSync]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  return {
    lastSyncTime,
    isSyncing,
    recordSync,
    triggerSync,
    formattedTime: formatRelativeTime(lastSyncTime),
  };
}

/**
 * Main Sync Status Indicator Component
 */
export function SyncStatusIndicator({
  variant = 'compact',
  className = '',
  showAlways = false,
}: SyncStatusIndicatorProps) {
  const { isOnline } = usePWA();
  const { pendingCount, queueItems } = useSyncQueue();
  const { lastSyncTime, isSyncing, triggerSync, formattedTime } = useLastSyncTime();
  const [showQueue, setShowQueue] = useState(false);
  const [pulseAnimation, setPulseAnimation] = useState(false);

  // Determine current status
  const status = !isOnline
    ? 'offline'
    : isSyncing
      ? 'syncing'
      : pendingCount > 0
        ? 'pending'
        : 'synced';

  // Pulse animation when status changes to synced.
  // Defer state updates to avoid setState-in-effect warnings.
  useEffect(() => {
    if (status === 'synced' && lastSyncTime) {
      const startTimer = setTimeout(() => {
        setPulseAnimation(true);
        const endTimer = setTimeout(() => setPulseAnimation(false), 1000);
        return () => clearTimeout(endTimer);
      }, 0);

      return () => clearTimeout(startTimer);
    }
  }, [status, lastSyncTime]);

  // Auto-trigger sync when coming online with pending changes
  useEffect(() => {
    if (isOnline && pendingCount > 0 && !isSyncing) {
      triggerSync();
    }
  }, [isOnline, pendingCount, isSyncing, triggerSync]);

  // Don't show if synced and no pending changes (unless showAlways)
  if (!showAlways && status === 'synced' && pendingCount === 0 && !pulseAnimation) {
    return null;
  }

  // Minimal variant - just a small dot indicator
  if (variant === 'minimal') {
    return (
      <div
        className={cn(
          'w-2 h-2 rounded-full transition-colors',
          status === 'offline' && 'bg-red-500',
          status === 'syncing' && 'bg-blue-500 animate-pulse',
          status === 'pending' && 'bg-amber-500',
          status === 'synced' && 'bg-green-500',
          className
        )}
        title={`${status} - ${formattedTime}`}
      />
    );
  }

  // Compact variant - icon + text
  if (variant === 'compact') {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
          'transition-all duration-300',
          status === 'offline' && 'bg-red-500/15 text-red-600 border border-red-500/30',
          status === 'syncing' && 'bg-blue-500/15 text-blue-600 border border-blue-500/30',
          status === 'pending' && 'bg-amber-500/15 text-amber-600 border border-amber-500/30',
          status === 'synced' && 'bg-green-500/15 text-green-600 border border-green-500/30',
          pulseAnimation && 'haptic-success',
          className
        )}
      >
        {status === 'offline' && <CloudOff size={12} />}
        {status === 'syncing' && <Loader2 size={12} className="animate-spin" />}
        {status === 'pending' && <RefreshCw size={12} />}
        {status === 'synced' && <Check size={12} />}

        <span>
          {status === 'offline' && 'Offline'}
          {status === 'syncing' && 'Syncing...'}
          {status === 'pending' && `${pendingCount} pending`}
          {status === 'synced' && formattedTime}
        </span>
      </motion.div>
    );
  }

  // Full variant - detailed view with queue
  return (
    <div className={cn('rounded-xl border bg-card overflow-hidden', className)}>
      {/* Header */}
      <button
        onClick={() => pendingCount > 0 && setShowQueue(!showQueue)}
        className={cn(
          'w-full flex items-center justify-between p-3',
          'transition-colors',
          pendingCount > 0 && 'hover:bg-surface-50 cursor-pointer',
          pulseAnimation && 'haptic-success'
        )}
      >
        <div className="flex items-center gap-3">
          {/* Status icon */}
          <div
            className={cn(
              'w-8 h-8 rounded-full flex items-center justify-center',
              status === 'offline' && 'bg-red-500/15',
              status === 'syncing' && 'bg-blue-500/15',
              status === 'pending' && 'bg-amber-500/15',
              status === 'synced' && 'bg-green-500/15'
            )}
          >
            {status === 'offline' && <CloudOff size={16} className="text-red-500" />}
            {status === 'syncing' && <Loader2 size={16} className="text-blue-500 animate-spin" />}
            {status === 'pending' && <RefreshCw size={16} className="text-amber-500" />}
            {status === 'synced' && <Cloud size={16} className="text-green-500" />}
          </div>

          <div className="text-left">
            <p className="text-sm font-medium text-surface-900">
              {status === 'offline' && "You're offline"}
              {status === 'syncing' && 'Syncing changes...'}
              {status === 'pending' && `${pendingCount} changes to sync`}
              {status === 'synced' && 'All changes saved'}
            </p>
            <p className="text-xs text-surface-500">
              {status === 'offline' && 'Changes saved locally'}
              {status === 'syncing' && 'Please wait...'}
              {status === 'pending' && 'Will sync when online'}
              {status === 'synced' && `Last synced ${formattedTime}`}
            </p>
          </div>
        </div>

        {/* Expand indicator or action */}
        {pendingCount > 0 && (
          <ChevronDown
            size={16}
            className={cn('text-surface-400 transition-transform', showQueue && 'rotate-180')}
          />
        )}
      </button>

      {/* Expanded queue view */}
      <AnimatePresence>
        {showQueue && pendingCount > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-surface-200 px-3 py-2 bg-surface-50">
              <p className="text-xs font-medium text-surface-500 mb-2">Pending changes</p>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {queueItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center gap-2 text-xs">
                    <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    <span className="flex-1 truncate text-surface-700">{item.description}</span>
                    <span className="text-surface-400">
                      {new Date(item.timestamp).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                ))}
                {queueItems.length > 5 && (
                  <p className="text-xs text-surface-400 text-center pt-1">
                    +{queueItems.length - 5} more
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error state (for future use) */}
      {status === 'offline' && pendingCount > 5 && (
        <div className="border-t border-surface-200 px-3 py-2 bg-amber-50 flex items-start gap-2">
          <AlertCircle size={14} className="text-amber-600 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700">
            You have many pending changes. Connect to sync and prevent data conflicts.
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Header-embedded last synced timestamp
 * Shows only the timestamp, very unobtrusive
 */
export function LastSyncedTimestamp({ className = '' }: { className?: string }) {
  const { isOnline } = usePWA();
  const { formattedTime, isSyncing } = useLastSyncTime();

  if (isSyncing) {
    return (
      <span className={cn('text-xs text-blue-500 flex items-center gap-1', className)}>
        <Loader2 size={10} className="animate-spin" />
        Syncing...
      </span>
    );
  }

  if (!isOnline) {
    return (
      <span className={cn('text-xs text-red-500 flex items-center gap-1', className)}>
        <CloudOff size={10} />
        Offline
      </span>
    );
  }

  return <span className={cn('text-xs text-surface-400', className)}>Synced {formattedTime}</span>;
}

export default SyncStatusIndicator;
