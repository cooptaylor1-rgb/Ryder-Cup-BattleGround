/**
 * Extended Scoring Formats
 *
 * Types for additional match formats beyond standard match play:
 * - Stableford (point-based scoring)
 * - Skins (hole-by-hole competition)
 * - Nassau (three-bet format)
 * - Scramble (team best ball)
 */

import type { UUID, ISODateString } from './models';

// ============================================
// SCORING MODE
// ============================================

export type ScoringMode = 'gross' | 'net';

/**
 * Extended session format type
 * Combines match play formats with additional game types
 */
export type ExtendedFormatType =
  | 'foursomes'      // Alternate shot
  | 'fourball'       // Best ball match play
  | 'singles'        // 1v1 match play
  | 'stableford'     // Point-based scoring
  | 'skins'          // Hole-by-hole prize
  | 'nassau'         // Front/back/overall
  | 'scramble'       // Team best ball
  | 'strokePlay';    // Traditional stroke play

// ============================================
// STABLEFORD SCORING
// ============================================

/**
 * Stableford points system
 * Standard USGA Stableford point values
 */
export const STABLEFORD_POINTS = {
  doubleEagle: 8,   // 3 under par (albatross)
  eagle: 5,        // 2 under par
  birdie: 4,       // 1 under par
  par: 2,          // Even par
  bogey: 1,        // 1 over par
  doubleBogey: 0,  // 2+ over par
} as const;

/**
 * Modified Stableford (like PGA Tour Champions)
 * More aggressive point distribution
 */
export const MODIFIED_STABLEFORD_POINTS = {
  doubleEagle: 10,
  eagle: 8,
  birdie: 3,
  par: 0,
  bogey: -1,
  doubleBogey: -3,
  worse: -5,
} as const;

export interface StablefordHoleScore {
  holeNumber: number;
  par: number;
  grossScore: number;
  netScore: number;
  strokesReceived: number;
  stablefordPoints: number;
}

export interface StablefordRoundScore {
  playerId: UUID;
  playerName: string;
  holeScores: StablefordHoleScore[];
  totalGross: number;
  totalNet: number;
  totalPoints: number;
  frontNinePoints: number;
  backNinePoints: number;
}

// ============================================
// SKINS GAME
// ============================================

export interface SkinResult {
  holeNumber: number;
  winnerId: UUID | null;  // null if carried over
  winnerName: string | null;
  skinValue: number;
  isCarryover: boolean;
  grossScore?: number;
  netScore?: number;
}

export interface SkinsGameConfig {
  id: UUID;
  buyIn: number;
  scoringMode: ScoringMode;
  carryOver: boolean;        // Carryover on ties
  doublesOnCarry: boolean;   // Double value after carry
  validationRequired: boolean;
}

export interface SkinsStandings {
  gameId: UUID;
  pot: number;
  skinsRemaining: number;
  carryoverValue: number;
  results: SkinResult[];
  standings: {
    playerId: UUID;
    playerName: string;
    skinsWon: number;
    value: number;
  }[];
}

// ============================================
// NASSAU FORMAT
// ============================================

export type NassauBetType = 'front' | 'back' | 'overall';

export interface NassauConfig {
  id: UUID;
  frontNineValue: number;
  backNineValue: number;
  overallValue: number;
  scoringMode: ScoringMode;
  autoPressAt: number;      // Auto-press when down by N holes
  maxPresses: number;       // Maximum number of presses
  pressValue?: number;      // Value of each press (defaults to bet value)
}

export interface NassauPress {
  id: UUID;
  betType: NassauBetType;
  startHole: number;
  pressedBy: 'teamA' | 'teamB';
  status: 'active' | 'closed';
  score: number;
  value: number;
}

export interface NassauBetStatus {
  betType: NassauBetType;
  score: number;  // Positive = Team A leading
  holesPlayed: number;
  holesRemaining: number;
  presses: NassauPress[];
  status: 'in_progress' | 'teamA_wins' | 'teamB_wins' | 'halved';
}

export interface NassauMatch {
  config: NassauConfig;
  frontNine: NassauBetStatus;
  backNine: NassauBetStatus;
  overall: NassauBetStatus;
  totalPresses: number;
  teamAPotential: number;
  teamBPotential: number;
}

// ============================================
// SCRAMBLE FORMAT
// ============================================

export interface ScrambleTeam {
  id: UUID;
  name: string;
  playerIds: UUID[];
  combinedHandicap: number;
  scrambleHandicap: number;  // Usually percentage of combined
}

export interface ScrambleHoleResult {
  holeNumber: number;
  par: number;
  grossScore: number;
  netScore: number;
  strokesReceived: number;
  selectedShotBy?: UUID;  // Which player's shot was used
  relativeToPar: number;
}

export interface ScrambleTeamScore {
  teamId: UUID;
  teamName: string;
  players: string[];
  holeResults: ScrambleHoleResult[];
  totalGross: number;
  totalNet: number;
  relativeToPar: number;
  thruHole: number;
}

// ============================================
// GROSS/NET SCORE DISPLAY
// ============================================

export interface HoleScoreData {
  holeNumber: number;
  par: number;
  handicapRank: number;
  grossScore: number | null;
  netScore: number | null;
  strokesReceived: number;
  relativeToPar: number | null;
  scoreClass: 'albatross' | 'eagle' | 'birdie' | 'par' | 'bogey' | 'double' | 'triple' | 'worse' | null;
}

export interface PlayerScorecard {
  playerId: UUID;
  playerName: string;
  courseHandicap: number;
  holes: HoleScoreData[];
  frontNine: {
    gross: number;
    net: number;
    par: number;
  };
  backNine: {
    gross: number;
    net: number;
    par: number;
  };
  total: {
    gross: number;
    net: number;
    par: number;
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate Stableford points for a hole
 */
export function calculateStablefordPoints(
  netScore: number,
  par: number,
  useModified: boolean = false
): number {
  const diff = netScore - par;
  const points = useModified ? MODIFIED_STABLEFORD_POINTS : STABLEFORD_POINTS;

  if (diff <= -3) return points.doubleEagle;
  if (diff === -2) return points.eagle;
  if (diff === -1) return points.birdie;
  if (diff === 0) return points.par;
  if (diff === 1) return points.bogey;
  if (useModified) {
    const modifiedPoints = points as typeof MODIFIED_STABLEFORD_POINTS;
    if (diff === 2) return modifiedPoints.doubleBogey;
    if (diff > 2) return modifiedPoints.worse;
  }
  return points.doubleBogey;
}

/**
 * Determine score class for styling
 */
export function getScoreClass(
  score: number | null,
  par: number
): HoleScoreData['scoreClass'] {
  if (score === null) return null;
  const diff = score - par;

  if (diff <= -3) return 'albatross';
  if (diff === -2) return 'eagle';
  if (diff === -1) return 'birdie';
  if (diff === 0) return 'par';
  if (diff === 1) return 'bogey';
  if (diff === 2) return 'double';
  if (diff === 3) return 'triple';
  return 'worse';
}

/**
 * Format gross/net score display
 */
export function formatGrossNetScore(
  gross: number | null,
  net: number | null,
  showBoth: boolean = true
): string {
  if (gross === null) return '-';
  if (!showBoth || net === null || gross === net) return gross.toString();
  return `${gross} (${net})`;
}

/**
 * Calculate scramble team handicap
 * Standard: 35% of combined team handicap
 */
export function calculateScrambleHandicap(
  playerHandicaps: number[],
  percentage: number = 0.35
): number {
  const combined = playerHandicaps.reduce((sum, h) => sum + h, 0);
  return Math.round(combined * percentage);
}

/**
 * Calculate Nassau bet status
 */
export function calculateNassauStatus(
  holeResults: { winner: 'teamA' | 'teamB' | 'halved' }[],
  betType: NassauBetType
): { score: number; holesPlayed: number } {
  const startHole = betType === 'back' ? 10 : 1;
  const endHole = betType === 'front' ? 9 : 18;

  const relevantHoles = holeResults.filter((_, idx) => {
    const holeNum = idx + 1;
    return holeNum >= startHole && holeNum <= endHole;
  });

  let score = 0;
  for (const hole of relevantHoles) {
    if (hole.winner === 'teamA') score++;
    else if (hole.winner === 'teamB') score--;
  }

  return { score, holesPlayed: relevantHoles.length };
}
