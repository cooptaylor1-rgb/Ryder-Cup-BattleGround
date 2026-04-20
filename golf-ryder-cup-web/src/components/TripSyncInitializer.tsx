'use client';

/**
 * Trip Sync Initializer
 *
 * Initializes the trip sync service on app startup.
 * Handles network listeners and queue processing.
 * Properly cleans up on unmount to prevent memory leaks.
 */

import { useEffect, useRef } from 'react';
import { initTripSyncService, processSyncQueue, getSyncQueueStatus } from '@/lib/services/tripSyncService';
import { syncLogger } from '@/lib/utils/logger';

interface TripSyncInitializerProps {
    /** Enable debug logging */
    debug?: boolean;
}

export function TripSyncInitializer({ debug = false }: TripSyncInitializerProps) {
    const initialized = useRef(false);
    const cleanupRef = useRef<(() => void) | null>(null);

    useEffect(() => {
        if (initialized.current) return;
        initialized.current = true;

        // Initialize the sync service and store cleanup function
        cleanupRef.current = initTripSyncService();

        if (debug) {
            syncLogger.log('TripSyncInitializer initialized');

            // Log queue status periodically in debug mode
            const statusInterval = setInterval(() => {
                const status = getSyncQueueStatus();
                if (status.pending > 0 || status.failed > 0) {
                    syncLogger.log('Queue status:', status);
                }
            }, 30000);

            return () => {
                clearInterval(statusInterval);
                // Clean up sync service resources
                if (cleanupRef.current) {
                    cleanupRef.current();
                    cleanupRef.current = null;
                }
            };
        }

        // Cleanup on unmount (non-debug mode)
        return () => {
            if (cleanupRef.current) {
                cleanupRef.current();
                cleanupRef.current = null;
            }
        };
    }, [debug]);

    // Process queue when component mounts (in case of pending items)
    useEffect(() => {
        const timer = setTimeout(() => {
            processSyncQueue().catch((err) => {
                syncLogger.error('Queue processing error:', err);
            });
        }, 5000);

        return () => clearTimeout(timer);
    }, []);

    // Last-gasp flush on tab close / navigation away / app backgrounding.
    // iOS PWAs are the worst offender: a tab kill between score entry and
    // the next periodic sync drops queued writes on the floor. `pagehide`
    // is the modern successor to `beforeunload` and fires reliably on
    // iOS — `beforeunload` is kept as a defensive fallback for browsers
    // that still need it. We fire-and-forget since the page is unloading
    // and there's no timeline to await.
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const attemptFinalFlush = () => {
            const status = getSyncQueueStatus();
            if (status.pending === 0 && status.failed === 0) return;
            void processSyncQueue().catch(() => {
                // Can't act on the error — the page is already gone. The
                // queue persists to IndexedDB, so a later session will
                // pick it back up.
            });
        };

        window.addEventListener('pagehide', attemptFinalFlush);
        window.addEventListener('beforeunload', attemptFinalFlush);
        return () => {
            window.removeEventListener('pagehide', attemptFinalFlush);
            window.removeEventListener('beforeunload', attemptFinalFlush);
        };
    }, []);

    return null;
}

export default TripSyncInitializer;
