import { describe, expect, it } from 'vitest';
import {
  buildSkinsSettlementResults,
  buildTripSettlementSummary,
  getSettlementActivitySummary,
} from '../lib/services/tripSettlementService';
import type { Player, SideBet } from '../lib/types/models';
import type { HammerGame, NassauEnhanced, VegasGame, WolfGame } from '../lib/types/sideGames';

const PLAYERS: Player[] = [
  { id: 'p1', firstName: 'Tiger', lastName: 'Woods' },
  { id: 'p2', firstName: 'Phil', lastName: 'Mickelson' },
  { id: 'p3', firstName: 'Rory', lastName: 'McIlroy' },
  { id: 'p4', firstName: 'Scottie', lastName: 'Scheffler' },
];

function createSideBet(overrides: Partial<SideBet>): SideBet {
  return {
    id: overrides.id ?? crypto.randomUUID(),
    tripId: overrides.tripId ?? 'trip-1',
    type: overrides.type ?? 'skins',
    name: overrides.name ?? 'Skins',
    description: overrides.description ?? 'Side game',
    status: overrides.status ?? 'active',
    participantIds: overrides.participantIds ?? PLAYERS.map((player) => player.id),
    createdAt: overrides.createdAt ?? '2026-03-11T12:00:00.000Z',
    ...overrides,
  };
}

function createWolfGame(status: WolfGame['status']): WolfGame {
  return {
    id: crypto.randomUUID(),
    tripId: 'trip-1',
    name: 'Wolf',
    buyIn: 20,
    playerIds: PLAYERS.map((player) => player.id),
    rotation: PLAYERS.map((player) => player.id),
    currentWolfIndex: 0,
    pigAvailable: true,
    holeResults: [],
    standings: [],
    status,
    createdAt: '2026-03-11T12:00:00.000Z',
  };
}

describe('tripSettlementService', () => {
  describe('buildSkinsSettlementResults', () => {
    it('only converts completed skins bets with a winner into settlement rows', () => {
      const results = buildSkinsSettlementResults([
        createSideBet({
          status: 'completed',
          pot: 40,
          winnerId: 'p1',
        }),
        createSideBet({
          id: 'pending-skins',
          status: 'pending',
          pot: 40,
          winnerId: 'p2',
        }),
        createSideBet({
          id: 'custom-complete',
          type: 'custom',
          status: 'completed',
          pot: 25,
          winnerId: 'p3',
        }),
      ]);

      expect(results).toEqual([
        { playerId: 'p1', amount: 30 },
        { playerId: 'p2', amount: -10 },
        { playerId: 'p3', amount: -10 },
        { playerId: 'p4', amount: -10 },
      ]);
    });
  });

  describe('getSettlementActivitySummary', () => {
    it('ignores active games and non-completed side bets', () => {
      const summary = getSettlementActivitySummary({
        wolfGames: [createWolfGame('active')],
        vegasGames: [] as VegasGame[],
        hammerGames: [] as HammerGame[],
        nassauGames: [] as NassauEnhanced[],
        sideBets: [
          createSideBet({ status: 'active', pot: 40, winnerId: 'p1' }),
          createSideBet({ status: 'completed', type: 'custom', pot: 25, winnerId: 'p2' }),
        ],
      });

      expect(summary.completedGames).toBe(0);
      expect(summary.completedSkinsBets).toBe(0);
      expect(summary.hasSettleableActivity).toBe(false);
    });

    it('counts completed core games and completed skins bets', () => {
      const summary = getSettlementActivitySummary({
        wolfGames: [createWolfGame('completed')],
        vegasGames: [] as VegasGame[],
        hammerGames: [] as HammerGame[],
        nassauGames: [] as NassauEnhanced[],
        sideBets: [
          createSideBet({ status: 'completed', pot: 40, winnerId: 'p1' }),
        ],
      });

      expect(summary.completedGames).toBe(1);
      expect(summary.completedSkinsBets).toBe(1);
      expect(summary.hasSettleableActivity).toBe(true);
    });
  });

  describe('buildTripSettlementSummary', () => {
    it('settles only completed games and supported skins results', () => {
      const settlement = buildTripSettlementSummary({
        tripId: 'trip-1',
        wolfGames: [createWolfGame('active')],
        vegasGames: [] as VegasGame[],
        hammerGames: [] as HammerGame[],
        nassauGames: [] as NassauEnhanced[],
        sideBets: [
          createSideBet({ status: 'completed', pot: 40, winnerId: 'p1' }),
          createSideBet({ id: 'ignored-active', status: 'active', pot: 50, winnerId: 'p2' }),
        ],
        players: PLAYERS,
      });

      const winnerBalance = settlement.playerBalances.find((balance) => balance.playerId === 'p1');
      const loserBalance = settlement.playerBalances.find((balance) => balance.playerId === 'p2');

      expect(settlement.totalPot).toBe(30);
      expect(winnerBalance?.netAmount).toBe(30);
      expect(loserBalance?.netAmount).toBe(-10);
      expect(settlement.transactions.length).toBeGreaterThan(0);
    });
  });
});
