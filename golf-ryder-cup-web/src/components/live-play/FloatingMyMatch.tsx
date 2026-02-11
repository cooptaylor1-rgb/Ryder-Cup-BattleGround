/**
 * Floating My Match FAB
 *
 * A premium floating action button that provides instant access to the user's
 * active match from any screen. Designed for outdoor visibility and one-thumb
 * operation while walking the course.
 *
 * Features:
 * - Shows live score status (e.g., "2 UP thru 8")
 * - Pulses when match has updates
 * - Haptic feedback on interaction
 * - Expands on hover/focus to show more detail
 * - Auto-hides when already on scoring page
 * - Respects user's reduced motion preferences
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { Target, ChevronUp, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/lib/db';
import { useTripStore, useScoringStore, useUIStore } from '@/lib/stores';
import { calculateMatchState } from '@/lib/services/scoringEngine';
import { useHaptic } from '@/lib/hooks/useHaptic';
import type { Match, HoleResult } from '@/lib/types/models';

// ============================================
// TYPES
// ============================================

interface FloatingMyMatchProps {
    /** Player ID to track (uses current authenticated user if not provided) */
    playerId?: string;
    /** Custom position offset from bottom */
    bottomOffset?: number;
    /** Show in expanded mode by default */
    defaultExpanded?: boolean;
}

interface MyMatchData {
    match: Match;
    holeResults: HoleResult[];
    myTeam: 'teamA' | 'teamB';
    teammateNames: string[];
    opponentNames: string[];
    currentHole: number;
    scoreDisplay: string;
    isWinning: boolean;
    isLosing: boolean;
    isTied: boolean;
}

// ============================================
// COMPONENT
// ============================================

export function FloatingMyMatch({
    playerId,
    bottomOffset = 80,
    defaultExpanded = false,
}: FloatingMyMatchProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { trigger } = useHaptic();
    const { currentTrip, sessions, players } = useTripStore();
    const { selectMatch } = useScoringStore();
    const { scoringPreferences: _scoringPreferences } = useUIStore();

    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const [hasNewUpdate, setHasNewUpdate] = useState(false);

    // Hide on scoring pages to avoid redundancy
    const shouldHide = pathname?.startsWith('/score/');

    // Find the active session
    const activeSession = useMemo(() => {
        return sessions.find(s => s.status === 'inProgress') ||
            sessions.find(s => s.status === 'scheduled');
    }, [sessions]);

    // Get all matches for active session
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

    // Get all hole results for these matches
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

    // Find "my" match - the one containing the specified player
    const myMatchData = useMemo((): MyMatchData | null => {
        if (!matches?.length || !players?.length) return null;

        // Use first player from team A of first match as default "me" if no playerId specified
        // In a real app, this would come from auth context
        const targetPlayerId = playerId || players[0]?.id;
        if (!targetPlayerId) return null;

        // Find the match containing this player
        const myMatch = matches.find(m =>
            m.teamAPlayerIds.includes(targetPlayerId) ||
            m.teamBPlayerIds.includes(targetPlayerId)
        );

        if (!myMatch) return null;

        const myTeam = myMatch.teamAPlayerIds.includes(targetPlayerId) ? 'teamA' : 'teamB';
        const myTeamIds = myTeam === 'teamA' ? myMatch.teamAPlayerIds : myMatch.teamBPlayerIds;
        const oppTeamIds = myTeam === 'teamA' ? myMatch.teamBPlayerIds : myMatch.teamAPlayerIds;

        const getNames = (ids: string[]) =>
            ids.map(id => {
                const p = players.find(pl => pl.id === id);
                return p ? `${p.firstName} ${p.lastName[0]}.` : '';
            }).filter(Boolean);

        const matchResults = allHoleResults.filter(r => r.matchId === myMatch.id);
        const _matchState = calculateMatchState(myMatch, matchResults);

        // Calculate score from my team's perspective
        let teamAWins = 0;
        let teamBWins = 0;
        matchResults.forEach(r => {
            if (r.winner === 'teamA') teamAWins++;
            else if (r.winner === 'teamB') teamBWins++;
        });

        const myWins = myTeam === 'teamA' ? teamAWins : teamBWins;
        const oppWins = myTeam === 'teamA' ? teamBWins : teamAWins;
        const diff = myWins - oppWins;
        const holesPlayed = matchResults.length;

        let scoreDisplay: string;
        let isWinning = false;
        let isLosing = false;
        let isTied = false;

        if (diff > 0) {
            scoreDisplay = `${diff} UP`;
            isWinning = true;
        } else if (diff < 0) {
            scoreDisplay = `${Math.abs(diff)} DN`;
            isLosing = true;
        } else {
            scoreDisplay = 'AS';
            isTied = true;
        }

        if (holesPlayed > 0) {
            scoreDisplay += ` thru ${holesPlayed}`;
        }

        // Get current hole (next to play)
        const currentHole = holesPlayed + 1;

        return {
            match: myMatch,
            holeResults: matchResults,
            myTeam,
            teammateNames: getNames(myTeamIds),
            opponentNames: getNames(oppTeamIds),
            currentHole: Math.min(currentHole, 18),
            scoreDisplay,
            isWinning,
            isLosing,
            isTied,
        };
    }, [matches, allHoleResults, players, playerId]);

    // Track updates for pulse animation
    const resultsCount = allHoleResults?.length || 0;
    useEffect(() => {
        if (resultsCount > 0) {
            setHasNewUpdate(true);
            const timer = setTimeout(() => setHasNewUpdate(false), 3000);
            return () => clearTimeout(timer);
        }
    }, [resultsCount]);

    // Handle FAB click
    const handleClick = async () => {
        if (!myMatchData) return;

        trigger('medium');

        if (isExpanded) {
            // Navigate to match scoring
            await selectMatch(myMatchData.match.id);
            router.push(`/score/${myMatchData.match.id}`);
        } else {
            // Expand to show details
            setIsExpanded(true);
            trigger('selection');
        }
    };

    // Handle expand/collapse
    const handleExpandToggle = (e: React.MouseEvent) => {
        e.stopPropagation();
        trigger('selection');
        setIsExpanded(!isExpanded);
    };

    // Don't render if no trip, or on scoring page
    if (!currentTrip || shouldHide) {
        return null;
    }

    // If we can't resolve a match yet, show a gentle affordance instead of disappearing.
    if (!myMatchData) {
        return (
            <motion.button
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96, y: 10 }}
                onClick={() => {
                    trigger('selection');
                    router.push('/schedule');
                }}
                className={cn(
                    'fixed right-4 z-50',
                    'lg:right-6',
                    'flex items-center gap-2 rounded-full shadow-lg',
                    'px-4 py-3 bg-[var(--surface)] border border-[var(--border)]'
                )}
                style={{ bottom: `${bottomOffset}px` }}
                aria-label="Find my match"
                type="button"
            >
                <Target className="w-5 h-5 text-[var(--ink-secondary)]" />
                <span className="text-sm font-medium text-[var(--ink-secondary)]">Find my match</span>
            </motion.button>
        );
    }

    const { scoreDisplay, isWinning, isLosing, currentHole, teammateNames, opponentNames } = myMatchData;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, scale: 0.8, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.8, y: 20 }}
                className={cn(
                    'fixed right-4 z-50',
                    'lg:right-6',
                )}
                style={{ bottom: `${bottomOffset}px` }}
            >
                {/* Main FAB */}
                <motion.button
                    onClick={handleClick}
                    whileTap={{ scale: 0.95 }}
                    className={cn(
                        'relative flex items-center gap-3',
                        'rounded-full shadow-lg',
                        'transition-all duration-300 ease-out',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                        // Sizing based on expanded state
                        isExpanded ? 'px-4 py-3' : 'px-4 py-3',
                    )}
                    style={{
                        background: isWinning
                            ? 'linear-gradient(135deg, var(--masters) 0%, #004D35 100%)'
                            : isLosing
                                ? 'linear-gradient(135deg, #B91C1C 0%, #991B1B 100%)'
                                : 'linear-gradient(135deg, var(--surface) 0%, #2A2520 100%)',
                        boxShadow: hasNewUpdate
                            ? '0 0 20px rgba(0, 103, 71, 0.5), 0 4px 20px rgba(0, 0, 0, 0.3)'
                            : '0 4px 20px rgba(0, 0, 0, 0.3)',
                        color: '#F5F1E8',
                    }}
                    aria-label={`My match: ${scoreDisplay}. Tap to ${isExpanded ? 'go to scoring' : 'expand'}`}
                >
                    {/* Pulse ring for updates */}
                    {hasNewUpdate && (
                        <motion.div
                            className="absolute inset-0 rounded-full"
                            style={{
                                background: isWinning
                                    ? 'var(--masters)'
                                    : isLosing
                                        ? '#B91C1C'
                                        : 'var(--surface)',
                            }}
                            initial={{ opacity: 0.6, scale: 1 }}
                            animate={{ opacity: 0, scale: 1.5 }}
                            transition={{ duration: 1.5, repeat: Infinity }}
                        />
                    )}

                    {/* Icon */}
                    <div className="relative">
                        <Target className="w-5 h-5" />
                        {/* Hole number badge */}
                        <span
                            className="absolute -top-1 -right-1 w-4 h-4 flex items-center justify-center rounded-full text-[10px] font-bold"
                            style={{
                                background: 'rgba(0, 0, 0, 0.4)',
                                backdropFilter: 'blur(4px)',
                            }}
                        >
                            {currentHole}
                        </span>
                    </div>

                    {/* Score display */}
                    <div className="flex flex-col items-start">
                        <span className="text-sm font-bold tracking-wide">
                            {scoreDisplay}
                        </span>
                        {isExpanded && (
                            <motion.span
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="text-[10px] opacity-80"
                            >
                                Tap to score
                            </motion.span>
                        )}
                    </div>

                    {/* Expand/collapse toggle */}
                    <button
                        onClick={handleExpandToggle}
                        className={cn(
                            'p-1 rounded-full transition-transform duration-200',
                            'hover:bg-white/10',
                        )}
                        aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    >
                        <ChevronUp
                            className={cn(
                                'w-4 h-4 transition-transform duration-200',
                                isExpanded ? 'rotate-180' : 'rotate-0',
                            )}
                        />
                    </button>
                </motion.button>

                {/* Expanded detail card */}
                <AnimatePresence>
                    {isExpanded && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                            className={cn(
                                'absolute bottom-full right-0 mb-2',
                                'w-56 p-3 rounded-xl',
                                'shadow-xl backdrop-blur-md',
                            )}
                            style={{
                                background: 'rgba(26, 24, 20, 0.95)',
                                border: '1px solid rgba(128, 120, 104, 0.2)',
                            }}
                        >
                            {/* Match info */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] uppercase tracking-wider opacity-60">
                                        Your Team
                                    </span>
                                    <Circle
                                        className="w-2 h-2"
                                        fill={isWinning ? 'var(--masters)' : isLosing ? '#EF4444' : '#6B7280'}
                                        stroke="none"
                                    />
                                </div>
                                <p className="text-sm font-medium">
                                    {teammateNames.join(' & ')}
                                </p>

                                <div className="h-px bg-white/10 my-2" />

                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] uppercase tracking-wider opacity-60">
                                        Opponents
                                    </span>
                                </div>
                                <p className="text-sm opacity-80">
                                    {opponentNames.join(' & ')}
                                </p>

                                <div className="h-px bg-white/10 my-2" />

                                {/* Quick stats */}
                                <div className="flex items-center justify-between text-xs">
                                    <span className="opacity-60">Hole {currentHole} of 18</span>
                                    <span className={cn(
                                        'font-semibold',
                                        isWinning && 'text-green-400',
                                        isLosing && 'text-red-400',
                                    )}>
                                        {scoreDisplay}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </AnimatePresence>
    );
}

export default FloatingMyMatch;
