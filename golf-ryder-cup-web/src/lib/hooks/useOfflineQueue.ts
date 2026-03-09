/**
 * useOfflineQueue Hook — Phase 5: Data Integration
 *
 * Offline-first data queue for reliable sync:
 * - Queue actions while offline
 * - Auto-sync when connection restored
 * - Retry with exponential backoff
 * - Conflict resolution
 * - Progress tracking
 *
 * Core infrastructure for offline support.
 */

'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useOnlineStatus } from './useOnlineStatus';
import { useHaptic } from './useHaptic';
import { createLogger } from '../utils/logger';
import { db, useLiveQuery } from '../db';
import {
  queueSyncOperation,
  processSyncQueue,
  retryFailedQueue,
  clearQueue as clearSyncQueue,
  clearFailedQueue,
} from '../services/tripSyncService';
import type { SyncQueueItem } from '../types/sync';

const logger = createLogger('OfflineQueue');

// ============================================
// TYPES
// ============================================

export type QueueActionType =
  | 'score'
  | 'score-update'
  | 'score-delete'
  | 'match-finalize'
  | 'match-create'
  | 'player-join'
  | 'player-update'
  | 'photo-upload'
  | 'reaction'
  | 'comment';

export interface QueuedAction {
  id: string;
  type: QueueActionType;
  matchId?: string;
  playerId?: string;
  holeNumber?: number;
  data?: unknown;
  timestamp: string;
  retryCount: number;
  status: 'pending' | 'processing' | 'failed' | 'complete';
  error?: string;
}

interface UseOfflineQueueReturn {
  // State
  pendingCount: number;
  failedCount: number;
  isSyncing: boolean;
  lastSyncTime: string | null;
  progress: number; // 0-100

  // Actions
  queueAction: (action: Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount' | 'status'>) => void;
  retryFailed: () => Promise<void>;
  clearQueue: () => Promise<void>;
  clearFailed: () => Promise<void>;

  // Queue data
  queue: QueuedAction[];
  failedActions: QueuedAction[];
}

// ============================================
// HELPERS
// ============================================

function mapQueueType(item: SyncQueueItem): QueueActionType {
  if (item.entity === 'holeResult') {
    if (item.operation === 'create') return 'score';
    if (item.operation === 'update') return 'score-update';
    return 'score-delete';
  }

  if (item.entity === 'match') {
    return item.operation === 'create' ? 'match-create' : 'match-finalize';
  }

  if (item.entity === 'player') {
    return item.operation === 'create' ? 'player-join' : 'player-update';
  }

  return 'comment';
}

function toQueuedAction(item: SyncQueueItem): QueuedAction {
  const data = item.data as
    | { matchId?: string; playerId?: string; holeNumber?: number }
    | undefined;

  let status: QueuedAction['status'];
  if (item.status === 'syncing') {
    status = 'processing';
  } else if (item.status === 'completed') {
    status = 'complete';
  } else {
    status = item.status;
  }

  return {
    id: item.id,
    type: mapQueueType(item),
    matchId: data?.matchId ?? (item.entity === 'match' ? item.entityId : undefined),
    playerId: data?.playerId,
    holeNumber: data?.holeNumber,
    data: item.data,
    timestamp: item.createdAt,
    retryCount: item.retryCount,
    status,
    error: item.error,
  };
}

async function resolveTripId(
  action: Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount' | 'status'>
): Promise<string | null> {
  const data = action.data as { tripId?: string; sessionId?: string; matchId?: string } | undefined;

  if (data?.tripId) return data.tripId;

  if (data?.sessionId) {
    const session = await db.sessions.get(data.sessionId);
    return session?.tripId ?? null;
  }

  if (action.matchId) {
    const match = await db.matches.get(action.matchId);
    if (match) {
      const session = await db.sessions.get(match.sessionId);
      return session?.tripId ?? null;
    }
  }

  if (action.playerId) {
    const player = await db.players.get(action.playerId);
    return player?.tripId ?? null;
  }

  return null;
}

// ============================================
// MAIN HOOK
// ============================================

export function useOfflineQueue(): UseOfflineQueueReturn {
  const isOnline = useOnlineStatus();
  const haptic = useHaptic();

  const queueItems = useLiveQuery(
    async () => db.tripSyncQueue.toArray(),
    [],
    [] as SyncQueueItem[]
  );
  const queue = useMemo(() => (queueItems || []).map(toQueuedAction), [queueItems]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  const syncingRef = useRef(false);

  // Calculate derived state
  const pendingCount = (queueItems ?? []).filter(
    (a) => a.status === 'pending' || a.status === 'syncing'
  ).length;

  const failedCount = (queueItems ?? []).filter((a) => a.status === 'failed').length;

  const failedActions = queue.filter((a: QueuedAction) => a.status === 'failed');

  // Queue a new action
  const queueAction = useCallback(
    (action: Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount' | 'status'>) => {
      const enqueue = async () => {
        const tripId = await resolveTripId(action);
        if (!tripId) {
          logger.warn('Unable to resolve tripId for offline action:', action.type);
          return;
        }

        if (action.type === 'score') {
          if (!action.matchId || !action.holeNumber) return;
          const data = action.data as { id?: string } | undefined;
          const entityId = data?.id || `${action.matchId}-hole-${action.holeNumber}`;
          queueSyncOperation('holeResult', entityId, 'create', tripId, action.data);
        } else if (action.type === 'score-update') {
          if (!action.matchId || !action.holeNumber) return;
          const data = action.data as { id?: string } | undefined;
          const entityId = data?.id || `${action.matchId}-hole-${action.holeNumber}`;
          queueSyncOperation('holeResult', entityId, 'update', tripId, action.data);
        } else if (action.type === 'score-delete') {
          if (!action.matchId || !action.holeNumber) return;
          const entityId = `${action.matchId}-hole-${action.holeNumber}`;
          queueSyncOperation('holeResult', entityId, 'delete', tripId);
        } else if (action.type === 'match-finalize') {
          if (!action.matchId) return;
          queueSyncOperation('match', action.matchId, 'update', tripId);
        } else if (action.type === 'match-create') {
          if (!action.matchId) return;
          queueSyncOperation('match', action.matchId, 'create', tripId, action.data);
        } else if (action.type === 'player-join') {
          if (!action.playerId) return;
          queueSyncOperation('player', action.playerId, 'create', tripId, action.data);
        } else if (action.type === 'player-update') {
          if (!action.playerId) return;
          queueSyncOperation('player', action.playerId, 'update', tripId, action.data);
        } else {
          logger.warn('Offline action type not supported for sync:', action.type);
        }

        haptic.tap();
      };

      void enqueue();
    },
    [haptic]
  );

  // Process queue
  const processQueue = useCallback(async () => {
    if (syncingRef.current || !isOnline) return;

    if (pendingCount === 0) return;

    syncingRef.current = true;
    setIsSyncing(true);
    setProgress(0);
    const result = await processSyncQueue();

    setProgress(result.synced + result.failed > 0 ? 100 : 0);
    setLastSyncTime(new Date().toISOString());
    setIsSyncing(false);
    syncingRef.current = false;

    if (result.synced > 0) {
      haptic.tap();
    }
  }, [isOnline, haptic, pendingCount]);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      queueMicrotask(() => {
        void processQueue();
      });
    }
  }, [isOnline, pendingCount, processQueue]);

  // Retry failed actions
  const retryFailed = useCallback(async () => {
    await retryFailedQueue();
    await processQueue();
  }, [processQueue]);

  // Clear entire queue
  const clearQueue = useCallback(async () => {
    await clearSyncQueue();
  }, []);

  // Clear only failed
  const clearFailed = useCallback(async () => {
    await clearFailedQueue();
  }, []);

  return {
    // State
    pendingCount,
    failedCount,
    isSyncing,
    lastSyncTime,
    progress,

    // Actions
    queueAction,
    retryFailed,
    clearQueue,
    clearFailed,

    // Queue data
    queue,
    failedActions,
  };
}

// ============================================
// OFFLINE INDICATOR HOOK
// ============================================

export function useOfflineIndicator() {
  const isOnline = useOnlineStatus();
  const { pendingCount, isSyncing, progress } = useOfflineQueue();

  return {
    showIndicator: !isOnline || pendingCount > 0,
    isOffline: !isOnline,
    hasPending: pendingCount > 0,
    isSyncing,
    progress,
    message: !isOnline
      ? 'You are offline'
      : isSyncing
        ? `Syncing ${pendingCount} items...`
        : pendingCount > 0
          ? `${pendingCount} items waiting to sync`
          : '',
  };
}

export default useOfflineQueue;
