/**
 * Momentum Meter Component
 *
 * Visual indicator showing match momentum and streaks.
 * Updates in real-time as holes are played.
 */

'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus, Flame, Zap, Target } from 'lucide-react';
import type { HoleResult } from '@/lib/types/models';

// ============================================
// TYPES
// ============================================

interface MomentumMeterProps {
    holeResults: HoleResult[];
    teamAName?: string;
    teamBName?: string;
    compact?: boolean;
    className?: string;
}

interface MomentumData {
    currentMomentum: number; // -5 to 5 scale
    teamAStreak: number;
    teamBStreak: number;
    lastFiveResults: Array<'teamA' | 'teamB' | 'halved'>;
    trend: 'teamA' | 'teamB' | 'neutral';
    isHot: 'teamA' | 'teamB' | null;
}

// ============================================
// COMPONENT
// ============================================

export function MomentumMeter({
    holeResults,
    teamAName = 'USA',
    teamBName = 'EUR',
    compact = false,
    className,
}: MomentumMeterProps) {
    const momentum = useMemo(() => calculateMomentum(holeResults), [holeResults]);

    if (compact) {
        return (
            <CompactMomentum
                momentum={momentum}
                teamAName={teamAName}
                teamBName={teamBName}
                className={className}
            />
        );
    }

    return (
        <div className={cn('p-4 rounded-xl bg-surface-card border border-surface-200 dark:border-surface-700', className)}>
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h4 className="font-medium flex items-center gap-2">
                    <Zap className="w-5 h-5 text-secondary-gold" />
                    Momentum
                </h4>
                {momentum.isHot && (
                    <div
                        className={cn(
                            'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                            momentum.isHot === 'teamA'
                                ? 'bg-team-usa/10 text-team-usa'
                                : 'bg-team-europe/10 text-team-europe'
                        )}
                    >
                        <Flame className="w-3 h-3" />
                        {momentum.isHot === 'teamA' ? teamAName : teamBName} is hot!
                    </div>
                )}
            </div>

            {/* Momentum bar */}
            <div className="relative h-8 rounded-full bg-surface-100 dark:bg-surface-800 overflow-hidden">
                {/* Center line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-px bg-surface-300 dark:bg-surface-600 z-10" />

                {/* Momentum indicator */}
                <div
                    className={cn(
                        'absolute top-1 bottom-1 rounded-full transition-all duration-500',
                        momentum.currentMomentum > 0 ? 'bg-team-usa' : 'bg-team-europe'
                    )}
                    style={{
                        left: momentum.currentMomentum > 0 ? '50%' : `calc(50% - ${Math.abs(momentum.currentMomentum) * 10}%)`,
                        width: `${Math.abs(momentum.currentMomentum) * 10}%`,
                    }}
                />

                {/* Team labels */}
                <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
                    <span className="text-sm font-medium text-team-usa">{teamAName}</span>
                    <span className="text-sm font-medium text-team-europe">{teamBName}</span>
                </div>
            </div>

            {/* Streak indicators */}
            <div className="flex justify-between mt-4">
                <StreakIndicator
                    team="teamA"
                    teamName={teamAName}
                    streak={momentum.teamAStreak}
                />
                <StreakIndicator
                    team="teamB"
                    teamName={teamBName}
                    streak={momentum.teamBStreak}
                />
            </div>

            {/* Last 5 holes visual */}
            <div className="mt-4 pt-4 border-t border-surface-200 dark:border-surface-700">
                <div className="text-xs text-surface-500 mb-2">Last 5 Holes</div>
                <div className="flex justify-center gap-2">
                    {momentum.lastFiveResults.map((result, i) => (
                        <div
                            key={i}
                            className={cn(
                                'w-8 h-8 rounded-full flex items-center justify-center',
                                result === 'teamA' && 'bg-team-usa',
                                result === 'teamB' && 'bg-team-europe',
                                result === 'halved' && 'bg-surface-300 dark:bg-surface-600'
                            )}
                        >
                            {result === 'teamA' && <TrendingUp className="w-4 h-4 text-white" />}
                            {result === 'teamB' && <TrendingDown className="w-4 h-4 text-white" />}
                            {result === 'halved' && <Minus className="w-4 h-4 text-surface-500" />}
                        </div>
                    ))}
                    {momentum.lastFiveResults.length === 0 && (
                        <div className="text-sm text-surface-400">No holes played yet</div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function CompactMomentum({
    momentum,
    teamAName,
    teamBName,
    className,
}: {
    momentum: MomentumData;
    teamAName: string;
    teamBName: string;
    className?: string;
}) {
    if (momentum.lastFiveResults.length === 0) {
        return null;
    }

    return (
        <div className={cn('flex items-center gap-2', className)}>
            {momentum.isHot ? (
                <div
                    className={cn(
                        'flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                        momentum.isHot === 'teamA'
                            ? 'bg-team-usa/10 text-team-usa'
                            : 'bg-team-europe/10 text-team-europe'
                    )}
                >
                    <Flame className="w-3 h-3" />
                    {momentum.isHot === 'teamA' ? teamAName : teamBName}
                </div>
            ) : (
                <div className="flex gap-1">
                    {momentum.lastFiveResults.slice(-3).map((result, i) => (
                        <div
                            key={i}
                            className={cn(
                                'w-4 h-4 rounded-full',
                                result === 'teamA' && 'bg-team-usa',
                                result === 'teamB' && 'bg-team-europe',
                                result === 'halved' && 'bg-surface-300 dark:bg-surface-600'
                            )}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

function StreakIndicator({
    team,
    teamName,
    streak,
}: {
    team: 'teamA' | 'teamB';
    teamName: string;
    streak: number;
}) {
    if (streak < 2) return null;

    return (
        <div
            className={cn(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg',
                team === 'teamA' ? 'bg-team-usa/10' : 'bg-team-europe/10'
            )}
        >
            <Flame
                className={cn(
                    'w-4 h-4',
                    team === 'teamA' ? 'text-team-usa' : 'text-team-europe'
                )}
            />
            <span
                className={cn(
                    'text-sm font-medium',
                    team === 'teamA' ? 'text-team-usa' : 'text-team-europe'
                )}
            >
                {teamName} {streak} hole streak!
            </span>
        </div>
    );
}

// ============================================
// HELPERS
// ============================================

function calculateMomentum(holeResults: HoleResult[]): MomentumData {
    if (holeResults.length === 0) {
        return {
            currentMomentum: 0,
            teamAStreak: 0,
            teamBStreak: 0,
            lastFiveResults: [],
            trend: 'neutral',
            isHot: null,
        };
    }

    // Sort by hole number
    const sortedResults = [...holeResults].sort((a, b) => a.holeNumber - b.holeNumber);

    // Calculate last 5 results
    const lastFive = sortedResults.slice(-5).map((r) => r.winner as 'teamA' | 'teamB' | 'halved');

    // Calculate momentum (weighted by recency)
    let momentum = 0;
    sortedResults.forEach((result, index) => {
        const weight = (index + 1) / sortedResults.length; // More recent = higher weight
        if (result.winner === 'teamA') {
            momentum += weight;
        } else if (result.winner === 'teamB') {
            momentum -= weight;
        }
    });

    // Normalize to -5 to 5 scale
    const normalizedMomentum = Math.max(-5, Math.min(5, momentum * 2));

    // Calculate streaks
    let teamAStreak = 0;
    let teamBStreak = 0;

    for (let i = sortedResults.length - 1; i >= 0; i--) {
        const winner = sortedResults[i].winner;
        if (winner === 'teamA') {
            if (teamBStreak > 0) break;
            teamAStreak++;
        } else if (winner === 'teamB') {
            if (teamAStreak > 0) break;
            teamBStreak++;
        } else {
            // Halved breaks the streak
            break;
        }
    }

    // Determine trend from last 3 holes
    const lastThree = lastFive.slice(-3);
    const teamARecent = lastThree.filter((r) => r === 'teamA').length;
    const teamBRecent = lastThree.filter((r) => r === 'teamB').length;

    let trend: MomentumData['trend'] = 'neutral';
    if (teamARecent > teamBRecent) trend = 'teamA';
    if (teamBRecent > teamARecent) trend = 'teamB';

    // Is someone hot? (3+ hole streak)
    let isHot: MomentumData['isHot'] = null;
    if (teamAStreak >= 3) isHot = 'teamA';
    if (teamBStreak >= 3) isHot = 'teamB';

    return {
        currentMomentum: normalizedMomentum,
        teamAStreak,
        teamBStreak,
        lastFiveResults: lastFive,
        trend,
        isHot,
    };
}

// ============================================
// MATCH PRESSURE INDICATOR
// ============================================

interface PressureIndicatorProps {
    holesRemaining: number;
    scoreDifferential: number; // positive = Team A leads
    className?: string;
}

export function PressureIndicator({ holesRemaining, scoreDifferential, className }: PressureIndicatorProps) {
    const absoluteDiff = Math.abs(scoreDifferential);

    // Calculate pressure level
    let pressure: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let message = '';

    if (absoluteDiff === 0) {
        if (holesRemaining <= 3) {
            pressure = 'critical';
            message = 'All square with few holes left!';
        } else {
            pressure = 'high';
            message = 'All square - every hole matters!';
        }
    } else if (absoluteDiff >= holesRemaining) {
        pressure = 'low';
        message = 'Match likely decided';
    } else if (absoluteDiff === holesRemaining - 1) {
        pressure = 'critical';
        message = 'Dormie situation!';
    } else if (absoluteDiff <= 2 && holesRemaining <= 5) {
        pressure = 'high';
        message = 'Close match heading to finish!';
    } else {
        pressure = 'medium';
    }

    const pressureConfig = {
        low: { color: 'text-success', bg: 'bg-success/10', icon: Target },
        medium: { color: 'text-warning', bg: 'bg-warning/10', icon: Zap },
        high: { color: 'text-orange-500', bg: 'bg-orange-500/10', icon: Flame },
        critical: { color: 'text-error', bg: 'bg-error/10', icon: Flame },
    };

    const config = pressureConfig[pressure];
    const Icon = config.icon;

    if (!message) return null;

    return (
        <div className={cn('flex items-center gap-2 p-3 rounded-lg', config.bg, className)}>
            <Icon className={cn('w-5 h-5', config.color)} />
            <span className={cn('text-sm font-medium', config.color)}>{message}</span>
        </div>
    );
}

// Export barrel
export { calculateMomentum };
export default MomentumMeter;
