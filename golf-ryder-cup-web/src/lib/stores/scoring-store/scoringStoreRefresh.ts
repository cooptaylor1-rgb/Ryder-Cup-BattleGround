import { db } from '@/lib/db';
import { calculateMatchState } from '@/lib/services/scoringEngine';
import type { MatchState } from '@/lib/types/computed';
import type { Match } from '@/lib/types/models';

export async function refreshSingleMatchStateData(
  matchId: string,
  existingMatchStates: Map<string, MatchState>
): Promise<{
  activeMatch: Match | null;
  activeMatchState: MatchState | null;
  matchStates: Map<string, MatchState>;
}> {
  const match = await db.matches.get(matchId);
  if (!match) {
    return {
      activeMatch: null,
      activeMatchState: null,
      matchStates: existingMatchStates,
    };
  }

  const holeResults = await db.holeResults.where('matchId').equals(matchId).toArray();
  const newState = calculateMatchState(match, holeResults);
  const matchStates = new Map(existingMatchStates);
  matchStates.set(matchId, newState);

  return {
    activeMatch: match,
    activeMatchState: newState,
    matchStates,
  };
}

export async function refreshAllMatchStatesData(
  sessionMatches: Parameters<typeof calculateMatchState>[0][],
  activeMatchId: string | null
): Promise<{
  activeMatch: Match | null;
  activeMatchState: MatchState | null;
  matchStates: Map<string, MatchState>;
}> {
  if (sessionMatches.length === 0) {
  return {
    activeMatch: activeMatchId ? (await db.matches.get(activeMatchId)) ?? null : null,
    activeMatchState: null,
    matchStates: new Map(),
  };
  }

  const matchIds = sessionMatches.map((match) => match.id);
  const allResults = await db.holeResults.where('matchId').anyOf(matchIds).toArray();
  const resultsByMatch = new Map<string, typeof allResults>();

  for (const result of allResults) {
    const existing = resultsByMatch.get(result.matchId) ?? [];
    existing.push(result);
    resultsByMatch.set(result.matchId, existing);
  }

  const refreshedMatches = await db.matches.bulkGet(matchIds);
  const matchStates = new Map<string, MatchState>();

  for (const match of refreshedMatches.filter((value): value is Match => Boolean(value))) {
    const results = resultsByMatch.get(match.id) ?? [];
    matchStates.set(match.id, calculateMatchState(match, results));
  }

  const activeMatch = activeMatchId ? (await db.matches.get(activeMatchId)) ?? null : null;

  return {
    activeMatch,
    activeMatchState: activeMatch ? matchStates.get(activeMatch.id) ?? null : null,
    matchStates,
  };
}
