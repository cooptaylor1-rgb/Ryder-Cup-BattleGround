/**
 * Smart Pace-of-Play Spacing
 *
 * Calculate optimal tee time intervals based on group composition.
 * Helps prevent slow play and course bottlenecks.
 *
 * Features:
 * - Skill-based interval calculation
 * - Format-specific timing adjustments
 * - Course difficulty factor
 * - Visual pace timeline
 * - Optimization suggestions
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    Clock,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    Check,
    BarChart3,
    Settings,
    Zap,
    Info,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

export type MatchFormat = 'singles' | 'foursomes' | 'fourball';

export interface PaceGroup {
    id: string;
    matchNumber: number;
    format: MatchFormat;
    players: {
        id: string;
        name: string;
        handicapIndex: number;
        averagePace?: number; // minutes per hole
    }[];
    scheduledTeeTime?: string;
    suggestedInterval?: number;
}

export interface PaceSettings {
    baseInterval: number; // minutes between groups
    formatAdjustments: Record<MatchFormat, number>;
    skillAdjustmentFactor: number; // multiplier per 5 handicap difference
    courseDifficultyFactor: number; // 1.0 = normal, 1.2 = difficult
    minInterval: number;
    maxInterval: number;
}

interface PaceSpacingProps {
    groups: PaceGroup[];
    firstTeeTime?: string;
    settings?: Partial<PaceSettings>;
    onUpdateSchedule?: (groups: PaceGroup[]) => void;
    className?: string;
}

// ============================================
// DEFAULT SETTINGS
// ============================================

const DEFAULT_SETTINGS: PaceSettings = {
    baseInterval: 10, // 10 minutes standard
    formatAdjustments: {
        singles: 0, // No adjustment for singles
        foursomes: -1, // Faster - only 2 balls
        fourball: 2, // Slower - 4 balls in play
    },
    skillAdjustmentFactor: 0.5, // +30 seconds per 5 handicap
    courseDifficultyFactor: 1.0,
    minInterval: 7,
    maxInterval: 15,
};

// ============================================
// UTILITIES
// ============================================

function calculateGroupPace(group: PaceGroup, settings: PaceSettings): number {
    // Base interval
    let interval = settings.baseInterval;

    // Format adjustment
    interval += settings.formatAdjustments[group.format];

    // Skill adjustment based on average handicap
    const avgHandicap = group.players.reduce((sum, p) => sum + p.handicapIndex, 0) / group.players.length;
    const handicapAdjustment = (avgHandicap / 5) * settings.skillAdjustmentFactor;
    interval += handicapAdjustment;

    // Course difficulty
    interval *= settings.courseDifficultyFactor;

    // Clamp to min/max
    return Math.min(settings.maxInterval, Math.max(settings.minInterval, Math.round(interval)));
}

function addMinutesToTime(timeStr: string, minutes: number): string {
    const [hours, mins] = timeStr.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
}

function getPaceIndicator(interval: number, baseInterval: number): {
    icon: React.ReactNode;
    label: string;
    color: string;
} {
    const diff = interval - baseInterval;
    if (diff <= -2) {
        return { icon: <TrendingDown className="w-4 h-4" />, label: 'Fast', color: '#22c55e' };
    }
    if (diff >= 2) {
        return { icon: <TrendingUp className="w-4 h-4" />, label: 'Slow', color: '#f59e0b' };
    }
    return { icon: <Check className="w-4 h-4" />, label: 'Normal', color: 'var(--masters)' };
}

// ============================================
// PACE GROUP CARD
// ============================================

interface PaceGroupCardProps {
    group: PaceGroup;
    calculatedInterval: number;
    teeTime: string;
    settings: PaceSettings;
}

function PaceGroupCard({ group, calculatedInterval, teeTime, settings }: PaceGroupCardProps) {
    const paceIndicator = getPaceIndicator(calculatedInterval, settings.baseInterval);
    const avgHandicap = group.players.reduce((sum, p) => sum + p.handicapIndex, 0) / group.players.length;

    return (
        <div
            className="p-4 rounded-xl bg-[var(--surface)] border border-[rgba(128,120,104,0.2)]"
        >
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center font-bold bg-[var(--canvas)] text-[var(--ink)]"
                    >
                        #{group.matchNumber}
                    </div>
                    <div>
                        <p className="font-semibold text-[var(--ink)]">
                            {teeTime}
                        </p>
                        <p className="text-sm capitalize text-[var(--ink-muted)]">
                            {group.format}
                        </p>
                    </div>
                </div>
                <div
                    className="flex items-center gap-1.5 px-2 py-1 rounded-full text-sm"
                    style={{ background: `${paceIndicator.color}20`, color: paceIndicator.color }}
                >
                    {paceIndicator.icon}
                    {paceIndicator.label}
                </div>
            </div>

            {/* Players */}
            <div className="flex flex-wrap gap-2 mb-3">
                {group.players.map(player => (
                    <span
                        key={player.id}
                        className="px-2 py-1 rounded text-sm bg-[var(--canvas)] text-[var(--ink)]"
                    >
                        {player.name} ({player.handicapIndex})
                    </span>
                ))}
            </div>

            {/* Stats */}
            <div className="flex items-center gap-4 text-sm text-[var(--ink-muted)]">
                <span className="flex items-center gap-1">
                    <BarChart3 className="w-4 h-4" />
                    Avg HCP: {avgHandicap.toFixed(1)}
                </span>
                <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {calculatedInterval} min interval
                </span>
            </div>
        </div>
    );
}

// ============================================
// PACE SPACING COMPONENT
// ============================================

export function PaceSpacing({
    groups,
    firstTeeTime = '08:00',
    settings: customSettings,
    onUpdateSchedule,
    className,
}: PaceSpacingProps) {
    const settings = { ...DEFAULT_SETTINGS, ...customSettings };
    const [showSettings, setShowSettings] = useState(false);
    const [localSettings, setLocalSettings] = useState(settings);

    // Calculate intervals for all groups
    const scheduledGroups = useMemo(() => {
        return groups.reduce<Array<typeof groups[0] & { suggestedInterval: number; scheduledTeeTime: string }>>((acc, group, idx) => {
            const interval = calculateGroupPace(group, localSettings);
            const prevTime = idx === 0 ? firstTeeTime : acc[idx - 1].scheduledTeeTime;
            const teeTime = idx === 0 ? prevTime : addMinutesToTime(prevTime, interval);

            acc.push({
                ...group,
                suggestedInterval: interval,
                scheduledTeeTime: teeTime,
            });
            return acc;
        }, []);
    }, [groups, firstTeeTime, localSettings]);

    // Calculate total round time
    const totalTime = useMemo(() => {
        const intervals = scheduledGroups.map(g => g.suggestedInterval || 10);
        const totalIntervalTime = intervals.reduce((sum, i) => sum + i, 0);
        const playTimeMinutes = 4 * 60 + 30; // 4.5 hours average round
        const lastGroupFinish = totalIntervalTime + playTimeMinutes;
        return {
            lastTeeTime: scheduledGroups[scheduledGroups.length - 1]?.scheduledTeeTime || firstTeeTime,
            estimatedFinish: addMinutesToTime(firstTeeTime, lastGroupFinish - (scheduledGroups[0]?.suggestedInterval || 0)),
            avgInterval: (totalIntervalTime / groups.length).toFixed(1),
        };
    }, [scheduledGroups, firstTeeTime, groups.length]);

    // Check for potential bottlenecks
    const bottlenecks = useMemo(() => {
        const issues: string[] = [];

        scheduledGroups.forEach((group, idx) => {
            if (idx === 0) return;
            const prevGroup = scheduledGroups[idx - 1];
            const prevInterval = prevGroup.suggestedInterval || 10;
            const currInterval = group.suggestedInterval || 10;

            // Check if slow group follows fast group
            if (prevInterval < localSettings.baseInterval && currInterval > localSettings.baseInterval + 2) {
                issues.push(`Match ${group.matchNumber} (${group.format}) may catch up to Match ${prevGroup.matchNumber}`);
            }
        });

        return issues;
    }, [scheduledGroups, localSettings.baseInterval]);

    const handleOptimize = useCallback(() => {
        // Sort groups by expected pace (fastest first, then slot slower ones with buffers)
        const optimized = [...scheduledGroups].sort((a, b) => {
            const aInterval = a.suggestedInterval || 10;
            const bInterval = b.suggestedInterval || 10;
            return aInterval - bInterval;
        });

        // Re-number and recalculate times
        let currentTime = firstTeeTime;
        const reScheduled = optimized.map((group, idx) => {
            const interval = group.suggestedInterval || 10;
            const teeTime = idx === 0 ? currentTime : addMinutesToTime(currentTime, interval);
            currentTime = teeTime;

            return {
                ...group,
                matchNumber: idx + 1,
                scheduledTeeTime: teeTime,
            };
        });

        onUpdateSchedule?.(reScheduled);
    }, [scheduledGroups, firstTeeTime, onUpdateSchedule]);

    return (
        <div className={cn('flex flex-col', className)}>
            {/* Header */}
            <div className="p-4 border-b" style={{ borderColor: 'rgba(128, 120, 104, 0.2)' }}>
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h2 className="text-lg font-semibold" style={{ color: 'var(--ink)' }}>
                            Pace of Play
                        </h2>
                        <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
                            {groups.length} groups • First tee: {firstTeeTime}
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleOptimize}
                            className="p-2 rounded-lg hover:bg-[color:var(--ink)]/5 transition-colors"
                            title="Optimize order"
                        >
                            <Zap className="w-5 h-5" style={{ color: 'var(--masters)' }} />
                        </button>
                        <button
                            onClick={() => setShowSettings(!showSettings)}
                            className={cn(
                                'p-2 rounded-lg transition-colors',
                                showSettings ? 'bg-[color:var(--ink)]/10' : 'hover:bg-[color:var(--ink)]/5'
                            )}
                        >
                            <Settings className="w-5 h-5" style={{ color: 'var(--ink-muted)' }} />
                        </button>
                    </div>
                </div>

                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg" style={{ background: 'var(--surface)' }}>
                        <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--ink-muted)' }}>
                            Last Tee
                        </p>
                        <p className="text-lg font-bold" style={{ color: 'var(--ink)' }}>
                            {totalTime.lastTeeTime}
                        </p>
                    </div>
                    <div className="p-3 rounded-lg" style={{ background: 'var(--surface)' }}>
                        <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--ink-muted)' }}>
                            Est. Finish
                        </p>
                        <p className="text-lg font-bold" style={{ color: 'var(--ink)' }}>
                            {totalTime.estimatedFinish}
                        </p>
                    </div>
                    <div className="p-3 rounded-lg" style={{ background: 'var(--surface)' }}>
                        <p className="text-xs uppercase tracking-wide mb-1" style={{ color: 'var(--ink-muted)' }}>
                            Avg Interval
                        </p>
                        <p className="text-lg font-bold" style={{ color: 'var(--ink)' }}>
                            {totalTime.avgInterval}m
                        </p>
                    </div>
                </div>
            </div>

            {/* Settings Panel */}
            {showSettings && (
                <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-b"
                    style={{ borderColor: 'rgba(128, 120, 104, 0.2)', background: 'var(--surface)' }}
                >
                    <div className="p-4 space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink-muted)' }}>
                                Base Interval (minutes)
                            </label>
                            <input
                                type="range"
                                min="7"
                                max="15"
                                value={localSettings.baseInterval}
                                onChange={(e) => setLocalSettings(prev => ({ ...prev, baseInterval: Number(e.target.value) }))}
                                className="w-full"
                            />
                            <div className="flex justify-between text-xs" style={{ color: 'var(--ink-muted)' }}>
                                <span>7 min</span>
                                <span className="font-medium">{localSettings.baseInterval} min</span>
                                <span>15 min</span>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink-muted)' }}>
                                Course Difficulty
                            </label>
                            <div className="flex gap-2">
                                {[
                                    { value: 0.9, label: 'Easy' },
                                    { value: 1.0, label: 'Normal' },
                                    { value: 1.1, label: 'Hard' },
                                    { value: 1.2, label: 'Very Hard' },
                                ].map(opt => (
                                    <button
                                        key={opt.value}
                                        onClick={() => setLocalSettings(prev => ({ ...prev, courseDifficultyFactor: opt.value }))}
                                        className={cn(
                                            'flex-1 py-2 rounded-lg text-sm font-medium transition-colors'
                                        )}
                                        style={{
                                            background: localSettings.courseDifficultyFactor === opt.value ? 'var(--masters-muted)' : 'var(--canvas)',
                                            color: localSettings.courseDifficultyFactor === opt.value ? 'var(--masters)' : 'var(--ink)',
                                        }}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Bottleneck Warnings */}
            {bottlenecks.length > 0 && (
                <div className="p-4 border-b" style={{ borderColor: 'rgba(128, 120, 104, 0.2)', background: 'rgba(251, 191, 36, 0.1)' }}>
                    <div className="flex items-center gap-2 mb-2">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <span className="text-sm font-medium text-amber-600">Potential Bottlenecks</span>
                    </div>
                    <ul className="space-y-1">
                        {bottlenecks.map((issue, idx) => (
                            <li key={idx} className="text-sm text-amber-600 flex items-start gap-2">
                                <span>•</span>
                                {issue}
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Timeline */}
            <div className="flex-1 overflow-y-auto p-4">
                <div className="relative">
                    {/* Timeline line */}
                    <div
                        className="absolute left-5 top-0 bottom-0 w-0.5"
                        style={{ background: 'rgba(128, 120, 104, 0.2)' }}
                    />

                    {/* Groups */}
                    <div className="space-y-4">
                        {scheduledGroups.map((group, idx) => (
                            <div key={group.id} className="relative pl-12">
                                {/* Timeline dot */}
                                <div
                                    className="absolute left-3 top-5 w-4 h-4 rounded-full border-2 bg-[var(--canvas)]"
                                    style={{
                                        borderColor: getPaceIndicator(group.suggestedInterval || 10, localSettings.baseInterval).color,
                                    }}
                                />

                                {/* Interval indicator */}
                                {idx > 0 && (
                                    <div
                                        className="absolute left-8 -top-2 text-xs px-1.5 py-0.5 rounded bg-[var(--canvas)] text-[var(--ink-muted)]"
                                    >
                                        +{group.suggestedInterval}m
                                    </div>
                                )}

                                <PaceGroupCard
                                    group={group}
                                    calculatedInterval={group.suggestedInterval || 10}
                                    teeTime={group.scheduledTeeTime || firstTeeTime}
                                    settings={localSettings}
                                />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Info Footer */}
            <div className="p-4 border-t border-[rgba(128,120,104,0.2)] bg-[var(--surface)]">
                <div className="flex items-start gap-2 text-sm text-[var(--ink-muted)]">
                    <Info className="w-4 h-4 mt-0.5 shrink-0" />
                    <p>
                        Intervals are calculated based on format, average handicap, and course difficulty.
                        Fourball formats require longer intervals due to 4 balls in play.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default PaceSpacing;
