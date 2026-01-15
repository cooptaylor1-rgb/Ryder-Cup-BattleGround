'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTripStore, useUIStore } from '@/lib/stores';
import { formatPlayerName } from '@/lib/utils';
import { Users, Plus, Shield, Calendar, ChevronRight, Home, Target, Trophy, MoreHorizontal, ChevronLeft, CalendarDays } from 'lucide-react';
import { NoSessionsPremiumEmpty } from '@/components/ui';

/**
 * MATCHUPS PAGE — Team Rosters & Sessions
 *
 * Design Philosophy:
 * - Team columns with clear color identity
 * - Player names with handicaps for context
 * - Sessions as navigable rows
 * - Captain mode hints are subtle, not intrusive
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
    <div className="min-h-screen pb-nav page-enter" style={{ background: 'var(--canvas)' }}>
      {/* Header */}
      <header className="header">
        <div className="container-editorial flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 press-scale"
              style={{ color: 'var(--ink-secondary)' }}
              aria-label="Back"
            >
              <ChevronLeft size={22} strokeWidth={1.75} />
            </button>
            <div>
              <span className="type-overline">Matchups</span>
              <p className="type-caption truncate" style={{ marginTop: '2px' }}>
                {currentTrip.name}
              </p>
            </div>
          </div>
          {isCaptainMode && (
            <Link
              href="/players"
              className="flex items-center gap-1 press-scale"
              style={{ color: 'var(--masters)', fontWeight: 500, fontSize: 'var(--text-sm)' }}
            >
              <Plus size={16} strokeWidth={2} />
              Manage
            </Link>
          )}
        </div>
      </header>

      <main className="container-editorial">
        {/* Team Rosters */}
        <section className="section">
          <h2 className="type-overline" style={{ marginBottom: 'var(--space-6)' }}>
            Team Rosters
          </h2>

          <div className="grid grid-cols-2 gap-6">
            {/* Team USA */}
            <div className="team-bg-usa" style={{ padding: 'var(--space-4)', margin: 'calc(-1 * var(--space-4))', borderRadius: 'var(--radius-lg)' }}>
              <div
                className="flex items-center gap-2"
                style={{ marginBottom: 'var(--space-4)' }}
              >
                <span className="team-dot-xl team-dot-usa" />
                <span className="team-badge team-badge-solid-usa">
                  {teamA?.name || 'USA'}
                </span>
              </div>
              {teamAPlayers.length > 0 ? (
                <div>
                  {teamAPlayers.map(player => (
                    <div
                      key={player.id}
                      className="team-row team-row-usa"
                      style={{
                        padding: 'var(--space-3) var(--space-2)',
                        marginLeft: 'calc(-1 * var(--space-2))',
                        marginRight: 'calc(-1 * var(--space-2))',
                        borderRadius: 'var(--radius-sm)',
                        borderBottom: '1px solid var(--rule-faint)'
                      }}
                    >
                      <p className="type-title-sm">
                        {formatPlayerName(player.firstName, player.lastName, 'short')}
                      </p>
                      {player.handicapIndex !== undefined && (
                        <p className="type-micro" style={{ marginTop: '2px' }}>
                          {player.handicapIndex.toFixed(1)} HCP
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="type-caption" style={{ color: 'var(--team-usa-muted)' }}>No players</p>
              )}
            </div>

            {/* Team Europe */}
            <div className="team-bg-europe" style={{ padding: 'var(--space-4)', margin: 'calc(-1 * var(--space-4))', borderRadius: 'var(--radius-lg)' }}>
              <div
                className="flex items-center gap-2"
                style={{ marginBottom: 'var(--space-4)' }}
              >
                <span className="team-dot-xl team-dot-europe" />
                <span className="team-badge team-badge-solid-europe">
                  {teamB?.name || 'Europe'}
                </span>
              </div>
              {teamBPlayers.length > 0 ? (
                <div>
                  {teamBPlayers.map(player => (
                    <div
                      key={player.id}
                      className="team-row team-row-europe"
                      style={{
                        padding: 'var(--space-3) var(--space-2)',
                        marginLeft: 'calc(-1 * var(--space-2))',
                        marginRight: 'calc(-1 * var(--space-2))',
                        borderRadius: 'var(--radius-sm)',
                        borderBottom: '1px solid var(--rule-faint)'
                      }}
                    >
                      <p className="type-title-sm">
                        {formatPlayerName(player.firstName, player.lastName, 'short')}
                      </p>
                      {player.handicapIndex !== undefined && (
                        <p className="type-micro" style={{ marginTop: '2px' }}>
                          {player.handicapIndex.toFixed(1)} HCP
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="type-caption" style={{ color: 'var(--team-europe-muted)' }}>No players</p>
              )}
            </div>
          </div>
        </section>

        <hr className="divider-lg" />

        {/* Sessions */}
        <section className="section-sm">
          <div
            className="flex items-center justify-between"
            style={{ marginBottom: 'var(--space-6)' }}
          >
            <h2 className="type-overline">Sessions</h2>
            {isCaptainMode && (
              <button
                onClick={() => router.push('/lineup/new')}
                className="flex items-center gap-1"
                style={{ color: 'var(--masters)', fontWeight: 500, fontSize: 'var(--text-sm)' }}
              >
                <Plus size={16} strokeWidth={2} />
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
                  <Calendar size={20} strokeWidth={1.5} style={{ color: 'var(--ink-tertiary)' }} />
                  <div className="flex-1">
                    <p className="type-title-sm">{session.name}</p>
                    <p className="type-micro capitalize" style={{ marginTop: '2px' }}>
                      {session.sessionType}
                    </p>
                  </div>
                  <span
                    className="type-caption"
                    style={{
                      fontWeight: 500,
                      color: session.status === 'inProgress' ? 'var(--masters)' :
                        session.status === 'completed' ? 'var(--success)' : 'var(--ink-tertiary)'
                    }}
                  >
                    {session.status === 'inProgress' ? 'Live' :
                      session.status === 'completed' ? 'Complete' : 'Upcoming'}
                  </span>
                  <ChevronRight size={20} strokeWidth={1.5} style={{ color: 'var(--ink-tertiary)' }} />
                </button>
              ))}
            </div>
          ) : (
            <NoSessionsPremiumEmpty 
              isCaptain={isCaptainMode}
              onCreateSession={() => router.push('/lineup/new')}
            />
          )}
        </section>

        {/* Captain Mode Hint */}
        {!isCaptainMode && sessions.length > 0 && (
          <>
            <hr className="divider" />
            <section className="section-sm">
              <div
                className="card"
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'var(--space-4)',
                  padding: 'var(--space-5)'
                }}
              >
                <Shield size={20} strokeWidth={1.5} style={{ color: 'var(--masters)', flexShrink: 0 }} />
                <div>
                  <p className="type-title-sm" style={{ marginBottom: 'var(--space-1)' }}>
                    Captain Mode
                  </p>
                  <p className="type-caption">
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
        <Link href="/matchups" className="nav-item nav-item-active">
          <Users size={22} strokeWidth={1.75} />
          <span>Matches</span>
        </Link>
        <Link href="/standings" className="nav-item">
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
