import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const { addRateLimitHeadersMock, applyRateLimitAsyncMock } = vi.hoisted(() => ({
  addRateLimitHeadersMock: vi.fn((response: NextResponse) => response),
  applyRateLimitAsyncMock: vi.fn<() => Promise<NextResponse | null>>(async () => null),
}));

const { pdfState } = vi.hoisted(() => ({
  pdfState: {
    pages: [] as Array<Array<{ str: string; transform: number[]; width?: number; height?: number }>>,
  },
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

vi.mock('pdfjs-dist/legacy/build/pdf.mjs', () => ({
  getDocument: vi.fn(() => ({
    promise: Promise.resolve({
      numPages: pdfState.pages.length,
      getPage: async (pageNumber: number) => ({
        getTextContent: async () => ({
          items: pdfState.pages[pageNumber - 1] || [],
        }),
      }),
    }),
    destroy: vi.fn(async () => undefined),
  })),
}));

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
    pdfState.pages = [];
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

    it('follows linked scorecard pdfs and extracts playable tee data', async () => {
      pdfState.pages = [
        [
          { str: 'ROOST', transform: [1, 0, 0, 1, 100, 800] },
          { str: 'BLACK', transform: [1, 0, 0, 1, 100, 700] },
          { str: '76.1', transform: [1, 0, 0, 1, 220, 700] },
          { str: '/', transform: [1, 0, 0, 1, 250, 700] },
          { str: '143', transform: [1, 0, 0, 1, 270, 700] },
          { str: 'GREEN', transform: [1, 0, 0, 1, 100, 680] },
          { str: '73.7', transform: [1, 0, 0, 1, 220, 680] },
          { str: '/', transform: [1, 0, 0, 1, 250, 680] },
          { str: '137', transform: [1, 0, 0, 1, 270, 680] },
        ],
        Array.from({ length: 18 }, (_, index) => {
          const holeNumber = index + 1;
          const y = 700 - index * 20;
          return [
            { str: String(holeNumber), transform: [1, 0, 0, 1, 20, y] },
            { str: String(430 + index), transform: [1, 0, 0, 1, 60, y] },
            { str: String(395 + index), transform: [1, 0, 0, 1, 110, y] },
            { str: holeNumber % 4 === 0 ? '5' : holeNumber % 3 === 0 ? '3' : '4', transform: [1, 0, 0, 1, 160, y] },
            { str: String(holeNumber), transform: [1, 0, 0, 1, 200, y] },
            { str: String(19 - holeNumber), transform: [1, 0, 0, 1, 230, y] },
          ];
        }).flat(),
      ];

      const fetchMock = vi.spyOn(globalThis, 'fetch');
      fetchMock
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'text/html' }),
          text: async () => `
            <html>
              <head>
                <title>Roost | Cabot Citrus Farms</title>
              </head>
              <body>
                <a href="/uploads/2026/02/Scorecard_CCF_Roost_2025_Digital-min.pdf">View Scorecard</a>
              </body>
            </html>
          `,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          headers: new Headers({ 'content-type': 'application/pdf' }),
          arrayBuffer: async () => new ArrayBuffer(16),
        } as Response);

      const response = await getCourseDetails(
        new NextRequest(
          'http://localhost:3000/api/golf-courses/web-roost?website=https%3A%2F%2Fcabot.com%2Fcitrusfarms%2Fgolf%2Froost%2F&title=Roost'
        ),
        {
          params: Promise.resolve({ courseId: 'web-roost' }),
        }
      );
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.success).toBe(true);
      expect(data.data.source).toBe('web-extracted');
      expect(data.data.sourcePageUrl).toBe('https://cabot.com/citrusfarms/golf/roost/');
      expect(data.data.teeSets).toHaveLength(2);
      expect(data.data.teeSets[0]).toMatchObject({
        name: 'Black',
        rating: 76.1,
        slope: 143,
      });
      expect(data.data.teeSets[0].yardages).toHaveLength(18);
      expect(data.data.holes).toHaveLength(18);
      expect(data.data.holes[0]).toMatchObject({
        par: 4,
        handicap: 1,
        yardage: 430,
      });
    });
  });
});
