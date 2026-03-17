import type { Player } from '@/lib/types/models';

export function normalizePlayerTripId(player: Player, tripId: string): Player {
  if (player.tripId) {
    return player;
  }

  return {
    ...player,
    tripId,
  };
}

export function mergeTripPlayers(
  tripId: string,
  ...playerGroups: Player[][]
): {
  players: Player[];
  backfilledPlayers: Player[];
} {
  const playersById = new Map<string, Player>();
  const backfilledPlayersById = new Map<string, Player>();

  for (const group of playerGroups) {
    for (const player of group) {
      const normalizedPlayer = normalizePlayerTripId(player, tripId);
      const alreadyMerged = playersById.has(normalizedPlayer.id);

      if (!alreadyMerged) {
        playersById.set(normalizedPlayer.id, normalizedPlayer);
      }

      if (!player.tripId && !alreadyMerged && !backfilledPlayersById.has(normalizedPlayer.id)) {
        backfilledPlayersById.set(normalizedPlayer.id, normalizedPlayer);
      }

      if (player.tripId) {
        backfilledPlayersById.delete(normalizedPlayer.id);
      }
    }
  }

  return {
    players: Array.from(playersById.values()),
    backfilledPlayers: Array.from(backfilledPlayersById.values()),
  };
}
