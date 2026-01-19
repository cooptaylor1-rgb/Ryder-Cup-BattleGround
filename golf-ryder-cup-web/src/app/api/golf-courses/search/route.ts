import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '@/lib/utils/logger';
import { applyRateLimit, addRateLimitHeaders } from '@/lib/utils/apiMiddleware';

/**
 * Golf Course Search API
 *
 * Searches for golf courses by name and returns course data including
 * tee sets, pars, handicaps, and yardages.
 *
 * Uses multiple data sources:
 * 1. GHIN (USGA Golf Handicap Information Network) - most accurate
 * 2. Golf Course API (RapidAPI) - backup source
 * 3. OpenStreetMap/Overpass - for location data
 */

const logger = createLogger('api:golf-courses-search');

// Rate limiting: 30 requests per minute per IP
const RATE_LIMIT_CONFIG = {
    windowMs: 60 * 1000,
    maxRequests: 30,
};

// Cache duration: 1 hour for search results
const CACHE_MAX_AGE = 3600;
const CACHE_STALE_WHILE_REVALIDATE = 86400;

interface CourseSearchResult {
    id: string;
    name: string;
    city?: string;
    state?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
    source: 'ghin' | 'rapidapi' | 'osm';
}

interface CourseDetails {
    id: string;
    name: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    phone?: string;
    website?: string;
    holes: {
        par: number;
        handicap: number;
        yardage: number | null;
    }[];
    teeSets: {
        name: string;
        color?: string;
        rating?: number;
        slope?: number;
        yardages: (number | null)[];
    }[];
}

export async function GET(request: NextRequest) {
    // Apply rate limiting
    const rateLimitError = applyRateLimit(request, RATE_LIMIT_CONFIG);
    if (rateLimitError) {
        return rateLimitError;
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q');
    const state = searchParams.get('state');
    const limit = parseInt(searchParams.get('limit') || '10');

    if (!query || query.length < 2) {
        return NextResponse.json(
            { error: 'Search query must be at least 2 characters' },
            { status: 400 }
        );
    }

    try {
        const results: CourseSearchResult[] = [];

        // Try GHIN first (if API key available)
        const ghinApiKey = process.env.GHIN_API_KEY;
        if (ghinApiKey) {
            const ghinResults = await searchGHIN(query, state, ghinApiKey);
            results.push(...ghinResults);
        }

        // Try RapidAPI Golf Course API as backup
        const rapidApiKey = process.env.RAPIDAPI_KEY;
        if (rapidApiKey && results.length < limit) {
            const rapidResults = await searchRapidAPI(query, rapidApiKey);
            // Dedupe by name similarity
            for (const result of rapidResults) {
                if (!results.some(r => similarNames(r.name, result.name))) {
                    results.push(result);
                }
            }
        }

        // If still no results, try a free geocoding/OSM approach
        if (results.length === 0) {
            const osmResults = await searchOpenStreetMap(query, state);
            results.push(...osmResults);
        }

        let res = NextResponse.json({
            success: true,
            results: results.slice(0, limit),
            total: results.length,
        });
        // Add cache headers and rate limit headers for successful responses
        res.headers.set(
            'Cache-Control',
            `public, max-age=${CACHE_MAX_AGE}, stale-while-revalidate=${CACHE_STALE_WHILE_REVALIDATE}`
        );
        res = addRateLimitHeaders(res, request, RATE_LIMIT_CONFIG);
        return res;
    } catch (error) {
        logger.error('Course search error', { query, state, error });
        return NextResponse.json(
            { error: 'Failed to search courses', details: String(error) },
            { status: 500 }
        );
    }
}

// Search GHIN (USGA) database
async function searchGHIN(
    query: string,
    state: string | null,
    apiKey: string
): Promise<CourseSearchResult[]> {
    try {
        // GHIN Course Search API
        const params = new URLSearchParams({
            course_name: query,
            ...(state && { state }),
            max_results: '20',
        });

        const response = await fetch(
            `https://api.ghin.com/api/v1/courses/search?${params}`,
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) return [];

        const data = await response.json();
        return (data.courses || []).map((course: {
            CourseID: string;
            CourseName: string;
            City: string;
            State: string;
            Country: string;
            Latitude: number;
            Longitude: number;
        }) => ({
            id: `ghin-${course.CourseID}`,
            name: course.CourseName,
            city: course.City,
            state: course.State,
            country: course.Country,
            latitude: course.Latitude,
            longitude: course.Longitude,
            source: 'ghin' as const,
        }));
    } catch (error) {
        logger.error('GHIN search error:', error);
        return [];
    }
}

// Search RapidAPI Golf Course Database
async function searchRapidAPI(
    query: string,
    apiKey: string
): Promise<CourseSearchResult[]> {
    try {
        const response = await fetch(
            `https://golf-course-api.p.rapidapi.com/search?name=${encodeURIComponent(query)}`,
            {
                headers: {
                    'X-RapidAPI-Key': apiKey,
                    'X-RapidAPI-Host': 'golf-course-api.p.rapidapi.com',
                },
            }
        );

        if (!response.ok) return [];

        const data = await response.json();
        return (data.courses || data || []).slice(0, 20).map((course: {
            id: string;
            name: string;
            city: string;
            state: string;
            country: string;
            lat: number;
            lng: number;
        }) => ({
            id: `rapid-${course.id}`,
            name: course.name,
            city: course.city,
            state: course.state,
            country: course.country,
            latitude: course.lat,
            longitude: course.lng,
            source: 'rapidapi' as const,
        }));
    } catch (error) {
        logger.error('RapidAPI search error:', error);
        return [];
    }
}

// Search OpenStreetMap for golf courses (free, no API key needed)
async function searchOpenStreetMap(
    query: string,
    state: string | null
): Promise<CourseSearchResult[]> {
    try {
        const searchQuery = state ? `${query} golf ${state}` : `${query} golf course`;

        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?` +
            `q=${encodeURIComponent(searchQuery)}&` +
            `format=json&` +
            `limit=20&` +
            `addressdetails=1`,
            {
                headers: {
                    'User-Agent': 'GolfRyderCupApp/1.0',
                },
            }
        );

        if (!response.ok) return [];

        const data = await response.json();
        return data
            .filter((place: { type?: string; class?: string }) =>
                place.type === 'golf_course' ||
                place.class === 'leisure'
            )
            .map((place: {
                place_id: number;
                display_name: string;
                lat: string;
                lon: string;
                address?: {
                    city?: string;
                    town?: string;
                    state?: string;
                    country?: string;
                };
            }) => ({
                id: `osm-${place.place_id}`,
                name: place.display_name.split(',')[0],
                city: place.address?.city || place.address?.town,
                state: place.address?.state,
                country: place.address?.country,
                latitude: parseFloat(place.lat),
                longitude: parseFloat(place.lon),
                source: 'osm' as const,
            }));
    } catch (error) {
        logger.error('OSM search error:', error);
        return [];
    }
}

// Helper to check name similarity (for deduplication)
function similarNames(a: string, b: string): boolean {
    const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
    const na = normalize(a);
    const nb = normalize(b);
    return na.includes(nb) || nb.includes(na) || na === nb;
}
