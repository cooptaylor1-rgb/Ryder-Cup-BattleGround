'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    DollarSign,
    Plus,
    X,
    Trophy,
    Target,
    Flame,
    Zap,
    TrendingUp,
    Check,
    Lightbulb,
    Crown,
    Star,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SideBetConfig {
    id: string;
    name: string;
    type: 'nassau' | 'skins' | 'closest-to-pin' | 'longest-drive' | 'birdies' | 'eagles' | 'custom';
    amount: number;
    description: string;
    isEnabled: boolean;
    rules?: string;
}

interface SideBetPresetsProps {
    sideBets: SideBetConfig[];
    onSideBetsChange: (bets: SideBetConfig[]) => void;
    currency?: string;
    className?: string;
}

const PRESET_BETS: Omit<SideBetConfig, 'id' | 'isEnabled'>[] = [
    {
        name: 'Nassau',
        type: 'nassau',
        amount: 5,
        description: 'Front 9, Back 9, and Overall',
        rules: 'Three separate bets: Front 9, Back 9, and 18-hole total. Can include automatic press when 2 down.',
    },
    {
        name: 'Skins',
        type: 'skins',
        amount: 2,
        description: 'Per hole, carryover on ties',
        rules: 'Lowest score on a hole wins the skin. Tied holes carry over to the next hole.',
    },
    {
        name: 'Closest to Pin',
        type: 'closest-to-pin',
        amount: 5,
        description: 'Per par 3',
        rules: 'Player with the tee shot closest to the pin on par 3s wins.',
    },
    {
        name: 'Longest Drive',
        type: 'longest-drive',
        amount: 5,
        description: 'Designated holes',
        rules: 'Longest drive in the fairway on designated holes.',
    },
    {
        name: 'Birdie Pool',
        type: 'birdies',
        amount: 3,
        description: 'Per birdie made',
        rules: 'Each player contributes to the pool. Birdies split the pot.',
    },
    {
        name: 'Eagle Pool',
        type: 'eagles',
        amount: 10,
        description: 'For eagle or better',
        rules: 'Bonus pool for eagles or better. Split if multiple.',
    },
];

const BET_TYPE_ICONS: Record<SideBetConfig['type'], React.ReactNode> = {
    nassau: <Trophy className="w-5 h-5" />,
    skins: <Flame className="w-5 h-5" />,
    'closest-to-pin': <Target className="w-5 h-5" />,
    'longest-drive': <TrendingUp className="w-5 h-5" />,
    birdies: <Star className="w-5 h-5" />,
    eagles: <Crown className="w-5 h-5" />,
    custom: <Zap className="w-5 h-5" />,
};

const BET_TYPE_COLORS: Record<SideBetConfig['type'], string> = {
    nassau: 'bg-green-500',
    skins: 'bg-orange-500',
    'closest-to-pin': 'bg-blue-500',
    'longest-drive': 'bg-purple-500',
    birdies: 'bg-yellow-500',
    eagles: 'bg-red-500',
    custom: 'bg-gray-500',
};

export function SideBetPresets({
    sideBets,
    onSideBetsChange,
    currency = '$',
    className,
}: SideBetPresetsProps) {
    const [showAddModal, setShowAddModal] = useState(false);
    const [_editingBet, _setEditingBet] = useState<string | null>(null);
    const [customBet, setCustomBet] = useState<Partial<SideBetConfig>>({
        name: '',
        type: 'custom',
        amount: 5,
        description: '',
        rules: '',
    });

    const generateBetId = useCallback(() => {
        return `bet-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    }, []);

    const addPresetBet = useCallback((preset: Omit<SideBetConfig, 'id' | 'isEnabled'>) => {
        const newBet: SideBetConfig = {
            ...preset,
            id: generateBetId(),
            isEnabled: true,
        };
        onSideBetsChange([...sideBets, newBet]);
    }, [sideBets, onSideBetsChange, generateBetId]);

    const addCustomBet = useCallback(() => {
        if (!customBet.name?.trim()) return;

        const newBet: SideBetConfig = {
            id: generateBetId(),
            name: customBet.name,
            type: 'custom',
            amount: customBet.amount || 5,
            description: customBet.description || '',
            rules: customBet.rules,
            isEnabled: true,
        };
        onSideBetsChange([...sideBets, newBet]);
        setCustomBet({ name: '', type: 'custom', amount: 5, description: '', rules: '' });
        setShowAddModal(false);
    }, [customBet, sideBets, onSideBetsChange, generateBetId]);

    const removeBet = useCallback((betId: string) => {
        onSideBetsChange(sideBets.filter(b => b.id !== betId));
    }, [sideBets, onSideBetsChange]);

    const toggleBet = useCallback((betId: string) => {
        onSideBetsChange(sideBets.map(b =>
            b.id === betId ? { ...b, isEnabled: !b.isEnabled } : b
        ));
    }, [sideBets, onSideBetsChange]);

    const updateBetAmount = useCallback((betId: string, amount: number) => {
        onSideBetsChange(sideBets.map(b =>
            b.id === betId ? { ...b, amount } : b
        ));
    }, [sideBets, onSideBetsChange]);

    // Calculate totals
    const activeBets = sideBets.filter(b => b.isEnabled);
    const totalPotential = activeBets.reduce((sum, b) => sum + b.amount, 0);

    // Available presets (not already added)
    const availablePresets = PRESET_BETS.filter(
        preset => !sideBets.some(b => b.type === preset.type)
    );

    return (
        <div className={cn('space-y-4', className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-[var(--masters)]" />
                        Side Bets
                    </h3>
                    <p className="text-sm text-[var(--ink-tertiary)]">
                        {activeBets.length} active • {currency}{totalPotential} potential per round
                    </p>
                </div>
                <button
                    onClick={() => setShowAddModal(true)}
                    className="btn-secondary text-sm"
                >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Bet
                </button>
            </div>

            {/* Quick add presets */}
            {availablePresets.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                    {availablePresets.slice(0, 4).map(preset => (
                        <button
                            key={preset.type}
                            onClick={() => addPresetBet(preset)}
                            className="shrink-0 px-3 py-2 rounded-full bg-[var(--surface-secondary)] hover:bg-[color:var(--masters)]/10 hover:text-[var(--masters)] transition-colors text-sm flex items-center gap-2"
                        >
                            <Plus className="w-3 h-3" />
                            {preset.name}
                        </button>
                    ))}
                </div>
            )}

            {/* Active side bets */}
            <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                    {sideBets.map(bet => (
                        <motion.div
                            key={bet.id}
                            layout
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={cn(
                                'card p-4 transition-opacity',
                                !bet.isEnabled && 'opacity-50'
                            )}
                        >
                            <div className="flex items-start gap-3">
                                {/* Icon */}
                                <div className={cn(
                                    'w-10 h-10 rounded-xl flex items-center justify-center text-[var(--canvas)]',
                                    BET_TYPE_COLORS[bet.type]
                                )}>
                                    {BET_TYPE_ICONS[bet.type]}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <h4 className="font-medium">{bet.name}</h4>
                                        {bet.type === 'custom' && (
                                            <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--surface-secondary)] text-[var(--ink-secondary)]">
                                                Custom
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm text-[var(--ink-tertiary)]">{bet.description}</p>

                                    {/* Amount editor */}
                                    <div className="flex items-center gap-3 mt-2">
                                        <span className="text-sm text-[var(--ink-tertiary)]">Amount:</span>
                                        <div className="flex items-center gap-1">
                                            {[1, 2, 5, 10, 20].map(amount => (
                                                <button
                                                    key={amount}
                                                    onClick={() => updateBetAmount(bet.id, amount)}
                                                    className={cn(
                                                        'px-2 py-1 rounded text-xs font-medium transition-all',
                                                        bet.amount === amount
                                                            ? 'bg-[var(--masters)] text-[var(--canvas)]'
                                                            : 'bg-[var(--surface-secondary)] hover:bg-[var(--surface-tertiary)] text-[var(--ink-secondary)]'
                                                    )}
                                                >
                                                    {currency}{amount}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={() => toggleBet(bet.id)}
                                        className={cn(
                                            'p-2 rounded-lg transition-colors',
                                            bet.isEnabled
                                                ? 'bg-[color:var(--masters)]/10 text-[var(--masters)]'
                                                : 'bg-[var(--surface-secondary)] text-[var(--ink-secondary)]'
                                        )}
                                    >
                                        <Check className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => removeBet(bet.id)}
                                        className="p-2 hover:bg-[color:var(--error)]/10 rounded-lg transition-colors"
                                    >
                                        <X className="w-4 h-4 text-[var(--error)]" />
                                    </button>
                                </div>
                            </div>

                            {/* Rules tooltip */}
                            {bet.rules && (
                                <div className="mt-3 p-2 rounded-lg bg-[var(--surface-secondary)] text-xs text-[var(--ink-secondary)]">
                                    <strong>Rules:</strong> {bet.rules}
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Empty state */}
                {sideBets.length === 0 && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="w-full p-8 border-2 border-dashed border-[var(--rule)] rounded-xl text-[var(--ink-tertiary)] hover:border-[var(--masters)] hover:text-[var(--masters)] transition-colors"
                    >
                        <DollarSign className="w-8 h-8 mx-auto mb-2" />
                        <p className="font-medium">No side bets configured</p>
                        <p className="text-sm mt-1">Add some friendly wagers</p>
                    </button>
                )}
            </div>

            {/* Tip */}
            {sideBets.length > 0 && (
                <div className="p-3 rounded-xl bg-[var(--surface-secondary)] flex gap-3">
                    <Lightbulb className="w-5 h-5 text-[var(--warning)] shrink-0" />
                    <p className="text-sm text-[var(--ink-secondary)]">
                        Side bets are optional and can be adjusted before each round.
                        Players can opt in or out individually.
                    </p>
                </div>
            )}

            {/* Add Modal */}
            <AnimatePresence>
                {showAddModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-[color:var(--ink)]/50 z-50 flex items-end sm:items-center justify-center p-4"
                        onClick={() => setShowAddModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 100 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 100 }}
                            className="bg-[var(--surface-raised)] rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="p-4 border-b border-[var(--rule)] flex items-center justify-between">
                                <h3 className="font-semibold text-lg">Add Side Bet</h3>
                                <button
                                    onClick={() => setShowAddModal(false)}
                                    className="p-2 hover:bg-[var(--surface-secondary)] rounded-lg"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
                                {/* Preset bets */}
                                <div>
                                    <p className="text-sm font-medium text-[var(--ink-secondary)] mb-2">Popular Bets</p>
                                    <div className="space-y-2">
                                        {PRESET_BETS.map(preset => {
                                            const isAdded = sideBets.some(b => b.type === preset.type);
                                            return (
                                                <button
                                                    key={preset.type}
                                                    onClick={() => !isAdded && addPresetBet(preset)}
                                                    disabled={isAdded}
                                                    className={cn(
                                                        'w-full p-3 rounded-xl text-left transition-all',
                                                        isAdded
                                                            ? 'bg-[var(--surface-secondary)] opacity-50 cursor-not-allowed'
                                                            : 'hover:bg-[var(--surface-tertiary)]'
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={cn(
                                                            'w-10 h-10 rounded-xl flex items-center justify-center text-[var(--canvas)]',
                                                            BET_TYPE_COLORS[preset.type]
                                                        )}>
                                                            {BET_TYPE_ICONS[preset.type]}
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="font-medium">{preset.name}</p>
                                                            <p className="text-sm text-[var(--ink-tertiary)]">{preset.description}</p>
                                                        </div>
                                                        {isAdded ? (
                                                            <Check className="w-5 h-5 text-[var(--masters)]" />
                                                        ) : (
                                                            <Plus className="w-5 h-5 text-[var(--ink-tertiary)]" />
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Custom bet form */}
                                <div className="pt-4 border-t border-[var(--rule)]">
                                    <p className="text-sm font-medium text-[var(--ink-secondary)] mb-3">Create Custom Bet</p>
                                    <div className="space-y-3">
                                        <input
                                            type="text"
                                            value={customBet.name}
                                            onChange={(e) => setCustomBet(prev => ({ ...prev, name: e.target.value }))}
                                            placeholder="Bet name (e.g., Wolf)"
                                            className="input w-full"
                                        />
                                        <input
                                            type="text"
                                            value={customBet.description}
                                            onChange={(e) => setCustomBet(prev => ({ ...prev, description: e.target.value }))}
                                            placeholder="Short description"
                                            className="input w-full"
                                        />
                                        <textarea
                                            value={customBet.rules}
                                            onChange={(e) => setCustomBet(prev => ({ ...prev, rules: e.target.value }))}
                                            placeholder="Rules (optional)"
                                            rows={2}
                                            className="input w-full resize-none"
                                        />
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm text-[var(--ink-tertiary)]">Amount:</span>
                                            {[1, 2, 5, 10, 20].map(amount => (
                                                <button
                                                    key={amount}
                                                    onClick={() => setCustomBet(prev => ({ ...prev, amount }))}
                                                    className={cn(
                                                        'px-3 py-1.5 rounded-lg text-sm font-medium transition-all',
                                                        customBet.amount === amount
                                                            ? 'bg-[var(--masters)] text-[var(--canvas)]'
                                                            : 'bg-[var(--surface-secondary)] hover:bg-[var(--surface-tertiary)] text-[var(--ink-secondary)]'
                                                    )}
                                                >
                                                    {currency}{amount}
                                                </button>
                                            ))}
                                        </div>
                                        <button
                                            onClick={addCustomBet}
                                            disabled={!customBet.name?.trim()}
                                            className="btn-primary w-full"
                                        >
                                            Add Custom Bet
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default SideBetPresets;
