'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getPendingScoreCount, syncPendingScores } from '@/lib/services/backgroundSyncService';
import { usePWA } from '@/components/PWAProvider';
import { cn } from '@/lib/utils';

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

type SyncTone = 'success' | 'warning' | 'offline' | 'info';

const resolveTone = (pendingCount: number, isSyncing: boolean, isOnline: boolean): SyncTone => {
  if (!isOnline) return 'offline';
  if (isSyncing) return 'info';
  if (pendingCount > 0) return 'warning';
  return 'success';
};

const toneBackgrounds: Record<SyncTone, string> = {
  success: 'bg-[color:var(--success)]/12',
  warning: 'bg-[color:var(--warning)]/12',
  offline: 'bg-[color:var(--ink-tertiary)]/12',
  info: 'bg-[color:var(--info)]/12',
};

const toneText: Record<SyncTone, string> = {
  success: 'text-[var(--success)]',
  warning: 'text-[var(--warning)]',
  offline: 'text-[var(--ink-tertiary)]',
  info: 'text-[var(--info)]',
};

const toneRing: Record<SyncTone, string> = {
  success: 'ring-1 ring-[color:var(--success)]/30',
  warning: 'ring-1 ring-[color:var(--warning)]/30',
  offline: 'ring-1 ring-[color:var(--ink-tertiary)]/25',
  info: 'ring-1 ring-[color:var(--info)]/30',
};

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
  const tone = resolveTone(pendingCount, isSyncing, isOnline);
  const isDisabled = !isOnline || pendingCount === 0 || isSyncing;

  return (
    <AnimatePresence>
      {shouldShow && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.8 }}
          onClick={() => {
            if (!isDisabled) {
              triggerSync();
            }
          }}
          disabled={isDisabled}
          className={cn(
            'fixed z-40 flex items-center gap-2 rounded-full px-3 py-2',
            'border border-[var(--rule)] bg-[var(--surface-raised)] text-[var(--ink-primary)]',
            'shadow-lg backdrop-blur-sm transition-colors',
            'hover:bg-[var(--surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--masters)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)]',
            'disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:bg-[var(--surface-raised)] disabled:text-[var(--ink-tertiary)]',
            positionClasses[position],
            toneRing[tone],
            className
          )}
          style={{
            paddingTop: position.includes('top')
              ? 'calc(0.5rem + env(safe-area-inset-top))'
              : undefined,
            paddingBottom: position.includes('bottom')
              ? 'calc(0.5rem + env(safe-area-inset-bottom))'
              : undefined,
          }}
        >
          <span
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full transition-colors',
              toneBackgrounds[tone],
              toneText[tone]
            )}
          >
            {isSyncing ? (
              <motion.svg
                className="h-4 w-4"
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
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            )}
          </span>

          <span
            className={cn(
              'text-sm font-semibold',
              tone === 'offline' ? 'text-[var(--ink-secondary)]' : 'text-[var(--ink-primary)]'
            )}
          >
            {isSyncing ? (
              'Syncing...'
            ) : pendingCount > 0 ? (
              <>
                {pendingCount} pending
                {!isOnline && <span className="ml-1 text-xs text-[var(--ink-tertiary)]">(offline)</span>}
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

  const tone = resolveTone(pendingCount, isSyncing, isOnline);

  return (
    <span
      className={cn(
        'inline-flex min-w-5 h-5 items-center justify-center rounded-full px-1.5',
        'text-xs font-bold border border-[color:var(--rule)]/40 transition-colors',
        toneBackgrounds[tone],
        toneText[tone],
        className
      )}
    >
      {isSyncing ? (
        <motion.span animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
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
  const tone = resolveTone(pendingCount, isSyncing, isOnline);

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
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--rule)] bg-[var(--surface)] p-4">
      <div className="flex items-center gap-3">
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-full', toneBackgrounds[tone])}>
          {isSyncing ? (
            <motion.svg
              className={cn('h-5 w-5', toneText[tone])}
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
            <svg className={cn('h-5 w-5', toneText[tone])} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          ) : (
            <svg className={cn('h-5 w-5', toneText[tone])} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
        </div>

        <div>
          <p className="font-medium text-[var(--ink-primary)]">
            {isSyncing
              ? 'Syncing...'
              : pendingCount > 0
                ? `${pendingCount} item${pendingCount > 1 ? 's' : ''} pending`
                : 'All synced'}
          </p>
          <p className="text-sm text-[var(--ink-secondary)]">
            Last synced: {formatLastSync()}
            {!isOnline && <span className="ml-2 text-[var(--warning)]">• Offline</span>}
          </p>
        </div>
      </div>

      {pendingCount > 0 && isOnline && !isSyncing && (
        <button
          onClick={triggerSync}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-[var(--masters)] transition-colors bg-[color:var(--masters)]/15 hover:bg-[color:var(--masters)]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--masters)]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
        >
          Sync Now
        </button>
      )}
    </div>
  );
}
