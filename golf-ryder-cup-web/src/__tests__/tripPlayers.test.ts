import { describe, expect, it } from 'vitest';

import type { Player } from '@/lib/types/models';
import { mergeTripPlayers, normalizePlayerTripId } from '@/lib/utils/tripPlayers';

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
});
