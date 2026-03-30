'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { Award, BarChart3, CalendarDays, ChevronRight, Home, Trophy, type LucideIcon } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { EmptyStatePremium } from '@/components/ui';
import { db } from '@/lib/db';
import { loadTripAchievementSummary } from '@/lib/services/achievementService';
import { countActiveTripStatCategories } from '@/lib/services/tripStatsBoardService';
import { useTripStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';

interface StatsRouteCard {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  tone: 'green' | 'maroon' | 'gold';
  detail: string;
}

export default function StatsPageClient() {
  const router = useRouter();
  const { currentTrip: activeTrip, players } = useTripStore(useShallow(s => ({ currentTrip: s.currentTrip, players: s.players })));
  const [achievementSummary, setAchievementSummary] = useState({ unlockedCount: 0, totalCount: 0 });

  const tripStats = useLiveQuery(
    async () => (activeTrip ? db.tripStats.where('tripId').equals(activeTrip.id).toArray() : []),
    [activeTrip?.id],
    []
  );

  const sessions = useLiveQuery(
    async () => (activeTrip ? db.sessions.where('tripId').equals(activeTrip.id).sortBy('sessionNumber') : []),
    [activeTrip?.id],
    []
  );

  useEffect(() => {
    async function loadSummary() {
      if (!activeTrip) {
        setAchievementSummary({ unlockedCount: 0, totalCount: 0 });
        return;
      }

      const summary = await loadTripAchievementSummary(activeTrip.id);
      setAchievementSummary({
        unlockedCount: summary.unlockedCount,
        totalCount: summary.totalCount,
      });
    }

    void loadSummary();
  }, [activeTrip]);

  const routeCards = useMemo<StatsRouteCard[]>(() => {
    const activeStatCategories = countActiveTripStatCategories(tripStats);

    return [
      {
        id: 'trip-stats',
        title: 'Trip stats',
        description: 'The unofficial numbers that tell the real story of the weekend.',
        href: '/trip-stats',
        icon: BarChart3,
        tone: 'green',
        detail: `${tripStats.length} entries across ${activeStatCategories} live categories`,
      },
      {
        id: 'achievements',
        title: 'Achievements',
        description: 'Milestones, badges, and the ceremonial side of the competition.',
        href: '/achievements',
        icon: Award,
        tone: 'gold',
        detail: `${achievementSummary.unlockedCount}/${achievementSummary.totalCount} currently unlocked`,
      },
      {
        id: 'schedule',
        title: 'Schedule',
        description: 'The calendar context that gives every leaderboard its meaning.',
        href: '/schedule',
        icon: CalendarDays,
        tone: 'maroon',
        detail: `${sessions.length} sessions currently on the books`,
      },
    ];
  }, [achievementSummary.totalCount, achievementSummary.unlockedCount, sessions.length, tripStats]);

  if (!activeTrip) {
    return (
      <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
        <PageHeader
          title="Stats"
          subtitle="No active trip"
          icon={<BarChart3 size={16} className="text-[var(--canvas)]" />}
          iconContainerClassName="bg-[linear-gradient(135deg,var(--masters)_0%,var(--masters-deep)_100%)]"
          onBack={() => router.back()}
        />

        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="podium"
            title="No active trip"
            description="Start or join a trip to open the stats rooms."
            action={{
              label: 'Go home',
              onClick: () => router.push('/'),
              icon: <Home size={16} />,
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
        title="Stats"
        subtitle={activeTrip.name}
        icon={<BarChart3 size={16} className="text-[var(--canvas)]" />}
        iconContainerClassName="bg-[linear-gradient(135deg,var(--masters)_0%,var(--masters-deep)_100%)]"
        onBack={() => router.back()}
        rightSlot={
          <Button variant="outline" size="sm" leftIcon={<Trophy size={14} />} onClick={() => router.push('/standings')}>
            Standings
          </Button>
        }
      />

      <main className="container-editorial py-[var(--space-6)] pb-[var(--space-12)]">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--masters)]/14 bg-[linear-gradient(135deg,rgba(10,80,48,0.97),rgba(4,52,30,0.98))] text-[var(--canvas)] shadow-[0_28px_64px_rgba(5,58,35,0.22)]">
          <div className="grid gap-[var(--space-5)] px-[var(--space-5)] py-[var(--space-5)] lg:grid-cols-[minmax(0,1.22fr)_18rem]">
            <div>
              <p className="type-overline tracking-[0.18em] text-[color:var(--canvas)]/72">Statistics Wing</p>
              <h1 className="mt-[var(--space-2)] font-serif text-[clamp(2rem,7vw,3.2rem)] italic leading-[1.02] text-[var(--canvas)]">
                Not every important number belongs on the main scoreboard.
              </h1>
              <p className="mt-[var(--space-3)] max-w-[36rem] text-sm leading-7 text-[color:var(--canvas)]/80">
                This is the quieter side of the app: the running tallies, the awards, and the context
                around the trip that makes the competition feel richer than a single standings table.
              </p>
            </div>

            <div className="grid gap-[var(--space-3)] sm:grid-cols-3 lg:grid-cols-1">
              <StatsFactCard
                label="Players"
                value={players.length}
                detail="The field currently contributing to the numbers."
              />
              <StatsFactCard
                label="Logged stats"
                value={tripStats.length}
                detail="Trip stat entries already on the books."
              />
              <StatsFactCard
                label="Unlocked badges"
                value={`${achievementSummary.unlockedCount}/${achievementSummary.totalCount}`}
                detail="Achievements that already have a rightful owner."
                valueClassName="font-sans text-[1rem] not-italic leading-[1.25]"
              />
            </div>
          </div>
        </section>

        <section className="mt-[var(--space-6)] grid gap-[var(--space-4)] xl:grid-cols-[minmax(0,1.12fr)_18rem]">
          <div className="rounded-[1.95rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,238,231,0.99))] p-[var(--space-5)] shadow-[0_18px_38px_rgba(41,29,17,0.06)]">
            <div>
              <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">Route Cards</p>
              <h2 className="mt-[var(--space-2)] font-serif text-[1.9rem] italic text-[var(--ink)]">
                Give the numbers a proper home.
              </h2>
              <p className="mt-[var(--space-2)] max-w-[34rem] text-sm leading-7 text-[var(--ink-secondary)]">
                The stats layer works when players can tell the difference between the serious competition tables,
                the trip-story tallies, and the ceremonial awards that come afterward.
              </p>
            </div>

            <div className="mt-[var(--space-5)] grid gap-[var(--space-4)] md:grid-cols-3">
              {routeCards.map((card) => (
                <Link
                  key={card.id}
                  href={card.href}
                  className="group rounded-[1.55rem] border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/82 p-[var(--space-4)] shadow-[0_14px_32px_rgba(41,29,17,0.05)] transition-transform duration-150 hover:scale-[1.01] hover:bg-[var(--surface)]"
                >
                  <div className={`flex h-11 w-11 items-center justify-center rounded-[1rem] ${toneClass(card.tone)}`}>
                    <card.icon size={18} />
                  </div>
                  <h3 className="mt-[var(--space-3)] text-base font-semibold text-[var(--ink)]">{card.title}</h3>
                  <p className="mt-[var(--space-2)] text-sm leading-6 text-[var(--ink-secondary)]">{card.description}</p>
                  <p className="mt-[var(--space-3)] text-xs uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
                    {card.detail}
                  </p>
                  <div className="mt-[var(--space-4)] flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)] group-hover:text-[var(--masters)]">
                    Open
                    <ChevronRight size={14} />
                  </div>
                </Link>
              ))}
            </div>
          </div>

          <aside className="space-y-[var(--space-4)]">
            <SidebarNote
              title="Standings are only the top line"
              body="The best trip apps know the difference between the official result and the small data points everyone talks about over dinner."
            />
            <SidebarNote
              title="Awards need context"
              body="A badge means more when it sits near the stats that produced it, instead of floating alone as a novelty."
              tone="gold"
            />
          </aside>
        </section>
      </main>
    </div>
  );
}

function StatsFactCard({
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
      <p className={`mt-[var(--space-2)] font-serif text-[2rem] italic leading-none text-[var(--canvas)] ${valueClassName || ''}`}>
        {value}
      </p>
      <p className="mt-[var(--space-2)] text-xs leading-5 text-[color:var(--canvas)]/72">{detail}</p>
    </div>
  );
}

function SidebarNote({
  title,
  body,
  tone = 'default',
}: {
  title: string;
  body: string;
  tone?: 'default' | 'gold';
}) {
  return (
    <aside
      className={`rounded-[1.8rem] border p-[var(--space-5)] shadow-[0_18px_38px_rgba(41,29,17,0.06)] ${
        tone === 'gold'
          ? 'border-[color:var(--warning)]/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(249,244,233,0.99))]'
          : 'border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,239,232,0.99))]'
      }`}
    >
      <p className="type-overline tracking-[0.15em] text-[var(--ink-tertiary)]">Note</p>
      <h3 className="mt-[var(--space-2)] font-serif text-[1.6rem] italic text-[var(--ink)]">{title}</h3>
      <p className="mt-[var(--space-3)] text-sm leading-7 text-[var(--ink-secondary)]">{body}</p>
    </aside>
  );
}

function toneClass(tone: StatsRouteCard['tone']) {
  switch (tone) {
    case 'green':
      return 'bg-[color:var(--masters)]/12 text-[var(--masters)]';
    case 'maroon':
      return 'bg-[color:var(--maroon)]/10 text-[var(--maroon)]';
    default:
      return 'bg-[color:var(--warning)]/12 text-[var(--warning)]';
  }
}

