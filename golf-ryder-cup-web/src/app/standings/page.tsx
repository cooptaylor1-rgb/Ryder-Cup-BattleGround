'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useTripStore, useToastStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import {
  calculateTeamStandings,
  calculateMagicNumber,
  calculatePlayerLeaderboard,
} from '@/lib/services/tournamentEngine';
import { computeAwards, calculatePlayerStats } from '@/lib/services/awardsService';
import { createLogger } from '@/lib/utils/logger';
import {
  createCorrelationId,
  trackSocialAction,
  trackStandingsPublished,
  trackStandingsTabChanged,
  trackStandingsViewed,
} from '@/lib/services/analyticsService';
import { STAT_DEFINITIONS, type TripStatType } from '@/lib/types/tripStats';
import type { TeamStandings, MagicNumber, PlayerLeaderboard } from '@/lib/types/computed';
import type { Award, PlayerStats } from '@/lib/types/awards';
import { shareStandings } from '@/lib/services/shareCardService';
import {
  Trophy,
  Award as AwardIcon,
  Beer,
} from 'lucide-react';
import { EmptyStatePremium, PageLoadingSkeleton } from '@/components/ui';
import { PageHeader } from '@/components/layout';
import {
  AwardsTab,
  CompetitionTab,
  FunStatsTab,
  StandingsMasthead,
  TabButton,
  type HighlightStat,
  type StandingsTab,
} from '@/components/standings/StandingsPageSections';

/**
 * STANDINGS PAGE — The Complete Leaderboard
 *
 * Fried Egg Golf Editorial Design:
 * - Cream canvas, warm ink, generous whitespace
 * - Instrument Serif for monumental scores
 * - Plus Jakarta Sans for UI and captions
 * - Team scores dominate the viewport, monumental and unmissable
 * - Individual leaders feel prestigious, like a major leaderboard
 * - Fun stats add personality and memorable moments
 * - Awards celebrate achievements beyond just wins
 */

const logger = createLogger('standings');

export default function StandingsPage() {
  const router = useRouter();
  const { currentTrip, teams, players } = useTripStore(useShallow(s => ({ currentTrip: s.currentTrip, teams: s.teams, players: s.players })));
  const { showToast } = useToastStore(useShallow(s => ({ showToast: s.showToast })));

  const [activeTab, setActiveTab] = useState<StandingsTab>('competition');
  const [standings, setStandings] = useState<TeamStandings | null>(null);
  const [magicNumber, setMagicNumber] = useState<MagicNumber | null>(null);
  const [leaderboard, setLeaderboard] = useState<PlayerLeaderboard[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSharingStandings, setIsSharingStandings] = useState(false);

  // Get fun stats from database
  const tripStats = useLiveQuery(
    async () => {
      if (!currentTrip) return [];
      return db.tripStats.where('tripId').equals(currentTrip.id).toArray();
    },
    [currentTrip?.id],
    []
  );

  // Live invalidation signature so the aggregate calculations below
  // (team standings, leaderboard, awards, player stats) actually
  // re-run when matches finish or hole results land during live
  // scoring. Before this, the effect fired once on mount and never
  // again — standings silently stayed frozen mid-trip and the only
  // way to see fresh numbers was to manually refresh the page.
  //
  // The signature is deliberately coarse — a composite of counts +
  // the most recent updatedAt — so it bumps on anything that would
  // change the aggregates without forcing a rerun on every render.
  const tripId = currentTrip?.id;
  const aggregateSignature = useLiveQuery(
    async () => {
      if (!tripId) return '';
      const sessions = await db.sessions.where('tripId').equals(tripId).toArray();
      const sessionIds = sessions.map((s) => s.id);
      if (sessionIds.length === 0) return `0|0|0|`;
      const matches = await db.matches.where('sessionId').anyOf(sessionIds).toArray();
      const matchIds = matches.map((m) => m.id);
      const holeResults = matchIds.length
        ? await db.holeResults.where('matchId').anyOf(matchIds).toArray()
        : [];
      const completed = matches.filter((m) => m.status === 'completed').length;
      const latestUpdate = [...matches, ...holeResults]
        .map((row) => row.updatedAt ?? '')
        .reduce((max, current) => (current > max ? current : max), '');
      return `${matches.length}|${completed}|${holeResults.length}|${latestUpdate}`;
    },
    [tripId],
    '',
  );

  // If there is no active trip selected, we show a premium empty state instead of redirecting.

  // Scope the load effect to currentTrip.id, not the whole currentTrip
  // object. useShallow gives us reference-stable teams/players, but
  // currentTrip is a fresh object on every store write (score entered,
  // session locked, etc.), so keying the effect on it re-ran four
  // expensive aggregations on every tick. Pull the toast setter out of
  // the dep array via a ref so showToast's identity can't retrigger.
  const showToastRef = useRef(showToast);
  useEffect(() => {
    showToastRef.current = showToast;
  }, [showToast]);

  useEffect(() => {
    if (!tripId) return;
    let cancelled = false;
    setIsLoading(true);
    (async () => {
      try {
        const [teamStandings, playerLeaderboard, computedAwards, stats] = await Promise.all([
          calculateTeamStandings(tripId),
          calculatePlayerLeaderboard(tripId),
          computeAwards(tripId),
          calculatePlayerStats(tripId),
        ]);
        if (cancelled) return;
        const magic = calculateMagicNumber(teamStandings);
        setStandings(teamStandings);
        setMagicNumber(magic);
        setLeaderboard(playerLeaderboard);
        setAwards(computedAwards);
        setPlayerStats(stats);
      } catch (error) {
        if (cancelled) return;
        logger.error('Failed to load standings', { error });
        showToastRef.current('error', 'Failed to load standings');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tripId, aggregateSignature]);

  useEffect(() => {
    if (!tripId || isLoading) return;
    trackStandingsViewed({
      tripId,
      activeTab,
      correlationId: createCorrelationId('standings-view'),
    });
  }, [activeTab, tripId, isLoading]);

  useEffect(() => {
    if (!tripId || isLoading) return;
    trackStandingsTabChanged({
      tripId,
      tab: activeTab,
      correlationId: createCorrelationId('standings-tab'),
    });
  }, [activeTab, tripId, isLoading]);

  const tablistRef = useRef<HTMLDivElement>(null);

  const tabs: StandingsTab[] = ['competition', 'stats', 'awards'];
  const handleTabKeyDown = (e: React.KeyboardEvent) => {
    const currentIndex = tabs.indexOf(activeTab);
    let nextIndex = currentIndex;

    if (e.key === 'ArrowRight') {
      nextIndex = (currentIndex + 1) % tabs.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = tabs.length - 1;
    } else {
      return;
    }

    e.preventDefault();
    setActiveTab(tabs[nextIndex]);
    // Focus the newly active tab button
    const tabButtons = tablistRef.current?.querySelectorAll('[role="tab"]');
    (tabButtons?.[nextIndex] as HTMLElement)?.focus();
  };

  const teamA = teams.find((t) => t.color === 'usa');
  const teamB = teams.find((t) => t.color === 'europe');
  const teamAName = teamA?.name || 'USA';
  const teamBName = teamB?.name || 'Europe';

  const handleShareStandings = useCallback(async () => {
    if (!standings || !currentTrip) return;

    try {
      setIsSharingStandings(true);
      const shared = await shareStandings(standings, teamAName, teamBName, currentTrip.name);

      if (shared) {
        showToast('success', 'Standings shared');
        const correlationId = createCorrelationId('standings-publish');
        trackStandingsPublished({
          tripId: currentTrip.id,
          method: 'share',
          correlationId,
        });
        trackSocialAction({
          action: 'share',
          target_type: 'standings',
          target_id: currentTrip.id,
        });
      } else {
        showToast('info', 'Standings downloaded');
        trackStandingsPublished({
          tripId: currentTrip.id,
          method: 'download',
          correlationId: createCorrelationId('standings-publish'),
        });
      }
    } catch (error) {
      logger.error('Failed to share standings', { error });
      showToast('error', 'Failed to share standings');
    } finally {
      setIsSharingStandings(false);
    }
  }, [standings, currentTrip, teamAName, teamBName, showToast]);

  if (!currentTrip) {
    return (
      <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
        <PageHeader
          title="Standings"
          subtitle="No active trip"
          icon={<Trophy size={16} className="text-[var(--color-accent)]" />}
          backFallback="/"
        />

        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="trophy"
            title="No active trip"
            description="Start or select a trip to view standings."
            action={{ label: 'Back to Home', onClick: () => router.push('/') }}
            variant="large"
          />
        </main>
      </div>
    );
  }

  // Practice-round trips don't have cup-style standings. Point users at the
  // schedule where pairings and individual scoring live.
  if (currentTrip.isPracticeRound) {
    return (
      <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
        <PageHeader
          title="Standings"
          subtitle={currentTrip.name}
          icon={<Trophy size={16} className="text-[var(--color-accent)]" />}
          backFallback="/"
        />

        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="trophy"
            title="No cup score on practice rounds"
            description="This trip is set as a practice round, so there's no team-vs-team leaderboard. Open the schedule to see pairings and scores."
            action={{ label: 'Open schedule', onClick: () => router.push('/schedule?view=all') }}
            variant="large"
          />
        </main>
      </div>
    );
  }

  // Show loading skeleton while data loads
  if (isLoading) {
    return <PageLoadingSkeleton title="Standings" showBackButton={false} variant="default" />;
  }




  // Trip summary text removed (unused) — avoids conditional hook calls after early returns.


  // Aggregate fun stats by type
  const statTotals = new Map<
    TripStatType,
    { total: number; leader: string; leaderValue: number }
  >();
  if (tripStats && tripStats.length > 0) {
    const playerTotals = new Map<TripStatType, Map<string, number>>();

    for (const stat of tripStats) {
      if (!playerTotals.has(stat.statType as TripStatType)) {
        playerTotals.set(stat.statType as TripStatType, new Map());
      }
      const typeMap = playerTotals.get(stat.statType as TripStatType)!;
      typeMap.set(stat.playerId, (typeMap.get(stat.playerId) || 0) + stat.value);
    }

    for (const [statType, playerMap] of playerTotals) {
      const total = [...playerMap.values()].reduce((a, b) => a + b, 0);
      let leader = '';
      let leaderValue = 0;
      for (const [playerId, value] of playerMap) {
        if (value > leaderValue) {
          leaderValue = value;
          const player = players.find((p) => p.id === playerId);
          leader = player ? player.firstName : 'Unknown';
        }
      }
      statTotals.set(statType, { total, leader, leaderValue });
    }
  }

  // Get highlight stats for the quick overview
  const highlightStats: HighlightStat[] = [];
  const funStatTypes: TripStatType[] = [
    'beers',
    'birdies',
    'balls_lost',
    'mulligans',
    'chip_ins',
    'longest_drive',
  ];
  for (const type of funStatTypes) {
    const data = statTotals.get(type);
    if (data && data.total > 0) {
      const def = STAT_DEFINITIONS[type];
      highlightStats.push({
        type,
        label: def.label,
        emoji: def.emoji,
        value: data.total,
        leader: data.leader,
      });
    }
  }

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Standings"
        subtitle={currentTrip.name}
        icon={<Trophy size={16} className="text-[var(--color-accent)]" />}
        onBack={() => router.back()}
      />

      <section className="container-editorial pt-[var(--space-6)]">
        <StandingsMasthead
          standings={standings}
          magicNumber={magicNumber}
          teamAName={teamAName}
          teamBName={teamBName}
          currentTripName={currentTrip.name}
          matchesCompleted={standings?.matchesCompleted ?? 0}
          totalMatches={standings?.totalMatches ?? 0}
        />
      </section>

      {/* Tab Navigation */}
      <div className="sticky top-0 z-10 bg-[color:var(--canvas)]/92 backdrop-blur-md border-b border-[var(--rule)]">
        <div className="container-editorial">
          <div
            className="flex gap-2 py-[var(--space-3)]"
            role="tablist"
            aria-label="Standings views"
            ref={tablistRef}
            onKeyDown={handleTabKeyDown}
          >
            <TabButton
              id="tab-competition"
              active={activeTab === 'competition'}
              onClick={() => setActiveTab('competition')}
              icon={<Trophy size={16} />}
              label="Competition"
              controls="tabpanel-competition"
            />
            <TabButton
              id="tab-stats"
              active={activeTab === 'stats'}
              onClick={() => setActiveTab('stats')}
              icon={<Beer size={16} />}
              label="Fun Stats"
              controls="tabpanel-stats"
            />
            <TabButton
              id="tab-awards"
              active={activeTab === 'awards'}
              onClick={() => setActiveTab('awards')}
              icon={<AwardIcon size={16} />}
              label="Awards"
              controls="tabpanel-awards"
            />
          </div>
        </div>
      </div>

      <main className="container-editorial">
        <div
          id="tabpanel-competition"
          role="tabpanel"
          aria-labelledby="tab-competition"
          tabIndex={0}
          hidden={activeTab !== 'competition'}
        >
          {activeTab === 'competition' && (
            <CompetitionTab
              standings={standings}
              magicNumber={magicNumber}
              leaderboard={leaderboard}
              teamAName={teamAName}
              teamBName={teamBName}
              teamAId={teamA?.id}
              pointsToWin={currentTrip.settings?.pointsToWin ?? 14.5}
              onShareStandings={handleShareStandings}
              isSharingStandings={isSharingStandings}
            />
          )}
        </div>
        <div
          id="tabpanel-stats"
          role="tabpanel"
          aria-labelledby="tab-stats"
          tabIndex={0}
          hidden={activeTab !== 'stats'}
        >
          {activeTab === 'stats' && (
            <FunStatsTab
              statTotals={statTotals}
              highlightStats={highlightStats}
              onGoToMatchups={() => router.push('/matchups')}
              onGoToTripStats={() => router.push('/trip-stats')}
            />
          )}
        </div>
        <div
          id="tabpanel-awards"
          role="tabpanel"
          aria-labelledby="tab-awards"
          tabIndex={0}
          hidden={activeTab !== 'awards'}
        >
          {activeTab === 'awards' && (
            <AwardsTab awards={awards} playerStats={playerStats} />
          )}
        </div>
      </main>

    </div>
  );
}
