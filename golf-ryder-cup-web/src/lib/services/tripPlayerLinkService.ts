import { db } from '@/lib/db';
import { queueSyncOperation } from '@/lib/services/tripSyncService';
import type { Player } from '@/lib/types/models';
import { mergeTripPlayers } from '@/lib/utils/tripPlayers';
import type { CurrentTripPlayerIdentity, TripPlayerLinkResult } from '@/lib/utils/tripPlayerIdentity';
import { assessTripPlayerLink } from '@/lib/utils/tripPlayerIdentity';

function normalizeEmail(email?: string | null): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized ? normalized : null;
}

function buildTripPlayerFromIdentity(
  tripId: string,
  currentUser: CurrentTripPlayerIdentity
): Player {
  const now = new Date().toISOString();
  const email = normalizeEmail(currentUser.email) ?? undefined;
  const firstName =
    currentUser.firstName?.trim() ||
    email?.split('@')[0] ||
    'Trip';
  const lastName = currentUser.lastName?.trim() || 'Player';

  return {
    id: crypto.randomUUID(),
    tripId,
    linkedProfileId: currentUser.id ?? undefined,
    linkedAuthUserId: currentUser.authUserId ?? undefined,
    firstName,
    lastName,
    email,
    handicapIndex: currentUser.handicapIndex ?? undefined,
    ghin: currentUser.ghin ?? undefined,
    teePreference: currentUser.preferredTees ?? undefined,
    avatarUrl: currentUser.avatarUrl ?? undefined,
    joinedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}

function hasConflictingExplicitLink(
  player: Player,
  currentUser: CurrentTripPlayerIdentity
): boolean {
  return Boolean(
    (player.linkedProfileId && currentUser.id && player.linkedProfileId !== currentUser.id) ||
      (player.linkedAuthUserId &&
        currentUser.authUserId &&
        player.linkedAuthUserId !== currentUser.authUserId)
  );
}

function mergeLinkedPlayerIdentity(
  tripId: string,
  player: Player,
  currentUser: CurrentTripPlayerIdentity,
  options?: {
    allowEmailMismatch?: boolean;
  }
): TripPlayerLinkResult | Player {
  const normalizedUserEmail = normalizeEmail(currentUser.email);
  const normalizedPlayerEmail = normalizeEmail(player.email);

  if (
    !options?.allowEmailMismatch &&
    normalizedPlayerEmail &&
    normalizedUserEmail &&
    normalizedPlayerEmail !== normalizedUserEmail
  ) {
    return {
      status: 'link-conflict',
      player: null,
      candidates: [player],
    };
  }

  return {
    ...player,
    tripId,
    linkedProfileId: currentUser.id ?? player.linkedProfileId,
    linkedAuthUserId: currentUser.authUserId ?? player.linkedAuthUserId,
    email:
      normalizedPlayerEmail &&
      normalizedUserEmail &&
      normalizedPlayerEmail !== normalizedUserEmail
        ? player.email
        : normalizedUserEmail ?? player.email,
    handicapIndex: player.handicapIndex ?? currentUser.handicapIndex ?? undefined,
    ghin: player.ghin ?? currentUser.ghin ?? undefined,
    teePreference: player.teePreference ?? currentUser.preferredTees ?? undefined,
    avatarUrl: player.avatarUrl ?? currentUser.avatarUrl ?? undefined,
    updatedAt: new Date().toISOString(),
  };
}

async function persistLinkedPlayer(
  tripId: string,
  player: Player,
  status: TripPlayerLinkResult['status']
): Promise<TripPlayerLinkResult> {
  await db.players.put(player);
  queueSyncOperation('player', player.id, 'update', tripId, player);

  return {
    status,
    player,
    candidates: [player],
  };
}

async function getLatestTripPlayers(tripId: string, players: Player[]): Promise<Player[]> {
  const storedPlayers = await db.players.where('tripId').equals(tripId).toArray();
  return mergeTripPlayers(tripId, storedPlayers, players).players;
}

async function maybePersistMatchedPlayer(
  tripId: string,
  player: Player,
  currentUser: CurrentTripPlayerIdentity,
  status: TripPlayerLinkResult['status'],
  options?: {
    allowEmailMismatch?: boolean;
  }
): Promise<TripPlayerLinkResult> {
  const merged = mergeLinkedPlayerIdentity(tripId, player, currentUser, options);
  if ('status' in merged) {
    return merged;
  }

  const requiresPersistence =
    merged.tripId !== player.tripId ||
    merged.linkedProfileId !== player.linkedProfileId ||
    merged.linkedAuthUserId !== player.linkedAuthUserId ||
    merged.email !== player.email ||
    merged.handicapIndex !== player.handicapIndex ||
    merged.ghin !== player.ghin ||
    merged.teePreference !== player.teePreference ||
    merged.avatarUrl !== player.avatarUrl;

  if (!requiresPersistence) {
    return {
      status,
      player,
      candidates: [player],
    };
  }

  return persistLinkedPlayer(tripId, merged, status);
}

export async function ensureCurrentUserTripPlayerLink(
  tripId: string,
  players: Player[],
  currentUser: CurrentTripPlayerIdentity | null,
  isAuthenticated = true
): Promise<TripPlayerLinkResult> {
  // JoinTripModal and TripRehydrationProvider both call this concurrently:
  // the modal fires it inline after pullTripByShareCode populates the
  // trip store, and the provider's useEffect refires as soon as
  // `currentTrip`/`players` change. Before this guard, both runs raced
  // the "no existing match → create Player" branch and each called
  // buildTripPlayerFromIdentity (which mints a fresh UUID), producing
  // two Player rows 1-8ms apart that both got pushed to Supabase.
  //
  // The original single-key variant of this guard missed the race
  // when authUserId resolved asynchronously between calls — Call 1
  // might run with authUserId=undefined (keying on profile id) and
  // Call 2 with authUserId set (keying on auth id), bypassing the
  // shared promise. Register the in-flight promise under EVERY
  // stable identifier we know so any subsequent call sharing any
  // one identifier picks up the same promise. Empty keys are
  // dropped so "anonymous" doesn't collide across unrelated users.
  const keys = buildInFlightKeys(tripId, currentUser);
  for (const key of keys) {
    const inFlight = inFlightTripPlayerLinks.get(key);
    if (inFlight) return inFlight;
  }

  const run = ensureCurrentUserTripPlayerLinkImpl(tripId, players, currentUser, isAuthenticated)
    .finally(() => {
      for (const key of keys) inFlightTripPlayerLinks.delete(key);
    });
  for (const key of keys) inFlightTripPlayerLinks.set(key, run);
  return run;
}

function buildInFlightKeys(
  tripId: string,
  currentUser: CurrentTripPlayerIdentity | null
): string[] {
  const keys = new Set<string>();
  if (currentUser?.authUserId) {
    keys.add(`${tripId}:auth:${currentUser.authUserId}`);
  }
  if (currentUser?.id) {
    keys.add(`${tripId}:profile:${currentUser.id}`);
  }
  const email = normalizeEmail(currentUser?.email);
  if (email) {
    keys.add(`${tripId}:email:${email}`);
  }
  if (keys.size === 0) {
    // Falling back to a single "anonymous" bucket is still better
    // than no guard at all — at worst, two anonymous callers share
    // a promise that returns 'missing-user' for both of them.
    keys.add(`${tripId}:anonymous`);
  }
  return Array.from(keys);
}

const inFlightTripPlayerLinks = new Map<string, Promise<TripPlayerLinkResult>>();

async function ensureCurrentUserTripPlayerLinkImpl(
  tripId: string,
  players: Player[],
  currentUser: CurrentTripPlayerIdentity | null,
  isAuthenticated = true
): Promise<TripPlayerLinkResult> {
  const initialResult = assessTripPlayerLink(players, currentUser, isAuthenticated);

  if (
    initialResult.status === 'missing-user' ||
    initialResult.status === 'ambiguous-email-match' ||
    initialResult.status === 'ambiguous-name-match'
  ) {
    return initialResult;
  }

  if (!currentUser) {
    return initialResult;
  }

  const latestPlayers = await getLatestTripPlayers(tripId, players);
  const latestResult = assessTripPlayerLink(latestPlayers, currentUser, isAuthenticated);

  if (latestResult.status === 'missing-user') {
    return latestResult;
  }

  if (latestResult.status === 'linked-id' && latestResult.player) {
    return maybePersistMatchedPlayer(tripId, latestResult.player, currentUser, 'linked-id');
  }

  if (latestResult.status === 'linked-email' && latestResult.player) {
    return maybePersistMatchedPlayer(tripId, latestResult.player, currentUser, 'linked-email');
  }

  if (
    latestResult.status === 'ambiguous-email-match' ||
    latestResult.status === 'ambiguous-name-match'
  ) {
    return latestResult;
  }

  if (latestResult.status === 'claimable-name-match') {
    const candidate = latestResult.candidates[0];
    if (!candidate) {
      return {
        status: 'unresolved',
        player: null,
        candidates: [],
      };
    }

    if (hasConflictingExplicitLink(candidate, currentUser)) {
      return {
        status: 'link-conflict',
        player: null,
        candidates: [candidate],
      };
    }

    const merged = mergeLinkedPlayerIdentity(tripId, candidate, currentUser);
    if ('status' in merged) {
      return merged;
    }

    return persistLinkedPlayer(tripId, merged, 'claimed-name-match');
  }

  const createdPlayer = buildTripPlayerFromIdentity(tripId, currentUser);
  await db.players.put(createdPlayer);
  queueSyncOperation('player', createdPlayer.id, 'create', tripId, createdPlayer);

  return {
    status: 'created',
    player: createdPlayer,
    candidates: [createdPlayer],
  };
}

export async function claimTripPlayerForCurrentUser(
  tripId: string,
  playerId: string,
  players: Player[],
  currentUser: CurrentTripPlayerIdentity | null,
  isAuthenticated = true,
  options?: {
    allowEmailMismatch?: boolean;
  }
): Promise<TripPlayerLinkResult> {
  const latestPlayers = await getLatestTripPlayers(tripId, players);
  const initialResult = assessTripPlayerLink(latestPlayers, currentUser, isAuthenticated);
  if (!currentUser || initialResult.status === 'missing-user') {
    return initialResult;
  }

  if (initialResult.player?.id === playerId) {
    return maybePersistMatchedPlayer(
      tripId,
      initialResult.player,
      currentUser,
      initialResult.status,
      options
    );
  }

  const candidate =
    latestPlayers.find((player) => player.id === playerId) ?? (await db.players.get(playerId));
  if (!candidate) {
    return {
      status: 'unresolved',
      player: null,
      candidates: [],
    };
  }

  if (candidate.tripId && candidate.tripId !== tripId) {
    return {
      status: 'link-conflict',
      player: null,
      candidates: [candidate],
    };
  }

  if (hasConflictingExplicitLink(candidate, currentUser)) {
    return {
      status: 'link-conflict',
      player: null,
      candidates: [candidate],
    };
  }

  const merged = mergeLinkedPlayerIdentity(tripId, candidate, currentUser, options);
  if ('status' in merged) {
    return merged;
  }

  return persistLinkedPlayer(tripId, merged, 'claimed-explicit');
}
