'use client';

/**
 * Side Bet Opt-In
 *
 * Allow players to opt-in or out of specific side bets before the trip.
 * Shows available bets with amounts and lets players set their preferences.
 */

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    DollarSign,
    Check,
    X,
    Target,
    Trophy,
    Zap,
    Info,
    ChevronUp,
    AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

export interface SideBet {
    id: string;
    name: string;
    description: string;
    amount: number;
    emoji: string;
    category: 'individual' | 'team' | 'match';
    frequency: 'per-round' | 'per-session' | 'trip';
    isRequired?: boolean;
}

export interface SideBetPreference {
    betId: string;
    optedIn: boolean;
    customAmount?: number;
}

interface SideBetOptInProps {
    availableBets: SideBet[];
    onPreferencesChange: (preferences: SideBetPreference[]) => void;
    initialPreferences?: SideBetPreference[];
    currency?: string;
    className?: string;
}

// ============================================
// DEFAULT BETS (if none provided)
// ============================================

const DEFAULT_BETS: SideBet[] = [
    {
        id: 'nassau',
        name: 'Nassau',
        description: 'Bet on front 9, back 9, and overall match',
        amount: 5,
        emoji: '🎰',
        category: 'match',
        frequency: 'per-round',
    },
    {
        id: 'skins',
        name: 'Skins',
        description: 'Win the pot on any hole with the lowest score',
        amount: 2,
        emoji: '💰',
        category: 'individual',
        frequency: 'per-round',
    },
    {
        id: 'closest-to-pin',
        name: 'Closest to Pin',
        description: 'Par 3s only - closest to the hole wins',
        amount: 5,
        emoji: '🎯',
        category: 'individual',
        frequency: 'per-round',
    },
    {
        id: 'longest-drive',
        name: 'Longest Drive',
        description: 'Longest drive on designated holes',
        amount: 5,
        emoji: '🚀',
        category: 'individual',
        frequency: 'per-round',
    },
    {
        id: 'birdies',
        name: 'Birdie Pool',
        description: 'Every birdie wins from the pool',
        amount: 1,
        emoji: '🐦',
        category: 'individual',
        frequency: 'per-round',
    },
    {
        id: 'team-bonus',
        name: 'Team Victory Bonus',
        description: 'Winning team splits the pot',
        amount: 10,
        emoji: '🏆',
        category: 'team',
        frequency: 'trip',
        isRequired: true,
    },
];

// ============================================
// COMPONENT
// ============================================

export function SideBetOptIn({
    availableBets = DEFAULT_BETS,
    onPreferencesChange,
    initialPreferences,
    currency = '$',
    className,
}: SideBetOptInProps) {
    const [preferences, setPreferences] = useState<SideBetPreference[]>(() => {
        if (initialPreferences) return initialPreferences;
        return availableBets.map(bet => ({
            betId: bet.id,
            optedIn: bet.isRequired || false,
        }));
    });
    const [expandedBet, setExpandedBet] = useState<string | null>(null);

    const updatePreference = (betId: string, optedIn: boolean, customAmount?: number) => {
        const bet = availableBets.find(b => b.id === betId);
        if (bet?.isRequired) return; // Can't opt out of required bets

        const newPreferences = preferences.map(p =>
            p.betId === betId ? { ...p, optedIn, customAmount } : p
        );
        setPreferences(newPreferences);
        onPreferencesChange(newPreferences);
    };

    const toggleAll = (optIn: boolean) => {
        const newPreferences = preferences.map(p => {
            const bet = availableBets.find(b => b.id === p.betId);
            if (bet?.isRequired) return p;
            return { ...p, optedIn: optIn };
        });
        setPreferences(newPreferences);
        onPreferencesChange(newPreferences);
    };

    // Calculate totals
    const stats = useMemo(() => {
        let potentialCost = 0;
        let optedInCount = 0;

        preferences.forEach(pref => {
            if (pref.optedIn) {
                optedInCount++;
                const bet = availableBets.find(b => b.id === pref.betId);
                if (bet) {
                    potentialCost += pref.customAmount || bet.amount;
                }
            }
        });

        return { potentialCost, optedInCount };
    }, [preferences, availableBets]);

    const byCategory = useMemo(() => {
        const grouped: Record<SideBet['category'], SideBet[]> = {
            individual: [],
            team: [],
            match: [],
        };
        availableBets.forEach(bet => {
            grouped[bet.category].push(bet);
        });
        return grouped;
    }, [availableBets]);

    const categoryLabels: Record<SideBet['category'], { label: string; icon: React.ReactNode }> = {
        individual: { label: 'Individual Bets', icon: <Target className="w-4 h-4" /> },
        team: { label: 'Team Bets', icon: <Trophy className="w-4 h-4" /> },
        match: { label: 'Match Bets', icon: <Zap className="w-4 h-4" /> },
    };

    return (
        <div className={cn('space-y-6', className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-surface-900 dark:text-white flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-green-600" />
                        Side Bets
                    </h3>
                    <p className="text-sm text-surface-500 mt-0.5">
                        Choose which bets you want to participate in
                    </p>
                </div>
            </div>

            {/* Summary Card */}
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-4 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <div className="text-sm opacity-90">Your buy-in</div>
                        <div className="text-3xl font-bold">
                            {currency}{stats.potentialCost}
                        </div>
                        <div className="text-sm opacity-80">
                            {stats.optedInCount} of {availableBets.length} bets
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => toggleAll(true)}
                            className="px-3 py-1.5 rounded-lg bg-white/20 text-sm font-medium hover:bg-white/30 transition-colors"
                        >
                            All In
                        </button>
                        <button
                            onClick={() => toggleAll(false)}
                            className="px-3 py-1.5 rounded-lg bg-white/10 text-sm font-medium hover:bg-white/20 transition-colors"
                        >
                            None
                        </button>
                    </div>
                </div>
            </div>

            {/* Bets by Category */}
            {(['individual', 'team', 'match'] as SideBet['category'][]).map(category => {
                const bets = byCategory[category];
                if (bets.length === 0) return null;

                return (
                    <div key={category}>
                        <h4 className="text-sm font-medium text-surface-500 dark:text-surface-400 flex items-center gap-2 mb-3">
                            {categoryLabels[category].icon}
                            {categoryLabels[category].label}
                        </h4>
                        <div className="space-y-2">
                            {bets.map(bet => {
                                const pref = preferences.find(p => p.betId === bet.id);
                                const isOptedIn = pref?.optedIn || false;
                                const isExpanded = expandedBet === bet.id;

                                return (
                                    <motion.div
                                        key={bet.id}
                                        layout
                                        className={cn(
                                            'bg-white dark:bg-surface-800 rounded-xl border overflow-hidden transition-colors',
                                            isOptedIn
                                                ? 'border-green-300 dark:border-green-700'
                                                : 'border-surface-200 dark:border-surface-700'
                                        )}
                                    >
                                        {/* Main Row */}
                                        <div className="p-4 flex items-center gap-3">
                                            {/* Emoji */}
                                            <span className="text-2xl">{bet.emoji}</span>

                                            {/* Info */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-surface-900 dark:text-white">
                                                        {bet.name}
                                                    </span>
                                                    {bet.isRequired && (
                                                        <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                                                            Required
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-sm text-surface-500 flex items-center gap-2">
                                                    <span className="font-medium text-green-600">
                                                        {currency}{pref?.customAmount || bet.amount}
                                                    </span>
                                                    <span>•</span>
                                                    <span>{bet.frequency}</span>
                                                </div>
                                            </div>

                                            {/* Info Button */}
                                            <button
                                                onClick={() => setExpandedBet(isExpanded ? null : bet.id)}
                                                className="p-2 rounded-lg hover:bg-surface-100 dark:hover:bg-surface-700 transition-colors"
                                            >
                                                {isExpanded ? (
                                                    <ChevronUp className="w-4 h-4 text-surface-400" />
                                                ) : (
                                                    <Info className="w-4 h-4 text-surface-400" />
                                                )}
                                            </button>

                                            {/* Toggle */}
                                            <button
                                                onClick={() => updatePreference(bet.id, !isOptedIn)}
                                                disabled={bet.isRequired}
                                                className={cn(
                                                    'w-12 h-7 rounded-full relative transition-colors',
                                                    bet.isRequired && 'cursor-not-allowed opacity-60',
                                                    isOptedIn
                                                        ? 'bg-green-500'
                                                        : 'bg-surface-200 dark:bg-surface-600'
                                                )}
                                            >
                                                <motion.div
                                                    className={cn(
                                                        'w-5 h-5 rounded-full bg-white shadow absolute top-1',
                                                        'flex items-center justify-center'
                                                    )}
                                                    animate={{ left: isOptedIn ? 26 : 4 }}
                                                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                                >
                                                    {isOptedIn ? (
                                                        <Check className="w-3 h-3 text-green-500" />
                                                    ) : (
                                                        <X className="w-3 h-3 text-surface-400" />
                                                    )}
                                                </motion.div>
                                            </button>
                                        </div>

                                        {/* Expanded Details */}
                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="px-4 pb-4 pt-2 border-t border-surface-100 dark:border-surface-700">
                                                        <p className="text-sm text-surface-600 dark:text-surface-400">
                                                            {bet.description}
                                                        </p>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}

            {/* Disclaimer */}
            <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800 dark:text-amber-200">
                    <p className="font-medium mb-1">Friendly Reminder</p>
                    <p className="text-amber-700 dark:text-amber-300">
                        Side bets are optional and meant for fun. You can change your preferences anytime before the trip starts.
                    </p>
                </div>
            </div>
        </div>
    );
}

export default SideBetOptIn;
