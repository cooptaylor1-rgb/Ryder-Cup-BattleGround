'use client';

/**
 * Trip Sync Status Badge
 *
 * Displays the current sync status for the trip.
 * Shows pending, syncing, failed, or synced state.
 */

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import {
  getSyncQueueStatus,
  getTripSyncStatus,
  processSyncQueue,
  retryFailedQueue,
  type SyncStatus,
} from '@/lib/services/tripSyncService';
import { useTripStore } from '@/lib/stores/tripStore';
import { Cloud, CloudOff, RefreshCw, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';
import { summarizeSyncError, SYNC_BLOCKED_MESSAGES } from '@/lib/utils/syncMessages';

type QueueInfo = ReturnType<typeof getSyncQueueStatus>;

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
  const [isSyncing, setIsSyncing] = useState(false);

  const goToSignIn = () => {
    const returnTo = pathname || '/';
    router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  };

  useEffect(() => {
    const updateStatus = () => {
      if (currentTrip) {
        setStatus(getTripSyncStatus(currentTrip.id));
      }
      setQueueInfo(getSyncQueueStatus());
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

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [currentTrip]);

  const handleManualSync = async () => {
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
      setQueueInfo(getSyncQueueStatus());
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

    return (
      <Tooltip content={status === 'failed' ? failedTooltip : pendingTooltip}>
        <Button
          variant="ghost"
          size="sm"
          className="min-h-11 min-w-11 rounded-full p-0"
          onClick={handleManualSync}
          disabled={
            isSyncing ||
            (Boolean(queueInfo.blockedReason) && queueInfo.blockedReason !== 'auth-required')
          }
          aria-label={status === 'failed' ? failedTooltip : pendingTooltip}
        >
          {content}
        </Button>
      </Tooltip>
    );
  }

  return <Tooltip content={config.text}>{content}</Tooltip>;
}

export default SyncStatusBadge;
