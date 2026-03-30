
import { db } from '../../db';
import type { SyncEntity, SyncOperation, SyncQueueItem } from '../../types/sync';
import { syncEntityToCloud } from './tripSyncEntityWriters';
import {
  MAX_RETRY_COUNT,
  SYNC_DEBOUNCE_MS,
  canSync,
  getRetryDelay,
  logger,
  sleep,
  tripSyncRuntime,
} from './tripSyncShared';
import type { BulkSyncResult, SyncStatus } from './tripSyncTypes';

async function persistQueueItem(item: SyncQueueItem): Promise<void> {
  try {
    await db.tripSyncQueue.put(item);
  } catch (error) {
    logger.warn('Failed to persist sync queue item:', error);
  }
}

async function removeQueueItem(id: string): Promise<void> {
  try {
    await db.tripSyncQueue.delete(id);
  } catch (error) {
    logger.warn('Failed to remove sync queue item:', error);
  }
}

async function ensureQueueHydrated(): Promise<void> {
  if (tripSyncRuntime.queueHydrated) return;
  if (tripSyncRuntime.queueHydrationPromise) return tripSyncRuntime.queueHydrationPromise;

  tripSyncRuntime.queueHydrationPromise = (async () => {
    try {
      const storedItems = await db.tripSyncQueue.toArray();
      if (storedItems.length > 0) {
        const merged = new Map<string, SyncQueueItem>();
        for (const item of tripSyncRuntime.syncQueue) {
          merged.set(item.id, item);
        }
        for (const item of storedItems) {
          const hydratedItem = item.idempotencyKey
            ? item
            : {
                ...item,
                idempotencyKey: buildSyncOperationKey(
                  item.entity,
                  item.entityId,
                  item.operation,
                  item.tripId
                ),
              };
          merged.set(item.id, hydratedItem);
        }
        tripSyncRuntime.syncQueue.length = 0;
        tripSyncRuntime.syncQueue.push(...merged.values());
      }
    } catch (error) {
      logger.warn('Failed to hydrate sync queue:', error);
    } finally {
      tripSyncRuntime.queueHydrated = true;
      tripSyncRuntime.queueHydrationPromise = null;
    }
  })();

  return tripSyncRuntime.queueHydrationPromise;
}

export function buildSyncOperationKey(
  entity: SyncEntity,
  entityId: string,
  operation: SyncOperation,
  tripId: string
): string {
  return `${tripId}:${entity}:${entityId}:${operation}`;
}

/**
 * Deterministic conflict policy for queued operations on the same entity.
 * Ensures queue transitions are idempotent and converge to the correct final state.
 */
export function resolveSyncOperationTransition(
  existingOperation: SyncOperation,
  incomingOperation: SyncOperation
): SyncOperation | 'noop' {
  if (existingOperation === 'create' && incomingOperation === 'update') {
    return 'create';
  }

  if (existingOperation === 'create' && incomingOperation === 'delete') {
    return 'noop';
  }

  if (existingOperation === 'update' && incomingOperation === 'delete') {
    return 'delete';
  }

  if (existingOperation === 'delete' && (incomingOperation === 'create' || incomingOperation === 'update')) {
    return 'update';
  }

  return incomingOperation;
}

export function queueSyncOperation(
  entity: SyncEntity,
  entityId: string,
  operation: SyncOperation,
  tripId: string,
  data?: unknown
): void {
  void ensureQueueHydrated();

  const idempotencyKey = buildSyncOperationKey(entity, entityId, operation, tripId);

  const existing = tripSyncRuntime.syncQueue.find(
    (item) =>
      (item.idempotencyKey === idempotencyKey ||
        (item.entityId === entityId && item.entity === entity && item.tripId === tripId)) &&
      (item.status === 'pending' || item.status === 'syncing')
  );

  if (existing) {
    const resolvedOperation = resolveSyncOperationTransition(existing.operation, operation);

    if (resolvedOperation === 'noop') {
      const existingIndex = tripSyncRuntime.syncQueue.findIndex((item) => item.id === existing.id);
      if (existingIndex >= 0) {
        tripSyncRuntime.syncQueue.splice(existingIndex, 1);
      }
      void removeQueueItem(existing.id);
      return;
    }

    existing.data = data;
    existing.operation = resolvedOperation;
    existing.idempotencyKey = idempotencyKey;

    if (resolvedOperation === 'delete') {
      existing.data = undefined;
    }

    void persistQueueItem(existing);
    return;
  }

  const item: SyncQueueItem = {
    id: crypto.randomUUID(),
    entity,
    entityId,
    operation,
    data,
    tripId,
    status: 'pending',
    retryCount: 0,
    createdAt: new Date().toISOString(),
    idempotencyKey,
  };

  tripSyncRuntime.syncQueue.push(item);
  void persistQueueItem(item);
  logger.log(`Queued ${operation} for ${entity}:${entityId}`);

  if (canSync()) {
    scheduleSyncQueueProcessing();
  }
}

export function scheduleSyncQueueProcessing(): void {
  if (tripSyncRuntime.syncDebounceTimer) {
    clearTimeout(tripSyncRuntime.syncDebounceTimer);
  }
  tripSyncRuntime.syncDebounceTimer = setTimeout(() => {
    processSyncQueue().catch((err) => {
      logger.error('Queue processing error:', err);
    });
  }, SYNC_DEBOUNCE_MS);
}

export function clearScheduledSyncQueueProcessing(): void {
  if (tripSyncRuntime.syncDebounceTimer) {
    clearTimeout(tripSyncRuntime.syncDebounceTimer);
    tripSyncRuntime.syncDebounceTimer = null;
  }
}

export async function processSyncQueue(): Promise<BulkSyncResult> {
  await ensureQueueHydrated();

  if (!canSync()) {
    return {
      success: false,
      synced: 0,
      failed: 0,
      queued: tripSyncRuntime.syncQueue.length,
      errors: ['Offline'],
    };
  }

  if (tripSyncRuntime.syncInProgress) {
    return {
      success: true,
      synced: 0,
      failed: 0,
      queued: tripSyncRuntime.syncQueue.length,
      errors: [],
    };
  }

  tripSyncRuntime.syncInProgress = true;
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  try {
    const pendingItems = tripSyncRuntime.syncQueue.filter(
      (item) =>
        item.status === 'pending' || (item.status === 'failed' && item.retryCount < MAX_RETRY_COUNT)
    );

    for (const item of pendingItems) {
      item.status = 'syncing';
      item.lastAttemptAt = new Date().toISOString();
      await persistQueueItem(item);

      try {
        if (item.retryCount > 0) {
          await sleep(getRetryDelay(item.retryCount - 1));
        }

        await syncEntityToCloud(item);
        item.status = 'completed';
        await persistQueueItem(item);
        synced++;
      } catch (err) {
        item.retryCount++;
        item.error = err instanceof Error ? err.message : 'Unknown error';

        if (item.retryCount >= MAX_RETRY_COUNT) {
          item.status = 'failed';
          failed++;
          errors.push(`${item.entity}:${item.entityId} - ${item.error}`);
        } else {
          item.status = 'pending';
        }
        await persistQueueItem(item);
      }
    }

    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    for (let i = tripSyncRuntime.syncQueue.length - 1; i >= 0; i--) {
      const item = tripSyncRuntime.syncQueue[i];
      if (item.status === 'completed' && new Date(item.createdAt).getTime() < fiveMinutesAgo) {
        tripSyncRuntime.syncQueue.splice(i, 1);
        await removeQueueItem(item.id);
      }
    }

    const remaining = tripSyncRuntime.syncQueue.filter((item) => item.status !== 'completed').length;
    return { success: errors.length === 0, synced, failed, queued: remaining, errors };
  } finally {
    tripSyncRuntime.syncInProgress = false;
  }
}

export async function retryFailedQueue(): Promise<number> {
  await ensureQueueHydrated();

  let retried = 0;
  for (const item of tripSyncRuntime.syncQueue) {
    if (item.status === 'failed') {
      item.status = 'pending';
      item.retryCount = 0;
      item.error = undefined;
      await persistQueueItem(item);
      retried++;
    }
  }

  return retried;
}

export async function clearQueue(): Promise<number> {
  await ensureQueueHydrated();
  const cleared = tripSyncRuntime.syncQueue.length;
  tripSyncRuntime.syncQueue.length = 0;
  try {
    await db.tripSyncQueue.clear();
  } catch (error) {
    logger.warn('Failed to clear sync queue:', error);
  }
  return cleared;
}

export async function clearFailedQueue(): Promise<number> {
  await ensureQueueHydrated();
  let cleared = 0;

  for (let i = tripSyncRuntime.syncQueue.length - 1; i >= 0; i--) {
    const item = tripSyncRuntime.syncQueue[i];
    if (item.status === 'failed') {
      tripSyncRuntime.syncQueue.splice(i, 1);
      await removeQueueItem(item.id);
      cleared++;
    }
  }

  return cleared;
}

export async function purgeQueueForTrip(tripId: string): Promise<number> {
  await ensureQueueHydrated();

  let removed = 0;
  for (let i = tripSyncRuntime.syncQueue.length - 1; i >= 0; i--) {
    const item = tripSyncRuntime.syncQueue[i];
    if (item.tripId === tripId) {
      tripSyncRuntime.syncQueue.splice(i, 1);
      await removeQueueItem(item.id);
      removed++;
    }
  }

  return removed;
}

export function getSyncQueueStatus(): {
  pending: number;
  failed: number;
  total: number;
} {
  const pending = tripSyncRuntime.syncQueue.filter(
    (item) => item.status === 'pending' || item.status === 'syncing'
  ).length;
  const failed = tripSyncRuntime.syncQueue.filter((item) => item.status === 'failed').length;
  return { pending, failed, total: tripSyncRuntime.syncQueue.length };
}

export function getTripSyncStatus(tripId: string): SyncStatus {
  if (!tripSyncRuntime.isOnline) return 'offline';

  const tripItems = tripSyncRuntime.syncQueue.filter((item) => item.tripId === tripId);
  if (tripItems.length === 0) return 'synced';

  const hasFailed = tripItems.some((item) => item.status === 'failed');
  const hasPending = tripItems.some(
    (item) => item.status === 'pending' || item.status === 'syncing'
  );

  if (hasFailed) return 'failed';
  if (hasPending) return 'pending';
  return 'synced';
}
