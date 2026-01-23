/**
 * Match Status Header
 *
 * A persistent mini-scoreboard that shows the current match status
 * at the top of any screen. Provides at-a-glance awareness without
 * requiring navigation to the scoring page.
 *
 * Features:
 * - Always-visible current score
 * - Tap to expand for more details
 * - Shows match momentum indicator
 * - Live updates with subtle animation
 * - Collapses when space is needed
 * - Accessible and screen-reader friendly
 */

'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Target, Flame } from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/lib/db';
import { useTripStore, useScoringStore } from '@/lib/stores';
import { useHaptic } from '@/lib/hooks/useHaptic';
import type { Match, Player } from '@/lib/types/models';

// ============================================
// TYPES
// ============================================

interface MatchStatusHeaderProps {
    /** Player ID to track (optional) */
    playerId?: string;
    /** Show expanded by default */
    defaultExpanded?: boolean;
    /** Custom class name */
    className?: string;
}

interface MatchStatusData {
    match: Match;
    teamAPlayers: Player[];
    teamBPlayers: Player[];
    teamAWins: number;
    teamBWins: number;
    halves: number;
    currentHole: number;
    isComplete: boolean;
    momentum: 'teamA' | 'teamB' | 'neutral';
    streak: number;
}

// ============================================
// COMPONENT
// ============================================

export function MatchStatusHeader({
    playerId,
    defaultExpanded = false,
    className,
}: MatchStatusHeaderProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { trigger } = useHaptic();
    const { currentTrip, sessions, players } = useTripStore();
    const { selectMatch } = useScoringStore();

    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const [_lastUpdate, setLastUpdate] = useState<number>(0);

    // Don't show on home page or if no trip
    const shouldHide = pathname === '/' || !currentTrip;

    // Find active session
    const activeSession = useMemo(() => {
        return sessions.find(s => s.status === 'inProgress') ||
            sessions.find(s => s.status === 'scheduled');
    }, [sessions]);

    // Get all matches
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

    // Track updates for animation
    const totalResults = allHoleResults?.length || 0;
    useEffect(() => {
        if (totalResults > 0) {
            setLastUpdate(Date.now());
        }
    }, [totalResults]);

    // Calculate match status data for "my" match
    const statusData = useMemo((): MatchStatusData | null => {
        if (!matches?.length || !players?.length) return null;

        const targetPlayerId = playerId || players[0]?.id;
        if (!targetPlayerId) return null;

        // Find my match
        const myMatch = matches.find(m =>
            m.teamAPlayerIds.includes(targetPlayerId) ||
            m.teamBPlayerIds.includes(targetPlayerId)
        );

        if (!myMatch) return null;

        const matchResults = allHoleResults.filter(r => r.matchId === myMatch.id);

        // Get players
        const teamAPlayers = myMatch.teamAPlayerIds
            .map(id => players.find(p => p.id === id))
            .filter(Boolean) as Player[];
        const teamBPlayers = myMatch.teamBPlayerIds
            .map(id => players.find(p => p.id === id))
            .filter(Boolean) as Player[];

        // Count results
        let teamAWins = 0;
        let teamBWins = 0;
        let halves = 0;

        matchResults.forEach(r => {
            if (r.winner === 'teamA') teamAWins++;
            else if (r.winner === 'teamB') teamBWins++;
            else if (r.winner === 'halved') halves++;
        });

        const currentHole = matchResults.length + 1;
        const isComplete = currentHole > 18 || myMatch.status === 'completed';

        // Calculate momentum (last 3 holes)
        const lastThree = matchResults.slice(-3);
        let recentA = 0;
        let recentB = 0;
        lastThree.forEach(r => {
            if (r.winner === 'teamA') recentA++;
            else if (r.winner === 'teamB') recentB++;
        });

        let momentum: 'teamA' | 'teamB' | 'neutral' = 'neutral';
        if (recentA >= 2) momentum = 'teamA';
        else if (recentB >= 2) momentum = 'teamB';

        // Calculate streak
        let streak = 0;
        let streakTeam: string | null = null;
        for (let i = matchResults.length - 1; i >= 0; i--) {
            const winner = matchResults[i].winner;
            if (winner === 'halved') break;
            if (!streakTeam) {
                streakTeam = winner;
                streak = 1;
            } else if (winner === streakTeam) {
                streak++;
            } else {
                break;
            }
        }

        return {
            match: myMatch,
            teamAPlayers,
            teamBPlayers,
            teamAWins,
            teamBWins,
            halves,
            currentHole: Math.min(currentHole, 18),
            isComplete,
            momentum,
            streak,
        };
    }, [matches, allHoleResults, players, playerId]);

    // Handle tap to expand
    const handleToggle = () => {
        trigger('selection');
        setIsExpanded(!isExpanded);
    };

    // Handle navigate to scoring
    const handleNavigate = async () => {
        if (!statusData) return;
        trigger('medium');
        await selectMatch(statusData.match.id);
        router.push(`/score/${statusData.match.id}`);
    };

    if (shouldHide || !statusData) return null;

    const {
        teamAPlayers,
        teamBPlayers,
        teamAWins,
        teamBWins,
        halves,
        currentHole,
        isComplete,
        momentum,
        streak,
    } = statusData;

    const diff = teamAWins - teamBWins;
    const isTeamAUp = diff > 0;
    const isTeamBUp = diff < 0;
    const isTied = diff === 0;

    // Format score display
    const formatScore = () => {
        if (isComplete && diff === 0) return 'Halved';
        if (isComplete) {
            const leader = isTeamAUp ? 'USA' : 'EUR';
            return `${leader} wins`;
        }
        if (isTied) return 'All Square';
        const up = Math.abs(diff);
        const leader = isTeamAUp ? 'USA' : 'EUR';
        return `${leader} ${up} UP`;
    };

    return (
        <motion.div
            layout
            className={cn(
                'mx-4 mt-2 rounded-xl overflow-hidden',
                'shadow-md backdrop-blur-md',
                className,
            )}
            style={{
                background: 'rgba(26, 24, 20, 0.95)',
                border: '1px solid rgba(128, 120, 104, 0.2)',
            }}
        >
            {/* Compact header */}
            <button
                onClick={handleToggle}
                className="w-full flex items-center justify-between px-4 py-2.5"
            >
                <div className="flex items-center gap-3">
                    {/* Status indicator */}
                    <div
                        className={cn(
                            'w-2 h-2 rounded-full',
                            isComplete ? 'bg-gray-400' : 'animate-pulse',
                        )}
                        style={{
                            background: isComplete
                                ? '#6B7280'
                                : isTeamAUp
                                    ? 'var(--team-usa, #B91C1C)'
                                    : isTeamBUp
                                        ? 'var(--team-europe, #1E40AF)'
                                        : 'var(--masters, #006747)',
                        }}
                    />

                    {/* Score display */}
                    <div className="flex items-baseline gap-2">
                        <span className="text-sm font-bold text-white">
                            {formatScore()}
                        </span>
                        {!isComplete && currentHole > 1 && (
                            <span className="text-xs text-white/50">
                                thru {currentHole - 1}
                            </span>
                        )}
                    </div>

                    {/* Momentum indicator */}
                    {streak >= 2 && (
                        <div
                            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                            style={{
                                background: momentum === 'teamA'
                                    ? 'rgba(185, 28, 28, 0.2)'
                                    : momentum === 'teamB'
                                        ? 'rgba(30, 64, 175, 0.2)'
                                        : 'rgba(128, 120, 104, 0.2)',
                                color: momentum === 'teamA'
                                    ? '#EF4444'
                                    : momentum === 'teamB'
                                        ? '#60A5FA'
                                        : '#A09080',
                            }}
                        >
                            <Flame className="w-3 h-3" />
                            {streak} in a row
                        </div>
                    )}
                </div>

                {/* Expand toggle */}
                <ChevronDown
                    className={cn(
                        'w-4 h-4 text-white/40 transition-transform duration-200',
                        isExpanded && 'rotate-180',
                    )}
                />
            </button>

            {/* Expanded content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-3 space-y-3">
                            {/* Divider */}
                            <div className="h-px bg-white/10" />

                            {/* Teams */}
                            <div className="flex items-center justify-between text-sm">
                                {/* Team A */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ background: 'var(--team-usa, #B91C1C)' }}
                                        />
                                        <span className="text-xs text-white/60 uppercase tracking-wider">
                                            USA
                                        </span>
                                    </div>
                                    <p className="font-medium text-white text-xs">
                                        {teamAPlayers.map(p => `${p.firstName || '?'} ${p.lastName?.[0] || '?'}.`).join(' / ')}
                                    </p>
                                    <p className="text-xl font-bold text-white mt-1">{teamAWins}</p>
                                </div>

                                {/* VS */}
                                <div className="px-4 text-center">
                                    <span className="text-xs text-white/40">VS</span>
                                    <p className="text-xs text-white/30 mt-1">{halves} halved</p>
                                </div>

                                {/* Team B */}
                                <div className="flex-1 text-right">
                                    <div className="flex items-center gap-2 mb-1 justify-end">
                                        <span className="text-xs text-white/60 uppercase tracking-wider">
                                            EUR
                                        </span>
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ background: 'var(--team-europe, #1E40AF)' }}
                                        />
                                    </div>
                                    <p className="font-medium text-white text-xs">
                                        {teamBPlayers.map(p => `${p.firstName || '?'} ${p.lastName?.[0] || '?'}.`).join(' / ')}
                                    </p>
                                    <p className="text-xl font-bold text-white mt-1">{teamBWins}</p>
                                </div>
                            </div>

                            {/* Navigate to scoring */}
                            {!isComplete && (
                                <button
                                    onClick={handleNavigate}
                                    className={cn(
                                        'w-full flex items-center justify-center gap-2',
                                        'py-2 rounded-lg',
                                        'text-sm font-medium',
                                        'transition-colors duration-150',
                                    )}
                                    style={{
                                        background: 'var(--masters)',
                                        color: 'white',
                                    }}
                                >
                                    <Target className="w-4 h-4" />
                                    Score Hole {currentHole}
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
}

export default MatchStatusHeader;
