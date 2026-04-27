/**
 * ScoreInputPanel — The single sacred surface.
 *
 * Phase 1+2 unified score-entry control. One panel, three big tap targets
 * (Team A wins / Halve / Team B wins), with swipe gestures layered on top
 * (left = A, right = B, up = halve). One-handed alignment is a prop, not
 * a separate panel. Stroke entry is a peer surface (sheet), not a mode.
 *
 * Replaces, in the v2 cockpit:
 *  - SwipeScorePanel (gesture-only mode)
 *  - OneHandedScoringPanel (button + swipe-nav mode)
 *  - The bare-bones buttons branch in MatchScoringActiveState
 *
 * Keyboard: ←/A = team A, →/B = team B, ↑/H/Space = halve.
 */

'use client';

import { useCallback, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/lib/hooks';
import { useSwipeBackProtection } from '@/lib/hooks/useSwipeBackProtection';
import type { HoleWinner } from '@/lib/types/models';

interface ScoreInputPanelProps {
  teamAName: string;
  teamBName: string;
  teamAColor: string;
  teamBColor: string;
  existingResult?: HoleWinner;
  disabled?: boolean;
  preferredHand?: 'left' | 'right';
  gestureEnabled?: boolean;
  prefersReducedMotion?: boolean;
  onScore: (winner: HoleWinner) => void;
  onOpenStrokeEntry?: () => void;
  /** Optional helper line under the buttons (e.g., handicap context) */
  helperLine?: string;
  /** Show subtle strokes link below input */
  strokesAvailable?: boolean;
}

const SWIPE_THRESHOLD = 80;
const VELOCITY_THRESHOLD = 300;
const VERTICAL_THRESHOLD = 60;
const CONFIRM_DELAY_MS = 280;

export function ScoreInputPanel({
  teamAName,
  teamBName,
  teamAColor,
  teamBColor,
  existingResult,
  disabled = false,
  preferredHand = 'right',
  gestureEnabled = true,
  prefersReducedMotion = false,
  onScore,
  onOpenStrokeEntry,
  helperLine,
  strokesAvailable = true,
}: ScoreInputPanelProps) {
  const haptic = useHaptic();
  const containerRef = useRef<HTMLDivElement>(null);
  useSwipeBackProtection(containerRef, { edgeWidth: 40 });

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const [confirmedWinner, setConfirmedWinner] = useState<HoleWinner | null>(null);
  const lastFireRef = useRef(0);

  const aOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
  const bOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const halvedOpacity = useTransform(y, [-VERTICAL_THRESHOLD, 0], [1, 0]);

  const tintBg = useTransform(
    x,
    [-SWIPE_THRESHOLD * 1.5, 0, SWIPE_THRESHOLD * 1.5],
    [
      `linear-gradient(90deg, ${withAlpha(teamAColor, 22)} 0%, transparent 60%)`,
      'transparent',
      `linear-gradient(90deg, transparent 60%, ${withAlpha(teamBColor, 22)} 100%)`,
    ]
  );

  const fire = useCallback(
    (winner: HoleWinner) => {
      if (disabled) return;
      const now = Date.now();
      if (now - lastFireRef.current < 250) return;
      lastFireRef.current = now;

      haptic.scorePoint();
      setConfirmedWinner(winner);
      // Brief visual confirmation, then commit upstream.
      window.setTimeout(() => {
        onScore(winner);
        // Linger the check a touch longer than the upstream auto-advance.
        window.setTimeout(() => setConfirmedWinner(null), 220);
      }, CONFIRM_DELAY_MS);
    },
    [disabled, haptic, onScore]
  );

  const handlePanEnd = useCallback(
    (_: never, info: PanInfo) => {
      if (disabled || !gestureEnabled) return;
      const { offset, velocity } = info;
      const horizontal = Math.abs(offset.x) > Math.abs(offset.y);

      if (horizontal) {
        if (offset.x < -SWIPE_THRESHOLD || velocity.x < -VELOCITY_THRESHOLD) return fire('teamA');
        if (offset.x > SWIPE_THRESHOLD || velocity.x > VELOCITY_THRESHOLD) return fire('teamB');
      } else if (offset.y < 0) {
        if (offset.y < -VERTICAL_THRESHOLD || velocity.y < -VELOCITY_THRESHOLD) return fire('halved');
      }
    },
    [disabled, fire, gestureEnabled]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    switch (e.key) {
      case 'ArrowLeft':
      case 'a':
      case 'A':
        e.preventDefault();
        return fire('teamA');
      case 'ArrowRight':
      case 'b':
      case 'B':
        e.preventDefault();
        return fire('teamB');
      case 'ArrowUp':
      case 'h':
      case 'H':
      case ' ':
        e.preventDefault();
        return fire('halved');
    }
  };

  const order =
    preferredHand === 'left' ? (['teamB', 'halved', 'teamA'] as const) : (['teamA', 'halved', 'teamB'] as const);

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="group"
      aria-label="Score this hole. Tap a team to record the winner, or swipe left or right. Up or halve for a halved hole."
      onKeyDown={handleKeyDown}
      className={cn(
        'relative isolate overflow-hidden rounded-[28px] border border-[color:var(--rule)] bg-[var(--canvas-raised)] shadow-card focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)]',
        disabled && 'opacity-95'
      )}
      style={{ touchAction: 'pan-y' }}
    >
      {/* Gesture-tinted background */}
      {gestureEnabled && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: tintBg }}
        />
      )}

      {/* Drag surface — invisible, covers the full panel so a swipe
          anywhere on the input area registers. */}
      {gestureEnabled && (
        <motion.div
          aria-hidden
          className="absolute inset-0 z-0"
          style={{ x, y }}
          drag={!disabled}
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          dragElastic={0.45}
          onPanEnd={handlePanEnd}
        />
      )}

      {/* Halved gesture indicator (top) */}
      {gestureEnabled && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 top-0 flex justify-center pt-2 text-xs font-semibold uppercase tracking-[0.18em] text-[var(--ink-secondary)]"
          style={{ opacity: halvedOpacity }}
        >
          ↑ Halve
        </motion.div>
      )}

      {/* Team-A side hint */}
      {gestureEnabled && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-2 flex items-center text-xs font-semibold uppercase tracking-[0.18em]"
          style={{ opacity: aOpacity, color: teamAColor }}
        >
          ← {teamAName}
        </motion.div>
      )}
      {gestureEnabled && (
        <motion.div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-2 flex items-center text-xs font-semibold uppercase tracking-[0.18em]"
          style={{ opacity: bOpacity, color: teamBColor }}
        >
          {teamBName} →
        </motion.div>
      )}

      <div className="relative z-10 grid grid-cols-[minmax(0,1fr)_5rem_minmax(0,1fr)] gap-2 p-3 sm:gap-3 sm:p-4">
        {order.map((slot) => {
          if (slot === 'halved') {
            return (
              <HalveButton
                key="halved"
                selected={existingResult === 'halved'}
                pending={confirmedWinner === 'halved'}
                onClick={() => fire('halved')}
                disabled={disabled}
              />
            );
          }
          const isA = slot === 'teamA';
          return (
            <TeamButton
              key={slot}
              teamName={isA ? teamAName : teamBName}
              teamColor={isA ? teamAColor : teamBColor}
              selected={existingResult === slot}
              pending={confirmedWinner === slot}
              onClick={() => fire(slot)}
              disabled={disabled}
              align={isA ? 'left' : 'right'}
              prefersReducedMotion={prefersReducedMotion}
            />
          );
        })}
      </div>

      {(helperLine || (strokesAvailable && onOpenStrokeEntry)) && (
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 border-t border-[color:var(--rule)] bg-[var(--canvas-sunken)] px-4 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
            {helperLine ?? 'Tap or swipe — gestures and taps both work.'}
          </p>
          {strokesAvailable && onOpenStrokeEntry && (
            <button
              type="button"
              onClick={onOpenStrokeEntry}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-[color:var(--rule)] bg-[var(--canvas)] px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-secondary)] transition-colors hover:text-[var(--ink)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas-sunken)]"
            >
              Enter strokes
            </button>
          )}
        </div>
      )}

      <AnimatePresence>
        {confirmedWinner && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.7 }}
            transition={{ duration: 0.18 }}
            className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
          >
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full text-[var(--canvas)] shadow-card-lg"
              style={{
                background:
                  confirmedWinner === 'teamA'
                    ? teamAColor
                    : confirmedWinner === 'teamB'
                      ? teamBColor
                      : 'var(--ink-secondary)',
              }}
            >
              <Check size={28} strokeWidth={3} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function TeamButton({
  teamName,
  teamColor,
  selected,
  pending,
  onClick,
  disabled,
  align,
  prefersReducedMotion: _prefersReducedMotion,
}: {
  teamName: string;
  teamColor: string;
  selected: boolean;
  pending: boolean;
  onClick: () => void;
  disabled: boolean;
  align: 'left' | 'right';
  prefersReducedMotion: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={`${teamName} wins this hole${selected ? ' (recorded)' : ''}`}
      className={cn(
        'group relative z-10 flex min-h-[120px] flex-col justify-between overflow-hidden rounded-[20px] px-4 py-4 text-left transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas-raised)] active:scale-[0.98] disabled:cursor-not-allowed',
        align === 'right' && 'text-right',
        selected && 'ring-2 ring-[var(--gold)] ring-offset-2 ring-offset-[var(--canvas-raised)]',
        pending && 'scale-[0.97]'
      )}
      style={{
        background: `linear-gradient(180deg, ${teamColor} 0%, color-mix(in srgb, ${teamColor} 88%, var(--ink)) 100%)`,
        color: 'var(--canvas)',
      }}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--canvas)]/75">
        {align === 'left' ? '← Swipe or tap' : 'Tap or swipe →'}
      </span>
      <span className="block text-[length:var(--text-xl)] font-semibold leading-tight">
        {teamName}
      </span>
      <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--canvas)]/75">
        wins hole
      </span>
    </button>
  );
}

function HalveButton({
  selected,
  pending,
  onClick,
  disabled,
}: {
  selected: boolean;
  pending: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={`Halve this hole${selected ? ' (recorded)' : ''}`}
      className={cn(
        'group relative z-10 flex min-h-[120px] flex-col items-center justify-center gap-1 overflow-hidden rounded-[20px] border bg-[var(--canvas)] px-2 py-3 text-center transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas-raised)] active:scale-[0.98] disabled:cursor-not-allowed',
        selected
          ? 'border-[color:var(--gold)] ring-2 ring-[var(--gold)] ring-offset-2 ring-offset-[var(--canvas-raised)]'
          : 'border-[color:var(--rule)]',
        pending && 'scale-[0.97]'
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-tertiary)]">
        ↑
      </span>
      <span className="text-base font-semibold text-[var(--ink)]">Halve</span>
      <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
        Tie
      </span>
    </button>
  );
}

function withAlpha(color: string, percent: number) {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}
