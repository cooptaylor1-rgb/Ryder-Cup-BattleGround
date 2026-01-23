/**
 * useMatchScoring Hook — Phase 5: Data Integration
 *
 * Comprehensive hook for managing match scoring:
 * - Record hole scores with optimistic updates
 * - Calculate match status in real-time
 * - Handle press/dormie logic
 * - Track player stats per round
 * - Support offline scoring with queue
 *
 * The primary hook for the scoring experience.
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { useHaptic } from './useHaptic';
import { useOfflineQueue } from './useOfflineQueue';
import type { HoleResult } from '../types/models';

// ============================================
// TYPES
// ============================================

export interface HoleScore {
    holeNumber: number;
    team1Score: number;
    team2Score: number;
    winner: 'team1' | 'team2' | 'halved' | null;
    par: number;
    team1ToPar: number;
    team2ToPar: number;
    timestamp: string;
}

export interface MatchStatus {
    status: 'not_started' | 'in_progress' | 'complete';
    currentHole: number;
    holesPlayed: number;
    holesRemaining: number;
    team1Up: number;
    team2Up: number;
    lead: 'team1' | 'team2' | 'all_square';
    leadAmount: number;
    isDormie: boolean;
    isPress: boolean;
    matchResult: {
        winner: 'team1' | 'team2' | 'halved' | null;
        result: string; // e.g., "3&2", "1 up", "halved"
    } | null;
}

export interface PlayerRoundStats {
    playerId: string;
    birdies: number;
    pars: number;
    bogeys: number;
    doublePlus: number;
    totalScore: number;
    totalToPar: number;
    frontNine: number;
    backNine: number;
    bestHole: { number: number; score: number; toPar: number };
    worstHole: { number: number; score: number; toPar: number };
}

interface UseMatchScoringOptions {
    matchId: string;
    courseId?: string;
}

interface UseMatchScoringReturn {
    // Data
    scores: HoleScore[];
    matchStatus: MatchStatus;
    team1Stats: PlayerRoundStats | null;
    team2Stats: PlayerRoundStats | null;
    coursePars: number[];

    // Actions
    recordScore: (
        holeNumber: number,
        team1Score: number,
        team2Score: number,
        par?: number
    ) => Promise<void>;
    updateScore: (
        holeNumber: number,
        team1Score: number,
        team2Score: number
    ) => Promise<void>;
    deleteScore: (holeNumber: number) => Promise<void>;
    finalizeMatch: () => Promise<void>;
    resetMatch: () => Promise<void>;

    // State
    isLoading: boolean;
    isSaving: boolean;
    error: Error | null;
    pendingScores: number;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateMatchStatus(scores: HoleScore[], totalHoles: number = 18): MatchStatus {
    if (scores.length === 0) {
        return {
            status: 'not_started',
            currentHole: 1,
            holesPlayed: 0,
            holesRemaining: totalHoles,
            team1Up: 0,
            team2Up: 0,
            lead: 'all_square',
            leadAmount: 0,
            isDormie: false,
            isPress: false,
            matchResult: null,
        };
    }

    // Calculate holes up
    let team1Up = 0;
    let team2Up = 0;

    for (const score of scores) {
        if (score.winner === 'team1') {
            team1Up++;
        } else if (score.winner === 'team2') {
            team2Up++;
        }
    }

    const netUp = team1Up - team2Up;
    const holesPlayed = scores.length;
    const holesRemaining = totalHoles - holesPlayed;

    // Determine lead
    let lead: 'team1' | 'team2' | 'all_square' = 'all_square';
    let leadAmount = 0;

    if (netUp > 0) {
        lead = 'team1';
        leadAmount = netUp;
    } else if (netUp < 0) {
        lead = 'team2';
        leadAmount = Math.abs(netUp);
    }

    // Check for dormie (lead equals holes remaining)
    const isDormie = leadAmount > 0 && leadAmount === holesRemaining;

    // Check if match is complete
    const isComplete = holesRemaining === 0 || leadAmount > holesRemaining;

    let matchResult: MatchStatus['matchResult'] = null;
    if (isComplete) {
        if (lead === 'all_square') {
            matchResult = { winner: 'halved', result: 'Halved' };
        } else {
            const winner = lead;
            if (holesRemaining === 0) {
                matchResult = { winner, result: `${leadAmount} up` };
            } else {
                matchResult = { winner, result: `${leadAmount}&${holesRemaining}` };
            }
        }
    }

    return {
        status: isComplete ? 'complete' : 'in_progress',
        currentHole: Math.min(holesPlayed + 1, totalHoles),
        holesPlayed,
        holesRemaining,
        team1Up,
        team2Up,
        lead,
        leadAmount,
        isDormie,
        isPress: false, // Would be set by press logic
        matchResult,
    };
}

function calculatePlayerStats(
    scores: HoleScore[],
    teamKey: 'team1Score' | 'team2Score',
    teamParKey: 'team1ToPar' | 'team2ToPar'
): PlayerRoundStats {
    const stats: PlayerRoundStats = {
        playerId: '',
        birdies: 0,
        pars: 0,
        bogeys: 0,
        doublePlus: 0,
        totalScore: 0,
        totalToPar: 0,
        frontNine: 0,
        backNine: 0,
        bestHole: { number: 0, score: 0, toPar: 0 },
        worstHole: { number: 0, score: 0, toPar: 0 },
    };

    let bestToPar = Infinity;
    let worstToPar = -Infinity;

    for (const score of scores) {
        const strokes = score[teamKey];
        const toPar = score[teamParKey];

        stats.totalScore += strokes;
        stats.totalToPar += toPar;

        // Categorize
        if (toPar <= -1) {
            stats.birdies++;
        } else if (toPar === 0) {
            stats.pars++;
        } else if (toPar === 1) {
            stats.bogeys++;
        } else {
            stats.doublePlus++;
        }

        // Front/back nine
        if (score.holeNumber <= 9) {
            stats.frontNine += strokes;
        } else {
            stats.backNine += strokes;
        }

        // Best/worst holes
        if (toPar < bestToPar) {
            bestToPar = toPar;
            stats.bestHole = { number: score.holeNumber, score: strokes, toPar };
        }
        if (toPar > worstToPar) {
            worstToPar = toPar;
            stats.worstHole = { number: score.holeNumber, score: strokes, toPar };
        }
    }

    return stats;
}

// ============================================
// MAIN HOOK
// ============================================

export function useMatchScoring({
    matchId,
    courseId,
}: UseMatchScoringOptions): UseMatchScoringReturn {
    const haptic = useHaptic();
    const { queueAction, pendingCount } = useOfflineQueue();

    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<Error | null>(null);

    // Default course pars (standard par 72)
    const defaultPars = useMemo(
        () => [4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4],
        []
    );

    // Fetch course pars
    const coursePars = useLiveQuery(
        async () => {
            if (!courseId) return defaultPars;

            // Get the first tee set for this course to get hole pars
            const teeSets = await db.teeSets.where('courseId').equals(courseId).toArray();
            const teeSet = teeSets[0];
            if (!teeSet?.holePars) return defaultPars;

            return teeSet.holePars;
        },
        [courseId],
        defaultPars
    );

    // Fetch hole results
    const rawScores = useLiveQuery(
        async () => {
            if (!matchId) return [];

            return db.holeResults
                .where('matchId')
                .equals(matchId)
                .sortBy('holeNumber');
        },
        [matchId],
        []
    );

    // Transform to HoleScore format
    const scores: HoleScore[] = useMemo(() => {
        return (rawScores || []).map((result: HoleResult) => {
            const par = coursePars[result.holeNumber - 1] || 4;
            // Map from DB schema (teamAStrokes/teamBStrokes) to local schema (team1Score/team2Score)
            const team1Score = result.teamAStrokes ?? result.teamAScore ?? 0;
            const team2Score = result.teamBStrokes ?? result.teamBScore ?? 0;
            const team1ToPar = team1Score - par;
            const team2ToPar = team2Score - par;

            let winner: HoleScore['winner'] = null;
            if (team1Score < team2Score) {
                winner = 'team1';
            } else if (team2Score < team1Score) {
                winner = 'team2';
            } else {
                winner = 'halved';
            }

            return {
                holeNumber: result.holeNumber,
                team1Score,
                team2Score,
                winner,
                par,
                team1ToPar,
                team2ToPar,
                timestamp: result.timestamp,
            };
        });
    }, [rawScores, coursePars]);

    // Calculate match status
    const matchStatus = useMemo(() => calculateMatchStatus(scores), [scores]);

    // Calculate player stats
    const team1Stats = useMemo(() => {
        if (scores.length === 0) return null;
        return calculatePlayerStats(scores, 'team1Score', 'team1ToPar');
    }, [scores]);

    const team2Stats = useMemo(() => {
        if (scores.length === 0) return null;
        return calculatePlayerStats(scores, 'team2Score', 'team2ToPar');
    }, [scores]);

    // ========== ACTIONS ==========

    const recordScore = useCallback(
        async (
            holeNumber: number,
            team1Score: number,
            team2Score: number,
            par?: number
        ) => {
            setIsSaving(true);
            setError(null);
            haptic.tap();

            try {
                const holePar = par || coursePars[holeNumber - 1] || 4;
                const winner: 'teamA' | 'teamB' | 'halved' =
                    team1Score < team2Score ? 'teamA' :
                        team2Score < team1Score ? 'teamB' : 'halved';

                const holeResult = {
                    id: `${matchId}-hole-${holeNumber}`,
                    matchId,
                    holeNumber,
                    winner,
                    teamAStrokes: team1Score,
                    teamBStrokes: team2Score,
                    teamAScore: team1Score,
                    teamBScore: team2Score,
                    timestamp: new Date().toISOString(),
                };

                // Optimistic update to local DB
                await db.holeResults.put(holeResult);

                // Queue for sync
                queueAction({
                    type: 'score',
                    matchId,
                    holeNumber,
                    data: holeResult,
                });

                // Celebration haptic for birdie or better
                if (team1Score <= holePar - 1 || team2Score <= holePar - 1) {
                    haptic.impact();
                }
            } catch (err) {
                setError(err as Error);
                haptic.press();
            } finally {
                setIsSaving(false);
            }
        },
        [matchId, coursePars, haptic, queueAction]
    );

    const updateScore = useCallback(
        async (
            holeNumber: number,
            team1Score: number,
            team2Score: number
        ) => {
            setIsSaving(true);
            setError(null);

            try {
                const id = `${matchId}-hole-${holeNumber}`;
                const winner: 'teamA' | 'teamB' | 'halved' =
                    team1Score < team2Score ? 'teamA' :
                        team2Score < team1Score ? 'teamB' : 'halved';

                await db.holeResults.update(id, {
                    winner,
                    teamAStrokes: team1Score,
                    teamBStrokes: team2Score,
                    teamAScore: team1Score,
                    teamBScore: team2Score,
                });

                queueAction({
                    type: 'score-update',
                    matchId,
                    holeNumber,
                    data: { team1Score, team2Score },
                });
            } catch (err) {
                setError(err as Error);
            } finally {
                setIsSaving(false);
            }
        },
        [matchId, queueAction]
    );

    const deleteScore = useCallback(
        async (holeNumber: number) => {
            setIsSaving(true);
            setError(null);

            try {
                const id = `${matchId}-hole-${holeNumber}`;
                await db.holeResults.delete(id);

                queueAction({
                    type: 'score-delete',
                    matchId,
                    holeNumber,
                });

                haptic.tap();
            } catch (err) {
                setError(err as Error);
            } finally {
                setIsSaving(false);
            }
        },
        [matchId, haptic, queueAction]
    );

    const finalizeMatch = useCallback(async () => {
        setIsSaving(true);
        setError(null);

        try {
            // Convert matchResult to MatchResultType
            let result: 'teamAWin' | 'teamBWin' | 'halved' | 'notFinished' = 'notFinished';
            if (matchStatus.matchResult?.winner === 'team1') {
                result = 'teamAWin';
            } else if (matchStatus.matchResult?.winner === 'team2') {
                result = 'teamBWin';
            } else if (matchStatus.matchResult?.winner === 'halved') {
                result = 'halved';
            }

            await db.matches.update(matchId, {
                status: 'completed',
                result,
                margin: matchStatus.leadAmount,
                holesRemaining: matchStatus.holesRemaining,
                updatedAt: new Date().toISOString(),
            });

            queueAction({
                type: 'match-finalize',
                matchId,
                data: matchStatus.matchResult,
            });

            haptic.impact();
        } catch (err) {
            setError(err as Error);
        } finally {
            setIsSaving(false);
        }
    }, [matchId, matchStatus.matchResult, haptic, queueAction]);

    const resetMatch = useCallback(async () => {
        setIsSaving(true);
        setError(null);

        try {
            // Delete all hole results for this match
            await db.holeResults
                .where('matchId')
                .equals(matchId)
                .delete();

            // Reset match status
            await db.matches.update(matchId, {
                status: 'scheduled',
                result: 'notFinished',
                margin: 0,
                holesRemaining: 18,
                currentHole: 1,
                updatedAt: new Date().toISOString(),
            });

            haptic.press();
        } catch (err) {
            setError(err as Error);
        } finally {
            setIsSaving(false);
        }
    }, [matchId, haptic]);

    return {
        // Data
        scores,
        matchStatus,
        team1Stats,
        team2Stats,
        coursePars,

        // Actions
        recordScore,
        updateScore,
        deleteScore,
        finalizeMatch,
        resetMatch,

        // State
        isLoading: !rawScores,
        isSaving,
        error,
        pendingScores: pendingCount,
    };
}

export default useMatchScoring;
