'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useTripStore, useUIStore } from '@/lib/stores';
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
import { PathToVictoryCard } from '@/components/gamification/PathToVictoryCard';
import { shareStandings } from '@/lib/services/shareCardService';
import {
  Trophy,
  Crown,
  Flame,
  Zap,
  Award as AwardIcon,
  Beer,
  TrendingUp,
  Star,
  Medal,
  Share2,
  PartyPopper,
} from 'lucide-react';
import { EmptyStatePremium, NoStandingsPremiumEmpty, PageLoadingSkeleton } from '@/components/ui';
import { PageHeader } from '@/components/layout';

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

type TabType = 'competition' | 'stats' | 'awards';

const logger = createLogger('standings');

export default function StandingsPage() {
  const router = useRouter();
  const { currentTrip, teams, players } = useTripStore();
  const { showToast } = useUIStore();

  const [activeTab, setActiveTab] = useState<TabType>('competition');
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

  // If there is no active trip selected, we show a premium empty state instead of redirecting.

  useEffect(() => {
    const loadStandings = async () => {
      if (!currentTrip) return;
      setIsLoading(true);
      try {
        const [teamStandings, playerLeaderboard, computedAwards, stats] = await Promise.all([
          calculateTeamStandings(currentTrip.id),
          calculatePlayerLeaderboard(currentTrip.id),
          computeAwards(currentTrip.id),
          calculatePlayerStats(currentTrip.id),
        ]);
        const magic = calculateMagicNumber(teamStandings);
        setStandings(teamStandings);
        setMagicNumber(magic);
        setLeaderboard(playerLeaderboard);
        setAwards(computedAwards);
        setPlayerStats(stats);
      } catch (error) {
        logger.error('Failed to load standings', { error });
        showToast('error', 'Failed to load standings');
      } finally {
        setIsLoading(false);
      }
    };
    loadStandings();
  }, [currentTrip, showToast]);

  useEffect(() => {
    if (!currentTrip || isLoading) return;
    trackStandingsViewed({
      tripId: currentTrip.id,
      activeTab,
      correlationId: createCorrelationId('standings-view'),
    });
  }, [activeTab, currentTrip, isLoading]);

  useEffect(() => {
    if (!currentTrip || isLoading) return;
    trackStandingsTabChanged({
      tripId: currentTrip.id,
      tab: activeTab,
      correlationId: createCorrelationId('standings-tab'),
    });
  }, [activeTab, currentTrip, isLoading]);

  const tablistRef = useRef<HTMLDivElement>(null);

  const tabs: TabType[] = ['competition', 'stats', 'awards'];
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
          onBack={() => router.back()}
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
  const highlightStats: {
    type: TripStatType;
    label: string;
    emoji: string;
    value: number;
    leader: string;
  }[] = [];
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
              teamA={teamA}
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
            <FunStatsTab statTotals={statTotals} highlightStats={highlightStats} />
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

function StandingsMasthead({
  standings,
  magicNumber,
  teamAName,
  teamBName,
  currentTripName,
  matchesCompleted,
  totalMatches,
}: {
  standings: TeamStandings | null;
  magicNumber: MagicNumber | null;
  teamAName: string;
  teamBName: string;
  currentTripName: string;
  matchesCompleted: number;
  totalMatches: number;
}) {
  const summary = !standings
    ? 'The board will take shape once matches are underway.'
    : standings.leader === 'teamA'
      ? `${teamAName} holds the edge.`
      : standings.leader === 'teamB'
        ? `${teamBName} has the upper hand.`
        : 'Everything is level.';

  const progress =
    totalMatches > 0 ? `${matchesCompleted} of ${totalMatches} matches complete` : 'Awaiting scores';

  return (
    <div className="overflow-hidden rounded-[2rem] border border-[var(--rule)] bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(248,244,237,0.94))] shadow-[0_22px_48px_rgba(46,34,18,0.08)]">
      <div className="border-b border-[color:var(--rule)]/80 px-[var(--space-5)] py-[var(--space-5)]">
        <p className="type-overline tracking-[0.18em] text-[var(--ink-tertiary)]">Leaderboard</p>
        <h1 className="mt-[var(--space-2)] font-serif text-[clamp(2rem,8vw,3.3rem)] italic leading-[1.02] text-[var(--ink)]">
          {currentTripName}
        </h1>
        <p className="mt-[var(--space-3)] type-body-sm text-[var(--ink-secondary)]">{summary}</p>
      </div>

      <div className="grid grid-cols-2 gap-[var(--space-3)] px-[var(--space-5)] py-[var(--space-5)] md:grid-cols-4">
        <StandingsFactCard label={teamAName} value={standings?.teamAPoints ?? '—'} />
        <StandingsFactCard label={teamBName} value={standings?.teamBPoints ?? '—'} />
        <StandingsFactCard
          label="Progress"
          value={progress}
          valueClassName="font-sans text-[0.95rem] not-italic"
        />
        <StandingsFactCard
          label="To Win"
          value={magicNumber?.pointsToWin ?? '—'}
        />
      </div>
    </div>
  );
}

function StandingsSectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow: React.ReactNode;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-[var(--space-4)]">
      <div className="min-w-0">
        <p className="type-overline text-[var(--ink-tertiary)]">{eyebrow}</p>
        <h2 className="mt-[var(--space-2)] font-serif text-[clamp(1.45rem,5vw,2rem)] italic leading-[1.08] text-[var(--ink)]">
          {title}
        </h2>
      </div>
      {action && <div className="shrink-0 pt-[2px]">{action}</div>}
    </div>
  );
}

function StandingsScoreBlock({
  teamName,
  score,
  color,
  isLeading,
  animate,
}: {
  teamName: string;
  score: number;
  color: 'usa' | 'europe';
  isLeading: boolean;
  animate: boolean;
}) {
  const teamColor = color === 'usa' ? 'var(--team-usa)' : 'var(--team-europe)';
  const gradient =
    color === 'usa'
      ? 'linear-gradient(180deg,rgba(27,59,119,0.08),rgba(255,255,255,0.62))'
      : 'linear-gradient(180deg,rgba(160,42,63,0.08),rgba(255,255,255,0.62))';

  return (
    <div
      className="rounded-[1.5rem] border px-[var(--space-4)] py-[var(--space-5)] text-center"
      style={{
        borderColor: `color-mix(in srgb, ${teamColor} 16%, white)`,
        background: gradient,
      }}
    >
      <span
        className={`team-dot team-dot-xl team-dot-${color} inline-block mb-[var(--space-4)] ${animate ? 'team-dot-pulse' : ''}`}
      />
      <p
        className="score-monumental"
        style={{ color: isLeading ? teamColor : 'var(--ink-tertiary)' }}
      >
        {score}
      </p>
      <p className="type-overline mt-[var(--space-3)]" style={{ color: teamColor }}>
        {teamName}
      </p>
    </div>
  );
}

function StandingsFactCard({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: React.ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-[1.1rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.68)] px-[var(--space-4)] py-[var(--space-3)]">
      <p className="type-micro uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">{label}</p>
      <p
        className={`mt-[2px] font-serif text-[1.25rem] italic leading-[1.2] text-[var(--ink)] ${valueClassName ?? ''}`}
      >
        {value}
      </p>
    </div>
  );
}

/* ============================================
   Tab Button Component
   ============================================ */
function TabButton({
  id,
  active,
  onClick,
  icon,
  label,
  controls,
}: {
  id: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  controls: string;
}) {
  return (
    <button
      id={id}
      onClick={onClick}
      className={`press-scale flex flex-1 items-center justify-center gap-[var(--space-2)] py-[var(--space-3)] px-[var(--space-4)] rounded-[1rem] font-[family-name:var(--font-sans)] text-sm cursor-pointer transition-all duration-200 ${
        active
          ? 'border border-[color:var(--masters-deep)] bg-[linear-gradient(135deg,var(--masters)_0%,var(--masters-deep)_100%)] text-[var(--canvas)] font-semibold shadow-[0_10px_24px_rgba(22,101,52,0.24)]'
          : 'border border-[var(--rule)] bg-[rgba(255,255,255,0.58)] text-[var(--ink-secondary)] font-medium'
      }`}
      aria-selected={active}
      aria-controls={controls}
      role="tab"
      tabIndex={active ? 0 : -1}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

/* ============================================
   Competition Tab
   ============================================ */
function CompetitionTab({
  standings,
  magicNumber,
  leaderboard,
  teamAName,
  teamBName,
  teamA,
  pointsToWin,
  onShareStandings,
  isSharingStandings,
}: {
  standings: TeamStandings | null;
  magicNumber: MagicNumber | null;
  leaderboard: PlayerLeaderboard[];
  teamAName: string;
  teamBName: string;
  teamA: { id: string } | undefined;
  pointsToWin: number;
  onShareStandings: () => Promise<void>;
  isSharingStandings: boolean;
}) {
  if (!standings || !magicNumber) {
    return <EmptyState />;
  }

  return (
    <>
      <section className="section pt-[var(--space-7)]">
        <div className="rounded-[1.75rem] border border-[var(--rule)] bg-[linear-gradient(180deg,rgba(255,255,255,0.82),rgba(248,244,237,0.92))] p-[var(--space-5)] shadow-[0_20px_40px_rgba(46,34,18,0.08)]">
          <StandingsSectionHeading
            eyebrow="Competition"
            title="The board, in full."
            action={
              <button
                type="button"
                onClick={() => void onShareStandings()}
                disabled={isSharingStandings}
                className="inline-flex items-center gap-[var(--space-2)] rounded-xl border border-[var(--rule)] bg-[var(--canvas)] px-[var(--space-4)] py-[var(--space-2)] text-[length:var(--text-sm)] font-medium transition-colors hover:bg-[var(--surface-hover)] disabled:opacity-60"
                aria-label="Share standings card"
              >
                <Share2 size={16} />
                {isSharingStandings ? 'Sharing…' : 'Share Card'}
              </button>
            }
          />

          <div className="mt-[var(--space-5)] grid grid-cols-[1fr_auto_1fr] items-end gap-[var(--space-4)]">
            <StandingsScoreBlock
              teamName={teamAName}
              score={standings.teamAPoints}
              color="usa"
              isLeading={standings.teamAPoints >= standings.teamBPoints}
              animate={standings.leader !== null}
            />

            <div className="pb-[var(--space-5)] text-center">
              <p className="type-overline text-[var(--ink-faint)]">To Win</p>
              <p className="mt-[var(--space-2)] font-serif text-[1.8rem] italic text-[var(--ink-faint)]">
                {magicNumber.pointsToWin}
              </p>
            </div>

            <StandingsScoreBlock
              teamName={teamBName}
              score={standings.teamBPoints}
              color="europe"
              isLeading={standings.teamBPoints > standings.teamAPoints}
              animate={standings.leader !== null}
            />
          </div>

          <div className="mt-[var(--space-5)] grid grid-cols-2 gap-[var(--space-3)] md:grid-cols-4">
            <StandingsFactCard
              label="Matches Complete"
              value={`${standings.matchesCompleted}/${standings.totalMatches}`}
            />
            <StandingsFactCard label="Remaining" value={standings.remainingMatches} />
            <StandingsFactCard
              label="Leader"
              value={
                magicNumber.hasClinched
                  ? magicNumber.clinchingTeam === 'A'
                    ? teamAName
                    : teamBName
                  : standings.leader === 'teamA'
                    ? teamAName
                    : standings.leader === 'teamB'
                      ? teamBName
                      : 'All Square'
              }
            />
            <StandingsFactCard
              label="Magic Number"
              value={
                magicNumber.hasClinched
                  ? '0'
                  : standings.leader === 'teamA'
                    ? magicNumber.teamANeeded
                    : standings.leader === 'teamB'
                      ? magicNumber.teamBNeeded
                      : Math.min(magicNumber.teamANeeded, magicNumber.teamBNeeded)
              }
            />
          </div>

          <div className="mt-[var(--space-5)] rounded-[1.25rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.7)] px-[var(--space-4)] py-[var(--space-4)]">
            {magicNumber.hasClinched ? (
              <div
                className={`victory-banner inline-flex ${magicNumber.clinchingTeam === 'A' ? 'victory-usa' : 'victory-europe'}`}
              >
                <div className="victory-icon">
                  <Trophy size={18} strokeWidth={1.75} />
                </div>
                <p className="font-semibold text-base">
                  {magicNumber.clinchingTeam === 'A' ? teamAName : teamBName} Wins
                </p>
              </div>
            ) : (
              <p className="font-serif text-[1.35rem] italic text-[var(--ink)]">
                {standings.leader === null
                  ? 'The match is all square.'
                  : `${standings.leader === 'teamA' ? teamAName : teamBName} controls the board.`}
              </p>
            )}

            {!magicNumber.hasClinched && (
              <p className="mt-[var(--space-2)] type-body-sm text-[var(--ink-secondary)]">
                {standings.leader === 'teamA'
                  ? `${teamAName} needs ${magicNumber.teamANeeded} more point${magicNumber.teamANeeded === 1 ? '' : 's'} to close the door.`
                  : standings.leader === 'teamB'
                    ? `${teamBName} needs ${magicNumber.teamBNeeded} more point${magicNumber.teamBNeeded === 1 ? '' : 's'} to close the door.`
                    : 'Every remaining match still matters.'}
              </p>
            )}
          </div>

          {standings.remainingMatches === 0 && standings.matchesCompleted > 0 && (
            <div className="mt-[var(--space-5)]">
              <Link
                href="/recap"
                className="flex items-center justify-center gap-[var(--space-2)] w-full py-[var(--space-3)] px-[var(--space-5)] rounded-xl font-semibold text-[length:var(--text-sm)] bg-[var(--masters)] text-[var(--canvas)] press-scale"
              >
                <PartyPopper size={18} />
                View Trip Recap & Share
                <Share2 size={16} />
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Path to Victory */}
      {standings.remainingMatches > 0 && !magicNumber.hasClinched && (
        <section className="section-sm pb-0">
          <PathToVictoryCard
            standings={standings}
            pointsToWin={pointsToWin}
            teamAName={teamAName}
            teamBName={teamBName}
          />
        </section>
      )}

      <hr className="divider-lg" />

      {/* LEADERBOARD — Individual Leaders */}
      <section className="section-sm rounded-[1.5rem] border border-[var(--rule)] bg-[var(--canvas-raised)] p-[var(--space-5)] shadow-[0_12px_30px_rgba(46,34,18,0.05)]">
        <StandingsSectionHeading
          eyebrow="Individual Leaders"
          title="Who is carrying the points."
        />

        {leaderboard.length > 0 ? (
          <div className="stagger-fast mt-[var(--space-5)]">
            {leaderboard.map((entry, index) => (
              <PlayerRow
                key={entry.playerId}
                entry={entry}
                rank={index + 1}
                isTeamA={entry.teamId === teamA?.id}
                teamALabel={teamAName?.slice(0, 3).toUpperCase()}
                teamBLabel={teamBName?.slice(0, 3).toUpperCase()}
                animationDelay={index * 50}
              />
            ))}
          </div>
        ) : (
          <p className="type-caption text-center py-[var(--space-10)] px-0">
            Complete matches to see individual standings
          </p>
        )}
      </section>
    </>
  );
}

/* ============================================
   Fun Stats Tab
   ============================================ */
function FunStatsTab({
  statTotals,
  highlightStats,
}: {
  statTotals: Map<TripStatType, { total: number; leader: string; leaderValue: number }>;
  highlightStats: {
    type: TripStatType;
    label: string;
    emoji: string;
    value: number;
    leader: string;
  }[];
}) {
  const router = useRouter();
  const categories = [
    {
      key: 'golf_highlights',
      label: 'Highlights',
      emoji: '⭐',
      types: ['birdies', 'eagles', 'chip_ins', 'longest_putt', 'longest_drive', 'closest_to_pin'],
    },
    {
      key: 'golf_mishaps',
      label: 'Mishaps',
      emoji: '😅',
      types: [
        'balls_lost',
        'sand_traps',
        'water_hazards',
        'mulligans',
        'club_throws',
        'whiffs',
        'shanks',
        'four_putts',
      ],
    },
    {
      key: 'beverages',
      label: 'Beverages',
      emoji: '🍺',
      types: ['beers', 'cocktails', 'shots', 'waters', 'cigars', 'snacks'],
    },
    {
      key: 'cart_chaos',
      label: 'Cart Chaos',
      emoji: '🛒',
      types: ['cart_path_violations', 'near_misses', 'stuck_in_mud', 'wrong_fairway'],
    },
    {
      key: 'social',
      label: 'Social',
      emoji: '😂',
      types: ['late_to_tee', 'phone_checks', 'naps_taken', 'excuses_made', 'rules_argued'],
    },
  ];

  const hasAnyStats = statTotals.size > 0;
  const hasDisplayableStats = Array.from(statTotals.values()).some((v) => v.total > 0);

  const displayCategories = categories
    .map((category) => {
      const stats = category.types.reduce(
        (
          acc,
          statType
        ): Array<{
          statType: string;
          label: string;
          description: string;
          emoji: string;
          isNegative?: boolean;
          total: number;
          leader: string;
          leaderValue: number;
        }> => {
          const data = statTotals.get(statType as TripStatType);
          if (!data || data.total === 0) return acc;
          const def = STAT_DEFINITIONS[statType as TripStatType];
          acc.push({ statType, ...def, ...data });
          return acc;
        },
        []
      );

      return { category, stats };
    })
    .filter((entry) => entry.stats.length > 0);

  return (
    <section className="section-sm rounded-[1.5rem] border border-[var(--rule)] bg-[var(--canvas-raised)] p-[var(--space-5)] shadow-[0_12px_30px_rgba(46,34,18,0.05)]">
      <StandingsSectionHeading
        eyebrow="Fun Stats"
        title="The side stories worth remembering."
      />
      {!hasAnyStats || (!hasDisplayableStats && highlightStats.length === 0) ? (
        <div className="mt-[var(--space-5)]">
          <EmptyStatePremium
            illustration="podium"
            title="No trip stats yet"
            description="As soon as scores and side stats are entered, you'll see leaders and highlights here."
            action={{
              label: 'Go score a match',
              onClick: () => {
                router.push('/matchups');
              },
              icon: <TrendingUp size={18} strokeWidth={2} />,
            }}
            variant="compact"
          />
        </div>
      ) : null}

      {/* Quick Highlights */}
      {highlightStats.length > 0 && (
        <>
          <div className="mt-[var(--space-5)] mb-[var(--space-6)]">
            <p className="type-overline mb-[var(--space-3)]">Trip Highlights</p>
            <div className="grid grid-cols-2 gap-[var(--space-3)] sm:grid-cols-3">
            {highlightStats.slice(0, 6).map((stat) => (
              <div
                key={stat.type}
                className="rounded-[1.25rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.72)] p-[var(--space-4)] text-center"
              >
                <span className="text-2xl">{stat.emoji}</span>
                <p className="type-title-lg mt-[var(--space-1)]">
                  {stat.value}
                </p>
                <p className="type-micro text-[var(--ink-tertiary)]">
                  {stat.label}
                </p>
                {stat.leader && (
                  <p className="type-micro text-[var(--masters)] mt-[var(--space-1)]">
                    👑 {stat.leader}
                  </p>
                )}
              </div>
            ))}
            </div>
          </div>
          <hr className="divider-lg" />
        </>
      )}

      {/* Stats by Category */}
      {hasDisplayableStats && displayCategories.length > 0 ? (
        displayCategories.map(({ category, stats }) => (
          <div key={category.key} className="mb-[var(--space-8)]">
            <h3 className="type-overline mb-[var(--space-4)] flex items-center gap-[var(--space-2)]">
              <span>{category.emoji}</span>
              <span>{category.label}</span>
            </h3>
            <div className="space-y-3">
              {stats.map((stat) => (
                <div
                  key={stat.statType}
                  className="rounded-[1.25rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.72)] py-[var(--space-3)] px-[var(--space-4)] flex items-center justify-between"
                >
                  <div className="flex items-center gap-[var(--space-3)]">
                    <span className="text-xl">{stat.emoji}</span>
                    <div>
                      <p className="type-body-sm">{stat.label}</p>
                      <p className="type-micro text-[var(--ink-tertiary)]">
                        {stat.description}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`type-title ${stat.isNegative ? 'text-[var(--error)]' : 'text-[var(--masters)]'}`}
                    >
                      {stat.total}
                    </p>
                    {stat.leader && (
                      <p className="type-micro text-[var(--ink-tertiary)]">
                        👑 {stat.leader}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))
      ) : (
        <div className="mb-[var(--space-8)]">
          <EmptyStatePremium
            illustration="trophy"
            title="No stats yet"
            description="Track beverages, mishaps, highlights, and more during your rounds."
            action={{
              label: 'Start Tracking',
              onClick: () => {
                router.push('/trip-stats');
              },
              icon: <Star size={18} strokeWidth={2} />,
            }}
            variant="compact"
          />
        </div>
      )}

      {/* Link to full stats page */}
      {hasDisplayableStats && (
        <Link
          href="/trip-stats"
          className="press-scale flex items-center justify-between rounded-[1.25rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.72)] p-[var(--space-4)] mt-[var(--space-4)] no-underline text-inherit"
        >
          <div className="flex items-center gap-[var(--space-3)]">
            <Star size={20} className="text-[var(--masters)]" />
            <span className="type-body-sm">View All Stats & Track More</span>
          </div>
          <span className="text-[var(--ink-tertiary)]">→</span>
        </Link>
      )}
    </section>
  );
}

/* ============================================
   Awards Tab
   ============================================ */
function AwardsTab({ awards, playerStats }: { awards: Award[]; playerStats: PlayerStats[] }) {
  const getAwardIcon = (type: string) => {
    switch (type) {
      case 'mvp':
        return <Crown size={24} className="text-[var(--color-accent)]" />;
      case 'best-record':
        return <TrendingUp size={24} className="text-[var(--masters)]" />;
      case 'most-wins':
        return <Trophy size={24} className="text-[var(--masters)]" />;
      case 'most-halves':
        return <Medal size={24} className="text-[var(--ink-secondary)]" />;
      case 'biggest-win':
        return <Flame size={24} className="text-[var(--error)]" />;
      case 'iron-man':
        return <Zap size={24} className="text-[var(--team-usa)]" />;
      case 'streak-master':
        return <TrendingUp size={24} className="text-[var(--team-europe)]" />;
      default:
        return <AwardIcon size={24} className="text-[var(--masters)]" />;
    }
  };

  const hasAwards = awards.some((a) => a.winner);

  return (
    <section className="section-sm rounded-[1.5rem] border border-[var(--rule)] bg-[var(--canvas-raised)] p-[var(--space-5)] shadow-[0_12px_30px_rgba(46,34,18,0.05)]">
      <StandingsSectionHeading
        eyebrow="Trip Superlatives"
        title="The honors board."
      />

      <div className="rounded-[1.25rem] border border-[var(--rule)] bg-[linear-gradient(180deg,rgba(255,255,255,0.78),rgba(248,244,237,0.88))] p-[var(--space-4)] mt-[var(--space-5)] mb-[var(--space-5)] flex flex-col gap-[var(--space-3)]">
        <div className="flex items-center gap-[var(--space-3)]">
          <Crown size={24} className="text-[var(--color-accent)]" />
          <div>
            <p className="type-title-sm">End-of-Trip Highlights</p>
            <p className="type-caption text-[var(--ink-tertiary)]">
              Vote for MVP and crown the trip superlatives.
            </p>
          </div>
        </div>
        <Link
          href="/trip-stats/awards"
          className="btn-premium py-[var(--space-3)] px-[var(--space-4)] text-center"
        >
          Vote for MVP & Awards
        </Link>
      </div>

      {hasAwards ? (
        <div className="space-y-4">
          {awards.map((award) => (
            <div
              key={award.type}
              className={`rounded-[1.25rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.72)] p-[var(--space-4)] ${award.winner ? '' : 'opacity-50'}`}
            >
              <div className="flex items-start gap-[var(--space-4)]">
                <div
                  className={`w-12 h-12 rounded-[var(--radius-lg)] flex items-center justify-center shrink-0 ${
                    award.winner
                      ? 'bg-gradient-to-br from-[var(--masters)] to-[var(--masters-deep)]'
                      : 'bg-[var(--surface-elevated)]'
                  }`}
                >
                  {getAwardIcon(award.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="type-title-sm">{award.title}</h3>
                  <p className="type-micro text-[var(--ink-tertiary)] mt-0.5">
                    {award.description}
                  </p>
                  {award.winner ? (
                    <div className="mt-[var(--space-3)]">
                      <div className="flex items-center gap-[var(--space-2)]">
                        <span
                          className={`team-dot team-dot-${award.winner.teamColor} w-2 h-2`}
                        />
                        <span className="type-body-sm font-semibold">
                          {award.winner.playerName}
                        </span>
                        <span className="type-caption text-[var(--masters)] ml-auto">
                          {award.winner.value}
                        </span>
                      </div>
                      {award.runnerUp && (
                        <div className="flex items-center gap-[var(--space-2)] mt-[var(--space-2)] opacity-70">
                          <span
                            className={`team-dot team-dot-${award.runnerUp.teamColor} w-1.5 h-1.5`}
                          />
                          <span className="type-micro">{award.runnerUp.playerName}</span>
                          <span className="type-micro ml-auto">
                            {award.runnerUp.value}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="type-micro text-[var(--ink-tertiary)] mt-[var(--space-2)]">
                      Not yet awarded
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-[var(--space-12)] px-[var(--space-4)]">
          <div className="text-5xl mb-[var(--space-4)]">🏆</div>
          <h3 className="type-title mb-[var(--space-2)]">
            Awards Coming Soon
          </h3>
          <p className="type-body text-[var(--ink-tertiary)]">
            Complete some matches to unlock trip superlatives and see who earns the bragging rights!
          </p>
        </div>
      )}

      {/* Additional Records Section */}
      {playerStats.length > 0 && (
        <>
          <hr className="divider-lg my-[var(--space-8)]" />
          <h2 className="type-overline mb-[var(--space-6)]">
            Player Records
          </h2>
          <div className="grid grid-cols-2 gap-[var(--space-3)]">
            <RecordCard
              label="Most Points"
              emoji="🏆"
              stats={playerStats}
              getValue={(s) => s.points}
              formatValue={(v) => `${v} pts`}
            />
            <RecordCard
              label="Best Win %"
              emoji="📈"
              stats={playerStats.filter((s) => s.matchesPlayed >= 2)}
              getValue={(s) => s.winPercentage}
              formatValue={(v) => `${v.toFixed(0)}%`}
            />
            <RecordCard
              label="Most Holes Won"
              emoji="⛳"
              stats={playerStats}
              getValue={(s) => s.holesWon}
              formatValue={(v) => `${v}`}
            />
            <RecordCard
              label="Win Streak"
              emoji="🔥"
              stats={playerStats}
              getValue={(s) => s.longestWinStreak}
              formatValue={(v) => `${v} wins`}
            />
          </div>
        </>
      )}

      {/* Link to achievements */}
      <Link
        href="/achievements"
        className="press-scale flex items-center justify-between rounded-[1.25rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.72)] p-[var(--space-4)] mt-[var(--space-6)] no-underline text-inherit"
      >
        <div className="flex items-center gap-[var(--space-3)]">
          <Medal size={20} className="text-[var(--color-accent)]" />
          <span className="type-body-sm">View All Achievements & Badges</span>
        </div>
        <span className="text-[var(--ink-tertiary)]">→</span>
      </Link>
    </section>
  );
}

/* ============================================
   Record Card Component
   ============================================ */
function RecordCard({
  label,
  emoji,
  stats,
  getValue,
  formatValue,
}: {
  label: string;
  emoji: string;
  stats: PlayerStats[];
  getValue: (s: PlayerStats) => number;
  formatValue: (v: number) => string;
}) {
  const sorted = [...stats].sort((a, b) => getValue(b) - getValue(a));
  const leader = sorted[0];

  if (!leader || getValue(leader) === 0) {
    return (
      <div className="rounded-[1.1rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.68)] p-[var(--space-3)] text-center opacity-50">
        <span className="text-xl">{emoji}</span>
        <p className="type-micro mt-[var(--space-1)] text-[var(--ink-tertiary)]">
          {label}
        </p>
        <p className="type-micro">-</p>
      </div>
    );
  }

  return (
    <div className="rounded-[1.1rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.68)] p-[var(--space-3)] text-center">
      <span className="text-xl">{emoji}</span>
      <p className="type-micro mt-[var(--space-1)] text-[var(--ink-tertiary)]">
        {label}
      </p>
      <p className="type-title-sm text-[var(--masters)]">
        {formatValue(getValue(leader))}
      </p>
      <div className="flex items-center justify-center gap-[var(--space-1)] mt-[var(--space-1)]">
        <span
          className={`team-dot team-dot-${leader.teamColor} w-1.5 h-1.5`}
        />
        <p className="type-micro">{leader.playerName.split(' ')[0]}</p>
      </div>
    </div>
  );
}

/* ============================================
   Player Row — Leaderboard Entry
   ============================================ */
interface PlayerRowProps {
  entry: PlayerLeaderboard;
  rank: number;
  isTeamA: boolean;
  teamALabel?: string;
  teamBLabel?: string;
  animationDelay?: number;
}

function PlayerRow({ entry, rank, isTeamA, teamALabel, teamBLabel, animationDelay = 0 }: PlayerRowProps) {
  const isTopThree = rank <= 3;
  const accent = isTeamA ? 'var(--team-usa)' : 'var(--team-europe)';

  return (
    <div
      className="player-row stagger-item flex items-center gap-[var(--space-4)] rounded-[1.1rem] border px-[var(--space-4)] py-[var(--space-3)]"
      style={{
        animationDelay: `${animationDelay}ms`,
        borderColor: `color-mix(in srgb, ${accent} 14%, white)`,
        background: `linear-gradient(90deg, color-mix(in srgb, ${accent} 7%, white) 0%, rgba(255,255,255,0.82) 30%, rgba(255,255,255,0.82) 100%)`,
      }}
    >
      {/* Rank */}
      <span
        className={`w-7 font-semibold text-sm text-center ${isTopThree ? 'text-[var(--masters)]' : 'text-[var(--ink-tertiary)]'}`}
      >
        {rank}
      </span>

      {/* Team Badge */}
      <span
        className={`${isTeamA ? 'team-badge team-badge-usa' : 'team-badge team-badge-europe'} text-xs py-[var(--space-1)] px-[var(--space-2)]`}
      >
        {isTeamA ? (teamALabel || 'USA') : (teamBLabel || 'EUR')}
      </span>

      {/* Player Info */}
      <div className="flex-1 min-w-0">
        <p className="type-title-sm">{entry.playerName}</p>
        <p className="type-micro mt-0.5">
          {entry.record} · {entry.matchesPlayed} {entry.matchesPlayed === 1 ? 'match' : 'matches'}
        </p>
      </div>

      {/* Points */}
      <span
        className={`score-medium ${isTopThree ? 'text-[var(--masters)]' : 'text-[var(--ink)]'}`}
      >
        {entry.points}
      </span>
    </div>
  );
}

function EmptyState() {
  return <NoStandingsPremiumEmpty />;
}
