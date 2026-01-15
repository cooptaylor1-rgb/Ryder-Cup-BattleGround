/**
 * useTripData Hook — Phase 5: Data Integration
 *
 * Comprehensive hook for trip data management:
 * - Trip metadata and settings
 * - Player roster
 * - Session/match data
 * - Standings calculations
 * - Activity feed
 *
 * Single source of truth for trip state.
 */

'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useHaptic } from './useHaptic';

// ============================================
// TYPES
// ============================================

export interface TripPlayer {
    id: string;
    name: string;
    email?: string;
    avatarUrl?: string;
    team: 'usa' | 'europe';
    handicap?: number;
    isCaptain: boolean;
    joinedAt: string;
    stats: {
        matchesPlayed: number;
        matchesWon: number;
        points: number;
        birdies: number;
        pars: number;
    };
}

export interface TripSession {
    id: string;
    name: string;
    date: string;
    format: 'singles' | 'fourball' | 'foursomes' | 'mixed';
    status: 'scheduled' | 'in_progress' | 'complete';
    matchCount: number;
    courseId?: string;
    courseName?: string;
}

export interface TripStandings {
    usaPoints: number;
    europePoints: number;
    lead: 'usa' | 'europe' | 'tied';
    leadAmount: number;
    matchesPlayed: number;
    matchesRemaining: number;
    canUsaWin: boolean;
    canEuropeWin: boolean;
}

export interface TripActivity {
    id: string;
    type: 'score' | 'match_complete' | 'player_joined' | 'achievement' | 'photo' | 'comment';
    description: string;
    playerId?: string;
    playerName?: string;
    matchId?: string;
    timestamp: string;
}

export interface Trip {
    id: string;
    name: string;
    location?: string;
    startDate: string;
    endDate: string;
    status: 'planning' | 'active' | 'complete';
    settings: {
        pointsToWin: number;
        totalMatches: number;
        allowSpectators: boolean;
        isPublic: boolean;
    };
    createdAt: string;
    updatedAt: string;
}

interface UseTripDataOptions {
    tripId: string;
}

interface UseTripDataReturn {
    // Data
    trip: Trip | null;
    players: TripPlayer[];
    sessions: TripSession[];
    standings: TripStandings;
    recentActivity: TripActivity[];

    // Team rosters
    usaTeam: TripPlayer[];
    europeTeam: TripPlayer[];

    // Actions
    updateTrip: (updates: Partial<Trip>) => Promise<void>;
    addPlayer: (player: Omit<TripPlayer, 'id' | 'joinedAt' | 'stats'>) => Promise<string>;
    removePlayer: (playerId: string) => Promise<void>;
    updatePlayer: (playerId: string, updates: Partial<TripPlayer>) => Promise<void>;
    createSession: (session: Omit<TripSession, 'id' | 'status' | 'matchCount'>) => Promise<string>;

    // State
    isLoading: boolean;
    error: Error | null;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateStandings(
    matches: { winner: 'team1' | 'team2' | 'halved'; team1Id: string; team2Id: string }[],
    players: TripPlayer[],
    totalMatches: number
): TripStandings {
    let usaPoints = 0;
    let europePoints = 0;

    // Get team IDs
    const usaPlayerIds = new Set(players.filter((p) => p.team === 'usa').map((p) => p.id));

    for (const match of matches) {
        const team1IsUsa = usaPlayerIds.has(match.team1Id);

        if (match.winner === 'halved') {
            usaPoints += 0.5;
            europePoints += 0.5;
        } else if (match.winner === 'team1') {
            if (team1IsUsa) {
                usaPoints += 1;
            } else {
                europePoints += 1;
            }
        } else if (match.winner === 'team2') {
            if (team1IsUsa) {
                europePoints += 1;
            } else {
                usaPoints += 1;
            }
        }
    }

    const matchesPlayed = matches.length;
    const matchesRemaining = totalMatches - matchesPlayed;

    let lead: 'usa' | 'europe' | 'tied' = 'tied';
    let leadAmount = 0;

    if (usaPoints > europePoints) {
        lead = 'usa';
        leadAmount = usaPoints - europePoints;
    } else if (europePoints > usaPoints) {
        lead = 'europe';
        leadAmount = europePoints - usaPoints;
    }

    // Can each team still win?
    const pointsNeededToWin = Math.ceil(totalMatches / 2) + 0.5;
    const canUsaWin = usaPoints + matchesRemaining >= pointsNeededToWin;
    const canEuropeWin = europePoints + matchesRemaining >= pointsNeededToWin;

    return {
        usaPoints,
        europePoints,
        lead,
        leadAmount,
        matchesPlayed,
        matchesRemaining,
        canUsaWin,
        canEuropeWin,
    };
}

// ============================================
// MAIN HOOK
// ============================================

export function useTripData({ tripId }: UseTripDataOptions): UseTripDataReturn {
    const haptic = useHaptic();
    const [error, setError] = useState<Error | null>(null);

    // Fetch trip
    const trip = useLiveQuery(
        async () => {
            if (!tripId) return null;
            return db.trips.get(tripId);
        },
        [tripId],
        null
    );

    // Fetch players
    const rawPlayers = useLiveQuery(
        async () => {
            if (!tripId) return [];
            return db.players.where('tripId').equals(tripId).toArray();
        },
        [tripId],
        []
    );

    // Fetch sessions
    const rawSessions = useLiveQuery(
        async () => {
            if (!tripId) return [];
            return db.sessions.where('tripId').equals(tripId).sortBy('date');
        },
        [tripId],
        []
    );

    // Fetch matches for standings
    const matches = useLiveQuery(
        async () => {
            if (!tripId) return [];
            return db.matches.where('tripId').equals(tripId).filter((m: { status: string }) => m.status === 'complete').toArray();
        },
        [tripId],
        []
    );

    // Fetch recent activity
    const recentActivity = useLiveQuery(
        async () => {
            if (!tripId) return [];
            // This would be an activity table in production
            return [] as TripActivity[];
        },
        [tripId],
        []
    );

    // Transform players with stats
    const players: TripPlayer[] = useMemo(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (rawPlayers || []).map((p: any) => ({
            ...p,
            stats: {
                matchesPlayed: 0,
                matchesWon: 0,
                points: 0,
                birdies: 0,
                pars: 0,
            },
        }));
    }, [rawPlayers]);

    // Transform sessions
    const sessions: TripSession[] = useMemo(() => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return (rawSessions || []).map((s: any) => ({
            ...s,
            matchCount: 0, // Would be calculated from matches
        }));
    }, [rawSessions]);

    // Team rosters
    const usaTeam = useMemo(() => players.filter((p) => p.team === 'usa'), [players]);
    const europeTeam = useMemo(() => players.filter((p) => p.team === 'europe'), [players]);

    // Calculate standings
    const standings = useMemo(() => {
        const totalMatches = trip?.settings?.totalMatches || 28;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return calculateStandings(
            (matches || []).map((m: any) => ({
                winner: m.winnerId as 'team1' | 'team2' | 'halved',
                team1Id: m.team1PlayerIds?.[0] || '',
                team2Id: m.team2PlayerIds?.[0] || '',
            })),
            players,
            totalMatches
        );
    }, [matches, players, trip?.settings?.totalMatches]);

    // ========== ACTIONS ==========

    const updateTrip = useCallback(
        async (updates: Partial<Trip>) => {
            setError(null);
            try {
                await db.trips.update(tripId, {
                    ...updates,
                    updatedAt: new Date().toISOString(),
                });
                haptic.tap();
            } catch (err) {
                setError(err as Error);
            }
        },
        [tripId, haptic]
    );

    const addPlayer = useCallback(
        async (player: Omit<TripPlayer, 'id' | 'joinedAt' | 'stats'>): Promise<string> => {
            setError(null);
            try {
                const id = `player-${Date.now()}-${Math.random().toString(36).slice(2)}`;
                // Split name into firstName and lastName for Player model
                const nameParts = player.name.trim().split(/\s+/);
                const firstName = nameParts[0] || '';
                const lastName = nameParts.slice(1).join(' ') || '';
                
                await db.players.add({
                    id,
                    tripId,
                    firstName,
                    lastName,
                    email: player.email,
                    avatarUrl: player.avatarUrl,
                    team: player.team,
                    handicapIndex: player.handicap,
                    joinedAt: new Date().toISOString(),
                });
                haptic.tap();
                return id;
            } catch (err) {
                setError(err as Error);
                throw err;
            }
        },
        [tripId, haptic]
    );

    const removePlayer = useCallback(
        async (playerId: string) => {
            setError(null);
            try {
                await db.players.delete(playerId);
                haptic.tap();
            } catch (err) {
                setError(err as Error);
            }
        },
        [haptic]
    );

    const updatePlayer = useCallback(
        async (playerId: string, updates: Partial<TripPlayer>) => {
            setError(null);
            try {
                await db.players.update(playerId, updates);
                haptic.tap();
            } catch (err) {
                setError(err as Error);
            }
        },
        [haptic]
    );

    const createSession = useCallback(
        async (session: Omit<TripSession, 'id' | 'status' | 'matchCount'>): Promise<string> => {
            setError(null);
            try {
                const id = `session-${Date.now()}-${Math.random().toString(36).slice(2)}`;
                await db.sessions.add({
                    ...session,
                    id,
                    tripId,
                    status: 'scheduled',
                });
                haptic.tap();
                return id;
            } catch (err) {
                setError(err as Error);
                throw err;
            }
        },
        [tripId, haptic]
    );

    return {
        // Data
        trip: trip as Trip | null,
        players,
        sessions,
        standings,
        recentActivity,

        // Team rosters
        usaTeam,
        europeTeam,

        // Actions
        updateTrip,
        addPlayer,
        removePlayer,
        updatePlayer,
        createSession,

        // State
        isLoading: !trip && !error,
        error,
    };
}

// ============================================
// CONVENIENCE HOOKS
// ============================================

/**
 * Hook for just standings data
 */
export function useTripStandings(tripId: string) {
    const { standings, isLoading } = useTripData({ tripId });
    return { standings, isLoading };
}

/**
 * Hook for player roster
 */
export function useTripPlayers(tripId: string) {
    const { players, usaTeam, europeTeam, addPlayer, removePlayer, isLoading } = useTripData({
        tripId,
    });
    return { players, usaTeam, europeTeam, addPlayer, removePlayer, isLoading };
}

export default useTripData;
