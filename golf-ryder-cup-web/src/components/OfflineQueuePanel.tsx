'use client';

/**
 * Offline Queue Panel
 *
 * Full-featured panel for managing offline sync queue:
 * - View all pending changes
 * - Retry failed items
 * - Discard individual or all items
 * - Real-time status updates
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    CloudOff,
    RefreshCw,
    Trash2,
    ChevronRight,
    AlertCircle,
    Check,
    Clock,
    X,
    Loader2,
    RotateCcw,
} from 'lucide-react';
import { createLogger } from '@/lib/utils/logger';
import {
    getSyncQueue,
    getSyncQueueStats,
    retrySyncItem,
    discardSyncItem,
    discardAllPending,
    retryAllFailed,
    type SyncQueueItem,
    type SyncQueueStats,
} from '@/lib/services/syncQueueService';
import { usePWA } from './PWAProvider';

const logger = createLogger('OfflineQueue');

interface OfflineQueuePanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export function OfflineQueuePanel({ isOpen, onClose }: OfflineQueuePanelProps) {
    const { isOnline } = usePWA();
    const [items, setItems] = useState<SyncQueueItem[]>([]);
    const [stats, setStats] = useState<SyncQueueStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionInProgress, setActionInProgress] = useState<string | null>(null);
    const [confirmDiscard, setConfirmDiscard] = useState<string | null>(null);
    const [confirmDiscardAll, setConfirmDiscardAll] = useState(false);

    const loadQueue = useCallback(async () => {
        try {
            const [queueItems, queueStats] = await Promise.all([
                getSyncQueue(),
                getSyncQueueStats(),
            ]);
            setItems(queueItems);
            setStats(queueStats);
        } catch (error) {
            logger.error('Failed to load sync queue:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            loadQueue();
            // Refresh every 5 seconds when open
            const interval = setInterval(loadQueue, 5000);
            return () => clearInterval(interval);
        }
    }, [isOpen, loadQueue]);

    const handleRetry = async (item: SyncQueueItem) => {
        setActionInProgress(item.id);
        try {
            await retrySyncItem(item.id, item.type);
            await loadQueue();
        } finally {
            setActionInProgress(null);
        }
    };

    const handleDiscard = async (item: SyncQueueItem) => {
        setActionInProgress(item.id);
        try {
            await discardSyncItem(item.id, item.type);
            await loadQueue();
        } finally {
            setActionInProgress(null);
            setConfirmDiscard(null);
        }
    };

    const handleRetryAll = async () => {
        setActionInProgress('retry-all');
        try {
            await retryAllFailed();
            await loadQueue();
        } finally {
            setActionInProgress(null);
        }
    };

    const handleDiscardAll = async () => {
        setActionInProgress('discard-all');
        try {
            await discardAllPending();
            await loadQueue();
        } finally {
            setActionInProgress(null);
            setConfirmDiscardAll(false);
        }
    };

    const getTypeIcon = (type: SyncQueueItem['type']) => {
        switch (type) {
            case 'score':
                return '🎯';
            case 'match':
                return '⚔️';
            case 'banter':
                return '💬';
            case 'player':
                return '👤';
            case 'course':
                return '⛳';
            default:
                return '📄';
        }
    };

    const getStatusColor = (status: SyncQueueItem['status']) => {
        switch (status) {
            case 'pending':
                return 'text-yellow-500';
            case 'syncing':
                return 'text-blue-500';
            case 'failed':
                return 'text-red-500';
            case 'completed':
                return 'text-green-500';
            default:
                return 'text-gray-500';
        }
    };

    const formatTimestamp = (ts: number) => {
        const now = Date.now();
        const diff = now - ts;

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return new Date(ts).toLocaleDateString();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
                onClick={onClose}
            >
                <motion.div
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="absolute bottom-0 left-0 right-0 max-h-[80vh] rounded-t-2xl overflow-hidden bg-[var(--card)]"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="sticky top-0 z-10 px-4 py-3 border-b border-[var(--border)] bg-[var(--card)] flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                    isOnline ? 'bg-green-500/10' : 'bg-red-500/10'
                                }`}
                            >
                                {isOnline ? (
                                    <RefreshCw size={20} className="text-green-500" />
                                ) : (
                                    <CloudOff size={20} className="text-red-500" />
                                )}
                            </div>
                            <div>
                                <h2 className="font-semibold text-[var(--ink)]">Sync Queue</h2>
                                <p className="text-xs text-[var(--ink-secondary)]">
                                    {isOnline ? 'Online' : 'Offline'} • {stats?.total || 0} pending
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
                        >
                            <X size={20} className="text-[var(--ink-secondary)]" />
                        </button>
                    </div>

                    {/* Stats Bar */}
                    {stats && stats.total > 0 && (
                        <div className="px-4 py-2 flex items-center gap-4 border-b border-[var(--border)]">
                            <div className="flex items-center gap-1.5">
                                <Clock size={14} className="text-yellow-500" />
                                <span className="text-xs text-[var(--ink-secondary)]">
                                    {stats.pending} pending
                                </span>
                            </div>
                            {stats.failed > 0 && (
                                <div className="flex items-center gap-1.5">
                                    <AlertCircle size={14} className="text-red-500" />
                                    <span className="text-xs text-red-500">
                                        {stats.failed} failed
                                    </span>
                                </div>
                            )}
                            {stats.syncing > 0 && (
                                <div className="flex items-center gap-1.5">
                                    <Loader2 size={14} className="text-blue-500 animate-spin" />
                                    <span className="text-xs text-blue-500">
                                        {stats.syncing} syncing
                                    </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Content */}
                    <div className="overflow-y-auto max-h-[60vh]">
                        {loading ? (
                            <div className="flex items-center justify-center py-12">
                                <Loader2
                                    size={24}
                                    className="animate-spin text-[var(--ink-secondary)]"
                                />
                            </div>
                        ) : items.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 px-4">
                                <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4 bg-green-500/10">
                                    <Check size={32} className="text-green-500" />
                                </div>
                                <p className="font-medium text-[var(--ink)]">All synced!</p>
                                <p className="text-sm text-center mt-1 text-[var(--ink-secondary)]">
                                    No pending changes to sync
                                </p>
                            </div>
                        ) : (
                            <div className="divide-y divide-[var(--border)]">
                                {items.map((item) => (
                                    <div
                                        key={`${item.type}-${item.id}`}
                                        className="px-4 py-3 flex items-center gap-3"
                                    >
                                        {/* Type Icon */}
                                        <span className="text-lg">{getTypeIcon(item.type)}</span>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate text-[var(--ink)]">
                                                {item.description}
                                            </p>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className={`text-xs ${getStatusColor(item.status)}`}>
                                                    {item.status}
                                                </span>
                                                <span className="text-xs text-[var(--ink-muted)]">•</span>
                                                <span className="text-xs text-[var(--ink-secondary)]">
                                                    {formatTimestamp(item.timestamp)}
                                                </span>
                                                {item.retryCount > 0 && (
                                                    <>
                                                        <span className="text-xs text-[var(--ink-muted)]">
                                                            •
                                                        </span>
                                                        <span className="text-xs text-orange-500">
                                                            {item.retryCount} retries
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                            {item.error && (
                                                <p className="text-xs text-red-500 mt-1 truncate">
                                                    {item.error}
                                                </p>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        {confirmDiscard === item.id ? (
                                            <div className="flex items-center gap-1">
                                                <button
                                                    onClick={() => handleDiscard(item)}
                                                    className="p-2 rounded-lg bg-red-500 text-white"
                                                    disabled={actionInProgress === item.id}
                                                >
                                                    {actionInProgress === item.id ? (
                                                        <Loader2 size={16} className="animate-spin" />
                                                    ) : (
                                                        <Check size={16} />
                                                    )}
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDiscard(null)}
                                                    className="p-2 rounded-lg bg-[var(--surface)]"
                                                >
                                                    <X size={16} className="text-[var(--ink-secondary)]" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1">
                                                {item.status === 'failed' && (
                                                    <button
                                                        onClick={() => handleRetry(item)}
                                                        className="p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                                        disabled={actionInProgress === item.id}
                                                        title="Retry"
                                                    >
                                                        {actionInProgress === item.id ? (
                                                            <Loader2
                                                                size={16}
                                                                className="animate-spin text-blue-500"
                                                            />
                                                        ) : (
                                                            <RotateCcw size={16} className="text-blue-500" />
                                                        )}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => setConfirmDiscard(item.id)}
                                                    className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                                                    title="Discard"
                                                >
                                                    <Trash2 size={16} className="text-red-500" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    {items.length > 0 && (
                        <div className="sticky bottom-0 px-4 py-3 border-t border-[var(--border)] bg-[var(--card)] flex items-center justify-between gap-2">
                            {confirmDiscardAll ? (
                                <div className="flex items-center gap-2 w-full">
                                    <span className="text-sm flex-1 text-[var(--ink-secondary)]">
                                        Discard all {items.length} items?
                                    </span>
                                    <button
                                        onClick={handleDiscardAll}
                                        className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium"
                                        disabled={actionInProgress === 'discard-all'}
                                    >
                                        {actionInProgress === 'discard-all' ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            'Confirm'
                                        )}
                                    </button>
                                    <button
                                        onClick={() => setConfirmDiscardAll(false)}
                                        className="px-4 py-2 rounded-lg text-sm font-medium bg-[var(--surface)] text-[var(--ink)]"
                                    >
                                        Cancel
                                    </button>
                                </div>
                            ) : (
                                <>
                                    {stats && stats.failed > 0 && (
                                        <button
                                            onClick={handleRetryAll}
                                            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-500/10 text-blue-500"
                                            disabled={actionInProgress === 'retry-all'}
                                        >
                                            {actionInProgress === 'retry-all' ? (
                                                <Loader2 size={16} className="animate-spin" />
                                            ) : (
                                                <RotateCcw size={16} />
                                            )}
                                            Retry Failed
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setConfirmDiscardAll(true)}
                                        className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ml-auto bg-red-500/10 text-red-500"
                                    >
                                        <Trash2 size={16} />
                                        Discard All
                                    </button>
                                </>
                            )}
                        </div>
                    )}
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
}

/**
 * Mini queue indicator for nav bar
 */
export function SyncQueueBadge() {
    const [count, setCount] = useState(0);
    const [showPanel, setShowPanel] = useState(false);

    useEffect(() => {
        const loadCount = async () => {
            const stats = await getSyncQueueStats();
            setCount(stats.total);
        };
        loadCount();
        const interval = setInterval(loadCount, 10000);
        return () => clearInterval(interval);
    }, []);

    if (count === 0) return null;

    return (
        <>
            <button
                onClick={() => setShowPanel(true)}
                className="relative flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/10"
            >
                <CloudOff size={14} className="text-red-500" />
                <span className="text-xs font-medium text-red-500">{count}</span>
                <ChevronRight size={12} className="text-red-400" />
            </button>

            <OfflineQueuePanel isOpen={showPanel} onClose={() => setShowPanel(false)} />
        </>
    );
}
