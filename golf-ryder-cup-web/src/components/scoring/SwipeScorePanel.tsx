/**
 * SwipeScorePanel — Phase 1.2: Gesture-Based Scoring
 *
 * World-class swipe-to-score interface for the fastest golf scoring experience.
 * Designed for outdoor use with large gesture zones and visual feedback.
 *
 * Gestures:
 * - Swipe LEFT  → Team A wins hole
 * - Swipe RIGHT → Team B wins hole
 * - Swipe UP    → Hole halved
 * - TAP center  → Opens hole options
 *
 * Features:
 * - Real-time visual feedback during swipe
 * - Velocity-based gesture recognition
 * - Haptic feedback at threshold
 * - Animated score confirmation
 * - Accessibility: tap fallback for all actions
 * - iOS swipe-back protection
 */

'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, useMotionValue, useTransform, AnimatePresence, PanInfo } from 'framer-motion';
import { Check, Minus, ChevronLeft, ChevronRight, Trophy } from 'lucide-react';
import type { HoleWinner } from '@/lib/types/models';
import { useHaptic } from '@/lib/hooks';
import { useSwipeBackProtection } from '@/lib/hooks/useSwipeBackProtection';
import { cn } from '@/lib/utils';

interface SwipeScorePanelProps {
  /** Current hole number (1-18) */
  holeNumber: number;
  /** Team A display name */
  teamAName: string;
  /** Team B display name */
  teamBName: string;
  /** Team A color */
  teamAColor?: string;
  /** Team B color */
  teamBColor?: string;
  /** Current match score from Team A perspective */
  currentScore: number;
  /** Whether a score already exists for this hole */
  existingResult?: HoleWinner;
  /** Callback when score is submitted */
  onScore: (winner: HoleWinner) => void;
  /** Whether scoring is disabled (saving, locked, etc.) */
  disabled?: boolean;
  /** Optional class name */
  className?: string;
}

// Gesture thresholds
const SWIPE_THRESHOLD = 80; // px to trigger score
const VELOCITY_THRESHOLD = 300; // px/s for quick swipes
const VERTICAL_THRESHOLD = 60; // px for halved gesture
const SCORE_CONFIRMATION_DELAY_MS = 350;

function colorWithAlpha(color: string, alphaPercent: number) {
  return `color-mix(in srgb, ${color} ${alphaPercent}%, transparent)`;
}

export function SwipeScorePanel({
  holeNumber,
  teamAName,
  teamBName,
  teamAColor = '#1E3A5F',
  teamBColor = '#722F37',
  currentScore,
  existingResult,
  onScore,
  disabled = false,
  className = '',
}: SwipeScorePanelProps) {
  const haptic = useHaptic();
  const containerRef = useRef<HTMLDivElement>(null);

  // iOS Safari swipe-back protection - prevents accidental navigation
  // when swiping to score near screen edges
  useSwipeBackProtection(containerRef, {
    edgeWidth: 40, // Slightly wider zone for scoring gestures
  });

  // Motion values for gesture tracking
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // State for gesture feedback
  const [gestureState, setGestureState] = useState<'idle' | 'teamA' | 'teamB' | 'halved'>('idle');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [confirmedResult, setConfirmedResult] = useState<HoleWinner | null>(null);
  const [hasTriggeredHaptic, setHasTriggeredHaptic] = useState(false);

  const teamASelected = existingResult === 'teamA';
  const teamBSelected = existingResult === 'teamB';
  const halvedSelected = existingResult === 'halved';

  // Transform motion values for visual feedback
  const teamAOpacity = useTransform(x, [-SWIPE_THRESHOLD, 0], [1, 0]);
  const teamBOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const halvedOpacity = useTransform(y, [-VERTICAL_THRESHOLD, 0], [1, 0]);

  const backgroundGradient = useTransform(
    x,
    [-SWIPE_THRESHOLD * 1.5, 0, SWIPE_THRESHOLD * 1.5],
    [
      `linear-gradient(90deg, ${colorWithAlpha(teamAColor, 28)} 0%, transparent 50%)`,
      'transparent',
      `linear-gradient(90deg, transparent 50%, ${colorWithAlpha(teamBColor, 28)} 100%)`,
    ]
  );

  // Scale transform for the center orb
  const orbScale = useTransform([x, y], ([latestX, latestY]: number[]) => {
    const distance = Math.sqrt(latestX ** 2 + latestY ** 2);
    return Math.max(0.85, 1 - distance / 300);
  });

  // Reset haptic trigger on gesture end
  const resetHapticTrigger = useCallback(() => {
    setHasTriggeredHaptic(false);
  }, []);

  // Handle gesture updates for haptic feedback
  useEffect(() => {
    const unsubscribeX = x.on('change', (latestX: number) => {
      if (disabled) return;

      const absX = Math.abs(latestX);
      const absY = Math.abs(y.get());

      // Determine gesture direction
      if (absX > SWIPE_THRESHOLD * 0.7 && absX > absY) {
        const newState = latestX < 0 ? 'teamA' : 'teamB';
        if (gestureState !== newState) {
          setGestureState(newState);
          if (!hasTriggeredHaptic) {
            haptic.select();
            setHasTriggeredHaptic(true);
          }
        }
      } else if (absY > VERTICAL_THRESHOLD * 0.7 && absY > absX && y.get() < 0) {
        if (gestureState !== 'halved') {
          setGestureState('halved');
          if (!hasTriggeredHaptic) {
            haptic.select();
            setHasTriggeredHaptic(true);
          }
        }
      } else if (absX < SWIPE_THRESHOLD * 0.3 && absY < VERTICAL_THRESHOLD * 0.3) {
        setGestureState('idle');
        resetHapticTrigger();
      }
    });

    return () => unsubscribeX();
  }, [x, y, gestureState, haptic, hasTriggeredHaptic, disabled, resetHapticTrigger]);

  // Handle pan gesture end
  const handlePanEnd = useCallback(
    (_: never, info: PanInfo) => {
      if (disabled) return;

      const { offset, velocity } = info;
      let result: HoleWinner | null = null;

      // Check for valid swipe based on distance OR velocity
      const isHorizontalSwipe = Math.abs(offset.x) > Math.abs(offset.y);
      const isVerticalSwipe = !isHorizontalSwipe && offset.y < 0;

      if (isHorizontalSwipe) {
        if (offset.x < -SWIPE_THRESHOLD || velocity.x < -VELOCITY_THRESHOLD) {
          result = 'teamA';
        } else if (offset.x > SWIPE_THRESHOLD || velocity.x > VELOCITY_THRESHOLD) {
          result = 'teamB';
        }
      } else if (isVerticalSwipe) {
        if (offset.y < -VERTICAL_THRESHOLD || velocity.y < -VELOCITY_THRESHOLD) {
          result = 'halved';
        }
      }

      if (result) {
        // Trigger score with visual haptic feedback for iOS
        const feedbackType =
          result === 'teamA' ? 'teamA' : result === 'teamB' ? 'teamB' : 'scoreTie';
        haptic.triggerWithVisual(feedbackType, containerRef.current);
        setConfirmedResult(result);
        setShowConfirmation(true);

        // Call onScore after brief delay for visual feedback
        setTimeout(() => {
          onScore(result!);
          setShowConfirmation(false);
          setConfirmedResult(null);
        }, SCORE_CONFIRMATION_DELAY_MS);
      }

      // Reset gesture state
      setGestureState('idle');
      resetHapticTrigger();
    },
    [disabled, haptic, onScore, resetHapticTrigger]
  );

  // Tap handlers for accessibility
  const handleTapTeamA = useCallback(() => {
    if (disabled) return;
    haptic.triggerWithVisual('teamA', containerRef.current);
    onScore('teamA');
  }, [disabled, haptic, onScore]);

  const handleTapTeamB = useCallback(() => {
    if (disabled) return;
    haptic.triggerWithVisual('teamB', containerRef.current);
    onScore('teamB');
  }, [disabled, haptic, onScore]);

  const handleTapHalved = useCallback(() => {
    if (disabled) return;
    haptic.triggerWithVisual('scoreTie', containerRef.current);
    onScore('halved');
  }, [disabled, haptic, onScore]);

  // Keyboard handler for accessibility
  // Arrow keys: Left = Team A, Right = Team B, Up = Halved
  // Also supports: A = Team A, B = Team B, H = Halved
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled) return;

      switch (e.key) {
        case 'ArrowLeft':
        case 'a':
        case 'A':
          e.preventDefault();
          handleTapTeamA();
          break;
        case 'ArrowRight':
        case 'b':
        case 'B':
          e.preventDefault();
          handleTapTeamB();
          break;
        case 'ArrowUp':
        case 'h':
        case 'H':
          e.preventDefault();
          handleTapHalved();
          break;
      }
    },
    [disabled, handleTapTeamA, handleTapTeamB, handleTapHalved]
  );

  // Get score display
  const getScoreDisplay = () => {
    if (currentScore === 0) return 'AS';
    const abs = Math.abs(currentScore);
    const leader = currentScore > 0 ? teamAName : teamBName;
    return `${leader} ${abs}UP`;
  };

  const getExistingResultLabel = () => {
    if (!existingResult || existingResult === 'none') return 'No score recorded for this hole';
    if (existingResult === 'halved') return 'Hole recorded as halved';
    return existingResult === 'teamA'
      ? `${teamAName} is recorded as the hole winner`
      : `${teamBName} is recorded as the hole winner`;
  };

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative aspect-[4/3] min-h-[300px] w-full max-h-[420px] overflow-hidden rounded-[28px] border border-[color:var(--rule)]/70 shadow-card focus:outline-none focus:ring-2 focus:ring-[var(--masters)] focus:ring-offset-2 focus:ring-offset-[var(--canvas)]',
        disabled && 'opacity-90',
        className
      )}
      style={{
        background: 'var(--surface)',
        touchAction: 'none',
        // iOS Safari swipe-back protection
        overscrollBehaviorX: 'contain',
        WebkitOverflowScrolling: 'touch',
      }}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      role="group"
      aria-disabled={disabled}
      aria-label={`Score entry for hole ${holeNumber}. Press Left arrow or A for ${teamAName} wins, Right arrow or B for ${teamBName} wins, Up arrow or H for halved.`}
    >
      <p className="sr-only" aria-live="polite">
        {getExistingResultLabel()}
      </p>

      {/* Background gradient based on gesture */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        style={{ background: backgroundGradient }}
      />

      {/* Team A zone indicator (left) */}
      <motion.div
        className="absolute left-0 top-0 bottom-0 w-24 flex items-center justify-center pointer-events-none"
        style={{ opacity: teamAOpacity }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: teamAColor }}
        >
          <ChevronLeft className="w-8 h-8 text-[var(--canvas)]" />
        </div>
      </motion.div>

      {/* Team B zone indicator (right) */}
      <motion.div
        className="absolute right-0 top-0 bottom-0 w-24 flex items-center justify-center pointer-events-none"
        style={{ opacity: teamBOpacity }}
      >
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: teamBColor }}
        >
          <ChevronRight className="w-8 h-8 text-[var(--canvas)]" />
        </div>
      </motion.div>

      {/* Halved zone indicator (top) */}
      <motion.div
        className="absolute top-0 left-0 right-0 h-20 flex items-center justify-center pointer-events-none"
        style={{ opacity: halvedOpacity }}
      >
        <div className="px-6 py-3 rounded-2xl bg-[color:var(--ink-secondary)]/80 flex items-center gap-2">
          <Minus className="w-5 h-5 text-[var(--canvas)]" />
          <span className="text-[var(--canvas)] font-semibold">Halved</span>
        </div>
      </motion.div>

      {/* Center draggable orb */}
      <div className="absolute inset-0 flex items-center justify-center">
        <motion.div
          drag={!disabled}
          dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
          dragElastic={0.5}
          onPanEnd={handlePanEnd}
          style={{ x, y, scale: orbScale }}
          className="relative cursor-grab active:cursor-grabbing"
        >
          {/* Outer glow ring */}
          <div
            className={`absolute -inset-4 rounded-full transition-all duration-200 ${
              gestureState !== 'idle' ? 'opacity-100' : 'opacity-0'
            }`}
            style={{
              background:
                gestureState === 'teamA'
                  ? colorWithAlpha(teamAColor, 18)
                  : gestureState === 'teamB'
                    ? colorWithAlpha(teamBColor, 18)
                    : gestureState === 'halved'
                      ? 'rgba(100, 100, 100, 0.3)'
                      : 'transparent',
              boxShadow:
                gestureState !== 'idle'
                  ? `0 0 40px ${
                      gestureState === 'teamA'
                        ? colorWithAlpha(teamAColor, 40)
                        : gestureState === 'teamB'
                          ? colorWithAlpha(teamBColor, 40)
                          : 'rgba(100, 100, 100, 0.25)'
                    }`
                  : 'none',
            }}
          />

          {/* Main orb */}
          <div
            className={`
              relative w-32 h-32 rounded-full flex flex-col items-center justify-center
              shadow-2xl transition-colors duration-200
              ${disabled ? 'opacity-50' : ''}
            `}
            style={{
              background:
                gestureState === 'teamA'
                  ? teamAColor
                  : gestureState === 'teamB'
                    ? teamBColor
                    : gestureState === 'halved'
                      ? 'var(--ink-secondary)'
                      : 'var(--masters)',
            }}
          >
            <span className="text-2xl font-bold text-[var(--canvas)]">{holeNumber}</span>
            <span className="text-xs text-[color:var(--canvas)]/80 uppercase tracking-wider">
              Hole
            </span>
          </div>

          {/* Gesture hints */}
          {gestureState === 'idle' && !disabled && (
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className="text-xs text-[var(--ink-tertiary)]">Swipe to score</span>
            </div>
          )}
        </motion.div>
      </div>

      {/* Confirmation overlay */}
      <AnimatePresence>
        {showConfirmation && confirmedResult && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute inset-0 flex items-center justify-center bg-[color:var(--ink)]/50 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 15, stiffness: 300 }}
              className="w-24 h-24 rounded-full flex items-center justify-center"
              style={{
                background:
                  confirmedResult === 'teamA'
                    ? teamAColor
                    : confirmedResult === 'teamB'
                      ? teamBColor
                      : 'var(--ink-secondary)',
              }}
            >
              {confirmedResult === 'halved' ? (
                <Minus className="w-12 h-12 text-[var(--canvas)]" />
              ) : (
                <Trophy className="w-12 h-12 text-[var(--canvas)]" />
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tap buttons for accessibility and one-handed fallback */}
      <div className="absolute bottom-3 left-3 right-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-2 sm:bottom-4 sm:left-4 sm:right-4">
        <button
          type="button"
          onClick={handleTapTeamA}
          disabled={disabled}
          aria-pressed={teamASelected}
          className={cn(
            'min-h-12 min-w-0 rounded-[18px] border px-3 py-2 text-left shadow-card-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
            teamASelected && 'ring-2 ring-[var(--gold)] ring-offset-2 ring-offset-[var(--surface)]'
          )}
          style={{
            background: colorWithAlpha(teamAColor, 14),
            borderColor: colorWithAlpha(teamAColor, 34),
            color: teamAColor,
          }}
          aria-label={`${teamAName} wins hole`}
        >
          <span className="block truncate text-sm font-semibold" title={teamAName}>
            {teamAName}
          </span>
          <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] opacity-75">
            Wins
          </span>
        </button>

        <button
          type="button"
          onClick={handleTapHalved}
          disabled={disabled}
          aria-pressed={halvedSelected}
          className={cn(
            'min-h-12 min-w-[4.75rem] rounded-[18px] border border-[color:var(--rule)] bg-[color:var(--surface-elevated)] px-3 py-2 text-sm font-semibold text-[var(--ink-secondary)] shadow-card-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
            halvedSelected && 'ring-2 ring-[var(--gold)] ring-offset-2 ring-offset-[var(--surface)]'
          )}
          aria-label="Hole halved"
        >
          <span className="block leading-none">1/2</span>
          <span className="mt-1 block text-[10px] uppercase tracking-[0.12em] text-[var(--ink-tertiary)]">
            Halve
          </span>
        </button>

        <button
          type="button"
          onClick={handleTapTeamB}
          disabled={disabled}
          aria-pressed={teamBSelected}
          className={cn(
            'min-h-12 min-w-0 rounded-[18px] border px-3 py-2 text-right shadow-card-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50',
            teamBSelected && 'ring-2 ring-[var(--gold)] ring-offset-2 ring-offset-[var(--surface)]'
          )}
          style={{
            background: colorWithAlpha(teamBColor, 14),
            borderColor: colorWithAlpha(teamBColor, 34),
            color: teamBColor,
          }}
          aria-label={`${teamBName} wins hole`}
        >
          <span className="block truncate text-sm font-semibold" title={teamBName}>
            {teamBName}
          </span>
          <span className="block text-[11px] font-semibold uppercase tracking-[0.12em] opacity-75">
            Wins
          </span>
        </button>
      </div>

      {/* Keyboard shortcut hint - visible on focus */}
      <div
        className="pointer-events-none absolute bottom-[5.75rem] left-1/2 -translate-x-1/2 opacity-0 transition-opacity focus-within:opacity-100"
        aria-hidden="true"
      >
        <div className="px-3 py-1.5 rounded-lg bg-[color:var(--ink)]/45 backdrop-blur-sm">
          <span className="text-xs text-[color:var(--canvas)]/85">
            ← A wins • ↑ Halved • B wins →
          </span>
        </div>
      </div>

      {/* Current score display */}
      <div className="absolute top-4 left-1/2 max-w-[68%] -translate-x-1/2">
        <div className="rounded-full bg-[color:var(--ink)]/12 px-4 py-1.5 backdrop-blur-sm">
          <span
            className="block truncate text-sm font-semibold"
            style={{ color: 'var(--ink-primary)' }}
            title={getScoreDisplay()}
          >
            {getScoreDisplay()}
          </span>
        </div>
      </div>

      {/* Existing result indicator */}
      {existingResult && existingResult !== 'none' && (
        <div className="absolute top-4 right-4 flex items-center gap-2 rounded-full bg-[color:var(--surface-elevated)]/84 p-1 shadow-card-sm backdrop-blur-sm">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center"
            style={{
              background:
                existingResult === 'teamA'
                  ? teamAColor
                  : existingResult === 'teamB'
                    ? teamBColor
                    : 'var(--ink-secondary)',
            }}
          >
            <Check className="w-4 h-4 text-[var(--canvas)]" />
          </div>
          <span className="hidden max-w-24 truncate pr-2 text-xs font-semibold text-[var(--ink-secondary)] sm:block">
            {existingResult === 'halved'
              ? 'Halved'
              : existingResult === 'teamA'
                ? teamAName
                : teamBName}
          </span>
        </div>
      )}
    </div>
  );
}
