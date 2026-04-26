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
 * scoring on the course need to know when their changes are not
 * reaching the cloud. Previously a persistent sync failure was only
 * visible via the small header pill and easy to miss mid-round.
 */

import { useEffect, useState } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import {
  getFailedSyncQueueItems,
  getSyncQueueStatus,
  processSyncQueue,
  retryFailedQueue,
} from '@/lib/services/tripSyncService';
import { cn } from '@/lib/utils';
import { zIndex } from '@/lib/constants/zIndex';

const POLL_INTERVAL_MS = 8000;

type FailedSyncItem = ReturnType<typeof getFailedSyncQueueItems>[number];
type SyncBlockedReason = NonNullable<ReturnType<typeof getSyncQueueStatus>['blockedReason']>;

const ENTITY_LABELS: Record<string, string> = {
  trip: 'Trip',
  player: 'Player',
  team: 'Team',
  teamMember: 'Team member',
  session: 'Session',
  match: 'Match',
  holeResult: 'Score',
  course: 'Course',
  teeSet: 'Tee set',
  sideBet: 'Side bet',
  practiceScore: 'Practice score',
  banterPost: 'Post',
  duesLineItem: 'Dues item',
  paymentRecord: 'Payment',
  tripInvitation: 'Invitation',
  announcement: 'Message',
  attendanceRecord: 'Attendance',
  cartAssignment: 'Cart assignment',
};

const OPERATION_LABELS: Record<string, string> = {
  create: 'add',
  update: 'update',
  delete: 'remove',
};

const BLOCKED_MESSAGES: Record<SyncBlockedReason, string> = {
  offline: 'Reconnect to retry cloud sync.',
  'supabase-unconfigured':
    'Cloud sync is not configured. Your changes are saved on this device, but live sharing needs Supabase set up.',
  'auth-pending': 'Checking your cloud session before retrying sync.',
  'auth-required': 'Sign in to retry cloud sync.',
};

function describeFailedItem(item: FailedSyncItem): string {
  const entity = ENTITY_LABELS[item.entity] ?? item.entity;
  const operation = OPERATION_LABELS[item.operation] ?? item.operation;
  return `${entity} ${operation}`;
}

export function SyncFailureBanner({ className }: { className?: string }) {
  const [failedCount, setFailedCount] = useState(0);
  const [lastError, setLastError] = useState<string | undefined>(undefined);
  const [failedItems, setFailedItems] = useState<FailedSyncItem[]>([]);
  const [blockedReason, setBlockedReason] = useState<SyncBlockedReason | undefined>(undefined);
  const [showDetail, setShowDetail] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    const tick = () => {
      const status = getSyncQueueStatus();
      setFailedCount(status.failed);
      setLastError(status.lastError);
      setFailedItems(getFailedSyncQueueItems(5));
      setBlockedReason(status.blockedReason);
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
      // Reset any items that already exhausted their retry budget back
      // to 'pending'. Without this step the subsequent processSyncQueue
      // call skips them entirely — the button appeared to do nothing
      // whenever the captain had been tapping retry for a while.
      await retryFailedQueue();
      await processSyncQueue();
      const status = getSyncQueueStatus();
      setFailedCount(status.failed);
      setLastError(status.lastError);
      setFailedItems(getFailedSyncQueueItems(5));
      setBlockedReason(status.blockedReason);
    } finally {
      setIsRetrying(false);
    }
  };

  if (failedCount <= 0) return null;

  const blockedMessage = blockedReason ? BLOCKED_MESSAGES[blockedReason] : undefined;
  const canRetry = !blockedReason;
  const message = blockedMessage
    ? blockedMessage
    : `${failedCount} change${failedCount === 1 ? '' : 's'} could not sync. Saved on this device.`;

  return (
    <div
      role="status"
      aria-live="polite"
      style={{ zIndex: zIndex.nav + 1 }}
      className={cn(
        'fixed top-0 inset-x-0 border-b border-[color:var(--error)]/30',
        'bg-[color:var(--error)]/12 text-[var(--error)]',
        'backdrop-blur supports-[backdrop-filter]:bg-[color:var(--error)]/10',
        'pt-[env(safe-area-inset-top,0px)]',
        className,
      )}
    >
      <div className="mx-auto max-w-3xl px-4 py-2">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-4 w-4 shrink-0" aria-hidden />
          <div className="flex-1 min-w-0 text-sm font-medium">{message}</div>
          {lastError && (
            <button
              type="button"
              onClick={() => setShowDetail((v) => !v)}
              className="shrink-0 rounded-full border border-[color:var(--error)]/40 bg-[var(--canvas)]/80 px-3 py-1 text-xs font-semibold text-[var(--error)]"
            >
              {showDetail ? 'Hide details' : 'Details'}
            </button>
          )}
          <button
            type="button"
            onClick={handleRetry}
            disabled={isRetrying || !canRetry}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[color:var(--error)]/40 bg-[var(--canvas)]/80 px-3 py-1 text-xs font-semibold text-[var(--error)] disabled:opacity-60"
          >
            <RefreshCw className={cn('h-3.5 w-3.5', isRetrying && 'animate-spin')} aria-hidden />
            {isRetrying ? 'Retrying...' : 'Retry sync'}
          </button>
        </div>
        {showDetail && lastError && (
          <div className="mt-2 space-y-1 text-xs text-[var(--error)]/85">
            {failedItems.length > 0 ? (
              failedItems.map((item) => (
                <div key={`${item.entity}:${item.entityId}:${item.operation}`} className="break-words">
                  <span className="font-semibold">{describeFailedItem(item)}:</span>{' '}
                  {item.error ?? 'Sync failed'}
                </div>
              ))
            ) : (
              <p className="break-words">Last error: {lastError}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SyncFailureBanner;
