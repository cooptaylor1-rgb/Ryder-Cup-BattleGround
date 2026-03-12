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

let onlineHandler: (() => void) | null = null;
let offlineHandler: (() => void) | null = null;

export function initNetworkListeners(): () => void {
  if (typeof window === 'undefined') return () => {};

  cleanupNetworkListeners();

  onlineHandler = () => {
    setOnlineStatus(true);
    logger.log('Network online - triggering sync');
    scheduleCourseSyncQueueProcessing();
  };

  offlineHandler = () => {
    setOnlineStatus(false);
    logger.log('Network offline - queuing syncs');
  };

  window.addEventListener('online', onlineHandler);
  window.addEventListener('offline', offlineHandler);

  setOnlineStatus(navigator.onLine);

  return cleanupNetworkListeners;
}

export function cleanupNetworkListeners(): void {
  if (typeof window === 'undefined') return;

  if (onlineHandler) {
    window.removeEventListener('online', onlineHandler);
    onlineHandler = null;
  }
  if (offlineHandler) {
    window.removeEventListener('offline', offlineHandler);
    offlineHandler = null;
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
