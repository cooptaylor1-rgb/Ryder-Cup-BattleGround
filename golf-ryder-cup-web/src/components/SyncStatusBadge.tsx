'use client';

/**
 * Trip Sync Status Badge
 *
 * Displays the current sync status for the trip.
 * Shows pending, syncing, failed, or synced state.
 */

import { useEffect, useState } from 'react';
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

type QueueInfo = ReturnType<typeof getSyncQueueStatus>;
type SyncBlockedReason = NonNullable<QueueInfo['blockedReason']>;

const BLOCKED_TOOLTIPS: Record<SyncBlockedReason, string> = {
    offline: 'Reconnect to retry cloud sync.',
    'supabase-unconfigured': 'Cloud sync is not configured for this build.',
    'auth-pending': 'Checking your cloud session before retrying sync.',
    'auth-required': 'Sign in to retry cloud sync.',
};

interface SyncStatusBadgeProps {
    /** Show full status text (not just icon) */
    showText?: boolean;
    /** Custom class name */
    className?: string;
}

export function SyncStatusBadge({ showText = false, className = '' }: SyncStatusBadgeProps) {
    const currentTrip = useTripStore((state) => state.currentTrip);
    const [status, setStatus] = useState<SyncStatus>('unknown');
    const [queueInfo, setQueueInfo] = useState<QueueInfo>({ pending: 0, failed: 0, total: 0 });
    const [isSyncing, setIsSyncing] = useState(false);

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
        switch (status) {
            case 'synced':
                return {
                    icon: <Check className="h-4 w-4" />,
                    text: 'Cloud saved',
                    tone: 'text-[var(--success)]',
                    bg: 'bg-[color:var(--success)]/15',
                };
            case 'pending':
            case 'syncing':
                return {
                    icon: <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />,
                    text: `Saving${queueInfo.pending > 0 ? ` (${queueInfo.pending})` : ''}`,
                    tone: 'text-[var(--info)]',
                    bg: 'bg-[color:var(--info)]/15',
                };
            case 'failed':
                return {
                    icon: <AlertCircle className="h-4 w-4" />,
                    text: `Needs retry (${queueInfo.failed})`,
                    tone: 'text-[var(--error)]',
                    bg: 'bg-[color:var(--error)]/15',
                };
            case 'offline':
                return {
                    icon: <CloudOff className="h-4 w-4" />,
                    text: 'Saved locally',
                    tone: 'text-[var(--ink-secondary)]',
                    bg: 'bg-[color:var(--ink-tertiary)]/10',
                };
            default:
                return {
                    icon: <Cloud className="h-4 w-4" />,
                    text: 'Checking sync',
                    tone: 'text-[var(--ink-tertiary)]',
                    bg: 'bg-[color:var(--ink-tertiary)]/10',
                };
        }
    };

    const config = getStatusConfig();

    // Screen readers need a textual label even when the badge is icon-only.
    // With showText=true the visible span carries the description; with
    // showText=false only the icon renders, so we set aria-label on the
    // wrapper and mark the icon aria-hidden so the label isn't doubled.
    const content = (
        <div
            className={
                `inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ` +
                `${config.tone} ${config.bg} ${className}`
            }
            role="status"
            aria-live="polite"
            aria-label={showText ? undefined : `Sync status: ${config.text}`}
        >
            <span aria-hidden={!showText}>{config.icon}</span>
            {showText && <span>{config.text}</span>}
        </div>
    );

    if (status === 'failed' || status === 'pending') {
        const failedChangeCount = queueInfo.failed || 1;
        const blockedTooltip = queueInfo.blockedReason ? BLOCKED_TOOLTIPS[queueInfo.blockedReason] : undefined;
        const failedTooltip = blockedTooltip
            ? `${failedChangeCount} cloud sync ${failedChangeCount === 1 ? 'change is' : 'changes are'} blocked. ${blockedTooltip}`
            : queueInfo.lastError
            ? `${failedChangeCount} cloud sync ${failedChangeCount === 1 ? 'change needs' : 'changes need'} a retry. Last error: ${queueInfo.lastError}.`
            : `${failedChangeCount} cloud sync ${failedChangeCount === 1 ? 'change needs' : 'changes need'} a retry.`;
        const pendingChangeCount = queueInfo.pending || 1;

        return (
            <Tooltip
                content={
                    status === 'failed'
                        ? failedTooltip
                        : `${pendingChangeCount} ${pendingChangeCount === 1 ? 'change is' : 'changes are'} waiting to sync. Click to save now.`
                }
            >
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0"
                    onClick={handleManualSync}
                    disabled={isSyncing || Boolean(queueInfo.blockedReason)}
                >
                    {content}
                </Button>
            </Tooltip>
        );
    }

    return (
        <Tooltip content={config.text}>
            {content}
        </Tooltip>
    );
}

export default SyncStatusBadge;
