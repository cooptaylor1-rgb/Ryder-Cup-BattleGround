'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTripStore } from '@/lib/stores';
import { AppShell } from '@/components/layout';
import { StandingsCard } from '@/components/ui';
import { calculateTeamStandings, calculateMagicNumber, calculatePlayerLeaderboard } from '@/lib/services/tournamentEngine';
import { cn, formatPlayerName } from '@/lib/utils';
import type { TeamStandings, MagicNumber, PlayerLeaderboard } from '@/lib/types/computed';
import { Trophy, Medal, TrendingUp } from 'lucide-react';

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
    <AppShell headerTitle="Standings">
      <div className="p-4 space-y-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-pulse text-surface-400">Loading standings...</div>
          </div>
        ) : standings && magicNumber ? (
          <>
            {/* Team Standings Card */}
            <StandingsCard
              standings={standings}
              magicNumber={magicNumber}
              teamAName={teamA?.name || 'Team USA'}
              teamBName={teamB?.name || 'Team Europe'}
            />

            {/* Player Leaderboard */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Medal className="w-5 h-5 text-augusta-green" />
                <h2 className="text-lg font-semibold">Player Leaderboard</h2>
              </div>

              <div className="card divide-y divide-surface-200 dark:divide-surface-700">
                {leaderboard.length > 0 ? (
                  leaderboard.map((entry, index) => (
                    <div
                      key={entry.playerId}
                      className={cn(
                        'flex items-center gap-3 p-3',
                        index < 3 && 'bg-augusta-green/5'
                      )}
                    >
                      {/* Rank */}
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm',
                        index === 0 && 'bg-yellow-500 text-yellow-900',
                        index === 1 && 'bg-gray-300 text-gray-700',
                        index === 2 && 'bg-amber-600 text-amber-100',
                        index > 2 && 'bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-300'
                      )}>
                        {index + 1}
                      </div>

                      {/* Player Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {entry.playerName}
                        </p>
                        <div className="flex items-center gap-2">
                          <div className={cn(
                            'w-2 h-2 rounded-full',
                            entry.teamId === teamA?.id ? 'bg-team-usa' : 'bg-team-europe'
                          )} />
                          <span className="text-xs text-surface-500">
                            {entry.record}
                          </span>
                        </div>
                      </div>

                      {/* Points */}
                      <div className="text-right">
                        <p className="text-lg font-bold text-augusta-green">
                          {entry.points}
                        </p>
                        <p className="text-xs text-surface-400">
                          {entry.matchesPlayed} {entry.matchesPlayed === 1 ? 'match' : 'matches'}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-center text-surface-400">
                    <Trophy className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No matches completed yet</p>
                    <p className="text-sm mt-1">Player records will appear here</p>
                  </div>
                )}
              </div>
            </section>

            {/* Session Breakdown */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="w-5 h-5 text-augusta-green" />
                <h2 className="text-lg font-semibold">Match Stats</h2>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="card p-4 text-center">
                  <p className="text-3xl font-bold text-augusta-green">
                    {standings.matchesPlayed}
                  </p>
                  <p className="text-sm text-surface-500">Matches Complete</p>
                </div>
                <div className="card p-4 text-center">
                  <p className="text-3xl font-bold text-surface-600 dark:text-surface-300">
                    {standings.matchesRemaining}
                  </p>
                  <p className="text-sm text-surface-500">Matches Remaining</p>
                </div>
              </div>
            </section>
          </>
        ) : (
          <div className="text-center py-12 text-surface-400">
            <Trophy className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No standings data available</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
