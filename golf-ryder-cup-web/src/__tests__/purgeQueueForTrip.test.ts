/**
 * Trip sync queue purge tests
 *
 * Phase 0 requirement: deleting a trip must not allow stale queued operations
 * to resurrect the trip or its entities.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { db } from '../lib/db';
import { purgeQueueForTrip, type SyncQueueItem } from '../lib/services/tripSyncService';

function isoNow() {
  return new Date().toISOString();
}

describe('purgeQueueForTrip', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
  });

  it('removes all persisted queued operations for the specified trip', async () => {
    const now = isoNow();

    const items: SyncQueueItem[] = [
      {
        id: 'q-1',
        entity: 'match',
        entityId: 'match-1',
        operation: 'update',
        tripId: 'trip-a',
        status: 'pending',
        retryCount: 0,
        createdAt: now,
      },
      {
        id: 'q-2',
        entity: 'holeResult',
        entityId: 'hr-1',
        operation: 'create',
        tripId: 'trip-a',
        status: 'failed',
        retryCount: 2,
        createdAt: now,
      },
      {
        id: 'q-3',
        entity: 'trip',
        entityId: 'trip-b',
        operation: 'update',
        tripId: 'trip-b',
        status: 'pending',
        retryCount: 0,
        createdAt: now,
      },
    ];

    await db.tripSyncQueue.bulkPut(items);

    const removed = await purgeQueueForTrip('trip-a');
    expect(removed).toBe(2);

    const remaining = await db.tripSyncQueue.toArray();
    expect(remaining.map((i) => i.id).sort()).toEqual(['q-3']);
  });
});
