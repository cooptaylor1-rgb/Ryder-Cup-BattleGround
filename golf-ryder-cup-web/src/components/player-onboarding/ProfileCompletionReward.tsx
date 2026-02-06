'use client';

/**
 * Profile Completion Reward
 *
 * Celebratory animation and reward display when profile is complete.
 * Shows team assignment preview and next steps.
 */

import { useState, useEffect, useMemo, useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy,
    Check,
    Sparkles,
    Star,
    Flag,
    Users,
    Calendar,
    ChevronRight,
    Zap,
    Heart,
    type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { makeSeededRng } from '@/lib/utils/seededRandom';

// ============================================
// TYPES
// ============================================

export interface CompletionData {
    playerName: string;
    tripName: string;
    teamName?: string;
    teamColor?: string;
    teammates?: string[];
    nextSession?: {
        name: string;
        date: string;
        time: string;
    };
    stats?: {
        profileComplete: boolean;
        availabilitySet: boolean;
        photoUploaded: boolean;
        ghinVerified: boolean;
    };
}

interface ProfileCompletionRewardProps {
    data: CompletionData;
    onContinue: () => void;
    onViewTeam?: () => void;
    className?: string;
}

// ============================================
// CONFETTI ANIMATION COMPONENT
// ============================================

function Confetti() {
    const seed = useId();

    // Deterministic “random” values (pure) to keep render idempotent.
    const confettiPieces = useMemo(() => {
        const rng = makeSeededRng(seed);
        const colors = ['#FFD700', '#32CD32', '#FF6B6B', '#4ECDC4', '#9B59B6', '#3498DB'];
        return Array.from({ length: 50 }, (_, i) => ({
            id: i,
            color: colors[Math.floor(rng() * colors.length)],
            left: rng() * 100,
            delay: rng() * 0.5,
            duration: 2 + rng() * 2,
            rotation: rng() * 360,
            size: 8 + rng() * 8,
        }));
    }, [seed]);

    return (
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-50">
            {confettiPieces.map((piece) => (
                <motion.div
                    key={piece.id}
                    className="absolute rounded-sm"
                    style={{
                        left: `${piece.left}%`,
                        top: -20,
                        width: piece.size,
                        height: piece.size,
                        backgroundColor: piece.color,
                        rotate: piece.rotation,
                    }}
                    initial={{ y: -20, opacity: 1, rotate: piece.rotation }}
                    animate={{
                        y: '110vh',
                        opacity: [1, 1, 0],
                        rotate: piece.rotation + 720,
                    }}
                    transition={{
                        duration: piece.duration,
                        delay: piece.delay,
                        ease: 'easeOut',
                    }}
                />
            ))}
        </div>
    );
}

// ============================================
// COMPONENT
// ============================================

export function ProfileCompletionReward({
    data,
    onContinue,
    onViewTeam,
    className,
}: ProfileCompletionRewardProps) {
    const [showConfetti, setShowConfetti] = useState(true);
    const [step, setStep] = useState<'celebration' | 'preview'>('celebration');

    useEffect(() => {
        // Auto-hide confetti after animation
        const timer = setTimeout(() => setShowConfetti(false), 4000);
        return () => clearTimeout(timer);
    }, []);

    useEffect(() => {
        // Auto-advance to preview after celebration
        const timer = setTimeout(() => setStep('preview'), 2500);
        return () => clearTimeout(timer);
    }, []);

    type EarnedAchievement = {
        icon: LucideIcon;
        label: string;
        color: string;
    };

    const achievementsEarned: EarnedAchievement[] = [
        data.stats?.profileComplete && {
            icon: Check,
            label: 'Profile Complete',
            color: 'text-green-500',
        },
        data.stats?.ghinVerified && {
            icon: Star,
            label: 'GHIN Verified',
            color: 'text-amber-500',
        },
        data.stats?.photoUploaded && {
            icon: Heart,
            label: 'Photo Added',
            color: 'text-pink-500',
        },
        data.stats?.availabilitySet && {
            icon: Calendar,
            label: 'Availability Set',
            color: 'text-blue-500',
        },
    ].filter((achievement): achievement is EarnedAchievement => Boolean(achievement));

    return (
        <div className={cn('min-h-screen flex flex-col', className)}>
            {/* Confetti */}
            {showConfetti && <Confetti />}

            <AnimatePresence mode="wait">
                {step === 'celebration' && (
                    <motion.div
                        key="celebration"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex-1 flex flex-col items-center justify-center p-6"
                    >
                        {/* Trophy Animation */}
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{
                                type: 'spring',
                                stiffness: 200,
                                damping: 20,
                                delay: 0.3,
                            }}
                            className="relative"
                        >
                            <div className="w-32 h-32 rounded-full bg-linear-to-br from-amber-400 to-yellow-500 flex items-center justify-center shadow-2xl shadow-amber-500/30">
                                <Trophy className="w-16 h-16 text-white" />
                            </div>
                            {/* Sparkles */}
                            {[...Array(6)].map((_, i) => (
                                <motion.div
                                    key={i}
                                    className="absolute"
                                    initial={{ scale: 0, opacity: 0 }}
                                    animate={{ scale: 1, opacity: [0, 1, 0] }}
                                    transition={{
                                        delay: 0.5 + i * 0.1,
                                        duration: 1,
                                        repeat: 2,
                                    }}
                                    style={{
                                        top: `${50 + 60 * Math.sin((i * Math.PI * 2) / 6)}%`,
                                        left: `${50 + 60 * Math.cos((i * Math.PI * 2) / 6)}%`,
                                        transform: 'translate(-50%, -50%)',
                                    }}
                                >
                                    <Sparkles className="w-6 h-6 text-amber-500" />
                                </motion.div>
                            ))}
                        </motion.div>

                        {/* Text */}
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="text-3xl font-bold text-surface-900 dark:text-white mt-8 text-center"
                        >
                            You&apos;re All Set! 🎉
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7 }}
                            className="text-surface-600 dark:text-surface-400 mt-2 text-center"
                        >
                            Welcome to {data.tripName}
                        </motion.p>
                    </motion.div>
                )}

                {step === 'preview' && (
                    <motion.div
                        key="preview"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex-1 flex flex-col p-6"
                    >
                        {/* Header */}
                        <div className="text-center mb-6">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                className="w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mx-auto mb-4 flex items-center justify-center"
                            >
                                <Check className="w-8 h-8 text-green-600" />
                            </motion.div>
                            <h2 className="text-xl font-bold text-surface-900 dark:text-white">
                                Profile Complete!
                            </h2>
                            <p className="text-surface-500 mt-1">
                                Here&apos;s what&apos;s next for you, {data.playerName}
                            </p>
                        </div>

                        {/* Achievements Earned */}
                        {achievementsEarned.length > 0 && (
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.2 }}
                                className="mb-6"
                            >
                                <h3 className="text-sm font-medium text-surface-500 mb-3 flex items-center gap-2">
                                    <Zap className="w-4 h-4" />
                                    Achievements Earned
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {achievementsEarned.map((achievement, idx) => {
                                        const Icon = achievement.icon;
                                        return (
                                            <motion.div
                                                key={achievement.label}
                                                initial={{ scale: 0 }}
                                                animate={{ scale: 1 }}
                                                transition={{ delay: 0.3 + idx * 0.1 }}
                                                className="flex items-center gap-2 px-3 py-2 rounded-full bg-white dark:bg-surface-800 border border-surface-200 dark:border-surface-700 shadow-sm"
                                            >
                                                <Icon className={cn('w-4 h-4', achievement.color)} />
                                                <span className="text-sm font-medium text-surface-700 dark:text-surface-300">
                                                    {achievement.label}
                                                </span>
                                            </motion.div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}

                        {/* Team Assignment Card */}
                        {data.teamName && (
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="bg-white dark:bg-surface-800 rounded-2xl border border-surface-200 dark:border-surface-700 overflow-hidden mb-4"
                            >
                                <div
                                    className="p-4 text-white"
                                    style={{ backgroundColor: data.teamColor || '#0f1729' }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                                            <Flag className="w-6 h-6" />
                                        </div>
                                        <div>
                                            <div className="text-sm opacity-80">Your Team</div>
                                            <div className="text-xl font-bold">{data.teamName}</div>
                                        </div>
                                    </div>
                                </div>

                                {data.teammates && data.teammates.length > 0 && (
                                    <div className="p-4">
                                        <h4 className="text-sm font-medium text-surface-500 mb-2 flex items-center gap-2">
                                            <Users className="w-4 h-4" />
                                            Your Teammates
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {data.teammates.slice(0, 5).map(name => (
                                                <span
                                                    key={name}
                                                    className="px-3 py-1 rounded-full bg-surface-100 dark:bg-surface-700 text-sm text-surface-700 dark:text-surface-300"
                                                >
                                                    {name}
                                                </span>
                                            ))}
                                            {data.teammates.length > 5 && (
                                                <span className="px-3 py-1 rounded-full bg-surface-100 dark:bg-surface-700 text-sm text-surface-500">
                                                    +{data.teammates.length - 5} more
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* Next Session */}
                        {data.nextSession && (
                            <motion.div
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.5 }}
                                className="bg-masters/10 rounded-2xl p-4 mb-6"
                            >
                                <h4 className="text-sm font-medium text-masters flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    First Up
                                </h4>
                                <div className="mt-2">
                                    <div className="font-semibold text-surface-900 dark:text-white">
                                        {data.nextSession.name}
                                    </div>
                                    <div className="text-sm text-surface-600 dark:text-surface-400">
                                        {new Date(data.nextSession.date).toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            month: 'long',
                                            day: 'numeric',
                                        })} at {data.nextSession.time}
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* Actions */}
                        <div className="mt-auto space-y-3">
                            <motion.button
                                initial={{ y: 20, opacity: 0 }}
                                animate={{ y: 0, opacity: 1 }}
                                transition={{ delay: 0.6 }}
                                onClick={onContinue}
                                className="w-full py-4 px-6 rounded-2xl bg-masters text-white font-semibold text-lg flex items-center justify-center gap-2 shadow-lg shadow-masters/30 hover:bg-masters/90 active:scale-[0.98] transition-all"
                            >
                                Let&apos;s Go!
                                <ChevronRight className="w-5 h-5" />
                            </motion.button>

                            {onViewTeam && (
                                <motion.button
                                    initial={{ y: 20, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    transition={{ delay: 0.7 }}
                                    onClick={onViewTeam}
                                    className="w-full py-3 text-center text-masters font-medium hover:text-masters/80 transition-colors"
                                >
                                    View Full Team Roster
                                </motion.button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default ProfileCompletionReward;
