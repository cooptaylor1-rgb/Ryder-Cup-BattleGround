export interface BatchMatch {
  id: string;
  matchNumber: number;
  teamAPlayers: string[];
  teamBPlayers: string[];
  teamAColor: string;
  teamBColor: string;
}

export interface BatchScoreEntry {
  matchId: string;
  hole: number;
  teamAScore: number | null;
  teamBScore: number | null;
  isDirty: boolean;
  hasError: boolean;
  errorMessage?: string;
}

export type BatchCellTeam = 'A' | 'B';

export interface BatchCellLocation {
  matchId: string;
  hole: number;
  team: BatchCellTeam;
}

export interface BatchHoleScore {
  teamA: number | null;
  teamB: number | null;
}

export type BatchMatchScores = Record<number, BatchHoleScore>;
export type BatchScores = Record<string, BatchMatchScores>;

export interface BatchScoreGridProps {
  matches: BatchMatch[];
  existingScores?: Record<string, Record<number, BatchHoleScore>>;
  totalHoles?: number;
  frontNineOnly?: boolean;
  backNineOnly?: boolean;
  onSave: (scores: BatchScoreEntry[]) => Promise<void>;
  onAutoSave?: (scores: BatchScoreEntry[]) => void;
  className?: string;
}
