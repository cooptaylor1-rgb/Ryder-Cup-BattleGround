/**
 * Captain roll-call board for pre-round attendance.
 */

'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  Car,
  CheckCircle2,
  ChevronDown,
  Circle,
  Clock,
  MessageSquare,
  Phone,
  RefreshCw,
  Search,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';

export type AttendanceStatus = 'checked-in' | 'en-route' | 'not-arrived' | 'no-show';

export interface AttendeePlayer {
  id: string;
  firstName: string;
  lastName: string;
  teamId: 'A' | 'B';
  handicapIndex: number;
  phone?: string;
  email?: string;
  avatarUrl?: string;
  status: AttendanceStatus;
  checkInTime?: string;
  eta?: string;
  lastLocation?: string;
  matchId?: string;
  teeTime?: string;
}

export interface AttendanceStats {
  total: number;
  checkedIn: number;
  enRoute: number;
  notArrived: number;
  noShow: number;
}

interface AttendanceCheckInProps {
  players: AttendeePlayer[];
  onUpdateStatus: (playerId: string, status: AttendanceStatus, eta?: string) => void;
  onCall?: (playerId: string) => void;
  onText?: (playerId: string) => void;
  onRefresh?: () => void;
  sessionName?: string;
  firstTeeTime?: string;
  className?: string;
  teamLabels?: {
    A: string;
    B: string;
  };
}

const STATUS_ORDER: Record<AttendanceStatus, number> = {
  'no-show': 0,
  'not-arrived': 1,
  'en-route': 2,
  'checked-in': 3,
};

const TEAM_TONE = {
  A: {
    dot: 'bg-[color:var(--team-usa)]',
    panel:
      'border-[color:var(--team-usa)]/14 bg-[linear-gradient(180deg,rgba(30,58,95,0.07),rgba(255,255,255,0.98))]',
  },
  B: {
    dot: 'bg-[color:var(--team-europe)]',
    panel:
      'border-[color:var(--team-europe)]/14 bg-[linear-gradient(180deg,rgba(114,47,55,0.08),rgba(255,255,255,0.98))]',
  },
} as const;

const ETA_OPTIONS = [
  { value: '5 min', label: '5 minutes' },
  { value: '10 min', label: '10 minutes' },
  { value: '15 min', label: '15 minutes' },
  { value: '20 min', label: '20 minutes' },
  { value: '30 min', label: '30 minutes' },
  { value: '45 min', label: '45 minutes' },
  { value: '1 hour', label: '1 hour' },
];

function getStatusConfig(status: AttendanceStatus) {
  switch (status) {
    case 'checked-in':
      return {
        label: 'Checked In',
        icon: CheckCircle2,
        chipClassName:
          'border-[color:var(--success)]/20 bg-[color:var(--success)]/12 text-[var(--success)]',
        actionClassName: 'bg-[color:var(--success)]/12 text-[var(--success)]',
      };
    case 'en-route':
      return {
        label: 'En Route',
        icon: Car,
        chipClassName:
          'border-[color:var(--warning)]/20 bg-[color:var(--warning)]/12 text-[var(--warning)]',
        actionClassName: 'bg-[color:var(--warning)]/12 text-[var(--warning)]',
      };
    case 'not-arrived':
      return {
        label: 'Not Arrived',
        icon: Circle,
        chipClassName:
          'border-[color:var(--rule)]/75 bg-[color:var(--surface)] text-[var(--ink-secondary)]',
        actionClassName: 'bg-[color:var(--surface-raised)] text-[var(--ink-secondary)]',
      };
    case 'no-show':
      return {
        label: 'No Show',
        icon: AlertTriangle,
        chipClassName:
          'border-[color:var(--error)]/18 bg-[color:var(--error)]/10 text-[var(--error)]',
        actionClassName: 'bg-[color:var(--error)]/12 text-[var(--error)]',
      };
  }
}

function getTimeUntil(targetTime: string): string {
  const now = new Date();
  const target = new Date();
  const [hours, minutes] = targetTime.split(':').map(Number);
  target.setHours(hours, minutes, 0, 0);

  const diff = target.getTime() - now.getTime();
  if (diff <= 0) return 'Now';

  const totalMinutes = Math.floor(diff / 60000);
  if (totalMinutes < 60) return `${totalMinutes}m`;

  const totalHours = Math.floor(totalMinutes / 60);
  return `${totalHours}h ${totalMinutes % 60}m`;
}

export function AttendanceCheckIn({
  players,
  onUpdateStatus,
  onCall,
  onText,
  onRefresh,
  sessionName = "Today's Session",
  firstTeeTime,
  className,
  teamLabels = { A: 'Team A', B: 'Team B' },
}: AttendanceCheckInProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<AttendanceStatus | 'all'>('all');
  const [selectedPlayer, setSelectedPlayer] = useState<AttendeePlayer | null>(null);
  const [showETAModal, setShowETAModal] = useState(false);

  const stats = useMemo<AttendanceStats>(
    () =>
      players.reduce(
        (result, player) => {
          result.total += 1;
          if (player.status === 'checked-in') result.checkedIn += 1;
          if (player.status === 'en-route') result.enRoute += 1;
          if (player.status === 'not-arrived') result.notArrived += 1;
          if (player.status === 'no-show') result.noShow += 1;
          return result;
        },
        {
          total: 0,
          checkedIn: 0,
          enRoute: 0,
          notArrived: 0,
          noShow: 0,
        }
      ),
    [players]
  );

  const filteredPlayers = useMemo(() => {
    let result = [...players];

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((player) =>
        `${player.firstName} ${player.lastName}`.toLowerCase().includes(query)
      );
    }

    if (filterStatus !== 'all') {
      result = result.filter((player) => player.status === filterStatus);
    }

    result.sort((left, right) => {
      const statusDifference = STATUS_ORDER[left.status] - STATUS_ORDER[right.status];
      if (statusDifference !== 0) {
        return statusDifference;
      }

      return `${left.firstName} ${left.lastName}`.localeCompare(
        `${right.firstName} ${right.lastName}`
      );
    });

    return result;
  }, [filterStatus, players, searchQuery]);

  const groupedPlayers = useMemo(
    () => ({
      A: filteredPlayers.filter((player) => player.teamId === 'A'),
      B: filteredPlayers.filter((player) => player.teamId === 'B'),
    }),
    [filteredPlayers]
  );

  const progressPercent = stats.total > 0 ? (stats.checkedIn / stats.total) * 100 : 0;
  const accountedFor = stats.checkedIn + stats.enRoute;

  const handleQuickCheckIn = (player: AttendeePlayer) => {
    if (player.status === 'checked-in') {
      onUpdateStatus(player.id, 'not-arrived');
      return;
    }

    onUpdateStatus(player.id, 'checked-in');
  };

  const handleSetETA = (playerId: string, eta: string) => {
    onUpdateStatus(playerId, 'en-route', eta);
    setShowETAModal(false);
    setSelectedPlayer(null);
  };

  return (
    <div
      className={cn(
        'overflow-hidden rounded-[2rem] border border-[color:var(--rule)]/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,239,232,0.99))] shadow-[0_24px_52px_rgba(41,29,17,0.08)]',
        className
      )}
    >
      <div className="border-b border-[color:var(--rule)]/75 px-[var(--space-5)] py-[var(--space-5)]">
        <div className="flex flex-col gap-[var(--space-4)] sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-[var(--space-4)]">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[1.1rem] bg-[linear-gradient(135deg,var(--maroon)_0%,var(--maroon-dark)_100%)] text-[var(--canvas)] shadow-[0_14px_30px_rgba(104,35,48,0.18)]">
              <UserCheck size={22} />
            </div>
            <div>
              <p className="type-overline tracking-[0.16em] text-[var(--maroon)]">Roll Call</p>
              <h2 className="mt-[var(--space-2)] font-serif text-[clamp(1.8rem,6vw,2.7rem)] italic leading-[1.04] text-[var(--ink)]">
                Keep the first tee orderly.
              </h2>
              <p className="mt-[var(--space-2)] max-w-[36rem] type-body-sm text-[var(--ink-secondary)]">
                {sessionName}
                {firstTeeTime ? (
                  <span className="ml-2 inline-flex items-center gap-2">
                    <span className="hidden h-1 w-1 rounded-full bg-[var(--ink-tertiary)] sm:inline-flex" />
                    First tee in{' '}
                    <span className="font-semibold text-[var(--maroon)]">{getTimeUntil(firstTeeTime)}</span>
                  </span>
                ) : null}
              </p>
            </div>
          </div>

          {onRefresh ? (
            <button
              type="button"
              onClick={onRefresh}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/82 px-[var(--space-4)] text-sm font-semibold text-[var(--ink-secondary)] transition-all hover:border-[var(--maroon-subtle)] hover:text-[var(--ink)]"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          ) : null}
        </div>

        <div className="mt-[var(--space-5)] grid gap-[var(--space-3)] sm:grid-cols-2 xl:grid-cols-4">
          <AttendanceMetricCard label="Accounted For" value={`${accountedFor}/${stats.total}`} detail="Checked in or headed in" tone="maroon" />
          <AttendanceMetricCard label="Checked In" value={stats.checkedIn} detail={`${progressPercent.toFixed(0)}% confirmed on site`} tone="green" />
          <AttendanceMetricCard label="En Route" value={stats.enRoute} detail="Still rolling toward the lot" tone="gold" />
          <AttendanceMetricCard label="Missing" value={stats.notArrived + stats.noShow} detail="Still needs captain attention" tone="ink" />
        </div>

        <div className="mt-[var(--space-5)] grid gap-[var(--space-3)] xl:grid-cols-[minmax(0,1fr)_auto] xl:items-center">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-tertiary)]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search the roster"
              className="w-full rounded-[1.15rem] border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/90 py-[0.9rem] pl-11 pr-4 text-sm text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--ink-tertiary)] focus:border-[var(--maroon-subtle)]"
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <FilterChip
              active={filterStatus === 'all'}
              label="All"
              onClick={() => setFilterStatus('all')}
            />
            {(['checked-in', 'en-route', 'not-arrived', 'no-show'] as const).map((status) => {
              const config = getStatusConfig(status);
              return (
                <FilterChip
                  key={status}
                  active={filterStatus === status}
                  label={config.label}
                  className={config.chipClassName}
                  onClick={() => setFilterStatus(filterStatus === status ? 'all' : status)}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid gap-[var(--space-4)] p-[var(--space-4)] xl:grid-cols-2">
        <TeamAttendancePanel
          players={groupedPlayers.A}
          teamLabel={teamLabels.A}
          teamId="A"
          onQuickCheckIn={handleQuickCheckIn}
          onSetETA={(player) => {
            setSelectedPlayer(player);
            setShowETAModal(true);
          }}
          onMarkNoShow={(player) => onUpdateStatus(player.id, 'no-show')}
          onCall={onCall}
          onText={onText}
        />
        <TeamAttendancePanel
          players={groupedPlayers.B}
          teamLabel={teamLabels.B}
          teamId="B"
          onQuickCheckIn={handleQuickCheckIn}
          onSetETA={(player) => {
            setSelectedPlayer(player);
            setShowETAModal(true);
          }}
          onMarkNoShow={(player) => onUpdateStatus(player.id, 'no-show')}
          onCall={onCall}
          onText={onText}
        />
      </div>

      <AnimatePresence>
        {showETAModal && selectedPlayer ? (
          <ETAModal
            player={selectedPlayer}
            onSetETA={(eta) => handleSetETA(selectedPlayer.id, eta)}
            onClose={() => {
              setShowETAModal(false);
              setSelectedPlayer(null);
            }}
          />
        ) : null}
      </AnimatePresence>
    </div>
  );
}

function AttendanceMetricCard({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: ReactNode;
  detail: string;
  tone: 'ink' | 'gold' | 'green' | 'maroon';
}) {
  const toneClassNames = {
    ink: 'border-[color:var(--rule)]/70 bg-[color:var(--surface)]/80',
    gold:
      'border-[color:var(--warning)]/18 bg-[linear-gradient(180deg,rgba(184,134,11,0.10),rgba(255,255,255,0.98))]',
    green:
      'border-[color:var(--success)]/16 bg-[linear-gradient(180deg,rgba(45,122,79,0.10),rgba(255,255,255,0.98))]',
    maroon:
      'border-[color:var(--maroon)]/16 bg-[linear-gradient(180deg,rgba(104,35,48,0.10),rgba(255,255,255,0.98))]',
  } satisfies Record<'ink' | 'gold' | 'green' | 'maroon', string>;

  return (
    <div className={cn('rounded-[1.35rem] border p-[var(--space-4)]', toneClassNames[tone])}>
      <p className="type-overline tracking-[0.15em] text-[var(--ink-tertiary)]">{label}</p>
      <p className="mt-[var(--space-3)] font-serif text-[1.9rem] italic leading-none text-[var(--ink)]">
        {value}
      </p>
      <p className="mt-[var(--space-2)] text-sm text-[var(--ink-secondary)]">{detail}</p>
    </div>
  );
}

function FilterChip({
  active,
  label,
  onClick,
  className,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-[var(--space-3)] py-[var(--space-2)] text-sm font-semibold transition-all',
        active
          ? 'border-[var(--maroon)] bg-[var(--maroon)] text-[var(--canvas)] shadow-[0_10px_24px_rgba(104,35,48,0.16)]'
          : 'border-[color:var(--rule)]/75 bg-[color:var(--surface)]/78 text-[var(--ink-secondary)] hover:border-[var(--maroon-subtle)] hover:text-[var(--ink)]',
        !active && className
      )}
    >
      {label}
    </button>
  );
}

function TeamAttendancePanel({
  players,
  teamLabel,
  teamId,
  onQuickCheckIn,
  onSetETA,
  onMarkNoShow,
  onCall,
  onText,
}: {
  players: AttendeePlayer[];
  teamLabel: string;
  teamId: 'A' | 'B';
  onQuickCheckIn: (player: AttendeePlayer) => void;
  onSetETA: (player: AttendeePlayer) => void;
  onMarkNoShow: (player: AttendeePlayer) => void;
  onCall?: (playerId: string) => void;
  onText?: (playerId: string) => void;
}) {
  const checkedInCount = players.filter((player) => player.status === 'checked-in').length;

  return (
    <section className={cn('rounded-[1.6rem] border p-[var(--space-4)] shadow-[0_16px_34px_rgba(41,29,17,0.05)]', TEAM_TONE[teamId].panel)}>
      <div className="flex items-end justify-between gap-[var(--space-3)]">
        <div>
          <div className="flex items-center gap-2">
            <span className={cn('h-2.5 w-2.5 rounded-full', TEAM_TONE[teamId].dot)} />
            <p className="type-overline tracking-[0.15em] text-[var(--ink-tertiary)]">{teamLabel}</p>
          </div>
          <h3 className="mt-[var(--space-2)] font-serif text-[1.65rem] italic text-[var(--ink)]">
            {checkedInCount}/{players.length} on site
          </h3>
        </div>
        <p className="text-sm text-[var(--ink-secondary)]">
          {players.length === 1 ? '1 player' : `${players.length} players`}
        </p>
      </div>

      {players.length > 0 ? (
        <div className="mt-[var(--space-4)] space-y-3">
          {players.map((player) => (
            <PlayerCheckInCard
              key={player.id}
              player={player}
              onQuickCheckIn={() => onQuickCheckIn(player)}
              onSetETA={() => onSetETA(player)}
              onMarkNoShow={() => onMarkNoShow(player)}
              onCall={onCall ? () => onCall(player.id) : undefined}
              onText={onText ? () => onText(player.id) : undefined}
            />
          ))}
        </div>
      ) : (
        <div className="mt-[var(--space-4)] rounded-[1.25rem] border border-dashed border-[color:var(--rule)]/75 bg-[color:var(--surface)]/72 px-[var(--space-4)] py-[var(--space-6)] text-center text-sm text-[var(--ink-secondary)]">
          No one on this side matches the current filter.
        </div>
      )}
    </section>
  );
}

interface PlayerCheckInCardProps {
  player: AttendeePlayer;
  onQuickCheckIn: () => void;
  onSetETA: () => void;
  onMarkNoShow: () => void;
  onCall?: () => void;
  onText?: () => void;
}

function PlayerCheckInCard({
  player,
  onQuickCheckIn,
  onSetETA,
  onMarkNoShow,
  onCall,
  onText,
}: PlayerCheckInCardProps) {
  const [expanded, setExpanded] = useState(false);
  const statusConfig = getStatusConfig(player.status);
  const StatusIcon = statusConfig.icon;
  const contactDetail = player.phone || player.email || `Handicap ${player.handicapIndex.toFixed(1)}`;

  return (
    <motion.div
      layout
      className="overflow-hidden rounded-[1.35rem] border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/90 shadow-[0_14px_26px_rgba(41,29,17,0.05)]"
    >
      <div
        role="button"
        tabIndex={0}
        className="flex w-full items-start gap-[var(--space-3)] px-[var(--space-4)] py-[var(--space-4)] text-left"
        onClick={() => setExpanded((current) => !current)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setExpanded((current) => !current);
          }
        }}
      >
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onQuickCheckIn();
          }}
          className={cn(
            'mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] border transition-transform hover:scale-[1.03]',
            statusConfig.chipClassName
          )}
          aria-label={`Update ${player.firstName} ${player.lastName}`}
        >
          <StatusIcon className="h-5 w-5" />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-base font-semibold text-[var(--ink)]">
              {player.firstName} {player.lastName}
            </p>
            <span className={cn('rounded-full border px-2.5 py-1 text-xs font-semibold', statusConfig.chipClassName)}>
              {statusConfig.label}
            </span>
          </div>

          <p className="mt-2 text-sm text-[var(--ink-secondary)]">
            Handicap {player.handicapIndex.toFixed(1)}
            {player.eta && player.status === 'en-route' ? ` • ETA ${player.eta}` : ''}
            {player.teeTime ? ` • Tee ${player.teeTime}` : ''}
          </p>
          <p className="mt-1 truncate text-sm text-[var(--ink-tertiary)]">{contactDetail}</p>
        </div>

        <ChevronDown
          className={cn('mt-1 h-5 w-5 shrink-0 text-[var(--ink-tertiary)] transition-transform', expanded && 'rotate-180')}
        />
      </div>

      <AnimatePresence initial={false}>
        {expanded ? (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-[color:var(--rule)]/65 bg-[color:var(--surface-raised)]/55 px-[var(--space-4)] py-[var(--space-3)]">
              <div className="flex flex-wrap gap-2">
                {player.status !== 'checked-in' ? (
                  <ActionChip
                    label="Check In"
                    icon={<UserCheck className="h-4 w-4" />}
                    className="bg-[color:var(--success)]/12 text-[var(--success)]"
                    onClick={onQuickCheckIn}
                  />
                ) : (
                  <ActionChip
                    label="Mark Missing"
                    icon={<Circle className="h-4 w-4" />}
                    className="bg-[color:var(--surface)] text-[var(--ink-secondary)]"
                    onClick={onQuickCheckIn}
                  />
                )}

                {player.status === 'not-arrived' ? (
                  <ActionChip
                    label="Set ETA"
                    icon={<Clock className="h-4 w-4" />}
                    className="bg-[color:var(--warning)]/12 text-[var(--warning)]"
                    onClick={onSetETA}
                  />
                ) : null}

                {player.status !== 'checked-in' && player.status !== 'no-show' ? (
                  <ActionChip
                    label="No Show"
                    icon={<UserX className="h-4 w-4" />}
                    className="bg-[color:var(--error)]/12 text-[var(--error)]"
                    onClick={onMarkNoShow}
                  />
                ) : null}

                {onCall && player.phone ? (
                  <ActionChip
                    label="Call"
                    icon={<Phone className="h-4 w-4" />}
                    className="bg-[color:var(--surface)] text-[var(--ink)]"
                    onClick={onCall}
                  />
                ) : null}

                {onText && player.phone ? (
                  <ActionChip
                    label="Text"
                    icon={<MessageSquare className="h-4 w-4" />}
                    className="bg-[color:var(--surface)] text-[var(--ink)]"
                    onClick={onText}
                  />
                ) : null}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

function ActionChip({
  label,
  icon,
  className,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  className: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-xl px-[var(--space-3)] py-[0.7rem] text-sm font-semibold transition-transform hover:scale-[1.02]',
        className
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function ETAModal({
  player,
  onSetETA,
  onClose,
}: {
  player: AttendeePlayer;
  onSetETA: (eta: string) => void;
  onClose: () => void;
}) {
  const [customETA, setCustomETA] = useState('');

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-[color:var(--ink)]/55 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close ETA picker"
      />

      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        className="relative w-full max-w-md overflow-hidden rounded-[1.8rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,239,232,1))] shadow-[0_26px_60px_rgba(17,15,10,0.28)]"
      >
        <div className="border-b border-[color:var(--rule)]/70 px-[var(--space-5)] py-[var(--space-4)]">
          <div className="flex items-start justify-between gap-[var(--space-3)]">
            <div className="flex gap-[var(--space-3)]">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem] bg-[linear-gradient(135deg,var(--maroon)_0%,var(--maroon-dark)_100%)] text-[var(--canvas)]">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <p className="type-overline tracking-[0.16em] text-[var(--maroon)]">Arrival Window</p>
                <h3 className="mt-[var(--space-2)] font-serif text-[1.8rem] italic leading-none text-[var(--ink)]">
                  {player.firstName} {player.lastName}
                </h3>
                <p className="mt-[var(--space-2)] text-sm text-[var(--ink-secondary)]">
                  Pick the cleanest estimate instead of writing a captain’s note to yourself.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--surface)] text-[var(--ink-tertiary)] transition-colors hover:text-[var(--ink)]"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="space-y-[var(--space-4)] px-[var(--space-5)] py-[var(--space-5)]">
          <div className="grid gap-2 sm:grid-cols-2">
            {ETA_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => onSetETA(option.value)}
                className="rounded-[1.15rem] border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/90 px-[var(--space-4)] py-[var(--space-3)] text-left text-sm font-semibold text-[var(--ink)] transition-all hover:border-[var(--maroon-subtle)] hover:bg-[color:var(--surface)]"
              >
                {option.label}
              </button>
            ))}
          </div>

          <div className="rounded-[1.25rem] border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/82 p-[var(--space-4)]">
            <label className="block text-sm font-semibold text-[var(--ink)]">Custom arrival note</label>
            <div className="mt-2 flex gap-2">
              <input
                type="text"
                value={customETA}
                onChange={(event) => setCustomETA(event.target.value)}
                placeholder="e.g. 8:45 AM at the lot"
                className="flex-1 rounded-xl border border-[color:var(--rule)]/75 bg-[color:var(--canvas)]/88 px-4 py-3 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--ink-tertiary)] focus:border-[var(--maroon-subtle)]"
              />
              <button
                type="button"
                onClick={() => {
                  if (customETA.trim()) onSetETA(customETA.trim());
                }}
                disabled={!customETA.trim()}
                className="rounded-xl bg-[var(--maroon)] px-[var(--space-4)] py-3 text-sm font-semibold text-[var(--canvas)] transition-all disabled:cursor-not-allowed disabled:opacity-45"
              >
                Set
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default AttendanceCheckIn;
