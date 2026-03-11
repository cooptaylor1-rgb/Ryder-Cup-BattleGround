import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { cn, formatPlayerName } from '@/lib/utils';
import type { Match, Player, RyderCupSession, Team } from '@/lib/types/models';
import {
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
  Trash2,
  UserCheck,
  Zap,
} from 'lucide-react';

export interface SessionWithMatches extends RyderCupSession {
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

export function ManageFactCard({
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

export function ManageSectionHeading({
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

export function EmptyManageCard({
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

export function SessionManagementCard({
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
    <section
      className={cn(
        'overflow-hidden rounded-[1.85rem] border shadow-[0_18px_36px_rgba(46,34,18,0.06)]',
        statusMeta.panel
      )}
    >
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
            <ManageFactCard
              label="Matches"
              value={session.matches.length}
              valueClassName="font-sans text-[1rem] not-italic"
            />
            <ManageFactCard
              label="Points/Match"
              value={session.pointsPerMatch ?? '—'}
              valueClassName="font-sans text-[1rem] not-italic"
            />
            <ManageFactCard
              label="Status"
              value={statusMeta.label}
              valueClassName="font-sans text-[1rem] not-italic"
            />
            <ManageFactCard
              label="Board"
              value={isExpanded ? 'Open' : 'Closed'}
              valueClassName="font-sans text-[1rem] not-italic"
            />
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
                <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">
                  Match Board
                </p>
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
    pointsPerMatch !==
      (session.pointsPerMatch !== undefined ? String(session.pointsPerMatch) : '');

  return (
    <div className="rounded-[1.45rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.78)] p-[var(--space-5)] shadow-[0_12px_24px_rgba(46,34,18,0.05)]">
      <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">
        Session Settings
      </p>
      <h4 className="mt-[var(--space-2)] type-title-lg text-[var(--ink)]">
        Control the frame
      </h4>
      <p className="mt-[var(--space-2)] type-body-sm text-[var(--ink-secondary)]">
        Set the session status and match value here. Deleting the session removes the entire board
        beneath it.
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
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1"
          >
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
          <Button
            variant="outline"
            size="icon"
            onClick={onEdit}
            aria-label={`Edit match ${match.matchOrder}`}
          >
            <Edit3 size={16} />
          </Button>
          <Button
            variant="danger"
            size="icon"
            onClick={onDelete}
            aria-label={`Delete match ${match.matchOrder}`}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}

export function PlayerManagementCard({
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
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1"
          >
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

        <Button
          variant="outline"
          size="icon"
          onClick={onEdit}
          aria-label={`Edit ${player.firstName} ${player.lastName}`}
        >
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
