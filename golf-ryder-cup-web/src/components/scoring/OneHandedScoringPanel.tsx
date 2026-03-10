'use client';

import { useCallback, useMemo, useState } from 'react';
import { AnimatePresence, motion, type PanInfo } from 'framer-motion';
import { Check, ChevronLeft, ChevronRight, Hand, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
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

function outcomeLabel(
  result: HoleWinner | null | undefined,
  teamAName: string,
  teamBName: string
) {
  if (!result || result === 'none') return 'Ready to score';
  if (result === 'halved') return `Hole ${teamAName === teamBName ? '' : 'was '}halved`;
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

      if (swipedRight) setConfirmingResult('teamA');
      else if (swipedLeft) setConfirmingResult('teamB');
      setActiveSwipe(null);
    },
    [disabled]
  );

  const handleTapScore = useCallback(
    (winner: HoleWinner) => {
      if (disabled) return;
      setConfirmingResult(winner);
    },
    [disabled]
  );

  const handleConfirm = useCallback(() => {
    if (!confirmingResult) return;
    onScore(confirmingResult);
    setConfirmingResult(null);
  }, [confirmingResult, onScore]);

  const handleCancel = useCallback(() => {
    setConfirmingResult(null);
  }, []);

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
    <div className="relative overflow-hidden rounded-[32px] border border-[color:var(--rule)] bg-[linear-gradient(180deg,rgba(255,255,255,0.8)_0%,rgba(245,240,233,0.98)_100%)] p-4 shadow-card sm:p-5">
      <AnimatePresence>
        {confirmingResult && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 flex items-center justify-center bg-[rgba(26,24,21,0.5)] px-5 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-xs rounded-[28px] border border-[color:var(--rule)] bg-[color:var(--canvas)] p-5 text-center shadow-card"
            >
              <p className="type-overline text-[var(--masters)]">Confirm score</p>
              <h3 className="mt-2 font-serif text-[length:var(--text-2xl)] font-normal tracking-[-0.02em] text-[var(--ink)]">
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
                      'inline-flex min-w-[116px] items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold transition-colors active:scale-[0.98]',
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
            {teamAName}
          </p>
          <p className="mt-2 text-sm text-[var(--ink-secondary)]">Swipe right or tap to award</p>
        </div>

        <div className="text-center">
          <p className="type-overline text-[var(--masters)]">Match score</p>
          <p
            className="mt-2 font-serif text-[clamp(3rem,12vw,4.75rem)] font-normal leading-none tracking-[-0.05em]"
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
            {teamBName}
          </p>
          <p className="mt-2 text-sm text-[var(--ink-secondary)]">Swipe left or tap to award</p>
        </div>
      </div>

      <div className="mt-4 rounded-[24px] border border-[color:var(--rule)]/80 bg-[color:var(--canvas)]/78 px-4 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="type-overline text-[var(--masters)]">Current hole</p>
            <h3 className="mt-1 font-serif text-[length:var(--text-xl)] font-normal tracking-[-0.02em] text-[var(--ink)]">
              Hole {holeNumber}
            </h3>
          </div>
          <p className="text-sm text-[var(--ink-secondary)]">{holeStatusCopy}</p>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
          <div className="flex items-center gap-2">
            <ChevronRight size={14} style={{ color: teamAColor }} />
            {teamAName}
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
                      : 'rgba(26, 24, 21, 0.22)',
              }}
              transition={{ duration: 0.18 }}
            />
          </div>
          <div className="flex items-center gap-2">
            {teamBName}
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
          className="rounded-[26px] border px-4 py-5 text-left transition-transform active:scale-[0.98] disabled:opacity-50"
          style={{
            borderColor: activeSwipe === 'teamA' ? `${teamAColor}66` : `${teamAColor}2E`,
            background:
              activeSwipe === 'teamA'
                ? `linear-gradient(180deg, ${teamAColor} 0%, ${teamAColor}DD 100%)`
                : `${teamAColor}14`,
            color: activeSwipe === 'teamA' ? 'var(--canvas)' : teamAColor,
            boxShadow:
              existingResult === 'teamA' ? `0 0 0 2px ${teamAColor}33 inset` : undefined,
          }}
        >
          <p className="text-base font-semibold">{teamAName}</p>
          <p className="mt-1 text-sm opacity-80">Wins hole</p>
        </button>

        <button
          type="button"
          onClick={() => handleTapScore('halved')}
          disabled={disabled}
          className="rounded-[26px] border border-[color:var(--rule)] bg-[color:var(--canvas)] px-4 py-5 text-center transition-transform active:scale-[0.98] disabled:opacity-50"
          style={{
            boxShadow:
              existingResult === 'halved'
                ? '0 0 0 2px rgba(86, 79, 68, 0.16) inset'
                : undefined,
          }}
        >
          <p className="font-serif text-[length:var(--text-2xl)] leading-none text-[var(--ink)]">1/2</p>
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-tertiary)]">
            Halve
          </p>
        </button>

        <button
          type="button"
          onClick={() => handleTapScore('teamB')}
          disabled={disabled}
          className="rounded-[26px] border px-4 py-5 text-right transition-transform active:scale-[0.98] disabled:opacity-50"
          style={{
            borderColor: activeSwipe === 'teamB' ? `${teamBColor}66` : `${teamBColor}2E`,
            background:
              activeSwipe === 'teamB'
                ? `linear-gradient(180deg, ${teamBColor} 0%, ${teamBColor}E1 100%)`
                : `${teamBColor}14`,
            color: activeSwipe === 'teamB' ? 'var(--canvas)' : teamBColor,
            boxShadow:
              existingResult === 'teamB' ? `0 0 0 2px ${teamBColor}33 inset` : undefined,
          }}
        >
          <p className="text-base font-semibold">{teamBName}</p>
          <p className="mt-1 text-sm opacity-80">Wins hole</p>
        </button>
      </motion.div>

      <div className="mt-4 grid grid-cols-[auto_1fr_auto] items-center gap-3">
        <button
          type="button"
          onClick={onPrevHole}
          disabled={disabled || holeNumber <= 1}
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[color:var(--rule)] bg-[color:var(--canvas)] text-[var(--ink-secondary)] transition-transform active:scale-[0.96] disabled:opacity-35"
          aria-label="Previous hole"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="rounded-2xl border border-[color:var(--rule)]/80 bg-[color:var(--canvas)]/72 px-4 py-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
            Thumb scoring
          </p>
          <p className="mt-1 text-sm text-[var(--ink-secondary)]">
            Swipe across the rail or tap a winner.
          </p>
        </div>

        <button
          type="button"
          onClick={onNextHole}
          disabled={disabled || holeNumber >= 18}
          className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-[color:var(--rule)] bg-[color:var(--canvas)] text-[var(--ink-secondary)] transition-transform active:scale-[0.96] disabled:opacity-35"
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
            'mt-4 inline-flex w-full items-center justify-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold transition-transform active:scale-[0.98] disabled:opacity-60',
            isRightHanded ? 'text-[var(--masters)]' : 'text-[var(--ink)]'
          )}
          style={{
            borderColor: 'rgba(0, 102, 68, 0.16)',
            background: 'rgba(0, 102, 68, 0.08)',
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
