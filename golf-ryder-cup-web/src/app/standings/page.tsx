'use client';

import { useEffect, useMemo, useState } from 'react';
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
  Home,
  Target,
  Users,
  MoreHorizontal,
  ChevronLeft,
  CalendarDays,
  Crown,
  Flame,
  Zap,
  Award as AwardIcon,
  Beer,
  TrendingUp,
  Star,
  Medal,
} from 'lucide-react';
import { NoStandingsPremiumEmpty } from '@/components/ui';

/**
 * STANDINGS PAGE — The Complete Leaderboard
 *
 * Design Philosophy:
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

  useEffect(() => {
    if (!currentTrip) {
      router.push('/');
    }
  }, [currentTrip, router]);

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

  // Show loading skeleton while data loads or redirecting
  if (!currentTrip || isLoading) {
    return (
      <div
        className="min-h-screen pb-nav page-premium-enter texture-grain"
        style={{ background: 'var(--canvas)' }}
      >
        <header className="header-premium">
          <div className="container-editorial flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg skeleton-pulse" />
            <div>
              <div className="w-20 h-3 rounded skeleton-pulse mb-1" />
              <div className="w-28 h-2 rounded skeleton-pulse" />
            </div>
          </div>
        </header>
        <main className="container-editorial" style={{ paddingTop: 'var(--space-4)' }}>
          <div className="card-luxury p-6 mb-4">
            <div className="flex justify-between mb-6">
              <div className="w-16 h-12 rounded skeleton-pulse" />
              <div className="w-12 h-8 rounded skeleton-pulse" />
              <div className="w-16 h-12 rounded skeleton-pulse" />
            </div>
            <div className="w-full h-6 rounded-full skeleton-pulse" />
          </div>
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="card-luxury p-4 h-16 skeleton-pulse" />
            ))}
          </div>
        </main>
      </div>
    );
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
    <div
      className="min-h-screen pb-nav page-premium-enter texture-grain"
      style={{ background: 'var(--canvas)' }}
    >
      {/* Premium Header */}
      <header className="header-premium">
        <div className="container-editorial flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 press-scale"
            style={{
              color: 'var(--ink-secondary)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              borderRadius: 'var(--radius-md)',
            }}
            aria-label="Back"
          >
            <ChevronLeft size={22} strokeWidth={1.75} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, var(--masters) 0%, var(--masters-deep) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'var(--shadow-glow-green)',
              }}
            >
              <Trophy size={16} style={{ color: 'var(--color-accent)' }} />
            </div>
            <div>
              <span className="type-overline" style={{ letterSpacing: '0.1em' }}>
                Standings
              </span>
              <p className="type-caption truncate" style={{ marginTop: '2px' }}>
                {currentTrip.name}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          background: 'var(--canvas)',
          borderBottom: '1px solid var(--rule)',
        }}
      >
        <div className="container-editorial">
          <div className="flex gap-1" style={{ padding: 'var(--space-2) 0' }}>
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

      {/* Bottom Navigation */}
      <nav className="nav-premium bottom-nav">
        <Link href="/" className="nav-item">
          <Home size={22} strokeWidth={1.75} />
          <span>Home</span>
        </Link>
        <Link href="/schedule" className="nav-item">
          <CalendarDays size={22} strokeWidth={1.75} />
          <span>Schedule</span>
        </Link>
        <Link href="/score" className="nav-item">
          <Target size={22} strokeWidth={1.75} />
          <span>Score</span>
        </Link>
        <Link href="/matchups" className="nav-item">
          <Users size={22} strokeWidth={1.75} />
          <span>Matches</span>
        </Link>
        <Link href="/standings" className="nav-item nav-item-active">
          <Trophy size={22} strokeWidth={1.75} />
          <span>Standings</span>
        </Link>
        <Link href="/more" className="nav-item">
          <MoreHorizontal size={22} strokeWidth={1.75} />
          <span>More</span>
        </Link>
      </nav>
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
      className="press-scale"
      // BUG-022 FIX: Add aria-label and role for accessibility
      aria-label={`${label} tab`}
      aria-selected={active}
      role="tab"
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 'var(--space-2)',
        padding: 'var(--space-3) var(--space-4)',
        borderRadius: 'var(--radius-md)',
        border: 'none',
        background: active ? 'var(--masters)' : 'transparent',
        color: active ? 'white' : 'var(--ink-secondary)',
        fontWeight: 500,
        fontSize: 'var(--text-sm)',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
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
      <section
        className="section text-center"
        style={{ paddingTop: 'var(--space-12)', paddingBottom: 'var(--space-12)' }}
      >
        {/* Points to Win Context */}
        <p className="type-caption" style={{ marginBottom: 'var(--space-8)' }}>
          {magicNumber.pointsToWin} points to win
        </p>

        {/* Score Comparison Blocks */}
        <div className="score-vs">
          {/* Team USA */}
          <div
            className={`score-vs-team score-vs-usa ${standings.teamAPoints >= standings.teamBPoints ? 'leading' : ''}`}
          >
            <span
              className={`team-dot team-dot-xl team-dot-usa ${standings.leader !== null ? 'team-dot-pulse' : ''}`}
              style={{ display: 'inline-block', marginBottom: 'var(--space-4)' }}
            />
            <p
              className="score-monumental"
              style={{
                color:
                  standings.teamAPoints >= standings.teamBPoints
                    ? 'var(--team-usa)'
                    : 'var(--ink-tertiary)',
              }}
            >
              {standings.teamAPoints}
            </p>
            <p
              className="type-overline"
              style={{
                marginTop: 'var(--space-3)',
                color: 'var(--team-usa)',
              }}
            >
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
              className={`team-dot team-dot-xl team-dot-europe ${standings.leader !== null ? 'team-dot-pulse' : ''}`}
              style={{ display: 'inline-block', marginBottom: 'var(--space-4)' }}
            />
            <p
              className="score-monumental"
              style={{
                color:
                  standings.teamBPoints > standings.teamAPoints
                    ? 'var(--team-europe)'
                    : 'var(--ink-tertiary)',
              }}
            >
              {standings.teamBPoints}
            </p>
            <p
              className="type-overline"
              style={{
                marginTop: 'var(--space-3)',
                color: 'var(--team-europe)',
              }}
            >
              {teamBName}
            </p>
          </div>
        </div>

        {/* Victory Banner or Magic Number */}
        {magicNumber.hasClinched ? (
          <div
            className={`victory-banner ${magicNumber.clinchingTeam === 'A' ? 'victory-usa' : 'victory-europe'}`}
            style={{ marginTop: 'var(--space-10)', display: 'inline-block' }}
          >
            <div className="victory-icon">
              <Trophy size={18} strokeWidth={1.75} />
            </div>
            <p style={{ fontWeight: 600, fontSize: 'var(--text-base)' }}>
              {magicNumber.clinchingTeam === 'A' ? teamAName : teamBName} Wins
            </p>
          </div>
        ) : (
          (magicNumber.teamANeeded <= 3 || magicNumber.teamBNeeded <= 3) &&
          standings.leader && (
            <p
              className="type-caption"
              style={{
                marginTop: 'var(--space-8)',
                color: 'var(--masters)',
                fontWeight: 500,
              }}
            >
              Magic Number:{' '}
              {standings.leader === 'teamA' ? magicNumber.teamANeeded : magicNumber.teamBNeeded}
            </p>
          )
        )}

        {/* Progress */}
        <p className="type-micro" style={{ marginTop: 'var(--space-8)' }}>
          {standings.matchesCompleted} of {standings.totalMatches} matches complete
        </p>
      </section>

      {/* Path to Victory */}
      {standings.remainingMatches > 0 && !magicNumber.hasClinched && (
        <section className="section-sm" style={{ paddingBottom: 0 }}>
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
        <h2 className="type-overline" style={{ marginBottom: 'var(--space-6)' }}>
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
          <p className="type-caption text-center" style={{ padding: 'var(--space-10) 0' }}>
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

  return (
    <section className="section-sm">
      {/* Quick Highlights */}
      {highlightStats.length > 0 && (
        <>
          <h2 className="type-overline" style={{ marginBottom: 'var(--space-4)' }}>
            Trip Highlights
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 'var(--space-3)',
              marginBottom: 'var(--space-8)',
            }}
          >
            {highlightStats.slice(0, 6).map((stat) => (
              <div
                key={stat.type}
                className="card"
                style={{
                  padding: 'var(--space-3)',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: '24px' }}>{stat.emoji}</span>
                <p className="type-title-lg" style={{ marginTop: 'var(--space-1)' }}>
                  {stat.value}
                </p>
                <p className="type-micro" style={{ color: 'var(--ink-tertiary)' }}>
                  {stat.label}
                </p>
                {stat.leader && (
                  <p
                    className="type-micro"
                    style={{ color: 'var(--masters)', marginTop: 'var(--space-1)' }}
                  >
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
      {hasAnyStats ? (
        categories.map((category) => {
          const categoryStats = category.types
            .map((statType) => {
              const data = statTotals.get(statType as TripStatType);
              if (!data || data.total === 0) return null;
              const def = STAT_DEFINITIONS[statType as TripStatType];
              return { statType, ...def, ...data };
            })
            .filter(Boolean);

          if (categoryStats.length === 0) return null;

          return (
            <div key={category.key} style={{ marginBottom: 'var(--space-8)' }}>
              <h3
                className="type-overline"
                style={{
                  marginBottom: 'var(--space-4)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                }}
              >
                <span>{category.emoji}</span>
                <span>{category.label}</span>
              </h3>
              <div className="space-y-2">
                {categoryStats.map(
                  (stat) =>
                    stat && (
                      <div
                        key={stat.statType}
                        className="card"
                        style={{
                          padding: 'var(--space-3) var(--space-4)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}
                        >
                          <span style={{ fontSize: '20px' }}>{stat.emoji}</span>
                          <div>
                            <p className="type-body-sm">{stat.label}</p>
                            <p className="type-micro" style={{ color: 'var(--ink-tertiary)' }}>
                              {stat.description}
                            </p>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p
                            className="type-title"
                            style={{ color: stat.isNegative ? 'var(--error)' : 'var(--masters)' }}
                          >
                            {stat.total}
                          </p>
                          {stat.leader && (
                            <p className="type-micro" style={{ color: 'var(--ink-tertiary)' }}>
                              👑 {stat.leader}
                            </p>
                          )}
                        </div>
                      </div>
                    )
                )}
              </div>
            </div>
          );
        })
      ) : (
        <div className="text-center" style={{ padding: 'var(--space-12) var(--space-4)' }}>
          <div style={{ fontSize: '48px', marginBottom: 'var(--space-4)' }}>📊</div>
          <h3 className="type-title" style={{ marginBottom: 'var(--space-2)' }}>
            No Stats Yet
          </h3>
          <p
            className="type-body"
            style={{ color: 'var(--ink-tertiary)', marginBottom: 'var(--space-6)' }}
          >
            Track beverages, mishaps, highlights and more during your rounds!
          </p>
          <Link href="/trip-stats" className="btn btn-primary">
            Start Tracking
          </Link>
        </div>
      )}

      {/* Link to full stats page */}
      {hasAnyStats && (
        <Link
          href="/trip-stats"
          className="card press-scale"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: 'var(--space-4)',
            marginTop: 'var(--space-4)',
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Star size={20} style={{ color: 'var(--masters)' }} />
            <span className="type-body-sm">View All Stats & Track More</span>
          </div>
          <span style={{ color: 'var(--ink-tertiary)' }}>→</span>
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
        return <Crown size={24} style={{ color: 'var(--color-accent)' }} />;
      case 'best-record':
        return <TrendingUp size={24} style={{ color: 'var(--masters)' }} />;
      case 'most-wins':
        return <Trophy size={24} style={{ color: 'var(--masters)' }} />;
      case 'most-halves':
        return <Medal size={24} style={{ color: 'var(--ink-secondary)' }} />;
      case 'biggest-win':
        return <Flame size={24} style={{ color: 'var(--error)' }} />;
      case 'iron-man':
        return <Zap size={24} style={{ color: 'var(--team-usa)' }} />;
      case 'streak-master':
        return <TrendingUp size={24} style={{ color: 'var(--team-europe)' }} />;
      default:
        return <AwardIcon size={24} style={{ color: 'var(--masters)' }} />;
    }
  };

  const hasAwards = awards.some((a) => a.winner);

  return (
    <section className="section-sm">
      <h2 className="type-overline" style={{ marginBottom: 'var(--space-6)' }}>
        Trip Superlatives
      </h2>

      <div
        className="card"
        style={{
          padding: 'var(--space-4)',
          marginBottom: 'var(--space-5)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--space-3)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Crown size={24} style={{ color: 'var(--color-accent)' }} />
          <div>
            <p className="type-title-sm">End-of-Trip Highlights</p>
            <p className="type-caption" style={{ color: 'var(--ink-tertiary)' }}>
              Vote for MVP and crown the trip superlatives.
            </p>
          </div>
        </div>
        <Link
          href="/trip-stats/awards"
          className="btn-premium"
          style={{ padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}
        >
          Vote for MVP & Awards
        </Link>
      </div>

      {hasAwards ? (
        <div className="space-y-4">
          {awards.map((award) => (
            <div
              key={award.type}
              className="card"
              style={{
                padding: 'var(--space-4)',
                opacity: award.winner ? 1 : 0.5,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)' }}>
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: 'var(--radius-lg)',
                    background: award.winner
                      ? 'linear-gradient(135deg, var(--masters) 0%, var(--masters-deep) 100%)'
                      : 'var(--surface-elevated)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {getAwardIcon(award.type)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 className="type-title-sm">{award.title}</h3>
                  <p
                    className="type-micro"
                    style={{ color: 'var(--ink-tertiary)', marginTop: '2px' }}
                  >
                    {award.description}
                  </p>
                  {award.winner ? (
                    <div style={{ marginTop: 'var(--space-3)' }}>
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 'var(--space-2)',
                        }}
                      >
                        <span
                          className={`team-dot team-dot-${award.winner.teamColor}`}
                          style={{ width: '8px', height: '8px' }}
                        />
                        <span className="type-body-sm" style={{ fontWeight: 600 }}>
                          {award.winner.playerName}
                        </span>
                        <span
                          className="type-caption"
                          style={{
                            color: 'var(--masters)',
                            marginLeft: 'auto',
                          }}
                        >
                          {award.winner.value}
                        </span>
                      </div>
                      {award.runnerUp && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            marginTop: 'var(--space-2)',
                            opacity: 0.7,
                          }}
                        >
                          <span
                            className={`team-dot team-dot-${award.runnerUp.teamColor}`}
                            style={{ width: '6px', height: '6px' }}
                          />
                          <span className="type-micro">{award.runnerUp.playerName}</span>
                          <span className="type-micro" style={{ marginLeft: 'auto' }}>
                            {award.runnerUp.value}
                          </span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p
                      className="type-micro"
                      style={{ color: 'var(--ink-tertiary)', marginTop: 'var(--space-2)' }}
                    >
                      Not yet awarded
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center" style={{ padding: 'var(--space-12) var(--space-4)' }}>
          <div style={{ fontSize: '48px', marginBottom: 'var(--space-4)' }}>🏆</div>
          <h3 className="type-title" style={{ marginBottom: 'var(--space-2)' }}>
            Awards Coming Soon
          </h3>
          <p className="type-body" style={{ color: 'var(--ink-tertiary)' }}>
            Complete some matches to unlock trip superlatives and see who earns the bragging rights!
          </p>
        </div>
      )}

      {/* Additional Records Section */}
      {playerStats.length > 0 && (
        <>
          <hr className="divider-lg" style={{ margin: 'var(--space-8) 0' }} />
          <h2 className="type-overline" style={{ marginBottom: 'var(--space-6)' }}>
            Player Records
          </h2>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: 'var(--space-3)',
            }}
          >
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
        className="card press-scale"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--space-4)',
          marginTop: 'var(--space-6)',
          textDecoration: 'none',
          color: 'inherit',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
          <Medal size={20} style={{ color: 'var(--color-accent)' }} />
          <span className="type-body-sm">View All Achievements & Badges</span>
        </div>
        <span style={{ color: 'var(--ink-tertiary)' }}>→</span>
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
      <div
        className="card"
        style={{
          padding: 'var(--space-3)',
          textAlign: 'center',
          opacity: 0.5,
        }}
      >
        <span style={{ fontSize: '20px' }}>{emoji}</span>
        <p
          className="type-micro"
          style={{ marginTop: 'var(--space-1)', color: 'var(--ink-tertiary)' }}
        >
          {label}
        </p>
        <p className="type-micro">-</p>
      </div>
    );
  }

  return (
    <div
      className="card"
      style={{
        padding: 'var(--space-3)',
        textAlign: 'center',
      }}
    >
      <span style={{ fontSize: '20px' }}>{emoji}</span>
      <p
        className="type-micro"
        style={{ marginTop: 'var(--space-1)', color: 'var(--ink-tertiary)' }}
      >
        {label}
      </p>
      <p className="type-title-sm" style={{ color: 'var(--masters)' }}>
        {formatValue(getValue(leader))}
      </p>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--space-1)',
          marginTop: 'var(--space-1)',
        }}
      >
        <span
          className={`team-dot team-dot-${leader.teamColor}`}
          style={{ width: '6px', height: '6px' }}
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
      className={`player-row team-row team-row-accent row-interactive stagger-item ${teamClass}`}
      style={{
        gap: 'var(--space-4)',
        paddingLeft: 'var(--space-3)',
        paddingRight: 'var(--space-3)',
        marginLeft: 'calc(-1 * var(--space-3))',
        marginRight: 'calc(-1 * var(--space-3))',
        borderRadius: 'var(--radius-md)',
        animationDelay: `${animationDelay}ms`,
      }}
    >
      {/* Rank */}
      <span
        style={{
          width: '28px',
          fontWeight: 600,
          fontSize: 'var(--text-sm)',
          color: isTopThree ? 'var(--masters)' : 'var(--ink-tertiary)',
          textAlign: 'center',
        }}
      >
        {rank}
      </span>

      {/* Team Badge */}
      <span
        className={isTeamA ? 'team-badge team-badge-usa' : 'team-badge team-badge-europe'}
        style={{ fontSize: 'var(--text-xs)', padding: 'var(--space-1) var(--space-2)' }}
      >
        {isTeamA ? 'USA' : 'EUR'}
      </span>

      {/* Player Info */}
      <div className="flex-1 min-w-0">
        <p className="type-title-sm">{entry.playerName}</p>
        <p className="type-micro" style={{ marginTop: '2px' }}>
          {entry.record} · {entry.matchesPlayed} {entry.matchesPlayed === 1 ? 'match' : 'matches'}
        </p>
      </div>

      {/* Points */}
      <span
        className="score-medium"
        style={{ color: isTopThree ? 'var(--masters)' : 'var(--ink)' }}
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
    <div className="section text-center" style={{ padding: 'var(--space-20) 0' }}>
      <div
        className="skeleton"
        style={{ width: '120px', height: '80px', margin: '0 auto var(--space-4)' }}
      />
      <div className="skeleton" style={{ width: '200px', height: '16px', margin: '0 auto' }} />
    </div>
  );
}

function EmptyState() {
  return <NoStandingsPremiumEmpty />;
}
