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
    type SyncStatus,
} from '@/lib/services/tripSyncService';
import { useTripStore } from '@/lib/stores/tripStore';
import { Cloud, CloudOff, RefreshCw, AlertCircle, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';

interface SyncStatusBadgeProps {
    /** Show full status text (not just icon) */
    showText?: boolean;
    /** Custom class name */
    className?: string;
}

export function SyncStatusBadge({ showText = false, className = '' }: SyncStatusBadgeProps) {
    const currentTrip = useTripStore((state) => state.currentTrip);
    const [status, setStatus] = useState<SyncStatus>('unknown');
    const [queueInfo, setQueueInfo] = useState({ pending: 0, failed: 0 });
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
                    text: 'Synced',
                    tone: 'text-[var(--success)]',
                    bg: 'bg-[color:var(--success)]/15',
                };
            case 'pending':
            case 'syncing':
                return {
                    icon: <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />,
                    text: `Syncing${queueInfo.pending > 0 ? ` (${queueInfo.pending})` : ''}`,
                    tone: 'text-[var(--info)]',
                    bg: 'bg-[color:var(--info)]/15',
                };
            case 'failed':
                return {
                    icon: <AlertCircle className="h-4 w-4" />,
                    text: `Failed (${queueInfo.failed})`,
                    tone: 'text-[var(--error)]',
                    bg: 'bg-[color:var(--error)]/15',
                };
            case 'offline':
                return {
                    icon: <CloudOff className="h-4 w-4" />,
                    text: 'Offline',
                    tone: 'text-[var(--ink-secondary)]',
                    bg: 'bg-[color:var(--ink-tertiary)]/10',
                };
            default:
                return {
                    icon: <Cloud className="h-4 w-4" />,
                    text: 'Unknown',
                    tone: 'text-[var(--ink-tertiary)]',
                    bg: 'bg-[color:var(--ink-tertiary)]/10',
                };
        }
    };

    const config = getStatusConfig();

    const content = (
        <div
            className={
                `inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ` +
                `${config.tone} ${config.bg} ${className}`
            }
        >
            {config.icon}
            {showText && <span>{config.text}</span>}
        </div>
    );

    if (status === 'failed' || status === 'pending') {
        return (
            <Tooltip
                content={
                    status === 'failed'
                        ? `${queueInfo.failed} sync operations failed. Click to retry.`
                        : `${queueInfo.pending} changes pending sync. Click to sync now.`
                }
            >
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-auto p-0"
                    onClick={handleManualSync}
                    disabled={isSyncing}
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
