export interface ScorecardData {
  tripName: string;
  courseName: string;
  date: string;
  format: string;
  player1: PlayerScoreData;
  player2: PlayerScoreData;
  result: string;
}

export interface PlayerScoreData {
  name: string;
  team: 'USA' | 'Europe';
  handicap?: number;
  scores: (number | null)[];
  frontNine: number;
  backNine: number;
  total: number;
}

export interface StandingsData {
  tripName: string;
  date: string;
  usaScore: number;
  europeScore: number;
  matches: MatchStandingData[];
  pointsToWin: number;
}

export interface MatchStandingData {
  player1: string;
  player2: string;
  team1: 'USA' | 'Europe';
  team2: 'USA' | 'Europe';
  status: 'complete' | 'in-progress' | 'upcoming';
  result?: string;
  currentHole?: number;
}

export interface PlayerStatsData {
  playerName: string;
  tripName: string;
  team: 'USA' | 'Europe';
  stats: {
    matchesPlayed: number;
    matchesWon: number;
    matchesLost: number;
    matchesTied: number;
    pointsEarned: number;
    averageScore: number;
    bestScore: number;
    worstScore: number;
    birdies: number;
    pars: number;
    bogeys: number;
  };
}

export interface UsePDFExportReturn {
  exportScorecard: (data: ScorecardData) => void;
  exportStandings: (data: StandingsData) => void;
  exportPlayerStats: (data: PlayerStatsData) => void;
}
