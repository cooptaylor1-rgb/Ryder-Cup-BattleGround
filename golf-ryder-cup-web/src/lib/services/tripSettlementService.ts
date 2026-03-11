import { generateTripSettlement } from '@/lib/services/extendedSideGamesService';
import type { Player, SideBet } from '@/lib/types/models';
import type {
  HammerGame,
  NassauEnhanced,
  TripSettlementSummary,
  VegasGame,
  WolfGame,
} from '@/lib/types/sideGames';

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
        Boolean(bet.winnerId) &&
        bet.participantIds.length > 0 &&
        (bet.pot || 0) > 0
    )
    .flatMap((bet) => {
      const pot = bet.pot || 0;
      const share = pot / bet.participantIds.length;

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
      Boolean(bet.winnerId) &&
      bet.participantIds.length > 0 &&
      (bet.pot || 0) > 0
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
