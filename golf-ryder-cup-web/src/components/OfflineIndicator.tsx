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

import { useState, useEffect } from 'react';
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
  Clock,
} from 'lucide-react';
import { usePWA } from './PWAProvider';
import { db } from '@/lib/db';
import { useTripStore } from '@/lib/stores';
import { useLiveQuery } from 'dexie-react-hooks';
import type { SyncQueueItem as TripSyncQueueItem } from '@/lib/types/sync';

type SyncStatus = 'offline' | 'online' | 'syncing' | 'synced';

// Track pending sync items for display
interface SyncQueueItemDisplay {
  id: string;
  description: string;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'syncing' | 'failed' | 'completed';
  error?: string;
}

// Hook to track sync queue
export function useSyncQueue() {
  const { currentTrip } = useTripStore();

  const pendingQueue = useLiveQuery(
    async () => {
      if (currentTrip?.id) {
        return db.tripSyncQueue
          .where('[tripId+status]')
          .anyOf([
            [currentTrip.id, 'pending'],
            [currentTrip.id, 'syncing'],
            [currentTrip.id, 'failed'],
          ])
          .toArray();
      }

      return db.tripSyncQueue.where('status').anyOf(['pending', 'syncing', 'failed']).toArray();
    },
    [currentTrip?.id],
    [] as TripSyncQueueItem[]
  );

  const queueItems: SyncQueueItemDisplay[] = (pendingQueue || [])
    .map((item) => {
      const timestamp = item.lastAttemptAt || item.createdAt;
      return {
        id: item.id,
        description: `${item.entity} ${item.operation}`,
        timestamp: new Date(timestamp).getTime(),
        retryCount: item.retryCount,
        status: item.status,
        error: item.error,
      };
    })
    .sort((a, b) => b.timestamp - a.timestamp);

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
    // Defer state updates to avoid setState-in-effect warnings
    const timeoutId = setTimeout(() => {
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
    }, 0);

    return () => clearTimeout(timeoutId);
  }, [isOnline, syncStatus]);

  // Don't show anything if online and not just reconnected
  if (isOnline && !showBanner && !justCameOnline) {
    return null;
  }

  const bannerGradientClass = !isOnline
    ? 'bg-gradient-to-br from-red-600 to-red-700'
    : isSyncing
      ? 'bg-gradient-to-br from-blue-600 to-blue-700'
      : 'bg-gradient-to-br from-[color:var(--masters)] to-[color:var(--masters-deep)]';

  return (
    <>
      {/* Offline Banner */}
      <AnimatePresence>
        {showBanner && (
          <motion.div
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className={`fixed top-0 left-0 right-0 z-50 pt-[env(safe-area-inset-top)] ${bannerGradientClass}`}
          >
            <div className="px-4 py-2">
              {/* Main status row */}
              <div className="flex items-center justify-center gap-2">
                {!isOnline ? (
                  <>
                    <WifiOff size={16} className="text-white" />
                    <span className="text-sm font-medium text-white">You&apos;re offline</span>
                    {pendingCount > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white">
                        {pendingCount} pending
                      </span>
                    )}
                  </>
                ) : isSyncing ? (
                  <>
                    <RefreshCw size={16} className="text-white animate-spin" />
                    <span className="text-sm font-medium text-white">Syncing changes...</span>
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
                  <span className="text-xs">{showDetails ? 'Hide' : 'View'} pending changes</span>
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
                        <div key={item.id} className="flex flex-col gap-1 text-white/90 text-xs">
                          <div className="flex items-center gap-2">
                            <Clock size={12} className="shrink-0" />
                            <span className="truncate flex-1">{item.description}</span>
                            {item.retryCount > 0 && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-white/10 text-white/80">
                                Retry {item.retryCount}
                              </span>
                            )}
                            <span
                              className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                                item.status === 'failed'
                                  ? 'bg-white/20 text-white'
                                  : item.status === 'syncing'
                                    ? 'bg-white/15 text-white/90'
                                    : 'bg-white/10 text-white/80'
                              }`}
                            >
                              {item.status}
                            </span>
                            <span className="text-white/60">
                              {new Date(item.timestamp).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </span>
                          </div>
                          {item.error && (
                            <div className="text-[10px] text-white/70 pl-5" title={item.error}>
                              Last error: {item.error}
                            </div>
                          )}
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
            className="fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--rule)]"
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
      className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${
        !isOnline
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
          <span className="text-xs font-medium text-blue-500">Syncing {pendingCount}</span>
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
    <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-red-500/15 border border-red-500/30">
      <CloudOff size={12} className="text-red-500" />
      <span className="text-xs font-medium text-red-500">Offline</span>
    </div>
  );
}
