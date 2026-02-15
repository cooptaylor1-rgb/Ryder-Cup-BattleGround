'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calculator,
    Percent,
    ChevronDown,
    Check,
    Lightbulb,
    TrendingDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface HandicapSettings {
    allowancePercent: number;
    maxHandicap: number;
    useNetScoring: boolean;
    matchPlayAllowance: 'full' | 'three-quarters' | 'half';
    strokePlayAllowance: 'full' | 'three-quarters' | 'half';
    foursomesMethod: 'average' | 'lower' | 'combined';
    fourballMethod: 'full' | 'percentage';
    roundHandicaps: boolean;
}

interface HandicapRulesProps {
    settings: HandicapSettings;
    onSettingsChange: (settings: HandicapSettings) => void;
    className?: string;
}

const DEFAULT_SETTINGS: HandicapSettings = {
    allowancePercent: 85,
    maxHandicap: 36,
    useNetScoring: true,
    matchPlayAllowance: 'full',
    strokePlayAllowance: 'three-quarters',
    foursomesMethod: 'combined',
    fourballMethod: 'full',
    roundHandicaps: true,
};

const PRESETS = [
    {
        id: 'usga',
        name: 'USGA Standard',
        description: 'Official USGA handicap rules',
        settings: {
            ...DEFAULT_SETTINGS,
            allowancePercent: 95,
            matchPlayAllowance: 'full' as const,
            strokePlayAllowance: 'three-quarters' as const,
        },
    },
    {
        id: 'casual',
        name: 'Casual Play',
        description: 'Relaxed rules for friendly competition',
        settings: {
            ...DEFAULT_SETTINGS,
            allowancePercent: 100,
            maxHandicap: 40,
            matchPlayAllowance: 'full' as const,
        },
    },
    {
        id: 'competitive',
        name: 'Competitive',
        description: 'Tighter handicaps for serious play',
        settings: {
            ...DEFAULT_SETTINGS,
            allowancePercent: 80,
            maxHandicap: 28,
        },
    },
    {
        id: 'scratch',
        name: 'Scratch/Gross',
        description: 'No handicaps - play from scratch',
        settings: {
            ...DEFAULT_SETTINGS,
            useNetScoring: false,
            allowancePercent: 0,
        },
    },
];

export function HandicapRules({
    settings,
    onSettingsChange,
    className,
}: HandicapRulesProps) {
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [activePreset, setActivePreset] = useState<string | null>(null);

    const updateSetting = <K extends keyof HandicapSettings>(
        key: K,
        value: HandicapSettings[K]
    ) => {
        onSettingsChange({ ...settings, [key]: value });
        setActivePreset(null); // Clear preset when manually changing
    };

    const applyPreset = (presetId: string) => {
        const preset = PRESETS.find(p => p.id === presetId);
        if (preset) {
            onSettingsChange(preset.settings);
            setActivePreset(presetId);
        }
    };

    // Calculate example strokes
    const exampleHandicap = 18;
    const effectiveHandicap = Math.round(exampleHandicap * (settings.allowancePercent / 100));
    const cappedHandicap = Math.min(effectiveHandicap, settings.maxHandicap);

    return (
        <div className={cn('space-y-4', className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2 text-[var(--ink-primary)]">
                        <Calculator className="w-5 h-5 text-[var(--masters)]" />
                        Handicap Rules
                    </h3>
                    <p className="text-sm text-[var(--ink-tertiary)]">
                        Configure stroke allowances
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
                                ? 'border-[var(--masters)] bg-[color:var(--masters)]/10'
                                : 'border-[var(--rule)] hover:border-[color:var(--masters)]/50'
                        )}
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="font-medium text-sm">{preset.name}</p>
                                <p className="text-xs text-[var(--ink-tertiary)] mt-0.5">{preset.description}</p>
                            </div>
                            {activePreset === preset.id && (
                                <Check className="w-4 h-4 text-[var(--masters)] shrink-0" />
                            )}
                        </div>
                    </button>
                ))}
            </div>

            {/* Main settings */}
            <div className="card p-4 space-y-6">
                {/* Net vs Gross toggle */}
                <div className="flex items-center justify-between">
                    <div>
                        <p className="font-medium">Use Net Scoring</p>
                        <p className="text-sm text-[var(--ink-tertiary)]">Apply handicap strokes</p>
                    </div>
                    <button
                        onClick={() => updateSetting('useNetScoring', !settings.useNetScoring)}
                        className={cn(
                            'relative w-14 h-8 rounded-full transition-colors',
                            settings.useNetScoring
                                ? 'bg-[var(--masters)]'
                                : 'bg-[color:var(--ink-tertiary)]/25'
                        )}
                    >
                        <motion.div
                            animate={{ x: settings.useNetScoring ? 24 : 4 }}
                            className="absolute top-1 w-6 h-6 rounded-full bg-[var(--surface-raised)] shadow-sm"
                        />
                    </button>
                </div>

                {settings.useNetScoring && (
                    <>
                        {/* Allowance percentage */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="font-medium flex items-center gap-2">
                                    <Percent className="w-4 h-4 text-[var(--ink-tertiary)]" />
                                    Handicap Allowance
                                </label>
                                <span className="text-lg font-bold text-[var(--masters)]">
                                    {settings.allowancePercent}%
                                </span>
                            </div>
                            <input
                                type="range"
                                min={50}
                                max={100}
                                step={5}
                                value={settings.allowancePercent}
                                onChange={(e) => updateSetting('allowancePercent', parseInt(e.target.value))}
                                className="w-full accent-[var(--masters)]"
                            />
                            <div className="flex justify-between text-xs text-[var(--ink-tertiary)] mt-1">
                                <span>50%</span>
                                <span>75%</span>
                                <span>100%</span>
                            </div>
                        </div>

                        {/* Max handicap */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="font-medium flex items-center gap-2">
                                    <TrendingDown className="w-4 h-4 text-[var(--ink-tertiary)]" />
                                    Maximum Handicap Cap
                                </label>
                                <span className="text-lg font-bold text-[var(--masters)]">
                                    {settings.maxHandicap}
                                </span>
                            </div>
                            <div className="flex gap-2">
                                {[18, 24, 28, 36, 40, 54].map(cap => (
                                    <button
                                        key={cap}
                                        onClick={() => updateSetting('maxHandicap', cap)}
                                        className={cn(
                                            'flex-1 py-2 rounded-lg text-sm font-medium transition-all',
                                            settings.maxHandicap === cap
                                                ? 'bg-[var(--masters)] text-[var(--canvas)]'
                                                : 'bg-[var(--surface-secondary)] hover:bg-[var(--surface)] text-[var(--ink-primary)]'
                                        )}
                                    >
                                        {cap}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </>
                )}

                {/* Example calculation */}
                {settings.useNetScoring && (
                    <div className="p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--rule)]">
                        <div className="flex items-start gap-2">
                            <Lightbulb className="w-4 h-4 text-[var(--warning)] mt-0.5" />
                            <div className="text-sm">
                                <p className="font-medium">Example Calculation</p>
                                <p className="text-[var(--ink-tertiary)] mt-1">
                                    A player with an {exampleHandicap} handicap:
                                </p>
                                <div className="mt-2 space-y-1">
                                    <div className="flex justify-between">
                                        <span className="text-[var(--ink-tertiary)]">Original handicap:</span>
                                        <span className="font-medium">{exampleHandicap}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-[var(--ink-tertiary)]">After {settings.allowancePercent}% allowance:</span>
                                        <span className="font-medium">{effectiveHandicap}</span>
                                    </div>
                                    {effectiveHandicap !== cappedHandicap && (
                                        <div className="flex justify-between">
                                            <span className="text-[var(--ink-tertiary)]">After {settings.maxHandicap} cap:</span>
                                            <span className="font-medium">{cappedHandicap}</span>
                                        </div>
                                    )}
                                    <div className="flex justify-between pt-1 border-t border-[var(--rule)]">
                                        <span className="font-medium">Playing handicap:</span>
                                        <span className="font-bold text-[var(--masters)]">{cappedHandicap} strokes</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Advanced settings accordion */}
            {settings.useNetScoring && (
                <div className="card overflow-hidden">
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="w-full p-4 flex items-center justify-between hover:bg-[var(--surface-secondary)] transition-colors"
                    >
                        <span className="font-medium">Advanced Format Settings</span>
                        <ChevronDown
                            className={cn(
'w-5 h-5 text-[var(--ink-tertiary)] transition-transform',
                                showAdvanced && 'rotate-180'
                            )}
                        />
                    </button>

                    <AnimatePresence>
                        {showAdvanced && (
                            <motion.div
                                initial={{ height: 0 }}
                                animate={{ height: 'auto' }}
                                exit={{ height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="p-4 pt-0 space-y-6 border-t border-[var(--rule)]">
                                    {/* Match Play Allowance */}
                                    <div>
                                        <label className="font-medium text-sm mb-2 block">
                                            Match Play Allowance
                                        </label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[
                                                { value: 'full', label: '100%', desc: 'Full difference' },
                                                { value: 'three-quarters', label: '75%', desc: 'Standard' },
                                                { value: 'half', label: '50%', desc: 'Reduced' },
                                            ].map(option => (
                                                <button
                                                    key={option.value}
                                                    onClick={() => updateSetting('matchPlayAllowance', option.value as typeof settings.matchPlayAllowance)}
                                                    className={cn(
                                                        'p-2 rounded-lg border-2 text-center transition-all',
                                                        settings.matchPlayAllowance === option.value
                                                            ? 'border-[var(--masters)] bg-[color:var(--masters)]/10'
                                                            : 'border-[var(--rule)] hover:border-[color:var(--masters)]/50'
                                                    )}
                                                >
                                                    <p className="font-medium text-sm">{option.label}</p>
                                                    <p className="text-xs text-[var(--ink-tertiary)]">{option.desc}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Foursomes Method */}
                                    <div>
                                        <label className="font-medium text-sm mb-2 block">
                                            Foursomes Handicap Method
                                        </label>
                                        <div className="space-y-2">
                                            {[
                                                { value: 'combined', label: 'Combined', desc: '50% of combined team handicaps' },
                                                { value: 'average', label: 'Average', desc: 'Average of both players' },
                                                { value: 'lower', label: 'Lower', desc: 'Use lower handicap only' },
                                            ].map(option => (
                                                <button
                                                    key={option.value}
                                                    onClick={() => updateSetting('foursomesMethod', option.value as typeof settings.foursomesMethod)}
                                                    className={cn(
                                                        'w-full p-3 rounded-lg border-2 text-left transition-all',
                                                        settings.foursomesMethod === option.value
                                                            ? 'border-[var(--masters)] bg-[color:var(--masters)]/10'
                                                            : 'border-[var(--rule)] hover:border-[color:var(--masters)]/50'
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="font-medium text-sm">{option.label}</p>
                                                            <p className="text-xs text-[var(--ink-tertiary)]">{option.desc}</p>
                                                        </div>
                                                        {settings.foursomesMethod === option.value && (
                                                            <Check className="w-4 h-4 text-[var(--masters)]" />
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Four-Ball Method */}
                                    <div>
                                        <label className="font-medium text-sm mb-2 block">
                                            Four-Ball Handicap Method
                                        </label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {[
                                                { value: 'full', label: 'Full Handicap', desc: 'Each player uses full handicap' },
                                                { value: 'percentage', label: 'Percentage', desc: 'Apply allowance to each' },
                                            ].map(option => (
                                                <button
                                                    key={option.value}
                                                    onClick={() => updateSetting('fourballMethod', option.value as typeof settings.fourballMethod)}
                                                    className={cn(
                                                        'p-3 rounded-lg border-2 text-left transition-all',
                                                        settings.fourballMethod === option.value
                                                            ? 'border-[var(--masters)] bg-[color:var(--masters)]/10'
                                                            : 'border-[var(--rule)] hover:border-[color:var(--masters)]/50'
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div>
                                                            <p className="font-medium text-sm">{option.label}</p>
                                                            <p className="text-xs text-[var(--ink-tertiary)]">{option.desc}</p>
                                                        </div>
                                                        {settings.fourballMethod === option.value && (
                                                            <Check className="w-4 h-4 text-[var(--masters)]" />
                                                        )}
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Round handicaps toggle */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-medium text-sm">Round Handicaps</p>
                                            <p className="text-xs text-[var(--ink-tertiary)]">Round to nearest whole number</p>
                                        </div>
                                        <button
                                            onClick={() => updateSetting('roundHandicaps', !settings.roundHandicaps)}
                                            className={cn(
                                                'relative w-12 h-7 rounded-full transition-colors',
                                                settings.roundHandicaps
                                                    ? 'bg-[var(--masters)]'
                                                    : 'bg-[color:var(--ink-tertiary)]/25'
                                            )}
                                        >
                                            <motion.div
                                                animate={{ x: settings.roundHandicaps ? 22 : 4 }}
                                                className="absolute top-1 w-5 h-5 rounded-full bg-[var(--surface-raised)] shadow-sm"
                                            />
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
}

export { DEFAULT_SETTINGS as DEFAULT_HANDICAP_SETTINGS };
export default HandicapRules;
