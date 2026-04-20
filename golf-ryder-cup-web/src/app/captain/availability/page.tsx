'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  AttendanceCheckIn,
  type AttendeePlayer,
  type AttendanceStatus,
} from '@/components/captain';
import {
  CaptainModeRequiredState,
  CaptainNoTripState,
} from '@/components/captain/CaptainAccessState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { db } from '@/lib/db';
import { removePlayerFromMatch } from '@/lib/services/matchLineupService';
import { useTripStore, useAccessStore, useToastStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  CalendarDays,
  Clock3,
  RefreshCw,
  Shield,
  UserCheck,
  UserMinus,
  Users,
} from 'lucide-react';

type AttendanceRecord = {
  status: AttendanceStatus;
  eta?: string;
};

export default function AvailabilityPage() {
  const router = useRouter();
  const { currentTrip, players, sessions, teams, teamMembers } = useTripStore(useShallow(s => ({ currentTrip: s.currentTrip, players: s.players, sessions: s.sessions, teams: s.teams, teamMembers: s.teamMembers })));
  const { isCaptainMode } = useAccessStore(useShallow(s => ({ isCaptainMode: s.isCaptainMode })));
  const { showToast } = useToastStore(useShallow(s => ({ showToast: s.showToast })));

  const [attendanceMap, setAttendanceMap] = useState<Map<string, AttendanceRecord>>(new Map());
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const sessionInitialized = React.useRef(false);

  const activeSessions = useMemo(
    () => sessions.filter((session) => session.status === 'inProgress' || session.status === 'scheduled'),
    [sessions]
  );

  useEffect(() => {
    if (!sessionInitialized.current && !selectedSession && activeSessions.length > 0) {
      sessionInitialized.current = true;
      const timeoutId = setTimeout(() => setSelectedSession(activeSessions[0].id), 0);
      return () => clearTimeout(timeoutId);
    }
  }, [activeSessions, selectedSession]);

  const getPlayerTeam = useCallback(
    (playerId: string): 'A' | 'B' => {
      const membership = teamMembers.find((teamMember) => teamMember.playerId === playerId);
      if (!membership) {
        return 'A';
      }

      const team = teams.find((candidate) => candidate.id === membership.teamId);
      return team?.color === 'europe' ? 'B' : 'A';
    },
    [teamMembers, teams]
  );

  const attendeePlayers = useMemo<AttendeePlayer[]>(
    () =>
      players.map((player) => {
        const attendance = attendanceMap.get(player.id);

        return {
          id: player.id,
          firstName: player.firstName,
          lastName: player.lastName,
          teamId: getPlayerTeam(player.id),
          handicapIndex: player.handicapIndex ?? 0,
          email: player.email,
          avatarUrl: player.avatarUrl,
          status: attendance?.status || 'not-arrived',
          eta: attendance?.eta,
        };
      }),
    [attendanceMap, getPlayerTeam, players]
  );

  const attendanceStats = useMemo(
    () =>
      attendeePlayers.reduce(
        (stats, player) => {
          stats.total += 1;
          if (player.status === 'checked-in') stats.checkedIn += 1;
          if (player.status === 'en-route') stats.enRoute += 1;
          if (player.status === 'not-arrived') stats.notArrived += 1;
          if (player.status === 'no-show') stats.noShow += 1;
          return stats;
        },
        {
          total: 0,
          checkedIn: 0,
          enRoute: 0,
          notArrived: 0,
          noShow: 0,
        }
      ),
    [attendeePlayers]
  );

  const currentSession =
    sessions.find((session) => session.id === selectedSession) ?? activeSessions[0] ?? null;
  const accountedFor = attendanceStats.checkedIn + attendanceStats.enRoute;
  const attentionCount = attendanceStats.notArrived + attendanceStats.noShow;
  const firstTeeTime =
    currentSession?.timeSlot === 'AM' ? '08:00' : currentSession?.timeSlot === 'PM' ? '13:00' : undefined;

  const teamA = teams.find((team) => team.color === 'usa');
  const teamB = teams.find((team) => team.color === 'europe');
  const teamLabels = {
    A: teamA?.name || 'Team A',
    B: teamB?.name || 'Team B',
  };

  const handleUpdateStatus = useCallback(
    (playerId: string, status: AttendanceStatus, eta?: string) => {
      setAttendanceMap((previous) => {
        const next = new Map(previous);
        next.set(playerId, { status, eta });
        return next;
      });

      const player = players.find((candidate) => candidate.id === playerId);
      if (!player) {
        return;
      }

      const statusLabels: Record<AttendanceStatus, string> = {
        'checked-in': 'checked in',
        'en-route': 'marked en route',
        'not-arrived': 'marked as not arrived',
        'no-show': 'marked as no-show',
      };
      showToast('info', `${player.firstName} ${statusLabels[status]}`);
    },
    [players, showToast]
  );

  const handleCall = useCallback(
    (playerId: string) => {
      const player = players.find((candidate) => candidate.id === playerId);
      if (player) {
        showToast('info', `Calling ${player.firstName}...`);
      }
    },
    [players, showToast]
  );

  const handleText = useCallback(
    (playerId: string) => {
      const player = players.find((candidate) => candidate.id === playerId);
      if (player) {
        showToast('info', `Opening text to ${player.firstName}...`);
      }
    },
    [players, showToast]
  );

  const handleRefresh = useCallback(() => {
    showToast('info', 'Refreshing attendance data...');
  }, [showToast]);

  // Live lookup of all scheduled matches containing no-show players.
  // Drives the "pull from lineup" secondary panel below — captains can
  // actually act on no-show status instead of just tagging it.
  const noShowPlayerIds = useMemo(
    () =>
      attendeePlayers
        .filter((player) => player.status === 'no-show')
        .map((player) => player.id),
    [attendeePlayers],
  );

  const scheduledMatchesWithNoShows = useLiveQuery(
    async () => {
      if (noShowPlayerIds.length === 0) return [];
      const allMatches = await db.matches.toArray();
      const relevantSessions = new Set(sessions.map((s) => s.id));
      return allMatches.filter(
        (match) =>
          relevantSessions.has(match.sessionId) &&
          match.status === 'scheduled' &&
          (match.teamAPlayerIds.some((id) => noShowPlayerIds.includes(id)) ||
            match.teamBPlayerIds.some((id) => noShowPlayerIds.includes(id))),
      );
    },
    [noShowPlayerIds.join('|'), sessions.map((s) => s.id).join('|')],
    [],
  );

  const handlePullNoShowFromMatch = useCallback(
    async (matchId: string, playerId: string) => {
      try {
        const result = await removePlayerFromMatch({
          matchId,
          playerId,
          actorName: 'Captain',
          reason: 'no-show',
        });
        if (result.removedFrom) {
          showToast(
            result.unbalanced ? 'warning' : 'success',
            result.unbalanced
              ? 'Player removed — match is now unbalanced. Consider a substitution.'
              : 'Player removed from match.',
          );
        }
      } catch (error) {
        showToast(
          'error',
          error instanceof Error ? error.message : 'Could not remove player from match.',
        );
      }
    },
    [showToast],
  );

  if (!currentTrip) {
    return <CaptainNoTripState description="Start or select a trip to manage attendance." />;
  }

  if (!isCaptainMode) {
    return <CaptainModeRequiredState description="Turn on Captain Mode to access attendance." />;
  }

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Availability"
        subtitle={currentTrip.name}
        icon={<UserCheck size={16} className="text-[var(--canvas)]" />}
        iconTone="captain"
        backFallback="/captain"
        rightSlot={
          <Button
            variant="primary"
            onClick={handleRefresh}
            leftIcon={<RefreshCw size={16} />}
            size="sm"
            aria-label="Refresh attendance"
          >
            Refresh
          </Button>
        }
      />

      <main className="container-editorial py-[var(--space-6)] pb-[var(--space-12)]">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--maroon-subtle)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,240,241,0.98))] shadow-[0_24px_52px_rgba(46,34,18,0.08)]">
          <div className="grid gap-[var(--space-5)] px-[var(--space-5)] py-[var(--space-5)] lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.95fr)]">
            <div>
              <p className="type-overline tracking-[0.18em] text-[var(--maroon)]">Captain Logistics</p>
              <h1 className="mt-[var(--space-2)] font-serif text-[clamp(2rem,7vw,3.25rem)] italic leading-[1.02] text-[var(--ink)]">
                Know who is on property before the first tee.
              </h1>
              <p className="mt-[var(--space-3)] max-w-[34rem] type-body-sm text-[var(--ink-secondary)]">
                Attendance is a small detail right up until it blows up the routing. Keep arrivals, ETAs,
                and no-shows on one board so the lineup still feels deliberate when the day starts moving.
              </p>

              <div className="mt-[var(--space-5)] flex flex-wrap gap-[var(--space-3)]">
                <Button variant="primary" onClick={handleRefresh} leftIcon={<RefreshCw size={16} />}>
                  Refresh board
                </Button>
                <Link
                  href="/players"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[color:var(--rule)]/55 bg-[color:var(--surface)]/78 px-[var(--space-4)] py-[var(--space-3)] text-sm font-semibold text-[var(--ink)] transition-transform duration-150 hover:scale-[1.02] hover:border-[var(--maroon-subtle)] hover:bg-[var(--surface)]"
                >
                  Open roster
                </Link>
              </div>
            </div>

            <div className="grid gap-[var(--space-3)] sm:grid-cols-3 lg:grid-cols-1">
              <AvailabilityFactCard
                icon={<CalendarDays size={18} />}
                label="Session"
                value={currentSession?.name || 'No session selected'}
                detail={
                  currentSession?.status === 'inProgress'
                    ? 'Live session'
                    : currentSession
                      ? 'Next session on deck'
                      : 'Pick a session to monitor'
                }
              />
              <AvailabilityFactCard
                icon={<Shield size={18} />}
                label="Accounted For"
                value={`${accountedFor}/${attendanceStats.total || players.length || 0}`}
                detail="Checked in or en route"
                tone="green"
              />
              <AvailabilityFactCard
                icon={<AlertTriangle size={18} />}
                label="Needs Attention"
                value={attentionCount}
                detail="Still missing or marked absent"
                tone={attentionCount > 0 ? 'maroon' : 'ink'}
              />
            </div>
          </div>

          {activeSessions.length > 1 ? (
            <div className="border-t border-[color:var(--rule)]/75 px-[var(--space-5)] py-[var(--space-4)]">
              <div className="flex flex-col gap-[var(--space-3)] sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">Session Board</p>
                  <p className="mt-[var(--space-1)] type-caption text-[var(--ink-secondary)]">
                    Shift the board to the round you’re actually trying to protect.
                  </p>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                  {activeSessions.map((session) => (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => setSelectedSession(session.id)}
                      className={cn(
                        'rounded-full border px-[var(--space-4)] py-[var(--space-2)] text-sm font-semibold whitespace-nowrap transition-all',
                        selectedSession === session.id
                          ? 'border-[var(--maroon)] bg-[var(--maroon)] text-[var(--canvas)] shadow-[0_10px_24px_rgba(104,35,48,0.18)]'
                          : 'border-[color:var(--rule)]/65 bg-[color:var(--surface)]/78 text-[var(--ink-secondary)] hover:border-[var(--maroon-subtle)] hover:text-[var(--ink)]'
                      )}
                    >
                      {session.name}
                      {session.status === 'inProgress' ? (
                        <span className="ml-2 inline-flex h-2 w-2 rounded-full bg-[color:var(--canvas)] align-middle" />
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </section>

        {players.length > 0 ? (
          <section className="mt-[var(--space-6)]">
            <div className="mb-[var(--space-3)] flex flex-col gap-[var(--space-2)] sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">Arrival Board</p>
                <p className="mt-[var(--space-1)] type-body-sm text-[var(--ink-secondary)]">
                  Mark arrivals quickly, set ETAs when the parking lot starts lagging, and keep one eye on
                  the first tee.
                </p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--rule)]/65 bg-[color:var(--surface)]/75 px-[var(--space-3)] py-[var(--space-2)] text-sm text-[var(--ink-secondary)]">
                <Clock3 size={14} />
                {firstTeeTime ? `First tee target ${firstTeeTime}` : 'No tee time set'}
              </div>
            </div>

            <AttendanceCheckIn
              players={attendeePlayers}
              onUpdateStatus={handleUpdateStatus}
              onCall={handleCall}
              onText={handleText}
              onRefresh={handleRefresh}
              sessionName={currentSession?.name || "Today's Session"}
              firstTeeTime={firstTeeTime}
              teamLabels={teamLabels}
            />

            {scheduledMatchesWithNoShows && scheduledMatchesWithNoShows.length > 0 && (
              <section className="mt-[var(--space-6)] rounded-[1.6rem] border border-[color:var(--error)]/30 bg-[color:var(--error)]/8 p-[var(--space-5)] shadow-[0_18px_38px_rgba(110,35,35,0.08)]">
                <div className="flex items-start gap-[var(--space-3)]">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[1rem] bg-[color:var(--error)]/15 text-[var(--error)]">
                    <UserMinus size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="type-overline tracking-[0.15em] text-[var(--error)]">Pull from Lineup</p>
                    <h3 className="mt-[var(--space-1)] font-serif text-[1.3rem] italic text-[var(--ink)]">
                      No-shows still in scheduled matches
                    </h3>
                    <p className="mt-[var(--space-2)] type-body-sm text-[var(--ink-secondary)]">
                      These players are marked no-show but still listed in scheduled lineups.
                      Remove them so handicap strokes recalculate and the match isn&rsquo;t
                      carrying a phantom competitor.
                    </p>
                  </div>
                </div>

                <ul className="mt-[var(--space-4)] space-y-[var(--space-3)]">
                  {scheduledMatchesWithNoShows.flatMap((match) => {
                    const session = sessions.find((s) => s.id === match.sessionId);
                    const rows: React.ReactNode[] = [];
                    for (const playerId of noShowPlayerIds) {
                      const onTeamA = match.teamAPlayerIds.includes(playerId);
                      const onTeamB = match.teamBPlayerIds.includes(playerId);
                      if (!onTeamA && !onTeamB) continue;
                      const player = players.find((p) => p.id === playerId);
                      if (!player) continue;
                      rows.push(
                        <li
                          key={`${match.id}-${playerId}`}
                          className="flex flex-wrap items-center justify-between gap-[var(--space-3)] rounded-[1.2rem] border border-[color:var(--rule)]/55 bg-[var(--canvas)]/88 px-[var(--space-4)] py-[var(--space-3)]"
                        >
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[var(--ink)]">
                              {player.firstName} {player.lastName}
                            </p>
                            <p className="text-xs text-[var(--ink-tertiary)]">
                              {session?.name ?? 'Session'} · Match {match.matchOrder} ·{' '}
                              {onTeamA ? teamLabels.A : teamLabels.B}
                            </p>
                          </div>
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<UserMinus size={14} />}
                            onClick={() => handlePullNoShowFromMatch(match.id, playerId)}
                          >
                            Remove
                          </Button>
                        </li>,
                      );
                    }
                    return rows;
                  })}
                </ul>
              </section>
            )}
          </section>
        ) : (
          <section className="mt-[var(--space-6)]">
            <div className="rounded-[2rem] border border-[color:var(--rule)]/70 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(245,239,232,0.98))] p-[var(--space-7)] text-center shadow-[0_20px_46px_rgba(41,29,17,0.07)]">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-[var(--surface-raised)] text-[var(--ink-tertiary)]">
                <Users size={28} />
              </div>
              <h2 className="mt-[var(--space-4)] font-serif text-[1.8rem] italic text-[var(--ink)]">
                The board has no roster.
              </h2>
              <p className="mx-auto mt-[var(--space-2)] max-w-[28rem] type-body-sm text-[var(--ink-secondary)]">
                Add players before you try to run attendance. A captain board without names is just a weather report.
              </p>
              <Link
                href="/players"
                className="mt-[var(--space-5)] inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--maroon)] px-[var(--space-5)] py-[var(--space-3)] text-sm font-semibold text-[var(--canvas)] shadow-[0_12px_28px_rgba(104,35,48,0.22)] transition-transform duration-150 hover:scale-[1.02]"
              >
                Add players
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function AvailabilityFactCard({
  icon,
  label,
  value,
  detail,
  tone = 'ink',
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  detail: string;
  tone?: 'ink' | 'green' | 'maroon';
}) {
  const toneStyles = {
    ink: 'border-[color:var(--rule)]/70 bg-[color:var(--surface)]/78 text-[var(--ink)]',
    green:
      'border-[color:var(--success)]/16 bg-[linear-gradient(180deg,rgba(45,122,79,0.10),rgba(255,255,255,0.98))] text-[var(--ink)]',
    maroon:
      'border-[color:var(--maroon)]/16 bg-[linear-gradient(180deg,rgba(104,35,48,0.10),rgba(255,255,255,0.98))] text-[var(--ink)]',
  } satisfies Record<'ink' | 'green' | 'maroon', string>;

  return (
    <div className={cn('rounded-[1.5rem] border p-[var(--space-4)] shadow-[0_16px_34px_rgba(41,29,17,0.05)]', toneStyles[tone])}>
      <div className="flex items-center gap-[var(--space-2)] text-[var(--ink-tertiary)]">{icon}<span className="type-overline tracking-[0.14em]">{label}</span></div>
      <p className="mt-[var(--space-3)] font-serif text-[1.95rem] italic leading-none text-[var(--ink)]">
        {value}
      </p>
      <p className="mt-[var(--space-2)] text-sm text-[var(--ink-secondary)]">{detail}</p>
    </div>
  );
}
