/**
 * Captain roll-call board for pre-round attendance.
 */

'use client';

import { useMemo, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { RefreshCw, Search, UserCheck } from 'lucide-react';

import {
  type AttendanceStatus,
  type AttendeePlayer,
  type AttendanceStats,
  STATUS_ORDER,
  getStatusConfig,
  getTimeUntil,
} from './attendance/attendanceTypes';

import { AttendanceMetricCard } from './attendance/AttendanceMetricCard';
import { FilterChip } from './attendance/FilterChip';
import { TeamAttendancePanel } from './attendance/TeamAttendancePanel';
import { ETAModal } from './attendance/ETAModal';

export type { AttendanceStatus, AttendeePlayer, AttendanceStats };

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

export default AttendanceCheckIn;
