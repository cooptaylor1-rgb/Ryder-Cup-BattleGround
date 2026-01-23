/**
 * SwipeScorePanel — Phase 1.2: Gesture-Based Scoring
 *
 * World-class swipe-to-score interface for the fastest golf scoring experience.
 * Designed for outdoor use with large gesture zones and visual feedback.
 *
 * Gestures:
 * - Swipe LEFT  → Team A wins hole
 * - Swipe RIGHT → Team B wins hole
 * - Swipe UP    → Hole halved
 * - TAP center  → Opens hole options
 *
 * Features:
 * - Real-time visual feedback during swipe
 * - Velocity-based gesture recognition
 * - Haptic feedback at threshold
 * - Animated score confirmation
 * - Accessibility: tap fallback for all actions
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence, PanInfo } from 'framer-motion';
import { Check, Minus, ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import type { HoleWinner } from '@/lib/types/models';
import { useHaptic } from '@/lib/hooks';

interface SwipeScorePanelProps {
    /** Current hole number (1-18) */
    holeNumber: number;
    /** Team A display name */
    teamAName: string;
    /** Team B display name */
    teamBName: string;
    /** Team A color */
    teamAColor?: string;
    /** Team B color */
    teamBColor?: string;
    /** Current match score from Team A perspective */
    currentScore: number;
    /** Whether a score already exists for this hole */
    existingResult?: HoleWinner;
    /** Callback when score is submitted */
    onScore: (winner: HoleWinner) => void;
    /** Whether scoring is disabled (saving, locked, etc.) */
    disabled?: boolean;
    /** Optional class name */
    className?: string;
}

// Gesture thresholds
const SWIPE_THRESHOLD = 80; // px to trigger score
const VELOCITY_THRESHOLD = 300; // px/s for quick swipes
const VERTICAL_THRESHOLD = 60; // px for halved gesture

export function SwipeScorePanel({
    holeNumber,
    teamAName,
    teamBName,
    teamAColor = '#0047AB',
    teamBColor = '#8B0000',
    currentScore,
    existingResult,
    onScore,
    disabled = false,
    className = '',
}: SwipeScorePanelProps) {
    const haptic = useHaptic();
    const containerRef = useRef<HTMLDivElement>(null);

    // Motion values for gesture tracking
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    // State for gesture feedback
    const [gestureState, setGestureState] = useState<'idle' | 'teamA' | 'teamB' | 'halved'>('idle');
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [confirmedResult, setConfirmedResult] = useState<HoleWinner | null>(null);
    const [hasTriggeredHaptic, setHasTriggeredHaptic] = useState(false);

    // Transform motion values for visual feedback
    const teamAOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
    const teamBOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
    const halvedOpacity = useTransform(y, [-VERTICAL_THRESHOLD, 0], [1, 0]);

    const backgroundGradient = useTransform(
        x,
        [-SWIPE_THRESHOLD * 1.5, 0, SWIPE_THRESHOLD * 1.5],
        [
            `linear-gradient(90deg, ${teamAColor}40 0%, transparent 50%)`,
            'transparent',
            `linear-gradient(90deg, transparent 50%, ${teamBColor}40 100%)`,
        ]
    );

    // Scale transform for the center orb
    const orbScale = useTransform(
        [x, y],
        ([latestX, latestY]: number[]) => {
            const distance = Math.sqrt(latestX ** 2 + latestY ** 2);
            return Math.max(0.85, 1 - distance / 300);
        }
    );

    // Reset haptic trigger on gesture end
    const resetHapticTrigger = useCallback(() => {
        setHasTriggeredHaptic(false);
    }, []);

    // Handle gesture updates for haptic feedback
    useEffect(() => {
        const unsubscribeX = x.on('change', (latestX: number) => {
            if (disabled) return;

            const absX = Math.abs(latestX);
            const absY = Math.abs(y.get());

            // Determine gesture direction
            if (absX > SWIPE_THRESHOLD * 0.7 && absX > absY) {
                const newState = latestX < 0 ? 'teamA' : 'teamB';
                if (gestureState !== newState) {
                    setGestureState(newState);
                    if (!hasTriggeredHaptic) {
                        haptic.select();
                        setHasTriggeredHaptic(true);
                    }
                }
            } else if (absY > VERTICAL_THRESHOLD * 0.7 && absY > absX && y.get() < 0) {
                if (gestureState !== 'halved') {
                    setGestureState('halved');
                    if (!hasTriggeredHaptic) {
                        haptic.select();
                        setHasTriggeredHaptic(true);
                    }
                }
            } else if (absX < SWIPE_THRESHOLD * 0.3 && absY < VERTICAL_THRESHOLD * 0.3) {
                setGestureState('idle');
                resetHapticTrigger();
            }
        });

        return () => unsubscribeX();
    }, [x, y, gestureState, haptic, hasTriggeredHaptic, disabled, resetHapticTrigger]);

    // Handle pan gesture end
    const handlePanEnd = useCallback((_: never, info: PanInfo) => {
        if (disabled) return;

        const { offset, velocity } = info;
        let result: HoleWinner | null = null;

        // Check for valid swipe based on distance OR velocity
        const isHorizontalSwipe = Math.abs(offset.x) > Math.abs(offset.y);
        const isVerticalSwipe = !isHorizontalSwipe && offset.y < 0;

        if (isHorizontalSwipe) {
            if (offset.x < -SWIPE_THRESHOLD || velocity.x < -VELOCITY_THRESHOLD) {
                result = 'teamA';
            } else if (offset.x > SWIPE_THRESHOLD || velocity.x > VELOCITY_THRESHOLD) {
                result = 'teamB';
            }
        } else if (isVerticalSwipe) {
            if (offset.y < -VERTICAL_THRESHOLD || velocity.y < -VELOCITY_THRESHOLD) {
                result = 'halved';
            }
        }

        if (result) {
            // Trigger score
            haptic.scorePoint();
            setConfirmedResult(result);
            setShowConfirmation(true);

            // Call onScore after brief delay for visual feedback
            setTimeout(() => {
                onScore(result!);
                setShowConfirmation(false);
                setConfirmedResult(null);
            }, 600);
        }

        // Reset gesture state
        setGestureState('idle');
        resetHapticTrigger();
    }, [disabled, haptic, onScore, resetHapticTrigger]);

    // Tap handlers for accessibility
    const handleTapTeamA = useCallback(() => {
        if (disabled) return;
        haptic.scorePoint();
        onScore('teamA');
    }, [disabled, haptic, onScore]);

    const handleTapTeamB = useCallback(() => {
        if (disabled) return;
        haptic.scorePoint();
        onScore('teamB');
    }, [disabled, haptic, onScore]);

    const handleTapHalved = useCallback(() => {
        if (disabled) return;
        haptic.tap();
        onScore('halved');
    }, [disabled, haptic, onScore]);

    // Get score display
    const getScoreDisplay = () => {
        if (currentScore === 0) return 'AS';
        const abs = Math.abs(currentScore);
        const leader = currentScore > 0 ? teamAName : teamBName;
        return `${leader} ${abs}UP`;
    };

    return (
        <div
            ref={containerRef}
            className={`relative w-full aspect-[4/3] max-h-[400px] rounded-3xl overflow-hidden ${className}`}
            style={{
                background: 'var(--surface)',
                touchAction: 'none',
            }}
        >
            {/* Background gradient based on gesture */}
            <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{ background: backgroundGradient }}
            />

            {/* Team A zone indicator (left) */}
            <motion.div
                className="absolute left-0 top-0 bottom-0 w-24 flex items-center justify-center pointer-events-none"
                style={{ opacity: teamAOpacity }}
            >
                <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: teamAColor }}
                >
                    <ChevronLeft className="w-8 h-8 text-white" />
                </div>
            </motion.div>

            {/* Team B zone indicator (right) */}
            <motion.div
                className="absolute right-0 top-0 bottom-0 w-24 flex items-center justify-center pointer-events-none"
                style={{ opacity: teamBOpacity }}
            >
                <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center"
                    style={{ background: teamBColor }}
                >
                    <ChevronRight className="w-8 h-8 text-white" />
                </div>
            </motion.div>

            {/* Halved zone indicator (top) */}
            <motion.div
                className="absolute top-0 left-0 right-0 h-20 flex items-center justify-center pointer-events-none"
                style={{ opacity: halvedOpacity }}
            >
                <div className="px-6 py-3 rounded-2xl bg-gray-600 flex items-center gap-2">
                    <Minus className="w-5 h-5 text-white" />
                    <span className="text-white font-semibold">Halved</span>
                </div>
            </motion.div>

            {/* Center draggable orb */}
            <div className="absolute inset-0 flex items-center justify-center">
                <motion.div
                    drag={!disabled}
                    dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                    dragElastic={0.5}
                    onPanEnd={handlePanEnd}
                    style={{ x, y, scale: orbScale }}
                    className="relative cursor-grab active:cursor-grabbing"
                >
                    {/* Outer glow ring */}
                    <div
                        className={`absolute -inset-4 rounded-full transition-all duration-200 ${gestureState !== 'idle' ? 'opacity-100' : 'opacity-0'
                            }`}
                        style={{
                            background: gestureState === 'teamA'
                                ? `${teamAColor}30`
                                : gestureState === 'teamB'
                                    ? `${teamBColor}30`
                                    : gestureState === 'halved'
                                        ? 'rgba(100, 100, 100, 0.3)'
                                        : 'transparent',
                            boxShadow: gestureState !== 'idle'
                                ? `0 0 40px ${gestureState === 'teamA' ? teamAColor
                                    : gestureState === 'teamB' ? teamBColor
                                        : '#666'
                                }40`
                                : 'none',
                        }}
                    />

                    {/* Main orb */}
                    <div
                        className={`
              relative w-32 h-32 rounded-full flex flex-col items-center justify-center
              shadow-2xl transition-colors duration-200
              ${disabled ? 'opacity-50' : ''}
            `}
                        style={{
                            background: gestureState === 'teamA'
                                ? teamAColor
                                : gestureState === 'teamB'
                                    ? teamBColor
                                    : gestureState === 'halved'
                                        ? '#666'
                                        : 'var(--masters)',
                        }}
                    >
                        <span className="text-2xl font-bold text-white">
                            {holeNumber}
                        </span>
                        <span className="text-xs text-white/80 uppercase tracking-wider">
                            Hole
                        </span>
                    </div>

                    {/* Gesture hints */}
                    {gestureState === 'idle' && !disabled && (
                        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                Swipe to score
                            </span>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Confirmation overlay */}
            <AnimatePresence>
                {showConfirmation && confirmedResult && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                    >
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                            className="w-24 h-24 rounded-full flex items-center justify-center"
                            style={{
                                background: confirmedResult === 'teamA'
                                    ? teamAColor
                                    : confirmedResult === 'teamB'
                                        ? teamBColor
                                        : '#666',
                            }}
                        >
                            {confirmedResult === 'halved' ? (
                                <Minus className="w-12 h-12 text-white" />
                            ) : (
                                <Trophy className="w-12 h-12 text-white" />
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Tap buttons for accessibility (hidden but functional) */}
            <div className="absolute bottom-4 left-4 right-4 flex justify-between">
                <button
                    onClick={handleTapTeamA}
                    disabled={disabled}
                    className="px-4 py-2 rounded-xl text-sm font-medium opacity-60 hover:opacity-100 transition-opacity"
                    style={{ background: `${teamAColor}20`, color: teamAColor }}
                    aria-label={`${teamAName} wins hole`}
                >
                    {teamAName}
                </button>

                <button
                    onClick={handleTapHalved}
                    disabled={disabled}
                    className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-200 dark:bg-gray-700 opacity-60 hover:opacity-100 transition-opacity"
                    aria-label="Hole halved"
                >
                    Halved
                </button>

                <button
                    onClick={handleTapTeamB}
                    disabled={disabled}
                    className="px-4 py-2 rounded-xl text-sm font-medium opacity-60 hover:opacity-100 transition-opacity"
                    style={{ background: `${teamBColor}20`, color: teamBColor }}
                    aria-label={`${teamBName} wins hole`}
                >
                    {teamBName}
                </button>
            </div>

            {/* Current score display */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2">
                <div className="px-4 py-1.5 rounded-full bg-black/20 dark:bg-white/10 backdrop-blur-sm">
                    <span className="text-sm font-semibold" style={{ color: 'var(--ink-primary)' }}>
                        {getScoreDisplay()}
                    </span>
                </div>
            </div>

            {/* Existing result indicator */}
            {existingResult && existingResult !== 'none' && (
                <div className="absolute top-4 right-4">
                    <div
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{
                            background: existingResult === 'teamA'
                                ? teamAColor
                                : existingResult === 'teamB'
                                    ? teamBColor
                                    : '#666',
                        }}
                    >
                        <Check className="w-4 h-4 text-white" />
                    </div>
                </div>
            )}
        </div>
    );
}
