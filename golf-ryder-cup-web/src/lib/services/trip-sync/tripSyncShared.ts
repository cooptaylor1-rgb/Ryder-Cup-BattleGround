import { createLogger } from '@/lib/utils/logger';

import { calcRetryDelay, syncSleep } from '../baseSyncService';
import { supabase, isSupabaseConfigured } from '../../supabase/client';
import type { SyncQueueItem } from '../../types/sync';

const BASE_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30000;

export const MAX_RETRY_COUNT = 5;
export const SYNC_DEBOUNCE_MS = 1000;

export const logger = createLogger('TripSync');

export const tripSyncRuntime = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  syncInProgress: false,
  syncDebounceTimer: null as ReturnType<typeof setTimeout> | null,
  syncQueue: [] as SyncQueueItem[],
  queueHydrated: false,
  queueHydrationPromise: null as Promise<void> | null,
};

export function setOnlineStatus(isOnline: boolean): void {
  tripSyncRuntime.isOnline = isOnline;
}

export function canSync(): boolean {
  return tripSyncRuntime.isOnline && isSupabaseConfigured && !!supabase;
}

/**
 * Using explicit any return type to avoid TypeScript inference issues with
 * complex query chains. Type safety is maintained at the application level.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getTable(name: string): any {
  if (!supabase) throw new Error('Supabase not configured');
  return supabase.from(name);
}

export const getRetryDelay = (retryCount: number) =>
  calcRetryDelay(retryCount, BASE_RETRY_DELAY_MS, MAX_RETRY_DELAY_MS);

export const sleep = syncSleep;
