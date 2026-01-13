'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTripStore } from '@/lib/stores';
import { AppShellNew } from '@/components/layout';
import { calculateTeamStandings, calculateMagicNumber, calculatePlayerLeaderboard } from '@/lib/services/tournamentEngine';
import type { TeamStandings, MagicNumber, PlayerLeaderboard } from '@/lib/types/computed';
import { Trophy } from 'lucide-react';

/**
 * STANDINGS PAGE - Masters Tournament Inspired
 *
 * Design Philosophy:
 * - Numbers first, visual weight on leaders
 * - Typography carries the hierarchy
 * - Ties handled gracefully
 * - No charts unless they add clarity
 * - Calm, confident, trusted under pressure
 */

export default function StandingsPage() {
  const router = useRouter();
  const { currentTrip, teams } = useTripStore();

  const [standings, setStandings] = useState<TeamStandings | null>(null);
  const [magicNumber, setMagicNumber] = useState<MagicNumber | null>(null);
  const [leaderboard, setLeaderboard] = useState<PlayerLeaderboard[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Redirect if no trip
  useEffect(() => {
    if (!currentTrip) {
      router.push('/');
    }
  }, [currentTrip, router]);

  // Load standings
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
  const teamAName = teamA?.name || 'Team A';
  const teamBName = teamB?.name || 'Team B';

  return (
    <AppShellNew headerTitle="Standings" headerSubtitle={currentTrip.name}>
      <div className="px-5 py-6 max-w-2xl mx-auto pb-24 lg:pb-8">
        {isLoading ? (
          <LoadingState />
        ) : standings && magicNumber ? (
          <div className="space-y-8">
            {/* Team Score - The hero moment */}
            <TeamScoreCard
              standings={standings}
              magicNumber={magicNumber}
              teamAName={teamAName}
              teamBName={teamBName}
            />

            {/* Player Leaderboard */}
            <section>
              <h2 
                className="text-section mb-4"
                style={{ color: 'var(--text-secondary)' }}
              >
                Individual Leaders
              </h2>
              
              <div 
                className="rounded-lg overflow-hidden"
                style={{ 
                  background: 'var(--surface-raised)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                {leaderboard.length > 0 ? (
                  <div className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
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
                  <EmptyLeaderboard />
                )}
              </div>
            </section>

            {/* Match Progress */}
            <section>
              <h2 
                className="text-section mb-4"
                style={{ color: 'var(--text-secondary)' }}
              >
                Tournament Progress
              </h2>
              
              <div className="grid grid-cols-2 gap-3">
                <StatBlock 
                  value={standings.matchesPlayed} 
                  label="Complete" 
                />
                <StatBlock 
                  value={standings.matchesRemaining} 
                  label="Remaining" 
                />
              </div>
            </section>
          </div>
        ) : (
          <EmptyState />
        )}
      </div>
    </AppShellNew>
  );
}

/* ============================================
   Team Score Card - The hero of standings
   ============================================ */
interface TeamScoreCardProps {
  standings: TeamStandings;
  magicNumber: MagicNumber;
  teamAName: string;
  teamBName: string;
}

function TeamScoreCard({ standings, magicNumber, teamAName, teamBName }: TeamScoreCardProps) {
  const { teamAPoints, teamBPoints, leader } = standings;
  const { pointsToWin, hasClinched, clinchingTeam, teamANeeded, teamBNeeded } = magicNumber;
  
  const totalPoints = teamAPoints + teamBPoints;
  const teamAPercent = totalPoints > 0 ? (teamAPoints / totalPoints) * 100 : 50;

  return (
    <div 
      className="rounded-lg overflow-hidden"
      style={{ 
        background: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)'
      }}
    >
      {/* Points to win header */}
      <div 
        className="px-4 py-3 text-center"
        style={{ 
          borderBottom: '1px solid var(--border-subtle)',
          background: 'var(--surface-raised)'
        }}
      >
        <span 
          className="text-xs font-medium uppercase tracking-wider"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {pointsToWin} points to win
        </span>
      </div>

      {/* Main score display */}
      <div className="p-6 lg:p-8">
        <div className="flex items-center justify-between">
          {/* Team A */}
          <div className="text-center flex-1">
            <p 
              className="text-overline mb-3"
              style={{ color: 'var(--team-a-color)' }}
            >
              {teamAName}
            </p>
            <p 
              className="font-score text-5xl lg:text-6xl"
              style={{ 
                color: teamAPoints >= teamBPoints ? 'var(--text-primary)' : 'var(--text-tertiary)'
              }}
            >
              {teamAPoints}
            </p>
          </div>

          {/* Divider */}
          <div 
            className="mx-6 w-px h-16"
            style={{ background: 'var(--border-subtle)' }}
          />

          {/* Team B */}
          <div className="text-center flex-1">
            <p 
              className="text-overline mb-3"
              style={{ color: 'var(--team-b-color)' }}
            >
              {teamBName}
            </p>
            <p 
              className="font-score text-5xl lg:text-6xl"
              style={{ 
                color: teamBPoints >= teamAPoints ? 'var(--text-primary)' : 'var(--text-tertiary)'
              }}
            >
              {teamBPoints}
            </p>
          </div>
        </div>

        {/* Progress bar - subtle, informational */}
        <div 
          className="h-1 mt-6 rounded-full overflow-hidden flex"
          style={{ background: 'var(--surface-elevated)' }}
        >
          <div
            className="transition-all duration-500"
            style={{ 
              width: `${teamAPercent}%`,
              background: 'var(--team-a-color)'
            }}
          />
          <div
            className="transition-all duration-500"
            style={{ 
              width: `${100 - teamAPercent}%`,
              background: 'var(--team-b-color)'
            }}
          />
        </div>

        {/* Victory or Magic Number */}
        {hasClinched ? (
          <div 
            className="mt-6 py-3 text-center rounded"
            style={{ 
              background: 'var(--masters-gold-muted)',
              border: '1px solid rgba(201, 162, 39, 0.2)'
            }}
          >
            <div className="flex items-center justify-center gap-2">
              <Trophy 
                className="w-4 h-4" 
                style={{ color: 'var(--masters-gold)' }} 
              />
              <span 
                className="font-display text-base"
                style={{ color: 'var(--masters-gold)' }}
              >
                {clinchingTeam === 'A' ? teamAName : teamBName} Wins
              </span>
            </div>
          </div>
        ) : (teamANeeded <= 3 || teamBNeeded <= 3) && (
          <div 
            className="mt-6 py-3 text-center rounded"
            style={{ 
              background: 'rgba(0, 103, 71, 0.08)',
              border: '1px solid rgba(0, 103, 71, 0.15)'
            }}
          >
            <span 
              className="text-sm"
              style={{ color: 'var(--masters-green-light)' }}
            >
              Magic Number: <span className="font-score font-bold">
                {leader === 'teamA' ? teamANeeded : teamBNeeded}
              </span>
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ============================================
   Player Row - Individual standings entry
   ============================================ */
interface PlayerRowProps {
  entry: PlayerLeaderboard;
  rank: number;
  isTeamA: boolean;
}

function PlayerRow({ entry, rank, isTeamA }: PlayerRowProps) {
  const isTopThree = rank <= 3;
  
  return (
    <div 
      className="flex items-center gap-4 px-4 py-3"
      style={{ 
        background: isTopThree ? 'rgba(201, 162, 39, 0.03)' : 'transparent'
      }}
    >
      {/* Rank */}
      <div 
        className="w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold shrink-0"
        style={{
          background: rank === 1 
            ? 'var(--masters-gold)' 
            : rank === 2 
              ? '#A8A8A8'
              : rank === 3 
                ? '#CD7F32'
                : 'var(--surface-elevated)',
          color: rank <= 3 ? 'var(--surface-base)' : 'var(--text-secondary)'
        }}
      >
        {rank}
      </div>

      {/* Player info */}
      <div className="flex-1 min-w-0">
        <p 
          className="font-medium truncate text-sm"
          style={{ color: 'var(--text-primary)' }}
        >
          {entry.playerName}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <div 
            className="w-2 h-2 rounded-full"
            style={{ background: isTeamA ? 'var(--team-a-color)' : 'var(--team-b-color)' }}
          />
          <span 
            className="text-xs"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {entry.record}
          </span>
        </div>
      </div>

      {/* Points */}
      <div className="text-right shrink-0">
        <p 
          className="font-score text-lg"
          style={{ color: isTopThree ? 'var(--masters-gold)' : 'var(--text-primary)' }}
        >
          {entry.points}
        </p>
        <p 
          className="text-xs"
          style={{ color: 'var(--text-disabled)' }}
        >
          {entry.matchesPlayed} {entry.matchesPlayed === 1 ? 'match' : 'matches'}
        </p>
      </div>
    </div>
  );
}

/* ============================================
   Stat Block - Simple, clear numbers
   ============================================ */
interface StatBlockProps {
  value: number;
  label: string;
}

function StatBlock({ value, label }: StatBlockProps) {
  return (
    <div 
      className="p-4 rounded-lg text-center"
      style={{ 
        background: 'var(--surface-raised)',
        border: '1px solid var(--border-subtle)'
      }}
    >
      <p 
        className="font-score text-2xl mb-1"
        style={{ color: 'var(--text-primary)' }}
      >
        {value}
      </p>
      <p 
        className="text-xs"
        style={{ color: 'var(--text-tertiary)' }}
      >
        {label}
      </p>
    </div>
  );
}

/* ============================================
   Loading & Empty States
   ============================================ */
function LoadingState() {
  return (
    <div className="space-y-6">
      <div 
        className="rounded-lg p-6 animate-pulse"
        style={{ background: 'var(--surface-raised)' }}
      >
        <div className="h-4 w-24 mx-auto rounded" style={{ background: 'var(--surface-elevated)' }} />
        <div className="flex justify-between mt-8">
          <div className="text-center flex-1">
            <div className="h-3 w-16 mx-auto rounded" style={{ background: 'var(--surface-elevated)' }} />
            <div className="h-12 w-16 mx-auto rounded mt-3" style={{ background: 'var(--surface-elevated)' }} />
          </div>
          <div className="text-center flex-1">
            <div className="h-3 w-16 mx-auto rounded" style={{ background: 'var(--surface-elevated)' }} />
            <div className="h-12 w-16 mx-auto rounded mt-3" style={{ background: 'var(--surface-elevated)' }} />
          </div>
        </div>
      </div>
    </div>
  );
}

function EmptyLeaderboard() {
  return (
    <div className="py-12 px-6 text-center">
      <Trophy 
        className="w-8 h-8 mx-auto mb-4" 
        style={{ color: 'var(--text-disabled)' }} 
      />
      <p 
        className="font-medium"
        style={{ color: 'var(--text-secondary)' }}
      >
        No matches completed
      </p>
      <p 
        className="text-sm mt-1"
        style={{ color: 'var(--text-tertiary)' }}
      >
        Player records will appear here
      </p>
    </div>
  );
}

function EmptyState() {
  return (
    <div 
      className="py-16 px-6 text-center rounded-lg"
      style={{ 
        background: 'var(--surface-raised)',
        border: '1px solid var(--border-subtle)'
      }}
    >
      <Trophy 
        className="w-10 h-10 mx-auto mb-4" 
        style={{ color: 'var(--text-disabled)' }} 
      />
      <p 
        className="font-display text-lg mb-2"
        style={{ color: 'var(--text-primary)' }}
      >
        No standings available
      </p>
      <p 
        className="text-sm"
        style={{ color: 'var(--text-tertiary)' }}
      >
        Complete matches to see tournament standings
      </p>
    </div>
  );
}
