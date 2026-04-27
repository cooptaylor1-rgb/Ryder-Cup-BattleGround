import * as Sentry from '@sentry/nextjs';

import { db } from '../../db';
import type {
  SyncEntity,
  SyncEntityPayloadMap,
  SyncOperation,
  SyncQueueItem,
} from '../../types/sync';
import { syncEntityToCloud } from './tripSyncEntityWriters';
import {
  MAX_RETRY_COUNT,
  SYNC_DEBOUNCE_MS,
  canSync,
  getSyncBlockReason,
  getRetryDelay,
  logger,
  notifyTripSyncQueueChanged,
  sleep,
  type SyncBlockReason,
  tripSyncRuntime,
} from './tripSyncShared';
import type { BulkSyncResult, SyncStatus } from './tripSyncTypes';

/**
 * Drop a breadcrumb into Sentry's event buffer. When a later error
 * fires, the crumbs travel with it — so a FK violation or RLS denial
 * arrives tagged with the queue operations that led up to it, not
 * just the final stack. `level: 'info'` keeps them out of the error
 * feed but available on replay.
 */
function syncBreadcrumb(message: string, data?: Record<string, unknown>): void {
  Sentry.addBreadcrumb({
    category: 'sync.queue',
    level: 'info',
    message,
    data,
  });
}

async function persistQueueItem(item: SyncQueueItem): Promise<void> {
  try {
    await db.tripSyncQueue.put(item);
    notifyTripSyncQueueChanged();
  } catch (error) {
    logger.warn('Failed to persist sync queue item:', error);
  }
}

/**
 * For every queued create/update with a preserved data payload,
 * ensures the corresponding Dexie row exists. Used once on queue
 * hydrate to undo damage from an earlier orphan-reconcile bug
 * that deleted local rows whose sync op was in a 'failed' state.
 * Idempotent: a row that already exists is untouched.
 */
async function restoreOrphanedQueueEntities(): Promise<void> {
  const tableFor: Partial<Record<SyncEntity, keyof typeof db>> = {
    trip: 'trips',
    player: 'players',
    team: 'teams',
    teamMember: 'teamMembers',
    session: 'sessions',
    match: 'matches',
    holeResult: 'holeResults',
    course: 'courses',
    teeSet: 'teeSets',
    sideBet: 'sideBets',
    practiceScore: 'practiceScores',
    banterPost: 'banterPosts',
    duesLineItem: 'duesLineItems',
    paymentRecord: 'paymentRecords',
    tripInvitation: 'tripInvitations',
    announcement: 'announcements',
    attendanceRecord: 'attendanceRecords',
    cartAssignment: 'cartAssignments',
  };

  for (const item of tripSyncRuntime.syncQueue) {
    if (item.operation === 'delete') continue;
    if (!item.data) continue;
    if (item.status === 'completed') continue;

    const tableKey = tableFor[item.entity];
    if (!tableKey) continue;

    try {
      const table = (
        db as unknown as Record<
          string,
          { get: (id: string) => Promise<unknown>; put: (row: unknown) => Promise<unknown> }
        >
      )[tableKey];
      if (!table) continue;
      const existing = await table.get(item.entityId);
      if (existing) continue;
      await table.put(item.data);
      logger.warn('Restored Dexie row from queued payload', {
        entity: item.entity,
        entityId: item.entityId,
        operation: item.operation,
      });
    } catch (err) {
      logger.warn('Failed to restore queued entity', {
        entity: item.entity,
        entityId: item.entityId,
        err,
      });
    }
  }
}

async function removeQueueItem(id: string): Promise<void> {
  try {
    await db.tripSyncQueue.delete(id);
    notifyTripSyncQueueChanged();
  } catch (error) {
    logger.warn('Failed to remove sync queue item:', error);
  }
}

function getQueueResultSnapshot(errors: string[] = []): BulkSyncResult {
  const failedItems = tripSyncRuntime.syncQueue.filter((item) => item.status === 'failed');
  const queued = tripSyncRuntime.syncQueue.filter((item) => item.status !== 'completed').length;
  return {
    success: errors.length === 0 && failedItems.length === 0,
    synced: 0,
    failed: failedItems.length,
    queued,
    errors,
  };
}

function hasRetryableQueueWork(): boolean {
  return tripSyncRuntime.syncQueue.some(
    (item) =>
      item.status === 'pending' ||
      item.status === 'syncing' ||
      (item.status === 'failed' && item.retryCount < MAX_RETRY_COUNT)
  );
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
          // Reset stuck 'syncing' items to 'pending'. syncOne persists
          // status='syncing' BEFORE the Supabase call; a tab close,
          // crash, or radio drop between persist and success/failure
          // leaves the row orphaned in that state forever, because
          // processSyncQueue's filter only picks 'pending' or 'failed'.
          // On hydrate we assume any syncing row was interrupted and
          // retry it — the sync writers are idempotent (upsert by id)
          // so double-applying is safe.
          //
          // Also reset terminally-failed items (status='failed' with
          // retryCount >= MAX_RETRY_COUNT) to pending with a fresh
          // budget, but only when sync is actually ready. A page
          // reload while offline or signed out must not hide a real
          // failed state behind a pending badge that cannot make
          // progress. Once auth/network is available, the auth bridge
          // calls retryFailedQueue() and the item gets a real retry.
          let resurrected: SyncQueueItem;
          if (item.status === 'syncing') {
            resurrected = { ...item, status: 'pending' };
          } else if (item.status === 'failed' && canSync()) {
            resurrected = { ...item, status: 'pending', retryCount: 0, error: undefined };
          } else {
            resurrected = item;
          }
          const hydratedItem = resurrected.idempotencyKey
            ? resurrected
            : {
                ...resurrected,
                idempotencyKey: buildSyncOperationKey(
                  resurrected.entity,
                  resurrected.entityId,
                  resurrected.operation,
                  resurrected.tripId
                ),
              };
          merged.set(item.id, hydratedItem);
        }
        tripSyncRuntime.syncQueue.length = 0;
        tripSyncRuntime.syncQueue.push(...merged.values());

        // Persist any status fixups we made during hydration so the
        // next reload doesn't have to redo them.
        for (const item of tripSyncRuntime.syncQueue) {
          const original = storedItems.find((s) => s.id === item.id);
          if (original && original.status !== item.status) {
            await persistQueueItem(item);
          }
        }

        // Self-heal rows that were erroneously swept by an earlier
        // orphan reconcile. If a queue item carries a full data
        // payload for a create/update but the Dexie row is gone,
        // put it back. Practice sessions disappeared for one
        // captain because a transient trigger error left the
        // session's create op "failed" and the pull-time reconcile
        // (which ignored failed items) deleted the only copy.
        // Restoring here means the next page render shows the row
        // again and the next sync attempt pushes it to cloud.
        await restoreOrphanedQueueEntities();
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

// Parents must be pushed to Supabase before children, or FK constraints reject
// the child (e.g. team_members.team_id -> teams.id). Deletes reverse the order
// so children are removed before their parent.
const ENTITY_DEPENDENCY_ORDER: Record<SyncEntity, number> = {
  trip: 0,
  course: 1,
  player: 1,
  team: 2,
  teeSet: 2,
  session: 2,
  teamMember: 3,
  match: 3,
  holeResult: 4,
  // side_bets.trip_id references trips, and match_id (nullable) can
  // reference matches — so sideBet lives at rank 4 alongside
  // holeResult; both trip and match are guaranteed present by then.
  sideBet: 4,
  // practice_scores.match_id and player_id both FK to tables already
  // at rank <= 3, so rank 4 is safe — matches the holeResult tier.
  practiceScore: 4,
  // banter_posts.trip_id FKs to trips (rank 0), so rank 4 sits
  // alongside sideBet — tripping a post after its trip row is safe.
  banterPost: 4,
  // Finance rows are trip + player scoped. Payments conceptually sit
  // after dues because a payment can point at one or more line-item ids.
  duesLineItem: 4,
  paymentRecord: 5,
  tripInvitation: 4,
  announcement: 4,
  attendanceRecord: 4,
  cartAssignment: 4,
};

export function compareByDependency(a: SyncQueueItem, b: SyncQueueItem): number {
  const aRank = ENTITY_DEPENDENCY_ORDER[a.entity];
  const bRank = ENTITY_DEPENDENCY_ORDER[b.entity];
  const aEffective = a.operation === 'delete' ? -aRank : aRank;
  const bEffective = b.operation === 'delete' ? -bRank : bRank;
  if (aEffective !== bEffective) return aEffective - bEffective;
  return a.createdAt.localeCompare(b.createdAt);
}

/**
 * Map of cloud table name (as it appears in PostgREST FK violation
 * messages) → SyncEntity. Used to translate "Key is not present in
 * table 'matches'" into "the match parent needs to be uploaded first".
 */
const ENTITY_BY_CLOUD_TABLE: Record<string, SyncEntity> = {
  trips: 'trip',
  players: 'player',
  teams: 'team',
  team_members: 'teamMember',
  sessions: 'session',
  matches: 'match',
  hole_results: 'holeResult',
  courses: 'course',
  tee_sets: 'teeSet',
  side_bets: 'sideBet',
  practice_scores: 'practiceScore',
  banter_posts: 'banterPost',
  dues_line_items: 'duesLineItem',
  payment_records: 'paymentRecord',
  trip_invitations: 'tripInvitation',
  announcements: 'announcement',
  attendance_records: 'attendanceRecord',
  cart_assignments: 'cartAssignment',
};

/**
 * Map of (child entity → field on the child Dexie row) → parent entity.
 * When a child row's upsert fails with FK 23503 referencing a specific
 * cloud table, we look up the local row and read this field to find the
 * parent's id, then re-queue the parent.
 *
 * Only entries that actually appear in failure logs are listed —
 * adding more is purely additive (no behavior change for entities not
 * in the map).
 */
const PARENT_LOOKUP: Record<
  SyncEntity,
  Partial<Record<SyncEntity, (row: Record<string, unknown>) => string | undefined>>
> = {
  trip: {},
  player: {
    trip: (row) => row.tripId as string | undefined,
  },
  team: {
    trip: (row) => row.tripId as string | undefined,
  },
  teamMember: {
    team: (row) => row.teamId as string | undefined,
    player: (row) => row.playerId as string | undefined,
  },
  session: {
    trip: (row) => row.tripId as string | undefined,
    course: (row) => row.defaultCourseId as string | undefined,
    teeSet: (row) => row.defaultTeeSetId as string | undefined,
  },
  match: {
    session: (row) => row.sessionId as string | undefined,
    course: (row) => row.courseId as string | undefined,
    teeSet: (row) => row.teeSetId as string | undefined,
  },
  holeResult: {
    match: (row) => row.matchId as string | undefined,
  },
  practiceScore: {
    match: (row) => row.matchId as string | undefined,
    player: (row) => row.playerId as string | undefined,
  },
  course: {
    trip: (row) => row.tripId as string | undefined,
  },
  teeSet: {
    course: (row) => row.courseId as string | undefined,
  },
  sideBet: {
    trip: (row) => row.tripId as string | undefined,
    match: (row) => row.matchId as string | undefined,
  },
  banterPost: {
    trip: (row) => row.tripId as string | undefined,
  },
  duesLineItem: {
    trip: (row) => row.tripId as string | undefined,
    player: (row) => row.playerId as string | undefined,
  },
  paymentRecord: {
    trip: (row) => row.tripId as string | undefined,
    player: (row) => row.playerId as string | undefined,
  },
  tripInvitation: {
    trip: (row) => row.tripId as string | undefined,
  },
  announcement: {
    trip: (row) => row.tripId as string | undefined,
  },
  attendanceRecord: {
    trip: (row) => row.tripId as string | undefined,
    player: (row) => row.playerId as string | undefined,
  },
  cartAssignment: {
    trip: (row) => row.tripId as string | undefined,
  },
};

/**
 * Map of SyncEntity → Dexie table name. Mirrors the writers' table()
 * lookup but readable from this file without a circular import.
 */
const DEXIE_TABLE_BY_ENTITY: Record<SyncEntity, string> = {
  trip: 'trips',
  player: 'players',
  team: 'teams',
  teamMember: 'teamMembers',
  session: 'sessions',
  match: 'matches',
  holeResult: 'holeResults',
  course: 'courses',
  teeSet: 'teeSets',
  sideBet: 'sideBets',
  practiceScore: 'practiceScores',
  banterPost: 'banterPosts',
  duesLineItem: 'duesLineItems',
  paymentRecord: 'paymentRecords',
  tripInvitation: 'tripInvitations',
  announcement: 'announcements',
  attendanceRecord: 'attendanceRecords',
  cartAssignment: 'cartAssignments',
};

/**
 * Detect a Postgres FK violation in a sync error message and re-queue
 * the missing parent so the queue's next pass uploads it before the
 * child retries. Returns true when a parent was re-queued (in which
 * case the child should be reset to pending so it gets another shot
 * after the parent commits).
 *
 * The message shape we parse looks like:
 *   "...code: 23503 | details: Key is not present in table \"matches\"."
 * — emitted by formatSupabaseSyncError() in tripSyncWriterHelpers.
 */
async function tryRequeueParentForFkFailure(
  child: SyncQueueItem,
  errorMessage: string
): Promise<boolean> {
  if (!errorMessage.includes('code: 23503')) return false;

  // Pull the cloud table name from the details. PostgREST formats
  // the table reference with double-quotes:
  //   Key is not present in table "matches".
  const tableMatch = errorMessage.match(/in table\s+"([^"]+)"/i);
  const cloudTable = tableMatch?.[1];
  if (!cloudTable) return false;

  const parentEntity = ENTITY_BY_CLOUD_TABLE[cloudTable];
  if (!parentEntity) return false;

  const parentLookup = PARENT_LOOKUP[child.entity]?.[parentEntity];
  if (!parentLookup) return false;

  // Read the child's local row (or its queue payload) to find the
  // parent's id.
  const dexieTable = DEXIE_TABLE_BY_ENTITY[child.entity];
  let childRow: Record<string, unknown> | undefined;
  if (child.data) {
    childRow = child.data as unknown as Record<string, unknown>;
  } else {
    try {
      const table = (
        db as unknown as Record<string, { get: (id: string) => Promise<unknown> }>
      )[dexieTable];
      childRow = (await table?.get?.(child.entityId)) as Record<string, unknown> | undefined;
    } catch {
      childRow = undefined;
    }
  }
  if (!childRow) return false;

  const parentId = parentLookup(childRow);
  if (!parentId) return false;

  const parentTable = DEXIE_TABLE_BY_ENTITY[parentEntity];
  let parentRow: Record<string, unknown> | undefined;
  try {
    const table = (
      db as unknown as Record<string, { get: (id: string) => Promise<unknown> }>
    )[parentTable];
    parentRow = (await table?.get?.(parentId)) as Record<string, unknown> | undefined;
  } catch {
    parentRow = undefined;
  }
  // If the local parent row is missing too, re-queueing won't help —
  // give up and let the child fail terminally so the user notices.
  if (!parentRow) return false;

  // Re-queue the parent. queueSyncOperation handles dedup with
  // existing entries via idempotencyKey, so this is safe to call even
  // if the parent is already pending — it just resets retryCount.
  const parentTripId = (parentRow.tripId as string | undefined) ?? child.tripId;
  queueSyncOperation(
    parentEntity as SyncEntity,
    parentId,
    'create',
    parentTripId,
    parentRow as never
  );

  logger.warn(
    `[sync] FK 23503 on ${child.entity}:${child.entityId} → re-queued parent ${parentEntity}:${parentId}`
  );

  return true;
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

  if (
    existingOperation === 'delete' &&
    (incomingOperation === 'create' || incomingOperation === 'update')
  ) {
    return 'update';
  }

  return incomingOperation;
}

export function queueSyncOperation<E extends SyncEntity>(
  entity: E,
  entityId: string,
  operation: SyncOperation,
  tripId: string,
  data?: SyncEntityPayloadMap[E]
): void {
  void ensureQueueHydrated();

  const idempotencyKey = buildSyncOperationKey(entity, entityId, operation, tripId);

  const existing = tripSyncRuntime.syncQueue.find(
    (item) =>
      (item.idempotencyKey === idempotencyKey ||
        (item.entityId === entityId && item.entity === entity && item.tripId === tripId)) &&
      (item.status === 'pending' || item.status === 'syncing' || item.status === 'failed')
  );

  if (existing) {
    const resolvedOperation = resolveSyncOperationTransition(existing.operation, operation);

    if (resolvedOperation === 'noop') {
      const existingIndex = tripSyncRuntime.syncQueue.findIndex((item) => item.id === existing.id);
      if (existingIndex >= 0) {
        tripSyncRuntime.syncQueue.splice(existingIndex, 1);
      }
      notifyTripSyncQueueChanged();
      void removeQueueItem(existing.id);
      return;
    }

    // Assigning through the union's `data` field needs a cast only
    // because TypeScript can't prove the existing item's entity
    // tag matches the function's E; the runtime guard above
    // already enforces that (same entity + entityId + tripId), so
    // the shape is correct.
    const resolvedIdempotencyKey = buildSyncOperationKey(
      entity,
      entityId,
      resolvedOperation,
      tripId
    );

    (existing as { data?: unknown }).data = data;
    (existing as { operation: SyncOperation }).operation = resolvedOperation;
    existing.idempotencyKey = resolvedIdempotencyKey;
    existing.status = 'pending';
    existing.retryCount = 0;
    existing.error = undefined;
    existing.lastAttemptAt = undefined;

    if (resolvedOperation === 'delete') {
      (existing as { data?: unknown }).data = undefined;
    }

    void persistQueueItem(existing);
    notifyTripSyncQueueChanged();
    if (canSync()) {
      scheduleSyncQueueProcessing();
    }
    return;
  }

  const item = {
    id: crypto.randomUUID(),
    entity,
    entityId,
    operation,
    data,
    tripId,
    status: 'pending' as const,
    retryCount: 0,
    createdAt: new Date().toISOString(),
    idempotencyKey,
  } as SyncQueueItem;

  tripSyncRuntime.syncQueue.push(item);
  notifyTripSyncQueueChanged();
  void persistQueueItem(item);
  logger.log(`Queued ${operation} for ${entity}:${entityId}`);

  if (canSync()) {
    scheduleSyncQueueProcessing();
  }
}

/**
 * Throttle (not debounce) the queue drain so active scoring doesn't
 * starve sync. The previous implementation cleared the timer on every
 * enqueue, which meant a captain entering scores for seven straight
 * holes inside the SYNC_DEBOUNCE_MS window kept deferring sync to
 * after they stopped typing — so the badge read "Syncing (7)" for
 * as long as they stayed active. Leading-edge throttle fires a sync
 * SYNC_DEBOUNCE_MS after the *first* edit and ignores subsequent
 * enqueues until the timer fires, guaranteeing the queue drains at
 * least once per SYNC_DEBOUNCE_MS during a scoring burst.
 */
export function scheduleSyncQueueProcessing(): void {
  if (tripSyncRuntime.syncDebounceTimer) return;
  tripSyncRuntime.syncDebounceTimer = setTimeout(() => {
    tripSyncRuntime.syncDebounceTimer = null;
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
    const reason = getSyncBlockReason();
    const message =
      reason === 'auth-pending'
        ? 'Waiting for Supabase sign-in state before syncing'
        : reason === 'auth-required'
          ? 'Sign in to sync queued changes to the cloud'
          : reason === 'supabase-unconfigured'
            ? 'Supabase not configured'
            : 'Offline';

    notifyTripSyncQueueChanged();
    return getQueueResultSnapshot([message]);
  }

  if (tripSyncRuntime.syncInProgress) {
    tripSyncRuntime.syncDrainRequested = true;
    notifyTripSyncQueueChanged();
    return getQueueResultSnapshot();
  }

  tripSyncRuntime.syncInProgress = true;
  tripSyncRuntime.syncDrainRequested = false;
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  try {
    const pendingItems = tripSyncRuntime.syncQueue
      .filter(
        (item) =>
          item.status === 'pending' ||
          (item.status === 'failed' && item.retryCount < MAX_RETRY_COUNT)
      )
      .sort(compareByDependency);

    if (pendingItems.length > 0) {
      syncBreadcrumb('processSyncQueue.start', {
        pending: pendingItems.length,
      });
    }

    // Sync a single item: flip to syncing, run the retry backoff
    // (if any), push to cloud, flip to completed or bump the retry
    // counter. Extracted so the outer loop can run items in parallel
    // within a dependency rank. Keeps the persist-before-mutate
    // invariant from the original loop so a crashed process never
    // loses the updated retry budget.
    const syncOne = async (item: SyncQueueItem): Promise<void> => {
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
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';

        // FK 23503 means the child landed before the parent. Re-queue
        // the missing parent so the next pass uploads it, and DO NOT
        // bump this child's retry budget — the failure was structural,
        // not the child's fault. Without this, the queue would burn
        // through MAX_RETRY_COUNT on each child and abandon them while
        // the parent sat unsynced (the exact pattern that left the
        // user's matches and practice_scores stuck in this thread).
        const requeuedParent = await tryRequeueParentForFkFailure(item, errorMessage);

        const nextRetryCount = requeuedParent ? item.retryCount : item.retryCount + 1;
        const nextStatus: SyncQueueItem['status'] = requeuedParent
          ? 'pending'
          : nextRetryCount >= MAX_RETRY_COUNT
            ? 'failed'
            : 'pending';

        await persistQueueItem({
          ...item,
          retryCount: nextRetryCount,
          error: errorMessage,
          status: nextStatus,
        });

        item.retryCount = nextRetryCount;
        item.error = errorMessage;
        item.status = nextStatus;

        // Surface every failure to the console (not just terminal
        // ones) so "N sync operations failed" is actually debuggable
        // from devtools. Before this, the error was stored on the
        // item but only emitted as a Sentry breadcrumb, leaving
        // users staring at a red badge with zero visibility.
        logger.warn(
          `[sync] ${item.operation} ${item.entity}:${item.entityId} failed (attempt ${nextRetryCount}/${MAX_RETRY_COUNT}): ${errorMessage}`
        );

        if (nextStatus === 'failed') {
          failed++;
          errors.push(`${item.entity}:${item.entityId} - ${errorMessage}`);
          syncBreadcrumb('processSyncQueue.item_failed', {
            entity: item.entity,
            entityId: item.entityId,
            operation: item.operation,
            retryCount: nextRetryCount,
            error: errorMessage,
          });
        }
      }
    };

    // Process items in dependency ranks — parents first, children
    // after — but run items *within* the same rank concurrently.
    // Before this, seven queued hole_results would run strictly
    // serially: one slow upload (or a single item waiting out its
    // exponential retry backoff) blocked the other six behind it.
    // compareByDependency already groups by entity+operation, so
    // adjacent items in pendingItems share a dependency rank; we
    // collect them into contiguous buckets and then fan out each
    // bucket with a 4-way concurrency cap so the anon Supabase
    // client and mobile radio don't thrash on bigger bursts.
    const CONCURRENCY = 4;
    const bucketKey = (item: SyncQueueItem) => `${item.entity}:${item.operation}`;
    const buckets: SyncQueueItem[][] = [];
    for (const item of pendingItems) {
      const last = buckets[buckets.length - 1];
      if (last && bucketKey(last[0]) === bucketKey(item)) {
        last.push(item);
      } else {
        buckets.push([item]);
      }
    }

    for (const bucket of buckets) {
      for (let i = 0; i < bucket.length; i += CONCURRENCY) {
        await Promise.all(bucket.slice(i, i + CONCURRENCY).map(syncOne));
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

    const remaining = tripSyncRuntime.syncQueue.filter(
      (item) => item.status !== 'completed'
    ).length;
    notifyTripSyncQueueChanged();
    return { success: errors.length === 0, synced, failed, queued: remaining, errors };
  } finally {
    const shouldDrainAgain = tripSyncRuntime.syncDrainRequested || hasRetryableQueueWork();
    tripSyncRuntime.syncInProgress = false;
    tripSyncRuntime.syncDrainRequested = false;

    if (shouldDrainAgain && canSync() && hasRetryableQueueWork()) {
      scheduleSyncQueueProcessing();
    }
  }
}

export async function retryFailedQueue(): Promise<number> {
  await ensureQueueHydrated();

  if (!canSync()) {
    logger.warn('Retry requested while sync is blocked', {
      reason: getSyncBlockReason(),
    });
    return 0;
  }

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

  if (retried > 0) {
    notifyTripSyncQueueChanged();
  }

  if (retried > 0) {
    scheduleSyncQueueProcessing();
  }

  return retried;
}

export async function clearQueue(): Promise<number> {
  await ensureQueueHydrated();
  const cleared = tripSyncRuntime.syncQueue.length;
  tripSyncRuntime.syncQueue.length = 0;
  try {
    await db.tripSyncQueue.clear();
    notifyTripSyncQueueChanged();
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

  if (cleared > 0) {
    notifyTripSyncQueueChanged();
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

  if (removed > 0) {
    notifyTripSyncQueueChanged();
  }

  return removed;
}

/**
 * Dumps every failed queue item's entity/operation/error to the
 * console. Surfaced as window.__dumpSyncFailures() so a captain
 * staring at "N failed" can hand us the actual error messages
 * without needing a remote-debug handshake.
 */
export function dumpSyncFailures(): Array<{
  entity: SyncEntity;
  entityId: string;
  operation: SyncOperation;
  retryCount: number;
  error?: string;
  lastAttemptAt?: string;
}> {
  const failures = tripSyncRuntime.syncQueue
    .filter((item) => item.status === 'failed')
    .map((item) => ({
      entity: item.entity,
      entityId: item.entityId,
      operation: item.operation,
      retryCount: item.retryCount,
      error: item.error,
      lastAttemptAt: item.lastAttemptAt,
    }));
  logger.log('[sync] failed items:', failures);
  return failures;
}

export type FailedSyncQueueItemSummary = {
  entity: SyncEntity;
  entityId: string;
  operation: SyncOperation;
  retryCount: number;
  error?: string;
  lastAttemptAt?: string;
  createdAt: string;
};

export type UnresolvedSyncQueueItemSummary = FailedSyncQueueItemSummary & {
  status: SyncQueueItem['status'];
};

function summarizeQueueItem(item: SyncQueueItem): UnresolvedSyncQueueItemSummary {
  return {
    entity: item.entity,
    entityId: item.entityId,
    operation: item.operation,
    status: item.status,
    retryCount: item.retryCount,
    error: item.error,
    lastAttemptAt: item.lastAttemptAt,
    createdAt: item.createdAt,
  };
}

export function getFailedSyncQueueItems(limit = 5): FailedSyncQueueItemSummary[] {
  return tripSyncRuntime.syncQueue
    .filter((item) => item.status === 'failed')
    .sort((a, b) => (b.lastAttemptAt ?? b.createdAt).localeCompare(a.lastAttemptAt ?? a.createdAt))
    .slice(0, limit)
    .map((item) => {
      const summary = summarizeQueueItem(item);
      return {
        entity: summary.entity,
        entityId: summary.entityId,
        operation: summary.operation,
        retryCount: summary.retryCount,
        error: summary.error,
        lastAttemptAt: summary.lastAttemptAt,
        createdAt: summary.createdAt,
      };
    });
}

export function getUnresolvedSyncQueueItems(limit = 5): UnresolvedSyncQueueItemSummary[] {
  return tripSyncRuntime.syncQueue
    .filter((item) => item.status !== 'completed')
    .sort((a, b) => (b.lastAttemptAt ?? b.createdAt).localeCompare(a.lastAttemptAt ?? a.createdAt))
    .slice(0, limit)
    .map(summarizeQueueItem);
}

export function getSyncQueueStatus(): {
  pending: number;
  failed: number;
  total: number;
  /**
   * The error message from the most recent failed item, if any. Surfaced
   * in the SyncFailureBanner so captains can see why writes are
   * bouncing (RLS denial, missing FK, rate limit) instead of just
   * staring at a retry button that can't win.
   */
  lastError?: string;
  lastAttemptAt?: string;
  lastFailedEntity?: SyncEntity;
  lastFailedOperation?: SyncOperation;
  blockedReason?: SyncBlockReason;
} {
  const pending = tripSyncRuntime.syncQueue.filter(
    (item) => item.status === 'pending' || item.status === 'syncing'
  ).length;
  const failedItems = tripSyncRuntime.syncQueue.filter((item) => item.status === 'failed');
  const lastFailedItem = failedItems
    .slice()
    .sort((a, b) =>
      (b.lastAttemptAt ?? b.createdAt).localeCompare(a.lastAttemptAt ?? a.createdAt)
    )[0];
  return {
    pending,
    failed: failedItems.length,
    total: tripSyncRuntime.syncQueue.length,
    lastError: lastFailedItem?.error,
    lastAttemptAt: lastFailedItem?.lastAttemptAt ?? lastFailedItem?.createdAt,
    lastFailedEntity: lastFailedItem?.entity,
    lastFailedOperation: lastFailedItem?.operation,
    blockedReason: getSyncBlockReason() ?? undefined,
  };
}

/**
 * Returns the set of entity ids that have a pending, syncing, OR
 * failed operation queued for a given trip + entity. Used by
 * pullTripCore to gate the orphan-row cleanup — local rows that
 * exist ONLY locally because a create hasn't reached the cloud
 * must not be deleted just because the cloud response doesn't
 * include them.
 *
 * CRITICAL: we include 'failed' too. Earlier this only returned
 * pending+syncing ids on the theory that failed items would
 * either eventually retry to success or be explicitly cleared by
 * the user. In practice that meant a failed create erased the
 * only copy of the user's data on the next pull — a captain's
 * practice rounds silently disappeared after a transient trigger
 * error blocked the create from ever reaching Supabase. Treating
 * 'failed' as still-owned-locally keeps the row alive until the
 * sync pipeline either succeeds on a later retry or the user
 * explicitly discards it via clearFailedQueue.
 */
export function getPendingSyncIdsForTrip(tripId: string, entity: SyncEntity): Set<string> {
  const ids = new Set<string>();
  for (const item of tripSyncRuntime.syncQueue) {
    if (item.tripId !== tripId) continue;
    if (item.entity !== entity) continue;
    if (item.status !== 'pending' && item.status !== 'syncing' && item.status !== 'failed') {
      continue;
    }
    ids.add(item.entityId);
  }
  return ids;
}

/**
 * Returns ids with a pending/syncing/failed delete operation. Pulls use
 * this to avoid resurrecting rows the captain already deleted locally
 * while the delete is still waiting to reach Supabase.
 */
export function getPendingDeleteSyncIdsForTrip(tripId: string, entity: SyncEntity): Set<string> {
  const ids = new Set<string>();
  for (const item of tripSyncRuntime.syncQueue) {
    if (item.tripId !== tripId) continue;
    if (item.entity !== entity) continue;
    if (item.operation !== 'delete') continue;
    if (item.status !== 'pending' && item.status !== 'syncing' && item.status !== 'failed') {
      continue;
    }
    ids.add(item.entityId);
  }
  return ids;
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
