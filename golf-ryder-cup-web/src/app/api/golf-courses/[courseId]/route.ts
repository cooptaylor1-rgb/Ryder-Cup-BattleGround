import { NextRequest, NextResponse } from 'next/server';
import { applyRateLimitAsync, addRateLimitHeaders } from '@/lib/utils/apiMiddleware';
import { apiLogger } from '@/lib/utils/logger';
import { formatZodError, golfCourseDetailsParamsSchema } from '@/lib/validations/api';

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
const UPSTREAM_TIMEOUT_MS = 8000;

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
    country?: string;
    phone?: string;
    website?: string;
    description?: string;
    sourcePageUrl?: string;
    holes: HoleData[];
    teeSets: TeeSetData[];
    source: string;
}

interface ExtractedCourseProfile {
    name?: string;
    address?: string;
    city?: string;
    state?: string;
    country?: string;
    phone?: string;
    website?: string;
    description?: string;
    holes: HoleData[];
    teeSets: TeeSetData[];
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ courseId: string }> }
) {
    // Apply rate limiting
    const rateLimitError = await applyRateLimitAsync(request, RATE_LIMIT_CONFIG);
    if (rateLimitError) {
        return rateLimitError;
    }

    const parseResult = golfCourseDetailsParamsSchema.safeParse(await params);
    if (!parseResult.success) {
        return NextResponse.json(
            { error: formatZodError(parseResult.error) },
            { status: 400 }
        );
    }

    const { courseId } = parseResult.data;
    const website = normalizeWebsiteUrl(request.nextUrl.searchParams.get('website'));
    const titleHint = request.nextUrl.searchParams.get('title') ?? undefined;
    const descriptionHint = request.nextUrl.searchParams.get('description') ?? undefined;

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

        if (!courseData && website) {
            courseData = await extractFromWebProfile({
                courseId,
                website,
                titleHint,
                descriptionHint,
            });
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
        apiLogger.error('Course details error:', error);
        return NextResponse.json(
            { error: 'Failed to fetch course details' },
            { status: 500 }
        );
    }
}

function normalizeWebsiteUrl(value: string | null): string | undefined {
    if (!value) return undefined;

    try {
        const parsed = new URL(value);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return undefined;
        }
        return parsed.toString();
    } catch {
        return undefined;
    }
}

async function fetchWithTimeout(input: string, init: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

    try {
        return await fetch(input, {
            ...init,
            signal: controller.signal,
        });
    } finally {
        clearTimeout(timeout);
    }
}

// Fetch course details from GHIN
async function fetchFromGHIN(
    courseId: string,
    apiKey: string
): Promise<CourseDetailsResponse | null> {
    try {
        const response = await fetchWithTimeout(
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
        apiLogger.error('GHIN fetch error:', error);
        return null;
    }
}

// Try scraping from Blue Golf (many courses use this)
async function tryBlueGolfScrape(
    _courseId: string
): Promise<CourseDetailsResponse | null> {
    // This would require server-side scraping which has legal/TOS implications
    // For now, return null and rely on OCR
    return null;
}

async function extractFromWebProfile({
    courseId,
    website,
    titleHint,
    descriptionHint,
}: {
    courseId: string;
    website: string;
    titleHint?: string;
    descriptionHint?: string;
}): Promise<CourseDetailsResponse | null> {
    try {
        const response = await fetchWithTimeout(website, {
            headers: {
                'User-Agent': 'GolfRyderCupApp/1.0',
                Accept: 'text/html,application/xhtml+xml',
            },
        });

        if (!response.ok) return null;

        const html = await response.text();
        const structuredRecords = extractJsonLdRecords(html);
        const meta = extractMetaTags(html);
        const pageText = extractPageText(html);

        const structuredProfile = buildProfileFromStructuredData(structuredRecords);
        const heuristicProfile = buildProfileFromPageSignals(pageText, html);

        const holes = coerceHoles(
            structuredProfile.holes.length > 0 ? structuredProfile.holes : heuristicProfile.holes
        );
        const teeSets = coerceTeeSets(
            structuredProfile.teeSets.length > 0 ? structuredProfile.teeSets : heuristicProfile.teeSets
        );

        return {
            id: courseId,
            name:
                structuredProfile.name ||
                heuristicProfile.name ||
                meta.ogTitle ||
                meta.title ||
                titleHint ||
                'Unknown Course',
            address: structuredProfile.address || heuristicProfile.address,
            city: structuredProfile.city || heuristicProfile.city,
            state: structuredProfile.state || heuristicProfile.state,
            country: structuredProfile.country || heuristicProfile.country,
            phone: structuredProfile.phone || heuristicProfile.phone,
            website: structuredProfile.website || meta.canonical || website,
            description:
                structuredProfile.description ||
                heuristicProfile.description ||
                meta.description ||
                descriptionHint,
            sourcePageUrl: website,
            holes,
            teeSets,
            source: teeSets.length > 0 || holes.some((hole) => hole.yardage !== null) ? 'web-extracted' : 'web-profile',
        };
    } catch (error) {
        apiLogger.error('Web profile extraction error:', { website, error });
        return null;
    }
}

function extractJsonLdRecords(html: string): Record<string, unknown>[] {
    const records: Record<string, unknown>[] = [];
    const matches = html.matchAll(
        /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
    );

    for (const match of matches) {
        const raw = match[1]?.trim();
        if (!raw) continue;
        try {
            const parsed = JSON.parse(raw);
            const items = Array.isArray(parsed)
                ? parsed
                : Array.isArray(parsed?.['@graph'])
                  ? parsed['@graph']
                  : [parsed];

            for (const item of items) {
                if (item && typeof item === 'object') {
                    records.push(item as Record<string, unknown>);
                }
            }
        } catch {
            // Ignore malformed JSON-LD fragments
        }
    }

    return records;
}

function extractMetaTags(html: string): {
    title?: string;
    ogTitle?: string;
    description?: string;
    canonical?: string;
} {
    const readMeta = (pattern: RegExp) => {
        const match = pattern.exec(html);
        return match?.[1] ? decodeHtml(stripTags(match[1]).trim()) : undefined;
    };

    return {
        title: readMeta(/<title[^>]*>([\s\S]*?)<\/title>/i),
        ogTitle: readMeta(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i),
        description:
            readMeta(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i) ||
            readMeta(/<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i),
        canonical:
            readMeta(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i) ||
            readMeta(/<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i),
    };
}

function buildProfileFromStructuredData(records: Record<string, unknown>[]): ExtractedCourseProfile {
    const profile: ExtractedCourseProfile = {
        holes: [] as HoleData[],
        teeSets: [] as TeeSetData[],
    };

    for (const record of records) {
        const type = getSchemaType(record);
        if (!type.some((entry) => /GolfCourse|SportsActivityLocation|LocalBusiness|Place|Organization/i.test(entry))) {
            continue;
        }

        const address = asRecord(record.address);
        const geo = asRecord(record.geo);
        const teeSets = extractTeeSetsFromStructuredRecord(record);

        if (!profile.name) profile.name = asString(record.name);
        if (!profile.description) profile.description = asString(record.description);
        if (!profile.phone) profile.phone = asString(record.telephone);
        if (!profile.website) profile.website = asString(record.url);
        if (!profile.address) {
            profile.address = [asString(address.streetAddress), asString(address.addressLocality), asString(address.addressRegion)]
                .filter(Boolean)
                .join(', ') || undefined;
        }
        if (!profile.city) profile.city = asString(address.addressLocality);
        if (!profile.state) profile.state = asString(address.addressRegion);
        if (!profile.country) profile.country = asString(address.addressCountry);

        if (teeSets.length > 0 && profile.teeSets.length === 0) {
            profile.teeSets = teeSets;
        }

        if (profile.holes.length === 0) {
            const holes = extractHolesFromStructuredRecord(record);
            if (holes.length > 0) profile.holes = holes;
        }

        if (!profile.address && geo && (asNumber(geo.latitude) || asNumber(geo.longitude))) {
            profile.address = undefined;
        }
    }

    return profile;
}

function buildProfileFromPageSignals(pageText: string, html: string): ExtractedCourseProfile {
    const teeSets = extractTeeSetsFromText(pageText, html);
    const holes = extractHoleDataFromText(pageText);
    const phone = pageText.match(/(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]\d{4}/)?.[0];
    const addressMatch = pageText.match(
        /\b\d{1,5}\s+[A-Za-z0-9.'#\-\s]+,\s*[A-Za-z.\-\s]+,\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?/i
    );
    const description = summarizePageText(pageText);
    const location = extractLocationFromText(pageText);

    return {
        name: undefined,
        address: addressMatch?.[0],
        city: location.city,
        state: location.state,
        country: location.country,
        phone,
        description,
        holes,
        teeSets,
    };
}

function extractPageText(html: string): string {
    return decodeHtml(
        html
            .replace(/<script[\s\S]*?<\/script>/gi, ' ')
            .replace(/<style[\s\S]*?<\/style>/gi, ' ')
            .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
    );
}

function extractLocationFromText(pageText: string): {
    city?: string;
    state?: string;
    country?: string;
} {
    const usLocation = pageText.match(/\b([A-Z][a-zA-Z.\-\s]+),\s*([A-Z]{2})\b/);
    if (usLocation) {
        return {
            city: usLocation[1].trim(),
            state: usLocation[2].trim(),
        };
    }

    const internationalLocation = pageText.match(
        /\b([A-Z][a-zA-Z.\-\s]+),\s*([A-Z][a-zA-Z.\-\s]+),\s*(Scotland|England|Ireland|Wales|Canada|Australia|New Zealand|United States)\b/
    );
    if (internationalLocation) {
        return {
            city: internationalLocation[1].trim(),
            state: internationalLocation[2].trim(),
            country: internationalLocation[3].trim(),
        };
    }

    return {};
}

function summarizePageText(pageText: string): string | undefined {
    const sentences = pageText
        .split(/(?<=[.!?])\s+/)
        .map((sentence) => sentence.trim())
        .filter(
            (sentence) =>
                sentence.length >= 60 &&
                sentence.length <= 220 &&
                /course|golf|links|club|resort/i.test(sentence)
        );

    return sentences[0];
}

function extractTeeSetsFromStructuredRecord(record: Record<string, unknown>): TeeSetData[] {
    const teeCandidates = [
        ...(Array.isArray(record.teeSets) ? record.teeSets : []),
        ...(Array.isArray(record.amenityFeature) ? record.amenityFeature : []),
    ];

    return teeCandidates
        .map((entry) => asRecord(entry))
        .map((entry): TeeSetData | null => {
            const name = asString(entry.name);
            if (!name) return null;

            const rating = asNumber(entry.courseRating) ?? asNumber(entry.ratingValue);
            const slope = asNumber(entry.slopeRating) ?? asNumber(entry.slope);
            const totalYardage = asNumber(entry.totalYardage) ?? asNumber(entry.yardage);

            return {
                name,
                color: inferTeeColor(name),
                rating: rating ?? undefined,
                slope: slope ?? undefined,
                totalYardage: totalYardage ?? undefined,
                yardages: Array(18).fill(null),
            };
        })
        .filter((tee): tee is TeeSetData => tee !== null);
}

function extractHolesFromStructuredRecord(record: Record<string, unknown>): HoleData[] {
    const candidates = Array.isArray(record.holes) ? record.holes : [];
    const holes = candidates
        .map((entry) => asRecord(entry))
        .map((entry) => ({
            par: asNumber(entry.par) ?? 4,
            handicap: asNumber(entry.handicap) ?? asNumber(entry.index) ?? 0,
            yardage: asNumber(entry.yardage),
        }))
        .filter((hole) => hole.handicap > 0);

    return holes.length === 18 ? holes : [];
}

function extractTeeSetsFromText(pageText: string, html: string): TeeSetData[] {
    const tees: TeeSetData[] = [];
    const patterns = [
        /\b(Black|Blue|White|Gold|Red|Green|Silver|Orange|Championship|Forward|Members?|Ladies?)\s+(?:tees?|markers?)?\s*(?:[-:])?\s*(?:rating\s*)?(\d{2}\.\d)\s*[\/-]\s*(\d{2,3})/gi,
        /\b(Black|Blue|White|Gold|Red|Green|Silver|Orange|Championship|Forward|Members?|Ladies?)\s+(?:tees?|markers?)?.{0,80}?(\d{2}\.\d)\s*[\/-]\s*(\d{2,3})/gi,
    ];

    for (const pattern of patterns) {
        const matches = pageText.matchAll(pattern);
        for (const match of matches) {
            const name = match[1]?.trim();
            const rating = Number.parseFloat(match[2]);
            const slope = Number.parseInt(match[3], 10);
            if (!name || Number.isNaN(rating) || Number.isNaN(slope)) continue;
            if (tees.some((tee) => tee.name.toLowerCase() === name.toLowerCase())) continue;

            tees.push({
                name,
                color: inferTeeColor(name),
                rating,
                slope,
                yardages: Array(18).fill(null),
            });
        }
    }

    const yardageMatches = Array.from(
        html.matchAll(/\b(\d{3,4})\s*(?:yards?|yds?)\b/gi),
        (match) => Number.parseInt(match[1], 10)
    ).filter((value) => value >= 3000 && value <= 8000);

    if (yardageMatches.length > 0 && tees.length > 0) {
        tees[0].totalYardage = yardageMatches[0];
    }

    return tees;
}

function extractHoleDataFromText(pageText: string): HoleData[] {
    const pars = Array.from(pageText.matchAll(/\bPar\s*([345])\b/gi), (match) =>
        Number.parseInt(match[1], 10)
    );
    const handicaps = Array.from(pageText.matchAll(/\b(?:HCP|Handicap)\s*(\d{1,2})\b/gi), (match) =>
        Number.parseInt(match[1], 10)
    );

    if (pars.length >= 18) {
        return Array.from({ length: 18 }, (_, index) => ({
            par: pars[index] ?? 4,
            handicap: handicaps[index] ?? index + 1,
            yardage: null,
        }));
    }

    return [];
}

function coerceHoles(holes: HoleData[]): HoleData[] {
    if (holes.length === 18) {
        return holes.map((hole, index) => ({
            par: hole.par || 4,
            handicap: hole.handicap || index + 1,
            yardage: hole.yardage ?? null,
        }));
    }

    return [];
}

function coerceTeeSets(teeSets: TeeSetData[]): TeeSetData[] {
    return teeSets.map((tee) => ({
        name: tee.name,
        color: tee.color,
        gender: tee.gender,
        rating: tee.rating,
        slope: tee.slope,
        totalYardage: tee.totalYardage,
        yardages:
            tee.yardages && tee.yardages.length === 18
                ? tee.yardages
                : Array(18).fill(null),
    }));
}

function getSchemaType(record: Record<string, unknown>): string[] {
    const type = record['@type'];
    if (Array.isArray(type)) {
        return type.filter((entry): entry is string => typeof entry === 'string');
    }
    return typeof type === 'string' ? [type] : [];
}

function asRecord(value: unknown): Record<string, unknown> {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string | undefined {
    return typeof value === 'string' && value.trim().length > 0 ? decodeHtml(value.trim()) : undefined;
}

function asNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
    if (typeof value === 'string') {
        const parsed = Number.parseFloat(value.replace(/[^0-9.]/g, ''));
        return Number.isFinite(parsed) ? parsed : null;
    }
    return null;
}

function inferTeeColor(name: string): string {
    const value = name.toLowerCase();
    if (value.includes('black') || value.includes('championship')) return 'Black';
    if (value.includes('blue')) return 'Blue';
    if (value.includes('white')) return 'White';
    if (value.includes('gold')) return 'Gold';
    if (value.includes('red') || value.includes('forward')) return 'Red';
    if (value.includes('green')) return 'Green';
    if (value.includes('silver')) return 'Silver';
    if (value.includes('orange')) return 'Orange';
    return name;
}

function stripTags(value: string): string {
    return value.replace(/<[^>]+>/g, ' ');
}

function decodeHtml(value: string): string {
    return value
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&nbsp;/g, ' ')
        .replace(/&ndash;/g, '–')
        .replace(/&rsquo;/g, '’')
        .replace(/&ldquo;/g, '“')
        .replace(/&rdquo;/g, '”');
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
