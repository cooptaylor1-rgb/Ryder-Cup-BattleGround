'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
    Palette,
    Check,
    RotateCcw,
    Eye,
    Users,
    Flag,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TeamColors {
    teamA: {
        primary: string;
        secondary: string;
        name: string;
    };
    teamB: {
        primary: string;
        secondary: string;
        name: string;
    };
}

interface TeamColorPickerProps {
    colors: TeamColors;
    onColorsChange: (colors: TeamColors) => void;
    className?: string;
}

const COLOR_PRESETS = [
    // Reds
    { name: 'Red', primary: '#DC2626', secondary: '#FEF2F2' },
    { name: 'Rose', primary: '#E11D48', secondary: '#FFF1F2' },
    { name: 'Crimson', primary: '#BE123C', secondary: '#FFF1F3' },
    // Blues
    { name: 'Blue', primary: '#2563EB', secondary: '#EFF6FF' },
    { name: 'Navy', primary: '#1E3A8A', secondary: '#EFF6FF' },
    { name: 'Sky', primary: '#0284C7', secondary: '#F0F9FF' },
    // Greens
    { name: 'Green', primary: '#16A34A', secondary: '#F0FDF4' },
    { name: 'Emerald', primary: '#059669', secondary: '#ECFDF5' },
    { name: 'Forest', primary: '#14532D', secondary: '#F0FDF4' },
    // Others
    { name: 'Purple', primary: '#7C3AED', secondary: '#FAF5FF' },
    { name: 'Gold', primary: '#CA8A04', secondary: '#FEFCE8' },
    { name: 'Orange', primary: '#EA580C', secondary: '#FFF7ED' },
    { name: 'Black', primary: '#18181B', secondary: '#F4F4F5' },
    { name: 'Silver', primary: '#71717A', secondary: '#FAFAFA' },
];

const TEAM_PRESETS: { teamA: typeof COLOR_PRESETS[0]; teamB: typeof COLOR_PRESETS[0]; label: string }[] = [
    { teamA: COLOR_PRESETS[0], teamB: COLOR_PRESETS[3], label: 'USA vs Europe' },
    { teamA: COLOR_PRESETS[1], teamB: COLOR_PRESETS[4], label: 'Red vs Blue' },
    { teamA: COLOR_PRESETS[6], teamB: COLOR_PRESETS[10], label: 'Green vs Gold' },
    { teamA: COLOR_PRESETS[12], teamB: COLOR_PRESETS[13], label: 'Black vs Silver' },
];

export function TeamColorPicker({
    colors,
    onColorsChange,
    className,
}: TeamColorPickerProps) {
    const [activeTeam, setActiveTeam] = useState<'teamA' | 'teamB'>('teamA');
    const [showPreview, setShowPreview] = useState(false);

    const updateTeamColor = useCallback((
        team: 'teamA' | 'teamB',
        colorPreset: typeof COLOR_PRESETS[0]
    ) => {
        onColorsChange({
            ...colors,
            [team]: {
                ...colors[team],
                primary: colorPreset.primary,
                secondary: colorPreset.secondary,
            },
        });
    }, [colors, onColorsChange]);

    const updateTeamName = useCallback((
        team: 'teamA' | 'teamB',
        name: string
    ) => {
        onColorsChange({
            ...colors,
            [team]: { ...colors[team], name },
        });
    }, [colors, onColorsChange]);

    const applyPreset = useCallback((preset: typeof TEAM_PRESETS[0]) => {
        onColorsChange({
            teamA: {
                ...colors.teamA,
                primary: preset.teamA.primary,
                secondary: preset.teamA.secondary,
            },
            teamB: {
                ...colors.teamB,
                primary: preset.teamB.primary,
                secondary: preset.teamB.secondary,
            },
        });
    }, [colors, onColorsChange]);

    const resetToDefault = useCallback(() => {
        onColorsChange({
            teamA: { primary: '#2563EB', secondary: '#EFF6FF', name: colors.teamA.name },
            teamB: { primary: '#DC2626', secondary: '#FEF2F2', name: colors.teamB.name },
        });
    }, [colors, onColorsChange]);

    return (
        <div className={cn('space-y-4', className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Palette className="w-5 h-5 text-[var(--masters)]" />
                        Team Colors
                    </h3>
                    <p className="text-sm text-[var(--ink-tertiary)]">
                        Customize team appearance
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowPreview(!showPreview)}
                        className={cn(
                            'btn-secondary text-sm px-3 py-1.5',
                            showPreview && 'bg-[color:var(--masters)]/12 text-[var(--masters)]'
                        )}
                    >
                        <Eye className="w-4 h-4 mr-1" />
                        Preview
                    </button>
                    <button
                        onClick={resetToDefault}
                        className="btn-secondary text-sm px-3 py-1.5"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Quick presets */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                {TEAM_PRESETS.map((preset, i) => (
                    <button
                        key={i}
                        onClick={() => applyPreset(preset)}
                        className="shrink-0 px-3 py-2 rounded-full bg-[var(--surface-secondary)] hover:bg-[var(--surface)] transition-colors text-sm flex items-center gap-2 text-[var(--ink-secondary)]"
                    >
                        <div className="flex -space-x-1">
                            <div
                                className="w-4 h-4 rounded-full border-2 border-white"
                                style={{ backgroundColor: preset.teamA.primary }}
                            />
                            <div
                                className="w-4 h-4 rounded-full border-2 border-white"
                                style={{ backgroundColor: preset.teamB.primary }}
                            />
                        </div>
                        <span>{preset.label}</span>
                    </button>
                ))}
            </div>

            {/* Team selector tabs */}
            <div className="flex gap-2 p-1 bg-[var(--surface-secondary)] rounded-xl">
                {(['teamA', 'teamB'] as const).map(team => (
                    <button
                        key={team}
                        onClick={() => setActiveTeam(team)}
                        className={cn(
                            'flex-1 py-2.5 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2',
                            activeTeam === team
                                ? 'bg-[var(--surface-raised)] shadow-sm'
                                : 'text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)]'
                        )}
                    >
                        <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: colors[team].primary }}
                        />
                        <span>{colors[team].name || (team === 'teamA' ? 'Team A' : 'Team B')}</span>
                    </button>
                ))}
            </div>

            {/* Active team config */}
            <div className="card p-4 space-y-4">
                {/* Team name */}
                <div>
                    <label className="text-sm font-medium mb-1.5 block">Team Name</label>
                    <input
                        type="text"
                        value={colors[activeTeam].name}
                        onChange={(e) => updateTeamName(activeTeam, e.target.value)}
                        placeholder={activeTeam === 'teamA' ? 'Team A' : 'Team B'}
                        className="input w-full"
                    />
                </div>

                {/* Color grid */}
                <div>
                    <label className="text-sm font-medium mb-2 block">Primary Color</label>
                    <div className="grid grid-cols-7 gap-2">
                        {COLOR_PRESETS.map((preset, i) => {
                            const isSelected = colors[activeTeam].primary === preset.primary;
                            return (
                                <button
                                    key={i}
                                    onClick={() => updateTeamColor(activeTeam, preset)}
                                    className={cn(
                                        'aspect-square rounded-xl transition-all relative',
                                        isSelected
                                            ? 'ring-2 ring-offset-2 ring-[var(--masters)] scale-110'
                                            : 'hover:scale-105'
                                    )}
                                    style={{ backgroundColor: preset.primary }}
                                    title={preset.name}
                                >
                                    {isSelected && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="absolute inset-0 flex items-center justify-center"
                                        >
                                            <Check className="w-4 h-4 text-white drop-shadow-md" />
                                        </motion.div>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Current color preview */}
                <div className="flex items-center gap-3 p-3 rounded-xl border border-[var(--rule)]">
                    <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center text-white"
                        style={{ backgroundColor: colors[activeTeam].primary }}
                    >
                        <Flag className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <p className="font-medium">{colors[activeTeam].name || (activeTeam === 'teamA' ? 'Team A' : 'Team B')}</p>
                        <p className="text-sm text-[var(--ink-tertiary)]">{colors[activeTeam].primary}</p>
                    </div>
                    <div
                        className="w-12 h-12 rounded-xl border border-[var(--rule)]"
                        style={{ backgroundColor: colors[activeTeam].secondary }}
                    />
                </div>
            </div>

            {/* Live preview */}
            {showPreview && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="card overflow-hidden"
                >
                    <div className="p-3 border-b border-[var(--rule)]">
                        <p className="text-sm font-medium text-[var(--ink-tertiary)]">Preview</p>
                    </div>

                    {/* Scoreboard preview */}
                    <div className="p-4">
                        <div className="flex items-stretch rounded-xl overflow-hidden">
                            {/* Team A */}
                            <div
                                className="flex-1 p-4 text-center"
                                style={{ backgroundColor: colors.teamA.secondary }}
                            >
                                <div
                                    className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-white"
                                    style={{ backgroundColor: colors.teamA.primary }}
                                >
                                    <Users className="w-5 h-5" />
                                </div>
                                <p
                                    className="font-bold text-sm"
                                    style={{ color: colors.teamA.primary }}
                                >
                                    {colors.teamA.name || 'Team A'}
                                </p>
                                <p
                                    className="text-3xl font-bold mt-1"
                                    style={{ color: colors.teamA.primary }}
                                >
                                    12
                                </p>
                            </div>

                            {/* Divider */}
                            <div className="w-px bg-[var(--rule)]" />

                            {/* Team B */}
                            <div
                                className="flex-1 p-4 text-center"
                                style={{ backgroundColor: colors.teamB.secondary }}
                            >
                                <div
                                    className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center text-white"
                                    style={{ backgroundColor: colors.teamB.primary }}
                                >
                                    <Users className="w-5 h-5" />
                                </div>
                                <p
                                    className="font-bold text-sm"
                                    style={{ color: colors.teamB.primary }}
                                >
                                    {colors.teamB.name || 'Team B'}
                                </p>
                                <p
                                    className="text-3xl font-bold mt-1"
                                    style={{ color: colors.teamB.primary }}
                                >
                                    10
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Match card preview */}
                    <div className="p-4 pt-0">
                        <div className="rounded-xl border border-[var(--rule)] overflow-hidden">
                            <div className="p-3 flex items-center gap-3">
                                <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                    style={{ backgroundColor: colors.teamA.primary }}
                                >
                                    JD
                                </div>
                                <div className="flex-1">
                                    <p className="font-medium text-sm">John Doe</p>
                                </div>
                                <div className="text-lg font-bold">2 UP</div>
                                <div className="flex-1 text-right">
                                    <p className="font-medium text-sm">Jane Smith</p>
                                </div>
                                <div
                                    className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                                    style={{ backgroundColor: colors.teamB.primary }}
                                >
                                    JS
                                </div>
                            </div>
                            <div
                                className="h-1"
                                style={{
                                    background: `linear-gradient(to right, ${colors.teamA.primary} 60%, ${colors.teamB.primary} 60%)`,
                                }}
                            />
                        </div>
                    </div>
                </motion.div>
            )}
        </div>
    );
}

export const DEFAULT_TEAM_COLORS: TeamColors = {
    teamA: { primary: '#2563EB', secondary: '#EFF6FF', name: 'Team USA' },
    teamB: { primary: '#DC2626', secondary: '#FEF2F2', name: 'Team Europe' },
};

export default TeamColorPicker;
