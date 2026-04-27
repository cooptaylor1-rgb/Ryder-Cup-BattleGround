'use client';

/**
 * Sync Failure Banner
 *
 * Site-wide strip that appears when trip sync needs user attention:
 * failed operations, or local changes that cannot send because sign-in
 * or cloud setup is blocking the queue.
 *
 * The existing SyncStatusBadge (per-page, in headers) handles the
 * "normal" pending state. This banner is the escalation: captains
 * scoring on the course need to know when their changes are not
 * reaching the cloud.
 */

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { AlertTriangle, Clock3, RefreshCw } from 'lucide-react';
import {
  getFailedSyncQueueItems,
  getSyncQueueStatus,
  getUnresolvedSyncQueueItems,
  processSyncQueue,
  retryFailedQueue,
  TRIP_SYNC_QUEUE_CHANGED_EVENT,
} from '@/lib/services/tripSyncService';
import { cn } from '@/lib/utils';
import { zIndex } from '@/lib/constants/zIndex';
import {
  getSyncBlockedActionLabel,
  summarizeSyncError,
  SYNC_BLOCKED_MESSAGES,
  type SyncBlockedReason,
} from '@/lib/utils/syncMessages';

const POLL_INTERVAL_MS = 8000;

type FailedSyncItem = ReturnType<typeof getFailedSyncQueueItems>[number];
type UnresolvedSyncItem = ReturnType<typeof getUnresolvedSyncQueueItems>[number];
type VisibleSyncItem = FailedSyncItem | UnresolvedSyncItem;

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

function describeSyncItem(item: VisibleSyncItem): string {
  const entity = ENTITY_LABELS[item.entity] ?? item.entity;
  const operation = OPERATION_LABELS[item.operation] ?? item.operation;
  return `${entity} ${operation}`;
}

function describeItemStatus(item: VisibleSyncItem): string {
  if (item.error) return summarizeSyncError(item.error);
  if ('status' in item && item.status === 'syncing') return 'Sending to the cloud now.';
  if ('status' in item && item.status === 'pending') return 'Waiting to send to the cloud.';
  return 'Sync could not finish.';
}

function formatAttemptTime(value?: string) {
  if (!value) return null;
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return null;
  return timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function SyncFailureBanner({ className }: { className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);
  const [lastError, setLastError] = useState<string | undefined>(undefined);
  const [syncItems, setSyncItems] = useState<VisibleSyncItem[]>([]);
  const [blockedReason, setBlockedReason] = useState<SyncBlockedReason | undefined>(undefined);
  const [showDetail, setShowDetail] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryFeedback, setRetryFeedback] = useState<string | null>(null);

  const goToSignIn = () => {
    const nextPath = pathname || '/';
    router.push(`/login?cloud=1&next=${encodeURIComponent(nextPath)}`);
  };

  const refreshSnapshot = useCallback(() => {
    const status = getSyncQueueStatus();
    const shouldShowBlockedPending =
      status.pending > 0 && Boolean(status.blockedReason) && status.blockedReason !== 'offline';
    setPendingCount(status.pending);
    setFailedCount(status.failed);
    setLastError(status.lastError);
    setSyncItems(status.failed > 0 ? getFailedSyncQueueItems(5) : getUnresolvedSyncQueueItems(5));
    setBlockedReason(status.blockedReason);
    if (status.failed <= 0 && !shouldShowBlockedPending) {
      setShowDetail(false);
      setRetryFeedback(null);
    }
    return status;
  }, []);

  useEffect(() => {
    const tick = () => {
      refreshSnapshot();
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
    window.addEventListener(TRIP_SYNC_QUEUE_CHANGED_EVENT, tick);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener(TRIP_SYNC_QUEUE_CHANGED_EVENT, tick);
    };
  }, [refreshSnapshot]);

  const handleRetry = async () => {
    if (blockedReason === 'auth-required') {
      goToSignIn();
      return;
    }

    setIsRetrying(true);
    setRetryFeedback('Retrying saved changes...');
    try {
      // Reset any items that already exhausted their retry budget back
      // to 'pending'. Without this step the subsequent processSyncQueue
      // call skips them entirely — the button appeared to do nothing
      // whenever the captain had been tapping retry for a while.
      await retryFailedQueue();
      await processSyncQueue();
      const status = refreshSnapshot();
      if (status.failed <= 0 && !(status.pending > 0 && status.blockedReason)) {
        setShowDetail(false);
        setRetryFeedback(null);
      } else {
        setRetryFeedback('Still saved on this device. Try again when the connection is stable.');
      }
    } catch (error) {
      refreshSnapshot();
      setRetryFeedback(
        `${summarizeSyncError(error instanceof Error ? error.message : String(error))} Changes are still saved on this device.`
      );
    } finally {
      setIsRetrying(false);
    }
  };

  const hasBlockedPending =
    pendingCount > 0 && Boolean(blockedReason) && blockedReason !== 'offline';
  if (failedCount <= 0 && !hasBlockedPending) return null;
  if (blockedReason === 'offline') return null;

  const blockedMessage = blockedReason ? SYNC_BLOCKED_MESSAGES[blockedReason] : undefined;
  const canRetry = !blockedReason && failedCount > 0;
  const canOpenSignIn = blockedReason === 'auth-required';
  const visibleChangeCount = failedCount > 0 ? failedCount : pendingCount;
  const message = retryFeedback
    ? retryFeedback
    : blockedMessage
      ? `${visibleChangeCount} change${visibleChangeCount === 1 ? '' : 's'} saved on this device. ${blockedMessage}`
      : `${failedCount} change${failedCount === 1 ? '' : 's'} did not reach the cloud. Saved on this device.`;
  const detailAvailable = syncItems.length > 0 || Boolean(lastError);

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-busy={isRetrying || undefined}
      style={{ zIndex: zIndex.toast }}
      className={cn(
        'fixed left-3 right-3 bottom-[calc(5rem+env(safe-area-inset-bottom,0px)+0.75rem)] rounded-[22px] border border-[color:var(--error)]/30',
        'bg-[color:var(--surface-elevated)]/94 text-[var(--error)] shadow-card',
        'backdrop-blur supports-[backdrop-filter]:bg-[color:var(--surface-elevated)]/88',
        'sm:inset-x-0 sm:top-0 sm:bottom-auto sm:rounded-none sm:border-x-0 sm:border-t-0',
        'sm:pt-[env(safe-area-inset-top,0px)]',
        className
      )}
    >
      <div className="mx-auto max-w-4xl px-3 py-2 sm:px-4">
        <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 sm:flex sm:gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color:var(--error)]/14">
            <AlertTriangle className="h-4 w-4" aria-hidden />
          </div>
          <div className="min-w-0 sm:flex-1">
            <p className="text-sm font-semibold text-[var(--ink)]">
              {blockedReason ? 'Cloud saving is paused' : 'Changes are saved on this device'}
            </p>
            <p className="text-xs font-medium text-[var(--error)] sm:text-sm">{message}</p>
          </div>
          <div className="col-span-2 flex items-center justify-end gap-2 sm:col-span-1">
            {detailAvailable && (
              <button
                type="button"
                onClick={() => setShowDetail((v) => !v)}
                className="min-h-11 rounded-full border border-[color:var(--error)]/35 bg-[var(--canvas)]/88 px-3 py-1 text-xs font-semibold text-[var(--error)] transition-colors hover:bg-[color:var(--error)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-elevated)]"
                aria-expanded={showDetail}
              >
                {showDetail ? 'Hide details' : 'Details'}
              </button>
            )}
            <button
              type="button"
              onClick={handleRetry}
              disabled={isRetrying || (!canRetry && !canOpenSignIn)}
              className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-[color:var(--error)]/35 bg-[var(--canvas)]/88 px-3 py-1 text-xs font-semibold text-[var(--error)] transition-colors hover:bg-[color:var(--error)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-elevated)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isRetrying && 'animate-spin')} aria-hidden />
              {isRetrying ? 'Retrying...' : getSyncBlockedActionLabel(blockedReason)}
            </button>
          </div>
        </div>
        {showDetail && detailAvailable && (
          <div className="mt-2 space-y-1 rounded-[18px] border border-[color:var(--error)]/18 bg-[color:var(--canvas)]/82 p-3 text-xs text-[var(--ink-secondary)]">
            {syncItems.length > 0 ? (
              syncItems.map((item) => {
                const attemptTime = formatAttemptTime(item.lastAttemptAt ?? item.createdAt);
                const friendlyError = describeItemStatus(item);
                const showRawError = Boolean(item.error && friendlyError !== item.error);
                return (
                  <div
                    key={`${item.entity}:${item.entityId}:${item.operation}`}
                    className="grid gap-1 rounded-[14px] px-2 py-1.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--ink)]">{describeSyncItem(item)}</p>
                      <p className="break-words text-[var(--ink-secondary)]">{friendlyError}</p>
                      {showRawError && (
                        <p className="mt-0.5 break-words text-[var(--ink-tertiary)]">
                          Detail: {item.error}
                        </p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-[11px] font-medium text-[var(--ink-tertiary)]">
                      {item.retryCount > 0 && (
                        <span>
                          {item.retryCount} attempt{item.retryCount === 1 ? '' : 's'}
                        </span>
                      )}
                      {attemptTime && (
                        <span className="inline-flex items-center gap-1">
                          <Clock3 className="h-3 w-3" aria-hidden />
                          {attemptTime}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="break-words">Last error: {summarizeSyncError(lastError)}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SyncFailureBanner;
