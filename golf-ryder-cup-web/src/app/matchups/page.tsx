'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useTripStore, useUIStore } from '@/lib/stores';
import { AppShellNew } from '@/components/layout';
import { cn, formatPlayerName } from '@/lib/utils';
import { Users, Plus, Shield, Calendar, ChevronRight } from 'lucide-react';

/**
 * MATCHUPS PAGE - Masters-inspired elegance
 *
 * Team rosters and session management with
 * refined typography and warm accents.
 */

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
    <AppShellNew headerTitle="Matchups" headerSubtitle={currentTrip.name}>
      <div className="p-4 lg:p-6 space-y-8">
        {/* Team Rosters */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl text-magnolia">Team Rosters</h2>
            {isCaptainMode && (
              <button
                onClick={() => router.push('/players')}
                className="text-sm text-gold font-medium flex items-center gap-1 hover:text-gold-light transition-colors"
              >
                <Plus className="w-4 h-4" />
                Manage
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Team A */}
            <div className="rounded-xl bg-surface-card border border-surface-border p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-team-usa" />
                <h3 className="font-semibold text-team-usa">{teamA?.name || 'Team USA'}</h3>
              </div>
              <div className="space-y-2">
                {teamAPlayers.length > 0 ? (
                  teamAPlayers.map(player => (
                    <div
                      key={player.id}
                      className="text-sm py-2 border-b border-surface-border/50 last:border-0"
                    >
                      <p className="font-medium text-magnolia">
                        {formatPlayerName(player.firstName, player.lastName, 'short')}
                      </p>
                      {player.handicapIndex !== undefined && (
                        <p className="text-xs text-text-tertiary mt-0.5">
                          HCP: {player.handicapIndex.toFixed(1)}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-text-tertiary italic py-2">No players assigned</p>
                )}
              </div>
            </div>

            {/* Team B */}
            <div className="rounded-xl bg-surface-card border border-surface-border p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-3 h-3 rounded-full bg-team-europe" />
                <h3 className="font-semibold text-team-europe">{teamB?.name || 'Team Europe'}</h3>
              </div>
              <div className="space-y-2">
                {teamBPlayers.length > 0 ? (
                  teamBPlayers.map(player => (
                    <div
                      key={player.id}
                      className="text-sm py-2 border-b border-surface-border/50 last:border-0"
                    >
                      <p className="font-medium text-magnolia">
                        {formatPlayerName(player.firstName, player.lastName, 'short')}
                      </p>
                      {player.handicapIndex !== undefined && (
                        <p className="text-xs text-text-tertiary mt-0.5">
                          HCP: {player.handicapIndex.toFixed(1)}
                        </p>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-text-tertiary italic py-2">No players assigned</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Sessions */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-serif text-xl text-magnolia">Sessions</h2>
            {isCaptainMode && (
              <button
                onClick={() => router.push('/lineup/new')}
                className="text-sm text-gold font-medium flex items-center gap-1 hover:text-gold-light transition-colors"
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
                    'w-full p-4 rounded-xl text-left',
                    'bg-surface-card border border-surface-border',
                    'hover:border-gold/20 hover:shadow-card-md',
                    'transition-all duration-200'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        'w-11 h-11 rounded-xl flex items-center justify-center',
                        session.status === 'completed' && 'bg-masters-green/10 text-masters-green-light',
                        session.status === 'inProgress' && 'bg-azalea/10 text-azalea',
                        session.status === 'scheduled' && 'bg-surface-elevated text-text-tertiary'
                      )}>
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-magnolia">{session.name}</h3>
                        <p className="text-sm text-text-secondary capitalize">{session.sessionType}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        'px-3 py-1 rounded-full text-xs font-medium',
                        session.status === 'completed' && 'bg-masters-green/10 text-masters-green-light',
                        session.status === 'inProgress' && 'bg-azalea/10 text-azalea',
                        session.status === 'scheduled' && 'bg-surface-elevated text-text-secondary'
                      )}>
                        {session.status === 'inProgress' ? 'Live' :
                          session.status === 'completed' ? 'Complete' : 'Upcoming'}
                      </span>
                      <ChevronRight className="w-5 h-5 text-text-tertiary" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-xl bg-surface-card border border-surface-border p-10 text-center">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-surface-elevated mb-4">
                <Users className="w-7 h-7 text-text-tertiary" />
              </div>
              <p className="text-text-secondary font-medium mb-4">No sessions created yet</p>
              {isCaptainMode ? (
                <button
                  onClick={() => router.push('/lineup/new')}
                  className={cn(
                    'inline-flex items-center gap-2',
                    'px-6 py-3 rounded-xl',
                    'bg-gradient-to-r from-gold to-gold-dark',
                    'text-surface-base font-semibold',
                    'hover:shadow-glow-gold',
                    'transition-all duration-200'
                  )}
                >
                  <Plus className="w-4 h-4" />
                  Create First Session
                </button>
              ) : (
                <p className="text-sm text-text-tertiary">
                  <Shield className="w-4 h-4 inline mr-1" />
                  Enable Captain Mode to create sessions
                </p>
              )}
            </div>
          )}
        </section>

        {/* Captain Mode Hint */}
        {!isCaptainMode && (
          <div className="rounded-xl p-5 bg-masters-green/5 border border-masters-green/20">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-masters-green/10">
                <Shield className="w-5 h-5 text-masters-green-light" />
              </div>
              <div>
                <p className="font-medium text-masters-green-light">Captain Mode</p>
                <p className="text-sm text-text-secondary mt-1">
                  Enable Captain Mode in settings to manage lineups, add players, and create sessions.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppShellNew>
  );
}
