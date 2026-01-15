'use client';

import { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { CircleDot, Circle, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type { HoleScoreData, ScoringMode } from '@/lib/types/scoringFormats';
import { getScoreClass } from '@/lib/types/scoringFormats';

/**
 * GROSS/NET SCORE DISPLAY
 *
 * Shows both gross and net scores with clear visual differentiation.
 * Used in scorecards and scoring pages.
 *
 * Features:
 * - Clear gross score (actual strokes)
 * - Net score with stroke indication
 * - Color coding for under/over par
 * - Stroke dots showing handicap adjustments
 */

export interface GrossNetScoreDisplayProps {
  grossScore: number | null;
  netScore: number | null;
  par: number;
  strokesReceived: number;
  size?: 'sm' | 'md' | 'lg';
  mode?: 'compact' | 'detailed' | 'inline';
  showStrokeDots?: boolean;
  highlightNet?: boolean;
  className?: string;
}

export function GrossNetScoreDisplay({
  grossScore,
  netScore,
  par,
  strokesReceived,
  size = 'md',
  mode = 'detailed',
  showStrokeDots = true,
  highlightNet = false,
  className,
}: GrossNetScoreDisplayProps) {
  // Determine score styling
  const scoreClass = useMemo(() => {
    return getScoreClass(highlightNet ? netScore : grossScore, par);
  }, [grossScore, netScore, par, highlightNet]);

  // Get colors based on score class
  const getScoreColors = (cls: typeof scoreClass) => {
    switch (cls) {
      case 'albatross':
        return {
          bg: 'var(--eagle-bg, rgba(234, 179, 8, 0.2))',
          text: 'var(--eagle-text, #ca8a04)',
          border: 'var(--eagle-border, rgba(234, 179, 8, 0.5))',
        };
      case 'eagle':
        return {
          bg: 'var(--eagle-bg, rgba(234, 179, 8, 0.15))',
          text: 'var(--eagle-text, #ca8a04)',
          border: 'var(--eagle-border, rgba(234, 179, 8, 0.4))',
        };
      case 'birdie':
        return {
          bg: 'var(--birdie-bg, rgba(220, 38, 38, 0.1))',
          text: 'var(--birdie-text, #dc2626)',
          border: 'var(--birdie-border, rgba(220, 38, 38, 0.3))',
        };
      case 'par':
        return {
          bg: 'var(--surface)',
          text: 'var(--ink)',
          border: 'var(--rule)',
        };
      case 'bogey':
        return {
          bg: 'var(--bogey-bg, rgba(59, 130, 246, 0.1))',
          text: 'var(--bogey-text, #3b82f6)',
          border: 'var(--bogey-border, rgba(59, 130, 246, 0.3))',
        };
      case 'double':
        return {
          bg: 'var(--double-bg, rgba(59, 130, 246, 0.15))',
          text: 'var(--double-text, #2563eb)',
          border: 'var(--double-border, rgba(59, 130, 246, 0.4))',
        };
      case 'triple':
      case 'worse':
        return {
          bg: 'var(--worse-bg, rgba(59, 130, 246, 0.2))',
          text: 'var(--worse-text, #1d4ed8)',
          border: 'var(--worse-border, rgba(59, 130, 246, 0.5))',
        };
      default:
        return {
          bg: 'var(--canvas-sunken)',
          text: 'var(--ink-tertiary)',
          border: 'var(--rule)',
        };
    }
  };

  const colors = getScoreColors(scoreClass);

  // Size configurations
  const sizeConfig = {
    sm: {
      container: 'w-10 h-10',
      gross: 'text-sm font-semibold',
      net: 'text-[9px]',
      strokeDot: 8,
    },
    md: {
      container: 'w-14 h-14',
      gross: 'text-lg font-bold',
      net: 'text-xs',
      strokeDot: 10,
    },
    lg: {
      container: 'w-20 h-20',
      gross: 'text-2xl font-bold',
      net: 'text-sm font-medium',
      strokeDot: 12,
    },
  };

  const config = sizeConfig[size];

  // No score yet
  if (grossScore === null) {
    return (
      <div
        className={cn(
          config.container,
          'rounded-lg flex items-center justify-center',
          className
        )}
        style={{
          background: 'var(--canvas-sunken)',
          border: '1px solid var(--rule)',
        }}
      >
        <Minus size={16} style={{ color: 'var(--ink-tertiary)' }} />
      </div>
    );
  }

  // Compact mode - just the gross score with color
  if (mode === 'compact') {
    return (
      <div
        className={cn(
          config.container,
          'rounded-lg flex items-center justify-center relative',
          className
        )}
        style={{
          background: colors.bg,
          border: `1px solid ${colors.border}`,
        }}
      >
        <span className={config.gross} style={{ color: colors.text }}>
          {grossScore}
        </span>
        {strokesReceived > 0 && showStrokeDots && (
          <div className="absolute -top-1 -right-1">
            <StrokeDotIndicator strokes={strokesReceived} size={config.strokeDot} />
          </div>
        )}
      </div>
    );
  }

  // Inline mode - horizontal gross (net)
  if (mode === 'inline') {
    const showNet = netScore !== null && netScore !== grossScore;
    return (
      <span className={cn('inline-flex items-baseline gap-1', className)}>
        <span className={config.gross} style={{ color: colors.text }}>
          {grossScore}
        </span>
        {showNet && (
          <span className={config.net} style={{ color: 'var(--ink-tertiary)' }}>
            ({netScore})
          </span>
        )}
        {strokesReceived > 0 && showStrokeDots && (
          <StrokeDotIndicator strokes={strokesReceived} size={config.strokeDot} inline />
        )}
      </span>
    );
  }

  // Detailed mode - full display with gross and net
  return (
    <div
      className={cn(
        config.container,
        'rounded-lg flex flex-col items-center justify-center relative',
        className
      )}
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
      }}
    >
      {/* Gross Score */}
      <span className={config.gross} style={{ color: colors.text }}>
        {grossScore}
      </span>

      {/* Net Score (if different) */}
      {netScore !== null && netScore !== grossScore && (
        <span
          className={cn(config.net, 'leading-none')}
          style={{ color: highlightNet ? colors.text : 'var(--ink-tertiary)' }}
        >
          net {netScore}
        </span>
      )}

      {/* Stroke Indicator */}
      {strokesReceived > 0 && showStrokeDots && (
        <div className="absolute -top-1 -right-1">
          <StrokeDotIndicator strokes={strokesReceived} size={config.strokeDot} />
        </div>
      )}
    </div>
  );
}

// ============================================
// STROKE DOT INDICATOR
// ============================================

interface StrokeDotIndicatorProps {
  strokes: number;
  size?: number;
  inline?: boolean;
}

function StrokeDotIndicator({ strokes, size = 10, inline = false }: StrokeDotIndicatorProps) {
  if (strokes === 0) return null;

  const dotColor = 'var(--masters)';

  if (inline) {
    return (
      <span className="inline-flex items-center gap-0.5 ml-1">
        {Array.from({ length: Math.min(strokes, 2) }, (_, i) => (
          <CircleDot
            key={i}
            size={size}
            style={{ color: dotColor }}
            fill={dotColor}
          />
        ))}
        {strokes > 2 && (
          <span className="text-[10px] font-medium" style={{ color: dotColor }}>
            +{strokes - 2}
          </span>
        )}
      </span>
    );
  }

  return (
    <div
      className="flex items-center justify-center rounded-full"
      style={{
        width: size * 1.5,
        height: size * 1.5,
        background: dotColor,
        color: 'white',
        fontSize: size * 0.7,
        fontWeight: 700,
      }}
    >
      {strokes > 1 ? strokes : '●'}
    </div>
  );
}

// ============================================
// SCORECARD ROW COMPONENT
// ============================================

export interface ScorecardRowProps {
  playerName: string;
  holes: {
    holeNumber: number;
    par: number;
    gross: number | null;
    net: number | null;
    strokes: number;
  }[];
  scoringMode: ScoringMode;
  showNet?: boolean;
  compact?: boolean;
  className?: string;
}

export function ScorecardRow({
  playerName,
  holes,
  scoringMode,
  showNet = true,
  compact = false,
  className,
}: ScorecardRowProps) {
  // Calculate totals
  const totals = useMemo(() => {
    const out = holes.slice(0, 9);
    const inn = holes.slice(9, 18);

    const sumGross = (h: typeof holes) =>
      h.reduce((sum, hole) => sum + (hole.gross ?? 0), 0);
    const sumNet = (h: typeof holes) =>
      h.reduce((sum, hole) => sum + (hole.net ?? 0), 0);
    const sumPar = (h: typeof holes) =>
      h.reduce((sum, hole) => sum + hole.par, 0);

    return {
      outGross: sumGross(out),
      outNet: sumNet(out),
      outPar: sumPar(out),
      inGross: sumGross(inn),
      inNet: sumNet(inn),
      inPar: sumPar(inn),
      totalGross: sumGross(holes),
      totalNet: sumNet(holes),
      totalPar: sumPar(holes),
    };
  }, [holes]);

  const displayScore = scoringMode === 'net' ? totals.totalNet : totals.totalGross;
  const relativeToPar = displayScore - totals.totalPar;

  return (
    <div className={cn('', className)}>
      {/* Player Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--rule)',
        }}
      >
        <span className="font-medium" style={{ color: 'var(--ink)' }}>
          {playerName}
        </span>
        <div className="flex items-center gap-3">
          {/* Relative to par */}
          <span
            className="text-sm font-medium"
            style={{
              color: relativeToPar < 0 ? 'var(--birdie-text, #dc2626)' :
                relativeToPar > 0 ? 'var(--bogey-text, #3b82f6)' : 'var(--ink)',
            }}
          >
            {relativeToPar === 0 ? 'E' : relativeToPar > 0 ? `+${relativeToPar}` : relativeToPar}
          </span>
          {/* Total */}
          <span className="font-bold" style={{ color: 'var(--ink)' }}>
            {scoringMode === 'net' && showNet
              ? `${totals.totalGross} (${totals.totalNet})`
              : totals.totalGross}
          </span>
        </div>
      </div>

      {/* Hole Scores */}
      <div className="flex overflow-x-auto">
        {/* Front 9 */}
        <div className="flex">
          {holes.slice(0, 9).map(hole => (
            <GrossNetScoreDisplay
              key={hole.holeNumber}
              grossScore={hole.gross}
              netScore={hole.net}
              par={hole.par}
              strokesReceived={hole.strokes}
              size={compact ? 'sm' : 'md'}
              mode={showNet ? 'detailed' : 'compact'}
              highlightNet={scoringMode === 'net'}
            />
          ))}
          {/* Out Total */}
          <div
            className={cn(
              compact ? 'w-10 h-10' : 'w-14 h-14',
              'flex flex-col items-center justify-center'
            )}
            style={{
              background: 'var(--canvas-sunken)',
              borderLeft: '2px solid var(--rule-strong)',
            }}
          >
            <span className="text-xs font-medium" style={{ color: 'var(--ink-tertiary)' }}>
              OUT
            </span>
            <span className="font-bold" style={{ color: 'var(--ink)' }}>
              {showNet ? `${totals.outGross}/${totals.outNet}` : totals.outGross}
            </span>
          </div>
        </div>

        {/* Back 9 */}
        <div className="flex">
          {holes.slice(9, 18).map(hole => (
            <GrossNetScoreDisplay
              key={hole.holeNumber}
              grossScore={hole.gross}
              netScore={hole.net}
              par={hole.par}
              strokesReceived={hole.strokes}
              size={compact ? 'sm' : 'md'}
              mode={showNet ? 'detailed' : 'compact'}
              highlightNet={scoringMode === 'net'}
            />
          ))}
          {/* In Total */}
          <div
            className={cn(
              compact ? 'w-10 h-10' : 'w-14 h-14',
              'flex flex-col items-center justify-center'
            )}
            style={{
              background: 'var(--canvas-sunken)',
              borderLeft: '2px solid var(--rule-strong)',
            }}
          >
            <span className="text-xs font-medium" style={{ color: 'var(--ink-tertiary)' }}>
              IN
            </span>
            <span className="font-bold" style={{ color: 'var(--ink)' }}>
              {showNet ? `${totals.inGross}/${totals.inNet}` : totals.inGross}
            </span>
          </div>
        </div>

        {/* Grand Total */}
        <div
          className={cn(
            compact ? 'w-12 h-10' : 'w-16 h-14',
            'flex flex-col items-center justify-center'
          )}
          style={{
            background: 'var(--masters)',
            color: 'white',
          }}
        >
          <span className="text-xs font-medium opacity-80">TOT</span>
          <span className="font-bold">
            {showNet ? `${totals.totalGross}/${totals.totalNet}` : totals.totalGross}
          </span>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SCORE LEGEND
// ============================================

export function ScoreLegend({ className }: { className?: string }) {
  const items = [
    { label: 'Eagle-', class: 'eagle', symbol: '🦅' },
    { label: 'Birdie', class: 'birdie', symbol: '🐦' },
    { label: 'Par', class: 'par', symbol: '○' },
    { label: 'Bogey', class: 'bogey', symbol: '■' },
    { label: 'Double+', class: 'double', symbol: '■■' },
    { label: 'Stroke', class: null, symbol: '●' },
  ];

  return (
    <div className={cn('flex items-center gap-4 flex-wrap', className)}>
      {items.map(item => (
        <div key={item.label} className="flex items-center gap-1.5">
          <span
            className="w-6 h-6 rounded flex items-center justify-center text-xs"
            style={{
              background: item.class
                ? `var(--${item.class}-bg, var(--canvas-sunken))`
                : 'var(--masters)',
              color: item.class
                ? `var(--${item.class}-text, var(--ink))`
                : 'white',
              border: item.class
                ? `1px solid var(--${item.class}-border, var(--rule))`
                : 'none',
            }}
          >
            {item.symbol}
          </span>
          <span className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export default GrossNetScoreDisplay;
