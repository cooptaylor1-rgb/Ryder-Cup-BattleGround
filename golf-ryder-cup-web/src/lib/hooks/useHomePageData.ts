/**
 * Consolidated Home Page Data Hook
 *
 * Eliminates N+1 query pattern by batching all home page
 * database queries into a single reactive subscription.
 */

import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { calculateMatchState } from '@/lib/services/scoringEngine';
import type { Match, RyderCupSession, Trip, BanterPost, HoleResult } from '@/lib/types/models';
import type { MatchState } from '@/lib/types/computed';

export interface HomePageData {
    trips: Trip[];
    liveMatches: Match[];
    banterPosts: BanterPost[];
    userMatchData: {
        match: Match;
        session: RyderCupSession;
        matchState: MatchState | null;
    } | null;
    isLoading: boolean;
}

interface UseHomeDataParams {
    activeTripId: string | undefined;
    currentUserPlayerId: string | undefined;
}

/**
 * Consolidated data fetcher for the home page.
 *
 * Combines multiple queries into a single reactive subscription
 * to avoid the N+1 query pattern where each useLiveQuery
 * triggers a separate database round-trip.
 */
export function useHomePageData({
    activeTripId,
    currentUserPlayerId,
}: UseHomeDataParams): HomePageData {
    const data = useLiveQuery(
        async () => {
            // Batch fetch all data in parallel
            const [trips, tripSessions, tripMatches, banterPosts] = await Promise.all([
                // Get all trips
                db.trips.orderBy('startDate').reverse().toArray(),

                // Get sessions for active trip (if any)
                activeTripId
                    ? db.sessions.where('tripId').equals(activeTripId).toArray()
                    : Promise.resolve([]),

                // We'll fetch matches after we have sessions
                Promise.resolve([] as Match[]),

                // Get banter posts for active trip
                activeTripId
                    ? db.banterPosts.where('tripId').equals(activeTripId).toArray()
                    : Promise.resolve([]),
            ]);

            // Now fetch matches if we have sessions
            let allMatches: Match[] = [];
            let holeResultsMap = new Map<string, HoleResult[]>();

            if (tripSessions.length > 0) {
                const sessionIds = tripSessions.map(s => s.id);
                allMatches = await db.matches.where('sessionId').anyOf(sessionIds).toArray();

                // Get hole results for live matches to calculate match state
                const liveMatchIds = allMatches
                    .filter(m => m.status === 'inProgress')
                    .map(m => m.id);

                if (liveMatchIds.length > 0) {
                    const allHoleResults = await db.holeResults
                        .where('matchId')
                        .anyOf(liveMatchIds)
                        .toArray();

                    // Group by matchId
                    for (const hr of allHoleResults) {
                        if (!holeResultsMap.has(hr.matchId)) {
                            holeResultsMap.set(hr.matchId, []);
                        }
                        holeResultsMap.get(hr.matchId)!.push(hr);
                    }
                }
            }

            // Find live matches
            const liveMatches = allMatches.filter(m => m.status === 'inProgress');

            // Find user's match if authenticated
            let userMatchData: HomePageData['userMatchData'] = null;

            if (currentUserPlayerId && allMatches.length > 0) {
                const userMatches = allMatches.filter(
                    m =>
                        m.teamAPlayerIds.includes(currentUserPlayerId) ||
                        m.teamBPlayerIds.includes(currentUserPlayerId)
                );

                // Prioritize: inProgress > scheduled
                const userMatch =
                    userMatches.find(m => m.status === 'inProgress') ||
                    userMatches.find(m => m.status === 'scheduled');

                if (userMatch) {
                    const session = tripSessions.find(s => s.id === userMatch.sessionId);
                    if (session) {
                        // Calculate match state if in progress
                        let matchState: MatchState | null = null;
                        if (userMatch.status === 'inProgress') {
                            const holeResults = holeResultsMap.get(userMatch.id) || [];
                            matchState = calculateMatchState(userMatch, holeResults);
                        }
                        userMatchData = { match: userMatch, session, matchState };
                    }
                }
            }

            return {
                trips,
                liveMatches,
                banterPosts,
                userMatchData,
            };
        },
        [activeTripId, currentUserPlayerId],
        // Default value while loading
        {
            trips: [],
            liveMatches: [],
            banterPosts: [],
            userMatchData: null,
        }
    );

    return {
        trips: data?.trips || [],
        liveMatches: data?.liveMatches || [],
        banterPosts: data?.banterPosts || [],
        userMatchData: data?.userMatchData || null,
        isLoading: data === undefined,
    };
}
