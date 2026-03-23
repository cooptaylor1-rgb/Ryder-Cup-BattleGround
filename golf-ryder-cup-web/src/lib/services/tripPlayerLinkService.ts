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

    const normalizedUserEmail = normalizeEmail(currentUser.email);
    const normalizedCandidateEmail = normalizeEmail(candidate.email);
    if (
      normalizedCandidateEmail &&
      normalizedUserEmail &&
      normalizedCandidateEmail !== normalizedUserEmail
    ) {
      return {
        status: 'ambiguous-name-match',
        player: null,
        candidates: [candidate],
      };
    }

    const updatedPlayer: Player = {
      ...candidate,
      tripId,
      email: normalizedUserEmail ?? candidate.email,
      handicapIndex: candidate.handicapIndex ?? currentUser.handicapIndex ?? undefined,
      ghin: candidate.ghin ?? currentUser.ghin ?? undefined,
      teePreference: candidate.teePreference ?? currentUser.preferredTees ?? undefined,
      avatarUrl: candidate.avatarUrl ?? currentUser.avatarUrl ?? undefined,
      updatedAt: new Date().toISOString(),
    };

    await db.players.put(updatedPlayer);
    queueSyncOperation('player', updatedPlayer.id, 'update', tripId, updatedPlayer);

    return {
      status: 'claimed-name-match',
      player: updatedPlayer,
      candidates: [updatedPlayer],
    };
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
