import { db } from '@/lib/db';
import type { Match, Player, UUID } from '@/lib/types/models';

import { buildMatchHandicapContext } from '../matchHandicapService';
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
    const handicapContext = buildMatchHandicapContext({
      sessionType: session.sessionType,
      teamAPlayers: teamAPlayerIds
        .map((playerId) => playerById.get(playerId))
        .filter((player): player is Player => Boolean(player)),
      teamBPlayers: teamBPlayerIds
        .map((playerId) => playerById.get(playerId))
        .filter((player): player is Player => Boolean(player)),
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

      await db.matches.update(match.id, {
        teamAPlayerIds,
        teamBPlayerIds,
        teamAHandicapAllowance: handicapContext.teamAHandicapAllowance,
        teamBHandicapAllowance: handicapContext.teamBHandicapAllowance,
        version: (match.version ?? 0) + 1,
        updatedAt: now,
      });
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
      result: 'notFinished',
      margin: 0,
      holesRemaining: 18,
      createdAt: now,
      updatedAt: now,
    };
    await db.matches.add(newMatch);
    matchIds.push(matchId);
  }

  return { success: true, matchIds };
}
