/**
 * Trip Sync Service
 *
 * Public facade for trip sync operations. Internal responsibilities are split
 * into dedicated trip-sync modules to keep this surface stable and readable.
 */

import {
  clearScheduledSyncQueueProcessing,
  dumpSyncFailures,
  processSyncQueue,
  scheduleSyncQueueProcessing,
} from './trip-sync/tripSyncQueue';
import {
  canSync,
  logger,
  setOnlineStatus,
} from './trip-sync/tripSyncShared';
import { registerSyncHandler } from './syncOrchestrator';

export type { SyncEntity, SyncOperation, SyncQueueItem } from '../types/sync';
export type { BulkSyncResult, SyncStatus, TripSyncResult } from './trip-sync/tripSyncTypes';

export {
  buildSyncOperationKey,
  clearFailedQueue,
  clearQueue,
  dumpSyncFailures,
  getFailedSyncQueueItems,
  getPendingSyncIdsForTrip,
  getSyncQueueStatus,
  getTripSyncStatus,
  processSyncQueue,
  purgeQueueForTrip,
  queueSyncOperation,
  resolveSyncOperationTransition,
  retryFailedQueue,
} from './trip-sync/tripSyncQueue';
export { setSyncAuthSession as setTripSyncAuthSession } from './trip-sync/tripSyncShared';
export {
  ensureTripShareCode,
  getTripShareCode,
  regenerateTripShareCode,
  removeTripShareCode,
} from './trip-sync/tripSyncShareCodes';
export { pullTripByShareCode, pullTripById, syncTripToCloudFull } from './trip-sync/tripSyncTripTransfer';

let unregisterHandler: (() => void) | null = null;

export function initTripSyncNetworkListeners(): () => void {
  if (typeof window === 'undefined') return () => {};

  cleanupTripSyncNetworkListeners();

  unregisterHandler = registerSyncHandler('tripSync', {
    onOnline: () => {
      setOnlineStatus(true);
      logger.log('Network online - triggering sync');
      scheduleSyncQueueProcessing();
    },
    onOffline: () => {
      setOnlineStatus(false);
      logger.log('Network offline - queuing changes');
    },
  });

  setOnlineStatus(navigator.onLine);

  return cleanupTripSyncNetworkListeners;
}

export function cleanupTripSyncNetworkListeners(): void {
  if (unregisterHandler) {
    unregisterHandler();
    unregisterHandler = null;
  }
}

export function initTripSyncService(): () => void {
  const cleanupNetworkListeners = initTripSyncNetworkListeners();

  // Expose a debug hook in the browser so a captain staring at
  // "N sync operations failed" can run __dumpSyncFailures() in
  // devtools and see the actual error messages.
  if (typeof window !== 'undefined') {
    (window as unknown as { __dumpSyncFailures?: () => unknown }).__dumpSyncFailures =
      dumpSyncFailures;
  }

  if (canSync()) {
    setTimeout(() => {
      processSyncQueue().catch((err) => {
        logger.error('Startup sync error:', err);
      });
    }, 3000);
  }

  return () => {
    cleanupNetworkListeners();
    clearScheduledSyncQueueProcessing();
  };
}
