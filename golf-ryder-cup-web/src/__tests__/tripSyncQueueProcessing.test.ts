import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@sentry/nextjs', () => ({
  addBreadcrumb: vi.fn(),
}));

vi.mock('../lib/supabase/client', () => ({
  supabase: {
    from: vi.fn(),
  },
  isSupabaseConfigured: true,
}));

vi.mock('../lib/services/baseSyncService', () => ({
  calcRetryDelay: vi.fn(() => 0),
  syncSleep: vi.fn(() => Promise.resolve()),
}));

// Each entity table needs a `get(id)` for the FK auto-recovery path
// that reads child + parent rows when a Postgres 23503 error fires.
function makeFakeTable() {
  return {
    get: vi.fn(() => Promise.resolve(undefined)),
  };
}

vi.mock('../lib/db', () => ({
  db: {
    tripSyncQueue: {
      put: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      toArray: vi.fn(() => Promise.resolve([])),
    },
    matches: makeFakeTable(),
    practiceScores: makeFakeTable(),
    sessions: makeFakeTable(),
    courses: makeFakeTable(),
    teeSets: makeFakeTable(),
    holeResults: makeFakeTable(),
    sideBets: makeFakeTable(),
    banterPosts: makeFakeTable(),
    duesLineItems: makeFakeTable(),
    paymentRecords: makeFakeTable(),
    tripInvitations: makeFakeTable(),
    announcements: makeFakeTable(),
    attendanceRecords: makeFakeTable(),
    cartAssignments: makeFakeTable(),
    teamMembers: makeFakeTable(),
    teams: makeFakeTable(),
    players: makeFakeTable(),
    trips: makeFakeTable(),
  },
}));

vi.mock('../lib/services/trip-sync/tripSyncEntityWriters', () => ({
  syncEntityToCloud: vi.fn(),
}));

import {
  clearScheduledSyncQueueProcessing,
  processSyncQueue,
  queueSyncOperation,
} from '../lib/services/trip-sync/tripSyncQueue';
import { db } from '../lib/db';
import {
  setOnlineStatus,
  setSyncAuthSession,
  tripSyncRuntime,
} from '../lib/services/trip-sync/tripSyncShared';
import { syncEntityToCloud } from '../lib/services/trip-sync/tripSyncEntityWriters';
import type { SyncQueueItem } from '../lib/types/sync';

const syncEntityToCloudMock = vi.mocked(syncEntityToCloud);
const tripSyncQueueTableMock = vi.mocked(db.tripSyncQueue);

function makeQueueItem(overrides: Partial<SyncQueueItem> = {}): SyncQueueItem {
  return {
    id: 'queue-item-1',
    entity: 'match',
    entityId: 'match-1',
    operation: 'update',
    tripId: 'trip-1',
    status: 'pending',
    retryCount: 0,
    createdAt: '2026-04-26T12:00:00.000Z',
    idempotencyKey: 'trip-1:match:match-1:update',
    ...overrides,
  } as SyncQueueItem;
}

describe('trip sync queue processing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearScheduledSyncQueueProcessing();
    tripSyncRuntime.syncQueue.length = 0;
    tripSyncRuntime.queueHydrated = true;
    tripSyncRuntime.queueHydrationPromise = null;
    tripSyncRuntime.syncInProgress = false;
    tripSyncRuntime.syncDrainRequested = false;
    setOnlineStatus(true);
    setSyncAuthSession({} as Parameters<typeof setSyncAuthSession>[0]);
  });

  afterEach(() => {
    clearScheduledSyncQueueProcessing();
    tripSyncRuntime.syncQueue.length = 0;
    tripSyncRuntime.syncInProgress = false;
    tripSyncRuntime.syncDrainRequested = false;
  });

  it('marks a follow-up drain when processing is requested during an active drain', async () => {
    tripSyncRuntime.syncInProgress = true;
    tripSyncRuntime.syncQueue.push(makeQueueItem());

    const result = await processSyncQueue();

    expect(result).toMatchObject({
      synced: 0,
      failed: 0,
      queued: 1,
    });
    expect(tripSyncRuntime.syncDrainRequested).toBe(true);
    expect(syncEntityToCloudMock).not.toHaveBeenCalled();
  });

  it('schedules a follow-up drain when a transient failure is still retryable', async () => {
    syncEntityToCloudMock.mockRejectedValueOnce(new Error('temporary outage'));
    const item = makeQueueItem();
    tripSyncRuntime.syncQueue.push(item);

    const result = await processSyncQueue();

    expect(result.queued).toBe(1);
    expect(item).toMatchObject({
      status: 'pending',
      retryCount: 1,
      error: 'temporary outage',
    });
    expect(tripSyncRuntime.syncDebounceTimer).not.toBeNull();
  });

  it('schedules sync when a fresh local edit revives an existing failed operation', () => {
    tripSyncRuntime.syncQueue.push(
      makeQueueItem({
        status: 'failed',
        retryCount: 5,
        error: 'old failure',
      })
    );

    queueSyncOperation('match', 'match-1', 'update', 'trip-1');

    expect(tripSyncRuntime.syncQueue[0]).toMatchObject({
      status: 'pending',
      retryCount: 0,
      error: undefined,
    });
    expect(tripSyncRuntime.syncDebounceTimer).not.toBeNull();
  });

  it('does not keep scheduling retries for terminal failures', async () => {
    syncEntityToCloudMock.mockRejectedValueOnce(new Error('permission denied'));
    const item = makeQueueItem({ retryCount: 4 });
    tripSyncRuntime.syncQueue.push(item);

    const result = await processSyncQueue();

    expect(result).toMatchObject({
      failed: 1,
      queued: 1,
      errors: ['match:match-1 - permission denied'],
    });
    expect(item).toMatchObject({
      status: 'failed',
      retryCount: 5,
      error: 'permission denied',
    });
    expect(tripSyncRuntime.syncDebounceTimer).toBeNull();
  });

  it('FK 23503 on a child re-queues the parent and resets the child without burning retries', async () => {
    // Real production scenario: a practice_score upserted to Supabase
    // before its parent match row landed. The first attempt produces
    // the canonical PostgREST FK error. Without this guard the child
    // would chew through MAX_RETRY_COUNT and end up as a "stuck"
    // failure while the parent never got requeued.
    syncEntityToCloudMock.mockRejectedValueOnce(
      new Error(
        '[upsert practice_scores] insert or update on table "practice_scores" violates foreign key constraint "practice_scores_match_id_fkey" | code: 23503 | details: Key is not present in table "matches".'
      )
    );

    const childItem = makeQueueItem({
      id: 'queue-ps-1',
      entity: 'practiceScore',
      entityId: 'ps-1',
      operation: 'create',
      data: {
        id: 'ps-1',
        matchId: 'match-1',
        playerId: 'player-1',
        holeNumber: 1,
        gross: 4,
      } as never,
      idempotencyKey: 'trip-1:practiceScore:ps-1:create',
    });
    tripSyncRuntime.syncQueue.push(childItem);

    const dbMock = vi.mocked(db) as unknown as {
      matches: { get: ReturnType<typeof vi.fn> };
    };
    dbMock.matches.get.mockResolvedValueOnce({
      id: 'match-1',
      sessionId: 'session-1',
      tripId: 'trip-1',
    });

    await processSyncQueue();

    // Parent now in the queue, fresh.
    const parentItem = tripSyncRuntime.syncQueue.find((q) => q.entity === 'match');
    expect(parentItem).toBeDefined();
    expect(parentItem).toMatchObject({
      entityId: 'match-1',
      status: 'pending',
      retryCount: 0,
    });
    // Child kept its retry budget — still pending, not bumped.
    expect(childItem).toMatchObject({
      status: 'pending',
      retryCount: 0,
    });
  });

  it('hydrates persisted queue work before processing after a cold page load', async () => {
    tripSyncRuntime.queueHydrated = false;
    tripSyncQueueTableMock.toArray.mockResolvedValueOnce([makeQueueItem()]);

    const result = await processSyncQueue();

    expect(syncEntityToCloudMock).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: 'match',
        entityId: 'match-1',
        operation: 'update',
      })
    );
    expect(result).toMatchObject({
      synced: 1,
      failed: 0,
      queued: 0,
    });
  });
});
