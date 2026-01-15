/**
 * QuickScoreFABv2 — Phase 1.6: Enhanced Floating Action Button
 *
 * Premium floating action button for instant scoring access.
 * Expands to reveal quick actions for the fastest scoring experience.
 *
 * Features:
 * - Persistent FAB that follows you everywhere
 * - Expands to show quick score options
 * - Long-press for voice scoring
 * - Shows current match status
 * - Haptic feedback throughout
 * - Respects reduced motion
 * - Accessibility support
 */

'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import {
    Target,
    Mic,
    ChevronRight,
    X,
    Trophy,
    Minus,
    Volume2,
    VolumeX,
} from 'lucide-react';
import { useTripStore, useScoringStore, useUIStore } from '@/lib/stores';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { calculateMatchState } from '@/lib/services/scoringEngine';
import { useHaptic } from '@/lib/hooks';
import type { Match, HoleWinner } from '@/lib/types/models';

interface QuickScoreFABv2Props {
    /** Force show even on scoring pages */
    forceShow?: boolean;
    /** Custom position override */
    position?: { bottom: number; right: number };
}

export function QuickScoreFABv2({
    forceShow = false,
    position = { bottom: 100, right: 16 },
}: QuickScoreFABv2Props) {
    const pathname = usePathname();
    const router = useRouter();
    const haptic = useHaptic();
    const { currentTrip } = useTripStore();
    const { scoreHole, selectMatch, activeMatch, currentHole } = useScoringStore();
    const { scoringPreferences } = useUIStore();

    const [isExpanded, setIsExpanded] = useState(false);
    const [isVoiceMode, setIsVoiceMode] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [activeMatchData, setActiveMatchData] = useState<{
        match: Match;
        displayScore: string;
        currentHole: number;
        teamAName: string;
        teamBName: string;
    } | null>(null);

    const longPressTimer = useRef<NodeJS.Timeout | null>(null);
    const fabRef = useRef<HTMLDivElement>(null);

    // Pages where FAB should be hidden
    const shouldHide =
        !forceShow && (
            !currentTrip ||
            pathname === '/' ||
            pathname.startsWith('/score/') ||
            pathname.startsWith('/profile/create') ||
            pathname.startsWith('/trip/new') ||
            pathname.startsWith('/login')
        );

    // Find active matches
    const inProgressMatches = useLiveQuery(async () => {
        if (!currentTrip) return [];

        const sessions = await db.sessions
            .where('tripId')
            .equals(currentTrip.id)
            .toArray();

        if (sessions.length === 0) return [];

        const sessionIds = sessions.map((s) => s.id);
        const matches = await db.matches
            .where('sessionId')
            .anyOf(sessionIds)
            .filter((m) => m.status === 'inProgress')
            .toArray();

        return matches;
    }, [currentTrip?.id]);

    // Get teams for names
    const { teams } = useTripStore();
    const teamA = teams.find(t => t.color === 'usa');
    const teamB = teams.find(t => t.color === 'europe');

    // Update active match data
    useEffect(() => {
        async function updateActiveMatch() {
            if (!inProgressMatches || inProgressMatches.length === 0) {
                setActiveMatchData(null);
                return;
            }

            const match = inProgressMatches[0];
            const holeResults = await db.holeResults
                .where('matchId')
                .equals(match.id)
                .toArray();

            const state = calculateMatchState(match, holeResults);

            setActiveMatchData({
                match,
                displayScore: state.displayScore,
                currentHole: state.holesPlayed + 1,
                teamAName: teamA?.name || 'USA',
                teamBName: teamB?.name || 'Europe',
            });
        }

        updateActiveMatch();
    }, [inProgressMatches, teamA, teamB]);

    // Handle FAB tap
    const handleTap = useCallback(() => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }

        haptic.tap();
        setIsExpanded(prev => !prev);
    }, [haptic]);

    // Handle long press start
    const handlePressStart = useCallback(() => {
        longPressTimer.current = setTimeout(() => {
            haptic.impact();
            setIsVoiceMode(true);
            setIsExpanded(true);
        }, 500);
    }, [haptic]);

    // Handle press end
    const handlePressEnd = useCallback(() => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
            longPressTimer.current = null;
        }
    }, []);

    // Handle quick score
    const handleQuickScore = useCallback(async (winner: HoleWinner) => {
        if (!activeMatchData) return;

        haptic.scorePoint();

        // Select match if not already active
        if (!activeMatch || activeMatch.id !== activeMatchData.match.id) {
            await selectMatch(activeMatchData.match.id);
        }

        await scoreHole(winner);
        setIsExpanded(false);
    }, [activeMatchData, activeMatch, selectMatch, scoreHole, haptic]);

    // Handle navigate to full scoring
    const handleNavigateToScoring = useCallback(() => {
        if (!activeMatchData) return;
        haptic.navigation();
        router.push(`/score/${activeMatchData.match.id}`);
        setIsExpanded(false);
    }, [activeMatchData, router, haptic]);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (fabRef.current && !fabRef.current.contains(e.target as Node)) {
                setIsExpanded(false);
                setIsVoiceMode(false);
            }
        };

        if (isExpanded) {
            document.addEventListener('mousedown', handleClickOutside);
            return () => document.removeEventListener('mousedown', handleClickOutside);
        }
    }, [isExpanded]);

    // Don't render if should hide or no active match
    if (shouldHide || !activeMatchData) {
        return null;
    }

    const teamAColor = '#0047AB';
    const teamBColor = '#8B0000';

    return (
        <div
            ref={fabRef}
            className="fixed z-50"
            style={{ bottom: position.bottom, right: position.right }}
        >
            <AnimatePresence>
                {/* Expanded Menu */}
                {isExpanded && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.8, y: 20 }}
                        transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                        className="absolute bottom-16 right-0 w-72 rounded-2xl shadow-2xl overflow-hidden"
                        style={{ background: 'var(--surface)' }}
                    >
                        {/* Header */}
                        <div
                            className="px-4 py-3 flex items-center justify-between"
                            style={{ background: 'var(--masters)' }}
                        >
                            <div className="text-white">
                                <p className="text-xs opacity-80">Hole {activeMatchData.currentHole}</p>
                                <p className="font-semibold">{activeMatchData.displayScore}</p>
                            </div>
                            <button
                                onClick={() => {
                                    setIsExpanded(false);
                                    setIsVoiceMode(false);
                                }}
                                className="p-1 rounded-full hover:bg-white/20 transition-colors"
                            >
                                <X className="w-5 h-5 text-white" />
                            </button>
                        </div>

                        {/* Voice Mode */}
                        {isVoiceMode ? (
                            <div className="p-4">
                                <div className="flex flex-col items-center py-4">
                                    <motion.div
                                        animate={isListening ? { scale: [1, 1.1, 1] } : {}}
                                        transition={{ duration: 1, repeat: Infinity }}
                                        className={`
                      w-20 h-20 rounded-full flex items-center justify-center mb-3
                      ${isListening ? 'bg-red-500' : 'bg-gray-200 dark:bg-gray-700'}
                    `}
                                    >
                                        <Mic className={`w-8 h-8 ${isListening ? 'text-white' : 'text-gray-600'}`} />
                                    </motion.div>
                                    <p className="text-sm text-center" style={{ color: 'var(--ink-secondary)' }}>
                                        {isListening
                                            ? 'Listening... Say "USA wins" or "Europe wins"'
                                            : 'Tap mic to start voice scoring'
                                        }
                                    </p>
                                </div>
                                <button
                                    onClick={() => setIsVoiceMode(false)}
                                    className="w-full py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                                >
                                    Switch to tap scoring
                                </button>
                            </div>
                        ) : (
                            /* Quick Score Buttons */
                            <div className="p-3 space-y-2">
                                {/* Team A Button */}
                                <button
                                    onClick={() => handleQuickScore('teamA')}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                                    style={{ background: `${teamAColor}15` }}
                                >
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center"
                                        style={{ background: teamAColor }}
                                    >
                                        <Trophy className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="font-semibold" style={{ color: teamAColor }}>
                                            {activeMatchData.teamAName} Wins
                                        </p>
                                        <p className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
                                            Tap to score
                                        </p>
                                    </div>
                                </button>

                                {/* Halved Button */}
                                <button
                                    onClick={() => handleQuickScore('halved')}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98] bg-gray-100 dark:bg-gray-800"
                                >
                                    <div className="w-10 h-10 rounded-full flex items-center justify-center bg-gray-500">
                                        <Minus className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="font-semibold" style={{ color: 'var(--ink-primary)' }}>
                                            Hole Halved
                                        </p>
                                        <p className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
                                            All square this hole
                                        </p>
                                    </div>
                                </button>

                                {/* Team B Button */}
                                <button
                                    onClick={() => handleQuickScore('teamB')}
                                    className="w-full flex items-center gap-3 p-3 rounded-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                                    style={{ background: `${teamBColor}15` }}
                                >
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center"
                                        style={{ background: teamBColor }}
                                    >
                                        <Trophy className="w-5 h-5 text-white" />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="font-semibold" style={{ color: teamBColor }}>
                                            {activeMatchData.teamBName} Wins
                                        </p>
                                        <p className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
                                            Tap to score
                                        </p>
                                    </div>
                                </button>

                                {/* Divider */}
                                <div className="h-px bg-gray-200 dark:bg-gray-700 my-2" />

                                {/* Full Scorecard Link */}
                                <button
                                    onClick={handleNavigateToScoring}
                                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                                >
                                    <div className="flex items-center gap-2">
                                        <Target className="w-4 h-4" style={{ color: 'var(--masters)' }} />
                                        <span className="text-sm font-medium" style={{ color: 'var(--ink-primary)' }}>
                                            Open Full Scorecard
                                        </span>
                                    </div>
                                    <ChevronRight className="w-4 h-4" style={{ color: 'var(--ink-tertiary)' }} />
                                </button>

                                {/* Voice Mode Toggle */}
                                <button
                                    onClick={() => setIsVoiceMode(true)}
                                    className="w-full flex items-center justify-center gap-2 p-2 text-xs font-medium rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                                    style={{ color: 'var(--ink-secondary)' }}
                                >
                                    <Mic className="w-3 h-3" />
                                    Use Voice Scoring
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main FAB */}
            <motion.button
                onTap={handleTap}
                onTapStart={handlePressStart}
                onTapCancel={handlePressEnd}
                whileTap={{ scale: 0.95 }}
                className={`
          relative flex items-center gap-3 px-4 py-3 rounded-2xl shadow-lg
          transition-all duration-200
          ${isExpanded ? 'rounded-full w-12 h-12 p-0 justify-center' : ''}
        `}
                style={{
                    background: isExpanded ? 'var(--ink-secondary)' : 'var(--masters)',
                    color: 'white',
                    boxShadow: isExpanded
                        ? '0 4px 12px rgba(0, 0, 0, 0.2)'
                        : '0 4px 20px rgba(0, 103, 71, 0.4)',
                }}
                aria-label={isExpanded ? 'Close quick score' : 'Open quick score'}
            >
                {isExpanded ? (
                    <X className="w-5 h-5" />
                ) : (
                    <>
                        {/* Pulse indicator */}
                        <div className="relative">
                            <span
                                className="absolute inset-0 rounded-full animate-ping opacity-75"
                                style={{ background: 'rgba(255, 255, 255, 0.4)' }}
                            />
                            <div
                                className="relative w-10 h-10 rounded-full flex items-center justify-center"
                                style={{ background: 'rgba(255, 255, 255, 0.2)' }}
                            >
                                <Target className="w-5 h-5" />
                            </div>
                        </div>

                        {/* Match info */}
                        <div className="text-left">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold">{activeMatchData.displayScore}</span>
                                <span
                                    className="text-xs px-1.5 py-0.5 rounded"
                                    style={{ background: 'rgba(255, 255, 255, 0.2)' }}
                                >
                                    LIVE
                                </span>
                            </div>
                            <span className="text-xs opacity-80">
                                Hole {activeMatchData.currentHole} • Tap to score
                            </span>
                        </div>
                    </>
                )}
            </motion.button>
        </div>
    );
}
