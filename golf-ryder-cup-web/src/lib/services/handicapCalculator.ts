/**
 * Handicap Calculator Service
 *
 * Implements USGA handicap calculation rules:
 * - Course handicap from index, slope, rating, and par
 * - Strokes allocation per hole based on hole handicaps
 * - Net score calculations
 * - Stableford point calculations
 *
 * Ported from Swift: HandicapCalculator.swift
 */

import { createLogger } from '../utils/logger';

const logger = createLogger('Handicap');

// ============================================
// COURSE HANDICAP CALCULATION
// ============================================

/**
 * Calculate course handicap from handicap index, slope rating, course rating, and par.
 *
 * Formula: CourseHandicap = round(HandicapIndex * (Slope / 113) + (CourseRating - Par))
 *
 * Note: Uses standard rounding (round half away from zero), which rounds 0.5 up.
 * This aligns with USGA's recommended rounding method for course handicap calculations.
 *
 * @param handicapIndex - Player's USGA Handicap Index (can be negative for plus-handicap)
 * @param slopeRating - Course slope rating (typically 55-155, standard is 113)
 * @param courseRating - Course rating (typically close to par)
 * @param par - Course par (typically 70-72)
 * @returns Course handicap (rounded to nearest integer)
 *
 * @example
 * calculateCourseHandicap(10.4, 125, 72.5, 72) // Returns 11
 */
export function calculateCourseHandicap(
  handicapIndex: number,
  slopeRating: number,
  courseRating: number,
  par: number
): number {
  const STANDARD_SLOPE = 113;

  // BUG-002 FIX: Validate slope rating to prevent division by zero / NaN
  // If slope is invalid, use USGA standard slope of 113
  const validSlopeRating =
    !Number.isFinite(slopeRating) || slopeRating <= 0 ? STANDARD_SLOPE : slopeRating;

  const slopeFactor = validSlopeRating / STANDARD_SLOPE;
  const ratingAdjustment = courseRating - par;
  const courseHandicap = handicapIndex * slopeFactor + ratingAdjustment;
  return Math.round(courseHandicap);
}

// ============================================
// STROKES ALLOCATION
// ============================================

/**
 * Allocate strokes per hole based on course handicap and hole handicap ranking.
 *
 * The algorithm:
 * 1. For positive handicaps: Distribute strokes starting from hardest holes (lowest handicap rank)
 * 2. For negative handicaps (plus-handicap): Subtract strokes starting from hardest holes
 * 3. For handicaps > 18: Each hole gets at least 1 stroke, extras go to hardest holes
 *
 * @param courseHandicap - Calculated course handicap
 * @param holeHandicaps - Array of 18 hole handicaps (1 = hardest, 18 = easiest)
 * @returns Array of strokes received on each hole (index 0 = hole 1)
 *
 * @example
 * const holeHandicaps = [7, 11, 3, 13, 9, 1, 15, 5, 17, 8, 16, 10, 4, 12, 6, 18, 2, 14];
 * allocateStrokes(10, holeHandicaps)
 * // Returns strokes for each hole, with strokes on the 10 hardest holes
 */
export function allocateStrokes(courseHandicap: number, holeHandicaps: number[]): number[] {
  // BUG-008 FIX: Better validation with explicit error handling
  // Instead of silently returning zeros, log error with context
  if (!holeHandicaps || holeHandicaps.length !== 18) {
    const actualLength = holeHandicaps?.length ?? 0;
    logger.error(
      `Invalid hole handicaps array: expected 18 holes, got ${actualLength}. ` +
        'This may indicate corrupt course data. Falling back to zero strokes.'
    );
    return Array(18).fill(0);
  }

  // Validate that hole handicaps are valid numbers (1-18)
  const invalidHoles = holeHandicaps.filter((h, _i) => !Number.isFinite(h) || h < 1 || h > 18);
  if (invalidHoles.length > 0) {
    logger.warn(
      `Invalid hole handicap values detected: ${JSON.stringify(invalidHoles)}. ` +
        'Some strokes may be incorrectly allocated.'
    );
  }

  const strokes = Array(18).fill(0);

  if (courseHandicap === 0) {
    return strokes;
  }

  // Create sorted indices by hole handicap (hardest holes first = lowest numbers)
  const sortedIndices = holeHandicaps
    .map((hcp, index) => ({ hcp, index }))
    .sort((a, b) => a.hcp - b.hcp)
    .map((item) => item.index);

  if (courseHandicap > 0) {
    // Positive handicap: receive strokes
    const baseStrokes = Math.floor(courseHandicap / 18);
    const extraStrokes = courseHandicap % 18;

    // Everyone gets base strokes on all holes
    strokes.fill(baseStrokes);

    // Allocate extra strokes to hardest holes (lowest handicap numbers)
    for (let i = 0; i < extraStrokes; i++) {
      strokes[sortedIndices[i]] += 1;
    }
  } else {
    // Negative handicap (plus-handicap): give strokes back
    const absHandicap = Math.abs(courseHandicap);
    const baseStrokes = Math.floor(absHandicap / 18);
    const extraStrokes = absHandicap % 18;

    // Start with negative base strokes
    strokes.fill(-baseStrokes);

    // Subtract extra strokes from hardest holes (lowest handicap numbers)
    for (let i = 0; i < extraStrokes; i++) {
      strokes[sortedIndices[i]] -= 1;
    }
  }

  return strokes;
}

/**
 * Get strokes received on a specific hole.
 *
 * @param holeNumber - Hole number (1-18)
 * @param courseHandicap - Player's course handicap
 * @param holeHandicaps - Array of 18 hole handicaps
 * @returns Number of strokes received on that hole
 */
export function getStrokesOnHole(
  holeNumber: number,
  courseHandicap: number,
  holeHandicaps: number[]
): number {
  if (holeNumber < 1 || holeNumber > 18) {
    return 0;
  }
  const allocation = allocateStrokes(courseHandicap, holeHandicaps);
  return allocation[holeNumber - 1];
}

/**
 * Calculate match play net strokes for a specific hole.
 *
 * In match play, strokes are based on the DIFFERENTIAL between handicaps.
 * Only the higher handicap team/player receives strokes (the difference).
 *
 * @param holeNumber - Hole number (1-18)
 * @param teamAHandicap - Team A total handicap strokes for the round
 * @param teamBHandicap - Team B total handicap strokes for the round
 * @param holeHandicaps - Array of 18 hole handicaps
 * @returns Net strokes for each team on this hole (one will always be 0)
 */
export function getMatchPlayStrokesOnHole(
  holeNumber: number,
  teamAHandicap: number,
  teamBHandicap: number,
  holeHandicaps: number[]
): { teamAStrokes: number; teamBStrokes: number } {
  if (holeNumber < 1 || holeNumber > 18) {
    return { teamAStrokes: 0, teamBStrokes: 0 };
  }

  // Calculate the differential - only the higher handicap team gets strokes
  const handicapDiff = teamAHandicap - teamBHandicap;

  if (handicapDiff === 0) {
    // Equal handicaps - no strokes given
    return { teamAStrokes: 0, teamBStrokes: 0 };
  }

  // The higher handicap team gets the differential strokes allocated
  const strokesForHigherHandicap = Math.abs(handicapDiff);
  const allocation = allocateStrokes(strokesForHigherHandicap, holeHandicaps);
  const strokesOnHole = allocation[holeNumber - 1];

  if (handicapDiff > 0) {
    // Team A has higher handicap, gets strokes
    return { teamAStrokes: strokesOnHole, teamBStrokes: 0 };
  } else {
    // Team B has higher handicap, gets strokes
    return { teamAStrokes: 0, teamBStrokes: strokesOnHole };
  }
}

// ============================================
// NET SCORE CALCULATION
// ============================================

/**
 * Calculate net score for a hole.
 *
 * @param grossScore - Actual strokes taken
 * @param strokesReceived - Number of strokes received on this hole
 * @returns Net score
 */
export function calculateNetScore(grossScore: number, strokesReceived: number): number {
  return grossScore - strokesReceived;
}

/**
 * Calculate net total for a round.
 *
 * @param grossScores - Array of 18 gross scores
 * @param strokesPerHole - Array of 18 strokes received
 * @returns Total net score
 */
export function calculateNetTotal(grossScores: number[], strokesPerHole: number[]): number {
  if (grossScores.length !== 18 || strokesPerHole.length !== 18) {
    return 0;
  }
  return grossScores.reduce((total, gross, index) => {
    return total + (gross - strokesPerHole[index]);
  }, 0);
}

// ============================================
// STABLEFORD POINTS
// ============================================

/**
 * Calculate Stableford points for a hole.
 *
 * Points are based on net score relative to par:
 * - Albatross (3 under): 5 points
 * - Eagle (2 under): 4 points
 * - Birdie (1 under): 3 points
 * - Par: 2 points
 * - Bogey (1 over): 1 point
 * - Double bogey or worse: 0 points
 *
 * @param netScore - Net score for the hole
 * @param par - Par for the hole
 * @returns Stableford points (0-5)
 */
export function calculateStablefordPoints(netScore: number, par: number): number {
  const relativeToPar = netScore - par;

  if (relativeToPar <= -3) return 5; // Albatross or better
  if (relativeToPar === -2) return 4; // Eagle
  if (relativeToPar === -1) return 3; // Birdie
  if (relativeToPar === 0) return 2; // Par
  if (relativeToPar === 1) return 1; // Bogey
  return 0; // Double bogey or worse
}

/**
 * Calculate total Stableford points for a round.
 *
 * @param netScores - Array of 18 net scores
 * @param holePars - Array of 18 hole pars
 * @returns Total Stableford points
 */
export function calculateTotalStablefordPoints(netScores: number[], holePars: number[]): number {
  if (netScores.length !== 18 || holePars.length !== 18) {
    return 0;
  }
  return netScores.reduce((total, netScore, index) => {
    return total + calculateStablefordPoints(netScore, holePars[index]);
  }, 0);
}

// ============================================
// MATCH PLAY STROKES
// ============================================

/**
 * Calculate strokes given in a singles match.
 *
 * In singles match play, the player with the higher handicap receives
 * strokes equal to the difference in course handicaps (or a percentage thereof).
 *
 * @param playerACourseHandicap - Player A's course handicap
 * @param playerBCourseHandicap - Player B's course handicap
 * @param allowance - Percentage of handicap to use (default 100%)
 * @returns Strokes for each player (one will be 0)
 */
export function calculateSinglesStrokes(
  playerACourseHandicap: number,
  playerBCourseHandicap: number,
  allowance: number = 1.0
): { playerAStrokes: number; playerBStrokes: number } {
  const difference = playerACourseHandicap - playerBCourseHandicap;
  const adjustedDiff = Math.round(Math.abs(difference) * allowance);

  if (difference > 0) {
    // Player A has higher handicap, gets strokes
    return { playerAStrokes: adjustedDiff, playerBStrokes: 0 };
  } else if (difference < 0) {
    // Player B has higher handicap, gets strokes
    return { playerAStrokes: 0, playerBStrokes: adjustedDiff };
  }
  return { playerAStrokes: 0, playerBStrokes: 0 };
}

/**
 * Calculate strokes in fourball (best ball).
 *
 * Standard method: lowest handicap plays at scratch, others get percentage of difference.
 *
 * @param teamACourseHandicaps - Array of Team A player course handicaps
 * @param teamBCourseHandicaps - Array of Team B player course handicaps
 * @param allowance - Percentage of handicap difference to use (default 90%)
 * @returns Strokes for each player on each team
 */
export function calculateFourballStrokes(
  teamACourseHandicaps: number[],
  teamBCourseHandicaps: number[],
  allowance: number = 0.9
): { teamAStrokes: number[]; teamBStrokes: number[] } {
  const allHandicaps = [...teamACourseHandicaps, ...teamBCourseHandicaps];
  const lowest = Math.min(...allHandicaps);

  const teamAStrokes = teamACourseHandicaps.map((hcp) => Math.round((hcp - lowest) * allowance));

  const teamBStrokes = teamBCourseHandicaps.map((hcp) => Math.round((hcp - lowest) * allowance));

  return { teamAStrokes, teamBStrokes };
}

/**
 * Calculate strokes in foursomes (alternate shot).
 *
 * Standard method: 50% of combined team handicaps, difference given.
 *
 * @param teamACourseHandicaps - Array of Team A player course handicaps (2 players)
 * @param teamBCourseHandicaps - Array of Team B player course handicaps (2 players)
 * @param allowance - Percentage of combined handicap to use (default 50%)
 * @returns Strokes for each team (one will be 0 unless equal)
 */
export function calculateFoursomesStrokes(
  teamACourseHandicaps: number[],
  teamBCourseHandicaps: number[],
  allowance: number = 0.5
): { teamAStrokes: number; teamBStrokes: number } {
  const teamATotal = teamACourseHandicaps.reduce((a, b) => a + b, 0);
  const teamBTotal = teamBCourseHandicaps.reduce((a, b) => a + b, 0);

  const teamACombined = Math.round(teamATotal * allowance);
  const teamBCombined = Math.round(teamBTotal * allowance);

  const difference = teamACombined - teamBCombined;

  if (difference > 0) {
    return { teamAStrokes: Math.abs(difference), teamBStrokes: 0 };
  } else if (difference < 0) {
    return { teamAStrokes: 0, teamBStrokes: Math.abs(difference) };
  }
  return { teamAStrokes: 0, teamBStrokes: 0 };
}

// ============================================
// TEAM FORMAT HANDICAP CALCULATIONS
// ============================================

/**
 * Handicap allowance percentages for different team formats.
 * These apply to ONE-BALL formats where the team shares a single ball.
 */
export const TEAM_FORMAT_ALLOWANCES = {
  foursomes: 0.5, // 50% of combined
  greensomes: 0.5, // 60% low + 40% high, simplified to ~50%
  pinehurst: 0.5, // 60% low + 40% high, simplified to ~50%
  bloodsome: 0.5, // 50% of combined
  'modified-alternate': 0.5,
  scramble: 0.35, // Generic scramble
  'scramble-2': 0.35, // 2-person: 35%
  'scramble-3': 0.25, // 3-person: 25%
  'scramble-4': 0.2, // 4-person: 20%
  'texas-scramble': 0.2,
  'florida-scramble': 0.2,
} as const;

export type OneBallFormat = keyof typeof TEAM_FORMAT_ALLOWANCES;

/**
 * Calculate team strokes for one-ball formats (scramble, alt-shot, etc.).
 *
 * In these formats, only ONE ball is in play per team, so the team
 * receives a single handicap stroke allowance, NOT individual player strokes.
 *
 * @param teamACourseHandicaps - Array of Team A player course handicaps
 * @param teamBCourseHandicaps - Array of Team B player course handicaps
 * @param format - The one-ball format being played
 * @returns Team strokes (one will be 0 unless equal)
 */
export function calculateOneBallFormatStrokes(
  teamACourseHandicaps: number[],
  teamBCourseHandicaps: number[],
  format: OneBallFormat | string
): { teamAStrokes: number; teamBStrokes: number } {
  const allowance = TEAM_FORMAT_ALLOWANCES[format as OneBallFormat] ?? 0.5;

  const teamATotal = teamACourseHandicaps.reduce((a, b) => a + b, 0);
  const teamBTotal = teamBCourseHandicaps.reduce((a, b) => a + b, 0);

  const teamACombined = Math.round(teamATotal * allowance);
  const teamBCombined = Math.round(teamBTotal * allowance);

  const difference = teamACombined - teamBCombined;

  if (difference > 0) {
    return { teamAStrokes: Math.abs(difference), teamBStrokes: 0 };
  } else if (difference < 0) {
    return { teamAStrokes: 0, teamBStrokes: Math.abs(difference) };
  }
  return { teamAStrokes: 0, teamBStrokes: 0 };
}

/**
 * Calculate greensomes/pinehurst team handicap.
 *
 * Standard method: 60% of lower handicap + 40% of higher handicap.
 * This gives more weight to the better player.
 *
 * @param playerHandicaps - Array of 2 player handicaps
 * @returns Combined team handicap
 */
export function calculateGreensomesHandicap(playerHandicaps: number[]): number {
  // BUG-018 FIX: Add comprehensive validation for inputs
  if (!playerHandicaps || playerHandicaps.length !== 2) {
    // BUG-019 FIX: Use logger.error instead of warn for production
    // logger.warn can clutter production logs with expected conditions
    if (process.env.NODE_ENV === 'development') {
      logger.warn('Greensomes requires exactly 2 players, got:', playerHandicaps?.length ?? 0);
    }
    return 0;
  }

  // Validate that handicaps are valid numbers
  const validHandicaps = playerHandicaps.filter((h) => typeof h === 'number' && Number.isFinite(h));

  if (validHandicaps.length !== 2) {
    if (process.env.NODE_ENV === 'development') {
      logger.warn('Invalid handicap values in greensomes calculation');
    }
    return 0;
  }

  const [low, high] = validHandicaps.sort((a, b) => a - b);
  return Math.round(low * 0.6 + high * 0.4);
}

/**
 * Calculate scramble team handicap.
 *
 * Percentage varies by team size:
 * - 2-person: 35% of combined
 * - 3-person: 25% of combined
 * - 4-person: 20% of combined
 *
 * @param playerHandicaps - Array of player handicaps
 * @param customPercentage - Optional override percentage
 * @returns Team handicap
 */
export function calculateScrambleTeamHandicap(
  playerHandicaps: number[],
  customPercentage?: number
): number {
  const defaultPercentages: Record<number, number> = {
    2: 0.35,
    3: 0.25,
    4: 0.2,
  };

  const percentage = customPercentage ?? defaultPercentages[playerHandicaps.length] ?? 0.25;
  const combined = playerHandicaps.reduce((sum, h) => sum + h, 0);
  return Math.round(combined * percentage);
}

/**
 * Determine if a format uses one ball per team (team strokes)
 * vs multiple balls (individual strokes).
 *
 * @param format - The match format
 * @returns true if one ball in play per team
 */
export function isOneBallFormat(format: string): boolean {
  const oneBallFormats = [
    'foursomes',
    'greensomes',
    'pinehurst',
    'bloodsome',
    'modified-alternate',
    'scramble',
    'scramble-2',
    'scramble-3',
    'scramble-4',
    'texas-scramble',
    'florida-scramble',
  ];
  return oneBallFormats.includes(format);
}

/**
 * Determine if a format uses individual player strokes (multiple balls).
 *
 * @param format - The match format
 * @returns true if each player has their own ball
 */
export function isIndividualBallFormat(format: string): boolean {
  const individualFormats = [
    'singles',
    'fourball',
    'best-ball',
    'better-ball-3',
    'better-ball-4',
    'best-2-of-4',
    'shamble', // After the tee shot selection, each plays their own ball
    'stableford',
    'stroke-play',
    'net-stroke-play',
    'medal',
  ];
  return individualFormats.includes(format);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format a handicap index for display.
 *
 * @param handicapIndex - The handicap index
 * @returns Formatted string (e.g., "10.4" or "+2.1" for plus handicap)
 */
export function formatHandicapIndex(handicapIndex: number): string {
  if (handicapIndex < 0) {
    return `+${Math.abs(handicapIndex).toFixed(1)}`;
  }
  return handicapIndex.toFixed(1);
}

/**
 * Validate hole handicaps array.
 *
 * @param holeHandicaps - Array to validate
 * @returns Validation result
 */
export function validateHoleHandicaps(holeHandicaps: number[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (holeHandicaps.length !== 18) {
    errors.push(`Expected 18 hole handicaps, got ${holeHandicaps.length}`);
    return { isValid: false, errors };
  }

  const sorted = [...holeHandicaps].sort((a, b) => a - b);
  const expected = Array.from({ length: 18 }, (_, i) => i + 1);

  if (JSON.stringify(sorted) !== JSON.stringify(expected)) {
    errors.push('Hole handicaps must be unique values from 1-18');

    // Find duplicates
    const seen = new Set<number>();
    const duplicates = new Set<number>();
    for (const hcp of holeHandicaps) {
      if (seen.has(hcp)) {
        duplicates.add(hcp);
      }
      seen.add(hcp);
    }
    if (duplicates.size > 0) {
      errors.push(`Duplicate handicaps: ${Array.from(duplicates).join(', ')}`);
    }

    // Find out of range
    const outOfRange = holeHandicaps.filter((h) => h < 1 || h > 18);
    if (outOfRange.length > 0) {
      errors.push(`Out of range values: ${outOfRange.join(', ')}`);
    }

    // Find missing
    const presentSet = new Set(holeHandicaps);
    const missing = expected.filter((n) => !presentSet.has(n));
    if (missing.length > 0) {
      errors.push(`Missing handicaps: ${missing.join(', ')}`);
    }
  }

  return { isValid: errors.length === 0, errors };
}

// ============================================
// HANDICAP CALCULATOR OBJECT (for convenience)
// ============================================

/**
 * Handicap Calculator service object.
 * Groups all functions for easier importing.
 */
export const HandicapCalculator = {
  // Core calculations
  calculateCourseHandicap,
  allocateStrokes,
  getStrokesOnHole,
  getMatchPlayStrokesOnHole,
  calculateNetScore,
  calculateNetTotal,
  calculateStablefordPoints,
  calculateTotalStablefordPoints,

  // Match play strokes
  calculateSinglesStrokes,
  calculateFourballStrokes,
  calculateFoursomesStrokes,

  // Team format strokes (one-ball formats)
  calculateOneBallFormatStrokes,
  calculateGreensomesHandicap,
  calculateScrambleTeamHandicap,
  isOneBallFormat,
  isIndividualBallFormat,
  TEAM_FORMAT_ALLOWANCES,

  // Utilities
  formatHandicapIndex,
  validateHoleHandicaps,
};

export default HandicapCalculator;
