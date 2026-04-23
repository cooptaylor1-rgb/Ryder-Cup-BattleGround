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

function identityKey(player: Player): string {
  const email = player.email?.trim().toLowerCase();
  if (email) return `email:${email}`;
  const first = (player.firstName ?? '').trim().toLowerCase();
  const last = (player.lastName ?? '').trim().toLowerCase();
  if (first || last) return `name:${first}|${last}`;
  return `id:${player.id}`;
}

function updatedAtMs(player: Player): number {
  if (!player.updatedAt) return 0;
  const t = Date.parse(player.updatedAt);
  return Number.isFinite(t) ? t : 0;
}

/**
 * Collapses local-only duplicate players within the same trip. Two
 * Dexie rows with different ids but the same canonical identity
 * (same email, or same normalized firstName+lastName when email is
 * absent) are merged: we keep the row with the most recent
 * updatedAt (ties broken by has-email), and surface the rest as
 * "losers" so the caller can delete them from Dexie and purge any
 * stale sync queue ops.
 *
 * This is a belt-and-suspenders cleanup: the pull path's orphan
 * reconcile already deletes local rows absent from the cloud
 * snapshot, but that path only runs after a successful pull. If the
 * pull is slow, failing, or hasn't shipped yet, users stare at
 * "Thomas Watkins" twice until a refresh. Running this on every
 * loadTrip makes the UI self-heal without waiting on the network.
 */
export function dedupePlayersByIdentity(players: Player[]): {
  kept: Player[];
  losers: Player[];
} {
  const groups = new Map<string, Player[]>();
  for (const p of players) {
    const key = identityKey(p);
    const bucket = groups.get(key);
    if (bucket) bucket.push(p);
    else groups.set(key, [p]);
  }

  const kept: Player[] = [];
  const losers: Player[] = [];

  for (const bucket of groups.values()) {
    if (bucket.length === 1) {
      kept.push(bucket[0]);
      continue;
    }
    const winner = bucket.reduce((best, candidate) => {
      const bestTs = updatedAtMs(best);
      const candTs = updatedAtMs(candidate);
      if (candTs > bestTs) return candidate;
      if (candTs < bestTs) return best;
      // Tie on timestamp: prefer the one with an email.
      const bestHasEmail = Boolean(best.email);
      const candHasEmail = Boolean(candidate.email);
      if (candHasEmail && !bestHasEmail) return candidate;
      return best;
    }, bucket[0]);
    kept.push(winner);
    for (const p of bucket) {
      if (p.id !== winner.id) losers.push(p);
    }
  }

  return { kept, losers };
}
