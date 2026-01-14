'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Minus,
    Plus,
    UserPlus,
    AlertCircle,
    Check,
    Lightbulb,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface PlayerCountSelectorProps {
    playersPerTeam: number;
    onPlayersPerTeamChange: (count: number) => void;
    minPlayers?: number;
    maxPlayers?: number;
    className?: string;
}

const COMMON_COUNTS = [
    { count: 4, label: 'Foursome', description: '8 total players', icon: '🎯' },
    { count: 6, label: 'Small Group', description: '12 total players', icon: '👥' },
    { count: 8, label: 'Weekend Trip', description: '16 total players', icon: '⛳' },
    { count: 10, label: 'Large Group', description: '20 total players', icon: '🏆' },
    { count: 12, label: 'Ryder Cup', description: '24 total players', icon: '🏅' },
];

const FORMAT_RECOMMENDATIONS: Record<number, {
    singles: number;
    fourballs: number;
    foursomes: number;
    note: string;
}> = {
    4: { singles: 4, fourballs: 2, foursomes: 2, note: 'Perfect for fourball & singles' },
    6: { singles: 6, fourballs: 3, foursomes: 3, note: 'Good for mixed formats' },
    8: { singles: 8, fourballs: 4, foursomes: 4, note: 'Ideal weekend tournament size' },
    10: { singles: 10, fourballs: 5, foursomes: 5, note: 'Great for variety in formats' },
    12: { singles: 12, fourballs: 6, foursomes: 6, note: 'Classic Ryder Cup format' },
};

export function PlayerCountSelector({
    playersPerTeam,
    onPlayersPerTeamChange,
    minPlayers = 2,
    maxPlayers = 16,
    className,
}: PlayerCountSelectorProps) {
    const [showDetails, setShowDetails] = useState(false);

    const totalPlayers = playersPerTeam * 2;
    const isEven = playersPerTeam % 2 === 0;
    const recommendation = FORMAT_RECOMMENDATIONS[playersPerTeam];

    const handleDecrement = () => {
        if (playersPerTeam > minPlayers) {
            onPlayersPerTeamChange(playersPerTeam - 1);
        }
    };

    const handleIncrement = () => {
        if (playersPerTeam < maxPlayers) {
            onPlayersPerTeamChange(playersPerTeam + 1);
        }
    };

    return (
        <div className={cn('space-y-4', className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Users className="w-5 h-5 text-augusta-green" />
                        Team Size
                    </h3>
                    <p className="text-sm text-surface-500">
                        {totalPlayers} players total ({playersPerTeam} per team)
                    </p>
                </div>
            </div>

            {/* Quick select buttons */}
            <div className="grid grid-cols-5 gap-2">
                {COMMON_COUNTS.map(({ count, label, icon }) => (
                    <button
                        key={count}
                        onClick={() => onPlayersPerTeamChange(count)}
                        className={cn(
                            'p-3 rounded-xl border-2 transition-all text-center',
                            playersPerTeam === count
                                ? 'border-augusta-green bg-augusta-green/5 ring-2 ring-augusta-green/20'
                                : 'border-surface-200 dark:border-surface-700 hover:border-augusta-green/50'
                        )}
                    >
                        <span className="text-xl block mb-1">{icon}</span>
                        <span className="text-xs font-medium block">{count}</span>
                    </button>
                ))}
            </div>

            {/* Fine-tuned control */}
            <div className="flex items-center gap-4 p-4 bg-surface-50 dark:bg-surface-800 rounded-xl">
                <div className="flex-1">
                    <p className="text-sm font-medium">Players per Team</p>
                    <p className="text-xs text-surface-500">Use slider for custom count</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleDecrement}
                        disabled={playersPerTeam <= minPlayers}
                        className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                            playersPerTeam <= minPlayers
                                ? 'bg-surface-200 text-surface-400 cursor-not-allowed'
                                : 'bg-white dark:bg-surface-700 shadow-sm hover:bg-surface-100 active:scale-95'
                        )}
                    >
                        <Minus className="w-5 h-5" />
                    </button>

                    <div className="w-16 text-center">
                        <motion.span
                            key={playersPerTeam}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-3xl font-bold text-augusta-green"
                        >
                            {playersPerTeam}
                        </motion.span>
                    </div>

                    <button
                        onClick={handleIncrement}
                        disabled={playersPerTeam >= maxPlayers}
                        className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                            playersPerTeam >= maxPlayers
                                ? 'bg-surface-200 text-surface-400 cursor-not-allowed'
                                : 'bg-white dark:bg-surface-700 shadow-sm hover:bg-surface-100 active:scale-95'
                        )}
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Visual team representation */}
            <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">
                        Team A
                    </p>
                    <div className="flex flex-wrap gap-1">
                        {Array.from({ length: playersPerTeam }).map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: i * 0.02 }}
                                className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center"
                            >
                                <Users className="w-3 h-3 text-white" />
                            </motion.div>
                        ))}
                    </div>
                </div>
                <div className="p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                    <p className="text-sm font-medium text-red-700 dark:text-red-300 mb-2">
                        Team B
                    </p>
                    <div className="flex flex-wrap gap-1">
                        {Array.from({ length: playersPerTeam }).map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: i * 0.02 }}
                                className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center"
                            >
                                <Users className="w-3 h-3 text-white" />
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Warnings and recommendations */}
            <AnimatePresence mode="wait">
                {!isEven && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 flex gap-3">
                            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                                    Odd number of players
                                </p>
                                <p className="text-xs text-amber-700 dark:text-amber-300">
                                    Foursomes and Four-Ball formats work best with even numbers.
                                    Consider using singles-only or rotating players.
                                </p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Format recommendation */}
            {recommendation ? (
                <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="w-full p-3 rounded-xl bg-augusta-green/5 border border-augusta-green/20 text-left hover:bg-augusta-green/10 transition-colors"
                >
                    <div className="flex items-start gap-3">
                        <Lightbulb className="w-5 h-5 text-augusta-green flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-augusta-green">
                                {recommendation.note}
                            </p>
                            <AnimatePresence>
                                {showDetails && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: 'auto' }}
                                        exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="mt-3 space-y-2 text-xs">
                                            <div className="flex items-center gap-2">
                                                <Check className="w-3 h-3 text-augusta-green" />
                                                <span>{recommendation.singles} singles matches possible</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Check className="w-3 h-3 text-augusta-green" />
                                                <span>{recommendation.fourballs} four-ball pairings</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Check className="w-3 h-3 text-augusta-green" />
                                                <span>{recommendation.foursomes} foursomes teams</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                </button>
            ) : (
                <div className="w-full p-3 rounded-xl bg-surface-50 dark:bg-surface-800 border border-surface-200 dark:border-surface-700">
                    <div className="flex items-start gap-3">
                        <Lightbulb className="w-5 h-5 text-surface-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-surface-600 dark:text-surface-400">
                                Custom size: {playersPerTeam} singles, {Math.floor(playersPerTeam / 2)} team pairings possible
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PlayerCountSelector;
