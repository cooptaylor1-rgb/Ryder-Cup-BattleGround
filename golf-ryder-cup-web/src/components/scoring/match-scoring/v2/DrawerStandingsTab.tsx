/**
 * DrawerStandingsTab — Live session leaderboard.
 *
 * Pulled out of the cockpit (it was 6+ rows pushing the action down).
 * Lives in the drawer now and works as both a status surface and a
 * fast hop to another match in the session.
 */

'use client';

import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SessionLeaderboardRow } from './types';

interface DrawerStandingsTabProps {
  rows: SessionLeaderboardRow[];
  activeMatchId: string;
  teamAName: string;
  teamBName: string;
  teamAColor: string;
  teamBColor: string;
  onSelectMatch: (matchId: string) => void;
}

export function DrawerStandingsTab({
  rows,
  activeMatchId,
  teamAName,
  teamBName,
  teamAColor,
  teamBColor,
  onSelectMatch,
}: DrawerStandingsTabProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[color:var(--rule)] px-4 py-6 text-center">
        <p className="text-sm font-medium text-[var(--ink-secondary)]">
          No other matches in this session yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h2 className="font-serif text-[length:var(--text-lg)] text-[var(--ink)]">
        Session leaderboard
      </h2>
      <ol className="overflow-hidden rounded-2xl border border-[color:var(--rule)]">
        {rows.map((row, index) => {
          const isActive = row.matchId === activeMatchId;
          const leadColor =
            row.currentScore > 0
              ? teamAColor
              : row.currentScore < 0
                ? teamBColor
                : 'var(--ink-tertiary)';
          const leadLabel =
            row.currentScore > 0
              ? teamAName
              : row.currentScore < 0
                ? teamBName
                : row.holesPlayed > 0
                  ? 'All square'
                  : 'Not started';
          const isLast = index === rows.length - 1;

          return (
            <li key={row.matchId}>
              <button
                type="button"
                onClick={() => onSelectMatch(row.matchId)}
                aria-current={isActive ? 'true' : undefined}
                className={cn(
                  'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus-ring)]',
                  !isLast && 'border-b border-[color:var(--rule)]/70',
                  isActive && 'bg-[var(--masters-subtle)]'
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--canvas-sunken)] font-serif text-sm text-[var(--ink)]">
                  {row.matchOrder}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[var(--ink)]">
                    {row.teamALineup || teamAName}
                    <span className="text-[var(--ink-tertiary)]"> vs </span>
                    {row.teamBLineup || teamBName}
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
                    {row.holesPlayed > 0
                      ? `Thru ${row.holesPlayed} · ${row.holesRemaining} to play`
                      : row.status === 'completed'
                        ? 'Final'
                        : 'Scheduled'}
                  </p>
                </div>

                <div className="shrink-0 text-right">
                  <p
                    className="font-serif text-base leading-none tabular-nums"
                    style={{ color: leadColor }}
                  >
                    {row.displayScore}
                  </p>
                  <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
                    {leadLabel}
                  </p>
                </div>

                {!isActive && (
                  <ArrowRight size={14} className="shrink-0 text-[var(--ink-tertiary)]" />
                )}
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
