import {
  clearStoredTripShareCode,
  getStoredTripShareCode,
  storeTripShareCode,
} from '@/lib/utils/tripShareCodeStore';

import { canSync, getTable } from './tripSyncShared';
import { syncTripToCloudFull } from './tripSyncTripTransfer';

export async function getTripShareCode(tripId: string): Promise<string | null> {
  if (!canSync()) return null;

  try {
    const { data, error } = await getTable('trips').select('share_code').eq('id', tripId).single();

    if (error || !data) return null;
    if (data.share_code) {
      storeTripShareCode(tripId, data.share_code);
    }
    return data.share_code;
  } catch {
    return null;
  }
}

export async function ensureTripShareCode(tripId: string): Promise<string | null> {
  const cachedShareCode = getStoredTripShareCode(tripId);
  if (cachedShareCode) {
    return cachedShareCode;
  }

  const fetchedShareCode = await getTripShareCode(tripId);
  if (fetchedShareCode) {
    return fetchedShareCode;
  }

  const syncResult = await syncTripToCloudFull(tripId);
  if (!syncResult.success) {
    return null;
  }

  return getTripShareCode(tripId);
}

export function removeTripShareCode(tripId: string): void {
  clearStoredTripShareCode(tripId);
}

/**
 * Invalidate the current invite code by nulling it on the trips row;
 * the DB trigger that auto-generates codes will mint a fresh one on the
 * next read. Old codes stop working immediately because the row no
 * longer matches them. Returns the new code, or null if we can't reach
 * Supabase (e.g. captain is offline — they should retry when they do).
 */
export async function regenerateTripShareCode(tripId: string): Promise<string | null> {
  if (!canSync()) return null;

  clearStoredTripShareCode(tripId);

  try {
    const { error } = await getTable('trips')
      .update({ share_code: null })
      .eq('id', tripId);
    if (error) return null;
  } catch {
    return null;
  }

  return getTripShareCode(tripId);
}
