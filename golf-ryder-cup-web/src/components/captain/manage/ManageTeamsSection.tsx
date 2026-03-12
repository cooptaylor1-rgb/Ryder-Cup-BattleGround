'use client';

import { useState } from 'react';
import { PencilLine, Save, UserCheck } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { cn, formatPlayerName } from '@/lib/utils';
import type { Player, Team } from '@/lib/types/models';

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
            <div
              className={cn('rounded-full border px-[var(--space-2)] py-[6px]', teamTone?.badge)}
            >
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
              <div
                className={cn('rounded-full border px-[var(--space-2)] py-[5px]', teamTone?.badge)}
              >
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
