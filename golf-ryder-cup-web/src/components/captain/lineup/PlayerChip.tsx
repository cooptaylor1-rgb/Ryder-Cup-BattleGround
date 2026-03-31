'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { GripVertical, X } from 'lucide-react';

import type { Player } from '../lineupBuilderTypes';

export interface PlayerChipProps {
  player: Player;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onRemove?: () => void;
  isDraggable?: boolean;
  showRemove?: boolean;
  size?: 'sm' | 'md';
}

export const PlayerChip = React.memo(function PlayerChip({
  player,
  onDragStart,
  onDragEnd,
  onRemove,
  isDraggable = true,
  showRemove = false,
  size = 'md',
}: PlayerChipProps) {
  const color = player.team === 'A' ? 'var(--team-usa)' : 'var(--team-europe)';
  const initials = `${player.firstName[0]}${player.lastName[0]}`;

  return (
    <div
      draggable={isDraggable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className={cn(
        'flex items-center gap-2 rounded-lg transition-all',
        isDraggable && 'cursor-grab active:cursor-grabbing active:scale-95',
        size === 'sm' ? 'px-2 py-1' : 'px-3 py-2'
      )}
      style={{
        background: 'var(--surface)',
        border: `1px solid ${color}50`,
      }}
    >
      {isDraggable && (
        <GripVertical className="w-3 h-3" style={{ color: 'var(--ink-tertiary)' }} />
      )}

      {player.avatarUrl ? (
        <Image
          src={player.avatarUrl}
          alt={player.firstName}
          width={size === 'sm' ? 24 : 32}
          height={size === 'sm' ? 24 : 32}
          className={cn('rounded-full', size === 'sm' ? 'w-6 h-6' : 'w-8 h-8')}
          style={{ border: `2px solid ${color}` }}
        />
      ) : (
        <div
          className={cn(
            'rounded-full flex items-center justify-center font-bold',
            size === 'sm' ? 'w-6 h-6 text-xs' : 'w-8 h-8 text-sm'
          )}
          style={{
            background: `${color}20`,
            color,
          }}
        >
          {initials}
        </div>
      )}

      <div className="min-w-0">
        <p
          className={cn('font-medium truncate', size === 'sm' ? 'text-xs' : 'text-sm')}
          style={{ color: 'var(--ink)' }}
        >
          {player.firstName} {player.lastName[0]}.
        </p>
        <p className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
          {player.handicapIndex.toFixed(1)} HCP
        </p>
      </div>

      {showRemove && onRemove && (
        <button
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          className="p-1 rounded-md transition-colors"
          style={{ color: 'var(--ink-tertiary)' }}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
});
