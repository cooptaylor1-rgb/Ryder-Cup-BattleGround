import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimit, addRateLimitHeaders } from '@/lib/utils/apiMiddleware';

/**
 * Golf Course Details API
 *
 * Fetches complete course data including:
 * - All tee sets with yardages
 * - Par for each hole
 * - Handicap indices
 * - Course/slope ratings
 *
 * Primary source: GHIN (USGA) database
 * Fallback: Web scraping from public course pages
 */

// Rate limiting: 30 requests per minute per IP
const RATE_LIMIT_CONFIG = {
    windowMs: 60 * 1000,
    maxRequests: 30,
};

interface HoleData {
    par: number;
    handicap: number;
    yardage: number | null;
}

interface TeeSetData {
    name: string;
    color?: string;
    gender?: 'mens' | 'womens' | 'unisex';
    rating?: number;
    slope?: number;
    yardages: (number | null)[];
    totalYardage?: number;
}

interface CourseDetailsResponse {
    id: string;
    name: string;
    address?: string;
    city?: string;
    state?: string;
    phone?: string;
    website?: string;
    holes: HoleData[];
    teeSets: TeeSetData[];
    source: string;
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ courseId: string }> }
) {
    // Apply rate limiting
    const rateLimitError = applyRateLimit(request, RATE_LIMIT_CONFIG);
    if (rateLimitError) {
        return rateLimitError;
    }

    const { courseId } = await params;

    if (!courseId) {
        return NextResponse.json(
            { error: 'Course ID is required' },
            { status: 400 }
        );
    }

    try {
        let courseData: CourseDetailsResponse | null = null;

        // Parse course ID to determine source
        const [source, id] = courseId.includes('-')
            ? [courseId.split('-')[0], courseId.split('-').slice(1).join('-')]
            : ['unknown', courseId];

        // Try to fetch from appropriate source
        if (source === 'ghin' && process.env.GHIN_API_KEY) {
            courseData = await fetchFromGHIN(id, process.env.GHIN_API_KEY);
        }

        // If no data yet, try alternative sources
        if (!courseData) {
            // Try fetching from Blue Golf (popular course management system)
            courseData = await tryBlueGolfScrape(courseId);
        }

        if (!courseData) {
            // Return sample/placeholder data with correct structure
            courseData = generatePlaceholderCourse(courseId);
        }

        let res = NextResponse.json({
            success: true,
            data: courseData,
        });
        res = addRateLimitHeaders(res, request, RATE_LIMIT_CONFIG);
        return res;
    } catch (error) {
        console.error('Course details error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch course details', details: String(error) },
            { status: 500 }
        );
    }
}

// Fetch course details from GHIN
async function fetchFromGHIN(
    courseId: string,
    apiKey: string
): Promise<CourseDetailsResponse | null> {
    try {
        const response = await fetch(
            `https://api.ghin.com/api/v1/courses/${courseId}`,
            {
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                },
            }
        );

        if (!response.ok) return null;

        const data = await response.json();
        const course = data.course || data;

        // Extract tee sets
        const teeSets: TeeSetData[] = (course.TeeSets || course.tee_sets || []).map((tee: {
            TeeSetID?: string;
            TeeName?: string;
            TeeColor?: string;
            Gender?: string;
            CourseRating?: number;
            SlopeRating?: number;
            TotalYardage?: number;
            Holes?: Array<{ Yardage: number }>;
        }) => ({
            name: tee.TeeName || 'Unknown',
            color: tee.TeeColor,
            gender: tee.Gender?.toLowerCase() as 'mens' | 'womens' | 'unisex',
            rating: tee.CourseRating,
            slope: tee.SlopeRating,
            totalYardage: tee.TotalYardage,
            yardages: (tee.Holes || []).map((h) => h.Yardage || null),
        }));

        // Extract hole data (par and handicap typically from course level)
        const holes: HoleData[] = [];
        const courseHoles = course.Holes || [];

        for (let i = 0; i < 18; i++) {
            const hole = courseHoles[i] || {};
            holes.push({
                par: hole.Par || 4,
                handicap: hole.Handicap || hole.HcpMens || hole.HcpWomens || (i + 1),
                yardage: teeSets[0]?.yardages?.[i] || null,
            });
        }

        return {
            id: `ghin-${courseId}`,
            name: course.CourseName || course.name,
            address: course.Address,
            city: course.City,
            state: course.State,
            phone: course.Phone,
            website: course.Website,
            holes,
            teeSets,
            source: 'ghin',
        };
    } catch (error) {
        console.error('GHIN fetch error:', error);
        return null;
    }
}

// Try scraping from Blue Golf (many courses use this)
async function tryBlueGolfScrape(
    courseId: string
): Promise<CourseDetailsResponse | null> {
    // This would require server-side scraping which has legal/TOS implications
    // For now, return null and rely on OCR
    return null;
}

// Generate placeholder course structure when no data found
function generatePlaceholderCourse(courseId: string): CourseDetailsResponse {
    // Standard par-72 layout
    const standardPars = [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5];
    const standardHandicaps = [7, 15, 11, 1, 9, 3, 17, 13, 5, 8, 16, 12, 2, 10, 4, 18, 14, 6];

    return {
        id: courseId,
        name: 'Unknown Course',
        holes: standardPars.map((par, i) => ({
            par,
            handicap: standardHandicaps[i],
            yardage: null,
        })),
        teeSets: [
            {
                name: 'Championship',
                color: 'Black',
                yardages: Array(18).fill(null),
            },
            {
                name: 'Men\'s',
                color: 'Blue',
                yardages: Array(18).fill(null),
            },
            {
                name: 'Senior',
                color: 'White',
                yardages: Array(18).fill(null),
            },
            {
                name: 'Forward',
                color: 'Red',
                yardages: Array(18).fill(null),
            },
        ],
        source: 'placeholder',
    };
}
