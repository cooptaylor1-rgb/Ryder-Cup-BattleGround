import { db } from '@/lib/db';
import type { Match, UUID } from '@/lib/types/models';

import { queueSyncOperation } from '../tripSyncService';

export interface PracticeGroupDraft {
  /** Local identity for React keying; not persisted. */
  localId: string;
  /** 1-indexed, matches the "Group N" label. */
  groupNumber: number;
  playerIds: UUID[];
  /** ISO string like "2026-04-30T08:00" — empty string means unset. */
  teeTime?: string;
}

/**
 * Persist a set of practice groups for a session. Each group becomes a
 * single Match row with mode='practice': the group's players all sit in
 * teamAPlayerIds, teamBPlayerIds stays empty, and handicap allowances
 * are zeroed because there's no head-to-head to allowance against. The
 * tee time flows into Match.teeTime so it shows up on the schedule.
 *
 * Intentionally separate from saveLineup (which is Ryder Cup specific):
 * sharing one persistence path would mean threading practice/regular
 * branches through every handicap + pairing code path, and the model
 * differences are big enough that a dedicated function stays clearer.
 */
export async function savePracticeLineup(
  sessionId: UUID,
  groups: PracticeGroupDraft[]
): Promise<{ success: boolean; matchIds: UUID[] }> {
  const session = await db.sessions.get(sessionId);
  if (!session) {
    return { success: false, matchIds: [] };
  }

  const tripId = session.tripId;
  const now = new Date().toISOString();
  const matchIds: UUID[] = [];

  // Drop any existing matches for this session and rebuild. Practice
  // groups don't carry the scoring history that cup matches do, so
  // re-publishing with a different group count / player mix is safe to
  // overwrite; versioning the re-pair would add complexity without
  // solving a real race (practice matches don't get scored against).
  const existing = await db.matches.where('sessionId').equals(sessionId).toArray();
  for (const match of existing) {
    await db.matches.delete(match.id);
    if (tripId) {
      queueSyncOperation('match', match.id, 'delete', tripId);
    }
  }

  for (const group of groups) {
    if (group.playerIds.length === 0) continue;

    const matchId = crypto.randomUUID();
    const newMatch: Match = {
      id: matchId,
      sessionId,
      mode: 'practice',
      matchOrder: group.groupNumber,
      status: 'scheduled',
      currentHole: 1,
      teamAPlayerIds: group.playerIds,
      teamBPlayerIds: [],
      teamAHandicapAllowance: 0,
      teamBHandicapAllowance: 0,
      courseId: session.defaultCourseId,
      teeSetId: session.defaultTeeSetId,
      teeTime: group.teeTime ? group.teeTime : undefined,
      result: 'notFinished',
      margin: 0,
      holesRemaining: 18,
      createdAt: now,
      updatedAt: now,
    };

    await db.matches.add(newMatch);
    if (tripId) {
      queueSyncOperation('match', matchId, 'create', tripId, newMatch);
    }
    matchIds.push(matchId);
  }

  return { success: true, matchIds };
}
