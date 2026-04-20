import { db } from '@/lib/db';
import type { Match, Player } from '@/lib/types/models';

import { buildMatchHandicapContext } from '../matchHandicapService';
import { calculateMatchState } from './scoringEngineAggregation';
import { calculateStoredMatchResult } from './scoringEngineResults';

export async function createMatch(
  sessionId: string,
  matchNumber: number,
  teamAPlayers: string[],
  teamBPlayers: string[]
): Promise<Match> {
  const now = new Date().toISOString();
  const session = await db.sessions.get(sessionId);
  const loadedPlayers = (await db.players.bulkGet([...teamAPlayers, ...teamBPlayers])).filter(
    Boolean
  ) as Player[];
  const playerById = new Map(loadedPlayers.map((player) => [player.id, player]));
  const handicapContext = buildMatchHandicapContext({
    sessionType: session?.sessionType,
    teamAPlayers: teamAPlayers
      .map((playerId) => playerById.get(playerId))
      .filter((player): player is Player => Boolean(player)),
    teamBPlayers: teamBPlayers
      .map((playerId) => playerById.get(playerId))
      .filter((player): player is Player => Boolean(player)),
  });

  const match: Match = {
    id: crypto.randomUUID(),
    sessionId,
    matchOrder: matchNumber,
    teamAPlayerIds: teamAPlayers,
    teamBPlayerIds: teamBPlayers,
    status: 'scheduled',
    currentHole: 1,
    teamAHandicapAllowance: handicapContext.teamAHandicapAllowance,
    teamBHandicapAllowance: handicapContext.teamBHandicapAllowance,
    result: 'notFinished',
    margin: 0,
    holesRemaining: 18,
    version: 1,
    createdAt: now,
    updatedAt: now,
  };

  await db.matches.add(match);
  return match;
}

export async function finalizeMatch(matchId: string): Promise<void> {
  const match = await db.matches.get(matchId);
  if (!match) return;

  const holeResults = await db.holeResults.where('matchId').equals(matchId).toArray();
  const matchState = calculateMatchState(match, holeResults);

  if (matchState.isClosedOut || matchState.holesRemaining === 0) {
    await db.matches.update(matchId, {
      status: 'completed',
      result: calculateStoredMatchResult(matchState),
      margin: Math.abs(matchState.currentScore),
      holesRemaining: matchState.holesRemaining,
      version: (match.version ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    });
  }
}

/**
 * Revert a completed match back to in-progress so a captain can correct
 * a miskeyed hole after the match was finalized. Caller is expected to
 * guard this behind captain mode and log to the audit trail.
 */
export async function reopenMatch(matchId: string): Promise<void> {
  const match = await db.matches.get(matchId);
  if (!match) return;
  if (match.status !== 'completed') return;

  const holeResults = await db.holeResults.where('matchId').equals(matchId).toArray();
  const matchState = calculateMatchState(match, holeResults);

  await db.matches.update(matchId, {
    status: 'inProgress',
    result: 'notFinished',
    margin: Math.abs(matchState.currentScore),
    holesRemaining: matchState.holesRemaining,
    version: (match.version ?? 0) + 1,
    updatedAt: new Date().toISOString(),
  });
}
