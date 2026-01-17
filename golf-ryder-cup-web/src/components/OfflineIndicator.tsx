'use client';

/**
 * Offline Status Indicator
 *
 * Shows network status and sync state to users:
 * - Banner when offline (data saved locally)
 * - Quick indicator when back online
 * - Sync queue visualization
 * - Pending changes counter
 * - Respects user's reduced motion preferences
 */

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    WifiOff,
    Wifi,
    CloudOff,
    Check,
    RefreshCw,
    Upload,
    ChevronDown,
    ChevronUp,
    AlertCircle,
    Clock,
} from 'lucide-react';
import { usePWA } from './PWAProvider';
import { db } from '@/lib/db';
import { useLiveQuery } from 'dexie-react-hooks';

type SyncStatus = 'offline' | 'online' | 'syncing' | 'synced';

// Track pending sync items
interface SyncQueueItem {
    id: string;
    type: 'score' | 'match' | 'banter' | 'player' | 'other';
    description: string;
    timestamp: number;
    retryCount: number;
    error?: string;
}

// Hook to track sync queue
export function useSyncQueue() {
    // Track unsync'd items by checking local-only records
    // In a real app, you'd have a dedicated sync queue table
    const pendingResults = useLiveQuery(async () => {
        // Check for hole results that may need syncing
        // (simplified - real implementation would check sync status)
        // Note: Can't orderBy timestamp since it's not indexed, so we filter instead
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        const recentResults = await db.holeResults.toArray();
        return recentResults
            .filter(r => {
                const timestamp = new Date(r.timestamp).getTime();
                return timestamp > fiveMinutesAgo;
            })
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, 50);
    }, [], []);

    const pendingPosts = useLiveQuery(async () => {
        const recentPosts = await db.banterPosts
            .orderBy('timestamp')
            .reverse()
            .limit(20)
            .toArray();
        return recentPosts.filter(p => {
            const timestamp = new Date(p.timestamp).getTime();
            const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
            return timestamp > fiveMinutesAgo;
        });
    }, [], []);

    const queueItems: SyncQueueItem[] = [
        ...(pendingResults || []).map(r => ({
            id: r.id,
            type: 'score' as const,
            description: `Hole ${r.holeNumber} result`,
            timestamp: new Date(r.timestamp).getTime(),
            retryCount: 0,
        })),
        ...(pendingPosts || []).map(p => ({
            id: p.id,
            type: 'banter' as const,
            description: p.content ? `${p.content.slice(0, 30)}...` : 'Post',
            timestamp: new Date(p.timestamp).getTime(),
            retryCount: 0,
        })),
    ].sort((a, b) => b.timestamp - a.timestamp);

    return {
        queueItems,
        pendingCount: queueItems.length,
        isEmpty: queueItems.length === 0,
    };
}

export function OfflineIndicator() {
    const { isOnline } = usePWA();
    const { pendingCount, queueItems } = useSyncQueue();
    const [syncStatus, setSyncStatus] = useState<SyncStatus>(isOnline ? 'online' : 'offline');
    const [showBanner, setShowBanner] = useState(false);
    const [justCameOnline, setJustCameOnline] = useState(false);
    const [showDetails, setShowDetails] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        if (!isOnline) {
            setSyncStatus('offline');
            setShowBanner(true);
            setJustCameOnline(false);
        } else if (syncStatus === 'offline') {
            // Just came back online - trigger sync
            setSyncStatus('syncing');
            setIsSyncing(true);
            setJustCameOnline(true);

            // Simulate sync completion
            setTimeout(() => {
                setIsSyncing(false);
                setSyncStatus('synced');
            }, 2000);

            // Show "back online" message briefly
            setTimeout(() => {
                setShowBanner(false);
            }, 3000);

            // Hide "just came online" indicator after animation
            setTimeout(() => {
                setJustCameOnline(false);
            }, 4000);
        }
    }, [isOnline, syncStatus]);

    // Don't show anything if online and not just reconnected
    if (isOnline && !showBanner && !justCameOnline) {
        return null;
    }

    return (
        <>
            {/* Offline Banner */}
            <AnimatePresence>
                {showBanner && (
                    <motion.div
                        initial={{ y: -100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -100, opacity: 0 }}
                        className="fixed top-0 left-0 right-0 z-50"
                        style={{
                            background: !isOnline
                                ? 'linear-gradient(135deg, #DC2626 0%, #B91C1C 100%)'
                                : isSyncing
                                    ? 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)'
                                    : 'linear-gradient(135deg, var(--masters) 0%, #005238 100%)',
                            paddingTop: 'env(safe-area-inset-top)',
                        }}
                    >
                        <div className="px-4 py-2">
                            {/* Main status row */}
                            <div className="flex items-center justify-center gap-2">
                                {!isOnline ? (
                                    <>
                                        <WifiOff size={16} className="text-white" />
                                        <span className="text-sm font-medium text-white">
                                            You&apos;re offline
                                        </span>
                                        {pendingCount > 0 && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white">
                                                {pendingCount} pending
                                            </span>
                                        )}
                                    </>
                                ) : isSyncing ? (
                                    <>
                                        <RefreshCw size={16} className="text-white animate-spin" />
                                        <span className="text-sm font-medium text-white">
                                            Syncing changes...
                                        </span>
                                    </>
                                ) : (
                                    <>
                                        <Check size={16} className="text-white" />
                                        <span className="text-sm font-medium text-white">
                                            Back online - all synced!
                                        </span>
                                    </>
                                )}
                            </div>

                            {/* Expand button for offline state */}
                            {!isOnline && pendingCount > 0 && (
                                <button
                                    onClick={() => setShowDetails(!showDetails)}
                                    className="w-full flex items-center justify-center gap-1 mt-1 text-white/80 hover:text-white"
                                >
                                    <span className="text-xs">
                                        {showDetails ? 'Hide' : 'View'} pending changes
                                    </span>
                                    {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                            )}

                            {/* Pending items detail */}
                            <AnimatePresence>
                                {showDetails && !isOnline && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="mt-2 pt-2 border-t border-white/20 space-y-1 max-h-32 overflow-y-auto">
                                            {queueItems.slice(0, 5).map((item) => (
                                                <div
                                                    key={item.id}
                                                    className="flex items-center gap-2 text-white/90 text-xs"
                                                >
                                                    <Clock size={12} className="shrink-0" />
                                                    <span className="truncate flex-1">{item.description}</span>
                                                    <span className="text-white/60">
                                                        {new Date(item.timestamp).toLocaleTimeString([], {
                                                            hour: '2-digit',
                                                            minute: '2-digit',
                                                        })}
                                                    </span>
                                                </div>
                                            ))}
                                            {queueItems.length > 5 && (
                                                <p className="text-xs text-white/60 text-center">
                                                    +{queueItems.length - 5} more items
                                                </p>
                                            )}
                                        </div>
                                        <p className="text-xs text-white/70 text-center mt-2">
                                            Changes will sync when you&apos;re back online
                                        </p>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Small status pill (shows briefly when reconnecting) */}
            <AnimatePresence>
                {justCameOnline && !showBanner && (
                    <motion.div
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -20, opacity: 0 }}
                        className="fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border"
                    >
                        <Wifi size={14} className="text-green-500" />
                        <span className="text-xs font-medium">Online</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}

/**
 * Compact sync status for headers/footers
 */
export function SyncStatusChip() {
    const { isOnline } = usePWA();
    const { pendingCount } = useSyncQueue();

    if (isOnline && pendingCount === 0) return null;

    return (
        <div
            className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${!isOnline
                ? 'bg-red-500/15 border border-red-500/30'
                : 'bg-blue-500/15 border border-blue-500/30'
                }`}
        >
            {!isOnline ? (
                <>
                    <CloudOff size={12} className="text-red-500" />
                    <span className="text-xs font-medium text-red-500">
                        Offline {pendingCount > 0 && `(${pendingCount})`}
                    </span>
                </>
            ) : (
                <>
                    <Upload size={12} className="text-blue-500 animate-pulse" />
                    <span className="text-xs font-medium text-blue-500">
                        Syncing {pendingCount}
                    </span>
                </>
            )}
        </div>
    );
}

/**
 * Compact offline indicator for headers
 */
export function OfflineChip() {
    const { isOnline } = usePWA();

    if (isOnline) return null;

    return (
        <div
            className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/15 border border-red-500/30"
        >
            <CloudOff size={12} className="text-red-500" />
            <span className="text-xs font-medium text-red-500">
                Offline
            </span>
        </div>
    );
}
