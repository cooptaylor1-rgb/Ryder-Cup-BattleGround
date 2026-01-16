'use client';

/**
 * Trip Stats Page
 *
 * Fun stats tracking beyond golf scores.
 * Track beverages, mishaps, cart chaos, and more!
 */

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { useTripStore } from '@/lib/stores/tripStore';
import * as tripStatsService from '@/lib/services/tripStatsService';
import type { UUID, Player } from '@/lib/types/models';
import type {
    TripStatCategory,
    TripStatType,
    StatDefinition,
    PlayerTripStat,
} from '@/lib/types/tripStats';
import {
    CATEGORY_DEFINITIONS,
    STAT_DEFINITIONS,
    getStatsByCategory,
    formatStatValue,
} from '@/lib/types/tripStats';
import { Trophy, ChevronRight } from 'lucide-react';

// ============================================
// CATEGORY TABS COMPONENT
// ============================================

const categories: TripStatCategory[] = [
    'beverages',
    'golf_mishaps',
    'golf_highlights',
    'cart_chaos',
    'social',
    'money',
];

// Helper to get player display name
function getPlayerName(player: Player): string {
    return `${player.firstName} ${player.lastName}`;
}

function CategoryTabs({
    active,
    onChange
}: {
    active: TripStatCategory;
    onChange: (cat: TripStatCategory) => void;
}) {
    return (
        <div className="flex overflow-x-auto gap-2 pb-2 -mx-4 px-4 scrollbar-hide">
            {categories.map(cat => {
                const def = CATEGORY_DEFINITIONS[cat];
                const isActive = active === cat;
                return (
                    <button
                        key={cat}
                        onClick={() => onChange(cat)}
                        className={`
              flex items-center gap-1.5 px-3 py-2 rounded-full whitespace-nowrap
              text-sm font-medium transition-all
              ${isActive
                                ? 'bg-masters-green text-white shadow-md'
                                : 'bg-surface-elevated text-text-secondary hover:bg-surface-highlight'
                            }
            `}
                    >
                        <span>{def.emoji}</span>
                        <span>{def.label}</span>
                    </button>
                );
            })}
        </div>
    );
}

// ============================================
// STAT CARD COMPONENT
// ============================================

function StatCard({
    definition,
    playerStats,
    players,
    onIncrement,
    onDecrement,
}: {
    definition: StatDefinition;
    playerStats: Map<UUID, number>;
    players: Player[];
    onIncrement: (playerId: UUID) => void;
    onDecrement: (playerId: UUID) => void;
}) {
    const [expanded, setExpanded] = useState(false);

    // Calculate total and leader
    const total = [...playerStats.values()].reduce((a, b) => a + b, 0);
    const leader = [...playerStats.entries()].sort((a, b) => b[1] - a[1])[0];
    const leaderPlayer = leader ? players.find(p => p.id === leader[0]) : null;

    return (
        <div className="card-surface rounded-xl overflow-hidden">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full p-4 flex items-center justify-between hover:bg-surface-highlight transition-colors"
            >
                <div className="flex items-center gap-3">
                    <span className="text-2xl">{definition.emoji}</span>
                    <div className="text-left">
                        <div className="font-medium text-text-primary">{definition.label}</div>
                        <div className="text-sm text-text-tertiary">{definition.description}</div>
                    </div>
                </div>
                <div className="text-right">
                    <div className="text-xl font-bold text-text-primary">
                        {formatStatValue(total, definition.unit)}
                    </div>
                    {leaderPlayer && leader && leader[1] > 0 && (
                        <div className="text-xs text-text-tertiary">
                            👑 {leaderPlayer.firstName}
                        </div>
                    )}
                </div>
            </button>

            {expanded && (
                <div className="border-t border-surface-border p-4 space-y-3">
                    {players.map(player => {
                        const value = playerStats.get(player.id) ?? 0;
                        return (
                            <div
                                key={player.id}
                                className="flex items-center justify-between gap-4"
                            >
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-text-primary truncate">
                                        {getPlayerName(player)}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onDecrement(player.id); }}
                                        disabled={value === 0}
                                        className="w-10 h-10 rounded-full bg-surface-elevated text-text-primary
                             flex items-center justify-center text-xl font-bold
                             disabled:opacity-30 disabled:cursor-not-allowed
                             hover:bg-surface-highlight active:scale-95 transition-all"
                                    >
                                        −
                                    </button>
                                    <div className="w-16 text-center font-bold text-lg text-text-primary">
                                        {formatStatValue(value, definition.unit)}
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onIncrement(player.id); }}
                                        className="w-10 h-10 rounded-full bg-masters-green text-white
                             flex items-center justify-center text-xl font-bold
                             hover:bg-masters-green/90 active:scale-95 transition-all"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

// ============================================
// QUICK TRACK COMPONENT
// ============================================

function QuickTrack({
    players,
    tripId,
    onTrack,
}: {
    players: Player[];
    tripId: UUID;
    onTrack: () => void;
}) {
    const [selectedPlayer, setSelectedPlayer] = useState<UUID | null>(null);

    const quickActions: { statType: TripStatType; emoji: string; label: string }[] = [
        { statType: 'beers', emoji: '🍺', label: 'Beer' },
        { statType: 'balls_lost', emoji: '⚪', label: 'Ball Lost' },
        { statType: 'mulligans', emoji: '🔄', label: 'Mulligan' },
        { statType: 'sand_traps', emoji: '🏖️', label: 'Bunker' },
        { statType: 'water_hazards', emoji: '💦', label: 'Water' },
    ];

    const handleQuickTrack = async (statType: TripStatType) => {
        if (!selectedPlayer) return;
        await tripStatsService.incrementStat({
            tripId,
            playerId: selectedPlayer,
            statType,
        });
        onTrack();
    };

    return (
        <div className="card-elevated rounded-xl p-4">
            <h3 className="text-sm font-semibold text-text-secondary mb-3">⚡ Quick Track</h3>

            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
                {players.map(player => (
                    <button
                        key={player.id}
                        onClick={() => setSelectedPlayer(player.id)}
                        className={`
              px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
              ${selectedPlayer === player.id
                                ? 'bg-masters-green text-white'
                                : 'bg-surface-elevated text-text-secondary hover:bg-surface-highlight'
                            }
            `}
                    >
                        {player.firstName}
                    </button>
                ))}
            </div>

            <div className="flex gap-2 flex-wrap">
                {quickActions.map(action => (
                    <button
                        key={action.statType}
                        onClick={() => handleQuickTrack(action.statType)}
                        disabled={!selectedPlayer}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg
                     bg-surface-elevated text-text-primary
                     hover:bg-surface-highlight active:scale-95
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-all"
                    >
                        <span>{action.emoji}</span>
                        <span className="text-sm font-medium">{action.label}</span>
                    </button>
                ))}
            </div>

            {!selectedPlayer && (
                <p className="text-xs text-text-tertiary mt-3 text-center">
                    Select a player to quick-track stats
                </p>
            )}
        </div>
    );
}

// ============================================
// LEADERBOARD COMPONENT
// ============================================

function CategoryLeaderboard({
    category,
    tripId,
    players,
}: {
    category: TripStatCategory;
    tripId: UUID;
    players: Player[];
}) {
    const stats = useLiveQuery(
        () => tripStatsService.getTripStats(tripId),
        [tripId],
        [] as PlayerTripStat[]
    );

    const categoryDef = CATEGORY_DEFINITIONS[category];

    const playerTotals = new Map<UUID, number>();

    for (const stat of stats) {
        const statType = stat.statType as TripStatType;
        const def = STAT_DEFINITIONS[statType];
        if (def?.category === category) {
            const current = playerTotals.get(stat.playerId) ?? 0;
            playerTotals.set(stat.playerId, current + stat.value);
        }
    }

    const sorted = [...playerTotals.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    if (sorted.length === 0 || sorted.every(([, v]) => v === 0)) {
        return null;
    }

    return (
        <div className="card-surface rounded-xl p-4">
            <h3 className="text-sm font-semibold text-text-secondary mb-3">
                {categoryDef.emoji} {categoryDef.label} Leaders
            </h3>
            <div className="space-y-2">
                {sorted.map(([playerId, total], index) => {
                    const player = players.find(p => p.id === playerId);
                    if (!player || total === 0) return null;

                    return (
                        <div key={playerId} className="flex items-center gap-3">
                            <div className="w-6 text-center font-bold text-text-tertiary">
                                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
                            </div>
                            <div className="flex-1 font-medium text-text-primary">
                                {getPlayerName(player)}
                            </div>
                            <div className="font-bold text-text-secondary">
                                {total}
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

export default function TripStatsPage() {
    const { currentTrip, players } = useTripStore();
    const [activeCategory, setActiveCategory] = useState<TripStatCategory>('beverages');
    const [refreshKey, setRefreshKey] = useState(0);

    const tripStats = useLiveQuery(
        (): Promise<PlayerTripStat[]> =>
            currentTrip?.id ? tripStatsService.getTripStats(currentTrip.id) : Promise.resolve([]),
        [currentTrip?.id, refreshKey],
        [] as PlayerTripStat[]
    );

    const handleRefresh = useCallback(() => {
        setRefreshKey(k => k + 1);
    }, []);

    const handleIncrement = async (playerId: UUID, statType: TripStatType) => {
        if (!currentTrip?.id) return;
        await tripStatsService.incrementStat({
            tripId: currentTrip.id,
            playerId,
            statType,
        });
        handleRefresh();
    };

    const handleDecrement = async (playerId: UUID, statType: TripStatType) => {
        if (!currentTrip?.id) return;

        const existing = tripStats.find(
            (s: PlayerTripStat) => s.playerId === playerId && s.statType === statType && !s.sessionId
        );

        if (existing && existing.value > 0) {
            await tripStatsService.updateStat(existing.id, {
                value: Math.max(0, existing.value - 1)
            });
            handleRefresh();
        }
    };

    const categoryStats = getStatsByCategory(activeCategory);
    const statMaps = new Map<TripStatType, Map<UUID, number>>();

    for (const def of categoryStats) {
        const playerMap = new Map<UUID, number>();
        for (const stat of tripStats) {
            if (stat.statType === def.type) {
                const current = playerMap.get(stat.playerId) ?? 0;
                playerMap.set(stat.playerId, current + stat.value);
            }
        }
        statMaps.set(def.type, playerMap);
    }

    if (!currentTrip) {
        return (
            <main className="page-container">
                <header className="header-premium">
                    <h1 className="type-h2">Trip Stats</h1>
                </header>
                <div className="content-area">
                    <div className="card-surface rounded-xl p-8 text-center">
                        <div className="text-4xl mb-4">📊</div>
                        <h2 className="type-h3 mb-2">No Active Trip</h2>
                        <p className="text-text-secondary">
                            Start or join a trip to track fun stats!
                        </p>
                    </div>
                </div>
            </main>
        );
    }

    const totalBeers = tripStats.filter((s: PlayerTripStat) => s.statType === 'beers').reduce((a: number, b: PlayerTripStat) => a + b.value, 0);
    const totalBallsLost = tripStats.filter((s: PlayerTripStat) => s.statType === 'balls_lost').reduce((a: number, b: PlayerTripStat) => a + b.value, 0);
    const totalMulligans = tripStats.filter((s: PlayerTripStat) => s.statType === 'mulligans').reduce((a: number, b: PlayerTripStat) => a + b.value, 0);

    return (
        <main className="page-container">
            <header className="header-premium">
                <h1 className="type-h2">Trip Stats</h1>
                <p className="type-body text-text-secondary">Fun tracking beyond scores</p>
            </header>

            <div className="content-area space-y-6">
                <QuickTrack
                    players={players}
                    tripId={currentTrip.id}
                    onTrack={handleRefresh}
                />

                <CategoryTabs
                    active={activeCategory}
                    onChange={setActiveCategory}
                />

                <div className="space-y-3">
                    {categoryStats.map(def => (
                        <StatCard
                            key={def.type}
                            definition={def}
                            playerStats={statMaps.get(def.type) || new Map()}
                            players={players}
                            onIncrement={(playerId) => handleIncrement(playerId, def.type)}
                            onDecrement={(playerId) => handleDecrement(playerId, def.type)}
                        />
                    ))}
                </div>

                <CategoryLeaderboard
                    category={activeCategory}
                    tripId={currentTrip.id}
                    players={players}
                />

                <div className="card-surface rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-text-secondary mb-3">📊 Trip Totals</h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="text-center">
                            <div className="text-2xl">🍺</div>
                            <div className="text-xl font-bold text-text-primary">{totalBeers}</div>
                            <div className="text-xs text-text-tertiary">Beers</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl">⚪</div>
                            <div className="text-xl font-bold text-text-primary">{totalBallsLost}</div>
                            <div className="text-xs text-text-tertiary">Balls Lost</div>
                        </div>
                        <div className="text-center">
                            <div className="text-2xl">🔄</div>
                            <div className="text-xl font-bold text-text-primary">{totalMulligans}</div>
                            <div className="text-xs text-text-tertiary">Mulligans</div>
                        </div>
                    </div>
                </div>

                <Link href="/trip-stats/awards" className="card-elevated rounded-xl p-4 flex items-center gap-4 hover:bg-surface-highlight transition-colors">
                    <div className="w-12 h-12 rounded-full bg-masters/10 flex items-center justify-center">
                        <Trophy size={24} className="text-masters" />
                    </div>
                    <div className="flex-1">
                        <h3 className="font-semibold text-text-primary">Trip Awards</h3>
                        <p className="text-sm text-text-secondary">Vote for superlatives: MVP, best dressed, and more!</p>
                    </div>
                    <ChevronRight size={20} className="text-text-tertiary" />
                </Link>
            </div>
        </main>
    );
}
