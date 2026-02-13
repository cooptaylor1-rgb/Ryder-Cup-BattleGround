/**
 * HoleScoreDisplay — Gross/Net Score Display for Current Hole
 *
 * Shows both gross and net scores when handicap strokes apply.
 * Essential for understanding how strokes affect the hole result.
 *
 * Features:
 * - Clear gross score (actual strokes taken)
 * - Net score with stroke deduction visualization
 * - Stroke dot indicators for visual handicap representation
 * - Color coding for under/over par
 * - Team comparison view
 */

'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { CircleDot, Minus, ArrowDown } from 'lucide-react';
import { getMatchPlayStrokesOnHole } from '@/lib/services/handicapCalculator';

interface TeamScoreProps {
  teamName: string;
  teamColor: string;
  grossScore: number | null;
  netScore: number | null;
  par: number;
  strokesOnHole: number;
  isWinner?: boolean;
}

interface HoleScoreDisplayProps {
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
  /** Team A gross score (null if not entered) */
  teamAGrossScore: number | null;
  /** Team B gross score (null if not entered) */
  teamBGrossScore: number | null;
  /** Team A total handicap strokes for the round */
  teamAHandicapStrokes: number;
  /** Team B total handicap strokes for the round */
  teamBHandicapStrokes: number;
  /** Array of 18 hole handicap rankings */
  holeHandicaps: number[];
  /** Whether to show detailed stroke calculation */
  showStrokeDetails?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get color class based on score relative to par
 */
function getScoreColor(score: number | null, par: number): string {
  if (score === null) return 'var(--ink-tertiary)';
  const diff = score - par;
  if (diff <= -2) return 'var(--eagle-text, #ca8a04)'; // Eagle or better
  if (diff === -1) return 'var(--birdie-text, #dc2626)'; // Birdie
  if (diff === 0) return 'var(--ink)'; // Par
  if (diff === 1) return 'var(--bogey-text, #3b82f6)'; // Bogey
  return 'var(--double-text, #2563eb)'; // Double or worse
}

/**
 * Get score label (Eagle, Birdie, Par, etc.)
 */
function getScoreLabel(score: number | null, par: number): string {
  if (score === null) return '';
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

/**
 * Individual team score card
 */
function TeamScoreCard({
  teamName,
  teamColor,
  grossScore,
  netScore,
  par,
  strokesOnHole,
  isWinner = false,
}: TeamScoreProps) {
  const hasStroke = strokesOnHole > 0;
  const showNet = grossScore !== null && hasStroke;
  const grossColor = getScoreColor(grossScore, par);
  const netColor = netScore !== null ? getScoreColor(netScore, par) : grossColor;
  const scoreLabel = getScoreLabel(netScore ?? grossScore, par);

  return (
    <div
      className={cn('flex-1 rounded-2xl p-4 transition-all', isWinner && 'ring-2')}
      style={
        {
          background: `${teamColor}10`,
          borderColor: isWinner ? teamColor : 'transparent',
          '--tw-ring-color': isWinner ? teamColor : undefined,
        } as React.CSSProperties
      }
    >
      {/* Team Name */}
      <div className="text-center mb-2">
        <span
          className="text-sm font-semibold uppercase tracking-wide"
          style={{ color: teamColor }}
        >
          {teamName}
        </span>
      </div>

      {/* Score Display */}
      <div className="flex flex-col items-center">
        {grossScore !== null ? (
          <>
            {/* Gross Score */}
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold" style={{ color: grossColor }}>
                {grossScore}
              </span>
              <span className="text-xs uppercase" style={{ color: 'var(--ink-tertiary)' }}>
                gross
              </span>
            </div>

            {/* Net Score (if strokes apply) */}
            {showNet && netScore !== null && (
              <div className="flex items-center gap-1 mt-1">
                <ArrowDown size={12} style={{ color: 'var(--ink-tertiary)' }} />
                <span className="text-xl font-bold" style={{ color: netColor }}>
                  {netScore}
                </span>
                <span className="text-xs uppercase" style={{ color: 'var(--ink-tertiary)' }}>
                  net
                </span>
              </div>
            )}

            {/* Stroke Dots */}
            {hasStroke && (
              <div className="flex items-center gap-0.5 mt-2">
                {Array.from({ length: strokesOnHole }).map((_, i) => (
                  <CircleDot key={i} size={12} style={{ color: teamColor }} />
                ))}
                <span className="text-xs ml-1" style={{ color: 'var(--ink-tertiary)' }}>
                  {strokesOnHole === 1 ? 'stroke' : 'strokes'}
                </span>
              </div>
            )}

            {/* Score Label */}
            {scoreLabel && (
              <span className="text-xs mt-1" style={{ color: netColor }}>
                {showNet ? `Net ${scoreLabel}` : scoreLabel}
              </span>
            )}
          </>
        ) : (
          <div className="flex items-center justify-center h-20">
            <Minus size={24} style={{ color: 'var(--ink-tertiary)' }} />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Main component showing both teams' scores for a hole
 */
export function HoleScoreDisplay({
  holeNumber,
  par,
  teamAName,
  teamBName,
  teamAColor = '#0047AB',
  teamBColor = '#8B0000',
  teamAGrossScore,
  teamBGrossScore,
  teamAHandicapStrokes,
  teamBHandicapStrokes,
  holeHandicaps,
  showStrokeDetails = false,
  className = '',
}: HoleScoreDisplayProps) {
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
  const teamANetScore = teamAGrossScore !== null ? teamAGrossScore - teamAStrokesOnHole : null;

  const teamBNetScore = teamBGrossScore !== null ? teamBGrossScore - teamBStrokesOnHole : null;

  // Determine winner based on net scores
  const getWinner = (): 'teamA' | 'teamB' | 'halved' | null => {
    if (teamANetScore === null || teamBNetScore === null) return null;
    if (teamANetScore < teamBNetScore) return 'teamA';
    if (teamBNetScore < teamANetScore) return 'teamB';
    return 'halved';
  };

  const winner = getWinner();

  return (
    <div className={cn('', className)}>
      {/* Hole Info Header */}
      <div className="flex items-center justify-center gap-2 mb-3">
        <span className="text-xs uppercase tracking-wide" style={{ color: 'var(--ink-tertiary)' }}>
          Hole {holeNumber}
        </span>
        <span className="w-px h-3 bg-[var(--rule)]" />
        <span className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
          Par {par}
        </span>
        {(teamAStrokesOnHole > 0 || teamBStrokesOnHole > 0) && (
          <>
            <span className="w-px h-3 bg-[var(--rule)]" />
            <span className="text-xs" style={{ color: 'var(--masters)' }}>
              Stroke Hole
            </span>
          </>
        )}
      </div>

      {/* Team Score Cards */}
      <div className="flex gap-3">
        <TeamScoreCard
          teamName={teamAName}
          teamColor={teamAColor}
          grossScore={teamAGrossScore}
          netScore={teamANetScore}
          par={par}
          strokesOnHole={teamAStrokesOnHole}
          isWinner={winner === 'teamA'}
        />
        <TeamScoreCard
          teamName={teamBName}
          teamColor={teamBColor}
          grossScore={teamBGrossScore}
          netScore={teamBNetScore}
          par={par}
          strokesOnHole={teamBStrokesOnHole}
          isWinner={winner === 'teamB'}
        />
      </div>

      {/* Result Summary */}
      {winner && (
        <div className="mt-3 text-center">
          <span
            className="text-sm font-medium"
            style={{
              color:
                winner === 'teamA'
                  ? teamAColor
                  : winner === 'teamB'
                    ? teamBColor
                    : 'var(--ink-tertiary)',
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
      )}

      {/* Stroke Details (optional expanded view) */}
      {showStrokeDetails && (teamAStrokesOnHole > 0 || teamBStrokesOnHole > 0) && (
        <div className="mt-3 p-3 rounded-xl text-xs bg-[var(--canvas-sunken)]">
          <p className="text-center text-[var(--ink-secondary)]">
            {teamAStrokesOnHole > 0 && teamBStrokesOnHole > 0 ? (
              <>
                Both teams receive strokes: {teamAName} gets {teamAStrokesOnHole}, {teamBName} gets{' '}
                {teamBStrokesOnHole}
              </>
            ) : teamAStrokesOnHole > 0 ? (
              <>
                {teamAName} receives {teamAStrokesOnHole} stroke{teamAStrokesOnHole > 1 ? 's' : ''}{' '}
                on this hole
              </>
            ) : (
              <>
                {teamBName} receives {teamBStrokesOnHole} stroke{teamBStrokesOnHole > 1 ? 's' : ''}{' '}
                on this hole
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Compact inline display of gross/net for a single score
 */
export function InlineGrossNetScore({
  grossScore,
  strokesOnHole,
  par,
  showLabel = true,
  className = '',
}: {
  grossScore: number | null;
  strokesOnHole: number;
  par: number;
  showLabel?: boolean;
  className?: string;
}) {
  if (grossScore === null) return <span className={className}>-</span>;

  const netScore = grossScore - strokesOnHole;
  const hasStroke = strokesOnHole > 0;
  const grossColor = getScoreColor(grossScore, par);
  const netColor = getScoreColor(netScore, par);

  return (
    <span className={cn('inline-flex items-baseline gap-1', className)}>
      <span className="font-bold" style={{ color: grossColor }}>
        {grossScore}
      </span>
      {hasStroke && (
        <>
          <span className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
            /
          </span>
          <span className="font-medium" style={{ color: netColor }}>
            {netScore}
          </span>
          {showLabel && (
            <span className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
              net
            </span>
          )}
          <span className="flex items-center">
            {Array.from({ length: strokesOnHole }).map((_, i) => (
              <CircleDot key={i} size={8} style={{ color: 'var(--masters)' }} />
            ))}
          </span>
        </>
      )}
    </span>
  );
}

export default HoleScoreDisplay;
