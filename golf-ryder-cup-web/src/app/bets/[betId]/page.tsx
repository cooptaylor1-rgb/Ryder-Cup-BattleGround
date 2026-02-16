'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useTripStore, useUIStore } from '@/lib/stores';
import { EmptyStatePremium, ErrorEmpty, PageLoadingSkeleton } from '@/components/ui';
import { BottomNav, PageHeader } from '@/components/layout';
import type { SideBet, SideBetResult, Player, NassauResults } from '@/lib/types/models';
import {
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
    AlertCircle,
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
    // useLiveQuery returns the provided default while loading.
    // We set default=null so we can distinguish:
    // - null (loading)
    // - undefined (not found)
    // - SideBet (loaded)
    const bet = useLiveQuery(
        () => db.sideBets.get(betId),
        [betId],
        null
    );

    // Get linked match if any
    const linkedMatch = useLiveQuery(
        async () => {
            if (!bet?.matchId) return undefined;
            const match = await db.matches.get(bet.matchId);
            return match ?? null;
        },
        [bet?.matchId]
    );

    // If no active trip, we render an explicit empty state instead of redirecting.

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

    if (!currentTrip) {
        return (
            <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
                <PageHeader
                    title="Bets"
                    subtitle="No active trip"
                    icon={<Trophy size={16} className="text-[var(--color-accent)]" />}
                    onBack={() => router.back()}
                />
                <main className="container-editorial py-12">
                    <EmptyStatePremium
                        illustration="trophy"
                        title="No trip selected"
                        description="Pick a trip to view side bets."
                        action={{
                            label: 'Back to Home',
                            onClick: () => router.push('/'),
                        }}
                        variant="large"
                    />
                </main>
                <BottomNav />
            </div>
        );
    }

    if (bet === null) {
        return <PageLoadingSkeleton title="Bet Details" variant="detail" />;
    }

    if (bet === undefined) {
        return (
            <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
                <PageHeader
                    title="Bet Details"
                    subtitle={currentTrip.name}
                    icon={<Trophy size={16} className="text-[var(--color-accent)]" />}
                    onBack={() => router.push('/bets')}
                />
                <main className="container-editorial py-12">
                    <ErrorEmpty message="We couldn't find that bet." />
                    <div className="mt-6 flex justify-center">
                        <button onClick={() => router.push('/bets')} className="btn btn-primary">
                            Back to Bets
                        </button>
                    </div>
                </main>
                <BottomNav />
            </div>
        );
    }

    const participants = bet.participantIds.map(id => getPlayer(id)).filter(Boolean) as Player[];
    const winner = bet.winnerId ? getPlayer(bet.winnerId) : null;
    const isSkins = bet.type === 'skins';
    const isNassau = bet.type === 'nassau';

    // Get Nassau team players
    const teamAPlayers = isNassau && bet.nassauTeamA
        ? bet.nassauTeamA.map(id => getPlayer(id)).filter(Boolean) as Player[]
        : [];
    const teamBPlayers = isNassau && bet.nassauTeamB
        ? bet.nassauTeamB.map(id => getPlayer(id)).filter(Boolean) as Player[]
        : [];

    // Calculate skins standings
    const skinsStandings = isSkins ? calculateSkinsStandings(bet, participants) : [];

    // Handle Nassau segment winner
    const handleSetNassauWinner = async (
        segment: 'front9Winner' | 'back9Winner' | 'overallWinner',
        winner: 'teamA' | 'teamB' | 'push'
    ) => {
        if (!bet) return;

        const newResults: NassauResults = {
            ...(bet.nassauResults || {}),
            [segment]: winner,
        };

        // Check if all segments are complete
        const isComplete = newResults.front9Winner && newResults.back9Winner && newResults.overallWinner;

        await db.sideBets.update(bet.id, {
            nassauResults: newResults,
            status: isComplete ? 'completed' : 'active',
            completedAt: isComplete ? new Date().toISOString() : undefined,
        });

        showToast('success', 'Result recorded!');
    };

    return (
        <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
            <PageHeader
                title={bet.name}
                subtitle={bet.description}
                icon={bet.status === 'completed' ? <Check size={18} /> : getBetIcon(bet.type)}
                iconContainerStyle={{
                    width: '40px',
                    height: '40px',
                    background: bet.status === 'completed' ? 'var(--success)' : 'var(--masters)',
                    boxShadow: 'none',
                }}
                onBack={() => router.back()}
                rightSlot={
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setShowEditModal(true)}
                            className="p-2 rounded-lg hover:bg-[var(--surface)] transition-colors bg-transparent border-none cursor-pointer"
                            aria-label="Edit"
                        >
                            <Edit2 size={20} className="text-[var(--ink-secondary)]" />
                        </button>
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            className="p-2 rounded-lg hover:bg-red-500/10 transition-colors bg-transparent border-none cursor-pointer"
                            aria-label="Delete"
                        >
                            <Trash2 size={20} className="text-[var(--error)]" />
                        </button>
                    </div>
                }
            />

            <main className="container-editorial pt-[var(--space-4)]">
                {/* Pot Card */}
                <div
                    className="card text-center text-[var(--canvas)] p-[var(--space-6)] mb-[var(--space-4)]"
                    style={{
                        background: bet.status === 'completed'
                            ? 'linear-gradient(135deg, var(--success) 0%, #059669 100%)'
                            : 'linear-gradient(135deg, var(--masters) 0%, var(--masters-hover) 100%)',
                    }}
                >
                    {bet.status === 'completed' && winner ? (
                        <>
                            <Crown size={32} className="mx-auto mb-[var(--space-2)]" />
                            <h2 className="type-title-lg mb-[var(--space-1)]">
                                {winner.firstName} {winner.lastName} Wins!
                            </h2>
                            <p className="score-large">${bet.pot || 0}</p>
                        </>
                    ) : bet.status === 'completed' && isNassau ? (
                        <>
                            <Trophy size={32} className="mx-auto mb-[var(--space-2)]" />
                            <h2 className="type-title-lg mb-[var(--space-1)]">
                                Nassau Complete!
                            </h2>
                            <p className="score-large">${bet.pot || 0}</p>
                        </>
                    ) : (
                        <>
                            <DollarSign size={32} className="mx-auto mb-[var(--space-2)] opacity-90" />
                            <h2 className="score-large mb-[var(--space-1)]">${bet.pot || 0}</h2>
                            <p className="type-body opacity-80">
                                {isSkins
                                    ? `$${bet.perHole || 5} per hole`
                                    : isNassau
                                        ? `$${Math.round((bet.pot || 20) / 3)} per segment`
                                        : 'Total Pot'
                                }
                            </p>
                        </>
                    )}
                </div>

                {/* Linked Match */}
                {bet.matchId && linkedMatch === undefined && (
                    <div className="card p-[var(--space-4)] mb-[var(--space-4)]">
                        <div className="flex items-center gap-3 animate-pulse">
                            <Flag size={20} className="text-[var(--ink-tertiary)]" />
                            <div className="flex-1">
                                <p className="type-caption text-[var(--ink-tertiary)]">
                                    Loading linked match…
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {bet.matchId && linkedMatch === null && (
                    <div className="card p-[var(--space-4)] mb-[var(--space-4)]">
                        <div className="flex items-start gap-3">
                            <AlertCircle size={20} className="text-[var(--warning)] mt-[2px]" />
                            <div className="flex-1">
                                <p className="type-body-sm font-semibold">
                                    Linked match not found
                                </p>
                                <p className="type-caption mt-1 text-[var(--ink-tertiary)]">
                                    This bet is linked to a match that isn&apos;t available on this device yet.
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {linkedMatch && (
                    <div className="card p-[var(--space-4)] mb-[var(--space-4)]">
                        <div className="flex items-center gap-3">
                            <Flag size={20} className="text-[var(--masters)]" />
                            <div className="flex-1">
                                <p className="type-caption text-[var(--ink-tertiary)]">Linked to Match</p>
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

                {/* Nassau Scorecard (2v2 match format) */}
                {isNassau && (
                    <div className="card p-[var(--space-4)] mb-[var(--space-4)]">
                        <h3 className="type-overline mb-[var(--space-4)]">Nassau Results</h3>

                        {/* Teams Display */}
                        <div className="grid grid-cols-[1fr_auto_1fr] gap-[var(--space-3)] mb-[var(--space-4)]">
                            <div className="text-center">
                                <div className="p-3 rounded-lg bg-[var(--team-usa)] text-[var(--canvas)]">
                                    <p className="type-overline mb-[var(--space-1)] opacity-90">Team A</p>
                                    {teamAPlayers.map(p => (
                                        <p key={p.id} className="type-body-sm">{p.firstName} {p.lastName}</p>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center justify-center">
                                <span className="type-title-lg text-[var(--ink-tertiary)]">vs</span>
                            </div>
                            <div className="text-center">
                                <div className="p-3 rounded-lg bg-[var(--team-europe)] text-[var(--canvas)]">
                                    <p className="type-overline mb-[var(--space-1)] opacity-90">Team B</p>
                                    {teamBPlayers.map(p => (
                                        <p key={p.id} className="type-body-sm">{p.firstName} {p.lastName}</p>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Segment Results */}
                        {(['front9', 'back9', 'overall'] as const).map(segment => {
                            const segmentKey = `${segment}Winner` as 'front9Winner' | 'back9Winner' | 'overallWinner';
                            const result = bet.nassauResults?.[segmentKey];
                            const segmentLabel = segment === 'front9' ? 'Front 9' : segment === 'back9' ? 'Back 9' : 'Overall';
                            const potPerSegment = Math.round((bet.pot || 20) / 3);

                            return (
                                <div
                                    key={segment}
                                    className="p-3 rounded-lg bg-[var(--surface)] mb-[var(--space-3)] border border-[var(--rule)]"
                                >
                                    <div className="flex items-center justify-between mb-[var(--space-2)]">
                                        <span className="type-body-sm font-medium">{segmentLabel}</span>
                                        <span className="type-caption text-[var(--success)]">${potPerSegment}</span>
                                    </div>

                                    {result ? (
                                        <div
                                            className={`p-2 rounded text-center text-[var(--canvas)] ${
                                                result === 'push'
                                                    ? 'bg-[var(--warning)]'
                                                    : result === 'teamA'
                                                        ? 'bg-[var(--team-usa)]'
                                                        : 'bg-[var(--team-europe)]'
                                            }`}
                                        >
                                            <span className="type-body-sm font-medium">
                                                {result === 'push'
                                                    ? 'Push (Tied)'
                                                    : result === 'teamA'
                                                        ? `Team A Wins`
                                                        : `Team B Wins`
                                                }
                                            </span>
                                        </div>
                                    ) : bet.status === 'active' ? (
                                        <div className="flex gap-[var(--space-2)]">
                                            <button
                                                onClick={() => handleSetNassauWinner(segmentKey, 'teamA')}
                                                className="flex-1 px-3 py-2 rounded-lg transition-all hover:opacity-90 bg-[var(--team-usa)] text-[var(--canvas)] border-none cursor-pointer"
                                            >
                                                Team A
                                            </button>
                                            <button
                                                onClick={() => handleSetNassauWinner(segmentKey, 'push')}
                                                className="px-3 py-2 rounded-lg transition-all hover:opacity-90 bg-[var(--warning)] text-[var(--canvas)] border-none cursor-pointer"
                                            >
                                                Push
                                            </button>
                                            <button
                                                onClick={() => handleSetNassauWinner(segmentKey, 'teamB')}
                                                className="flex-1 px-3 py-2 rounded-lg transition-all hover:opacity-90 bg-[var(--team-europe)] text-[var(--canvas)] border-none cursor-pointer"
                                            >
                                                Team B
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="p-2 rounded text-center bg-[color:var(--surface-secondary)]">
                                            <span className="type-caption text-[var(--ink-tertiary)]">No result</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}

                        {/* Summary */}
                        {bet.nassauResults && (
                            (() => {
                                const results = bet.nassauResults;
                                let teamAWins = 0;
                                let teamBWins = 0;
                                const potPerSegment = Math.round((bet.pot || 20) / 3);

                                if (results.front9Winner === 'teamA') teamAWins++;
                                else if (results.front9Winner === 'teamB') teamBWins++;

                                if (results.back9Winner === 'teamA') teamAWins++;
                                else if (results.back9Winner === 'teamB') teamBWins++;

                                if (results.overallWinner === 'teamA') teamAWins++;
                                else if (results.overallWinner === 'teamB') teamBWins++;

                                if (teamAWins > 0 || teamBWins > 0) {
                                    return (
                                        <>
                                            <hr className="divider-lg my-[var(--space-3)]" />
                                            <div className="flex justify-between items-center">
                                                <div className="text-center flex-1">
                                                    <p className="type-caption text-[var(--ink-tertiary)]">Team A</p>
                                                    <p className="type-title text-[var(--team-usa)]">
                                                        {teamAWins} win{teamAWins !== 1 ? 's' : ''}
                                                    </p>
                                                    <p className="type-body-sm text-[var(--success)]">
                                                        ${teamAWins * potPerSegment}
                                                    </p>
                                                </div>
                                                <div className="text-center flex-1">
                                                    <p className="type-caption text-[var(--ink-tertiary)]">Team B</p>
                                                    <p className="type-title text-[var(--team-europe)]">
                                                        {teamBWins} win{teamBWins !== 1 ? 's' : ''}
                                                    </p>
                                                    <p className="type-body-sm text-[var(--success)]">
                                                        ${teamBWins * potPerSegment}
                                                    </p>
                                                </div>
                                            </div>
                                        </>
                                    );
                                }
                                return (
                                  <>
                                    <hr className="divider-lg my-[var(--space-3)]" />
                                    <div className="text-center py-[var(--space-2)]">
                                      <p className="type-caption text-[var(--ink-tertiary)]">
                                        All segments were halved — no payouts.
                                      </p>
                                    </div>
                                  </>
                                );
                            })()
                        )}
                    </div>
                )}

                {/* Status Actions (for CTP, Long Drive, Custom - not Skins or Nassau) */}
                {bet.status === 'active' && !isSkins && !isNassau && (
                    <div className="card p-[var(--space-4)] mb-[var(--space-4)]">
                        <h3 className="type-overline mb-[var(--space-3)]">Set Winner</h3>
                        <div className="flex flex-wrap gap-[var(--space-2)]">
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
                        className="btn btn-secondary w-full mb-[var(--space-4)]"
                    >
                        Reopen Bet
                    </button>
                )}

                {/* Skins Scorecard */}
                {isSkins && (
                    <div className="card p-[var(--space-4)] mb-[var(--space-4)]">
                        <h3 className="type-overline mb-[var(--space-3)]">Skins Scorecard</h3>

                        {/* Hole Grid */}
                        <div className="grid grid-cols-6 gap-[var(--space-2)]">
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
                                        className={`aspect-square rounded-lg flex flex-col items-center justify-center transition-all hover:scale-105 border-none cursor-pointer ${
                                            result?.winnerId
                                                ? 'bg-[var(--success)] text-[var(--canvas)]'
                                                : result
                                                    ? 'bg-[var(--warning)] text-[var(--canvas)]'
                                                    : 'bg-[var(--surface)] text-[var(--ink)]'
                                        }`}
                                    >
                                        <span className="type-micro font-bold">{hole}</span>
                                        {holeWinner && (
                                            <span className="type-micro text-[8px]">
                                                {holeWinner.lastName.slice(0, 3)}
                                            </span>
                                        )}
                                        {result && !result.winnerId && (
                                            <span className="type-micro text-[8px]">CO</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Standings */}
                        {skinsStandings.length > 0 && (
                            <>
                                <hr className="divider-lg my-[var(--space-4)]" />
                                <h4 className="type-overline mb-[var(--space-3)]">Standings</h4>
                                <div className="flex flex-col gap-[var(--space-2)]">
                                    {skinsStandings.map((standing, i) => (
                                        <div
                                            key={standing.playerId}
                                            className="flex items-center justify-between py-[var(--space-2)]"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span
                                                    className={`type-body-sm font-bold size-6 rounded-full flex items-center justify-center ${
                                                        i === 0
                                                            ? 'bg-[var(--success)] text-[var(--canvas)]'
                                                            : 'bg-[color:var(--surface-secondary)] text-[var(--ink-secondary)]'
                                                    }`}
                                                >
                                                    {i + 1}
                                                </span>
                                                <span className="type-body-sm">{standing.playerName}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <span className="type-caption">{standing.skins} skin{standing.skins !== 1 ? 's' : ''}</span>
                                                <span className="type-body-sm font-bold text-[var(--success)]">
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
                <div className="card p-[var(--space-4)]">
                    <div className="flex items-center justify-between mb-[var(--space-3)]">
                        <h3 className="type-overline">Participants ({participants.length})</h3>
                    </div>
                    <div className="flex flex-col gap-[var(--space-2)]">
                        {participants.map(player => (
                            <div
                                key={player.id}
                                className="flex items-center gap-3 py-[var(--space-2)]"
                            >
                                <div className="size-8 rounded-full bg-[var(--surface)] flex items-center justify-center">
                                    <Users size={16} className="text-[var(--ink-secondary)]" />
                                </div>
                                <div className="flex-1">
                                    <p className="type-body-sm">{player.firstName} {player.lastName}</p>
                                    {player.handicapIndex && (
                                        <p className="type-micro text-[var(--ink-tertiary)]">
                                            HCP: {player.handicapIndex}
                                        </p>
                                    )}
                                </div>
                                {bet.winnerId === player.id && (
                                    <Crown size={18} className="text-[var(--success)]" />
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
                        className="absolute inset-0 bg-[color:var(--ink)]/50"
                        onClick={() => setShowRecordWinner(false)}
                    />
                    <div className="relative w-full max-w-lg rounded-t-3xl border border-[var(--rule)] bg-[var(--surface-raised)] p-6 animate-slide-up max-h-[80vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="type-title">Hole {selectedHole} Winner</h2>
                            <button
                                onClick={() => setShowRecordWinner(false)}
                                className="p-2 rounded-full hover:bg-[var(--surface)] bg-transparent border-none cursor-pointer"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <div className="flex flex-col gap-[var(--space-3)]">
                            {participants.map(player => (
                                <button
                                    key={player.id}
                                    onClick={() => handleRecordHoleWinner(selectedHole, player.id)}
                                    className="card press-scale w-full text-left p-[var(--space-4)] border-none cursor-pointer"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="size-10 rounded-full bg-[var(--success)] flex items-center justify-center text-[var(--canvas)]">
                                            <Trophy size={20} />
                                        </div>
                                        <span className="type-body">{player.firstName} {player.lastName}</span>
                                    </div>
                                </button>
                            ))}

                            <button
                                onClick={() => handleRecordHoleWinner(selectedHole, null)}
                                className="card press-scale w-full text-left p-[var(--space-4)] border-none cursor-pointer"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="size-10 rounded-full bg-[var(--warning)] flex items-center justify-center text-[var(--canvas)]">
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
                        className="absolute inset-0 bg-[color:var(--ink)]/50"
                        onClick={() => setShowDeleteConfirm(false)}
                    />
                    <div className="relative rounded-2xl border border-[var(--rule)] bg-[var(--surface-raised)] p-6 max-w-sm w-full">
                        <h2 className="type-title mb-2">Delete Bet?</h2>
                        <p className="type-body mb-6 text-[var(--ink-secondary)]">
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
                                className="btn flex-1 bg-[var(--error)] text-[var(--canvas)]"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <BottomNav />
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
