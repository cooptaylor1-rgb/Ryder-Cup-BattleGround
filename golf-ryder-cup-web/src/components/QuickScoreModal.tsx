'use client';

/**
 * Quick Score Modal
 *
 * A slide-up modal for quickly entering hole results without
 * navigating away from the current page. Triggered from QuickScoreFAB.
 *
 * Features:
 * - Simple 3-button interface: Team A wins, Halved, Team B wins
 * - Shows current match status
 * - Voice input support (future)
 * - Haptic feedback
 * - Auto-advances to next hole
 */

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Minus, ChevronLeft, ChevronRight, Trophy, AlertCircle } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useTripStore } from '@/lib/stores';
import { calculateMatchState, recordHoleResult } from '@/lib/services/scoringEngine';
import { useHaptic } from '@/lib/hooks/useHaptic';
import { scoringLogger } from '@/lib/utils/logger';
import type { Player, HoleWinner } from '@/lib/types/models';
import type { MatchState } from '@/lib/types/computed';

interface QuickScoreModalProps {
    isOpen: boolean;
    onClose: () => void;
    matchId: string;
}

export function QuickScoreModal({ isOpen, onClose, matchId }: QuickScoreModalProps) {
    const { players, teams } = useTripStore();
    const { trigger } = useHaptic();
    const [currentHole, setCurrentHole] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Mutex to prevent race conditions with rapid scoring
    const scoringLock = useRef<Promise<void> | null>(null);

    // Get match data
    const match = useLiveQuery(
        () => db.matches.get(matchId),
        [matchId],
        null
    );

    // Get hole results
    const holeResults = useLiveQuery(
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

    // Calculate match state
    const matchState: MatchState | null = match && holeResults
        ? calculateMatchState(match, holeResults)
        : null;

    // Auto-set current hole to next unplayed
    useEffect(() => {
        if (holeResults && holeResults.length > 0) {
            const playedHoles = holeResults.map(r => r.holeNumber);
            const nextHole = Math.max(...playedHoles) + 1;
            if (nextHole <= 18) {
                setCurrentHole(nextHole);
            }
        }
    }, [holeResults]);

    // Get team players
    const getTeamPlayers = (playerIds: string[]) => {
        return playerIds
            .map(id => players.find(p => p.id === id))
            .filter(Boolean) as Player[];
    };

    const teamAPlayers = match ? getTeamPlayers(match.teamAPlayerIds) : [];
    const teamBPlayers = match ? getTeamPlayers(match.teamBPlayerIds) : [];

    // Get team names
    const teamA = teams.find(t => t.color === 'usa');
    const teamB = teams.find(t => t.color === 'europe');
    const teamAName = teamA?.name || 'Team A';
    const teamBName = teamB?.name || 'Team B';

    // Get result for current hole
    const currentResult = holeResults.find(r => r.holeNumber === currentHole);

    // Handle score entry - uses scoring engine for consistency
    const handleScore = async (winner: HoleWinner) => {
        if (!match || isSubmitting) return;

        // Wait for any in-progress scoring to complete (prevents race conditions)
        if (scoringLock.current) {
            await scoringLock.current;
        }

        setIsSubmitting(true);
        setError(null);
        trigger('medium');

        const scoreOperation = async () => {
            try {
                // Check if session is locked before scoring
                const session = await db.sessions.get(match.sessionId);
                if (session?.isLocked) {
                    throw new Error('Session is finalized. Unlock to make changes.');
                }

                // Use the scoring engine for proper event sourcing and atomic writes
                await recordHoleResult(
                    match.id,
                    currentHole,
                    winner,
                    undefined, // teamAScore - not needed for match play winner
                    undefined  // teamBScore - not needed for match play winner
                );

                // Show success feedback
                setShowSuccess(true);
                trigger('success');

                // Auto-advance to next hole after brief delay
                setTimeout(() => {
                    setShowSuccess(false);
                    if (currentHole < 18) {
                        setCurrentHole(prev => prev + 1);
                    }
                }, 600);

            } catch (err) {
                scoringLogger.error('Failed to save score:', err);
                setError(err instanceof Error ? err.message : 'Failed to save score');
                trigger('error');
            } finally {
                setIsSubmitting(false);
            }
        };

        // Set the lock and execute
        scoringLock.current = scoreOperation();
        await scoringLock.current;
        scoringLock.current = null;
    };

    // Format player names
    const formatNames = (playerList: Player[]) => {
        if (playerList.length === 0) return 'TBD';
        return playerList.map(p => p.lastName).join(' / ');
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/60 z-50"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ y: '100%' }}
                        animate={{ y: 0 }}
                        exit={{ y: '100%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="fixed bottom-0 left-0 right-0 z-50 bg-background rounded-t-3xl shadow-2xl"
                        style={{ maxHeight: '85vh' }}
                    >
                        {/* Handle */}
                        <div className="flex justify-center pt-3 pb-2">
                            <div className="w-10 h-1 rounded-full bg-muted" />
                        </div>

                        {/* Header */}
                        <div className="px-5 pb-4 flex items-center justify-between border-b border-border">
                            <div>
                                <h2 className="text-xl font-bold">Quick Score</h2>
                                <p className="text-base text-muted-foreground font-medium">
                                    {matchState?.displayScore || 'All Square'}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-3 -mr-2 rounded-full hover:bg-muted transition-colors active:scale-90"
                                aria-label="Close modal"
                            >
                                <X size={24} strokeWidth={2} />
                            </button>
                        </div>

                        {match === null && (
                            <div className="px-5 py-10 text-center">
                                <p className="text-sm text-muted-foreground">Loading match…</p>
                            </div>
                        )}

                        {match === undefined && (
                            <div className="px-5 py-10 text-center">
                                <div className="mx-auto mb-3 h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                                    <AlertCircle size={20} className="text-muted-foreground" />
                                </div>
                                <p className="text-sm text-muted-foreground">This match isn’t available yet.</p>
                                <button
                                    onClick={onClose}
                                    className="mt-4 inline-flex items-center justify-center rounded-xl bg-muted px-4 py-2 text-sm font-medium hover:bg-muted/80"
                                >
                                    Close
                                </button>
                            </div>
                        )}

                        {match && (
                            <>
                                {/* Error Message */}
                                {error && (
                            <div className="mx-5 mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3">
                                <AlertCircle size={20} className="text-red-500 shrink-0" />
                                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                                <button
                                    onClick={() => setError(null)}
                                    className="ml-auto p-1 hover:bg-red-500/10 rounded-full"
                                    aria-label="Dismiss error"
                                >
                                    <X size={16} className="text-red-500" />
                                </button>
                            </div>
                        )}

                        {/* Hole Navigator */}
                        <div className="px-5 py-5 flex items-center justify-center gap-6">
                            <button
                                onClick={() => setCurrentHole(prev => Math.max(1, prev - 1))}
                                disabled={currentHole === 1}
                                className="p-3 rounded-full hover:bg-muted disabled:opacity-30 transition-all active:scale-90"
                                aria-label="Previous hole"
                            >
                                <ChevronLeft size={28} strokeWidth={2} />
                            </button>

                            <div className="text-center min-w-20">
                                <div className="text-5xl font-bold" style={{ fontFamily: 'var(--font-display)' }}>
                                    {currentHole}
                                </div>
                                <div className="text-sm text-muted-foreground font-medium mt-1">Hole</div>
                            </div>

                            <button
                                onClick={() => setCurrentHole(prev => Math.min(18, prev + 1))}
                                disabled={currentHole === 18}
                                className="p-3 rounded-full hover:bg-muted disabled:opacity-30 transition-all active:scale-90"
                                aria-label="Next hole"
                            >
                                <ChevronRight size={28} strokeWidth={2} />
                            </button>
                        </div>

                        {/* Current Result Indicator */}
                        {currentResult && (
                            <div className="px-4 pb-2 text-center">
                                <span className="text-sm px-3 py-1 rounded-full bg-muted text-muted-foreground">
                                    {currentResult.winner === 'teamA' ? `${teamAName} won` :
                                        currentResult.winner === 'teamB' ? `${teamBName} won` : 'Halved'}
                                </span>
                            </div>
                        )}

                        {/* Score Buttons */}
                        <div className="px-5 py-6 space-y-4">
                            {/* Team A Wins */}
                            <button
                                onClick={() => handleScore('teamA')}
                                disabled={isSubmitting}
                                className={`w-full py-6 px-5 rounded-2xl flex items-center justify-between transition-all active:scale-[0.97] disabled:opacity-50 ${currentResult?.winner === 'teamA'
                                    ? 'ring-2 ring-offset-2 ring-(--team-usa)'
                                    : ''
                                    }`}
                                style={{
                                    background: 'var(--team-usa-light)',
                                    borderLeft: '5px solid var(--team-usa)',
                                }}
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        className="w-12 h-12 rounded-full flex items-center justify-center"
                                        style={{ background: 'var(--team-usa)' }}
                                    >
                                        <Trophy size={22} className="text-white" />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-lg font-bold">{teamAName} Wins</div>
                                        <div className="text-sm text-muted-foreground font-medium">
                                            {formatNames(teamAPlayers)}
                                        </div>
                                    </div>
                                </div>
                                {currentResult?.winner === 'teamA' && (
                                    <Check size={28} style={{ color: 'var(--team-usa)' }} />
                                )}
                            </button>

                            {/* Halved */}
                            <button
                                onClick={() => handleScore('halved')}
                                disabled={isSubmitting}
                                className={`w-full py-6 px-5 rounded-2xl flex items-center justify-between transition-all active:scale-[0.97] disabled:opacity-50 ${currentResult?.winner === 'halved'
                                    ? 'ring-2 ring-offset-2 ring-muted-foreground'
                                    : ''
                                    }`}
                                style={{
                                    background: 'var(--canvas-sunken)',
                                    borderLeft: '5px solid var(--rule-strong)',
                                }}
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        className="w-12 h-12 rounded-full flex items-center justify-center bg-muted"
                                    >
                                        <Minus size={22} className="text-muted-foreground" />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-lg font-bold">Halved</div>
                                        <div className="text-sm text-muted-foreground font-medium">
                                            Both teams tied
                                        </div>
                                    </div>
                                </div>
                                {currentResult?.winner === 'halved' && (
                                    <Check size={28} className="text-muted-foreground" />
                                )}
                            </button>

                            {/* Team B Wins */}
                            <button
                                onClick={() => handleScore('teamB')}
                                disabled={isSubmitting}
                                className={`w-full py-6 px-5 rounded-2xl flex items-center justify-between transition-all active:scale-[0.97] disabled:opacity-50 ${currentResult?.winner === 'teamB'
                                    ? 'ring-2 ring-offset-2 ring-(--team-europe)'
                                    : ''
                                    }`}
                                style={{
                                    background: 'var(--team-europe-light)',
                                    borderLeft: '5px solid var(--team-europe)',
                                }}
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        className="w-12 h-12 rounded-full flex items-center justify-center"
                                        style={{ background: 'var(--team-europe)' }}
                                    >
                                        <Trophy size={22} className="text-white" />
                                    </div>
                                    <div className="text-left">
                                        <div className="text-lg font-bold">{teamBName} Wins</div>
                                        <div className="text-sm text-muted-foreground font-medium">
                                            {formatNames(teamBPlayers)}
                                        </div>
                                    </div>
                                </div>
                                {currentResult?.winner === 'teamB' && (
                                    <Check size={28} style={{ color: 'var(--team-europe)' }} />
                                )}
                            </button>
                        </div>

                        {/* Success Overlay */}
                        <AnimatePresence>
                            {showSuccess && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="absolute inset-0 flex items-center justify-center bg-background/90 rounded-t-3xl"
                                >
                                    <div className="flex flex-col items-center gap-3">
                                        <div
                                            className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg"
                                            style={{ background: 'var(--masters)' }}
                                        >
                                            <Check size={40} className="text-white" strokeWidth={3} />
                                        </div>
                                        <span className="text-xl font-bold">Saved!</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                            </>
                        )}

                        {/* Bottom safe area */}
                        <div className="h-8" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
