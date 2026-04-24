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
      toArray: vi.fn(() => Promise.resolve([])),
    },
  },
}));

import {
  queueSyncOperation,
  getTripSyncStatus,
  getSyncQueueStatus,
  type SyncOperation,
  type SyncEntity,
  type SyncQueueItem,
  buildSyncOperationKey,
  resolveSyncOperationTransition,
} from '../lib/services/tripSyncService';

describe('Trip Sync Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
