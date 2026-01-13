'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTripStore } from '@/lib/stores';
import { calculateTeamStandings, calculateMagicNumber, calculatePlayerLeaderboard } from '@/lib/services/tournamentEngine';
import type { TeamStandings, MagicNumber, PlayerLeaderboard } from '@/lib/types/computed';
import { Trophy, Home, Target, Users, MoreHorizontal, ChevronLeft } from 'lucide-react';

/**
 * STANDINGS PAGE - Monumental Ledger
 *
 * Design: Editorial, typography-driven, scores as sacred numbers
 * No boxed cards - dividers and whitespace carry structure
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
          <button onClick={() => router.back()} className="nav-item p-1" aria-label="Back">
            <ChevronLeft size={20} />
          </button>
          <div>
            <span className="type-overline">Standings</span>
            <p className="type-meta truncate" style={{ marginTop: '2px' }}>{currentTrip.name}</p>
          </div>
        </div>
      </header>

      <main className="container-editorial">
        {isLoading ? (
          <LoadingState />
        ) : standings && magicNumber ? (
          <>
            {/* HERO - Team Score */}
            <section className="section text-center" style={{ paddingTop: 'var(--space-8)', paddingBottom: 'var(--space-10)' }}>
              {/* Points to win */}
              <p className="type-meta" style={{ marginBottom: 'var(--space-6)' }}>
                {magicNumber.pointsToWin} to win
              </p>

              {/* Score Display */}
              <div className="flex items-baseline justify-center gap-10">
                <div className="text-center">
                  <p className="score-hero" style={{ 
                    color: standings.teamAPoints >= standings.teamBPoints ? 'var(--team-usa)' : 'var(--ink)'
                  }}>
                    {standings.teamAPoints}
                  </p>
                  <p className="type-overline" style={{ marginTop: 'var(--space-2)', color: 'var(--team-usa)' }}>
                    {teamAName}
                  </p>
                </div>
                
                <span className="score-hero" style={{ color: 'var(--ink-tertiary)' }}>–</span>
                
                <div className="text-center">
                  <p className="score-hero" style={{ 
                    color: standings.teamBPoints > standings.teamAPoints ? 'var(--team-europe)' : 'var(--ink)'
                  }}>
                    {standings.teamBPoints}
                  </p>
                  <p className="type-overline" style={{ marginTop: 'var(--space-2)', color: 'var(--team-europe)' }}>
                    {teamBName}
                  </p>
                </div>
              </div>

              {/* Victory or Magic Number */}
              {magicNumber.hasClinched ? (
                <div className="flex items-center justify-center gap-2" style={{ marginTop: 'var(--space-6)' }}>
                  <Trophy size={16} style={{ color: 'var(--masters)' }} />
                  <span className="type-body" style={{ color: 'var(--masters)', fontWeight: 500 }}>
                    {magicNumber.clinchingTeam === 'A' ? teamAName : teamBName} Wins
                  </span>
                </div>
              ) : (magicNumber.teamANeeded <= 3 || magicNumber.teamBNeeded <= 3) && (
                <p className="type-meta" style={{ marginTop: 'var(--space-6)', color: 'var(--masters)' }}>
                  Magic Number: {standings.leader === 'teamA' ? magicNumber.teamANeeded : magicNumber.teamBNeeded}
                </p>
              )}

              {/* Progress */}
              <p className="type-meta" style={{ marginTop: 'var(--space-6)' }}>
                {standings.matchesCompleted} of {standings.totalMatches} matches complete
              </p>
            </section>

            <hr className="divider" />

            {/* LEADERBOARD - Individual Leaders */}
            <section className="section">
              <h2 className="type-overline" style={{ marginBottom: 'var(--space-4)' }}>
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
                <p className="type-meta" style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
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
          <Home size={20} />
          <span>Home</span>
        </Link>
        <Link href="/score" className="nav-item">
          <Target size={20} />
          <span>Score</span>
        </Link>
        <Link href="/matchups" className="nav-item">
          <Users size={20} />
          <span>Matches</span>
        </Link>
        <Link href="/standings" className="nav-item nav-item-active">
          <Trophy size={20} />
          <span>Standings</span>
        </Link>
        <Link href="/more" className="nav-item">
          <MoreHorizontal size={20} />
          <span>More</span>
        </Link>
      </nav>
    </div>
  );
}

/* ============================================
   Player Row - Typography-driven, no cards
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
    <div className="match-row" style={{ gap: 'var(--space-4)' }}>
      {/* Rank */}
      <span 
        className="type-meta" 
        style={{ 
          width: '24px',
          fontWeight: isTopThree ? 600 : 400,
          color: isTopThree ? 'var(--masters)' : 'var(--ink-tertiary)'
        }}
      >
        {rank}
      </span>

      {/* Player info */}
      <div className="flex-1 min-w-0">
        <p style={{ fontWeight: 500 }}>{entry.playerName}</p>
        <p className="type-meta" style={{ marginTop: '2px' }}>
          <span style={{ color: teamColor }}>●</span>
          {' '}{entry.record} · {entry.matchesPlayed} {entry.matchesPlayed === 1 ? 'match' : 'matches'}
        </p>
      </div>

      {/* Points */}
      <span className="score-medium" style={{ color: isTopThree ? 'var(--masters)' : 'var(--ink)' }}>
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
    <div className="section text-center" style={{ padding: 'var(--space-16) 0' }}>
      <p className="type-meta">Loading standings…</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="empty-state">
      <Trophy size={32} style={{ color: 'var(--ink-tertiary)', marginBottom: 'var(--space-4)' }} />
      <p className="empty-state-title">No standings yet</p>
      <p className="empty-state-text">
        Complete matches to see tournament standings
      </p>
    </div>
  );
}
