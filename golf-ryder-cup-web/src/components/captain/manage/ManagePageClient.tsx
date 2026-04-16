'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  CalendarDays,
  Map,
  Plus,
  Settings,
  Shield,
  Trophy,
  Users,
} from 'lucide-react';

import {
  CaptainModeRequiredState,
  CaptainNoTripState,
} from '@/components/captain/CaptainAccessState';
import { PageHeader } from '@/components/layout';
import {
  EmptyManageCard,
  ManageFactCard,
  ManageSectionHeading,
  PlayerManagementCard,
  SessionManagementCard,
} from '@/components/captain/manage/ManagePageSections';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { db } from '@/lib/db';
import { deleteMatchCascade, deleteSessionCascade } from '@/lib/services/cascadeDelete';
import { useTripStore, useAccessStore, useToastStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import type { Match, Player, RyderCupSession } from '@/lib/types/models';
import { captainLogger } from '@/lib/utils/logger';
import { navigateBackOr } from '@/lib/utils/navigation';

import {
  buildPlayerById,
  buildPlayerTeamMap,
  buildSessionsWithMatches,
  buildTeamById,
  countCompletedSessions,
  countLiveMatches,
  countLockedSessions,
  countPlayersWithoutHandicap,
} from './managePageModel';

export function ManagePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentTrip, players, teams, teamMembers, courses, teeSets } = useTripStore(useShallow(s => ({ currentTrip: s.currentTrip, players: s.players, teams: s.teams, teamMembers: s.teamMembers, courses: s.courses, teeSets: s.teeSets })));
  const { isCaptainMode } = useAccessStore(useShallow(s => ({ isCaptainMode: s.isCaptainMode })));
  const { showToast } = useToastStore(useShallow(s => ({ showToast: s.showToast })));
  const { showConfirm, ConfirmDialogComponent } = useConfirmDialog();

  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const requestedSessionId = searchParams?.get('sessionId') ?? null;
  const requestedMatchId = searchParams?.get('matchId') ?? null;
  const requestedFocus = searchParams?.get('focus') ?? null;

  const sessions = useLiveQuery(
    async () =>
      currentTrip ? await db.sessions.where('tripId').equals(currentTrip.id).toArray() : [],
    [currentTrip?.id],
    [] as RyderCupSession[]
  );

  // Scope matches to the current trip's sessions. The previous
  // implementation loaded db.matches.toArray() — every match the device
  // has ever seen — and relied on buildSessionsWithMatches to filter.
  // On a device with 50+ sessions this caused perceptible lag on every
  // tab switch.
  const sessionIds = useMemo(() => sessions.map((s) => s.id), [sessions]);
  const matches = useLiveQuery(
    async () =>
      sessionIds.length > 0
        ? db.matches.where('sessionId').anyOf(sessionIds).toArray()
        : [],
    [sessionIds.join(',')],
    [] as Match[]
  );

  const teamById = useMemo(() => buildTeamById(teams), [teams]);
  const playerById = useMemo(() => buildPlayerById(players), [players]);
  const playerTeamMap = useMemo(() => buildPlayerTeamMap(teamMembers), [teamMembers]);

  const teamA = teams.find((team) => team.color === 'usa');
  const teamB = teams.find((team) => team.color === 'europe');
  const teamAName = teamA?.name || 'Team A';
  const teamBName = teamB?.name || 'Team B';

  const sessionsWithMatches = useMemo(
    () => buildSessionsWithMatches(sessions, matches),
    [matches, sessions]
  );

  const completedSessions = useMemo(
    () => countCompletedSessions(sessionsWithMatches),
    [sessionsWithMatches]
  );
  const liveMatches = useMemo(() => countLiveMatches(matches), [matches]);
  const lockedSessions = useMemo(
    () => countLockedSessions(sessionsWithMatches),
    [sessionsWithMatches]
  );
  const playersWithoutHandicap = useMemo(
    () => countPlayersWithoutHandicap(players),
    [players]
  );

  const getTeamForPlayer = useCallback(
    (playerId: string) => {
      const teamId = playerTeamMap.get(playerId);
      return teamId ? teamById.get(teamId) : undefined;
    },
    [playerTeamMap, teamById]
  );

  const getPlayerNames = useCallback(
    (playerIds: string[]) =>
      playerIds
        .map((playerId) => playerById.get(playerId))
        .filter(Boolean)
        .map((player) => player!.firstName)
        .join(' & '),
    [playerById]
  );

  useEffect(() => {
    if (!sessionsWithMatches.length) {
      return;
    }

    const requestedSession =
      (requestedSessionId &&
        sessionsWithMatches.find((session) => session.id === requestedSessionId)) ||
      (requestedMatchId
        ? sessionsWithMatches.find((session) =>
            session.matches.some((match) => match.id === requestedMatchId)
          )
        : undefined);

    if (requestedSession) {
      setExpandedSessions((current) => {
        if (current.has(requestedSession.id)) {
          return current;
        }

        const next = new Set(current);
        next.add(requestedSession.id);
        return next;
      });
    }

    if (requestedFocus === 'course' && requestedMatchId) {
      setEditingMatch((current) => (current === requestedMatchId ? current : requestedMatchId));
    }
  }, [requestedFocus, requestedMatchId, requestedSessionId, sessionsWithMatches]);

  const executeDeleteMatch = useCallback(
    async (matchId: string) => {
      if (isSubmitting) return;
      setIsSubmitting(true);

      try {
        await deleteMatchCascade(matchId);
        showToast('success', 'Match deleted');
      } catch (error) {
        captainLogger.error('Failed to delete match:', error);
        showToast('error', 'Failed to delete match');
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, showToast]
  );

  const handleDeleteMatch = useCallback(
    (matchId: string) => {
      if (isSubmitting) return;

      showConfirm({
        title: 'Delete match',
        message: 'Are you sure you want to delete this match? All recorded scores will be lost.',
        confirmLabel: 'Delete Match',
        cancelLabel: 'Cancel',
        variant: 'danger',
        onConfirm: async () => {
          await executeDeleteMatch(matchId);
        },
      });
    },
    [executeDeleteMatch, isSubmitting, showConfirm]
  );

  const executeDeleteSession = useCallback(
    async (sessionId: string) => {
      if (isSubmitting) return;
      setIsSubmitting(true);

      try {
        await deleteSessionCascade(sessionId);
        showToast('success', 'Session deleted');
      } catch (error) {
        captainLogger.error('Failed to delete session:', error);
        showToast('error', 'Failed to delete session. Some data may be partially deleted.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, showToast]
  );

  const handleDeleteSession = useCallback(
    (sessionId: string) => {
      if (isSubmitting) return;

      showConfirm({
        title: 'Delete session',
        message:
          'Are you sure you want to delete this session? All matches and scores will be lost.',
        confirmLabel: 'Delete Session',
        cancelLabel: 'Cancel',
        variant: 'danger',
        onConfirm: async () => {
          await executeDeleteSession(sessionId);
        },
      });
    },
    [executeDeleteSession, isSubmitting, showConfirm]
  );

  const toggleSession = useCallback((sessionId: string) => {
    setExpandedSessions((current) => {
      const next = new Set(current);
      if (next.has(sessionId)) {
        next.delete(sessionId);
      } else {
        next.add(sessionId);
      }
      return next;
    });
  }, []);

  const handleUpdateSession = async (sessionId: string, updates: Partial<RyderCupSession>) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      await db.sessions.update(sessionId, { ...updates, updatedAt: new Date().toISOString() });
      showToast('success', 'Session updated');
    } catch (error) {
      captainLogger.error('Failed to update session:', error);
      showToast('error', 'Failed to update session');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateMatch = async (matchId: string, updates: Partial<Match>) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      await db.matches.update(matchId, { ...updates, updatedAt: new Date().toISOString() });
      showToast('success', 'Match updated');
      setEditingMatch(null);
    } catch (error) {
      captainLogger.error('Failed to update match:', error);
      showToast('error', 'Failed to update match');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePlayer = async (playerId: string, updates: Partial<Player>) => {
    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      await db.players.update(playerId, { ...updates, updatedAt: new Date().toISOString() });
      showToast('success', 'Player updated');
      setEditingPlayer(null);
    } catch (error) {
      captainLogger.error('Failed to update player:', error);
      showToast('error', 'Failed to update player');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!currentTrip) {
    return (
      <CaptainNoTripState description="Start or select a trip to manage sessions, matches, and player details." />
    );
  }

  if (!isCaptainMode) {
    return (
      <CaptainModeRequiredState description="Turn on Captain Mode before you start editing sessions, matches, or player handicaps." />
    );
  }

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]" data-testid="captain-manage-page">
      <PageHeader
        title="Manage Trip"
        subtitle={currentTrip.name}
        icon={<Settings size={16} className="text-[var(--color-accent)]" />}
        iconTone="neutral"
        onBack={() => navigateBackOr(router, '/captain')}
      />

      <main className="container-editorial py-[var(--space-6)] pb-[var(--space-12)]">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--rule)] bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(248,244,237,0.96))] shadow-[0_22px_48px_rgba(46,34,18,0.08)]">
          <div className="border-b border-[color:var(--rule)]/80 px-[var(--space-5)] py-[var(--space-5)]">
            <div className="flex flex-col gap-[var(--space-5)]">
              <div className="flex flex-col gap-[var(--space-4)] sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="type-overline tracking-[0.18em] text-[var(--ink-tertiary)]">
                    Command Room
                  </p>
                  <h1 className="mt-[var(--space-2)] font-serif text-[clamp(2rem,7vw,3rem)] italic leading-[1.02] text-[var(--ink)]">
                    Tune the board before the day gets loud.
                  </h1>
                  <p className="mt-[var(--space-3)] type-body-sm text-[var(--ink-secondary)]">
                    This is the captain&apos;s workbench: adjust session settings, tidy match
                    allowances, and keep the roster calibrated without feeling like you stepped
                    into a spreadsheet.
                  </p>
                </div>

                <div className="inline-flex items-center gap-[var(--space-2)] rounded-full border border-[color:var(--gold)]/16 bg-[color:var(--gold)]/10 px-[var(--space-3)] py-[var(--space-2)]">
                  <Shield size={15} className="text-[var(--masters)]" />
                  <span className="type-caption font-semibold text-[var(--ink)]">
                    Captain Mode Active
                  </span>
                </div>
              </div>

              <div className="grid gap-[var(--space-3)] sm:grid-cols-3">
                <Link
                  href="/lineup/new?mode=session"
                  data-testid="captain-new-session-link"
                  className="btn-premium inline-flex items-center justify-center gap-[var(--space-2)] rounded-[1rem] px-[var(--space-4)] py-[var(--space-3)]"
                >
                  <Plus size={16} />
                  New Session
                </Link>
                <Link
                  href="/courses"
                  data-testid="captain-course-library-link"
                  className="inline-flex items-center justify-center gap-[var(--space-2)] rounded-[1rem] border border-[color:var(--gold)]/22 bg-[color:var(--gold)]/10 px-[var(--space-4)] py-[var(--space-3)] font-semibold text-[var(--ink)] transition-colors hover:bg-[color:var(--gold)]/14"
                >
                  <Map size={16} />
                  Course Library
                </Link>
                <Link
                  href="/players?panel=draft"
                  className="inline-flex items-center justify-center gap-[var(--space-2)] rounded-[1rem] border border-[color:var(--gold)]/22 bg-[color:var(--gold)]/10 px-[var(--space-4)] py-[var(--space-3)] font-semibold text-[var(--ink)] transition-colors hover:bg-[color:var(--gold)]/14"
                >
                  <Trophy size={16} />
                  Open Draft Room
                </Link>
              </div>

              <div className="rounded-[1.2rem] border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/78 px-[var(--space-4)] py-[var(--space-4)]">
                <p className="type-meta font-semibold text-[var(--ink)]">How course setup works</p>
                <p className="mt-[var(--space-1)] type-caption text-[var(--ink-secondary)]">
                  Add or import the course in the Course Library first. Then expand a session below
                  and use a match card&apos;s <span className="font-semibold text-[var(--ink)]">Set course &amp; tee</span> action.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-[var(--space-3)] px-[var(--space-5)] py-[var(--space-5)] md:grid-cols-4">
            <ManageFactCard label="Sessions" value={sessionsWithMatches.length} />
            <ManageFactCard label="Matches" value={matches.length} />
            <ManageFactCard label="Live Matches" value={liveMatches} />
            <ManageFactCard
              label="Roster Missing HCP"
              value={playersWithoutHandicap}
              valueClassName="font-sans text-[1rem] not-italic"
            />
          </div>
        </section>

        <section className="pt-[var(--space-6)]">
          <ManageSectionHeading
            eyebrow="Session Desk"
            title="Sessions and matches"
            description="The rhythm of the trip lives here. Expand a session, adjust the settings, and make quick corrections without losing the thread."
          />

          {sessionsWithMatches.length === 0 ? (
            <EmptyManageCard
              icon={<CalendarDays size={28} className="text-[var(--ink-tertiary)]" />}
              title="No sessions built yet"
              description="Create a lineup to add sessions and matches to the board."
              actionHref="/lineup/new?mode=session"
              actionLabel="Create First Session"
            />
          ) : (
            <div className="space-y-[var(--space-4)]">
              {sessionsWithMatches.map((session) => (
                <SessionManagementCard
                  key={session.id}
                  session={session}
                  courses={courses}
                  teeSets={teeSets}
                  isExpanded={expandedSessions.has(session.id)}
                  onToggle={() => toggleSession(session.id)}
                  onSaveSession={(updates) => handleUpdateSession(session.id, updates)}
                  onDeleteSession={() => handleDeleteSession(session.id)}
                  teamAName={teamAName}
                  teamBName={teamBName}
                  getPlayerNames={getPlayerNames}
                  editingMatchId={editingMatch}
                  onEditMatch={setEditingMatch}
                  onSaveMatch={(matchId, updates) => handleUpdateMatch(matchId, updates)}
                  onDeleteMatch={handleDeleteMatch}
                  isSubmitting={isSubmitting}
                />
              ))}
            </div>
          )}
        </section>

        <section className="pt-[var(--space-8)]">
          <ManageSectionHeading
            eyebrow="Roster Desk"
            title="Player calibration"
            description="Handicap upkeep should feel deliberate, not clerical. Keep the roster clean before the pairings start to move."
          />

          {players.length === 0 ? (
            <EmptyManageCard
              icon={<Users size={28} className="text-[var(--ink-tertiary)]" />}
              title="No players in the trip yet"
              description="Add players to start calibrating handicaps and roster details."
              actionHref="/players"
              actionLabel="Manage Players"
            />
          ) : (
            <div className="space-y-[var(--space-3)]">
              {players.map((player) => (
                <PlayerManagementCard
                  key={`${player.id}:${player.firstName}:${player.lastName}:${player.handicapIndex ?? ''}:${editingPlayer === player.id ? 'edit' : 'view'}`}
                  player={player}
                  team={getTeamForPlayer(player.id)}
                  isEditing={editingPlayer === player.id}
                  onEdit={() => setEditingPlayer(player.id)}
                  onCancel={() => setEditingPlayer(null)}
                  onSave={(updates) => handleUpdatePlayer(player.id, updates)}
                  isSubmitting={isSubmitting}
                />
              ))}
            </div>
          )}

          <div className="mt-[var(--space-4)] grid grid-cols-2 gap-[var(--space-3)] md:grid-cols-4">
            <ManageFactCard
              label={teamAName}
              value={players.filter((player) => getTeamForPlayer(player.id)?.color === 'usa').length}
            />
            <ManageFactCard
              label={teamBName}
              value={
                players.filter((player) => getTeamForPlayer(player.id)?.color === 'europe').length
              }
            />
            <ManageFactCard label="Locked Sessions" value={lockedSessions} />
            <ManageFactCard label="Completed Sessions" value={completedSessions} />
          </div>
        </section>
      </main>

      {ConfirmDialogComponent}
    </div>
  );
}

export default ManagePageClient;
