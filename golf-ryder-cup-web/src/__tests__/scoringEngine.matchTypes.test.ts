/**
 * Scoring Engine Match-Type Golden Tests
 *
 * Validates match-play outcomes for Ryder Cup formats:
 * - Singles
 * - Fourball (best ball)
 * - Foursomes (alternate shot)
 *
 * These tests focus on deterministic match state + result calculation,
 * which should be format-agnostic once hole winners are known.
 */

import { describe, it, expect } from 'vitest';
import {
  calculateMatchState,
  calculateMatchPoints,
  calculateMatchResult,
  calculateStoredMatchResult,
} from '@/lib/services/scoringEngine';
import type { Match, HoleResult, HoleWinner } from '@/lib/types/models';

function createMockMatch(overrides?: Partial<Match>): Match {
  return {
    id: 'test-match-1',
    sessionId: 'test-session-1',
    matchOrder: 1,
    status: 'scheduled',
    currentHole: 1,
    teamAPlayerIds: ['player-a1', 'player-a2'],
    teamBPlayerIds: ['player-b1', 'player-b2'],
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

function holeResult(holeNumber: number, winner: HoleWinner, matchId = 'test-match-1'): HoleResult {
  return {
    id: `result-${matchId}-${holeNumber}`,
    matchId,
    holeNumber,
    winner,
    timestamp: new Date().toISOString(),
  };
}

function makeResults(items: Array<{ hole: number; winner: HoleWinner }>): HoleResult[] {
  return items.map((item) => holeResult(item.hole, item.winner));
}

// ============================================
// MATCH TYPE GOLDEN TESTS
// ============================================

describe('ScoringEngine match-type golden tests', () => {
  it('singles: Team A wins 3&2 after 16 holes', () => {
    const match = createMockMatch({ id: 'singles-match' });
    const results = makeResults([
      { hole: 1, winner: 'teamA' },
      { hole: 2, winner: 'teamA' },
      { hole: 3, winner: 'teamB' },
      { hole: 4, winner: 'teamA' },
      { hole: 5, winner: 'teamA' },
      { hole: 6, winner: 'teamB' },
      { hole: 7, winner: 'teamA' },
      { hole: 8, winner: 'teamB' },
      { hole: 9, winner: 'teamA' },
      { hole: 10, winner: 'teamB' },
      { hole: 11, winner: 'teamA' },
      { hole: 12, winner: 'teamB' },
      { hole: 13, winner: 'teamA' },
      { hole: 14, winner: 'halved' },
      { hole: 15, winner: 'teamA' },
      { hole: 16, winner: 'teamB' },
    ]);

    const state = calculateMatchState(match, results);

    expect(state.holesPlayed).toBe(16);
    expect(state.holesRemaining).toBe(2);
    expect(state.currentScore).toBe(3);
    expect(state.isClosedOut).toBe(true);

    const resultType = calculateMatchResult(state);
    expect(resultType).toBe('threeAndTwo');

    const points = calculateMatchPoints(state);
    expect(points).toEqual({ teamAPoints: 1, teamBPoints: 0 });
  });

  it('foursomes: match halved after 18 holes', () => {
    const match = createMockMatch({ id: 'foursomes-match' });
    const results = makeResults([
      { hole: 1, winner: 'teamA' },
      { hole: 2, winner: 'teamB' },
      { hole: 3, winner: 'halved' },
      { hole: 4, winner: 'teamA' },
      { hole: 5, winner: 'teamB' },
      { hole: 6, winner: 'halved' },
      { hole: 7, winner: 'teamA' },
      { hole: 8, winner: 'teamB' },
      { hole: 9, winner: 'halved' },
      { hole: 10, winner: 'teamA' },
      { hole: 11, winner: 'teamB' },
      { hole: 12, winner: 'halved' },
      { hole: 13, winner: 'teamA' },
      { hole: 14, winner: 'teamB' },
      { hole: 15, winner: 'halved' },
      { hole: 16, winner: 'teamA' },
      { hole: 17, winner: 'teamB' },
      { hole: 18, winner: 'halved' },
    ]);

    const state = calculateMatchState(match, results);

    expect(state.holesPlayed).toBe(18);
    expect(state.holesRemaining).toBe(0);
    expect(state.currentScore).toBe(0);

    const resultType = calculateMatchResult(state);
    expect(resultType).toBe('halved');
    expect(calculateStoredMatchResult(state)).toBe('halved');

    const points = calculateMatchPoints(state);
    expect(points).toEqual({ teamAPoints: 0.5, teamBPoints: 0.5 });
  });

  it('fourball: Team A wins 1 up on 18th', () => {
    const match = createMockMatch({ id: 'fourball-match' });
    const results = makeResults([
      { hole: 1, winner: 'teamA' },
      { hole: 2, winner: 'teamB' },
      { hole: 3, winner: 'teamA' },
      { hole: 4, winner: 'teamB' },
      { hole: 5, winner: 'teamA' },
      { hole: 6, winner: 'teamB' },
      { hole: 7, winner: 'teamA' },
      { hole: 8, winner: 'teamB' },
      { hole: 9, winner: 'teamA' },
      { hole: 10, winner: 'teamB' },
      { hole: 11, winner: 'teamA' },
      { hole: 12, winner: 'teamB' },
      { hole: 13, winner: 'teamA' },
      { hole: 14, winner: 'teamB' },
      { hole: 15, winner: 'teamA' },
      { hole: 16, winner: 'teamB' },
      { hole: 17, winner: 'halved' },
      { hole: 18, winner: 'teamA' },
    ]);

    const state = calculateMatchState(match, results);

    expect(state.holesPlayed).toBe(18);
    expect(state.holesRemaining).toBe(0);
    expect(state.currentScore).toBe(1);

    const resultType = calculateMatchResult(state);
    expect(resultType).toBe('oneUp');
    expect(calculateStoredMatchResult(state)).toBe('teamAWin');

    const points = calculateMatchPoints(state);
    expect(points).toEqual({ teamAPoints: 1, teamBPoints: 0 });
  });

  it('invariants: points sum to 1 only for completed matches', () => {
    const match = createMockMatch({ id: 'invariant-match' });
    const inProgress = makeResults([
      { hole: 1, winner: 'teamA' },
      { hole: 2, winner: 'teamB' },
    ]);

    const inProgressState = calculateMatchState(match, inProgress);
    const inProgressPoints = calculateMatchPoints(inProgressState);
    expect(inProgressPoints.teamAPoints + inProgressPoints.teamBPoints).toBe(0);
    expect(calculateStoredMatchResult(inProgressState)).toBe('notFinished');

    const completed = makeResults(
      Array.from({ length: 18 }, (_, i) => ({ hole: i + 1, winner: 'halved' as HoleWinner }))
    );

    const completedState = calculateMatchState(match, completed);
    const completedPoints = calculateMatchPoints(completedState);
    expect(completedPoints.teamAPoints + completedPoints.teamBPoints).toBe(1);
  });
});
