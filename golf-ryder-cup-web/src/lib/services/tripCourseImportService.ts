import { createLogger } from '../utils/logger';
import type { Course, TeeSet } from '../types/models';
import { useTripStore } from '../stores/tripStore';
import { createCourseFromProfile } from './courseLibraryService';
import { queueSyncOperation } from './tripSyncService';

const logger = createLogger('CourseImport');

export interface ImportLibraryCourseResult {
  course: Course;
  teeSets: TeeSet[];
}

interface ImportLibraryCourseOptions {
  /**
   * The active trip to attach the imported course to. When present,
   * the course and its tee sets are queued for trip-sync so the
   * cloud eventually has them. When absent (no active trip /
   * offline boot), the import still lands locally — cloud push is
   * deferred until something else opens the trip and the queue
   * gets seeded. We log a warning so the skip is visible in
   * breadcrumbs.
   */
  tripId?: string;
}

/**
 * Orchestrate the three persistence layers involved in pulling a
 * course from the shared library into the active trip:
 *
 *   1. Dexie — createCourseFromProfile copies the CourseProfile
 *      + TeeSetProfile rows into the trip-scoped `courses` and
 *      `teeSets` tables, generating fresh ids so the import is
 *      owned by the trip and can be edited without touching the
 *      library source.
 *   2. Zustand tripStore — the store is a snapshot loaded once
 *      per trip, not a reactive wrapper around Dexie. After the
 *      Dexie write we push the new rows into the store manually
 *      so every consumer (dropdowns, scoring, handicap calc)
 *      sees the fresh selection on the next render.
 *   3. trip-sync queue — the course library has its own cloud
 *      sync path, but the trip-scoped copy must travel through
 *      the trip-sync queue so it lands in the trip's Supabase
 *      tables (not the shared library tables). Without this,
 *      another device opening the same trip would see a
 *      session.defaultCourseId pointing at a course id that
 *      doesn't exist on their copy.
 *
 * Callers receive the newly-created trip rows so they can wire
 * dropdown state immediately, without waiting for Dexie live
 * queries to debounce through.
 */
export async function importLibraryCourseIntoTrip(
  profileId: string,
  options: ImportLibraryCourseOptions = {},
): Promise<ImportLibraryCourseResult> {
  const { tripId } = options;

  const { course, teeSets } = await createCourseFromProfile(profileId);

  // Push the new rows into the store. De-dupe by id in case the
  // user double-taps the option before Dexie round-trips — without
  // this guard a second call would stack a duplicate entry into
  // the dropdown.
  useTripStore.setState((state) => ({
    courses: state.courses.some((existing) => existing.id === course.id)
      ? state.courses
      : [...state.courses, course],
    teeSets: [
      ...state.teeSets,
      ...teeSets.filter(
        (imported) => !state.teeSets.some((existing) => existing.id === imported.id),
      ),
    ],
  }));

  if (tripId) {
    queueSyncOperation('course', course.id, 'create', tripId, course);
    for (const teeSet of teeSets) {
      queueSyncOperation('teeSet', teeSet.id, 'create', tripId, teeSet);
    }
  } else {
    logger.warn(
      'Imported library course without an active tripId; cloud sync skipped. The course will sync the next time the trip is opened and the queue is seeded.',
      { profileId, courseId: course.id },
    );
  }

  return { course, teeSets };
}
