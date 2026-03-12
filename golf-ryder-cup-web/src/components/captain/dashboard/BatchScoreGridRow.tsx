'use client';

import type { KeyboardEvent } from 'react';

import { BatchScoreGridCell } from './BatchScoreGridCell';
import { getCellId, getRowSummary } from './batchScoreGridModel';
import type { BatchMatch, BatchMatchScores } from './batchScoreGridTypes';

interface BatchScoreGridRowProps {
  match: BatchMatch;
  holes: number[];
  scores: BatchMatchScores;
  dirtyScores: Set<string>;
  errorScores: Set<string>;
  focusedCell: string | null;
  onCellFocus: (cellId: string) => void;
  onCellChange: (cellId: string, value: number | null) => void;
  onCellKeyDown: (event: KeyboardEvent<HTMLInputElement>, cellId: string) => void;
}

export function BatchScoreGridRow({
  match,
  holes,
  scores,
  dirtyScores,
  errorScores,
  focusedCell,
  onCellFocus,
  onCellChange,
  onCellKeyDown,
}: BatchScoreGridRowProps) {
  const summary = getRowSummary(scores, holes);

  return (
    <div className="flex items-stretch border-b" style={{ borderColor: 'var(--rule)' }}>
      <div
        className="flex w-32 shrink-0 flex-col justify-center border-r p-2"
        style={{ borderColor: 'var(--rule)' }}
      >
        <div className="mb-1 flex items-center gap-1.5">
          <div
            className="flex h-5 w-5 items-center justify-center rounded text-xs font-bold"
            style={{ background: 'var(--rule)', color: 'var(--ink-secondary)' }}
          >
            {match.matchNumber}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[10px]" style={{ color: match.teamAColor }}>
              {match.teamAPlayers[0]?.split(' ').pop()}
            </p>
            <p className="truncate text-[10px]" style={{ color: match.teamBColor }}>
              {match.teamBPlayers[0]?.split(' ').pop()}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-1">
        {holes.map((hole) => {
          const holeScore = scores[hole] || { teamA: null, teamB: null };
          const cellIdA = getCellId(match.id, hole, 'A');
          const cellIdB = getCellId(match.id, hole, 'B');

          return (
            <div
              key={hole}
              className="flex flex-col gap-1 border-r p-1"
              style={{ borderColor: 'var(--rule)', minWidth: '48px' }}
            >
              <BatchScoreGridCell
                cellId={cellIdA}
                value={holeScore.teamA}
                isDirty={dirtyScores.has(cellIdA)}
                hasError={errorScores.has(cellIdA)}
                teamColor={match.teamAColor}
                isFocused={focusedCell === cellIdA}
                onFocus={onCellFocus}
                onChange={onCellChange}
                onKeyDown={onCellKeyDown}
              />
              <BatchScoreGridCell
                cellId={cellIdB}
                value={holeScore.teamB}
                isDirty={dirtyScores.has(cellIdB)}
                hasError={errorScores.has(cellIdB)}
                teamColor={match.teamBColor}
                isFocused={focusedCell === cellIdB}
                onFocus={onCellFocus}
                onChange={onCellChange}
                onKeyDown={onCellKeyDown}
              />
            </div>
          );
        })}
      </div>

      <div
        className="flex w-16 shrink-0 flex-col items-center justify-center border-l p-2"
        style={{ borderColor: 'var(--rule)' }}
      >
        {summary.holesPlayed === 0 ? (
          <span className="text-xs text-[var(--ink-tertiary)]">—</span>
        ) : (
          <div className="text-center">
            <span
              className="text-sm font-bold"
              style={{
                color:
                  summary.diff > 0
                    ? match.teamAColor
                    : summary.diff < 0
                      ? match.teamBColor
                      : 'var(--ink-tertiary)',
              }}
            >
              {summary.display}
            </span>
            <span className="block text-[10px]" style={{ color: 'var(--ink-tertiary)' }}>
              thru {summary.holesPlayed}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
