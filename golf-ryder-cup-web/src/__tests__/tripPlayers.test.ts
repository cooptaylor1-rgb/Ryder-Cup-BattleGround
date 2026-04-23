import { describe, expect, it } from 'vitest';

import type { Player } from '@/lib/types/models';
import {
  dedupePlayersByIdentity,
  mergeTripPlayers,
  normalizePlayerTripId,
} from '@/lib/utils/tripPlayers';

describe('tripPlayers', () => {
  it('backfills missing tripId values for legacy players', () => {
    const player: Player = {
      id: 'player-1',
      firstName: 'Tom',
      lastName: 'Morris',
    };

    expect(normalizePlayerTripId(player, 'trip-1')).toEqual({
      ...player,
      tripId: 'trip-1',
    });
  });

  it('merges trip-owned and legacy linked players by id', () => {
    const tripPlayer: Player = {
      id: 'player-1',
      tripId: 'trip-1',
      firstName: 'Old',
      lastName: 'Tom',
    };
    const linkedLegacyPlayer: Player = {
      id: 'player-2',
      firstName: 'Young',
      lastName: 'Tom',
    };
    const duplicateLinkedPlayer: Player = {
      id: 'player-1',
      firstName: 'Old',
      lastName: 'Tom',
    };

    const result = mergeTripPlayers('trip-1', [tripPlayer], [linkedLegacyPlayer, duplicateLinkedPlayer]);

    expect(result.players).toEqual([
      tripPlayer,
      {
        ...linkedLegacyPlayer,
        tripId: 'trip-1',
      },
    ]);
    expect(result.backfilledPlayers).toEqual([
      {
        ...linkedLegacyPlayer,
        tripId: 'trip-1',
      },
    ]);
  });

  it('collapses duplicate players with the same email, keeping the most recent', () => {
    const older: Player = {
      id: 'player-a',
      tripId: 'trip-1',
      firstName: 'Thomas',
      lastName: 'Watkins',
      email: 'thomas.watkins.iv@gmail.com',
      updatedAt: '2026-04-22T15:00:00Z',
    };
    const newer: Player = {
      id: 'player-b',
      tripId: 'trip-1',
      firstName: 'Thomas',
      lastName: 'Watkins',
      email: 'Thomas.Watkins.IV@gmail.com',
      updatedAt: '2026-04-23T15:00:00Z',
    };

    const { kept, losers } = dedupePlayersByIdentity([older, newer]);

    expect(kept).toEqual([newer]);
    expect(losers).toEqual([older]);
  });

  it('collapses by normalized name when email is absent', () => {
    const a: Player = {
      id: 'a',
      tripId: 't',
      firstName: 'Thomas',
      lastName: 'Watkins',
    };
    const b: Player = {
      id: 'b',
      tripId: 't',
      firstName: 'thomas',
      lastName: 'WATKINS',
      updatedAt: '2026-04-23T00:00:00Z',
    };

    const { kept, losers } = dedupePlayersByIdentity([a, b]);
    expect(kept).toEqual([b]);
    expect(losers).toEqual([a]);
  });

  it('keeps distinct players untouched', () => {
    const a: Player = {
      id: 'a',
      tripId: 't',
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@example.com',
    };
    const b: Player = {
      id: 'b',
      tripId: 't',
      firstName: 'Bob',
      lastName: 'Jones',
      email: 'bob@example.com',
    };

    const { kept, losers } = dedupePlayersByIdentity([a, b]);
    expect(kept).toHaveLength(2);
    expect(losers).toEqual([]);
  });
});
