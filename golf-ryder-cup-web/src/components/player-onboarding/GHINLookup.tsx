'use client';

/**
 * GHIN Lookup
 *
 * Auto-fetch handicap from GHIN using the golfer's GHIN number.
 * Provides visual feedback during lookup and shows handicap history.
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Hash,
    Search,
    Loader2,
    CheckCircle,
    AlertCircle,
    TrendingUp,
    TrendingDown,
    Minus,
    RefreshCw,
    User,
    History,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

export interface GHINResult {
    ghinNumber: string;
    firstName: string;
    lastName: string;
    handicapIndex: number;
    clubName?: string;
    lowHandicap?: number;
    trend?: 'up' | 'down' | 'stable';
    lastRevision?: string;
    recentScores?: {
        date: string;
        score: number;
        differential: number;
    }[];
}

interface GHINLookupProps {
    onResult: (result: GHINResult) => void;
    initialGhin?: string;
    autoPopulateName?: boolean;
    className?: string;
}

type LookupState = 'idle' | 'searching' | 'found' | 'not-found' | 'error';

// ============================================
// MOCK GHIN LOOKUP (Replace with real API)
// ============================================

const mockGHINLookup = async (ghinNumber: string): Promise<GHINResult | null> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock data for demo - in production, call USGA GHIN API
    const mockPlayers: Record<string, GHINResult> = {
        '1234567': {
            ghinNumber: '1234567',
            firstName: 'John',
            lastName: 'Smith',
            handicapIndex: 12.4,
            clubName: 'Pine Valley Golf Club',
            lowHandicap: 10.2,
            trend: 'down',
            lastRevision: '2026-01-01',
            recentScores: [
                { date: '2026-01-10', score: 82, differential: 11.2 },
                { date: '2026-01-05', score: 85, differential: 14.1 },
                { date: '2025-12-28', score: 79, differential: 8.5 },
            ],
        },
        '7654321': {
            ghinNumber: '7654321',
            firstName: 'Mike',
            lastName: 'Johnson',
            handicapIndex: 8.7,
            clubName: 'Augusta National',
            lowHandicap: 6.4,
            trend: 'stable',
            lastRevision: '2026-01-01',
        },
        '9876543': {
            ghinNumber: '9876543',
            firstName: 'Dave',
            lastName: 'Williams',
            handicapIndex: 18.2,
            clubName: 'Pebble Beach',
            lowHandicap: 15.8,
            trend: 'up',
            lastRevision: '2025-12-15',
        },
    };

    return mockPlayers[ghinNumber] || null;
};

// ============================================
// COMPONENT
// ============================================

export function GHINLookup({
    onResult,
    initialGhin = '',
    _autoPopulateName = true,
    className,
}: GHINLookupProps) {
    const [ghinNumber, setGhinNumber] = useState(initialGhin);
    const [state, setState] = useState<LookupState>('idle');
    const [result, setResult] = useState<GHINResult | null>(null);
    const [showHistory, setShowHistory] = useState(false);

    const handleLookup = useCallback(async () => {
        if (!ghinNumber.trim() || ghinNumber.length < 7) {
            return;
        }

        setState('searching');
        setResult(null);

        try {
            const data = await mockGHINLookup(ghinNumber.trim());

            if (data) {
                setResult(data);
                setState('found');
                onResult(data);
            } else {
                setState('not-found');
            }
        } catch {
            setState('error');
        }
    }, [ghinNumber, onResult]);

    const handleInputChange = (value: string) => {
        // Only allow numbers
        const cleaned = value.replace(/\D/g, '').slice(0, 7);
        setGhinNumber(cleaned);

        // Reset state when input changes
        if (state !== 'idle') {
            setState('idle');
            setResult(null);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleLookup();
        }
    };

    const TrendIcon = result?.trend === 'up' ? TrendingUp : result?.trend === 'down' ? TrendingDown : Minus;

    return (
        <div className={cn('space-y-4', className)}>
            {/* Input Section */}
            <div className="space-y-2">
                <label className="block text-sm font-medium text-surface-700 dark:text-surface-300">
                    GHIN Number
                </label>
                <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-400">
                        <Hash className="w-5 h-5" />
                    </div>
                    <input
                        type="text"
                        value={ghinNumber}
                        onChange={(e) => handleInputChange(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Enter your 7-digit GHIN"
                        className={cn(
                            'w-full pl-11 pr-24 py-3 rounded-xl border text-lg font-mono tracking-wider',
                            'bg-white dark:bg-surface-800',
                            'focus:outline-none focus:ring-2 focus:ring-masters/30 focus:border-masters',
                            'transition-all duration-200',
                            state === 'found'
                                ? 'border-green-300 bg-green-50 dark:bg-green-900/10'
                                : state === 'not-found' || state === 'error'
                                    ? 'border-red-300'
                                    : 'border-surface-200 dark:border-surface-700'
                        )}
                        maxLength={7}
                    />
                    <button
                        onClick={handleLookup}
                        disabled={state === 'searching' || ghinNumber.length < 7}
                        className={cn(
                            'absolute right-2 top-1/2 -translate-y-1/2',
                            'px-3 py-1.5 rounded-lg font-medium text-sm',
                            'transition-all duration-200',
                            ghinNumber.length >= 7
                                ? 'bg-masters text-white hover:bg-masters/90'
                                : 'bg-surface-100 dark:bg-surface-700 text-surface-400'
                        )}
                    >
                        {state === 'searching' ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                            <Search className="w-4 h-4" />
                        )}
                    </button>
                </div>
                <p className="text-xs text-surface-500 dark:text-surface-400">
                    Find your GHIN number on your golf club app or card
                </p>
            </div>

            {/* Results Section */}
            <AnimatePresence mode="wait">
                {state === 'searching' && (
                    <motion.div
                        key="searching"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-surface-50 dark:bg-surface-800/50 rounded-xl p-4"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-masters/10 flex items-center justify-center">
                                <Loader2 className="w-5 h-5 text-masters animate-spin" />
                            </div>
                            <div>
                                <div className="font-medium text-surface-900 dark:text-white">
                                    Looking up your handicap...
                                </div>
                                <div className="text-sm text-surface-500">
                                    Checking GHIN database
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {state === 'found' && result && (
                    <motion.div
                        key="found"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-green-50 dark:bg-green-900/10 rounded-xl overflow-hidden border border-green-200 dark:border-green-800"
                    >
                        {/* Success Header */}
                        <div className="p-4 border-b border-green-200 dark:border-green-800">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                                    <CheckCircle className="w-5 h-5 text-white" />
                                </div>
                                <div className="flex-1">
                                    <div className="font-semibold text-green-900 dark:text-green-100">
                                        Found you!
                                    </div>
                                    <div className="text-sm text-green-700 dark:text-green-300">
                                        {result.clubName}
                                    </div>
                                </div>
                                <button
                                    onClick={handleLookup}
                                    className="p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-800/30 transition-colors"
                                    title="Refresh"
                                >
                                    <RefreshCw className="w-4 h-4 text-green-600" />
                                </button>
                            </div>
                        </div>

                        {/* Player Info */}
                        <div className="p-4">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-masters to-emerald-600 flex items-center justify-center">
                                    <User className="w-7 h-7 text-white" />
                                </div>
                                <div>
                                    <div className="text-lg font-semibold text-surface-900 dark:text-white">
                                        {result.firstName} {result.lastName}
                                    </div>
                                    <div className="text-sm text-surface-500">
                                        GHIN: {result.ghinNumber}
                                    </div>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="grid grid-cols-3 gap-3">
                                {/* Current Index */}
                                <div className="bg-white dark:bg-surface-800 rounded-xl p-3 text-center">
                                    <div className="text-2xl font-bold text-masters">
                                        {result.handicapIndex.toFixed(1)}
                                    </div>
                                    <div className="text-xs text-surface-500">Current Index</div>
                                </div>

                                {/* Low Index */}
                                {result.lowHandicap && (
                                    <div className="bg-white dark:bg-surface-800 rounded-xl p-3 text-center">
                                        <div className="text-2xl font-bold text-surface-700 dark:text-surface-300">
                                            {result.lowHandicap.toFixed(1)}
                                        </div>
                                        <div className="text-xs text-surface-500">Low Index</div>
                                    </div>
                                )}

                                {/* Trend */}
                                {result.trend && (
                                    <div className="bg-white dark:bg-surface-800 rounded-xl p-3 text-center">
                                        <div className={cn(
                                            'text-2xl font-bold flex items-center justify-center',
                                            result.trend === 'down' && 'text-green-600',
                                            result.trend === 'up' && 'text-red-500',
                                            result.trend === 'stable' && 'text-surface-500'
                                        )}>
                                            <TrendIcon className="w-6 h-6" />
                                        </div>
                                        <div className="text-xs text-surface-500">
                                            {result.trend === 'down' ? 'Improving' : result.trend === 'up' ? 'Rising' : 'Stable'}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Recent Scores (Expandable) */}
                            {result.recentScores && result.recentScores.length > 0 && (
                                <div className="mt-4">
                                    <button
                                        onClick={() => setShowHistory(!showHistory)}
                                        className="flex items-center gap-2 text-sm font-medium text-masters hover:text-masters/80 transition-colors"
                                    >
                                        <History className="w-4 h-4" />
                                        {showHistory ? 'Hide' : 'Show'} Recent Scores
                                    </button>

                                    <AnimatePresence>
                                        {showHistory && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="overflow-hidden"
                                            >
                                                <div className="mt-3 space-y-2">
                                                    {result.recentScores.map((score, idx) => (
                                                        <div
                                                            key={idx}
                                                            className="flex items-center justify-between py-2 px-3 bg-white dark:bg-surface-800 rounded-lg"
                                                        >
                                                            <span className="text-sm text-surface-500">
                                                                {new Date(score.date).toLocaleDateString('en-US', {
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                })}
                                                            </span>
                                                            <span className="font-semibold text-surface-900 dark:text-white">
                                                                {score.score}
                                                            </span>
                                                            <span className={cn(
                                                                'text-sm font-medium',
                                                                score.differential < result.handicapIndex
                                                                    ? 'text-green-600'
                                                                    : 'text-surface-500'
                                                            )}>
                                                                {score.differential.toFixed(1)}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            )}

                            {/* Last Updated */}
                            {result.lastRevision && (
                                <div className="mt-4 text-xs text-surface-500 text-center">
                                    Last revised: {new Date(result.lastRevision).toLocaleDateString('en-US', {
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric',
                                    })}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}

                {state === 'not-found' && (
                    <motion.div
                        key="not-found"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-4 border border-amber-200 dark:border-amber-800"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-800/30 flex items-center justify-center">
                                <AlertCircle className="w-5 h-5 text-amber-600" />
                            </div>
                            <div>
                                <div className="font-medium text-amber-900 dark:text-amber-100">
                                    No record found
                                </div>
                                <div className="text-sm text-amber-700 dark:text-amber-300">
                                    Double-check your GHIN number, or enter handicap manually below
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {state === 'error' && (
                    <motion.div
                        key="error"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="bg-red-50 dark:bg-red-900/10 rounded-xl p-4 border border-red-200 dark:border-red-800"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-800/30 flex items-center justify-center">
                                <AlertCircle className="w-5 h-5 text-red-600" />
                            </div>
                            <div>
                                <div className="font-medium text-red-900 dark:text-red-100">
                                    Lookup failed
                                </div>
                                <div className="text-sm text-red-700 dark:text-red-300">
                                    Please try again or enter your handicap manually
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Manual Entry Option */}
            {(state === 'idle' || state === 'not-found' || state === 'error') && (
                <div className="text-center">
                    <span className="text-sm text-surface-500">
                        Don&apos;t have a GHIN? No problem—
                    </span>
                    <span className="text-sm text-masters font-medium ml-1">
                        enter your handicap below
                    </span>
                </div>
            )}
        </div>
    );
}

export default GHINLookup;
