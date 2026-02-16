'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Clock,
    Timer,
    Users,
    Sunrise,
    Sun,
    Sunset,
    ChevronUp,
    ChevronDown,
    RefreshCw,
    Info,
    Check,
    Shuffle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TeeTimeSettings {
    firstTeeTime: string;
    interval: number; // minutes between groups
    format: 'sequential' | 'shotgun' | 'split-tees';
    splitTeeHoles?: [number, number]; // e.g., [1, 10]
    breakBetweenSessions: number; // minutes
    estimatedRoundTime: number; // minutes
    timezone: string;
}

interface TeeTimePreferencesProps {
    settings: TeeTimeSettings;
    onSettingsChange: (settings: TeeTimeSettings) => void;
    matchCount?: number;
    playersPerMatch?: number;
    className?: string;
}

const DEFAULT_SETTINGS: TeeTimeSettings = {
    firstTeeTime: '08:00',
    interval: 10,
    format: 'sequential',
    splitTeeHoles: [1, 10],
    breakBetweenSessions: 60,
    estimatedRoundTime: 240,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
};

const INTERVAL_OPTIONS = [
    { value: 7, label: '7 min', desc: 'Tight spacing' },
    { value: 8, label: '8 min', desc: 'Standard' },
    { value: 10, label: '10 min', desc: 'Comfortable' },
    { value: 12, label: '12 min', desc: 'Relaxed' },
    { value: 15, label: '15 min', desc: 'Very relaxed' },
];

const QUICK_TIMES = [
    { time: '07:00', icon: <Sunrise className="w-4 h-4" />, label: 'Early Bird' },
    { time: '08:00', icon: <Sun className="w-4 h-4" />, label: 'Morning' },
    { time: '09:30', icon: <Sun className="w-4 h-4" />, label: 'Mid-Morning' },
    { time: '12:00', icon: <Sun className="w-4 h-4" />, label: 'Noon' },
    { time: '14:00', icon: <Sunset className="w-4 h-4" />, label: 'Afternoon' },
];

const FORMAT_OPTIONS: {
    format: TeeTimeSettings['format'];
    label: string;
    description: string;
    icon: React.ReactNode;
}[] = [
        {
            format: 'sequential',
            label: 'Sequential Tees',
            description: 'Groups start one after another from hole 1',
            icon: <Timer className="w-5 h-5" />,
        },
        {
            format: 'shotgun',
            label: 'Shotgun Start',
            description: 'All groups start simultaneously on different holes',
            icon: <Shuffle className="w-5 h-5" />,
        },
        {
            format: 'split-tees',
            label: 'Split Tees',
            description: 'Half start on hole 1, half on hole 10',
            icon: <RefreshCw className="w-5 h-5" />,
        },
    ];

export function TeeTimePreferences({
    settings,
    onSettingsChange,
    matchCount = 4,
    playersPerMatch = 4,
    className,
}: TeeTimePreferencesProps) {
    const [showAdvanced, setShowAdvanced] = useState(false);

    const updateSetting = useCallback(<K extends keyof TeeTimeSettings>(
        key: K,
        value: TeeTimeSettings[K]
    ) => {
        onSettingsChange({ ...settings, [key]: value });
    }, [settings, onSettingsChange]);

    const adjustTime = useCallback((minutes: number) => {
        const [hours, mins] = settings.firstTeeTime.split(':').map(Number);
        const totalMins = hours * 60 + mins + minutes;
        const newHours = Math.floor((totalMins + 1440) % 1440 / 60);
        const newMins = (totalMins + 1440) % 60;
        updateSetting('firstTeeTime',
            `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`
        );
    }, [settings.firstTeeTime, updateSetting]);

    // Calculate schedule preview
    const schedulePreview = useMemo(() => {
        const [hours, mins] = settings.firstTeeTime.split(':').map(Number);
        const startMinutes = hours * 60 + mins;
        const groups: { group: number; teeTime: string; finishTime: string }[] = [];

        for (let i = 0; i < matchCount; i++) {
            let groupStartMins = startMinutes;

            if (settings.format === 'sequential') {
                groupStartMins += i * settings.interval;
            } else if (settings.format === 'split-tees') {
                groupStartMins += Math.floor(i / 2) * settings.interval;
            }
            // Shotgun: all same time

            const finishMins = groupStartMins + settings.estimatedRoundTime;

            const formatTime = (mins: number) => {
                const h = Math.floor(mins / 60) % 24;
                const m = mins % 60;
                return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
            };

            groups.push({
                group: i + 1,
                teeTime: formatTime(groupStartMins),
                finishTime: formatTime(finishMins),
            });
        }

        const lastFinish = groups[groups.length - 1]?.finishTime || settings.firstTeeTime;

        return { groups, lastFinish };
    }, [settings, matchCount]);

    return (
        <div className={cn('space-y-4', className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Clock className="w-5 h-5 text-[var(--masters)]" />
                        Tee Time Preferences
                    </h3>
                    <p className="text-sm text-[var(--ink-tertiary)]">Set starting times and intervals</p>
                </div>
            </div>

            {/* Quick time buttons */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                {QUICK_TIMES.map(({ time, icon, label }) => (
                    <button
                        key={time}
                        onClick={() => updateSetting('firstTeeTime', time)}
                        className={cn(
                            'shrink-0 px-3 py-2 rounded-full transition-colors text-sm flex items-center gap-2',
                            settings.firstTeeTime === time
                                ? 'bg-[color:var(--masters)] text-[var(--canvas)]'
                                : 'bg-[var(--surface-secondary)] hover:bg-[var(--surface-raised)]'
                        )}
                    >
                        {icon}
                        {label}
                    </button>
                ))}
            </div>

            {/* First tee time */}
            <div className="card p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium">First Tee Time</p>
                        <p className="text-sm text-[var(--ink-tertiary)]">When the first group starts</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => adjustTime(-30)}
                            className="p-2 rounded-lg bg-[var(--surface-secondary)] hover:bg-[var(--surface-raised)] transition-colors"
                        >
                            <ChevronDown className="w-4 h-4" />
                        </button>
                        <input
                            type="time"
                            value={settings.firstTeeTime}
                            onChange={(e) => updateSetting('firstTeeTime', e.target.value)}
                            className="input text-center text-xl font-mono font-bold w-28"
                        />
                        <button
                            onClick={() => adjustTime(30)}
                            className="p-2 rounded-lg bg-[var(--surface-secondary)] hover:bg-[var(--surface-raised)] transition-colors"
                        >
                            <ChevronUp className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Interval selector */}
            <div className="card p-4 space-y-3">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium">Tee Interval</p>
                        <p className="text-sm text-[var(--ink-tertiary)]">Time between groups</p>
                    </div>
                    <span className="text-lg font-bold text-[var(--masters)]">{settings.interval} min</span>
                </div>
                <div className="flex gap-2">
                    {INTERVAL_OPTIONS.map((option) => (
                        <button
                            key={option.value}
                            onClick={() => updateSetting('interval', option.value)}
                            className={cn(
                                'flex-1 py-2 px-1 rounded-lg text-center transition-all',
                                settings.interval === option.value
                                    ? 'bg-[color:var(--masters)] text-[var(--canvas)]'
                                    : 'bg-[var(--surface-secondary)] hover:bg-[var(--surface-raised)]'
                            )}
                        >
                            <p className="font-medium text-sm">{option.label}</p>
                            <p
                                className={cn(
                                    'text-xs mt-0.5',
                                    settings.interval === option.value
                                        ? 'text-[color:var(--canvas)]/80'
                                        : 'text-[var(--ink-tertiary)]'
                                )}
                            >
                                {option.desc}
                            </p>
                        </button>
                    ))}
                </div>
            </div>

            {/* Format selection */}
            <div className="card p-4 space-y-3">
                <p className="font-medium">Start Format</p>
                <div className="space-y-2">
                    {FORMAT_OPTIONS.map((option) => (
                        <button
                            key={option.format}
                            onClick={() => updateSetting('format', option.format)}
                            className={cn(
                                'w-full p-3 rounded-xl border-2 text-left transition-all',
                                settings.format === option.format
                                    ? 'border-[color:var(--masters)] bg-[color:var(--masters)]/10'
                                    : 'border-[var(--rule)] hover:border-[color:var(--masters)]/50'
                            )}
                        >
                            <div className="flex items-center gap-3">
                                <div
                                    className={cn(
                                        'w-10 h-10 rounded-xl flex items-center justify-center',
                                        settings.format === option.format
                                            ? 'bg-[color:var(--masters)] text-[var(--canvas)]'
                                            : 'bg-[var(--surface-secondary)] text-[var(--ink-tertiary)]'
                                    )}
                                >
                                    {option.icon}
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-sm">{option.label}</p>
                                    <p className="text-xs text-[var(--ink-tertiary)]">{option.description}</p>
                                </div>
                                {settings.format === option.format && (
                                    <Check className="w-5 h-5 text-[var(--masters)]" />
                                )}
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Schedule preview */}
            <div className="card overflow-hidden">
                <div className="p-3 border-b border-[var(--rule)] flex items-center justify-between">
                    <p className="font-medium text-sm">Schedule Preview</p>
                    <span className="text-xs text-[var(--ink-tertiary)]">
                        Est. finish: {schedulePreview.lastFinish}
                    </span>
                </div>
                <div className="divide-y divide-[color:var(--rule)]/40 max-h-48 overflow-y-auto">
                    {schedulePreview.groups.map(({ group, teeTime, finishTime }) => (
                        <div key={group} className="p-3 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-[var(--surface-secondary)] flex items-center justify-center">
                                    <Users className="w-4 h-4 text-[var(--ink-tertiary)]" />
                                </div>
                                <div>
                                    <p className="font-medium text-sm">Group {group}</p>
                                    <p className="text-xs text-[var(--ink-tertiary)]">
                                        {settings.format === 'split-tees' && (
                                            <span>Hole {group % 2 === 1 ? '1' : '10'} • </span>
                                        )}
                                        {settings.format === 'shotgun' && <span>Hole {group} • </span>}
                                        {playersPerMatch} players
                                    </p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="font-mono font-bold text-[var(--masters)]">{teeTime}</p>
                                <p className="text-xs text-[var(--ink-tertiary)]">→ {finishTime}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Advanced settings */}
            <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-sm text-[var(--masters)] hover:text-[var(--masters)]/80 flex items-center gap-1"
            >
                {showAdvanced ? 'Hide' : 'Show'} advanced settings
                <ChevronDown
                    className={cn('w-4 h-4 transition-transform', showAdvanced && 'rotate-180')}
                />
            </button>

            <AnimatePresence>
                {showAdvanced && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="card p-4 space-y-4">
                            {/* Round time estimate */}
                            <div>
                                <label className="text-sm font-medium mb-2 block">Estimated Round Time</label>
                                <div className="flex gap-2">
                                    {[180, 210, 240, 270, 300].map((mins) => (
                                        <button
                                            key={mins}
                                            onClick={() => updateSetting('estimatedRoundTime', mins)}
                                            className={cn(
                                                'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                                                settings.estimatedRoundTime === mins
                                                    ? 'bg-[color:var(--masters)] text-[var(--canvas)]'
                                                    : 'bg-[var(--surface-secondary)] hover:bg-[var(--surface-raised)]'
                                            )}
                                        >
                                            {Math.floor(mins / 60)}h{' '}
                                            {mins % 60 > 0 ? `${mins % 60}m` : ''}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Session break */}
                            <div>
                                <label className="text-sm font-medium mb-2 block">Break Between Sessions</label>
                                <div className="flex gap-2">
                                    {[30, 45, 60, 90, 120].map((mins) => (
                                        <button
                                            key={mins}
                                            onClick={() => updateSetting('breakBetweenSessions', mins)}
                                            className={cn(
                                                'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                                                settings.breakBetweenSessions === mins
                                                    ? 'bg-[color:var(--masters)] text-[var(--canvas)]'
                                                    : 'bg-[var(--surface-secondary)] hover:bg-[var(--surface-raised)]'
                                            )}
                                        >
                                            {mins} min
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Info tip */}
            <div className="p-3 rounded-xl bg-[var(--surface-secondary)] flex gap-3">
                <Info className="w-5 h-5 text-[var(--masters)] shrink-0" />
                <p className="text-sm text-[var(--ink-secondary)]">
                    Tee times can be adjusted individually before each round. These are the default
                    preferences for scheduling.
                </p>
            </div>
        </div>
    );
}

export { DEFAULT_SETTINGS as DEFAULT_TEE_TIME_SETTINGS };
export default TeeTimePreferences;
