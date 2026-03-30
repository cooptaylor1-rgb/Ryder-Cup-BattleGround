/**
 * Course Library Sync Service
 *
 * Public facade for course library sync operations. Internal responsibilities
 * are split into dedicated course-library-sync modules to keep this surface
 * stable and readable.
 */

import {
  clearScheduledCourseSyncQueueProcessing,
  processQueue,
  scheduleCourseSyncQueueProcessing,
} from './course-library-sync/courseLibrarySyncQueue';
import { canSync, logger, setOnlineStatus } from './course-library-sync/courseLibrarySyncShared';
import { registerSyncHandler } from './syncOrchestrator';

export type {
  BulkSyncResult,
  CourseLibraryRecord,
  CourseLibraryTeeSetRecord,
  CourseSyncResult,
  SyncStatus,
} from './course-library-sync/courseLibrarySyncTypes';

export {
  getCourseSyncStatus,
  getSyncQueueStats,
  processQueue,
  queueCourseSync,
  retryFailedSyncs,
} from './course-library-sync/courseLibrarySyncQueue';
export {
  createAndSyncCourseProfile,
  getCloudCourse,
  incrementCourseUsage,
  pullCoursesFromCloud,
  searchCloudCourses,
  syncAllCoursesToCloud,
  syncCourseToCloud,
} from './course-library-sync/courseLibrarySyncTransfer';
export { getDeviceId } from './course-library-sync/courseLibrarySyncShared';

let unregisterHandler: (() => void) | null = null;

export function initNetworkListeners(): () => void {
  if (typeof window === 'undefined') return () => {};

  cleanupNetworkListeners();

  unregisterHandler = registerSyncHandler('courseLibrarySync', {
    onOnline: () => {
      setOnlineStatus(true);
      logger.log('Network online - triggering sync');
      scheduleCourseSyncQueueProcessing();
    },
    onOffline: () => {
      setOnlineStatus(false);
      logger.log('Network offline - queuing syncs');
    },
  });

  setOnlineStatus(navigator.onLine);

  return cleanupNetworkListeners;
}

export function cleanupNetworkListeners(): void {
  if (unregisterHandler) {
    unregisterHandler();
    unregisterHandler = null;
  }
}

export function initCourseSyncService(): () => void {
  const cleanupListeners = initNetworkListeners();

  if (canSync()) {
    setTimeout(() => {
      processQueue().catch((err) => {
        logger.error('Startup queue processing error:', err);
      });
    }, 3000);
  }

  return () => {
    cleanupListeners();
    clearScheduledCourseSyncQueueProcessing();
  };
}
