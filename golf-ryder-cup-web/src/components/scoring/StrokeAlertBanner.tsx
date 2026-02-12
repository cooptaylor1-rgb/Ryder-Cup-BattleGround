'use client';

import { useEffect, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CircleDot, Award, X } from 'lucide-react';
import { allocateStrokes, isOneBallFormat } from '@/lib/services/handicapCalculator';

/**
 * STROKE ALERT BANNER
 *
 * Shows a notification when navigating to a hole where one or both
 * teams receive handicap strokes. Essential for match play with handicaps.
 *
 * Features:
 * - Auto-appears when hole changes
 * - Shows which team(s) get strokes
 * - Dismissible with timeout
 * - Haptic feedback option
 * - Format-aware (team strokes vs individual strokes)
 */

export interface StrokeAlertBannerProps {
  currentHole: number;
  teamAStrokes: number;
  teamBStrokes: number;
  holeHandicaps: number[];
  teamAName: string;
  teamBName: string;
  /** Match format - affects stroke display (team vs individual) */
  format?: string;
  /** Auto-dismiss after N milliseconds (0 = manual dismiss only) */
  autoDismissMs?: number;
  /** Callback when alert is shown */
  onAlertShown?: (hole: number, teamAStrokes: number, teamBStrokes: number) => void;
  /** Position of the banner */
  position?: 'top' | 'bottom';
  className?: string;
}

export function StrokeAlertBanner({
  currentHole,
  teamAStrokes,
  teamBStrokes,
  holeHandicaps,
  teamAName,
  teamBName,
  format,
  autoDismissMs = 4000,
  onAlertShown,
  position = 'top',
  className,
}: StrokeAlertBannerProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [lastAlertedHole, setLastAlertedHole] = useState<number | null>(null);

  // Determine if this is a one-ball format (team strokes vs individual)
  const isTeamStrokesFormat = format ? isOneBallFormat(format) : false;

  // Calculate stroke allocations
  const teamAStrokeAllocation = useMemo(() => {
    if (holeHandicaps.length !== 18) return Array(18).fill(0);
    return allocateStrokes(teamAStrokes, holeHandicaps);
  }, [teamAStrokes, holeHandicaps]);

  const teamBStrokeAllocation = useMemo(() => {
    if (holeHandicaps.length !== 18) return Array(18).fill(0);
    return allocateStrokes(teamBStrokes, holeHandicaps);
  }, [teamBStrokes, holeHandicaps]);

  // Get strokes for current hole
  const currentHoleTeamAStrokes = teamAStrokeAllocation[currentHole - 1] || 0;
  const currentHoleTeamBStrokes = teamBStrokeAllocation[currentHole - 1] || 0;
  const hasStrokes = currentHoleTeamAStrokes > 0 || currentHoleTeamBStrokes > 0;

  // Show alert when hole changes and there are strokes
  useEffect(() => {
    if (hasStrokes && currentHole !== lastAlertedHole) {
      setIsVisible(true);
      setIsDismissed(false);
      setLastAlertedHole(currentHole);
      onAlertShown?.(currentHole, currentHoleTeamAStrokes, currentHoleTeamBStrokes);

      // Auto-dismiss
      if (autoDismissMs > 0) {
        const timer = setTimeout(() => {
          setIsVisible(false);
        }, autoDismissMs);
        return () => clearTimeout(timer);
      }
    } else if (!hasStrokes) {
      setIsVisible(false);
    }
  }, [currentHole, hasStrokes, lastAlertedHole, autoDismissMs, currentHoleTeamAStrokes, currentHoleTeamBStrokes, onAlertShown]);

  // Manual dismiss
  const handleDismiss = () => {
    setIsVisible(false);
    setIsDismissed(true);
  };

  // Get hole handicap ranking
  const holeHcpRank = holeHandicaps[currentHole - 1] || 0;

  return (
    <AnimatePresence>
      {isVisible && !isDismissed && (
        <motion.div
          initial={{ opacity: 0, y: position === 'top' ? -20 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: position === 'top' ? -20 : 20 }}
          className={cn(
            'fixed left-4 right-4 z-50',
            position === 'top' ? 'top-20' : 'bottom-24',
            className
          )}
        >
          <div className="rounded-xl shadow-lg overflow-hidden bg-[var(--surface)] border-2 border-[var(--masters)]">
            {/* Header */}
            <div className="px-4 py-2 flex items-center justify-between bg-[var(--masters)] text-white">
              <div className="flex items-center gap-2">
                <Award size={18} />
                <span className="font-medium">Stroke Hole</span>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1 rounded hover:bg-white/20 transition-colors"
                aria-label="Dismiss"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              <div className="flex items-center justify-between">
                {/* Team A Info */}
                <div className="flex items-center gap-3">
                  <StrokeIndicator
                    teamName={teamAName}
                    strokes={currentHoleTeamAStrokes}
                    variant="usa"
                    isLeading={currentHoleTeamAStrokes > currentHoleTeamBStrokes}
                  />
                </div>

                {/* Hole Info */}
                <div className="text-center px-4">
                  <p className="text-2xl font-bold text-[var(--ink)]">#{currentHole}</p>
                  <p className="text-xs text-[var(--ink-tertiary)]">HCP {holeHcpRank}</p>
                </div>

                {/* Team B Info */}
                <div className="flex items-center gap-3">
                  <StrokeIndicator
                    teamName={teamBName}
                    strokes={currentHoleTeamBStrokes}
                    variant="europe"
                    isLeading={currentHoleTeamBStrokes > currentHoleTeamAStrokes}
                    alignRight
                  />
                </div>
              </div>

              {/* Explanation */}
              <div className="mt-3 pt-3 text-center border-t border-[var(--rule)]">
                <p className="text-sm text-[var(--ink-secondary)]">
                  {currentHoleTeamAStrokes > 0 && currentHoleTeamBStrokes > 0 ? (
                    <>Both teams receive {isTeamStrokesFormat ? 'team ' : ''}strokes on this hole</>
                  ) : currentHoleTeamAStrokes > 0 ? (
                    <>
                      <strong className="text-[var(--team-usa)]">{teamAName}</strong> receives {currentHoleTeamAStrokes}{' '}
                      {isTeamStrokesFormat ? 'team ' : ''}stroke{currentHoleTeamAStrokes > 1 ? 's' : ''}
                    </>
                  ) : (
                    <>
                      <strong className="text-[var(--team-europe)]">{teamBName}</strong> receives {currentHoleTeamBStrokes}{' '}
                      {isTeamStrokesFormat ? 'team ' : ''}stroke{currentHoleTeamBStrokes > 1 ? 's' : ''}
                    </>
                  )}
                </p>
                {isTeamStrokesFormat && (
                  <p className="text-xs mt-1 text-[var(--ink-muted)]">One ball in play — stroke applies to the team</p>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ============================================
// STROKE INDICATOR SUB-COMPONENT
// ============================================

type StrokeIndicatorVariant = 'usa' | 'europe';

interface StrokeIndicatorProps {
  teamName: string;
  strokes: number;
  variant: StrokeIndicatorVariant;
  isLeading: boolean;
  alignRight?: boolean;
}

function StrokeIndicator({
  teamName,
  strokes,
  variant,
  isLeading,
  alignRight,
}: StrokeIndicatorProps) {
  const palette =
    variant === 'usa'
      ? {
          text: 'text-[var(--team-usa)]',
          border: 'border-[var(--team-usa)]',
          badgeBg: 'bg-[rgba(179,39,57,0.12)]',
        }
      : {
          text: 'text-[var(--team-europe)]',
          border: 'border-[var(--team-europe)]',
          badgeBg: 'bg-[rgba(0,39,118,0.12)]',
        };

  return (
    <div className={cn('flex items-center gap-2', alignRight && 'flex-row-reverse')}>
      <div className={cn('text-center', alignRight ? 'text-right' : 'text-left')}>
        <p className={cn('text-sm font-medium', palette.text)}>{teamName}</p>

        {strokes > 0 ? (
          <div className={cn('flex items-center gap-1 mt-1', alignRight && 'justify-end')}>
            {Array.from({ length: Math.min(strokes, 3) }, (_, i) => (
              <CircleDot key={i} size={14} className={palette.text} fill="currentColor" />
            ))}
            {strokes > 3 && (
              <span className={cn('text-xs font-bold ml-0.5', palette.text)}>+{strokes - 3}</span>
            )}
          </div>
        ) : (
          <p className="text-xs mt-1 text-[var(--ink-tertiary)]">No strokes</p>
        )}
      </div>

      {/* Visual indicator for receiving strokes */}
      {strokes > 0 && isLeading && (
        <div
          className={cn(
            'w-8 h-8 rounded-full flex items-center justify-center border-2',
            palette.badgeBg,
            palette.border
          )}
        >
          <span className={cn('text-sm font-bold', palette.text)}>+{strokes}</span>
        </div>
      )}
    </div>
  );
}

// ============================================
// COMPACT STROKE BADGE (for inline use)
// ============================================

export interface CompactStrokeBadgeProps {
  strokes: number;
  teamColor?: string;
  size?: 'sm' | 'md';
  showLabel?: boolean;
  className?: string;
}

export function CompactStrokeBadge({
  strokes,
  teamColor,
  size = 'md',
  showLabel = false,
  className,
}: CompactStrokeBadgeProps) {
  if (strokes === 0) return null;

  const color = teamColor || 'var(--masters)';
  const sizeConfig = {
    sm: { badge: 'w-4 h-4 text-[9px]', dot: 8 },
    md: { badge: 'w-5 h-5 text-[10px]', dot: 10 },
  };
  const config = sizeConfig[size];

  return (
    <span className={cn('inline-flex items-center gap-1', className)}>
      <span
        className={cn(
          config.badge,
          'rounded-full flex items-center justify-center font-bold'
        )}
        style={{
          background: `${color}20`,
          color,
          border: `1px solid ${color}40`,
        }}
      >
        {strokes > 1 ? strokes : '●'}
      </span>
      {showLabel && (
        <span className="text-xs" style={{ color }}>
          stroke{strokes > 1 ? 's' : ''}
        </span>
      )}
    </span>
  );
}

// ============================================
// STROKE HOLES MINI MAP
// ============================================

export interface StrokeHolesMiniMapProps {
  currentHole: number;
  teamAStrokes: number;
  teamBStrokes: number;
  holeHandicaps: number[];
  teamAName: string;
  teamBName: string;
  onHoleClick?: (hole: number) => void;
  className?: string;
}

export function StrokeHolesMiniMap({
  currentHole,
  teamAStrokes,
  teamBStrokes,
  holeHandicaps,
  teamAName,
  teamBName,
  onHoleClick,
  className,
}: StrokeHolesMiniMapProps) {
  // Calculate stroke allocations
  const teamAAllocation = useMemo(() => {
    if (holeHandicaps.length !== 18) return Array(18).fill(0);
    return allocateStrokes(teamAStrokes, holeHandicaps);
  }, [teamAStrokes, holeHandicaps]);

  const teamBAllocation = useMemo(() => {
    if (holeHandicaps.length !== 18) return Array(18).fill(0);
    return allocateStrokes(teamBStrokes, holeHandicaps);
  }, [teamBStrokes, holeHandicaps]);

  return (
    <div className={cn('', className)}>
      <p className="text-xs font-medium uppercase tracking-wider mb-2 text-[var(--ink-tertiary)]">Stroke Holes</p>
      <div className="flex gap-1 flex-wrap">
        {Array.from({ length: 18 }, (_, i) => i + 1).map(hole => {
          const aStrokes = teamAAllocation[hole - 1];
          const bStrokes = teamBAllocation[hole - 1];
          const hasStrokes = aStrokes > 0 || bStrokes > 0;
          const isCurrent = hole === currentHole;

          let bgColor = 'var(--canvas-sunken)';
          let textColor = 'var(--ink-tertiary)';

          if (aStrokes > 0 && bStrokes > 0) {
            // Both teams get strokes
            bgColor = 'linear-gradient(135deg, rgba(179, 39, 57, 0.2) 50%, rgba(0, 39, 118, 0.2) 50%)';
          } else if (aStrokes > 0) {
            bgColor = 'rgba(179, 39, 57, 0.15)';
            textColor = 'var(--team-usa)';
          } else if (bStrokes > 0) {
            bgColor = 'rgba(0, 39, 118, 0.15)';
            textColor = 'var(--team-europe)';
          }

          return (
            <button
              key={hole}
              onClick={() => onHoleClick?.(hole)}
              className={cn(
                'w-8 h-8 rounded flex flex-col items-center justify-center text-[10px] transition-all',
                isCurrent && 'ring-2 ring-masters ring-offset-1'
              )}
              style={{
                background: bgColor,
                color: textColor,
              }}
            >
              <span className="font-medium">{hole}</span>
              {hasStrokes && (
                <span className="text-[8px]">
                  {aStrokes > 0 && bStrokes > 0
                    ? `${aStrokes}/${bStrokes}`
                    : aStrokes > 0
                      ? `+${aStrokes}`
                      : `+${bStrokes}`}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-xs text-[var(--ink-tertiary)]">
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-[rgba(179,39,57,0.15)]" />
          <span>{teamAName}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-[rgba(0,39,118,0.15)]" />
          <span>{teamBName}</span>
        </div>
      </div>
    </div>
  );
}

export default StrokeAlertBanner;
