import { apiLogger } from '@/lib/utils/logger';

import { buildCourseDetailsResponse } from './golfCourseDetailsShared';
import { fetchWithTimeout } from './golfCourseDetailsShared';
import type { CourseDetailsResponse, TeeSetData } from './golfCourseDetailsTypes';

export async function fetchFromGHIN(
  courseId: string,
  apiKey: string
): Promise<CourseDetailsResponse | null> {
  try {
    const response = await fetchWithTimeout(`https://api.ghin.com/api/v1/courses/${courseId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) return null;

    const data = await response.json();
    const course = data.course || data;

    const teeSets: TeeSetData[] = (course.TeeSets || course.tee_sets || []).map(
      (tee: {
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
        yardages: (tee.Holes || []).map((hole) => hole.Yardage || null),
      })
    );

    const courseHoles = course.Holes || [];
    const holes = Array.from({ length: 18 }, (_, index) => {
      const hole = courseHoles[index] || {};
      return {
        par: hole.Par || 4,
        handicap: hole.Handicap || hole.HcpMens || hole.HcpWomens || index + 1,
        yardage: teeSets[0]?.yardages?.[index] || null,
      };
    });

    return buildCourseDetailsResponse({
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
      provenance: [
        {
          kind: 'provider',
          label: 'GHIN course database',
          confidence: 'high',
        },
      ],
    });
  } catch (error) {
    apiLogger.error('GHIN fetch error:', error);
    return null;
  }
}

export async function tryBlueGolfScrape(_courseId: string): Promise<CourseDetailsResponse | null> {
  return null;
}
