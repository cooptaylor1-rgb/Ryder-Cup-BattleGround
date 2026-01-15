/**
 * ScoreCelebration — Phase 1.5: Score Entry Animations
 *
 * Delightful animations for scoring moments. Creates memorable
 * experiences for wins, losses, halves, and match close-outs.
 *
 * Features:
 * - Confetti burst for wins
 * - Subtle pulse for halved holes
 * - Match win celebration sequence
 * - Respectful animations (not over-the-top)
 * - Respects reduced motion preferences
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Minus, Flag, Sparkles, Star } from 'lucide-react';
import type { HoleWinner } from '@/lib/types/models';

interface ScoreCelebrationProps {
    /** Type of celebration to show */
    type: 'holeWon' | 'holeLost' | 'holeHalved' | 'matchWon' | 'matchLost' | 'matchHalved';
    /** Winner of the hole/match */
    winner?: HoleWinner;
    /** Team name for context */
    teamName?: string;
    /** Team color for theming */
    teamColor?: string;
    /** Hole number (for hole celebrations) */
    holeNumber?: number;
    /** Final score (for match celebrations) */
    finalScore?: string;
    /** Duration in ms before auto-dismiss */
    duration?: number;
    /** Callback when celebration ends */
    onComplete?: () => void;
    /** Whether to show the celebration */
    show: boolean;
}

// Confetti particle type
interface Particle {
    id: number;
    x: number;
    color: string;
    size: number;
    rotation: number;
    delay: number;
}

export function ScoreCelebration({
    type,
    winner,
    teamName,
    teamColor = 'var(--masters)',
    holeNumber,
    finalScore,
    duration = 2000,
    onComplete,
    show,
}: ScoreCelebrationProps) {
    const [particles, setParticles] = useState<Particle[]>([]);
    const [isVisible, setIsVisible] = useState(false);

    // Check for reduced motion preference
    const prefersReducedMotion = typeof window !== 'undefined'
        && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    // Generate confetti particles
    const generateParticles = useCallback((count: number, color: string) => {
        const colors = [color, '#FFD700', '#fff', color + '80'];
        return Array.from({ length: count }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            color: colors[Math.floor(Math.random() * colors.length)],
            size: Math.random() * 8 + 4,
            rotation: Math.random() * 360,
            delay: Math.random() * 0.3,
        }));
    }, []);

    useEffect(() => {
        if (show) {
            setIsVisible(true);

            // Generate particles for win celebrations
            if ((type === 'holeWon' || type === 'matchWon') && !prefersReducedMotion) {
                setParticles(generateParticles(type === 'matchWon' ? 40 : 20, teamColor));
            }

            // Auto-dismiss
            const timer = setTimeout(() => {
                setIsVisible(false);
                setTimeout(() => {
                    onComplete?.();
                }, 300); // Wait for exit animation
            }, duration);

            return () => clearTimeout(timer);
        }
    }, [show, type, teamColor, duration, onComplete, generateParticles, prefersReducedMotion]);

    if (!show && !isVisible) return null;

    // Hole Won Celebration
    if (type === 'holeWon') {
        return (
            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
                    >
                        {/* Confetti */}
                        {!prefersReducedMotion && particles.map((particle) => (
                            <motion.div
                                key={particle.id}
                                initial={{
                                    y: '50vh',
                                    x: `${particle.x}vw`,
                                    opacity: 1,
                                    rotate: 0,
                                }}
                                animate={{
                                    y: '-20vh',
                                    x: `${particle.x + (Math.random() - 0.5) * 20}vw`,
                                    opacity: 0,
                                    rotate: particle.rotation,
                                }}
                                transition={{
                                    duration: 1.5,
                                    delay: particle.delay,
                                    ease: 'easeOut',
                                }}
                                className="absolute"
                                style={{
                                    width: particle.size,
                                    height: particle.size,
                                    background: particle.color,
                                    borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                                }}
                            />
                        ))}

                        {/* Center badge */}
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: 'spring', damping: 15, stiffness: 300 }}
                            className="relative"
                        >
                            <div
                                className="w-24 h-24 rounded-full flex flex-col items-center justify-center shadow-2xl"
                                style={{
                                    background: teamColor,
                                    boxShadow: `0 0 60px ${teamColor}60`,
                                }}
                            >
                                <Trophy className="w-10 h-10 text-white mb-1" />
                                <span className="text-xs font-bold text-white/90 uppercase">
                                    Hole {holeNumber}
                                </span>
                            </div>

                            {/* Sparkle effects */}
                            {!prefersReducedMotion && (
                                <>
                                    <motion.div
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: [0, 1.2, 0], opacity: [0, 1, 0] }}
                                        transition={{ duration: 0.8, delay: 0.2 }}
                                        className="absolute -top-4 -right-4"
                                    >
                                        <Sparkles className="w-6 h-6 text-yellow-400" />
                                    </motion.div>
                                    <motion.div
                                        initial={{ scale: 0, opacity: 0 }}
                                        animate={{ scale: [0, 1.2, 0], opacity: [0, 1, 0] }}
                                        transition={{ duration: 0.8, delay: 0.4 }}
                                        className="absolute -bottom-2 -left-4"
                                    >
                                        <Star className="w-5 h-5 text-yellow-300" fill="currentColor" />
                                    </motion.div>
                                </>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        );
    }

    // Hole Halved Celebration
    if (type === 'holeHalved') {
        return (
            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ type: 'spring', damping: 20 }}
                        >
                            <div className="w-20 h-20 rounded-full flex flex-col items-center justify-center bg-gray-600 shadow-lg">
                                <Minus className="w-8 h-8 text-white" />
                                <span className="text-xs font-medium text-white/80">Halved</span>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        );
    }

    // Match Won Celebration (the big one!)
    if (type === 'matchWon') {
        return (
            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center"
                        style={{ background: 'rgba(0, 0, 0, 0.7)' }}
                    >
                        {/* Massive confetti burst */}
                        {!prefersReducedMotion && particles.map((particle) => (
                            <motion.div
                                key={particle.id}
                                initial={{
                                    y: '60vh',
                                    x: `${particle.x}vw`,
                                    opacity: 1,
                                    scale: 0,
                                }}
                                animate={{
                                    y: '-30vh',
                                    x: `${particle.x + (Math.random() - 0.5) * 40}vw`,
                                    opacity: [0, 1, 1, 0],
                                    scale: [0, 1, 1, 0.5],
                                    rotate: particle.rotation * 2,
                                }}
                                transition={{
                                    duration: 2.5,
                                    delay: particle.delay,
                                    ease: 'easeOut',
                                }}
                                className="absolute"
                                style={{
                                    width: particle.size * 1.5,
                                    height: particle.size * 1.5,
                                    background: particle.color,
                                    borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                                }}
                            />
                        ))}

                        {/* Victory card */}
                        <motion.div
                            initial={{ scale: 0, y: 100 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0, y: -100 }}
                            transition={{
                                type: 'spring',
                                damping: 15,
                                stiffness: 200,
                                delay: 0.2,
                            }}
                            className="relative z-10"
                        >
                            <div
                                className="px-8 py-6 rounded-3xl flex flex-col items-center shadow-2xl"
                                style={{
                                    background: `linear-gradient(135deg, ${teamColor} 0%, ${teamColor}dd 100%)`,
                                    boxShadow: `0 0 100px ${teamColor}80`,
                                }}
                            >
                                {/* Trophy icon */}
                                <motion.div
                                    initial={{ y: -20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                >
                                    <Trophy className="w-16 h-16 text-yellow-400 mb-2" />
                                </motion.div>

                                {/* Victory text */}
                                <motion.div
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.6 }}
                                    className="text-center"
                                >
                                    <p className="text-xs uppercase tracking-widest text-white/70 mb-1">
                                        Victory
                                    </p>
                                    <h2 className="text-2xl font-bold text-white mb-1">
                                        {teamName} Wins!
                                    </h2>
                                    {finalScore && (
                                        <p className="text-lg font-semibold text-white/90">
                                            {finalScore}
                                        </p>
                                    )}
                                </motion.div>

                                {/* Decorative elements */}
                                {!prefersReducedMotion && (
                                    <>
                                        <motion.div
                                            className="absolute -top-6 -left-6"
                                            animate={{ rotate: 360 }}
                                            transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
                                        >
                                            <Star className="w-8 h-8 text-yellow-400/50" fill="currentColor" />
                                        </motion.div>
                                        <motion.div
                                            className="absolute -bottom-4 -right-4"
                                            animate={{ rotate: -360 }}
                                            transition={{ duration: 15, repeat: Infinity, ease: 'linear' }}
                                        >
                                            <Star className="w-6 h-6 text-yellow-400/50" fill="currentColor" />
                                        </motion.div>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        );
    }

    // Match Halved
    if (type === 'matchHalved') {
        return (
            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center"
                        style={{ background: 'rgba(0, 0, 0, 0.6)' }}
                    >
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.8, opacity: 0 }}
                            transition={{ type: 'spring', damping: 20 }}
                            className="px-8 py-6 rounded-3xl flex flex-col items-center bg-gray-700 shadow-2xl"
                        >
                            <Flag className="w-12 h-12 text-white mb-2" />
                            <p className="text-xs uppercase tracking-widest text-white/70 mb-1">
                                Match Result
                            </p>
                            <h2 className="text-xl font-bold text-white">
                                All Square
                            </h2>
                            <p className="text-sm text-white/80 mt-1">
                                Match Halved
                            </p>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        );
    }

    // Hole Lost (subtle feedback)
    if (type === 'holeLost') {
        return (
            <AnimatePresence>
                {isVisible && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
                    >
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            <div
                                className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
                                style={{ background: teamColor + '40' }}
                            >
                                <span className="text-2xl font-bold" style={{ color: teamColor }}>
                                    {holeNumber}
                                </span>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        );
    }

    return null;
}

/**
 * Quick toast-style celebration for inline feedback
 */
export function ScoreToast({
    message,
    type = 'success',
    show,
    onComplete,
}: {
    message: string;
    type?: 'success' | 'info' | 'warning';
    show: boolean;
    onComplete?: () => void;
}) {
    useEffect(() => {
        if (show) {
            const timer = setTimeout(() => {
                onComplete?.();
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [show, onComplete]);

    const colors = {
        success: 'var(--masters)',
        info: '#3b82f6',
        warning: '#f59e0b',
    };

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ y: 50, opacity: 0, scale: 0.9 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: -20, opacity: 0, scale: 0.9 }}
                    className="fixed bottom-32 left-1/2 -translate-x-1/2 z-50"
                >
                    <div
                        className="px-4 py-2 rounded-full shadow-lg text-white text-sm font-medium"
                        style={{ background: colors[type] }}
                    >
                        {message}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
