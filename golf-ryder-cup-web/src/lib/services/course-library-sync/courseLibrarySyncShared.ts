import { createLogger } from '@/lib/utils/logger';

import { calcRetryDelay, syncSleep } from '../baseSyncService';
import { isSupabaseConfigured, supabase } from '../../supabase/client';

const BASE_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30000;

export const MAX_RETRY_COUNT = 5;
export const BATCH_SIZE = 50;
export const SYNC_DEBOUNCE_MS = 2000;

const DEVICE_ID_KEY = 'golf_ryder_cup_device_id';

export const logger = createLogger('CourseSync');

export const courseLibrarySyncRuntime = {
  isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
  syncInProgress: false,
  syncDebounceTimer: null as ReturnType<typeof setTimeout> | null,
};

export function getDeviceId(): string {
  if (typeof window === 'undefined') return 'server';

  let deviceId = localStorage.getItem(DEVICE_ID_KEY);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(DEVICE_ID_KEY, deviceId);
  }
  return deviceId;
}

export function setOnlineStatus(isOnline: boolean): void {
  courseLibrarySyncRuntime.isOnline = isOnline;
}

export function canSync(): boolean {
  return courseLibrarySyncRuntime.isOnline && isSupabaseConfigured && !!supabase;
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
