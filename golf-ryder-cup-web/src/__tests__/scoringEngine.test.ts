/**
 * Scoring Engine Tests
 *
 * Comprehensive tests for the match play scoring engine.
 * Tests cover: match state calculation, dormie detection, closeout logic,
 * score formatting, and points calculation.
 */

import { describe, it, expect } from 'vitest';
import {
    calculateMatchState,
    formatMatchScore,
    checkDormie,
    wouldCloseOut,
    calculateMatchResult,
    calculateMatchPoints,
    formatFinalResult,
} from '@/lib/services/scoringEngine';
import type { Match, HoleResult, HoleWinner } from '@/lib/types/models';

// ============================================
// TEST HELPERS
// ============================================

/**
 * Create a mock match for testing
 */
function createMockMatch(overrides?: Partial<Match>): Match {
    return {
        id: 'test-match-1',
        sessionId: 'test-session-1',
        matchOrder: 1,
        status: 'scheduled',
        currentHole: 1,
        teamAPlayerIds: ['player-1'],
        teamBPlayerIds: ['player-2'],
        teamAHandicapAllowance: 0,
        teamBHandicapAllowance: 0,
        result: 'notFinished',
        margin: 0,
        holesRemaining: 18,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...overrides,
    };
}

/**
 * Create a mock hole result
 */
function createHoleResult(
    holeNumber: number,
    winner: HoleWinner,
    matchId: string = 'test-match-1'
): HoleResult {
    return {
        id: `result-${holeNumber}`,
        matchId,
        holeNumber,
        winner,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Create a series of hole results for testing
 */
function createHoleResults(
    results: Array<{ hole: number; winner: HoleWinner }>,
    matchId: string = 'test-match-1'
): HoleResult[] {
    return results.map(r => createHoleResult(r.hole, r.winner, matchId));
}

// ============================================
// MATCH STATE CALCULATION TESTS
// ============================================

describe('calculateMatchState', () => {
    describe('Basic Score Calculation', () => {
        it('should return all square (AS) with no holes played', () => {
            const match = createMockMatch();
            const results: HoleResult[] = [];

            const state = calculateMatchState(match, results);

            expect(state.currentScore).toBe(0);
            expect(state.holesPlayed).toBe(0);
            expect(state.holesRemaining).toBe(18);
            expect(state.displayScore).toBe('AS');
            expect(state.status).toBe('scheduled');
        });

        it('should calculate Team A leading by 1', () => {
            const match = createMockMatch();
            const results = createHoleResults([
                { hole: 1, winner: 'teamA' },
            ]);

            const state = calculateMatchState(match, results);

            expect(state.currentScore).toBe(1);
            expect(state.teamAHolesWon).toBe(1);
            expect(state.teamBHolesWon).toBe(0);
            expect(state.holesPlayed).toBe(1);
            expect(state.holesRemaining).toBe(17);
            expect(state.displayScore).toBe('1 UP');
            expect(state.winningTeam).toBe('teamA');
        });

        it('should calculate Team B leading by 2', () => {
            const match = createMockMatch();
            const results = createHoleResults([
                { hole: 1, winner: 'teamB' },
                { hole: 2, winner: 'teamB' },
                { hole: 3, winner: 'halved' },
            ]);

            const state = calculateMatchState(match, results);

            expect(state.currentScore).toBe(-2);
            expect(state.teamAHolesWon).toBe(0);
            expect(state.teamBHolesWon).toBe(2);
            expect(state.holesPlayed).toBe(3);
            expect(state.displayScore).toBe('2 DN');
            expect(state.winningTeam).toBe('teamB');
        });

        it('should calculate all square after equal wins', () => {
            const match = createMockMatch();
            const results = createHoleResults([
                { hole: 1, winner: 'teamA' },
                { hole: 2, winner: 'teamB' },
                { hole: 3, winner: 'teamA' },
                { hole: 4, winner: 'teamB' },
            ]);

            const state = calculateMatchState(match, results);

            expect(state.currentScore).toBe(0);
            expect(state.teamAHolesWon).toBe(2);
            expect(state.teamBHolesWon).toBe(2);
            expect(state.displayScore).toBe('AS');
            expect(state.winningTeam).toBe(null);
        });

        it('should handle halved holes correctly', () => {
            const match = createMockMatch();
            const results = createHoleResults([
                { hole: 1, winner: 'halved' },
                { hole: 2, winner: 'halved' },
                { hole: 3, winner: 'halved' },
            ]);

            const state = calculateMatchState(match, results);

            expect(state.currentScore).toBe(0);
            expect(state.teamAHolesWon).toBe(0);
            expect(state.teamBHolesWon).toBe(0);
            expect(state.holesPlayed).toBe(3);
            expect(state.displayScore).toBe('AS');
        });

        it('should skip holes with winner = none', () => {
            const match = createMockMatch();
            const results = createHoleResults([
                { hole: 1, winner: 'teamA' },
                { hole: 2, winner: 'none' },  // Not yet scored
                { hole: 3, winner: 'teamB' },
            ]);

            const state = calculateMatchState(match, results);

            // Only holes 1 and 3 count
            expect(state.holesPlayed).toBe(2);
            expect(state.currentScore).toBe(0);
        });
    });

    describe('Dormie Detection', () => {
        it('should detect Team A dormie (up by holes remaining)', () => {
            const match = createMockMatch();
            // After 16 holes, Team A up 2, 2 holes remaining
            const results = createHoleResults([
                ...Array.from({ length: 14 }, (_, i) => ({ hole: i + 1, winner: 'halved' as HoleWinner })),
                { hole: 15, winner: 'teamA' },
                { hole: 16, winner: 'teamA' },
            ]);

            const state = calculateMatchState(match, results);

            expect(state.currentScore).toBe(2);
            expect(state.holesRemaining).toBe(2);
            expect(state.isDormie).toBe(true);
            expect(state.isClosedOut).toBe(false);
        });

        it('should detect Team B dormie (down by holes remaining from A perspective)', () => {
            const match = createMockMatch();
            // After 15 holes, Team B up 3, 3 holes remaining
            const results = createHoleResults([
                ...Array.from({ length: 12 }, (_, i) => ({ hole: i + 1, winner: 'halved' as HoleWinner })),
                { hole: 13, winner: 'teamB' },
                { hole: 14, winner: 'teamB' },
                { hole: 15, winner: 'teamB' },
            ]);

            const state = calculateMatchState(match, results);

            expect(state.currentScore).toBe(-3);
            expect(state.holesRemaining).toBe(3);
            expect(state.isDormie).toBe(true);
        });

        it('should NOT be dormie when lead is less than holes remaining', () => {
            const match = createMockMatch();
            // After 15 holes, Team A up 2, 3 holes remaining
            const results = createHoleResults([
                ...Array.from({ length: 13 }, (_, i) => ({ hole: i + 1, winner: 'halved' as HoleWinner })),
                { hole: 14, winner: 'teamA' },
                { hole: 15, winner: 'teamA' },
            ]);

            const state = calculateMatchState(match, results);

            expect(state.currentScore).toBe(2);
            expect(state.holesRemaining).toBe(3);
            expect(state.isDormie).toBe(false);
        });
    });

    describe('Closeout Detection', () => {
        it('should detect match closed out (3&2)', () => {
            const match = createMockMatch();
            // After 16 holes, Team A up 3, 2 holes remaining
            const results = createHoleResults([
                ...Array.from({ length: 13 }, (_, i) => ({ hole: i + 1, winner: 'halved' as HoleWinner })),
                { hole: 14, winner: 'teamA' },
                { hole: 15, winner: 'teamA' },
                { hole: 16, winner: 'teamA' },
            ]);

            const state = calculateMatchState(match, results);

            expect(state.currentScore).toBe(3);
            expect(state.holesRemaining).toBe(2);
            expect(state.isClosedOut).toBe(true);
            expect(state.status).toBe('completed');
            expect(state.displayScore).toBe('3&2');
        });

        it('should detect large closeout (5&4)', () => {
            const match = createMockMatch();
            // After 14 holes, Team A up 5, 4 holes remaining
            const results = createHoleResults([
                ...Array.from({ length: 9 }, (_, i) => ({ hole: i + 1, winner: 'halved' as HoleWinner })),
                { hole: 10, winner: 'teamA' },
                { hole: 11, winner: 'teamA' },
                { hole: 12, winner: 'teamA' },
                { hole: 13, winner: 'teamA' },
                { hole: 14, winner: 'teamA' },
            ]);

            const state = calculateMatchState(match, results);

            expect(state.isClosedOut).toBe(true);
            expect(state.displayScore).toBe('5&4');
        });

        it('should detect Team B closeout', () => {
            const match = createMockMatch();
            // After 14 holes, Team B up 5, 4 holes remaining
            const results = createHoleResults([
                ...Array.from({ length: 9 }, (_, i) => ({ hole: i + 1, winner: 'halved' as HoleWinner })),
                { hole: 10, winner: 'teamB' },
                { hole: 11, winner: 'teamB' },
                { hole: 12, winner: 'teamB' },
                { hole: 13, winner: 'teamB' },
                { hole: 14, winner: 'teamB' },
            ]);

            const state = calculateMatchState(match, results);

            expect(state.isClosedOut).toBe(true);
            expect(state.displayScore).toBe('5&4');
            expect(state.winningTeam).toBe('teamB');
        });
    });

    describe('Full 18-Hole Match', () => {
        it('should complete all 18 holes with halved result', () => {
            const match = createMockMatch();
            const results = createHoleResults(
                Array.from({ length: 18 }, (_, i) => ({
                    hole: i + 1,
                    winner: 'halved' as HoleWinner,
                }))
            );

            const state = calculateMatchState(match, results);

            expect(state.holesPlayed).toBe(18);
            expect(state.holesRemaining).toBe(0);
            expect(state.currentScore).toBe(0);
            expect(state.status).toBe('completed');
            expect(state.winningTeam).toBe('halved');
        });

        it('should complete all 18 holes with 1-up win', () => {
            const match = createMockMatch();
            const results = createHoleResults([
                ...Array.from({ length: 17 }, (_, i) => ({ hole: i + 1, winner: 'halved' as HoleWinner })),
                { hole: 18, winner: 'teamA' },
            ]);

            const state = calculateMatchState(match, results);

            expect(state.holesPlayed).toBe(18);
            expect(state.holesRemaining).toBe(0);
            expect(state.currentScore).toBe(1);
            expect(state.status).toBe('completed');
            expect(state.winningTeam).toBe('teamA');
        });
    });
});

// ============================================
// FORMAT MATCH SCORE TESTS
// ============================================

describe('formatMatchScore', () => {
    it('should return "AS" for no holes played', () => {
        expect(formatMatchScore(0, 18, false, 0)).toBe('AS');
    });

    it('should return "AS" for tied match', () => {
        expect(formatMatchScore(0, 10, false, 8)).toBe('AS');
    });

    it('should format positive score as UP', () => {
        expect(formatMatchScore(1, 17, false, 1)).toBe('1 UP');
        expect(formatMatchScore(3, 10, false, 8)).toBe('3 UP');
    });

    it('should format negative score as DN', () => {
        expect(formatMatchScore(-1, 17, false, 1)).toBe('1 DN');
        expect(formatMatchScore(-4, 6, false, 12)).toBe('4 DN');
    });

    it('should format closeout as X&Y', () => {
        expect(formatMatchScore(3, 2, true, 16)).toBe('3&2');
        expect(formatMatchScore(5, 4, true, 14)).toBe('5&4');
        expect(formatMatchScore(-3, 2, true, 16)).toBe('3&2');
    });
});

// ============================================
// CHECK DORMIE TESTS
// ============================================

describe('checkDormie', () => {
    it('should detect Team A dormie', () => {
        const result = checkDormie(2, 2);
        expect(result.teamADormie).toBe(true);
        expect(result.teamBDormie).toBe(false);
    });

    it('should detect Team B dormie', () => {
        const result = checkDormie(-3, 3);
        expect(result.teamADormie).toBe(false);
        expect(result.teamBDormie).toBe(true);
    });

    it('should return no dormie when not applicable', () => {
        const result = checkDormie(2, 5);
        expect(result.teamADormie).toBe(false);
        expect(result.teamBDormie).toBe(false);
    });

    it('should return no dormie when tied', () => {
        const result = checkDormie(0, 4);
        expect(result.teamADormie).toBe(false);
        expect(result.teamBDormie).toBe(false);
    });

    it('should handle edge case of 1 hole remaining', () => {
        const result = checkDormie(1, 1);
        expect(result.teamADormie).toBe(true);
    });
});

// ============================================
// WOULD CLOSE OUT TESTS
// ============================================

describe('wouldCloseOut', () => {
    it('should return true when Team A win would close out', () => {
        // Team A up 2 with 2 remaining, winning another closes out
        expect(wouldCloseOut(2, 2, 'teamA')).toBe(true);
    });

    it('should return false when Team A win would not close out', () => {
        // Team A up 1 with 3 remaining, winning makes 2 up with 2 remaining (dormie, not closed)
        expect(wouldCloseOut(1, 3, 'teamA')).toBe(false);
    });

    it('should return true when Team B win would close out', () => {
        // Team B up 2 (score = -2) with 2 remaining
        expect(wouldCloseOut(-2, 2, 'teamB')).toBe(true);
    });

    it('should return true when halve closes out dormie situation', () => {
        // Team A up 3 with 2 remaining - already closed out
        expect(wouldCloseOut(3, 2, 'halved')).toBe(true);
    });

    it('should return false when halve does not close out', () => {
        // Team A up 1 with 3 remaining
        expect(wouldCloseOut(1, 3, 'halved')).toBe(false);
    });

    it('should return false for none winner', () => {
        expect(wouldCloseOut(2, 2, 'none')).toBe(true); // Actually already closed out position
    });
});

// ============================================
// CALCULATE MATCH RESULT TESTS
// ============================================

describe('calculateMatchResult', () => {
    it('should return incomplete for in-progress match', () => {
        const match = createMockMatch();
        const state = calculateMatchState(match, []);
        expect(calculateMatchResult(state)).toBe('incomplete');
    });

    it('should return halved for tied complete match', () => {
        const match = createMockMatch();
        const results = createHoleResults(
            Array.from({ length: 18 }, (_, i) => ({
                hole: i + 1,
                winner: 'halved' as HoleWinner,
            }))
        );
        const state = calculateMatchState(match, results);
        expect(calculateMatchResult(state)).toBe('halved');
    });

    it('should return oneUp for 1-up win on 18th', () => {
        const match = createMockMatch();
        const results = createHoleResults([
            ...Array.from({ length: 17 }, (_, i) => ({ hole: i + 1, winner: 'halved' as HoleWinner })),
            { hole: 18, winner: 'teamA' },
        ]);
        const state = calculateMatchState(match, results);
        expect(calculateMatchResult(state)).toBe('oneUp');
    });

    it('should return threeAndTwo for 3&2 closeout', () => {
        const match = createMockMatch();
        const results = createHoleResults([
            ...Array.from({ length: 13 }, (_, i) => ({ hole: i + 1, winner: 'halved' as HoleWinner })),
            { hole: 14, winner: 'teamA' },
            { hole: 15, winner: 'teamA' },
            { hole: 16, winner: 'teamA' },
        ]);
        const state = calculateMatchState(match, results);
        expect(calculateMatchResult(state)).toBe('threeAndTwo');
    });
});

// ============================================
// CALCULATE MATCH POINTS TESTS
// ============================================

describe('calculateMatchPoints', () => {
    it('should return 0-0 for incomplete match', () => {
        const match = createMockMatch();
        const state = calculateMatchState(match, []);
        const points = calculateMatchPoints(state);
        expect(points.teamAPoints).toBe(0);
        expect(points.teamBPoints).toBe(0);
    });

    it('should return 0.5-0.5 for halved match', () => {
        const match = createMockMatch();
        const results = createHoleResults(
            Array.from({ length: 18 }, (_, i) => ({
                hole: i + 1,
                winner: 'halved' as HoleWinner,
            }))
        );
        const state = calculateMatchState(match, results);
        const points = calculateMatchPoints(state);
        expect(points.teamAPoints).toBe(0.5);
        expect(points.teamBPoints).toBe(0.5);
    });

    it('should return 1-0 for Team A win', () => {
        const match = createMockMatch();
        const results = createHoleResults([
            ...Array.from({ length: 13 }, (_, i) => ({ hole: i + 1, winner: 'halved' as HoleWinner })),
            { hole: 14, winner: 'teamA' },
            { hole: 15, winner: 'teamA' },
            { hole: 16, winner: 'teamA' },
        ]);
        const state = calculateMatchState(match, results);
        const points = calculateMatchPoints(state);
        expect(points.teamAPoints).toBe(1);
        expect(points.teamBPoints).toBe(0);
    });

    it('should return 0-1 for Team B win', () => {
        const match = createMockMatch();
        const results = createHoleResults([
            ...Array.from({ length: 13 }, (_, i) => ({ hole: i + 1, winner: 'halved' as HoleWinner })),
            { hole: 14, winner: 'teamB' },
            { hole: 15, winner: 'teamB' },
            { hole: 16, winner: 'teamB' },
        ]);
        const state = calculateMatchState(match, results);
        const points = calculateMatchPoints(state);
        expect(points.teamAPoints).toBe(0);
        expect(points.teamBPoints).toBe(1);
    });
});

// ============================================
// FORMAT FINAL RESULT TESTS
// ============================================

describe('formatFinalResult', () => {
    it('should return "Match Halved" for tied match', () => {
        const match = createMockMatch();
        const results = createHoleResults(
            Array.from({ length: 18 }, (_, i) => ({
                hole: i + 1,
                winner: 'halved' as HoleWinner,
            }))
        );
        const state = calculateMatchState(match, results);
        expect(formatFinalResult(state, 'USA', 'Europe')).toBe('Match Halved');
    });

    it('should return Team A win message', () => {
        const match = createMockMatch();
        const results = createHoleResults([
            ...Array.from({ length: 13 }, (_, i) => ({ hole: i + 1, winner: 'halved' as HoleWinner })),
            { hole: 14, winner: 'teamA' },
            { hole: 15, winner: 'teamA' },
            { hole: 16, winner: 'teamA' },
        ]);
        const state = calculateMatchState(match, results);
        expect(formatFinalResult(state, 'USA', 'Europe')).toBe('USA won 3&2');
    });

    it('should return Team B win message', () => {
        const match = createMockMatch();
        const results = createHoleResults([
            ...Array.from({ length: 13 }, (_, i) => ({ hole: i + 1, winner: 'halved' as HoleWinner })),
            { hole: 14, winner: 'teamB' },
            { hole: 15, winner: 'teamB' },
            { hole: 16, winner: 'teamB' },
        ]);
        const state = calculateMatchState(match, results);
        expect(formatFinalResult(state, 'USA', 'Europe')).toBe('Europe won 3&2');
    });
});

// ============================================
// EDGE CASE TESTS
// ============================================

describe('Edge Cases', () => {
    it('should handle out-of-order hole results', () => {
        const match = createMockMatch();
        const results = createHoleResults([
            { hole: 3, winner: 'teamA' },
            { hole: 1, winner: 'teamB' },
            { hole: 2, winner: 'teamA' },
        ]);

        const state = calculateMatchState(match, results);

        // Should still calculate correctly regardless of order
        expect(state.holesPlayed).toBe(3);
        expect(state.currentScore).toBe(1); // 2 for A, 1 for B
        expect(state.teamAHolesWon).toBe(2);
        expect(state.teamBHolesWon).toBe(1);
    });

    it('should handle maximum blowout (10&8)', () => {
        const match = createMockMatch();
        // Team A wins first 10 holes
        const results = createHoleResults(
            Array.from({ length: 10 }, (_, i) => ({
                hole: i + 1,
                winner: 'teamA' as HoleWinner,
            }))
        );

        const state = calculateMatchState(match, results);

        expect(state.currentScore).toBe(10);
        expect(state.holesRemaining).toBe(8);
        expect(state.isClosedOut).toBe(true);
        expect(state.displayScore).toBe('10&8');
    });

    it('should handle alternating wins correctly', () => {
        const match = createMockMatch();
        // A, B, A, B pattern for first 8 holes
        const results = createHoleResults(
            Array.from({ length: 8 }, (_, i) => ({
                hole: i + 1,
                winner: (i % 2 === 0 ? 'teamA' : 'teamB') as HoleWinner,
            }))
        );

        const state = calculateMatchState(match, results);

        expect(state.currentScore).toBe(0);
        expect(state.teamAHolesWon).toBe(4);
        expect(state.teamBHolesWon).toBe(4);
        expect(state.displayScore).toBe('AS');
    });

    it('should handle comeback from large deficit', () => {
        const match = createMockMatch();
        // Team B wins first 4, then Team A wins next 5
        const results = createHoleResults([
            { hole: 1, winner: 'teamB' },
            { hole: 2, winner: 'teamB' },
            { hole: 3, winner: 'teamB' },
            { hole: 4, winner: 'teamB' },
            { hole: 5, winner: 'teamA' },
            { hole: 6, winner: 'teamA' },
            { hole: 7, winner: 'teamA' },
            { hole: 8, winner: 'teamA' },
            { hole: 9, winner: 'teamA' },
        ]);

        const state = calculateMatchState(match, results);

        expect(state.currentScore).toBe(1); // A up 1
        expect(state.teamAHolesWon).toBe(5);
        expect(state.teamBHolesWon).toBe(4);
        expect(state.displayScore).toBe('1 UP');
        expect(state.winningTeam).toBe('teamA');
    });
});

// ============================================
// INTEGRATION SCENARIO TESTS
// ============================================

describe('Real Match Scenarios', () => {
    it('should simulate classic 2023 Ryder Cup style match', () => {
        const match = createMockMatch();
        // Simulate a tight back-and-forth match
        const results = createHoleResults([
            { hole: 1, winner: 'teamA' },    // A: 1 up
            { hole: 2, winner: 'halved' },   // A: 1 up
            { hole: 3, winner: 'teamB' },    // AS
            { hole: 4, winner: 'teamB' },    // B: 1 up
            { hole: 5, winner: 'teamA' },    // AS
            { hole: 6, winner: 'teamA' },    // A: 1 up
            { hole: 7, winner: 'halved' },   // A: 1 up
            { hole: 8, winner: 'teamB' },    // AS
            { hole: 9, winner: 'halved' },   // AS (Turn)
            { hole: 10, winner: 'teamA' },   // A: 1 up
            { hole: 11, winner: 'teamA' },   // A: 2 up
            { hole: 12, winner: 'halved' },  // A: 2 up
            { hole: 13, winner: 'teamB' },   // A: 1 up
            { hole: 14, winner: 'halved' },  // A: 1 up
            { hole: 15, winner: 'teamA' },   // A: 2 up
            { hole: 16, winner: 'halved' },  // A: 2 up (Dormie)
            { hole: 17, winner: 'halved' },  // A: 2&1
        ]);

        const state = calculateMatchState(match, results);

        expect(state.currentScore).toBe(2);
        expect(state.holesRemaining).toBe(1);
        expect(state.isClosedOut).toBe(true);
        expect(state.displayScore).toBe('2&1');
        expect(state.winningTeam).toBe('teamA');
    });

    it('should simulate dramatic 18th hole finish', () => {
        const match = createMockMatch();
        // Even match going into 18
        const results = createHoleResults([
            ...Array.from({ length: 17 }, (_, i) => ({
                hole: i + 1,
                winner: (i % 3 === 0 ? 'teamA' : i % 3 === 1 ? 'teamB' : 'halved') as HoleWinner,
            })),
            { hole: 18, winner: 'teamA' },
        ]);

        const state = calculateMatchState(match, results);

        expect(state.holesPlayed).toBe(18);
        expect(state.holesRemaining).toBe(0);
        expect(state.status).toBe('completed');
        // 6 wins each from pattern + 1 win on 18 for A
        expect(state.teamAHolesWon).toBe(7);
        expect(state.teamBHolesWon).toBe(6);
        expect(state.winningTeam).toBe('teamA');
    });
});
