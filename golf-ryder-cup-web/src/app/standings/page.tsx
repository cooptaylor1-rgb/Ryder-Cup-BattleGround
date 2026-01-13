'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTripStore } from '@/lib/stores';
import { calculateTeamStandings, calculateMagicNumber, calculatePlayerLeaderboard } from '@/lib/services/tournamentEngine';
import type { TeamStandings, MagicNumber, PlayerLeaderboard } from '@/lib/types/computed';
import { Trophy, Home, Target, Users, MoreHorizontal, ChevronLeft } from 'lucide-react';

/**
 * STANDINGS PAGE — The Leaderboard
 *
 * Design Philosophy:
 * - Scores dominate the viewport, monumental and unmissable
 * - Team colors reinforce identity
 * - Individual leaders feel prestigious, like a major leaderboard
 * - Typography creates hierarchy without visual noise
 */

export default function StandingsPage() {
  const router = useRouter();
  const { currentTrip, teams } = useTripStore();

  const [standings, setStandings] = useState<TeamStandings | null>(null);
  const [magicNumber, setMagicNumber] = useState<MagicNumber | null>(null);
  const [leaderboard, setLeaderboard] = useState<PlayerLeaderboard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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
        const teamStandings = await calculateTeamStandings(currentTrip.id);
        const magic = calculateMagicNumber(teamStandings);
        const players = await calculatePlayerLeaderboard(currentTrip.id);
        setStandings(teamStandings);
        setMagicNumber(magic);
        setLeaderboard(players);
      } catch (error) {
        console.error('Failed to load standings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadStandings();
  }, [currentTrip]);

  if (!currentTrip) return null;

  const teamA = teams.find(t => t.color === 'usa');
  const teamB = teams.find(t => t.color === 'europe');
  const teamAName = teamA?.name || 'USA';
  const teamBName = teamB?.name || 'Europe';

  return (
    <div className="min-h-screen pb-nav" style={{ background: 'var(--canvas)' }}>
      {/* Header */}
      <header className="header">
        <div className="container-editorial flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2"
            style={{ color: 'var(--ink-secondary)' }}
            aria-label="Back"
          >
            <ChevronLeft size={22} strokeWidth={1.75} />
          </button>
          <div>
            <span className="type-overline">Standings</span>
            <p className="type-caption truncate" style={{ marginTop: '2px' }}>
              {currentTrip.name}
            </p>
          </div>
        </div>
      </header>

      <main className="container-editorial">
        {isLoading ? (
          <LoadingState />
        ) : standings && magicNumber ? (
          <>
            {/* HERO — Team Score Display */}
            <section
              className="section text-center"
              style={{ paddingTop: 'var(--space-12)', paddingBottom: 'var(--space-12)' }}
            >
              {/* Points to Win Context */}
              <p
                className="type-caption"
                style={{ marginBottom: 'var(--space-8)' }}
              >
                {magicNumber.pointsToWin} points to win
              </p>

              {/* Monumental Score Display */}
              <div
                className="flex items-end justify-center"
                style={{ gap: 'var(--space-12)' }}
              >
                {/* Team USA */}
                <div className="text-center">
                  <p
                    className="score-monumental"
                    style={{
                      color: standings.teamAPoints >= standings.teamBPoints
                        ? 'var(--team-usa)'
                        : 'var(--ink-tertiary)'
                    }}
                  >
                    {standings.teamAPoints}
                  </p>
                  <p
                    className="type-overline"
                    style={{
                      marginTop: 'var(--space-3)',
                      color: 'var(--team-usa)'
                    }}
                  >
                    {teamAName}
                  </p>
                </div>

                {/* Separator */}
                <span
                  className="score-large"
                  style={{
                    color: 'var(--ink-faint)',
                    marginBottom: '12px'
                  }}
                >
                  –
                </span>

                {/* Team Europe */}
                <div className="text-center">
                  <p
                    className="score-monumental"
                    style={{
                      color: standings.teamBPoints > standings.teamAPoints
                        ? 'var(--team-europe)'
                        : 'var(--ink-tertiary)'
                    }}
                  >
                    {standings.teamBPoints}
                  </p>
                  <p
                    className="type-overline"
                    style={{
                      marginTop: 'var(--space-3)',
                      color: 'var(--team-europe)'
                    }}
                  >
                    {teamBName}
                  </p>
                </div>
              </div>

              {/* Victory Banner or Magic Number */}
              {magicNumber.hasClinched ? (
                <div
                  className="flex items-center justify-center gap-2"
                  style={{
                    marginTop: 'var(--space-10)',
                    padding: 'var(--space-3) var(--space-5)',
                    background: 'var(--masters-subtle)',
                    borderRadius: 'var(--radius-full)',
                    display: 'inline-flex'
                  }}
                >
                  <Trophy size={18} strokeWidth={1.75} style={{ color: 'var(--masters)' }} />
                  <span style={{ color: 'var(--masters)', fontWeight: 600 }}>
                    {magicNumber.clinchingTeam === 'A' ? teamAName : teamBName} Wins
                  </span>
                </div>
              ) : (magicNumber.teamANeeded <= 3 || magicNumber.teamBNeeded <= 3) && (
                <p
                  className="type-caption"
                  style={{
                    marginTop: 'var(--space-8)',
                    color: 'var(--masters)',
                    fontWeight: 500
                  }}
                >
                  Magic Number: {standings.leader === 'teamA' ? magicNumber.teamANeeded : magicNumber.teamBNeeded}
                </p>
              )}

              {/* Progress */}
              <p
                className="type-micro"
                style={{ marginTop: 'var(--space-8)' }}
              >
                {standings.matchesCompleted} of {standings.totalMatches} matches complete
              </p>
            </section>

            <hr className="divider-lg" />

            {/* LEADERBOARD — Individual Leaders */}
            <section className="section-sm">
              <h2
                className="type-overline"
                style={{ marginBottom: 'var(--space-6)' }}
              >
                Individual Leaders
              </h2>

              {leaderboard.length > 0 ? (
                <div>
                  {leaderboard.map((entry, index) => (
                    <PlayerRow
                      key={entry.playerId}
                      entry={entry}
                      rank={index + 1}
                      isTeamA={entry.teamId === teamA?.id}
                    />
                  ))}
                </div>
              ) : (
                <p
                  className="type-caption text-center"
                  style={{ padding: 'var(--space-10) 0' }}
                >
                  Complete matches to see individual standings
                </p>
              )}
            </section>
          </>
        ) : (
          <EmptyState />
        )}
      </main>

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <Link href="/" className="nav-item">
          <Home size={22} strokeWidth={1.75} />
          <span>Home</span>
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
   Player Row — Leaderboard Entry
   ============================================ */
interface PlayerRowProps {
  entry: PlayerLeaderboard;
  rank: number;
  isTeamA: boolean;
}

function PlayerRow({ entry, rank, isTeamA }: PlayerRowProps) {
  const isTopThree = rank <= 3;
  const teamColor = isTeamA ? 'var(--team-usa)' : 'var(--team-europe)';

  return (
    <div className="player-row" style={{ gap: 'var(--space-4)' }}>
      {/* Rank */}
      <span
        style={{
          width: '28px',
          fontWeight: 600,
          fontSize: 'var(--text-sm)',
          color: isTopThree ? 'var(--masters)' : 'var(--ink-tertiary)',
          textAlign: 'center'
        }}
      >
        {rank}
      </span>

      {/* Team Color Indicator */}
      <span
        className="team-dot-lg"
        style={{ background: teamColor }}
      />

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
function LoadingState() {
  return (
    <div
      className="section text-center"
      style={{ padding: 'var(--space-20) 0' }}
    >
      <div className="skeleton" style={{ width: '120px', height: '80px', margin: '0 auto var(--space-4)' }} />
      <div className="skeleton" style={{ width: '200px', height: '16px', margin: '0 auto' }} />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <div className="empty-state-icon">
        <Trophy size={28} strokeWidth={1.5} />
      </div>
      <p className="empty-state-title">No standings yet</p>
      <p className="empty-state-text">
        Complete matches to see tournament standings
      </p>
    </div>
  );
}
