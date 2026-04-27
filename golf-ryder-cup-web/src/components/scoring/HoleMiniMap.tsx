'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, ChevronUp, Flag } from 'lucide-react';
import { useHaptic } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import type { HoleResult } from '@/lib/types/models';

/* ------------------------------------------------------------------ */
/*  Memoized sub-components                                           */
/* ------------------------------------------------------------------ */

interface CompactHoleButtonProps {
  hole: number;
  status: string;
  tone: { background: string; border: string; text: string };
  isCurrent: boolean;
  onSelect: (hole: number) => void;
}

const CompactHoleButton = React.memo(
  React.forwardRef<HTMLButtonElement, CompactHoleButtonProps>(function CompactHoleButton(
    { hole, status, tone, isCurrent, onSelect },
    ref
  ) {
    return (
      <button
        ref={ref}
        key={hole}
        type="button"
        onClick={() => onSelect(hole)}
        className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-[12px] font-semibold transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] active:scale-95 sm:h-10 sm:w-10"
        style={{
          background: tone.background,
          borderColor: tone.border,
          color: tone.text,
          boxShadow: isCurrent
            ? '0 0 0 1px color-mix(in srgb, var(--masters) 12%, transparent)'
            : undefined,
        }}
        aria-label={`Go to hole ${hole}${isCurrent ? ', current hole' : status !== 'unscored' ? `, ${status}` : ''}`}
      >
        {hole}
        {isCurrent && (
          <motion.span
            className="absolute inset-0 rounded-xl border border-[var(--masters)]"
            animate={{ opacity: [0.95, 0.35, 0.95] }}
            transition={{ duration: 1.4, repeat: Infinity }}
          />
        )}
      </button>
    );
  })
);

interface ExpandedHoleButtonProps {
  hole: number;
  status: string;
  tone: { background: string; border: string; text: string };
  runningScore: number;
  isCurrent: boolean;
  teamAName: string;
  teamBName: string;
  onSelect: (hole: number) => void;
}

const ExpandedHoleButton = React.memo(function ExpandedHoleButton({
  hole,
  status,
  tone,
  runningScore,
  isCurrent,
  teamAName,
  teamBName,
  onSelect,
}: ExpandedHoleButtonProps) {
  return (
    <button
      key={hole}
      type="button"
      onClick={() => onSelect(hole)}
      className="relative flex min-h-[72px] flex-col items-start justify-between rounded-2xl border px-3 py-2.5 text-left transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] active:scale-[0.98]"
      style={{
        background: tone.background,
        borderColor: tone.border,
      }}
      aria-label={`Go to hole ${hole}`}
    >
      <span className="text-sm font-semibold" style={{ color: tone.text }}>
        {hole}
      </span>
      <div>
        <p className="text-xs font-medium text-[var(--ink-secondary)]">
          {status === 'teamA'
            ? teamAName
            : status === 'teamB'
              ? teamBName
              : status === 'halved'
                ? 'Halved'
                : status === 'current'
                  ? 'Current'
                  : 'Unscored'}
        </p>
        <p className="mt-0.5 text-xs text-[var(--ink-tertiary)]">
          Match: {formatRunningScore(runningScore)}
        </p>
      </div>
      {isCurrent && <Flag size={14} className="absolute right-2.5 top-2.5 text-[var(--masters)]" />}
    </button>
  );
});

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

interface HoleMiniMapProps {
  currentHole: number;
  holeResults: HoleResult[];
  teamAName?: string;
  teamBName?: string;
  teamAColor?: string;
  teamBColor?: string;
  onHoleSelect: (holeNumber: number) => void;
  isComplete?: boolean;
  totalHoles?: number;
  className?: string;
}

type HoleStatus = 'teamA' | 'teamB' | 'halved' | 'unscored' | 'current';

function formatRunningScore(score: number) {
  if (score === 0) return 'AS';
  return score > 0 ? `+${score}` : `${score}`;
}

function colorWithAlpha(color: string, alphaPercent: number) {
  return `color-mix(in srgb, ${color} ${alphaPercent}%, transparent)`;
}

function holeNumbers(start: number, count: number) {
  return Array.from({ length: count }, (_, index) => start + index);
}

/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */

export function HoleMiniMap({
  currentHole,
  holeResults,
  teamAName = 'USA',
  teamBName = 'Europe',
  teamAColor = 'var(--team-usa)',
  teamBColor = 'var(--team-europe)',
  onHoleSelect,
  isComplete = false,
  totalHoles = 18,
  className,
}: HoleMiniMapProps) {
  const haptic = useHaptic();
  const [isExpanded, setIsExpanded] = useState(false);
  const currentHoleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (typeof currentHoleRef.current?.scrollIntoView === 'function') {
      currentHoleRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [currentHole]);

  const resultsByHole = useMemo(() => {
    const map = new Map<number, HoleResult>();
    for (const result of holeResults) {
      map.set(result.holeNumber, result);
    }
    return map;
  }, [holeResults]);

  const holeStatuses = useMemo(() => {
    const map = new Map<number, HoleStatus>();

    for (const hole of holeNumbers(1, totalHoles)) {
      const result = resultsByHole.get(hole);

      if (!isComplete && hole === currentHole) {
        map.set(hole, 'current');
        continue;
      }

      if (result?.winner === 'teamA') map.set(hole, 'teamA');
      else if (result?.winner === 'teamB') map.set(hole, 'teamB');
      else if (result?.winner === 'halved') map.set(hole, 'halved');
      else map.set(hole, 'unscored');
    }

    return map;
  }, [currentHole, isComplete, resultsByHole, totalHoles]);

  const runningScores = useMemo(() => {
    const map = new Map<number, number>();
    let runningScore = 0;

    for (const hole of holeNumbers(1, totalHoles)) {
      const result = resultsByHole.get(hole);
      if (result?.winner === 'teamA') runningScore += 1;
      if (result?.winner === 'teamB') runningScore -= 1;
      map.set(hole, runningScore);
    }

    return map;
  }, [resultsByHole, totalHoles]);

  const summary = useMemo(() => {
    let teamAWins = 0;
    let teamBWins = 0;
    let halved = 0;

    for (const result of holeResults) {
      if (result.winner === 'teamA') teamAWins += 1;
      else if (result.winner === 'teamB') teamBWins += 1;
      else if (result.winner === 'halved') halved += 1;
    }

    return {
      teamAWins,
      teamBWins,
      halved,
      scored: teamAWins + teamBWins + halved,
    };
  }, [holeResults]);

  const getHoleTone = useCallback(
    (status: HoleStatus) => {
      switch (status) {
        case 'teamA':
          return {
            background: colorWithAlpha(teamAColor, 10),
            border: colorWithAlpha(teamAColor, 20),
            text: teamAColor,
          };
        case 'teamB':
          return {
            background: colorWithAlpha(teamBColor, 10),
            border: colorWithAlpha(teamBColor, 20),
            text: teamBColor,
          };
        case 'halved':
          return {
            background: 'color-mix(in srgb, var(--ink-secondary) 11%, transparent)',
            border: 'color-mix(in srgb, var(--ink-secondary) 18%, transparent)',
            text: 'var(--ink-secondary)',
          };
        case 'current':
          return {
            background: 'color-mix(in srgb, var(--masters) 10%, transparent)',
            border: 'color-mix(in srgb, var(--masters) 24%, transparent)',
            text: 'var(--masters)',
          };
        default:
          return {
            background: 'color-mix(in srgb, var(--canvas) 74%, transparent)',
            border: 'color-mix(in srgb, var(--rule) 72%, transparent)',
            text: 'var(--ink-tertiary)',
          };
      }
    },
    [teamAColor, teamBColor]
  );

  const handleHoleSelect = useCallback(
    (holeNumber: number) => {
      haptic.select();
      onHoleSelect(holeNumber);
    },
    [haptic, onHoleSelect]
  );

  const toggleExpanded = useCallback(() => {
    haptic.tap();
    setIsExpanded((current) => !current);
  }, [haptic]);

  const renderCompactRow = (holes: number[]) => (
    <div className="flex gap-1.5">
      {holes.map((hole) => {
        const status = holeStatuses.get(hole) ?? 'unscored';
        const tone = getHoleTone(status);
        const isCurrent = status === 'current';

        return (
          <CompactHoleButton
            key={hole}
            ref={isCurrent ? currentHoleRef : undefined}
            hole={hole}
            status={status}
            tone={tone}
            isCurrent={isCurrent}
            onSelect={handleHoleSelect}
          />
        );
      })}
    </div>
  );

  const renderExpandedSection = (label: string, holes: number[]) => (
    <div>
      <div className="mb-3 flex items-center gap-3">
        <span className="type-overline text-[var(--ink-secondary)]">{label}</span>
        <div className="h-px flex-1 bg-[color:var(--rule)]" />
      </div>
      <div className="grid grid-cols-3 gap-2 min-[360px]:grid-cols-4 sm:grid-cols-5">
        {holes.map((hole) => {
          const status = holeStatuses.get(hole) ?? 'unscored';
          const tone = getHoleTone(status);
          const runningScore = runningScores.get(hole) ?? 0;
          const isCurrent = status === 'current';

          return (
            <ExpandedHoleButton
              key={hole}
              hole={hole}
              status={status}
              tone={tone}
              runningScore={runningScore}
              isCurrent={isCurrent}
              teamAName={teamAName}
              teamBName={teamBName}
              onSelect={handleHoleSelect}
            />
          );
        })}
      </div>
    </div>
  );

  return (
    <div
      className={cn(
        'rounded-[28px] border border-[color:var(--rule)] bg-[linear-gradient(180deg,var(--surface-raised)_0%,var(--surface-secondary)_100%)] p-4 shadow-card sm:p-5',
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="type-overline text-[var(--masters)]">Card</p>
          <h3 className="mt-1 font-serif text-[length:var(--text-lg)] font-normal text-[var(--ink)]">
            Hole map
          </h3>
          <p className="mt-1 text-sm text-[var(--ink-secondary)]">
            Jump anywhere without losing the thread of the match.
          </p>
        </div>
        <button
          type="button"
          onClick={toggleExpanded}
          className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-[color:var(--rule)] bg-[color:var(--canvas)] px-3 py-1.5 text-xs font-medium text-[var(--ink-secondary)] transition-colors hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] active:scale-[0.98]"
          aria-expanded={isExpanded}
        >
          {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {isExpanded ? 'Compact' : 'Full card'}
        </button>
      </div>

      <div className="mt-5 space-y-3">
        <div className="overflow-x-auto">
          <div className="inline-flex min-w-full items-center gap-3 rounded-[20px] border border-[color:var(--rule)]/70 bg-[color:var(--canvas)]/78 px-3 py-3">
            {renderCompactRow(holeNumbers(1, Math.min(9, totalHoles)))}
            {totalHoles > 9 && <div className="h-8 w-px bg-[color:var(--rule)]" />}
            {totalHoles > 9 && renderCompactRow(holeNumbers(10, Math.max(0, totalHoles - 9)))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <div className="rounded-2xl border border-[color:var(--rule)]/80 bg-[color:var(--canvas)]/72 px-3 py-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
              {teamAName}
            </p>
            <p
              className="mt-1 font-serif text-[length:var(--text-xl)]"
              style={{ color: teamAColor }}
            >
              {summary.teamAWins}
            </p>
          </div>
          <div className="rounded-2xl border border-[color:var(--rule)]/80 bg-[color:var(--canvas)]/72 px-3 py-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
              Scored
            </p>
            <p className="mt-1 font-serif text-[length:var(--text-xl)] text-[var(--ink)]">
              {summary.scored}
            </p>
          </div>
          <div className="rounded-2xl border border-[color:var(--rule)]/80 bg-[color:var(--canvas)]/72 px-3 py-3 text-center">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
              {teamBName}
            </p>
            <p
              className="mt-1 font-serif text-[length:var(--text-xl)]"
              style={{ color: teamBColor }}
            >
              {summary.teamBWins}
            </p>
          </div>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-5 space-y-5 border-t border-[color:var(--rule)] pt-5">
              {renderExpandedSection('Front 9', holeNumbers(1, Math.min(9, totalHoles)))}
              {totalHoles > 9 &&
                renderExpandedSection('Back 9', holeNumbers(10, Math.max(0, totalHoles - 9)))}

              <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-[color:var(--rule)]/80 bg-[color:var(--canvas)]/72 px-4 py-3 text-xs text-[var(--ink-secondary)]">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: teamAColor }} />
                  {teamAName} won
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-[var(--ink-secondary)]" />
                  Halved
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ background: teamBColor }} />
                  {teamBName} won
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default HoleMiniMap;
