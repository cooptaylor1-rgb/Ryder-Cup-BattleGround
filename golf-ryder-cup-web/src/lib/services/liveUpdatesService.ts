/**
 * Live Updates Service (Production Quality)
 *
 * Provides real-time database sync using Supabase Postgres Changes.
 * - Subscribes to database changes for live score updates
 * - Automatically reconnects on connection loss
 * - Handles conflict resolution
 * - Provides hooks for React components
 */

import { supabase, isSupabaseConfigured } from '../supabase/client';
import { db } from '../db';
import type { RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import type { Match, HoleResult, RyderCupSession } from '../types/models';

// ============================================
// TYPES
// ============================================

export type ChangeEvent = 'INSERT' | 'UPDATE' | 'DELETE';

export interface LiveUpdateCallbacks {
    onMatchChange?: (match: Match, event: ChangeEvent) => void;
    onHoleResultChange?: (result: HoleResult, event: ChangeEvent) => void;
    onSessionChange?: (session: RyderCupSession, event: ChangeEvent) => void;
    onConnectionChange?: (connected: boolean) => void;
    onError?: (error: Error) => void;
}

export interface SubscriptionState {
    tripId: string;
    isConnected: boolean;
    reconnectAttempts: number;
    lastEventAt: string | null;
}

// ============================================
// STATE
// ============================================

let activeSubscription: {
    channel: RealtimeChannel;
    tripId: string;
    callbacks: LiveUpdateCallbacks;
} | null = null;

let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 10;
const BASE_RECONNECT_DELAY = 1000;

// ============================================
// HELPERS
// ============================================

function canSubscribe(): boolean {
    return isSupabaseConfigured && !!supabase;
}

function getReconnectDelay(): number {
    const delay = Math.min(BASE_RECONNECT_DELAY * Math.pow(2, reconnectAttempts), 30000);
    return delay * (0.8 + Math.random() * 0.4); // Add jitter
}

// Convert snake_case DB record to camelCase
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toMatch(record: any): Match {
    return {
        id: record.id,
        sessionId: record.session_id,
        courseId: record.course_id,
        teeSetId: record.tee_set_id,
        matchOrder: record.match_order,
        status: record.status,
        startTime: record.start_time,
        currentHole: record.current_hole,
        teamAPlayerIds: record.team_a_player_ids,
        teamBPlayerIds: record.team_b_player_ids,
        teamAHandicapAllowance: record.team_a_handicap_allowance,
        teamBHandicapAllowance: record.team_b_handicap_allowance,
        result: record.result,
        margin: record.margin,
        holesRemaining: record.holes_remaining,
        notes: record.notes,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toHoleResult(record: any): HoleResult {
    return {
        id: record.id,
        matchId: record.match_id,
        holeNumber: record.hole_number,
        winner: record.winner,
        teamAStrokes: record.team_a_strokes,
        teamBStrokes: record.team_b_strokes,
        scoredBy: record.scored_by,
        notes: record.notes,
        timestamp: record.timestamp,
    };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toSession(record: any): RyderCupSession {
    return {
        id: record.id,
        tripId: record.trip_id,
        name: record.name,
        sessionNumber: record.session_number,
        sessionType: record.session_type,
        scheduledDate: record.scheduled_date,
        timeSlot: record.time_slot,
        pointsPerMatch: record.points_per_match,
        notes: record.notes,
        status: record.status,
        isLocked: record.is_locked,
        createdAt: record.created_at,
        updatedAt: record.updated_at,
    };
}

// ============================================
// SUBSCRIPTION MANAGEMENT
// ============================================

/**
 * Subscribe to live updates for a trip
 */
export async function subscribeLiveUpdates(
    tripId: string,
    callbacks: LiveUpdateCallbacks
): Promise<() => void> {
    if (!canSubscribe() || !supabase) {
        console.warn('[LiveUpdates] Supabase not configured');
        return () => { };
    }

    // Clean up existing subscription
    if (activeSubscription) {
        await unsubscribeLiveUpdates();
    }

    reconnectAttempts = 0;

    const channel = supabase
        .channel(`live-updates:${tripId}`)
        // Subscribe to matches table changes
        .on<Match>(
            'postgres_changes' as 'system', // Type workaround
            {
                event: '*',
                schema: 'public',
                table: 'matches',
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            async (payload: RealtimePostgresChangesPayload<any>) => {
                await handleMatchChange(payload, tripId, callbacks);
            }
        )
        // Subscribe to hole_results changes
        .on<HoleResult>(
            'postgres_changes' as 'system',
            {
                event: '*',
                schema: 'public',
                table: 'hole_results',
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            async (payload: RealtimePostgresChangesPayload<any>) => {
                await handleHoleResultChange(payload, tripId, callbacks);
            }
        )
        // Subscribe to sessions changes
        .on<RyderCupSession>(
            'postgres_changes' as 'system',
            {
                event: '*',
                schema: 'public',
                table: 'sessions',
                filter: `trip_id=eq.${tripId}`,
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            async (payload: RealtimePostgresChangesPayload<any>) => {
                await handleSessionChange(payload, callbacks);
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('[LiveUpdates] Connected to trip:', tripId);
                reconnectAttempts = 0;
                callbacks.onConnectionChange?.(true);
            } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                console.error('[LiveUpdates] Connection error:', status);
                callbacks.onConnectionChange?.(false);
                scheduleReconnect(tripId, callbacks);
            } else if (status === 'CLOSED') {
                callbacks.onConnectionChange?.(false);
            }
        });

    activeSubscription = { channel, tripId, callbacks };

    // Return unsubscribe function
    return () => {
        unsubscribeLiveUpdates();
    };
}

/**
 * Unsubscribe from live updates
 */
export async function unsubscribeLiveUpdates(): Promise<void> {
    if (reconnectTimer) {
        clearTimeout(reconnectTimer);
        reconnectTimer = null;
    }

    if (activeSubscription && supabase) {
        try {
            await supabase.removeChannel(activeSubscription.channel);
        } catch (err) {
            console.error('[LiveUpdates] Error removing channel:', err);
        }
        activeSubscription = null;
    }
}

/**
 * Schedule a reconnection attempt
 */
function scheduleReconnect(tripId: string, callbacks: LiveUpdateCallbacks): void {
    if (reconnectTimer) return;
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error('[LiveUpdates] Max reconnect attempts reached');
        callbacks.onError?.(new Error('Max reconnect attempts reached'));
        return;
    }

    const delay = getReconnectDelay();
    reconnectAttempts++;

    console.log(`[LiveUpdates] Reconnecting in ${Math.round(delay / 1000)}s (attempt ${reconnectAttempts})`);

    reconnectTimer = setTimeout(async () => {
        reconnectTimer = null;
        await subscribeLiveUpdates(tripId, callbacks);
    }, delay);
}

// ============================================
// CHANGE HANDLERS
// ============================================

async function handleMatchChange(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: RealtimePostgresChangesPayload<any>,
    tripId: string,
    callbacks: LiveUpdateCallbacks
): Promise<void> {
    const eventType = payload.eventType as ChangeEvent;
    const record = payload.new || payload.old;

    if (!record) return;

    // Filter to only matches in this trip's sessions
    const sessions = await db.sessions.where('tripId').equals(tripId).toArray();
    const sessionIds = new Set(sessions.map((s) => s.id));

    if (!sessionIds.has(record.session_id)) return;

    const match = toMatch(record);

    // Update local database
    try {
        if (eventType === 'DELETE') {
            await db.matches.delete(match.id);
        } else {
            // Check if we have a newer version locally
            const local = await db.matches.get(match.id);
            if (local?.updatedAt && match.updatedAt && local.updatedAt > match.updatedAt) {
                console.log('[LiveUpdates] Skipping older match update');
                return;
            }
            await db.matches.put(match);
        }
    } catch (err) {
        console.error('[LiveUpdates] Error updating local match:', err);
    }

    // Notify callback
    callbacks.onMatchChange?.(match, eventType);
}

async function handleHoleResultChange(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: RealtimePostgresChangesPayload<any>,
    tripId: string,
    callbacks: LiveUpdateCallbacks
): Promise<void> {
    const eventType = payload.eventType as ChangeEvent;
    const record = payload.new || payload.old;

    if (!record) return;

    // Filter to only hole results for matches in this trip
    const sessions = await db.sessions.where('tripId').equals(tripId).toArray();
    const sessionIds = new Set(sessions.map((s) => s.id));
    const matches = await db.matches.where('sessionId').anyOf([...sessionIds]).toArray();
    const matchIds = new Set(matches.map((m) => m.id));

    if (!matchIds.has(record.match_id)) return;

    const holeResult = toHoleResult(record);

    // Update local database
    try {
        if (eventType === 'DELETE') {
            await db.holeResults.delete(holeResult.id);
        } else {
            // For hole results, newer timestamp wins
            const local = await db.holeResults.get(holeResult.id);
            if (local?.timestamp && holeResult.timestamp && local.timestamp > holeResult.timestamp) {
                console.log('[LiveUpdates] Skipping older hole result');
                return;
            }
            await db.holeResults.put(holeResult);
        }
    } catch (err) {
        console.error('[LiveUpdates] Error updating local hole result:', err);
    }

    // Notify callback
    callbacks.onHoleResultChange?.(holeResult, eventType);
}

async function handleSessionChange(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payload: RealtimePostgresChangesPayload<any>,
    callbacks: LiveUpdateCallbacks
): Promise<void> {
    const eventType = payload.eventType as ChangeEvent;
    const record = payload.new || payload.old;

    if (!record) return;

    const session = toSession(record);

    // Update local database
    try {
        if (eventType === 'DELETE') {
            await db.sessions.delete(session.id);
        } else {
            const local = await db.sessions.get(session.id);
            if (local?.updatedAt && session.updatedAt && local.updatedAt > session.updatedAt) {
                console.log('[LiveUpdates] Skipping older session update');
                return;
            }
            await db.sessions.put(session);
        }
    } catch (err) {
        console.error('[LiveUpdates] Error updating local session:', err);
    }

    // Notify callback
    callbacks.onSessionChange?.(session, eventType);
}

// ============================================
// STATE GETTERS
// ============================================

export function getLiveUpdateState(): SubscriptionState | null {
    if (!activeSubscription) return null;

    return {
        tripId: activeSubscription.tripId,
        isConnected: true, // Simplified - would need to track actual state
        reconnectAttempts,
        lastEventAt: new Date().toISOString(),
    };
}

export function isLiveUpdatesActive(): boolean {
    return activeSubscription !== null;
}
