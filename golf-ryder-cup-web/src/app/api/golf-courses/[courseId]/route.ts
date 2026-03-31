import { NextRequest, NextResponse } from 'next/server';

import { loadCourseDetails } from '@/lib/services/golf-course-details/golfCourseDetailsPipeline';
import { normalizeWebsiteUrl } from '@/lib/services/golf-course-details/golfCourseDetailsShared';
import { applyRateLimitAsync, addRateLimitHeaders } from '@/lib/utils/apiMiddleware';
import { RATE_LIMIT_DATA } from '@/lib/constants/rateLimits';
import { apiLogger } from '@/lib/utils/logger';
import { formatZodError, golfCourseDetailsParamsSchema } from '@/lib/validations/api';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const rateLimitError = await applyRateLimitAsync(request, RATE_LIMIT_DATA);
  if (rateLimitError) {
    return rateLimitError;
  }

  const parseResult = golfCourseDetailsParamsSchema.safeParse(await params);
  if (!parseResult.success) {
    return NextResponse.json({ error: formatZodError(parseResult.error) }, { status: 400 });
  }

  const { courseId } = parseResult.data;

  try {
    const courseData = await loadCourseDetails({
      courseId,
      website: normalizeWebsiteUrl(request.nextUrl.searchParams.get('website')),
      titleHint: request.nextUrl.searchParams.get('title') ?? undefined,
      descriptionHint: request.nextUrl.searchParams.get('description') ?? undefined,
    });

    let response = NextResponse.json({
      success: true,
      data: courseData,
    });
    response = addRateLimitHeaders(response, request, RATE_LIMIT_DATA);
    return response;
  } catch (error) {
    apiLogger.error('Course details error:', error);
    return NextResponse.json({ error: 'Failed to fetch course details' }, { status: 500 });
  }
}
