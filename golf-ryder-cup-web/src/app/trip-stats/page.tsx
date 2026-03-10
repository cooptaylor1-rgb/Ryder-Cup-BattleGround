'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { ChevronRight, Plus, RotateCcw, Trophy } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { EmptyStatePremium, PageLoadingSkeleton } from '@/components/ui';
import { useTripStore } from '@/lib/stores/tripStore';
import * as tripStatsService from '@/lib/services/tripStatsService';
import {
  CATEGORY_DEFINITIONS,
  STAT_DEFINITIONS,
  formatStatValue,
  getStatsByCategory,
  type PlayerTripStat,
  type StatDefinition,
  type TripStatCategory,
  type TripStatType,
} from '@/lib/types/tripStats';
import type { Player, UUID } from '@/lib/types/models';
import { cn } from '@/lib/utils';

const CATEGORIES: TripStatCategory[] = [
  'beverages',
  'golf_mishaps',
  'golf_highlights',
  'cart_chaos',
  'social',
  'money',
];

const QUICK_ACTIONS: TripStatType[] = ['beers', 'balls_lost', 'mulligans', 'sand_traps', 'water_hazards'];

export default function TripStatsPage() {
  const router = useRouter();
  const { currentTrip, players } = useTripStore();
  const [activeCategory, setActiveCategory] = useState<TripStatCategory>('beverages');
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedPlayerId, setSelectedPlayerId] = useState<UUID | null>(null);
  const currentTripId = currentTrip?.id ?? null;

  const tripStats = useLiveQuery(
    (): Promise<PlayerTripStat[]> =>
      currentTripId ? tripStatsService.getTripStats(currentTripId) : Promise.resolve([]),
    [currentTripId, refreshKey]
  );

  const tripStatsData = useMemo(() => tripStats ?? [], [tripStats]);

  const handleRefresh = useCallback(() => {
    setRefreshKey((value) => value + 1);
  }, []);

  const adjustStat = useCallback(
    async (playerId: UUID, statType: TripStatType, direction: 1 | -1) => {
      if (!currentTripId) {
        return;
      }

      if (direction === 1) {
        await tripStatsService.incrementStat({
          tripId: currentTripId,
          playerId,
          statType,
        });
        handleRefresh();
        return;
      }

      const existing = tripStatsData.find(
        (stat) => stat.playerId === playerId && stat.statType === statType && !stat.sessionId
      );

      if (!existing || existing.value <= 0) {
        return;
      }

      await tripStatsService.updateStat(existing.id, {
        value: Math.max(0, existing.value - 1),
      });
      handleRefresh();
    },
    [currentTripId, handleRefresh, tripStatsData]
  );

  const categoryStats = getStatsByCategory(activeCategory);

  const statMaps = useMemo(() => {
    const maps = new Map<TripStatType, Map<UUID, number>>();

    for (const definition of categoryStats) {
      const playerMap = new Map<UUID, number>();
      for (const stat of tripStatsData) {
        if (stat.statType === definition.type) {
          const current = playerMap.get(stat.playerId) ?? 0;
          playerMap.set(stat.playerId, current + stat.value);
        }
      }
      maps.set(definition.type, playerMap);
    }

    return maps;
  }, [categoryStats, tripStatsData]);

  const categoryTotals = useMemo(() => {
    return CATEGORIES.map((category) => {
      const definitions = getStatsByCategory(category);
      const total = tripStatsData
        .filter((stat) => definitions.some((definition) => definition.type === stat.statType))
        .reduce((sum, stat) => sum + stat.value, 0);
      return { category, total };
    });
  }, [tripStatsData]);

  const tripHighlights = useMemo(() => {
    return {
      beers: tripStatsData
        .filter((stat) => stat.statType === 'beers')
        .reduce((sum, stat) => sum + stat.value, 0),
      ballsLost: tripStatsData
        .filter((stat) => stat.statType === 'balls_lost')
        .reduce((sum, stat) => sum + stat.value, 0),
      mulligans: tripStatsData
        .filter((stat) => stat.statType === 'mulligans')
        .reduce((sum, stat) => sum + stat.value, 0),
    };
  }, [tripStatsData]);

  const leaders = useMemo(() => buildCategoryLeaders(activeCategory, tripStatsData, players), [activeCategory, players, tripStatsData]);

  if (currentTrip && tripStats === undefined) {
    return <PageLoadingSkeleton title="Trip stats" variant="list" />;
  }

  if (!currentTrip) {
    return (
      <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
        <PageHeader
          title="Trip Stats"
          subtitle="No active trip"
          icon={<Trophy size={16} className="text-[var(--canvas)]" />}
          iconContainerClassName="bg-[linear-gradient(135deg,var(--masters)_0%,var(--masters-deep)_100%)]"
          onBack={() => router.back()}
        />

        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="podium"
            title="No active trip"
            description="Start or join a trip to track the unofficial numbers."
            action={{
              label: 'Go home',
              onClick: () => router.push('/'),
            }}
            variant="large"
          />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Trip Stats"
        subtitle={currentTrip.name}
        icon={<Trophy size={16} className="text-[var(--canvas)]" />}
        iconContainerClassName="bg-[linear-gradient(135deg,var(--masters)_0%,var(--masters-deep)_100%)]"
        onBack={() => router.back()}
        rightSlot={
          <Button variant="outline" size="sm" leftIcon={<Trophy size={14} />} onClick={() => router.push('/trip-stats/awards')}>
            Awards
          </Button>
        }
      />

      <main className="container-editorial py-[var(--space-6)] pb-[var(--space-12)]">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--masters)]/14 bg-[linear-gradient(135deg,rgba(10,80,48,0.97),rgba(4,52,30,0.98))] text-[var(--canvas)] shadow-[0_28px_64px_rgba(5,58,35,0.22)]">
          <div className="grid gap-[var(--space-5)] px-[var(--space-5)] py-[var(--space-5)] lg:grid-cols-[minmax(0,1.18fr)_18rem]">
            <div>
              <p className="type-overline tracking-[0.18em] text-[color:var(--canvas)]/72">Trip Ledger</p>
              <h1 className="mt-[var(--space-2)] font-serif text-[clamp(2rem,7vw,3.2rem)] italic leading-[1.02] text-[var(--canvas)]">
                The side numbers are usually the ones everyone remembers.
              </h1>
              <p className="mt-[var(--space-3)] max-w-[36rem] text-sm leading-7 text-[color:var(--canvas)]/80">
                Score decides the cup. Trip stats decide the stories. This board tracks the drinks,
                disasters, and smaller moments that become the real recap once the matches are over.
              </p>
            </div>

            <div className="grid gap-[var(--space-3)] sm:grid-cols-3 lg:grid-cols-1">
              <TripStatFactCard label="Players" value={players.length} detail="The field available for off-course immortality." />
              <TripStatFactCard label="Entries" value={tripStatsData.length} detail="Every stat record currently on the books." />
              <TripStatFactCard
                label="Active lens"
                value={CATEGORY_DEFINITIONS[activeCategory].label}
                detail="The category currently driving the board."
                valueClassName="font-sans text-[1rem] not-italic leading-[1.25]"
              />
            </div>
          </div>
        </section>

        <section className="mt-[var(--space-6)] grid gap-[var(--space-4)] xl:grid-cols-[minmax(0,1.16fr)_18rem]">
          <div className="space-y-[var(--space-4)]">
            {players.length > 0 ? (
              <QuickTrackPanel
                players={players}
                selectedPlayerId={selectedPlayerId}
                setSelectedPlayerId={setSelectedPlayerId}
                onQuickTrack={(statType) => {
                  if (selectedPlayerId) {
                    void adjustStat(selectedPlayerId, statType, 1);
                  }
                }}
              />
            ) : (
              <EmptyStatePremium
                illustration="trophy"
                title="Add players to start tracking"
                description="Trip stats only make sense when the roster exists first."
                action={{
                  label: 'Manage players',
                  onClick: () => router.push('/players'),
                }}
                variant="compact"
              />
            )}

            <section className="rounded-[1.85rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,238,231,0.99))] p-[var(--space-5)] shadow-[0_18px_38px_rgba(41,29,17,0.06)]">
              <div className="flex flex-wrap gap-[var(--space-3)]">
                {categoryTotals.map(({ category, total }) => {
                  const definition = CATEGORY_DEFINITIONS[category];
                  const isActive = activeCategory === category;
                  return (
                    <button
                      key={category}
                      type="button"
                      onClick={() => setActiveCategory(category)}
                      className={cn(
                        'rounded-full border px-4 py-2 text-sm font-medium transition-transform duration-150 hover:scale-[1.01]',
                        isActive
                          ? 'border-[var(--masters)]/24 bg-[color:var(--masters)]/10 text-[var(--masters)]'
                          : 'border-[color:var(--rule)]/70 bg-[color:var(--surface)]/78 text-[var(--ink-secondary)]'
                      )}
                    >
                      {definition.emoji} {definition.label} {total > 0 ? `(${total})` : ''}
                    </button>
                  );
                })}
              </div>
            </section>

            {tripStatsData.length === 0 ? (
              <EmptyStatePremium
                illustration="podium"
                title="No trip stats yet"
                description="Start with a few quick entries below and the leaderboards will come alive."
                variant="compact"
              />
            ) : null}

            <section className="grid gap-[var(--space-4)]">
              {categoryStats.map((definition) => (
                <StatPanel
                  key={definition.type}
                  definition={definition}
                  players={players}
                  playerStats={statMaps.get(definition.type) ?? new Map()}
                  onIncrement={(playerId) => void adjustStat(playerId, definition.type, 1)}
                  onDecrement={(playerId) => void adjustStat(playerId, definition.type, -1)}
                />
              ))}
            </section>
          </div>

          <aside className="space-y-[var(--space-4)]">
            <LeaderPanel category={activeCategory} leaders={leaders} />

            <section className="rounded-[1.8rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,239,232,0.99))] p-[var(--space-5)] shadow-[0_18px_38px_rgba(41,29,17,0.06)]">
              <p className="type-overline tracking-[0.15em] text-[var(--ink-tertiary)]">Trip Totals</p>
              <div className="mt-[var(--space-4)] grid gap-[var(--space-3)]">
                <MiniTotalCard emoji="🍺" label="Beers" value={tripHighlights.beers} />
                <MiniTotalCard emoji="⚪" label="Balls lost" value={tripHighlights.ballsLost} />
                <MiniTotalCard emoji="🔄" label="Mulligans" value={tripHighlights.mulligans} />
              </div>
            </section>

            <Link
              href="/trip-stats/awards"
              className="block rounded-[1.8rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,239,232,0.99))] p-[var(--space-5)] shadow-[0_18px_38px_rgba(41,29,17,0.06)] transition-transform duration-150 hover:scale-[1.01]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[color:var(--masters)]/12 text-[var(--masters)]">
                <Trophy size={18} />
              </div>
              <h2 className="mt-[var(--space-3)] font-serif text-[1.6rem] italic text-[var(--ink)]">
                Trip awards
              </h2>
              <p className="mt-[var(--space-2)] text-sm leading-7 text-[var(--ink-secondary)]">
                Turn the stat sheet into a proper awards board once the group has accumulated enough nonsense.
              </p>
              <div className="mt-[var(--space-4)] flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
                Open awards
                <ChevronRight size={14} />
              </div>
            </Link>
          </aside>
        </section>
      </main>
    </div>
  );
}

function QuickTrackPanel({
  players,
  selectedPlayerId,
  setSelectedPlayerId,
  onQuickTrack,
}: {
  players: Player[];
  selectedPlayerId: UUID | null;
  setSelectedPlayerId: (playerId: UUID) => void;
  onQuickTrack: (statType: TripStatType) => void;
}) {
  return (
    <section className="rounded-[1.85rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,238,231,0.99))] p-[var(--space-5)] shadow-[0_18px_38px_rgba(41,29,17,0.06)]">
      <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">Quick Track</p>
      <h2 className="mt-[var(--space-2)] font-serif text-[1.8rem] italic text-[var(--ink)]">
        Catch the stat before the group forgets it.
      </h2>
      <p className="mt-[var(--space-2)] max-w-[35rem] text-sm leading-7 text-[var(--ink-secondary)]">
        Pick a player once, then tap the moments that keep piling up during the round and in the cart.
      </p>

      <div className="mt-[var(--space-4)] flex gap-[var(--space-2)] overflow-x-auto pb-[var(--space-2)]">
        {players.map((player) => (
          <button
            key={player.id}
            type="button"
            onClick={() => setSelectedPlayerId(player.id)}
            className={cn(
              'whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-transform duration-150 hover:scale-[1.01]',
              selectedPlayerId === player.id
                ? 'border-[var(--masters)]/24 bg-[color:var(--masters)]/10 text-[var(--masters)]'
                : 'border-[color:var(--rule)]/70 bg-[color:var(--surface)]/78 text-[var(--ink-secondary)]'
            )}
          >
            {player.firstName}
          </button>
        ))}
      </div>

      <div className="mt-[var(--space-4)] flex flex-wrap gap-[var(--space-3)]">
        {QUICK_ACTIONS.map((statType) => {
          const definition = STAT_DEFINITIONS[statType];
          return (
            <button
              key={statType}
              type="button"
              disabled={!selectedPlayerId}
              onClick={() => onQuickTrack(statType)}
              className="rounded-[1rem] border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/82 px-4 py-3 text-sm font-medium text-[var(--ink)] transition-transform duration-150 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {definition.emoji} {definition.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function StatPanel({
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
  const total = [...playerStats.values()].reduce((sum, value) => sum + value, 0);
  const leader = [...playerStats.entries()].sort((left, right) => right[1] - left[1])[0];
  const leaderPlayer = leader ? players.find((player) => player.id === leader[0]) : undefined;

  return (
    <section className="rounded-[1.75rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,238,231,0.99))] shadow-[0_16px_34px_rgba(41,29,17,0.05)]">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-[var(--space-4)] px-[var(--space-5)] py-[var(--space-4)] text-left"
      >
        <div className="flex items-center gap-[var(--space-3)]">
          <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[color:var(--surface)] text-[1.35rem]">
            {definition.emoji}
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--ink)]">{definition.label}</h3>
            <p className="mt-[2px] text-sm text-[var(--ink-secondary)]">{definition.description}</p>
          </div>
        </div>

        <div className="text-right">
          <p className="font-serif text-[1.85rem] italic leading-none text-[var(--ink)]">
            {formatStatValue(total, definition.unit)}
          </p>
          {leaderPlayer && leader && leader[1] > 0 ? (
            <p className="mt-[2px] text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
              Leader: {leaderPlayer.firstName}
            </p>
          ) : (
            <p className="mt-[2px] text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
              No leader yet
            </p>
          )}
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-[color:var(--rule)]/70 px-[var(--space-5)] py-[var(--space-4)]">
          <div className="space-y-[var(--space-3)]">
            {players.map((player) => {
              const value = playerStats.get(player.id) ?? 0;

              return (
                <div key={player.id} className="flex items-center justify-between gap-[var(--space-4)] rounded-[1.15rem] bg-[color:var(--surface)]/82 px-[var(--space-4)] py-[var(--space-3)]">
                  <div>
                    <p className="text-sm font-semibold text-[var(--ink)]">{player.firstName} {player.lastName}</p>
                    <p className="text-xs text-[var(--ink-tertiary)]">{definition.label}</p>
                  </div>

                  <div className="flex items-center gap-[var(--space-2)]">
                    <button
                      type="button"
                      disabled={value === 0}
                      onClick={() => onDecrement(player.id)}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--rule)]/70 bg-[color:var(--surface-raised)] text-[var(--ink)] transition-transform duration-150 hover:scale-[1.04] disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <RotateCcw size={15} />
                    </button>
                    <div className="min-w-[5rem] text-center font-serif text-[1.45rem] italic text-[var(--ink)]">
                      {formatStatValue(value, definition.unit)}
                    </div>
                    <button
                      type="button"
                      onClick={() => onIncrement(player.id)}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--masters)] text-[var(--canvas)] transition-transform duration-150 hover:scale-[1.04]"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function LeaderPanel({
  category,
  leaders,
}: {
  category: TripStatCategory;
  leaders: Array<{ playerId: UUID; playerName: string; total: number }>;
}) {
  const categoryDefinition = CATEGORY_DEFINITIONS[category];

  return (
    <section className="rounded-[1.8rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,239,232,0.99))] p-[var(--space-5)] shadow-[0_18px_38px_rgba(41,29,17,0.06)]">
      <p className="type-overline tracking-[0.15em] text-[var(--ink-tertiary)]">Category Leaders</p>
      <h2 className="mt-[var(--space-2)] font-serif text-[1.65rem] italic text-[var(--ink)]">
        {categoryDefinition.emoji} {categoryDefinition.label}
      </h2>

      {leaders.length === 0 ? (
        <p className="mt-[var(--space-3)] text-sm leading-7 text-[var(--ink-secondary)]">
          No leader yet. Track a few entries and this board will sort itself out.
        </p>
      ) : (
        <div className="mt-[var(--space-4)] space-y-[var(--space-3)]">
          {leaders.map((leader, index) => (
            <div
              key={leader.playerId}
              className="flex items-center gap-[var(--space-3)] rounded-[1.15rem] bg-[color:var(--surface)]/82 px-[var(--space-4)] py-[var(--space-3)]"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--surface-raised)] text-sm font-semibold text-[var(--ink)]">
                {index === 0 ? '1' : index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--ink)]">{leader.playerName}</p>
              </div>
              <div className="font-serif text-[1.25rem] italic text-[var(--ink)]">{leader.total}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function TripStatFactCard({
  label,
  value,
  detail,
  valueClassName,
}: {
  label: string;
  value: string | number;
  detail: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-[1.55rem] border border-[color:var(--canvas)]/16 bg-[color:var(--canvas)]/10 p-[var(--space-4)]">
      <p className="type-overline tracking-[0.14em] text-[color:var(--canvas)]/72">{label}</p>
      <p className={cn('mt-[var(--space-2)] font-serif text-[2rem] italic leading-none text-[var(--canvas)]', valueClassName)}>
        {value}
      </p>
      <p className="mt-[var(--space-2)] text-xs leading-5 text-[color:var(--canvas)]/72">{detail}</p>
    </div>
  );
}

function MiniTotalCard({
  emoji,
  label,
  value,
}: {
  emoji: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-[1.15rem] bg-[color:var(--surface)]/82 px-[var(--space-4)] py-[var(--space-3)]">
      <div className="flex items-center gap-[var(--space-3)]">
        <span className="text-[1.4rem]">{emoji}</span>
        <span className="text-sm font-semibold text-[var(--ink)]">{label}</span>
      </div>
      <span className="font-serif text-[1.25rem] italic text-[var(--ink)]">{value}</span>
    </div>
  );
}

function buildCategoryLeaders(category: TripStatCategory, tripStats: PlayerTripStat[], players: Player[]) {
  const definitions = getStatsByCategory(category);
  const totals = new Map<UUID, number>();
  const playerNames = new Map(
    players.map((player) => [player.id, `${player.firstName}${player.lastName ? ` ${player.lastName}` : ''}`])
  );

  for (const stat of tripStats) {
    if (!definitions.some((definition) => definition.type === stat.statType)) {
      continue;
    }

    const current = totals.get(stat.playerId) ?? 0;
    totals.set(stat.playerId, current + stat.value);
  }

  return [...totals.entries()]
    .map(([playerId, total]) => ({
      playerId,
      total,
      playerName: playerNames.get(playerId) || 'Unknown',
    }))
    .filter((leader) => leader.total > 0)
    .sort((left, right) => right.total - left.total)
    .slice(0, 5);
}
