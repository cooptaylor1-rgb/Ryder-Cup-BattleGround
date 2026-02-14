/**
 * AchievementUnlock Component — Phase 3: Social & Engagement
 *
 * Celebration animation for unlocked achievements:
 * - Full-screen celebratory overlay
 * - Confetti particle system
 * - Achievement badge reveal
 * - Sound integration hooks
 * - Share prompt
 *
 * Makes achievements feel special and share-worthy.
 */

'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import {
    Trophy,
    Star,
    Medal,
    Target,
    Crown,
    Share2,
    X,
    ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/lib/hooks';

// ============================================
// TYPES
// ============================================

export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';

export interface Achievement {
    id: string;
    title: string;
    description: string;
    icon: string; // Emoji or icon name
    rarity: AchievementRarity;
    points: number;
    unlockedAt: string;
    // Context
    matchId?: string;
    holeNumber?: number;
    stat?: { label: string; value: string };
}

interface AchievementUnlockProps {
    achievement: Achievement | null;
    onClose: () => void;
    onShare?: (achievementId: string) => void;
    autoCloseMs?: number;
}

// ============================================
// RARITY CONFIG
// ============================================

const RARITY_CONFIG: Record<AchievementRarity, {
    color: string;
    gradient: string;
    particleColor: string;
    label: string;
    icon: typeof Star;
}> = {
    common: {
        color: '#6B7280',
        gradient: 'from-gray-400 to-gray-600',
        particleColor: '#9CA3AF',
        label: 'Common',
        icon: Star,
    },
    uncommon: {
        color: '#22C55E',
        gradient: 'from-green-400 to-green-600',
        particleColor: '#4ADE80',
        label: 'Uncommon',
        icon: Target,
    },
    rare: {
        color: '#3B82F6',
        gradient: 'from-blue-400 to-blue-600',
        particleColor: '#60A5FA',
        label: 'Rare',
        icon: Medal,
    },
    epic: {
        color: '#8B5CF6',
        gradient: 'from-purple-400 to-purple-600',
        particleColor: '#A78BFA',
        label: 'Epic',
        icon: Trophy,
    },
    legendary: {
        color: '#F59E0B',
        gradient: 'from-amber-400 to-orange-500',
        particleColor: '#FCD34D',
        label: 'Legendary',
        icon: Crown,
    },
};

// ============================================
// CONFETTI PARTICLE
// ============================================

interface ConfettiParticle {
    id: number;
    x: number;
    y: number;
    rotation: number;
    scale: number;
    duration: number;
    color: string;
    shape: 'circle' | 'square' | 'star';
}

function generateConfetti(count: number, color: string): ConfettiParticle[] {
    const colors = [color, '#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];
    const shapes: ConfettiParticle['shape'][] = ['circle', 'square', 'star'];

    return Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: -20 - Math.random() * 50,
        rotation: Math.random() * 360,
        scale: 0.5 + Math.random() * 0.5,
        duration: 3 + Math.random() * 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        shape: shapes[Math.floor(Math.random() * shapes.length)],
    }));
}

function ConfettiSystem({ color, isActive }: { color: string; isActive: boolean }) {
    const [particles, setParticles] = useState<ConfettiParticle[]>([]);

    useEffect(() => {
        if (isActive) {
            setParticles(generateConfetti(50, color));
        }
    }, [isActive, color]);

    if (!isActive) return null;

    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {particles.map((particle) => (
                <motion.div
                    key={particle.id}
                    initial={{
                        x: `${particle.x}vw`,
                        y: `${particle.y}vh`,
                        rotate: 0,
                        scale: particle.scale,
                        opacity: 1,
                    }}
                    animate={{
                        y: '120vh',
                        rotate: particle.rotation + 720,
                        opacity: 0,
                    }}
                    transition={{
                        duration: particle.duration,
                        ease: 'easeIn',
                    }}
                    className="absolute"
                    style={{
                        width: particle.shape === 'star' ? 16 : 10,
                        height: particle.shape === 'star' ? 16 : 10,
                        borderRadius: particle.shape === 'circle' ? '50%' : particle.shape === 'star' ? '0' : '2px',
                        background: particle.color,
                        clipPath: particle.shape === 'star'
                            ? 'polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)'
                            : undefined,
                    }}
                />
            ))}
        </div>
    );
}

// ============================================
// ACHIEVEMENT BADGE
// ============================================

interface AchievementBadgeProps {
    achievement: Achievement;
    config: typeof RARITY_CONFIG[AchievementRarity];
}

function AchievementBadge({ achievement, config }: AchievementBadgeProps) {
    const controls = useAnimation();

    useEffect(() => {
        controls.start({
            scale: [0, 1.2, 1],
            rotate: [0, -10, 10, 0],
            transition: { duration: 0.8, ease: 'easeOut' },
        });
    }, [controls]);

    return (
        <motion.div
            animate={controls}
            className="relative"
        >
            {/* Glow effect */}
            <motion.div
                className="absolute inset-0 rounded-full blur-2xl"
                style={{ background: config.color, opacity: 0.4 }}
                animate={{
                    scale: [1, 1.3, 1],
                    opacity: [0.4, 0.6, 0.4],
                }}
                transition={{ duration: 2, repeat: Infinity }}
            />

            {/* Badge */}
            <div
                className={cn(
                    'relative w-32 h-32 rounded-full flex items-center justify-center',
                    `bg-linear-to-br ${config.gradient}`
                )}
                style={{ boxShadow: `0 0 60px ${config.color}50` }}
            >
                {/* Inner ring */}
                <div className="absolute inset-2 rounded-full border-4 border-white/30" />

                {/* Icon */}
                <span className="text-5xl">{achievement.icon}</span>

                {/* Shine effect */}
                <motion.div
                    className="absolute inset-0 rounded-full"
                    style={{
                        background: 'linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%)',
                    }}
                    animate={{
                        rotate: [0, 360],
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
                />
            </div>

            {/* Points badge */}
            <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: 'spring' }}
                className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-white text-sm font-bold"
                style={{ background: config.color }}
            >
                +{achievement.points} pts
            </motion.div>
        </motion.div>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function AchievementUnlock({
    achievement,
    onClose,
    onShare,
    autoCloseMs = 8000,
}: AchievementUnlockProps) {
    const haptic = useHaptic();
    const [showDetails, setShowDetails] = useState(false);

    useEffect(() => {
        if (achievement) {
            // Haptic burst for achievement
            haptic.impact();
            setTimeout(() => haptic.press(), 200);
            setTimeout(() => haptic.tap(), 400);

            // Show details after animation
            const detailsTimer = setTimeout(() => setShowDetails(true), 1000);

            // Auto-close
            const closeTimer = setTimeout(onClose, autoCloseMs);

            return () => {
                clearTimeout(detailsTimer);
                clearTimeout(closeTimer);
            };
        }
    }, [achievement, autoCloseMs, haptic, onClose]);

    const handleShare = () => {
        if (achievement) {
            haptic.press();
            onShare?.(achievement.id);
        }
    };

    if (!achievement) return null;

    const config = RARITY_CONFIG[achievement.rarity];

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center"
                style={{ background: 'rgba(0, 0, 0, 0.9)' }}
            >
                {/* Confetti */}
                <ConfettiSystem color={config.particleColor} isActive={true} />

                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 z-10 rounded-full bg-[color:var(--canvas-raised)]/15 p-2 text-white backdrop-blur-sm transition-colors hover:bg-[color:var(--canvas-raised)]/25"
                >
                    <X size={24} />
                </button>

                {/* Content */}
                <div className="text-center px-6">
                    {/* Rarity Label */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mb-6"
                    >
                        <span
                            className="px-4 py-1.5 rounded-full text-sm font-bold uppercase tracking-wider"
                            style={{ background: `${config.color}30`, color: config.color }}
                        >
                            {config.label} Achievement
                        </span>
                    </motion.div>

                    {/* Badge */}
                    <div className="flex justify-center mb-8">
                        <AchievementBadge achievement={achievement} config={config} />
                    </div>

                    {/* Title */}
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.6 }}
                        className="text-3xl font-bold text-white mb-2"
                    >
                        {achievement.title}
                    </motion.h2>

                    {/* Description */}
                    <AnimatePresence>
                        {showDetails && (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="space-y-4"
                            >
                                <p className="text-white/70 text-lg max-w-sm mx-auto">
                                    {achievement.description}
                                </p>

                                {/* Stat if present */}
                                {achievement.stat && (
                                    <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--canvas-raised)]/15 px-4 py-2 text-white backdrop-blur-sm">
                                        <span className="text-white/60">{achievement.stat.label}:</span>
                                        <span className="text-white font-bold">{achievement.stat.value}</span>
                                    </div>
                                )}

                                {/* Share Button */}
                                <motion.button
                                    onClick={handleShare}
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="mt-6 inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white"
                                    style={{ background: config.color }}
                                >
                                    <Share2 size={18} />
                                    Share Achievement
                                </motion.button>

                                {/* Tap to dismiss */}
                                <p className="text-white/40 text-sm mt-4">
                                    Tap anywhere to dismiss
                                </p>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Tap to dismiss overlay */}
                <div className="absolute inset-0 -z-10" onClick={onClose} />
            </motion.div>
        </AnimatePresence>
    );
}

// ============================================
// ACHIEVEMENT NOTIFICATION (Small inline version)
// ============================================

interface AchievementNotificationProps {
    achievement: Achievement;
    onView?: () => void;
    onDismiss?: () => void;
}

export function AchievementNotification({
    achievement,
    onView,
    onDismiss: _onDismiss,
}: AchievementNotificationProps) {
    const haptic = useHaptic();
    const config = RARITY_CONFIG[achievement.rarity];

    return (
        <motion.div
            initial={{ opacity: 0, y: -50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -50, scale: 0.9 }}
            className="flex items-center gap-3 p-3 rounded-xl shadow-lg max-w-sm"
            style={{
                background: 'var(--surface)',
                border: `2px solid ${config.color}`,
            }}
        >
            {/* Icon */}
            <div
                className="w-12 h-12 rounded-full flex items-center justify-center text-2xl shrink-0"
                style={{ background: `${config.color}20` }}
            >
                {achievement.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold uppercase" style={{ color: config.color }}>
                        {config.label}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
                        +{achievement.points} pts
                    </span>
                </div>
                <h4 className="font-semibold truncate" style={{ color: 'var(--ink)' }}>
                    {achievement.title}
                </h4>
            </div>

            {/* View Button */}
            <button
                onClick={() => {
                    haptic.tap();
                    onView?.();
                }}
                className="p-2 rounded-lg"
                style={{ background: config.color, color: 'white' }}
            >
                <ChevronRight size={16} />
            </button>
        </motion.div>
    );
}

export default AchievementUnlock;
