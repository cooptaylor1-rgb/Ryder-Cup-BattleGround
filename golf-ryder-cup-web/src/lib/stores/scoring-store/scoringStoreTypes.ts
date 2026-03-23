import type { Match, HoleResult, RyderCupSession } from '@/lib/types/models';
import type { MatchState } from '@/lib/types/computed';

export interface UndoEntry {
  matchId: string;
  holeNumber: number;
  previousResult: HoleResult | null;
}

export interface SessionMatchesLoadResult {
  sessionMatches: Match[];
  matchStates: Map<string, MatchState>;
}

export interface SelectedMatchLoadResult {
  activeMatch: Match;
  activeMatchState: MatchState;
  activeSession: RyderCupSession | null;
  currentHole: number;
  undoStack: UndoEntry[];
}
