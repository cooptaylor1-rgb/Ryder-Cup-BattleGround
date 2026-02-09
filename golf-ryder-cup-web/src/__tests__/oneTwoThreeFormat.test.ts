/**
 * 1-2-3 Progressive Format Tests
 *
 * Validates the 1-2-3 format definition and scoring logic:
 * - Holes 1-6: Best 1 of 4 net scores
 * - Holes 7-12: Best 2 of 4 net scores
 * - Holes 13-18: Best 3 of 4 net scores
 */

import { describe, it, expect } from 'vitest';
import {
    FORMAT_CONFIGS,
    getFormatConfig,
    getFormatsByTag,
    getFormatsByCategory,
    isFormatCompatible,
    getBallsToCountForHole,
    getProgressiveSegments,
    scoreProgressiveHole,
} from '@/lib/types/matchFormats';

describe('1-2-3 Format', () => {
    describe('Format Definition', () => {
        it('exists in FORMAT_CONFIGS', () => {
            expect(FORMAT_CONFIGS['one-two-three']).toBeDefined();
        });

        it('has correct metadata', () => {
            const config = getFormatConfig('one-two-three');
            expect(config.name).toBe('1-2-3');
            expect(config.shortName).toBe('1-2-3');
            expect(config.category).toBe('teamPlay');
            expect(config.playersPerTeam).toBe(4);
            expect(config.handicapMethod).toBe('full');
            expect(config.scoringType).toBe('strokePlay');
            expect(config.holesPerMatch).toBe(18);
            expect(config.requiresCourse).toBe(true);
            expect(config.complexity).toBe('intermediate');
        });

        it('is discoverable by progressive tag', () => {
            const formats = getFormatsByTag('progressive');
            const ids = formats.map(f => f.id);
            expect(ids).toContain('one-two-three');
        });

        it('appears in teamPlay category', () => {
            const formats = getFormatsByCategory('teamPlay');
            const ids = formats.map(f => f.id);
            expect(ids).toContain('one-two-three');
        });

        it('requires at least 4 players', () => {
            expect(isFormatCompatible('one-two-three', 3)).toBe(false);
            expect(isFormatCompatible('one-two-three', 4)).toBe(true);
            expect(isFormatCompatible('one-two-three', 8)).toBe(true);
        });

        it('has 5 rules', () => {
            const config = getFormatConfig('one-two-three');
            expect(config.rules.length).toBe(5);
            expect(config.rules[0]).toMatch(/Best 1 of 4/);
            expect(config.rules[1]).toMatch(/Best 2 of 4/);
            expect(config.rules[2]).toMatch(/Best 3 of 4/);
        });
    });

    describe('Progressive Segments', () => {
        it('has 3 segments', () => {
            const segments = getProgressiveSegments('one-two-three');
            expect(segments).not.toBeNull();
            expect(segments!.length).toBe(3);
        });

        it('segment 1: holes 1-6, best 1', () => {
            const segments = getProgressiveSegments('one-two-three')!;
            expect(segments[0]).toEqual({ startHole: 1, endHole: 6, ballsToCount: 1 });
        });

        it('segment 2: holes 7-12, best 2', () => {
            const segments = getProgressiveSegments('one-two-three')!;
            expect(segments[1]).toEqual({ startHole: 7, endHole: 12, ballsToCount: 2 });
        });

        it('segment 3: holes 13-18, best 3', () => {
            const segments = getProgressiveSegments('one-two-three')!;
            expect(segments[2]).toEqual({ startHole: 13, endHole: 18, ballsToCount: 3 });
        });

        it('returns null for non-progressive formats', () => {
            expect(getProgressiveSegments('singles')).toBeNull();
            expect(getProgressiveSegments('fourball')).toBeNull();
            expect(getProgressiveSegments('scramble')).toBeNull();
        });
    });

    describe('getBallsToCountForHole', () => {
        it('returns 1 for holes 1-6', () => {
            for (let h = 1; h <= 6; h++) {
                expect(getBallsToCountForHole('one-two-three', h)).toBe(1);
            }
        });

        it('returns 2 for holes 7-12', () => {
            for (let h = 7; h <= 12; h++) {
                expect(getBallsToCountForHole('one-two-three', h)).toBe(2);
            }
        });

        it('returns 3 for holes 13-18', () => {
            for (let h = 13; h <= 18; h++) {
                expect(getBallsToCountForHole('one-two-three', h)).toBe(3);
            }
        });

        it('returns null for non-progressive format', () => {
            expect(getBallsToCountForHole('singles', 1)).toBeNull();
        });
    });

    describe('scoreProgressiveHole', () => {
        // 4 players: net scores [4, 5, 6, 7]
        const scores = [4, 5, 6, 7];

        it('best 1 of 4 picks the lowest', () => {
            expect(scoreProgressiveHole(scores, 1)).toBe(4);
        });

        it('best 2 of 4 picks the two lowest', () => {
            expect(scoreProgressiveHole(scores, 2)).toBe(4 + 5);
        });

        it('best 3 of 4 picks the three lowest', () => {
            expect(scoreProgressiveHole(scores, 3)).toBe(4 + 5 + 6);
        });

        it('all 4 sums everything', () => {
            expect(scoreProgressiveHole(scores, 4)).toBe(4 + 5 + 6 + 7);
        });

        it('handles unsorted input', () => {
            expect(scoreProgressiveHole([7, 4, 6, 5], 2)).toBe(4 + 5);
        });

        it('handles fewer scores than ballsToCount', () => {
            expect(scoreProgressiveHole([5, 3], 3)).toBe(5 + 3);
        });

        it('handles empty scores', () => {
            expect(scoreProgressiveHole([], 2)).toBe(0);
        });

        it('handles ties correctly', () => {
            expect(scoreProgressiveHole([4, 4, 4, 4], 2)).toBe(8);
        });
    });

    describe('Full round scoring simulation', () => {
        it('scores a complete 18-hole round correctly', () => {
            // Simulate 4 players' net scores for 18 holes
            const playerScores = [
                // Player A: consistent 4s
                [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4],
                // Player B: mixed
                [3, 5, 4, 6, 3, 5, 3, 5, 4, 6, 3, 5, 3, 5, 4, 6, 3, 5],
                // Player C: bogey golfer
                [5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
                // Player D: inconsistent
                [2, 7, 3, 8, 4, 6, 2, 7, 3, 8, 4, 6, 2, 7, 3, 8, 4, 6],
            ];

            let totalTeamScore = 0;

            for (let hole = 1; hole <= 18; hole++) {
                const holeScores = playerScores.map(p => p[hole - 1]);
                const ballsToCount = getBallsToCountForHole('one-two-three', hole)!;
                totalTeamScore += scoreProgressiveHole(holeScores, ballsToCount);
            }

            // Manually verify:
            // Holes 1-6 (best 1): min of each column
            // H1: min(4,3,5,2)=2, H2: min(4,5,5,7)=4, H3: min(4,4,5,3)=3,
            // H4: min(4,6,5,8)=4, H5: min(4,3,5,4)=3, H6: min(4,5,5,6)=4
            // Sum = 2+4+3+4+3+4 = 20
            //
            // Holes 7-12 (best 2): sum of 2 lowest
            // H7: sort(4,3,5,2)=[2,3,5,4]→2+3=5, H8: sort(4,5,5,7)→4+5=9,
            // H9: sort(4,4,5,3)→3+4=7, H10: sort(4,6,5,8)→4+5=9,
            // H11: sort(4,3,5,4)→3+4=7, H12: sort(4,5,5,6)→4+5=9
            // Sum = 5+9+7+9+7+9 = 46
            //
            // Holes 13-18 (best 3): sum of 3 lowest
            // H13: sort(4,3,5,2)→2+3+4=9, H14: sort(4,5,5,7)→4+5+5=14,
            // H15: sort(4,4,5,3)→3+4+4=11, H16: sort(4,6,5,8)→4+5+6=15,
            // H17: sort(4,3,5,4)→3+4+4=11, H18: sort(4,5,5,6)→4+5+5=14
            // Sum = 9+14+11+15+11+14 = 74

            expect(totalTeamScore).toBe(20 + 46 + 74); // 140
        });
    });
});
