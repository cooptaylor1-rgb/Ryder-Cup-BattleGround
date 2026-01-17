'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useTripStore, useUIStore } from '@/lib/stores';
import type { SideBet, SideBetResult, Player } from '@/lib/types/models';
import {
    ChevronLeft,
    DollarSign,
    Zap,
    Target,
    TrendingUp,
    Trophy,
    Users,
    Check,
    Crown,
    Edit2,
    Trash2,
    Flag,
    X,
} from 'lucide-react';

/**
 * BET DETAIL PAGE
 *
 * View and manage individual side bets
 * Track skins hole-by-hole, record winners, etc.
 */
export default function BetDetailPage() {
    const router = useRouter();
    const params = useParams();
    const betId = params.betId as string;
    const { currentTrip, players } = useTripStore();
    const { showToast } = useUIStore();

    const [_showEditModal, setShowEditModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showRecordWinner, setShowRecordWinner] = useState(false);
    const [selectedHole, setSelectedHole] = useState<number | null>(null);

    // Get the bet
    const bet = useLiveQuery(
        () => db.sideBets.get(betId),
        [betId]
    );

    // Get linked match if any
    const linkedMatch = useLiveQuery(
        async () => {
            if (!bet?.matchId) return null;
            return db.matches.get(bet.matchId);
        },
        [bet?.matchId]
    );

    useEffect(() => {
        if (!currentTrip) {
            router.push('/');
        }
    }, [currentTrip, router]);

    const getPlayer = (id: string): Player | undefined => {
        return players.find(p => p.id === id);
    };

    const getBetIcon = (type: string) => {
        switch (type) {
            case 'skins': return <Zap size={24} />;
            case 'ctp': return <Target size={24} />;
            case 'longdrive': return <TrendingUp size={24} />;
            case 'nassau': return <DollarSign size={24} />;
            default: return <Trophy size={24} />;
        }
    };

    const handleRecordHoleWinner = async (holeNumber: number, winnerId: string | null) => {
        if (!bet) return;

        const results: SideBetResult[] = bet.results || [];
        const existingIndex = results.findIndex((r: SideBetResult) => r.holeNumber === holeNumber);
        const perHole = bet.perHole || 5;

        // Calculate carry-over
        let carryOver = 0;
        for (let i = 1; i < holeNumber; i++) {
            const prevResult = results.find((r: SideBetResult) => r.holeNumber === i);
            if (!prevResult || !prevResult.winnerId) {
                carryOver += perHole;
            }
        }

        const newResult: SideBetResult = {
            holeNumber,
            winnerId: winnerId || undefined,
            amount: winnerId ? perHole + carryOver : perHole,
        };

        let newResults: SideBetResult[];
        if (existingIndex >= 0) {
            newResults = [...results];
            newResults[existingIndex] = newResult;
        } else {
            newResults = [...results, newResult].sort((a, b) => a.holeNumber - b.holeNumber);
        }

        await db.sideBets.update(bet.id, { results: newResults });
        setSelectedHole(null);
        setShowRecordWinner(false);
        showToast('success', winnerId ? 'Winner recorded!' : 'Hole pushed - carry over');
    };

    const handleSetOverallWinner = async (winnerId: string) => {
        if (!bet) return;
        await db.sideBets.update(bet.id, {
            winnerId,
            status: 'completed',
            completedAt: new Date().toISOString(),
        });
        showToast('success', 'Winner set!');
    };

    const handleDeleteBet = async () => {
        if (!bet) return;
        await db.sideBets.delete(bet.id);
        showToast('info', 'Bet deleted');
        router.push('/bets');
    };

    const handleReopenBet = async () => {
        if (!bet) return;
        await db.sideBets.update(bet.id, {
            status: 'active',
            winnerId: undefined,
            completedAt: undefined,
        });
        showToast('success', 'Bet reopened');
    };

    if (!bet || !currentTrip) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--canvas)' }}>
                <div className="animate-pulse text-center">
                    <DollarSign size={48} className="mx-auto mb-4 opacity-50" />
                    <p>Loading bet...</p>
                </div>
            </div>
        );
    }

    const participants = bet.participantIds.map(id => getPlayer(id)).filter(Boolean) as Player[];
    const winner = bet.winnerId ? getPlayer(bet.winnerId) : null;
    const isSkins = bet.type === 'skins';

    // Calculate skins standings
    const skinsStandings = isSkins ? calculateSkinsStandings(bet, participants) : [];

    return (
        <div className="min-h-screen pb-24 page-premium-enter texture-grain" style={{ background: 'var(--canvas)' }}>
            {/* Header */}
            <header className="header-premium">
                <div className="container-editorial flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.back()}
                            className="p-2 -ml-2 press-scale"
                            style={{ color: 'var(--ink-secondary)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                            aria-label="Back"
                        >
                            <ChevronLeft size={22} />
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                            <div
                                style={{
                                    width: '40px',
                                    height: '40px',
                                    borderRadius: 'var(--radius-md)',
                                    background: bet.status === 'completed' ? 'var(--success)' : 'var(--masters)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    color: 'white',
                                }}
                            >
                                {bet.status === 'completed' ? <Check size={20} /> : getBetIcon(bet.type)}
                            </div>
                            <div>
                                <h1 className="type-title">{bet.name}</h1>
                                <p className="type-caption">{bet.description}</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowEditModal(true)}
                            className="p-2 rounded-lg hover:bg-muted transition-colors"
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                            aria-label="Edit"
                        >
                            <Edit2 size={20} style={{ color: 'var(--ink-secondary)' }} />
                        </button>
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                            aria-label="Delete"
                        >
                            <Trash2 size={20} style={{ color: 'var(--error)' }} />
                        </button>
                    </div>
                </div>
            </header>

            <main className="container-editorial" style={{ paddingTop: 'var(--space-4)' }}>
                {/* Pot Card */}
                <div
                    className="card text-center"
                    style={{
                        background: bet.status === 'completed'
                            ? 'linear-gradient(135deg, var(--success) 0%, #059669 100%)'
                            : 'linear-gradient(135deg, var(--masters) 0%, var(--masters-hover) 100%)',
                        color: 'white',
                        padding: 'var(--space-6)',
                        marginBottom: 'var(--space-4)',
                    }}
                >
                    {bet.status === 'completed' && winner ? (
                        <>
                            <Crown size={32} style={{ margin: '0 auto var(--space-2)' }} />
                            <h2 className="type-title-lg" style={{ marginBottom: 'var(--space-1)' }}>
                                {winner.firstName} {winner.lastName} Wins!
                            </h2>
                            <p className="score-large">${bet.pot || 0}</p>
                        </>
                    ) : (
                        <>
                            <DollarSign size={32} style={{ margin: '0 auto var(--space-2)', opacity: 0.9 }} />
                            <h2 className="score-large" style={{ marginBottom: 'var(--space-1)' }}>${bet.pot || 0}</h2>
                            <p className="type-body" style={{ opacity: 0.8 }}>
                                {isSkins ? `$${bet.perHole || 5} per hole` : 'Total Pot'}
                            </p>
                        </>
                    )}
                </div>

                {/* Linked Match */}
                {linkedMatch && (
                    <div
                        className="card"
                        style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}
                    >
                        <div className="flex items-center gap-3">
                            <Flag size={20} style={{ color: 'var(--masters)' }} />
                            <div className="flex-1">
                                <p className="type-caption" style={{ color: 'var(--ink-tertiary)' }}>Linked to Match</p>
                                <p className="type-body-sm">Match #{linkedMatch.matchOrder}</p>
                            </div>
                            <Link
                                href={`/score/${linkedMatch.id}`}
                                className="btn btn-secondary btn-sm"
                            >
                                View Match
                            </Link>
                        </div>
                    </div>
                )}

                {/* Status Actions */}
                {bet.status === 'active' && !isSkins && (
                    <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                        <h3 className="type-overline" style={{ marginBottom: 'var(--space-3)' }}>Set Winner</h3>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
                            {participants.map(player => (
                                <button
                                    key={player.id}
                                    onClick={() => handleSetOverallWinner(player.id)}
                                    className="btn btn-secondary btn-sm"
                                >
                                    {player.firstName} {player.lastName}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {bet.status === 'completed' && (
                    <button
                        onClick={handleReopenBet}
                        className="btn btn-secondary w-full"
                        style={{ marginBottom: 'var(--space-4)' }}
                    >
                        Reopen Bet
                    </button>
                )}

                {/* Skins Scorecard */}
                {isSkins && (
                    <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                        <h3 className="type-overline" style={{ marginBottom: 'var(--space-3)' }}>Skins Scorecard</h3>

                        {/* Hole Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 'var(--space-2)' }}>
                            {Array.from({ length: 18 }, (_, i) => i + 1).map(hole => {
                                const result = bet.results?.find(r => r.holeNumber === hole);
                                const holeWinner = result?.winnerId ? getPlayer(result.winnerId) : null;

                                return (
                                    <button
                                        key={hole}
                                        onClick={() => {
                                            setSelectedHole(hole);
                                            setShowRecordWinner(true);
                                        }}
                                        className="aspect-square rounded-lg flex flex-col items-center justify-center transition-all hover:scale-105"
                                        style={{
                                            background: result?.winnerId
                                                ? 'var(--success)'
                                                : result
                                                    ? 'var(--warning)'
                                                    : 'var(--surface)',
                                            color: result?.winnerId ? 'white' : result ? 'white' : 'var(--ink)',
                                            border: 'none',
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <span className="type-micro font-bold">{hole}</span>
                                        {holeWinner && (
                                            <span className="type-micro" style={{ fontSize: '8px' }}>
                                                {holeWinner.lastName.slice(0, 3)}
                                            </span>
                                        )}
                                        {result && !result.winnerId && (
                                            <span className="type-micro" style={{ fontSize: '8px' }}>CO</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Standings */}
                        {skinsStandings.length > 0 && (
                            <>
                                <hr className="divider-lg" style={{ margin: 'var(--space-4) 0' }} />
                                <h4 className="type-overline" style={{ marginBottom: 'var(--space-3)' }}>Standings</h4>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                                    {skinsStandings.map((standing, i) => (
                                        <div
                                            key={standing.playerId}
                                            className="flex items-center justify-between"
                                            style={{ padding: 'var(--space-2) 0' }}
                                        >
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className="type-body-sm font-bold"
                                                    style={{
                                                        width: '24px',
                                                        height: '24px',
                                                        borderRadius: '50%',
                                                        background: i === 0 ? 'var(--success)' : 'var(--muted)',
                                                        color: i === 0 ? 'white' : 'var(--ink-secondary)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                    }}
                                                >
                                                    {i + 1}
                                                </span>
                                                <span className="type-body-sm">{standing.playerName}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="type-caption">{standing.skins} skin{standing.skins !== 1 ? 's' : ''}</span>
                                                <span className="type-body-sm font-bold" style={{ color: 'var(--success)' }}>
                                                    ${standing.winnings}
                                                </span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}

                {/* Participants */}
                <div className="card" style={{ padding: 'var(--space-4)' }}>
                    <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-3)' }}>
                        <h3 className="type-overline">Participants ({participants.length})</h3>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        {participants.map(player => (
                            <div
                                key={player.id}
                                className="flex items-center gap-3"
                                style={{ padding: 'var(--space-2) 0' }}
                            >
                                <div
                                    style={{
                                        width: '32px',
                                        height: '32px',
                                        borderRadius: '50%',
                                        background: 'var(--surface)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Users size={16} style={{ color: 'var(--ink-secondary)' }} />
                                </div>
                                <div className="flex-1">
                                    <p className="type-body-sm">{player.firstName} {player.lastName}</p>
                                    {player.handicapIndex && (
                                        <p className="type-micro" style={{ color: 'var(--ink-tertiary)' }}>
                                            HCP: {player.handicapIndex}
                                        </p>
                                    )}
                                </div>
                                {bet.winnerId === player.id && (
                                    <Crown size={18} style={{ color: 'var(--success)' }} />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Record Winner Modal */}
            {showRecordWinner && selectedHole && (
                <div className="fixed inset-0 z-50 flex items-end justify-center">
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setShowRecordWinner(false)}
                    />
                    <div
                        className="relative w-full max-w-lg bg-background rounded-t-3xl p-6 animate-slide-up"
                        style={{ maxHeight: '80vh', overflowY: 'auto' }}
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="type-title">Hole {selectedHole} Winner</h2>
                            <button
                                onClick={() => setShowRecordWinner(false)}
                                className="p-2 rounded-full hover:bg-muted"
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                            {participants.map(player => (
                                <button
                                    key={player.id}
                                    onClick={() => handleRecordHoleWinner(selectedHole, player.id)}
                                    className="card press-scale w-full text-left"
                                    style={{ padding: 'var(--space-4)', border: 'none', cursor: 'pointer' }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            style={{
                                                width: '40px',
                                                height: '40px',
                                                borderRadius: '50%',
                                                background: 'var(--success)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                color: 'white',
                                            }}
                                        >
                                            <Trophy size={20} />
                                        </div>
                                        <span className="type-body">{player.firstName} {player.lastName}</span>
                                    </div>
                                </button>
                            ))}

                            <button
                                onClick={() => handleRecordHoleWinner(selectedHole, null)}
                                className="card press-scale w-full text-left"
                                style={{ padding: 'var(--space-4)', border: 'none', cursor: 'pointer' }}
                            >
                                <div className="flex items-center gap-3">
                                    <div
                                        style={{
                                            width: '40px',
                                            height: '40px',
                                            borderRadius: '50%',
                                            background: 'var(--warning)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            color: 'white',
                                        }}
                                    >
                                        <TrendingUp size={20} />
                                    </div>
                                    <span className="type-body">Push (Carry Over)</span>
                                </div>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    <div
                        className="absolute inset-0 bg-black/50"
                        onClick={() => setShowDeleteConfirm(false)}
                    />
                    <div className="relative bg-background rounded-2xl p-6 max-w-sm w-full">
                        <h2 className="type-title mb-2">Delete Bet?</h2>
                        <p className="type-body mb-6" style={{ color: 'var(--ink-secondary)' }}>
                            This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                className="btn btn-secondary flex-1"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteBet}
                                className="btn flex-1"
                                style={{ background: 'var(--error)', color: 'white' }}
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Calculate skins standings
function calculateSkinsStandings(bet: SideBet, participants: Player[]) {
    if (!bet.results || bet.results.length === 0) return [];

    const standings = new Map<string, { skins: number; winnings: number }>();

    participants.forEach(p => {
        standings.set(p.id, { skins: 0, winnings: 0 });
    });

    bet.results.forEach(result => {
        if (result.winnerId) {
            const current = standings.get(result.winnerId);
            if (current) {
                standings.set(result.winnerId, {
                    skins: current.skins + 1,
                    winnings: current.winnings + result.amount,
                });
            }
        }
    });

    return Array.from(standings.entries())
        .map(([playerId, data]) => ({
            playerId,
            playerName: participants.find(p => p.id === playerId)?.lastName || 'Unknown',
            ...data,
        }))
        .filter(s => s.skins > 0)
        .sort((a, b) => b.winnings - a.winnings);
}
