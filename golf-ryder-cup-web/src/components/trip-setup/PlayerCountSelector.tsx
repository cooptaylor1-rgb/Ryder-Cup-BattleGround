'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Minus,
    Plus,
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
                        <Users className="w-5 h-5 text-[var(--masters)]" />
                        Team Size
                    </h3>
                    <p className="text-sm text-[var(--ink-tertiary)]">
                        {totalPlayers} players total ({playersPerTeam} per team)
                    </p>
                </div>
            </div>

            {/* Quick select buttons */}
            <div className="grid grid-cols-5 gap-2">
                {COMMON_COUNTS.map(({ count, label: _label, icon }) => (
                    <button
                        key={count}
                        onClick={() => onPlayersPerTeamChange(count)}
                        className={cn(
                            'p-3 rounded-xl border-2 transition-all text-center',
                            playersPerTeam === count
                                ? 'border-[var(--masters)] bg-[var(--masters-subtle)] ring-2 ring-[color:var(--masters)]/20'
                                : 'border-[var(--rule)] hover:border-[color:var(--masters)]/50'
                        )}
                    >
                        <span className="text-xl block mb-1">{icon}</span>
                        <span className="text-xs font-medium block">{count}</span>
                    </button>
                ))}
            </div>

            {/* Fine-tuned control */}
            <div className="flex items-center gap-4 p-4 bg-[var(--surface-secondary)] rounded-xl">
                <div className="flex-1">
                    <p className="text-sm font-medium">Players per Team</p>
                    <p className="text-xs text-[var(--ink-tertiary)]">Use slider for custom count</p>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleDecrement}
                        disabled={playersPerTeam <= minPlayers}
                        className={cn(
                            'w-10 h-10 rounded-full flex items-center justify-center transition-all',
                            playersPerTeam <= minPlayers
                                ? 'bg-[color:var(--ink-tertiary)]/10 text-[var(--ink-tertiary)] cursor-not-allowed'
                                : 'bg-[var(--surface-raised)] shadow-sm hover:bg-[var(--surface-secondary)] active:scale-95'
                        )}
                    >
                        <Minus className="w-5 h-5" />
                    </button>

                    <div className="w-16 text-center">
                        <motion.span
                            key={playersPerTeam}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-3xl font-bold text-[var(--masters)]"
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
                                ? 'bg-[color:var(--ink-tertiary)]/10 text-[var(--ink-tertiary)] cursor-not-allowed'
                                : 'bg-[var(--surface-raised)] shadow-sm hover:bg-[var(--surface-secondary)] active:scale-95'
                        )}
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Visual team representation */}
            <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-xl bg-[color:var(--team-usa)]/10 border border-[color:var(--team-usa)]/25">
                    <p className="text-sm font-medium text-[var(--team-usa)] mb-2">
                        Team A
                    </p>
                    <div className="flex flex-wrap gap-1">
                        {Array.from({ length: playersPerTeam }).map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: i * 0.02 }}
                                className="w-6 h-6 rounded-full bg-[var(--team-usa)] flex items-center justify-center"
                            >
                                <Users className="w-3 h-3 text-[var(--canvas)]" />
                            </motion.div>
                        ))}
                    </div>
                </div>
                <div className="p-3 rounded-xl bg-[color:var(--team-europe)]/10 border border-[color:var(--team-europe)]/25">
                    <p className="text-sm font-medium text-[var(--team-europe)] mb-2">
                        Team B
                    </p>
                    <div className="flex flex-wrap gap-1">
                        {Array.from({ length: playersPerTeam }).map((_, i) => (
                            <motion.div
                                key={i}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: i * 0.02 }}
                                className="w-6 h-6 rounded-full bg-[var(--team-europe)] flex items-center justify-center"
                            >
                                <Users className="w-3 h-3 text-[var(--canvas)]" />
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
                        <div className="p-3 rounded-lg bg-[color:var(--warning)]/10 border border-[color:var(--warning)]/25 flex gap-3">
                            <AlertCircle className="w-5 h-5 text-[var(--warning)] shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-[var(--warning)]">
                                    Odd number of players
                                </p>
                                <p className="text-xs text-[var(--ink-secondary)]">
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
                    className="w-full p-3 rounded-xl bg-[var(--masters-subtle)] border border-[color:var(--masters)]/20 text-left hover:bg-[color:var(--masters-subtle)] transition-colors"
                >
                    <div className="flex items-start gap-3">
                        <Lightbulb className="w-5 h-5 text-[var(--masters)] shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-[var(--masters)]">
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
                                                <Check className="w-3 h-3 text-[var(--masters)]" />
                                                <span>{recommendation.singles} singles matches possible</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Check className="w-3 h-3 text-[var(--masters)]" />
                                                <span>{recommendation.fourballs} four-ball pairings</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Check className="w-3 h-3 text-[var(--masters)]" />
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
                <div className="w-full p-3 rounded-xl bg-[var(--surface-secondary)] border border-[var(--rule)]">
                    <div className="flex items-start gap-3">
                        <Lightbulb className="w-5 h-5 text-[var(--ink-tertiary)] shrink-0 mt-0.5" />
                        <div className="flex-1">
                            <p className="text-sm font-medium text-[var(--ink-secondary)]">
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
