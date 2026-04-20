/**
 * Trip sync queue ordering + transition tests.
 *
 * The sync queue pushes offline writes to Supabase in arbitrary insertion
 * order. Two properties matter for correctness:
 *
 *  - Parents must be pushed before children (teams before team_members,
 *    sessions before matches, matches before hole_results). Otherwise
 *    Postgres rejects the child insert with a foreign-key violation and
 *    the "didn't reach the cloud" banner fires for writes that actually
 *    just needed a different order.
 *
 *  - Operation transitions must converge: a create queued after a
 *    delete of the same entity has to resolve to an update, not a
 *    duplicate create on an id the cloud still holds.
 */
import { describe, expect, it } from 'vitest';

import {
  buildSyncOperationKey,
  compareByDependency,
  resolveSyncOperationTransition,
} from '../lib/services/trip-sync/tripSyncQueue';
import type { SyncEntity, SyncOperation, SyncQueueItem } from '../lib/types/sync';

function makeItem(
  entity: SyncEntity,
  operation: SyncOperation,
  createdAt = '2026-04-20T00:00:00.000Z',
  id = `${entity}-${operation}-${createdAt}`
): SyncQueueItem {
  return {
    id,
    entity,
    entityId: id,
    operation,
    data: undefined,
    tripId: 'trip-1',
    status: 'pending',
    retryCount: 0,
    createdAt,
  };
}

describe('compareByDependency', () => {
  it('pushes parents before children for create/update ops', () => {
    const items: SyncQueueItem[] = [
      makeItem('holeResult', 'create'),
      makeItem('teamMember', 'create'),
      makeItem('match', 'create'),
      makeItem('team', 'create'),
      makeItem('trip', 'create'),
      makeItem('session', 'create'),
      makeItem('player', 'create'),
    ];

    const sorted = [...items].sort(compareByDependency).map((i) => i.entity);

    // trip is rank 0; player is rank 1; team/session are rank 2;
    // teamMember/match are rank 3; holeResult is rank 4. Ties resolve
    // by createdAt, which is equal here.
    expect(sorted[0]).toBe('trip');
    expect(sorted.indexOf('player')).toBeLessThan(sorted.indexOf('team'));
    expect(sorted.indexOf('team')).toBeLessThan(sorted.indexOf('teamMember'));
    expect(sorted.indexOf('session')).toBeLessThan(sorted.indexOf('match'));
    expect(sorted.indexOf('match')).toBeLessThan(sorted.indexOf('holeResult'));
  });

  it('reverses order for deletes so children drop before parents', () => {
    const items: SyncQueueItem[] = [
      makeItem('trip', 'delete'),
      makeItem('team', 'delete'),
      makeItem('teamMember', 'delete'),
      makeItem('holeResult', 'delete'),
      makeItem('match', 'delete'),
    ];

    const sorted = [...items].sort(compareByDependency).map((i) => i.entity);

    // Deepest children first; root last. Parent cascades would otherwise
    // silently take children with them before the queue can record the
    // explicit child delete.
    expect(sorted.indexOf('holeResult')).toBeLessThan(sorted.indexOf('match'));
    expect(sorted.indexOf('match')).toBeLessThan(sorted.indexOf('team'));
    expect(sorted.indexOf('teamMember')).toBeLessThan(sorted.indexOf('team'));
    expect(sorted[sorted.length - 1]).toBe('trip');
  });

  it('mixes creates and deletes correctly', () => {
    // An offline device renames a team, then deletes a stale match.
    // The team update must land first (parent-before-child for writes),
    // and the match delete has no cross-dependency with the team update.
    const items: SyncQueueItem[] = [
      makeItem('match', 'delete'),
      makeItem('team', 'update'),
      makeItem('teamMember', 'create'),
    ];

    const sorted = [...items].sort(compareByDependency);

    // team (rank 2 create) must precede teamMember (rank 3 create).
    const teamIdx = sorted.findIndex((i) => i.entity === 'team');
    const memberIdx = sorted.findIndex((i) => i.entity === 'teamMember');
    expect(teamIdx).toBeLessThan(memberIdx);
  });

  it('breaks ties by createdAt so older writes sync first', () => {
    const earlier = makeItem('team', 'create', '2026-04-20T00:00:00.000Z', 'a');
    const later = makeItem('team', 'create', '2026-04-20T00:05:00.000Z', 'b');

    const sorted = [later, earlier].sort(compareByDependency).map((i) => i.id);
    expect(sorted).toEqual(['a', 'b']);
  });
});

describe('resolveSyncOperationTransition', () => {
  it('collapses create → delete to noop (nothing hit the cloud yet)', () => {
    expect(resolveSyncOperationTransition('create', 'delete')).toBe('noop');
  });

  it('keeps create when an update lands before the first sync', () => {
    expect(resolveSyncOperationTransition('create', 'update')).toBe('create');
  });

  it('promotes update → delete to delete', () => {
    expect(resolveSyncOperationTransition('update', 'delete')).toBe('delete');
  });

  it('rewrites delete → create as update (the row exists in the cloud)', () => {
    // A captain deletes a match, then a player reconnects and their
    // offline-queued create for the same match id fires. A naive replay
    // would hit a duplicate-id conflict; resolving to update keeps both
    // writes convergent.
    expect(resolveSyncOperationTransition('delete', 'create')).toBe('update');
    expect(resolveSyncOperationTransition('delete', 'update')).toBe('update');
  });

  it('falls through to the incoming op for unhandled combos', () => {
    expect(resolveSyncOperationTransition('update', 'update')).toBe('update');
    expect(resolveSyncOperationTransition('create', 'create')).toBe('create');
  });
});

describe('buildSyncOperationKey', () => {
  it('returns a stable idempotency key across calls', () => {
    expect(buildSyncOperationKey('team', 'team-1', 'update', 'trip-1')).toBe(
      'trip-1:team:team-1:update'
    );
  });

  it('differentiates entity, operation, and trip', () => {
    const a = buildSyncOperationKey('team', 'x', 'update', 'trip-1');
    const b = buildSyncOperationKey('team', 'x', 'update', 'trip-2');
    const c = buildSyncOperationKey('team', 'x', 'create', 'trip-1');
    expect(new Set([a, b, c]).size).toBe(3);
  });
});
