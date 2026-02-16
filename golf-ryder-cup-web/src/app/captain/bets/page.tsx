'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useTripStore, useUIStore } from '@/lib/stores';
import { EmptyStatePremium } from '@/components/ui/EmptyStatePremium';
import { BottomNav, PageHeader } from '@/components/layout';
import { betsLogger } from '@/lib/utils/logger';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { SideBet, SideBetType, Player } from '@/lib/types/models';
import {
    Home,
    Target,
    Users,
    Trophy,
    MoreHorizontal,
    DollarSign,
    Zap,
    TrendingUp,
    Plus,
    Check,
    Clock,
    Crown,
    CalendarDays,
    Trash2,
    Edit3,
    Save,
    X,
} from 'lucide-react';

/**
 * CAPTAIN SIDE BETS PAGE
 *
 * Easy creation and management of side bets for captains.
 * Create skins, closest to pin, long drive, nassau, and custom bets.
 */

const BET_TYPES: { type: SideBetType; label: string; description: string; icon: typeof Zap; color: string }[] = [
    { type: 'skins', label: 'Skins Game', description: 'Win holes outright for $', icon: Zap, color: '#f59e0b' },
    { type: 'ctp', label: 'Closest to Pin', description: 'Nearest on par 3s', icon: Target, color: '#3b82f6' },
    { type: 'longdrive', label: 'Long Drive', description: 'Longest drive wins', icon: TrendingUp, color: '#8b5cf6' },
    { type: 'nassau', label: 'Nassau', description: 'Front, back, and overall', icon: DollarSign, color: '#10b981' },
    { type: 'custom', label: 'Custom Bet', description: 'Create your own', icon: Plus, color: '#64748b' },
];

export default function CaptainBetsPage() {
    const router = useRouter();
    const { currentTrip, players } = useTripStore();
    const { isCaptainMode, showToast } = useUIStore();
    const { showConfirm, ConfirmDialogComponent } = useConfirmDialog();

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingBet, setEditingBet] = useState<SideBet | null>(null);
    const [newBetType, setNewBetType] = useState<SideBetType>('skins');
    const [newBetName, setNewBetName] = useState('');
    const [newBetDescription, setNewBetDescription] = useState('');
    const [newBetPot, setNewBetPot] = useState(20);
    const [newBetHole, setNewBetHole] = useState<number | undefined>();
    const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Note: avoid auto-redirects so we can render explicit empty states.

    // Get side bets for current trip
    const sideBets = useLiveQuery(
        async () => {
            if (!currentTrip) return [];
            return db.sideBets
                .where('tripId')
                .equals(currentTrip.id)
                .toArray();
        },
        [currentTrip?.id],
        []
    );

    // Define all hooks BEFORE any early return (React Rules of Hooks)
    const executeDeleteBet = useCallback(async (betId: string) => {
        if (!currentTrip) return;
        setIsSubmitting(true);
        try {
            await db.sideBets.delete(betId);
            showToast('success', 'Bet deleted');
        } catch (error) {
            betsLogger.error('Failed to delete bet:', error);
            showToast('error', 'Failed to delete bet. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    }, [currentTrip, showToast]);

    const handleDeleteBet = useCallback((betId: string) => {
        showConfirm({
            title: 'Delete Bet',
            message: 'Are you sure you want to delete this bet? This action cannot be undone.',
            confirmLabel: 'Delete',
            cancelLabel: 'Cancel',
            variant: 'danger',
            onConfirm: async () => {
                await executeDeleteBet(betId);
            },
        });
    }, [showConfirm, executeDeleteBet]);

    if (!currentTrip) {
        return (
            <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-canvas">
                <main className="container-editorial py-12">
                    <EmptyStatePremium
                        illustration="golf-ball"
                        title="No active trip"
                        description="Start or select a trip to manage side bets."
                        action={{
                            label: 'Go Home',
                            onClick: () => router.push('/'),
                            icon: <Home size={16} />,
                        }}
                        variant="large"
                    />
                </main>
                <BottomNav />
            </div>
        );
    }

    if (!isCaptainMode) {
        return (
            <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-canvas">
                <main className="container-editorial py-12">
                    <EmptyStatePremium
                        illustration="trophy"
                        title="Captain mode required"
                        description="Turn on Captain Mode to access Side Bets."
                        action={{
                            label: 'Open More',
                            onClick: () => router.push('/more'),
                            icon: <MoreHorizontal size={16} />,
                        }}
                        secondaryAction={{
                            label: 'Go Home',
                            onClick: () => router.push('/'),
                        }}
                        variant="large"
                    />
                </main>
                <BottomNav />
            </div>
        );
    }

    const activeBets = sideBets.filter(b => b.status === 'active' || b.status === 'pending');
    const completedBets = sideBets.filter(b => b.status === 'completed');

    const resetForm = () => {
        setNewBetType('skins');
        setNewBetName('');
        setNewBetDescription('');
        setNewBetPot(20);
        setNewBetHole(undefined);
        setSelectedParticipants(players.map(p => p.id));
        setEditingBet(null);
    };

    const openCreateModal = (type: SideBetType) => {
        const betInfo = BET_TYPES.find(b => b.type === type);
        setNewBetType(type);
        setNewBetName(betInfo?.label || '');
        setNewBetDescription(betInfo?.description || '');
        setNewBetPot(20);
        setNewBetHole(undefined);
        setSelectedParticipants(players.map(p => p.id));
        setShowCreateModal(true);
    };

    const handleCreateBet = async () => {
        if (!currentTrip || isSubmitting) return;
        if (!newBetName.trim()) {
            showToast('error', 'Please enter a bet name');
            return;
        }

        setIsSubmitting(true);

        try {
            const newBet: SideBet = {
                id: crypto.randomUUID(),
                tripId: currentTrip.id,
                type: newBetType,
                name: newBetName,
                description: newBetDescription,
                status: 'active',
                pot: newBetPot,
                participantIds: selectedParticipants,
                hole: newBetHole,
                createdAt: new Date().toISOString(),
            };

            await db.sideBets.add(newBet);
            showToast('success', `${newBetName} created!`);
            setShowCreateModal(false);
            resetForm();
        } catch (error) {
            betsLogger.error('Failed to create bet:', error);
            showToast('error', 'Failed to create bet. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateBet = async (betId: string, updates: Partial<SideBet>) => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            await db.sideBets.update(betId, updates);
            showToast('success', 'Bet updated');
            setEditingBet(null);
        } catch (error) {
            betsLogger.error('Failed to update bet:', error);
            showToast('error', 'Failed to update bet. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCompleteBet = async (betId: string, winnerId?: string) => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            await db.sideBets.update(betId, {
                status: 'completed',
                winnerId,
            });
            showToast('success', 'Bet completed!');
        } catch (error) {
            betsLogger.error('Failed to complete bet:', error);
            showToast('error', 'Failed to complete bet. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getPlayer = (id: string) => players.find(p => p.id === id);

    const getBetIcon = (type: SideBetType) => {
        const betType = BET_TYPES.find(b => b.type === type);
        const Icon = betType?.icon || DollarSign;
        return <Icon size={20} />;
    };

    const getBetColor = (type: SideBetType) => {
        return BET_TYPES.find(b => b.type === type)?.color || '#64748b';
    };

    return (
        <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-canvas">
            <PageHeader
                title="Side Bets"
                subtitle={`${activeBets.length} active`}
                icon={<DollarSign size={16} style={{ color: 'var(--canvas)' }} />}
                iconContainerStyle={{
                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                }}
                onBack={() => router.back()}
            />

            <main className="container-editorial pt-[var(--space-4)]">
                {/* Quick Create Section */}
                <section className="section">
                    <h2 className="type-overline mb-[var(--space-4)]">Quick Create</h2>
                    <div className="grid grid-cols-2 gap-[var(--space-3)]">
                        {BET_TYPES.map((betType) => (
                            <button
                                key={betType.type}
                                onClick={() => openCreateModal(betType.type)}
                                className="card-premium press-scale p-[var(--space-4)] flex items-center gap-[var(--space-3)] text-left cursor-pointer border-none"
                            >
                                <div
                                    className="w-11 h-11 rounded-[var(--radius-lg)] flex items-center justify-center"
                                    style={{
                                        background: `color-mix(in srgb, ${betType.color} 15%, transparent)`,
                                        color: betType.color,
                                    }}
                                >
                                    <betType.icon size={22} />
                                </div>
                                <div>
                                    <p className="font-semibold text-ink">{betType.label}</p>
                                    <p className="type-micro text-ink-tertiary">{betType.description}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>

                <hr className="divider" />

                {/* Active Bets */}
                <section className="section">
                    <h2 className="type-overline mb-[var(--space-4)]">
                        Active Bets ({activeBets.length})
                    </h2>
                    {activeBets.length === 0 ? (
                        <div className="card-premium p-[var(--space-6)] text-center">
                            <DollarSign size={32} className="text-ink-tertiary mx-auto mb-[var(--space-3)]" />
                            <p className="text-ink-secondary">No active bets</p>
                            <p className="type-meta mt-[var(--space-2)]">
                                Create a bet above to get started
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {activeBets.map((bet) => (
                                <BetManagementCard
                                    key={bet.id}
                                    bet={bet}
                                    players={players}
                                    getPlayer={getPlayer}
                                    getBetIcon={getBetIcon}
                                    getBetColor={getBetColor}
                                    onEdit={() => {
                                        setEditingBet(bet);
                                        setNewBetName(bet.name);
                                        setNewBetDescription(bet.description || '');
                                        setNewBetPot(bet.pot || 0);
                                        setNewBetHole(bet.hole);
                                        setShowCreateModal(true);
                                    }}
                                    onDelete={() => handleDeleteBet(bet.id)}
                                    onComplete={(winnerId) => handleCompleteBet(bet.id, winnerId)}
                                />
                            ))}
                        </div>
                    )}
                </section>

                {/* Completed Bets */}
                {completedBets.length > 0 && (
                    <>
                        <hr className="divider" />
                        <section className="section">
                            <h2 className="type-overline mb-[var(--space-4)]">
                                Completed ({completedBets.length})
                            </h2>
                            <div className="space-y-3">
                                {completedBets.map((bet) => (
                                    <BetManagementCard
                                        key={bet.id}
                                        bet={bet}
                                        players={players}
                                        getPlayer={getPlayer}
                                        getBetIcon={getBetIcon}
                                        getBetColor={getBetColor}
                                        onDelete={() => handleDeleteBet(bet.id)}
                                        isCompleted
                                    />
                                ))}
                            </div>
                        </section>
                    </>
                )}
            </main>

            {/* Create/Edit Modal */}
            {showCreateModal && (
                <div
                    className="fixed inset-0 bg-[color:var(--ink)]/70 z-[100] flex items-end justify-center"
                    onClick={() => {
                        setShowCreateModal(false);
                        resetForm();
                    }}
                >
                    <div
                        className="card-premium w-full max-w-[500px] max-h-[85vh] overflow-auto rounded-t-[var(--radius-xl)] rounded-b-none p-[var(--space-5)]"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex justify-between items-center mb-[var(--space-4)]">
                            <h2 className="font-bold text-xl">
                                {editingBet ? 'Edit Bet' : 'Create Bet'}
                            </h2>
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    resetForm();
                                }}
                                className="p-[var(--space-2)] bg-transparent border-none cursor-pointer"
                            >
                                <X size={24} className="text-ink-tertiary" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Bet Type (only for new bets) */}
                            {!editingBet && (
                                <div>
                                    <label className="type-meta block mb-[var(--space-2)]">
                                        Bet Type
                                    </label>
                                    <div className="flex flex-wrap gap-[var(--space-2)]">
                                        {BET_TYPES.map((bt) => (
                                            <button
                                                key={bt.type}
                                                onClick={() => {
                                                    setNewBetType(bt.type);
                                                    if (!newBetName || BET_TYPES.some(b => b.label === newBetName)) {
                                                        setNewBetName(bt.label);
                                                    }
                                                    if (!newBetDescription || BET_TYPES.some(b => b.description === newBetDescription)) {
                                                        setNewBetDescription(bt.description);
                                                    }
                                                }}
                                                className="press-scale py-[var(--space-2)] px-[var(--space-3)] rounded-[var(--radius-full)] border-none cursor-pointer text-[length:var(--text-sm)] font-medium"
                                                style={{
                                                    background: newBetType === bt.type ? bt.color : 'var(--canvas-sunken)',
                                                    color: newBetType === bt.type ? 'var(--canvas)' : 'var(--ink-secondary)',
                                                }}
                                            >
                                                {bt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Name */}
                            <div>
                                <label className="type-meta block mb-[var(--space-2)]">
                                    Name
                                </label>
                                <input
                                    type="text"
                                    value={newBetName}
                                    onChange={(e) => setNewBetName(e.target.value)}
                                    className="input w-full"
                                    placeholder="e.g., Skins Game"
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="type-meta block mb-[var(--space-2)]">
                                    Description
                                </label>
                                <input
                                    type="text"
                                    value={newBetDescription}
                                    onChange={(e) => setNewBetDescription(e.target.value)}
                                    className="input w-full"
                                    placeholder="e.g., $5 per hole, carry-overs"
                                />
                            </div>

                            {/* Amount / Pot */}
                            <div className="grid grid-cols-2 gap-[var(--space-3)]">
                                <div>
                                    <label className="type-meta block mb-[var(--space-2)]">
                                        Pot Amount ($)
                                    </label>
                                    <input
                                        type="number"
                                        value={newBetPot}
                                        onChange={(e) => setNewBetPot(Number(e.target.value))}
                                        className="input w-full"
                                        min={0}
                                    />
                                </div>
                                <div>
                                    <label className="type-meta block mb-[var(--space-2)]">
                                        Hole # (optional)
                                    </label>
                                    <input
                                        type="number"
                                        value={newBetHole || ''}
                                        onChange={(e) => setNewBetHole(e.target.value ? Number(e.target.value) : undefined)}
                                        className="input w-full"
                                        min={1}
                                        max={18}
                                        placeholder="Any"
                                    />
                                </div>
                            </div>

                            {/* Participants */}
                            {!editingBet && (
                                <div>
                                    <label className="type-meta block mb-[var(--space-2)]">
                                        Participants
                                    </label>
                                    <div className="flex flex-wrap gap-[var(--space-2)]">
                                        <button
                                            onClick={() => setSelectedParticipants(
                                                selectedParticipants.length === players.length ? [] : players.map(p => p.id)
                                            )}
                                            className="press-scale py-[var(--space-1)] px-[var(--space-2)] rounded-[var(--radius-md)] border-none cursor-pointer text-[length:var(--text-xs)]"
                                            style={{
                                                background: selectedParticipants.length === players.length ? 'var(--masters)' : 'var(--canvas-sunken)',
                                                color: selectedParticipants.length === players.length ? 'var(--canvas)' : 'var(--ink-secondary)',
                                            }}
                                        >
                                            {selectedParticipants.length === players.length ? '✓ All' : 'Select All'}
                                        </button>
                                        {players.map((player) => (
                                            <button
                                                key={player.id}
                                                onClick={() => setSelectedParticipants(prev =>
                                                    prev.includes(player.id)
                                                        ? prev.filter(id => id !== player.id)
                                                        : [...prev, player.id]
                                                )}
                                                className="press-scale py-[var(--space-1)] px-[var(--space-2)] rounded-[var(--radius-md)] border-none cursor-pointer text-[length:var(--text-xs)]"
                                                style={{
                                                    background: selectedParticipants.includes(player.id) ? 'var(--masters)' : 'var(--canvas-sunken)',
                                                    color: selectedParticipants.includes(player.id) ? 'var(--canvas)' : 'var(--ink-secondary)',
                                                }}
                                            >
                                                {player.firstName}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div className="flex gap-[var(--space-3)] mt-[var(--space-4)]">
                                <button
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        resetForm();
                                    }}
                                    className="press-scale flex-1 p-[var(--space-3)] bg-canvas-sunken border border-rule rounded-[var(--radius-lg)] cursor-pointer font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        if (editingBet) {
                                            handleUpdateBet(editingBet.id, {
                                                name: newBetName,
                                                description: newBetDescription,
                                                pot: newBetPot,
                                                hole: newBetHole,
                                            });
                                            setShowCreateModal(false);
                                            resetForm();
                                        } else {
                                            handleCreateBet();
                                        }
                                    }}
                                    className="btn-premium press-scale flex-1 p-[var(--space-3)] flex items-center justify-center gap-[var(--space-2)]"
                                >
                                    <Save size={18} />
                                    {editingBet ? 'Save Changes' : 'Create Bet'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Bottom Navigation */}
            <nav className="nav-premium bottom-nav">
                <Link href="/" className="nav-item">
                    <Home size={22} strokeWidth={1.75} />
                    <span>Home</span>
                </Link>
                <Link href="/schedule" className="nav-item">
                    <CalendarDays size={22} strokeWidth={1.75} />
                    <span>Schedule</span>
                </Link>
                <Link href="/score" className="nav-item">
                    <Target size={22} strokeWidth={1.75} />
                    <span>Score</span>
                </Link>
                <Link href="/matchups" className="nav-item">
                    <Users size={22} strokeWidth={1.75} />
                    <span>Matches</span>
                </Link>
                <Link href="/standings" className="nav-item">
                    <Trophy size={22} strokeWidth={1.75} />
                    <span>Standings</span>
                </Link>
                <Link href="/more" className="nav-item">
                    <MoreHorizontal size={22} strokeWidth={1.75} />
                    <span>More</span>
                </Link>
            </nav>

            {/* Confirm Dialog */}
            {ConfirmDialogComponent}
        </div>
    );
}

/* Bet Management Card */
interface BetManagementCardProps {
    bet: SideBet;
    players: Player[];
    getPlayer: (id: string) => Player | undefined;
    getBetIcon: (type: SideBetType) => React.ReactNode;
    getBetColor: (type: SideBetType) => string;
    onEdit?: () => void;
    onDelete: () => void;
    onComplete?: (winnerId?: string) => void;
    isCompleted?: boolean;
}

function BetManagementCard({
    bet,
    players: _players,
    getPlayer,
    getBetIcon,
    getBetColor,
    onEdit,
    onDelete,
    onComplete,
    isCompleted,
}: BetManagementCardProps) {
    const [showWinnerSelect, setShowWinnerSelect] = useState(false);
    const winner = bet.winnerId ? getPlayer(bet.winnerId) : null;

    return (
        <div className="card-premium p-[var(--space-4)]">
            <div className="flex items-start gap-[var(--space-3)]">
                {/* Icon */}
                <div
                    className="w-11 h-11 rounded-[var(--radius-lg)] flex items-center justify-center"
                    style={{
                        background: isCompleted ? 'var(--success)' : `color-mix(in srgb, ${getBetColor(bet.type)} 20%, transparent)`,
                        color: isCompleted ? 'var(--canvas)' : getBetColor(bet.type),
                    }}
                >
                    {isCompleted ? <Check size={22} /> : getBetIcon(bet.type)}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{bet.name}</h3>
                        {bet.pot && (
                            <span className="font-bold text-success">
                                ${bet.pot}
                            </span>
                        )}
                    </div>
                    {bet.description && (
                        <p className="type-caption mt-[var(--space-1)]">{bet.description}</p>
                    )}
                    {bet.hole && (
                        <p className="type-micro mt-[var(--space-1)] text-ink-tertiary">
                            Hole #{bet.hole}
                        </p>
                    )}

                    {/* Status */}
                    <div className="flex items-center gap-[var(--space-2)] mt-[var(--space-2)]">
                        {isCompleted && winner ? (
                            <>
                                <Crown size={14} className="text-success" />
                                <span className="type-micro text-success">
                                    Won by {winner.firstName}
                                </span>
                            </>
                        ) : (
                            <>
                                <Clock size={14} className="text-warning" />
                                <span className="type-micro text-warning">
                                    In Progress • {bet.participantIds.length} players
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Actions */}
            {!isCompleted && (
                <div className="flex gap-[var(--space-2)] mt-[var(--space-3)] pt-[var(--space-3)] border-t border-t-rule-faint">
                    {onEdit && (
                        <button
                            onClick={onEdit}
                            className="press-scale flex-1 p-[var(--space-2)] bg-canvas-sunken border border-rule rounded-[var(--radius-md)] cursor-pointer flex items-center justify-center gap-[var(--space-1)] text-[length:var(--text-sm)]"
                        >
                            <Edit3 size={14} />
                            Edit
                        </button>
                    )}
                    {onComplete && !showWinnerSelect && (
                        <button
                            onClick={() => setShowWinnerSelect(true)}
                            className="press-scale flex-1 p-[var(--space-2)] bg-success text-[var(--canvas)] border-none rounded-[var(--radius-md)] cursor-pointer flex items-center justify-center gap-[var(--space-1)] text-[length:var(--text-sm)] font-medium"
                        >
                            <Check size={14} />
                            Complete
                        </button>
                    )}
                    <button
                        onClick={onDelete}
                        className="press-scale p-[var(--space-2)] bg-transparent border border-error text-error rounded-[var(--radius-md)] cursor-pointer"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            )}

            {/* Winner Selection */}
            {showWinnerSelect && onComplete && (
                <div className="mt-[var(--space-3)] pt-[var(--space-3)] border-t border-t-rule-faint">
                    <p className="type-meta mb-[var(--space-2)]">Select Winner:</p>
                    <div className="flex flex-wrap gap-[var(--space-2)]">
                        {bet.participantIds
                            .flatMap((id) => {
                                const player = getPlayer(id);
                                return player ? [{ id, player }] : [];
                            })
                            .map(({ id, player }) => (
                                <button
                                    key={id}
                                    onClick={() => {
                                        onComplete(id);
                                        setShowWinnerSelect(false);
                                    }}
                                    className="press-scale py-[var(--space-2)] px-[var(--space-3)] bg-masters text-[var(--canvas)] border-none rounded-[var(--radius-md)] cursor-pointer text-[length:var(--text-sm)]"
                                >
                                    {player.firstName}
                                </button>
                            ))}
                        <button
                            onClick={() => {
                                onComplete();
                                setShowWinnerSelect(false);
                            }}
                            className="press-scale py-[var(--space-2)] px-[var(--space-3)] bg-ink-tertiary text-[var(--canvas)] border-none rounded-[var(--radius-md)] cursor-pointer text-[length:var(--text-sm)]"
                        >
                            No Winner
                        </button>
                        <button
                            onClick={() => setShowWinnerSelect(false)}
                            className="press-scale py-[var(--space-2)] px-[var(--space-3)] bg-transparent border border-rule rounded-[var(--radius-md)] cursor-pointer text-[length:var(--text-sm)]"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
