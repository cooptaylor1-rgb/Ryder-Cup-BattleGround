/**
 * PlayerCard Component — Phase 2: Captain Empowerment
 *
 * Draggable player card for lineup building with:
 * - Rich player information display
 * - Handicap badge with color coding
 * - Recent form indicator
 * - Smooth drag animations
 * - Touch-friendly interactions
 *
 * Uses @dnd-kit for accessibility-first drag and drop.
 */

'use client';

import { forwardRef, useMemo } from 'react';
import Image from 'next/image';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { motion } from 'framer-motion';
import {
    GripVertical,
    TrendingUp,
    TrendingDown,
    Minus,
    Star,
    Trophy,
    User,
    Flame,
    Snowflake,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

export type FormTrend = 'hot' | 'rising' | 'stable' | 'cooling' | 'cold';

export interface PlayerCardData {
    id: string;
    firstName: string;
    lastName: string;
    handicapIndex: number;
    team: 'A' | 'B';
    avatarUrl?: string;
    // Performance metrics
    matchesPlayed?: number;
    matchesWon?: number;
    matchesLost?: number;
    matchesHalved?: number;
    // Form indicator
    recentForm?: FormTrend;
    // Special flags
    isCaptain?: boolean;
    isRookie?: boolean;
    // For highlighting
    isSelected?: boolean;
    isDisabled?: boolean;
}

interface PlayerCardProps {
    player: PlayerCardData;
    teamColor: string;
    teamName: string;
    variant?: 'compact' | 'standard' | 'detailed';
    isDragging?: boolean;
    isDropTarget?: boolean;
    showStats?: boolean;
    showForm?: boolean;
    className?: string;
    onRemove?: () => void;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get initials from player name
 */
function getInitials(firstName: string, lastName: string): string {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

/**
 * Get handicap display color based on index
 */
function getHandicapColor(handicap: number): string {
    if (handicap <= 5) return 'var(--masters)';
    if (handicap <= 10) return 'var(--info)';
    if (handicap <= 18) return 'var(--ink-tertiary)';
    if (handicap <= 25) return 'var(--warning)';
    return 'var(--error)';
}

/**
 * Get form trend icon and color
 */
function getFormIndicator(form: FormTrend) {
    switch (form) {
        case 'hot':
            return { icon: Flame, color: 'var(--warning)', label: 'On Fire' };
        case 'rising':
            return { icon: TrendingUp, color: 'var(--success)', label: 'Rising' };
        case 'stable':
            return { icon: Minus, color: 'var(--ink-tertiary)', label: 'Stable' };
        case 'cooling':
            return { icon: TrendingDown, color: 'var(--warning)', label: 'Cooling' };
        case 'cold':
            return { icon: Snowflake, color: 'var(--info)', label: 'Cold' };
    }
}

/**
 * Calculate win percentage
 */
function getWinRate(won: number, lost: number, halved: number): number {
    const total = won + lost + halved;
    if (total === 0) return 0;
    return Math.round((won + halved * 0.5) / total * 100);
}

// ============================================
// DRAGGABLE PLAYER CARD
// ============================================

export function DraggablePlayerCard({
    player,
    teamColor,
    teamName,
    variant = 'standard',
    showStats = false,
    showForm = true,
    className,
    onRemove,
}: PlayerCardProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        isDragging,
    } = useDraggable({
        id: player.id,
        data: {
            type: 'player',
            player,
            team: player.team,
        },
        disabled: player.isDisabled,
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
        cursor: player.isDisabled ? 'not-allowed' : 'grab',
    };

    return (
        <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
            <PlayerCard
                player={player}
                teamColor={teamColor}
                teamName={teamName}
                variant={variant}
                isDragging={isDragging}
                showStats={showStats}
                showForm={showForm}
                className={className}
                onRemove={onRemove}
            />
        </div>
    );
}

// ============================================
// BASE PLAYER CARD (Non-draggable version)
// ============================================

export const PlayerCard = forwardRef<HTMLDivElement, PlayerCardProps>(
    function PlayerCard(
        {
            player,
            teamColor,
            teamName,
            variant = 'standard',
            isDragging = false,
            isDropTarget = false,
            showStats = false,
            showForm = true,
            className,
            onRemove,
        },
        ref
    ) {
        const winRate = useMemo(() => {
            if (!player.matchesWon && !player.matchesLost && !player.matchesHalved) return null;
            return getWinRate(
                player.matchesWon || 0,
                player.matchesLost || 0,
                player.matchesHalved || 0
            );
        }, [player.matchesWon, player.matchesLost, player.matchesHalved]);

        const formIndicator = player.recentForm ? getFormIndicator(player.recentForm) : null;
        const handicapColor = getHandicapColor(player.handicapIndex);

        // Compact variant - minimal info
        if (variant === 'compact') {
            return (
                <motion.div
                    ref={ref}
                    layout
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{
                        opacity: player.isDisabled ? 0.5 : 1,
                        scale: isDragging ? 1.05 : 1,
                    }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className={cn(
                        'flex items-center gap-2 px-2 py-1.5 rounded-lg transition-all',
                        isDragging && 'shadow-lg ring-2',
                        isDropTarget && 'ring-2 ring-[var(--success)]',
                        player.isSelected && 'ring-2 ring-[var(--info)]',
                        className
                    )}
                    style={{
                        background: isDragging ? 'var(--surface-raised)' : 'var(--surface-card)',
                        borderLeft: `3px solid ${teamColor}`,
                        ['--tw-ring-color' as string]: isDragging ? teamColor : undefined,
                    }}
                >
                    {/* Drag Handle */}
                    <GripVertical
                        size={14}
                        className="shrink-0 opacity-40"
                    />

                    {/* Avatar */}
                    <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--canvas)] text-xs font-semibold shrink-0 relative overflow-hidden"
                        style={{ background: teamColor }}
                    >
                        {player.avatarUrl ? (
                            <Image
                                src={player.avatarUrl}
                                alt=""
                                fill
                                className="rounded-full object-cover"
                                sizes="28px"
                            />
                        ) : (
                            getInitials(player.firstName, player.lastName)
                        )}
                    </div>

                    {/* Name */}
                    <span className="text-sm font-medium truncate flex-1 text-[var(--ink-primary)]">
                        {player.firstName} {player.lastName.charAt(0)}.
                    </span>

                    {/* Handicap */}
                    <span
                        className="text-xs font-bold px-1.5 py-0.5 rounded"
                        style={{ background: `${handicapColor}15`, color: handicapColor }}
                    >
                        {player.handicapIndex.toFixed(1)}
                    </span>
                </motion.div>
            );
        }

        // Standard variant - balanced info
        return (
            <motion.div
                ref={ref}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{
                    opacity: player.isDisabled ? 0.5 : 1,
                    scale: isDragging ? 1.03 : 1,
                    y: 0,
                }}
                exit={{ opacity: 0, y: -10 }}
                whileHover={{ scale: player.isDisabled ? 1 : 1.01 }}
                className={cn(
                    'relative p-3 rounded-xl transition-all group',
                    isDragging && 'shadow-xl z-50',
                    isDropTarget && 'ring-2 ring-[var(--success)] bg-[color:var(--success)]/10',
                    player.isSelected && 'ring-2 ring-[var(--info)]',
                    !isDragging && 'hover:shadow-md',
                    className
                )}
                style={{
                    background: isDragging ? 'var(--surface-raised)' : 'var(--surface-card)',
                    border: `1px solid ${isDragging ? teamColor : 'var(--rule)'}`,
                }}
            >
                {/* Team Color Strip */}
                <div
                    className="absolute left-0 top-2 bottom-2 w-1 rounded-full"
                    style={{ background: teamColor }}
                />

                <div className="flex items-center gap-3 pl-2">
                    {/* Drag Handle */}
                    <div className="shrink-0 opacity-0 group-hover:opacity-40 transition-opacity cursor-grab active:cursor-grabbing">
                        <GripVertical size={16} />
                    </div>

                    {/* Avatar */}
                    <div className="relative shrink-0">
                        <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-[var(--canvas)] font-bold text-lg shadow-sm relative overflow-hidden"
                            style={{ background: teamColor }}
                        >
                            {player.avatarUrl ? (
                                <Image
                                    src={player.avatarUrl}
                                    alt=""
                                    fill
                                    className="rounded-full object-cover"
                                    sizes="48px"
                                />
                            ) : (
                                getInitials(player.firstName, player.lastName)
                            )}
                        </div>

                        {/* Captain Badge */}
                        {player.isCaptain && (
                            <div
                                className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-sm"
                                style={{ background: 'var(--gold)' }}
                            >
                                <Star size={12} className="text-[var(--canvas)]" fill="currentColor" />
                            </div>
                        )}

                        {/* Form Indicator */}
                        {showForm && formIndicator && (
                            <div
                                className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center shadow-sm"
                                style={{ background: formIndicator.color }}
                                title={formIndicator.label}
                            >
                                <formIndicator.icon size={10} className="text-[var(--canvas)]" />
                            </div>
                        )}
                    </div>

                    {/* Player Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h4 className="font-semibold truncate" style={{ color: 'var(--ink)' }}>
                                {player.firstName} {player.lastName}
                            </h4>
                            {player.isRookie && (
                                <span
                                    className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase"
                                    style={{ background: 'var(--accent)', color: 'var(--canvas)' }}
                                >
                                    Rookie
                                </span>
                            )}
                        </div>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--ink-tertiary)' }}>
                            {teamName}
                        </p>
                    </div>

                    {/* Stats Column */}
                    <div className="flex flex-col items-end gap-1 shrink-0">
                        {/* Handicap Badge */}
                        <div
                            className="px-2 py-1 rounded-lg text-sm font-bold"
                            style={{ background: `${handicapColor}15`, color: handicapColor }}
                        >
                            {player.handicapIndex.toFixed(1)}
                        </div>

                        {/* Win Rate */}
                        {showStats && winRate !== null && (
                            <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--ink-tertiary)' }}>
                                <Trophy size={10} />
                                <span>{winRate}%</span>
                            </div>
                        )}
                    </div>

                    {/* Remove Button (shown on hover in matches) */}
                    {onRemove && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemove();
                            }}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                            style={{ background: 'var(--error)', color: 'var(--canvas)' }}
                        >
                            ×
                        </button>
                    )}
                </div>

                {/* Detailed Stats Row (for detailed variant or when showStats) */}
                {(variant === 'detailed' || showStats) && player.matchesPlayed !== undefined && (
                    <div
                        className="flex items-center justify-around mt-3 pt-3 border-t text-xs"
                        style={{ borderColor: 'var(--rule)' }}
                    >
                        <div className="text-center">
                            <p className="font-semibold" style={{ color: 'var(--ink)' }}>
                                {player.matchesPlayed || 0}
                            </p>
                            <p style={{ color: 'var(--ink-tertiary)' }}>Played</p>
                        </div>
                        <div className="text-center">
                            <p className="font-semibold text-[var(--success)]">
                                {player.matchesWon || 0}
                            </p>
                            <p style={{ color: 'var(--ink-tertiary)' }}>Won</p>
                        </div>
                        <div className="text-center">
                            <p className="font-semibold text-[var(--error)]">
                                {player.matchesLost || 0}
                            </p>
                            <p style={{ color: 'var(--ink-tertiary)' }}>Lost</p>
                        </div>
                        <div className="text-center">
                            <p className="font-semibold" style={{ color: 'var(--ink-secondary)' }}>
                                {player.matchesHalved || 0}
                            </p>
                            <p style={{ color: 'var(--ink-tertiary)' }}>Halved</p>
                        </div>
                    </div>
                )}
            </motion.div>
        );
    }
);

// ============================================
// PLAYER CARD SKELETON (Loading State)
// ============================================

export function PlayerCardSkeleton({ variant = 'standard' }: { variant?: 'compact' | 'standard' }) {
    if (variant === 'compact') {
        return (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg animate-pulse" style={{ background: 'var(--surface)' }}>
                <div className="w-4 h-4 rounded bg-[var(--surface-secondary)]" />
                <div className="w-7 h-7 rounded-full bg-[var(--surface-secondary)]" />
                <div className="flex-1 h-4 rounded bg-[var(--surface-secondary)]" />
                <div className="w-10 h-5 rounded bg-[var(--surface-secondary)]" />
            </div>
        );
    }

    return (
        <div className="p-3 rounded-xl animate-pulse" style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}>
            <div className="flex items-center gap-3 pl-2">
                <div className="w-4 h-8 rounded bg-[var(--surface-secondary)]" />
                <div className="w-12 h-12 rounded-full bg-[var(--surface-secondary)]" />
                <div className="flex-1 space-y-2">
                    <div className="h-4 w-2/3 rounded bg-[var(--surface-secondary)]" />
                    <div className="h-3 w-1/3 rounded bg-[var(--surface-secondary)]" />
                </div>
                <div className="w-12 h-8 rounded-lg bg-[var(--surface-secondary)]" />
            </div>
        </div>
    );
}

// ============================================
// EMPTY PLAYER SLOT
// ============================================

interface EmptyPlayerSlotProps {
    teamColor: string;
    teamName: string;
    isDropTarget?: boolean;
    label?: string;
}

export function EmptyPlayerSlot({ teamColor, teamName, isDropTarget, label }: EmptyPlayerSlotProps) {
    return (
        <motion.div
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={cn(
                'flex items-center justify-center gap-2 p-3 rounded-xl border-2 border-dashed transition-all',
                isDropTarget && 'border-solid scale-[1.02]'
            )}
            style={{
                borderColor: isDropTarget ? teamColor : 'var(--rule)',
                background: isDropTarget ? `${teamColor}10` : 'transparent',
            }}
        >
            <User size={20} style={{ color: isDropTarget ? teamColor : 'var(--ink-tertiary)' }} />
            <span
                className="text-sm font-medium"
                style={{ color: isDropTarget ? teamColor : 'var(--ink-tertiary)' }}
            >
                {label || `Drop ${teamName} player`}
            </span>
        </motion.div>
    );
}

export default PlayerCard;
