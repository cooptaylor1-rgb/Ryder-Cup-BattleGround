'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronRight, Plus, RotateCcw, Trophy } from 'lucide-react';
import { EmptyStatePremium } from '@/components/ui';
import {
  CATEGORY_DEFINITIONS,
  STAT_DEFINITIONS,
  formatStatValue,
  type StatDefinition,
  type TripStatCategory,
  type TripStatType,
} from '@/lib/types/tripStats';
import type { Player, UUID } from '@/lib/types/models';
import type { TripStatLeader } from '@/lib/services/tripStatsBoardService';
import { cn } from '@/lib/utils';

export function QuickTrackPanel({
  players,
  selectedPlayerId,
  setSelectedPlayerId,
  quickActions,
  onQuickTrack,
}: {
  players: Player[];
  selectedPlayerId: UUID | null;
  setSelectedPlayerId: (playerId: UUID) => void;
  quickActions: TripStatType[];
  onQuickTrack: (statType: TripStatType) => void;
}) {
  return (
    <section className="rounded-[1.85rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,238,231,0.99))] p-[var(--space-5)] shadow-[0_18px_38px_rgba(41,29,17,0.06)]">
      <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">Quick Track</p>
      <h2 className="mt-[var(--space-2)] font-serif text-[1.8rem] italic text-[var(--ink)]">
        Catch the stat before the group forgets it.
      </h2>
      <p className="mt-[var(--space-2)] max-w-[35rem] text-sm leading-7 text-[var(--ink-secondary)]">
        Pick a player once, then tap the moments that keep piling up during the round and in the cart.
      </p>

      <div className="mt-[var(--space-4)] flex gap-[var(--space-2)] overflow-x-auto pb-[var(--space-2)]">
        {players.map((player) => (
          <button
            key={player.id}
            type="button"
            onClick={() => setSelectedPlayerId(player.id)}
            className={cn(
              'whitespace-nowrap rounded-full border px-4 py-2 text-sm font-medium transition-transform duration-150 hover:scale-[1.01]',
              selectedPlayerId === player.id
                ? 'border-[var(--masters)]/24 bg-[color:var(--masters)]/10 text-[var(--masters)]'
                : 'border-[color:var(--rule)]/70 bg-[color:var(--surface)]/78 text-[var(--ink-secondary)]'
            )}
          >
            {player.firstName}
          </button>
        ))}
      </div>

      <div className="mt-[var(--space-4)] flex flex-wrap gap-[var(--space-3)]">
        {quickActions.map((statType) => {
          const definition = STAT_DEFINITIONS[statType];
          return (
            <button
              key={statType}
              type="button"
              disabled={!selectedPlayerId}
              onClick={() => onQuickTrack(statType)}
              className="rounded-[1rem] border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/82 px-4 py-3 text-sm font-medium text-[var(--ink)] transition-transform duration-150 hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-45"
            >
              {definition.emoji} {definition.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function StatPanel({
  definition,
  playerStats,
  players,
  onIncrement,
  onDecrement,
}: {
  definition: StatDefinition;
  playerStats: Map<UUID, number>;
  players: Player[];
  onIncrement: (playerId: UUID) => void;
  onDecrement: (playerId: UUID) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const total = [...playerStats.values()].reduce((sum, value) => sum + value, 0);
  const leader = [...playerStats.entries()].sort((left, right) => right[1] - left[1])[0];
  const leaderPlayer = leader ? players.find((player) => player.id === leader[0]) : undefined;

  return (
    <section className="rounded-[1.75rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,238,231,0.99))] shadow-[0_16px_34px_rgba(41,29,17,0.05)]">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-[var(--space-4)] px-[var(--space-5)] py-[var(--space-4)] text-left"
      >
        <div className="flex items-center gap-[var(--space-3)]">
          <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[color:var(--surface)] text-[1.35rem]">
            {definition.emoji}
          </div>
          <div>
            <h3 className="text-base font-semibold text-[var(--ink)]">{definition.label}</h3>
            <p className="mt-[2px] text-sm text-[var(--ink-secondary)]">{definition.description}</p>
          </div>
        </div>

        <div className="text-right">
          <p className="font-serif text-[1.85rem] italic leading-none text-[var(--ink)]">
            {formatStatValue(total, definition.unit)}
          </p>
          {leaderPlayer && leader && leader[1] > 0 ? (
            <p className="mt-[2px] text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
              Leader: {leaderPlayer.firstName}
            </p>
          ) : (
            <p className="mt-[2px] text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
              No leader yet
            </p>
          )}
        </div>
      </button>

      {expanded ? (
        <div className="border-t border-[color:var(--rule)]/70 px-[var(--space-5)] py-[var(--space-4)]">
          <div className="space-y-[var(--space-3)]">
            {players.map((player) => {
              const value = playerStats.get(player.id) ?? 0;

              return (
                <div key={player.id} className="flex items-center justify-between gap-[var(--space-4)] rounded-[1.15rem] bg-[color:var(--surface)]/82 px-[var(--space-4)] py-[var(--space-3)]">
                  <div>
                    <p className="text-sm font-semibold text-[var(--ink)]">
                      {player.firstName} {player.lastName}
                    </p>
                    <p className="text-xs text-[var(--ink-tertiary)]">{definition.label}</p>
                  </div>

                  <div className="flex items-center gap-[var(--space-2)]">
                    <button
                      type="button"
                      disabled={value === 0}
                      onClick={() => onDecrement(player.id)}
                      className="flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--rule)]/70 bg-[color:var(--surface-raised)] text-[var(--ink)] transition-transform duration-150 hover:scale-[1.04] disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <RotateCcw size={15} />
                    </button>
                    <div className="min-w-[5rem] text-center font-serif text-[1.45rem] italic text-[var(--ink)]">
                      {formatStatValue(value, definition.unit)}
                    </div>
                    <button
                      type="button"
                      onClick={() => onIncrement(player.id)}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-[var(--masters)] text-[var(--canvas)] transition-transform duration-150 hover:scale-[1.04]"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}

export function LeaderPanel({
  category,
  leaders,
}: {
  category: TripStatCategory;
  leaders: TripStatLeader[];
}) {
  const categoryDefinition = CATEGORY_DEFINITIONS[category];

  return (
    <section className="rounded-[1.8rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,239,232,0.99))] p-[var(--space-5)] shadow-[0_18px_38px_rgba(41,29,17,0.06)]">
      <p className="type-overline tracking-[0.15em] text-[var(--ink-tertiary)]">Category Leaders</p>
      <h2 className="mt-[var(--space-2)] font-serif text-[1.65rem] italic text-[var(--ink)]">
        {categoryDefinition.emoji} {categoryDefinition.label}
      </h2>

      {leaders.length === 0 ? (
        <p className="mt-[var(--space-3)] text-sm leading-7 text-[var(--ink-secondary)]">
          No leader yet. Track a few entries and this board will sort itself out.
        </p>
      ) : (
        <div className="mt-[var(--space-4)] space-y-[var(--space-3)]">
          {leaders.map((leader, index) => (
            <div
              key={leader.playerId}
              className="flex items-center gap-[var(--space-3)] rounded-[1.15rem] bg-[color:var(--surface)]/82 px-[var(--space-4)] py-[var(--space-3)]"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[color:var(--surface-raised)] text-sm font-semibold text-[var(--ink)]">
                {index + 1}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--ink)]">{leader.playerName}</p>
              </div>
              <div className="font-serif text-[1.25rem] italic text-[var(--ink)]">{leader.total}</div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function TripStatFactCard({
  label,
  value,
  detail,
  valueClassName,
}: {
  label: string;
  value: string | number;
  detail: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-[1.55rem] border border-[color:var(--canvas)]/16 bg-[color:var(--canvas)]/10 p-[var(--space-4)]">
      <p className="type-overline tracking-[0.14em] text-[color:var(--canvas)]/72">{label}</p>
      <p className={cn('mt-[var(--space-2)] font-serif text-[2rem] italic leading-none text-[var(--canvas)]', valueClassName)}>
        {value}
      </p>
      <p className="mt-[var(--space-2)] text-xs leading-5 text-[color:var(--canvas)]/72">{detail}</p>
    </div>
  );
}

export function MiniTotalCard({
  emoji,
  label,
  value,
}: {
  emoji: string;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center justify-between rounded-[1.15rem] bg-[color:var(--surface)]/82 px-[var(--space-4)] py-[var(--space-3)]">
      <div className="flex items-center gap-[var(--space-3)]">
        <span className="text-[1.4rem]">{emoji}</span>
        <span className="text-sm font-semibold text-[var(--ink)]">{label}</span>
      </div>
      <span className="font-serif text-[1.25rem] italic text-[var(--ink)]">{value}</span>
    </div>
  );
}

export function TripAwardsLinkCard() {
  return (
    <LinkCard
      href="/trip-stats/awards"
      icon={<Trophy size={18} />}
      title="Trip awards"
      body="Turn the stat sheet into a proper awards board once the group has accumulated enough nonsense."
      cta="Open awards"
    />
  );
}

function LinkCard({
  href,
  icon,
  title,
  body,
  cta,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  body: string;
  cta: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-[1.8rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,239,232,0.99))] p-[var(--space-5)] shadow-[0_18px_38px_rgba(41,29,17,0.06)] transition-transform duration-150 hover:scale-[1.01]"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[color:var(--masters)]/12 text-[var(--masters)]">
        {icon}
      </div>
      <h2 className="mt-[var(--space-3)] font-serif text-[1.6rem] italic text-[var(--ink)]">{title}</h2>
      <p className="mt-[var(--space-2)] text-sm leading-7 text-[var(--ink-secondary)]">{body}</p>
      <div className="mt-[var(--space-4)] flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
        {cta}
        <ChevronRight size={14} />
      </div>
    </Link>
  );
}
