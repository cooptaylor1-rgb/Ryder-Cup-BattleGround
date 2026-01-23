/**
 * Quick Player Swap Component
 *
 * Emergency player substitution modal for last-minute changes.
 * When someone's running late, sick, or can't play, captains need
 * to swap players fast without rebuilding the entire lineup.
 *
 * Features:
 * - Visual match card showing current pairing
 * - Available player roster with status indicators
 * - One-tap swap with confirmation
 * - Handicap impact preview
 * - Swap history tracking
 * - Notification to affected players
 */

'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeftRight,
    X,
    Check,
    AlertTriangle,
    User,
    Users,
    Clock,
    ChevronRight,
    Search,
    History,
    Bell,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// TYPES
// ============================================

export interface SwapPlayer {
    id: string;
    firstName: string;
    lastName: string;
    handicapIndex: number;
    teamId: 'A' | 'B';
    avatarUrl?: string;
    isAvailable: boolean;
    status?: 'checked-in' | 'en-route' | 'no-show' | 'playing';
    currentMatchId?: string;
}

export interface SwapMatch {
    id: string;
    sessionId: string;
    sessionName: string;
    teeTime?: string;
    startingHole?: number;
    teamAPlayerIds: string[];
    teamBPlayerIds: string[];
    format: 'singles' | 'foursomes' | 'fourball';
}

export interface PlayerSwap {
    id: string;
    matchId: string;
    originalPlayerId: string;
    newPlayerId: string;
    reason?: string;
    timestamp: string;
    performedBy: string;
}

interface QuickPlayerSwapProps {
    match: SwapMatch;
    allPlayers: SwapPlayer[];
    onSwap: (originalPlayerId: string, newPlayerId: string, reason?: string) => void;
    onClose: () => void;
    onNotifyPlayer?: (playerId: string, message: string) => void;
    swapHistory?: PlayerSwap[];
    className?: string;
}

interface PlayerSwapModalProps {
    isOpen: boolean;
    matches: SwapMatch[];
    allPlayers: SwapPlayer[];
    onSwap: (matchId: string, originalPlayerId: string, newPlayerId: string, reason?: string) => void;
    onClose: () => void;
    onNotifyPlayer?: (playerId: string, message: string) => void;
    swapHistory?: PlayerSwap[];
}

// ============================================
// SWAP REASONS
// ============================================

const SWAP_REASONS = [
    { id: 'late', label: 'Running Late', icon: Clock },
    { id: 'sick', label: 'Feeling Unwell', icon: AlertTriangle },
    { id: 'injury', label: 'Injury', icon: User },
    { id: 'emergency', label: 'Personal Emergency', icon: AlertTriangle },
    { id: 'no-show', label: 'No Show', icon: X },
    { id: 'strategy', label: 'Strategic Change', icon: ArrowLeftRight },
    { id: 'other', label: 'Other', icon: Users },
];

// ============================================
// QUICK PLAYER SWAP (SINGLE MATCH)
// ============================================

export function QuickPlayerSwap({
    match,
    allPlayers,
    onSwap,
    onClose,
    onNotifyPlayer,
    swapHistory: _swapHistory = [],
    className,
}: QuickPlayerSwapProps) {
    const [selectedPlayer, setSelectedPlayer] = useState<SwapPlayer | null>(null);
    const [selectedReplacement, setSelectedReplacement] = useState<SwapPlayer | null>(null);
    const [reason, setReason] = useState<string>('');
    const [step, setStep] = useState<'select' | 'replace' | 'confirm'>('select');
    const [searchQuery, setSearchQuery] = useState('');
    const [notifyOriginal, setNotifyOriginal] = useState(true);
    const [notifyReplacement, setNotifyReplacement] = useState(true);

    // Get players in this match
    const matchPlayers = useMemo(() => {
        const teamAPlayers = allPlayers.filter(p => match.teamAPlayerIds.includes(p.id));
        const teamBPlayers = allPlayers.filter(p => match.teamBPlayerIds.includes(p.id));
        return { teamA: teamAPlayers, teamB: teamBPlayers };
    }, [match, allPlayers]);

    // Get available replacements (same team, not in any match)
    const availableReplacements = useMemo(() => {
        if (!selectedPlayer) return [];

        return allPlayers.filter(p =>
            p.teamId === selectedPlayer.teamId &&
            p.id !== selectedPlayer.id &&
            p.isAvailable &&
            !p.currentMatchId
        );
    }, [selectedPlayer, allPlayers]);

    // Filter by search
    const filteredReplacements = useMemo(() => {
        if (!searchQuery) return availableReplacements;
        const query = searchQuery.toLowerCase();
        return availableReplacements.filter(p =>
            `${p.firstName} ${p.lastName}`.toLowerCase().includes(query)
        );
    }, [availableReplacements, searchQuery]);

    // Calculate handicap impact
    const handicapImpact = useMemo(() => {
        if (!selectedPlayer || !selectedReplacement) return null;
        const diff = selectedReplacement.handicapIndex - selectedPlayer.handicapIndex;
        return {
            difference: diff,
            isSignificant: Math.abs(diff) > 3,
            direction: diff > 0 ? 'higher' : diff < 0 ? 'lower' : 'same',
        };
    }, [selectedPlayer, selectedReplacement]);

    const handleSelectPlayer = (player: SwapPlayer) => {
        setSelectedPlayer(player);
        setStep('replace');
    };

    const handleSelectReplacement = (player: SwapPlayer) => {
        setSelectedReplacement(player);
        setStep('confirm');
    };

    const handleConfirmSwap = () => {
        if (!selectedPlayer || !selectedReplacement) return;

        onSwap(selectedPlayer.id, selectedReplacement.id, reason);

        // Send notifications
        if (onNotifyPlayer) {
            if (notifyOriginal) {
                onNotifyPlayer(
                    selectedPlayer.id,
                    `You've been removed from the ${match.sessionName} match. Reason: ${reason || 'Lineup change'}`
                );
            }
            if (notifyReplacement) {
                onNotifyPlayer(
                    selectedReplacement.id,
                    `You've been added to the ${match.sessionName} match! Tee time: ${match.teeTime || 'TBD'}`
                );
            }
        }

        onClose();
    };

    const handleBack = () => {
        if (step === 'confirm') {
            setStep('replace');
            setSelectedReplacement(null);
        } else if (step === 'replace') {
            setStep('select');
            setSelectedPlayer(null);
        }
    };

    const getPlayerStatusColor = (status?: string) => {
        switch (status) {
            case 'checked-in': return 'text-green-500';
            case 'en-route': return 'text-yellow-500';
            case 'no-show': return 'text-red-500';
            case 'playing': return 'text-blue-500';
            default: return 'text-gray-400';
        }
    };

    const getPlayerStatusLabel = (status?: string) => {
        switch (status) {
            case 'checked-in': return 'Checked In';
            case 'en-route': return 'En Route';
            case 'no-show': return 'No Show';
            case 'playing': return 'Playing';
            default: return 'Unknown';
        }
    };

    return (
        <div className={cn('flex flex-col h-full', className)}>
            {/* Header */}
            <div
                className="flex items-center justify-between p-4 border-b"
                style={{ borderColor: 'rgba(128, 120, 104, 0.2)' }}
            >
                <div className="flex items-center gap-3">
                    {step !== 'select' && (
                        <button
                            onClick={handleBack}
                            className="p-1 -ml-1 rounded-lg hover:bg-white/10 transition-colors"
                        >
                            <ChevronRight className="w-5 h-5 rotate-180" style={{ color: 'var(--ink-muted)' }} />
                        </button>
                    )}
                    <div>
                        <h3 className="font-semibold" style={{ color: 'var(--ink)' }}>
                            {step === 'select' && 'Select Player to Replace'}
                            {step === 'replace' && 'Choose Replacement'}
                            {step === 'confirm' && 'Confirm Swap'}
                        </h3>
                        <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
                            {match.sessionName} • {match.teeTime || 'Time TBD'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                    <X className="w-5 h-5" style={{ color: 'var(--ink-muted)' }} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                <AnimatePresence mode="wait">
                    {/* Step 1: Select Player */}
                    {step === 'select' && (
                        <motion.div
                            key="select"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="space-y-4"
                        >
                            {/* Team A */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="w-3 h-3 rounded-full bg-red-500" />
                                    <span className="text-sm font-medium" style={{ color: 'var(--ink-muted)' }}>
                                        Team A
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {matchPlayers.teamA.map(player => (
                                        <button
                                            key={player.id}
                                            onClick={() => handleSelectPlayer(player)}
                                            className="w-full p-3 rounded-xl flex items-center justify-between hover:bg-white/5 transition-colors"
                                            style={{ background: 'var(--surface)', border: '1px solid rgba(128, 120, 104, 0.2)' }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
                                                    style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}
                                                >
                                                    {player.firstName[0]}{player.lastName[0]}
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-medium" style={{ color: 'var(--ink)' }}>
                                                        {player.firstName} {player.lastName}
                                                    </p>
                                                    <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
                                                        HCP: {player.handicapIndex} • <span className={getPlayerStatusColor(player.status)}>{getPlayerStatusLabel(player.status)}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-5 h-5" style={{ color: 'var(--ink-muted)' }} />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Team B */}
                            <div>
                                <div className="flex items-center gap-2 mb-2">
                                    <span className="w-3 h-3 rounded-full bg-blue-500" />
                                    <span className="text-sm font-medium" style={{ color: 'var(--ink-muted)' }}>
                                        Team B
                                    </span>
                                </div>
                                <div className="space-y-2">
                                    {matchPlayers.teamB.map(player => (
                                        <button
                                            key={player.id}
                                            onClick={() => handleSelectPlayer(player)}
                                            className="w-full p-3 rounded-xl flex items-center justify-between hover:bg-white/5 transition-colors"
                                            style={{ background: 'var(--surface)', border: '1px solid rgba(128, 120, 104, 0.2)' }}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
                                                    style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#3b82f6' }}
                                                >
                                                    {player.firstName[0]}{player.lastName[0]}
                                                </div>
                                                <div className="text-left">
                                                    <p className="font-medium" style={{ color: 'var(--ink)' }}>
                                                        {player.firstName} {player.lastName}
                                                    </p>
                                                    <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
                                                        HCP: {player.handicapIndex} • <span className={getPlayerStatusColor(player.status)}>{getPlayerStatusLabel(player.status)}</span>
                                                    </p>
                                                </div>
                                            </div>
                                            <ChevronRight className="w-5 h-5" style={{ color: 'var(--ink-muted)' }} />
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* Step 2: Select Replacement */}
                    {step === 'replace' && selectedPlayer && (
                        <motion.div
                            key="replace"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4"
                        >
                            {/* Current player being replaced */}
                            <div
                                className="p-3 rounded-xl"
                                style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                            >
                                <p className="text-xs font-medium mb-1" style={{ color: '#ef4444' }}>
                                    REPLACING
                                </p>
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
                                        style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}
                                    >
                                        {selectedPlayer.firstName[0]}{selectedPlayer.lastName[0]}
                                    </div>
                                    <div>
                                        <p className="font-medium" style={{ color: 'var(--ink)' }}>
                                            {selectedPlayer.firstName} {selectedPlayer.lastName}
                                        </p>
                                        <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
                                            HCP: {selectedPlayer.handicapIndex}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--ink-muted)' }} />
                                <input
                                    type="text"
                                    placeholder="Search available players..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm"
                                    style={{
                                        background: 'var(--surface)',
                                        border: '1px solid rgba(128, 120, 104, 0.2)',
                                        color: 'var(--ink)',
                                    }}
                                />
                            </div>

                            {/* Available replacements */}
                            <div>
                                <p className="text-sm font-medium mb-2" style={{ color: 'var(--ink-muted)' }}>
                                    Available Players ({filteredReplacements.length})
                                </p>
                                {filteredReplacements.length === 0 ? (
                                    <div className="p-6 text-center" style={{ color: 'var(--ink-muted)' }}>
                                        <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No available players on this team</p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {filteredReplacements.map(player => {
                                            const hcpDiff = player.handicapIndex - selectedPlayer.handicapIndex;
                                            return (
                                                <button
                                                    key={player.id}
                                                    onClick={() => handleSelectReplacement(player)}
                                                    className="w-full p-3 rounded-xl flex items-center justify-between hover:bg-white/5 transition-colors"
                                                    style={{ background: 'var(--surface)', border: '1px solid rgba(128, 120, 104, 0.2)' }}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div
                                                            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
                                                            style={{
                                                                background: selectedPlayer.teamId === 'A' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)',
                                                                color: selectedPlayer.teamId === 'A' ? '#ef4444' : '#3b82f6',
                                                            }}
                                                        >
                                                            {player.firstName[0]}{player.lastName[0]}
                                                        </div>
                                                        <div className="text-left">
                                                            <p className="font-medium" style={{ color: 'var(--ink)' }}>
                                                                {player.firstName} {player.lastName}
                                                            </p>
                                                            <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
                                                                HCP: {player.handicapIndex}
                                                                {hcpDiff !== 0 && (
                                                                    <span className={cn('ml-2', hcpDiff > 0 ? 'text-red-400' : 'text-green-400')}>
                                                                        ({hcpDiff > 0 ? '+' : ''}{hcpDiff.toFixed(1)})
                                                                    </span>
                                                                )}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <ChevronRight className="w-5 h-5" style={{ color: 'var(--ink-muted)' }} />
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* Step 3: Confirm */}
                    {step === 'confirm' && selectedPlayer && selectedReplacement && (
                        <motion.div
                            key="confirm"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="space-y-4"
                        >
                            {/* Swap visualization */}
                            <div
                                className="p-4 rounded-xl"
                                style={{ background: 'var(--surface)', border: '1px solid rgba(128, 120, 104, 0.2)' }}
                            >
                                <div className="flex items-center justify-between">
                                    {/* Original */}
                                    <div className="text-center">
                                        <div
                                            className="w-14 h-14 mx-auto rounded-full flex items-center justify-center text-lg font-medium mb-2"
                                            style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}
                                        >
                                            {selectedPlayer.firstName[0]}{selectedPlayer.lastName[0]}
                                        </div>
                                        <p className="font-medium text-sm" style={{ color: 'var(--ink)' }}>
                                            {selectedPlayer.firstName}
                                        </p>
                                        <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>
                                            HCP: {selectedPlayer.handicapIndex}
                                        </p>
                                    </div>

                                    {/* Arrow */}
                                    <div className="flex flex-col items-center">
                                        <ArrowLeftRight className="w-6 h-6" style={{ color: 'var(--masters)' }} />
                                    </div>

                                    {/* Replacement */}
                                    <div className="text-center">
                                        <div
                                            className="w-14 h-14 mx-auto rounded-full flex items-center justify-center text-lg font-medium mb-2"
                                            style={{ background: 'rgba(34, 197, 94, 0.2)', color: '#22c55e' }}
                                        >
                                            {selectedReplacement.firstName[0]}{selectedReplacement.lastName[0]}
                                        </div>
                                        <p className="font-medium text-sm" style={{ color: 'var(--ink)' }}>
                                            {selectedReplacement.firstName}
                                        </p>
                                        <p className="text-xs" style={{ color: 'var(--ink-muted)' }}>
                                            HCP: {selectedReplacement.handicapIndex}
                                        </p>
                                    </div>
                                </div>

                                {/* Handicap impact */}
                                {handicapImpact && handicapImpact.difference !== 0 && (
                                    <div
                                        className={cn(
                                            'mt-4 p-2 rounded-lg text-center text-sm',
                                            handicapImpact.isSignificant ? 'bg-yellow-500/10' : 'bg-white/5'
                                        )}
                                    >
                                        {handicapImpact.isSignificant && (
                                            <AlertTriangle className="w-4 h-4 inline-block mr-1 text-yellow-500" />
                                        )}
                                        <span style={{ color: handicapImpact.isSignificant ? '#eab308' : 'var(--ink-muted)' }}>
                                            Handicap {handicapImpact.direction === 'higher' ? 'increases' : 'decreases'} by{' '}
                                            {Math.abs(handicapImpact.difference).toFixed(1)}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Reason */}
                            <div>
                                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--ink-muted)' }}>
                                    Reason for swap
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {SWAP_REASONS.map(r => {
                                        const Icon = r.icon;
                                        return (
                                            <button
                                                key={r.id}
                                                onClick={() => setReason(r.label)}
                                                className={cn(
                                                    'p-2 rounded-lg flex items-center gap-2 text-sm transition-colors',
                                                    reason === r.label ? 'ring-2 ring-[var(--masters)]' : ''
                                                )}
                                                style={{
                                                    background: reason === r.label ? 'var(--masters-muted)' : 'var(--surface)',
                                                    border: '1px solid rgba(128, 120, 104, 0.2)',
                                                    color: reason === r.label ? 'var(--masters)' : 'var(--ink)',
                                                }}
                                            >
                                                <Icon className="w-4 h-4" />
                                                {r.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Notifications */}
                            <div
                                className="p-3 rounded-xl space-y-2"
                                style={{ background: 'var(--surface)', border: '1px solid rgba(128, 120, 104, 0.2)' }}
                            >
                                <p className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--ink-muted)' }}>
                                    <Bell className="w-4 h-4" />
                                    Notifications
                                </p>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={notifyOriginal}
                                        onChange={(e) => setNotifyOriginal(e.target.checked)}
                                        className="w-4 h-4 rounded"
                                    />
                                    <span className="text-sm" style={{ color: 'var(--ink)' }}>
                                        Notify {selectedPlayer.firstName} (removed)
                                    </span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={notifyReplacement}
                                        onChange={(e) => setNotifyReplacement(e.target.checked)}
                                        className="w-4 h-4 rounded"
                                    />
                                    <span className="text-sm" style={{ color: 'var(--ink)' }}>
                                        Notify {selectedReplacement.firstName} (added)
                                    </span>
                                </label>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer */}
            {step === 'confirm' && (
                <div className="p-4 border-t" style={{ borderColor: 'rgba(128, 120, 104, 0.2)' }}>
                    <button
                        onClick={handleConfirmSwap}
                        className="w-full py-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-colors"
                        style={{ background: 'var(--masters)', color: '#000' }}
                    >
                        <Check className="w-5 h-5" />
                        Confirm Swap
                    </button>
                </div>
            )}
        </div>
    );
}

// ============================================
// PLAYER SWAP MODAL (MULTI-MATCH)
// ============================================

export function PlayerSwapModal({
    isOpen,
    matches,
    allPlayers,
    onSwap,
    onClose,
    onNotifyPlayer,
    swapHistory = [],
}: PlayerSwapModalProps) {
    const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);

    const selectedMatch = matches.find(m => m.id === selectedMatchId);

    const handleSwap = (originalPlayerId: string, newPlayerId: string, reason?: string) => {
        if (selectedMatchId) {
            onSwap(selectedMatchId, originalPlayerId, newPlayerId, reason);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal */}
            <motion.div
                initial={{ opacity: 0, y: 100 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 100 }}
                className="relative w-full max-w-lg max-h-[85vh] sm:max-h-[70vh] rounded-t-2xl sm:rounded-2xl overflow-hidden"
                style={{ background: 'var(--canvas)' }}
            >
                {selectedMatch ? (
                    <QuickPlayerSwap
                        match={selectedMatch}
                        allPlayers={allPlayers}
                        onSwap={handleSwap}
                        onClose={() => setSelectedMatchId(null)}
                        onNotifyPlayer={onNotifyPlayer}
                        swapHistory={swapHistory.filter(s => s.matchId === selectedMatch.id)}
                    />
                ) : (
                    <>
                        {/* Header */}
                        <div
                            className="flex items-center justify-between p-4 border-b"
                            style={{ borderColor: 'rgba(128, 120, 104, 0.2)' }}
                        >
                            <div className="flex items-center gap-3">
                                <ArrowLeftRight className="w-6 h-6" style={{ color: 'var(--masters)' }} />
                                <div>
                                    <h2 className="font-semibold text-lg" style={{ color: 'var(--ink)' }}>
                                        Quick Player Swap
                                    </h2>
                                    <p className="text-sm" style={{ color: 'var(--ink-muted)' }}>
                                        Select a match to make changes
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowHistory(!showHistory)}
                                    className={cn(
                                        'p-2 rounded-lg transition-colors',
                                        showHistory ? 'bg-white/10' : 'hover:bg-white/5'
                                    )}
                                >
                                    <History className="w-5 h-5" style={{ color: 'var(--ink-muted)' }} />
                                </button>
                                <button
                                    onClick={onClose}
                                    className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                                >
                                    <X className="w-5 h-5" style={{ color: 'var(--ink-muted)' }} />
                                </button>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="overflow-y-auto max-h-[calc(85vh-80px)] sm:max-h-[calc(70vh-80px)] p-4">
                            {showHistory ? (
                                <div className="space-y-3">
                                    <h3 className="text-sm font-medium" style={{ color: 'var(--ink-muted)' }}>
                                        Recent Swaps
                                    </h3>
                                    {swapHistory.length === 0 ? (
                                        <div className="p-6 text-center" style={{ color: 'var(--ink-muted)' }}>
                                            <History className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                            <p className="text-sm">No swaps recorded</p>
                                        </div>
                                    ) : (
                                        swapHistory.slice(0, 10).map(swap => {
                                            const original = allPlayers.find(p => p.id === swap.originalPlayerId);
                                            const replacement = allPlayers.find(p => p.id === swap.newPlayerId);
                                            const match = matches.find(m => m.id === swap.matchId);
                                            return (
                                                <div
                                                    key={swap.id}
                                                    className="p-3 rounded-xl"
                                                    style={{ background: 'var(--surface)', border: '1px solid rgba(128, 120, 104, 0.2)' }}
                                                >
                                                    <div className="flex items-center justify-between mb-1">
                                                        <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>
                                                            {match?.sessionName}
                                                        </span>
                                                        <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>
                                                            {new Date(swap.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm" style={{ color: 'var(--ink)' }}>
                                                        <span className="text-red-400">{original?.firstName} {original?.lastName}</span>
                                                        <span className="mx-2">→</span>
                                                        <span className="text-green-400">{replacement?.firstName} {replacement?.lastName}</span>
                                                    </p>
                                                    {swap.reason && (
                                                        <p className="text-xs mt-1" style={{ color: 'var(--ink-muted)' }}>
                                                            {swap.reason}
                                                        </p>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {matches.map(match => {
                                        const teamAPlayers = allPlayers.filter(p => match.teamAPlayerIds.includes(p.id));
                                        const teamBPlayers = allPlayers.filter(p => match.teamBPlayerIds.includes(p.id));

                                        return (
                                            <button
                                                key={match.id}
                                                onClick={() => setSelectedMatchId(match.id)}
                                                className="w-full p-4 rounded-xl text-left hover:bg-white/5 transition-colors"
                                                style={{ background: 'var(--surface)', border: '1px solid rgba(128, 120, 104, 0.2)' }}
                                            >
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                                                        {match.sessionName}
                                                    </span>
                                                    <span className="text-sm" style={{ color: 'var(--ink-muted)' }}>
                                                        {match.teeTime || 'Time TBD'}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-1 mb-1">
                                                            <span className="w-2 h-2 rounded-full bg-red-500" />
                                                            <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>Team A</span>
                                                        </div>
                                                        <p className="text-sm truncate" style={{ color: 'var(--ink)' }}>
                                                            {teamAPlayers.map(p => p.firstName).join(' & ')}
                                                        </p>
                                                    </div>
                                                    <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>vs</span>
                                                    <div className="flex-1 text-right">
                                                        <div className="flex items-center justify-end gap-1 mb-1">
                                                            <span className="text-xs" style={{ color: 'var(--ink-muted)' }}>Team B</span>
                                                            <span className="w-2 h-2 rounded-full bg-blue-500" />
                                                        </div>
                                                        <p className="text-sm truncate" style={{ color: 'var(--ink)' }}>
                                                            {teamBPlayers.map(p => p.firstName).join(' & ')}
                                                        </p>
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </motion.div>
        </div>
    );
}

export default QuickPlayerSwap;
