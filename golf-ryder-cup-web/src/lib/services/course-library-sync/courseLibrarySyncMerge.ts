import { db } from '@/lib/db';
import type { CourseProfile, TeeSetProfile } from '@/lib/types/courseProfile';

import type { CloudCourseWithTeeSets, CourseLibraryTeeSetRecord } from './courseLibrarySyncTypes';

function mapCloudCourseToProfile(cloudCourse: CloudCourseWithTeeSets): CourseProfile {
  return {
    id: cloudCourse.id,
    name: cloudCourse.name,
    location: cloudCourse.location || undefined,
    notes: cloudCourse.notes || undefined,
    createdAt: cloudCourse.created_at,
    updatedAt: cloudCourse.updated_at,
  };
}

function mapCloudTeeSetToProfile(
  courseId: string,
  cloudTee: CourseLibraryTeeSetRecord
): TeeSetProfile {
  return {
    id: cloudTee.id,
    courseProfileId: courseId,
    name: cloudTee.name,
    color: cloudTee.color || undefined,
    rating: cloudTee.rating ?? 72.0,
    slope: cloudTee.slope ?? 113,
    par: cloudTee.par,
    holePars: cloudTee.hole_pars || [],
    holeHandicaps: cloudTee.hole_handicaps || [],
    yardages: cloudTee.hole_yardages || [],
    totalYardage: cloudTee.total_yardage || undefined,
    createdAt: cloudTee.created_at,
    updatedAt: cloudTee.updated_at,
  };
}

export async function mergeCloudCoursesIntoLocal(cloudCourses: CloudCourseWithTeeSets[]): Promise<{
  synced: number;
  failed: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let synced = 0;
  let failed = 0;

  await db.transaction('rw', [db.courseProfiles, db.teeSetProfiles], async () => {
    for (const cloudCourse of cloudCourses) {
      try {
        const courseProfile = mapCloudCourseToProfile(cloudCourse);
        const localCourse = await db.courseProfiles.get(cloudCourse.id);

        if (localCourse) {
          if (new Date(cloudCourse.updated_at) > new Date(localCourse.updatedAt)) {
            await db.courseProfiles.put(courseProfile);
          }
        } else {
          await db.courseProfiles.add(courseProfile);
        }

        const cloudTeeSets = cloudCourse.course_library_tee_sets || [];
        for (const cloudTee of cloudTeeSets) {
          await db.teeSetProfiles.put(mapCloudTeeSetToProfile(cloudCourse.id, cloudTee));
        }

        synced++;
      } catch (err) {
        failed++;
        errors.push(`${cloudCourse.name}: ${err}`);
      }
    }
  });

  return { synced, failed, errors };
}
