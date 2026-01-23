/**
 * Premium UI Components v3.0
 *
 * World-class, Masters-inspired golf experience components.
 * These components deliver the sophisticated, premium feel
 * rivaling the Masters Tournament app.
 *
 * Features:
 * - Premium visual hierarchy
 * - Sophisticated animations
 * - Glass morphism effects
 * - Gold accent highlights
 * - Smooth micro-interactions
 */

'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    Tv,
    ChevronRight,
    X,
    Trophy,
    Target,
    Circle,
} from 'lucide-react';
import type { HoleWinner } from '@/lib/types/models';

// ============================================
// PREMIUM LIVE MATCH BANNER
// ============================================

interface PremiumLiveMatchBannerProps {
    matchCount: number;
    currentHole?: number;
    closestMatch?: {
        teamA: string;
        teamB: string;
        score: string;
        teamAUp?: boolean;
    };
    holeResults?: { holeNumber: number; winner: HoleWinner }[];
    onDismiss?: () => void;
    className?: string;
}

export function PremiumLiveMatchBanner({
    matchCount,
    currentHole,
    closestMatch,
    holeResults = [],
    onDismiss,
    className,
}: PremiumLiveMatchBannerProps) {
    const router = useRouter();
    const [isDismissed, setIsDismissed] = useState(false);

    if (isDismissed || matchCount === 0) return null;

    const handleDismiss = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsDismissed(true);
        onDismiss?.();
    };

    return (
        <button
            onClick={() => router.push('/live')}
            className={cn(
                'w-full relative overflow-hidden rounded-2xl',
                'card-premium live-card-glow',
                'transition-all duration-300',
                'active:scale-[0.98]',
                'group cursor-pointer text-left',
                className
            )}
        >
            {/* Premium gradient background */}
            <div
                className="absolute inset-0"
                style={{
                    background:
                        'linear-gradient(135deg, rgba(22, 163, 74, 0.08) 0%, transparent 60%)',
                }}
            />

            {/* Subtle texture overlay */}
            <div className="texture-grain absolute inset-0" />

            {/* Dismiss button */}
            {onDismiss && (
                <button
                    onClick={handleDismiss}
                    className="absolute top-3 right-3 p-2 rounded-full bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 transition-colors z-10"
                    aria-label="Dismiss"
                >
                    <X className="w-4 h-4 text-ink-tertiary" />
                </button>
            )}

            <div className="relative p-5">
                <div className="flex items-start gap-4">
                    {/* Live indicator icon */}
                    <div className="flex-shrink-0">
                        <div className="relative w-14 h-14 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                            <Tv className="w-7 h-7 text-white" />
                            {/* Pulsing ring */}
                            <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75" />
                                <span className="relative inline-flex rounded-full h-4 w-4 bg-white shadow-md" />
                            </span>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pt-1">
                        {/* Live badge and hole */}
                        <div className="flex items-center gap-3 mb-2">
                            <span className="live-premium">LIVE</span>
                            {currentHole && (
                                <span className="text-sm font-medium text-ink-secondary">
                                    Hole {currentHole}
                                </span>
                            )}
                        </div>

                        {/* Match count */}
                        <p className="type-title text-ink mb-1">
                            {matchCount} {matchCount === 1 ? 'Match' : 'Matches'} in Progress
                        </p>

                        {/* Closest match preview */}
                        {closestMatch && (
                            <p className="type-body-sm text-ink-secondary truncate">
                                {closestMatch.teamA} vs {closestMatch.teamB} •{' '}
                                <span
                                    className={cn(
                                        'font-semibold',
                                        closestMatch.teamAUp
                                            ? 'text-[var(--team-usa)]'
                                            : 'text-[var(--team-europe)]'
                                    )}
                                >
                                    {closestMatch.score}
                                </span>
                            </p>
                        )}
                    </div>

                    {/* Arrow */}
                    <ChevronRight className="w-5 h-5 text-ink-tertiary group-hover:text-ink-secondary group-hover:translate-x-1 transition-all flex-shrink-0 mt-4" />
                </div>

                {/* Mini hole progress strip */}
                {holeResults.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-rule-faint">
                        <HoleProgressStrip
                            results={holeResults}
                            currentHole={currentHole}
                            size="sm"
                        />
                    </div>
                )}
            </div>
        </button>
    );
}

// ============================================
// HOLE PROGRESS STRIP
// ============================================

interface HoleProgressStripProps {
    results: { holeNumber: number; winner: HoleWinner }[];
    currentHole?: number;
    totalHoles?: number;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function HoleProgressStrip({
    results,
    currentHole,
    totalHoles = 18,
    size = 'md',
    className,
}: HoleProgressStripProps) {
    const dotSize = {
        sm: 'w-2 h-2',
        md: 'w-2.5 h-2.5',
        lg: 'w-3 h-3',
    }[size];

    const gapSize = {
        sm: 'gap-1',
        md: 'gap-1.5',
        lg: 'gap-2',
    }[size];

    // Create array of all holes
    const holes = useMemo(() => {
        const holesArray = [];
        for (let i = 1; i <= totalHoles; i++) {
            const result = results.find((r) => r.holeNumber === i);
            holesArray.push({
                holeNumber: i,
                winner: result?.winner || 'none',
                isCurrent: i === currentHole,
            });
        }
        return holesArray;
    }, [results, currentHole, totalHoles]);

    return (
        <div className={cn('hole-progress-strip', gapSize, className)}>
            {holes.map((hole) => (
                <div
                    key={hole.holeNumber}
                    className={cn(
                        'hole-dot',
                        dotSize,
                        hole.isCurrent && 'current',
                        hole.winner === 'teamA' && 'team-usa-win',
                        hole.winner === 'teamB' && 'team-europe-win',
                        hole.winner === 'halved' && 'halved'
                    )}
                    title={`Hole ${hole.holeNumber}: ${hole.winner === 'teamA'
                        ? 'USA'
                        : hole.winner === 'teamB'
                            ? 'Europe'
                            : hole.winner === 'halved'
                                ? 'Halved'
                                : 'Not played'
                        }`}
                />
            ))}
        </div>
    );
}

// ============================================
// PREMIUM PROGRESS BAR
// ============================================

interface PremiumProgressBarProps {
    value: number;
    max: number;
    target?: number;
    team: 'usa' | 'europe';
    showLabel?: boolean;
    animated?: boolean;
    className?: string;
}

export function PremiumProgressBar({
    value,
    max,
    target,
    team,
    showLabel = true,
    animated = true,
    className,
}: PremiumProgressBarProps) {
    const [displayValue, setDisplayValue] = useState(0);
    const _percentage = (value / max) * 100;
    const targetPercentage = target ? (target / max) * 100 : null;

    useEffect(() => {
        if (animated) {
            // Animate from 0 to value
            const timer = setTimeout(() => setDisplayValue(value), 100);
            return () => clearTimeout(timer);
        } else {
            setDisplayValue(value);
        }
    }, [value, animated]);

    const displayPercentage = (displayValue / max) * 100;

    return (
        <div className={cn('space-y-1.5', className)}>
            {showLabel && (
                <div className="flex justify-between items-center">
                    <span className="type-caption text-ink-secondary">
                        {team === 'usa' ? 'Team USA' : 'Team Europe'}
                    </span>
                    <span className="type-caption font-medium">
                        {value}/{max} to win
                    </span>
                </div>
            )}
            <div className="progress-premium">
                <div
                    className={cn('progress-premium-fill', team === 'usa' ? 'team-usa' : 'team-europe')}
                    style={{ width: `${Math.min(displayPercentage, 100)}%` }}
                />
                {targetPercentage !== null && (
                    <div
                        className="progress-target"
                        style={{ left: `${targetPercentage}%` }}
                        title={`${target} points to win`}
                    />
                )}
            </div>
        </div>
    );
}

// ============================================
// ANIMATED SCORE COUNTER
// ============================================

interface AnimatedScoreProps {
    value: number;
    previousValue?: number;
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
    team?: 'usa' | 'europe' | 'neutral';
    animate?: boolean;
    className?: string;
}

export function AnimatedScore({
    value,
    previousValue,
    size = 'md',
    team = 'neutral',
    animate = true,
    className,
}: AnimatedScoreProps) {
    const [isAnimating, setIsAnimating] = useState(false);
    const prevValueRef = useRef(previousValue ?? value);

    useEffect(() => {
        if (animate && value !== prevValueRef.current) {
            setIsAnimating(true);
            const timer = setTimeout(() => setIsAnimating(false), 600);
            prevValueRef.current = value;
            return () => clearTimeout(timer);
        }
    }, [value, animate]);

    const sizeClasses = {
        sm: 'text-lg font-semibold',
        md: 'text-2xl font-bold',
        lg: 'text-4xl font-bold',
        xl: 'score-large',
        hero: 'score-hero',
    }[size];

    const teamColor = {
        usa: 'text-[var(--team-usa)]',
        europe: 'text-[var(--team-europe)]',
        neutral: 'text-ink',
    }[team];

    // Format as golf score (e.g., "7.5")
    const formattedValue = Number.isInteger(value) ? value.toString() : value.toFixed(1);

    return (
        <span
            className={cn(
                sizeClasses,
                teamColor,
                isAnimating && 'animate-score-win',
                'tabular-nums',
                className
            )}
        >
            {formattedValue}
        </span>
    );
}

// ============================================
// PREMIUM STANDINGS CARD
// ============================================

interface PremiumStandingsCardProps {
    teamAPoints: number;
    teamBPoints: number;
    teamAName?: string;
    teamBName?: string;
    matchesCompleted: number;
    totalMatches: number;
    pointsToWin?: number;
    className?: string;
}

export function PremiumStandingsCard({
    teamAPoints,
    teamBPoints,
    teamAName = 'USA',
    teamBName = 'Europe',
    matchesCompleted,
    totalMatches,
    pointsToWin = 14.5,
    className,
}: PremiumStandingsCardProps) {
    const leader =
        teamAPoints > teamBPoints ? 'teamA' : teamBPoints > teamAPoints ? 'teamB' : null;
    const margin = Math.abs(teamAPoints - teamBPoints);

    // Calculate magic number (points needed to clinch)
    const teamANeeded = Math.max(0, pointsToWin - teamAPoints);
    const teamBNeeded = Math.max(0, pointsToWin - teamBPoints);
    const teamAClinched = teamAPoints >= pointsToWin;
    const teamBClinched = teamBPoints >= pointsToWin;

    return (
        <div className={cn('card-premium texture-grain overflow-hidden', className)}>
            {/* Header with gradient */}
            <div
                className="p-4"
                style={{
                    background: 'linear-gradient(135deg, var(--masters) 0%, #004D35 100%)',
                }}
            >
                <div className="flex items-center justify-between text-white">
                    <div>
                        <h2 className="type-title text-white/90">Tournament Standings</h2>
                        <p className="type-caption text-white/70 mt-0.5">
                            {matchesCompleted} of {totalMatches} matches complete
                        </p>
                    </div>
                    <Trophy className="w-6 h-6 text-white/80" />
                </div>
            </div>

            {/* Hero Score Display */}
            <div className="standings-hero">
                <div className="flex items-center justify-center gap-8">
                    {/* Team A */}
                    <div className="text-center">
                        <div className="w-4 h-4 rounded-full bg-[var(--team-usa)] mx-auto mb-2 shadow-md" />
                        <p className="type-overline mb-2">{teamAName}</p>
                        <AnimatedScore
                            value={teamAPoints}
                            size="hero"
                            team={leader === 'teamA' ? 'usa' : 'neutral'}
                        />
                    </div>

                    {/* Versus */}
                    <div className="versus-divider flex-col">
                        <span className="versus-text">
                            {leader ? (
                                <>
                                    {leader === 'teamA' ? teamAName : teamBName}
                                    <br />
                                    leads
                                </>
                            ) : (
                                'Tied'
                            )}
                        </span>
                        {margin > 0 && (
                            <span className="text-xl font-bold text-ink-secondary mt-1">
                                +{margin}
                            </span>
                        )}
                    </div>

                    {/* Team B */}
                    <div className="text-center">
                        <div className="w-4 h-4 rounded-full bg-[var(--team-europe)] mx-auto mb-2 shadow-md" />
                        <p className="type-overline mb-2">{teamBName}</p>
                        <AnimatedScore
                            value={teamBPoints}
                            size="hero"
                            team={leader === 'teamB' ? 'europe' : 'neutral'}
                        />
                    </div>
                </div>
            </div>

            {/* Progress Bars */}
            <div className="px-6 pb-4 space-y-4">
                <PremiumProgressBar
                    value={teamAPoints}
                    max={pointsToWin}
                    target={pointsToWin}
                    team="usa"
                />
                <PremiumProgressBar
                    value={teamBPoints}
                    max={pointsToWin}
                    target={pointsToWin}
                    team="europe"
                />
            </div>

            {/* Magic Number Section */}
            <div className="border-t border-rule p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4 text-[var(--masters)]" />
                    <span className="type-caption font-semibold">Points to Clinch</span>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 rounded-xl bg-[var(--team-usa)]/5 border border-[var(--team-usa)]/10">
                        <p className="text-2xl font-bold text-[var(--team-usa)]">
                            {teamAClinched ? (
                                <span className="text-green-600">✓</span>
                            ) : (
                                teamANeeded.toFixed(1)
                            )}
                        </p>
                        <p className="type-micro mt-1">
                            {teamAClinched ? 'Clinched!' : `${teamAName} needs`}
                        </p>
                    </div>
                    <div className="text-center p-3 rounded-xl bg-[var(--team-europe)]/5 border border-[var(--team-europe)]/10">
                        <p className="text-2xl font-bold text-[var(--team-europe)]">
                            {teamBClinched ? (
                                <span className="text-green-600">✓</span>
                            ) : (
                                teamBNeeded.toFixed(1)
                            )}
                        </p>
                        <p className="type-micro mt-1">
                            {teamBClinched ? 'Clinched!' : `${teamBName} needs`}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================
// PREMIUM MATCH CARD
// ============================================

interface PremiumMatchCardProps {
    matchNumber: number;
    teamAPlayers: string[];
    teamBPlayers: string[];
    score: string;
    holesPlayed: number;
    status: 'not_started' | 'in_progress' | 'completed';
    leader?: 'teamA' | 'teamB' | null;
    isDormie?: boolean;
    holeResults?: { holeNumber: number; winner: HoleWinner }[];
    onClick?: () => void;
    className?: string;
}

export function PremiumMatchCard({
    matchNumber,
    teamAPlayers,
    teamBPlayers,
    score,
    holesPlayed,
    status,
    leader,
    isDormie,
    holeResults = [],
    onClick,
    className,
}: PremiumMatchCardProps) {
    const isLive = status === 'in_progress';
    const isCompleted = status === 'completed';

    return (
        <div
            onClick={onClick}
            className={cn(
                'match-card-premium',
                isLive && 'live',
                className
            )}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
        >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
                <span className="type-overline">Match {matchNumber}</span>
                <div className="flex items-center gap-2">
                    {isLive && <span className="live-premium">LIVE</span>}
                    {isDormie && (
                        <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full">
                            Dormie
                        </span>
                    )}
                    {isCompleted && (
                        <span className="px-2 py-0.5 text-xs font-semibold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 rounded-full">
                            Final
                        </span>
                    )}
                    {status === 'not_started' && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-canvas-sunken text-ink-tertiary rounded-full">
                            Not Started
                        </span>
                    )}
                </div>
            </div>

            {/* Teams and Score */}
            <div className="flex items-stretch gap-3">
                {/* Team A */}
                <div
                    className={cn(
                        'flex-1 p-3 rounded-lg border-l-4',
                        leader === 'teamA'
                            ? 'bg-[var(--team-usa)]/10 border-[var(--team-usa)]'
                            : 'bg-canvas-sunken/50 border-[var(--team-usa)]/30'
                    )}
                >
                    <div className="flex items-center gap-1.5 mb-1.5">
                        <Circle className="w-2 h-2 fill-[var(--team-usa)] text-[var(--team-usa)]" />
                        <span className="type-micro font-semibold text-[var(--team-usa)]">USA</span>
                    </div>
                    <div className="space-y-0.5">
                        {teamAPlayers.map((player, i) => (
                            <p key={i} className="type-body-sm font-medium truncate">
                                {player}
                            </p>
                        ))}
                    </div>
                </div>

                {/* Score */}
                <div className="flex flex-col items-center justify-center px-4 min-w-[80px]">
                    <span
                        className={cn(
                            'text-2xl font-bold tabular-nums',
                            leader === 'teamA' && 'text-[var(--team-usa)]',
                            leader === 'teamB' && 'text-[var(--team-europe)]',
                            !leader && 'text-ink-secondary'
                        )}
                    >
                        {score}
                    </span>
                    {holesPlayed > 0 && (
                        <span className="type-micro text-ink-tertiary mt-1">
                            thru {holesPlayed}
                        </span>
                    )}
                </div>

                {/* Team B */}
                <div
                    className={cn(
                        'flex-1 p-3 rounded-lg border-r-4 text-right',
                        leader === 'teamB'
                            ? 'bg-[var(--team-europe)]/10 border-[var(--team-europe)]'
                            : 'bg-canvas-sunken/50 border-[var(--team-europe)]/30'
                    )}
                >
                    <div className="flex items-center justify-end gap-1.5 mb-1.5">
                        <span className="type-micro font-semibold text-[var(--team-europe)]">EUR</span>
                        <Circle className="w-2 h-2 fill-[var(--team-europe)] text-[var(--team-europe)]" />
                    </div>
                    <div className="space-y-0.5">
                        {teamBPlayers.map((player, i) => (
                            <p key={i} className="type-body-sm font-medium truncate">
                                {player}
                            </p>
                        ))}
                    </div>
                </div>
            </div>

            {/* Hole Progress Strip */}
            {holesPlayed > 0 && (
                <div className="mt-3 pt-3 border-t border-rule-faint">
                    <HoleProgressStrip
                        results={holeResults}
                        currentHole={isLive ? holesPlayed + 1 : undefined}
                        size="sm"
                    />
                </div>
            )}

            {/* Footer with navigation hint */}
            <div className="flex items-center justify-end mt-3 text-ink-tertiary group-hover:text-ink-secondary">
                <span className="type-micro mr-1">View details</span>
                <ChevronRight className="w-4 h-4 row-chevron" />
            </div>
        </div>
    );
}

// ============================================
// PAGE TRANSITION WRAPPER
// ============================================

interface PageTransitionProps {
    children: React.ReactNode;
    direction?: 'up' | 'left' | 'right';
    className?: string;
}

export function PageTransition({
    children,
    direction = 'up',
    className,
}: PageTransitionProps) {
    const animationClass = {
        up: 'page-premium-enter',
        left: 'slide-premium-left',
        right: 'slide-premium-right',
    }[direction];

    return (
        <div className={cn(animationClass, className)}>
            {children}
        </div>
    );
}

// ============================================
// PREMIUM SECTION HEADER
// ============================================

interface PremiumSectionHeaderProps {
    title: string;
    subtitle?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    icon?: React.ReactNode;
    className?: string;
}

export function PremiumSectionHeader({
    title,
    subtitle,
    action,
    icon,
    className,
}: PremiumSectionHeaderProps) {
    return (
        <div className={cn('flex items-center justify-between mb-4', className)}>
            <div className="flex items-center gap-3">
                {icon && (
                    <div className="w-10 h-10 rounded-xl bg-[var(--masters)]/10 flex items-center justify-center">
                        {icon}
                    </div>
                )}
                <div>
                    <h2 className="type-title">{title}</h2>
                    {subtitle && <p className="type-caption text-ink-secondary">{subtitle}</p>}
                </div>
            </div>
            {action && (
                <button
                    onClick={action.onClick}
                    className="type-caption font-medium text-[var(--masters)] hover:text-[var(--masters-hover)] transition-colors flex items-center gap-1"
                >
                    {action.label}
                    <ChevronRight className="w-4 h-4" />
                </button>
            )}
        </div>
    );
}

// ============================================
// PREMIUM EMPTY STATE
// ============================================

interface PremiumEmptyStateProps {
    icon?: React.ReactNode;
    title: string;
    description: string;
    action?: {
        label: string;
        onClick: () => void;
    };
    className?: string;
}

export function PremiumEmptyState({
    icon,
    title,
    description,
    action,
    className,
}: PremiumEmptyStateProps) {
    return (
        <div className={cn('text-center py-12 px-6', className)}>
            {icon && (
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-canvas-sunken flex items-center justify-center text-ink-tertiary">
                    {icon}
                </div>
            )}
            <h3 className="type-title mb-2">{title}</h3>
            <p className="type-body-sm text-ink-secondary max-w-sm mx-auto mb-6">{description}</p>
            {action && (
                <button onClick={action.onClick} className="btn-premium">
                    {action.label}
                </button>
            )}
        </div>
    );
}

// ============================================
// EXPORTS
// ============================================

export default {
    PremiumLiveMatchBanner,
    HoleProgressStrip,
    PremiumProgressBar,
    AnimatedScore,
    PremiumStandingsCard,
    PremiumMatchCard,
    PageTransition,
    PremiumSectionHeader,
    PremiumEmptyState,
};
