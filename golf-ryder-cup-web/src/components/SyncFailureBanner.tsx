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
import { AlertTriangle, Clock3, RefreshCw } from 'lucide-react';
import {
  getFailedSyncQueueItems,
  getSyncQueueStatus,
  processSyncQueue,
  retryFailedQueue,
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

function describeFailedItem(item: FailedSyncItem): string {
  const entity = ENTITY_LABELS[item.entity] ?? item.entity;
  const operation = OPERATION_LABELS[item.operation] ?? item.operation;
  return `${entity} ${operation}`;
}

function formatAttemptTime(value?: string) {
  if (!value) return null;
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return null;
  return timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export function SyncFailureBanner({ className }: { className?: string }) {
  const [failedCount, setFailedCount] = useState(0);
  const [lastError, setLastError] = useState<string | undefined>(undefined);
  const [failedItems, setFailedItems] = useState<FailedSyncItem[]>([]);
  const [blockedReason, setBlockedReason] = useState<SyncBlockedReason | undefined>(undefined);
  const [showDetail, setShowDetail] = useState(false);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryFeedback, setRetryFeedback] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => {
      const status = getSyncQueueStatus();
      setFailedCount(status.failed);
      setLastError(status.lastError);
      setFailedItems(getFailedSyncQueueItems(5));
      setBlockedReason(status.blockedReason);
      if (status.failed <= 0) {
        setShowDetail(false);
        setRetryFeedback(null);
      }
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
    setRetryFeedback('Retrying saved changes...');
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
      if (status.failed <= 0) {
        setShowDetail(false);
        setRetryFeedback(null);
      } else {
        setRetryFeedback('Still saved locally. Try again after the connection is stable.');
      }
    } catch (error) {
      const status = getSyncQueueStatus();
      setFailedCount(status.failed);
      setLastError(status.lastError);
      setFailedItems(getFailedSyncQueueItems(5));
      setBlockedReason(status.blockedReason);
      setRetryFeedback(
        `${summarizeSyncError(error instanceof Error ? error.message : String(error))} Changes are still saved on this device.`
      );
    } finally {
      setIsRetrying(false);
    }
  };

  if (failedCount <= 0) return null;
  if (blockedReason === 'offline') return null;

  const blockedMessage = blockedReason ? SYNC_BLOCKED_MESSAGES[blockedReason] : undefined;
  const canRetry = !blockedReason;
  const message = retryFeedback
    ? retryFeedback
    : blockedMessage
      ? blockedMessage
      : `${failedCount} change${failedCount === 1 ? '' : 's'} could not sync. Saved on this device.`;
  const detailAvailable = failedItems.length > 0 || Boolean(lastError);

  return (
    <div
      role="alert"
      aria-live="assertive"
      aria-busy={isRetrying || undefined}
      style={{ zIndex: zIndex.nav + 1 }}
      className={cn(
        'fixed inset-x-0 top-0 border-b border-[color:var(--error)]/30',
        'bg-[color:var(--surface-elevated)]/94 text-[var(--error)] shadow-card',
        'backdrop-blur supports-[backdrop-filter]:bg-[color:var(--surface-elevated)]/88',
        'pt-[env(safe-area-inset-top,0px)]',
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
              Changes are saved on this device
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
              disabled={isRetrying || !canRetry}
              className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full border border-[color:var(--error)]/35 bg-[var(--canvas)]/88 px-3 py-1 text-xs font-semibold text-[var(--error)] transition-colors hover:bg-[color:var(--error)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-elevated)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', isRetrying && 'animate-spin')} aria-hidden />
              {isRetrying ? 'Retrying...' : getSyncBlockedActionLabel(blockedReason)}
            </button>
          </div>
        </div>
        {showDetail && detailAvailable && (
          <div className="mt-2 space-y-1 rounded-[18px] border border-[color:var(--error)]/18 bg-[color:var(--canvas)]/82 p-3 text-xs text-[var(--ink-secondary)]">
            {failedItems.length > 0 ? (
              failedItems.map((item) => {
                const attemptTime = formatAttemptTime(item.lastAttemptAt ?? item.createdAt);
                const friendlyError = summarizeSyncError(item.error);
                const showRawError = Boolean(item.error && friendlyError !== item.error);
                return (
                  <div
                    key={`${item.entity}:${item.entityId}:${item.operation}`}
                    className="grid gap-1 rounded-[14px] px-2 py-1.5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-[var(--ink)]">{describeFailedItem(item)}</p>
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
