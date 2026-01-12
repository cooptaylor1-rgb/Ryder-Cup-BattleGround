'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useTripStore, useUIStore } from '@/lib/stores';
import { AppShell } from '@/components/layout';
import { cn, formatPlayerName } from '@/lib/utils';
import { Users, Plus, Shield, Calendar, ChevronRight } from 'lucide-react';

export default function MatchupsPage() {
  const router = useRouter();
  const { currentTrip, sessions, teams, players, teamMembers } = useTripStore();
  const { isCaptainMode } = useUIStore();

  // Redirect if no trip
  useEffect(() => {
    if (!currentTrip) {
      router.push('/');
    }
  }, [currentTrip, router]);

  // Get players by team
  const getTeamPlayers = (teamId: string) => {
    const memberIds = teamMembers
      .filter(tm => tm.teamId === teamId)
      .map(tm => tm.playerId);
    return players.filter(p => memberIds.includes(p.id));
  };

  const teamA = teams.find(t => t.color === 'usa');
  const teamB = teams.find(t => t.color === 'europe');
  const teamAPlayers = teamA ? getTeamPlayers(teamA.id) : [];
  const teamBPlayers = teamB ? getTeamPlayers(teamB.id) : [];

  if (!currentTrip) return null;

  return (
    <AppShell headerTitle="Matchups">
      <div className="p-4 space-y-6">
        {/* Team Rosters */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Team Rosters</h2>
            {isCaptainMode && (
              <button
                onClick={() => router.push('/players')}
                className="text-sm text-augusta-green font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Manage
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Team USA */}
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-team-usa" />
                <h3 className="font-semibold text-team-usa">{teamA?.name || 'Team USA'}</h3>
              </div>
              <div className="space-y-2">
                {teamAPlayers.length > 0 ? (
                  teamAPlayers.map(player => (
                    <div
                      key={player.id}
                      className="text-sm py-1 border-b border-surface-100 dark:border-surface-800 last:border-0"
                    >
                      <p className="font-medium">
                        {formatPlayerName(player.firstName, player.lastName, 'short')}
                      </p>
                      {player.handicapIndex !== undefined && (
                        <p className="text-xs text-surface-400">
                          HCP: {player.handicapIndex.toFixed(1)}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-surface-400 italic">No players</p>
                )}
              </div>
            </div>

            {/* Team Europe */}
            <div className="card p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full bg-team-europe" />
                <h3 className="font-semibold text-team-europe">{teamB?.name || 'Team Europe'}</h3>
              </div>
              <div className="space-y-2">
                {teamBPlayers.length > 0 ? (
                  teamBPlayers.map(player => (
                    <div
                      key={player.id}
                      className="text-sm py-1 border-b border-surface-100 dark:border-surface-800 last:border-0"
                    >
                      <p className="font-medium">
                        {formatPlayerName(player.firstName, player.lastName, 'short')}
                      </p>
                      {player.handicapIndex !== undefined && (
                        <p className="text-xs text-surface-400">
                          HCP: {player.handicapIndex.toFixed(1)}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-surface-400 italic">No players</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Sessions */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Sessions</h2>
            {isCaptainMode && (
              <button
                onClick={() => router.push('/lineup/new')}
                className="text-sm text-augusta-green font-medium flex items-center gap-1"
              >
                <Plus className="w-4 h-4" />
                Add Session
              </button>
            )}
          </div>

          {sessions.length > 0 ? (
            <div className="space-y-3">
              {sessions.map(session => (
                <button
                  key={session.id}
                  onClick={() => router.push(`/lineup/${session.id}`)}
                  className={cn(
                    'card w-full p-4 text-left',
                    'hover:bg-surface-50 dark:hover:bg-surface-800/50',
                    'transition-colors'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-10 h-10 rounded-lg flex items-center justify-center',
                        session.status === 'completed' && 'bg-green-100 text-green-600',
                        session.status === 'inProgress' && 'bg-blue-100 text-blue-600',
                        session.status === 'scheduled' && 'bg-surface-100 text-surface-500'
                      )}>
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Session {session.sessionNumber}</h3>
                        <p className="text-sm text-surface-500 capitalize">{session.type}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        'badge',
                        session.status === 'completed' && 'badge-success',
                        session.status === 'inProgress' && 'badge-info',
                        session.status === 'scheduled' && 'badge-default'
                      )}>
                        {session.status === 'inProgress' ? 'Live' :
                          session.status === 'completed' ? 'Done' : 'Upcoming'}
                      </span>
                      <ChevronRight className="w-5 h-5 text-surface-400" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="card p-8 text-center">
              <Users className="w-12 h-12 mx-auto mb-4 text-surface-400" />
              <p className="text-surface-500 mb-4">No sessions created yet</p>
              {isCaptainMode ? (
                <button
                  onClick={() => router.push('/lineup/new')}
                  className="btn-primary"
                >
                  Create First Session
                </button>
              ) : (
                <p className="text-sm text-surface-400">
                  <Shield className="w-4 h-4 inline mr-1" />
                  Enable Captain Mode to create sessions
                </p>
              )}
            </div>
          )}
        </section>

        {/* Captain Mode Hint */}
        {!isCaptainMode && (
          <div className="card p-4 bg-augusta-green/5 border border-augusta-green/20">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-augusta-green flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium text-augusta-green">Captain Mode</p>
                <p className="text-sm text-surface-600 dark:text-surface-400 mt-1">
                  Enable Captain Mode in settings to manage lineups, add players, and create sessions.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
