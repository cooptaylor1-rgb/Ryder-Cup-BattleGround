'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { CircleDot, Info } from 'lucide-react';
import { allocateStrokes, isOneBallFormat } from '@/lib/services/handicapCalculator';

/**
 * HANDICAP STROKE INDICATOR
 *
 * Shows which team receives strokes on the current hole.
 * Essential for match play with handicaps.
 *
 * Visual Design:
 * - Dot indicators for strokes (filled = stroke given)
 * - Clear team color coding
 * - Compact display for outdoor use
 *
 * Format Awareness:
 * - For one-ball formats (scramble, foursomes, etc.): Shows TEAM strokes
 * - For individual formats (fourball): Shows individual player strokes
 */

export interface HandicapStrokeIndicatorProps {
  currentHole: number;
  teamAStrokes: number; // Total strokes Team A receives
  teamBStrokes: number; // Total strokes Team B receives
  holeHandicaps: number[]; // 18-element array of hole handicap rankings
  teamAName: string;
  teamBName: string;
  /** Match format - determines if strokes are team or individual */
  format?: string;
  showAllHoles?: boolean;
  className?: string;
}

export function HandicapStrokeIndicator({
  currentHole,
  teamAStrokes,
  teamBStrokes,
  holeHandicaps,
  teamAName,
  teamBName,
  format,
  showAllHoles = false,
  className,
}: HandicapStrokeIndicatorProps) {
  // Determine if this is a one-ball format (team strokes vs individual)
  const isTeamStrokesFormat = format ? isOneBallFormat(format) : false;

  // Calculate stroke allocation for each team
  const teamAStrokeAllocation = useMemo(() => {
    if (holeHandicaps.length !== 18) return Array(18).fill(0);
    return allocateStrokes(teamAStrokes, holeHandicaps);
  }, [teamAStrokes, holeHandicaps]);

  const teamBStrokeAllocation = useMemo(() => {
    if (holeHandicaps.length !== 18) return Array(18).fill(0);
    return allocateStrokes(teamBStrokes, holeHandicaps);
  }, [teamBStrokes, holeHandicaps]);

  // Get strokes for current hole
  const teamAStrokesOnHole = teamAStrokeAllocation[currentHole - 1] || 0;
  const teamBStrokesOnHole = teamBStrokeAllocation[currentHole - 1] || 0;

  // No strokes to show
  if (teamAStrokes === 0 && teamBStrokes === 0) {
    return null;
  }

  // Get hole handicap ranking
  const holeHandicapRank = holeHandicaps[currentHole - 1] || 0;

  return (
    <div className={cn('', className)}>
      {/* Current Hole Strokes */}
      <div
        className="flex items-center justify-between p-3 rounded-xl"
        style={{
          background: (teamAStrokesOnHole > 0 || teamBStrokesOnHole > 0)
            ? 'linear-gradient(90deg, rgba(179, 39, 57, 0.05) 0%, rgba(0, 39, 118, 0.05) 100%)'
            : 'var(--canvas-sunken)',
          border: '1px solid var(--rule)',
        }}
      >
        {/* Team A Strokes */}
        <div className="flex items-center gap-2">
          <span
            className="text-xs font-medium"
            style={{ color: 'var(--team-usa)', minWidth: '50px' }}
          >
            {teamAName}
          </span>
          <StrokeDots strokes={teamAStrokesOnHole} color="var(--team-usa)" />
        </div>

        {/* Hole Info */}
        <div className="text-center px-3">
          <span className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
            Hole {currentHole}
          </span>
          <span
            className="block text-[10px]"
            style={{ color: 'var(--ink-tertiary)', opacity: 0.7 }}
          >
            HCP {holeHandicapRank}
          </span>
        </div>

        {/* Team B Strokes */}
        <div className="flex items-center gap-2 justify-end">
          <StrokeDots strokes={teamBStrokesOnHole} color="var(--team-europe)" />
          <span
            className="text-xs font-medium text-right"
            style={{ color: 'var(--team-europe)', minWidth: '50px' }}
          >
            {teamBName}
          </span>
        </div>
      </div>

      {/* Stroke Summary */}
      {(teamAStrokes > 0 || teamBStrokes > 0) && (
        <div
          className="flex items-center justify-between mt-2 px-2 text-xs"
          style={{ color: 'var(--ink-tertiary)' }}
        >
          <span>
            {teamAStrokes > 0 ? `${teamAName}: ${teamAStrokes} ${isTeamStrokesFormat ? 'team ' : ''}stroke${teamAStrokes !== 1 ? 's' : ''}` : ''}
          </span>
          <span>
            {teamBStrokes > 0 ? `${teamBName}: ${teamBStrokes} ${isTeamStrokesFormat ? 'team ' : ''}stroke${teamBStrokes !== 1 ? 's' : ''}` : ''}
          </span>
        </div>
      )}

      {/* Format hint for one-ball formats */}
      {isTeamStrokesFormat && (teamAStrokes > 0 || teamBStrokes > 0) && (
        <div
          className="flex items-center gap-1 mt-1 px-2"
          style={{ color: 'var(--ink-muted)' }}
        >
          <Info size={10} />
          <span className="text-[10px]">One ball in play — strokes apply to team</span>
        </div>
      )}

      {/* All Holes View */}
      {showAllHoles && (
        <div className="mt-4 space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--ink-tertiary)' }}>
            Stroke Holes
          </p>
          <div className="flex flex-wrap gap-1">
            {Array.from({ length: 18 }, (_, i) => i + 1).map(hole => {
              const aStrokes = teamAStrokeAllocation[hole - 1];
              const bStrokes = teamBStrokeAllocation[hole - 1];
              const hasStrokes = aStrokes > 0 || bStrokes > 0;
              const isCurrent = hole === currentHole;

              return (
                <div
                  key={hole}
                  className={cn(
                    'w-8 h-8 rounded flex flex-col items-center justify-center text-[10px]',
                    isCurrent && 'ring-2 ring-masters ring-offset-1'
                  )}
                  style={{
                    background: hasStrokes
                      ? aStrokes > 0
                        ? 'rgba(179, 39, 57, 0.15)'
                        : 'rgba(0, 39, 118, 0.15)'
                      : 'var(--canvas-sunken)',
                    color: hasStrokes
                      ? aStrokes > 0
                        ? 'var(--team-usa)'
                        : 'var(--team-europe)'
                      : 'var(--ink-tertiary)',
                  }}
                >
                  <span className="font-medium">{hole}</span>
                  {hasStrokes && (
                    <span className="text-[8px]">
                      {aStrokes > 0 ? `+${aStrokes}` : bStrokes > 0 ? `+${bStrokes}` : ''}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// STROKE DOTS COMPONENT
// ============================================

interface StrokeDotsProps {
  strokes: number;
  color: string;
}

function StrokeDots({ strokes, color }: StrokeDotsProps) {
  if (strokes === 0) {
    return (
      <span className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
        —
      </span>
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: Math.min(strokes, 3) }, (_, i) => (
        <CircleDot
          key={i}
          size={12}
          style={{ color }}
          fill={color}
        />
      ))}
      {strokes > 3 && (
        <span className="text-xs font-medium ml-0.5" style={{ color }}>
          +{strokes - 3}
        </span>
      )}
    </div>
  );
}

// ============================================
// COMPACT STROKE BADGE
// ============================================

interface StrokeBadgeProps {
  strokes: number;
  team: 'A' | 'B';
  size?: 'sm' | 'md';
}

export function StrokeBadge({ strokes, team, size = 'md' }: StrokeBadgeProps) {
  if (strokes === 0) return null;

  const color = team === 'A' ? 'var(--team-usa)' : 'var(--team-europe)';

  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-full font-bold',
        size === 'sm' ? 'w-4 h-4 text-[8px]' : 'w-5 h-5 text-[10px]'
      )}
      style={{
        background: `${color}20`,
        color,
        border: `1px solid ${color}40`,
      }}
    >
      {strokes > 1 ? strokes : '●'}
    </span>
  );
}

export default HandicapStrokeIndicator;
