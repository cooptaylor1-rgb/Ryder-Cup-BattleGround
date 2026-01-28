import { NextRequest, NextResponse } from 'next/server';
import {
  searchCloudCourses,
  getCloudCourse,
  incrementCourseUsage,
} from '@/lib/services/courseLibrarySyncService';
import { apiLogger } from '@/lib/utils/logger';
import { applyRateLimit, addRateLimitHeaders } from '@/lib/utils/apiMiddleware';
import {
  courseLibrarySearchSchema,
  courseLibraryGetSchema,
  formatZodError,
} from '@/lib/validations/api';

// Rate limit: 60 requests per minute for search operations
const RATE_LIMIT_CONFIG = { maxRequests: 60, windowMs: 60000 };

/**
 * COURSE LIBRARY SEARCH API
 *
 * Searches the cloud course library for existing courses.
 * Used by the scorecard OCR workflow to check for duplicates.
 *
 * Features:
 * - Fuzzy name matching
 * - Returns course with tee sets
 * - Increments usage count on selection
 */

interface SearchResult {
  id: string;
  name: string;
  location?: string;
  usageCount: number;
  hasTeeSets: boolean;
  confidence: number;
}

/**
 * Search for courses by name (fuzzy match)
 */
export async function GET(request: NextRequest) {
  // Apply rate limiting
  const rateLimitError = applyRateLimit(request, RATE_LIMIT_CONFIG);
  if (rateLimitError) return rateLimitError;

  const { searchParams } = new URL(request.url);

  // Validate query parameters with Zod
  const parseResult = courseLibrarySearchSchema.safeParse({
    q: searchParams.get('q'),
  });

  if (!parseResult.success) {
    const details = formatZodError(parseResult.error);
    return NextResponse.json(
      {
        error: `Invalid parameters: ${details}`,
        details,
      },
      { status: 400 }
    );
  }

  const { q: query } = parseResult.data;

  try {
    const courses = await searchCloudCourses(query);

    // Calculate confidence scores based on name similarity
    const results: SearchResult[] = courses.map((course) => {
      const similarity = calculateSimilarity(query.toLowerCase(), course.name.toLowerCase());
      return {
        id: course.id,
        name: course.name,
        location: course.location || undefined,
        usageCount: course.usage_count || 0,
        hasTeeSets: true, // We always store tee sets
        confidence: similarity,
      };
    });

    // Sort by confidence then usage
    results.sort((a, b) => {
      if (Math.abs(a.confidence - b.confidence) > 0.1) {
        return b.confidence - a.confidence;
      }
      return b.usageCount - a.usageCount;
    });

    return NextResponse.json({
      success: true,
      results,
      query,
    });
  } catch (error) {
    apiLogger.error('Course search error:', error);
    return NextResponse.json({ error: 'Search failed' }, { status: 500 });
  }
}

/**
 * Get full course details and mark as used
 */
export async function POST(request: NextRequest) {
  // Apply rate limiting
  const rateLimitError = applyRateLimit(request, RATE_LIMIT_CONFIG);
  if (rateLimitError) return rateLimitError;

  try {
    const rawBody = await request.json();

    // Validate request body with Zod
    const parseResult = courseLibraryGetSchema.safeParse(rawBody);
    if (!parseResult.success) {
      const details = formatZodError(parseResult.error);
      return NextResponse.json(
        {
          error: `Invalid request: ${details}`,
          details,
        },
        { status: 400 }
      );
    }

    const { courseId } = parseResult.data;

    const result = await getCloudCourse(courseId);

    if (!result) {
      return NextResponse.json({ error: 'Course not found' }, { status: 404 });
    }

    // Increment usage count asynchronously
    incrementCourseUsage(courseId).catch((err) => {
      apiLogger.error('Failed to increment usage:', err);
    });

    // Convert to the format expected by the app
    const course = {
      id: result.course.id,
      name: result.course.name,
      location: result.course.location,
      teeSets: result.teeSets.map((ts) => ({
        id: ts.id,
        courseId: ts.course_library_id,
        name: ts.name,
        color: ts.color,
        rating: ts.rating,
        slope: ts.slope,
        par: ts.par,
        holeHandicaps: ts.hole_handicaps,
        holePars: ts.hole_pars,
        yardages: ts.hole_yardages,
        totalYardage: ts.total_yardage,
      })),
    };

    return NextResponse.json({
      success: true,
      course,
    });
  } catch (error) {
    apiLogger.error('Course get error:', error);
    return NextResponse.json({ error: 'Failed to get course' }, { status: 500 });
  }
}

/**
 * Calculate string similarity (Jaro-Winkler-like)
 */
function calculateSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;

  // Exact word matches get high scores
  const words1 = s1.split(/\s+/);
  const words2 = s2.split(/\s+/);
  const matchingWords = words1.filter((w) => words2.includes(w));
  const wordScore = matchingWords.length / Math.max(words1.length, words2.length);

  // Prefix matching (common for course names)
  let prefixLen = 0;
  const maxPrefix = Math.min(s1.length, s2.length, 4);
  for (let i = 0; i < maxPrefix; i++) {
    if (s1[i] === s2[i]) prefixLen++;
    else break;
  }
  const prefixScore = prefixLen / maxPrefix;

  // Containment check
  const containsScore = s2.includes(s1) || s1.includes(s2) ? 0.3 : 0;

  // Levenshtein distance for remaining similarity
  const maxLen = Math.max(s1.length, s2.length);
  const distance = levenshteinDistance(s1, s2);
  const levenScore = 1 - distance / maxLen;

  // Weighted combination
  return Math.min(1, wordScore * 0.4 + prefixScore * 0.2 + containsScore + levenScore * 0.2);
}

function levenshteinDistance(s1: string, s2: string): number {
  const m = s1.length;
  const n = s2.length;
  const dp: number[][] = Array(m + 1)
    .fill(null)
    .map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}
