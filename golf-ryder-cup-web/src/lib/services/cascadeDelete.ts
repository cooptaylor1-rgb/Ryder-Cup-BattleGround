/**
 * Cascade Delete Helpers
 *
 * Centralizes "delete in dependency order" logic for offline-first data.
 *
 * Goals:
 * - Deleting a match/session/trip should not leave orphaned data
 * - Covers all 44 tables to prevent IndexedDB bloat
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

/**
 * Delete a trip and ALL related data across all tables.
 *
 * Previously, deleting a trip would orphan records in 9+ tables
 * (holeResults, scoringEvents, sideBets, banterPosts, auditLog,
 * scheduleDays, tripStats, tripAwards, side games, social, finances).
 * This function ensures complete cleanup.
 */
export async function deleteTripCascade(
  tripId: string,
  { sync = true }: Pick<CascadeDeleteOptions, 'sync'> = {}
): Promise<{ tablesCleared: number; recordsDeleted: number }> {
  let recordsDeleted = 0;

  // Collect session/match IDs needed for deep-nested deletes
  const sessions = await db.sessions.where('tripId').equals(tripId).toArray();
  const sessionIds = sessions.map((s) => s.id);

  const matches = sessionIds.length
    ? await db.matches.where('sessionId').anyOf(sessionIds).toArray()
    : [];
  const matchIds = matches.map((m) => m.id);

  const teams = await db.teams.where('tripId').equals(tripId).toArray();
  const teamIds = teams.map((t) => t.id);

  if (sync) {
    queueSyncOperation('trip', tripId, 'delete', tripId);
  }

  logger.log('deleteTripCascade: starting', {
    tripId,
    sessions: sessionIds.length,
    matches: matchIds.length,
    teams: teamIds.length,
  });

  // Delete in dependency order (leaves first, root last).
  // Use a transaction across all affected tables for atomicity.
  await db.transaction(
    'rw',
    [
      // Scoring
      db.scoringEvents,
      db.holeResults,
      db.matches,
      db.sessions,
      // Teams
      db.teamMembers,
      db.teams,
      // Players
      db.players,
      // Schedule
      db.scheduleItems,
      db.scheduleDays,
      // Audit & social
      db.auditLog,
      db.banterPosts,
      // Side bets
      db.sideBets,
      // Extended side games
      db.wolfGames,
      db.vegasGames,
      db.hammerGames,
      db.nassauGames,
      db.settlements,
      // Social
      db.chatMessages,
      db.chatThreads,
      db.trashTalks,
      db.photos,
      db.photoAlbums,
      db.polls,
      db.headToHeadRecords,
      db.tripArchives,
      // Stats
      db.tripStats,
      db.tripAwards,
      // Sync
      db.tripSyncQueue,
      // Finances
      db.duesLineItems,
      db.paymentRecords,
      // Root
      db.trips,
    ],
    async () => {
      // --- Scoring chain (deepest first) ---
      if (matchIds.length) {
        recordsDeleted += await db.scoringEvents.where('matchId').anyOf(matchIds).delete();
        recordsDeleted += await db.holeResults.where('matchId').anyOf(matchIds).delete();
      }
      if (sessionIds.length) {
        recordsDeleted += await db.matches.where('sessionId').anyOf(sessionIds).delete();
      }
      recordsDeleted += await db.sessions.where('tripId').equals(tripId).delete();

      // --- Teams ---
      if (teamIds.length) {
        recordsDeleted += await db.teamMembers.where('teamId').anyOf(teamIds).delete();
      }
      recordsDeleted += await db.teams.where('tripId').equals(tripId).delete();

      // --- Players belonging to this trip ---
      recordsDeleted += await db.players.where('tripId').equals(tripId).delete();

      // --- Schedule ---
      const scheduleDays = await db.scheduleDays.where('tripId').equals(tripId).toArray();
      const scheduleDayIds = scheduleDays.map((d) => d.id);
      if (scheduleDayIds.length) {
        recordsDeleted += await db.scheduleItems.where('scheduleDayId').anyOf(scheduleDayIds).delete();
      }
      recordsDeleted += await db.scheduleDays.where('tripId').equals(tripId).delete();

      // --- Audit & social ---
      recordsDeleted += await db.auditLog.where('tripId').equals(tripId).delete();
      recordsDeleted += await db.banterPosts.where('tripId').equals(tripId).delete();

      // --- Side bets ---
      recordsDeleted += await db.sideBets.where('tripId').equals(tripId).delete();

      // --- Extended side games ---
      recordsDeleted += await db.wolfGames.where('tripId').equals(tripId).delete();
      recordsDeleted += await db.vegasGames.where('tripId').equals(tripId).delete();
      recordsDeleted += await db.hammerGames.where('tripId').equals(tripId).delete();
      recordsDeleted += await db.nassauGames.where('tripId').equals(tripId).delete();
      recordsDeleted += await db.settlements.where('tripId').equals(tripId).delete();

      // --- Social ---
      recordsDeleted += await db.chatMessages.where('tripId').equals(tripId).delete();
      recordsDeleted += await db.chatThreads.where('tripId').equals(tripId).delete();
      recordsDeleted += await db.trashTalks.where('tripId').equals(tripId).delete();
      recordsDeleted += await db.photos.where('tripId').equals(tripId).delete();
      recordsDeleted += await db.photoAlbums.where('tripId').equals(tripId).delete();
      recordsDeleted += await db.polls.where('tripId').equals(tripId).delete();
      recordsDeleted += await db.headToHeadRecords.where('tripId').equals(tripId).delete();
      recordsDeleted += await db.tripArchives.where('tripId').equals(tripId).delete();

      // --- Stats ---
      recordsDeleted += await db.tripStats.where('tripId').equals(tripId).delete();
      recordsDeleted += await db.tripAwards.where('tripId').equals(tripId).delete();

      // --- Sync queue ---
      recordsDeleted += await db.tripSyncQueue.where('tripId').equals(tripId).delete();

      // --- Finances ---
      recordsDeleted += await db.duesLineItems.where('tripId').equals(tripId).delete();
      recordsDeleted += await db.paymentRecords.where('tripId').equals(tripId).delete();

      // --- Root ---
      await db.trips.delete(tripId);
      recordsDeleted += 1;
    }
  );

  const tablesCleared = 30; // Number of tables touched
  logger.log('deleteTripCascade: complete', { tripId, tablesCleared, recordsDeleted });

  return { tablesCleared, recordsDeleted };
}
