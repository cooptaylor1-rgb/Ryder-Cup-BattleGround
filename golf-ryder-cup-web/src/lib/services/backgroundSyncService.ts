/**
 * Background Sync Service
 *
 * Handles offline score synchronization using the Background Sync API.
 * Falls back to online event listener for browsers without support.
 */

import { db } from '@/lib/db';
import { syncLogger } from '@/lib/utils/logger';
import type { ScoringEvent } from '@/lib/types/events';

// Sync tag for service worker
const SYNC_TAG = 'sync-scores';

// Type for service worker with sync support
interface SyncManager {
    register(tag: string): Promise<void>;
}

interface ServiceWorkerRegistrationWithSync extends ServiceWorkerRegistration {
    sync?: SyncManager;
}

/**
 * Register for background sync when scores need to be uploaded
 */
export async function registerBackgroundSync(): Promise<boolean> {
    try {
        // Check if service worker and Background Sync are supported
        if ('serviceWorker' in navigator && 'SyncManager' in window) {
            const registration = await navigator.serviceWorker.ready as ServiceWorkerRegistrationWithSync;
            if (registration.sync) {
                await registration.sync.register(SYNC_TAG);
                syncLogger.info('Background sync registered');
                return true;
            }
        }

        // Fallback: sync immediately if online
        if (navigator.onLine) {
            await syncPendingScores();
            return true;
        }

        // Register online listener for fallback
        window.addEventListener('online', handleOnline, { once: true });
        return false;
    } catch (error) {
        syncLogger.error('Failed to register background sync:', error);
        return false;
    }
}

/**
 * Handle coming back online (fallback for browsers without Background Sync)
 */
async function handleOnline(): Promise<void> {
    syncLogger.info('Back online, syncing pending scores...');
    await syncPendingScores();
}

/**
 * Get all pending scoring events that need to be synced.
 * Uses the [matchId+synced] compound index for efficient lookup
 * instead of a full table scan with .filter().
 */
export async function getPendingScoringEvents(): Promise<ScoringEvent[]> {
    return db.scoringEvents
        .where('synced')
        .equals(0)
        .toArray();
}

/**
 * Sync all pending scores to the server
 */
export async function syncPendingScores(): Promise<{
    synced: number;
    failed: number;
    errors: string[];
}> {
    const result = {
        synced: 0,
        failed: 0,
        errors: [] as string[],
    };

    try {
        const pendingEvents = await getPendingScoringEvents();

        if (pendingEvents.length === 0) {
            syncLogger.info('No pending scores to sync');
            return result;
        }

        syncLogger.info(`Syncing ${pendingEvents.length} pending scoring events...`);

        // Group events by match for efficient batch updates
        const eventsByMatch = new Map<string, ScoringEvent[]>();
        for (const event of pendingEvents) {
            const existing = eventsByMatch.get(event.matchId) || [];
            existing.push(event);
            eventsByMatch.set(event.matchId, existing);
        }

        // Process each match's events
        for (const [matchId, events] of eventsByMatch) {
            try {
                // Sort events by timestamp to apply in correct order
                const sortedEvents = events.sort(
                    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
                );

                // In a real implementation, this would POST to your API
                // For now, we mark events as synced locally
                await syncMatchEvents(matchId, sortedEvents);

                // Mark events as synced
                const eventIds = events.map(e => e.id);
                await db.scoringEvents
                    .where('id')
                    .anyOf(eventIds)
                    .modify({ synced: true });

                result.synced += events.length;
                syncLogger.info(`Synced ${events.length} events for match ${matchId}`);
            } catch (error) {
                result.failed += events.length;
                const errorMsg = error instanceof Error ? error.message : 'Unknown error';
                result.errors.push(`Match ${matchId}: ${errorMsg}`);
                syncLogger.error(`Failed to sync events for match ${matchId}:`, error);
            }
        }

        // Notify service worker that sync is complete
        if ('serviceWorker' in navigator) {
            const registration = await navigator.serviceWorker.ready;
            registration.active?.postMessage({
                type: 'SYNC_COMPLETE',
                result,
            });
        }

        return result;
    } catch (error) {
        syncLogger.error('Background sync failed:', error);
        throw error;
    }
}

/**
 * Sync events for a specific match to the server
 */
async function syncMatchEvents(
    matchId: string,
    events: ScoringEvent[]
): Promise<void> {
    // Get match data for context
    const match = await db.matches.get(matchId);
    if (!match) {
        throw new Error(`Match ${matchId} not found`);
    }

    // Prepare payload for API
    const payload = {
        matchId,
        events: events.map((event) => {
            const holeNumber = 'holeNumber' in event.payload ? event.payload.holeNumber : undefined;
            return {
                id: event.id,
                type: event.eventType,
                holeNumber,
                data: event.payload,
                timestamp: event.timestamp,
            };
        }),
    };

    // Check if we have a Supabase connection for remote sync
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (supabaseUrl) {
        // Send to API endpoint
        const response = await fetch('/api/sync/scores', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ message: 'Sync failed' }));
            throw new Error(error.message || `HTTP ${response.status}`);
        }

        syncLogger.info(`Successfully synced ${events.length} events to server`);
    } else {
        // Local-only mode - just mark as synced
        syncLogger.info(`Local-only mode: marked ${events.length} events as synced`);
    }
}

/**
 * Check if there are pending scores to sync.
 * Uses indexed query instead of table scan.
 */
export async function hasPendingScores(): Promise<boolean> {
    const count = await db.scoringEvents
        .where('synced')
        .equals(0)
        .count();
    return count > 0;
}

/**
 * Get count of pending scores.
 * Uses indexed query instead of table scan.
 */
export async function getPendingScoreCount(): Promise<number> {
    return db.scoringEvents
        .where('synced')
        .equals(0)
        .count();
}

/**
 * Clear all synced events older than specified days
 */
export async function cleanupSyncedEvents(daysOld: number = 7): Promise<number> {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysOld);

    const oldEvents = await db.scoringEvents
        .filter(event => event.synced === true && new Date(event.timestamp) < cutoff)
        .toArray();

    if (oldEvents.length > 0) {
        await db.scoringEvents.bulkDelete(oldEvents.map(e => e.id));
        syncLogger.info(`Cleaned up ${oldEvents.length} old synced events`);
    }

    return oldEvents.length;
}
