import type { HoleWinner, MatchResultType } from '@/lib/types/models';
import type { MatchState } from '@/lib/types/computed';

export function calculateMatchResult(matchState: MatchState): MatchResultType {
  if (!matchState.isClosedOut && matchState.holesRemaining > 0) {
    return 'incomplete';
  }

  if (matchState.currentScore === 0) {
    return 'halved';
  }

  const absScore = Math.abs(matchState.currentScore);
  const holesRemaining = matchState.holesRemaining;

  if (holesRemaining === 0) {
    return 'oneUp';
  }

  if (absScore <= holesRemaining) {
    return 'incomplete';
  }

  switch (absScore) {
    case 1:
      return 'oneUp';
    case 2:
      return 'twoAndOne';
    case 3:
      return 'threeAndTwo';
    case 4:
      return 'fourAndThree';
    case 5:
      return 'fiveAndFour';
    case 6:
      return 'sixAndFive';
    default:
      return 'sixAndFive';
  }
}

export function calculateStoredMatchResult(
  matchState: MatchState
): 'teamAWin' | 'teamBWin' | 'halved' | 'notFinished' {
  if (!matchState.isClosedOut && matchState.holesRemaining > 0) {
    return 'notFinished';
  }

  if (matchState.currentScore === 0) {
    return 'halved';
  }

  return matchState.currentScore > 0 ? 'teamAWin' : 'teamBWin';
}

export function formatFinalResult(
  matchState: MatchState,
  teamAName: string,
  teamBName: string
): string {
  if (matchState.currentScore === 0 && matchState.holesRemaining === 0) {
    return 'Match Halved';
  }

  const winner = matchState.currentScore > 0 ? teamAName : teamBName;
  return `${winner} won ${matchState.displayScore}`;
}

export function checkDormie(
  score: number,
  holesRemaining: number
): { teamADormie: boolean; teamBDormie: boolean } {
  return {
    teamADormie: score > 0 && score === holesRemaining,
    teamBDormie: score < 0 && Math.abs(score) === holesRemaining,
  };
}

export function wouldCloseOut(
  currentScore: number,
  holesRemaining: number,
  proposedWinner: HoleWinner
): boolean {
  if (proposedWinner === 'halved' || proposedWinner === 'none') {
    return Math.abs(currentScore) > holesRemaining - 1;
  }

  let newScore = currentScore;
  if (proposedWinner === 'teamA') {
    newScore++;
  } else if (proposedWinner === 'teamB') {
    newScore--;
  }

  return Math.abs(newScore) > holesRemaining - 1;
}

export function calculateMatchPoints(matchState: MatchState): {
  teamAPoints: number;
  teamBPoints: number;
} {
  if (matchState.holesRemaining > 0 && !matchState.isClosedOut) {
    return { teamAPoints: 0, teamBPoints: 0 };
  }

  if (matchState.currentScore === 0) {
    return { teamAPoints: 0.5, teamBPoints: 0.5 };
  }

  if (matchState.currentScore > 0) {
    return { teamAPoints: 1, teamBPoints: 0 };
  }

  return { teamAPoints: 0, teamBPoints: 1 };
}
