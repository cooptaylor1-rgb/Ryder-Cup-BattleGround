'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ListOrdered,
    Target,
    Medal,
    Calculator,
    Star,
    Info,
    Check,
    ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export type ScoringFormat = 'match-play' | 'stroke-play' | 'stableford' | 'modified-stableford';
export type WinCondition = 'most-points' | 'points-threshold' | 'match-count';

export interface ScoringSettings {
    defaultFormat: ScoringFormat;
    allowFormatPerSession: boolean;
    winCondition: WinCondition;
    pointsToWin?: number;
    matchesToWin?: number;
    stablefordPoints: {
        eagle: number;
        birdie: number;
        par: number;
        bogey: number;
        doubleBogey: number;
        worse: number;
    };
    modifiedStablefordPoints: {
        albatross: number;
        eagle: number;
        birdie: number;
        par: number;
        bogey: number;
        doubleBogey: number;
        worse: number;
    };
}

interface ScoringFormatOptionsProps {
    settings: ScoringSettings;
    onSettingsChange: (settings: ScoringSettings) => void;
    className?: string;
}

const DEFAULT_STABLEFORD = {
    eagle: 4,
    birdie: 3,
    par: 2,
    bogey: 1,
    doubleBogey: 0,
    worse: 0,
};

const DEFAULT_MODIFIED_STABLEFORD = {
    albatross: 8,
    eagle: 5,
    birdie: 2,
    par: 0,
    bogey: -1,
    doubleBogey: -3,
    worse: -5,
};

const DEFAULT_SETTINGS: ScoringSettings = {
    defaultFormat: 'match-play',
    allowFormatPerSession: false,
    winCondition: 'most-points',
    pointsToWin: 14.5,
    stablefordPoints: DEFAULT_STABLEFORD,
    modifiedStablefordPoints: DEFAULT_MODIFIED_STABLEFORD,
};

const FORMAT_OPTIONS: {
    format: ScoringFormat;
    label: string;
    description: string;
    icon: React.ReactNode;
    iconClass: string;
}[] = [
    {
        format: 'match-play',
        label: 'Match Play',
        description: 'Hole-by-hole competition, most holes wins',
        icon: <Target className="w-5 h-5" />,
        iconClass: 'bg-[var(--masters)] text-[var(--canvas)]',
    },
    {
        format: 'stroke-play',
        label: 'Stroke Play',
        description: 'Total strokes, lowest score wins',
        icon: <ListOrdered className="w-5 h-5" />,
        iconClass: 'bg-[var(--info)] text-[var(--canvas)]',
    },
    {
        format: 'stableford',
        label: 'Stableford',
        description: 'Points per hole based on score',
        icon: <Star className="w-5 h-5" />,
        iconClass: 'bg-[var(--color-accent)] text-[var(--masters-deep)]',
    },
    {
        format: 'modified-stableford',
        label: 'Modified Stableford',
        description: 'Aggressive points with penalties',
        icon: <Medal className="w-5 h-5" />,
        iconClass: 'bg-[var(--warning)] text-[var(--masters-deep)]',
    },
];

export function ScoringFormatOptions({
    settings,
    onSettingsChange,
    className,
}: ScoringFormatOptionsProps) {
    const [showStablefordConfig, setShowStablefordConfig] = useState(false);

    const updateSetting = <K extends keyof ScoringSettings>(
        key: K,
        value: ScoringSettings[K]
    ) => {
        onSettingsChange({ ...settings, [key]: value });
    };

    const updateStablefordPoints = (
        score: keyof typeof DEFAULT_STABLEFORD,
        value: number
    ) => {
        onSettingsChange({
            ...settings,
            stablefordPoints: { ...settings.stablefordPoints, [score]: value },
        });
    };

    const updateModifiedStablefordPoints = (
        score: keyof typeof DEFAULT_MODIFIED_STABLEFORD,
        value: number
    ) => {
        onSettingsChange({
            ...settings,
            modifiedStablefordPoints: { ...settings.modifiedStablefordPoints, [score]: value },
        });
    };

    const selectedFormat = FORMAT_OPTIONS.find(f => f.format === settings.defaultFormat);

    return (
        <div className={cn('space-y-4', className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-[var(--masters)]" />
                        Scoring Format
                    </h3>
                    <p className="text-sm text-[var(--ink-secondary)]">
                        Choose how matches are scored
                    </p>
                </div>
            </div>

            {/* Format selection */}
            <div className="grid grid-cols-2 gap-2">
                {FORMAT_OPTIONS.map(option => (
                    <button
                        key={option.format}
                        onClick={() => updateSetting('defaultFormat', option.format)}
                        className={cn(
                            'p-3 rounded-xl border-2 text-left transition-all bg-[var(--surface-secondary)]',
                            settings.defaultFormat === option.format
                                ? 'border-[var(--masters)] bg-[var(--masters-subtle)] ring-1 ring-[color:var(--masters)]/20'
                                : 'border-[var(--rule)] hover:border-[color:var(--masters)]/40 hover:bg-[var(--surface)]'
                        )}
                    >
                        <div className="flex items-start gap-2">
                            <div className={cn(
                                'w-8 h-8 rounded-lg flex items-center justify-center',
                                option.iconClass
                            )}>
                                {option.icon}
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-sm">{option.label}</p>
                                <p className="text-xs text-[var(--ink-tertiary)] mt-0.5">{option.description}</p>
                            </div>
                            {settings.defaultFormat === option.format && (
                                <Check className="w-4 h-4 text-[var(--masters)] shrink-0" />
                            )}
                        </div>
                    </button>
                ))}
            </div>

            {/* Allow per-session override */}
            <div className="card p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium">Allow Format Per Session</p>
                        <p className="text-sm text-[var(--ink-secondary)]">
                            Let each session use a different format
                        </p>
                    </div>
                    <button
                        onClick={() => updateSetting('allowFormatPerSession', !settings.allowFormatPerSession)}
                        className={cn(
                            'relative w-14 h-8 rounded-full transition-colors',
                            settings.allowFormatPerSession
                                ? 'bg-[var(--masters)]'
                                : 'bg-[color:var(--ink-tertiary)]/25'
                        )}
                    >
                        <motion.div
                            animate={{ x: settings.allowFormatPerSession ? 24 : 4 }}
                            className="absolute top-1 w-6 h-6 rounded-full bg-[var(--surface-raised)] shadow-sm"
                        />
                    </button>
                </div>
            </div>

            {/* Win condition */}
            <div className="card p-4 space-y-4">
                <h4 className="font-medium">Win Condition</h4>
                <div className="space-y-2">
                    {[
                        { value: 'most-points', label: 'Most Points', desc: 'Team with most points wins' },
                        { value: 'points-threshold', label: 'Points Threshold', desc: 'First to reach a point target' },
                    ].map(option => (
                        <button
                            key={option.value}
                            onClick={() => updateSetting('winCondition', option.value as WinCondition)}
                            className={cn(
                                'w-full p-3 rounded-lg border-2 text-left transition-all bg-[var(--surface-secondary)]',
                                settings.winCondition === option.value
                                    ? 'border-[var(--masters)] bg-[var(--masters-subtle)] ring-1 ring-[color:var(--masters)]/20'
                                    : 'border-[var(--rule)] hover:border-[color:var(--masters)]/40 hover:bg-[var(--surface)]'
                            )}
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-sm">{option.label}</p>
                                    <p className="text-xs text-[var(--ink-tertiary)]">{option.desc}</p>
                                </div>
                                {settings.winCondition === option.value && (
                                    <Check className="w-4 h-4 text-[var(--masters)]" />
                                )}
                            </div>
                        </button>
                    ))}
                </div>

                {/* Points threshold config */}
                {settings.winCondition === 'points-threshold' && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="pt-3 border-t border-[var(--rule)]"
                    >
                        <label className="text-sm font-medium mb-2 block">Points to Win</label>
                        <div className="flex gap-2">
                            {[8.5, 10.5, 14.5, 17.5, 21.5].map(pts => (
                                <button
                                    key={pts}
                                    onClick={() => updateSetting('pointsToWin', pts)}
                                    className={cn(
                                        'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                                        settings.pointsToWin === pts
                                            ? 'bg-[var(--masters)] text-[var(--canvas)]'
                                            : 'bg-[var(--surface-secondary)] hover:bg-[var(--surface)]'
                                    )}
                                >
                                    {pts}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                )}
            </div>

            {/* Stableford configuration */}
            {(settings.defaultFormat === 'stableford' || settings.defaultFormat === 'modified-stableford') && (
                <div className="card overflow-hidden">
                    <button
                        onClick={() => setShowStablefordConfig(!showStablefordConfig)}
                        className="w-full p-4 flex items-center justify-between hover:bg-[var(--surface-secondary)] transition-colors"
                    >
                        <div className="flex items-center gap-3">
                            <Star className="w-5 h-5 text-[var(--color-accent)]" />
                            <div className="text-left">
                                <p className="font-medium">
                                    {settings.defaultFormat === 'stableford' ? 'Stableford' : 'Modified Stableford'} Points
                                </p>
                                <p className="text-xs text-[var(--ink-tertiary)]">
                                    Customize points per score
                                </p>
                            </div>
                        </div>
                        <ChevronDown
                            className={cn(
                                'w-5 h-5 text-[var(--ink-secondary)] transition-transform',
                                showStablefordConfig && 'rotate-180'
                            )}
                        />
                    </button>

                    <AnimatePresence>
                        {showStablefordConfig && (
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: 'auto' }}
                                exit={{ height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="p-4 pt-0 border-t border-[var(--rule)]">
                                    {settings.defaultFormat === 'stableford' ? (
                                        <div className="space-y-3">
                                            {[
                                                { key: 'eagle' as const, label: 'Eagle or better', emoji: '🦅' },
                                                { key: 'birdie' as const, label: 'Birdie', emoji: '🐦' },
                                                { key: 'par' as const, label: 'Par', emoji: '⛳' },
                                                { key: 'bogey' as const, label: 'Bogey', emoji: '😐' },
                                                { key: 'doubleBogey' as const, label: 'Double Bogey', emoji: '😬' },
                                                { key: 'worse' as const, label: 'Worse', emoji: '💀' },
                                            ].map(({ key, label, emoji }) => (
                                                <div key={key} className="flex items-center justify-between">
                                                    <span className="text-sm flex items-center gap-2">
                                                        <span>{emoji}</span>
                                                        {label}
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        {[0, 1, 2, 3, 4, 5].map(pts => (
                                                            <button
                                                                key={pts}
                                                                onClick={() => updateStablefordPoints(key, pts)}
                                                                className={cn(
                                                                    'w-8 h-8 rounded-lg text-sm font-medium transition-all',
                                                                    settings.stablefordPoints[key] === pts
                                                                        ? 'bg-[var(--masters)] text-[var(--canvas)]'
                                                                        : 'bg-[var(--surface-secondary)]'
                                                                )}
                                                            >
                                                                {pts}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {[
                                                { key: 'albatross' as const, label: 'Albatross', emoji: '🦢', range: [-5, 8] },
                                                { key: 'eagle' as const, label: 'Eagle', emoji: '🦅', range: [-5, 8] },
                                                { key: 'birdie' as const, label: 'Birdie', emoji: '🐦', range: [-3, 5] },
                                                { key: 'par' as const, label: 'Par', emoji: '⛳', range: [-2, 2] },
                                                { key: 'bogey' as const, label: 'Bogey', emoji: '😐', range: [-3, 1] },
                                                { key: 'doubleBogey' as const, label: 'Double Bogey', emoji: '😬', range: [-5, 0] },
                                                { key: 'worse' as const, label: 'Worse', emoji: '💀', range: [-8, 0] },
                                            ].map(({ key, label, emoji }) => (
                                                <div key={key} className="flex items-center justify-between">
                                                    <span className="text-sm flex items-center gap-2">
                                                        <span>{emoji}</span>
                                                        {label}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="number"
                                                            value={settings.modifiedStablefordPoints[key]}
                                                            onChange={(e) => updateModifiedStablefordPoints(key, parseInt(e.target.value) || 0)}
                                                            className="w-16 input text-center text-sm"
                                                            min={-10}
                                                            max={10}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}

            {/* Format explanation */}
            {selectedFormat && (
                <div className="p-3 rounded-xl bg-[var(--surface-secondary)] flex gap-3">
                    <Info className="w-5 h-5 text-[var(--masters)] shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <p className="font-medium text-[var(--masters)]">{selectedFormat.label}</p>
                        <p className="text-[var(--ink-secondary)] mt-1">
                            {selectedFormat.format === 'match-play' && (
                                'Each hole is a separate contest. The player/team with the lowest score wins the hole. Most holes won wins the match.'
                            )}
                            {selectedFormat.format === 'stroke-play' && (
                                'Total strokes are counted across all holes. The player/team with the lowest total score wins.'
                            )}
                            {selectedFormat.format === 'stableford' && (
                                'Points are awarded based on score relative to par on each hole. More points is better. Standard scoring rewards consistent play.'
                            )}
                            {selectedFormat.format === 'modified-stableford' && (
                                'Aggressive scoring system that rewards birdies and eagles while penalizing bogeys and worse. Encourages attacking play.'
                            )}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
}

export { DEFAULT_SETTINGS as DEFAULT_SCORING_SETTINGS };
export default ScoringFormatOptions;
