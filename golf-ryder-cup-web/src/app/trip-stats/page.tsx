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
import { useRouter } from 'next/navigation';
import { EmptyStatePremium, PageLoadingSkeleton } from '@/components/ui';
import { BottomNav, PageHeader } from '@/components/layout';

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
  onChange,
}: {
  active: TripStatCategory;
  onChange: (cat: TripStatCategory) => void;
}) {
  return (
    <div className="flex overflow-x-auto gap-2 pb-2 -mx-4 px-4 scrollbar-hide">
      {categories.map((cat) => {
        const def = CATEGORY_DEFINITIONS[cat];
        const isActive = active === cat;
        return (
          <button
            key={cat}
            onClick={() => onChange(cat)}
            className={`
              flex items-center gap-1.5 px-3 py-2 rounded-full whitespace-nowrap
              text-sm font-medium transition-all
              ${
                isActive
                  ? 'bg-[color-mix(in_srgb,var(--masters)_18%,transparent)] text-[var(--masters)] shadow-md ring-2 ring-[color-mix(in_srgb,var(--masters)_35%,transparent)]'
                  : 'bg-[var(--surface-elevated)] text-[var(--ink-secondary)] hover:bg-[var(--surface)]'
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
  const leaderPlayer = leader ? players.find((p) => p.id === leader[0]) : null;

  return (
    <div className="card rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-[var(--surface)] transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{definition.emoji}</span>
          <div className="text-left">
            <div className="font-medium text-[var(--ink)]">{definition.label}</div>
            <div className="text-sm text-[var(--ink-tertiary)]">{definition.description}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-[var(--ink)]">
            {formatStatValue(total, definition.unit)}
          </div>
          {leaderPlayer && leader && leader[1] > 0 && (
            <div className="text-xs text-[var(--ink-tertiary)]">👑 {leaderPlayer.firstName}</div>
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-[var(--rule)] p-4 space-y-3">
          {players.map((player) => {
            const value = playerStats.get(player.id) ?? 0;
            return (
              <div key={player.id} className="flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-[var(--ink)] truncate">
                    {getPlayerName(player)}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDecrement(player.id);
                    }}
                    disabled={value === 0}
                    className="w-10 h-10 rounded-full bg-[var(--surface-elevated)] text-[var(--ink)]
                             flex items-center justify-center text-xl font-bold
                             disabled:opacity-30 disabled:cursor-not-allowed
                             hover:bg-[var(--surface)] active:scale-95 transition-all"
                  >
                    −
                  </button>
                  <div className="w-16 text-center font-bold text-lg text-[var(--ink)]">
                    {formatStatValue(value, definition.unit)}
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onIncrement(player.id);
                    }}
                    className="w-10 h-10 rounded-full bg-[var(--masters)] text-white
                             flex items-center justify-center text-xl font-bold
                             hover:opacity-90 active:scale-95 transition-all"
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
    <div className="card rounded-xl p-4">
      <h3 className="text-sm font-semibold text-[var(--ink-secondary)] mb-3">⚡ Quick Track</h3>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
        {players.map((player) => (
          <button
            key={player.id}
            onClick={() => setSelectedPlayer(player.id)}
            className={`
              px-3 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all
              ${
                selectedPlayer === player.id
                  ? 'bg-[color-mix(in_srgb,var(--masters)_18%,transparent)] text-[var(--masters)] ring-2 ring-[color-mix(in_srgb,var(--masters)_35%,transparent)]'
                  : 'bg-[var(--surface-elevated)] text-[var(--ink-secondary)] hover:bg-[var(--surface)]'
              }
            `}
          >
            {player.firstName}
          </button>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {quickActions.map((action) => (
          <button
            key={action.statType}
            onClick={() => handleQuickTrack(action.statType)}
            disabled={!selectedPlayer}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg
                     bg-[var(--surface-elevated)] text-[var(--ink)]
                     hover:bg-[var(--surface)] active:scale-95
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-all"
          >
            <span>{action.emoji}</span>
            <span className="text-sm font-medium">{action.label}</span>
          </button>
        ))}
      </div>

      {!selectedPlayer && (
        <p className="text-xs text-[var(--ink-tertiary)] mt-3 text-center">
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

  const sorted = [...playerTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  if (sorted.length === 0 || sorted.every(([, v]) => v === 0)) {
    return (
      <div className="card rounded-xl p-4">
        <h3 className="text-sm font-semibold text-[var(--ink-secondary)] mb-2">
          {categoryDef.emoji} {categoryDef.label} Leaders
        </h3>
        <p className="text-sm text-[var(--ink-tertiary)]">No leaders yet — start tracking to spark a rivalry.</p>
      </div>
    );
  }

  return (
    <div className="card rounded-xl p-4">
      <h3 className="text-sm font-semibold text-[var(--ink-secondary)] mb-3">
        {categoryDef.emoji} {categoryDef.label} Leaders
      </h3>
      <div className="space-y-2">
        {sorted
          .map(([playerId, total]) => ({
            playerId,
            total,
            player: players.find((p) => p.id === playerId) ?? null,
          }))
          .filter((row) => row.player && row.total > 0)
          .map((row, index) => (
            <div key={row.playerId} className="flex items-center gap-3">
              <div className="w-6 text-center font-bold text-[var(--ink-tertiary)]">
                {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}`}
              </div>
              <div className="flex-1 font-medium text-[var(--ink)]">
                {getPlayerName(row.player!)}
              </div>
              <div className="font-bold text-[var(--ink-secondary)]">{row.total}</div>
            </div>
          ))}
      </div>
    </div>
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

export default function TripStatsPage() {
  const router = useRouter();
  const { currentTrip, players } = useTripStore();
  const [activeCategory, setActiveCategory] = useState<TripStatCategory>('beverages');
  const [refreshKey, setRefreshKey] = useState(0);

  const tripStats = useLiveQuery(
    (): Promise<PlayerTripStat[]> =>
      currentTrip?.id ? tripStatsService.getTripStats(currentTrip.id) : Promise.resolve([]),
    [currentTrip?.id, refreshKey]
  );

  const tripStatsData: PlayerTripStat[] = tripStats ?? [];

  const handleRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
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

    const existing = tripStatsData.find(
      (s: PlayerTripStat) => s.playerId === playerId && s.statType === statType && !s.sessionId
    );

    if (existing && existing.value > 0) {
      await tripStatsService.updateStat(existing.id, {
        value: Math.max(0, existing.value - 1),
      });
      handleRefresh();
    }
  };

  const categoryStats = getStatsByCategory(activeCategory);
  const statMaps = new Map<TripStatType, Map<UUID, number>>();

  for (const def of categoryStats) {
    const playerMap = new Map<UUID, number>();
    for (const stat of tripStatsData) {
      if (stat.statType === def.type) {
        const current = playerMap.get(stat.playerId) ?? 0;
        playerMap.set(stat.playerId, current + stat.value);
      }
    }
    statMaps.set(def.type, playerMap);
  }

  if (currentTrip && tripStats === undefined) {
    return <PageLoadingSkeleton title="Trip Stats" variant="list" />;
  }

  if (!currentTrip) {
    return (
      <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
        <PageHeader
          title="Trip Stats"
          subtitle="Fun tracking beyond scores"
          icon={<Trophy size={16} className="text-[var(--color-accent)]" />}
          onBack={() => router.back()}
        />

        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="podium"
            title="No active trip"
            description="Start or join a trip to track fun stats."
            action={{
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

  const totalBeers = tripStatsData
    .filter((s: PlayerTripStat) => s.statType === 'beers')
    .reduce((a: number, b: PlayerTripStat) => a + b.value, 0);
  const totalBallsLost = tripStatsData
    .filter((s: PlayerTripStat) => s.statType === 'balls_lost')
    .reduce((a: number, b: PlayerTripStat) => a + b.value, 0);
  const totalMulligans = tripStatsData
    .filter((s: PlayerTripStat) => s.statType === 'mulligans')
    .reduce((a: number, b: PlayerTripStat) => a + b.value, 0);

  return (
    <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Trip Stats"
        subtitle={currentTrip.name}
        icon={<Trophy size={16} className="text-[var(--color-accent)]" />}
        onBack={() => router.back()}
      />

      <main className="container-editorial pb-8">
        <div className="space-y-6">
          {tripStatsData.length === 0 ? (
            <EmptyStatePremium
              illustration="podium"
              title="No stats yet"
              description="Start tracking below — once you add a few stats, leaderboards will appear here."
              variant="compact"
            />
          ) : null}

          {players.length > 0 ? (
            <QuickTrack players={players} tripId={currentTrip.id} onTrack={handleRefresh} />
          ) : (
            <EmptyStatePremium
              illustration="trophy"
              title="Add players to start tracking"
              description="Trip stats are tracked per player. Add players first, then come back here to start the rivalry."
              action={{
                label: 'Manage Players',
                onClick: () => router.push('/players'),
              }}
              variant="compact"
            />
          )}

          <CategoryTabs active={activeCategory} onChange={setActiveCategory} />

          <div className="space-y-3">
            {categoryStats.map((def) => (
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

          <CategoryLeaderboard category={activeCategory} tripId={currentTrip.id} players={players} />

          <div className="card rounded-xl p-4">
            <h3 className="text-sm font-semibold text-[var(--ink-secondary)] mb-3">📊 Trip Totals</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl">🍺</div>
                <div className="text-xl font-bold text-[var(--ink)]">{totalBeers}</div>
                <div className="text-xs text-[var(--ink-tertiary)]">Beers</div>
              </div>
              <div className="text-center">
                <div className="text-2xl">⚪</div>
                <div className="text-xl font-bold text-[var(--ink)]">{totalBallsLost}</div>
                <div className="text-xs text-[var(--ink-tertiary)]">Balls Lost</div>
              </div>
              <div className="text-center">
                <div className="text-2xl">🔄</div>
                <div className="text-xl font-bold text-[var(--ink)]">{totalMulligans}</div>
                <div className="text-xs text-[var(--ink-tertiary)]">Mulligans</div>
              </div>
            </div>
          </div>

          <Link
            href="/trip-stats/awards"
            className="card rounded-xl p-4 flex items-center gap-4 hover:bg-[var(--surface)] transition-colors"
          >
            <div className="w-12 h-12 rounded-full bg-[color-mix(in_srgb,var(--masters)_10%,transparent)] flex items-center justify-center">
              <Trophy size={24} className="text-[var(--masters)]" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-[var(--ink)]">Trip Awards</h3>
              <p className="text-sm text-[var(--ink-secondary)]">
                Vote for superlatives: MVP, best dressed, and more!
              </p>
            </div>
            <ChevronRight size={20} className="text-[var(--ink-tertiary)]" />
          </Link>
        </div>
      </main>
      <BottomNav />
    </div>
  );
}
