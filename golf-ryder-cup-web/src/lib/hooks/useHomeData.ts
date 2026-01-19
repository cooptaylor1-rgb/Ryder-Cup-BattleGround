/**
 * useHomeData Hook
 *
 * Consolidated data fetching for the home page to avoid N+1 query patterns.
 * Batches multiple database queries into fewer operations.
 */
'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo } from 'react';
import { db } from '@/lib/db';
import { useTripStore, useAuthStore } from '@/lib/stores';
import { calculateTeamStandings } from '@/lib/services/tournamentEngine';
import { calculateMatchState } from '@/lib/services/scoringEngine';
import type { TeamStandings, MatchState } from '@/lib/types/computed';
import type { Match, RyderCupSession, Trip, Player, SideBet, BanterPost } from '@/lib/types/models';

interface UserMatchData {
    match: Match;
    session: RyderCupSession;
    matchState: MatchState | null;
}

interface HomeData {
    // Loading states
    isLoading: boolean;

    // Trip data
    trips: Trip[];
    activeTrip: Trip | null;
    pastTrips: Trip[];
    hasTrips: boolean;

    // Standings
    standings: TeamStandings | null;

    // User's match
    userMatchData: UserMatchData | null;
    currentUserPlayer: Player | null;

    // Live data
    liveMatches: Match[];
    liveMatchesCount: number;

    // Social data
    banterPosts: BanterPost[];
    unreadMessages: number;

    // Side bets
    sideBets: SideBet[];
    activeSideBetsCount: number;

    // Team names
    teamAName: string;
    teamBName: string;
}

export function useHomeData(): HomeData {
    const { loadTrip, currentTrip, players, teams, sessions: _sessions } = useTripStore();
    const { currentUser, isAuthenticated } = useAuthStore();

    // Single consolidated query for all trip-related data
    const consolidatedData = useLiveQuery(async () => {
        // 1. Get all trips (single query)
        const allTrips = await db.trips.orderBy('startDate').reverse().toArray();

        // 2. Find active trip
        const now = new Date();
        const activeTrip = allTrips.find(t => {
            const start = new Date(t.startDate);
            const end = new Date(t.endDate);
            return now >= start && now <= end;
        }) || null;

        if (!activeTrip) {
            return {
                trips: allTrips,
                activeTrip: null,
                sessions: [],
                matches: [],
                holeResults: [],
                sideBets: [],
                banterPosts: [],
            };
        }

        // 3. Batch query for all trip-related data
        const [tripSessions, sideBets, banterPosts] = await Promise.all([
            db.sessions.where('tripId').equals(activeTrip.id).toArray(),
            db.sideBets.where('tripId').equals(activeTrip.id).toArray(),
            db.banterPosts.where('tripId').equals(activeTrip.id).toArray(),
        ]);

        // 4. Get all matches for all sessions in one query
        const sessionIds = tripSessions.map(s => s.id);
        const allMatches = sessionIds.length > 0
            ? await db.matches.where('sessionId').anyOf(sessionIds).toArray()
            : [];

        // 5. Get hole results for in-progress matches
        const inProgressMatchIds = allMatches
            .filter(m => m.status === 'inProgress')
            .map(m => m.id);

        const holeResults = inProgressMatchIds.length > 0
            ? await db.holeResults.where('matchId').anyOf(inProgressMatchIds).toArray()
            : [];

        return {
            trips: allTrips,
            activeTrip,
            sessions: tripSessions,
            matches: allMatches,
            holeResults,
            sideBets,
            banterPosts,
        };
    }, []);

    // Find current user's player record
    const currentUserPlayer = useMemo(() => {
        if (!isAuthenticated || !currentUser) return null;
        return players.find(
            p =>
                (p.email && currentUser.email && p.email.toLowerCase() === currentUser.email.toLowerCase()) ||
                (p.firstName.toLowerCase() === currentUser.firstName.toLowerCase() &&
                    p.lastName.toLowerCase() === currentUser.lastName.toLowerCase())
        );
    }, [currentUser, isAuthenticated, players]);

    // Calculate user's match data
    const userMatchData = useMemo((): UserMatchData | null => {
        if (!consolidatedData?.activeTrip || !currentUserPlayer || !consolidatedData.matches) {
            return null;
        }

        const { matches, sessions: tripSessions, holeResults } = consolidatedData;

        // Find user's match (prefer inProgress, then scheduled)
        const userMatches = matches.filter(
            m => m.teamAPlayerIds.includes(currentUserPlayer.id) ||
                m.teamBPlayerIds.includes(currentUserPlayer.id)
        );

        const userMatch = userMatches.find(m => m.status === 'inProgress') ||
            userMatches.find(m => m.status === 'scheduled');

        if (!userMatch) return null;

        const session = tripSessions.find(s => s.id === userMatch.sessionId);
        if (!session) return null;

        // Calculate match state if in progress
        let matchState: MatchState | null = null;
        if (userMatch.status === 'inProgress') {
            const matchHoleResults = holeResults.filter(hr => hr.matchId === userMatch.id);
            matchState = calculateMatchState(userMatch, matchHoleResults);
        }

        return { match: userMatch, session, matchState };
    }, [consolidatedData, currentUserPlayer]);

    // Calculate live matches
    const liveMatches = useMemo(() => {
        return consolidatedData?.matches?.filter(m => m.status === 'inProgress') || [];
    }, [consolidatedData?.matches]);

    // Calculate standings (only when active trip changes)
    const standings = useLiveQuery(async (): Promise<TeamStandings | null> => {
        if (!consolidatedData?.activeTrip) return null;
        return calculateTeamStandings(consolidatedData.activeTrip.id);
    }, [consolidatedData?.activeTrip?.id]);

    // Load trip when active trip changes
    // Using useEffect instead of useMemo for side effects
    useEffect(() => {
        if (consolidatedData?.activeTrip && consolidatedData.activeTrip.id !== currentTrip?.id) {
            loadTrip(consolidatedData.activeTrip.id);
        }
    }, [consolidatedData?.activeTrip, currentTrip?.id, loadTrip]);

    // Get team names
    const teamA = teams.find(t => t.color === 'usa');
    const teamB = teams.find(t => t.color === 'europe');

    // Calculate derived values
    const trips = consolidatedData?.trips || [];
    const activeTrip = consolidatedData?.activeTrip || null;
    const pastTrips = trips.filter(t => t.id !== activeTrip?.id);
    const sideBets = consolidatedData?.sideBets || [];
    const banterPosts = consolidatedData?.banterPosts || [];

    return {
        isLoading: consolidatedData === undefined,
        trips,
        activeTrip,
        pastTrips,
        hasTrips: trips.length > 0,
        standings: standings ?? null,
        userMatchData,
        currentUserPlayer: currentUserPlayer ?? null,
        liveMatches,
        liveMatchesCount: liveMatches.length,
        banterPosts,
        unreadMessages: banterPosts.length,
        sideBets,
        activeSideBetsCount: sideBets.filter(b => b.status === 'active').length,
        teamAName: teamA?.name || 'USA',
        teamBName: teamB?.name || 'Europe',
    };
}
