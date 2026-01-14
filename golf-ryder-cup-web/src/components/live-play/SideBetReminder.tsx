/**
 * Side Bet Reminder Component
 *
 * Context-aware reminders for side bets during play.
 * Alerts players when approaching holes with active competitions.
 *
 * Features:
 * - Proactive reminders based on current hole
 * - Quick distance/result entry for CTP
 * - Long drive tracking
 * - Skins game status
 * - Nassau scoring updates
 * - Haptic feedback on alerts
 * - Dismissable with snooze option
 * - Integration with bet tracking system
 */

'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    DollarSign,
    Target,
    Trophy,
    ArrowRight,
    X,
    Clock,
    MapPin,
    Ruler,
    Crown,
    Flame,
    Bell,
    BellOff,
    Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/lib/hooks/useHaptic';
import { useTripStore } from '@/lib/stores';

// ============================================
// TYPES
// ============================================

export type SideBetType =
    | 'ctp'           // Closest to pin
    | 'long_drive'    // Long drive
    | 'skins'         // Skins game
    | 'nassau'        // Nassau bet
    | 'birdie_pool'   // Birdie pool
    | 'greenies'      // Greens in regulation
    | 'sandies'       // Up and down from bunker
    | 'custom';       // Custom bet

export interface SideBet {
    id: string;
    type: SideBetType;
    name: string;
    description?: string;
    holes?: number[];           // Specific holes for CTP/Long Drive
    buyIn: number;
    pot: number;
    participants: string[];     // Player IDs
    status: 'active' | 'completed' | 'pending';
    results?: {
        playerId: string;
        value: number | string;
        holeNumber?: number;
    }[];
    winner?: {
        playerId: string;
        winnings: number;
    };
}

export interface SideBetReminder {
    bet: SideBet;
    holeNumber: number;
    type: 'upcoming' | 'current' | 'result_needed';
}

interface SideBetReminderProps {
    /** Current hole being played */
    currentHole: number;
    /** Active side bets */
    bets: SideBet[];
    /** Callback when result is entered */
    onResultEntered?: (betId: string, result: { playerId: string; value: number | string; holeNumber: number }) => void;
    /** Callback when bet is dismissed/snoozed */
    onDismiss?: (betId: string, snooze?: boolean) => void;
    /** Player ID of current user */
    currentPlayerId?: string;
    /** Custom class name */
    className?: string;
}

// ============================================
// COMPONENT
// ============================================

export function SideBetReminder({
    currentHole,
    bets,
    onResultEntered,
    onDismiss,
    currentPlayerId,
    className,
}: SideBetReminderProps) {
    const { trigger } = useHaptic();
    const { players } = useTripStore();

    const [dismissedBets, setDismissedBets] = useState<Set<string>>(new Set());
    const [expandedBet, setExpandedBet] = useState<string | null>(null);
    const [ctpValue, setCtpValue] = useState('');
    const [showAll, setShowAll] = useState(false);
    const [snoozeTimeouts] = useState<Map<string, NodeJS.Timeout>>(new Map());

    // Cleanup snooze timeouts on unmount
    useEffect(() => {
        return () => {
            snoozeTimeouts.forEach((timeout) => clearTimeout(timeout));
            snoozeTimeouts.clear();
        };
    }, [snoozeTimeouts]);

    // Calculate active reminders based on current hole
    const reminders = useMemo((): SideBetReminder[] => {
        const results: SideBetReminder[] = [];

        bets
            .filter(bet => bet.status === 'active' && !dismissedBets.has(bet.id))
            .forEach(bet => {
                if (bet.type === 'ctp' || bet.type === 'long_drive') {
                    // Check if current hole or next hole is a bet hole
                    const holes = bet.holes || [];
                    if (holes.includes(currentHole)) {
                        results.push({ bet, holeNumber: currentHole, type: 'current' });
                    } else if (holes.includes(currentHole + 1)) {
                        results.push({ bet, holeNumber: currentHole + 1, type: 'upcoming' });
                    }

                    // Check if we need results for a previous hole
                    const previousBetHoles = holes.filter(h => h < currentHole);
                    previousBetHoles.forEach(h => {
                        const hasResult = bet.results?.some(r => r.holeNumber === h);
                        if (!hasResult) {
                            results.push({ bet, holeNumber: h, type: 'result_needed' });
                        }
                    });
                } else if (bet.type === 'skins') {
                    // Skins reminder at start and key holes
                    if (currentHole === 1 || currentHole === 10 || currentHole === 18) {
                        results.push({ bet, holeNumber: currentHole, type: 'current' });
                    }
                } else if (bet.type === 'nassau') {
                    // Nassau reminders at front 9 / back 9 transitions
                    if (currentHole === 9 || currentHole === 18) {
                        results.push({ bet, holeNumber: currentHole, type: 'current' });
                    }
                }
            });

        // Sort by priority: current > result_needed > upcoming
        return results.sort((a, b) => {
            const priority = { current: 0, result_needed: 1, upcoming: 2 };
            return priority[a.type] - priority[b.type];
        });
    }, [bets, currentHole, dismissedBets]);

    // Trigger haptic for new current reminders
    useEffect(() => {
        const currentReminders = reminders.filter(r => r.type === 'current');
        if (currentReminders.length > 0) {
            trigger('scorePoint');
        }
    }, [currentHole, reminders.length, trigger]);

    // Handle dismiss
    const handleDismiss = useCallback((betId: string, snooze = false) => {
        trigger('light');
        if (snooze) {
            // Clear any existing snooze timeout for this bet
            const existingTimeout = snoozeTimeouts.get(betId);
            if (existingTimeout) {
                clearTimeout(existingTimeout);
            }
            // Snooze for 1 minute, then re-appear
            const timeout = setTimeout(() => {
                setDismissedBets(prev => {
                    const next = new Set(prev);
                    next.delete(betId);
                    return next;
                });
                snoozeTimeouts.delete(betId);
            }, 60000);
            snoozeTimeouts.set(betId, timeout);
        }
        setDismissedBets(prev => new Set([...prev, betId]));
        onDismiss?.(betId, snooze);
    }, [trigger, onDismiss, snoozeTimeouts]);

    // Handle CTP/Long Drive result entry
    const handleResultSubmit = useCallback((betId: string, holeNumber: number) => {
        if (!ctpValue || !currentPlayerId) return;

        trigger('success');
        onResultEntered?.(betId, {
            playerId: currentPlayerId,
            value: ctpValue,
            holeNumber,
        });
        setCtpValue('');
        setExpandedBet(null);
    }, [ctpValue, currentPlayerId, trigger, onResultEntered]);

    // Get bet icon
    const getBetIcon = (type: SideBetType) => {
        switch (type) {
            case 'ctp':
                return <Target className="w-5 h-5" />;
            case 'long_drive':
                return <Ruler className="w-5 h-5" />;
            case 'skins':
                return <Flame className="w-5 h-5" />;
            case 'nassau':
                return <Trophy className="w-5 h-5" />;
            case 'birdie_pool':
                return <Crown className="w-5 h-5" />;
            default:
                return <DollarSign className="w-5 h-5" />;
        }
    };

    // Get reminder colors
    const getReminderColors = (type: 'upcoming' | 'current' | 'result_needed') => {
        switch (type) {
            case 'current':
                return {
                    bg: 'rgba(0, 103, 71, 0.15)',
                    border: 'rgba(34, 197, 94, 0.4)',
                    accent: 'var(--masters)',
                };
            case 'result_needed':
                return {
                    bg: 'rgba(217, 119, 6, 0.15)',
                    border: 'rgba(251, 191, 36, 0.4)',
                    accent: '#F59E0B',
                };
            case 'upcoming':
                return {
                    bg: 'rgba(59, 130, 246, 0.15)',
                    border: 'rgba(96, 165, 250, 0.4)',
                    accent: '#3B82F6',
                };
        }
    };

    // Get player name
    const getPlayerName = (playerId: string) => {
        const player = players.find(p => p.id === playerId);
        return player ? `${player.firstName || 'Unknown'} ${player.lastName?.[0] || ''}.` : 'Unknown';
    };

    const displayReminders = showAll ? reminders : reminders.slice(0, 2);

    if (reminders.length === 0) return null;

    return (
        <div className={cn('space-y-2', className)}>
            {/* Header */}
            <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-secondary-gold" />
                    <span className="text-xs font-medium text-white/60 uppercase tracking-wider">
                        Side Bets
                    </span>
                    {reminders.length > 2 && (
                        <span className="px-1.5 py-0.5 rounded-full bg-white/10 text-[10px] text-white/40">
                            {reminders.length}
                        </span>
                    )}
                </div>
                {reminders.length > 2 && (
                    <button
                        onClick={() => setShowAll(!showAll)}
                        className="text-xs text-white/40 hover:text-white/60"
                    >
                        {showAll ? 'Show less' : 'Show all'}
                    </button>
                )}
            </div>

            {/* Reminder cards */}
            <AnimatePresence mode="popLayout">
                {displayReminders.map(({ bet, holeNumber, type }) => {
                    const colors = getReminderColors(type);
                    const isExpanded = expandedBet === bet.id;

                    return (
                        <motion.div
                            key={`${bet.id}-${holeNumber}`}
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            layout
                            className={cn(
                                'rounded-xl overflow-hidden',
                                'backdrop-blur-md',
                            )}
                            style={{
                                background: colors.bg,
                                border: `1px solid ${colors.border}`,
                            }}
                        >
                            {/* Main content */}
                            <button
                                onClick={() => setExpandedBet(isExpanded ? null : bet.id)}
                                className="w-full flex items-center gap-3 p-4"
                            >
                                {/* Icon */}
                                <div
                                    className="flex-shrink-0 p-2 rounded-xl"
                                    style={{ background: `${colors.accent}20`, color: colors.accent }}
                                >
                                    {getBetIcon(bet.type)}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0 text-left">
                                    <div className="flex items-center gap-2">
                                        <span className="font-semibold text-white text-sm">
                                            {bet.name}
                                        </span>
                                        <span
                                            className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase"
                                            style={{
                                                background: `${colors.accent}30`,
                                                color: colors.accent,
                                            }}
                                        >
                                            {type === 'current' ? 'NOW' : type === 'result_needed' ? 'NEEDS RESULT' : 'UPCOMING'}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-white/60">
                                        <span className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            Hole {holeNumber}
                                        </span>
                                        <span className="flex items-center gap-1">
                                            <DollarSign className="w-3 h-3" />
                                            ${bet.pot} pot
                                        </span>
                                    </div>
                                </div>

                                {/* Arrow */}
                                <ArrowRight
                                    className={cn(
                                        'w-5 h-5 text-white/40 transition-transform',
                                        isExpanded && 'rotate-90'
                                    )}
                                />
                            </button>

                            {/* Expanded content */}
                            <AnimatePresence>
                                {isExpanded && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="px-4 pb-4 space-y-3">
                                            <div className="h-px bg-white/10" />

                                            {/* CTP/Long Drive result entry */}
                                            {(bet.type === 'ctp' || bet.type === 'long_drive') && type !== 'upcoming' && (
                                                <div className="space-y-2">
                                                    <label className="text-xs text-white/60">
                                                        {bet.type === 'ctp' ? 'Enter distance (feet\'inches)' : 'Enter distance (yards)'}
                                                    </label>
                                                    <div className="flex gap-2">
                                                        <input
                                                            type="text"
                                                            value={ctpValue}
                                                            onChange={(e) => setCtpValue(e.target.value)}
                                                            placeholder={bet.type === 'ctp' ? "e.g., 4'6\"" : 'e.g., 285'}
                                                            className={cn(
                                                                'flex-1 px-3 py-2 rounded-lg',
                                                                'bg-white/10 text-white placeholder-white/30',
                                                                'border border-white/10',
                                                                'focus:outline-none focus:ring-2 focus:ring-white/20',
                                                                'text-sm',
                                                            )}
                                                        />
                                                        <button
                                                            onClick={() => handleResultSubmit(bet.id, holeNumber)}
                                                            disabled={!ctpValue}
                                                            className={cn(
                                                                'px-4 py-2 rounded-lg',
                                                                'text-white font-medium text-sm',
                                                                'transition-colors',
                                                                ctpValue
                                                                    ? 'bg-masters hover:bg-masters/80'
                                                                    : 'bg-white/10 opacity-50 cursor-not-allowed',
                                                            )}
                                                        >
                                                            <Check className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Current results */}
                                            {bet.results && bet.results.length > 0 && (
                                                <div className="space-y-1">
                                                    <span className="text-xs text-white/40">Current Standings</span>
                                                    {bet.results
                                                        .filter(r => !bet.holes || bet.holes.includes(r.holeNumber || 0))
                                                        .map((result, i) => (
                                                            <div
                                                                key={i}
                                                                className="flex items-center justify-between text-xs"
                                                            >
                                                                <span className="text-white/80">
                                                                    {getPlayerName(result.playerId)}
                                                                </span>
                                                                <span className="font-mono text-white/60">
                                                                    {result.value}
                                                                </span>
                                                            </div>
                                                        ))}
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleDismiss(bet.id, true)}
                                                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-white/10 text-white/60 text-xs hover:bg-white/20 transition-colors"
                                                >
                                                    <Clock className="w-3 h-3" />
                                                    Snooze
                                                </button>
                                                <button
                                                    onClick={() => handleDismiss(bet.id)}
                                                    className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-white/10 text-white/60 text-xs hover:bg-white/20 transition-colors"
                                                >
                                                    <BellOff className="w-3 h-3" />
                                                    Dismiss
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}

export default SideBetReminder;
