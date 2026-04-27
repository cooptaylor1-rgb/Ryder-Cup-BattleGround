'use client';

/**
 * Trip Sync Status Badge
 *
 * Displays the current sync status for the trip.
 * Shows pending, syncing, failed, or synced state.
 */

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  getFailedSyncQueueItems,
  getSyncQueueStatus,
  getTripSyncStatus,
  getUnresolvedSyncQueueItems,
  processSyncQueue,
  retryFailedQueue,
  TRIP_SYNC_QUEUE_CHANGED_EVENT,
  type SyncStatus,
} from '@/lib/services/tripSyncService';
import { useTripStore } from '@/lib/stores/tripStore';
import { Cloud, CloudOff, RefreshCw, AlertCircle, Check, Clock3 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import {
  getSyncBlockedActionLabel,
  summarizeSyncError,
  SYNC_BLOCKED_MESSAGES,
} from '@/lib/utils/syncMessages';

type QueueInfo = ReturnType<typeof getSyncQueueStatus>;
type FailedSyncItem = ReturnType<typeof getFailedSyncQueueItems>[number];
type UnresolvedSyncItem = ReturnType<typeof getUnresolvedSyncQueueItems>[number];
type VisibleSyncItem = FailedSyncItem | UnresolvedSyncItem;

const ENTITY_LABELS: Record<string, string> = {
  trip: 'trip',
  player: 'player',
  team: 'team',
  teamMember: 'team member',
  session: 'session',
  match: 'match',
  holeResult: 'score',
  course: 'course',
  teeSet: 'tee set',
  sideBet: 'side bet',
  practiceScore: 'practice score',
  banterPost: 'post',
  duesLineItem: 'dues item',
  paymentRecord: 'payment',
  tripInvitation: 'invitation',
  announcement: 'message',
  attendanceRecord: 'attendance',
  cartAssignment: 'cart assignment',
};

const OPERATION_LABELS: Record<string, string> = {
  create: 'add',
  update: 'update',
  delete: 'remove',
};

function changeLabel(count: number): string {
  return `${count} change${count === 1 ? '' : 's'}`;
}

function describeLatestFailure(queueInfo: QueueInfo): string | null {
  if (!queueInfo.lastFailedEntity || !queueInfo.lastFailedOperation) {
    return null;
  }

  const entity = ENTITY_LABELS[queueInfo.lastFailedEntity] ?? queueInfo.lastFailedEntity;
  const operation =
    OPERATION_LABELS[queueInfo.lastFailedOperation] ?? queueInfo.lastFailedOperation;
  return `Latest: ${entity} ${operation}.`;
}

function formatLastAttempt(value?: string): string | null {
  if (!value) return null;
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return null;
  return `Last tried at ${timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}.`;
}

function describeSyncItem(item: VisibleSyncItem): string {
  const entity = ENTITY_LABELS[item.entity] ?? item.entity;
  const operation = OPERATION_LABELS[item.operation] ?? item.operation;
  const label = `${entity} ${operation}`;
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function describeItemStatus(item: VisibleSyncItem): string {
  if (item.error) return summarizeSyncError(item.error);
  if ('status' in item && item.status === 'syncing') return 'Sending to the cloud now.';
  if ('status' in item && item.status === 'pending') return 'Waiting to send to the cloud.';
  return 'Sync could not finish.';
}

function formatAttemptBadge(value?: string): string | null {
  if (!value) return null;
  const timestamp = new Date(value);
  if (Number.isNaN(timestamp.getTime())) return null;
  return timestamp.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

interface SyncStatusBadgeProps {
  /** Show full status text (not just icon) */
  showText?: boolean;
  /** Custom class name */
  className?: string;
}

export function SyncStatusBadge({ showText = false, className = '' }: SyncStatusBadgeProps) {
  const router = useRouter();
  const pathname = usePathname();
  const currentTrip = useTripStore((state) => state.currentTrip);
  const [status, setStatus] = useState<SyncStatus>('unknown');
  const [queueInfo, setQueueInfo] = useState<QueueInfo>({ pending: 0, failed: 0, total: 0 });
  const [syncItems, setSyncItems] = useState<VisibleSyncItem[]>([]);
  const [showDetail, setShowDetail] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const goToSignIn = () => {
    const returnTo = pathname || '/';
    router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  };

  const refreshSnapshot = useCallback(() => {
    if (currentTrip) {
      setStatus(getTripSyncStatus(currentTrip.id));
    }
    const nextQueueInfo = getSyncQueueStatus();
    setQueueInfo(nextQueueInfo);
    setSyncItems(
      nextQueueInfo.failed > 0 ? getFailedSyncQueueItems(5) : getUnresolvedSyncQueueItems(5)
    );
    if (nextQueueInfo.total <= 0) {
      setShowDetail(false);
    }
    return nextQueueInfo;
  }, [currentTrip]);

  useEffect(() => {
    const updateStatus = () => {
      refreshSnapshot();
    };

    updateStatus();

    // Only poll when the tab is visible to save battery on the course
    let interval: ReturnType<typeof setInterval> | null = null;

    const startPolling = () => {
      if (!interval) {
        interval = setInterval(updateStatus, 5000);
      }
    };

    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        updateStatus(); // Immediate refresh on return
        startPolling();
      } else {
        stopPolling();
      }
    };

    if (document.visibilityState === 'visible') {
      startPolling();
    }
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener(TRIP_SYNC_QUEUE_CHANGED_EVENT, updateStatus);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener(TRIP_SYNC_QUEUE_CHANGED_EVENT, updateStatus);
    };
  }, [refreshSnapshot]);

  const handlePrimaryAction = async () => {
    setIsSyncing(true);
    try {
      const currentQueue = getSyncQueueStatus();
      if (currentQueue.blockedReason) {
        setQueueInfo(currentQueue);
        if (currentQueue.blockedReason === 'auth-required') {
          goToSignIn();
        }
        return;
      }

      // Reset ALL failed items — including the ones that
      // already burned through MAX_RETRY_COUNT — so clicking
      // the banner actually gives them another shot. Before
      // this, processSyncQueue alone would skip items at the
      // retry ceiling, and the banner would keep showing "N
      // failed" forever with the user's click doing nothing.
      await retryFailedQueue();
      await processSyncQueue();
      setStatus(currentTrip ? getTripSyncStatus(currentTrip.id) : 'unknown');
      refreshSnapshot();
    } finally {
      setIsSyncing(false);
    }
  };

  const getStatusConfig = () => {
    const blockedTooltip = queueInfo.blockedReason
      ? SYNC_BLOCKED_MESSAGES[queueInfo.blockedReason]
      : undefined;

    switch (status) {
      case 'synced':
        return {
          icon: <Check className="h-4 w-4" />,
          text: 'Saved to cloud',
          tone: 'text-[var(--success)]',
          bg: 'bg-[color:var(--success)]/15',
        };
      case 'pending':
      case 'syncing':
        if (blockedTooltip) {
          return {
            icon: <CloudOff className="h-4 w-4" />,
            text: `Saved on device${queueInfo.pending > 0 ? ` (${queueInfo.pending})` : ''}`,
            tone: 'text-[var(--ink-secondary)]',
            bg: 'bg-[color:var(--ink-tertiary)]/10',
          };
        }
        return {
          icon: <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />,
          text: `Saving to cloud${queueInfo.pending > 0 ? ` (${queueInfo.pending})` : ''}`,
          tone: 'text-[var(--info)]',
          bg: 'bg-[color:var(--info)]/15',
        };
      case 'failed':
        return {
          icon: <AlertCircle className="h-4 w-4" />,
          text: `Retry sync${queueInfo.failed > 0 ? ` (${queueInfo.failed})` : ''}`,
          tone: 'text-[var(--error)]',
          bg: 'bg-[color:var(--error)]/15',
        };
      case 'offline':
        return {
          icon: <CloudOff className="h-4 w-4" />,
          text: 'Saved on device',
          tone: 'text-[var(--ink-secondary)]',
          bg: 'bg-[color:var(--ink-tertiary)]/10',
        };
      default:
        return {
          icon: <Cloud className="h-4 w-4" />,
          text: 'Checking save status',
          tone: 'text-[var(--ink-tertiary)]',
          bg: 'bg-[color:var(--ink-tertiary)]/10',
        };
    }
  };

  const config = getStatusConfig();
  const failedChangeCount = queueInfo.failed || 0;
  const pendingChangeCount = queueInfo.pending || 0;
  const visibleCount =
    !showText && status === 'failed' && failedChangeCount > 0
      ? failedChangeCount
      : !showText && (status === 'pending' || status === 'syncing') && pendingChangeCount > 0
        ? pendingChangeCount
        : null;

  // Screen readers need a textual label even when the badge is icon-only.
  // With showText=true the visible span carries the description; with
  // showText=false only the icon renders, so we set aria-label on the
  // wrapper and mark the icon aria-hidden so the label isn't doubled.
  const content = (
    <div
      className={
        `inline-flex min-h-8 min-w-8 items-center justify-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold shadow-card-sm ` +
        `${config.tone} ${config.bg} ${className}`
      }
      role="status"
      aria-live="polite"
      aria-label={showText ? undefined : `Sync status: ${config.text}`}
    >
      <span aria-hidden={!showText}>{config.icon}</span>
      {showText && <span>{config.text}</span>}
      {visibleCount !== null && (
        <span
          className="min-w-4 rounded-full bg-[color:var(--canvas)]/80 px-1 text-center text-[10px] leading-4 text-current"
          aria-hidden="true"
        >
          {visibleCount}
        </span>
      )}
    </div>
  );

  if (status === 'failed' || status === 'pending') {
    const effectiveFailedCount = failedChangeCount || 1;
    const blockedTooltip = queueInfo.blockedReason
      ? SYNC_BLOCKED_MESSAGES[queueInfo.blockedReason]
      : undefined;
    const summarizedError = summarizeSyncError(queueInfo.lastError);
    const latestFailure = describeLatestFailure(queueInfo);
    const lastAttempt = formatLastAttempt(queueInfo.lastAttemptAt);
    const failedDetails = [summarizedError, latestFailure, lastAttempt, 'Tap to retry.']
      .filter(Boolean)
      .join(' ');
    const blockedAction =
      queueInfo.blockedReason === 'auth-required' ? 'Tap to sign in and send them.' : '';
    const failedTooltip = blockedTooltip
      ? `${changeLabel(effectiveFailedCount)} saved on this device. ${blockedTooltip} ${blockedAction}`.trim()
      : queueInfo.lastError
        ? `${changeLabel(effectiveFailedCount)} did not reach the cloud. ${failedDetails}`
        : `${changeLabel(effectiveFailedCount)} did not reach the cloud. Tap to retry.`;
    const effectivePendingCount = pendingChangeCount || 1;
    const pendingTooltip = blockedTooltip
      ? `${changeLabel(effectivePendingCount)} saved on this device. ${blockedTooltip} ${blockedAction}`.trim()
      : `${changeLabel(effectivePendingCount)} saved on this device and waiting for the cloud. Tap to retry now.`;
    const tooltipText = status === 'failed' ? failedTooltip : pendingTooltip;
    const visibleChangeCount = failedChangeCount > 0 ? failedChangeCount : pendingChangeCount;
    const headline = blockedTooltip
      ? 'Cloud saving is paused'
      : failedChangeCount > 0
        ? 'Cloud sync needs attention'
        : 'Changes are waiting to sync';
    const detailMessage = blockedTooltip
      ? `${changeLabel(visibleChangeCount || effectivePendingCount)} saved on this device. ${blockedTooltip}`
      : failedChangeCount > 0
        ? `${changeLabel(failedChangeCount)} did not reach the cloud. ${summarizedError}`
        : `${changeLabel(pendingChangeCount)} saved on this device and waiting for the cloud.`;
    const canRunPrimaryAction =
      !queueInfo.blockedReason || queueInfo.blockedReason === 'auth-required';

    return (
      <>
        <Tooltip content={tooltipText}>
          <Button
            variant="ghost"
            size="sm"
            className="min-h-11 min-w-11 rounded-full p-0"
            onClick={() => setShowDetail((value) => !value)}
            aria-expanded={showDetail}
            aria-label={tooltipText}
          >
            {content}
          </Button>
        </Tooltip>
        {showDetail && (
          <div
            role="dialog"
            aria-label="Cloud sync details"
            aria-modal="false"
            className="fixed left-3 right-3 bottom-[calc(5rem+env(safe-area-inset-bottom,0px)+0.75rem)] z-[90] rounded-[24px] border border-[color:var(--rule)] bg-[color:var(--surface-elevated)]/96 p-4 text-left shadow-card backdrop-blur sm:left-auto sm:right-4 sm:top-[calc(env(safe-area-inset-top,0px)+4.5rem)] sm:bottom-auto sm:w-[min(25rem,calc(100vw-2rem))]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--ink)]">{headline}</p>
                <p className="mt-1 text-xs font-medium text-[var(--ink-secondary)]">
                  {detailMessage}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowDetail(false)}
                className="min-h-10 shrink-0 rounded-full border border-[color:var(--rule)] bg-[var(--canvas)] px-3 text-xs font-semibold text-[var(--ink-secondary)] shadow-card-sm transition-colors hover:bg-[var(--surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-elevated)]"
              >
                Close
              </button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-[16px] border border-[color:var(--rule)] bg-[var(--canvas)] px-3 py-2">
                <p className="font-semibold uppercase tracking-[0.08em] text-[var(--ink-tertiary)]">
                  Waiting
                </p>
                <p className="mt-1 text-lg font-semibold text-[var(--ink)]">{pendingChangeCount}</p>
              </div>
              <div className="rounded-[16px] border border-[color:var(--rule)] bg-[var(--canvas)] px-3 py-2">
                <p className="font-semibold uppercase tracking-[0.08em] text-[var(--ink-tertiary)]">
                  Failed
                </p>
                <p className="mt-1 text-lg font-semibold text-[var(--ink)]">{failedChangeCount}</p>
              </div>
              <div className="rounded-[16px] border border-[color:var(--rule)] bg-[var(--canvas)] px-3 py-2">
                <p className="font-semibold uppercase tracking-[0.08em] text-[var(--ink-tertiary)]">
                  Total
                </p>
                <p className="mt-1 text-lg font-semibold text-[var(--ink)]">{queueInfo.total}</p>
              </div>
            </div>

            {syncItems.length > 0 ? (
              <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
                {syncItems.map((item) => {
                  const attemptTime = formatAttemptBadge(item.lastAttemptAt ?? item.createdAt);
                  const friendlyError = describeItemStatus(item);
                  const showRawError = Boolean(item.error && item.error !== friendlyError);
                  return (
                    <div
                      key={`${item.entity}:${item.entityId}:${item.operation}`}
                      className="rounded-[16px] border border-[color:var(--rule)] bg-[var(--canvas)] px-3 py-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-[var(--ink)]">{describeSyncItem(item)}</p>
                          <p className="mt-0.5 break-words text-[var(--ink-secondary)]">
                            {friendlyError}
                          </p>
                          {showRawError && (
                            <p className="mt-0.5 break-words text-[var(--ink-tertiary)]">
                              Detail: {item.error}
                            </p>
                          )}
                        </div>
                        {attemptTime && (
                          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-medium text-[var(--ink-tertiary)]">
                            <Clock3 className="h-3 w-3" aria-hidden />
                            {attemptTime}
                          </span>
                        )}
                      </div>
                      {item.retryCount > 0 && (
                        <p className="mt-1 text-[11px] font-medium text-[var(--ink-tertiary)]">
                          {item.retryCount} attempt{item.retryCount === 1 ? '' : 's'}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : queueInfo.lastError ? (
              <p className="mt-3 rounded-[16px] border border-[color:var(--rule)] bg-[var(--canvas)] px-3 py-2 text-xs text-[var(--ink-secondary)]">
                Last error: {summarizeSyncError(queueInfo.lastError)}
              </p>
            ) : null}

            <div className="mt-3 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handlePrimaryAction}
                disabled={isSyncing || !canRunPrimaryAction}
                className="inline-flex min-h-11 items-center gap-2 rounded-full bg-[var(--masters)] px-4 text-sm font-semibold text-[var(--canvas)] shadow-card-sm transition-colors hover:bg-[var(--masters-deep)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface-elevated)] disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} aria-hidden />
                {isSyncing ? 'Retrying...' : getSyncBlockedActionLabel(queueInfo.blockedReason)}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return <Tooltip content={config.text}>{content}</Tooltip>;
}

export default SyncStatusBadge;
