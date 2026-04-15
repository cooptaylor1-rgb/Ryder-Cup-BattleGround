'use client';

import React from 'react';
import { Edit2, Mail, Trash2 } from 'lucide-react';
import { cn, formatPlayerName } from '@/lib/utils';
import type { Player } from '@/lib/types/models';

export interface RosterPlayerQuickAction {
  id: string;
  label: string;
  onClick: () => void;
  tone?: 'usa' | 'europe' | 'neutral';
}

type RosterTone = 'usa' | 'europe' | 'neutral';

const rosterToneStyles: Record<
  RosterTone,
  {
    panel: string;
    eyebrow: string;
    badge: string;
    avatar: string;
    icon: string;
  }
> = {
  usa: {
    panel:
      'border-[color:var(--team-usa)]/18 bg-[linear-gradient(180deg,rgba(30,58,95,0.08),rgba(255,255,255,0.96))]',
    eyebrow: 'text-[var(--team-usa)]',
    badge:
      'border-[color:var(--team-usa)]/16 bg-[color:var(--team-usa)]/10 text-[var(--team-usa)]',
    avatar: 'bg-[var(--team-usa)]',
    icon: 'text-[var(--team-usa)]',
  },
  europe: {
    panel:
      'border-[color:var(--team-europe)]/18 bg-[linear-gradient(180deg,rgba(114,47,55,0.08),rgba(255,255,255,0.96))]',
    eyebrow: 'text-[var(--team-europe)]',
    badge:
      'border-[color:var(--team-europe)]/16 bg-[color:var(--team-europe)]/10 text-[var(--team-europe)]',
    avatar: 'bg-[var(--team-europe)]',
    icon: 'text-[var(--team-europe)]',
  },
  neutral: {
    panel:
      'border-[color:var(--gold)]/14 bg-[linear-gradient(180deg,rgba(201,162,39,0.08),rgba(255,255,255,0.96))]',
    eyebrow: 'text-[var(--gold-dark)]',
    badge:
      'border-[color:var(--gold)]/16 bg-[color:var(--gold)]/12 text-[var(--gold-dark)]',
    avatar: 'bg-[var(--ink-tertiary)]',
    icon: 'text-[var(--gold-dark)]',
  },
};

export function PlayersFactCard({
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

export function RosterSectionCard({
  title,
  eyebrow,
  description,
  players,
  tone,
  canEdit,
  onEdit,
  onDelete,
  getQuickActions,
}: {
  title: string;
  eyebrow: string;
  description: string;
  players: Player[];
  tone: RosterTone;
  canEdit: boolean;
  onEdit: (player: Player) => void;
  onDelete: (player: Player) => void;
  getQuickActions?: (player: Player) => RosterPlayerQuickAction[];
}) {
  const toneStyles = rosterToneStyles[tone];

  return (
    <section
      className={cn(
        'overflow-hidden rounded-[1.8rem] border shadow-[0_18px_36px_rgba(46,34,18,0.06)]',
        toneStyles.panel
      )}
    >
      <div className="border-b border-[color:var(--rule)]/75 px-[var(--space-5)] py-[var(--space-5)]">
        <div className="flex items-start justify-between gap-[var(--space-4)]">
          <div>
            <p className={cn('type-overline tracking-[0.16em]', toneStyles.eyebrow)}>
              {eyebrow}
            </p>
            <h2 className="mt-[var(--space-2)] type-display-sm text-[var(--ink)]">{title}</h2>
            <p className="mt-[var(--space-2)] type-body-sm text-[var(--ink-secondary)]">
              {description}
            </p>
          </div>

          <div
            className={cn(
              'rounded-full border px-[var(--space-3)] py-[var(--space-2)]',
              toneStyles.badge
            )}
          >
            <span className="type-caption font-semibold">{players.length}</span>
          </div>
        </div>
      </div>

      {players.length === 0 ? (
        <div className="px-[var(--space-5)] py-[var(--space-6)]">
          <div className="rounded-[1.25rem] border border-dashed border-[color:var(--rule)]/75 bg-[rgba(255,255,255,0.55)] px-[var(--space-4)] py-[var(--space-5)] text-center">
            <p className="type-title-sm text-[var(--ink)]">No players here yet</p>
            <p className="mt-[var(--space-2)] type-caption">
              Once players land in this section, the roster will feel settled.
            </p>
          </div>
        </div>
      ) : (
        <div className="px-[var(--space-3)] py-[var(--space-3)]">
          {players.map((player, index) => (
            <RosterPlayerRow
              key={player.id}
              player={player}
              tone={tone}
              canEdit={canEdit}
              quickActions={getQuickActions?.(player) ?? []}
              onEdit={() => onEdit(player)}
              onDelete={() => onDelete(player)}
              className={index > 0 ? 'mt-[var(--space-2)]' : undefined}
            />
          ))}
        </div>
      )}
    </section>
  );
}

const RosterPlayerRow = React.memo(function RosterPlayerRow({
  player,
  tone,
  canEdit,
  quickActions,
  onEdit,
  onDelete,
  className,
}: {
  player: Player;
  tone: RosterTone;
  canEdit: boolean;
  quickActions: RosterPlayerQuickAction[];
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}) {
  const initials = `${player.firstName?.[0] || '?'}${player.lastName?.[0] || '?'}`;
  const toneStyles = rosterToneStyles[tone];
  const quickActionToneClass = (actionTone: RosterPlayerQuickAction['tone']) => {
    if (actionTone === 'usa') {
      return 'border-[color:var(--team-usa)]/16 bg-[color:var(--team-usa)]/10 text-[var(--team-usa)] hover:bg-[color:var(--team-usa)]/14';
    }
    if (actionTone === 'europe') {
      return 'border-[color:var(--team-europe)]/16 bg-[color:var(--team-europe)]/10 text-[var(--team-europe)] hover:bg-[color:var(--team-europe)]/14';
    }

    return 'border-[color:var(--gold)]/16 bg-[color:var(--gold)]/10 text-[var(--gold-dark)] hover:bg-[color:var(--gold)]/16';
  };

  return (
    <div
      className={cn(
        'flex items-center gap-[var(--space-4)] rounded-[1.2rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.82)] px-[var(--space-4)] py-[var(--space-4)] transition-colors hover:bg-[var(--canvas-raised)]',
        className
      )}
    >
      <div
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[0.8rem] font-semibold text-[var(--canvas)] shadow-[0_10px_20px_rgba(26,24,21,0.12)]',
          toneStyles.avatar
        )}
      >
        {initials}
      </div>

      <div className="min-w-0 flex-1">
        <p className="type-title-sm truncate text-[var(--ink)]">
          {formatPlayerName(player.firstName, player.lastName)}
        </p>
        <div className="mt-[var(--space-2)] flex flex-wrap items-center gap-[var(--space-2)]">
          <span className="inline-flex items-center gap-[var(--space-1)] rounded-full border border-[var(--rule)] bg-[var(--canvas)] px-[var(--space-2)] py-[5px] text-[0.74rem] font-semibold text-[var(--ink-secondary)]">
            HCP {player.handicapIndex?.toFixed(1) ?? '—'}
          </span>
          {player.email ? (
            <span className="inline-flex max-w-full items-center gap-[var(--space-1)] rounded-full border border-[var(--rule)] bg-[var(--canvas)] px-[var(--space-2)] py-[5px] text-[0.74rem] font-semibold text-[var(--ink-secondary)]">
              <Mail size={12} className={toneStyles.icon} />
              <span className="truncate">{player.email}</span>
            </span>
          ) : null}
        </div>

        {canEdit && quickActions.length > 0 ? (
          <div className="mt-[var(--space-3)] flex flex-wrap items-center gap-[var(--space-2)]">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={action.onClick}
                className={cn(
                  'rounded-full border px-[var(--space-3)] py-[6px] text-[0.72rem] font-semibold transition-colors',
                  quickActionToneClass(action.tone)
                )}
              >
                {action.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {canEdit ? (
        <div className="flex items-center gap-[var(--space-2)]">
          <button
            onClick={onEdit}
            className="rounded-full border border-[var(--rule)] bg-[var(--canvas-raised)] p-[var(--space-2)] text-[var(--ink-secondary)] transition-colors hover:bg-[var(--canvas-sunken)]"
            aria-label={`Edit ${formatPlayerName(player.firstName, player.lastName)}`}
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={onDelete}
            className="rounded-full border border-[color:var(--error)]/20 bg-[color:var(--error)]/8 p-[var(--space-2)] text-[var(--error)] transition-colors hover:bg-[color:var(--error)]/12"
            aria-label={`Delete ${formatPlayerName(player.firstName, player.lastName)}`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ) : null}
    </div>
  );
});
