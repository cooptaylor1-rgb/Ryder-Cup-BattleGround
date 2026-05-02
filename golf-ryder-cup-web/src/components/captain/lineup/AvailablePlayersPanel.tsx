'use client';

import { Users, ChevronDown, ChevronUp } from 'lucide-react';

import type { BuilderTeam, Player } from '../lineupBuilderTypes';
import { PlayerChip } from './PlayerChip';

export interface RosterToggleProps {
  team: BuilderTeam;
  label: string;
  isActive: boolean;
  onClick: () => void;
}

export function RosterToggle({ team, label, isActive, onClick }: RosterToggleProps) {
  const color = team === 'A' ? 'var(--team-usa)' : 'var(--team-europe)';

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all"
      style={{
        background: isActive ? color : 'var(--surface)',
        color: isActive ? 'white' : 'var(--ink-secondary)',
        border: `1px solid ${isActive ? color : 'var(--rule)'}`,
      }}
    >
      <Users className="w-4 h-4" />
      {label}
      {isActive ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
    </button>
  );
}

export interface AvailablePlayersPanelProps {
  team: BuilderTeam;
  teamLabel: string;
  players: Player[];
  onDragStart: (player: Player) => void;
  onDragEnd: () => void;
  /** Tap-to-place handler. Tapping a chip toggles whether this player
   *  is the currently held selection; tapping a match slot then drops
   *  the held player there. Used as the touch-device fallback for the
   *  HTML5 drag flow, which doesn't fire on mobile. */
  onSelectPlayer?: (player: Player) => void;
  selectedPlayerId?: string | null;
  isLocked: boolean;
}

export function AvailablePlayersPanel({
  team,
  teamLabel,
  players,
  onDragStart,
  onDragEnd,
  onSelectPlayer,
  selectedPlayerId,
  isLocked,
}: AvailablePlayersPanelProps) {
  const color = team === 'A' ? 'var(--team-usa)' : 'var(--team-europe)';

  if (players.length === 0) {
    return (
      <div
        className="rounded-[22px] border border-[color:var(--rule)] bg-[color:var(--canvas)]/72 p-4 text-center"
        style={{ background: 'var(--surface)', border: '1px solid var(--rule)' }}
      >
        <p className="text-sm text-[var(--ink-secondary)]">All {teamLabel} players assigned</p>
      </div>
    );
  }

  return (
    <div
      className="rounded-[24px] border p-3"
      style={{
        background: `${color}10`,
        border: `1px solid ${color}30`,
      }}
    >
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color }}>
          {teamLabel}
        </p>
        <span className="text-xs text-[var(--ink-tertiary)]">{players.length} available</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {players.map((player) => (
          <PlayerChip
            key={player.id}
            player={player}
            onDragStart={() => onDragStart(player)}
            onDragEnd={onDragEnd}
            onSelect={onSelectPlayer ? () => onSelectPlayer(player) : undefined}
            isSelected={selectedPlayerId === player.id}
            isDraggable={!isLocked}
          />
        ))}
      </div>
    </div>
  );
}
