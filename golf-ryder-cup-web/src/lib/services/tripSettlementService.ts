import { generateTripSettlement } from '@/lib/services/extendedSideGamesService';
import type { Player, SideBet } from '@/lib/types/models';
import type {
  HammerGame,
  NassauEnhanced,
  TripSettlementSummary,
  VegasGame,
  WolfGame,
} from '@/lib/types/sideGames';
import { normalizeSkinsResults } from '@/lib/utils/sideBetLedger';

type SkinsSettlementResult = {
  playerId: Player['id'];
  amount: number;
};

interface SettlementActivitySummary {
  completedGames: number;
  completedSkinsBets: number;
  hasSettleableActivity: boolean;
}

interface TripSettlementSourceData {
  tripId: string;
  wolfGames: WolfGame[];
  vegasGames: VegasGame[];
  hammerGames: HammerGame[];
  nassauGames: NassauEnhanced[];
  sideBets: SideBet[];
  players: Player[];
}

function isCompletedGame<T extends { status: string }>(game: T): boolean {
  return game.status === 'completed';
}

export function buildSkinsSettlementResults(sideBets: SideBet[]): SkinsSettlementResult[] {
  return sideBets
    .filter(
      (bet) =>
        bet.type === 'skins' &&
        bet.status === 'completed' &&
        bet.participantIds.length > 0 &&
        (bet.pot || 0) > 0 &&
        (Boolean(bet.winnerId) || (bet.results ?? []).some((r) => r.winnerId))
    )
    .flatMap((bet) => {
      const pot = bet.pot || 0;
      const share = pot / bet.participantIds.length;
      const perHoleResults = (bet.results ?? []).filter((r) => r.winnerId);

      // Preferred: distribute by the per-hole ledger so multi-winner skins
      // and unresolved carryover at trip end both settle correctly. Any
      // unwon carryover is effectively refunded because `actualShare` is
      // only the portion of the pot that was actually paid out.
      if (perHoleResults.length > 0) {
        const perHole = bet.perHole || Math.round(pot / 18);
        const normalized = normalizeSkinsResults(bet.results ?? [], perHole);
        const winnings = new Map<string, number>();
        for (const id of bet.participantIds) winnings.set(id, 0);
        for (const entry of normalized) {
          if (!entry.winnerId) continue;
          winnings.set(entry.winnerId, (winnings.get(entry.winnerId) ?? 0) + entry.amount);
        }
        const totalDistributed = Array.from(winnings.values()).reduce((sum, v) => sum + v, 0);
        const actualShare = totalDistributed / bet.participantIds.length;
        return bet.participantIds.map((playerId) => ({
          playerId,
          amount: (winnings.get(playerId) ?? 0) - actualShare,
        }));
      }

      // Fallback: captain picked an overall winner without recording per-hole
      // ledger entries. Winner takes the pot, everyone else loses their share.
      return bet.participantIds.map((playerId) => ({
        playerId,
        amount: playerId === bet.winnerId ? pot - share : -share,
      }));
    });
}

export function getSettlementActivitySummary({
  wolfGames,
  vegasGames,
  hammerGames,
  nassauGames,
  sideBets,
}: Omit<TripSettlementSourceData, 'tripId' | 'players'>): SettlementActivitySummary {
  const completedGames =
    wolfGames.filter(isCompletedGame).length +
    vegasGames.filter(isCompletedGame).length +
    hammerGames.filter(isCompletedGame).length +
    nassauGames.filter(isCompletedGame).length;
  const completedSkinsBets = sideBets.filter(
    (bet) =>
      bet.type === 'skins' &&
      bet.status === 'completed' &&
      bet.participantIds.length > 0 &&
      (bet.pot || 0) > 0 &&
      (Boolean(bet.winnerId) || (bet.results ?? []).some((r) => r.winnerId))
  ).length;

  return {
    completedGames,
    completedSkinsBets,
    hasSettleableActivity: completedGames + completedSkinsBets > 0,
  };
}

export function buildTripSettlementSummary({
  tripId,
  wolfGames,
  vegasGames,
  hammerGames,
  nassauGames,
  sideBets,
  players,
}: TripSettlementSourceData): TripSettlementSummary {
  return generateTripSettlement(
    tripId,
    wolfGames.filter(isCompletedGame),
    vegasGames.filter(isCompletedGame),
    hammerGames.filter(isCompletedGame),
    nassauGames.filter(isCompletedGame),
    buildSkinsSettlementResults(sideBets),
    players
  );
}
