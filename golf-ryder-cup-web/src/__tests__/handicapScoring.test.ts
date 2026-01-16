/**
 * Handicap & Scoring Math Tests
 *
 * Comprehensive tests for gross-to-net scoring calculations:
 * - Course handicap calculation (USGA formula)
 * - Stroke allocation per hole
 * - Net score calculation
 * - Stableford point calculations
 * - Format-specific handicap methods
 */

import { describe, it, expect } from 'vitest';
import {
    calculateCourseHandicap,
    allocateStrokes,
    getStrokesOnHole,
    calculateNetScore,
    calculateNetTotal,
    calculateStablefordPoints,
    calculateTotalStablefordPoints,
    calculateSinglesStrokes,
    calculateFourballStrokes,
} from '@/lib/services/handicapCalculator';
import {
    calculateStrokesPerHole,
    scoreStablefordHole,
    calculateStablefordRound,
    calculateCourseHandicap as stablefordCourseHandicap,
} from '@/lib/services/stablefordService';
import {
    calculateStablefordPoints as formatStablefordPoints,
    STABLEFORD_POINTS,
    MODIFIED_STABLEFORD_POINTS,
} from '@/lib/types/scoringFormats';

// ============================================
// COURSE HANDICAP CALCULATION TESTS
// ============================================

describe('Course Handicap Calculation', () => {
    describe('calculateCourseHandicap (USGA formula)', () => {
        it('should calculate standard course handicap correctly', () => {
            // Formula: round(HandicapIndex * (Slope / 113) + (CourseRating - Par))
            // 10.4 * (125/113) + (72.5 - 72) = 10.4 * 1.106 + 0.5 = 11.5 + 0.5 = 12
            const result = calculateCourseHandicap(10.4, 125, 72.5, 72);
            expect(result).toBe(12);
        });

        it('should handle zero handicap index', () => {
            const result = calculateCourseHandicap(0, 125, 72.5, 72);
            // 0 * (125/113) + (72.5 - 72) = 0 + 0.5 = 0.5 → rounds to 1
            expect(result).toBe(1);
        });

        it('should handle negative (plus) handicap index', () => {
            // Plus-3 player
            const result = calculateCourseHandicap(-3.0, 113, 72.0, 72);
            // -3.0 * (113/113) + (72.0 - 72) = -3 + 0 = -3
            expect(result).toBe(-3);
        });

        it('should handle high slope rating', () => {
            // Difficult course with slope 145
            const result = calculateCourseHandicap(15.0, 145, 74.5, 72);
            // 15.0 * (145/113) + (74.5 - 72) = 15.0 * 1.283 + 2.5 = 19.24 + 2.5 = 21.74 → 22
            expect(result).toBe(22);
        });

        it('should handle low slope rating', () => {
            // Easy course with slope 90
            const result = calculateCourseHandicap(18.0, 90, 68.0, 70);
            // 18.0 * (90/113) + (68.0 - 70) = 18.0 * 0.796 - 2 = 14.33 - 2 = 12.33 → 12
            expect(result).toBe(12);
        });

        it('should round correctly at half values', () => {
            // Test rounding at exactly 0.5
            const result = calculateCourseHandicap(10.0, 113, 72.5, 72);
            // 10.0 * (113/113) + (72.5 - 72) = 10 + 0.5 = 10.5 → 11
            expect(result).toBe(11);
        });
    });
});

// ============================================
// STROKE ALLOCATION TESTS
// ============================================

describe('Stroke Allocation', () => {
    // Standard hole handicap ranking (1=hardest, 18=easiest)
    const standardHoleHandicaps = [7, 11, 3, 13, 9, 1, 15, 5, 17, 8, 16, 10, 4, 12, 6, 18, 2, 14];

    describe('allocateStrokes', () => {
        it('should return all zeros for zero handicap', () => {
            const strokes = allocateStrokes(0, standardHoleHandicaps);
            expect(strokes).toEqual(Array(18).fill(0));
        });

        it('should allocate 1 stroke to hardest hole for 1 handicap', () => {
            const strokes = allocateStrokes(1, standardHoleHandicaps);
            const hardestHoleIndex = standardHoleHandicaps.findIndex(hcp => hcp === 1);

            expect(strokes[hardestHoleIndex]).toBe(1);
            expect(strokes.filter(s => s === 1).length).toBe(1);
            expect(strokes.filter(s => s === 0).length).toBe(17);
        });

        it('should allocate strokes to 10 hardest holes for 10 handicap', () => {
            const strokes = allocateStrokes(10, standardHoleHandicaps);

            // Count holes with strokes
            const holesWithStrokes = strokes.filter(s => s === 1).length;
            expect(holesWithStrokes).toBe(10);
            expect(strokes.filter(s => s === 0).length).toBe(8);

            // Verify strokes are on hardest holes (handicap ranks 1-10)
            for (let i = 0; i < 18; i++) {
                if (standardHoleHandicaps[i] <= 10) {
                    expect(strokes[i]).toBe(1);
                } else {
                    expect(strokes[i]).toBe(0);
                }
            }
        });

        it('should allocate 1 stroke per hole for 18 handicap', () => {
            const strokes = allocateStrokes(18, standardHoleHandicaps);
            expect(strokes).toEqual(Array(18).fill(1));
        });

        it('should allocate 2 strokes to hardest hole for 19 handicap', () => {
            const strokes = allocateStrokes(19, standardHoleHandicaps);
            const hardestHoleIndex = standardHoleHandicaps.findIndex(hcp => hcp === 1);

            // Hardest hole gets 2 strokes, all others get 1
            expect(strokes[hardestHoleIndex]).toBe(2);
            expect(strokes.filter(s => s === 2).length).toBe(1);
            expect(strokes.filter(s => s === 1).length).toBe(17);
        });

        it('should allocate 2 strokes per hole for 36 handicap', () => {
            const strokes = allocateStrokes(36, standardHoleHandicaps);
            expect(strokes).toEqual(Array(18).fill(2));
        });

        it('should handle plus handicap (negative strokes)', () => {
            const strokes = allocateStrokes(-3, standardHoleHandicaps);

            // 3 hardest holes should have -1 stroke
            const holesWithNegative = strokes.filter(s => s === -1).length;
            expect(holesWithNegative).toBe(3);
            expect(strokes.filter(s => s === 0).length).toBe(15);
        });
    });

    describe('getStrokesOnHole', () => {
        it('should return correct strokes for specific hole', () => {
            // 10 handicap, hole 6 has handicap rank 1 (hardest)
            const strokes = getStrokesOnHole(6, 10, standardHoleHandicaps);
            expect(strokes).toBe(1);
        });

        it('should return 0 for easy hole with low handicap', () => {
            // 5 handicap, hole 18 has handicap rank 18 (easiest)
            const strokes = getStrokesOnHole(18, 5, [7, 11, 3, 13, 9, 1, 15, 5, 17, 8, 16, 10, 4, 12, 6, 18, 2, 14]);
            expect(strokes).toBe(0);
        });

        it('should return 0 for out of bounds hole numbers', () => {
            expect(getStrokesOnHole(0, 10, standardHoleHandicaps)).toBe(0);
            expect(getStrokesOnHole(19, 10, standardHoleHandicaps)).toBe(0);
        });
    });
});

// ============================================
// NET SCORE CALCULATION TESTS
// ============================================

describe('Net Score Calculation', () => {
    describe('calculateNetScore', () => {
        it('should calculate net score correctly (basic)', () => {
            // Gross 5, received 1 stroke → Net 4
            expect(calculateNetScore(5, 1)).toBe(4);
        });

        it('should handle zero strokes received', () => {
            expect(calculateNetScore(4, 0)).toBe(4);
        });

        it('should handle multiple strokes received', () => {
            // Gross 6, received 2 strokes → Net 4
            expect(calculateNetScore(6, 2)).toBe(4);
        });

        it('should handle negative strokes (plus handicap)', () => {
            // Gross 3, gives back 1 stroke → Net 4
            expect(calculateNetScore(3, -1)).toBe(4);
        });
    });

    describe('calculateNetTotal', () => {
        it('should calculate total net score for full round', () => {
            const grossScores = Array(18).fill(5); // All 5s = 90 gross
            const strokesPerHole = Array(18).fill(1); // 1 stroke each = 18 strokes

            const netTotal = calculateNetTotal(grossScores, strokesPerHole);
            expect(netTotal).toBe(72); // 90 - 18 = 72
        });

        it('should handle varied strokes allocation', () => {
            const grossScores = Array(18).fill(5); // All 5s = 90 gross
            const strokesPerHole = [
                1, 1, 1, 1, 1, 1, 1, 1, 1, // Front nine: 9 strokes
                0, 0, 0, 0, 0, 0, 0, 0, 0  // Back nine: 0 strokes
            ];

            const netTotal = calculateNetTotal(grossScores, strokesPerHole);
            expect(netTotal).toBe(81); // 90 - 9 = 81
        });

        it('should return 0 for invalid array lengths', () => {
            expect(calculateNetTotal([5, 5, 5], [1, 1, 1])).toBe(0);
        });
    });
});

// ============================================
// STABLEFORD POINTS CALCULATION TESTS
// ============================================

describe('Stableford Points Calculation', () => {
    /**
     * Note: There are TWO Stableford systems in the codebase:
     *
     * 1. handicapCalculator.ts uses USGA standard: albatross=5, eagle=4, birdie=3, par=2, bogey=1
     * 2. scoringFormats.ts uses "enhanced" variant: albatross=8, eagle=5, birdie=4, par=2, bogey=1
     *
     * Both are valid - the enhanced version rewards exceptional play more.
     * The handicapCalculator is used for official handicap calculations.
     * The scoringFormats version is used for Stableford game display.
     */

    describe('USGA Standard Stableford (handicapCalculator)', () => {
        it('should award 5 points for albatross (3 under par)', () => {
            expect(calculateStablefordPoints(2, 5)).toBe(5); // Net 2 on par 5
        });

        it('should award 4 points for eagle (2 under par)', () => {
            expect(calculateStablefordPoints(3, 5)).toBe(4); // Net 3 on par 5
        });

        it('should award 3 points for birdie (1 under par)', () => {
            expect(calculateStablefordPoints(4, 5)).toBe(3); // Net 4 on par 5
            expect(calculateStablefordPoints(3, 4)).toBe(3); // Net 3 on par 4
            expect(calculateStablefordPoints(2, 3)).toBe(3); // Net 2 on par 3
        });

        it('should award 2 points for par', () => {
            expect(calculateStablefordPoints(4, 4)).toBe(2);
            expect(calculateStablefordPoints(3, 3)).toBe(2);
            expect(calculateStablefordPoints(5, 5)).toBe(2);
        });

        it('should award 1 point for bogey (1 over par)', () => {
            expect(calculateStablefordPoints(5, 4)).toBe(1);
            expect(calculateStablefordPoints(6, 5)).toBe(1);
        });

        it('should award 0 points for double bogey or worse', () => {
            expect(calculateStablefordPoints(6, 4)).toBe(0); // Double
            expect(calculateStablefordPoints(7, 4)).toBe(0); // Triple
            expect(calculateStablefordPoints(10, 4)).toBe(0); // Disaster
        });
    });

    describe('Enhanced Stableford (scoringFormats - game display)', () => {
        // This variant awards more points for exceptional shots
        // Common in casual games and some clubs
        it('should award 8 points for albatross (3 under par)', () => {
            expect(formatStablefordPoints(2, 5, false)).toBe(8); // Net 2 on par 5
        });

        it('should award 5 points for eagle (2 under par)', () => {
            expect(formatStablefordPoints(3, 5, false)).toBe(5); // Net 3 on par 5
        });

        it('should award 4 points for birdie (1 under par)', () => {
            expect(formatStablefordPoints(4, 5, false)).toBe(4); // Net 4 on par 5
        });

        it('should award 2 points for par', () => {
            expect(formatStablefordPoints(4, 4, false)).toBe(2);
        });

        it('should award 1 point for bogey', () => {
            expect(formatStablefordPoints(5, 4, false)).toBe(1);
        });

        it('should award 0 points for double bogey or worse', () => {
            expect(formatStablefordPoints(6, 4, false)).toBe(0);
        });
    });

    describe('Modified Stableford (PGA Tour Champions style)', () => {
        it('should award 8 points for eagle in modified', () => {
            expect(formatStablefordPoints(3, 5, true)).toBe(8);
        });

        it('should award 3 points for birdie in modified', () => {
            expect(formatStablefordPoints(3, 4, true)).toBe(3);
        });

        it('should award 0 points for par in modified', () => {
            expect(formatStablefordPoints(4, 4, true)).toBe(0);
        });

        it('should award -1 point for bogey in modified', () => {
            expect(formatStablefordPoints(5, 4, true)).toBe(-1);
        });

        it('should award -3 points for double bogey in modified', () => {
            expect(formatStablefordPoints(6, 4, true)).toBe(-3);
        });

        it('should award -5 points for triple+ in modified', () => {
            expect(formatStablefordPoints(7, 4, true)).toBe(-5);
        });
    });

    describe('calculateTotalStablefordPoints', () => {
        it('should calculate total points for a round', () => {
            const netScores = [4, 4, 4, 5, 3, 5, 4, 4, 5]; // 9 holes
            const pars = [4, 4, 3, 4, 4, 5, 4, 3, 4];
            // Par, Par, Bogey, Bogey, Birdie, Par, Par, Bogey, Bogey
            // 2 + 2 + 1 + 1 + 3 + 2 + 2 + 1 + 1 = 15

            // Need 18 holes for the function
            const fullNetScores = [...netScores, ...netScores];
            const fullPars = [...pars, ...pars];

            const total = calculateTotalStablefordPoints(fullNetScores, fullPars);
            expect(total).toBe(30); // 15 * 2
        });
    });
});

// ============================================
// STABLEFORD SERVICE TESTS
// ============================================

describe('Stableford Service', () => {
    describe('calculateStrokesPerHole', () => {
        const holeHandicaps = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

        it('should allocate strokes starting from hardest holes', () => {
            const strokes = calculateStrokesPerHole(10, holeHandicaps);

            // First 10 holes (handicaps 1-10) should get 1 stroke each
            for (let i = 0; i < 10; i++) {
                expect(strokes[i]).toBe(1);
            }
            // Last 8 holes should get 0 strokes
            for (let i = 10; i < 18; i++) {
                expect(strokes[i]).toBe(0);
            }
        });

        it('should give 2 strokes on hardest holes for 28 handicap', () => {
            const strokes = calculateStrokesPerHole(28, holeHandicaps);

            // All holes get at least 1 stroke (18)
            // Extra 10 strokes go to hardest holes
            for (let i = 0; i < 10; i++) {
                expect(strokes[i]).toBe(2);
            }
            for (let i = 10; i < 18; i++) {
                expect(strokes[i]).toBe(1);
            }
        });

        it('should throw error for invalid hole handicaps array', () => {
            expect(() => calculateStrokesPerHole(10, [1, 2, 3])).toThrow();
        });
    });

    describe('scoreStablefordHole', () => {
        it('should calculate hole score with handicap strokes', () => {
            // Par 4 hole, gross 5, receiving 1 stroke
            // Net score = 5 - 1 = 4 (par)
            // Points = 2
            const result = scoreStablefordHole(1, 4, 5, 1, false);

            expect(result.grossScore).toBe(5);
            expect(result.netScore).toBe(4);
            expect(result.strokesReceived).toBe(1);
            expect(result.stablefordPoints).toBe(2);
        });

        it('should handle no strokes received', () => {
            // Par 4 hole, gross 4, receiving 0 strokes
            // Net score = 4 - 0 = 4 (par)
            // Points = 2
            const result = scoreStablefordHole(1, 4, 4, 0, false);

            expect(result.grossScore).toBe(4);
            expect(result.netScore).toBe(4);
            expect(result.stablefordPoints).toBe(2);
        });

        it('should handle multiple strokes making net birdie', () => {
            // Par 4 hole, gross 6, receiving 3 strokes
            // Net score = 6 - 3 = 3 (birdie)
            // Points = 4 (using enhanced Stableford in stablefordService)
            const result = scoreStablefordHole(1, 4, 6, 3, false);

            expect(result.netScore).toBe(3);
            expect(result.stablefordPoints).toBe(4); // Enhanced: birdie = 4
        });
    });
});

// ============================================
// MATCH PLAY HANDICAP ALLOCATION TESTS
// ============================================

describe('Match Play Handicap Allocation', () => {
    describe('calculateSinglesStrokes', () => {
        it('should give strokes to higher handicapper', () => {
            // Player A: 15 handicap, Player B: 10 handicap
            const result = calculateSinglesStrokes(15, 10);

            expect(result.playerAStrokes).toBe(5); // Gets 5 strokes
            expect(result.playerBStrokes).toBe(0);
        });

        it('should handle equal handicaps', () => {
            const result = calculateSinglesStrokes(12, 12);

            expect(result.playerAStrokes).toBe(0);
            expect(result.playerBStrokes).toBe(0);
        });

        it('should apply allowance percentage', () => {
            // 10 stroke difference, 80% allowance
            const result = calculateSinglesStrokes(20, 10, 0.8);

            expect(result.playerAStrokes).toBe(8); // 10 * 0.8 = 8
            expect(result.playerBStrokes).toBe(0);
        });

        it('should give strokes to B when B has higher handicap', () => {
            const result = calculateSinglesStrokes(5, 15);

            expect(result.playerAStrokes).toBe(0);
            expect(result.playerBStrokes).toBe(10);
        });
    });

    describe('calculateFourballStrokes', () => {
        it('should calculate strokes off lowest handicap', () => {
            // Team A: [8, 12], Team B: [10, 14]
            // Lowest is 8, so differences are: [0, 4], [2, 6]
            // With 90% allowance: [0, 4], [2, 5]
            const result = calculateFourballStrokes([8, 12], [10, 14], 0.9);

            expect(result.teamAStrokes[0]).toBe(0); // 8 is lowest
            expect(result.teamAStrokes[1]).toBe(4); // (12-8) * 0.9 = 3.6 → 4
            expect(result.teamBStrokes[0]).toBe(2); // (10-8) * 0.9 = 1.8 → 2
            expect(result.teamBStrokes[1]).toBe(5); // (14-8) * 0.9 = 5.4 → 5
        });

        it('should handle when all handicaps are equal', () => {
            const result = calculateFourballStrokes([10, 10], [10, 10]);

            expect(result.teamAStrokes).toEqual([0, 0]);
            expect(result.teamBStrokes).toEqual([0, 0]);
        });
    });
});

// ============================================
// GROSS TO NET INTEGRATION TESTS
// ============================================

describe('Gross to Net Integration', () => {
    it('should correctly convert gross round to net with full flow', () => {
        // Simulate a full round conversion
        const handicapIndex = 15.0;
        const slope = 125;
        const courseRating = 72.5;
        const par = 72;

        // Calculate course handicap
        const courseHandicap = calculateCourseHandicap(handicapIndex, slope, courseRating, par);

        // Should be around 17 (15 * 125/113 + 0.5)
        expect(courseHandicap).toBeGreaterThanOrEqual(15);
        expect(courseHandicap).toBeLessThanOrEqual(19);

        // Allocate strokes (using standard hole handicaps)
        const holeHandicaps = [7, 11, 3, 13, 9, 1, 15, 5, 17, 8, 16, 10, 4, 12, 6, 18, 2, 14];
        const strokesPerHole = allocateStrokes(courseHandicap, holeHandicaps);

        // Total strokes should equal course handicap
        expect(strokesPerHole.reduce((a, b) => a + b, 0)).toBe(courseHandicap);

        // Simulate gross scores (playing to handicap)
        const grossScores = Array(18).fill(5); // 90 gross

        // Calculate net total
        const netTotal = calculateNetTotal(grossScores, strokesPerHole);

        // Net should be gross minus course handicap
        expect(netTotal).toBe(90 - courseHandicap);
    });

    it('should correctly calculate Stableford with handicap strokes', () => {
        const courseHandicap = 10;
        const holeHandicaps = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18];
        const strokesPerHole = allocateStrokes(courseHandicap, holeHandicaps);

        // All par 4s, shoot gross 5 on each (all bogey gross)
        const holePars = Array(18).fill(4);
        const grossScores = Array(18).fill(5);

        // On holes 1-10 (get stroke): net = 5 - 1 = 4 (par) → 2 points
        // On holes 11-18 (no stroke): net = 5 - 0 = 5 (bogey) → 1 point
        // Expected: 10 * 2 + 8 * 1 = 28 points

        const netScores = grossScores.map((gross, i) => gross - strokesPerHole[i]);
        const totalPoints = calculateTotalStablefordPoints(netScores, holePars);

        expect(totalPoints).toBe(28);
    });
});
