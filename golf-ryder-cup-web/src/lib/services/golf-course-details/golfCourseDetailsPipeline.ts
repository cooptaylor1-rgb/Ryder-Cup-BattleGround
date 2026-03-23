import { extractFromWebProfile } from './golfCourseDetailsWeb';
import { fetchFromGHIN, tryBlueGolfScrape } from './golfCourseDetailsProviders';
import { buildCourseDetailsResponse } from './golfCourseDetailsShared';
import type { CourseDetailsFetchOptions, CourseDetailsResponse } from './golfCourseDetailsTypes';

export async function loadCourseDetails(
  options: CourseDetailsFetchOptions
): Promise<CourseDetailsResponse> {
  const { courseId, website, titleHint, descriptionHint } = options;

  let courseData: CourseDetailsResponse | null = null;

  const [source, id] = courseId.includes('-')
    ? [courseId.split('-')[0], courseId.split('-').slice(1).join('-')]
    : ['unknown', courseId];

  if (source === 'ghin' && process.env.GHIN_API_KEY) {
    courseData = await fetchFromGHIN(id, process.env.GHIN_API_KEY);
  }

  if (!courseData) {
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

  return courseData ?? generatePlaceholderCourse(courseId);
}

function generatePlaceholderCourse(courseId: string): CourseDetailsResponse {
  const standardPars = [4, 4, 3, 5, 4, 4, 3, 4, 5, 4, 4, 3, 5, 4, 4, 3, 4, 5];
  const standardHandicaps = [7, 15, 11, 1, 9, 3, 17, 13, 5, 8, 16, 12, 2, 10, 4, 18, 14, 6];

  return buildCourseDetailsResponse({
    id: courseId,
    name: 'Unknown Course',
    holes: standardPars.map((par, index) => ({
      par,
      handicap: standardHandicaps[index],
      yardage: null,
    })),
    teeSets: [
      {
        name: 'Championship',
        color: 'Black',
        yardages: Array(18).fill(null),
      },
      {
        name: "Men's",
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
    provenance: [
      {
        kind: 'placeholder',
        label: 'Fallback placeholder course',
        confidence: 'low',
      },
    ],
  });
}
