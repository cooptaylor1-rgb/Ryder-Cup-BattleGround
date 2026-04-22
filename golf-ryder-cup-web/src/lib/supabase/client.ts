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


const EMPTY_FILTER_UUID = '00000000-0000-0000-0000-000000000000';

export function buildUuidInFilter(column: 'session_id' | 'match_id' | 'team_id', ids: string[]): string {
    const uniqueIds = Array.from(new Set(ids.filter(Boolean)));

    if (uniqueIds.length === 0) {
        return `${column}=eq.${EMPTY_FILTER_UUID}`;
    }

    return `${column}=in.(${uniqueIds.join(',')})`;
}

/**
 * Subscribe to real-time changes for a specific trip
 */
export async function subscribeTripChannel(
    tripId: string,
    onStatusChange: (status: ConnectionStatus) => void,
    handlers: {
        onMatchUpdate?: (payload: unknown) => void;
        onHoleResultUpdate?: (payload: unknown) => void;
        onSessionUpdate?: (payload: unknown) => void;
        onPlayerUpdate?: (payload: unknown) => void;
        onTeamMemberUpdate?: (payload: unknown) => void;
        onPresenceSync?: (state: Record<string, unknown>) => void;
        onPresenceJoin?: (key: string, presence: unknown) => void;
        onPresenceLeave?: (key: string, presence: unknown) => void;
    }
): Promise<RealtimeChannel | null> {
    if (!supabase) return null;

    const { data: sessions, error: sessionsError } = await supabase
        .from('sessions')
        .select('id')
        .eq('trip_id', tripId);

    if (sessionsError) {
        onStatusChange('error');
        return null;
    }

    const sessionIds = ((sessions ?? []) as Array<{ id: string }>).map((session) => session.id);

    const { data: matches, error: matchesError } = sessionIds.length
        ? await supabase
              .from('matches')
              .select('id')
              .in('session_id', sessionIds)
        : { data: [], error: null };

    if (matchesError) {
        onStatusChange('error');
        return null;
    }

    const matchIds = ((matches ?? []) as Array<{ id: string }>).map((match) => match.id);
    const matchesFilter = buildUuidInFilter('session_id', sessionIds);
    const holeResultsFilter = buildUuidInFilter('match_id', matchIds);

    // Team-member changes need a team_id filter. Pull the trip's teams
    // up front so joiners assigned by another device propagate without
    // a page reload. Teams are rare compared to matches, so one extra
    // select on subscribe is cheap.
    const { data: teams } = await supabase
        .from('teams')
        .select('id')
        .eq('trip_id', tripId);
    const teamIds = ((teams ?? []) as Array<{ id: string }>).map((team) => team.id);
    const teamMembersFilter = buildUuidInFilter('team_id', teamIds);

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
                filter: matchesFilter,
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
                filter: holeResultsFilter,
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
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'players',
                filter: `trip_id=eq.${tripId}`,
            },
            (payload) => {
                handlers.onPlayerUpdate?.(payload);
            }
        )
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'team_members',
                filter: teamMembersFilter,
            },
            (payload) => {
                handlers.onTeamMemberUpdate?.(payload);
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
 * Pull the current roster rows for a trip from Supabase. The realtime
 * channel only delivers events that fire *after* subscribe — anyone
 * who joined the trip before the captain's device connected would
 * otherwise stay invisible until their own row changed again. Callers
 * invoke this once on connect and push the rows into Dexie to catch up.
 */
export async function fetchTripRosterFromCloud(tripId: string): Promise<{
    players: Array<Record<string, unknown>>;
    teams: Array<Record<string, unknown>>;
    teamMembers: Array<Record<string, unknown>>;
} | null> {
    if (!supabase) return null;
    const [playersResult, teamsResult] = await Promise.all([
        supabase.from('players').select('*').eq('trip_id', tripId),
        supabase.from('teams').select('*').eq('trip_id', tripId),
    ]);
    const players = (playersResult.data ?? []) as Array<Record<string, unknown>>;
    const teams = (teamsResult.data ?? []) as Array<Record<string, unknown>>;
    const teamIds = teams
        .map((t) => t.id)
        .filter((id): id is string => typeof id === 'string');
    let teamMembers: Array<Record<string, unknown>> = [];
    if (teamIds.length > 0) {
        const { data } = await supabase.from('team_members').select('*').in('team_id', teamIds);
        teamMembers = (data ?? []) as Array<Record<string, unknown>>;
    }
    return { players, teams, teamMembers };
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

// ============================================
// TYPE-SAFE TABLE HELPERS
// ============================================

export type TableName = keyof Database['public']['Tables'];

// Type helper to get insert type for a table
type InsertType<T extends TableName> = Database['public']['Tables'][T]['Insert'];
type UpdateType<T extends TableName> = Database['public']['Tables'][T]['Update'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyQueryBuilder = { insert: (data: unknown) => any; update: (data: unknown) => any; upsert: (data: unknown) => any; delete: () => any; eq: (col: string, value: unknown) => any };

/**
 * Type-safe insert helper for any table
 * External API is type-safe; internal uses cast for dynamic table access
 */
export async function insertRecord<T extends TableName>(
    table: T,
    data: InsertType<T>
): Promise<{ error: Error | null }> {
    const sb = getSupabase();
    // Dynamic table access requires internal cast - external API remains type-safe
    const { error } = await (sb.from(table) as unknown as AnyQueryBuilder).insert(data);
    return { error };
}

/**
 * Type-safe update helper for any table
 */
export async function updateRecord<T extends TableName>(
    table: T,
    id: string,
    data: UpdateType<T>
): Promise<{ error: Error | null }> {
    const sb = getSupabase();
    const builder = sb.from(table) as unknown as AnyQueryBuilder;
    const { error } = await builder.update(data).eq('id', id);
    return { error };
}

/**
 * Type-safe upsert helper for any table
 */
export async function upsertRecord<T extends TableName>(
    table: T,
    data: InsertType<T>
): Promise<{ error: Error | null }> {
    const sb = getSupabase();
    const { error } = await (sb.from(table) as unknown as AnyQueryBuilder).upsert(data);
    return { error };
}

/**
 * Type-safe delete helper for any table
 */
export async function deleteRecord<T extends TableName>(
    table: T,
    id: string
): Promise<{ error: Error | null }> {
    const sb = getSupabase();
    const builder = sb.from(table) as unknown as AnyQueryBuilder;
    const { error } = await builder.delete().eq('id', id);
    return { error };
}
