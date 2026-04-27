import { beforeEach, describe, expect, it, vi } from 'vitest';

const supabaseFromMock = vi.hoisted(() => vi.fn());
const tripGetMock = vi.hoisted(() => vi.fn());
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
  },
}));

vi.mock('../lib/utils/tripShareCodeStore', () => ({
  storeTripShareCode: storeTripShareCodeMock,
}));

import { syncTripToCloud } from '../lib/services/trip-sync/tripSyncEntityWriters';
import type { Trip } from '../lib/types/models';

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
});
