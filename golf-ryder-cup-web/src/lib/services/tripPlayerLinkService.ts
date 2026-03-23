import { db } from '@/lib/db';
import { queueSyncOperation } from '@/lib/services/tripSyncService';
import type { Player } from '@/lib/types/models';
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

export async function ensureCurrentUserTripPlayerLink(
  tripId: string,
  players: Player[],
  currentUser: CurrentTripPlayerIdentity | null,
  isAuthenticated = true
): Promise<TripPlayerLinkResult> {
  const initialResult = assessTripPlayerLink(players, currentUser, isAuthenticated);

  if (
    initialResult.status === 'missing-user' ||
    initialResult.status === 'linked-id' ||
    initialResult.status === 'linked-email' ||
    initialResult.status === 'ambiguous-email-match' ||
    initialResult.status === 'ambiguous-name-match'
  ) {
    return initialResult;
  }

  if (initialResult.status === 'claimable-name-match') {
    const candidate = initialResult.candidates[0];
    if (!candidate || !currentUser) {
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

  if (!currentUser) {
    return initialResult;
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
  const initialResult = assessTripPlayerLink(players, currentUser, isAuthenticated);
  if (!currentUser || initialResult.status === 'missing-user') {
    return initialResult;
  }

  if (initialResult.player?.id === playerId) {
    return initialResult;
  }

  const candidate = players.find((player) => player.id === playerId) ?? (await db.players.get(playerId));
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
