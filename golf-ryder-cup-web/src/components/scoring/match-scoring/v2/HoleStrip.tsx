/**
 * HoleStrip — Inline 18-hole status strip.
 *
 * Replaces the full HoleMiniMap card on the cockpit. Renders as a compact,
 * tap-and-jump row that fits inline above the score input. Each hole is a
 * dot with team-color fill if scored, hollow if not, and a ring on the
 * current hole. Long-press jumps to that hole and emits an edit intent.
 *
 * Front 9 / Back 9 are visually divided. Reads at-a-glance, not buried.
 */

'use client';

import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/lib/hooks';
import type { HoleResult } from '@/lib/types/models';

interface StrokeAllocation {
  teamAStrokes: number;
  teamBStrokes: number;
}

interface HoleStripProps {
  currentHole: number;
  holeResults: HoleResult[];
  teamAColor: string;
  teamBColor: string;
  totalHoles?: number;
  /**
   * Per-hole match-play stroke allocation, indexed [hole - 1]. When
   * provided, a tiny coloured dot beneath each hole reveals at a glance
   * which team gets a stroke (or two) on which hole — replaces the
   * previous tap-to-expand handicap detail panel as the primary signal.
   */
  strokesByHole?: StrokeAllocation[];
  onJump: (hole: number) => void;
  onEditHole?: (hole: number) => void;
}

export function HoleStrip({
  currentHole,
  holeResults,
  teamAColor,
  teamBColor,
  totalHoles = 18,
  strokesByHole,
  onJump,
  onEditHole,
}: HoleStripProps) {
  const haptic = useHaptic();
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);
  const currentDotRef = useRef<HTMLButtonElement | null>(null);

  // Keep current hole in view when navigating via prev/next.
  useEffect(() => {
    if (typeof currentDotRef.current?.scrollIntoView === 'function') {
      currentDotRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [currentHole]);

  const resultByHole = new Map<number, HoleResult>();
  for (const r of holeResults) resultByHole.set(r.holeNumber, r);

  const handleStart = (hole: number) => {
    longPressFiredRef.current = false;
    if (!onEditHole) return;
    longPressTimerRef.current = setTimeout(() => {
      longPressFiredRef.current = true;
      haptic.warning();
      onEditHole(hole);
    }, 480);
  };

  const handleEnd = (hole: number) => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      return;
    }
    haptic.tap();
    onJump(hole);
  };

  const handleCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const renderDot = (hole: number) => {
    const result = resultByHole.get(hole);
    const winner = result?.winner;
    const isCurrent = hole === currentHole;
    const isScored = winner && winner !== 'none';
    const strokes = strokesByHole?.[hole - 1];
    const teamAStrokes = strokes?.teamAStrokes ?? 0;
    const teamBStrokes = strokes?.teamBStrokes ?? 0;

    let fill: string | undefined;
    let label = `Hole ${hole}, unscored`;
    if (winner === 'teamA') {
      fill = teamAColor;
      label = `Hole ${hole}, won`;
    } else if (winner === 'teamB') {
      fill = teamBColor;
      label = `Hole ${hole}, won`;
    } else if (winner === 'halved') {
      fill = 'var(--ink-tertiary)';
      label = `Hole ${hole}, halved`;
    }

    // Build a stroke fragment for the aria-label so screen readers
    // surface the same info the dot surfaces visually.
    const strokeAriaParts: string[] = [];
    if (teamAStrokes > 0) {
      strokeAriaParts.push(
        `Team A gets ${teamAStrokes} stroke${teamAStrokes === 1 ? '' : 's'}`
      );
    }
    if (teamBStrokes > 0) {
      strokeAriaParts.push(
        `Team B gets ${teamBStrokes} stroke${teamBStrokes === 1 ? '' : 's'}`
      );
    }
    const fullLabel = [
      isCurrent ? `${label}, current hole` : label,
      ...strokeAriaParts,
    ].join('. ');

    return (
      <button
        ref={isCurrent ? currentDotRef : undefined}
        key={hole}
        type="button"
        onPointerDown={() => handleStart(hole)}
        onPointerUp={() => handleEnd(hole)}
        onPointerLeave={handleCancel}
        onPointerCancel={handleCancel}
        onContextMenu={(e) => e.preventDefault()}
        className={cn(
          'relative flex h-12 w-7 shrink-0 flex-col items-center justify-center gap-0.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] active:scale-95',
          isCurrent && 'bg-[var(--canvas-sunken)]'
        )}
        aria-label={fullLabel}
        aria-current={isCurrent ? 'step' : undefined}
      >
        <span
          aria-hidden
          className={cn(
            'h-2.5 w-2.5 rounded-full border transition-all',
            isScored
              ? 'border-transparent'
              : isCurrent
                ? 'border-[color:var(--masters)]'
                : 'border-[color:var(--rule-strong)]'
          )}
          style={{ background: isScored ? fill : 'transparent' }}
        />
        <span
          className={cn(
            'text-[9px] font-semibold tabular-nums leading-none',
            isCurrent ? 'text-[var(--masters)]' : 'text-[var(--ink-tertiary)]'
          )}
        >
          {hole}
        </span>
        {/*
          Stroke marks. One tiny dot per stroke per team. Renders
          right under the hole number so a quick scan answers
          "which holes do I get strokes on" without tapping into a
          handicap detail panel. Capped at 4 dots per team to keep
          the cell narrow; in match play 2+ on a hole is already
          rare, but we render multi-stroke dots stacked anyway.
        */}
        {(teamAStrokes > 0 || teamBStrokes > 0) && (
          <span aria-hidden className="flex items-center gap-[2px]">
            {teamAStrokes > 0 &&
              Array.from({ length: Math.min(teamAStrokes, 4) }).map((_, i) => (
                <span
                  key={`a-${i}`}
                  className="h-1 w-1 rounded-full"
                  style={{ background: teamAColor }}
                />
              ))}
            {teamBStrokes > 0 &&
              Array.from({ length: Math.min(teamBStrokes, 4) }).map((_, i) => (
                <span
                  key={`b-${i}`}
                  className="h-1 w-1 rounded-full"
                  style={{ background: teamBColor }}
                />
              ))}
          </span>
        )}
        {isCurrent && (
          <span
            aria-hidden
            className="absolute inset-x-2 -bottom-0.5 h-0.5 rounded-full bg-[var(--masters)]"
          />
        )}
      </button>
    );
  };

  // Only insert the front/back divider when the course is a true
  // 18-hole layout. For 9-, 11-, or 13-hole courses the divider would
  // either be misleading (a "front 9 / back 9" split that isn't real)
  // or visually awkward (an empty back section). Render one continuous
  // row in those cases.
  const renderAsTwoNines = totalHoles === 18;
  const front = Array.from(
    { length: renderAsTwoNines ? 9 : totalHoles },
    (_, i) => i + 1
  );
  const back = renderAsTwoNines
    ? Array.from({ length: totalHoles - 9 }, (_, i) => i + 10)
    : [];

  return (
    <div
      role="group"
      aria-label="Hole status — tap to jump, hold to edit"
      className="flex items-center justify-center gap-0.5 overflow-x-auto px-2"
    >
      <div className="flex items-center gap-0.5">{front.map(renderDot)}</div>
      {back.length > 0 && (
        <>
          <span aria-hidden className="mx-2 h-6 w-px bg-[color:var(--rule)]" />
          <div className="flex items-center gap-0.5">{back.map(renderDot)}</div>
        </>
      )}
    </div>
  );
}
