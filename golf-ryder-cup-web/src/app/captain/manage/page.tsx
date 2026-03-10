'use client';

import { useCallback, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  CaptainModeRequiredState,
  CaptainNoTripState,
} from '@/components/captain/CaptainAccessState';
import { PageHeader } from '@/components/layout';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { db } from '@/lib/db';
import { deleteMatchCascade, deleteSessionCascade } from '@/lib/services/cascadeDelete';
import { useTripStore, useUIStore } from '@/lib/stores';
import { cn, formatPlayerName } from '@/lib/utils';
import { captainLogger } from '@/lib/utils/logger';
import type { Match, Player, RyderCupSession, Team } from '@/lib/types/models';
import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Edit3,
  Hash,
  Lock,
  PencilLine,
  Plus,
  Save,
  Settings,
  Shield,
  Trash2,
  Trophy,
  UserCheck,
  Users,
  Zap,
} from 'lucide-react';

interface SessionWithMatches extends RyderCupSession {
  matches: Match[];
}

type SessionStatus = RyderCupSession['status'];

const sessionStatusStyles: Record<
  SessionStatus,
  {
    pill: string;
    panel: string;
    icon: ReactNode;
    label: string;
  }
> = {
  scheduled: {
    pill: 'border-[var(--rule)] bg-[var(--canvas)] text-[var(--ink-secondary)]',
    panel:
      'border-[var(--rule)] bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(248,244,237,0.95))]',
    icon: <Clock3 size={16} className="text-[var(--ink-tertiary)]" />,
    label: 'Scheduled',
  },
  inProgress: {
    pill:
      'border-[color:var(--warning)]/18 bg-[color:var(--warning)]/12 text-[var(--warning)]',
    panel:
      'border-[color:var(--warning)]/16 bg-[linear-gradient(180deg,rgba(184,134,11,0.10),rgba(255,255,255,0.96))]',
    icon: <Zap size={16} className="text-[var(--warning)]" />,
    label: 'In Progress',
  },
  completed: {
    pill:
      'border-[color:var(--success)]/18 bg-[color:var(--success)]/12 text-[var(--success)]',
    panel:
      'border-[color:var(--success)]/16 bg-[linear-gradient(180deg,rgba(45,122,79,0.10),rgba(255,255,255,0.96))]',
    icon: <CheckCircle2 size={16} className="text-[var(--success)]" />,
    label: 'Completed',
  },
};

const teamToneStyles: Record<
  Team['color'],
  {
    text: string;
    badge: string;
    panel: string;
  }
> = {
  usa: {
    text: 'text-[var(--team-usa)]',
    badge:
      'border-[color:var(--team-usa)]/16 bg-[color:var(--team-usa)]/10 text-[var(--team-usa)]',
    panel:
      'border-[color:var(--team-usa)]/16 bg-[linear-gradient(180deg,rgba(30,58,95,0.08),rgba(255,255,255,0.96))]',
  },
  europe: {
    text: 'text-[var(--team-europe)]',
    badge:
      'border-[color:var(--team-europe)]/16 bg-[color:var(--team-europe)]/10 text-[var(--team-europe)]',
    panel:
      'border-[color:var(--team-europe)]/16 bg-[linear-gradient(180deg,rgba(114,47,55,0.08),rgba(255,255,255,0.96))]',
  },
};

export default function CaptainManagePage() {
  const router = useRouter();
  const { currentTrip, players, teams, teamMembers } = useTripStore();
  const { isCaptainMode, showToast } = useUIStore();
  const { showConfirm, ConfirmDialogComponent } = useConfirmDialog();

  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [editingMatch, setEditingMatch] = useState<string | null>(null);
  const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sessions = useLiveQuery(
    async () =>
      currentTrip ? await db.sessions.where('tripId').equals(currentTrip.id).toArray() : [],
    [currentTrip?.id],
    [] as RyderCupSession[]
  );

  const matches = useLiveQuery(() => db.matches.toArray(), [], [] as Match[]);

  const teamById = useMemo(() => new Map(teams.map((team) => [team.id, team])), [teams]);
  const playerById = useMemo(() => new Map(players.map((player) => [player.id, player])), [players]);
  const playerTeamMap = useMemo(
    () => new Map(teamMembers.map((membership) => [membership.playerId, membership.teamId])),
    [teamMembers]
  );

  const teamA = teams.find((team) => team.color === 'usa');
  const teamB = teams.find((team) => team.color === 'europe');
  const teamAName = teamA?.name || 'Team A';
  const teamBName = teamB?.name || 'Team B';

  const sessionsWithMatches = useMemo(
    () =>
      sessions
        .map((session) => ({
          ...session,
          matches: matches
            .filter((match) => match.sessionId === session.id)
            .sort((a, b) => a.matchOrder - b.matchOrder),
        }))
        .sort((a, b) => a.sessionNumber - b.sessionNumber),
    [matches, sessions]
  );

  const completedSessions = sessionsWithMatches.filter(
    (session) => session.status === 'completed'
  ).length;
  const liveMatches = matches.filter((match) => match.status === 'inProgress').length;
  const lockedSessions = sessionsWithMatches.filter((session) => session.isLocked).length;
  const playersWithoutHandicap = players.filter(
    (player) => player.handicapIndex === undefined || player.handicapIndex === null
  ).length;

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
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Manage Trip"
        subtitle={currentTrip.name}
        icon={<Settings size={16} className="text-[var(--color-accent)]" />}
        iconContainerStyle={{
          background: 'linear-gradient(135deg, var(--masters) 0%, var(--masters-deep) 100%)',
          boxShadow: 'var(--shadow-glow-green)',
        }}
        onBack={() => router.back()}
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

              <div className="grid gap-[var(--space-3)] sm:grid-cols-2">
                <Link
                  href="/lineup/new"
                  className="btn-premium inline-flex items-center justify-center gap-[var(--space-2)] rounded-[1rem] px-[var(--space-4)] py-[var(--space-3)]"
                >
                  <Plus size={16} />
                  New Session
                </Link>
                <Link
                  href="/captain/draft"
                  className="inline-flex items-center justify-center gap-[var(--space-2)] rounded-[1rem] border border-[color:var(--gold)]/22 bg-[color:var(--gold)]/10 px-[var(--space-4)] py-[var(--space-3)] font-semibold text-[var(--ink)] transition-colors hover:bg-[color:var(--gold)]/14"
                >
                  <Trophy size={16} />
                  Open Draft Room
                </Link>
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
              actionHref="/lineup/new"
              actionLabel="Create First Session"
            />
          ) : (
            <div className="space-y-[var(--space-4)]">
              {sessionsWithMatches.map((session) => (
                <SessionManagementCard
                  key={session.id}
                  session={session}
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
            <ManageFactCard label={teamAName} value={players.filter((player) => getTeamForPlayer(player.id)?.color === 'usa').length} />
            <ManageFactCard label={teamBName} value={players.filter((player) => getTeamForPlayer(player.id)?.color === 'europe').length} />
            <ManageFactCard label="Locked Sessions" value={lockedSessions} />
            <ManageFactCard label="Completed Sessions" value={completedSessions} />
          </div>
        </section>
      </main>

      {ConfirmDialogComponent}
    </div>
  );
}

function ManageFactCard({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string | number;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-[1.1rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.72)] px-[var(--space-4)] py-[var(--space-4)] shadow-[0_12px_24px_rgba(46,34,18,0.05)]">
      <p className="type-overline text-[var(--ink-tertiary)]">{label}</p>
      <p
        className={cn(
          'mt-[var(--space-2)] font-serif text-[1.7rem] italic leading-none text-[var(--ink)]',
          valueClassName
        )}
      >
        {value}
      </p>
    </div>
  );
}

function ManageSectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-[var(--space-4)]">
      <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">{eyebrow}</p>
      <h2 className="mt-[var(--space-2)] type-display-sm text-[var(--ink)]">{title}</h2>
      <p className="mt-[var(--space-2)] type-body-sm text-[var(--ink-secondary)]">{description}</p>
    </div>
  );
}

function EmptyManageCard({
  icon,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className="card-premium p-[var(--space-6)] text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[var(--rule)] bg-[var(--canvas-sunken)]">
        {icon}
      </div>
      <h3 className="mt-[var(--space-4)] type-title-lg text-[var(--ink)]">{title}</h3>
      <p className="mt-[var(--space-2)] type-body-sm text-[var(--ink-secondary)]">{description}</p>
      <Link
        href={actionHref}
        className="btn-premium mt-[var(--space-5)] inline-flex items-center gap-[var(--space-2)] rounded-[1rem] px-[var(--space-4)] py-[var(--space-3)]"
      >
        <Plus size={16} />
        {actionLabel}
      </Link>
    </div>
  );
}

function SessionManagementCard({
  session,
  isExpanded,
  onToggle,
  onSaveSession,
  onDeleteSession,
  teamAName,
  teamBName,
  getPlayerNames,
  editingMatchId,
  onEditMatch,
  onSaveMatch,
  onDeleteMatch,
  isSubmitting,
}: {
  session: SessionWithMatches;
  isExpanded: boolean;
  onToggle: () => void;
  onSaveSession: (updates: Partial<RyderCupSession>) => Promise<void>;
  onDeleteSession: () => void;
  teamAName: string;
  teamBName: string;
  getPlayerNames: (playerIds: string[]) => string;
  editingMatchId: string | null;
  onEditMatch: (matchId: string | null) => void;
  onSaveMatch: (matchId: string, updates: Partial<Match>) => Promise<void>;
  onDeleteMatch: (matchId: string) => void;
  isSubmitting: boolean;
}) {
  const statusMeta = sessionStatusStyles[session.status];

  return (
    <section className={cn('overflow-hidden rounded-[1.85rem] border shadow-[0_18px_36px_rgba(46,34,18,0.06)]', statusMeta.panel)}>
      <button
        onClick={onToggle}
        className="flex w-full items-start gap-[var(--space-4)] border-none bg-transparent px-[var(--space-5)] py-[var(--space-5)] text-left"
      >
        <div className="mt-[var(--space-1)] shrink-0">{statusMeta.icon}</div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-[var(--space-3)] sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">
                Session {session.sessionNumber}
              </p>
              <h3 className="mt-[var(--space-2)] type-title-lg text-[var(--ink)]">
                {session.name}
              </h3>
              <p className="mt-[var(--space-2)] type-body-sm text-[var(--ink-secondary)]">
                {formatSessionType(session.sessionType)}
                {session.timeSlot ? ` · ${session.timeSlot}` : ''}
                {session.scheduledDate ? ` · ${formatShortDate(session.scheduledDate)}` : ''}
              </p>
            </div>

            <div className="flex items-center gap-[var(--space-2)]">
              <SessionStatusPill status={session.status} />
              {session.isLocked ? (
                <div className="inline-flex items-center gap-[var(--space-1)] rounded-full border border-[color:var(--gold)]/18 bg-[color:var(--gold)]/10 px-[var(--space-2)] py-[6px]">
                  <Lock size={12} className="text-[var(--gold-dark)]" />
                  <span className="type-micro font-semibold text-[var(--gold-dark)]">Locked</span>
                </div>
              ) : null}
              {isExpanded ? (
                <ChevronUp size={20} className="text-[var(--ink-tertiary)]" />
              ) : (
                <ChevronDown size={20} className="text-[var(--ink-tertiary)]" />
              )}
            </div>
          </div>

          <div className="mt-[var(--space-4)] grid grid-cols-2 gap-[var(--space-3)] md:grid-cols-4">
            <ManageFactCard label="Matches" value={session.matches.length} valueClassName="font-sans text-[1rem] not-italic" />
            <ManageFactCard label="Points/Match" value={session.pointsPerMatch ?? '—'} valueClassName="font-sans text-[1rem] not-italic" />
            <ManageFactCard label="Status" value={statusMeta.label} valueClassName="font-sans text-[1rem] not-italic" />
            <ManageFactCard label="Board" value={isExpanded ? 'Open' : 'Closed'} valueClassName="font-sans text-[1rem] not-italic" />
          </div>
        </div>
      </button>

      {isExpanded ? (
        <div className="border-t border-[color:var(--rule)]/75 bg-[rgba(255,255,255,0.52)] px-[var(--space-5)] py-[var(--space-5)]">
          <div className="grid gap-[var(--space-4)] lg:grid-cols-[0.92fr_1.08fr]">
            <SessionSettingsEditor
              key={`${session.id}:${session.status}:${session.pointsPerMatch ?? ''}`}
              session={session}
              onSave={onSaveSession}
              onDelete={onDeleteSession}
              isSubmitting={isSubmitting}
            />

            <div className="space-y-[var(--space-3)]">
              <div className="rounded-[1.35rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.72)] px-[var(--space-4)] py-[var(--space-4)]">
                <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">Match Board</p>
                <h4 className="mt-[var(--space-2)] type-title text-[var(--ink)]">
                  Live pairings and allowances
                </h4>
                <p className="mt-[var(--space-2)] type-body-sm text-[var(--ink-secondary)]">
                  Make quick corrections without leaving the management surface.
                </p>
              </div>

              {session.matches.length === 0 ? (
                <div className="rounded-[1.35rem] border border-dashed border-[var(--rule)] bg-[rgba(255,255,255,0.56)] px-[var(--space-4)] py-[var(--space-5)] text-center">
                  <p className="type-title-sm text-[var(--ink)]">No matches in this session</p>
                  <p className="mt-[var(--space-2)] type-caption">
                    Build pairings first, then come back here to fine-tune them.
                  </p>
                </div>
              ) : (
                session.matches.map((match) => (
                  <MatchManagementCard
                    key={`${match.id}:${match.status}:${match.teamAHandicapAllowance}:${match.teamBHandicapAllowance}:${editingMatchId === match.id ? 'edit' : 'view'}`}
                    match={match}
                    teamAName={teamAName}
                    teamBName={teamBName}
                    getPlayerNames={getPlayerNames}
                    isEditing={editingMatchId === match.id}
                    onEdit={() => onEditMatch(match.id)}
                    onCancel={() => onEditMatch(null)}
                    onSave={(updates) => onSaveMatch(match.id, updates)}
                    onDelete={() => onDeleteMatch(match.id)}
                    isSubmitting={isSubmitting}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function SessionSettingsEditor({
  session,
  onSave,
  onDelete,
  isSubmitting,
}: {
  session: RyderCupSession;
  onSave: (updates: Partial<RyderCupSession>) => Promise<void>;
  onDelete: () => void;
  isSubmitting: boolean;
}) {
  const [status, setStatus] = useState<RyderCupSession['status']>(session.status);
  const [pointsPerMatch, setPointsPerMatch] = useState(
    session.pointsPerMatch !== undefined ? String(session.pointsPerMatch) : ''
  );

  const hasChanges =
    status !== session.status ||
    pointsPerMatch !== (session.pointsPerMatch !== undefined ? String(session.pointsPerMatch) : '');

  return (
    <div className="rounded-[1.45rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.78)] p-[var(--space-5)] shadow-[0_12px_24px_rgba(46,34,18,0.05)]">
      <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">Session Settings</p>
      <h4 className="mt-[var(--space-2)] type-title-lg text-[var(--ink)]">Control the frame</h4>
      <p className="mt-[var(--space-2)] type-body-sm text-[var(--ink-secondary)]">
        Set the session status and match value here. Deleting the session removes the entire board beneath it.
      </p>

      <div className="mt-[var(--space-5)] space-y-[var(--space-4)]">
        <label className="space-y-[var(--space-2)]">
          <span className="type-meta font-semibold text-[var(--ink)]">Status</span>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value as RyderCupSession['status'])}
            className="input"
          >
            <option value="scheduled">Scheduled</option>
            <option value="inProgress">In Progress</option>
            <option value="completed">Completed</option>
          </select>
        </label>

        <label className="space-y-[var(--space-2)]">
          <span className="type-meta font-semibold text-[var(--ink)]">Points per match</span>
          <input
            type="number"
            min="0"
            step="0.5"
            value={pointsPerMatch}
            onChange={(event) => setPointsPerMatch(event.target.value)}
            className="input"
            placeholder="1"
          />
        </label>
      </div>

      <div className="mt-[var(--space-5)] flex flex-col gap-[var(--space-3)] sm:flex-row">
        <Button
          variant="secondary"
          onClick={() =>
            onSave({
              status,
              pointsPerMatch: pointsPerMatch.trim() ? Number(pointsPerMatch) : undefined,
            })
          }
          disabled={isSubmitting || !hasChanges}
          leftIcon={<Save size={15} />}
          className="flex-1"
        >
          Save Session
        </Button>
        <Button
          variant="danger"
          onClick={onDelete}
          disabled={isSubmitting}
          leftIcon={<Trash2 size={15} />}
          className="flex-1"
        >
          Delete Session
        </Button>
      </div>
    </div>
  );
}

function MatchManagementCard({
  match,
  teamAName,
  teamBName,
  getPlayerNames,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  onDelete,
  isSubmitting,
}: {
  match: Match;
  teamAName: string;
  teamBName: string;
  getPlayerNames: (playerIds: string[]) => string;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (updates: Partial<Match>) => Promise<void>;
  onDelete: () => void;
  isSubmitting: boolean;
}) {
  const [teamAAllowance, setTeamAAllowance] = useState(String(match.teamAHandicapAllowance));
  const [teamBAllowance, setTeamBAllowance] = useState(String(match.teamBHandicapAllowance));
  const [status, setStatus] = useState<Match['status']>(match.status);

  const teamANames = getPlayerNames(match.teamAPlayerIds);
  const teamBNames = getPlayerNames(match.teamBPlayerIds);
  const statusMeta =
    status === 'completed'
      ? sessionStatusStyles.completed
      : status === 'inProgress'
        ? sessionStatusStyles.inProgress
        : sessionStatusStyles.scheduled;

  if (isEditing) {
    return (
      <div className="rounded-[1.35rem] border border-[var(--masters)] bg-[rgba(255,255,255,0.88)] p-[var(--space-4)] shadow-[0_12px_24px_rgba(46,34,18,0.06)]">
        <div className="flex items-center justify-between gap-[var(--space-3)]">
          <div>
            <p className="type-overline text-[var(--ink-tertiary)]">Match {match.matchOrder}</p>
            <h5 className="mt-[var(--space-1)] type-title text-[var(--ink)]">
              Adjust allowances and status
            </h5>
          </div>
          <SessionStatusPill
            status={
              status === 'completed'
                ? 'completed'
                : status === 'inProgress'
                  ? 'inProgress'
                  : 'scheduled'
            }
          />
        </div>

        <div className="mt-[var(--space-4)] space-y-[var(--space-4)]">
          <label className="space-y-[var(--space-2)]">
            <span className="type-meta font-semibold text-[var(--ink)]">Match status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as Match['status'])}
              className="input"
            >
              <option value="scheduled">Scheduled</option>
              <option value="inProgress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>

          <div className="grid gap-[var(--space-3)] sm:grid-cols-2">
            <label className="space-y-[var(--space-2)]">
              <span className="type-meta font-semibold text-[var(--team-usa)]">{teamAName}</span>
              <input
                type="number"
                min="0"
                value={teamAAllowance}
                onChange={(event) => setTeamAAllowance(event.target.value)}
                className="input"
              />
              <p className="type-caption">{teamANames || 'TBD'}</p>
            </label>

            <label className="space-y-[var(--space-2)]">
              <span className="type-meta font-semibold text-[var(--team-europe)]">{teamBName}</span>
              <input
                type="number"
                min="0"
                value={teamBAllowance}
                onChange={(event) => setTeamBAllowance(event.target.value)}
                className="input"
              />
              <p className="type-caption">{teamBNames || 'TBD'}</p>
            </label>
          </div>
        </div>

        <div className="mt-[var(--space-5)] flex flex-col gap-[var(--space-3)] sm:flex-row">
          <Button variant="secondary" onClick={onCancel} disabled={isSubmitting} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() =>
              onSave({
                status,
                teamAHandicapAllowance: Number(teamAAllowance) || 0,
                teamBHandicapAllowance: Number(teamBAllowance) || 0,
              })
            }
            disabled={isSubmitting}
            leftIcon={<Save size={15} />}
            className="flex-1"
          >
            Save Match
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[1.35rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.78)] p-[var(--space-4)] shadow-[0_10px_20px_rgba(46,34,18,0.05)]">
      <div className="flex items-start justify-between gap-[var(--space-3)]">
        <div>
          <div className="flex items-center gap-[var(--space-2)]">
            <Hash size={14} className="text-[var(--ink-tertiary)]" />
            <p className="type-title-sm text-[var(--ink)]">Match {match.matchOrder}</p>
            <div className={cn('rounded-full border px-[var(--space-2)] py-[5px]', statusMeta.pill)}>
              <span className="type-micro font-semibold">{statusMeta.label}</span>
            </div>
          </div>
          <div className="mt-[var(--space-3)] grid gap-[var(--space-2)]">
            <div className="rounded-[1rem] border border-[color:var(--team-usa)]/16 bg-[color:var(--team-usa)]/8 px-[var(--space-3)] py-[var(--space-3)]">
              <div className="flex items-center justify-between gap-[var(--space-3)]">
                <span className="type-meta font-semibold text-[var(--team-usa)]">{teamAName}</span>
                <span className="type-micro font-semibold text-[var(--ink-secondary)]">
                  {match.teamAHandicapAllowance} strokes
                </span>
              </div>
              <p className="mt-[var(--space-1)] type-caption text-[var(--ink)]">
                {teamANames || 'TBD'}
              </p>
            </div>

            <div className="rounded-[1rem] border border-[color:var(--team-europe)]/16 bg-[color:var(--team-europe)]/8 px-[var(--space-3)] py-[var(--space-3)]">
              <div className="flex items-center justify-between gap-[var(--space-3)]">
                <span className="type-meta font-semibold text-[var(--team-europe)]">{teamBName}</span>
                <span className="type-micro font-semibold text-[var(--ink-secondary)]">
                  {match.teamBHandicapAllowance} strokes
                </span>
              </div>
              <p className="mt-[var(--space-1)] type-caption text-[var(--ink)]">
                {teamBNames || 'TBD'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-[var(--space-2)]">
          <Button variant="outline" size="icon" onClick={onEdit} aria-label={`Edit match ${match.matchOrder}`}>
            <Edit3 size={16} />
          </Button>
          <Button variant="danger" size="icon" onClick={onDelete} aria-label={`Delete match ${match.matchOrder}`}>
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}

function PlayerManagementCard({
  player,
  team,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  isSubmitting,
}: {
  player: Player;
  team?: Team;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (updates: Partial<Player>) => Promise<void>;
  isSubmitting: boolean;
}) {
  const [firstName, setFirstName] = useState(player.firstName);
  const [lastName, setLastName] = useState(player.lastName);
  const [handicapIndex, setHandicapIndex] = useState(
    player.handicapIndex !== undefined && player.handicapIndex !== null
      ? String(player.handicapIndex)
      : ''
  );

  const teamTone = team ? teamToneStyles[team.color] : null;

  if (isEditing) {
    return (
      <div
        className={cn(
          'rounded-[1.35rem] border bg-[rgba(255,255,255,0.88)] p-[var(--space-4)] shadow-[0_12px_24px_rgba(46,34,18,0.06)]',
          teamTone ? teamTone.panel : 'border-[var(--masters)]'
        )}
      >
        <div className="flex items-start justify-between gap-[var(--space-3)]">
          <div>
            <p className="type-overline text-[var(--ink-tertiary)]">Roster Edit</p>
            <h4 className="mt-[var(--space-1)] type-title text-[var(--ink)]">
              Refine player details
            </h4>
          </div>
          {team ? (
            <div className={cn('rounded-full border px-[var(--space-2)] py-[6px]', teamTone?.badge)}>
              <span className="type-micro font-semibold">{team.name}</span>
            </div>
          ) : null}
        </div>

        <div className="mt-[var(--space-4)] grid gap-[var(--space-3)] sm:grid-cols-2">
          <label className="space-y-[var(--space-2)]">
            <span className="type-meta font-semibold text-[var(--ink)]">First name</span>
            <input
              type="text"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              className="input"
            />
          </label>

          <label className="space-y-[var(--space-2)]">
            <span className="type-meta font-semibold text-[var(--ink)]">Last name</span>
            <input
              type="text"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              className="input"
            />
          </label>
        </div>

        <label className="mt-[var(--space-4)] block space-y-[var(--space-2)]">
          <span className="type-meta font-semibold text-[var(--ink)]">Handicap index</span>
          <input
            type="number"
            step="0.1"
            min="-10"
            max="54"
            value={handicapIndex}
            onChange={(event) => setHandicapIndex(event.target.value)}
            className="input max-w-[180px]"
          />
        </label>

        <div className="mt-[var(--space-5)] flex flex-col gap-[var(--space-3)] sm:flex-row">
          <Button variant="secondary" onClick={onCancel} disabled={isSubmitting} className="flex-1">
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() =>
              onSave({
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                handicapIndex: handicapIndex.trim() ? Number(handicapIndex) : undefined,
              })
            }
            disabled={isSubmitting || !firstName.trim() || !lastName.trim()}
            leftIcon={<Save size={15} />}
            className="flex-1"
          >
            Save Player
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[1.35rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.78)] p-[var(--space-4)] shadow-[0_10px_20px_rgba(46,34,18,0.05)]">
      <div className="flex items-center gap-[var(--space-4)]">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--masters)] text-[0.8rem] font-semibold text-[var(--canvas)] shadow-[0_10px_20px_rgba(26,24,21,0.12)]">
          {player.firstName?.[0] || '?'}
          {player.lastName?.[0] || '?'}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-[var(--space-2)]">
            <p className="type-title-sm truncate text-[var(--ink)]">
              {formatPlayerName(player.firstName, player.lastName)}
            </p>
            {team ? (
              <div className={cn('rounded-full border px-[var(--space-2)] py-[5px]', teamTone?.badge)}>
                <span className="type-micro font-semibold">{team.name}</span>
              </div>
            ) : (
              <div className="rounded-full border border-[var(--rule)] bg-[var(--canvas)] px-[var(--space-2)] py-[5px]">
                <span className="type-micro font-semibold text-[var(--ink-secondary)]">
                  Unassigned
                </span>
              </div>
            )}
          </div>

          <div className="mt-[var(--space-2)] flex flex-wrap items-center gap-[var(--space-2)]">
            <span className="inline-flex items-center gap-[var(--space-1)] rounded-full border border-[var(--rule)] bg-[var(--canvas)] px-[var(--space-2)] py-[5px] text-[0.74rem] font-semibold text-[var(--ink-secondary)]">
              <UserCheck size={12} />
              Handicap {player.handicapIndex ?? 'Not set'}
            </span>
            {player.email ? (
              <span className="inline-flex rounded-full border border-[var(--rule)] bg-[var(--canvas)] px-[var(--space-2)] py-[5px] text-[0.74rem] font-semibold text-[var(--ink-secondary)]">
                {player.email}
              </span>
            ) : null}
          </div>
        </div>

        <Button variant="outline" size="icon" onClick={onEdit} aria-label={`Edit ${player.firstName} ${player.lastName}`}>
          <PencilLine size={16} />
        </Button>
      </div>
    </div>
  );
}

function SessionStatusPill({ status }: { status: SessionStatus }) {
  return (
    <div className={cn('rounded-full border px-[var(--space-2)] py-[6px]', sessionStatusStyles[status].pill)}>
      <span className="type-micro font-semibold">{sessionStatusStyles[status].label}</span>
    </div>
  );
}

function formatShortDate(isoString: string) {
  return new Date(isoString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatSessionType(type: RyderCupSession['sessionType']) {
  switch (type) {
    case 'foursomes':
      return 'Foursomes';
    case 'fourball':
      return 'Fourball';
    case 'singles':
      return 'Singles';
    default:
      return type;
  }
}
