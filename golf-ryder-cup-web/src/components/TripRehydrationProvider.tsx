'use client';

import { useEffect, useRef } from 'react';
import { useTripStore, useAuthStore } from '@/lib/stores';
import { db } from '@/lib/db';
import { tripLogger } from '@/lib/utils/logger';

/**
 * Trip Rehydration Provider
 *
 * Restores trip state from localStorage on app startup.
 * When the app refreshes, the Zustand persist middleware only stores
 * the currentTripId. This provider detects that ID and reloads
 * the full trip data from IndexedDB.
 *
 * Also detects if the current user has been added to an active trip
 * and automatically loads that trip for them.
 */
export function TripRehydrationProvider({ children }: { children: React.ReactNode }) {
    const hasRehydrated = useRef(false);
    const hasCheckedUserTrip = useRef(false);
    const { currentTrip, loadTrip, isLoading } = useTripStore();
    const { currentUser, isAuthenticated } = useAuthStore();

    // Rehydrate persisted trip state
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
            tripLogger.error('Failed to rehydrate trip state:', error);
        }
    }, [currentTrip, loadTrip, isLoading]);

    // Auto-load active trip for authenticated users who have been invited
    useEffect(() => {
        // Only run once per session and only when authenticated
        if (hasCheckedUserTrip.current || !isAuthenticated || !currentUser) return;
        // Don't run if a trip is already loaded
        if (currentTrip) return;

        hasCheckedUserTrip.current = true;

        const findAndLoadUserTrip = async () => {
            try {
                // Find player records matching the current user (by email or name)
                const allPlayers = await db.players.toArray();
                const userPlayers = allPlayers.filter(p =>
                    (p.email && currentUser.email &&
                        p.email.toLowerCase() === currentUser.email.toLowerCase()) ||
                    (p.firstName.toLowerCase() === currentUser.firstName.toLowerCase() &&
                        p.lastName.toLowerCase() === currentUser.lastName.toLowerCase())
                );

                if (userPlayers.length === 0) return;

                // Get unique trip IDs the user belongs to
                const userTripIds = [...new Set(
                    userPlayers
                        .filter(p => p.tripId)
                        .map(p => p.tripId as string)
                )];

                if (userTripIds.length === 0) return;

                // Get all trips the user is part of
                const userTrips = await db.trips
                    .where('id')
                    .anyOf(userTripIds)
                    .toArray();

                if (userTrips.length === 0) return;

                // Find an active trip (currently ongoing)
                const now = new Date();
                const activeTrip = userTrips.find(trip => {
                    const start = new Date(trip.startDate);
                    const end = new Date(trip.endDate);
                    return now >= start && now <= end;
                });

                // If there's an active trip, load it
                if (activeTrip) {
                    tripLogger.info('Auto-loading active trip for user:', activeTrip.name);
                    await loadTrip(activeTrip.id);
                    return;
                }

                // If no active trip, check for upcoming trips (within next 7 days)
                const upcomingTrip = userTrips.find(trip => {
                    const start = new Date(trip.startDate);
                    const daysUntilStart = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    return daysUntilStart > 0 && daysUntilStart <= 7;
                });

                if (upcomingTrip) {
                    tripLogger.info('Auto-loading upcoming trip for user:', upcomingTrip.name);
                    await loadTrip(upcomingTrip.id);
                    return;
                }

                // If no active/upcoming, load the most recent trip
                const sortedTrips = userTrips.sort((a, b) =>
                    new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
                );

                if (sortedTrips[0]) {
                    tripLogger.info('Auto-loading most recent trip for user:', sortedTrips[0].name);
                    await loadTrip(sortedTrips[0].id);
                }
            } catch (error) {
                tripLogger.error('Failed to auto-load user trip:', error);
            }
        };

        findAndLoadUserTrip();
    }, [isAuthenticated, currentUser, currentTrip, loadTrip]);

    return <>{children}</>;
}

export default TripRehydrationProvider;
