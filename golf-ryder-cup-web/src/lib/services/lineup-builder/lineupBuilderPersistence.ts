import { db } from '@/lib/db';
import type { Match, Player, UUID } from '@/lib/types/models';

import { buildMatchHandicapContext } from '../matchHandicapService';
import { queueSyncOperation } from '../tripSyncService';
import type { LineupState } from './lineupBuilderTypes';

export async function saveLineup(
  state: LineupState,
  _tripId: UUID
): Promise<{ success: boolean; matchIds: UUID[] }> {
  const session = await db.sessions.get(state.sessionId);
  if (!session) {
    return { success: false, matchIds: [] };
  }

  const matchIds: UUID[] = [];
  const now = new Date().toISOString();
  // tripId is resolved from the session rather than the caller-provided
  // _tripId so the sync op always matches the session's actual parent —
  // a caller passing a stale id would cascade wrong-trip writes into
  // the cloud.
  const tripId = session.tripId;

  for (const lineupMatch of state.matches) {
    if (lineupMatch.teamAPlayers.length === 0 && lineupMatch.teamBPlayers.length === 0) {
      continue;
    }

    const existingMatches = await db.matches
      .where('sessionId')
      .equals(state.sessionId)
      .filter((match) => match.matchOrder === lineupMatch.matchNumber)
      .toArray();

    const teamAPlayerIds = lineupMatch.teamAPlayers.map((player) => player.id);
    const teamBPlayerIds = lineupMatch.teamBPlayers.map((player) => player.id);
    const loadedPlayers = (await db.players.bulkGet([...teamAPlayerIds, ...teamBPlayerIds])).filter(Boolean) as Player[];
    const playerById = new Map(loadedPlayers.map((player) => [player.id, player]));
    // Use the existing match's tee set for re-pairs, or fall back to
    // the session default for brand-new matches. Without this, lineup
    // publish would compute allowances from raw index and either
    // overwrite a correctly-computed allowance (existing match) or
    // seed the new match with a raw-index number that scoring then
    // has to re-correct on first render.
    const existingMatchTeeSetId = existingMatches[0]?.teeSetId;
    const effectiveTeeSetId = existingMatchTeeSetId ?? session.defaultTeeSetId;
    const teeSet = effectiveTeeSetId
      ? (await db.teeSets.get(effectiveTeeSetId)) ?? undefined
      : undefined;
    const handicapContext = buildMatchHandicapContext({
      sessionType: session.sessionType,
      teamAPlayers: teamAPlayerIds
        .map((playerId) => playerById.get(playerId))
        .filter((player): player is Player => Boolean(player)),
      teamBPlayers: teamBPlayerIds
        .map((playerId) => playerById.get(playerId))
        .filter((player): player is Player => Boolean(player)),
      teeSet,
    });

    if (existingMatches.length > 0) {
      const match = existingMatches[0];
      // Guard: once a match has started or completed, overwriting the
      // team IDs silently corrupts existing hole results — hole 5 would
      // still show Player A's win, but the team roster would list
      // Player B. Block the lineup save for these matches so the captain
      // must use the explicit "pull player" action (which audits the
      // change and rebuilds allowance for unscored holes only).
      if (match.status !== 'scheduled') {
        matchIds.push(match.id);
        continue;
      }

      // Preserve the stored allowance when we couldn't resolve a tee
      // set — a later lineup re-publish on a course-less match would
      // otherwise clobber a correctly-computed value with the
      // raw-index fallback.
      const updates = {
        teamAPlayerIds,
        teamBPlayerIds,
        teamAHandicapAllowance: handicapContext.hasCourseHandicapInfo
          ? handicapContext.teamAHandicapAllowance
          : match.teamAHandicapAllowance ?? 0,
        teamBHandicapAllowance: handicapContext.hasCourseHandicapInfo
          ? handicapContext.teamBHandicapAllowance
          : match.teamBHandicapAllowance ?? 0,
        version: (match.version ?? 0) + 1,
        updatedAt: now,
      };
      await db.matches.update(match.id, updates);
      // Queue a sync op so the lineup publish actually reaches the
      // cloud — before this, every lineup save was Dexie-only and
      // other devices never saw the roster.
      if (tripId) {
        queueSyncOperation('match', match.id, 'update', tripId, { ...match, ...updates });
      }
      matchIds.push(match.id);
      continue;
    }

    const matchId = crypto.randomUUID();
    const newMatch: Match = {
      id: matchId,
      sessionId: state.sessionId,
      matchOrder: lineupMatch.matchNumber,
      status: 'scheduled',
      currentHole: 1,
      teamAPlayerIds,
      teamBPlayerIds,
      teamAHandicapAllowance: handicapContext.teamAHandicapAllowance,
      teamBHandicapAllowance: handicapContext.teamBHandicapAllowance,
      // Inherit the session's default course + tee so a captain who
      // set them in Session Settings before publishing pairings
      // doesn't have to touch every match afterward. Per-match
      // overrides still work via the match card editor.
      courseId: session.defaultCourseId,
      teeSetId: session.defaultTeeSetId,
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
