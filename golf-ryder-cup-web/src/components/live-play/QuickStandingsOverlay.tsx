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

import { useState, useMemo, useCallback, type CSSProperties } from 'react';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence, useMotionValue, useTransform, PanInfo } from 'framer-motion';
import { Trophy, ChevronDown, Circle, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSessionMatchData } from '@/lib/hooks/useSessionMatchData';
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

    // Get matches and hole results in a single compound query (eliminates N+1 pattern)
    const { matches, holeResults: allHoleResults } = useSessionMatchData(activeSession?.id);

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

    const teamALeading = standings ? standings.teamA.points >= standings.teamB.points : false;
    const teamBLeading = standings ? standings.teamB.points > standings.teamA.points : false;
    const teamAToneStyle = {
        '--team-tone': 'var(--team-usa)',
    } as CSSProperties & Record<'--team-tone', string>;
    const teamBToneStyle = {
        '--team-tone': 'var(--team-europe)',
    } as CSSProperties & Record<'--team-tone', string>;

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
                            className="flex items-center gap-2 rounded-full border border-[color:var(--rule)]/30 bg-[color:var(--surface)]/80 px-4 py-2 text-[var(--ink-secondary)] backdrop-blur-sm"
                            style={{ y: pullProgress }}
                        >
                            <ChevronDown className="h-4 w-4 text-[var(--ink-tertiary)]" />
                            <span className="text-xs">Pull for standings</span>
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
                                'rounded-b-3xl border-b border-[color:var(--rule)]/30',
                                'bg-[var(--surface-raised)] text-[var(--ink)] shadow-[var(--shadow-card-lg)]',
                                className,
                            )}
                        >
                            {/* Pull handle */}
                            <div className="sticky top-0 flex justify-center bg-inherit py-3">
                                <div className="h-1.5 w-12 rounded-full bg-[color:var(--ink-tertiary)]/40" />
                            </div>

                            {/* Header */}
                            <div className="px-6 pb-4">
                                <div className="flex items-center justify-between">
                                    <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--ink)]">
                                        <Trophy className="h-5 w-5 text-[var(--premium-gold)]" />
                                        Live Standings
                                    </h2>
                                    {standings.magicNumber > 0 && (
                                        <div className="flex items-center gap-1.5 rounded-full bg-[color:var(--premium-gold)]/18 px-3 py-1 text-[color:var(--premium-gold)]">
                                            <Zap className="h-4 w-4" />
                                            <span className="text-sm font-medium">
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
                                            'relative flex-1 overflow-hidden rounded-2xl border p-4',
                                            teamALeading
                                                ? 'border-[color:color-mix(in_srgb,var(--team-tone)_38%,transparent)] bg-[color:color-mix(in_srgb,var(--team-tone)_18%,transparent)] shadow-[var(--shadow-card-sm)]'
                                                : 'border-[color:var(--rule)]/40 bg-[var(--surface)]',
                                        )}
                                        style={teamAToneStyle}
                                    >
                                        <div className="mb-2 flex items-center gap-2">
                                            <div className="h-4 w-4 rounded-full bg-[color:var(--team-usa)]" />
                                            <span
                                                className={cn(
                                                    'text-sm font-medium',
                                                    teamALeading
                                                        ? 'text-[color:var(--team-tone)]'
                                                        : 'text-[var(--ink-secondary)]',
                                                )}
                                            >
                                                USA
                                            </span>
                                        </div>
                                        <p className="text-4xl font-bold text-[var(--ink)]">
                                            {standings.teamA.points}
                                        </p>
                                        <p className="mt-1 text-xs text-[var(--ink-tertiary)]">
                                            {standings.teamA.matchesWon}W - {standings.teamA.matchesLost}L
                                        </p>
                                    </div>

                                    {/* VS */}
                                    <div className="flex flex-col items-center justify-center">
                                        <span className="text-xs font-medium text-[var(--ink-tertiary)]">VS</span>
                                    </div>

                                    {/* Team B */}
                                    <div
                                        className={cn(
                                            'relative flex-1 overflow-hidden rounded-2xl border p-4',
                                            teamBLeading
                                                ? 'border-[color:color-mix(in_srgb,var(--team-tone)_38%,transparent)] bg-[color:color-mix(in_srgb,var(--team-tone)_18%,transparent)] shadow-[var(--shadow-card-sm)]'
                                                : 'border-[color:var(--rule)]/40 bg-[var(--surface)]',
                                        )}
                                        style={teamBToneStyle}
                                    >
                                        <div className="mb-2 flex items-center justify-end gap-2">
                                            <span
                                                className={cn(
                                                    'text-sm font-medium',
                                                    teamBLeading
                                                        ? 'text-[color:var(--team-tone)]'
                                                        : 'text-[var(--ink-secondary)]',
                                                )}
                                            >
                                                EUR
                                            </span>
                                            <div className="h-4 w-4 rounded-full bg-[color:var(--team-europe)]" />
                                        </div>
                                        <p className="text-right text-4xl font-bold text-[var(--ink)]">
                                            {standings.teamB.points}
                                        </p>
                                        <p className="mt-1 text-right text-xs text-[var(--ink-tertiary)]">
                                            {standings.teamB.matchesWon}W - {standings.teamB.matchesLost}L
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Match summaries */}
                            {matchSummaries.length > 0 && (
                                <div className="px-6 pb-8">
                                    <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-[var(--ink-tertiary)]">
                                        Match Status
                                    </h3>
                                    <div className="space-y-2">
                                        {matchSummaries.map((match, index) => (
                                            <div
                                                key={match.id}
                                                className="flex items-center gap-3 rounded-xl border border-[color:var(--rule)]/40 bg-[color:var(--surface)]/70 p-3"
                                            >
                                                <span className="w-4 text-xs text-[var(--ink-tertiary)]">
                                                    {index + 1}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 text-xs">
                                                        <span
                                                            className={cn(
                                                                'truncate',
                                                                match.leader === 'teamA'
                                                                    ? 'text-[color:var(--team-usa)] font-medium'
                                                                    : 'text-[var(--ink-secondary)]',
                                                            )}
                                                        >
                                                            {match.teamANames}
                                                        </span>
                                                        <span className="text-[var(--ink-tertiary)]">vs</span>
                                                        <span
                                                            className={cn(
                                                                'truncate',
                                                                match.leader === 'teamB'
                                                                    ? 'text-[color:var(--team-europe)] font-medium'
                                                                    : 'text-[var(--ink-secondary)]',
                                                            )}
                                                        >
                                                            {match.teamBNames}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <span
                                                        className={cn(
                                                            'text-xs font-medium',
                                                            match.leader === 'teamA' && 'text-[color:var(--team-usa)]',
                                                            match.leader === 'teamB' && 'text-[color:var(--team-europe)]',
                                                            match.leader === 'tied' && 'text-[var(--ink-secondary)]',
                                                        )}
                                                    >
                                                        {match.scoreDisplay}
                                                    </span>
                                                    {match.status === 'inProgress' && (
                                                        <Circle className="h-2 w-2 animate-pulse fill-[var(--info)] text-[var(--info)]" />
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Swipe hint */}
                            <div className="flex justify-center pb-6">
                                <p className="text-[10px] text-[var(--ink-tertiary)]">Swipe up to close</p>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}

export default QuickStandingsOverlay;
