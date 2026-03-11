'use client';

import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { SIDE_BET_DEFINITIONS } from '@/lib/constants';
import type { Player, SideBet, SideBetType } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import {
  Check,
  Clock,
  Crown,
  DollarSign,
  Edit3,
  Save,
  Trash2,
  X,
} from 'lucide-react';

export function BetComposerModal({
  betTypes,
  editingBet,
  players,
  newBetType,
  newBetName,
  newBetDescription,
  newBetPot,
  newBetHole,
  selectedParticipants,
  isSubmitting,
  onClose,
  onTypeChange,
  onNameChange,
  onDescriptionChange,
  onPotChange,
  onHoleChange,
  onParticipantsChange,
  onSubmit,
}: {
  betTypes: typeof SIDE_BET_DEFINITIONS;
  editingBet: SideBet | null;
  players: Player[];
  newBetType: SideBetType;
  newBetName: string;
  newBetDescription: string;
  newBetPot: number;
  newBetHole: number | undefined;
  selectedParticipants: string[];
  isSubmitting: boolean;
  onClose: () => void;
  onTypeChange: (type: SideBetType) => void;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onPotChange: (value: number) => void;
  onHoleChange: (value: number | undefined) => void;
  onParticipantsChange: (value: string[]) => void;
  onSubmit: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-[color:var(--ink)]/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[560px] overflow-auto rounded-[1.8rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,239,232,1))] p-[var(--space-5)] shadow-[0_26px_60px_rgba(17,15,10,0.28)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-[var(--space-3)]">
          <div>
            <p className="type-overline tracking-[0.16em] text-[var(--maroon)]">
              {editingBet ? 'Edit Bet' : 'Create Bet'}
            </p>
            <h2 className="mt-[var(--space-2)] font-serif text-[1.95rem] italic text-[var(--ink)]">
              Keep the wager readable.
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--surface)] text-[var(--ink-tertiary)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-[var(--space-5)] space-y-[var(--space-4)]">
          {!editingBet ? (
            <div className="rounded-[1.2rem] border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/82 p-[var(--space-3)]">
              <p className="type-overline tracking-[0.15em] text-[var(--ink-tertiary)]">Bet Type</p>
              <div className="mt-[var(--space-3)] flex flex-wrap gap-2">
                {betTypes.map((betType) => (
                  <button
                    key={betType.type}
                    type="button"
                    onClick={() => onTypeChange(betType.type)}
                    className={cn(
                      'rounded-full px-3 py-2 text-sm font-semibold transition-colors',
                      newBetType === betType.type
                        ? 'bg-[var(--maroon)] text-[var(--canvas)]'
                        : 'bg-[color:var(--canvas)]/74 text-[var(--ink-secondary)]'
                    )}
                  >
                    {betType.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <label className="block">
            <span className="mb-[var(--space-2)] block text-sm font-semibold text-[var(--ink)]">Name</span>
            <input
              type="text"
              value={newBetName}
              onChange={(event) => onNameChange(event.target.value)}
              className="input w-full"
              placeholder="Skins Game"
            />
          </label>

          <label className="block">
            <span className="mb-[var(--space-2)] block text-sm font-semibold text-[var(--ink)]">Description</span>
            <input
              type="text"
              value={newBetDescription}
              onChange={(event) => onDescriptionChange(event.target.value)}
              className="input w-full"
              placeholder="$5 per hole, carryovers, par-3 only..."
            />
          </label>

          <div className="grid gap-[var(--space-4)] sm:grid-cols-2">
            <label className="block">
              <span className="mb-[var(--space-2)] block text-sm font-semibold text-[var(--ink)]">Pot Amount</span>
              <input
                type="number"
                value={newBetPot}
                onChange={(event) => onPotChange(Number(event.target.value))}
                className="input w-full"
                min={0}
              />
            </label>
            <label className="block">
              <span className="mb-[var(--space-2)] block text-sm font-semibold text-[var(--ink)]">Hole</span>
              <input
                type="number"
                value={newBetHole || ''}
                onChange={(event) => onHoleChange(event.target.value ? Number(event.target.value) : undefined)}
                className="input w-full"
                min={1}
                max={18}
                placeholder="Any"
              />
            </label>
          </div>

          {!editingBet ? (
            <div className="rounded-[1.2rem] border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/82 p-[var(--space-3)]">
              <p className="type-overline tracking-[0.15em] text-[var(--ink-tertiary)]">Participants</p>
              <div className="mt-[var(--space-3)] flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onParticipantsChange(
                      selectedParticipants.length === players.length ? [] : players.map((player) => player.id)
                    )
                  }
                  className={cn(
                    'rounded-full px-3 py-2 text-sm font-semibold transition-colors',
                    selectedParticipants.length === players.length
                      ? 'bg-[var(--maroon)] text-[var(--canvas)]'
                      : 'bg-[color:var(--canvas)]/74 text-[var(--ink-secondary)]'
                  )}
                >
                  {selectedParticipants.length === players.length ? 'All In' : 'Select All'}
                </button>
                {players.map((player) => (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() =>
                      onParticipantsChange(
                        selectedParticipants.includes(player.id)
                          ? selectedParticipants.filter((id) => id !== player.id)
                          : [...selectedParticipants, player.id]
                      )
                    }
                    className={cn(
                      'rounded-full px-3 py-2 text-sm font-semibold transition-colors',
                      selectedParticipants.includes(player.id)
                        ? 'bg-[var(--maroon)] text-[var(--canvas)]'
                        : 'bg-[color:var(--canvas)]/74 text-[var(--ink-secondary)]'
                    )}
                  >
                    {player.firstName}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex gap-[var(--space-3)]">
            <Button variant="secondary" onClick={onClose} className="flex-1 justify-center">
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={onSubmit}
              isLoading={isSubmitting}
              leftIcon={<Save size={16} />}
              className="flex-1 justify-center"
            >
              {editingBet ? 'Save Changes' : 'Create Bet'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function BetManagementCard({
  bet,
  getPlayer,
  getBetMeta,
  onEdit,
  onDelete,
  onComplete,
  isCompleted,
}: {
  bet: SideBet;
  getPlayer: (id: string) => Player | undefined;
  getBetMeta: (type: SideBetType) => (typeof SIDE_BET_DEFINITIONS)[number] | undefined;
  onEdit?: () => void;
  onDelete: () => void;
  onComplete?: (winnerId?: string) => void;
  isCompleted?: boolean;
}) {
  const [showWinnerSelect, setShowWinnerSelect] = useState(false);
  const winner = bet.winnerId ? getPlayer(bet.winnerId) : null;
  const meta = getBetMeta(bet.type);
  const accent = meta?.accent || 'var(--maroon)';
  const Icon = meta?.icon || DollarSign;

  return (
    <div className="rounded-[1.45rem] border border-[color:var(--rule)]/70 bg-[color:var(--canvas)]/80 p-[var(--space-4)] shadow-[0_14px_28px_rgba(41,29,17,0.04)]">
      <div className="flex items-start gap-[var(--space-3)]">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem]"
          style={{
            background: isCompleted ? 'var(--success)' : `color-mix(in srgb, ${accent} 14%, white)`,
            color: isCompleted ? 'var(--canvas)' : accent,
          }}
        >
          {isCompleted ? <Check size={20} /> : <Icon size={20} />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-[var(--space-3)]">
            <div>
              <p className="font-serif text-[1.5rem] italic text-[var(--ink)]">{bet.name}</p>
              {bet.description ? (
                <p className="mt-[var(--space-2)] text-sm leading-6 text-[var(--ink-secondary)]">{bet.description}</p>
              ) : null}
            </div>
            {bet.pot ? (
              <span className="rounded-full bg-[color:var(--success)]/12 px-3 py-1 text-sm font-semibold text-[var(--success)]">
                ${bet.pot}
              </span>
            ) : null}
          </div>

          <div className="mt-[var(--space-3)] flex flex-wrap items-center gap-3 text-sm text-[var(--ink-secondary)]">
            {bet.hole ? <span>Hole {bet.hole}</span> : null}
            {isCompleted && winner ? (
              <span className="inline-flex items-center gap-1 text-[var(--success)]">
                <Crown size={14} />
                Won by {winner.firstName}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[var(--warning)]">
                <Clock size={14} />
                {bet.participantIds.length} players live
              </span>
            )}
          </div>
        </div>
      </div>

      {!isCompleted ? (
        <div className="mt-[var(--space-4)] border-t border-[color:var(--rule)]/65 pt-[var(--space-4)]">
          <div className="flex flex-wrap gap-2">
            {onEdit ? (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/82 px-[var(--space-4)] py-[var(--space-2)] text-sm font-semibold text-[var(--ink-secondary)]"
              >
                <Edit3 size={14} />
                Edit
              </button>
            ) : null}
            {onComplete && !showWinnerSelect ? (
              <button
                type="button"
                onClick={() => setShowWinnerSelect(true)}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--maroon)] px-[var(--space-4)] py-[var(--space-2)] text-sm font-semibold text-[var(--canvas)]"
              >
                <Check size={14} />
                Complete
              </button>
            ) : null}
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[color:var(--error)]/18 bg-[color:var(--error)]/10 px-[var(--space-3)] py-[var(--space-2)] text-sm font-semibold text-[var(--error)]"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>

          {showWinnerSelect && onComplete ? (
            <div className="mt-[var(--space-4)] rounded-[1.2rem] border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/82 p-[var(--space-3)]">
              <p className="text-sm font-semibold text-[var(--ink)]">Select winner</p>
              <div className="mt-[var(--space-3)] flex flex-wrap gap-2">
                {bet.participantIds
                  .flatMap((id) => {
                    const player = getPlayer(id);
                    return player ? [{ id, player }] : [];
                  })
                  .map(({ id, player }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        onComplete(id);
                        setShowWinnerSelect(false);
                      }}
                      className="rounded-full bg-[var(--maroon)] px-3 py-2 text-sm font-semibold text-[var(--canvas)]"
                    >
                      {player.firstName}
                    </button>
                  ))}
                <button
                  type="button"
                  onClick={() => {
                    onComplete();
                    setShowWinnerSelect(false);
                  }}
                  className="rounded-full bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--ink-secondary)]"
                >
                  No winner
                </button>
                <button
                  type="button"
                  onClick={() => setShowWinnerSelect(false)}
                  className="rounded-full border border-[color:var(--rule)]/70 bg-[color:var(--canvas)]/74 px-3 py-2 text-sm font-semibold text-[var(--ink-secondary)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function CaptainNote({
  title,
  body,
  icon,
  tone = 'ink',
}: {
  title: string;
  body: string;
  icon: ReactNode;
  tone?: 'ink' | 'maroon';
}) {
  return (
    <div
      className={cn(
        'rounded-[1.6rem] border p-[var(--space-5)] shadow-[0_16px_34px_rgba(41,29,17,0.05)]',
        tone === 'maroon'
          ? 'border-[color:var(--maroon)]/16 bg-[linear-gradient(180deg,rgba(104,35,48,0.10),rgba(255,255,255,0.98))]'
          : 'border-[color:var(--rule)]/70 bg-[color:var(--surface)]/82'
      )}
    >
      <div className="flex items-center gap-[var(--space-2)] text-[var(--ink-tertiary)]">
        {icon}
        <span className="type-overline tracking-[0.14em]">Captain Note</span>
      </div>
      <h3 className="mt-[var(--space-3)] font-serif text-[1.55rem] italic text-[var(--ink)]">{title}</h3>
      <p className="mt-[var(--space-2)] text-sm leading-6 text-[var(--ink-secondary)]">{body}</p>
    </div>
  );
}
