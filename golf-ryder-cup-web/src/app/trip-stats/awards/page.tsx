'use client';

/**
 * Trip Awards Page
 *
 * End-of-trip awards ceremony for fun superlatives.
 * Vote for MVP, best dressed, party animal, and more!
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTripStore } from '@/lib/stores/tripStore';
import * as tripStatsService from '@/lib/services/tripStatsService';
import type { UUID, Player } from '@/lib/types/models';
import type { AwardType, TripAward } from '@/lib/types/tripStats';
import { AWARD_DEFINITIONS } from '@/lib/types/tripStats';
import { ChevronLeft, Trophy, Sparkles } from 'lucide-react';

function getPlayerName(player: Player): string {
    return `${player.firstName} ${player.lastName}`;
}

// ============================================
// AWARD CARD COMPONENT
// ============================================

function AwardCard({
    awardType,
    currentWinner,
    players,
    suggestedWinnerId,
    onSelectWinner,
}: {
    awardType: AwardType;
    currentWinner?: TripAward;
    players: Player[];
    suggestedWinnerId?: UUID;
    onSelectWinner: (playerId: UUID) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const def = AWARD_DEFINITIONS[awardType];

    const winnerPlayer = currentWinner
        ? players.find(p => p.id === currentWinner.winnerId)
        : null;

    const suggestedPlayer = suggestedWinnerId
        ? players.find(p => p.id === suggestedWinnerId)
        : null;

    return (
        <div className={`
      card-surface rounded-xl overflow-hidden
      ${def.isPositive ? 'ring-1 ring-masters/20' : 'ring-1 ring-surface-border/30'}
    `}>
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full p-4 flex items-center justify-between hover:bg-surface-highlight transition-colors"
            >
                <div className="flex items-center gap-3">
                    <span className="text-3xl">{def.emoji}</span>
                    <div className="text-left">
                        <div className="font-semibold text-text-primary">{def.label}</div>
                        <div className="text-sm text-text-tertiary">{def.description}</div>
                    </div>
                </div>
                {winnerPlayer ? (
                    <div className="text-right">
                        <div className="font-bold text-masters">{winnerPlayer.firstName}</div>
                        <div className="text-xs text-text-tertiary">Winner</div>
                    </div>
                ) : suggestedPlayer ? (
                    <div className="text-right">
                        <div className="text-sm text-text-secondary">{suggestedPlayer.firstName}</div>
                        <div className="text-xs text-text-tertiary">Suggested</div>
                    </div>
                ) : (
                    <div className="text-sm text-text-tertiary">Tap to vote</div>
                )}
            </button>

            {expanded && (
                <div className="border-t border-surface-border p-4">
                    <p className="text-sm text-text-secondary mb-3">Select a winner:</p>
                    <div className="flex flex-wrap gap-2">
                        {players.map(player => {
                            const isWinner = currentWinner?.winnerId === player.id;
                            const isSuggested = suggestedWinnerId === player.id;

                            return (
                                <button
                                    key={player.id}
                                    onClick={() => onSelectWinner(player.id)}
                                    className={`
                    px-4 py-2 rounded-full text-sm font-medium transition-all
                    ${isWinner
                                            ? 'bg-masters text-white shadow-md'
                                            : isSuggested
                                                ? 'bg-masters/20 text-masters border border-masters/30'
                                                : 'bg-surface-elevated text-text-primary hover:bg-surface-highlight'
                                        }
                  `}
                                >
                                    {getPlayerName(player)}
                                    {isWinner && ' 🏆'}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================
// AWARD WINNER SHOWCASE
// ============================================

function WinnerShowcase({
    awards,
    players,
}: {
    awards: TripAward[];
    players: Player[];
}) {
    if (awards.length === 0) return null;

    return (
        <div className="card-elevated rounded-xl p-6 mb-6">
            <div className="flex items-center gap-2 mb-4">
                <Trophy size={20} className="text-masters" />
                <h2 className="type-h3">Award Winners</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
                {awards.map(award => {
                    const def = AWARD_DEFINITIONS[award.awardType];
                    const winner = players.find(p => p.id === award.winnerId);
                    if (!winner) return null;

                    return (
                        <div key={award.id} className="flex items-center gap-3">
                            <span className="text-2xl">{def.emoji}</span>
                            <div>
                                <div className="text-xs text-text-tertiary">{def.label}</div>
                                <div className="font-semibold text-text-primary">
                                    {winner.firstName}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

const positiveAwards: AwardType[] = [
    'mvp', 'best_dressed', 'best_story', 'most_improved',
    'party_animal', 'early_bird', 'night_owl', 'best_attitude',
    'clutch_player', 'social_butterfly', 'best_cheerleader', 'beverage_king',
];

const funnyAwards: AwardType[] = [
    'worst_dressed', 'most_excuses', 'slowest_player',
    'most_lost_balls', 'cart_path_champion', 'sand_king', 'water_magnet',
];

export default function TripAwardsPage() {
    const router = useRouter();
    const { currentTrip, players } = useTripStore();
    const [refreshKey, setRefreshKey] = useState(0);

    const awards = useLiveQuery(
        (): Promise<TripAward[]> =>
            currentTrip?.id ? tripStatsService.getTripAwards(currentTrip.id) : Promise.resolve([]),
        [currentTrip?.id, refreshKey],
        [] as TripAward[]
    );

    const suggestions = useLiveQuery(
        (): Promise<Map<AwardType, UUID>> =>
            currentTrip?.id ? tripStatsService.getSuggestedAwards(currentTrip.id) : Promise.resolve(new Map()),
        [currentTrip?.id, refreshKey],
        new Map<AwardType, UUID>()
    );

    const handleSelectWinner = async (awardType: AwardType, playerId: UUID) => {
        if (!currentTrip?.id) return;

        await tripStatsService.giveAward({
            tripId: currentTrip.id,
            awardType,
            winnerId: playerId,
        });

        setRefreshKey(k => k + 1);
    };

    if (!currentTrip) {
        return (
            <main className="page-container">
                <header className="header-premium">
                    <button onClick={() => router.back()} className="p-1 text-text-secondary">
                        <ChevronLeft size={20} />
                    </button>
                    <h1 className="type-h2">Trip Awards</h1>
                </header>
                <div className="content-area">
                    <div className="card-surface rounded-xl p-8 text-center">
                        <div className="text-4xl mb-4">🏆</div>
                        <h2 className="type-h3 mb-2">No Active Trip</h2>
                        <p className="text-text-secondary">
                            Start or join a trip to give awards!
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="page-container">
            <header className="header-premium flex items-center gap-3">
                <button onClick={() => router.back()} className="p-1 text-text-secondary">
                    <ChevronLeft size={20} />
                </button>
                <div>
                    <h1 className="type-h2">Trip Awards</h1>
                    <p className="type-body text-text-secondary">End-of-trip superlatives</p>
                </div>
            </header>

            <div className="content-area space-y-6">
                <WinnerShowcase awards={awards} players={players} />

                <div className="card-surface rounded-xl p-4 flex items-start gap-3">
                    <Sparkles size={20} className="text-masters shrink-0 mt-0.5" />
                    <div>
                        <p className="text-sm text-text-primary font-medium">
                            Vote for trip superlatives!
                        </p>
                        <p className="text-xs text-text-secondary mt-1">
                            Some awards have auto-suggestions based on trip stats.
                            Tap any award to select a winner.
                        </p>
                    </div>
                </div>

                <section>
                    <h2 className="type-overline text-text-secondary mb-3">🌟 Positive Vibes</h2>
                    <div className="space-y-3">
                        {positiveAwards.map(awardType => (
                            <AwardCard
                                key={awardType}
                                awardType={awardType}
                                currentWinner={awards.find((a: TripAward) => a.awardType === awardType)}
                                players={players}
                                suggestedWinnerId={suggestions.get(awardType)}
                                onSelectWinner={(playerId) => handleSelectWinner(awardType, playerId)}
                            />
                        ))}
                    </div>
                </section>

                <section>
                    <h2 className="type-overline text-text-secondary mb-3">😂 Dubious Honors</h2>
                    <div className="space-y-3">
                        {funnyAwards.map(awardType => (
                            <AwardCard
                                key={awardType}
                                awardType={awardType}
                                currentWinner={awards.find((a: TripAward) => a.awardType === awardType)}
                                players={players}
                                suggestedWinnerId={suggestions.get(awardType)}
                                onSelectWinner={(playerId) => handleSelectWinner(awardType, playerId)}
                            />
                        ))}
                    </div>
                </section>
            </div>
        </main>
    );
}
