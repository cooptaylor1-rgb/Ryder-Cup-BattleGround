/**
 * Real-Time Hook
 *
 * React hook for subscribing to real-time updates for a trip.
 * Automatically syncs changes from other users to local state.
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import {
    supabase,
    isSupabaseConfigured,
    getSupabase,
    subscribeTripChannel,
    unsubscribeChannel,
    trackPresence,
    ConnectionStatus,
} from './client';
import { db } from '../db';
import { useScoringStore } from '../stores/scoringStore';
import type { HoleResult, Match } from '../types/models';

// ============================================
// TYPES
// ============================================

export interface RealtimeUser {
    id: string;
    name: string;
    avatarUrl?: string;
    currentMatchId?: string;
    isScoring?: boolean;
    onlineAt: string;
}

export interface UseRealtimeResult {
    isConnected: boolean;
    connectionStatus: ConnectionStatus;
    activeUsers: RealtimeUser[];
    error: string | null;
    reconnect: () => void;
}

// ============================================
// HOOK
// ============================================

export function useRealtime(
    tripId: string | null,
    userInfo?: { id: string; name: string; avatarUrl?: string }
): UseRealtimeResult {
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('disconnected');
    const [activeUsers, setActiveUsers] = useState<RealtimeUser[]>([]);
    const [error, setError] = useState<string | null>(null);
    const channelRef = useRef<RealtimeChannel | null>(null);

    const { refreshMatchState, refreshAllMatchStates } = useScoringStore();

    // Handle incoming match updates
    const handleMatchUpdate = useCallback(
        async (payload: unknown) => {
            const typedPayload = payload as { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> };
            if (!typedPayload.new) return;

            try {
                // Convert snake_case to camelCase
                const matchData = convertKeysToCamelCase(typedPayload.new) as unknown as Match;

                // Update local database
                await db.matches.put(matchData);

                // Refresh store state
                await refreshMatchState(matchData.id);
            } catch (err) {
                console.error('Failed to process match update:', err);
            }
        },
        [refreshMatchState]
    );

    // Handle incoming hole result updates
    const handleHoleResultUpdate = useCallback(
        async (payload: unknown) => {
            const typedPayload = payload as { eventType: string; new: Record<string, unknown>; old: Record<string, unknown> };
            if (!typedPayload.new) return;

            try {
                // Convert snake_case to camelCase
                const holeResultData = convertKeysToCamelCase(typedPayload.new) as unknown as HoleResult;

                // Update local database
                await db.holeResults.put(holeResultData);

                // Refresh store state for this match
                await refreshMatchState(holeResultData.matchId);
            } catch (err) {
                console.error('Failed to process hole result update:', err);
            }
        },
        [refreshMatchState]
    );

    // Handle session updates
    const handleSessionUpdate = useCallback(async () => {
        // Refresh all match states when session changes
        await refreshAllMatchStates();
    }, [refreshAllMatchStates]);

    // Handle presence sync
    const handlePresenceSync = useCallback((state: Record<string, unknown>) => {
        const typedState = state as Record<string, unknown[]>;
        const users: RealtimeUser[] = [];
        for (const presences of Object.values(typedState)) {
            for (const presence of presences as RealtimeUser[]) {
                users.push({
                    id: presence.id,
                    name: presence.name,
                    avatarUrl: presence.avatarUrl,
                    currentMatchId: presence.currentMatchId,
                    isScoring: presence.isScoring,
                    onlineAt: presence.onlineAt,
                });
            }
        }
        setActiveUsers(users);
    }, []);

    // Connect to channel
    const connect = useCallback(() => {
        if (!tripId || !isSupabaseConfigured || !supabase) {
            return;
        }

        // Disconnect existing channel
        if (channelRef.current) {
            unsubscribeChannel(channelRef.current);
        }

        setError(null);
        setConnectionStatus('connecting');

        const channel = subscribeTripChannel(tripId, setConnectionStatus, {
            onMatchUpdate: handleMatchUpdate,
            onHoleResultUpdate: handleHoleResultUpdate,
            onSessionUpdate: handleSessionUpdate,
            onPresenceSync: handlePresenceSync,
        });

        if (channel) {
            channelRef.current = channel;

            // Track presence if user info provided
            if (userInfo) {
                trackPresence(channel, userInfo);
            }
        } else {
            setError('Failed to connect to real-time channel');
            setConnectionStatus('error');
        }
    }, [tripId, userInfo, handleMatchUpdate, handleHoleResultUpdate, handleSessionUpdate, handlePresenceSync]);

    // Reconnect function
    const reconnect = useCallback(() => {
        connect();
    }, [connect]);

    // Subscribe on mount, cleanup on unmount
    useEffect(() => {
        connect();

        return () => {
            if (channelRef.current) {
                unsubscribeChannel(channelRef.current);
                channelRef.current = null;
            }
        };
    }, [connect]);

    // Update presence when user info changes
    useEffect(() => {
        if (channelRef.current && userInfo && connectionStatus === 'connected') {
            trackPresence(channelRef.current, userInfo);
        }
    }, [userInfo, connectionStatus]);

    return {
        isConnected: connectionStatus === 'connected',
        connectionStatus,
        activeUsers,
        error,
        reconnect,
    };
}

// ============================================
// HELPER
// ============================================

function convertKeysToCamelCase<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
            result[camelKey] = obj[key];
        }
    }
    return result;
}

// ============================================
// PRESENCE UPDATE HOOK
// ============================================

export function usePresenceUpdate(
    channel: RealtimeChannel | null,
    matchId?: string,
    isScoring?: boolean
): void {
    const userRef = useRef<{ id: string; name: string } | null>(null);

    useEffect(() => {
        if (!channel || !userRef.current) return;

        trackPresence(channel, {
            ...userRef.current,
            currentMatchId: matchId,
            isScoring,
        });
    }, [channel, matchId, isScoring]);
}

// ============================================
// LIVE SCORES HOOK
// ============================================

export interface LiveScore {
    matchId: string;
    teamAScore: number;
    teamBScore: number;
    currentHole: number;
    status: string;
    lastUpdate: Date;
}

export function useLiveScores(tripId: string | null): {
    scores: Map<string, LiveScore>;
    isLoading: boolean;
} {
    const [scores, setScores] = useState<Map<string, LiveScore>>(new Map());
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!tripId || !isSupabaseConfigured) {
            setIsLoading(false);
            return;
        }

        const sb = getSupabase();

        // Initial fetch
        const fetchScores = async () => {
            try {
                const { data: sessions } = await sb
                    .from('sessions')
                    .select('id')
                    .eq('trip_id', tripId);

                if (!sessions) return;

                const sessionIds = (sessions as Array<{ id: string }>).map((s) => s.id);
                const { data: matches } = await sb
                    .from('matches')
                    .select('*')
                    .in('session_id', sessionIds);

                if (matches) {
                    const newScores = new Map<string, LiveScore>();
                    for (const match of matches as Array<{ id: string; current_hole: number; status: string }>) {
                        // Calculate score from hole results
                        const { data: holeResults } = await sb
                            .from('hole_results')
                            .select('*')
                            .eq('match_id', match.id);

                        let teamAScore = 0;
                        let teamBScore = 0;

                        if (holeResults) {
                            for (const hr of holeResults as Array<{ winner: string }>) {
                                if (hr.winner === 'teamA') teamAScore++;
                                else if (hr.winner === 'teamB') teamBScore++;
                            }
                        }

                        newScores.set(match.id, {
                            matchId: match.id,
                            teamAScore,
                            teamBScore,
                            currentHole: match.current_hole,
                            status: match.status,
                            lastUpdate: new Date(),
                        });
                    }
                    setScores(newScores);
                }
            } catch (err) {
                console.error('Failed to fetch live scores:', err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchScores();

        // Subscribe to real-time updates
        const channel = sb
            .channel(`live-scores:${tripId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'hole_results' },
                async (payload) => {
                    if (payload.new) {
                        const hr = payload.new as { match_id: string; winner: string };
                        setScores((prev) => {
                            const newScores = new Map(prev);
                            const current = newScores.get(hr.match_id);
                            if (current) {
                                if (hr.winner === 'teamA') {
                                    newScores.set(hr.match_id, {
                                        ...current,
                                        teamAScore: current.teamAScore + 1,
                                        lastUpdate: new Date(),
                                    });
                                } else if (hr.winner === 'teamB') {
                                    newScores.set(hr.match_id, {
                                        ...current,
                                        teamBScore: current.teamBScore + 1,
                                        lastUpdate: new Date(),
                                    });
                                }
                            }
                            return newScores;
                        });
                    }
                }
            )
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'matches' },
                (payload) => {
                    if (payload.new) {
                        const match = payload.new as { id: string; current_hole: number; status: string };
                        setScores((prev) => {
                            const newScores = new Map(prev);
                            const current = newScores.get(match.id);
                            if (current) {
                                newScores.set(match.id, {
                                    ...current,
                                    currentHole: match.current_hole,
                                    status: match.status,
                                    lastUpdate: new Date(),
                                });
                            }
                            return newScores;
                        });
                    }
                }
            )
            .subscribe();

        return () => {
            sb.removeChannel(channel);
        };
    }, [tripId]);

    return { scores, isLoading };
}
