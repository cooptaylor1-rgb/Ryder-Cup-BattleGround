'use client';

import { useEffect, useState } from 'react';
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
import { STAT_DEFINITIONS, type TripStatType } from '@/lib/types/tripStats';
import type { TeamStandings, MagicNumber, PlayerLeaderboard } from '@/lib/types/computed';
import type { Award, PlayerStats } from '@/lib/types/awards';
import { PathToVictoryCard } from '@/components/gamification/PathToVictoryCard';
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
import { BottomNav, PageHeader } from '@/components/layout';

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

  if (!currentTrip) {
    return (
      <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
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
        <BottomNav />
      </div>
    );
  }

  // Show loading skeleton while data loads
  if (isLoading) {
    return <PageLoadingSkeleton title="Standings" showBackButton={false} variant="default" />;
  }

  const teamA = teams.find((t) => t.color === 'usa');
  const teamB = teams.find((t) => t.color === 'europe');
  const teamAName = teamA?.name || 'USA';
  const teamBName = teamB?.name || 'Europe';

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
    <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Standings"
        subtitle={currentTrip.name}
        icon={<Trophy size={16} className="text-[var(--color-accent)]" />}
        onBack={() => router.back()}
      />

      {/* Tab Navigation */}
      <div className="sticky top-0 z-10 bg-[var(--canvas)] border-b border-[var(--rule)]">
        <div className="container-editorial">
          <div className="flex gap-1 py-[var(--space-2)]">
            <TabButton
              active={activeTab === 'competition'}
              onClick={() => setActiveTab('competition')}
              icon={<Trophy size={16} />}
              label="Competition"
            />
            <TabButton
              active={activeTab === 'stats'}
              onClick={() => setActiveTab('stats')}
              icon={<Beer size={16} />}
              label="Fun Stats"
            />
            <TabButton
              active={activeTab === 'awards'}
              onClick={() => setActiveTab('awards')}
              icon={<AwardIcon size={16} />}
              label="Awards"
            />
          </div>
        </div>
      </div>

      <main className="container-editorial">
        {activeTab === 'competition' ? (
          <CompetitionTab
            standings={standings}
            magicNumber={magicNumber}
            leaderboard={leaderboard}
            teamAName={teamAName}
            teamBName={teamBName}
            teamA={teamA}
            pointsToWin={currentTrip.settings?.pointsToWin ?? 14.5}
          />
        ) : activeTab === 'stats' ? (
          <FunStatsTab statTotals={statTotals} highlightStats={highlightStats} />
        ) : (
          <AwardsTab awards={awards} playerStats={playerStats} />
        )}
      </main>

      <BottomNav />
    </div>
  );
}

/* ============================================
   Tab Button Component
   ============================================ */
function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`press-scale flex flex-1 items-center justify-center gap-[var(--space-2)] py-[var(--space-3)] px-[var(--space-4)] rounded-[var(--radius-full)] font-[family-name:var(--font-sans)] text-sm cursor-pointer transition-all duration-200 ${
        active
          ? 'border-0 bg-[var(--masters)] text-white font-semibold'
          : 'border border-[var(--rule)] bg-transparent text-[var(--ink-secondary)] font-medium'
      }`}
      aria-label={`${label} tab`}
      aria-selected={active}
      role="tab"
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
}: {
  standings: TeamStandings | null;
  magicNumber: MagicNumber | null;
  leaderboard: PlayerLeaderboard[];
  teamAName: string;
  teamBName: string;
  teamA: { id: string } | undefined;
  pointsToWin: number;
}) {
  if (!standings || !magicNumber) {
    return <EmptyState />;
  }

  return (
    <>
      {/* HERO — Team Score Display */}
      <section className="section text-center pt-[var(--space-12)] pb-[var(--space-12)]">
        {/* Points to Win Context */}
        <p className="type-caption mb-[var(--space-8)]">
          {magicNumber.pointsToWin} points to win
        </p>

        {/* Score Comparison Blocks */}
        <div className="score-vs">
          {/* Team USA */}
          <div
            className={`score-vs-team score-vs-usa ${standings.teamAPoints >= standings.teamBPoints ? 'leading' : ''}`}
          >
            <span
              className={`team-dot team-dot-xl team-dot-usa inline-block mb-[var(--space-4)] ${standings.leader !== null ? 'team-dot-pulse' : ''}`}
            />
            <p
              className={`score-monumental ${
                standings.teamAPoints >= standings.teamBPoints
                  ? 'text-[var(--team-usa)]'
                  : 'text-[var(--ink-tertiary)]'
              }`}
            >
              {standings.teamAPoints}
            </p>
            <p className="type-overline mt-[var(--space-3)] text-[var(--team-usa)]">
              {teamAName}
            </p>
          </div>

          {/* Separator */}
          <div className="score-vs-divider">–</div>

          {/* Team Europe */}
          <div
            className={`score-vs-team score-vs-europe ${standings.teamBPoints > standings.teamAPoints ? 'leading' : ''}`}
          >
            <span
              className={`team-dot team-dot-xl team-dot-europe inline-block mb-[var(--space-4)] ${standings.leader !== null ? 'team-dot-pulse' : ''}`}
            />
            <p
              className={`score-monumental ${
                standings.teamBPoints > standings.teamAPoints
                  ? 'text-[var(--team-europe)]'
                  : 'text-[var(--ink-tertiary)]'
              }`}
            >
              {standings.teamBPoints}
            </p>
            <p className="type-overline mt-[var(--space-3)] text-[var(--team-europe)]">
              {teamBName}
            </p>
          </div>
        </div>

        {/* Victory Banner or Magic Number */}
        {magicNumber.hasClinched ? (
          <div
            className={`victory-banner mt-[var(--space-10)] inline-block ${magicNumber.clinchingTeam === 'A' ? 'victory-usa' : 'victory-europe'}`}
          >
            <div className="victory-icon">
              <Trophy size={18} strokeWidth={1.75} />
            </div>
            <p className="font-semibold text-base">
              {magicNumber.clinchingTeam === 'A' ? teamAName : teamBName} Wins
            </p>
          </div>
        ) : (
          (magicNumber.teamANeeded <= 3 || magicNumber.teamBNeeded <= 3) &&
          standings.leader && (
            <p className="type-caption mt-[var(--space-8)] text-[var(--masters)] font-medium">
              Magic Number:{' '}
              {standings.leader === 'teamA' ? magicNumber.teamANeeded : magicNumber.teamBNeeded}
            </p>
          )
        )}

        {/* Progress */}
        <p className="type-micro mt-[var(--space-8)]">
          {standings.matchesCompleted} of {standings.totalMatches} matches complete
        </p>

        {/* Trip Complete — Recap CTA */}
        {standings.remainingMatches === 0 && standings.matchesCompleted > 0 && (
          <div className="mt-[var(--space-6)] mx-auto max-w-sm">
            <Link
              href="/recap"
              className="flex items-center justify-center gap-[var(--space-2)] w-full py-[var(--space-3)] px-[var(--space-5)] rounded-xl font-semibold text-[length:var(--text-sm)] bg-[var(--masters)] text-white press-scale"
            >
              <PartyPopper size={18} />
              View Trip Recap & Share
              <Share2 size={16} />
            </Link>
          </div>
        )}
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
      <section className="section-sm">
        <h2 className="type-overline mb-[var(--space-6)]">
          Individual Leaders
        </h2>

        {leaderboard.length > 0 ? (
          <div className="stagger-fast">
            {leaderboard.map((entry, index) => (
              <PlayerRow
                key={entry.playerId}
                entry={entry}
                rank={index + 1}
                isTeamA={entry.teamId === teamA?.id}
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
    <section className="section-sm">
      {!hasAnyStats || (!hasDisplayableStats && highlightStats.length === 0) ? (
        <div className="mb-[var(--space-8)]">
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
          <h2 className="type-overline mb-[var(--space-4)]">
            Trip Highlights
          </h2>
          <div className="grid grid-cols-3 gap-[var(--space-3)] mb-[var(--space-8)]">
            {highlightStats.slice(0, 6).map((stat) => (
              <div
                key={stat.type}
                className="card p-[var(--space-3)] text-center"
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
            <div className="space-y-2">
              {stats.map((stat) => (
                <div
                  key={stat.statType}
                  className="card py-[var(--space-3)] px-[var(--space-4)] flex items-center justify-between"
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
          className="card press-scale flex items-center justify-between p-[var(--space-4)] mt-[var(--space-4)] no-underline text-inherit"
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
    <section className="section-sm">
      <h2 className="type-overline mb-[var(--space-6)]">
        Trip Superlatives
      </h2>

      <div className="card p-[var(--space-4)] mb-[var(--space-5)] flex flex-col gap-[var(--space-3)]">
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
              className={`card p-[var(--space-4)] ${award.winner ? '' : 'opacity-50'}`}
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
        className="card press-scale flex items-center justify-between p-[var(--space-4)] mt-[var(--space-6)] no-underline text-inherit"
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
      <div className="card p-[var(--space-3)] text-center opacity-50">
        <span className="text-xl">{emoji}</span>
        <p className="type-micro mt-[var(--space-1)] text-[var(--ink-tertiary)]">
          {label}
        </p>
        <p className="type-micro">-</p>
      </div>
    );
  }

  return (
    <div className="card p-[var(--space-3)] text-center">
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
  animationDelay?: number;
}

function PlayerRow({ entry, rank, isTeamA, animationDelay = 0 }: PlayerRowProps) {
  const isTopThree = rank <= 3;
  const teamClass = isTeamA
    ? 'team-row-usa team-row-accent-usa'
    : 'team-row-europe team-row-accent-europe';

  return (
    <div
      className={`player-row team-row team-row-accent row-interactive stagger-item gap-[var(--space-4)] px-[var(--space-3)] -mx-[var(--space-3)] rounded-[var(--radius-md)] ${teamClass}`}
      style={{ animationDelay: `${animationDelay}ms` }}
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
        {isTeamA ? 'USA' : 'EUR'}
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

/* ============================================
   Loading & Empty States
   ============================================ */
function _LoadingState() {
  return (
    <div className="section text-center py-[var(--space-20)] px-0">
      <div className="skeleton w-[120px] h-20 mx-auto mb-[var(--space-4)]" />
      <div className="skeleton w-[200px] h-4 mx-auto" />
    </div>
  );
}

function EmptyState() {
  return <NoStandingsPremiumEmpty />;
}
