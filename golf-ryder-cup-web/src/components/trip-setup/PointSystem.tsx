'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Trophy,
    Star,
    Zap,
    Medal,
    Award,
    Crown,
    Plus,
    Minus,
    Info,
    Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PointConfig {
    matchWin: number;
    matchHalve: number;
    sessionBonus: number;
    dayBonus: number;
    cleanSweepBonus: number;
    comebackBonus: number;
    dominationBonus: number; // Win by 5+ holes
}

export interface SessionPointOverride {
    sessionType: 'fourball' | 'foursomes' | 'singles' | 'mixed';
    multiplier: number;
}

interface PointSystemProps {
    config: PointConfig;
    onConfigChange: (config: PointConfig) => void;
    sessionOverrides: SessionPointOverride[];
    onSessionOverridesChange: (overrides: SessionPointOverride[]) => void;
    className?: string;
}

const DEFAULT_CONFIG: PointConfig = {
    matchWin: 1,
    matchHalve: 0.5,
    sessionBonus: 0,
    dayBonus: 0,
    cleanSweepBonus: 0,
    comebackBonus: 0,
    dominationBonus: 0,
};

const PRESETS = [
    {
        id: 'classic',
        name: 'Classic Ryder Cup',
        description: '1 point per match, 0.5 for halve',
        config: DEFAULT_CONFIG,
        icon: <Trophy className="w-5 h-5" />,
    },
    {
        id: 'weighted',
        name: 'Weighted Sessions',
        description: 'Singles worth 1.5x',
        config: { ...DEFAULT_CONFIG },
        overrides: [
            { sessionType: 'singles' as const, multiplier: 1.5 },
        ],
        icon: <Star className="w-5 h-5" />,
    },
    {
        id: 'bonus',
        name: 'With Bonuses',
        description: 'Extra points for sweeps & comebacks',
        config: {
            ...DEFAULT_CONFIG,
            cleanSweepBonus: 2,
            comebackBonus: 1,
            dominationBonus: 0.5,
        },
        icon: <Sparkles className="w-5 h-5" />,
    },
    {
        id: 'high-stakes',
        name: 'High Stakes',
        description: '2 points per match',
        config: {
            ...DEFAULT_CONFIG,
            matchWin: 2,
            matchHalve: 1,
        },
        icon: <Zap className="w-5 h-5" />,
    },
];

const SESSION_TYPES: { type: SessionPointOverride['sessionType']; label: string; icon: React.ReactNode }[] = [
    { type: 'fourball', label: 'Four-Ball', icon: '👥' },
    { type: 'foursomes', label: 'Foursomes', icon: '🤝' },
    { type: 'singles', label: 'Singles', icon: '🎯' },
    { type: 'mixed', label: 'Mixed', icon: '✨' },
];

export function PointSystem({
    config,
    onConfigChange,
    sessionOverrides,
    onSessionOverridesChange,
    className,
}: PointSystemProps) {
    const [showBonuses, setShowBonuses] = useState(false);
    const [showMultipliers, setShowMultipliers] = useState(false);
    const [activePreset, setActivePreset] = useState<string | null>('classic');

    const updateConfig = useCallback(<K extends keyof PointConfig>(
        key: K,
        value: PointConfig[K]
    ) => {
        onConfigChange({ ...config, [key]: value });
        setActivePreset(null);
    }, [config, onConfigChange]);

    const applyPreset = useCallback((presetId: string) => {
        const preset = PRESETS.find(p => p.id === presetId);
        if (preset) {
            onConfigChange(preset.config);
            if ('overrides' in preset && preset.overrides) {
                onSessionOverridesChange(preset.overrides);
            } else {
                onSessionOverridesChange([]);
            }
            setActivePreset(presetId);
        }
    }, [onConfigChange, onSessionOverridesChange]);

    const toggleSessionOverride = useCallback((sessionType: SessionPointOverride['sessionType']) => {
        const existing = sessionOverrides.find(o => o.sessionType === sessionType);
        if (existing) {
            onSessionOverridesChange(sessionOverrides.filter(o => o.sessionType !== sessionType));
        } else {
            onSessionOverridesChange([...sessionOverrides, { sessionType, multiplier: 1.5 }]);
        }
        setActivePreset(null);
    }, [sessionOverrides, onSessionOverridesChange]);

    const updateOverrideMultiplier = useCallback((sessionType: SessionPointOverride['sessionType'], multiplier: number) => {
        onSessionOverridesChange(sessionOverrides.map(o =>
            o.sessionType === sessionType ? { ...o, multiplier } : o
        ));
        setActivePreset(null);
    }, [sessionOverrides, onSessionOverridesChange]);

    // Calculate example points
    const exampleMatches = 12;
    const basePoints = exampleMatches * config.matchWin;
    const _withBonuses = basePoints + config.cleanSweepBonus + config.comebackBonus;

    return (
        <div className={cn('space-y-4', className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-[var(--masters)]" />
                        Point System
                    </h3>
                    <p className="text-sm text-[var(--ink-tertiary)]">
                        Configure how points are awarded
                    </p>
                </div>
            </div>

            {/* Quick presets */}
            <div className="grid grid-cols-2 gap-2">
                {PRESETS.map(preset => (
                    <button
                        key={preset.id}
                        onClick={() => applyPreset(preset.id)}
                        className={cn(
                            'p-3 rounded-xl border-2 text-left transition-all',
                            activePreset === preset.id
                                ? 'border-[var(--masters)] bg-[color:var(--masters)]/8'
                                : 'border-[color:var(--rule)]/40 hover:border-[color:var(--masters)]/50'
                        )}
                    >
                        <div className="flex items-start gap-2">
                            <div className={cn(
                                'w-8 h-8 rounded-lg flex items-center justify-center',
                                activePreset === preset.id
                                    ? 'bg-[var(--masters)] text-[var(--canvas)]'
                                    : 'bg-[var(--surface-secondary)] text-[var(--ink-secondary)]'
                            )}>
                                {preset.icon}
                            </div>
                            <div className="flex-1">
                                <p className="font-medium text-sm">{preset.name}</p>
                                <p className="text-xs text-[var(--ink-tertiary)]">{preset.description}</p>
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {/* Main point values */}
            <div className="card p-4 space-y-4">
                <h4 className="font-medium text-sm text-[var(--ink-secondary)]">
                    Base Points
                </h4>

                {/* Match Win */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[color:var(--success)]/10 flex items-center justify-center">
                            <Medal className="w-5 h-5 text-[var(--success)]" />
                        </div>
                        <div>
                            <p className="font-medium">Match Win</p>
                            <p className="text-xs text-[var(--ink-tertiary)]">Points for winning a match</p>
                        </div>
                    </div>
                    <PointStepper
                        value={config.matchWin}
                        onChange={(v) => updateConfig('matchWin', v)}
                        min={0.5}
                        max={5}
                        step={0.5}
                    />
                </div>

                {/* Match Halve */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-[color:var(--info)]/10 flex items-center justify-center">
                            <Award className="w-5 h-5 text-[var(--info)]" />
                        </div>
                        <div>
                            <p className="font-medium">Match Halve</p>
                            <p className="text-xs text-[var(--ink-tertiary)]">Points for a tie</p>
                        </div>
                    </div>
                    <PointStepper
                        value={config.matchHalve}
                        onChange={(v) => updateConfig('matchHalve', v)}
                        min={0}
                        max={2.5}
                        step={0.25}
                    />
                </div>
            </div>

            {/* Session Multipliers */}
            <div className="card overflow-hidden">
                <button
                    onClick={() => setShowMultipliers(!showMultipliers)}
                    className="w-full p-4 flex items-center justify-between hover:bg-[var(--surface-secondary)] transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <Star className="w-5 h-5 text-[var(--warning)]" />
                        <div className="text-left">
                            <p className="font-medium">Session Multipliers</p>
                            <p className="text-xs text-[var(--ink-tertiary)]">
                                {sessionOverrides.length > 0
                                    ? `${sessionOverrides.length} custom multiplier${sessionOverrides.length > 1 ? 's' : ''}`
                                    : 'Make certain sessions worth more'}
                            </p>
                        </div>
                    </div>
                    <motion.div animate={{ rotate: showMultipliers ? 180 : 0 }}>
                        <Plus className="w-5 h-5 text-[var(--ink-tertiary)]" />
                    </motion.div>
                </button>

                <AnimatePresence>
                    {showMultipliers && (
                        <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-4 pt-0 space-y-3 border-t border-[var(--rule)]">
                                {SESSION_TYPES.map(({ type, label, icon }) => {
                                    const override = sessionOverrides.find(o => o.sessionType === type);
                                    const isActive = !!override;

                                    return (
                                        <div
                                            key={type}
                                            className={cn(
                                                'p-3 rounded-xl border-2 transition-all',
                                                isActive
                                                    ? 'border-[var(--masters)] bg-[color:var(--masters)]/8'
                                                    : 'border-[color:var(--rule)]/40'
                                            )}
                                        >
                                            <div className="flex items-center justify-between">
                                                <button
                                                    onClick={() => toggleSessionOverride(type)}
                                                    className="flex items-center gap-2"
                                                >
                                                    <span className="text-lg">{icon}</span>
                                                    <span className="font-medium">{label}</span>
                                                </button>
                                                {isActive && override && (
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => updateOverrideMultiplier(type, Math.max(1, override.multiplier - 0.25))}
                                                            className="p-1 hover:bg-[var(--surface-secondary)] rounded"
                                                        >
                                                            <Minus className="w-4 h-4" />
                                                        </button>
                                                        <span className="w-12 text-center font-bold text-[var(--masters)]">
                                                            {override.multiplier}x
                                                        </span>
                                                        <button
                                                            onClick={() => updateOverrideMultiplier(type, Math.min(3, override.multiplier + 0.25))}
                                                            className="p-1 hover:bg-[var(--surface-secondary)] rounded"
                                                        >
                                                            <Plus className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                )}
                                                {!isActive && (
                                                    <span className="text-sm text-[var(--ink-tertiary)]">1x (default)</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Bonus Points */}
            <div className="card overflow-hidden">
                <button
                    onClick={() => setShowBonuses(!showBonuses)}
                    className="w-full p-4 flex items-center justify-between hover:bg-[var(--surface-secondary)] transition-colors"
                >
                    <div className="flex items-center gap-3">
                        <Sparkles className="w-5 h-5 text-[var(--color-accent)]" />
                        <div className="text-left">
                            <p className="font-medium">Bonus Points</p>
                            <p className="text-xs text-[var(--ink-tertiary)]">
                                Reward sweeps, comebacks & dominations
                            </p>
                        </div>
                    </div>
                    <motion.div animate={{ rotate: showBonuses ? 180 : 0 }}>
                        <Plus className="w-5 h-5 text-[var(--ink-tertiary)]" />
                    </motion.div>
                </button>

                <AnimatePresence>
                    {showBonuses && (
                        <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: 'auto' }}
                            exit={{ height: 0 }}
                            className="overflow-hidden"
                        >
                            <div className="p-4 pt-0 space-y-4 border-t border-[var(--rule)]">
                                {/* Clean Sweep */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-[color:var(--masters)]/10 flex items-center justify-center">
                                            <Crown className="w-4 h-4 text-[var(--masters)]" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">Clean Sweep</p>
                                            <p className="text-xs text-[var(--ink-tertiary)]">Win all matches in a session</p>
                                        </div>
                                    </div>
                                    <PointStepper
                                        value={config.cleanSweepBonus}
                                        onChange={(v) => updateConfig('cleanSweepBonus', v)}
                                        min={0}
                                        max={5}
                                        step={0.5}
                                        compact
                                    />
                                </div>

                                {/* Comeback */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-[color:var(--warning)]/10 flex items-center justify-center">
                                            <Zap className="w-4 h-4 text-[var(--warning)]" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">Comeback</p>
                                            <p className="text-xs text-[var(--ink-tertiary)]">Win after being 3+ down</p>
                                        </div>
                                    </div>
                                    <PointStepper
                                        value={config.comebackBonus}
                                        onChange={(v) => updateConfig('comebackBonus', v)}
                                        min={0}
                                        max={3}
                                        step={0.5}
                                        compact
                                    />
                                </div>

                                {/* Domination */}
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-[color:var(--error)]/10 flex items-center justify-center">
                                            <Trophy className="w-4 h-4 text-[var(--error)]" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">Domination</p>
                                            <p className="text-xs text-[var(--ink-tertiary)]">Win by 5+ holes</p>
                                        </div>
                                    </div>
                                    <PointStepper
                                        value={config.dominationBonus}
                                        onChange={(v) => updateConfig('dominationBonus', v)}
                                        min={0}
                                        max={2}
                                        step={0.25}
                                        compact
                                    />
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Preview */}
            <div className="p-3 rounded-xl bg-[color:var(--masters)]/8 border border-[color:var(--masters)]/25">
                <div className="flex items-start gap-2">
                    <Info className="w-4 h-4 text-[var(--masters)] mt-0.5" />
                    <div className="text-sm">
                        <p className="font-medium text-[var(--masters)]">Point Summary</p>
                        <p className="text-[var(--ink-secondary)] mt-1">
                            Example: {exampleMatches} matches at {config.matchWin} pts each = <strong>{basePoints} base points</strong>
                            {(config.cleanSweepBonus > 0 || config.comebackBonus > 0) && (
                                <span> + up to <strong>{config.cleanSweepBonus + config.comebackBonus + config.dominationBonus}</strong> bonus</span>
                            )}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Point Stepper Component
interface PointStepperProps {
    value: number;
    onChange: (value: number) => void;
    min: number;
    max: number;
    step: number;
    compact?: boolean;
}

function PointStepper({ value, onChange, min, max, step, compact }: PointStepperProps) {
    return (
        <div className="flex items-center gap-2">
            <button
                onClick={() => onChange(Math.max(min, value - step))}
                disabled={value <= min}
                className={cn(
                    'rounded-lg flex items-center justify-center transition-all',
                    compact ? 'w-7 h-7' : 'w-8 h-8',
                    value <= min
                        ? 'bg-[color:var(--ink-tertiary)]/10 text-[color:var(--ink-tertiary)]/40 cursor-not-allowed'
                        : 'bg-[var(--surface-secondary)] hover:bg-[var(--surface)] active:scale-95'
                )}
            >
                <Minus className="w-4 h-4" />
            </button>
            <span className={cn(
                'text-center font-bold text-[var(--masters)]',
                compact ? 'w-10 text-sm' : 'w-12'
            )}>
                {value}
            </span>
            <button
                onClick={() => onChange(Math.min(max, value + step))}
                disabled={value >= max}
                className={cn(
                    'rounded-lg flex items-center justify-center transition-all',
                    compact ? 'w-7 h-7' : 'w-8 h-8',
                    value >= max
                        ? 'bg-[color:var(--ink-tertiary)]/10 text-[color:var(--ink-tertiary)]/40 cursor-not-allowed'
                        : 'bg-[var(--surface-secondary)] hover:bg-[var(--surface)] active:scale-95'
                )}
            >
                <Plus className="w-4 h-4" />
            </button>
        </div>
    );
}

export { DEFAULT_CONFIG as DEFAULT_POINT_CONFIG };
export default PointSystem;
