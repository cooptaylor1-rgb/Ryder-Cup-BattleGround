/**
 * Trip Sync Service
 *
 * Public facade for trip sync operations. Internal responsibilities are split
 * into dedicated trip-sync modules to keep this surface stable and readable.
 */

import {
  clearScheduledSyncQueueProcessing,
  processSyncQueue,
  scheduleSyncQueueProcessing,
} from './trip-sync/tripSyncQueue';
import { canSync, logger, setOnlineStatus } from './trip-sync/tripSyncShared';

export type { SyncEntity, SyncOperation, SyncQueueItem } from '../types/sync';
export type { BulkSyncResult, SyncStatus, TripSyncResult } from './trip-sync/tripSyncTypes';

export {
  buildSyncOperationKey,
  clearFailedQueue,
  clearQueue,
  getSyncQueueStatus,
  getTripSyncStatus,
  processSyncQueue,
  purgeQueueForTrip,
  queueSyncOperation,
  resolveSyncOperationTransition,
  retryFailedQueue,
} from './trip-sync/tripSyncQueue';
export {
  ensureTripShareCode,
  getTripShareCode,
  removeTripShareCode,
} from './trip-sync/tripSyncShareCodes';
export { pullTripByShareCode, syncTripToCloudFull } from './trip-sync/tripSyncTripTransfer';

let onlineHandler: (() => void) | null = null;
let offlineHandler: (() => void) | null = null;

export function initTripSyncNetworkListeners(): () => void {
  if (typeof window === 'undefined') return () => {};

  cleanupTripSyncNetworkListeners();

  onlineHandler = () => {
    setOnlineStatus(true);
    logger.log('Network online - triggering sync');
    scheduleSyncQueueProcessing();
  };

  offlineHandler = () => {
    setOnlineStatus(false);
    logger.log('Network offline - queuing changes');
  };

  window.addEventListener('online', onlineHandler);
  window.addEventListener('offline', offlineHandler);

  setOnlineStatus(navigator.onLine);

  return cleanupTripSyncNetworkListeners;
}

export function cleanupTripSyncNetworkListeners(): void {
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

export function initTripSyncService(): () => void {
  const cleanupNetworkListeners = initTripSyncNetworkListeners();

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
