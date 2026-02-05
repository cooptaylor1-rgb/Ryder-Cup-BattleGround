'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPendingScoreCount, syncPendingScores } from '@/lib/services/backgroundSyncService';
import { usePWA } from '@/components/PWAProvider';

/**
 * Hook to track pending sync queue status
 */
export function usePendingSyncQueue() {
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);
  const { isOnline } = usePWA();

  // Refresh pending count
  const refreshCount = useCallback(async () => {
    try {
      const count = await getPendingScoreCount();
      setPendingCount(count);
    } catch {
      // Silently fail - DB might not be initialized
    }
  }, []);

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    if (isSyncing || !isOnline) return;

    setIsSyncing(true);
    try {
      const result = await syncPendingScores();
      setLastSyncTime(new Date());
      setPendingCount(result.failed);
      return result;
    } catch (error) {
      console.error('Manual sync failed:', error);
      throw error;
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, isOnline]);

  // Poll for pending count changes
  useEffect(() => {
    refreshCount();

    // Refresh every 10 seconds
    const interval = setInterval(refreshCount, 10 * 1000);

    // Also refresh on visibility change
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshCount();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    // Listen for sync completion messages from service worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'SYNC_COMPLETE') {
        refreshCount();
        setLastSyncTime(new Date());
      }
    };
    navigator.serviceWorker?.addEventListener('message', handleMessage);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
      navigator.serviceWorker?.removeEventListener('message', handleMessage);
    };
  }, [refreshCount]);

  return {
    pendingCount,
    isSyncing,
    isOnline,
    lastSyncTime,
    refreshCount,
    triggerSync,
    hasPending: pendingCount > 0,
  };
}

interface PendingSyncIndicatorProps {
  /** Position of the indicator */
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** Whether to show when there are no pending items */
  showWhenEmpty?: boolean;
  /** Custom class name */
  className?: string;
}

/**
 * Floating indicator showing pending sync status
 */
export function PendingSyncIndicator({
  position = 'top-right',
  showWhenEmpty = false,
  className = '',
}: PendingSyncIndicatorProps) {
  const { pendingCount, isSyncing, isOnline, triggerSync } = usePendingSyncQueue();

  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-20 left-4',
    'bottom-right': 'bottom-20 right-4',
  };

  const shouldShow = showWhenEmpty || pendingCount > 0;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={() => isOnline && pendingCount > 0 && triggerSync()}
          disabled={!isOnline || pendingCount === 0 || isSyncing}
          className={`
            fixed z-40 flex items-center gap-2 px-3 py-2 rounded-full
            shadow-lg backdrop-blur-sm
            transition-colors
            ${
              pendingCount > 0
                ? isOnline
                  ? 'bg-amber-500/90 text-amber-950 active:bg-amber-600/90'
                  : 'bg-stone-500/90 text-white'
                : 'bg-masters/90 text-white'
            }
            ${positionClasses[position]}
            ${className}
          `}
          style={{
            paddingTop: position.includes('top')
              ? 'calc(0.5rem + env(safe-area-inset-top))'
              : undefined,
            paddingBottom: position.includes('bottom')
              ? 'calc(0.5rem + env(safe-area-inset-bottom))'
              : undefined,
          }}
        >
          {isSyncing ? (
            <motion.svg
              className="w-4 h-4"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </motion.svg>
          ) : pendingCount > 0 ? (
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ) : (
            <svg
              className="w-4 h-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}

          <span className="text-sm font-semibold">
            {isSyncing ? (
              'Syncing...'
            ) : pendingCount > 0 ? (
              <>
                {pendingCount} pending
                {!isOnline && <span className="ml-1 text-xs opacity-70">(offline)</span>}
              </>
            ) : (
              'Synced'
            )}
          </span>
        </motion.button>
      )}
    </AnimatePresence>
  );
}

/**
 * Compact badge showing pending count (for use in headers/nav)
 */
interface SyncBadgeProps {
  className?: string;
}

export function SyncBadge({ className = '' }: SyncBadgeProps) {
  const { pendingCount, isSyncing, isOnline } = usePendingSyncQueue();

  if (pendingCount === 0 && !isSyncing) return null;

  return (
    <span
      className={`
        inline-flex items-center justify-center
        min-w-5 h-5 px-1.5 rounded-full
        text-xs font-bold
        ${
          isSyncing
            ? 'bg-blue-500 text-white'
            : isOnline
              ? 'bg-amber-500 text-amber-950'
              : 'bg-stone-400 text-white'
        }
        ${className}
      `}
    >
      {isSyncing ? (
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
          ↻
        </motion.span>
      ) : (
        pendingCount
      )}
    </span>
  );
}

/**
 * Sync status row for settings/debug pages
 */
export function SyncStatusRow() {
  const { pendingCount, isSyncing, isOnline, lastSyncTime, triggerSync } = usePendingSyncQueue();

  const formatLastSync = () => {
    if (!lastSyncTime) return 'Never';
    const now = new Date();
    const diff = now.getTime() - lastSyncTime.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return lastSyncTime.toLocaleDateString();
  };

  return (
    <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-stone-200">
      <div className="flex items-center gap-3">
        <div
          className={`
            w-10 h-10 rounded-full flex items-center justify-center
            ${pendingCount > 0 ? (isOnline ? 'bg-amber-100' : 'bg-stone-100') : 'bg-green-100'}
          `}
        >
          {isSyncing ? (
            <motion.svg
              className="w-5 h-5 text-blue-600"
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </motion.svg>
          ) : pendingCount > 0 ? (
            <svg
              className={`w-5 h-5 ${isOnline ? 'text-amber-600' : 'text-stone-500'}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5 text-green-600"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>

        <div>
          <p className="font-medium text-ink">
            {isSyncing
              ? 'Syncing...'
              : pendingCount > 0
                ? `${pendingCount} item${pendingCount > 1 ? 's' : ''} pending`
                : 'All synced'}
          </p>
          <p className="text-sm text-ink-secondary">
            Last synced: {formatLastSync()}
            {!isOnline && <span className="text-amber-600 ml-2">• Offline</span>}
          </p>
        </div>
      </div>

      {pendingCount > 0 && isOnline && !isSyncing && (
        <button
          onClick={triggerSync}
          className="px-4 py-2 text-sm font-semibold text-masters bg-masters/10 rounded-lg hover:bg-masters/20 transition-colors"
        >
          Sync Now
        </button>
      )}
    </div>
  );
}
