'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTripStore, useUIStore } from '@/lib/stores';
import { formatPlayerName } from '@/lib/utils';
import { Users, Plus, Shield, Calendar, ChevronRight } from 'lucide-react';
import { EmptyStatePremium, NoSessionsPremiumEmpty } from '@/components/ui';
import { BottomNav, PageHeader } from '@/components/layout';

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

  // If no active trip selected, show an explicit empty state (no redirect).

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

  if (!currentTrip) {
    return (
      <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="trophy"
            title="No active trip"
            description="Start or select a trip to view matchups."
            action={{ label: 'Go Home', onClick: () => router.push('/') }}
            secondaryAction={{ label: 'More', onClick: () => router.push('/more') }}
            variant="large"
          />
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Matchups"
        subtitle={currentTrip.name}
        onBack={() => router.back()}
        icon={<Users size={16} style={{ color: 'var(--color-accent)' }} />}
        rightSlot={
          isCaptainMode ? (
            <Link
              href="/players"
              className="btn-premium flex items-center gap-1 press-scale"
              style={{ padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--text-sm)' }}
            >
              <Plus size={16} strokeWidth={2} />
              Manage
            </Link>
          ) : null
        }
      />

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

          {/* Guard rail: warn captain if teams aren't ready */}
          {isCaptainMode && sessions.length === 0 && (teamAPlayers.length < 2 || teamBPlayers.length < 2) && (
            <div
              className="card-editorial"
              style={{
                padding: 'var(--space-4)',
                marginBottom: 'var(--space-4)',
                borderLeft: '3px solid var(--warning)',
                background: 'var(--canvas-sunken)',
              }}
            >
              <p className="type-title-sm" style={{ marginBottom: 'var(--space-1)' }}>
                Teams need more players
              </p>
              <p className="type-caption text-[var(--ink-secondary)]">
                Each team needs at least 2 players before you can create a session.
                {teamAPlayers.length < 2 && ` ${teamA?.name || 'USA'} has ${teamAPlayers.length}.`}
                {teamBPlayers.length < 2 && ` ${teamB?.name || 'Europe'} has ${teamBPlayers.length}.`}
              </p>
              <button
                onClick={() => router.push('/captain/draft')}
                className="btn-premium press-scale"
                style={{ marginTop: 'var(--space-3)', padding: 'var(--space-2) var(--space-4)', fontSize: 'var(--text-sm)' }}
              >
                <Users size={14} style={{ marginRight: '4px' }} />
                Assign Players to Teams
              </button>
            </div>
          )}

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

      <BottomNav />
    </div>
  );
}
