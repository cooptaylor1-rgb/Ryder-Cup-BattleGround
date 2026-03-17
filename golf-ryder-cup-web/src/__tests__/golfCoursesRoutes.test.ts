import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const { addRateLimitHeadersMock, applyRateLimitAsyncMock } = vi.hoisted(() => ({
  addRateLimitHeadersMock: vi.fn((response: NextResponse) => response),
  applyRateLimitAsyncMock: vi.fn<() => Promise<NextResponse | null>>(async () => null),
}));

vi.mock('@/lib/utils/apiMiddleware', async () => {
  const actual = await vi.importActual<typeof import('@/lib/utils/apiMiddleware')>(
    '@/lib/utils/apiMiddleware'
  );
  return {
    ...actual,
    addRateLimitHeaders: addRateLimitHeadersMock,
    applyRateLimitAsync: applyRateLimitAsyncMock,
  };
});

import { GET as searchCourses } from '@/app/api/golf-courses/search/route';
import { GET as getCourseDetails } from '@/app/api/golf-courses/[courseId]/route';

function createPlace(placeId: number, name: string) {
  return {
    place_id: placeId,
    display_name: `${name}, Pinehurst, North Carolina, United States`,
    type: 'golf_course',
    class: 'leisure',
    lat: '35.1954',
    lon: '-79.4695',
    address: {
      town: 'Pinehurst',
      state: 'North Carolina',
      country: 'United States',
    },
  };
}

describe('Golf Course Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    applyRateLimitAsyncMock.mockResolvedValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('GET /api/golf-courses/search', () => {
    it('rejects limits above the supported maximum', async () => {
      const response = await searchCourses(
        new NextRequest('http://localhost:3000/api/golf-courses/search?q=pine&limit=100')
      );
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Limit must be 50 or fewer');
    });

    it('returns limited OSM fallback results with validated input', async () => {
      const osmResults = Array.from({ length: 25 }, (_, index) =>
        createPlace(index + 1, `Pine Test ${index + 1}`)
      );

      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        json: async () => osmResults,
      } as Response);

      const response = await searchCourses(
        new NextRequest('http://localhost:3000/api/golf-courses/search?q=pine&limit=5')
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.total).toBe(25);
      expect(data.results).toHaveLength(5);
      expect(data.results[0].source).toBe('osm');
    });

    it('falls back to public web results when structured providers return nothing', async () => {
      const emptyResponse = {
        ok: true,
        json: async () => [],
      } as Response;

      const webHtml = `
        <html>
          <body>
            <a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fcabotcitrusfarms.com">
              Cabot Citrus Farms | Golf Resort in Florida
            </a>
          </body>
        </html>
      `;

      const fetchMock = vi.spyOn(globalThis, 'fetch');
      fetchMock
        .mockResolvedValueOnce(emptyResponse)
        .mockResolvedValueOnce(emptyResponse)
        .mockResolvedValueOnce(emptyResponse)
        .mockResolvedValueOnce(emptyResponse)
        .mockResolvedValueOnce({
          ok: true,
          text: async () => webHtml,
        } as Response);

      const response = await searchCourses(
        new NextRequest('http://localhost:3000/api/golf-courses/search?q=cabot%20citrus%20farms')
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.results[0].source).toBe('web');
      expect(data.results[0].name).toContain('Cabot Citrus Farms');
      expect(data.results[0].website).toBe('https://cabotcitrusfarms.com');
      expect(data.results[0].description).toBeUndefined();
    });
  });

  describe('GET /api/golf-courses/[courseId]', () => {
    it('rejects invalid course identifiers', async () => {
      const response = await getCourseDetails(new NextRequest('http://localhost:3000/api/golf-courses/bad'), {
        params: Promise.resolve({ courseId: 'bad/id' }),
      });
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.error).toContain('Course ID contains invalid characters');
    });

    it('returns placeholder course structure when providers are unavailable', async () => {
      const response = await getCourseDetails(
        new NextRequest('http://localhost:3000/api/golf-courses/custom-course-1'),
        {
          params: Promise.resolve({ courseId: 'custom-course-1' }),
        }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.source).toBe('placeholder');
      expect(data.data.holes).toHaveLength(18);
      expect(data.data.teeSets).toHaveLength(4);
    });

    it('extracts web-backed course details from structured page metadata', async () => {
      vi.spyOn(globalThis, 'fetch').mockResolvedValue({
        ok: true,
        text: async () => `
          <html>
            <head>
              <title>North Berwick West Links | Top 100 Golf Courses</title>
              <meta name="description" content="A revered links course on Scotland's golf coast." />
              <script type="application/ld+json">
                {
                  "@context": "https://schema.org",
                  "@type": "SportsActivityLocation",
                  "name": "North Berwick West Links",
                  "description": "A revered links course on Scotland's golf coast.",
                  "url": "https://www.top100golfcourses.com/golf-course/north-berwick-west",
                  "telephone": "+44 1620 892747",
                  "address": {
                    "@type": "PostalAddress",
                    "streetAddress": "Beach Road",
                    "addressLocality": "North Berwick",
                    "addressRegion": "Scotland",
                    "addressCountry": "United Kingdom"
                  },
                  "teeSets": [
                    {
                      "@type": "PropertyValue",
                      "name": "Championship",
                      "courseRating": "73.2",
                      "slopeRating": "138",
                      "totalYardage": "6642"
                    }
                  ]
                }
              </script>
            </head>
            <body>
              <h1>North Berwick West Links</h1>
            </body>
          </html>
        `,
      } as Response);

      const response = await getCourseDetails(
        new NextRequest(
          'http://localhost:3000/api/golf-courses/web-north-berwick?website=https%3A%2F%2Fwww.top100golfcourses.com%2Fgolf-course%2Fnorth-berwick-west&title=North%20Berwick%20West%20Links'
        ),
        {
          params: Promise.resolve({ courseId: 'web-north-berwick' }),
        }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.source).toBe('web-extracted');
      expect(data.data.name).toBe('North Berwick West Links');
      expect(data.data.city).toBe('North Berwick');
      expect(data.data.state).toBe('Scotland');
      expect(data.data.website).toBe('https://www.top100golfcourses.com/golf-course/north-berwick-west');
      expect(data.data.description).toContain('links course');
      expect(data.data.teeSets[0]).toMatchObject({
        name: 'Championship',
        rating: 73.2,
        slope: 138,
        totalYardage: 6642,
      });
    });
  });
});
