/**
 * Supabase Client Configuration
 *
 * Provides real-time sync capabilities for the Golf Ryder Cup App.
 * Handles connection to Supabase for live updates across all players.
 */

import { createClient, RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Check if Supabase is configured
export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

// Create Supabase client (singleton)
export const supabase: SupabaseClient<Database> | null = isSupabaseConfigured
    ? createClient<Database>(supabaseUrl!, supabaseAnonKey!, {
        realtime: {
            params: {
                eventsPerSecond: 10,
            },
        },
        auth: {
            persistSession: true,
            autoRefreshToken: true,
        },
    })
    : null;

/**
 * Get the Supabase client, throwing if not configured
 */
export function getSupabase(): SupabaseClient<Database> {
    if (!supabase) {
        throw new Error(
            'Supabase is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY environment variables.'
        );
    }
    return supabase;
}

/**
 * Connection status for the real-time channel
 */
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

/**
 * Subscribe to real-time changes for a specific trip
 */
export function subscribeTripChannel(
    tripId: string,
    onStatusChange: (status: ConnectionStatus) => void,
    handlers: {
        onMatchUpdate?: (payload: unknown) => void;
        onHoleResultUpdate?: (payload: unknown) => void;
        onSessionUpdate?: (payload: unknown) => void;
        onPresenceSync?: (state: Record<string, unknown>) => void;
        onPresenceJoin?: (key: string, presence: unknown) => void;
        onPresenceLeave?: (key: string, presence: unknown) => void;
    }
): RealtimeChannel | null {
    if (!supabase) return null;

    const channel = supabase
        .channel(`trip:${tripId}`, {
            config: {
                presence: {
                    key: crypto.randomUUID(),
                },
            },
        })
        .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            handlers.onPresenceSync?.(state);
        })
        .on('presence', { event: 'join' }, ({ key, newPresences }) => {
            handlers.onPresenceJoin?.(key, newPresences);
        })
        .on('presence', { event: 'leave' }, ({ key, leftPresences }) => {
            handlers.onPresenceLeave?.(key, leftPresences);
        })
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'matches',
                filter: `session_id=in.(SELECT id FROM sessions WHERE trip_id=eq.${tripId})`,
            },
            (payload) => {
                handlers.onMatchUpdate?.(payload);
            }
        )
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'hole_results',
            },
            (payload) => {
                handlers.onHoleResultUpdate?.(payload);
            }
        )
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'sessions',
                filter: `trip_id=eq.${tripId}`,
            },
            (payload) => {
                handlers.onSessionUpdate?.(payload);
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                onStatusChange('connected');
            } else if (status === 'CLOSED') {
                onStatusChange('disconnected');
            } else if (status === 'CHANNEL_ERROR') {
                onStatusChange('error');
            } else {
                onStatusChange('connecting');
            }
        });

    return channel;
}

/**
 * Unsubscribe from a channel
 */
export async function unsubscribeChannel(channel: RealtimeChannel): Promise<void> {
    if (!supabase) return;
    await supabase.removeChannel(channel);
}

/**
 * Track user presence in a trip
 */
export async function trackPresence(
    channel: RealtimeChannel,
    userInfo: {
        id: string;
        name: string;
        avatarUrl?: string;
        currentMatchId?: string;
        isScoring?: boolean;
    }
): Promise<void> {
    await channel.track({
        ...userInfo,
        online_at: new Date().toISOString(),
    });
}
