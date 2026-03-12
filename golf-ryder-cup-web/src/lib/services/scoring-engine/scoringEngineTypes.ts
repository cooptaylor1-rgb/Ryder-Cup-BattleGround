import type { HoleResult, MatchStatus } from '@/lib/types/models';

export interface MatchStateSnapshot {
  holeResults: HoleResult[];
  currentScore: number;
  teamAHolesWon: number;
  teamBHolesWon: number;
  holesPlayed: number;
  holesRemaining: number;
  isDormie: boolean;
  isClosedOut: boolean;
  status: MatchStatus;
  displayScore: string;
  winningTeam: 'teamA' | 'teamB' | 'halved' | null;
}
