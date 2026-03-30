
import { db } from '@/lib/db';
import type { CourseProfile, TeeSetProfile } from '@/lib/types/courseProfile';

import { mergeCloudCoursesIntoLocal } from './courseLibrarySyncMerge';
import { canSync, getTable, logger } from './courseLibrarySyncShared';
import type {
  BulkSyncResult,
  CloudCourseDetails,
  CloudCourseWithTeeSets,
  CourseLibraryRecord,
  CourseSyncResult,
  CourseSyncSource,
} from './courseLibrarySyncTypes';
import { processQueue, queueCourseSync } from './courseLibrarySyncQueue';
import { syncCourseToCloudDirect } from './courseLibrarySyncWriters';
import { supabase } from '../../supabase/client';

function buildUnavailableResult(): BulkSyncResult {
  return {
    success: false,
    synced: 0,
    failed: 0,
    queued: 0,
    errors: ['Offline or Supabase not configured'],
  };
}

async function markLatestQueueEntryCompleted(courseProfileId: string): Promise<void> {
  const queueEntry = await db.courseSyncQueue.where('courseProfileId').equals(courseProfileId).last();
  if (!queueEntry) {
    return;
  }

  await db.courseSyncQueue.update(queueEntry.queueId!, {
    status: 'completed',
    completedAt: new Date().toISOString(),
  });
}

export async function syncCourseToCloud(
  courseProfile: CourseProfile,
  teeSetProfiles: TeeSetProfile[],
  source: CourseSyncSource = 'user'
): Promise<CourseSyncResult> {
  await queueCourseSync(courseProfile.id, source);

  if (canSync()) {
    const result = await syncCourseToCloudDirect(courseProfile, teeSetProfiles, source);
    if (result.success) {
      await markLatestQueueEntryCompleted(courseProfile.id);
    }
    return result;
  }

  return { success: true, courseId: courseProfile.id, queued: true };
}

export async function syncAllCoursesToCloud(): Promise<BulkSyncResult> {
  let queued = 0;

  try {
    const courses = await db.courseProfiles.toArray();

    for (const course of courses) {
      await queueCourseSync(course.id, 'user');
      queued++;
    }

    if (canSync()) {
      return await processQueue();
    }

    return { success: true, synced: 0, failed: 0, queued, errors: [] };
  } catch (error) {
    return {
      success: false,
      synced: 0,
      failed: 0,
      queued,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

export async function pullCoursesFromCloud(): Promise<BulkSyncResult> {
  if (!canSync()) {
    return buildUnavailableResult();
  }

  try {
    const { data: cloudCourses, error: coursesError } = await getTable('course_library')
      .select(
        `
                *,
                course_library_tee_sets (*)
            `
      )
      .order('name');

    if (coursesError) {
      throw new Error(`Failed to fetch courses: ${coursesError.message}`);
    }

    if (!cloudCourses || cloudCourses.length === 0) {
      return { success: true, synced: 0, failed: 0, queued: 0, errors: [] };
    }

    const merged = await mergeCloudCoursesIntoLocal(cloudCourses as CloudCourseWithTeeSets[]);
    return {
      success: merged.errors.length === 0,
      synced: merged.synced,
      failed: merged.failed,
      queued: 0,
      errors: merged.errors,
    };
  } catch (error) {
    return {
      success: false,
      synced: 0,
      failed: 0,
      queued: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
    };
  }
}

export async function searchCloudCourses(query: string): Promise<CourseLibraryRecord[]> {
  if (!canSync()) {
    return [];
  }

  try {
    const { data, error } = await getTable('course_library')
      .select('*')
      .ilike('name', `%${query}%`)
      .order('usage_count', { ascending: false })
      .limit(100);

    if (error) {
      logger.error('Search error:', error);
      return [];
    }

    return (data || []) as CourseLibraryRecord[];
  } catch {
    return [];
  }
}

export async function getCloudCourse(courseId: string): Promise<CloudCourseDetails | null> {
  if (!canSync()) {
    return null;
  }

  try {
    const { data: course, error } = await getTable('course_library')
      .select(
        `
                *,
                course_library_tee_sets (*)
            `
      )
      .eq('id', courseId)
      .single();

    if (error || !course) {
      return null;
    }

    return {
      course: course as CourseLibraryRecord,
      teeSets: course.course_library_tee_sets || [],
    };
  } catch {
    return null;
  }
}

export async function incrementCourseUsage(courseId: string): Promise<void> {
  if (!canSync()) {
    return;
  }

  try {
    if (typeof supabase?.rpc === 'function') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { error: rpcError } = await (supabase.rpc as any)('increment_course_usage', {
        course_id: courseId,
      });

      if (!rpcError) {
        return;
      }
      logger.log('RPC not available, using update fallback');
    }

    const { data: course } = await getTable('course_library').select('usage_count').eq('id', courseId).single();

    if (course) {
      await getTable('course_library')
        .update({
          usage_count: (course.usage_count || 0) + 1,
          last_used_at: new Date().toISOString(),
        })
        .eq('id', courseId);
    }
  } catch {
    // Silently fail - not critical
  }
}

export async function createAndSyncCourseProfile(
  data: Omit<CourseProfile, 'id' | 'createdAt' | 'updatedAt'>,
  teeSets?: Omit<TeeSetProfile, 'id' | 'courseProfileId' | 'createdAt' | 'updatedAt'>[],
  source: CourseSyncSource = 'user'
): Promise<CourseProfile> {
  const now = new Date().toISOString();
  const profileId = crypto.randomUUID();

  const profile: CourseProfile = {
    id: profileId,
    name: data.name,
    location: data.location,
    notes: data.notes,
    createdAt: now,
    updatedAt: now,
  };

  const teeSetProfiles: TeeSetProfile[] = (teeSets || []).map((teeSet) => ({
    id: crypto.randomUUID(),
    courseProfileId: profileId,
    name: teeSet.name,
    color: teeSet.color,
    rating: teeSet.rating,
    slope: teeSet.slope,
    par: teeSet.par,
    holePars: teeSet.holePars,
    holeHandicaps: teeSet.holeHandicaps,
    yardages: teeSet.yardages,
    totalYardage: teeSet.totalYardage,
    createdAt: now,
    updatedAt: now,
  }));

  await db.transaction('rw', [db.courseProfiles, db.teeSetProfiles], async () => {
    await db.courseProfiles.add(profile);
    if (teeSetProfiles.length > 0) {
      await db.teeSetProfiles.bulkAdd(teeSetProfiles);
    }
  });

  syncCourseToCloud(profile, teeSetProfiles, source).catch((err) => {
    logger.error('Background sync failed:', err);
  });

  return profile;
}
