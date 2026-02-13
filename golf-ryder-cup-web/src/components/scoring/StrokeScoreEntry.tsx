/**
 * StrokeScoreEntry — Enter Individual Stroke Scores
 *
 * Allows users to enter actual stroke counts for each team,
 * automatically calculating net scores based on handicap strokes
 * and determining the hole winner.
 *
 * Features:
 * - Increment/decrement buttons for easy outdoor use
 * - Shows gross and net scores side by side
 * - Automatically determines winner based on net scores
 * - Stroke dots show handicap adjustments
 * - Score label (birdie, par, bogey, etc.)
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus, Check, CircleDot, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getMatchPlayStrokesOnHole } from '@/lib/services/handicapCalculator';
import type { HoleWinner } from '@/lib/types/models';
import { useHaptic } from '@/lib/hooks';

interface StrokeScoreEntryProps {
  /** Current hole number */
  holeNumber: number;
  /** Par for this hole */
  par: number;
  /** Team A name */
  teamAName: string;
  /** Team B name */
  teamBName: string;
  /** Team A color */
  teamAColor?: string;
  /** Team B color */
  teamBColor?: string;
  /** Team A total handicap strokes for the round */
  teamAHandicapStrokes: number;
  /** Team B total handicap strokes for the round */
  teamBHandicapStrokes: number;
  /** Array of 18 hole handicap rankings */
  holeHandicaps: number[];
  /** Initial Team A score */
  initialTeamAScore?: number | null;
  /** Initial Team B score */
  initialTeamBScore?: number | null;
  /** Called when scores are submitted */
  onSubmit: (winner: HoleWinner, teamAScore: number, teamBScore: number) => void;
  /** Whether submission is in progress */
  isSubmitting?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get color for score relative to par
 */
function getScoreColor(score: number, par: number): string {
  const diff = score - par;
  if (diff <= -2) return 'var(--eagle-text, #ca8a04)';
  if (diff === -1) return 'var(--birdie-text, #dc2626)';
  if (diff === 0) return 'var(--ink)';
  if (diff === 1) return 'var(--bogey-text, #3b82f6)';
  return 'var(--double-text, #2563eb)';
}

/**
 * Get label for score relative to par
 */
function getScoreLabel(score: number, par: number): string {
  const diff = score - par;
  if (diff <= -3) return 'Albatross';
  if (diff === -2) return 'Eagle';
  if (diff === -1) return 'Birdie';
  if (diff === 0) return 'Par';
  if (diff === 1) return 'Bogey';
  if (diff === 2) return 'Double';
  if (diff === 3) return 'Triple';
  return `+${diff}`;
}

interface TeamScoreInputProps {
  teamName: string;
  teamColor: string;
  grossScore: number;
  netScore: number;
  par: number;
  strokesOnHole: number;
  isWinner: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
  disabled?: boolean;
}

function TeamScoreInput({
  teamName,
  teamColor,
  grossScore,
  netScore,
  par,
  strokesOnHole,
  isWinner,
  onIncrement,
  onDecrement,
  disabled = false,
}: TeamScoreInputProps) {
  const haptic = useHaptic();
  const hasStroke = strokesOnHole > 0;
  const grossColor = getScoreColor(grossScore, par);
  const netColor = getScoreColor(netScore, par);
  const grossLabel = getScoreLabel(grossScore, par);

  const handleIncrement = () => {
    haptic.tap();
    onIncrement();
  };

  const handleDecrement = () => {
    haptic.tap();
    onDecrement();
  };

  return (
    <div
      className={cn('flex-1 rounded-2xl p-4 transition-all', isWinner && 'ring-2')}
      style={
        {
          background: `${teamColor}10`,
          '--tw-ring-color': isWinner ? teamColor : undefined,
        } as React.CSSProperties
      }
    >
      {/* Team Name */}
      <div className="text-center mb-3">
        <span
          className="text-sm font-semibold uppercase tracking-wide"
          style={{ color: teamColor }}
        >
          {teamName}
        </span>
      </div>

      {/* Score Controls */}
      <div className="flex items-center justify-center gap-3">
        {/* Decrement */}
        <button
          onClick={handleDecrement}
          disabled={disabled || grossScore <= 1}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95"
          style={{
            background: 'var(--canvas)',
            border: '2px solid var(--rule)',
            opacity: grossScore <= 1 ? 0.3 : 1,
          }}
        >
          <Minus size={20} style={{ color: 'var(--ink-secondary)' }} />
        </button>

        {/* Score Display */}
        <div className="flex flex-col items-center min-w-20">
          {/* Gross Score */}
          <span className="text-4xl font-bold" style={{ color: grossColor }}>
            {grossScore}
          </span>
          <span className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
            {grossLabel}
          </span>

          {/* Net Score (if strokes apply) */}
          {hasStroke && (
            <div className="flex items-center gap-1 mt-1">
              <ArrowDown size={10} style={{ color: 'var(--ink-tertiary)' }} />
              <span className="text-xl font-bold" style={{ color: netColor }}>
                {netScore}
              </span>
              <span className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
                net
              </span>
            </div>
          )}
        </div>

        {/* Increment */}
        <button
          onClick={handleIncrement}
          disabled={disabled || grossScore >= 15}
          className="w-12 h-12 rounded-full flex items-center justify-center transition-all active:scale-95"
          style={{
            background: 'var(--canvas)',
            border: '2px solid var(--rule)',
            opacity: grossScore >= 15 ? 0.3 : 1,
          }}
        >
          <Plus size={20} style={{ color: 'var(--ink-secondary)' }} />
        </button>
      </div>

      {/* Stroke Indicator */}
      {hasStroke && (
        <div className="flex items-center justify-center gap-0.5 mt-3">
          {Array.from({ length: strokesOnHole }).map((_, i) => (
            <CircleDot key={i} size={12} style={{ color: 'var(--masters)' }} />
          ))}
          <span className="text-xs ml-1" style={{ color: 'var(--ink-tertiary)' }}>
            {strokesOnHole === 1 ? 'stroke' : 'strokes'}
          </span>
        </div>
      )}
    </div>
  );
}

export function StrokeScoreEntry({
  holeNumber,
  par,
  teamAName,
  teamBName,
  teamAColor = '#0047AB',
  teamBColor = '#8B0000',
  teamAHandicapStrokes,
  teamBHandicapStrokes,
  holeHandicaps,
  initialTeamAScore,
  initialTeamBScore,
  onSubmit,
  isSubmitting = false,
  className = '',
}: StrokeScoreEntryProps) {
  const haptic = useHaptic();

  // Default scores to par
  const [teamAScore, setTeamAScore] = useState<number>(initialTeamAScore ?? par);
  const [teamBScore, setTeamBScore] = useState<number>(initialTeamBScore ?? par);

  // Calculate match play strokes on this hole (differential-based)
  const { teamAStrokes: teamAStrokesOnHole, teamBStrokes: teamBStrokesOnHole } = useMemo(() => {
    return getMatchPlayStrokesOnHole(
      holeNumber,
      teamAHandicapStrokes,
      teamBHandicapStrokes,
      holeHandicaps
    );
  }, [holeNumber, teamAHandicapStrokes, teamBHandicapStrokes, holeHandicaps]);

  // Calculate net scores
  const teamANetScore = teamAScore - teamAStrokesOnHole;
  const teamBNetScore = teamBScore - teamBStrokesOnHole;

  // Determine winner
  const winner: HoleWinner = useMemo(() => {
    if (teamANetScore < teamBNetScore) return 'teamA';
    if (teamBNetScore < teamANetScore) return 'teamB';
    return 'halved';
  }, [teamANetScore, teamBNetScore]);

  // Handle submit
  const handleSubmit = useCallback(() => {
    haptic.scorePoint();
    onSubmit(winner, teamAScore, teamBScore);
  }, [haptic, onSubmit, winner, teamAScore, teamBScore]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Hole Info */}
      <div className="flex items-center justify-center gap-2">
        <span className="text-sm font-medium text-[var(--ink-primary)]">Hole {holeNumber}</span>
        <span className="w-px h-3 bg-[color:var(--rule)]/60" />
        <span className="text-sm text-[var(--ink-secondary)]">Par {par}</span>
        {(teamAStrokesOnHole > 0 || teamBStrokesOnHole > 0) && (
          <>
            <span className="w-px h-3 bg-[color:var(--rule)]/60" />
            <span className="text-xs font-medium text-[var(--masters)]">Stroke Hole</span>
          </>
        )}
      </div>

      {/* Score Entry Cards */}
      <div className="flex gap-3">
        <TeamScoreInput
          teamName={teamAName}
          teamColor={teamAColor}
          grossScore={teamAScore}
          netScore={teamANetScore}
          par={par}
          strokesOnHole={teamAStrokesOnHole}
          isWinner={winner === 'teamA'}
          onIncrement={() => setTeamAScore((s) => Math.min(s + 1, 15))}
          onDecrement={() => setTeamAScore((s) => Math.max(s - 1, 1))}
          disabled={isSubmitting}
        />
        <TeamScoreInput
          teamName={teamBName}
          teamColor={teamBColor}
          grossScore={teamBScore}
          netScore={teamBNetScore}
          par={par}
          strokesOnHole={teamBStrokesOnHole}
          isWinner={winner === 'teamB'}
          onIncrement={() => setTeamBScore((s) => Math.min(s + 1, 15))}
          onDecrement={() => setTeamBScore((s) => Math.max(s - 1, 1))}
          disabled={isSubmitting}
        />
      </div>

      {/* Result Preview */}
      <div className="p-3 rounded-xl text-center bg-[var(--canvas-sunken)]">
        <span
          className="text-sm font-medium"
          style={{
            color:
              winner === 'teamA'
                ? teamAColor
                : winner === 'teamB'
                  ? teamBColor
                  : 'var(--ink-secondary)',
          }}
        >
          {winner === 'halved'
            ? 'Hole Halved'
            : `${winner === 'teamA' ? teamAName : teamBName} wins hole`}
          {(teamAStrokesOnHole > 0 || teamBStrokesOnHole > 0) && (
            <span className="text-[var(--ink-tertiary)]"> (net)</span>
          )}
        </span>
      </div>

      {/* Submit Button */}
      <motion.button
        onClick={handleSubmit}
        disabled={isSubmitting}
        whileTap={{ scale: 0.98 }}
        className="w-full py-4 rounded-2xl flex items-center justify-center gap-2 font-semibold text-white transition-all bg-[var(--masters)] disabled:opacity-70"
      >
        {isSubmitting ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <>
            <Check size={20} />
            <span>Record Score</span>
          </>
        )}
      </motion.button>

      {/* Score Summary */}
      <div className="text-center text-xs text-[var(--ink-tertiary)]">
        {teamAName}: {teamAScore} gross
        {teamAStrokesOnHole > 0 && ` → ${teamANetScore} net`}
        {' • '}
        {teamBName}: {teamBScore} gross
        {teamBStrokesOnHole > 0 && ` → ${teamBNetScore} net`}
      </div>
    </div>
  );
}

export default StrokeScoreEntry;
