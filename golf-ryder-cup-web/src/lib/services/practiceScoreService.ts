import { db } from '@/lib/db';
import type { PracticeScore, UUID } from '@/lib/types/models';

import { queueSyncOperation } from './tripSyncService';

/**
 * Write (or overwrite) a single player's gross strokes on a hole of a
 * practice match. The Dexie compound index
 * [matchId+playerId+holeNumber] is used to look up an existing row so
 * repeated entries for the same slot update in place rather than
 * duplicating.
 */
export async function upsertPracticeScore({
  matchId,
  playerId,
  holeNumber,
  gross,
  tripId,
}: {
  matchId: UUID;
  playerId: UUID;
  holeNumber: number;
  /** undefined means "clear the entry" */
  gross: number | undefined;
  tripId: UUID;
}): Promise<PracticeScore> {
  const now = new Date().toISOString();
  const existing = await db.practiceScores
    .where('[matchId+playerId+holeNumber]')
    .equals([matchId, playerId, holeNumber])
    .first();

  if (existing) {
    const updated: PracticeScore = {
      ...existing,
      gross,
      updatedAt: now,
    };
    await db.practiceScores.put(updated);
    queueSyncOperation('practiceScore', existing.id, 'update', tripId, updated);
    return updated;
  }

  const created: PracticeScore = {
    id: crypto.randomUUID(),
    matchId,
    playerId,
    holeNumber,
    gross,
    createdAt: now,
    updatedAt: now,
  };
  await db.practiceScores.add(created);
  queueSyncOperation('practiceScore', created.id, 'create', tripId, created);
  return created;
}

/**
 * Fetch all practice scores for a single match. Returns them sorted
 * by hole, then player id, so callers rendering a grid can iterate
 * deterministically.
 */
export async function getPracticeScoresForMatch(matchId: UUID): Promise<PracticeScore[]> {
  const rows = await db.practiceScores.where('matchId').equals(matchId).toArray();
  return rows.sort((a, b) => a.holeNumber - b.holeNumber || a.playerId.localeCompare(b.playerId));
}
