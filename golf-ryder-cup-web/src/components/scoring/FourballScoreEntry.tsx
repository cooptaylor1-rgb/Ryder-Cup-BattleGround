/**
 * FourballScoreEntry — Enter Individual Player Scores for Best Ball Formats
 *
 * In fourball/best ball matches, each player plays their own ball.
 * This component allows entering individual scores for all players,
 * automatically determines the best ball for each team, and calculates
 * the hole winner based on net scores.
 *
 * Features:
 * - Individual score entry for each player
 * - Shows each player's gross and net scores
 * - Highlights the "best ball" for each team
 * - Auto-determines winner based on best net scores
 * - Handicap stroke indicators per player
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import type { CSSProperties } from 'react';
import { motion } from 'framer-motion';
import { Plus, Minus, Check, CircleDot, Crown, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import { allocateStrokes } from '@/lib/services/handicapCalculator';
import type { HoleWinner, PlayerHoleScore } from '@/lib/types/models';
import { useHaptic } from '@/lib/hooks';

interface PlayerInfo {
  id: string;
  name: string;
  courseHandicap: number;
}

interface FourballScoreEntryProps {
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
  /** Team A players with their handicaps */
  teamAPlayers: PlayerInfo[];
  /** Team B players with their handicaps */
  teamBPlayers: PlayerInfo[];
  /** Array of 18 hole handicap rankings */
  holeHandicaps: number[];
  /** Initial Team A player scores */
  initialTeamAScores?: PlayerHoleScore[];
  /** Initial Team B player scores */
  initialTeamBScores?: PlayerHoleScore[];
  /** Called when scores are submitted */
  onSubmit: (
    winner: HoleWinner,
    teamABestScore: number,
    teamBBestScore: number,
    teamAPlayerScores: PlayerHoleScore[],
    teamBPlayerScores: PlayerHoleScore[]
  ) => void;
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

interface PlayerScoreInputProps {
  player: PlayerInfo;
  grossScore: number;
  netScore: number;
  strokesOnHole: number;
  par: number;
  teamColor: string;
  isBestBall: boolean;
  onIncrement: () => void;
  onDecrement: () => void;
  disabled?: boolean;
}

function PlayerScoreInput({
  player,
  grossScore,
  netScore,
  strokesOnHole,
  par,
  teamColor,
  isBestBall,
  onIncrement,
  onDecrement,
  disabled = false,
}: PlayerScoreInputProps) {
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
      className={cn(
        'rounded-xl p-3 transition-all border-2',
        isBestBall ? 'border-opacity-100' : 'border-opacity-20'
      )}
      style={{
        background: `${teamColor}08`,
        borderColor: isBestBall ? teamColor : `${teamColor}30`,
      }}
    >
      {/* Player Name & Best Ball Badge */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <User size={14} style={{ color: teamColor }} />
          <span className="text-xs font-medium truncate max-w-[100px] text-[var(--ink-secondary)]">
            {player.name}
          </span>
          <span className="text-[10px] text-[var(--ink-tertiary)]">({player.courseHandicap})</span>
        </div>
        {isBestBall && (
          <div
            className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[color:var(--team-color)]/20 text-[var(--team-color)]"
            style={{ '--team-color': teamColor } as CSSProperties}
          >
            <Crown size={10} />
            Best
          </div>
        )}
      </div>

      {/* Score Controls */}
      <div className="flex items-center justify-center gap-2">
        {/* Decrement */}
        <button
          onClick={handleDecrement}
          disabled={disabled || grossScore <= 1}
          className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95',
            'bg-[var(--canvas)] border border-[var(--rule)]',
            grossScore <= 1 ? 'opacity-30' : 'opacity-100'
          )}
        >
          <Minus size={16} className="text-[var(--ink-secondary)]" />
        </button>

        {/* Score Display */}
        <div className="flex flex-col items-center min-w-[60px]">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold" style={{ color: grossColor }}>
              {grossScore}
            </span>
            {hasStroke && (
              <>
                <span className="text-sm text-[var(--ink-tertiary)]">/</span>
                <span className="text-lg font-semibold" style={{ color: netColor }}>
                  {netScore}
                </span>
              </>
            )}
          </div>
          <span className="text-[10px] text-[var(--ink-tertiary)]">{grossLabel}</span>
        </div>

        {/* Increment */}
        <button
          onClick={handleIncrement}
          disabled={disabled || grossScore >= 15}
          className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center transition-all active:scale-95',
            'bg-[var(--canvas)] border border-[var(--rule)]',
            grossScore >= 15 ? 'opacity-30' : 'opacity-100'
          )}
        >
          <Plus size={16} className="text-[var(--ink-secondary)]" />
        </button>
      </div>

      {/* Stroke Indicator */}
      {hasStroke && (
        <div className="flex items-center justify-center gap-0.5 mt-2">
          {Array.from({ length: strokesOnHole }).map((_, i) => (
            <CircleDot key={i} size={10} className="text-[var(--masters)]" />
          ))}
          <span className="text-[10px] ml-1 text-[var(--ink-tertiary)]">
            {strokesOnHole === 1 ? 'stroke' : 'strokes'}
          </span>
        </div>
      )}
    </div>
  );
}

export function FourballScoreEntry({
  holeNumber,
  par,
  teamAName,
  teamBName,
  teamAColor = '#0047AB',
  teamBColor = '#8B0000',
  teamAPlayers,
  teamBPlayers,
  holeHandicaps,
  initialTeamAScores,
  initialTeamBScores,
  onSubmit,
  isSubmitting = false,
  className = '',
}: FourballScoreEntryProps) {
  const haptic = useHaptic();

  // Initialize player scores
  const [teamAScores, setTeamAScores] = useState<number[]>(() =>
    teamAPlayers.map((p, i) => initialTeamAScores?.[i]?.grossScore ?? par)
  );
  const [teamBScores, setTeamBScores] = useState<number[]>(() =>
    teamBPlayers.map((p, i) => initialTeamBScores?.[i]?.grossScore ?? par)
  );

  // Calculate stroke allocation for each player
  const teamAStrokesPerPlayer = useMemo(
    () => teamAPlayers.map((p) => allocateStrokes(p.courseHandicap, holeHandicaps)),
    [teamAPlayers, holeHandicaps]
  );

  const teamBStrokesPerPlayer = useMemo(
    () => teamBPlayers.map((p) => allocateStrokes(p.courseHandicap, holeHandicaps)),
    [teamBPlayers, holeHandicaps]
  );

  // Get strokes on current hole for each player
  const teamAStrokesOnHole = useMemo(
    () => teamAStrokesPerPlayer.map((strokes) => strokes[holeNumber - 1] || 0),
    [teamAStrokesPerPlayer, holeNumber]
  );

  const teamBStrokesOnHole = useMemo(
    () => teamBStrokesPerPlayer.map((strokes) => strokes[holeNumber - 1] || 0),
    [teamBStrokesPerPlayer, holeNumber]
  );

  // Calculate net scores for each player
  const teamANetScores = useMemo(
    () => teamAScores.map((gross, i) => gross - teamAStrokesOnHole[i]),
    [teamAScores, teamAStrokesOnHole]
  );

  const teamBNetScores = useMemo(
    () => teamBScores.map((gross, i) => gross - teamBStrokesOnHole[i]),
    [teamBScores, teamBStrokesOnHole]
  );

  // Find best ball (lowest net) for each team
  const teamABestIndex = useMemo(() => {
    let bestIdx = 0;
    let bestNet = teamANetScores[0];
    teamANetScores.forEach((net, i) => {
      if (net < bestNet) {
        bestNet = net;
        bestIdx = i;
      }
    });
    return bestIdx;
  }, [teamANetScores]);

  const teamBBestIndex = useMemo(() => {
    let bestIdx = 0;
    let bestNet = teamBNetScores[0];
    teamBNetScores.forEach((net, i) => {
      if (net < bestNet) {
        bestNet = net;
        bestIdx = i;
      }
    });
    return bestIdx;
  }, [teamBNetScores]);

  // Determine winner based on best net scores
  const winner: HoleWinner = useMemo(() => {
    const teamABestNet = teamANetScores[teamABestIndex];
    const teamBBestNet = teamBNetScores[teamBBestIndex];
    if (teamABestNet < teamBBestNet) return 'teamA';
    if (teamBBestNet < teamABestNet) return 'teamB';
    return 'halved';
  }, [teamANetScores, teamBNetScores, teamABestIndex, teamBBestIndex]);

  const hasValidScores = useMemo(() => {
    const isValidScore = (score: number) => Number.isFinite(score) && score >= 1 && score <= 15;
    return [...teamAScores, ...teamBScores].every(isValidScore);
  }, [teamAScores, teamBScores]);

  // Handle submit
  const handleSubmit = useCallback(() => {
    haptic.scorePoint();

    const teamAPlayerScores: PlayerHoleScore[] = teamAPlayers.map((p, i) => ({
      playerId: p.id,
      grossScore: teamAScores[i],
      netScore: teamANetScores[i],
      isBestBall: i === teamABestIndex,
    }));

    const teamBPlayerScores: PlayerHoleScore[] = teamBPlayers.map((p, i) => ({
      playerId: p.id,
      grossScore: teamBScores[i],
      netScore: teamBNetScores[i],
      isBestBall: i === teamBBestIndex,
    }));

    onSubmit(
      winner,
      teamAScores[teamABestIndex],
      teamBScores[teamBBestIndex],
      teamAPlayerScores,
      teamBPlayerScores
    );
  }, [
    haptic,
    onSubmit,
    winner,
    teamAPlayers,
    teamBPlayers,
    teamAScores,
    teamBScores,
    teamANetScores,
    teamBNetScores,
    teamABestIndex,
    teamBBestIndex,
  ]);

  return (
    <div className={cn('space-y-4', className)}>
      {/* Team A Players */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full" style={{ background: teamAColor }} />
          <span
            className="text-sm font-semibold uppercase tracking-wide"
            style={{ color: teamAColor }}
          >
            {teamAName}
          </span>
        </div>
        <div className="space-y-2">
          {teamAPlayers.map((player, idx) => (
            <PlayerScoreInput
              key={player.id}
              player={player}
              grossScore={teamAScores[idx]}
              netScore={teamANetScores[idx]}
              strokesOnHole={teamAStrokesOnHole[idx]}
              par={par}
              teamColor={teamAColor}
              isBestBall={idx === teamABestIndex}
              onIncrement={() => {
                const newScores = [...teamAScores];
                newScores[idx] = Math.min(15, newScores[idx] + 1);
                setTeamAScores(newScores);
              }}
              onDecrement={() => {
                const newScores = [...teamAScores];
                newScores[idx] = Math.max(1, newScores[idx] - 1);
                setTeamAScores(newScores);
              }}
              disabled={isSubmitting}
            />
          ))}
        </div>
      </div>

      {/* Team B Players */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="w-2 h-2 rounded-full" style={{ background: teamBColor }} />
          <span
            className="text-sm font-semibold uppercase tracking-wide"
            style={{ color: teamBColor }}
          >
            {teamBName}
          </span>
        </div>
        <div className="space-y-2">
          {teamBPlayers.map((player, idx) => (
            <PlayerScoreInput
              key={player.id}
              player={player}
              grossScore={teamBScores[idx]}
              netScore={teamBNetScores[idx]}
              strokesOnHole={teamBStrokesOnHole[idx]}
              par={par}
              teamColor={teamBColor}
              isBestBall={idx === teamBBestIndex}
              onIncrement={() => {
                const newScores = [...teamBScores];
                newScores[idx] = Math.min(15, newScores[idx] + 1);
                setTeamBScores(newScores);
              }}
              onDecrement={() => {
                const newScores = [...teamBScores];
                newScores[idx] = Math.max(1, newScores[idx] - 1);
                setTeamBScores(newScores);
              }}
              disabled={isSubmitting}
            />
          ))}
        </div>
      </div>

      {/* Winner Summary */}
      <motion.div
        className="p-4 rounded-xl text-center"
        style={{
          background:
            winner === 'teamA'
              ? `${teamAColor}15`
              : winner === 'teamB'
                ? `${teamBColor}15`
                : 'var(--canvas-sunken)',
          border: `2px solid ${
            winner === 'teamA' ? teamAColor : winner === 'teamB' ? teamBColor : 'var(--rule)'
          }`,
        }}
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 0.3 }}
        key={winner}
      >
        <p className="text-sm font-semibold text-[var(--ink-primary)]">
          {winner === 'teamA'
            ? `${teamAName} wins hole`
            : winner === 'teamB'
              ? `${teamBName} wins hole`
              : 'Hole halved'}
        </p>
        <p className="text-xs mt-1 text-[var(--ink-tertiary)]">
          Best balls: {teamAName} {teamANetScores[teamABestIndex]} net -{' '}
          {teamBNetScores[teamBBestIndex]} net {teamBName}
        </p>
      </motion.div>

      {/* Submit Button */}
      <motion.button
        onClick={handleSubmit}
        disabled={isSubmitting || !hasValidScores}
        whileTap={{ scale: 0.98 }}
        className={cn(
          'w-full py-4 rounded-xl font-semibold text-[var(--canvas)] flex items-center justify-center gap-2 transition-all disabled:cursor-not-allowed',
          isSubmitting || !hasValidScores ? 'opacity-50' : 'opacity-100'
        )}
        style={{
          background:
            winner === 'teamA'
              ? teamAColor
              : winner === 'teamB'
                ? teamBColor
                : 'var(--ink-secondary)',
        }}
        aria-disabled={isSubmitting || !hasValidScores}
      >
        <Check size={20} />
        Record Score
      </motion.button>
      {!hasValidScores && (
        <p className="text-xs text-center text-[var(--ink-tertiary)]">
          Enter a valid score (1–15) for every player to record this hole.
        </p>
      )}
    </div>
  );
}

export default FourballScoreEntry;
