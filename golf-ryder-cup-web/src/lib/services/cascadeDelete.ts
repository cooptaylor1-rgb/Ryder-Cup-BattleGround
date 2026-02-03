/**
 * Cascade Delete Helpers
 *
 * Centralizes “delete in dependency order” logic for offline-first data.
 *
 * Goals:
 * - Deleting a match/session should not leave orphaned scoring (holeResults/scoringEvents)
 * - Optionally enqueue cloud deletes so offline-first behavior remains intact
 */

import { db } from '@/lib/db';
import { createLogger } from '@/lib/utils/logger';
import { queueSyncOperation } from '@/lib/services/tripSyncService';

const logger = createLogger('CascadeDelete');

export interface CascadeDeleteOptions {
  /**
   * When true (default), queue cloud deletes for the affected entities.
   * Use `false` for server-driven deletes (e.g. realtime updates) where
   * we only want to mirror remote state locally.
   */
  sync?: boolean;

  /** Optional override when tripId is already known. */
  tripId?: string;
}

export async function deleteMatchCascade(
  matchId: string,
  { sync = true, tripId: tripIdOverride }: CascadeDeleteOptions = {}
): Promise<void> {
  // Collect related ids first (safe even if match already deleted).
  const [match, holeResults] = await Promise.all([
    db.matches.get(matchId),
    db.holeResults.where('matchId').equals(matchId).toArray(),
  ]);

  const holeResultIds = holeResults.map((hr) => hr.id);

  let tripId = tripIdOverride;
  if (!tripId && match) {
    const session = await db.sessions.get(match.sessionId);
    tripId = session?.tripId;
  }

  if (sync && tripId) {
    // Ensure any pending updates for these entities are overwritten by deletes.
    for (const holeResultId of holeResultIds) {
      queueSyncOperation('holeResult', holeResultId, 'delete', tripId);
    }
    queueSyncOperation('match', matchId, 'delete', tripId);
  } else if (sync && !tripId) {
    logger.warn('deleteMatchCascade: missing tripId; skipping sync queue', { matchId });
  }

  await db.transaction('rw', [db.scoringEvents, db.holeResults, db.matches], async () => {
    // Leaves → root
    await db.scoringEvents.where('matchId').equals(matchId).delete();
    await db.holeResults.where('matchId').equals(matchId).delete();
    await db.matches.delete(matchId);
  });
}

export async function deleteSessionCascade(
  sessionId: string,
  { sync = true, tripId: tripIdOverride }: CascadeDeleteOptions = {}
): Promise<void> {
  const session = await db.sessions.get(sessionId);
  const tripId = tripIdOverride ?? session?.tripId;

  const matches = await db.matches.where('sessionId').equals(sessionId).toArray();
  const matchIds = matches.map((m) => m.id);

  // Hole results are per-match.
  const holeResults = matchIds.length
    ? await db.holeResults.where('matchId').anyOf(matchIds).toArray()
    : [];
  const holeResultIds = holeResults.map((hr) => hr.id);

  if (sync && tripId) {
    for (const holeResultId of holeResultIds) {
      queueSyncOperation('holeResult', holeResultId, 'delete', tripId);
    }
    for (const matchId of matchIds) {
      queueSyncOperation('match', matchId, 'delete', tripId);
    }
    queueSyncOperation('session', sessionId, 'delete', tripId);
  } else if (sync && !tripId) {
    logger.warn('deleteSessionCascade: missing tripId; skipping sync queue', { sessionId });
  }

  await db.transaction('rw', [db.scoringEvents, db.holeResults, db.matches, db.sessions], async () => {
    if (matchIds.length) {
      await db.scoringEvents.where('matchId').anyOf(matchIds).delete();
      await db.holeResults.where('matchId').anyOf(matchIds).delete();
      await db.matches.where('sessionId').equals(sessionId).delete();
    }
    await db.sessions.delete(sessionId);
  });
}
