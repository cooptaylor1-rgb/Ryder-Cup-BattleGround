/**
 * SkeletonLoaders Component — Phase 4: Polish & Delight
 *
 * Beautiful skeleton loading states that match actual content:
 * - MatchCardSkeleton
 * - ScoreCardSkeleton
 * - LeaderboardSkeleton
 * - PlayerCardSkeleton
 * - StatsSkeleton
 * - PhotoGridSkeleton
 *
 * Provides visual continuity during loading with shimmer effects.
 */

'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

// ============================================
// BASE SKELETON
// ============================================

interface SkeletonProps {
    className?: string;
    variant?: 'rectangular' | 'circular' | 'text' | 'rounded';
    width?: number | string;
    height?: number | string;
    animation?: 'pulse' | 'shimmer' | 'none';
}

export function Skeleton({
    className,
    variant = 'rectangular',
    width,
    height,
    animation = 'shimmer',
}: SkeletonProps) {
    const baseStyles = {
        width: width ?? '100%',
        height: height ?? (variant === 'text' ? '1em' : '100%'),
    };

    const variantStyles = {
        rectangular: 'rounded-none',
        circular: 'rounded-full',
        text: 'rounded',
        rounded: 'rounded-xl',
    };

    return (
        <div
            className={cn(
                'relative overflow-hidden',
                variantStyles[variant],
                animation === 'pulse' && 'animate-pulse',
                className
            )}
            style={{
                ...baseStyles,
                background: 'var(--rule, #E5E7EB)',
            }}
        >
            {animation === 'shimmer' && (
                <motion.div
                    className="absolute inset-0"
                    style={{
                        background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.4) 50%, transparent 100%)',
                    }}
                    animate={{
                        x: ['-100%', '100%'],
                    }}
                    transition={{
                        duration: 1.5,
                        repeat: Infinity,
                        ease: 'linear',
                    }}
                />
            )}
        </div>
    );
}

// ============================================
// MATCH CARD SKELETON
// ============================================

export function MatchCardSkeleton() {
    return (
        <div
            className="p-4 rounded-2xl space-y-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}
        >
            {/* Header */}
            <div className="flex items-center justify-between">
                <Skeleton variant="text" width={80} height={14} />
                <Skeleton variant="rounded" width={60} height={24} />
            </div>

            {/* Teams */}
            <div className="flex items-center gap-4">
                {/* Team 1 */}
                <div className="flex-1 flex items-center gap-3">
                    <Skeleton variant="circular" width={40} height={40} />
                    <div className="flex-1 space-y-2">
                        <Skeleton variant="text" width="70%" height={16} />
                        <Skeleton variant="text" width="40%" height={12} />
                    </div>
                </div>

                {/* VS */}
                <Skeleton variant="circular" width={32} height={32} />

                {/* Team 2 */}
                <div className="flex-1 flex items-center gap-3 justify-end">
                    <div className="flex-1 space-y-2 text-right">
                        <Skeleton variant="text" width="70%" height={16} className="ml-auto" />
                        <Skeleton variant="text" width="40%" height={12} className="ml-auto" />
                    </div>
                    <Skeleton variant="circular" width={40} height={40} />
                </div>
            </div>

            {/* Score / Status */}
            <div className="flex items-center justify-center gap-4 pt-2">
                <Skeleton variant="rounded" width={60} height={36} />
                <Skeleton variant="text" width={40} height={14} />
                <Skeleton variant="rounded" width={60} height={36} />
            </div>
        </div>
    );
}

// ============================================
// SCORE CARD SKELETON
// ============================================

export function ScoreCardSkeleton() {
    return (
        <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}
        >
            {/* Header */}
            <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--rule)' }}>
                <Skeleton variant="text" width={120} height={18} />
                <Skeleton variant="rounded" width={80} height={28} />
            </div>

            {/* Hole Scores */}
            <div className="p-4 space-y-3">
                {/* Front 9 */}
                <div className="flex gap-1">
                    {Array.from({ length: 9 }, (_, i) => (
                        <Skeleton key={i} variant="rounded" width={32} height={40} />
                    ))}
                    <Skeleton variant="rounded" width={40} height={40} />
                </div>

                {/* Back 9 */}
                <div className="flex gap-1">
                    {Array.from({ length: 9 }, (_, i) => (
                        <Skeleton key={i} variant="rounded" width={32} height={40} />
                    ))}
                    <Skeleton variant="rounded" width={40} height={40} />
                </div>
            </div>

            {/* Footer */}
            <div className="p-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--rule)' }}>
                <Skeleton variant="text" width={100} height={14} />
                <Skeleton variant="rounded" width={60} height={32} />
            </div>
        </div>
    );
}

// ============================================
// LEADERBOARD SKELETON
// ============================================

export function LeaderboardSkeleton({ rows = 5 }: { rows?: number }) {
    return (
        <div
            className="rounded-2xl overflow-hidden"
            style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}
        >
            {/* Header */}
            <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--rule)' }}>
                <Skeleton variant="text" width={100} height={18} />
                <div className="flex gap-2">
                    <Skeleton variant="rounded" width={60} height={28} />
                    <Skeleton variant="rounded" width={60} height={28} />
                </div>
            </div>

            {/* Rows */}
            <div className="divide-y" style={{ borderColor: 'var(--rule)' }}>
                {Array.from({ length: rows }, (_, i) => (
                    <div key={i} className="p-4 flex items-center gap-4">
                        {/* Rank */}
                        <Skeleton
                            variant="circular"
                            width={32}
                            height={32}
                            className={i < 3 ? 'opacity-100' : 'opacity-60'}
                        />

                        {/* Player */}
                        <Skeleton variant="circular" width={40} height={40} />
                        <div className="flex-1 space-y-1.5">
                            <Skeleton variant="text" width="50%" height={16} />
                            <Skeleton variant="text" width="30%" height={12} />
                        </div>

                        {/* Stats */}
                        <div className="flex gap-4">
                            <Skeleton variant="text" width={40} height={20} />
                            <Skeleton variant="text" width={50} height={20} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// ============================================
// PLAYER CARD SKELETON
// ============================================

export function PlayerCardSkeleton() {
    return (
        <div
            className="p-4 rounded-2xl flex items-center gap-4"
            style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}
        >
            {/* Avatar */}
            <Skeleton variant="circular" width={56} height={56} />

            {/* Info */}
            <div className="flex-1 space-y-2">
                <Skeleton variant="text" width="60%" height={18} />
                <Skeleton variant="text" width="40%" height={14} />
                <div className="flex gap-2 pt-1">
                    <Skeleton variant="rounded" width={50} height={20} />
                    <Skeleton variant="rounded" width={50} height={20} />
                </div>
            </div>

            {/* Action */}
            <Skeleton variant="rounded" width={36} height={36} />
        </div>
    );
}

// ============================================
// STATS SKELETON
// ============================================

export function StatsSkeleton({ count = 4 }: { count?: number }) {
    return (
        <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: count }, (_, i) => (
                <div
                    key={i}
                    className="p-4 rounded-xl text-center space-y-2"
                    style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}
                >
                    <Skeleton variant="circular" width={40} height={40} className="mx-auto" />
                    <Skeleton variant="text" width={60} height={24} className="mx-auto" />
                    <Skeleton variant="text" width={80} height={12} className="mx-auto" />
                </div>
            ))}
        </div>
    );
}

// ============================================
// PHOTO GRID SKELETON
// ============================================

export function PhotoGridSkeleton({ count = 6 }: { count?: number }) {
    return (
        <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: count }, (_, i) => (
                <Skeleton
                    key={i}
                    variant="rectangular"
                    className="aspect-square"
                />
            ))}
        </div>
    );
}

// ============================================
// ACTIVITY FEED SKELETON
// ============================================

export function ActivityFeedSkeleton({ count = 4 }: { count?: number }) {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }, (_, i) => (
                <div
                    key={i}
                    className="p-3 rounded-xl flex items-start gap-3"
                    style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}
                >
                    <Skeleton variant="circular" width={36} height={36} />
                    <div className="flex-1 space-y-2">
                        <Skeleton variant="text" width="80%" height={14} />
                        <Skeleton variant="text" width="50%" height={12} />
                    </div>
                    <Skeleton variant="text" width={40} height={12} />
                </div>
            ))}
        </div>
    );
}

// ============================================
// FULL PAGE SKELETON
// ============================================

export function PageSkeleton({ type = 'list' }: { type?: 'list' | 'detail' | 'grid' }) {
    if (type === 'detail') {
        return (
            <div className="p-4 space-y-6">
                {/* Hero */}
                <Skeleton variant="rounded" height={200} />

                {/* Title */}
                <div className="space-y-2">
                    <Skeleton variant="text" width="70%" height={28} />
                    <Skeleton variant="text" width="40%" height={16} />
                </div>

                {/* Content */}
                <div className="space-y-3">
                    <Skeleton variant="text" height={14} />
                    <Skeleton variant="text" height={14} />
                    <Skeleton variant="text" width="80%" height={14} />
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                    <Skeleton variant="rounded" width={120} height={44} />
                    <Skeleton variant="rounded" width={120} height={44} />
                </div>
            </div>
        );
    }

    if (type === 'grid') {
        return (
            <div className="p-4 space-y-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <Skeleton variant="text" width={120} height={24} />
                    <Skeleton variant="rounded" width={80} height={32} />
                </div>

                {/* Grid */}
                <StatsSkeleton count={4} />

                {/* Cards */}
                <div className="space-y-3 mt-6">
                    <MatchCardSkeleton />
                    <MatchCardSkeleton />
                </div>
            </div>
        );
    }

    // Default: list
    return (
        <div className="p-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <Skeleton variant="text" width={120} height={24} />
                <Skeleton variant="rounded" width={80} height={32} />
            </div>

            {/* List */}
            <div className="space-y-3">
                <PlayerCardSkeleton />
                <PlayerCardSkeleton />
                <PlayerCardSkeleton />
                <PlayerCardSkeleton />
            </div>
        </div>
    );
}

// ============================================
// SKELETON WRAPPER (with animated appearance)
// ============================================

interface SkeletonWrapperProps {
    isLoading: boolean;
    children: React.ReactNode;
    skeleton: React.ReactNode;
    delay?: number;
}

export function SkeletonWrapper({
    isLoading,
    children,
    skeleton,
    delay = 0,
}: SkeletonWrapperProps) {
    if (isLoading) {
        return (
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay }}
            >
                {skeleton}
            </motion.div>
        );
    }

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            {children}
        </motion.div>
    );
}

export default Skeleton;
