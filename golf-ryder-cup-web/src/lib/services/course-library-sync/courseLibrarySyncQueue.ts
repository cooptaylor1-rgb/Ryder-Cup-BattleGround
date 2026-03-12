import { db, type CourseSyncQueueEntry } from '@/lib/db';

import type {
  BulkSyncResult,
  CourseLibrarySyncQueueStats,
  CourseSyncSource,
  SyncStatus,
} from './courseLibrarySyncTypes';
import {
  BATCH_SIZE,
  MAX_RETRY_COUNT,
  SYNC_DEBOUNCE_MS,
  canSync,
  courseLibrarySyncRuntime,
  logger,
} from './courseLibrarySyncShared';
import { syncCourseToCloudWithRetry } from './courseLibrarySyncWriters';

function buildUnavailableResult(): BulkSyncResult {
  return {
    success: false,
    synced: 0,
    failed: 0,
    queued: 0,
    errors: ['Offline or Supabase not configured'],
  };
}

async function cleanupCompletedQueueEntries(): Promise<void> {
  const completedCount = await db.courseSyncQueue.where('status').equals('completed').count();

  if (completedCount <= 100) {
    return;
  }

  const oldCompleted = await db.courseSyncQueue.where('status').equals('completed').sortBy('completedAt');
  const toDelete = oldCompleted.slice(0, completedCount - 100);
  await db.courseSyncQueue.bulkDelete(toDelete.map((entry) => entry.queueId!));
}

export function scheduleCourseSyncQueueProcessing(): void {
  if (courseLibrarySyncRuntime.syncDebounceTimer) {
    clearTimeout(courseLibrarySyncRuntime.syncDebounceTimer);
  }

  courseLibrarySyncRuntime.syncDebounceTimer = setTimeout(() => {
    courseLibrarySyncRuntime.syncDebounceTimer = null;
    processQueue().catch((err) => {
      logger.error('Queue processing error:', err);
    });
  }, SYNC_DEBOUNCE_MS);
}

export function clearScheduledCourseSyncQueueProcessing(): void {
  if (!courseLibrarySyncRuntime.syncDebounceTimer) {
    return;
  }

  clearTimeout(courseLibrarySyncRuntime.syncDebounceTimer);
  courseLibrarySyncRuntime.syncDebounceTimer = null;
}

export async function queueCourseSync(
  courseProfileId: string,
  source: CourseSyncSource = 'user'
): Promise<void> {
  const existing = await db.courseSyncQueue
    .where('courseProfileId')
    .equals(courseProfileId)
    .and((item) => item.status === 'pending' || item.status === 'syncing')
    .first();

  if (existing) {
    logger.log(`Course ${courseProfileId} already in queue`);
    return;
  }

  const entry: CourseSyncQueueEntry = {
    courseProfileId,
    source,
    status: 'pending',
    retryCount: 0,
    createdAt: new Date().toISOString(),
  };

  await db.courseSyncQueue.add(entry);
  logger.log(`Queued course ${courseProfileId} for sync`);

  if (canSync()) {
    scheduleCourseSyncQueueProcessing();
  }
}

export async function processQueue(): Promise<BulkSyncResult> {
  if (!canSync()) {
    return buildUnavailableResult();
  }

  if (courseLibrarySyncRuntime.syncInProgress) {
    logger.log('Sync already in progress');
    return { success: true, synced: 0, failed: 0, queued: 0, errors: [] };
  }

  courseLibrarySyncRuntime.syncInProgress = true;
  let synced = 0;
  let failed = 0;
  const errors: string[] = [];

  try {
    const pendingItems = await db.courseSyncQueue.where('status').equals('pending').limit(BATCH_SIZE).toArray();
    const failedItems = await db.courseSyncQueue
      .where('status')
      .equals('failed')
      .and((item) => item.retryCount < MAX_RETRY_COUNT)
      .limit(BATCH_SIZE - pendingItems.length)
      .toArray();

    const itemsToProcess = [...pendingItems, ...failedItems];

    if (itemsToProcess.length === 0) {
      return { success: true, synced: 0, failed: 0, queued: 0, errors: [] };
    }

    logger.log(`Processing ${itemsToProcess.length} queued items`);

    for (const item of itemsToProcess) {
      await db.courseSyncQueue.update(item.queueId!, {
        status: 'syncing',
        lastAttemptAt: new Date().toISOString(),
      });

      const course = await db.courseProfiles.get(item.courseProfileId);
      if (!course) {
        await db.courseSyncQueue.update(item.queueId!, {
          status: 'failed',
          lastError: 'Course not found in local database',
          retryCount: MAX_RETRY_COUNT,
        });
        failed++;
        errors.push(`Course ${item.courseProfileId}: Not found locally`);
        continue;
      }

      const teeSets = await db.teeSetProfiles.where('courseProfileId').equals(item.courseProfileId).toArray();
      const result = await syncCourseToCloudWithRetry(course, teeSets, item.source, item.retryCount);

      if (result.success) {
        await db.courseSyncQueue.update(item.queueId!, {
          status: 'completed',
          completedAt: new Date().toISOString(),
        });
        synced++;
        continue;
      }

      const newRetryCount = item.retryCount + 1;
      await db.courseSyncQueue.update(item.queueId!, {
        status: newRetryCount >= MAX_RETRY_COUNT ? 'failed' : 'pending',
        lastError: result.error,
        retryCount: newRetryCount,
      });

      if (newRetryCount >= MAX_RETRY_COUNT) {
        failed++;
        errors.push(`${course.name}: ${result.error} (max retries exceeded)`);
      }
    }

    await cleanupCompletedQueueEntries();

    const remainingQueued = await db.courseSyncQueue.where('status').anyOf(['pending', 'syncing']).count();
    return { success: errors.length === 0, synced, failed, queued: remainingQueued, errors };
  } finally {
    courseLibrarySyncRuntime.syncInProgress = false;
  }
}

export async function getCourseSyncStatus(courseProfileId: string): Promise<SyncStatus> {
  if (!courseLibrarySyncRuntime.isOnline) {
    return 'offline';
  }

  const queueEntry = await db.courseSyncQueue.where('courseProfileId').equals(courseProfileId).last();
  if (!queueEntry) {
    return 'synced';
  }

  switch (queueEntry.status) {
    case 'completed':
      return 'synced';
    case 'syncing':
      return 'syncing';
    case 'pending':
      return 'pending';
    case 'failed':
      return queueEntry.retryCount >= MAX_RETRY_COUNT ? 'failed' : 'pending';
    default:
      return 'synced';
  }
}

export async function getSyncQueueStats(): Promise<CourseLibrarySyncQueueStats> {
  const [pending, syncing, failed, completed] = await Promise.all([
    db.courseSyncQueue.where('status').equals('pending').count(),
    db.courseSyncQueue.where('status').equals('syncing').count(),
    db.courseSyncQueue
      .where('status')
      .equals('failed')
      .and((entry) => entry.retryCount >= MAX_RETRY_COUNT)
      .count(),
    db.courseSyncQueue.where('status').equals('completed').count(),
  ]);

  return { pending, syncing, failed, completed };
}

export async function retryFailedSyncs(): Promise<BulkSyncResult> {
  const failedItems = await db.courseSyncQueue.where('status').equals('failed').toArray();

  for (const item of failedItems) {
    await db.courseSyncQueue.update(item.queueId!, {
      status: 'pending',
      retryCount: 0,
    });
  }

  return processQueue();
}
