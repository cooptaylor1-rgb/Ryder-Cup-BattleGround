import type { Player } from '@/lib/types/models';

export interface CurrentTripPlayerIdentity {
  id?: string | null;
  email?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  handicapIndex?: number | null;
  ghin?: string | null;
  preferredTees?: string | null;
  avatarUrl?: string | null;
}

export type TripPlayerLinkStatus =
  | 'missing-user'
  | 'linked-id'
  | 'linked-email'
  | 'claimable-name-match'
  | 'ambiguous-email-match'
  | 'ambiguous-name-match'
  | 'unresolved'
  | 'claimed-name-match'
  | 'created';

export interface TripPlayerLinkResult {
  status: TripPlayerLinkStatus;
  player: Player | null;
  candidates: Player[];
}

function normalizeEmail(email?: string | null): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized ? normalized : null;
}

function normalizeNamePart(value?: string | null): string {
  return value?.trim().toLowerCase() ?? '';
}

function buildNameKey(identity: CurrentTripPlayerIdentity | Player): string | null {
  const firstName = normalizeNamePart(identity.firstName);
  const lastName = normalizeNamePart(identity.lastName);

  if (!firstName || !lastName) {
    return null;
  }

  return `${firstName}|${lastName}`;
}

export function assessTripPlayerLink(
  players: Player[],
  currentUser: CurrentTripPlayerIdentity | null,
  isAuthenticated = true
): TripPlayerLinkResult {
  if (!isAuthenticated || !currentUser) {
    return {
      status: 'missing-user',
      player: null,
      candidates: [],
    };
  }

  const idMatch = currentUser.id
    ? players.find((player) => player.id === currentUser.id) ?? null
    : null;
  if (idMatch) {
    return {
      status: 'linked-id',
      player: idMatch,
      candidates: [idMatch],
    };
  }

  const normalizedEmail = normalizeEmail(currentUser.email);
  if (normalizedEmail) {
    const emailMatches = players.filter(
      (player) => normalizeEmail(player.email) === normalizedEmail
    );

    if (emailMatches.length === 1) {
      return {
        status: 'linked-email',
        player: emailMatches[0],
        candidates: emailMatches,
      };
    }

    if (emailMatches.length > 1) {
      return {
        status: 'ambiguous-email-match',
        player: null,
        candidates: emailMatches,
      };
    }
  }

  const nameKey = buildNameKey(currentUser);
  if (!nameKey) {
    return {
      status: 'unresolved',
      player: null,
      candidates: [],
    };
  }

  const nameMatches = players.filter((player) => buildNameKey(player) === nameKey);
  if (nameMatches.length === 1) {
    return {
      status: 'claimable-name-match',
      player: null,
      candidates: nameMatches,
    };
  }

  if (nameMatches.length > 1) {
    return {
      status: 'ambiguous-name-match',
      player: null,
      candidates: nameMatches,
    };
  }

  return {
    status: 'unresolved',
    player: null,
    candidates: [],
  };
}

export function resolveCurrentTripPlayer(
  players: Player[],
  currentUser: CurrentTripPlayerIdentity | null,
  isAuthenticated = true
): Player | null {
  return assessTripPlayerLink(players, currentUser, isAuthenticated).player;
}
