'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTripStore, useAccessStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import { cn, formatPlayerName } from '@/lib/utils';
import type { Player } from '@/lib/types/models';
import { Users, Plus, Shield, Calendar, ChevronRight } from 'lucide-react';
import { EmptyStatePremium, NoSessionsEmpty } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { PageHeader } from '@/components/layout';

export default function MatchupsPage() {
  const router = useRouter();
  const { currentTrip, sessions, teams, players, teamMembers } = useTripStore(useShallow(s => ({ currentTrip: s.currentTrip, sessions: s.sessions, teams: s.teams, players: s.players, teamMembers: s.teamMembers })));
  const { isCaptainMode } = useAccessStore(useShallow(s => ({ isCaptainMode: s.isCaptainMode })));

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
  const liveSessions = sessions.filter((session) => session.status === 'inProgress').length;

  if (!currentTrip) {
    return (
      <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Matchups"
        subtitle={currentTrip.name}
        backFallback="/"
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
        <section className="pt-[var(--space-8)]">
          <div className="card-editorial overflow-hidden p-[var(--space-5)] sm:p-[var(--space-6)]">
            <div className="flex items-start justify-between gap-[var(--space-4)]">
              <div>
                <p className="type-overline text-[var(--masters)]">Staging Room</p>
                <h1 className="mt-[var(--space-2)] font-serif text-[length:var(--text-3xl)] font-normal tracking-[-0.03em] text-[var(--ink)]">
                  Matchups and session routing
                </h1>
                <p className="mt-[var(--space-2)] max-w-2xl text-sm text-[var(--ink-secondary)]">
                  See both sides of the cup, confirm the roster depth, and jump into the right
                  session without hunting through utilitarian lists.
                </p>
              </div>
              {isCaptainMode && (
                <Link
                  href="/players"
                  className="inline-flex items-center gap-2 rounded-full bg-[var(--masters)] px-4 py-2 text-sm font-semibold text-[var(--canvas)]"
                >
                  <Plus size={16} strokeWidth={2} />
                  Manage Players
                </Link>
              )}
            </div>

            <div className="mt-[var(--space-6)] grid grid-cols-3 gap-3">
              <MatchupsFact label={teamA?.name || 'USA'} value={teamAPlayers.length} />
              <MatchupsFact label="Sessions" value={sessions.length} />
              <MatchupsFact label="Live" value={liveSessions} />
            </div>
          </div>
        </section>

        <section className="section">
          <div className="mb-[var(--space-5)]">
            <p className="type-overline text-[var(--ink-secondary)]">Team Rosters</p>
            <h2 className="mt-[var(--space-2)] font-serif text-[length:var(--text-2xl)] font-normal tracking-[-0.02em] text-[var(--ink)]">
              Two sides of the card
            </h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <RosterCard
              tone="usa"
              teamName={teamA?.name || 'USA'}
              players={teamAPlayers}
            />
            <RosterCard
              tone="europe"
              teamName={teamB?.name || 'Europe'}
              players={teamBPlayers}
            />
          </div>
        </section>

        <section className="section-sm">
          <div className="mb-[var(--space-5)] flex items-end justify-between gap-4">
            <div>
              <p className="type-overline text-[var(--ink-secondary)]">Sessions</p>
              <h2 className="mt-[var(--space-2)] font-serif text-[length:var(--text-2xl)] font-normal tracking-[-0.02em] text-[var(--ink)]">
                Today’s order of play
              </h2>
            </div>
            {isCaptainMode && (
              <button
                onClick={() => router.push('/lineup/new?mode=session')}
                className="inline-flex items-center gap-2 rounded-full border border-[color:var(--rule)] bg-[color:var(--canvas)] px-4 py-2 text-sm font-semibold text-[var(--masters)]"
              >
                <Plus size={16} strokeWidth={2} />
                Add Session
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
              <Button
                variant="primary"
                onClick={() => router.push('/players?panel=draft')}
                leftIcon={<Users size={14} />}
                className="press-scale"
                style={{ marginTop: 'var(--space-3)', padding: 'var(--space-2) var(--space-4)', fontSize: 'var(--text-sm)' }}
              >
                Assign Players to Teams
              </Button>
            </div>
          )}

          {sessions.length > 0 ? (
            <div className="space-y-3">
              {sessions.map(session => (
                <button
                  key={session.id}
                  onClick={() => router.push(`/lineup/${session.id}`)}
                  className="card-editorial card-interactive w-full overflow-hidden p-[var(--space-4)] text-left"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 gap-3">
                      <div className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-[color:var(--rule)] bg-[color:var(--canvas)]/78">
                        <Calendar size={18} strokeWidth={1.6} className="text-[var(--ink-tertiary)]" />
                      </div>
                      <div className="min-w-0">
                        <p className="type-title-sm">{session.name}</p>
                        <p className="mt-1 text-sm capitalize text-[var(--ink-secondary)]">
                          {session.sessionType}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <SessionStatePill status={session.status} />
                      <ChevronRight size={18} strokeWidth={1.5} className="text-[var(--ink-tertiary)]" />
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <NoSessionsEmpty
              isCaptain={isCaptainMode}
              onCreateSession={() => router.push('/lineup/new?mode=session')}
            />
          )}
        </section>

        {/* Captain Mode Hint */}
        {!isCaptainMode && sessions.length > 0 && (
          <>
            <section className="section-sm">
              <div className="card-editorial flex items-start gap-[var(--space-4)] p-[var(--space-5)]">
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

    </div>
  );
}

function MatchupsFact({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[20px] border border-[color:var(--rule)]/75 bg-[color:var(--canvas)]/72 px-3 py-3 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
        {label}
      </p>
      <p className="mt-1 font-serif text-[length:var(--text-xl)] text-[var(--ink)]">{value}</p>
    </div>
  );
}

function RosterCard({
  tone,
  teamName,
  players,
}: {
  tone: 'usa' | 'europe';
  teamName: string;
  players: Player[];
}) {
  const accent = tone === 'usa' ? 'var(--team-usa)' : 'var(--team-europe)';
  const background =
    tone === 'usa'
      ? 'linear-gradient(180deg, rgba(20,92,163,0.10) 0%, rgba(255,255,255,0.78) 100%)'
      : 'linear-gradient(180deg, rgba(114,47,55,0.10) 0%, rgba(255,255,255,0.78) 100%)';

  return (
    <div
      className="overflow-hidden rounded-[28px] border p-[var(--space-5)] shadow-card"
      style={{ borderColor: `${accent}26`, background }}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'inline-flex h-11 w-11 items-center justify-center rounded-2xl text-sm font-semibold text-[var(--canvas)]',
            tone === 'usa' ? 'bg-[color:var(--team-usa)]' : 'bg-[color:var(--team-europe)]'
          )}
        >
          {players.length}
        </span>
        <div>
          <p className="type-overline" style={{ color: accent }}>
            {teamName}
          </p>
          <p className="mt-1 text-sm text-[var(--ink-secondary)]">
            {players.length > 0 ? 'Ready for pairings' : 'No players assigned yet'}
          </p>
        </div>
      </div>

      <div className="mt-[var(--space-5)] space-y-2">
        {players.length > 0 ? (
          players.map((player) => (
            <div
              key={player.id}
              className="flex items-center justify-between rounded-[20px] border border-[color:var(--rule)]/70 bg-[color:var(--canvas)]/72 px-4 py-3"
            >
              <div>
                <p className="type-title-sm">
                  {formatPlayerName(player.firstName, player.lastName, 'short')}
                </p>
                <p className="mt-1 text-xs text-[var(--ink-tertiary)]">
                  {player.handicapIndex !== undefined
                    ? `${player.handicapIndex.toFixed(1)} handicap`
                    : 'Handicap pending'}
                </p>
              </div>
              <span
                className="rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]"
                style={{ background: `${accent}15`, color: accent }}
              >
                {player.handicapIndex !== undefined ? `${player.handicapIndex.toFixed(1)} HCP` : 'TBD'}
              </span>
            </div>
          ))
        ) : (
          <div className="rounded-[20px] border border-dashed border-[color:var(--rule)] bg-[color:var(--canvas)]/55 px-4 py-6 text-center text-sm text-[var(--ink-secondary)]">
            No players yet
          </div>
        )}
      </div>
    </div>
  );
}

function SessionStatePill({ status }: { status: 'scheduled' | 'inProgress' | 'completed' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]',
        status === 'inProgress'
          ? 'bg-[color:rgba(0,102,68,0.12)] text-[var(--masters)]'
          : status === 'completed'
            ? 'bg-[color:rgba(76,175,80,0.12)] text-[var(--success)]'
            : 'bg-[color:rgba(26,24,21,0.08)] text-[var(--ink-secondary)]'
      )}
    >
      {status === 'inProgress' ? 'Live' : status === 'completed' ? 'Complete' : 'Upcoming'}
    </span>
  );
}
