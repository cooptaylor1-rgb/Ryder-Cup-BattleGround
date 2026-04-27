import { db } from '@/lib/db';
import type { Match, UUID } from '@/lib/types/models';

import { queueSyncOperation } from '../tripSyncService';

export interface PracticeGroupDraft {
  /** Local identity for React keying; not persisted. */
  localId: string;
  /** 1-indexed, matches the "Group N" label. */
  groupNumber: number;
  /** All players in the tee-time group. Kept for roster assignment and legacy drafts. */
  playerIds: UUID[];
  /** Optional captain-set practice side A inside the tee-time group. */
  teamAPlayerIds?: UUID[];
  /** Optional captain-set practice side B inside the tee-time group. Empty means tee-time team. */
  teamBPlayerIds?: UUID[];
  /** ISO string like "2026-04-30T08:00" — empty string means unset. */
  teeTime?: string;
}

/**
 * Persist a set of practice groups for a session. Each group becomes a
 * single Match row with mode='practice'. By default the tee-time group
 * is one team (all players in teamAPlayerIds). Captains can also split
 * a group into two practice sides; those persist in the existing
 * teamA/teamB arrays without changing the DB schema. Handicap
 * allowances stay zero because practice format scoring derives net
 * strokes per player from the tee set.
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
    const { teamAPlayerIds, teamBPlayerIds, allPlayerIds } = resolvePracticeGroupTeams(group);
    if (allPlayerIds.length === 0) continue;

    const matchId = crypto.randomUUID();
    const newMatch: Match = {
      id: matchId,
      sessionId,
      mode: 'practice',
      matchOrder: group.groupNumber,
      status: 'scheduled',
      currentHole: 1,
      teamAPlayerIds,
      teamBPlayerIds,
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

export function resolvePracticeGroupTeams(group: PracticeGroupDraft): {
  allPlayerIds: UUID[];
  teamAPlayerIds: UUID[];
  teamBPlayerIds: UUID[];
} {
  const rosterOrder = uniqueIds(group.playerIds);
  const sideB = uniqueIds(group.teamBPlayerIds ?? []).filter((id) => rosterOrder.includes(id));

  if (sideB.length === 0) {
    return {
      allPlayerIds: rosterOrder,
      teamAPlayerIds: rosterOrder,
      teamBPlayerIds: [],
    };
  }

  const sideASeed =
    group.teamAPlayerIds && group.teamAPlayerIds.length > 0
      ? group.teamAPlayerIds
      : rosterOrder.filter((id) => !sideB.includes(id));
  const sideA = uniqueIds(sideASeed).filter(
    (id) => rosterOrder.includes(id) && !sideB.includes(id)
  );
  const assigned = new Set([...sideA, ...sideB]);
  const unassigned = rosterOrder.filter((id) => !assigned.has(id));

  return {
    allPlayerIds: rosterOrder,
    teamAPlayerIds: [...sideA, ...unassigned],
    teamBPlayerIds: sideB,
  };
}

function uniqueIds(ids: UUID[]): UUID[] {
  return Array.from(new Set(ids));
}
