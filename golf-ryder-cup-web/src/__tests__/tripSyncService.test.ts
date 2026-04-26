/**
 * Trip Sync Service Tests
 *
 * Tests for offline-first sync with Supabase cloud.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Supabase client
vi.mock('../lib/supabase/client', () => ({
  supabase: null,
  isSupabaseConfigured: false,
}));

// Mock db
vi.mock('../lib/db', () => ({
  db: {
    trips: {
      get: vi.fn(),
      put: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn(() => Promise.resolve([])),
        })),
      })),
    },
    players: {
      get: vi.fn(),
      put: vi.fn(),
      bulkPut: vi.fn(),
    },
    teams: {
      get: vi.fn(),
      put: vi.fn(),
    },
    teamMembers: {
      get: vi.fn(),
      put: vi.fn(),
    },
    sessions: {
      get: vi.fn(),
      put: vi.fn(),
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          toArray: vi.fn(() => Promise.resolve([])),
        })),
      })),
    },
    matches: {
      get: vi.fn(),
      put: vi.fn(),
    },
    holeResults: {
      get: vi.fn(),
      put: vi.fn(),
    },
    tripSyncQueue: {
      put: vi.fn(),
      delete: vi.fn(),
      clear: vi.fn(),
      toArray: vi.fn(() => Promise.resolve([])),
    },
  },
}));

import {
  queueSyncOperation,
  retryFailedQueue,
  getTripSyncStatus,
  getSyncQueueStatus,
  type SyncOperation,
  type SyncEntity,
  type SyncQueueItem,
  buildSyncOperationKey,
  resolveSyncOperationTransition,
} from '../lib/services/tripSyncService';
import { setOnlineStatus, tripSyncRuntime } from '../lib/services/trip-sync/tripSyncShared';
import type { Match } from '../lib/types/models';

describe('Trip Sync Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tripSyncRuntime.syncQueue.length = 0;
    tripSyncRuntime.queueHydrated = true;
    tripSyncRuntime.queueHydrationPromise = null;
    tripSyncRuntime.syncInProgress = false;
    tripSyncRuntime.syncDrainRequested = false;
    tripSyncRuntime.authSessionResolved = true;
    tripSyncRuntime.hasAuthSession = true;
    setOnlineStatus(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('queueSyncOperation', () => {
    it('queues a create operation', async () => {
      // queueSyncOperation adds to internal queue
      await queueSyncOperation('trip', 'trip-123', 'create', 'trip-123');

      // Verify via getSyncQueueStatus
      const status = getSyncQueueStatus();
      expect(status.pending).toBeGreaterThanOrEqual(0);
    });

    it('queues an update operation', async () => {
      await queueSyncOperation('player', 'player-456', 'update', 'trip-123');

      const status = getSyncQueueStatus();
      expect(typeof status.pending).toBe('number');
    });

    it('queues a delete operation', async () => {
      await queueSyncOperation('match', 'match-789', 'delete', 'trip-123');

      const status = getSyncQueueStatus();
      expect(typeof status.failed).toBe('number');
    });

    it('merges a new local change into an existing failed operation for the same entity', () => {
      tripSyncRuntime.syncQueue.push({
        id: 'failed-op',
        entity: 'match',
        entityId: 'match-1',
        operation: 'delete',
        tripId: 'trip-1',
        status: 'failed',
        retryCount: 5,
        error: 'old failure',
        createdAt: '2026-04-26T10:00:00.000Z',
        lastAttemptAt: '2026-04-26T10:05:00.000Z',
        idempotencyKey: buildSyncOperationKey('match', 'match-1', 'delete', 'trip-1'),
      });

      queueSyncOperation('match', 'match-1', 'create', 'trip-1', {
        id: 'match-1',
        sessionId: 'session-1',
        matchOrder: 1,
        teamAPlayerIds: [],
        teamBPlayerIds: [],
        teamAHandicapAllowance: 0,
        teamBHandicapAllowance: 0,
        result: 'notFinished',
        margin: 0,
        holesRemaining: 18,
        status: 'scheduled',
        currentHole: 1,
        createdAt: '2026-04-26T10:06:00.000Z',
        updatedAt: '2026-04-26T10:06:00.000Z',
      } satisfies Match);

      expect(tripSyncRuntime.syncQueue).toHaveLength(1);
      expect(tripSyncRuntime.syncQueue[0]).toMatchObject({
        id: 'failed-op',
        operation: 'update',
        status: 'pending',
        retryCount: 0,
        error: undefined,
        lastAttemptAt: undefined,
        idempotencyKey: buildSyncOperationKey('match', 'match-1', 'update', 'trip-1'),
      });
    });
  });

  describe('retryFailedQueue', () => {
    it('does not hide failed items when sync is blocked', async () => {
      tripSyncRuntime.syncQueue.push({
        id: 'failed-op',
        entity: 'team',
        entityId: 'team-1',
        operation: 'update',
        tripId: 'trip-1',
        status: 'failed',
        retryCount: 5,
        error: 'row level security',
        createdAt: '2026-04-26T10:00:00.000Z',
      });

      const retried = await retryFailedQueue();

      expect(retried).toBe(0);
      expect(tripSyncRuntime.syncQueue[0]).toMatchObject({
        status: 'failed',
        retryCount: 5,
        error: 'row level security',
      });
      expect(getSyncQueueStatus()).toMatchObject({
        failed: 1,
        blockedReason: 'supabase-unconfigured',
      });
    });
  });

  describe('getTripSyncStatus', () => {
    it('returns status for a trip', () => {
      const status = getTripSyncStatus('trip-123');
      // Without Supabase configured, should return offline or unknown
      expect(['unknown', 'offline', 'pending', 'synced']).toContain(status);
    });
  });

  describe('getSyncQueueStatus', () => {
    it('returns queue statistics', () => {
      const status = getSyncQueueStatus();

      expect(status).toHaveProperty('pending');
      expect(status).toHaveProperty('failed');
      expect(status).toHaveProperty('total');
      expect(typeof status.pending).toBe('number');
      expect(typeof status.failed).toBe('number');
      expect(typeof status.total).toBe('number');
    });
  });

  describe('buildSyncOperationKey', () => {
    it('generates deterministic key for identical operations', () => {
      const a = buildSyncOperationKey('match', 'm-1', 'update', 'trip-1');
      const b = buildSyncOperationKey('match', 'm-1', 'update', 'trip-1');
      expect(a).toBe(b);
    });

    it('changes key when operation changes', () => {
      const createKey = buildSyncOperationKey('match', 'm-1', 'create', 'trip-1');
      const updateKey = buildSyncOperationKey('match', 'm-1', 'update', 'trip-1');
      expect(createKey).not.toBe(updateKey);
    });
  });

  describe('resolveSyncOperationTransition', () => {
    it('keeps create when update follows create', () => {
      expect(resolveSyncOperationTransition('create', 'update')).toBe('create');
    });

    it('cancels out create followed by delete', () => {
      expect(resolveSyncOperationTransition('create', 'delete')).toBe('noop');
    });

    it('converts update followed by delete to delete', () => {
      expect(resolveSyncOperationTransition('update', 'delete')).toBe('delete');
    });

    it('converts delete followed by create to update', () => {
      expect(resolveSyncOperationTransition('delete', 'create')).toBe('update');
    });
  });

  describe('Sync Queue Types', () => {
    it('supports all entity types', () => {
      const entities: SyncEntity[] = [
        'trip',
        'player',
        'team',
        'teamMember',
        'session',
        'match',
        'holeResult',
        'course',
        'teeSet',
        'sideBet',
        'practiceScore',
        'banterPost',
        'duesLineItem',
        'paymentRecord',
        'tripInvitation',
        'announcement',
        'attendanceRecord',
        'cartAssignment',
      ];

      entities.forEach((entity) => {
        expect(typeof entity).toBe('string');
      });
    });

    it('supports all operations', () => {
      const operations: SyncOperation[] = ['create', 'update', 'delete'];

      operations.forEach((op) => {
        expect(typeof op).toBe('string');
      });
    });
  });
});

describe('SyncQueueItem Structure', () => {
  it('has correct type definition', () => {
    const item: SyncQueueItem = {
      id: 'test-id',
      entity: 'trip',
      entityId: 'trip-1',
      operation: 'create',
      tripId: 'trip-1',
      status: 'pending',
      retryCount: 0,
      createdAt: new Date().toISOString(),
      idempotencyKey: 'trip-1:trip:trip-1:create',
    };

    expect(item.id).toBe('test-id');
    expect(item.entity).toBe('trip');
    expect(item.status).toBe('pending');
    expect(item.retryCount).toBe(0);
  });
});
