'use client';

import { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight, Hand, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/lib/hooks';
import type { HoleWinner } from '@/lib/types/models';

interface OneHandedScoringPanelProps {
  holeNumber: number;
  teamAName: string;
  teamBName: string;
  teamAColor: string;
  teamBColor: string;
  existingResult?: HoleWinner;
  onScore: (winner: HoleWinner) => void;
  onPrevHole: () => void;
  onNextHole: () => void;
  onUndo?: () => void;
  canUndo?: boolean;
  disabled?: boolean;
  preferredHand: 'left' | 'right';
  currentScore: number;
  holesPlayed: number;
}

const SWIPE_THRESHOLD = 100;

function colorWithAlpha(color: string, alphaPercent: number) {
  return `color-mix(in srgb, ${color} ${alphaPercent}%, transparent)`;
}

function deepenColor(color: string, inkPercent = 12) {
  return `color-mix(in srgb, ${color} ${100 - inkPercent}%, var(--ink))`;
}

function buildScoreSummary(currentScore: number, teamAName: string, teamBName: string) {
  if (currentScore === 0) {
    return {
      scoreLine: 'AS',
      context: 'All square',
      color: 'var(--ink-secondary)',
    };
  }

  const leader = currentScore > 0 ? teamAName : teamBName;
  const color = currentScore > 0 ? 'var(--team-usa)' : 'var(--team-europe)';
  const lead = Math.abs(currentScore);

  return {
    scoreLine: `${lead}UP`,
    context: `${leader} leads`,
    color,
  };
}

function outcomeLabel(result: HoleWinner | null | undefined, teamAName: string, teamBName: string) {
  if (!result || result === 'none') return 'Ready to score';
  if (result === 'halved') return 'Hole halved';
  return result === 'teamA' ? `${teamAName} won this hole` : `${teamBName} won this hole`;
}

export function OneHandedScoringPanel({
  holeNumber,
  teamAName,
  teamBName,
  teamAColor,
  teamBColor,
  existingResult,
  onScore,
  onPrevHole,
  onNextHole,
  onUndo,
  canUndo = false,
  disabled = false,
  preferredHand,
  currentScore,
  holesPlayed,
}: OneHandedScoringPanelProps) {
  const haptic = useHaptic();
  const [activeSwipe, setActiveSwipe] = useState<'teamA' | 'teamB' | null>(null);
  const [confirmingResult, setConfirmingResult] = useState<HoleWinner | null>(null);

  const isRightHanded = preferredHand === 'right';

  const scoreSummary = useMemo(
    () => buildScoreSummary(currentScore, teamAName, teamBName),
    [currentScore, teamAName, teamBName]
  );

  const holeStatusCopy = useMemo(
    () => outcomeLabel(existingResult, teamAName, teamBName),
    [existingResult, teamAName, teamBName]
  );

  const handleDrag = useCallback(
    (_event: TouchEvent | MouseEvent | PointerEvent, info: PanInfo) => {
      if (disabled) return;
      if (Math.abs(info.offset.x) > 30) {
        setActiveSwipe(info.offset.x > 0 ? 'teamA' : 'teamB');
      } else {
        setActiveSwipe(null);
      }
    },
    [disabled]
  );

  const handleDragEnd = useCallback(
    (_event: TouchEvent | MouseEvent | PointerEvent, info: PanInfo) => {
      if (disabled) return;

      const swipedRight = info.offset.x > SWIPE_THRESHOLD || info.velocity.x > 550;
      const swipedLeft = info.offset.x < -SWIPE_THRESHOLD || info.velocity.x < -550;

      if (swipedRight) {
        haptic.select();
        setConfirmingResult('teamA');
      } else if (swipedLeft) {
        haptic.select();
        setConfirmingResult('teamB');
      }
      setActiveSwipe(null);
    },
    [disabled, haptic]
  );

  const handleTapScore = useCallback(
    (winner: HoleWinner) => {
      if (disabled) return;
      haptic.tap();
      setConfirmingResult(winner);
    },
    [disabled, haptic]
  );

  const handleConfirm = useCallback(() => {
    if (!confirmingResult) return;
    haptic.success();
    onScore(confirmingResult);
    setConfirmingResult(null);
  }, [confirmingResult, onScore, haptic]);

  const handleCancel = useCallback(() => {
    haptic.tap();
    setConfirmingResult(null);
  }, [haptic]);

  const confirmActions = isRightHanded
    ? [
        {
          key: 'cancel',
          label: 'Cancel',
          onClick: handleCancel,
          className:
            'border-[color:var(--rule)] bg-[color:var(--canvas)] text-[var(--ink-secondary)]',
        },
        {
          key: 'confirm',
          label: 'Record',
          onClick: handleConfirm,
          className: 'border-transparent bg-[var(--masters)] text-[var(--canvas)]',
          icon: <Check size={18} />,
        },
      ]
    : [
        {
          key: 'confirm',
          label: 'Record',
          onClick: handleConfirm,
          className: 'border-transparent bg-[var(--masters)] text-[var(--canvas)]',
          icon: <Check size={18} />,
        },
        {
          key: 'cancel',
          label: 'Cancel',
          onClick: handleCancel,
          className:
            'border-[color:var(--rule)] bg-[color:var(--canvas)] text-[var(--ink-secondary)]',
        },
      ];

  return (
    <div className="relative overflow-hidden rounded-[32px] border border-[color:var(--rule)] bg-[linear-gradient(180deg,var(--surface-raised)_0%,var(--surface-secondary)_100%)] p-4 shadow-card sm:p-5">
      <AnimatePresence>
        {confirmingResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-[color:var(--ink)]/50 px-5 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-xs rounded-[28px] border border-[color:var(--rule)] bg-[color:var(--canvas)] p-5 text-center shadow-card"
            >
              <p className="type-overline text-[var(--masters)]">Confirm score</p>
              <h3 className="mt-2 font-serif text-[length:var(--text-2xl)] font-normal text-[var(--ink)]">
                {confirmingResult === 'halved'
                  ? 'Hole halved'
                  : confirmingResult === 'teamA'
                    ? `${teamAName} wins`
                    : `${teamBName} wins`}
              </h3>
              <p className="mt-2 text-sm text-[var(--ink-secondary)]">Hole {holeNumber}</p>

              <div className="mt-5 flex items-center justify-center gap-3">
                {confirmActions.map((action) => (
                  <button
                    key={action.key}
                    type="button"
                    onClick={action.onClick}
                    className={cn(
                      'inline-flex min-w-[116px] items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] active:scale-[0.98]',
                      action.className
                    )}
                  >
                    {action.icon}
                    {action.label}
                  </button>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className={cn(
          'inline-flex items-center gap-2 rounded-full border border-[color:var(--rule)] bg-[color:var(--canvas)]/80 px-3 py-1.5 text-xs font-medium text-[var(--ink-secondary)]',
          isRightHanded ? 'ml-auto' : ''
        )}
      >
        <Hand size={14} />
        {isRightHanded ? 'Right-thumb layout' : 'Left-thumb layout'}
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
        <div className="rounded-[24px] border border-[color:var(--rule)]/80 bg-[color:var(--canvas)]/74 px-4 py-4">
          <p className="type-overline" style={{ color: teamAColor }}>
            <span className="block truncate" title={teamAName}>
              {teamAName}
            </span>
          </p>
          <p className="mt-2 text-sm text-[var(--ink-secondary)]">Winner on this side</p>
        </div>

        <div className="text-center">
          <p className="type-overline text-[var(--masters)]">Match score</p>
          <p
            className="mt-2 font-serif text-[clamp(3rem,12vw,4.75rem)] font-normal leading-none"
            style={{ color: scoreSummary.color }}
          >
            {scoreSummary.scoreLine}
          </p>
          <p className="mt-2 text-sm text-[var(--ink-secondary)]">{scoreSummary.context}</p>
          <p className="mt-1 text-xs text-[var(--ink-tertiary)]">
            {holesPlayed > 0 ? `Thru ${holesPlayed}` : 'No holes scored yet'}
          </p>
        </div>

        <div className="rounded-[24px] border border-[color:var(--rule)]/80 bg-[color:var(--canvas)]/74 px-4 py-4 sm:text-right">
          <p className="type-overline" style={{ color: teamBColor }}>
            <span className="block truncate" title={teamBName}>
              {teamBName}
            </span>
          </p>
          <p className="mt-2 text-sm text-[var(--ink-secondary)]">Winner on this side</p>
        </div>
      </div>

      <div className="mt-4 rounded-[24px] border border-[color:var(--rule)]/80 bg-[color:var(--canvas)]/78 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="type-overline text-[var(--masters)]">Current hole</p>
            <h3 className="mt-1 font-serif text-[length:var(--text-xl)] font-normal text-[var(--ink)]">
              Hole {holeNumber}
            </h3>
          </div>
          <p className="text-sm text-[var(--ink-secondary)]">{holeStatusCopy}</p>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
          <div className="flex min-w-0 items-center gap-2">
            <ChevronRight size={14} style={{ color: teamAColor }} />
            <span className="truncate" title={teamAName}>
              {teamAName}
            </span>
          </div>
          <div className="h-1 flex-1 rounded-full bg-[color:var(--rule)]/70">
            <motion.div
              className="h-full rounded-full"
              animate={{
                width: activeSwipe ? '100%' : '34%',
                marginLeft:
                  activeSwipe === 'teamA' ? '0%' : activeSwipe === 'teamB' ? '66%' : '33%',
                backgroundColor:
                  activeSwipe === 'teamA'
                    ? teamAColor
                    : activeSwipe === 'teamB'
                      ? teamBColor
                      : 'color-mix(in srgb, var(--ink) 22%, transparent)',
              }}
              transition={{ duration: 0.18 }}
            />
          </div>
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate" title={teamBName}>
              {teamBName}
            </span>
            <ChevronLeft size={14} style={{ color: teamBColor }} />
          </div>
        </div>
      </div>

      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.24}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        className="mt-4 grid gap-3 sm:grid-cols-[1fr_108px_1fr]"
      >
        <button
          type="button"
          onClick={() => handleTapScore('teamA')}
          disabled={disabled}
          aria-pressed={existingResult === 'teamA'}
          aria-label={`${teamAName} wins hole`}
          className="min-h-[96px] min-w-0 overflow-hidden rounded-[24px] border px-4 py-5 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            borderColor:
              activeSwipe === 'teamA'
                ? colorWithAlpha(teamAColor, 40)
                : colorWithAlpha(teamAColor, 18),
            background:
              activeSwipe === 'teamA'
                ? `linear-gradient(180deg, ${teamAColor} 0%, ${deepenColor(teamAColor)} 100%)`
                : colorWithAlpha(teamAColor, 8),
            color: activeSwipe === 'teamA' ? 'var(--canvas)' : teamAColor,
            boxShadow:
              existingResult === 'teamA'
                ? `0 0 0 2px ${colorWithAlpha(teamAColor, 22)} inset`
                : undefined,
          }}
        >
          <p className="truncate text-base font-semibold" title={teamAName}>
            {teamAName}
          </p>
          <p className="mt-1 text-sm opacity-80">Wins hole</p>
        </button>

        <button
          type="button"
          onClick={() => handleTapScore('halved')}
          disabled={disabled}
          aria-pressed={existingResult === 'halved'}
          aria-label="Hole halved"
          className="min-h-[96px] rounded-[24px] border border-[color:var(--rule)] bg-[color:var(--canvas)] px-4 py-5 text-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            boxShadow:
              existingResult === 'halved'
                ? '0 0 0 2px color-mix(in srgb, var(--ink-secondary) 16%, transparent) inset'
                : undefined,
          }}
        >
          <p className="font-serif text-[length:var(--text-2xl)] leading-none text-[var(--ink)]">
            1/2
          </p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-tertiary)]">
            Halve
          </p>
        </button>

        <button
          type="button"
          onClick={() => handleTapScore('teamB')}
          disabled={disabled}
          aria-pressed={existingResult === 'teamB'}
          aria-label={`${teamBName} wins hole`}
          className="min-h-[96px] min-w-0 overflow-hidden rounded-[24px] border px-4 py-5 text-right transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
          style={{
            borderColor:
              activeSwipe === 'teamB'
                ? colorWithAlpha(teamBColor, 40)
                : colorWithAlpha(teamBColor, 18),
            background:
              activeSwipe === 'teamB'
                ? `linear-gradient(180deg, ${teamBColor} 0%, ${deepenColor(teamBColor)} 100%)`
                : colorWithAlpha(teamBColor, 8),
            color: activeSwipe === 'teamB' ? 'var(--canvas)' : teamBColor,
            boxShadow:
              existingResult === 'teamB'
                ? `0 0 0 2px ${colorWithAlpha(teamBColor, 22)} inset`
                : undefined,
          }}
        >
          <p className="truncate text-base font-semibold" title={teamBName}>
            {teamBName}
          </p>
          <p className="mt-1 text-sm opacity-80">Wins hole</p>
        </button>
      </motion.div>

      <div className="mt-4 grid grid-cols-[auto_1fr_auto] items-center gap-3">
        <button
          type="button"
          onClick={onPrevHole}
          disabled={disabled || holeNumber <= 1}
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[color:var(--rule)] bg-[color:var(--canvas)] text-[var(--ink-secondary)] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-35"
          aria-label="Previous hole"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="rounded-2xl border border-[color:var(--rule)]/80 bg-[color:var(--canvas)]/72 px-4 py-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
            Thumb scoring
          </p>
          <p className="mt-1 text-sm text-[var(--ink-secondary)]">
            Large targets stay close to your thumb.
          </p>
        </div>

        <button
          type="button"
          onClick={onNextHole}
          disabled={disabled || holeNumber >= 18}
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[color:var(--rule)] bg-[color:var(--canvas)] text-[var(--ink-secondary)] transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-35"
          aria-label="Next hole"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {canUndo && onUndo && (
        <button
          type="button"
          onClick={onUndo}
          disabled={disabled}
          className={cn(
            'mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--canvas)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60',
            isRightHanded ? 'text-[var(--masters)]' : 'text-[var(--ink)]'
          )}
          style={{
            borderColor: 'color-mix(in srgb, var(--masters) 16%, transparent)',
            background: 'color-mix(in srgb, var(--masters) 8%, transparent)',
          }}
        >
          <RotateCcw size={16} />
          Undo last score
        </button>
      )}
    </div>
  );
}

export default OneHandedScoringPanel;
