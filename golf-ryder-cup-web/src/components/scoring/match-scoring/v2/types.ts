/**
 * Shared types for the v2 scoring cockpit (Phase 1+).
 *
 * The v2 surface deliberately sheds the dashboard chrome of the original
 * scoring page in favor of a single sacred surface that does one thing:
 * score a hole. Secondary surfaces (standings, bets, trip moments) live
 * in a peek-style bottom drawer.
 */

import type { MatchState } from '@/lib/types/computed';
import type { HoleResult, HoleWinner, Player, PlayerHoleScore, SideBet } from '@/lib/types/models';
import type { SideBet as ReminderSideBet } from '@/components/live-play/SideBetReminder';
import type { Press } from '@/components/scoring';
import type { ScoringMode, ScoringModeMeta } from '../matchScoringShared';

export type SessionLeaderboardRow = {
  matchId: string;
  matchOrder: number;
  displayScore: string;
  currentScore: number;
  holesPlayed: number;
  holesRemaining: number;
  status: MatchState['status'];
  teamALineup: string;
  teamBLineup: string;
};

export interface CockpitTeams {
  teamAName: string;
  teamBName: string;
  teamAColor: string;
  teamBColor: string;
  teamALineup: string;
  teamBLineup: string;
  teamAHandicapAllowance: number;
  teamBHandicapAllowance: number;
  holeHandicaps: number[];
  teamAFourballPlayers: Array<{
    id: string;
    name: string;
    courseHandicap: number;
    strokeAllowance: number;
  }>;
  teamBFourballPlayers: Array<{
    id: string;
    name: string;
    courseHandicap: number;
    strokeAllowance: number;
  }>;
  teamAPlayers: Player[];
  teamBPlayers: Player[];
}

export interface CockpitScoring {
  matchState: MatchState;
  currentHole: number;
  currentHoleResult?: HoleResult;
  currentPar: number;
  currentStrokeIndex: number;
  currentYardage?: number;
  scoringMode: ScoringMode;
  scoringModeMeta: ScoringModeMeta;
  isFourball: boolean;
  isMatchComplete: boolean;
  isEditingScores: boolean;
  isSaving: boolean;
  undoCount: number;
  presses: Press[];
  sessionLeaderboard: SessionLeaderboardRow[];
}

export interface CockpitPreferences {
  preferredHand: 'left' | 'right';
  prefersReducedMotion: boolean;
}

export interface CockpitSideBets {
  activeSideBets: ReminderSideBet[];
  activeMatchSideBets: SideBet[];
  currentTripId?: string;
  currentPlayerIdForBets?: string;
}

export interface CockpitHandlers {
  onPrevHole: () => void;
  onNextHole: () => void;
  onScore: (winner: HoleWinner) => void;
  onScoreWithStrokes: (
    winner: HoleWinner,
    teamAStrokeScore: number,
    teamBStrokeScore: number
  ) => void;
  onFourballScore: (
    winner: HoleWinner,
    teamABestScore: number,
    teamBBestScore: number,
    teamAPlayerScores: PlayerHoleScore[],
    teamBPlayerScores: PlayerHoleScore[]
  ) => void;
  onUndo: () => void;
  onPress: (pressedBy: 'teamA' | 'teamB') => void;
  onScoringModeChange: (mode: ScoringMode) => void;
  onFinishEditing: () => void;
  onJumpToHole: (hole: number) => void;
}
