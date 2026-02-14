/**
 * Extended Side Games Service Tests
 *
 * Comprehensive tests for Wolf, Vegas, Hammer, Nassau, and settlement calculations.
 * These games involve real money between friends — the math must be correct.
 */

import { describe, it, expect } from 'vitest';
import {
  // Wolf
  createWolfGame,
  getWolfForHole,
  wolfChoosesPartner,
  recordWolfHoleResult,
  calculateWolfPayouts,
  // Vegas
  createVegasGame,
  calculateVegasNumber,
  recordVegasHoleResult,
  calculateVegasPayouts,
  // Hammer
  createHammerGame,
  processHammerAction,
  completeHammerHole,
  calculateHammerPayouts,
  // Nassau
  createNassauEnhanced,
  recordNassauHoleResult,
  addManualPress,
  calculateNassauPayouts,
  // Settlement
  generateTripSettlement,
  generateVenmoLink,
  generatePayPalLink,
  generateZelleInfo,
} from '@/lib/services/extendedSideGamesService';
import type { Player } from '@/lib/types/models';

// ============================================
// TEST HELPERS
// ============================================

const PLAYER_IDS = ['p1', 'p2', 'p3', 'p4'] as const;

const PLAYERS: Player[] = [
  { id: 'p1', tripId: 'trip1', firstName: 'Tiger', lastName: 'Woods', team: 'usa', createdAt: '' },
  { id: 'p2', tripId: 'trip1', firstName: 'Phil', lastName: 'Mickelson', team: 'usa', createdAt: '' },
  { id: 'p3', tripId: 'trip1', firstName: 'Rory', lastName: 'McIlroy', team: 'europe', createdAt: '' },
  { id: 'p4', tripId: 'trip1', firstName: 'Jon', lastName: 'Rahm', team: 'europe', createdAt: '' },
] as Player[];

// ============================================
// WOLF GAME TESTS
// ============================================

describe('Wolf Game', () => {
  describe('createWolfGame', () => {
    it('creates a valid 4-player wolf game', () => {
      const game = createWolfGame('trip1', 'Wolf', 20, [...PLAYER_IDS]);
      expect(game.playerIds).toHaveLength(4);
      expect(game.rotation).toHaveLength(4);
      expect(game.standings).toHaveLength(4);
      expect(game.status).toBe('setup');
      expect(game.buyIn).toBe(20);
      expect(game.pigAvailable).toBe(true);
      expect(game.holeResults).toHaveLength(0);
    });

    it('throws if not exactly 4 players', () => {
      expect(() => createWolfGame('trip1', 'Wolf', 20, ['p1', 'p2', 'p3'])).toThrow(
        'Wolf requires exactly 4 players'
      );
    });

    it('initializes all standings at zero', () => {
      const game = createWolfGame('trip1', 'Wolf', 20, [...PLAYER_IDS]);
      for (const standing of game.standings) {
        expect(standing.points).toBe(0);
        expect(standing.wolvesPlayed).toBe(0);
        expect(standing.loneWolfAttempts).toBe(0);
        expect(standing.loneWolfWins).toBe(0);
      }
    });
  });

  describe('getWolfForHole', () => {
    it('rotates through players every 4 holes', () => {
      const game = createWolfGame('trip1', 'Wolf', 20, [...PLAYER_IDS]);
      // Rotation is randomized, but the pattern should repeat
      const wolf1 = getWolfForHole(game, 1);
      const wolf5 = getWolfForHole(game, 5);
      const wolf9 = getWolfForHole(game, 9);
      expect(wolf1).toBe(wolf5); // Same wolf on holes 1 and 5
      expect(wolf1).toBe(wolf9); // Same wolf on holes 1 and 9
    });

    it('each player gets one wolf turn per 4 holes', () => {
      const game = createWolfGame('trip1', 'Wolf', 20, [...PLAYER_IDS]);
      const wolves = [1, 2, 3, 4].map((h) => getWolfForHole(game, h));
      // All 4 players should appear exactly once
      const unique = new Set(wolves);
      expect(unique.size).toBe(4);
    });
  });

  describe('wolfChoosesPartner', () => {
    it('sets game status to active and tracks wolf stats', () => {
      let game = createWolfGame('trip1', 'Wolf', 20, [...PLAYER_IDS]);
      const wolf = getWolfForHole(game, 1);
      const partner = game.playerIds.find((id) => id !== wolf)!;

      game = wolfChoosesPartner(game, 1, wolf, partner, false);
      expect(game.status).toBe('active');
      const wolfStanding = game.standings.find((s) => s.playerId === wolf);
      expect(wolfStanding!.wolvesPlayed).toBe(1);
      expect(wolfStanding!.loneWolfAttempts).toBe(0);
    });

    it('tracks lone wolf attempts', () => {
      let game = createWolfGame('trip1', 'Wolf', 20, [...PLAYER_IDS]);
      const wolf = getWolfForHole(game, 1);

      game = wolfChoosesPartner(game, 1, wolf, undefined, false);
      const wolfStanding = game.standings.find((s) => s.playerId === wolf);
      expect(wolfStanding!.loneWolfAttempts).toBe(1);
    });

    it('tracks pig attempts', () => {
      let game = createWolfGame('trip1', 'Wolf', 20, [...PLAYER_IDS]);
      const wolf = getWolfForHole(game, 1);

      game = wolfChoosesPartner(game, 1, wolf, undefined, true);
      const wolfStanding = game.standings.find((s) => s.playerId === wolf);
      expect(wolfStanding!.pigAttempts).toBe(1);
    });
  });

  describe('recordWolfHoleResult', () => {
    it('scores wolf team winning a normal hole', () => {
      let game = createWolfGame('trip1', 'Wolf', 20, [...PLAYER_IDS]);
      const wolf = getWolfForHole(game, 1);
      const partner = game.playerIds.find((id) => id !== wolf)!;

      game = wolfChoosesPartner(game, 1, wolf, partner, false);
      game = recordWolfHoleResult(game, 1, wolf, partner, false, 4, 5);

      const result = game.holeResults.find((r) => r.holeNumber === 1);
      expect(result!.winner).toBe('wolf');
    });

    it('scores pack winning', () => {
      let game = createWolfGame('trip1', 'Wolf', 20, [...PLAYER_IDS]);
      const wolf = getWolfForHole(game, 1);
      const partner = game.playerIds.find((id) => id !== wolf)!;

      game = wolfChoosesPartner(game, 1, wolf, partner, false);
      game = recordWolfHoleResult(game, 1, wolf, partner, false, 5, 4);

      const result = game.holeResults.find((r) => r.holeNumber === 1);
      expect(result!.winner).toBe('pack');
    });

    it('scores a push (tied hole)', () => {
      let game = createWolfGame('trip1', 'Wolf', 20, [...PLAYER_IDS]);
      const wolf = getWolfForHole(game, 1);
      const partner = game.playerIds.find((id) => id !== wolf)!;

      game = wolfChoosesPartner(game, 1, wolf, partner, false);
      game = recordWolfHoleResult(game, 1, wolf, partner, false, 4, 4);

      const result = game.holeResults.find((r) => r.holeNumber === 1);
      expect(result!.winner).toBe('push');
      expect(result!.pointsExchanged).toBe(0);
    });
  });

  describe('calculateWolfPayouts', () => {
    it('returns zero payouts for game with no results', () => {
      const game = createWolfGame('trip1', 'Wolf', 20, [...PLAYER_IDS]);
      const payouts = calculateWolfPayouts(game, PLAYERS);
      expect(payouts).toHaveLength(4);
      for (const p of payouts) {
        expect(p.netPoints).toBe(0);
        expect(p.netAmount).toBe(0);
      }
    });

    it('wolf team earns points and pack loses on wolf win', () => {
      let game = createWolfGame('trip1', 'Wolf', 20, [...PLAYER_IDS]);
      const wolf = getWolfForHole(game, 1);
      const partner = game.playerIds.find((id) => id !== wolf)!;

      game = recordWolfHoleResult(game, 1, wolf, partner, false, 3, 5);

      const payouts = calculateWolfPayouts(game, PLAYERS);
      const wolfPayout = payouts.find((p) => p.playerId === wolf);
      const partnerPayout = payouts.find((p) => p.playerId === partner);

      // Wolf wins from 2 opponents, partner from pack
      expect(wolfPayout!.netAmount).toBeGreaterThan(0);
      expect(partnerPayout!.netAmount).toBeGreaterThan(0);

      // Pack players lose
      const packPayouts = payouts.filter(
        (p) => p.playerId !== wolf && p.playerId !== partner
      );
      for (const p of packPayouts) {
        expect(p.netAmount).toBeLessThan(0);
      }
    });
  });
});

// ============================================
// VEGAS GAME TESTS
// ============================================

describe('Vegas Game', () => {
  describe('createVegasGame', () => {
    it('creates a valid 2v2 vegas game', () => {
      const game = createVegasGame('trip1', 'Vegas', 1, ['p1', 'p2'], ['p3', 'p4']);
      expect(game.team1PlayerIds).toEqual(['p1', 'p2']);
      expect(game.team2PlayerIds).toEqual(['p3', 'p4']);
      expect(game.pointValue).toBe(1);
      expect(game.holeResults).toHaveLength(0);
      expect(game.runningScore).toBe(0);
      expect(game.status).toBe('setup');
    });
  });

  describe('calculateVegasNumber', () => {
    it('forms correct vegas number from two scores', () => {
      // Lower score first: 4 and 5 → 45
      expect(calculateVegasNumber(4, 5, false)).toBe(45);
      // Lower score first: 3 and 6 → 36
      expect(calculateVegasNumber(3, 6, false)).toBe(36);
      // Same scores: 4 and 4 → 44
      expect(calculateVegasNumber(4, 4, false)).toBe(44);
    });

    it('flips scores when flip is enabled (higher first)', () => {
      // With flip: 4 and 5 → 54 (higher first)
      expect(calculateVegasNumber(4, 5, true)).toBe(54);
      // With flip: 3 and 6 → 63
      expect(calculateVegasNumber(3, 6, true)).toBe(63);
    });

    it('same scores are unaffected by flip', () => {
      expect(calculateVegasNumber(4, 4, true)).toBe(44);
      expect(calculateVegasNumber(4, 4, false)).toBe(44);
    });
  });

  describe('recordVegasHoleResult', () => {
    it('records a hole result and updates running score', () => {
      let game = createVegasGame('trip1', 'Vegas', 1, ['p1', 'p2'], ['p3', 'p4']);
      // Team 1 shoots 4,5 (45) vs Team 2 shoots 5,6 (56) → diff = 11 in favor of team1
      game = recordVegasHoleResult(game, 1, [4, 5], [5, 6]);

      expect(game.holeResults).toHaveLength(1);
      const result = game.holeResults[0];
      expect(result.team1Vegas).toBe(45);
      expect(result.team2Vegas).toBe(56);
      expect(result.pointDiff).toBe(56 - 45); // 11 points to team1
    });

    it('handles team 2 winning a hole', () => {
      let game = createVegasGame('trip1', 'Vegas', 1, ['p1', 'p2'], ['p3', 'p4']);
      // Team 1: 6,7 (67), Team 2: 3,4 (34) → diff = -33 (team2 wins)
      game = recordVegasHoleResult(game, 1, [6, 7], [3, 4]);

      const result = game.holeResults[0];
      expect(result.team1Vegas).toBe(67);
      expect(result.team2Vegas).toBe(34);
    });

    it('handles tied holes', () => {
      let game = createVegasGame('trip1', 'Vegas', 1, ['p1', 'p2'], ['p3', 'p4']);
      // Both teams: 4,5 (45) → push
      game = recordVegasHoleResult(game, 1, [4, 5], [4, 5]);

      const result = game.holeResults[0];
      expect(result.team1Vegas).toBe(result.team2Vegas);
      expect(result.pointDiff).toBe(0);
    });
  });

  describe('calculateVegasPayouts', () => {
    it('returns push for game with no results', () => {
      const game = createVegasGame('trip1', 'Vegas', 1, ['p1', 'p2'], ['p3', 'p4']);
      const payouts = calculateVegasPayouts(game, PLAYERS);
      expect(payouts.settlementAmount).toBe(0);
      expect(payouts.winningTeam).toBe('push');
    });

    it('calculates correct settlement over multiple holes', () => {
      let game = createVegasGame('trip1', 'Vegas', 1, ['p1', 'p2'], ['p3', 'p4']);

      // Hole 1: Team 1 (45) vs Team 2 (56) → +11 for team1
      game = recordVegasHoleResult(game, 1, [4, 5], [5, 6]);
      // Hole 2: Team 1 (56) vs Team 2 (34) → -22 for team1
      game = recordVegasHoleResult(game, 2, [5, 6], [3, 4]);

      const payouts = calculateVegasPayouts(game, PLAYERS);
      expect(payouts.breakdown).toHaveLength(2);
      // Net: 11 - 22 = -11, so team2 wins
      expect(payouts.winningTeam).toBe('team2');
    });
  });
});

// ============================================
// HAMMER GAME TESTS
// ============================================

describe('Hammer Game', () => {
  describe('createHammerGame', () => {
    it('creates a valid hammer game', () => {
      const game = createHammerGame('trip1', 'Hammer', 2, ['p1', 'p2'], ['p3', 'p4']);
      expect(game.startingValue).toBe(2);
      expect(game.currentValue).toBe(2);
      expect(game.holeResults).toHaveLength(0);
      expect(game.runningScore).toBe(0);
    });
  });

  describe('processHammerAction', () => {
    it('doubles the value when a hammer is thrown', () => {
      const game = createHammerGame('trip1', 'Hammer', 2, ['p1', 'p2'], ['p3', 'p4']);
      const { game: updated } = processHammerAction(game, 1, 'team1', 'hammer');
      expect(updated.currentValue).toBe(4); // Doubled from 2
    });

    it('accepting a hammer keeps the doubled value', () => {
      let game = createHammerGame('trip1', 'Hammer', 2, ['p1', 'p2'], ['p3', 'p4']);
      ({ game } = processHammerAction(game, 1, 'team1', 'hammer'));
      const { game: accepted } = processHammerAction(game, 1, 'team2', 'accept');
      expect(accepted.currentValue).toBe(4); // Still doubled
    });

    it('declining a hammer completes the hole', () => {
      let game = createHammerGame('trip1', 'Hammer', 2, ['p1', 'p2'], ['p3', 'p4']);
      ({ game } = processHammerAction(game, 1, 'team1', 'hammer'));
      const { game: declined, holeComplete, winner } = processHammerAction(
        game,
        1,
        'team2',
        'decline'
      );
      expect(holeComplete).toBe(true);
      expect(winner).toBe('team1'); // Hammering team wins on decline
      expect(declined.holeResults).toHaveLength(1);
    });
  });

  describe('completeHammerHole', () => {
    it('records hole result based on scores after hammer accepted', () => {
      let game = createHammerGame('trip1', 'Hammer', 2, ['p1', 'p2'], ['p3', 'p4']);
      // Must first create hole via processHammerAction, then complete with scores
      ({ game } = processHammerAction(game, 1, 'team1', 'hammer'));
      ({ game } = processHammerAction(game, 1, 'team2', 'accept'));
      game = completeHammerHole(game, 1, 4, 5);
      expect(game.holeResults).toHaveLength(1);
      expect(game.holeResults[0].winner).toBe('team1'); // Lower score wins
    });

    it('records halved hole', () => {
      let game = createHammerGame('trip1', 'Hammer', 2, ['p1', 'p2'], ['p3', 'p4']);
      ({ game } = processHammerAction(game, 1, 'team1', 'hammer'));
      ({ game } = processHammerAction(game, 1, 'team2', 'accept'));
      game = completeHammerHole(game, 1, 4, 4);
      expect(game.holeResults[0].winner).toBe('halved');
    });

    it('does not overwrite a declined hole result', () => {
      let game = createHammerGame('trip1', 'Hammer', 2, ['p1', 'p2'], ['p3', 'p4']);
      ({ game } = processHammerAction(game, 1, 'team1', 'hammer'));
      ({ game } = processHammerAction(game, 1, 'team2', 'decline'));
      // Declining should set winner to team1; completing should not override
      game = completeHammerHole(game, 1, 6, 4);
      expect(game.holeResults[0].winner).toBe('team1');
    });
  });

  describe('calculateHammerPayouts', () => {
    it('returns push for game with no results', () => {
      const game = createHammerGame('trip1', 'Hammer', 2, ['p1', 'p2'], ['p3', 'p4']);
      const payouts = calculateHammerPayouts(game, PLAYERS);
      expect(payouts.netSettlement).toBe(0);
      expect(payouts.winningTeam).toBe('push');
    });

    it('calculates correct settlement after holes', () => {
      let game = createHammerGame('trip1', 'Hammer', 2, ['p1', 'p2'], ['p3', 'p4']);
      // Hole 1: hammer + accept, team1 wins
      ({ game } = processHammerAction(game, 1, 'team1', 'hammer'));
      ({ game } = processHammerAction(game, 1, 'team2', 'accept'));
      game = completeHammerHole(game, 1, 3, 5);
      // Hole 2: hammer + accept, team2 wins
      ({ game } = processHammerAction(game, 2, 'team2', 'hammer'));
      ({ game } = processHammerAction(game, 2, 'team1', 'accept'));
      game = completeHammerHole(game, 2, 6, 4);

      const payouts = calculateHammerPayouts(game, PLAYERS);
      // Both holes at doubled value (4), should cancel out
      expect(payouts.winningTeam).toBe('push');
    });
  });
});

// ============================================
// NASSAU GAME TESTS
// ============================================

describe('Nassau Game', () => {
  describe('createNassauEnhanced', () => {
    it('creates a valid nassau game', () => {
      const game = createNassauEnhanced('trip1', 'Nassau', 10, ['p1', 'p2'], ['p3', 'p4']);
      expect(game.baseValue).toBe(10);
      expect(game.team1PlayerIds).toEqual(['p1', 'p2']);
      expect(game.team2PlayerIds).toEqual(['p3', 'p4']);
      expect(game.frontNine.team1Holes).toBe(0);
      expect(game.frontNine.team2Holes).toBe(0);
      expect(game.backNine.team1Holes).toBe(0);
      expect(game.backNine.team2Holes).toBe(0);
      expect(game.overall.team1Total).toBe(0);
      expect(game.overall.team2Total).toBe(0);
      expect(game.presses).toHaveLength(0);
    });

    it('creates with auto-press enabled', () => {
      const game = createNassauEnhanced(
        'trip1',
        'Nassau',
        10,
        ['p1', 'p2'],
        ['p3', 'p4'],
        undefined,
        true,
        2
      );
      expect(game.autoPressEnabled).toBe(true);
      expect(game.autoPressThreshold).toBe(2);
    });
  });

  describe('recordNassauHoleResult', () => {
    it('records front nine hole correctly', () => {
      let game = createNassauEnhanced('trip1', 'Nassau', 10, ['p1', 'p2'], ['p3', 'p4']);
      // Hole 1: team1 wins (lower score)
      game = recordNassauHoleResult(game, 1, 4, 5);
      expect(game.frontNine.team1Holes).toBe(1);
      expect(game.frontNine.team2Holes).toBe(0);
      expect(game.overall.team1Total).toBe(1);
    });

    it('records back nine hole correctly', () => {
      let game = createNassauEnhanced('trip1', 'Nassau', 10, ['p1', 'p2'], ['p3', 'p4']);
      // Hole 10: team2 wins
      game = recordNassauHoleResult(game, 10, 5, 4);
      expect(game.backNine.team1Holes).toBe(0);
      expect(game.backNine.team2Holes).toBe(1);
      expect(game.overall.team2Total).toBe(1);
    });

    it('handles halved holes (same score)', () => {
      let game = createNassauEnhanced('trip1', 'Nassau', 10, ['p1', 'p2'], ['p3', 'p4']);
      game = recordNassauHoleResult(game, 1, 4, 4);
      expect(game.frontNine.team1Holes).toBe(0);
      expect(game.frontNine.team2Holes).toBe(0);
      expect(game.frontNine.halvesCount).toBe(1);
    });

    it('accumulates holes across the front nine', () => {
      let game = createNassauEnhanced('trip1', 'Nassau', 10, ['p1', 'p2'], ['p3', 'p4']);
      // Team1 wins holes 1-3
      game = recordNassauHoleResult(game, 1, 3, 5);
      game = recordNassauHoleResult(game, 2, 4, 5);
      game = recordNassauHoleResult(game, 3, 3, 4);
      // Team2 wins holes 4-5
      game = recordNassauHoleResult(game, 4, 5, 4);
      game = recordNassauHoleResult(game, 5, 6, 3);

      expect(game.frontNine.team1Holes).toBe(3);
      expect(game.frontNine.team2Holes).toBe(2);
      expect(game.overall.team1Total).toBe(3);
      expect(game.overall.team2Total).toBe(2);
    });
  });

  describe('addManualPress', () => {
    it('adds a manual press to front nine', () => {
      let game = createNassauEnhanced('trip1', 'Nassau', 10, ['p1', 'p2'], ['p3', 'p4']);
      game = addManualPress(game, 'front', 'team2', 4, 5);
      expect(game.presses).toHaveLength(1);
      expect(game.presses[0].nine).toBe('front');
      expect(game.presses[0].pressedByTeam).toBe('team2');
      expect(game.presses[0].startHole).toBe(4);
      expect(game.presses[0].value).toBe(5);
      expect(game.presses[0].isAuto).toBe(false);
    });

    it('uses base value if no custom value', () => {
      let game = createNassauEnhanced('trip1', 'Nassau', 10, ['p1', 'p2'], ['p3', 'p4']);
      game = addManualPress(game, 'back', 'team1', 13);
      expect(game.presses[0].value).toBe(10); // Uses baseValue
    });
  });

  describe('calculateNassauPayouts', () => {
    it('returns zero settlement for game with no results', () => {
      const game = createNassauEnhanced('trip1', 'Nassau', 10, ['p1', 'p2'], ['p3', 'p4']);
      const payouts = calculateNassauPayouts(game, PLAYERS);
      expect(payouts.netSettlement).toBe(0);
      expect(payouts.totalTeam1).toBe(0);
      expect(payouts.totalTeam2).toBe(0);
    });

    it('calculates correct 3-way nassau result', () => {
      let game = createNassauEnhanced('trip1', 'Nassau', 10, ['p1', 'p2'], ['p3', 'p4']);

      // Team1 dominates front nine: wins 5 holes
      for (let hole = 1; hole <= 5; hole++) {
        game = recordNassauHoleResult(game, hole, 3, 5);
      }
      // Team2 wins rest of front: 4 holes
      for (let hole = 6; hole <= 9; hole++) {
        game = recordNassauHoleResult(game, hole, 5, 3);
      }
      // Team2 dominates back nine
      for (let hole = 10; hole <= 18; hole++) {
        game = recordNassauHoleResult(game, hole, 5, 3);
      }

      const payouts = calculateNassauPayouts(game, PLAYERS);

      // Front nine: team1 wins (5-4)
      expect(payouts.frontNineResult.winner).toBe('team1');
      expect(payouts.frontNineResult.amount).toBe(10);

      // Back nine: team2 wins (0-9)
      expect(payouts.backNineResult.winner).toBe('team2');
      expect(payouts.backNineResult.amount).toBe(10);

      // Overall: team2 wins (5-13)
      expect(payouts.overallResult.winner).toBe('team2');
      expect(payouts.overallResult.amount).toBe(10);
    });
  });
});

// ============================================
// SETTLEMENT TESTS
// ============================================

describe('Settlement', () => {
  describe('generateTripSettlement', () => {
    it('generates empty settlement when no games played', () => {
      const settlement = generateTripSettlement('trip1', [], [], [], [], [], PLAYERS);
      expect(settlement.tripId).toBe('trip1');
      expect(settlement.totalPot).toBe(0);
      expect(settlement.transactions).toHaveLength(0);
      // No pending transactions means fully settled (vacuously true)
      expect(settlement.isFullySettled).toBe(true);
    });

    it('includes skins results in settlement', () => {
      const skinsResults = [
        { playerId: 'p1', amount: 30 },
        { playerId: 'p2', amount: -10 },
        { playerId: 'p3', amount: -10 },
        { playerId: 'p4', amount: -10 },
      ];
      const settlement = generateTripSettlement('trip1', [], [], [], [], skinsResults, PLAYERS);

      // P1 is owed money, P2-P4 owe money
      const p1Balance = settlement.playerBalances.find((b) => b.playerId === 'p1');
      expect(p1Balance).toBeDefined();
      expect(p1Balance!.netAmount).toBe(30);
    });

    it('net amounts across all players sum to zero', () => {
      const skinsResults = [
        { playerId: 'p1', amount: 50 },
        { playerId: 'p2', amount: -20 },
        { playerId: 'p3', amount: -15 },
        { playerId: 'p4', amount: -15 },
      ];
      const settlement = generateTripSettlement('trip1', [], [], [], [], skinsResults, PLAYERS);

      const total = settlement.playerBalances.reduce((sum, b) => sum + b.netAmount, 0);
      expect(total).toBeCloseTo(0, 2);
    });
  });

  describe('payment link generators', () => {
    it('generates a venmo deep link', () => {
      const link = generateVenmoLink('tiger', 25, 'Golf skins');
      expect(link).toContain('venmo://');
      expect(link).toContain('tiger');
      expect(link).toContain('25.00');
      expect(link).toContain('Golf%20skins');
    });

    it('generates a paypal.me link', () => {
      const link = generatePayPalLink('tiger-woods', 25);
      expect(link).toContain('paypal.me');
      expect(link).toContain('tiger-woods');
      expect(link).toContain('25.00');
    });

    it('generates zelle info preferring phone when provided', () => {
      const info = generateZelleInfo('tiger@golf.com', '555-1234', 25);
      // When phone is provided, it takes precedence
      expect(info).toContain('555-1234');
      expect(info).toContain('25.00');
    });

    it('generates zelle info with email when no phone', () => {
      const info = generateZelleInfo('tiger@golf.com', undefined, 25);
      expect(info).toContain('tiger@golf.com');
      expect(info).toContain('25.00');
    });
  });
});
