'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTripStore } from '@/lib/stores';
import { AppShellNew } from '@/components/layout';
import {
  Card,
  SectionHeader,
  StandingsCardSkeleton,
  NoStandingsEmptyNew,
} from '@/components/ui';
import { calculateTeamStandings, calculateMagicNumber, calculatePlayerLeaderboard } from '@/lib/services/tournamentEngine';
import { cn } from '@/lib/utils';
import type { TeamStandings, MagicNumber, PlayerLeaderboard } from '@/lib/types/computed';
import { Trophy, Medal, TrendingUp, Target, Award } from 'lucide-react';

// Enhanced Team Standings Card component
interface TeamStandingsCardProps {
  standings: TeamStandings;
  magicNumber: MagicNumber;
  teamAName: string;
  teamBName: string;
}

function TeamStandingsCardNew({
  standings,
  magicNumber,
  teamAName,
  teamBName,
}: TeamStandingsCardProps) {
  const { teamAPoints, teamBPoints, matchesPlayed, leader } = standings;
  const { pointsToWin, hasClinched, clinchingTeam, teamANeeded, teamBNeeded } = magicNumber;

  const totalPoints = teamAPoints + teamBPoints;
  const teamAPercent = totalPoints > 0 ? (teamAPoints / totalPoints) * 100 : 50;
  const teamBPercent = totalPoints > 0 ? (teamBPoints / totalPoints) * 100 : 50;

  // Determine if a team can clinch based on needed points
  const canClinch = !hasClinched && (teamANeeded <= 3 || teamBNeeded <= 3);

  return (
    <Card variant="elevated" className="overflow-hidden">
      {/* Points to Win Banner */}
      <div className="bg-augusta-green/10 px-4 py-2 text-center border-b border-augusta-green/20">
        <span className="text-sm text-augusta-green font-medium">
          {pointsToWin} points to win
        </span>
      </div>

      {/* Main Score Display */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-6">
          {/* Team A */}
          <div className="text-center flex-1">
            <div className={cn(
              'inline-flex items-center gap-2 px-3 py-1 rounded-full mb-2',
              'bg-team-usa/10',
            )}>
              <div className="h-2 w-2 rounded-full bg-team-usa" />
              <span className="text-xs font-semibold uppercase tracking-wider text-team-usa">
                {teamAName}
              </span>
            </div>
            <p className={cn(
              'text-4xl font-bold font-mono',
              teamAPoints > teamBPoints && 'text-team-usa',
              teamAPoints <= teamBPoints && 'text-text-primary',
            )}>
              {teamAPoints}
            </p>
          </div>

          {/* VS */}
          <div className="px-4">
            <div className="h-12 w-12 rounded-full bg-surface-elevated flex items-center justify-center">
              <span className="text-xs font-bold text-text-tertiary">VS</span>
            </div>
          </div>

          {/* Team B */}
          <div className="text-center flex-1">
            <div className={cn(
              'inline-flex items-center gap-2 px-3 py-1 rounded-full mb-2',
              'bg-team-europe/10',
            )}>
              <div className="h-2 w-2 rounded-full bg-team-europe" />
              <span className="text-xs font-semibold uppercase tracking-wider text-team-europe">
                {teamBName}
              </span>
            </div>
            <p className={cn(
              'text-4xl font-bold font-mono',
              teamBPoints > teamAPoints && 'text-team-europe',
              teamBPoints <= teamAPoints && 'text-text-primary',
            )}>
              {teamBPoints}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-3 rounded-full bg-surface-muted overflow-hidden flex">
          <div
            className="bg-team-usa transition-all duration-500"
            style={{ width: `${teamAPercent}%` }}
          />
          <div
            className="bg-team-europe transition-all duration-500"
            style={{ width: `${teamBPercent}%` }}
          />
        </div>

        {/* Magic Number */}
        {(canClinch || hasClinched) && (
          <div className={cn(
            'mt-4 p-3 rounded-lg text-center',
            hasClinched
              ? 'bg-augusta-green/10 text-augusta-green'
              : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400',
          )}>
            {hasClinched ? (
              <div className="flex items-center justify-center gap-2">
                <Trophy className="h-5 w-5" />
                <span className="font-semibold">
                  {clinchingTeam === 'A' ? teamAName : teamBName} Wins!
                </span>
              </div>
            ) : (
              <p className="text-sm font-medium">
                Magic Number: <span className="font-bold">
                  {leader === 'teamA' ? teamANeeded : teamBNeeded}
                </span>
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

// Player Leaderboard Entry
interface LeaderboardEntryProps {
  entry: PlayerLeaderboard;
  rank: number;
  isTeamA: boolean;
}

function LeaderboardEntry({ entry, rank, isTeamA }: LeaderboardEntryProps) {
  return (
    <div className={cn(
      'flex items-center gap-3 p-4',
      rank <= 3 && 'bg-augusta-green/5',
    )}>
      {/* Rank Badge */}
      <div className={cn(
        'h-8 w-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0',
        rank === 1 && 'bg-yellow-500 text-yellow-900',
        rank === 2 && 'bg-gray-300 text-gray-700',
        rank === 3 && 'bg-amber-600 text-amber-100',
        rank > 3 && 'bg-surface-elevated text-text-secondary',
      )}>
        {rank}
      </div>

      {/* Player Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-text-primary truncate">
          {entry.playerName}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <div className={cn(
            'h-2 w-2 rounded-full',
            isTeamA ? 'bg-team-usa' : 'bg-team-europe',
          )} />
          <span className="text-xs text-text-secondary">
            {entry.record}
          </span>
        </div>
      </div>

      {/* Points */}
      <div className="text-right shrink-0">
        <p className="text-xl font-bold text-augusta-green">
          {entry.points}
        </p>
        <p className="text-xs text-text-tertiary">
          {entry.matchesPlayed} {entry.matchesPlayed === 1 ? 'match' : 'matches'}
        </p>
      </div>
    </div>
  );
}

// Stat Card component
interface StatCardProps {
  value: number;
  label: string;
  highlight?: boolean;
}

function StatCard({ value, label, highlight = false }: StatCardProps) {
  return (
    <Card className="p-4 text-center">
      <p className={cn(
        'text-3xl font-bold font-mono',
        highlight ? 'text-augusta-green' : 'text-text-primary',
      )}>
        {value}
      </p>
      <p className="text-xs text-text-secondary mt-1">{label}</p>
    </Card>
  );
}

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

  return (
    <AppShellNew
      headerTitle="Standings"
      headerSubtitle={currentTrip.name}
    >
      <div className="p-4 lg:p-6 space-y-6">
        {isLoading ? (
          // Loading state with skeletons
          <div className="space-y-6">
            <StandingsCardSkeleton />
            <Card>
              <SectionHeader title="Player Leaderboard" icon={Medal} size="sm" className="mb-4" />
              <div className="space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3 p-4 animate-pulse">
                    <div className="h-8 w-8 rounded-full bg-surface-muted" />
                    <div className="flex-1">
                      <div className="h-4 w-24 bg-surface-muted rounded" />
                      <div className="h-3 w-16 bg-surface-muted rounded mt-1" />
                    </div>
                    <div className="h-6 w-8 bg-surface-muted rounded" />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        ) : standings && magicNumber ? (
          <>
            {/* Team Standings Card */}
            <TeamStandingsCardNew
              standings={standings}
              magicNumber={magicNumber}
              teamAName={teamA?.name || 'Team USA'}
              teamBName={teamB?.name || 'Team Europe'}
            />

            {/* Player Leaderboard */}
            <section>
              <SectionHeader
                title="Player Leaderboard"
                subtitle={leaderboard.length > 0 ? `${leaderboard.length} players` : undefined}
                icon={Medal}
                className="mb-4"
              />

              <Card padding="none" className="overflow-hidden divide-y divide-surface-border/50">
                {leaderboard.length > 0 ? (
                  leaderboard.map((entry, index) => (
                    <LeaderboardEntry
                      key={entry.playerId}
                      entry={entry}
                      rank={index + 1}
                      isTeamA={entry.teamId === teamA?.id}
                    />
                  ))
                ) : (
                  <div className="p-8 text-center">
                    <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-surface-elevated mb-4">
                      <Trophy className="h-6 w-6 text-text-tertiary" />
                    </div>
                    <p className="text-text-secondary font-medium">No matches completed yet</p>
                    <p className="text-sm text-text-tertiary mt-1">Player records will appear here</p>
                  </div>
                )}
              </Card>
            </section>

            {/* Match Stats */}
            <section>
              <SectionHeader
                title="Match Stats"
                icon={TrendingUp}
                size="sm"
                className="mb-4"
              />

              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  value={standings.matchesPlayed}
                  label="Matches Complete"
                  highlight
                />
                <StatCard
                  value={standings.matchesRemaining}
                  label="Matches Remaining"
                />
              </div>
            </section>
          </>
        ) : (
          // Empty state
          <Card variant="outlined" padding="none">
            <NoStandingsEmptyNew />
          </Card>
        )}
      </div>
    </AppShellNew>
  );
}
