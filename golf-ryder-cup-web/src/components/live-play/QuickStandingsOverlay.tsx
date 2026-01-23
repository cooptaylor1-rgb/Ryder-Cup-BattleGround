/**
 * Quick Standings Overlay
 *
 * A gesture-activated overlay that shows live team standings.
 * Swipe down from anywhere to see the current state of the competition.
 *
 * Features:
 * - Pull-down gesture activation
 * - Shows team scores with visual comparison
 * - Magic number calculation
 * - Individual match statuses
 * - Smooth spring animations
 * - Haptic feedback on activation
 * - Auto-dismisses on tap outside or swipe up
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Trophy, ChevronDown, Circle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/lib/db';
import { useTripStore } from '@/lib/stores';
import { calculateMatchState } from '@/lib/services/scoringEngine';
import { useHaptic } from '@/lib/hooks/useHaptic';
import type { Team } from '@/lib/types/models';

// ============================================
// TYPES
// ============================================

interface QuickStandingsOverlayProps {
    /** Activation threshold in pixels */
    pullThreshold?: number;
    /** Custom class name */
    className?: string;
}

interface TeamStanding {
    team: Team;
    points: number;
    matchesWon: number;
    matchesLost: number;
    matchesHalved: number;
    matchesInProgress: number;
}

interface MatchSummary {
    id: string;
    teamANames: string;
    teamBNames: string;
    status: 'inProgress' | 'completed' | 'scheduled';
    scoreDisplay: string;
    leader: 'teamA' | 'teamB' | 'tied';
}

// ============================================
// COMPONENT
// ============================================

export function QuickStandingsOverlay({
    pullThreshold = 100,
    className,
}: QuickStandingsOverlayProps) {
    const pathname = usePathname();
    const { trigger } = useHaptic();
    const { currentTrip, teams, players, sessions } = useTripStore();

    const [isVisible, setIsVisible] = useState(false);
    const [_isPulling, setIsPulling] = useState(false);

    // Motion values for pull gesture
    const pullY = useMotionValue(0);
    const pullProgress = useTransform(pullY, [0, pullThreshold], [0, 1]);
    const indicatorOpacity = useTransform(pullY, [0, pullThreshold / 2], [0.3, 1]);

    // Don't show on home page
    const shouldEnable = pathname !== '/' && currentTrip;

    // Find active session
    const activeSession = useMemo(() => {
        return sessions.find(s => s.status === 'inProgress') ||
            sessions.find(s => s.status === 'scheduled');
    }, [sessions]);

    // Get all matches for session
    const matches = useLiveQuery(
        async () => {
            if (!activeSession) return [];
            return db.matches
                .where('sessionId')
                .equals(activeSession.id)
                .toArray();
        },
        [activeSession?.id],
        []
    );

    // Get all hole results
    const allHoleResults = useLiveQuery(
        async () => {
            if (!matches?.length) return [];
            const matchIds = matches.map(m => m.id);
            return db.holeResults
                .where('matchId')
                .anyOf(matchIds)
                .toArray();
        },
        [matches],
        []
    );

    // Calculate team standings
    const standings = useMemo((): { teamA: TeamStanding; teamB: TeamStanding; magicNumber: number } | null => {
        if (!teams?.length || !matches?.length) return null;

        const teamA = teams.find(t => t.color === 'usa');
        const teamB = teams.find(t => t.color === 'europe');
        if (!teamA || !teamB) return null;

        let teamAPoints = 0;
        let teamBPoints = 0;
        let teamAWins = 0;
        let teamBWins = 0;
        let halved = 0;
        let inProgress = 0;

        matches.forEach(match => {
            const matchResults = allHoleResults.filter(r => r.matchId === match.id);
            const state = calculateMatchState(match, matchResults);

            // Match is complete if closed out or all holes played
            const isComplete = state.isClosedOut || state.holesRemaining === 0;

            if (isComplete) {
                if (state.teamAHolesWon > state.teamBHolesWon) {
                    teamAPoints += 1;
                    teamAWins++;
                } else if (state.teamBHolesWon > state.teamAHolesWon) {
                    teamBPoints += 1;
                    teamBWins++;
                } else {
                    teamAPoints += 0.5;
                    teamBPoints += 0.5;
                    halved++;
                }
            } else if (matchResults.length > 0) {
                inProgress++;
            }
        });

        // Calculate magic number (points needed to clinch)
        const totalPoints = matches.length;
        const pointsToWin = Math.floor(totalPoints / 2) + 1;
        const leaderPoints = Math.max(teamAPoints, teamBPoints);
        const magicNumber = Math.max(0, pointsToWin - leaderPoints);

        return {
            teamA: {
                team: teamA,
                points: teamAPoints,
                matchesWon: teamAWins,
                matchesLost: teamBWins,
                matchesHalved: halved,
                matchesInProgress: inProgress,
            },
            teamB: {
                team: teamB,
                points: teamBPoints,
                matchesWon: teamBWins,
                matchesLost: teamAWins,
                matchesHalved: halved,
                matchesInProgress: inProgress,
            },
            magicNumber,
        };
    }, [teams, matches, allHoleResults]);

    // Calculate match summaries
    const matchSummaries = useMemo((): MatchSummary[] => {
        if (!matches?.length || !players?.length) return [];

        return matches.map(match => {
            const matchResults = allHoleResults.filter(r => r.matchId === match.id);

            // Get player names
            const teamANames = match.teamAPlayerIds
                .map(id => players.find(p => p.id === id))
                .filter(Boolean)
                .map(p => `${p!.firstName[0]}. ${p!.lastName}`)
                .join(' / ');

            const teamBNames = match.teamBPlayerIds
                .map(id => players.find(p => p.id === id))
                .filter(Boolean)
                .map(p => `${p!.firstName[0]}. ${p!.lastName}`)
                .join(' / ');

            // Calculate score
            let teamAWins = 0;
            let teamBWins = 0;
            matchResults.forEach(r => {
                if (r.winner === 'teamA') teamAWins++;
                else if (r.winner === 'teamB') teamBWins++;
            });

            const diff = teamAWins - teamBWins;
            const holesPlayed = matchResults.length;
            const isComplete = holesPlayed >= 18 || match.status === 'completed';

            let scoreDisplay: string;
            let leader: 'teamA' | 'teamB' | 'tied' = 'tied';

            if (holesPlayed === 0) {
                scoreDisplay = 'Not started';
            } else if (isComplete) {
                if (diff > 0) {
                    scoreDisplay = 'USA wins';
                    leader = 'teamA';
                } else if (diff < 0) {
                    scoreDisplay = 'EUR wins';
                    leader = 'teamB';
                } else {
                    scoreDisplay = 'Halved';
                }
            } else {
                if (diff > 0) {
                    scoreDisplay = `USA ${diff} UP (${holesPlayed})`;
                    leader = 'teamA';
                } else if (diff < 0) {
                    scoreDisplay = `EUR ${Math.abs(diff)} UP (${holesPlayed})`;
                    leader = 'teamB';
                } else {
                    scoreDisplay = `AS (${holesPlayed})`;
                }
            }

            return {
                id: match.id,
                teamANames,
                teamBNames,
                status: match.status as 'inProgress' | 'completed' | 'scheduled',
                scoreDisplay,
                leader,
            };
        });
    }, [matches, allHoleResults, players]);

    // Handle pull gesture
    const handlePan = useCallback(
        (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
            if (!shouldEnable) return;

            const { offset, velocity } = info;

            // Only activate on downward swipe from top area
            if (offset.y > 0 && !isVisible) {
                pullY.set(Math.min(offset.y, pullThreshold * 1.5));
                setIsPulling(true);

                // Trigger when threshold reached
                if (offset.y >= pullThreshold && velocity.y > 0) {
                    trigger('medium');
                    setIsVisible(true);
                    setIsPulling(false);
                    pullY.set(0);
                }
            }
        },
        [shouldEnable, isVisible, pullThreshold, pullY, trigger]
    );

    const handlePanEnd = useCallback(() => {
        setIsPulling(false);
        pullY.set(0);
    }, [pullY]);

    // Close overlay
    const handleClose = useCallback(() => {
        trigger('light');
        setIsVisible(false);
    }, [trigger]);

    // Close on swipe up
    const handleOverlayDrag = useCallback(
        (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
            if (info.offset.y < -50 || info.velocity.y < -300) {
                handleClose();
            }
        },
        [handleClose]
    );

    if (!shouldEnable) return null;

    return (
        <>
            {/* Pull indicator (when not visible) */}
            {!isVisible && (
                <motion.div
                    className="fixed top-0 left-0 right-0 z-40 pointer-events-none"
                    style={{ opacity: indicatorOpacity }}
                >
                    <div className="flex justify-center pt-2">
                        <motion.div
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface/80 backdrop-blur-sm"
                            style={{ y: pullProgress }}
                        >
                            <ChevronDown className="w-4 h-4 text-white/60" />
                            <span className="text-xs text-white/60">Pull for standings</span>
                        </motion.div>
                    </div>
                </motion.div>
            )}

            {/* Pull gesture detector */}
            {!isVisible && (
                <motion.div
                    className="fixed top-0 left-0 right-0 h-32 z-30"
                    onPan={handlePan}
                    onPanEnd={handlePanEnd}
                />
            )}

            {/* Overlay */}
            <AnimatePresence>
                {isVisible && standings && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={handleClose}
                            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                        />

                        {/* Content */}
                        <motion.div
                            initial={{ y: '-100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '-100%' }}
                            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                            drag="y"
                            dragConstraints={{ top: 0, bottom: 0 }}
                            dragElastic={{ top: 0, bottom: 0.3 }}
                            onDragEnd={handleOverlayDrag}
                            className={cn(
                                'fixed top-0 left-0 right-0 z-50',
                                'max-h-[80vh] overflow-y-auto',
                                'rounded-b-3xl shadow-2xl',
                                className,
                            )}
                            style={{
                                background: 'var(--surface, #1A1814)',
                            }}
                        >
                            {/* Pull handle */}
                            <div className="sticky top-0 flex justify-center py-3 bg-inherit">
                                <div className="w-12 h-1.5 rounded-full bg-white/20" />
                            </div>

                            {/* Header */}
                            <div className="px-6 pb-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                        <Trophy className="w-5 h-5 text-secondary-gold" />
                                        Live Standings
                                    </h2>
                                    {standings.magicNumber > 0 && (
                                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-secondary-gold/20">
                                            <Zap className="w-4 h-4 text-secondary-gold" />
                                            <span className="text-sm font-medium text-secondary-gold">
                                                Magic #: {standings.magicNumber}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Team scores */}
                            <div className="px-6 pb-6">
                                <div className="flex items-stretch gap-4">
                                    {/* Team A */}
                                    <div
                                        className={cn(
                                            'flex-1 p-4 rounded-2xl',
                                            'relative overflow-hidden',
                                        )}
                                        style={{
                                            background: standings.teamA.points >= standings.teamB.points
                                                ? 'linear-gradient(135deg, rgba(185, 28, 28, 0.3) 0%, rgba(185, 28, 28, 0.1) 100%)'
                                                : 'rgba(255, 255, 255, 0.05)',
                                            border: standings.teamA.points >= standings.teamB.points
                                                ? '1px solid rgba(185, 28, 28, 0.3)'
                                                : '1px solid rgba(255, 255, 255, 0.1)',
                                        }}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <div
                                                className="w-4 h-4 rounded-full"
                                                style={{ background: 'var(--team-usa, #B91C1C)' }}
                                            />
                                            <span className="text-sm font-medium text-white/80">USA</span>
                                        </div>
                                        <p className="text-4xl font-bold text-white">
                                            {standings.teamA.points}
                                        </p>
                                        <p className="text-xs text-white/50 mt-1">
                                            {standings.teamA.matchesWon}W - {standings.teamA.matchesLost}L
                                        </p>
                                    </div>

                                    {/* VS */}
                                    <div className="flex flex-col items-center justify-center">
                                        <span className="text-xs text-white/30 font-medium">VS</span>
                                    </div>

                                    {/* Team B */}
                                    <div
                                        className={cn(
                                            'flex-1 p-4 rounded-2xl',
                                            'relative overflow-hidden',
                                        )}
                                        style={{
                                            background: standings.teamB.points > standings.teamA.points
                                                ? 'linear-gradient(135deg, rgba(30, 64, 175, 0.3) 0%, rgba(30, 64, 175, 0.1) 100%)'
                                                : 'rgba(255, 255, 255, 0.05)',
                                            border: standings.teamB.points > standings.teamA.points
                                                ? '1px solid rgba(30, 64, 175, 0.3)'
                                                : '1px solid rgba(255, 255, 255, 0.1)',
                                        }}
                                    >
                                        <div className="flex items-center gap-2 mb-2 justify-end">
                                            <span className="text-sm font-medium text-white/80">EUR</span>
                                            <div
                                                className="w-4 h-4 rounded-full"
                                                style={{ background: 'var(--team-europe, #1E40AF)' }}
                                            />
                                        </div>
                                        <p className="text-4xl font-bold text-white text-right">
                                            {standings.teamB.points}
                                        </p>
                                        <p className="text-xs text-white/50 mt-1 text-right">
                                            {standings.teamB.matchesWon}W - {standings.teamB.matchesLost}L
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Match summaries */}
                            {matchSummaries.length > 0 && (
                                <div className="px-6 pb-8">
                                    <h3 className="text-xs font-medium text-white/40 uppercase tracking-wider mb-3">
                                        Match Status
                                    </h3>
                                    <div className="space-y-2">
                                        {matchSummaries.map((match, index) => (
                                            <div
                                                key={match.id}
                                                className="flex items-center gap-3 p-3 rounded-xl"
                                                style={{
                                                    background: 'rgba(255, 255, 255, 0.03)',
                                                    border: '1px solid rgba(255, 255, 255, 0.05)',
                                                }}
                                            >
                                                <span className="text-xs text-white/30 w-4">
                                                    {index + 1}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span className={cn(
                                                            'truncate',
                                                            match.leader === 'teamA' && 'text-red-400 font-medium',
                                                            match.leader !== 'teamA' && 'text-white/60',
                                                        )}>
                                                            {match.teamANames}
                                                        </span>
                                                        <span className="text-white/30">vs</span>
                                                        <span className={cn(
                                                            'truncate',
                                                            match.leader === 'teamB' && 'text-blue-400 font-medium',
                                                            match.leader !== 'teamB' && 'text-white/60',
                                                        )}>
                                                            {match.teamBNames}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span className={cn(
                                                        'text-xs font-medium',
                                                        match.leader === 'teamA' && 'text-red-400',
                                                        match.leader === 'teamB' && 'text-blue-400',
                                                        match.leader === 'tied' && 'text-white/60',
                                                    )}>
                                                        {match.scoreDisplay}
                                                    </span>
                                                    {match.status === 'inProgress' && (
                                                        <Circle className="w-2 h-2 fill-green-500 text-green-500 animate-pulse" />
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Swipe hint */}
                            <div className="flex justify-center pb-6">
                                <p className="text-[10px] text-white/30">Swipe up to close</p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}

export default QuickStandingsOverlay;
