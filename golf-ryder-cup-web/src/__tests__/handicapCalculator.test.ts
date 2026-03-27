/**
 * Handicap Calculator Tests
 *
 * Comprehensive tests for the handicap calculator service.
 * Tests cover: course handicap calculation, strokes allocation, net score,
 * Stableford points, match play strokes, team formats, and utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateCourseHandicap,
  allocateStrokes,
  getStrokesOnHole,
  calculateNetScore,
  calculateStablefordPoints,
  calculateSinglesStrokes,
  calculateGreensomesHandicap,
  validateHoleHandicaps,
  formatHandicapIndex,
  isOneBallFormat,
  isIndividualBallFormat,
} from '@/lib/services/handicapCalculator';

// ============================================
// TEST HELPERS
// ============================================

/**
 * Create a valid hole handicaps array (1 = hardest through 18 = easiest).
 * Index 0 is hole 1 (hardest), index 17 is hole 18 (easiest).
 */
function createHoleHandicaps(): number[] {
  return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
}

// ============================================
// COURSE HANDICAP CALCULATION
// ============================================

describe('calculateCourseHandicap', () => {
  it('calculates correctly for a normal positive handicap', () => {
    // 10.4 * (125/113) + (72.5 - 72) = 10.4 * 1.10619 + 0.5 ≈ 12.0
    const result = calculateCourseHandicap(10.4, 125, 72.5, 72);
    expect(result).toBe(12);
  });

  it('calculates correctly for a negative (plus) handicap', () => {
    // -2.0 * (120/113) + (71.0 - 72) = -2.0 * 1.06195 + (-1) ≈ -3.12 → -3
    const result = calculateCourseHandicap(-2.0, 120, 71.0, 72);
    expect(result).toBe(-3);
  });

  it('returns 0 for a zero handicap index with equal rating and par', () => {
    const result = calculateCourseHandicap(0, 113, 72, 72);
    expect(result).toBe(0);
  });

  it('defaults to standard slope of 113 when slope is zero', () => {
    // 10.0 * (113/113) + (72 - 72) = 10
    const result = calculateCourseHandicap(10.0, 0, 72, 72);
    expect(result).toBe(10);
  });

  it('defaults to standard slope of 113 when slope is negative', () => {
    const result = calculateCourseHandicap(10.0, -5, 72, 72);
    expect(result).toBe(10);
  });

  it('defaults to standard slope of 113 when slope is NaN', () => {
    const result = calculateCourseHandicap(10.0, NaN, 72, 72);
    expect(result).toBe(10);
  });

  it('defaults to standard slope of 113 when slope is Infinity', () => {
    const result = calculateCourseHandicap(10.0, Infinity, 72, 72);
    expect(result).toBe(10);
  });
});

// ============================================
// STROKES ALLOCATION
// ============================================

describe('allocateStrokes', () => {
  const holeHandicaps = createHoleHandicaps();

  it('allocates strokes to hardest holes for a positive handicap < 18', () => {
    const strokes = allocateStrokes(10, holeHandicaps);
    expect(strokes).toHaveLength(18);
    // Holes 1-10 (hardest) should each get 1 stroke
    for (let i = 0; i < 10; i++) {
      expect(strokes[i]).toBe(1);
    }
    // Holes 11-18 should get 0
    for (let i = 10; i < 18; i++) {
      expect(strokes[i]).toBe(0);
    }
  });

  it('allocates exactly 1 stroke per hole for handicap of 18', () => {
    const strokes = allocateStrokes(18, holeHandicaps);
    expect(strokes).toHaveLength(18);
    strokes.forEach((s) => expect(s).toBe(1));
  });

  it('allocates extra strokes to hardest holes for handicap > 18', () => {
    const strokes = allocateStrokes(22, holeHandicaps);
    expect(strokes).toHaveLength(18);
    // base = floor(22/18) = 1, extra = 22 % 18 = 4
    // Holes 1-4 get 2, holes 5-18 get 1
    for (let i = 0; i < 4; i++) {
      expect(strokes[i]).toBe(2);
    }
    for (let i = 4; i < 18; i++) {
      expect(strokes[i]).toBe(1);
    }
  });

  it('returns all zeros for handicap of 0', () => {
    const strokes = allocateStrokes(0, holeHandicaps);
    expect(strokes).toHaveLength(18);
    strokes.forEach((s) => expect(s).toBe(0));
  });

  it('allocates negative strokes for a negative handicap', () => {
    const strokes = allocateStrokes(-5, holeHandicaps);
    expect(strokes).toHaveLength(18);
    // 5 hardest holes get -1, rest get 0
    for (let i = 0; i < 5; i++) {
      expect(strokes[i]).toBe(-1);
    }
    for (let i = 5; i < 18; i++) {
      expect(strokes[i]).toBe(0);
    }
  });

  it('returns all zeros for an invalid hole handicaps array', () => {
    const strokes = allocateStrokes(10, [1, 2, 3]);
    expect(strokes).toHaveLength(18);
    strokes.forEach((s) => expect(s).toBe(0));
  });

  it('returns all zeros for an empty hole handicaps array', () => {
    const strokes = allocateStrokes(10, []);
    expect(strokes).toHaveLength(18);
    strokes.forEach((s) => expect(s).toBe(0));
  });
});

// ============================================
// GET STROKES ON HOLE
// ============================================

describe('getStrokesOnHole', () => {
  const holeHandicaps = createHoleHandicaps();

  it('returns strokes for a valid hole number', () => {
    // Handicap 5: holes 1-5 get 1 stroke each
    expect(getStrokesOnHole(1, 5, holeHandicaps)).toBe(1);
    expect(getStrokesOnHole(5, 5, holeHandicaps)).toBe(1);
    expect(getStrokesOnHole(6, 5, holeHandicaps)).toBe(0);
  });

  it('returns 0 for hole number 0 (invalid)', () => {
    expect(getStrokesOnHole(0, 10, holeHandicaps)).toBe(0);
  });

  it('returns 0 for hole number 19 (invalid)', () => {
    expect(getStrokesOnHole(19, 10, holeHandicaps)).toBe(0);
  });
});

// ============================================
// NET SCORE CALCULATION
// ============================================

describe('calculateNetScore', () => {
  it('subtracts strokes received from gross score', () => {
    expect(calculateNetScore(5, 1)).toBe(4);
  });

  it('returns gross score when no strokes received', () => {
    expect(calculateNetScore(4, 0)).toBe(4);
  });

  it('handles negative strokes (plus handicap)', () => {
    expect(calculateNetScore(4, -1)).toBe(5);
  });
});

// ============================================
// STABLEFORD POINTS
// ============================================

describe('calculateStablefordPoints', () => {
  it('returns 5 points for an albatross (net 3 under par)', () => {
    expect(calculateStablefordPoints(1, 4)).toBe(5);
  });

  it('returns 5 points for better than albatross (net 4 under par)', () => {
    expect(calculateStablefordPoints(1, 5)).toBe(5);
  });

  it('returns 4 points for an eagle (net 2 under par)', () => {
    expect(calculateStablefordPoints(2, 4)).toBe(4);
  });

  it('returns 3 points for a birdie (net 1 under par)', () => {
    expect(calculateStablefordPoints(3, 4)).toBe(3);
  });

  it('returns 2 points for par', () => {
    expect(calculateStablefordPoints(4, 4)).toBe(2);
  });

  it('returns 1 point for a bogey (net 1 over par)', () => {
    expect(calculateStablefordPoints(5, 4)).toBe(1);
  });

  it('returns 0 points for a double bogey (net 2 over par)', () => {
    expect(calculateStablefordPoints(6, 4)).toBe(0);
  });

  it('returns 0 points for worse than double bogey', () => {
    expect(calculateStablefordPoints(8, 4)).toBe(0);
  });
});

// ============================================
// SINGLES STROKES
// ============================================

describe('calculateSinglesStrokes', () => {
  it('gives strokes to the higher handicap player (A higher)', () => {
    const result = calculateSinglesStrokes(15, 10);
    expect(result).toEqual({ playerAStrokes: 5, playerBStrokes: 0 });
  });

  it('gives strokes to the higher handicap player (B higher)', () => {
    const result = calculateSinglesStrokes(10, 15);
    expect(result).toEqual({ playerAStrokes: 0, playerBStrokes: 5 });
  });

  it('gives zero strokes when handicaps are equal', () => {
    const result = calculateSinglesStrokes(10, 10);
    expect(result).toEqual({ playerAStrokes: 0, playerBStrokes: 0 });
  });

  it('applies allowance percentage correctly', () => {
    // Difference is 10, 90% allowance = round(10 * 0.9) = 9
    const result = calculateSinglesStrokes(20, 10, 0.9);
    expect(result).toEqual({ playerAStrokes: 9, playerBStrokes: 0 });
  });
});

// ============================================
// GREENSOMES HANDICAP
// ============================================

describe('calculateGreensomesHandicap', () => {
  it('calculates 60% low + 40% high correctly', () => {
    // low=10, high=20 → round(10*0.6 + 20*0.4) = round(6+8) = 14
    const result = calculateGreensomesHandicap([10, 20]);
    expect(result).toBe(14);
  });

  it('handles equal handicaps', () => {
    // round(10*0.6 + 10*0.4) = round(10) = 10
    const result = calculateGreensomesHandicap([10, 10]);
    expect(result).toBe(10);
  });

  it('returns 0 for invalid input (wrong number of players)', () => {
    expect(calculateGreensomesHandicap([10])).toBe(0);
    expect(calculateGreensomesHandicap([10, 20, 30])).toBe(0);
  });

  it('returns 0 for empty input', () => {
    expect(calculateGreensomesHandicap([])).toBe(0);
  });
});

// ============================================
// VALIDATE HOLE HANDICAPS
// ============================================

describe('validateHoleHandicaps', () => {
  it('validates a correct hole handicaps array', () => {
    const result = validateHoleHandicaps(createHoleHandicaps());
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('validates a shuffled but valid hole handicaps array', () => {
    const shuffled = [7, 11, 3, 13, 9, 1, 15, 5, 17, 8, 16, 10, 4, 12, 6, 18, 2, 14];
    const result = validateHoleHandicaps(shuffled);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails for wrong length', () => {
    const result = validateHoleHandicaps([1, 2, 3]);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('Expected 18');
  });

  it('fails for duplicate values', () => {
    const duped = [1, 1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
    const result = validateHoleHandicaps(duped);
    expect(result.isValid).toBe(false);
    expect(result.errors.some((e) => e.includes('Duplicate'))).toBe(true);
  });
});

// ============================================
// FORMAT HANDICAP INDEX
// ============================================

describe('formatHandicapIndex', () => {
  it('formats a positive handicap index', () => {
    expect(formatHandicapIndex(10.4)).toBe('10.4');
  });

  it('formats zero handicap index', () => {
    expect(formatHandicapIndex(0)).toBe('0.0');
  });

  it('formats a negative (plus) handicap with + prefix', () => {
    expect(formatHandicapIndex(-2.1)).toBe('+2.1');
  });
});

// ============================================
// FORMAT TYPE CHECKS
// ============================================

describe('isOneBallFormat', () => {
  it('returns true for foursomes', () => {
    expect(isOneBallFormat('foursomes')).toBe(true);
  });

  it('returns true for scramble', () => {
    expect(isOneBallFormat('scramble')).toBe(true);
  });

  it('returns true for greensomes', () => {
    expect(isOneBallFormat('greensomes')).toBe(true);
  });

  it('returns false for singles', () => {
    expect(isOneBallFormat('singles')).toBe(false);
  });

  it('returns false for fourball', () => {
    expect(isOneBallFormat('fourball')).toBe(false);
  });
});

describe('isIndividualBallFormat', () => {
  it('returns true for singles', () => {
    expect(isIndividualBallFormat('singles')).toBe(true);
  });

  it('returns true for fourball', () => {
    expect(isIndividualBallFormat('fourball')).toBe(true);
  });

  it('returns true for stableford', () => {
    expect(isIndividualBallFormat('stableford')).toBe(true);
  });

  it('returns false for foursomes', () => {
    expect(isIndividualBallFormat('foursomes')).toBe(false);
  });

  it('returns false for scramble', () => {
    expect(isIndividualBallFormat('scramble')).toBe(false);
  });
});
