/**
 * A panel that lists all players from one team, with per-player check-in cards.
 */

import { cn } from '@/lib/utils';
import type { AttendeePlayer } from './attendanceTypes';
import { TEAM_TONE } from './attendanceTypes';
import { PlayerCheckInCard } from './PlayerCheckInCard';

interface TeamAttendancePanelProps {
  players: AttendeePlayer[];
  teamLabel: string;
  teamId: 'A' | 'B';
  onQuickCheckIn: (player: AttendeePlayer) => void;
  onSetETA: (player: AttendeePlayer) => void;
  onMarkNoShow: (player: AttendeePlayer) => void;
  onCall?: (playerId: string) => void;
  onText?: (playerId: string) => void;
}

export function TeamAttendancePanel({
  players,
  teamLabel,
  teamId,
  onQuickCheckIn,
  onSetETA,
  onMarkNoShow,
  onCall,
  onText,
}: TeamAttendancePanelProps) {
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
