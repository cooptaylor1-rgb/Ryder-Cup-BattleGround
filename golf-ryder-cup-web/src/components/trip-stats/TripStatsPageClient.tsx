'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { Trophy } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { EmptyStatePremium, PageLoadingSkeleton } from '@/components/ui';
import { useTripStore } from '@/lib/stores/tripStore';
import { useShallow } from 'zustand/shallow';
import * as tripStatsService from '@/lib/services/tripStatsService';
import {
  buildTripStatCategoryLeaders,
  buildTripStatCategoryTotals,
  buildTripStatHighlights,
  buildTripStatMaps,
  TRIP_STAT_CATEGORIES,
  TRIP_STATS_QUICK_ACTIONS,
} from '@/lib/services/tripStatsBoardService';
import {
  CATEGORY_DEFINITIONS,
  getStatsByCategory,
  type PlayerTripStat,
  type TripStatCategory,
  type TripStatType,
} from '@/lib/types/tripStats';
import type { UUID } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import {
  LeaderPanel,
  MiniTotalCard,
  QuickTrackPanel,
  StatPanel,
  TripAwardsLinkCard,
  TripStatFactCard,
} from '@/components/trip-stats/TripStatsPageSections';

export default function TripStatsPageClient() {
  const router = useRouter();
  const { currentTrip, players } = useTripStore(useShallow(s => ({ currentTrip: s.currentTrip, players: s.players })));
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

  const categoryStats = useMemo(() => getStatsByCategory(activeCategory), [activeCategory]);
  const statMaps = useMemo(
    () => buildTripStatMaps(tripStatsData, categoryStats.map((definition) => definition.type)),
    [categoryStats, tripStatsData]
  );
  const categoryTotals = useMemo(() => buildTripStatCategoryTotals(tripStatsData), [tripStatsData]);
  const tripHighlights = useMemo(() => buildTripStatHighlights(tripStatsData), [tripStatsData]);
  const leaders = useMemo(
    () => buildTripStatCategoryLeaders(activeCategory, tripStatsData, players),
    [activeCategory, players, tripStatsData]
  );

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
                quickActions={TRIP_STATS_QUICK_ACTIONS}
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
                {categoryTotals.map(({ category, total, definition }) => {
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

            <TripAwardsLinkCard />

            <Link
              href="/stats"
              className="block rounded-[1.8rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,239,232,0.99))] p-[var(--space-5)] shadow-[0_18px_38px_rgba(41,29,17,0.06)] transition-transform duration-150 hover:scale-[1.01]"
            >
              <p className="type-overline tracking-[0.15em] text-[var(--ink-tertiary)]">Stats Hub</p>
              <h2 className="mt-[var(--space-2)] font-serif text-[1.6rem] italic text-[var(--ink)]">
                Move back up a level.
              </h2>
              <p className="mt-[var(--space-2)] text-sm leading-7 text-[var(--ink-secondary)]">
                The trip ledger is just one room in the wider stats wing. Jump back for awards, schedule, and broader context.
              </p>
            </Link>
          </aside>
        </section>
      </main>
    </div>
  );
}

