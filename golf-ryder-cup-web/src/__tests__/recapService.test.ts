import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockDb } = vi.hoisted(() => ({
  mockDb: {
    trips: {
      get: vi.fn(),
    },
    sessions: {
      where: vi.fn(),
    },
  },
}));

vi.mock('@/lib/db', () => ({
  db: mockDb,
}));

import { buildRecapShareText, generateTripRecap } from '@/lib/services/recapService';

describe('recapService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when a trip has no completed match data yet', async () => {
    const equalsMock = vi.fn();
    mockDb.trips.get.mockResolvedValue({
      id: 'trip-1',
      name: 'Pine Valley Buddies Trip',
    });
    mockDb.sessions.where.mockReturnValue({
      equals: equalsMock,
    });
    equalsMock
      .mockReturnValueOnce({
        sortBy: vi.fn().mockResolvedValue([]),
      })
      .mockReturnValueOnce({
        toArray: vi.fn().mockResolvedValue([]),
      });

    await expect(generateTripRecap('trip-1')).resolves.toBeNull();
  });

  it('builds recap share text from the narrative and final score', () => {
    expect(
      buildRecapShareText({
        tripId: 'trip-1',
        tripName: 'Autumn Cup',
        generatedAt: '2026-03-11T12:00:00.000Z',
        finalScore: { usa: 13.5, europe: 10.5 },
        winner: 'usa',
        narrative: {
          headline: 'USA Claims the Cup, 13.5–10.5',
          body: 'A hard-fought weekend that turned on the Saturday singles.',
        },
        dayRecaps: [],
        awards: [],
        playerLeaderboard: [],
        funStats: [],
        topTrashTalk: [],
        topPhotos: [],
        highlights: [],
        matchResults: [],
      })
    ).toContain('Final Score: USA 13.5 - 10.5 Europe');
  });
});
