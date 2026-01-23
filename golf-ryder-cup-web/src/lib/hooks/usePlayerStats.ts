/**
 * usePlayerStats Hook — Phase 5: Data Integration
 *
 * Comprehensive player statistics hook:
 * - Round-by-round performance
 * - Career statistics
 * - Head-to-head records
 * - Scoring trends
 * - Achievements tracking
 *
 * Powers the player profile and leaderboards.
 */

'use client';

import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import type { Match, Player } from '../types/models';

// ============================================
// TYPES
// ============================================

export interface RoundStats {
    roundId: string;
    date: string;
    courseName: string;
    score: number;
    toPar: number;
    birdies: number;
    pars: number;
    bogeys: number;
    doubleBogeys: number;
    matchResult: 'win' | 'loss' | 'halved';
    format: 'singles' | 'fourball' | 'foursomes';
    partner?: string;
    opponent?: string;
}

export interface CareerStats {
    totalRounds: number;
    totalMatches: number;
    matchesWon: number;
    matchesLost: number;
    matchesHalved: number;
    winPercentage: number;

    // Scoring
    totalBirdies: number;
    totalPars: number;
    totalBogeys: number;
    totalDoublePlusBogeys: number;
    averageScore: number;
    bestScore: number;
    worstScore: number;

    // Points
    totalPoints: number;
    pointsPerMatch: number;

    // Streaks
    currentWinStreak: number;
    longestWinStreak: number;
    currentLossStreak: number;
}

export interface HeadToHeadRecord {
    opponentId: string;
    opponentName: string;
    matchesPlayed: number;
    wins: number;
    losses: number;
    halved: number;
    pointsWon: number;
    pointsLost: number;
}

export interface ScoringTrend {
    period: string;
    averageToPar: number;
    birdiePercentage: number;
    parPercentage: number;
    bogeyPercentage: number;
}

export interface Achievement {
    id: string;
    type: string;
    name: string;
    description: string;
    earnedAt: string;
    tripId?: string;
    tripName?: string;
}

interface UsePlayerStatsOptions {
    playerId: string;
    tripId?: string; // Optional: scope stats to a specific trip
}

interface UsePlayerStatsReturn {
    // Core data
    player: {
        id: string;
        name: string;
        avatarUrl?: string;
        team?: 'usa' | 'europe';
        handicap?: number;
    } | null;

    // Statistics
    careerStats: CareerStats;
    tripStats: CareerStats | null;
    recentRounds: RoundStats[];
    headToHead: HeadToHeadRecord[];
    scoringTrends: ScoringTrend[];
    achievements: Achievement[];

    // Computed insights
    bestFormat: 'singles' | 'fourball' | 'foursomes' | null;
    clutchPercentage: number; // Win rate in close matches
    favoritePartner: string | null;
    nemesis: string | null; // Opponent with worst record against

    // State
    isLoading: boolean;
    error: Error | null;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateCareerStats(
    matches: {
        result: 'win' | 'loss' | 'halved';
        score: number;
        toPar: number;
        birdies: number;
        pars: number;
        bogeys: number;
        doublePlus: number;
    }[]
): CareerStats {
    if (matches.length === 0) {
        return {
            totalRounds: 0,
            totalMatches: 0,
            matchesWon: 0,
            matchesLost: 0,
            matchesHalved: 0,
            winPercentage: 0,
            totalBirdies: 0,
            totalPars: 0,
            totalBogeys: 0,
            totalDoublePlusBogeys: 0,
            averageScore: 0,
            bestScore: 0,
            worstScore: 0,
            totalPoints: 0,
            pointsPerMatch: 0,
            currentWinStreak: 0,
            longestWinStreak: 0,
            currentLossStreak: 0,
        };
    }

    const wins = matches.filter((m) => m.result === 'win').length;
    const losses = matches.filter((m) => m.result === 'loss').length;
    const halved = matches.filter((m) => m.result === 'halved').length;

    const scores = matches.map((m) => m.score).filter((s) => s > 0);
    const totalBirdies = matches.reduce((sum, m) => sum + m.birdies, 0);
    const totalPars = matches.reduce((sum, m) => sum + m.pars, 0);
    const totalBogeys = matches.reduce((sum, m) => sum + m.bogeys, 0);
    const totalDoublePlus = matches.reduce((sum, m) => sum + m.doublePlus, 0);

    // Calculate streaks
    let currentWinStreak = 0;
    let longestWinStreak = 0;
    let tempStreak = 0;

    for (let i = matches.length - 1; i >= 0; i--) {
        if (matches[i].result === 'win') {
            tempStreak++;
            if (i === matches.length - 1) {
                currentWinStreak = tempStreak;
            }
        } else {
            if (tempStreak > longestWinStreak) {
                longestWinStreak = tempStreak;
            }
            tempStreak = 0;
            if (i === matches.length - 1) {
                currentWinStreak = 0;
            }
        }
    }
    if (tempStreak > longestWinStreak) {
        longestWinStreak = tempStreak;
    }

    // Loss streak (current only)
    let currentLossStreak = 0;
    for (let i = matches.length - 1; i >= 0; i--) {
        if (matches[i].result === 'loss') {
            currentLossStreak++;
        } else {
            break;
        }
    }

    const totalPoints = wins + halved * 0.5;

    return {
        totalRounds: matches.length,
        totalMatches: matches.length,
        matchesWon: wins,
        matchesLost: losses,
        matchesHalved: halved,
        winPercentage: matches.length > 0 ? (wins / matches.length) * 100 : 0,
        totalBirdies,
        totalPars,
        totalBogeys,
        totalDoublePlusBogeys: totalDoublePlus,
        averageScore: scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0,
        bestScore: scores.length > 0 ? Math.min(...scores) : 0,
        worstScore: scores.length > 0 ? Math.max(...scores) : 0,
        totalPoints,
        pointsPerMatch: matches.length > 0 ? totalPoints / matches.length : 0,
        currentWinStreak,
        longestWinStreak,
        currentLossStreak,
    };
}

function calculateHeadToHead(
    matches: {
        opponentId: string;
        opponentName: string;
        result: 'win' | 'loss' | 'halved';
    }[]
): HeadToHeadRecord[] {
    const recordMap = new Map<
        string,
        { id: string; name: string; wins: number; losses: number; halved: number }
    >();

    for (const match of matches) {
        const existing = recordMap.get(match.opponentId) || {
            id: match.opponentId,
            name: match.opponentName,
            wins: 0,
            losses: 0,
            halved: 0,
        };

        if (match.result === 'win') existing.wins++;
        else if (match.result === 'loss') existing.losses++;
        else existing.halved++;

        recordMap.set(match.opponentId, existing);
    }

    return Array.from(recordMap.values()).map((r) => ({
        opponentId: r.id,
        opponentName: r.name,
        matchesPlayed: r.wins + r.losses + r.halved,
        wins: r.wins,
        losses: r.losses,
        halved: r.halved,
        pointsWon: r.wins + r.halved * 0.5,
        pointsLost: r.losses + r.halved * 0.5,
    }));
}

// ============================================
// MAIN HOOK
// ============================================

export function usePlayerStats({ playerId, tripId }: UsePlayerStatsOptions): UsePlayerStatsReturn {
    // Error state for potential async error handling
    const [_error, _setError] = useState<Error | null>(null);

    // Fetch player
    const player = useLiveQuery(
        async () => {
            if (!playerId) return null;
            return db.players.get(playerId);
        },
        [playerId],
        null
    );

    // Fetch all matches for this player
    const allMatches: Match[] = useLiveQuery(
        async () => {
            if (!playerId) return [];
            // Would query matches where player participated
            return db.matches
                .filter(
                    (m: Match) =>
                        m.teamAPlayerIds?.includes(playerId) || m.teamBPlayerIds?.includes(playerId)
                )
                .toArray();
        },
        [playerId],
        []
    ) ?? [];

    // Filter for trip-specific matches if tripId provided
    const tripMatches = useMemo(() => {
        if (!tripId || !allMatches) return null;
        return allMatches.filter((m: Match) => m.sessionId && tripId);
    }, [allMatches, tripId]);

    // Fetch achievements
    const achievements = useLiveQuery(
        async () => {
            if (!playerId) return [];
            // Would be from achievements table
            return [] as Achievement[];
        },
        [playerId],
        []
    );

    // Calculate career stats
    const careerStats = useMemo(() => {
        if (!allMatches || allMatches.length === 0) {
            return calculateCareerStats([]);
        }

        // Transform matches to stats format
        const statsMatches = allMatches.map((m: Match) => {
            const isTeamA = m.teamAPlayerIds?.includes(playerId);
            const result =
                m.result === 'halved'
                    ? ('halved' as const)
                    : (isTeamA && m.result === 'teamAWin') || (!isTeamA && m.result === 'teamBWin')
                        ? ('win' as const)
                        : ('loss' as const);

            return {
                result,
                score: 0, // Would come from round data
                toPar: 0,
                birdies: 0,
                pars: 0,
                bogeys: 0,
                doublePlus: 0,
            };
        });

        return calculateCareerStats(statsMatches);
    }, [allMatches, playerId]);

    // Calculate trip-specific stats
    const tripStats = useMemo(() => {
        if (!tripMatches || tripMatches.length === 0) return null;

        const statsMatches = tripMatches.map((m: Match) => {
            const isTeamA = m.teamAPlayerIds?.includes(playerId);
            const result =
                m.result === 'halved'
                    ? ('halved' as const)
                    : (isTeamA && m.result === 'teamAWin') || (!isTeamA && m.result === 'teamBWin')
                        ? ('win' as const)
                        : ('loss' as const);

            return {
                result,
                score: 0,
                toPar: 0,
                birdies: 0,
                pars: 0,
                bogeys: 0,
                doublePlus: 0,
            };
        });

        return calculateCareerStats(statsMatches);
    }, [tripMatches, playerId]);

    // Recent rounds
    const recentRounds = useMemo((): RoundStats[] => {
        if (!allMatches) return [];

        return allMatches.slice(-10).map((m: Match) => {
            const isTeamA = m.teamAPlayerIds?.includes(playerId);
            const result =
                m.result === 'halved'
                    ? ('halved' as const)
                    : (isTeamA && m.result === 'teamAWin') || (!isTeamA && m.result === 'teamBWin')
                        ? ('win' as const)
                        : ('loss' as const);

            return {
                roundId: m.id,
                date: m.createdAt || new Date().toISOString(),
                courseName: 'Unknown Course', // Would need course lookup
                score: 0,
                toPar: 0,
                birdies: 0,
                pars: 0,
                bogeys: 0,
                doubleBogeys: 0,
                matchResult: result,
                format: 'singles' as const, // Would need to get from session
            };
        });
    }, [allMatches, playerId]);

    // Head to head records
    const headToHead = useMemo(() => {
        if (!allMatches) return [];

        const h2hMatches = allMatches.map((m: Match) => {
            const isTeamA = m.teamAPlayerIds?.includes(playerId);
            const opponentIds = isTeamA ? m.teamBPlayerIds : m.teamAPlayerIds;
            const result =
                m.result === 'halved'
                    ? ('halved' as const)
                    : (isTeamA && m.result === 'teamAWin') || (!isTeamA && m.result === 'teamBWin')
                        ? ('win' as const)
                        : ('loss' as const);

            return {
                opponentId: opponentIds?.[0] || 'unknown',
                opponentName: 'Opponent', // Would come from player lookup
                result,
            };
        });

        return calculateHeadToHead(h2hMatches);
    }, [allMatches, playerId]);

    // Scoring trends (by month/week)
    const scoringTrends = useMemo((): ScoringTrend[] => {
        // Would aggregate scoring data over time
        return [];
    }, []);

    // Best format
    const bestFormat = useMemo(() => {
        if (!allMatches || allMatches.length < 3) return null;

        const formatStats: Record<string, { wins: number; total: number }> = {
            singles: { wins: 0, total: 0 },
            fourball: { wins: 0, total: 0 },
            foursomes: { wins: 0, total: 0 },
        };

        for (const m of allMatches) {
            // Use matchOrder as proxy for format (in real impl would get from session)
            const format = 'singles';
            if (formatStats[format]) {
                formatStats[format].total++;
                const isTeamA = m.teamAPlayerIds?.includes(playerId);
                if (
                    (isTeamA && m.result === 'teamAWin') ||
                    (!isTeamA && m.result === 'teamBWin')
                ) {
                    formatStats[format].wins++;
                }
            }
        }

        let best: 'singles' | 'fourball' | 'foursomes' | null = null;
        let bestRate = 0;

        for (const [format, stats] of Object.entries(formatStats)) {
            if (stats.total >= 2) {
                const rate = stats.wins / stats.total;
                if (rate > bestRate) {
                    bestRate = rate;
                    best = format as 'singles' | 'fourball' | 'foursomes';
                }
            }
        }

        return best;
    }, [allMatches, playerId]);

    // Clutch percentage (placeholder - would need close match data)
    const clutchPercentage = useMemo(() => {
        // Would calculate win rate in matches decided by 1 hole or less
        return 0;
    }, []);

    // Favorite partner (placeholder)
    const favoritePartner = useMemo(() => {
        // Would find partner with best combined record
        return null;
    }, []);

    // Nemesis (opponent with worst record against)
    const nemesis = useMemo(() => {
        if (headToHead.length === 0) return null;

        const worstRecord = headToHead.reduce(
            (worst: HeadToHeadRecord | null, record: HeadToHeadRecord) => {
                if (!worst) return record;
                const currentRatio = record.wins / (record.losses || 1);
                const worstRatio = worst.wins / (worst.losses || 1);
                return currentRatio < worstRatio ? record : worst;
            },
            null as HeadToHeadRecord | null
        );

        return worstRecord?.opponentName || null;
    }, [headToHead]);

    return {
        // Core data
        player: player
            ? {
                id: player.id,
                name: `${player.firstName} ${player.lastName}`,
                avatarUrl: player.avatarUrl,
                team: player.team,
                handicap: player.handicapIndex,
            }
            : null,

        // Statistics
        careerStats,
        tripStats,
        recentRounds,
        headToHead,
        scoringTrends,
        achievements,

        // Computed insights
        bestFormat,
        clutchPercentage,
        favoritePartner,
        nemesis,

        // State
        isLoading: !player && !error,
        error: error,
    };
}

// ============================================
// CONVENIENCE HOOKS
// ============================================

/**
 * Hook for leaderboard data across all players
 */
export function useTripLeaderboard(tripId: string) {
    const players = useLiveQuery(
        async () => {
            if (!tripId) return [];
            return db.players.where('tripId').equals(tripId).toArray();
        },
        [tripId],
        []
    );

    interface LeaderboardEntry {
        playerId: string;
        playerName: string;
        team: string;
        points: number;
        matchesWon: number;
        matchesPlayed: number;
    }

    const leaderboard = useMemo(() => {
        if (!players) return [];

        // In production, would aggregate stats for each player
        return players
            .map((p: Player): LeaderboardEntry => ({
                playerId: p.id,
                playerName: `${p.firstName} ${p.lastName}`,
                team: '',
                points: 0, // Would calculate from matches
                matchesWon: 0,
                matchesPlayed: 0,
            }))
            .sort((a: LeaderboardEntry, b: LeaderboardEntry) => b.points - a.points);
    }, [players]);

    return { leaderboard, isLoading: !players };
}

/**
 * Hook for comparing two players head-to-head
 */
export function useHeadToHead(player1Id: string, player2Id: string) {
    const matches: Match[] = useLiveQuery(
        async () => {
            if (!player1Id || !player2Id) return [];
            return db.matches
                .filter(
                    (m: Match) =>
                        (m.teamAPlayerIds?.includes(player1Id) &&
                            m.teamBPlayerIds?.includes(player2Id)) ||
                        (m.teamAPlayerIds?.includes(player2Id) &&
                            m.teamBPlayerIds?.includes(player1Id))
                )
                .toArray();
        },
        [player1Id, player2Id],
        []
    ) ?? [];

    const record = useMemo(() => {
        if (!matches) return { player1Wins: 0, player2Wins: 0, halved: 0 };

        let player1Wins = 0;
        let player2Wins = 0;
        let halved = 0;

        for (const m of matches) {
            const p1IsTeamA = m.teamAPlayerIds?.includes(player1Id);
            if (m.result === 'halved') {
                halved++;
            } else if (
                (p1IsTeamA && m.result === 'teamAWin') ||
                (!p1IsTeamA && m.result === 'teamBWin')
            ) {
                player1Wins++;
            } else {
                player2Wins++;
            }
        }

        return { player1Wins, player2Wins, halved };
    }, [matches, player1Id]);

    return { record, matchHistory: matches, isLoading: !matches };
}

export default usePlayerStats;
