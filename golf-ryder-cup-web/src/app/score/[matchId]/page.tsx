/**
 * Enhanced Match Scoring Page — Phase 1: Core Flow Excellence
 *
 * World-class scoring experience with:
 * - Swipe-to-score gestures (SwipeScorePanel)
 * - Visual hole mini-map (HoleMiniMap)
 * - Score celebrations (ScoreCelebration)
 * - Voice scoring integration
 * - Premium haptic feedback
 * - Side bet reminders
 * - Weather alerts
 * - Quick photo capture
 * - Stroke alert banners
 *
 * Sacred action surface: Fast, legible, stress-free.
 */

'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useScoringStore, useTripStore, useUIStore } from '@/lib/stores';
import { useMatchState, useHaptic } from '@/lib/hooks';
import { formatPlayerName } from '@/lib/utils';
import {
    Undo2,
    ChevronLeft,
    ChevronRight,
    AlertCircle,
    Mic,
    Camera,
    Trophy,
    X,
    Flag,
} from 'lucide-react';
import type { HoleWinner } from '@/lib/types/models';
import {
    SwipeScorePanel,
    HoleMiniMap,
    ScoreCelebration,
    ScoreToast,
    HandicapStrokeIndicator,
    StrokeAlertBanner,
    PressTracker,
    type Press,
} from '@/components/scoring';
import {
    StickyUndoBanner,
    VoiceScoring,
    QuickPhotoCapture,
    SideBetReminder,
    WeatherAlerts,
    type UndoAction,
} from '@/components/live-play';

// Demo side bets for testing - in production these come from the bets store
const DEMO_SIDE_BETS = [
    {
        id: 'ctp-7',
        type: 'ctp' as const,
        name: 'Closest to Pin #7',
        holes: [7],
        buyIn: 5,
        pot: 40,
        participants: [],
        status: 'active' as const,
    },
    {
        id: 'long-12',
        type: 'long_drive' as const,
        name: 'Long Drive #12',
        holes: [12],
        buyIn: 5,
        pot: 40,
        participants: [],
        status: 'active' as const,
    },
];

/**
 * Enhanced Match Scoring Page
 *
 * Sacred action surface redesigned for Phase 1 excellence.
 */
export default function EnhancedMatchScoringPage() {
    const router = useRouter();
    const params = useParams();
    const matchId = params.matchId as string;

    const { players, teams, teeSets } = useTripStore();
    const { showToast, scoringPreferences } = useUIStore();
    const haptic = useHaptic();

    const {
        activeMatch,
        activeMatchState,
        currentHole,
        isSaving,
        undoStack,
        selectMatch,
        scoreHole,
        undoLastHole,
        goToHole,
        nextHole,
        prevHole,
    } = useScoringStore();

    // UI State
    const [showVoiceModal, setShowVoiceModal] = useState(false);
    const [undoAction, setUndoAction] = useState<UndoAction | null>(null);
    const [presses, setPresses] = useState<Press[]>([]);
    const [showHandicapDetails, setShowHandicapDetails] = useState(false);
    const [scoringMode, setScoringMode] = useState<'swipe' | 'buttons'>('swipe');

    // Celebration state
    const [celebration, setCelebration] = useState<{
        type: 'holeWon' | 'holeLost' | 'holeHalved' | 'matchWon' | 'matchHalved';
        winner?: HoleWinner;
        teamName?: string;
        teamColor?: string;
        holeNumber?: number;
        finalScore?: string;
    } | null>(null);

    // Toast state
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' } | null>(null);

    // Live match state (reactive updates)
    const liveMatchState = useMatchState(matchId);
    const matchState = liveMatchState || activeMatchState;

    // Get tee set for handicap info
    const currentTeeSet = activeMatch?.teeSetId
        ? teeSets.find(t => t.id === activeMatch.teeSetId)
        : teeSets[0];

    const holeHandicaps = currentTeeSet?.holeHandicaps || [
        7, 11, 3, 13, 9, 1, 15, 5, 17, 8, 16, 10, 4, 12, 6, 18, 2, 14
    ];

    // Load match on mount
    useEffect(() => {
        if (matchId && (!activeMatch || activeMatch.id !== matchId)) {
            selectMatch(matchId);
        }
    }, [matchId, activeMatch, selectMatch]);

    // Team data
    const teamA = teams.find(t => t.color === 'usa');
    const teamB = teams.find(t => t.color === 'europe');
    const teamAName = teamA?.name || 'USA';
    const teamBName = teamB?.name || 'Europe';
    const teamAColor = '#0047AB';
    const teamBColor = '#8B0000';

    const teamAPlayers = useMemo(() => {
        if (!activeMatch) return [];
        return activeMatch.teamAPlayerIds
            .map(id => players.find(p => p.id === id))
            .filter(Boolean);
    }, [activeMatch, players]);

    const teamBPlayers = useMemo(() => {
        if (!activeMatch) return [];
        return activeMatch.teamBPlayerIds
            .map(id => players.find(p => p.id === id))
            .filter(Boolean);
    }, [activeMatch, players]);

    const currentHoleResult = useMemo(() => {
        if (!matchState) return null;
        return matchState.holeResults.find(r => r.holeNumber === currentHole);
    }, [matchState, currentHole]);

    // Score handler with celebrations
    const handleScore = useCallback(async (winner: HoleWinner) => {
        if (isSaving || !matchState) return;

        // Check for match closeout
        const wouldCloseOut =
            Math.abs(matchState.currentScore + (winner === 'teamA' ? 1 : winner === 'teamB' ? -1 : 0))
            > (matchState.holesRemaining - 1);

        if (scoringPreferences.confirmCloseout && wouldCloseOut && winner !== 'halved') {
            const winningTeam = winner === 'teamA' ? teamAName : teamBName;
            if (!confirm(`This will end the match with ${winningTeam} winning. Continue?`)) {
                return;
            }
        }

        // Score the hole
        haptic.scorePoint();
        await scoreHole(winner);

        // Show celebration
        if (wouldCloseOut && winner !== 'halved') {
            setCelebration({
                type: 'matchWon',
                winner,
                teamName: winner === 'teamA' ? teamAName : teamBName,
                teamColor: winner === 'teamA' ? teamAColor : teamBColor,
                finalScore: matchState.displayScore,
            });
        } else if (winner === 'halved') {
            setCelebration({
                type: 'holeHalved',
                holeNumber: currentHole,
            });
        } else {
            // Show brief toast instead of full celebration for normal holes
            setToast({
                message: `Hole ${currentHole}: ${winner === 'teamA' ? teamAName : teamBName} wins`,
                type: 'success',
            });
        }

        // Show undo banner
        setUndoAction({
            id: crypto.randomUUID(),
            type: 'score',
            description: `Hole ${currentHole} scored`,
            metadata: {
                holeNumber: currentHole,
                result: winner === 'none' ? undefined : winner,
                teamAName,
                teamBName,
            },
            timestamp: Date.now(),
            onUndo: handleUndo,
        });
    }, [isSaving, matchState, scoringPreferences.confirmCloseout, teamAName, teamBName, haptic, scoreHole, currentHole]);

    // Undo handler
    const handleUndo = useCallback(async () => {
        if (undoStack.length === 0) return;
        haptic.warning();
        await undoLastHole();
        setUndoAction(null);
        setToast({ message: 'Score undone', type: 'info' });
    }, [undoStack.length, haptic, undoLastHole]);

    // Voice score handler
    const handleVoiceScore = useCallback((winner: HoleWinner) => {
        setShowVoiceModal(false);
        handleScore(winner);
    }, [handleScore]);

    // Photo capture handler
    const handlePhotoCapture = useCallback((photo: { id: string }) => {
        showToast('success', 'Photo saved to gallery');
    }, [showToast]);

    // Press handler
    const handlePress = useCallback((pressedBy: 'teamA' | 'teamB') => {
        if (!matchState) return;

        const newPress: Press = {
            id: `press-${Date.now()}`,
            startHole: currentHole,
            pressedBy,
            status: 'active',
            score: 0,
        };

        setPresses(prev => [...prev, newPress]);
        haptic.tap();
        setToast({
            message: `${pressedBy === 'teamA' ? teamAName : teamBName} pressed!`,
            type: 'info',
        });
    }, [currentHole, matchState, haptic, teamAName, teamBName]);

    // Update press scores
    useEffect(() => {
        if (!matchState) return;

        setPresses(prev => prev.map(press => {
            if (press.status !== 'active') return press;

            const pressHoleResults = matchState.holeResults.filter(
                r => r.holeNumber >= press.startHole
            );

            let score = 0;
            for (const result of pressHoleResults) {
                if (result.winner === 'teamA') score += 1;
                else if (result.winner === 'teamB') score -= 1;
            }

            const holesRemaining = 18 - matchState.holesPlayed;
            const isClosedOut = Math.abs(score) > holesRemaining;

            if (isClosedOut || matchState.isClosedOut) {
                return {
                    ...press,
                    score,
                    status: 'closed' as const,
                    result: score > 0 ? 'teamA' : score < 0 ? 'teamB' : 'halved',
                    closedAtHole: matchState.holesPlayed,
                };
            }

            return { ...press, score };
        }));
    }, [matchState]);

    // Loading state
    if (!activeMatch || !matchState) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--canvas)' }}>
                <div className="text-center">
                    <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin mx-auto mb-3" style={{ borderColor: 'var(--masters)', borderTopColor: 'transparent' }} />
                    <p className="type-meta">Loading match...</p>
                </div>
            </div>
        );
    }

    const isMatchComplete = matchState.isClosedOut || matchState.holesRemaining === 0;

    return (
        <div className="min-h-screen pb-nav" style={{ background: 'var(--canvas)' }}>
            {/* Celebration Overlay */}
            <AnimatePresence>
                {celebration && (
                    <ScoreCelebration
                        type={celebration.type}
                        winner={celebration.winner}
                        teamName={celebration.teamName}
                        teamColor={celebration.teamColor}
                        holeNumber={celebration.holeNumber}
                        finalScore={celebration.finalScore}
                        show={true}
                        onComplete={() => setCelebration(null)}
                        duration={celebration.type === 'matchWon' ? 3500 : 1500}
                    />
                )}
            </AnimatePresence>

            {/* Toast */}
            <AnimatePresence>
                {toast && (
                    <ScoreToast
                        message={toast.message}
                        type={toast.type}
                        show={true}
                        onComplete={() => setToast(null)}
                    />
                )}
            </AnimatePresence>

            {/* Sticky Undo Banner */}
            <StickyUndoBanner
                action={undoAction}
                duration={5000}
                bottomOffset={80}
                onDismiss={() => setUndoAction(null)}
            />

            {/* Voice Scoring Modal */}
            <AnimatePresence>
                {showVoiceModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="w-full max-w-sm mx-4 p-6 rounded-2xl"
                            style={{ background: 'var(--canvas)' }}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-semibold">Voice Score</h3>
                                <button
                                    onClick={() => setShowVoiceModal(false)}
                                    className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <VoiceScoring
                                teamAName={teamAName}
                                teamBName={teamBName}
                                currentHole={currentHole}
                                onScoreConfirmed={handleVoiceScore}
                                floating={false}
                            />
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Stroke Alert Banner */}
            {!isMatchComplete && (activeMatch.teamAHandicapAllowance > 0 || activeMatch.teamBHandicapAllowance > 0) && (
                <StrokeAlertBanner
                    currentHole={currentHole}
                    teamAStrokes={activeMatch.teamAHandicapAllowance}
                    teamBStrokes={activeMatch.teamBHandicapAllowance}
                    holeHandicaps={holeHandicaps}
                    teamAName={teamAName}
                    teamBName={teamBName}
                    autoDismissMs={5000}
                    onAlertShown={(hole, aStrokes, bStrokes) => {
                        if (aStrokes > 0 || bStrokes > 0) {
                            haptic.tap();
                        }
                    }}
                    position="top"
                />
            )}

            {/* Header */}
            <header className="sticky top-0 z-30 backdrop-blur-lg border-b" style={{ background: 'rgba(var(--canvas-rgb), 0.9)', borderColor: 'var(--rule)' }}>
                <div className="container-editorial py-3">
                    <div className="flex items-center justify-between">
                        {/* Back + Title */}
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => router.push('/score')}
                                className="p-2 -ml-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                aria-label="Back"
                            >
                                <ChevronLeft size={20} style={{ color: 'var(--ink-secondary)' }} />
                            </button>
                            <div>
                                <p className="type-overline" style={{ color: 'var(--masters)' }}>
                                    Match {activeMatch.matchOrder}
                                </p>
                                <p className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
                                    {teamAPlayers.map(p => formatPlayerName(p!.firstName, p!.lastName, 'short')).join(' & ')} vs {teamBPlayers.map(p => formatPlayerName(p!.firstName, p!.lastName, 'short')).join(' & ')}
                                </p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1">
                            {/* Photo */}
                            <button
                                onClick={() => { }}
                                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                aria-label="Photo capture"
                            >
                                <Camera size={18} style={{ color: 'var(--ink-secondary)' }} />
                            </button>

                            {/* Voice */}
                            <button
                                onClick={() => setShowVoiceModal(true)}
                                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                                aria-label="Voice scoring"
                            >
                                <Mic size={18} style={{ color: 'var(--ink-secondary)' }} />
                            </button>

                            {/* Undo */}
                            <button
                                onClick={handleUndo}
                                disabled={undoStack.length === 0}
                                className="flex items-center gap-1 px-3 py-1.5 rounded-xl transition-colors"
                                style={{
                                    color: undoStack.length > 0 ? 'var(--masters)' : 'var(--ink-tertiary)',
                                    opacity: undoStack.length === 0 ? 0.5 : 1,
                                    background: undoStack.length > 0 ? 'rgba(0, 103, 71, 0.1)' : 'transparent',
                                }}
                            >
                                <Undo2 size={14} />
                                <span className="text-xs font-medium">Undo</span>
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container-editorial">
                {/* Score Hero */}
                <section className="py-6 text-center">
                    <div className="flex items-center justify-center gap-6">
                        {/* Team A */}
                        <div className="flex-1 text-right">
                            <p
                                className="text-sm font-semibold uppercase tracking-wide"
                                style={{ color: teamAColor }}
                            >
                                {teamAName}
                            </p>
                            <p className="text-xs mt-1" style={{ color: 'var(--ink-tertiary)' }}>
                                {matchState.teamAHolesWon} holes
                            </p>
                        </div>

                        {/* Score Display */}
                        <motion.div
                            key={matchState.displayScore}
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="text-center"
                        >
                            <p
                                className="text-4xl font-bold"
                                style={{
                                    color: matchState.currentScore > 0 ? teamAColor :
                                        matchState.currentScore < 0 ? teamBColor : 'var(--ink-tertiary)'
                                }}
                            >
                                {matchState.displayScore}
                            </p>
                            <p className="text-xs mt-1" style={{ color: 'var(--ink-tertiary)' }}>
                                thru {matchState.holesPlayed}
                            </p>
                            {matchState.isDormie && (
                                <p className="text-xs mt-1 flex items-center justify-center gap-1" style={{ color: 'var(--warning)' }}>
                                    <AlertCircle size={12} />
                                    Dormie
                                </p>
                            )}
                        </motion.div>

                        {/* Team B */}
                        <div className="flex-1 text-left">
                            <p
                                className="text-sm font-semibold uppercase tracking-wide"
                                style={{ color: teamBColor }}
                            >
                                {teamBName}
                            </p>
                            <p className="text-xs mt-1" style={{ color: 'var(--ink-tertiary)' }}>
                                {matchState.teamBHolesWon} holes
                            </p>
                        </div>
                    </div>
                </section>

                {/* Hole Mini-Map */}
                <section className="mb-4">
                    <HoleMiniMap
                        currentHole={currentHole}
                        holeResults={matchState.holeResults}
                        teamAName={teamAName}
                        teamBName={teamBName}
                        teamAColor={teamAColor}
                        teamBColor={teamBColor}
                        onHoleSelect={goToHole}
                        isComplete={isMatchComplete}
                    />
                </section>

                {/* Scoring Area */}
                {!isMatchComplete ? (
                    <section className="space-y-4">
                        {/* Hole Navigation Header */}
                        <div className="flex items-center justify-between px-2">
                            <button
                                onClick={prevHole}
                                disabled={currentHole <= 1}
                                className="p-3 rounded-xl transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                                style={{ opacity: currentHole <= 1 ? 0.3 : 1 }}
                            >
                                <ChevronLeft size={24} />
                            </button>

                            <div className="text-center">
                                <p className="text-2xl font-bold">Hole {currentHole}</p>
                                {currentHoleResult && currentHoleResult.winner !== 'none' && (
                                    <p className="text-sm" style={{ color: 'var(--ink-tertiary)' }}>
                                        {currentHoleResult.winner === 'halved' ? 'Halved' :
                                            currentHoleResult.winner === 'teamA' ? `${teamAName} won` : `${teamBName} won`}
                                    </p>
                                )}
                            </div>

                            <button
                                onClick={nextHole}
                                disabled={currentHole >= 18}
                                className="p-3 rounded-xl transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                                style={{ opacity: currentHole >= 18 ? 0.3 : 1 }}
                            >
                                <ChevronRight size={24} />
                            </button>
                        </div>

                        {/* Handicap Strokes */}
                        {(activeMatch.teamAHandicapAllowance > 0 || activeMatch.teamBHandicapAllowance > 0) && (
                            <button
                                onClick={() => setShowHandicapDetails(!showHandicapDetails)}
                                className="w-full"
                            >
                                <HandicapStrokeIndicator
                                    currentHole={currentHole}
                                    teamAStrokes={activeMatch.teamAHandicapAllowance}
                                    teamBStrokes={activeMatch.teamBHandicapAllowance}
                                    holeHandicaps={holeHandicaps}
                                    teamAName={teamAName}
                                    teamBName={teamBName}
                                    showAllHoles={showHandicapDetails}
                                />
                            </button>
                        )}

                        {/* Swipe Score Panel */}
                        <AnimatePresence mode="wait">
                            {scoringMode === 'swipe' ? (
                                <motion.div
                                    key="swipe"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                >
                                    <SwipeScorePanel
                                        holeNumber={currentHole}
                                        teamAName={teamAName}
                                        teamBName={teamBName}
                                        teamAColor={teamAColor}
                                        teamBColor={teamBColor}
                                        currentScore={matchState.currentScore}
                                        existingResult={currentHoleResult?.winner}
                                        onScore={handleScore}
                                        disabled={isSaving}
                                    />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="buttons"
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -10 }}
                                    className="space-y-3"
                                >
                                    {/* Traditional Buttons */}
                                    <div className="grid grid-cols-3 gap-3">
                                        <button
                                            onClick={() => handleScore('teamA')}
                                            disabled={isSaving}
                                            className="py-4 px-4 rounded-xl font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                                            style={{
                                                background: teamAColor,
                                                opacity: isSaving ? 0.5 : 1,
                                                boxShadow: currentHoleResult?.winner === 'teamA'
                                                    ? `0 0 0 3px var(--canvas), 0 0 0 5px ${teamAColor}`
                                                    : undefined,
                                            }}
                                        >
                                            <span className="block text-lg">{teamAName}</span>
                                            <span className="block text-xs opacity-80 mt-0.5">wins hole</span>
                                        </button>

                                        <button
                                            onClick={() => handleScore('halved')}
                                            disabled={isSaving}
                                            className="py-4 px-4 rounded-xl font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                                            style={{
                                                background: 'var(--canvas-raised)',
                                                border: '2px solid var(--rule-strong)',
                                                opacity: isSaving ? 0.5 : 1,
                                                boxShadow: currentHoleResult?.winner === 'halved'
                                                    ? '0 0 0 3px var(--canvas), 0 0 0 5px var(--ink-tertiary)'
                                                    : undefined,
                                            }}
                                        >
                                            <span className="block text-lg">Halve</span>
                                            <span className="block text-xs opacity-60 mt-0.5">tie hole</span>
                                        </button>

                                        <button
                                            onClick={() => handleScore('teamB')}
                                            disabled={isSaving}
                                            className="py-4 px-4 rounded-xl font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                                            style={{
                                                background: teamBColor,
                                                opacity: isSaving ? 0.5 : 1,
                                                boxShadow: currentHoleResult?.winner === 'teamB'
                                                    ? `0 0 0 3px var(--canvas), 0 0 0 5px ${teamBColor}`
                                                    : undefined,
                                            }}
                                        >
                                            <span className="block text-lg">{teamBName}</span>
                                            <span className="block text-xs opacity-80 mt-0.5">wins hole</span>
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Press Tracker */}
                        <PressTracker
                            currentHole={currentHole}
                            mainMatchScore={matchState.currentScore}
                            holesRemaining={matchState.holesRemaining}
                            presses={presses}
                            onPress={handlePress}
                            teamAName={teamAName}
                            teamBName={teamBName}
                            betAmount={10}
                            autoPress={false}
                        />

                        {/* Side Bet Reminders */}
                        <SideBetReminder
                            currentHole={currentHole}
                            bets={DEMO_SIDE_BETS}
                            currentPlayerId={teamAPlayers[0]?.id}
                        />

                        {/* Scoring Mode Toggle */}
                        <div className="flex justify-center pt-2">
                            <div
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                                style={{ background: 'var(--canvas-sunken)' }}
                            >
                                <button
                                    onClick={() => setScoringMode('swipe')}
                                    className="px-3 py-1 rounded-full transition-all"
                                    style={{
                                        background: scoringMode === 'swipe' ? 'var(--canvas)' : 'transparent',
                                        color: scoringMode === 'swipe' ? 'var(--ink)' : 'var(--ink-tertiary)',
                                        boxShadow: scoringMode === 'swipe' ? 'var(--shadow-sm)' : 'none',
                                    }}
                                >
                                    Swipe
                                </button>
                                <button
                                    onClick={() => setScoringMode('buttons')}
                                    className="px-3 py-1 rounded-full transition-all"
                                    style={{
                                        background: scoringMode === 'buttons' ? 'var(--canvas)' : 'transparent',
                                        color: scoringMode === 'buttons' ? 'var(--ink)' : 'var(--ink-tertiary)',
                                        boxShadow: scoringMode === 'buttons' ? 'var(--shadow-sm)' : 'none',
                                    }}
                                >
                                    Buttons
                                </button>
                            </div>
                        </div>
                    </section>
                ) : (
                    /* Match Complete State */
                    <section className="py-12 text-center">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: 'spring', damping: 15 }}
                        >
                            <div
                                className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
                                style={{
                                    background: matchState.winningTeam === 'teamA' ? teamAColor
                                        : matchState.winningTeam === 'teamB' ? teamBColor
                                            : '#666'
                                }}
                            >
                                <Trophy className="w-10 h-10 text-white" />
                            </div>

                            <h2 className="text-2xl font-bold mb-2">
                                {matchState.winningTeam === 'halved'
                                    ? 'Match Halved'
                                    : `${matchState.winningTeam === 'teamA' ? teamAName : teamBName} Wins!`
                                }
                            </h2>

                            <p
                                className="text-xl font-semibold"
                                style={{
                                    color: matchState.winningTeam === 'teamA' ? teamAColor
                                        : matchState.winningTeam === 'teamB' ? teamBColor
                                            : 'var(--ink-secondary)'
                                }}
                            >
                                {matchState.displayScore}
                            </p>

                            <button
                                onClick={() => router.push('/score')}
                                className="mt-6 px-6 py-3 rounded-xl font-medium"
                                style={{ background: 'var(--masters)', color: 'white' }}
                            >
                                Back to Matches
                            </button>
                        </motion.div>
                    </section>
                )}

                {/* Weather Alerts */}
                <section className="mt-4">
                    <WeatherAlerts showWeatherBar={true} />
                </section>
            </main>

            {/* Quick Photo Capture - Fixed position */}
            {!isMatchComplete && (
                <div className="fixed bottom-24 left-4 z-40">
                    <QuickPhotoCapture
                        matchId={matchId}
                        holeNumber={currentHole}
                        teamAName={teamAName}
                        teamBName={teamBName}
                        onCapture={handlePhotoCapture}
                    />
                </div>
            )}

            {/* Voice Scoring FAB - Fixed position */}
            {!isMatchComplete && (
                <div className="fixed bottom-24 right-4 z-40">
                    <button
                        onClick={() => setShowVoiceModal(true)}
                        className="w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-transform hover:scale-105 active:scale-95"
                        style={{ background: 'var(--masters)', color: 'white' }}
                        aria-label="Voice scoring"
                    >
                        <Mic size={24} />
                    </button>
                </div>
            )}
        </div>
    );
}
