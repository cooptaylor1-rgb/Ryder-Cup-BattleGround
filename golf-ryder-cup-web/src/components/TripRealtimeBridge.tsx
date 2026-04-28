'use client';

/**
 * TripRealtimeBridge — Global Supabase realtime subscription for the
 * active trip.
 *
 * The cockpit, standings, and home page all read trip data through
 * useLiveQuery on Dexie. That works perfectly for the device's own
 * writes, but cross-device updates (Captain A scores hole 7 of
 * match 1, Captain B is looking at standings) only land if
 * something pulls the cloud row into B's Dexie. Until now that path
 * was only mounted on the LiveJumbotron / Live page — every other
 * surface stayed stale until the user manually refreshed.
 *
 * For 4 concurrent scorers Thursday this would mean: Captain B's
 * standings show Match 1 in progress 5 minutes after Captain A
 * actually closed it. With this bridge in place, useRealtime is
 * mounted at the app-shell level whenever there's an active trip,
 * so postgres_changes events flow into Dexie within ~1s and
 * useLiveQuery pushes them into every consumer.
 *
 * No-op when there's no active trip or the user isn't authenticated.
 * Cost is one persistent WebSocket per device per trip — same cost
 * the Live page already pays.
 */

import { useMemo } from 'react';
import { useShallow } from 'zustand/shallow';
import { useRealtime } from '@/lib/supabase/useRealtime';
import { useAuthStore, useTripStore } from '@/lib/stores';

export function TripRealtimeBridge() {
  const { currentTripId } = useTripStore(
    useShallow((s) => ({ currentTripId: s.currentTrip?.id }))
  );
  const { currentUser, isAuthenticated } = useAuthStore();

  // Build presence info so the channel knows who's online. Avatar URL
  // is optional — the live presence indicator just needs the name.
  const userInfo = useMemo(() => {
    if (!isAuthenticated || !currentUser) return undefined;
    const name =
      [currentUser.firstName, currentUser.lastName]
        .filter(Boolean)
        .join(' ')
        .trim() || currentUser.email || 'Captain';
    return {
      id: currentUser.id,
      name,
      avatarUrl: currentUser.avatarUrl ?? undefined,
    };
  }, [isAuthenticated, currentUser]);

  // useRealtime no-ops when tripId is null. We deliberately don't
  // gate the hook with `if (!currentTripId) return null` because
  // doing so would unmount the hook on trip switches and reconnect
  // race-prone churn — the hook handles null cleanly inside.
  useRealtime(currentTripId ?? null, userInfo);

  return null;
}
