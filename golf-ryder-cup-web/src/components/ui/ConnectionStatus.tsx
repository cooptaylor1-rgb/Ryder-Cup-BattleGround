/**
 * Connection Status Component
 *
 * Shows real-time connection status and sync state.
 * Combines online/offline detection with Supabase connection status.
 */

'use client';

import { useOnlineStatus } from '@/lib/hooks';
import { useSyncStatus, isSupabaseConfigured } from '@/lib/supabase';
import { Wifi, WifiOff, Cloud, CloudOff, RefreshCw, Check, AlertCircle, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface ConnectionStatusProps {
    tripId?: string;
    showDetails?: boolean;
    className?: string;
}

export function ConnectionStatus({ tripId: _tripId, showDetails = false, className }: ConnectionStatusProps) {
    const isOnline = useOnlineStatus();
    const syncStatus = useSyncStatus();
    const [showFullStatus, setShowFullStatus] = useState(false);

    // Determine overall status
    const getStatus = () => {
        if (!isOnline) return 'offline';
        if (!isSupabaseConfigured) return 'local';
        if (syncStatus.isSyncing) return 'syncing';
        if (syncStatus.pendingChanges > 0) return 'pending';
        return 'connected';
    };

    const status = getStatus();

    const statusConfig = {
        offline: {
            icon: WifiOff,
            label: 'Offline',
            description: 'Scores saved locally',
            color: 'text-warning',
            bgColor: 'bg-warning/10',
            borderColor: 'border-warning/30',
        },
        local: {
            icon: CloudOff,
            label: 'Local Only',
            description: 'Cloud sync not configured',
            color: 'text-surface-500',
            bgColor: 'bg-surface-100 dark:bg-surface-800',
            borderColor: 'border-surface-300 dark:border-surface-700',
        },
        syncing: {
            icon: RefreshCw,
            label: 'Syncing',
            description: 'Uploading changes...',
            color: 'text-info',
            bgColor: 'bg-info/10',
            borderColor: 'border-info/30',
        },
        pending: {
            icon: Cloud,
            label: 'Pending',
            description: `${syncStatus.pendingChanges} changes to sync`,
            color: 'text-warning',
            bgColor: 'bg-warning/10',
            borderColor: 'border-warning/30',
        },
        connected: {
            icon: Check,
            label: 'Connected',
            description: 'All changes synced',
            color: 'text-success',
            bgColor: 'bg-success/10',
            borderColor: 'border-success/30',
        },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    // Compact mode (just the icon)
    if (!showDetails) {
        return (
            <button
                onClick={() => setShowFullStatus(!showFullStatus)}
                className={cn(
                    'relative flex items-center gap-1.5 px-2 py-1 rounded-full text-sm transition-colors',
                    config.bgColor,
                    config.color,
                    className
                )}
                title={config.label}
            >
                <Icon className={cn('w-4 h-4', status === 'syncing' && 'animate-spin')} />
                {syncStatus.pendingChanges > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-warning text-white text-xs flex items-center justify-center">
                        {syncStatus.pendingChanges}
                    </span>
                )}
            </button>
        );
    }

    // Full status display
    return (
        <div className={cn('rounded-lg border p-3', config.bgColor, config.borderColor, className)}>
            <div className="flex items-center gap-3">
                <div className={cn('p-2 rounded-full', config.bgColor)}>
                    <Icon className={cn('w-5 h-5', config.color, status === 'syncing' && 'animate-spin')} />
                </div>
                <div className="flex-1">
                    <div className={cn('font-medium', config.color)}>{config.label}</div>
                    <div className="text-sm text-surface-500">{config.description}</div>
                </div>
                {syncStatus.lastSyncAt && (
                    <div className="text-xs text-surface-400">
                        Last sync: {formatRelativeTime(syncStatus.lastSyncAt)}
                    </div>
                )}
            </div>
        </div>
    );
}

/**
 * Connection Status Badge - Minimal version for headers
 */
export function ConnectionStatusBadge({ className }: { className?: string }) {
    const isOnline = useOnlineStatus();
    const syncStatus = useSyncStatus();

    if (!isOnline) {
        return (
            <span className={cn('flex items-center gap-1 text-xs text-warning', className)}>
                <WifiOff className="w-3 h-3" />
                Offline
            </span>
        );
    }

    if (syncStatus.isSyncing) {
        return (
            <span className={cn('flex items-center gap-1 text-xs text-info', className)}>
                <RefreshCw className="w-3 h-3 animate-spin" />
                Syncing
            </span>
        );
    }

    if (syncStatus.pendingChanges > 0) {
        return (
            <span className={cn('flex items-center gap-1 text-xs text-warning', className)}>
                <Cloud className="w-3 h-3" />
                {syncStatus.pendingChanges} pending
            </span>
        );
    }

    if (isSupabaseConfigured) {
        return (
            <span className={cn('flex items-center gap-1 text-xs text-success', className)}>
                <Wifi className="w-3 h-3" />
                Live
            </span>
        );
    }

    return (
        <span className={cn('flex items-center gap-1 text-xs text-surface-500', className)}>
            <CloudOff className="w-3 h-3" />
            Local
        </span>
    );
}

/**
 * Active Users Indicator
 */
interface ActiveUsersProps {
    users: Array<{ id: string; name: string; avatarUrl?: string }>;
    className?: string;
}

export function ActiveUsersIndicator({ users, className }: ActiveUsersProps) {
    if (users.length === 0) return null;

    const displayUsers = users.slice(0, 3);
    const remainingCount = users.length - 3;

    return (
        <div className={cn('flex items-center gap-2', className)}>
            <Users className="w-4 h-4 text-surface-400" />
            <div className="flex -space-x-2">
                {displayUsers.map((user) => (
                    <div
                        key={user.id}
                        className="w-6 h-6 rounded-full bg-masters-primary text-white text-xs flex items-center justify-center border-2 border-surface-card"
                        title={user.name}
                    >
                        {user.name.charAt(0).toUpperCase()}
                    </div>
                ))}
                {remainingCount > 0 && (
                    <div className="w-6 h-6 rounded-full bg-surface-300 dark:bg-surface-600 text-xs flex items-center justify-center border-2 border-surface-card">
                        +{remainingCount}
                    </div>
                )}
            </div>
            <span className="text-xs text-surface-500">
                {users.length} {users.length === 1 ? 'viewer' : 'viewers'}
            </span>
        </div>
    );
}

/**
 * Sync Error Banner
 */
export function SyncErrorBanner() {
    const syncStatus = useSyncStatus();
    const [dismissed, setDismissed] = useState(false);

    if (!syncStatus.error || dismissed) return null;

    return (
        <div className="fixed bottom-20 left-4 right-4 z-40 p-4 rounded-lg bg-error/10 border border-error/30">
            <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
                <div className="flex-1">
                    <div className="font-medium text-error">Sync Error</div>
                    <div className="text-sm text-surface-600 dark:text-surface-400">
                        {syncStatus.error}
                    </div>
                </div>
                <button
                    onClick={() => setDismissed(true)}
                    className="text-surface-400 hover:text-surface-600"
                >
                    &times;
                </button>
            </div>
        </div>
    );
}

// Helper function
function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);

    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
}

export default ConnectionStatus;
