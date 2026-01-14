/**
 * Side Bets Component
 *
 * Track various side games and bets during the round:
 * - Skins
 * - Nassau
 * - Closest to Pin (per hole)
 * - Longest Drive (per hole)
 * - Custom bets
 */

'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import {
    DollarSign,
    Target,
    Ruler,
    Trophy,
    Plus,
    Trash2,
    Check,
    Edit2,
    ChevronDown,
    ChevronUp,
    Crown,
} from 'lucide-react';
import type { Player } from '@/lib/types/models';

// ============================================
// TYPES
// ============================================

export type SideBetType = 'skins' | 'nassau' | 'closest_to_pin' | 'longest_drive' | 'custom';

export interface SideBet {
    id: string;
    tripId: string;
    matchId?: string;
    betType: SideBetType;
    name: string;
    amount?: number;
    winnerPlayerId?: string;
    holeNumber?: number;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

interface SideBetsProps {
    tripId: string;
    matchId?: string;
    bets: SideBet[];
    players: Map<string, Player>;
    onAddBet?: (bet: Omit<SideBet, 'id' | 'createdAt' | 'updatedAt'>) => void;
    onUpdateBet?: (betId: string, updates: Partial<SideBet>) => void;
    onDeleteBet?: (betId: string) => void;
    readonly?: boolean;
    className?: string;
}

// ============================================
// MAIN COMPONENT
// ============================================

export function SideBets({
    tripId,
    matchId,
    bets,
    players,
    onAddBet,
    onUpdateBet,
    onDeleteBet,
    readonly = false,
    className,
}: SideBetsProps) {
    const [showAddForm, setShowAddForm] = useState(false);
    const [expandedType, setExpandedType] = useState<SideBetType | null>(null);

    // Group bets by type
    const betsByType = bets.reduce((acc, bet) => {
        if (!acc[bet.betType]) acc[bet.betType] = [];
        acc[bet.betType].push(bet);
        return acc;
    }, {} as Record<SideBetType, SideBet[]>);

    // Calculate totals
    const totalPot = bets.reduce((sum, bet) => sum + (bet.amount || 0), 0);
    const totalWon = bets
        .filter((bet) => bet.winnerPlayerId)
        .reduce((sum, bet) => sum + (bet.amount || 0), 0);

    return (
        <div className={cn('space-y-4', className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-medium flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-secondary-gold" />
                        Side Bets
                    </h3>
                    {totalPot > 0 && (
                        <p className="text-sm text-surface-500">
                            ${totalPot} total pot
                        </p>
                    )}
                </div>
                {!readonly && (
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className={cn(
                            'flex items-center gap-2 px-3 py-2 rounded-lg text-sm',
                            'bg-secondary-gold/10 text-secondary-gold',
                            'hover:bg-secondary-gold/20 transition-colors'
                        )}
                    >
                        <Plus className="w-4 h-4" />
                        Add Bet
                    </button>
                )}
            </div>

            {/* Add Form */}
            {showAddForm && (
                <AddBetForm
                    tripId={tripId}
                    matchId={matchId}
                    players={players}
                    onSubmit={(bet) => {
                        onAddBet?.(bet);
                        setShowAddForm(false);
                    }}
                    onCancel={() => setShowAddForm(false)}
                />
            )}

            {/* Bet Categories */}
            <div className="space-y-3">
                {/* Skins */}
                {(betsByType.skins?.length > 0 || !readonly) && (
                    <BetCategory
                        type="skins"
                        title="Skins"
                        icon={<Crown className="w-5 h-5" />}
                        bets={betsByType.skins || []}
                        players={players}
                        isExpanded={expandedType === 'skins'}
                        onToggle={() => setExpandedType(expandedType === 'skins' ? null : 'skins')}
                        onUpdateBet={onUpdateBet}
                        onDeleteBet={onDeleteBet}
                        readonly={readonly}
                    />
                )}

                {/* Nassau */}
                {(betsByType.nassau?.length > 0 || !readonly) && (
                    <BetCategory
                        type="nassau"
                        title="Nassau"
                        icon={<Trophy className="w-5 h-5" />}
                        bets={betsByType.nassau || []}
                        players={players}
                        isExpanded={expandedType === 'nassau'}
                        onToggle={() => setExpandedType(expandedType === 'nassau' ? null : 'nassau')}
                        onUpdateBet={onUpdateBet}
                        onDeleteBet={onDeleteBet}
                        readonly={readonly}
                    />
                )}

                {/* Closest to Pin */}
                {(betsByType.closest_to_pin?.length > 0 || !readonly) && (
                    <BetCategory
                        type="closest_to_pin"
                        title="Closest to Pin"
                        icon={<Target className="w-5 h-5" />}
                        bets={betsByType.closest_to_pin || []}
                        players={players}
                        isExpanded={expandedType === 'closest_to_pin'}
                        onToggle={() => setExpandedType(expandedType === 'closest_to_pin' ? null : 'closest_to_pin')}
                        onUpdateBet={onUpdateBet}
                        onDeleteBet={onDeleteBet}
                        readonly={readonly}
                    />
                )}

                {/* Longest Drive */}
                {(betsByType.longest_drive?.length > 0 || !readonly) && (
                    <BetCategory
                        type="longest_drive"
                        title="Longest Drive"
                        icon={<Ruler className="w-5 h-5" />}
                        bets={betsByType.longest_drive || []}
                        players={players}
                        isExpanded={expandedType === 'longest_drive'}
                        onToggle={() => setExpandedType(expandedType === 'longest_drive' ? null : 'longest_drive')}
                        onUpdateBet={onUpdateBet}
                        onDeleteBet={onDeleteBet}
                        readonly={readonly}
                    />
                )}

                {/* Custom */}
                {betsByType.custom?.length > 0 && (
                    <BetCategory
                        type="custom"
                        title="Custom Bets"
                        icon={<DollarSign className="w-5 h-5" />}
                        bets={betsByType.custom || []}
                        players={players}
                        isExpanded={expandedType === 'custom'}
                        onToggle={() => setExpandedType(expandedType === 'custom' ? null : 'custom')}
                        onUpdateBet={onUpdateBet}
                        onDeleteBet={onDeleteBet}
                        readonly={readonly}
                    />
                )}
            </div>

            {/* Empty state */}
            {bets.length === 0 && !showAddForm && (
                <div className="text-center py-8 bg-surface-50 dark:bg-surface-800/50 rounded-xl">
                    <DollarSign className="w-10 h-10 mx-auto mb-3 text-surface-400" />
                    <p className="text-surface-500">No side bets yet</p>
                    {!readonly && (
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="mt-3 text-sm text-masters-primary"
                        >
                            Add your first bet
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}

// ============================================
// SUB-COMPONENTS
// ============================================

interface BetCategoryProps {
    type: SideBetType;
    title: string;
    icon: React.ReactNode;
    bets: SideBet[];
    players: Map<string, Player>;
    isExpanded: boolean;
    onToggle: () => void;
    onUpdateBet?: (betId: string, updates: Partial<SideBet>) => void;
    onDeleteBet?: (betId: string) => void;
    readonly?: boolean;
}

function BetCategory({
    type,
    title,
    icon,
    bets,
    players,
    isExpanded,
    onToggle,
    onUpdateBet,
    onDeleteBet,
    readonly,
}: BetCategoryProps) {
    const totalAmount = bets.reduce((sum, bet) => sum + (bet.amount || 0), 0);
    const completedCount = bets.filter((bet) => bet.winnerPlayerId).length;

    return (
        <div className="rounded-xl border border-surface-200 dark:border-surface-700 overflow-hidden">
            <button
                onClick={onToggle}
                className="w-full flex items-center gap-3 p-4 bg-surface-card hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
            >
                <div className="text-secondary-gold">{icon}</div>
                <div className="flex-1 text-left">
                    <div className="font-medium">{title}</div>
                    <div className="text-sm text-surface-500">
                        {bets.length} bet{bets.length !== 1 ? 's' : ''}
                        {totalAmount > 0 && ` · $${totalAmount}`}
                        {completedCount > 0 && ` · ${completedCount} decided`}
                    </div>
                </div>
                {isExpanded ? (
                    <ChevronUp className="w-5 h-5 text-surface-400" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-surface-400" />
                )}
            </button>

            {isExpanded && bets.length > 0 && (
                <div className="border-t border-surface-200 dark:border-surface-700 divide-y divide-surface-200 dark:divide-surface-700">
                    {bets.map((bet) => (
                        <BetItem
                            key={bet.id}
                            bet={bet}
                            players={players}
                            onUpdate={onUpdateBet}
                            onDelete={onDeleteBet}
                            readonly={readonly}
                        />
                    ))}
                </div>
            )}

            {isExpanded && bets.length === 0 && (
                <div className="p-4 text-center text-sm text-surface-500">
                    No {title.toLowerCase()} bets added yet
                </div>
            )}
        </div>
    );
}

interface BetItemProps {
    bet: SideBet;
    players: Map<string, Player>;
    onUpdate?: (betId: string, updates: Partial<SideBet>) => void;
    onDelete?: (betId: string) => void;
    readonly?: boolean;
}

function BetItem({ bet, players, onUpdate, onDelete, readonly }: BetItemProps) {
    const [selectingWinner, setSelectingWinner] = useState(false);
    const winner = bet.winnerPlayerId ? players.get(bet.winnerPlayerId) : null;

    return (
        <div className="p-4 bg-surface-card">
            <div className="flex items-center gap-3">
                {/* Hole number if applicable */}
                {bet.holeNumber && (
                    <div className="w-8 h-8 rounded-full bg-masters-primary/10 text-masters-primary flex items-center justify-center text-sm font-medium">
                        {bet.holeNumber}
                    </div>
                )}

                {/* Bet info */}
                <div className="flex-1">
                    <div className="font-medium">{bet.name}</div>
                    {bet.amount && (
                        <div className="text-sm text-secondary-gold">${bet.amount}</div>
                    )}
                    {bet.notes && (
                        <div className="text-sm text-surface-500 mt-1">{bet.notes}</div>
                    )}
                </div>

                {/* Winner */}
                {winner ? (
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 text-success">
                        <Trophy className="w-4 h-4" />
                        <span className="text-sm font-medium">
                            {winner.firstName} {winner.lastName.charAt(0)}.
                        </span>
                    </div>
                ) : !readonly ? (
                    <button
                        onClick={() => setSelectingWinner(!selectingWinner)}
                        className="px-3 py-1.5 rounded-lg bg-surface-100 dark:bg-surface-800 text-sm hover:bg-surface-200 dark:hover:bg-surface-700 transition-colors"
                    >
                        Set Winner
                    </button>
                ) : (
                    <span className="text-sm text-surface-400">Pending</span>
                )}

                {/* Actions */}
                {!readonly && !winner && (
                    <button
                        onClick={() => onDelete?.(bet.id)}
                        className="p-2 text-surface-400 hover:text-error transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Winner selector */}
            {selectingWinner && !readonly && (
                <div className="mt-3 pt-3 border-t border-surface-200 dark:border-surface-700">
                    <div className="text-sm text-surface-500 mb-2">Select winner:</div>
                    <div className="flex flex-wrap gap-2">
                        {Array.from(players.values()).map((player) => (
                            <button
                                key={player.id}
                                onClick={() => {
                                    onUpdate?.(bet.id, { winnerPlayerId: player.id });
                                    setSelectingWinner(false);
                                }}
                                className="px-3 py-1.5 rounded-lg bg-surface-100 dark:bg-surface-800 text-sm hover:bg-masters-primary hover:text-white transition-colors"
                            >
                                {player.firstName} {player.lastName.charAt(0)}.
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

interface AddBetFormProps {
    tripId: string;
    matchId?: string;
    players: Map<string, Player>;
    onSubmit: (bet: Omit<SideBet, 'id' | 'createdAt' | 'updatedAt'>) => void;
    onCancel: () => void;
}

function AddBetForm({ tripId, matchId, players, onSubmit, onCancel }: AddBetFormProps) {
    const [betType, setBetType] = useState<SideBetType>('closest_to_pin');
    const [name, setName] = useState('');
    const [amount, setAmount] = useState('');
    const [holeNumber, setHoleNumber] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        onSubmit({
            tripId,
            matchId,
            betType,
            name: name || getDefaultName(betType, holeNumber),
            amount: amount ? parseFloat(amount) : undefined,
            holeNumber: holeNumber ? parseInt(holeNumber) : undefined,
        });
    };

    const getDefaultName = (type: SideBetType, hole: string): string => {
        if (type === 'closest_to_pin' && hole) return `CTP #${hole}`;
        if (type === 'longest_drive' && hole) return `Long Drive #${hole}`;
        if (type === 'skins') return 'Skins Game';
        if (type === 'nassau') return 'Nassau';
        return 'Custom Bet';
    };

    return (
        <form onSubmit={handleSubmit} className="p-4 rounded-xl bg-surface-card border border-surface-200 dark:border-surface-700 space-y-4">
            {/* Bet Type */}
            <div>
                <label className="block text-sm font-medium mb-2">Type</label>
                <div className="flex flex-wrap gap-2">
                    {[
                        { type: 'closest_to_pin' as const, label: 'CTP', icon: <Target className="w-4 h-4" /> },
                        { type: 'longest_drive' as const, label: 'Long Drive', icon: <Ruler className="w-4 h-4" /> },
                        { type: 'skins' as const, label: 'Skins', icon: <Crown className="w-4 h-4" /> },
                        { type: 'nassau' as const, label: 'Nassau', icon: <Trophy className="w-4 h-4" /> },
                        { type: 'custom' as const, label: 'Custom', icon: <DollarSign className="w-4 h-4" /> },
                    ].map((option) => (
                        <button
                            key={option.type}
                            type="button"
                            onClick={() => setBetType(option.type)}
                            className={cn(
                                'flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                                betType === option.type
                                    ? 'bg-secondary-gold text-white'
                                    : 'bg-surface-100 dark:bg-surface-800'
                            )}
                        >
                            {option.icon}
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                {/* Hole Number */}
                {(betType === 'closest_to_pin' || betType === 'longest_drive') && (
                    <div>
                        <label className="block text-sm font-medium mb-2">Hole #</label>
                        <input
                            type="number"
                            min="1"
                            max="18"
                            value={holeNumber}
                            onChange={(e) => setHoleNumber(e.target.value)}
                            placeholder="1-18"
                            className="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800"
                        />
                    </div>
                )}

                {/* Amount */}
                <div>
                    <label className="block text-sm font-medium mb-2">Amount ($)</label>
                    <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Optional"
                        className="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800"
                    />
                </div>
            </div>

            {/* Custom name */}
            {betType === 'custom' && (
                <div>
                    <label className="block text-sm font-medium mb-2">Name</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Bet description"
                        className="w-full px-3 py-2 rounded-lg border border-surface-200 dark:border-surface-700 bg-surface-50 dark:bg-surface-800"
                        required
                    />
                </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex-1 py-2 rounded-lg border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="flex-1 py-2 rounded-lg bg-secondary-gold text-white font-medium"
                >
                    Add Bet
                </button>
            </div>
        </form>
    );
}

export default SideBets;
