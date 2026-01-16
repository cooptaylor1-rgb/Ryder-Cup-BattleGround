'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useTripStore, useUIStore } from '@/lib/stores';
import type { SideBet, SideBetType, Player } from '@/lib/types/models';
import {
    ChevronLeft,
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

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingBet, setEditingBet] = useState<SideBet | null>(null);
    const [newBetType, setNewBetType] = useState<SideBetType>('skins');
    const [newBetName, setNewBetName] = useState('');
    const [newBetDescription, setNewBetDescription] = useState('');
    const [newBetPot, setNewBetPot] = useState(20);
    const [newBetHole, setNewBetHole] = useState<number | undefined>();
    const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (!currentTrip) {
            router.push('/');
            return;
        }
        if (!isCaptainMode) {
            router.push('/more');
        }
    }, [currentTrip, isCaptainMode, router]);

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

    if (!currentTrip || !isCaptainMode) return null;

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
            console.error('Failed to create bet:', error);
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
            console.error('Failed to update bet:', error);
            showToast('error', 'Failed to update bet. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteBet = async (betId: string) => {
        if (!confirm('Delete this bet?') || isSubmitting) return;
        setIsSubmitting(true);

        try {
            await db.sideBets.delete(betId);
            showToast('success', 'Bet deleted');
        } catch (error) {
            console.error('Failed to delete bet:', error);
            showToast('error', 'Failed to delete bet. Please try again.');
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
            console.error('Failed to complete bet:', error);
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
        <div className="min-h-screen pb-nav page-premium-enter texture-grain" style={{ background: 'var(--canvas)' }}>
            {/* Header */}
            <header className="header-premium">
                <div className="container-editorial flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.back()}
                            className="p-2 -ml-2 press-scale"
                            style={{ color: 'var(--ink-secondary)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                        >
                            <ChevronLeft size={22} />
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                            <div
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: 'var(--radius-md)',
                                    background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                }}
                            >
                                <DollarSign size={16} style={{ color: 'white' }} />
                            </div>
                            <div>
                                <span className="type-overline" style={{ letterSpacing: '0.1em' }}>Side Bets</span>
                                <p className="type-caption">{activeBets.length} active</p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container-editorial" style={{ paddingTop: 'var(--space-4)' }}>
                {/* Quick Create Section */}
                <section className="section">
                    <h2 className="type-overline" style={{ marginBottom: 'var(--space-4)' }}>Quick Create</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--space-3)' }}>
                        {BET_TYPES.map((betType) => (
                            <button
                                key={betType.type}
                                onClick={() => openCreateModal(betType.type)}
                                className="card-premium press-scale"
                                style={{
                                    padding: 'var(--space-4)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-3)',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    border: 'none',
                                }}
                            >
                                <div
                                    style={{
                                        width: '44px',
                                        height: '44px',
                                        borderRadius: 'var(--radius-lg)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: `color-mix(in srgb, ${betType.color} 15%, transparent)`,
                                        color: betType.color,
                                    }}
                                >
                                    <betType.icon size={22} />
                                </div>
                                <div>
                                    <p style={{ fontWeight: 600, color: 'var(--ink)' }}>{betType.label}</p>
                                    <p className="type-micro" style={{ color: 'var(--ink-tertiary)' }}>{betType.description}</p>
                                </div>
                            </button>
                        ))}
                    </div>
                </section>

                <hr className="divider" />

                {/* Active Bets */}
                <section className="section">
                    <h2 className="type-overline" style={{ marginBottom: 'var(--space-4)' }}>
                        Active Bets ({activeBets.length})
                    </h2>
                    {activeBets.length === 0 ? (
                        <div className="card-premium" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
                            <DollarSign size={32} style={{ color: 'var(--ink-tertiary)', margin: '0 auto var(--space-3)' }} />
                            <p style={{ color: 'var(--ink-secondary)' }}>No active bets</p>
                            <p className="type-meta" style={{ marginTop: 'var(--space-2)' }}>
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
                            <h2 className="type-overline" style={{ marginBottom: 'var(--space-4)' }}>
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
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.7)',
                        zIndex: 100,
                        display: 'flex',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                    }}
                    onClick={() => {
                        setShowCreateModal(false);
                        resetForm();
                    }}
                >
                    <div
                        className="card-premium"
                        style={{
                            width: '100%',
                            maxWidth: '500px',
                            maxHeight: '85vh',
                            overflow: 'auto',
                            borderRadius: 'var(--radius-xl) var(--radius-xl) 0 0',
                            padding: 'var(--space-5)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                            <h2 style={{ fontWeight: 700, fontSize: '1.25rem' }}>
                                {editingBet ? 'Edit Bet' : 'Create Bet'}
                            </h2>
                            <button
                                onClick={() => {
                                    setShowCreateModal(false);
                                    resetForm();
                                }}
                                style={{ padding: 'var(--space-2)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                            >
                                <X size={24} style={{ color: 'var(--ink-tertiary)' }} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {/* Bet Type (only for new bets) */}
                            {!editingBet && (
                                <div>
                                    <label className="type-meta" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                                        Bet Type
                                    </label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
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
                                                className="press-scale"
                                                style={{
                                                    padding: 'var(--space-2) var(--space-3)',
                                                    borderRadius: 'var(--radius-full)',
                                                    background: newBetType === bt.type ? bt.color : 'var(--canvas-sunken)',
                                                    color: newBetType === bt.type ? 'white' : 'var(--ink-secondary)',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    fontSize: 'var(--text-sm)',
                                                    fontWeight: 500,
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
                                <label className="type-meta" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                                    Name
                                </label>
                                <input
                                    type="text"
                                    value={newBetName}
                                    onChange={(e) => setNewBetName(e.target.value)}
                                    className="input"
                                    placeholder="e.g., Skins Game"
                                    style={{ width: '100%' }}
                                />
                            </div>

                            {/* Description */}
                            <div>
                                <label className="type-meta" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                                    Description
                                </label>
                                <input
                                    type="text"
                                    value={newBetDescription}
                                    onChange={(e) => setNewBetDescription(e.target.value)}
                                    className="input"
                                    placeholder="e.g., $5 per hole, carry-overs"
                                    style={{ width: '100%' }}
                                />
                            </div>

                            {/* Amount / Pot */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                                <div>
                                    <label className="type-meta" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                                        Pot Amount ($)
                                    </label>
                                    <input
                                        type="number"
                                        value={newBetPot}
                                        onChange={(e) => setNewBetPot(Number(e.target.value))}
                                        className="input"
                                        min={0}
                                        style={{ width: '100%' }}
                                    />
                                </div>
                                <div>
                                    <label className="type-meta" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                                        Hole # (optional)
                                    </label>
                                    <input
                                        type="number"
                                        value={newBetHole || ''}
                                        onChange={(e) => setNewBetHole(e.target.value ? Number(e.target.value) : undefined)}
                                        className="input"
                                        min={1}
                                        max={18}
                                        placeholder="Any"
                                        style={{ width: '100%' }}
                                    />
                                </div>
                            </div>

                            {/* Participants */}
                            {!editingBet && (
                                <div>
                                    <label className="type-meta" style={{ display: 'block', marginBottom: 'var(--space-2)' }}>
                                        Participants
                                    </label>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                                        <button
                                            onClick={() => setSelectedParticipants(
                                                selectedParticipants.length === players.length ? [] : players.map(p => p.id)
                                            )}
                                            className="press-scale"
                                            style={{
                                                padding: 'var(--space-1) var(--space-2)',
                                                borderRadius: 'var(--radius-md)',
                                                background: selectedParticipants.length === players.length ? 'var(--masters)' : 'var(--canvas-sunken)',
                                                color: selectedParticipants.length === players.length ? 'white' : 'var(--ink-secondary)',
                                                border: 'none',
                                                cursor: 'pointer',
                                                fontSize: 'var(--text-xs)',
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
                                                className="press-scale"
                                                style={{
                                                    padding: 'var(--space-1) var(--space-2)',
                                                    borderRadius: 'var(--radius-md)',
                                                    background: selectedParticipants.includes(player.id) ? 'var(--masters)' : 'var(--canvas-sunken)',
                                                    color: selectedParticipants.includes(player.id) ? 'white' : 'var(--ink-secondary)',
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    fontSize: 'var(--text-xs)',
                                                }}
                                            >
                                                {player.firstName}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
                                <button
                                    onClick={() => {
                                        setShowCreateModal(false);
                                        resetForm();
                                    }}
                                    className="press-scale"
                                    style={{
                                        flex: 1,
                                        padding: 'var(--space-3)',
                                        background: 'var(--canvas-sunken)',
                                        border: '1px solid var(--rule)',
                                        borderRadius: 'var(--radius-lg)',
                                        cursor: 'pointer',
                                        fontWeight: 500,
                                    }}
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
                                    className="btn-premium press-scale"
                                    style={{
                                        flex: 1,
                                        padding: 'var(--space-3)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: 'var(--space-2)',
                                    }}
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
    players,
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
        <div className="card-premium" style={{ padding: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                {/* Icon */}
                <div
                    style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: 'var(--radius-lg)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: isCompleted ? 'var(--success)' : `color-mix(in srgb, ${getBetColor(bet.type)} 20%, transparent)`,
                        color: isCompleted ? 'white' : getBetColor(bet.type),
                    }}
                >
                    {isCompleted ? <Check size={22} /> : getBetIcon(bet.type)}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h3 style={{ fontWeight: 600 }}>{bet.name}</h3>
                        {bet.pot && (
                            <span style={{ fontWeight: 700, color: 'var(--success)' }}>
                                ${bet.pot}
                            </span>
                        )}
                    </div>
                    {bet.description && (
                        <p className="type-caption" style={{ marginTop: 'var(--space-1)' }}>{bet.description}</p>
                    )}
                    {bet.hole && (
                        <p className="type-micro" style={{ marginTop: 'var(--space-1)', color: 'var(--ink-tertiary)' }}>
                            Hole #{bet.hole}
                        </p>
                    )}

                    {/* Status */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
                        {isCompleted && winner ? (
                            <>
                                <Crown size={14} style={{ color: 'var(--success)' }} />
                                <span className="type-micro" style={{ color: 'var(--success)' }}>
                                    Won by {winner.firstName}
                                </span>
                            </>
                        ) : (
                            <>
                                <Clock size={14} style={{ color: 'var(--warning)' }} />
                                <span className="type-micro" style={{ color: 'var(--warning)' }}>
                                    In Progress • {bet.participantIds.length} players
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Actions */}
            {!isCompleted && (
                <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--rule-faint)' }}>
                    {onEdit && (
                        <button
                            onClick={onEdit}
                            className="press-scale"
                            style={{
                                flex: 1,
                                padding: 'var(--space-2)',
                                background: 'var(--canvas-sunken)',
                                border: '1px solid var(--rule)',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 'var(--space-1)',
                                fontSize: 'var(--text-sm)',
                            }}
                        >
                            <Edit3 size={14} />
                            Edit
                        </button>
                    )}
                    {onComplete && !showWinnerSelect && (
                        <button
                            onClick={() => setShowWinnerSelect(true)}
                            className="press-scale"
                            style={{
                                flex: 1,
                                padding: 'var(--space-2)',
                                background: 'var(--success)',
                                color: 'white',
                                border: 'none',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 'var(--space-1)',
                                fontSize: 'var(--text-sm)',
                                fontWeight: 500,
                            }}
                        >
                            <Check size={14} />
                            Complete
                        </button>
                    )}
                    <button
                        onClick={onDelete}
                        className="press-scale"
                        style={{
                            padding: 'var(--space-2)',
                            background: 'transparent',
                            border: '1px solid var(--error)',
                            color: 'var(--error)',
                            borderRadius: 'var(--radius-md)',
                            cursor: 'pointer',
                        }}
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            )}

            {/* Winner Selection */}
            {showWinnerSelect && onComplete && (
                <div style={{ marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--rule-faint)' }}>
                    <p className="type-meta" style={{ marginBottom: 'var(--space-2)' }}>Select Winner:</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                        {bet.participantIds.map(id => {
                            const player = getPlayer(id);
                            if (!player) return null;
                            return (
                                <button
                                    key={id}
                                    onClick={() => {
                                        onComplete(id);
                                        setShowWinnerSelect(false);
                                    }}
                                    className="press-scale"
                                    style={{
                                        padding: 'var(--space-2) var(--space-3)',
                                        background: 'var(--masters)',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: 'var(--radius-md)',
                                        cursor: 'pointer',
                                        fontSize: 'var(--text-sm)',
                                    }}
                                >
                                    {player.firstName}
                                </button>
                            );
                        })}
                        <button
                            onClick={() => {
                                onComplete();
                                setShowWinnerSelect(false);
                            }}
                            className="press-scale"
                            style={{
                                padding: 'var(--space-2) var(--space-3)',
                                background: 'var(--ink-tertiary)',
                                color: 'white',
                                border: 'none',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                fontSize: 'var(--text-sm)',
                            }}
                        >
                            No Winner
                        </button>
                        <button
                            onClick={() => setShowWinnerSelect(false)}
                            className="press-scale"
                            style={{
                                padding: 'var(--space-2) var(--space-3)',
                                background: 'transparent',
                                border: '1px solid var(--rule)',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                fontSize: 'var(--text-sm)',
                            }}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
