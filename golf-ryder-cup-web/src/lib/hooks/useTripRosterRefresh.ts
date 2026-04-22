/**
 * useTripRosterRefresh
 *
 * Auto-pulls the current trip from Supabase while the calling page is
 * mounted so new invitees show up on the captain's screen without
 * requiring an app restart. `tripStore.loadTrip` reads Dexie only, so
 * without this hook a player row that lives in Supabase (e.g. an
 * invitee joining from their own device) never lands in the captain's
 * local store and the roster stays frozen at whatever was cached.
 *
 * Pairs a background poll (15s cadence) with a manual `refresh()` the
 * calling UI can wire into an explicit "Refresh roster" button.
 * Dismissal/idle are left to the caller — the hook cleans up the
 * interval on unmount.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { pullTripById } from '@/lib/services/tripSyncService';
import { useToastStore, useTripStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';

export const ROSTER_REFRESH_INTERVAL_MS = 15_000;

interface UseTripRosterRefreshOptions {
  /** Override the default 15s background-poll cadence. Set to null to disable polling entirely. */
  intervalMs?: number | null;
  /** Whether to show a success toast on manual refresh. Silent refresh skips toasts regardless. */
  toastOnManualRefresh?: boolean;
}

interface UseTripRosterRefreshResult {
  isRefreshing: boolean;
  /** Manually re-pull. Surfaces success/error toasts. */
  refresh: () => Promise<void>;
}

export function useTripRosterRefresh(
  tripId: string | null | undefined,
  options: UseTripRosterRefreshOptions = {},
): UseTripRosterRefreshResult {
  const { intervalMs = ROSTER_REFRESH_INTERVAL_MS, toastOnManualRefresh = true } = options;

  const { loadTrip } = useTripStore(useShallow((s) => ({ loadTrip: s.loadTrip })));
  const { showToast } = useToastStore(useShallow((s) => ({ showToast: s.showToast })));
  const [isRefreshing, setIsRefreshing] = useState(false);

  const runRefresh = useCallback(
    async ({ silent }: { silent: boolean }): Promise<void> => {
      if (!tripId) return;

      if (!silent) setIsRefreshing(true);
      try {
        // Pull by tripId instead of share_code so this works even when
        // the captain's localStorage doesn't have a cached share_code —
        // e.g. a captain who created the trip on a different browser,
        // or had their storage cleared. The trips RLS policy is open
        // read, so filtering by id behaves identically.
        const result = await pullTripById(tripId);
        if (result.success) {
          await loadTrip(tripId);
          if (!silent && toastOnManualRefresh) {
            showToast('success', 'Roster refreshed from cloud');
          }
        } else if (!silent && result.error) {
          showToast('error', `Roster refresh failed: ${result.error}`);
        }
      } catch (error) {
        if (!silent) {
          const msg = error instanceof Error ? error.message : 'Unknown error';
          showToast('error', `Roster refresh failed: ${msg}`);
        }
      } finally {
        if (!silent) setIsRefreshing(false);
      }
    },
    [tripId, loadTrip, showToast, toastOnManualRefresh],
  );

  useEffect(() => {
    if (!tripId) return;
    if (intervalMs === null) {
      void runRefresh({ silent: true });
      return;
    }

    void runRefresh({ silent: true });
    const interval = window.setInterval(() => {
      void runRefresh({ silent: true });
    }, intervalMs);

    return () => {
      window.clearInterval(interval);
    };
  }, [tripId, intervalMs, runRefresh]);

  const refresh = useCallback(() => runRefresh({ silent: false }), [runRefresh]);

  return { isRefreshing, refresh };
}
