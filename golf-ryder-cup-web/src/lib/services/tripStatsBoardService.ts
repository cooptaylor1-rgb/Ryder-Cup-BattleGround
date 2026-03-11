import type { Player, UUID } from '@/lib/types/models';
import {
  CATEGORY_DEFINITIONS,
  getStatsByCategory,
  type PlayerTripStat,
  type TripStatCategory,
  type TripStatType,
} from '@/lib/types/tripStats';

export const TRIP_STAT_CATEGORIES: TripStatCategory[] = [
  'beverages',
  'golf_mishaps',
  'golf_highlights',
  'cart_chaos',
  'social',
  'money',
];

export const TRIP_STATS_QUICK_ACTIONS: TripStatType[] = [
  'beers',
  'balls_lost',
  'mulligans',
  'sand_traps',
  'water_hazards',
];

export interface TripStatLeader {
  playerId: UUID;
  playerName: string;
  total: number;
}

export interface TripStatHighlightTotals {
  beers: number;
  ballsLost: number;
  mulligans: number;
}

export function countActiveTripStatCategories(tripStats: PlayerTripStat[]): number {
  return TRIP_STAT_CATEGORIES.filter((category) => {
    const definitions = getStatsByCategory(category);
    return tripStats.some((stat) => definitions.some((definition) => definition.type === stat.statType));
  }).length;
}

export function buildTripStatValueMap(
  tripStats: PlayerTripStat[],
  statType: TripStatType
): Map<UUID, number> {
  const playerMap = new Map<UUID, number>();

  for (const stat of tripStats) {
    if (stat.statType !== statType) {
      continue;
    }

    const current = playerMap.get(stat.playerId) ?? 0;
    playerMap.set(stat.playerId, current + stat.value);
  }

  return playerMap;
}

export function buildTripStatMaps(tripStats: PlayerTripStat[], statTypes: TripStatType[]) {
  return new Map(statTypes.map((statType) => [statType, buildTripStatValueMap(tripStats, statType)]));
}

export function buildTripStatCategoryTotals(tripStats: PlayerTripStat[]) {
  return TRIP_STAT_CATEGORIES.map((category) => {
    const definitions = getStatsByCategory(category);
    const total = tripStats
      .filter((stat) => definitions.some((definition) => definition.type === stat.statType))
      .reduce((sum, stat) => sum + stat.value, 0);

    return { category, total, definition: CATEGORY_DEFINITIONS[category] };
  });
}

export function buildTripStatHighlights(tripStats: PlayerTripStat[]): TripStatHighlightTotals {
  return {
    beers: tripStats
      .filter((stat) => stat.statType === 'beers')
      .reduce((sum, stat) => sum + stat.value, 0),
    ballsLost: tripStats
      .filter((stat) => stat.statType === 'balls_lost')
      .reduce((sum, stat) => sum + stat.value, 0),
    mulligans: tripStats
      .filter((stat) => stat.statType === 'mulligans')
      .reduce((sum, stat) => sum + stat.value, 0),
  };
}

export function buildTripStatCategoryLeaders(
  category: TripStatCategory,
  tripStats: PlayerTripStat[],
  players: Player[]
): TripStatLeader[] {
  const definitions = getStatsByCategory(category);
  const totals = new Map<UUID, number>();
  const playerNames = new Map(
    players.map((player) => [player.id, `${player.firstName}${player.lastName ? ` ${player.lastName}` : ''}`])
  );

  for (const stat of tripStats) {
    if (!definitions.some((definition) => definition.type === stat.statType)) {
      continue;
    }

    const current = totals.get(stat.playerId) ?? 0;
    totals.set(stat.playerId, current + stat.value);
  }

  return [...totals.entries()]
    .map(([playerId, total]) => ({
      playerId,
      total,
      playerName: playerNames.get(playerId) || 'Unknown',
    }))
    .filter((leader) => leader.total > 0)
    .sort((left, right) => right.total - left.total)
    .slice(0, 5);
}

