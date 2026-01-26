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

// Reserved for future use when full course details fetching is implemented
interface _CourseDetails {
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
    const limit = parseInt(searchParams.get('limit') || '50');

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
            max_results: '100',
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

// Known golf resort/brand locations for fallback geocoding
// These are well-known golf destinations where the API can search when normal geocoding fails
const KNOWN_GOLF_LOCATIONS: Record<string, { lat: number; lon: number; radius: number }> = {
    'cabot': { lat: 28.95, lon: -81.87, radius: 100 }, // Cabot Citrus Farms area in Florida
    'pebble': { lat: 36.5668, lon: -121.9497, radius: 50 }, // Pebble Beach area
    'pinehurst': { lat: 35.1954, lon: -79.4695, radius: 30 }, // Pinehurst, NC
    'kiawah': { lat: 32.6082, lon: -80.0848, radius: 30 }, // Kiawah Island, SC
    'bandon': { lat: 43.1189, lon: -124.4134, radius: 30 }, // Bandon Dunes, OR
    'streamsong': { lat: 27.6522, lon: -81.5156, radius: 30 }, // Streamsong, FL
    'sand valley': { lat: 44.0821, lon: -89.8826, radius: 30 }, // Sand Valley, WI
    'whistling straits': { lat: 43.8514, lon: -87.7262, radius: 30 }, // Whistling Straits, WI
};

// Search RapidAPI Golf Course Finder Database
// This API requires location-based search (lat/lng), so we first geocode the query
// IMPORTANT: We filter results by name match, not just proximity
async function searchRapidAPI(
    query: string,
    apiKey: string
): Promise<CourseSearchResult[]> {
    try {
        let geocodeData: Array<{ lat: string; lon: string; display_name: string }> = [];

        // Strategy 1: Try to geocode the full query with "golf course" appended
        const golfGeocodeResponse = await fetch(
            `https://nominatim.openstreetmap.org/search?` +
            `q=${encodeURIComponent(query + ' golf course')}&` +
            `format=json&` +
            `limit=5`,
            {
                headers: {
                    'User-Agent': 'GolfRyderCupApp/1.0',
                },
            }
        );

        if (golfGeocodeResponse.ok) {
            geocodeData = await golfGeocodeResponse.json();
        }

        // Strategy 2: Try generic geocode without "golf course"
        if (!geocodeData || geocodeData.length === 0) {
            const genericGeocodeResponse = await fetch(
                `https://nominatim.openstreetmap.org/search?` +
                `q=${encodeURIComponent(query)}&` +
                `format=json&` +
                `limit=5`,
                {
                    headers: {
                        'User-Agent': 'GolfRyderCupApp/1.0',
                    },
                }
            );

            if (genericGeocodeResponse.ok) {
                geocodeData = await genericGeocodeResponse.json();
            }
        }

        // Strategy 3: Try geocoding individual words (for multi-word queries)
        if (!geocodeData || geocodeData.length === 0) {
            const words = query.split(/\s+/).filter(w => w.length > 2);
            for (const word of words) {
                // Skip common golf terms
                if (['golf', 'course', 'club', 'country', 'links', 'farms', 'resort'].includes(word.toLowerCase())) {
                    continue;
                }
                const wordGeocodeResponse = await fetch(
                    `https://nominatim.openstreetmap.org/search?` +
                    `q=${encodeURIComponent(word + ' golf')}&` +
                    `format=json&` +
                    `limit=3`,
                    {
                        headers: {
                            'User-Agent': 'GolfRyderCupApp/1.0',
                        },
                    }
                );
                if (wordGeocodeResponse.ok) {
                    const wordData = await wordGeocodeResponse.json();
                    if (wordData && wordData.length > 0) {
                        geocodeData = wordData;
                        break;
                    }
                }
            }
        }

        // Strategy 4: Check known golf brand/resort locations
        let searchRadius = 50;
        if (!geocodeData || geocodeData.length === 0) {
            const queryLower = query.toLowerCase();
            for (const [brand, location] of Object.entries(KNOWN_GOLF_LOCATIONS)) {
                if (queryLower.includes(brand)) {
                    geocodeData = [{
                        lat: String(location.lat),
                        lon: String(location.lon),
                        display_name: `Known location for ${brand}`
                    }];
                    searchRadius = location.radius;
                    logger.info(`Using known location for brand "${brand}"`, location);
                    break;
                }
            }
        }

        if (!geocodeData || geocodeData.length === 0) {
            logger.info('No geocode results for query:', query);
            return [];
        }

        // Use the first geocode result
        const { lat, lon } = geocodeData[0];

        // Now search RapidAPI with these coordinates (dynamic radius based on source)
        const response = await fetch(
            `https://golf-course-finder.p.rapidapi.com/api/golf-clubs/?miles=${searchRadius}&latitude=${lat}&longitude=${lon}`,
            {
                headers: {
                    'X-RapidAPI-Key': apiKey,
                    'X-RapidAPI-Host': 'golf-course-finder.p.rapidapi.com',
                },
            }
        );

        if (!response.ok) {
            logger.error('RapidAPI response error:', response.status, response.statusText);
            return [];
        }

        const data = await response.json();

        // Check for API error messages
        if (data.message) {
            logger.error('RapidAPI error message:', data.message);
            return [];
        }

        const results: CourseSearchResult[] = [];
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

        // Helper to score name match - higher is better
        const scoreMatch = (name: string): number => {
            if (!name) return 0;
            const nameLower = name.toLowerCase();

            // Exact match
            if (nameLower === queryLower) return 100;

            // Name contains full query
            if (nameLower.includes(queryLower)) return 80;

            // Query contains full name
            if (queryLower.includes(nameLower)) return 70;

            // Count matching words
            let wordMatches = 0;
            for (const word of queryWords) {
                if (nameLower.includes(word)) wordMatches++;
            }
            if (wordMatches > 0) {
                return 20 + (wordMatches / queryWords.length) * 40;
            }

            return 0;
        };

        // Process each club and its courses
        for (const club of (Array.isArray(data) ? data : [])) {
            const clubScore = scoreMatch(club.club_name || '');

            // Add individual courses from the club
            if (club.golf_courses && Array.isArray(club.golf_courses)) {
                for (const course of club.golf_courses) {
                    const courseScore = scoreMatch(course.course_name || '');
                    const bestScore = Math.max(clubScore, courseScore);

                    // ONLY include if there's some name match (score > 0)
                    if (bestScore > 0) {
                        results.push({
                            id: `rapid-${club.place_id}-${course.course_name?.replace(/\s+/g, '-')}`,
                            name: course.course_name || club.club_name,
                            city: club.city,
                            state: club.state,
                            country: club.country,
                            latitude: club.latitude,
                            longitude: club.longitude,
                            source: 'rapidapi' as const,
                            _score: bestScore, // Internal field for sorting
                        } as CourseSearchResult);
                    }
                }
            } else {
                // Club without individual course data
                if (clubScore > 0) {
                    results.push({
                        id: `rapid-${club.place_id}`,
                        name: club.club_name,
                        city: club.city,
                        state: club.state,
                        country: club.country,
                        latitude: club.latitude,
                        longitude: club.longitude,
                        source: 'rapidapi' as const,
                        _score: clubScore,
                    } as CourseSearchResult);
                }
            }
        }

        // Sort by match score (best matches first)
        return results
            .sort((a, b) => ((b as unknown as {_score: number})._score || 0) - ((a as unknown as {_score: number})._score || 0))
            .slice(0, 50);

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
        const results: CourseSearchResult[] = [];
        const queryLower = query.toLowerCase();
        const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);

        // Try multiple search variations for better coverage
        const searchVariations = [
            state ? `${query} golf ${state}` : `${query} golf`,
            state ? `${query} golf course ${state}` : `${query} golf course`,
            state ? `${query} country club ${state}` : `${query} country club`,
            query, // Plain query in case it's already a golf course name
        ];

        for (const searchQuery of searchVariations) {
            if (results.length >= 20) break; // Enough results

            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?` +
                `q=${encodeURIComponent(searchQuery)}&` +
                `format=json&` +
                `limit=30&` +
                `addressdetails=1`,
                {
                    headers: {
                        'User-Agent': 'GolfRyderCupApp/1.0',
                    },
                }
            );

            if (!response.ok) continue;

            const data = await response.json();

            for (const place of data) {
                // Include golf courses OR places that match the query name
                const isGolfCourse = place.type === 'golf_course' ||
                    place.class === 'leisure' ||
                    place.display_name?.toLowerCase().includes('golf');

                const placeName = place.display_name?.split(',')[0] || '';
                const placeNameLower = placeName.toLowerCase();

                // Score name match
                let nameMatchScore = 0;
                if (placeNameLower.includes(queryLower)) nameMatchScore = 80;
                else if (queryLower.includes(placeNameLower)) nameMatchScore = 70;
                else {
                    for (const word of queryWords) {
                        if (placeNameLower.includes(word)) nameMatchScore += 15;
                    }
                }

                // Only include if it's a golf course OR has good name match
                if (isGolfCourse || nameMatchScore >= 30) {
                    const id = `osm-${place.place_id}`;
                    if (!results.some(r => r.id === id)) {
                        results.push({
                            id,
                            name: placeName,
                            city: place.address?.city || place.address?.town || place.address?.village,
                            state: place.address?.state,
                            country: place.address?.country,
                            latitude: parseFloat(place.lat),
                            longitude: parseFloat(place.lon),
                            source: 'osm' as const,
                        });
                    }
                }
            }

            // Small delay to respect OSM rate limits
            if (results.length < 20) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        // Sort by relevance (golf courses first, then name match quality)
        return results.slice(0, 50);
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
