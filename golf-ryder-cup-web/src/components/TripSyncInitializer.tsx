'use client';

/**
 * Trip Sync Initializer
 *
 * Initializes the trip sync service on app startup.
 * Handles network listeners and queue processing.
 */

import { useEffect, useRef } from 'react';
import { initTripSyncService, processSyncQueue, getSyncQueueStatus } from '@/lib/services/tripSyncService';

interface TripSyncInitializerProps {
    /** Enable debug logging */
    debug?: boolean;
}

export function TripSyncInitializer({ debug = false }: TripSyncInitializerProps) {
    const initialized = useRef(false);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        // Initialize the sync service
        initTripSyncService();

        if (debug) {
            console.log('[TripSyncInitializer] Initialized');

            // Log queue status periodically in debug mode
            const statusInterval = setInterval(() => {
                const status = getSyncQueueStatus();
                if (status.pending > 0 || status.failed > 0) {
                    console.log('[TripSyncInitializer] Queue status:', status);
                }
            }, 30000);

            return () => clearInterval(statusInterval);
        }
    }, [debug]);

    // Process queue when component mounts (in case of pending items)
    useEffect(() => {
        const timer = setTimeout(() => {
            processSyncQueue().catch((err) => {
                console.error('[TripSyncInitializer] Queue processing error:', err);
            });
        }, 5000);

        return () => clearTimeout(timer);
    }, []);

    return null;
}

export default TripSyncInitializer;
