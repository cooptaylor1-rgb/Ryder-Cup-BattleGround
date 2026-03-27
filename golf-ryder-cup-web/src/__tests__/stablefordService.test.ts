/**
 * Stableford Service Tests
 *
 * Comprehensive tests for the Stableford scoring service.
 * Tests cover: single-hole scoring, full/partial rounds, leaderboard,
 * team best ball, display formatting, and score comparison.
 */

import { describe, it, expect } from 'vitest';
import {
  scoreStablefordHole,
  calculateStablefordRound,
  buildStablefordLeaderboard,
  calculateTeamBestBallStableford,
  getPointsDisplay,
  formatStablefordComparison,
  type StablefordPlayer,
} from '@/lib/services/stablefordService';
import type { Player } from '@/lib/types/models';
import type { StablefordRoundScore } from '@/lib/types/scoringFormats';

// ============================================
// TEST HELPERS
// ============================================

function createMockPlayer(overrides?: Partial<Player>): Player {
  return {
    id: 'player-1',
    firstName: 'John',
    lastName: 'Doe',
    ...overrides,
  };
}

function createStablefordPlayer(
  overrides?: Partial<StablefordPlayer> & { playerOverrides?: Partial<Player> }
): StablefordPlayer {
  const { playerOverrides, ...rest } = overrides ?? {};
  return {
    player: createMockPlayer(playerOverrides),
    courseHandicap: 0,
    strokesPerHole: Array(18).fill(0),
    ...rest,
  };
}

/** All par-4 course */
const ALL_PAR_4 = Array(18).fill(4);

const NO_STROKES = Array(18).fill(0);

// ============================================
// scoreStablefordHole
// ============================================

describe('scoreStablefordHole', () => {
  describe('standard scoring – all point tiers', () => {
    it('awards 8 points for double eagle (albatross)', () => {
      const result = scoreStablefordHole(1, 5, 2, 0);
      expect(result.stablefordPoints).toBe(8);
    });

    it('awards 5 points for eagle', () => {
      const result = scoreStablefordHole(1, 4, 2, 0);
      expect(result.stablefordPoints).toBe(5);
    });

    it('awards 4 points for birdie', () => {
      const result = scoreStablefordHole(1, 4, 3, 0);
      expect(result.stablefordPoints).toBe(4);
    });

    it('awards 2 points for par', () => {
      const result = scoreStablefordHole(1, 4, 4, 0);
      expect(result.stablefordPoints).toBe(2);
    });

    it('awards 1 point for bogey', () => {
      const result = scoreStablefordHole(1, 4, 5, 0);
      expect(result.stablefordPoints).toBe(1);
    });

    it('awards 0 points for double bogey or worse', () => {
      expect(scoreStablefordHole(1, 4, 6, 0).stablefordPoints).toBe(0);
      expect(scoreStablefordHole(1, 4, 7, 0).stablefordPoints).toBe(0);
    });
  });

  describe('with strokes received (net scoring)', () => {
    it('uses net score when scoringMode is net (default)', () => {
      // Gross 5 on par 4 = bogey gross, but with 1 stroke received net is 4 = par
      const result = scoreStablefordHole(1, 4, 5, 1);
      expect(result.netScore).toBe(4);
      expect(result.stablefordPoints).toBe(2); // par
    });

    it('uses net score with 2 strokes received', () => {
      // Gross 6 on par 4, 2 strokes → net 4 = par
      const result = scoreStablefordHole(1, 4, 6, 2);
      expect(result.netScore).toBe(4);
      expect(result.stablefordPoints).toBe(2);
    });
  });

  describe('gross scoring mode', () => {
    it('ignores strokes received for point calculation', () => {
      // Gross 5 on par 4 with 1 stroke, but gross mode → uses gross = bogey = 1pt
      const result = scoreStablefordHole(1, 4, 5, 1, { scoringMode: 'gross' });
      expect(result.grossScore).toBe(5);
      expect(result.netScore).toBe(4); // still computed
      expect(result.stablefordPoints).toBe(1); // bogey based on gross
    });

    it('awards eagle points on gross eagle regardless of strokes', () => {
      const result = scoreStablefordHole(1, 4, 2, 1, { scoringMode: 'gross' });
      expect(result.stablefordPoints).toBe(5); // eagle on gross
    });
  });

  describe('hole metadata', () => {
    it('returns correct holeNumber, par, grossScore, netScore, strokesReceived', () => {
      const result = scoreStablefordHole(7, 3, 4, 1);
      expect(result.holeNumber).toBe(7);
      expect(result.par).toBe(3);
      expect(result.grossScore).toBe(4);
      expect(result.netScore).toBe(3);
      expect(result.strokesReceived).toBe(1);
    });
  });
});

// ============================================
// calculateStablefordRound
// ============================================

describe('calculateStablefordRound', () => {
  it('calculates full 18-hole round (all pars)', () => {
    const player = createStablefordPlayer();
    const scores = Array(18).fill(4); // par on every hole
    const result = calculateStablefordRound(player, scores, ALL_PAR_4);

    expect(result.totalPoints).toBe(36); // 2 per hole × 18
    expect(result.totalGross).toBe(72);
    expect(result.totalNet).toBe(72);
    expect(result.frontNinePoints).toBe(18);
    expect(result.backNinePoints).toBe(18);
    expect(result.holeScores).toHaveLength(18);
    expect(result.playerId).toBe('player-1');
    expect(result.playerName).toBe('John Doe');
  });

  it('calculates mixed scoring round', () => {
    const player = createStablefordPlayer();
    // 9 birdies (3) then 9 bogeys (5) on all par-4 course
    const scores = [...Array(9).fill(3), ...Array(9).fill(5)];
    const result = calculateStablefordRound(player, scores, ALL_PAR_4);

    expect(result.frontNinePoints).toBe(36); // 4 pts × 9
    expect(result.backNinePoints).toBe(9);   // 1 pt × 9
    expect(result.totalPoints).toBe(45);
  });

  it('handles partial round with nulls', () => {
    const player = createStablefordPlayer();
    // Only first 9 holes played (pars), back 9 null
    const scores: (number | null)[] = [...Array(9).fill(4), ...Array(9).fill(null)];
    const result = calculateStablefordRound(player, scores, ALL_PAR_4);

    expect(result.frontNinePoints).toBe(18); // 2 × 9
    expect(result.backNinePoints).toBe(0);
    expect(result.totalPoints).toBe(18);
    expect(result.totalGross).toBe(36); // only front 9 counted
  });

  it('null holes produce 0 points with placeholder scores', () => {
    const player = createStablefordPlayer();
    const scores: (number | null)[] = [null, ...Array(17).fill(4)];
    const result = calculateStablefordRound(player, scores, ALL_PAR_4);

    expect(result.holeScores[0].grossScore).toBe(0);
    expect(result.holeScores[0].stablefordPoints).toBe(0);
    expect(result.totalPoints).toBe(34); // 2 × 17
  });

  it('front/back nine splits are correct', () => {
    const player = createStablefordPlayer();
    // Eagles on front 9 (score 2), double bogeys on back 9 (score 6)
    const scores = [...Array(9).fill(2), ...Array(9).fill(6)];
    const result = calculateStablefordRound(player, scores, ALL_PAR_4);

    expect(result.frontNinePoints).toBe(45); // 5 × 9
    expect(result.backNinePoints).toBe(0);   // 0 × 9
  });

  it('throws if scores or pars array is not 18 elements', () => {
    const player = createStablefordPlayer();
    expect(() => calculateStablefordRound(player, Array(9).fill(4), ALL_PAR_4)).toThrow();
    expect(() => calculateStablefordRound(player, Array(18).fill(4), Array(9).fill(4))).toThrow();
  });

  it('respects gross scoring mode', () => {
    const player = createStablefordPlayer({
      strokesPerHole: Array(18).fill(1),
    });
    // Gross 5 on par 4 with 1 stroke: net=4 (par), gross=5 (bogey)
    const scores = Array(18).fill(5);
    const result = calculateStablefordRound(player, scores, ALL_PAR_4, {
      scoringMode: 'gross',
    });

    expect(result.totalPoints).toBe(18); // 1 pt (bogey) × 18
  });
});

// ============================================
// buildStablefordLeaderboard
// ============================================

describe('buildStablefordLeaderboard', () => {
  function makeRoundScore(
    playerId: string,
    playerName: string,
    totalPoints: number,
    frontNinePoints: number,
    backNinePoints: number,
    holesPlayed: number = 18
  ): StablefordRoundScore {
    const holeScores = Array.from({ length: 18 }, (_, i) => ({
      holeNumber: i + 1,
      par: 4,
      grossScore: i < holesPlayed ? 4 : 0,
      netScore: i < holesPlayed ? 4 : 0,
      strokesReceived: 0,
      stablefordPoints: i < holesPlayed ? 2 : 0,
    }));
    return {
      playerId,
      playerName,
      holeScores,
      totalGross: holesPlayed * 4,
      totalNet: holesPlayed * 4,
      totalPoints,
      frontNinePoints,
      backNinePoints,
    };
  }

  it('sorts descending by totalPoints', () => {
    const scores = [
      makeRoundScore('p1', 'Alice', 30, 15, 15),
      makeRoundScore('p2', 'Bob', 40, 20, 20),
      makeRoundScore('p3', 'Charlie', 35, 18, 17),
    ];
    const board = buildStablefordLeaderboard(scores);

    expect(board[0].playerName).toBe('Bob');
    expect(board[1].playerName).toBe('Charlie');
    expect(board[2].playerName).toBe('Alice');
  });

  it('handles ties (same totalPoints)', () => {
    const scores = [
      makeRoundScore('p1', 'Alice', 36, 18, 18),
      makeRoundScore('p2', 'Bob', 36, 18, 18),
    ];
    const board = buildStablefordLeaderboard(scores);

    expect(board[0].totalPoints).toBe(36);
    expect(board[1].totalPoints).toBe(36);
  });

  it('calculates thruHole correctly', () => {
    const scores = [makeRoundScore('p1', 'Alice', 18, 18, 0, 9)];
    const board = buildStablefordLeaderboard(scores);

    expect(board[0].thruHole).toBe(9);
  });

  it('thruHole is 18 for completed round', () => {
    const scores = [makeRoundScore('p1', 'Alice', 36, 18, 18, 18)];
    const board = buildStablefordLeaderboard(scores);

    expect(board[0].thruHole).toBe(18);
  });

  it('preserves front/back nine points', () => {
    const scores = [makeRoundScore('p1', 'Alice', 36, 20, 16)];
    const board = buildStablefordLeaderboard(scores);

    expect(board[0].frontNinePoints).toBe(20);
    expect(board[0].backNinePoints).toBe(16);
  });
});

// ============================================
// calculateTeamBestBallStableford
// ============================================

describe('calculateTeamBestBallStableford', () => {
  function makeTeamRound(
    playerName: string,
    pointsPerHole: number[]
  ): StablefordRoundScore {
    return {
      playerId: playerName,
      playerName,
      holeScores: pointsPerHole.map((pts, i) => ({
        holeNumber: i + 1,
        par: 4,
        grossScore: 4,
        netScore: 4,
        strokesReceived: 0,
        stablefordPoints: pts,
      })),
      totalGross: 72,
      totalNet: 72,
      totalPoints: pointsPerHole.reduce((a, b) => a + b, 0),
      frontNinePoints: pointsPerHole.slice(0, 9).reduce((a, b) => a + b, 0),
      backNinePoints: pointsPerHole.slice(9).reduce((a, b) => a + b, 0),
    };
  }

  it('picks the best score per hole from team members', () => {
    const alice = makeTeamRound('Alice', [
      4, 0, 2, 1, 2, 0, 4, 2, 1, // front
      2, 2, 2, 2, 2, 2, 2, 2, 2, // back
    ]);
    const bob = makeTeamRound('Bob', [
      2, 4, 2, 2, 0, 4, 2, 1, 2, // front
      2, 2, 2, 2, 2, 2, 2, 2, 2, // back
    ]);
    const result = calculateTeamBestBallStableford([alice, bob]);

    // Best per hole front: 4, 4, 2, 2, 2, 4, 4, 2, 2 = 26
    // Best per hole back: all 2s = 18
    expect(result.totalPoints).toBe(44);
    expect(result.holePoints[0]).toBe(4); // Alice
    expect(result.holePoints[1]).toBe(4); // Bob
    expect(result.bestPlayerPerHole[0]).toBe('Alice');
    expect(result.bestPlayerPerHole[1]).toBe('Bob');
  });

  it('handles ties on a hole (picks first encountered)', () => {
    const alice = makeTeamRound('Alice', Array(18).fill(2));
    const bob = makeTeamRound('Bob', Array(18).fill(2));
    const result = calculateTeamBestBallStableford([alice, bob]);

    expect(result.totalPoints).toBe(36);
    // First player with best score wins (Alice scanned first, > not >=)
    expect(result.bestPlayerPerHole[0]).toBe('Alice');
  });

  it('handles all zeros from both players', () => {
    const alice = makeTeamRound('Alice', Array(18).fill(0));
    const bob = makeTeamRound('Bob', Array(18).fill(0));
    const result = calculateTeamBestBallStableford([alice, bob]);

    expect(result.totalPoints).toBe(0);
    // When all 0, no player beats 0 (strict >), so bestPlayer stays ''
    expect(result.bestPlayerPerHole[0]).toBe('');
  });
});

// ============================================
// getPointsDisplay
// ============================================

describe('getPointsDisplay', () => {
  it('returns eagle display for 5+ points', () => {
    const result = getPointsDisplay(5);
    expect(result.text).toBe('+5');
    expect(result.className).toBe('eagle');
  });

  it('returns eagle display for 8 points (albatross)', () => {
    const result = getPointsDisplay(8);
    expect(result.text).toBe('+8');
    expect(result.className).toBe('eagle');
  });

  it('returns birdie display for 4 points', () => {
    const result = getPointsDisplay(4);
    expect(result.text).toBe('+4');
    expect(result.className).toBe('birdie');
  });

  it('returns par display for 2 points', () => {
    const result = getPointsDisplay(2);
    expect(result.text).toBe('+2');
    expect(result.className).toBe('par');
  });

  it('returns bogey display for 1 point', () => {
    const result = getPointsDisplay(1);
    expect(result.text).toBe('+1');
    expect(result.className).toBe('bogey');
  });

  it('returns double display for 0 points', () => {
    const result = getPointsDisplay(0);
    expect(result.text).toBe('0');
    expect(result.className).toBe('double');
  });

  it('returns double display for negative points', () => {
    const result = getPointsDisplay(-1);
    expect(result.text).toBe('0');
    expect(result.className).toBe('double');
  });
});

// ============================================
// formatStablefordComparison
// ============================================

describe('formatStablefordComparison', () => {
  function makeScore(name: string, points: number): StablefordRoundScore {
    return {
      playerId: name.toLowerCase(),
      playerName: name,
      holeScores: [],
      totalGross: 72,
      totalNet: 72,
      totalPoints: points,
      frontNinePoints: 0,
      backNinePoints: 0,
    };
  }

  it('returns Tied when scores are equal', () => {
    expect(formatStablefordComparison(makeScore('Alice', 36), makeScore('Bob', 36))).toBe('Tied');
  });

  it('returns A leads when A has more points', () => {
    expect(formatStablefordComparison(makeScore('Alice', 40), makeScore('Bob', 36))).toBe(
      'Alice leads by 4'
    );
  });

  it('returns B leads when B has more points', () => {
    expect(formatStablefordComparison(makeScore('Alice', 30), makeScore('Bob', 36))).toBe(
      'Bob leads by 6'
    );
  });

  it('handles single point difference', () => {
    expect(formatStablefordComparison(makeScore('Alice', 37), makeScore('Bob', 36))).toBe(
      'Alice leads by 1'
    );
  });
});
