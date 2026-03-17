import { afterEach, describe, expect, it, vi } from 'vitest';

import { getCourseById, searchCourses } from '@/lib/services/golfCourseAPIService';

describe('golfCourseAPIService', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('falls back to the free search route when the paid search succeeds with no results', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ courses: [] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          results: [
            {
              id: 'web-cabot-citrus-farms',
              name: 'Cabot Citrus Farms',
              source: 'web',
              website: 'https://cabotcitrusfarms.com',
            },
          ],
        }),
      } as Response);

    const results = await searchCourses('cabot citrus farms');

    expect(fetchMock).toHaveBeenNthCalledWith(
      1,
      '/api/golf-courses?action=search&q=cabot%20citrus%20farms'
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/golf-courses/search?q=cabot%20citrus%20farms'
    );
    expect(results).toHaveLength(1);
    expect(results[0]?.id).toBe('web-cabot-citrus-farms');
    expect(results[0]?.source).toBe('web');
  });

  it('uses the source-aware details route for prefixed course ids', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          id: 'ghin-123',
          name: 'Cabot Citrus Farms',
          city: 'Brooksville',
          state: 'Florida',
          source: 'ghin',
          holes: Array.from({ length: 18 }, () => ({ par: 4, handicap: 1, yardage: 400 })),
          teeSets: [],
        },
      }),
    } as Response);

    const course = await getCourseById('ghin-123');

    expect(fetchMock).toHaveBeenCalledWith('/api/golf-courses/ghin-123');
    expect(course?.course_name).toBe('Cabot Citrus Farms');
    expect(course?.source).toBe('ghin');
  });
});
