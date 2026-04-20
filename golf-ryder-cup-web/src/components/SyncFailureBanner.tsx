'use client';

/**
 * Sync Failure Banner
 *
 * Site-wide strip that appears ONLY when the trip sync queue has failed
 * operations. Keeps quiet when everything is working so captains aren't
 * desensitized to its presence.
 *
 * The existing SyncStatusBadge (per-page, in headers) handles the
 * "normal" pending state. This banner is the escalation: captains
 * scoring on the course need to know when their writes are not
 * reaching Supabase, because the whole room's leaderboard depends on
 * that queue draining. Previously a persistent sync failure was only
 * visible via the small header pill and easy to miss mid-round.
 */

import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import {
  getSyncQueueStatus,
  processSyncQueue,
} from '@/lib/services/tripSyncService';
import { cn } from '@/lib/utils';

const POLL_INTERVAL_MS = 8000;

export function SyncFailureBanner({ className }: { className?: string }) {
  const [failedCount, setFailedCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    const tick = () => {
      setFailedCount(getSyncQueueStatus().failed);
    };
    tick();

    let interval: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      if (!interval) interval = setInterval(tick, POLL_INTERVAL_MS);
    };
    const stop = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        tick();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === 'visible') start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await processSyncQueue();
      setFailedCount(getSyncQueueStatus().failed);
    } finally {
      setIsRetrying(false);
    }
  };

  if (failedCount <= 0) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'fixed top-0 inset-x-0 z-[55] border-b border-[color:var(--error)]/30',
        'bg-[color:var(--error)]/12 text-[var(--error)]',
        'backdrop-blur supports-[backdrop-filter]:bg-[color:var(--error)]/10',
        'pt-[env(safe-area-inset-top,0px)]',
        className,
      )}
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2">
        <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
        <div className="flex-1 min-w-0 text-sm font-medium">
          {failedCount} score{failedCount === 1 ? '' : 's'} didn&rsquo;t reach the cloud. Saved locally — retry to push.
        </div>
        <button
          type="button"
          onClick={handleRetry}
          disabled={isRetrying}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[color:var(--error)]/40 bg-[var(--canvas)]/80 px-3 py-1 text-xs font-semibold text-[var(--error)] disabled:opacity-60"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isRetrying && 'animate-spin')} aria-hidden />
          {isRetrying ? 'Retrying…' : 'Retry sync'}
        </button>
      </div>
    </div>
  );
}

export default SyncFailureBanner;
