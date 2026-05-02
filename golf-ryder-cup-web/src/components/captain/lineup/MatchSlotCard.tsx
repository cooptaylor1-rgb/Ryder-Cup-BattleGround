'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Scale, Trash2, User } from 'lucide-react';

import type { BuilderTeam, MatchSlot, Player } from '../lineupBuilderTypes';
import { PlayerChip } from './PlayerChip';

interface DropZoneProps {
  team: BuilderTeam;
  teamLabel: string;
  players: Player[];
  playersNeeded: number;
  onDrop: () => void;
  onRemovePlayer: (playerId: string) => void;
  isDragging: boolean;
  isLocked: boolean;
}

function DropZone({
  team,
  teamLabel,
  players,
  playersNeeded,
  onDrop,
  onRemovePlayer,
  isDragging,
  isLocked,
}: DropZoneProps) {
  const color = team === 'A' ? 'var(--team-usa)' : 'var(--team-europe)';
  const emptySlots = playersNeeded - players.length;

  return (
    <div
      onDragOver={(event) => {
        event.preventDefault();
        if (!isLocked) event.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(event) => {
        event.preventDefault();
        if (!isLocked) onDrop();
      }}
      onClick={() => {
        // Tap-to-place fallback for touch devices. Only fires the drop
        // when something is actually held — otherwise an accidental tap
        // on an empty slot does nothing instead of clearing state.
        if (!isLocked && isDragging) onDrop();
      }}
      role={isDragging ? 'button' : undefined}
      className={cn(
        'p-3 rounded-xl min-h-20 transition-all',
        isDragging && 'ring-2 ring-dashed cursor-pointer'
      )}
      style={{
        background: `${color}10`,
        border: `1px solid ${color}30`,
      }}
    >
      <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color }}>
        {teamLabel}
      </div>
      <div className="space-y-2">
        {players.map((player) => (
          <PlayerChip
            key={player.id}
            player={player}
            onRemove={() => onRemovePlayer(player.id)}
            showRemove={!isLocked}
            isDraggable={false}
            size="sm"
          />
        ))}

        {emptySlots > 0 && (
          <div
            className="flex items-center justify-center gap-2 py-3 rounded-lg border-2 border-dashed"
            style={{
              borderColor: `${color}40`,
              color: 'var(--ink-tertiary)',
            }}
          >
            <User className="w-4 h-4" />
            <span className="text-xs">
              {isDragging
                ? 'Tap or drop here'
                : `${emptySlots} player${emptySlots > 1 ? 's' : ''} needed`}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export interface MatchSlotCardProps {
  match: MatchSlot;
  matchNumber: number;
  playersPerTeam: number;
  teamALabel: string;
  teamBLabel: string;
  onDrop: (team: BuilderTeam) => void;
  onRemovePlayer: (playerId: string) => void;
  onDeleteMatch: () => void;
  isDragging: boolean;
  draggedPlayerTeam?: BuilderTeam;
  isLocked: boolean;
  /** Points on the line for this match, surfaced inline so captains see
   *  the stakes per pairing without bouncing back to session settings. */
  pointsPerMatch?: number;
}

/**
 * Map a per-match handicap delta to a balance tone. Thresholds chosen to
 * mirror the FairnessIndicator color gates (>= 80% = green, >= 60% = amber)
 * so the per-match dot agrees with the section-level rollup; the math is
 * intentionally rough — it is a "before you commit" preview, not a final
 * fairness audit.
 */
function getBalanceTone(delta: number): 'good' | 'warn' | 'poor' {
  if (delta <= 2) return 'good';
  if (delta <= 5) return 'warn';
  return 'poor';
}

export const MatchSlotCard = React.memo(function MatchSlotCard({
  match,
  matchNumber,
  playersPerTeam,
  teamALabel,
  teamBLabel,
  onDrop,
  onRemovePlayer,
  onDeleteMatch,
  isDragging,
  draggedPlayerTeam,
  isLocked,
  pointsPerMatch,
}: MatchSlotCardProps) {
  const teamAComplete = match.teamAPlayers.length === playersPerTeam;
  const teamBComplete = match.teamBPlayers.length === playersPerTeam;
  const isComplete = teamAComplete && teamBComplete;

  const teamAHandicap = match.teamAPlayers.reduce((sum, player) => sum + player.handicapIndex, 0);
  const teamBHandicap = match.teamBPlayers.reduce((sum, player) => sum + player.handicapIndex, 0);
  const handicapDelta = Math.abs(teamAHandicap - teamBHandicap);
  // Only show the balance dot once both sides have at least one player;
  // before that the delta is a meaningless "X vs 0".
  const showBalance = match.teamAPlayers.length > 0 && match.teamBPlayers.length > 0;
  const balanceTone = showBalance ? getBalanceTone(handicapDelta) : null;
  const balanceDotColor =
    balanceTone === 'good'
      ? 'var(--success)'
      : balanceTone === 'warn'
        ? 'var(--warning)'
        : 'var(--error)';
  const balanceLabel =
    balanceTone === 'good' ? 'Even' : balanceTone === 'warn' ? 'Tilted' : 'Lopsided';

  return (
    <div
      className={cn(
        'rounded-[28px] border p-4 transition-all sm:p-5',
        isComplete && 'ring-2 ring-success ring-offset-2 ring-offset-canvas'
      )}
      style={{
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.78) 0%, rgba(245,240,233,0.96) 100%)',
        border: '1px solid var(--rule)',
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span
            className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm"
            style={{
              background: isComplete ? 'var(--success)' : 'var(--surface-raised)',
              color: isComplete ? 'var(--canvas)' : 'var(--ink-secondary)',
            }}
          >
            {matchNumber}
          </span>
          <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
            Match {matchNumber}
          </span>
          {pointsPerMatch !== undefined && pointsPerMatch > 0 && (
            <span
              className="rounded-full border border-[color:var(--rule)]/75 bg-[color:var(--surface-raised)] px-2 py-[2px] text-[10px] font-semibold uppercase tracking-[0.12em]"
              style={{ color: 'var(--ink-tertiary)' }}
              title={`Worth ${pointsPerMatch} point${pointsPerMatch === 1 ? '' : 's'}`}
            >
              {pointsPerMatch} pt{pointsPerMatch === 1 ? '' : 's'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {showBalance && (
            <div
              className="flex items-center gap-1.5 rounded-full border px-2 py-1 text-xs"
              style={{
                borderColor: 'var(--rule)',
                background: 'var(--surface-raised)',
                color: 'var(--ink-tertiary)',
              }}
              title={`${teamALabel} ${teamAHandicap.toFixed(1)} vs ${teamBLabel} ${teamBHandicap.toFixed(1)} — ${balanceLabel}`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: balanceDotColor }}
                aria-hidden="true"
              />
              <Scale className="w-3 h-3" />
              <span>
                Δ {handicapDelta.toFixed(1)}
              </span>
              <span className="text-[var(--ink-secondary)]">· {balanceLabel}</span>
            </div>
          )}

          {!isLocked && (
            <div className="relative group">
              <button
                onClick={onDeleteMatch}
                className="p-1.5 rounded-lg transition-colors text-[var(--error)] hover:bg-[color:var(--error)]/10"
                aria-label={`Delete Match ${matchNumber}`}
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <div
                className="absolute right-0 top-full mt-1 px-2 py-1 rounded text-xs font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10"
                style={{
                  background: 'var(--ink)',
                  color: 'var(--canvas)',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                }}
              >
                Remove this match
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <DropZone
          team="A"
          teamLabel={teamALabel}
          players={match.teamAPlayers}
          playersNeeded={playersPerTeam}
          onDrop={() => onDrop('A')}
          onRemovePlayer={onRemovePlayer}
          isDragging={isDragging && draggedPlayerTeam === 'A'}
          isLocked={isLocked}
        />
        <DropZone
          team="B"
          teamLabel={teamBLabel}
          players={match.teamBPlayers}
          playersNeeded={playersPerTeam}
          onDrop={() => onDrop('B')}
          onRemovePlayer={onRemovePlayer}
          isDragging={isDragging && draggedPlayerTeam === 'B'}
          isLocked={isLocked}
        />
      </div>
    </div>
  );
});
