/**
 * DrawerMatchTab — This match's hole-by-hole timeline.
 *
 * Replaces the per-hole "previous score" mini-readout that lived inside
 * the score input panel in v1. Captains and any scorer can see the full
 * card here, jump to any hole, and verify what was recorded.
 */

'use client';

import { Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { CockpitScoring, CockpitTeams } from './types';

interface DrawerMatchTabProps {
  scoring: CockpitScoring;
  teams: CockpitTeams;
  onJumpToHole: (hole: number) => void;
}

export function DrawerMatchTab({ scoring, teams, onJumpToHole }: DrawerMatchTabProps) {
  const { matchState, currentHole } = scoring;
  const total = 18;

  // Build a per-hole row, including unscored holes, so the card shows the
  // full 18 even when only a few have been played.
  const resultByHole = new Map<number, (typeof matchState.holeResults)[number]>();
  for (const r of matchState.holeResults) resultByHole.set(r.holeNumber, r);

  const rows = Array.from({ length: total }, (_, i) => {
    const hole = i + 1;
    const result = resultByHole.get(hole);
    return { hole, result };
  }).reduce<Array<{ hole: number; result?: typeof matchState.holeResults[number]; runningScore: number }>>(
    (acc, row) => {
      const previous = acc.length > 0 ? acc[acc.length - 1].runningScore : 0;
      const delta =
        row.result?.winner === 'teamA' ? 1 : row.result?.winner === 'teamB' ? -1 : 0;
      acc.push({ ...row, runningScore: previous + delta });
      return acc;
    },
    []
  );

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-serif text-[length:var(--text-lg)] text-[var(--ink)]">
          Card · {teams.teamAName} vs {teams.teamBName}
        </h2>
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
          Tap any hole to score / edit
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[color:var(--rule)]">
        <div className="grid grid-cols-[3rem_minmax(0,1fr)_4rem_4rem] items-center gap-2 border-b border-[color:var(--rule)] bg-[var(--canvas-sunken)] px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
          <span>Hole</span>
          <span>Result</span>
          <span className="text-right">Score</span>
          <span className="text-right">Through</span>
        </div>
        <ol>
          {rows.map(({ hole, result, runningScore }) => {
            const isCurrent = hole === currentHole;
            const winner = result?.winner;
            const winnerLabel =
              winner === 'teamA'
                ? teams.teamAName
                : winner === 'teamB'
                  ? teams.teamBName
                  : winner === 'halved'
                    ? 'Halved'
                    : '—';
            const winnerColor =
              winner === 'teamA'
                ? teams.teamAColor
                : winner === 'teamB'
                  ? teams.teamBColor
                  : 'var(--ink-tertiary)';
            const strokeBlurb =
              result?.teamAStrokes != null && result?.teamBStrokes != null
                ? `${result.teamAStrokes}–${result.teamBStrokes}`
                : null;

            return (
              <li key={hole}>
                <button
                  type="button"
                  onClick={() => onJumpToHole(hole)}
                  className={cn(
                    'grid w-full grid-cols-[3rem_minmax(0,1fr)_4rem_4rem] items-center gap-2 border-b border-[color:var(--rule)]/70 px-3 py-2.5 text-left text-sm transition-colors last:border-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--focus-ring)]',
                    isCurrent && 'bg-[var(--masters-subtle)]'
                  )}
                  aria-current={isCurrent ? 'step' : undefined}
                >
                  <span
                    className={cn(
                      'font-serif text-base tabular-nums',
                      isCurrent ? 'text-[var(--masters)]' : 'text-[var(--ink)]'
                    )}
                  >
                    {hole}
                  </span>
                  <span className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: winner && winner !== 'none' ? winnerColor : 'transparent', border: winner && winner !== 'none' ? 'none' : '1px solid var(--rule-strong)' }}
                    />
                    <span
                      className={cn(
                        'truncate text-xs font-semibold',
                        winner && winner !== 'none' ? 'text-[var(--ink)]' : 'text-[var(--ink-tertiary)]'
                      )}
                      style={winner && winner !== 'none' && winner !== 'halved' ? { color: winnerColor } : undefined}
                    >
                      {winnerLabel}
                    </span>
                    {isCurrent && (
                      <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--canvas)] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.14em] text-[var(--masters)]">
                        <Pencil size={9} />
                        now
                      </span>
                    )}
                  </span>
                  <span className="text-right font-mono text-xs text-[var(--ink-secondary)]">
                    {strokeBlurb ?? '—'}
                  </span>
                  <span
                    className={cn(
                      'text-right font-mono text-xs tabular-nums',
                      runningScore > 0
                        ? 'text-[var(--team-usa)]'
                        : runningScore < 0
                          ? 'text-[var(--team-europe)]'
                          : 'text-[var(--ink-tertiary)]'
                    )}
                  >
                    {runningScore === 0
                      ? 'AS'
                      : runningScore > 0
                        ? `+${runningScore}`
                        : `${runningScore}`}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
