'use client';

/**
 * Profile Completion Reward
 *
 * Celebratory animation and reward display when profile is complete.
 * Shows team assignment preview and next steps.
 */

import { useState, useEffect, useMemo, useId, type CSSProperties } from 'react';
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
        const colors = [
            'var(--masters)',
            'var(--warning)',
            'var(--success)',
            'var(--info)',
            'var(--error)',
            'var(--color-accent)',
        ];
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
            color: 'text-[color:var(--success)]',
        },
        data.stats?.ghinVerified && {
            icon: Star,
            label: 'GHIN Verified',
            color: 'text-[color:var(--warning)]',
        },
        data.stats?.photoUploaded && {
            icon: Heart,
            label: 'Photo Added',
            color: 'text-[color:var(--color-accent)]',
        },
        data.stats?.availabilitySet && {
            icon: Calendar,
            label: 'Availability Set',
            color: 'text-[color:var(--info)]',
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
                            <div className="w-32 h-32 rounded-full bg-[color:var(--masters)] flex items-center justify-center shadow-2xl shadow-masters/30">
                                <Trophy className="w-16 h-16 text-[var(--canvas)]" />
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
                                    <Sparkles className="w-6 h-6 text-[color:var(--warning)]" />
                                </motion.div>
                            ))}
                        </motion.div>

                        {/* Text */}
                        <motion.h1
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.6 }}
                            className="text-3xl font-bold text-[var(--ink-primary)] mt-8 text-center"
                        >
                            You&apos;re All Set! 🎉
                        </motion.h1>

                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7 }}
                            className="text-[var(--ink-secondary)] mt-2 text-center"
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
                                className="w-16 h-16 rounded-full bg-[color:var(--success)]/15 mx-auto mb-4 flex items-center justify-center"
                            >
                                <Check className="w-8 h-8 text-[color:var(--success)]" />
                            </motion.div>
                            <h2 className="text-xl font-bold text-[var(--ink-primary)]">
                                Profile Complete!
                            </h2>
                            <p className="text-[var(--ink-tertiary)] mt-1">
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
                                <h3 className="text-sm font-medium text-[var(--ink-tertiary)] mb-3 flex items-center gap-2">
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
                                                className="flex items-center gap-2 px-3 py-2 rounded-full bg-[var(--surface-raised)] border border-[var(--rule)] shadow-sm"
                                            >
                                                <Icon className={cn('w-4 h-4', achievement.color)} />
                                                <span className="text-sm font-medium text-[var(--ink-secondary)]">
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
                                className="card overflow-hidden mb-4"
                            >
                                <div
                                    className="p-4 text-[var(--canvas)] bg-[color:var(--team-color)]"
                                    style={
                                        {
                                            '--team-color':
                                                data.teamColor || 'var(--ink-primary)',
                                        } as CSSProperties
                                    }
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-[color:var(--canvas-raised)]/20 flex items-center justify-center">
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
                                        <h4 className="text-sm font-medium text-[var(--ink-tertiary)] mb-2 flex items-center gap-2">
                                            <Users className="w-4 h-4" />
                                            Your Teammates
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {data.teammates.slice(0, 5).map(name => (
                                                <span
                                                    key={name}
                                                    className="px-3 py-1 rounded-full bg-[var(--surface-secondary)] text-sm text-[var(--ink-secondary)]"
                                                >
                                                    {name}
                                                </span>
                                            ))}
                                            {data.teammates.length > 5 && (
                                                <span className="px-3 py-1 rounded-full bg-[var(--surface-secondary)] text-sm text-[var(--ink-tertiary)]">
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
                                className="bg-[color:var(--masters)]/12 rounded-2xl p-4 mb-6"
                            >
                                <h4 className="text-sm font-medium text-[color:var(--masters)] flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    First Up
                                </h4>
                                <div className="mt-2">
                                    <div className="font-semibold text-[var(--ink-primary)]">
                                        {data.nextSession.name}
                                    </div>
                                    <div className="text-sm text-[var(--ink-secondary)]">
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
                                className="w-full py-4 px-6 rounded-2xl bg-masters text-[var(--canvas)] font-semibold text-lg flex items-center justify-center gap-2 shadow-lg shadow-masters/30 hover:bg-masters/90 active:scale-[0.98] transition-all"
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
                                    className="w-full py-3 text-center text-[color:var(--masters)] font-medium hover:text-[color:var(--masters)]/80 transition-colors"
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
