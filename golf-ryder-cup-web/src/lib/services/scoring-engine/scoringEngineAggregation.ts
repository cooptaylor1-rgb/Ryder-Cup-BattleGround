import { db } from '@/lib/db';
import type { HoleResult, Match, MatchStatus } from '@/lib/types/models';
import type { MatchState } from '@/lib/types/computed';

import { isValidWinner, normalizeHoleResults, TOTAL_HOLES } from './scoringEngineShared';
import type { MatchStateSnapshot } from './scoringEngineTypes';

function determineWinningTeam(
  score: number,
  holesPlayed: number,
  holesRemaining: number
): 'teamA' | 'teamB' | 'halved' | null {
  if (holesPlayed === 0) return null;

  const isClosedOut = Math.abs(score) > holesRemaining;
  const isComplete = holesRemaining === 0 || isClosedOut;

  if (!isComplete) {
    if (score > 0) return 'teamA';
    if (score < 0) return 'teamB';
    return null;
  }

  if (score > 0) return 'teamA';
  if (score < 0) return 'teamB';
  return 'halved';
}

export function formatMatchScore(
  score: number,
  holesRemaining: number,
  isClosedOut: boolean,
  holesPlayed: number
): string {
  if (holesPlayed === 0) {
    return 'AS';
  }

  if (score === 0) {
    return 'AS';
  }

  const absScore = Math.abs(score);

  if (isClosedOut) {
    if (holesRemaining === 0) {
      return `${absScore} UP`;
    }
    return `${absScore}&${holesRemaining}`;
  }

  return `${absScore} ${score > 0 ? 'UP' : 'DN'}`;
}

export function calculateMatchStateSnapshot(holeResults: HoleResult[]): MatchStateSnapshot {
  const sortedResults = normalizeHoleResults(holeResults);

  let teamAHolesWon = 0;
  let teamBHolesWon = 0;
  let holesPlayed = 0;

  for (const result of sortedResults) {
    if (!isValidWinner(result.winner)) {
      continue;
    }

    if (result.winner === 'teamA') {
      teamAHolesWon++;
      holesPlayed++;
    } else if (result.winner === 'teamB') {
      teamBHolesWon++;
      holesPlayed++;
    } else if (result.winner === 'halved') {
      holesPlayed++;
    }
  }

  const currentScore = teamAHolesWon - teamBHolesWon;
  const holesRemaining = TOTAL_HOLES - holesPlayed;
  const isDormieTeamA = currentScore > 0 && currentScore === holesRemaining;
  const isDormieTeamB = currentScore < 0 && Math.abs(currentScore) === holesRemaining;
  const isDormie = isDormieTeamA || isDormieTeamB;
  const isClosedOut = Math.abs(currentScore) > holesRemaining;

  let status: MatchStatus = 'scheduled';
  if (holesPlayed > 0) {
    status = isClosedOut ? 'completed' : 'inProgress';
  }

  const actualScoredHoles = sortedResults.filter((result) => result.winner !== 'none').length;
  if (actualScoredHoles === TOTAL_HOLES && !isClosedOut) {
    status = 'completed';
  }

  return {
    holeResults: sortedResults,
    currentScore,
    teamAHolesWon,
    teamBHolesWon,
    holesPlayed,
    holesRemaining,
    isDormie,
    isClosedOut,
    status,
    displayScore: formatMatchScore(currentScore, holesRemaining, isClosedOut, holesPlayed),
    winningTeam: determineWinningTeam(currentScore, holesPlayed, holesRemaining),
  };
}

export function calculateMatchState(match: Match, holeResults: HoleResult[]): MatchState {
  return {
    match,
    ...calculateMatchStateSnapshot(holeResults),
  };
}

export async function getCurrentHole(matchId: string): Promise<number | null> {
  const results = await db.holeResults.where('matchId').equals(matchId).toArray();
  const scoredHoles = new Set(
    results.filter((result) => result.winner !== 'none').map((result) => result.holeNumber)
  );

  for (let holeNumber = 1; holeNumber <= TOTAL_HOLES; holeNumber++) {
    if (!scoredHoles.has(holeNumber)) {
      return holeNumber;
    }
  }

  return null;
}
