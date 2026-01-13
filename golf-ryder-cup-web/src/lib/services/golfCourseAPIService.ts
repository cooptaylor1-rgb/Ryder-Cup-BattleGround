/**
 * Golf Course API Service
 *
 * Integration with external Golf Course Database API
 * for searching and importing real course data.
 *
 * API Documentation: https://golfcourseapi.com
 */

const API_BASE_URL = 'https://api.golfcourseapi.com/v1';

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

/**
 * Get API key from environment or return null
 */
function getApiKey(): string | null {
    // Check for environment variable (server-side or build-time)
    if (typeof process !== 'undefined' && process.env.GOLF_COURSE_API_KEY) {
        return process.env.GOLF_COURSE_API_KEY;
    }
    // Check for Next.js public environment variable (client-side)
    if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_GOLF_COURSE_API_KEY) {
        return process.env.NEXT_PUBLIC_GOLF_COURSE_API_KEY;
    }
    return null;
}

/**
 * Check if the Golf Course API is configured
 */
export function isGolfCourseAPIConfigured(): boolean {
    return getApiKey() !== null;
}

/**
 * Make authenticated request to Golf Course API
 */
async function apiRequest<T>(endpoint: string): Promise<T> {
    const apiKey = getApiKey();
    if (!apiKey) {
        throw new Error('Golf Course API key not configured. Set NEXT_PUBLIC_GOLF_COURSE_API_KEY environment variable.');
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
            'Authorization': `Key ${apiKey}`,
            'Accept': 'application/json',
        },
    });

    if (!response.ok) {
        if (response.status === 401) {
            throw new Error('Invalid Golf Course API key');
        }
        if (response.status === 429) {
            throw new Error('Golf Course API rate limit exceeded. Please try again later.');
        }
        throw new Error(`Golf Course API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
}

/**
 * Search for golf courses by name or location
 */
export async function searchCourses(query: string): Promise<GolfCourseAPICourse[]> {
    if (!query || query.trim().length < 2) {
        return [];
    }

    const encodedQuery = encodeURIComponent(query.trim());
    const response = await apiRequest<GolfCourseAPISearchResponse>(
        `/courses?search=${encodedQuery}`
    );

    return response.courses || [];
}

/**
 * Get detailed course information by ID
 */
export async function getCourseById(courseId: number): Promise<GolfCourseAPICourse | null> {
    try {
        const response = await apiRequest<GolfCourseAPICourseResponse>(
            `/courses/${courseId}`
        );
        return response.course || null;
    } catch (error) {
        console.error('Failed to fetch course:', error);
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
    const params = new URLSearchParams();
    if (city) params.append('city', city);
    if (state) params.append('state', state);
    if (country) params.append('country', country);

    if (params.toString() === '') {
        return [];
    }

    const response = await apiRequest<GolfCourseAPISearchResponse>(
        `/courses?${params.toString()}`
    );

    return response.courses || [];
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
