import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseFromMock = vi.hoisted(() => vi.fn());
const tripGetMock = vi.hoisted(() => vi.fn());
const playerGetMock = vi.hoisted(() => vi.fn());
const storeTripShareCodeMock = vi.hoisted(() => vi.fn());

vi.mock('../lib/supabase/client', () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: supabaseFromMock,
  },
}));

vi.mock('../lib/db', () => ({
  db: {
    trips: {
      get: tripGetMock,
    },
    players: {
      get: playerGetMock,
    },
  },
}));

vi.mock('../lib/utils/tripShareCodeStore', () => ({
  storeTripShareCode: storeTripShareCodeMock,
}));

import {
  syncPlayerToCloud,
  syncTripToCloud,
} from '../lib/services/trip-sync/tripSyncEntityWriters';
import type { Player, Trip } from '../lib/types/models';

const trip: Trip = {
  id: 'trip-1',
  name: 'Solo Cup 2026',
  startDate: '2026-04-30',
  endDate: '2026-05-03',
  location: 'Cabot Citrus Farms',
  isCaptainModeEnabled: true,
  captainName: 'Cooper',
  createdAt: '2026-04-26T12:00:00.000Z',
  updatedAt: '2026-04-26T12:00:00.000Z',
};

describe('trip sync entity writers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    tripGetMock.mockResolvedValue(trip);
    playerGetMock.mockReset();
  });

  it('upserts trip creates so interrupted retries do not fail on duplicate ids', async () => {
    const singleMock = vi.fn().mockResolvedValue({ data: { share_code: 'ABC123' }, error: null });
    const selectMock = vi.fn(() => ({ single: singleMock }));
    const upsertMock = vi.fn(() => ({ select: selectMock }));
    const insertMock = vi.fn();

    supabaseFromMock.mockReturnValue({
      insert: insertMock,
      upsert: upsertMock,
    });

    await syncTripToCloud('trip-1', 'create', trip);

    expect(supabaseFromMock).toHaveBeenCalledWith('trips');
    expect(insertMock).not.toHaveBeenCalled();
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'trip-1',
        name: 'Solo Cup 2026',
      }),
      { onConflict: 'id' }
    );
    expect(selectMock).toHaveBeenCalledWith('share_code');
    expect(storeTripShareCodeMock).toHaveBeenCalledWith('trip-1', 'ABC123');
  });

  it('pushes the latest Dexie player payload, not the queued snapshot, so RLS-stuck creates can self-heal', async () => {
    // Reproduces the production stuck-sync scenario: the queued payload
    // has a NULL linked_auth_user_id (from the moment the join queued
    // the create, before auth resolved), but Dexie has been updated by
    // ensureCurrentUserTripPlayerLink to the correct auth user. Cloud
    // RLS rejects rows where linked_auth_user_id ≠ auth.uid(), so
    // pushing the queued snapshot fails forever — the writer must
    // re-read from Dexie at sync time.
    const stalePayload: Player = {
      id: 'player-42',
      tripId: 'trip-1',
      firstName: 'Wil',
      lastName: 'Kamin',
      email: 'wil@example.com',
      handicapIndex: 8.5,
      linkedAuthUserId: undefined,
      linkedProfileId: undefined,
      createdAt: '2026-04-26T12:00:00.000Z',
      updatedAt: '2026-04-26T12:00:00.000Z',
    };
    const freshPlayer: Player = {
      ...stalePayload,
      linkedAuthUserId: 'auth-uid-9000',
      linkedProfileId: 'profile-9000',
      updatedAt: '2026-04-26T12:30:00.000Z',
    };
    playerGetMock.mockResolvedValue(freshPlayer);

    const upsertMock = vi.fn().mockResolvedValue({ data: null, error: null });
    supabaseFromMock.mockReturnValue({ upsert: upsertMock });

    await syncPlayerToCloud('player-42', 'create', stalePayload, 'trip-1');

    expect(playerGetMock).toHaveBeenCalledWith('player-42');
    expect(supabaseFromMock).toHaveBeenCalledWith('players');
    expect(upsertMock).toHaveBeenCalledTimes(1);
    const [cloudPayload] = upsertMock.mock.calls[0];
    expect(cloudPayload).toMatchObject({
      id: 'player-42',
      linked_auth_user_id: 'auth-uid-9000',
      linked_profile_id: 'profile-9000',
    });
  });

  it('falls back to the queued payload when the Dexie row is missing', async () => {
    playerGetMock.mockResolvedValue(undefined);

    const queuedPayload: Player = {
      id: 'player-99',
      tripId: 'trip-1',
      firstName: 'Late',
      lastName: 'Joiner',
      linkedAuthUserId: 'auth-uid-9000',
      createdAt: '2026-04-26T12:00:00.000Z',
      updatedAt: '2026-04-26T12:00:00.000Z',
    };

    const upsertMock = vi.fn().mockResolvedValue({ data: null, error: null });
    supabaseFromMock.mockReturnValue({ upsert: upsertMock });

    await syncPlayerToCloud('player-99', 'create', queuedPayload, 'trip-1');

    expect(upsertMock).toHaveBeenCalledTimes(1);
    expect(upsertMock.mock.calls[0][0]).toMatchObject({
      id: 'player-99',
      linked_auth_user_id: 'auth-uid-9000',
    });
  });
});
