import type { CourseProfile, TeeSetProfile } from '@/lib/types/courseProfile';

import type { CourseSyncResult, CourseSyncSource } from './courseLibrarySyncTypes';
import { canSync, getDeviceId, getRetryDelay, getTable, logger, sleep } from './courseLibrarySyncShared';

export async function syncCourseToCloudWithRetry(
  courseProfile: CourseProfile,
  teeSetProfiles: TeeSetProfile[],
  source: CourseSyncSource,
  currentRetry: number
): Promise<CourseSyncResult> {
  if (currentRetry > 0) {
    const delay = getRetryDelay(currentRetry - 1);
    logger.log(
      `Retry ${currentRetry} for ${courseProfile.name}, waiting ${Math.round(delay)}ms`
    );
    await sleep(delay);
  }

  return syncCourseToCloudDirect(courseProfile, teeSetProfiles, source);
}

export async function syncCourseToCloudDirect(
  courseProfile: CourseProfile,
  teeSetProfiles: TeeSetProfile[],
  source: CourseSyncSource
): Promise<CourseSyncResult> {
  if (!canSync()) {
    return { success: false, courseId: courseProfile.id, error: 'Offline', queued: true };
  }

  const deviceId = getDeviceId();

  try {
    const { data: existing, error: searchError } = await getTable('course_library')
      .select('id, created_by')
      .ilike('name', courseProfile.name)
      .maybeSingle();

    if (searchError) {
      throw new Error(`Search failed: ${searchError.message}`);
    }

    let cloudCourseId: string;

    if (existing) {
      cloudCourseId = existing.id;

      const { error: updateError } = await getTable('course_library')
        .update({
          location: courseProfile.location || null,
          notes: courseProfile.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', cloudCourseId);

      if (updateError) {
        throw new Error(`Update failed: ${updateError.message}`);
      }
    } else {
      cloudCourseId = courseProfile.id;
      const courseData = {
        id: cloudCourseId,
        name: courseProfile.name,
        location: courseProfile.location || null,
        notes: courseProfile.notes || null,
        source,
        created_by: deviceId,
        created_at: courseProfile.createdAt,
        updated_at: new Date().toISOString(),
      };

      const { error: insertError } = await getTable('course_library').insert(courseData);

      if (insertError) {
        throw new Error(`Insert failed: ${insertError.message}`);
      }
    }

    if (teeSetProfiles.length > 0) {
      const teeSetData = teeSetProfiles.map((teeSet) => ({
        id: teeSet.id,
        course_library_id: cloudCourseId,
        name: teeSet.name,
        color: teeSet.color || null,
        rating: teeSet.rating || null,
        slope: teeSet.slope || null,
        par: teeSet.par,
        total_yardage: teeSet.totalYardage || null,
        hole_pars: teeSet.holePars || [],
        hole_handicaps: teeSet.holeHandicaps || null,
        hole_yardages: teeSet.yardages || null,
        updated_at: new Date().toISOString(),
      }));

      const { error: upsertError } = await getTable('course_library_tee_sets').upsert(teeSetData, {
        onConflict: 'id',
      });

      if (upsertError) {
        throw new Error(`Tee set upsert failed: ${upsertError.message}`);
      }
    }

    return { success: true, courseId: courseProfile.id, cloudId: cloudCourseId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error syncing course to cloud:', errorMessage);
    return {
      success: false,
      courseId: courseProfile.id,
      error: errorMessage,
    };
  }
}
