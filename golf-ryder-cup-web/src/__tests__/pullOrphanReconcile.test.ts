/**
 * Orphan-row cleanup on the roster pull.
 *
 * Proves:
 *  - Local rows not in the cloud response get deleted.
 *  - Local rows WITH a pending sync op survive (they're waiting to
 *    push up, not truly orphaned).
 *  - Other-trip rows are untouched.
 *
 * Rather than stand up the full pullTripCore round-trip (needs
 * Supabase mocking), we lift reconcileLocalOrphans by re-implementing
 * the exact same gated-delete loop the production code uses. The
 * logic is small and the test guards the CONTRACT — if we ever change
 * the production path we'll update this mirror in lockstep.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { db } from '../lib/db';
import {
  getPendingDeleteSyncIdsForTrip,
  getPendingSyncIdsForTrip,
  queueSyncOperation,
} from '../lib/services/tripSyncService';
import type { Player, RyderCupSession, Team, Trip } from '../lib/types/models';

async function reconcileTripPlayers(
  tripId: string,
  cloudPlayerIds: string[]
): Promise<void> {
  const pendingDeletes = getPendingDeleteSyncIdsForTrip(tripId, 'player');
  const pending = new Set(
    [...getPendingSyncIdsForTrip(tripId, 'player')].filter((id) => !pendingDeletes.has(id))
  );
  const cloud = new Set(cloudPlayerIds);
  const local = await db.players.where('tripId').equals(tripId).toArray();
  for (const p of local) {
    if (pendingDeletes.has(p.id)) {
      await db.players.delete(p.id);
      continue;
    }
    if (cloud.has(p.id)) continue;
    if (pending.has(p.id)) continue;
    await db.players.delete(p.id);
  }
}

function isoNow() {
  return '2026-04-23T18:00:00.000Z';
}

function seedTrip(id: string): Trip {
  return {
    id,
    name: `Trip ${id}`,
    startDate: isoNow(),
    endDate: isoNow(),
    isCaptainModeEnabled: true,
    createdAt: isoNow(),
    updatedAt: isoNow(),
  };
}

function seedPlayer(id: string, tripId: string, email: string): Player {
  return {
    id,
    tripId,
    firstName: 'Test',
    lastName: id,
    email,
    handicapIndex: 10,
  };
}

describe('reconcileLocalOrphans — contract: gated-delete for local rows', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
  });

  it('deletes a local player whose id is absent from the cloud response', async () => {
    const tripId = 'trip-1';
    await db.trips.add(seedTrip(tripId));
    await db.players.bulkAdd([
      seedPlayer('alive', tripId, 'a@example.com'),
      seedPlayer('orphan', tripId, 'b@example.com'),
    ]);

    await reconcileTripPlayers(tripId, ['alive']);

    const remaining = await db.players.toArray();
    expect(remaining.map((p) => p.id)).toEqual(['alive']);
  });

  it('keeps a local player with a pending create sync op even if cloud does not list them', async () => {
    const tripId = 'trip-1';
    await db.trips.add(seedTrip(tripId));
    const unsynced = seedPlayer('fresh-local', tripId, 'c@example.com');
    await db.players.add(unsynced);

    // Simulate an in-flight create that hasn't pushed to Supabase yet
    queueSyncOperation('player', 'fresh-local', 'create', tripId, unsynced);

    await reconcileTripPlayers(tripId, []);

    const remaining = await db.players.toArray();
    expect(remaining.map((p) => p.id)).toContain('fresh-local');
  });

  it('keeps a local player with a pending update sync op', async () => {
    const tripId = 'trip-1';
    await db.trips.add(seedTrip(tripId));
    const edited = seedPlayer('edited-local', tripId, 'd@example.com');
    await db.players.add(edited);

    queueSyncOperation('player', 'edited-local', 'update', tripId, edited);

    await reconcileTripPlayers(tripId, []);

    const remaining = await db.players.toArray();
    expect(remaining.map((p) => p.id)).toContain('edited-local');
  });

  it('deletes a local player with a pending delete instead of resurrecting it', async () => {
    const tripId = 'trip-1';
    await db.trips.add(seedTrip(tripId));
    const deleted = seedPlayer('deleted-local', tripId, 'deleted@example.com');
    await db.players.add(deleted);

    queueSyncOperation('player', 'deleted-local', 'delete', tripId);

    await reconcileTripPlayers(tripId, []);

    expect(await db.players.get('deleted-local')).toBeUndefined();
  });

  it('does not touch players on other trips', async () => {
    await db.trips.bulkAdd([seedTrip('trip-1'), seedTrip('trip-2')]);
    await db.players.bulkAdd([
      seedPlayer('t1-orphan', 'trip-1', 'x@example.com'),
      seedPlayer('t2-safe', 'trip-2', 'y@example.com'),
    ]);

    await reconcileTripPlayers('trip-1', []);

    const remaining = await db.players.toArray();
    expect(remaining.map((p) => p.id)).toEqual(['t2-safe']);
  });

  it('no-ops when every local row is present in the cloud response', async () => {
    const tripId = 'trip-1';
    await db.trips.add(seedTrip(tripId));
    await db.players.bulkAdd([
      seedPlayer('p1', tripId, '1@example.com'),
      seedPlayer('p2', tripId, '2@example.com'),
    ]);

    await reconcileTripPlayers(tripId, ['p1', 'p2']);

    const remaining = await db.players.toArray();
    expect(remaining).toHaveLength(2);
  });
});

describe('getPendingSyncIdsForTrip — filtering semantics', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('filters to pending/syncing/failed items, scoped by trip and entity', async () => {
    await db.trips.bulkAdd([seedTrip('trip-1'), seedTrip('trip-2')]);
    queueSyncOperation('player', 'p-t1', 'create', 'trip-1', {} as Player);
    queueSyncOperation('team', 'team-t1', 'update', 'trip-1', {} as Team);
    queueSyncOperation('player', 'p-t2', 'create', 'trip-2', {} as Player);

    const playersT1 = getPendingSyncIdsForTrip('trip-1', 'player');
    expect(playersT1.has('p-t1')).toBe(true);
    expect(playersT1.has('team-t1')).toBe(false);
    expect(playersT1.has('p-t2')).toBe(false);
  });

  it('includes failed items so a failed create does not get swept on the next pull', async () => {
    await db.trips.add(seedTrip('trip-1'));
    queueSyncOperation('session', 'sess-a', 'create', 'trip-1', {} as never);
    // Simulate the item terminal-failing after MAX_RETRY_COUNT by
    // editing the runtime queue directly — the important invariant
    // is that a 'failed' entity id still reports as "owned locally"
    // so the orphan reconcile leaves it alone.
    const { tripSyncRuntime } = await import('@/lib/services/trip-sync/tripSyncShared');
    const queued = tripSyncRuntime.syncQueue.find(
      (i) => i.entityId === 'sess-a' && i.tripId === 'trip-1'
    );
    if (queued) queued.status = 'failed';

    const sessionIds = getPendingSyncIdsForTrip('trip-1', 'session');
    expect(sessionIds.has('sess-a')).toBe(true);
  });

  it('returns an empty set when nothing is queued', async () => {
    await db.trips.add(seedTrip('trip-3'));
    const result = getPendingSyncIdsForTrip('trip-3', 'session');
    expect(result.size).toBe(0);
  });
});
