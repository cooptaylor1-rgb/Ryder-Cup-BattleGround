'use client';

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
      className={cn('p-3 rounded-xl min-h-20 transition-all', isDragging && 'ring-2 ring-dashed')}
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
              {isDragging ? 'Drop here' : `${emptySlots} player${emptySlots > 1 ? 's' : ''} needed`}
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
}

export function MatchSlotCard({
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
}: MatchSlotCardProps) {
  const teamAComplete = match.teamAPlayers.length === playersPerTeam;
  const teamBComplete = match.teamBPlayers.length === playersPerTeam;
  const isComplete = teamAComplete && teamBComplete;

  const teamAHandicap = match.teamAPlayers.reduce((sum, player) => sum + player.handicapIndex, 0);
  const teamBHandicap = match.teamBPlayers.reduce((sum, player) => sum + player.handicapIndex, 0);

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
        </div>

        <div className="flex items-center gap-2">
          {match.teamAPlayers.length > 0 && match.teamBPlayers.length > 0 && (
            <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--ink-tertiary)' }}>
              <Scale className="w-3 h-3" />
              {teamAHandicap.toFixed(1)} vs {teamBHandicap.toFixed(1)}
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
}
