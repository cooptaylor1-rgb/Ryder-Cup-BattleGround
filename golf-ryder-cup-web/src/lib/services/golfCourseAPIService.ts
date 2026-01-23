/**
 * Golf Course API Service
 *
 * Integration with external Golf Course Database API
 * for searching and importing real course data.
 * Uses server-side API route to keep API key secure.
 *
 * API Documentation: https://golfcourseapi.com
 */

import { createLogger } from '../utils/logger';

const logger = createLogger('GolfCourseAPI');

/**
 * API Response Types
 */
export interface GolfCourseAPIHole {
    par: number;
    yardage: number;
    handicap: number;
}

export interface GolfCourseAPITee {
    tee_name: string;
    course_rating: number;
    slope_rating: number;
    bogey_rating?: number;
    total_yards: number;
    total_meters?: number;
    number_of_holes: number;
    par_total: number;
    front_course_rating?: number;
    front_slope_rating?: number;
    back_course_rating?: number;
    back_slope_rating?: number;
    holes?: GolfCourseAPIHole[];
}

export interface GolfCourseAPILocation {
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    latitude?: number;
    longitude?: number;
}

export interface GolfCourseAPICourse {
    id: number;
    club_name: string;
    course_name: string;
    location: GolfCourseAPILocation;
    tees?: {
        male?: GolfCourseAPITee[];
        female?: GolfCourseAPITee[];
    };
}

export interface GolfCourseAPISearchResponse {
    courses: GolfCourseAPICourse[];
}

export interface GolfCourseAPICourseResponse {
    course: GolfCourseAPICourse;
}

// Cache the configuration check result
let configuredCache: boolean | null = null;

/**
 * Check if the Golf Course API is configured (via server-side API route)
 * 
 * Note: We always return true because we have a free OSM-based fallback
 * that works even without the paid API key.
 */
export async function checkGolfCourseAPIConfigured(): Promise<boolean> {
    // Always return true - we have a free fallback
    // Still check the paid API to cache the result for optimization
    if (configuredCache === null) {
        try {
            const response = await fetch('/api/golf-courses?action=check');
            const data = await response.json();
            configuredCache = data.configured === true;
        } catch {
            configuredCache = false;
        }
    }
    // Always return true since we have OSM fallback
    return true;
}

/**
 * Synchronous check - returns cached value or assumes not configured
 * Use checkGolfCourseAPIConfigured() for accurate async check
 */
export function isGolfCourseAPIConfigured(): boolean {
    // If we've checked before, return cached value
    if (configuredCache !== null) {
        return configuredCache;
    }
    // Trigger async check for future calls
    checkGolfCourseAPIConfigured();
    // Default to true to show the search UI - actual API call will verify
    return true;
}

/**
 * Search for golf courses by name or location
 * 
 * Falls back to free OSM-based search if the paid API is not configured.
 */
export async function searchCourses(query: string): Promise<GolfCourseAPICourse[]> {
    if (!query || query.trim().length < 2) {
        return [];
    }

    // First try the paid API if we believe it's configured
    if (configuredCache !== false) {
        const response = await fetch(`/api/golf-courses?action=search&q=${encodeURIComponent(query.trim())}`);

        if (response.ok) {
            const data = await response.json();
            return data.courses || [];
        }

        const error = await response.json();
        if (error.configured === false) {
            configuredCache = false;
            // Fall through to free search
        } else {
            throw new Error(error.error || 'Search failed');
        }
    }

    // Fall back to free search API (OSM-based)
    return searchCoursesFree(query);
}

/**
 * Search for golf courses using free OSM-based API
 * This is the fallback when the paid API is not configured.
 */
async function searchCoursesFree(query: string): Promise<GolfCourseAPICourse[]> {
    try {
        const response = await fetch(`/api/golf-courses/search?q=${encodeURIComponent(query.trim())}`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Search failed');
        }

        const data = await response.json();
        
        // Convert free API results to GolfCourseAPICourse format
        return (data.results || []).map((result: {
            id: string;
            name: string;
            city?: string;
            state?: string;
            country?: string;
            latitude?: number;
            longitude?: number;
            source: string;
        }) => ({
            id: parseInt(result.id.replace(/\D/g, '')) || Math.random() * 1000000,
            club_name: result.name,
            course_name: result.name,
            location: {
                city: result.city,
                state: result.state,
                country: result.country,
                latitude: result.latitude,
                longitude: result.longitude,
            },
            // Free API doesn't provide tee data
            tees: undefined,
        }));
    } catch (error) {
        logger.error('Free course search failed:', error);
        throw error;
    }
}

/**
 * Get detailed course information by ID
 */
export async function getCourseById(courseId: number): Promise<GolfCourseAPICourse | null> {
    try {
        const response = await fetch(`/api/golf-courses?action=get&id=${courseId}`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to fetch course');
        }

        const data = await response.json();
        return data.course || null;
    } catch (error) {
        logger.error('Failed to fetch course:', error);
        return null;
    }
}

/**
 * Search courses by location (city, state)
 */
export async function searchCoursesByLocation(
    city?: string,
    state?: string,
    country?: string
): Promise<GolfCourseAPICourse[]> {
    const parts: string[] = [];
    if (city) parts.push(city);
    if (state) parts.push(state);
    if (country) parts.push(country);

    if (parts.length === 0) {
        return [];
    }

    // Use the location as search query
    return searchCourses(parts.join(', '));
}

/**
 * Convert API tee data to our app's TeeSet format
 */
export function convertAPITeeToTeeSet(
    apiTee: GolfCourseAPITee,
    courseId: string
): {
    name: string;
    color: string;
    rating: number;
    slope: number;
    par: number;
    yardage: number;
    holePars: number[];
    holeHandicaps: number[];
} {
    // Extract hole data if available
    const holePars: number[] = [];
    const holeHandicaps: number[] = [];

    if (apiTee.holes && apiTee.holes.length > 0) {
        for (const hole of apiTee.holes) {
            holePars.push(hole.par);
            holeHandicaps.push(hole.handicap);
        }
    }

    // Pad arrays to 18 holes if needed
    while (holePars.length < 18) {
        holePars.push(4); // Default par 4
    }
    while (holeHandicaps.length < 18) {
        holeHandicaps.push(holeHandicaps.length + 1);
    }

    // Determine color from tee name
    const color = inferTeeColor(apiTee.tee_name);

    return {
        name: apiTee.tee_name,
        color,
        rating: apiTee.course_rating,
        slope: apiTee.slope_rating,
        par: apiTee.par_total || holePars.reduce((sum, p) => sum + p, 0),
        yardage: apiTee.total_yards,
        holePars,
        holeHandicaps,
    };
}

/**
 * Infer tee color from tee name
 */
function inferTeeColor(teeName: string): string {
    const name = teeName.toLowerCase();

    if (name.includes('black') || name.includes('championship')) return '#000000';
    if (name.includes('blue') || name.includes('back')) return '#1565C0';
    if (name.includes('white') || name.includes('middle')) return '#FFFFFF';
    if (name.includes('gold') || name.includes('senior')) return '#FFD700';
    if (name.includes('red') || name.includes('forward')) return '#C62828';
    if (name.includes('green')) return '#2E7D32';
    if (name.includes('silver')) return '#9E9E9E';
    if (name.includes('orange')) return '#FF9800';

    // Default to blue
    return '#1565C0';
}

/**
 * Format location for display
 */
export function formatCourseLocation(location: GolfCourseAPILocation): string {
    const parts: string[] = [];

    if (location.city) parts.push(location.city);
    if (location.state) parts.push(location.state);
    if (location.country && location.country !== 'United States') {
        parts.push(location.country);
    }

    return parts.join(', ');
}

/**
 * Get all available tees for a course (combining male and female)
 */
export function getAllTees(course: GolfCourseAPICourse): GolfCourseAPITee[] {
    const tees: GolfCourseAPITee[] = [];

    if (course.tees?.male) {
        tees.push(...course.tees.male);
    }
    if (course.tees?.female) {
        // Add female tees that aren't duplicates
        for (const femaleTee of course.tees.female) {
            const isDuplicate = tees.some(
                t => t.tee_name === femaleTee.tee_name && t.course_rating === femaleTee.course_rating
            );
            if (!isDuplicate) {
                tees.push(femaleTee);
            }
        }
    }

    // Sort by yardage (longest first)
    return tees.sort((a, b) => (b.total_yards || 0) - (a.total_yards || 0));
}
