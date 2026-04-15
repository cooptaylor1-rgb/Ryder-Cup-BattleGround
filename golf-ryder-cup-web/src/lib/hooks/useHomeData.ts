/**
 * useHomeData Hook
 *
 * Consolidated data fetching for the home page to avoid N+1 query patterns.
 * Batches multiple database queries into fewer operations.
 *
 * Split into focused sub-hooks so consumers can subscribe to only
 * the slices they need, reducing unnecessary re-renders.
 */
'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useMemo } from 'react';
import { db } from '@/lib/db';
import { useTripStore, useAuthStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import { calculateTeamStandings } from '@/lib/services/tournamentEngine';
import { calculateMatchState } from '@/lib/services/scoringEngine';
import {
    assessTripPlayerLink,
    resolveCurrentTripPlayer,
    withTripPlayerIdentity,
    type TripPlayerLinkResult,
} from '@/lib/utils/tripPlayerIdentity';
import type { TeamStandings, MatchState } from '@/lib/types/computed';
import type { Match, RyderCupSession, Trip, Player, SideBet, BanterPost, HoleResult } from '@/lib/types/models';
import type { TripAward } from '@/lib/types/tripStats';

// ============================================
// TYPES
// ============================================

export interface UserMatchData {
    match: Match;
    session: RyderCupSession;
    matchState: MatchState | null;
}

interface ConsolidatedData {
    trips: Trip[];
    activeTrip: Trip | null;
    sessions: RyderCupSession[];
    matches: Match[];
    holeResults: HoleResult[];
    sideBets: SideBet[];
    banterPosts: BanterPost[];
    tripAwards: TripAward[];
    dateActiveTripId: string | null;
}

interface HomeData {
    isLoading: boolean;
    trips: Trip[];
    activeTrip: Trip | null;
    pastTrips: Trip[];
    hasTrips: boolean;
    standings: TeamStandings | null;
    userMatchData: UserMatchData | null;
    currentUserPlayer: Player | null;
    tripPlayerLink: TripPlayerLinkResult;
    liveMatches: Match[];
    liveMatchesCount: number;
    tripMatches: Match[];
    tripSessions: RyderCupSession[];
    banterPosts: BanterPost[];
    unreadMessages: number;
    sideBets: SideBet[];
    activeSideBetsCount: number;
    tripAwards: TripAward[];
    teamAName: string;
    teamBName: string;
}

export function shouldRecoverToDateActiveTrip(
    currentTripId: string | undefined,
    tripIds: string[] | undefined,
): boolean {
    if (!currentTripId || !tripIds) {
        return false;
    }

    return !tripIds.includes(currentTripId);
}

// ============================================
// CORE DATA QUERY (shared by sub-hooks)
// ============================================

/**
 * Core batched query — fetches all trip-related data in minimal DB round-trips.
 * Returns undefined while loading (first Dexie tick).
 */
export function useConsolidatedTripData(): ConsolidatedData | undefined {
    const { currentTrip } = useTripStore(useShallow(s => ({ currentTrip: s.currentTrip })));

    return useLiveQuery(async () => {
        const allTrips = await db.trips.orderBy('startDate').reverse().toArray();

        const now = new Date();
        const dateActiveTrip = allTrips.find(t => {
            const start = new Date(t.startDate);
            const end = new Date(t.endDate);
            return now >= start && now <= end;
        }) || null;

        const selectedTrip =
            currentTrip
                ? allTrips.find((trip) => trip.id === currentTrip.id) ?? currentTrip
                : dateActiveTrip;

        if (!selectedTrip) {
            return {
                trips: allTrips,
                activeTrip: null,
                sessions: [],
                matches: [],
                holeResults: [],
                sideBets: [],
                banterPosts: [],
                tripAwards: [],
                dateActiveTripId: dateActiveTrip?.id ?? null,
            };
        }

        const [tripSessions, sideBets, banterPosts, tripAwards] = await Promise.all([
            db.sessions.where('tripId').equals(selectedTrip.id).toArray(),
            db.sideBets.where('tripId').equals(selectedTrip.id).toArray(),
            db.banterPosts.where('tripId').equals(selectedTrip.id).toArray(),
            db.tripAwards.where('tripId').equals(selectedTrip.id).toArray(),
        ]);

        const sessionIds = tripSessions.map(s => s.id);
        const allMatches = sessionIds.length > 0
            ? await db.matches.where('sessionId').anyOf(sessionIds).toArray()
            : [];

        const inProgressMatchIds = allMatches
            .filter(m => m.status === 'inProgress')
            .map(m => m.id);

        const holeResults = inProgressMatchIds.length > 0
            ? await db.holeResults.where('matchId').anyOf(inProgressMatchIds).toArray()
            : [];

        return {
            trips: allTrips,
            activeTrip: selectedTrip,
            sessions: tripSessions,
            matches: allMatches,
            holeResults,
            sideBets,
            banterPosts,
            tripAwards,
            dateActiveTripId: dateActiveTrip?.id ?? null,
        };
    }, [currentTrip?.id]);
}

// ============================================
// FOCUSED SUB-HOOKS
// ============================================

/** Trip list and active trip selection. */
export function useTrips(data: ConsolidatedData | undefined) {
    return useMemo(() => {
        const trips = data?.trips || [];
        const activeTrip = data?.activeTrip || null;
        return {
            trips,
            activeTrip,
            pastTrips: trips.filter(t => t.id !== activeTrip?.id),
            hasTrips: trips.length > 0,
            isLoading: data === undefined,
        };
    }, [data]);
}

/** Team standings for the active trip. */
export function useStandings(activeTripId: string | undefined | null) {
    return useLiveQuery(async (): Promise<TeamStandings | null> => {
        if (!activeTripId) return null;
        return calculateTeamStandings(activeTripId);
    }, [activeTripId]);
}

/** Team names from the store. */
export function useTeamNames() {
    const { teams } = useTripStore(useShallow(s => ({ teams: s.teams })));
    return useMemo(() => {
        const teamA = teams.find(t => t.color === 'usa');
        const teamB = teams.find(t => t.color === 'europe');
        return {
            teamAName: teamA?.name || 'USA',
            teamBName: teamB?.name || 'Europe',
        };
    }, [teams]);
}

/** Current user's player record and trip-player link status. */
export function useCurrentUserPlayer() {
    const { players } = useTripStore(useShallow(s => ({ players: s.players })));
    const { currentUser, isAuthenticated, authUserId } = useAuthStore();

    const currentUserPlayer = useMemo(() => {
        return resolveCurrentTripPlayer(
            players,
            withTripPlayerIdentity(currentUser, authUserId),
            isAuthenticated
        );
    }, [authUserId, currentUser, isAuthenticated, players]);

    const tripPlayerLink = useMemo(
        () =>
            assessTripPlayerLink(
                players,
                withTripPlayerIdentity(currentUser, authUserId),
                isAuthenticated
            ),
        [authUserId, currentUser, isAuthenticated, players]
    );

    return { currentUserPlayer: currentUserPlayer ?? null, tripPlayerLink };
}

/** The current user's active match (in progress or scheduled). */
export function useUserMatch(
    data: ConsolidatedData | undefined,
    currentUserPlayer: Player | null,
): UserMatchData | null {
    return useMemo((): UserMatchData | null => {
        if (!data?.activeTrip || !currentUserPlayer || !data.matches) return null;

        const { matches, sessions: tripSessions, holeResults } = data;

        const userMatches = matches.filter(
            m => m.teamAPlayerIds.includes(currentUserPlayer.id) ||
                m.teamBPlayerIds.includes(currentUserPlayer.id)
        );

        const userMatch = userMatches.find(m => m.status === 'inProgress') ||
            userMatches.find(m => m.status === 'scheduled');

        if (!userMatch) return null;

        const session = tripSessions.find(s => s.id === userMatch.sessionId);
        if (!session) return null;

        let matchState: MatchState | null = null;
        if (userMatch.status === 'inProgress') {
            const matchHoleResults = holeResults.filter(hr => hr.matchId === userMatch.id);
            matchState = calculateMatchState(userMatch, matchHoleResults);
        }

        return { match: userMatch, session, matchState };
    }, [data, currentUserPlayer]);
}

/** Live (in-progress) matches. */
export function useLiveMatches(data: ConsolidatedData | undefined) {
    return useMemo(() => {
        const live = data?.matches?.filter(m => m.status === 'inProgress') || [];
        return { liveMatches: live, liveMatchesCount: live.length };
    }, [data?.matches]);
}

/** Social feed data. */
export function useSocialData(data: ConsolidatedData | undefined) {
    return useMemo(() => {
        const posts = data?.banterPosts || [];
        return { banterPosts: posts, unreadMessages: posts.length };
    }, [data?.banterPosts]);
}

/** Side bets and awards summary. */
export function useSideBetsSummary(data: ConsolidatedData | undefined) {
    return useMemo(() => {
        const bets = data?.sideBets || [];
        const awards = data?.tripAwards || [];
        return {
            sideBets: bets,
            activeSideBetsCount: bets.filter(b => b.status === 'active').length,
            tripAwards: awards,
        };
    }, [data?.sideBets, data?.tripAwards]);
}

// ============================================
// AUTO-LOAD EFFECTS
// ============================================

/**
 * Side-effect: auto-loads a trip into the store when the date-active trip
 * changes or the selected trip falls out of sync.
 */
export function useAutoLoadTrip(data: ConsolidatedData | undefined) {
    const { loadTrip, currentTrip } = useTripStore(useShallow(s => ({ loadTrip: s.loadTrip, currentTrip: s.currentTrip })));

    useEffect(() => {
        if (!currentTrip && data?.dateActiveTripId) {
            loadTrip(data.dateActiveTripId);
        }
    }, [data?.dateActiveTripId, currentTrip, loadTrip]);

    useEffect(() => {
        if (!currentTrip || !data?.dateActiveTripId || !data.trips) {
            return;
        }

        // Respect explicit user trip selection. Only auto-recover when the selected
        // trip no longer exists in local data (deleted/missing after sync).
        const shouldRecover = shouldRecoverToDateActiveTrip(
            currentTrip.id,
            data.trips.map(trip => trip.id)
        );
        if (shouldRecover) {
            loadTrip(data.dateActiveTripId);
        }
    }, [data?.dateActiveTripId, data?.trips, currentTrip, loadTrip]);
}

// ============================================
// COMPOSED HOOK (backward compat)
// ============================================

/**
 * Full home data hook — composes all sub-hooks.
 * Prefer using individual sub-hooks in new code for better re-render isolation.
 */
export function useHomeData(): HomeData {
    const data = useConsolidatedTripData();
    const tripInfo = useTrips(data);
    const standings = useStandings(data?.activeTrip?.id);
    const { teamAName, teamBName } = useTeamNames();
    const { currentUserPlayer, tripPlayerLink } = useCurrentUserPlayer();
    const userMatchData = useUserMatch(data, currentUserPlayer);
    const { liveMatches, liveMatchesCount } = useLiveMatches(data);
    const { banterPosts, unreadMessages } = useSocialData(data);
    const { sideBets, activeSideBetsCount, tripAwards } = useSideBetsSummary(data);

    useAutoLoadTrip(data);

    return {
        ...tripInfo,
        standings: standings ?? null,
        userMatchData,
        currentUserPlayer,
        tripPlayerLink,
        liveMatches,
        liveMatchesCount,
        tripMatches: data?.matches || [],
        tripSessions: data?.sessions || [],
        banterPosts,
        unreadMessages,
        sideBets,
        activeSideBetsCount,
        tripAwards,
        teamAName,
        teamBName,
    };
}
