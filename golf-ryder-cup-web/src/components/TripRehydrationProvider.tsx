'use client';

import { useEffect, useRef } from 'react';
import { useTripStore } from '@/lib/stores';

/**
 * Trip Rehydration Provider
 *
 * Restores trip state from localStorage on app startup.
 * When the app refreshes, the Zustand persist middleware only stores
 * the currentTripId. This provider detects that ID and reloads
 * the full trip data from IndexedDB.
 */
export function TripRehydrationProvider({ children }: { children: React.ReactNode }) {
    const hasRehydrated = useRef(false);
    const { currentTrip, loadTrip, isLoading } = useTripStore();

    useEffect(() => {
        // Only run once on mount
        if (hasRehydrated.current) return;
        hasRehydrated.current = true;

        // Check localStorage for persisted trip ID
        const stored = localStorage.getItem('golf-trip-storage');
        if (!stored) return;

        try {
            const parsed = JSON.parse(stored);
            const persistedTripId = parsed?.state?.currentTripId;

            // If we have a persisted trip ID but no current trip loaded, reload it
            if (persistedTripId && !currentTrip && !isLoading) {
                loadTrip(persistedTripId);
            }
        } catch (error) {
            console.error('Failed to rehydrate trip state:', error);
        }
    }, [currentTrip, loadTrip, isLoading]);

    return <>{children}</>;
}

export default TripRehydrationProvider;
