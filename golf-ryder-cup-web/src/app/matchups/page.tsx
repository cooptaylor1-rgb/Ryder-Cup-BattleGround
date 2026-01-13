'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTripStore, useUIStore } from '@/lib/stores';
import { formatPlayerName } from '@/lib/utils';
import { Users, Plus, Shield, Calendar, ChevronRight, Home, Target, Trophy, MoreHorizontal, ChevronLeft } from 'lucide-react';

/**
 * MATCHUPS PAGE - Editorial Design
 *
 * Team rosters and sessions with typography-driven hierarchy.
 */

export default function MatchupsPage() {
  const router = useRouter();
  const { currentTrip, sessions, teams, players, teamMembers } = useTripStore();
  const { isCaptainMode } = useUIStore();

  useEffect(() => {
    if (!currentTrip) {
      router.push('/');
    }
  }, [currentTrip, router]);

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
    <div className="min-h-screen pb-nav" style={{ background: 'var(--canvas)' }}>
      {/* Header */}
      <header className="header">
        <div className="container-editorial flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="nav-item p-1" aria-label="Back">
              <ChevronLeft size={20} />
            </button>
            <div>
              <span className="type-overline">Matchups</span>
              <p className="type-meta truncate" style={{ marginTop: '2px' }}>{currentTrip.name}</p>
            </div>
          </div>
          {isCaptainMode && (
            <Link href="/players" className="type-meta" style={{ color: 'var(--masters)' }}>
              <Plus size={14} style={{ display: 'inline', marginRight: '4px' }} />
              Manage
            </Link>
          )}
        </div>
      </header>

      <main className="container-editorial">
        {/* Team Rosters */}
        <section className="section">
          <h2 className="type-overline" style={{ marginBottom: 'var(--space-4)' }}>Team Rosters</h2>

          <div className="grid grid-cols-2 gap-4">
            {/* Team A */}
            <div>
              <p className="type-overline" style={{ color: 'var(--team-usa)', marginBottom: 'var(--space-3)' }}>
                {teamA?.name || 'USA'}
              </p>
              {teamAPlayers.length > 0 ? (
                <div>
                  {teamAPlayers.map(player => (
                    <div key={player.id} style={{ 
                      padding: 'var(--space-2) 0',
                      borderBottom: '1px solid var(--rule)'
                    }}>
                      <p style={{ fontWeight: 500 }}>
                        {formatPlayerName(player.firstName, player.lastName, 'short')}
                      </p>
                      {player.handicapIndex !== undefined && (
                        <p className="type-meta">{player.handicapIndex.toFixed(1)}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="type-meta">No players</p>
              )}
            </div>

            {/* Team B */}
            <div>
              <p className="type-overline" style={{ color: 'var(--team-europe)', marginBottom: 'var(--space-3)' }}>
                {teamB?.name || 'Europe'}
              </p>
              {teamBPlayers.length > 0 ? (
                <div>
                  {teamBPlayers.map(player => (
                    <div key={player.id} style={{ 
                      padding: 'var(--space-2) 0',
                      borderBottom: '1px solid var(--rule)'
                    }}>
                      <p style={{ fontWeight: 500 }}>
                        {formatPlayerName(player.firstName, player.lastName, 'short')}
                      </p>
                      {player.handicapIndex !== undefined && (
                        <p className="type-meta">{player.handicapIndex.toFixed(1)}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="type-meta">No players</p>
              )}
            </div>
          </div>
        </section>

        <hr className="divider" />

        {/* Sessions */}
        <section className="section">
          <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
            <h2 className="type-overline">Sessions</h2>
            {isCaptainMode && (
              <button
                onClick={() => router.push('/lineup/new')}
                className="type-meta"
                style={{ color: 'var(--masters)' }}
              >
                <Plus size={14} style={{ display: 'inline', marginRight: '4px' }} />
                Add
              </button>
            )}
          </div>

          {sessions.length > 0 ? (
            <div>
              {sessions.map(session => (
                <button
                  key={session.id}
                  onClick={() => router.push(`/lineup/${session.id}`)}
                  className="match-row w-full text-left"
                >
                  <Calendar size={18} style={{ color: 'var(--ink-tertiary)' }} />
                  <div className="flex-1">
                    <p style={{ fontWeight: 500 }}>{session.name}</p>
                    <p className="type-meta capitalize">{session.sessionType}</p>
                  </div>
                  <span 
                    className="type-meta"
                    style={{ 
                      color: session.status === 'inProgress' ? 'var(--masters)' :
                             session.status === 'completed' ? 'var(--success)' : 'var(--ink-tertiary)'
                    }}
                  >
                    {session.status === 'inProgress' ? 'Live' :
                     session.status === 'completed' ? 'Complete' : 'Upcoming'}
                  </span>
                  <ChevronRight size={18} style={{ color: 'var(--ink-tertiary)' }} />
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Users size={32} style={{ color: 'var(--ink-tertiary)', marginBottom: 'var(--space-4)' }} />
              <p className="empty-state-title">No sessions yet</p>
              <p className="empty-state-text">
                {isCaptainMode ? 'Create a session to set up matches' : 'Enable Captain Mode to create sessions'}
              </p>
              {isCaptainMode && (
                <button
                  onClick={() => router.push('/lineup/new')}
                  className="btn btn-primary"
                >
                  <Plus size={18} />
                  Create Session
                </button>
              )}
            </div>
          )}
        </section>

        {/* Captain Mode Hint */}
        {!isCaptainMode && sessions.length > 0 && (
          <>
            <hr className="divider" />
            <section className="section">
              <div className="flex items-start gap-3">
                <Shield size={18} style={{ color: 'var(--masters)', marginTop: '2px' }} />
                <div>
                  <p style={{ fontWeight: 500, marginBottom: 'var(--space-1)' }}>Captain Mode</p>
                  <p className="type-meta">
                    Enable Captain Mode in settings to manage lineups and create sessions.
                  </p>
                </div>
              </div>
            </section>
          </>
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
        <Link href="/matchups" className="nav-item nav-item-active">
          <Users size={20} />
          <span>Matches</span>
        </Link>
        <Link href="/standings" className="nav-item">
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
