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

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  type PanInfo,
} from 'framer-motion';
import { Check, Lock, RefreshCw } from 'lucide-react';
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
  /**
   * When the hole already has a recorded result, a tap on a *different*
   * winner doesn't commit immediately — it arms a pending change.
   * A second tap on the same target then commits. This prevents the
   * overwhelmingly common "I tapped while reviewing the scorecard"
   * accidental overwrite. Keyboard, gestures, and tap all flow through
   * the same `fire` path so the rule holds for every input.
   */
  const [pendingChange, setPendingChange] = useState<HoleWinner | null>(null);
  const pendingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFireRef = useRef(0);

  const isLocked = Boolean(existingResult && existingResult !== 'none');

  // Reset pending change whenever the hole or its recorded winner
  // changes — moving to a new hole shouldn't carry an armed state with
  // it. The setState call here IS the intended side effect (external
  // prop changed → clear local arming), which is exactly what
  // useEffect is for; the React 19 set-state-in-effect rule's
  // suggestion to derive at render time would just split the logic.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setPendingChange(null);
    if (pendingTimerRef.current) {
      clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = null;
    }
  }, [existingResult]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    return () => {
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
    };
  }, []);

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

  const armPendingChange = useCallback(
    (winner: HoleWinner) => {
      haptic.warning();
      setPendingChange(winner);
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current);
      pendingTimerRef.current = setTimeout(() => {
        setPendingChange((current) => (current === winner ? null : current));
        pendingTimerRef.current = null;
      }, 3000);
    },
    [haptic]
  );

  const fire = useCallback(
    (winner: HoleWinner) => {
      if (disabled) return;
      const now = Date.now();
      if (now - lastFireRef.current < 250) return;
      lastFireRef.current = now;

      // Locked-hole edit gate. Tapping the same winner that's already
      // recorded is a no-op (nothing to change). Tapping a different
      // winner first arms it; a second tap commits.
      if (isLocked) {
        if (winner === existingResult) {
          // Best UX is silent rejection rather than a buzz — they're
          // confirming the recorded value by tapping it again.
          return;
        }
        if (pendingChange !== winner) {
          armPendingChange(winner);
          return;
        }
        // Second tap on the armed target — fall through and commit.
        if (pendingTimerRef.current) {
          clearTimeout(pendingTimerRef.current);
          pendingTimerRef.current = null;
        }
        setPendingChange(null);
      }

      haptic.scorePoint();
      setConfirmedWinner(winner);
      // Brief visual confirmation, then commit upstream.
      window.setTimeout(() => {
        onScore(winner);
        // Linger the check a touch longer than the upstream auto-advance.
        window.setTimeout(() => setConfirmedWinner(null), 220);
      }, CONFIRM_DELAY_MS);
    },
    [disabled, haptic, onScore, isLocked, existingResult, pendingChange, armPendingChange]
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
          // Locked-state visual model:
          //   - The recorded winner stays at full saturation with a
          //     "RECORDED" badge so it reads as the active state.
          //   - Other options drop to ~40% opacity so they don't
          //     compete for the eye but stay tappable to start a
          //     change.
          //   - When the user has armed a change (pending), the
          //     pending option lights up with a gold "TAP AGAIN"
          //     ring so they know what their next tap will do.
          const isRecorded = isLocked && existingResult === slot;
          const isArmed = pendingChange === slot;
          const isDimmed = isLocked && !isRecorded && !isArmed;
          if (slot === 'halved') {
            return (
              <HalveButton
                key="halved"
                recorded={isRecorded}
                armed={isArmed}
                dimmed={isDimmed}
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
              recorded={isRecorded}
              armed={isArmed}
              dimmed={isDimmed}
              pending={confirmedWinner === slot}
              onClick={() => fire(slot)}
              disabled={disabled}
              align={isA ? 'left' : 'right'}
              prefersReducedMotion={prefersReducedMotion}
            />
          );
        })}
      </div>

      {/*
        Contextual footer. Three states:
          • Pending change → "Tap [TARGET] again to confirm change"
            with team-color accent. This is the loudest state because
            the user is mid-decision.
          • Locked (recorded, no pending) → "Recorded · X wins · Tap
            any team to change". Surfaces the recorded value AND the
            mechanism for changing it without burying it in a chip.
          • Clean → original helper line + "Enter strokes" link.
      */}
      <div className="relative z-10 border-t border-[color:var(--rule)] bg-[var(--canvas-sunken)] px-4 py-2.5">
        {pendingChange ? (
          <PendingChangeBanner
            target={pendingChange}
            teamAName={teamAName}
            teamBName={teamBName}
            teamAColor={teamAColor}
            teamBColor={teamBColor}
          />
        ) : isLocked ? (
          <RecordedBanner
            existingResult={existingResult as HoleWinner}
            teamAName={teamAName}
            teamBName={teamBName}
            teamAColor={teamAColor}
            teamBColor={teamBColor}
            strokesAvailable={strokesAvailable}
            onOpenStrokeEntry={onOpenStrokeEntry}
          />
        ) : (
          (helperLine || (strokesAvailable && onOpenStrokeEntry)) && (
            <div className="flex flex-wrap items-center justify-between gap-2">
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
          )
        )}
      </div>

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
  recorded,
  armed,
  dimmed,
  pending,
  onClick,
  disabled,
  align,
  prefersReducedMotion: _prefersReducedMotion,
}: {
  teamName: string;
  teamColor: string;
  recorded: boolean;
  armed: boolean;
  dimmed: boolean;
  pending: boolean;
  onClick: () => void;
  disabled: boolean;
  align: 'left' | 'right';
  prefersReducedMotion: boolean;
}) {
  const ariaParts = [`${teamName} wins this hole`];
  if (recorded) ariaParts.push('(currently recorded)');
  if (armed) ariaParts.push('(tap again to change)');

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={recorded}
      aria-label={ariaParts.join(' ')}
      className={cn(
        'group relative z-10 flex min-h-[120px] flex-col justify-between overflow-hidden rounded-[20px] px-4 py-4 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas-raised)] active:scale-[0.98] disabled:cursor-not-allowed',
        align === 'right' && 'text-right',
        // Recorded state: matt gold ring + a RECORDED corner badge.
        recorded &&
          'ring-2 ring-[var(--gold)] ring-offset-2 ring-offset-[var(--canvas-raised)]',
        // Armed (pending change): pulsing gold ring to communicate
        // "tap again to commit" without making it look identical to
        // the recorded state.
        armed &&
          'animate-pulse ring-4 ring-[var(--gold)] ring-offset-2 ring-offset-[var(--canvas-raised)]',
        // Dimmed: locked-but-not-this-team. Stays visible/tappable
        // (the user may want to change to this team) but recedes
        // visually so the recorded state reads as the active one.
        dimmed && 'opacity-40 saturate-[0.7]',
        pending && 'scale-[0.97]'
      )}
      style={{
        background: `linear-gradient(180deg, ${teamColor} 0%, color-mix(in srgb, ${teamColor} 88%, var(--ink)) 100%)`,
        color: 'var(--canvas)',
      }}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[color:var(--canvas)]/75">
        {recorded
          ? '✓ Recorded'
          : armed
            ? 'Tap again →'
            : align === 'left'
              ? '← Swipe or tap'
              : 'Tap or swipe →'}
      </span>
      <span className="block text-[length:var(--text-xl)] font-semibold leading-tight">
        {teamName}
      </span>
      <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--canvas)]/75">
        {recorded ? 'won hole' : armed ? 'change to' : 'wins hole'}
      </span>
    </button>
  );
}

function HalveButton({
  recorded,
  armed,
  dimmed,
  pending,
  onClick,
  disabled,
}: {
  recorded: boolean;
  armed: boolean;
  dimmed: boolean;
  pending: boolean;
  onClick: () => void;
  disabled: boolean;
}) {
  const ariaParts = ['Halve this hole'];
  if (recorded) ariaParts.push('(currently recorded)');
  if (armed) ariaParts.push('(tap again to change)');

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={recorded}
      aria-label={ariaParts.join(' ')}
      className={cn(
        'group relative z-10 flex min-h-[120px] flex-col items-center justify-center gap-1 overflow-hidden rounded-[20px] border bg-[var(--canvas)] px-2 py-3 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas-raised)] active:scale-[0.98] disabled:cursor-not-allowed',
        recorded
          ? 'border-[color:var(--gold)] ring-2 ring-[var(--gold)] ring-offset-2 ring-offset-[var(--canvas-raised)]'
          : 'border-[color:var(--rule)]',
        armed &&
          'animate-pulse ring-4 ring-[var(--gold)] ring-offset-2 ring-offset-[var(--canvas-raised)]',
        dimmed && 'opacity-40',
        pending && 'scale-[0.97]'
      )}
    >
      <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--ink-tertiary)]">
        {recorded ? '✓' : armed ? 'Tap again' : '↑'}
      </span>
      <span className="text-base font-semibold text-[var(--ink)]">Halve</span>
      <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
        {recorded ? 'recorded' : armed ? 'change to' : 'Tie'}
      </span>
    </button>
  );
}

/**
 * Footer banner shown when the hole already has a recorded result and
 * the user has not yet tapped a different option. Communicates the
 * recorded value with the team's color, plus an explicit hint that
 * tapping any team will start a change. Replaces the previous tiny
 * grey chip on the cockpit.
 */
function RecordedBanner({
  existingResult,
  teamAName,
  teamBName,
  teamAColor,
  teamBColor,
  strokesAvailable,
  onOpenStrokeEntry,
}: {
  existingResult: HoleWinner;
  teamAName: string;
  teamBName: string;
  teamAColor: string;
  teamBColor: string;
  strokesAvailable?: boolean;
  onOpenStrokeEntry?: () => void;
}) {
  const winnerLabel =
    existingResult === 'teamA'
      ? `${teamAName} wins`
      : existingResult === 'teamB'
        ? `${teamBName} wins`
        : 'Halved';
  const accent =
    existingResult === 'teamA'
      ? teamAColor
      : existingResult === 'teamB'
        ? teamBColor
        : 'var(--ink-secondary)';

  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <div className="flex min-w-0 items-center gap-2">
        <span
          aria-hidden
          className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[var(--canvas)]"
          style={{ background: accent }}
        >
          <Lock size={12} strokeWidth={2.5} />
        </span>
        <p className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-[0.14em]">
          <span style={{ color: accent }}>Recorded · {winnerLabel}</span>
          <span className="ml-2 text-[var(--ink-tertiary)]">Tap any team to change</span>
        </p>
      </div>
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
  );
}

/**
 * Footer banner shown after the first tap of a different option on a
 * locked hole. Tells the user explicitly what the second tap will do
 * and gives a 3-second window to confirm or back off (auto-disarms).
 */
function PendingChangeBanner({
  target,
  teamAName,
  teamBName,
  teamAColor,
  teamBColor,
}: {
  target: HoleWinner;
  teamAName: string;
  teamBName: string;
  teamAColor: string;
  teamBColor: string;
}) {
  const targetLabel =
    target === 'teamA' ? teamAName : target === 'teamB' ? teamBName : 'Halved';
  const accent =
    target === 'teamA'
      ? teamAColor
      : target === 'teamB'
        ? teamBColor
        : 'var(--ink-secondary)';

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        aria-hidden
        className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[var(--canvas)]"
        style={{ background: 'var(--gold)' }}
      >
        <RefreshCw size={12} strokeWidth={2.5} />
      </span>
      <p
        role="status"
        aria-live="polite"
        className="min-w-0 truncate text-[11px] font-semibold uppercase tracking-[0.14em]"
      >
        <span style={{ color: accent }}>Tap {targetLabel} again to change</span>
        <span className="ml-2 text-[var(--ink-tertiary)]">or wait to cancel</span>
      </p>
    </div>
  );
}

function withAlpha(color: string, percent: number) {
  return `color-mix(in srgb, ${color} ${percent}%, transparent)`;
}
