/**
 * Hole Indicator Component
 *
 * Premium visual indicator showing hole result (won, lost, halved).
 * Used in scorecard and match overview.
 *
 * Features:
 * - Premium gradient backgrounds for team wins
 * - Subtle shadows and glow effects
 * - Smooth animations on state changes
 * - Current hole pulsing indicator
 */

'use client';

import { cn } from '@/lib/utils';
import type { HoleWinner } from '@/lib/types/models';

interface HoleIndicatorProps {
    holeNumber: number;
    winner?: HoleWinner;
    par?: number;
    isCurrentHole?: boolean;
    onClick?: () => void;
    size?: 'sm' | 'md' | 'lg';
}

export function HoleIndicator({
    holeNumber,
    winner = 'none',
    par,
    isCurrentHole = false,
    onClick,
    size = 'md',
}: HoleIndicatorProps) {
    // WCAG 2.2 compliant touch targets (minimum 44x44px)
    // Inner circle may be smaller, but hit area is always >= 44px
    const sizeClasses = {
        sm: 'min-w-[44px] min-h-[44px] w-8 h-8 text-xs',
        md: 'min-w-[44px] min-h-[44px] w-10 h-10 text-sm',
        lg: 'min-w-[48px] min-h-[48px] w-12 h-12 text-base',
    };

    const getWinnerClasses = () => {
        switch (winner) {
            case 'teamA':
                return cn(
                    'text-white shadow-md',
                    'bg-linear-to-br from-[var(--team-usa)] to-[var(--team-usa-deep)]',
                    'shadow-[var(--team-usa-glow)]'
                );
            case 'teamB':
                return cn(
                    'text-white shadow-md',
                    'bg-linear-to-br from-[var(--team-europe)] to-[var(--team-europe-deep)]',
                    'shadow-[var(--team-europe-glow)]'
                );
            case 'halved':
                return cn(
                    'text-white',
                    'bg-linear-to-br from-[var(--color-accent)] to-[#A38B2D]',
                    'shadow-[var(--shadow-glow-gold)]'
                );
            default:
                return 'bg-[var(--canvas-sunken)] text-[var(--ink-tertiary)] dark:bg-[var(--surface-muted)]';
        }
    };

    return (
        <button
            type="button"
            onClick={onClick}
            disabled={!onClick}
            className={cn(
                'hole-indicator',
                'flex flex-col items-center justify-center',
                'rounded-xl font-medium',
                'transition-all duration-200 ease-out',
                sizeClasses[size],
                getWinnerClasses(),
                // Current hole premium styling
                isCurrentHole && [
                    'ring-2 ring-[var(--masters)] ring-offset-2 ring-offset-[var(--canvas)]',
                    'scale-110',
                    'animate-[currentHolePulse_2s_ease-in-out_infinite]',
                ],
                // Enhanced interaction feedback
                onClick && 'cursor-pointer hover:scale-105 active:scale-95',
                onClick && 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] focus-visible:ring-offset-2',
                !onClick && 'cursor-default',
                // Premium hover effect
                winner !== 'none' && onClick && 'hover:shadow-lg'
            )}
            aria-label={`Hole ${holeNumber}${par ? `, Par ${par}` : ''}${winner !== 'none' ? `, ${winner === 'halved' ? 'Halved' : `Won by ${winner}`}` : ''
                }`}
        >
            <span className="font-bold leading-none">{holeNumber}</span>
            {par && size !== 'sm' && (
                <span className="text-[10px] opacity-70 leading-none">P{par}</span>
            )}
        </button>
    );
}

/**
 * Hole Strip Component
 *
 * Horizontal strip of hole indicators for quick overview.
 */
interface HoleStripProps {
    results: Array<{ holeNumber: number; winner: HoleWinner; par?: number }>;
    currentHole?: number;
    onHoleClick?: (holeNumber: number) => void;
    size?: 'sm' | 'md' | 'lg';
    showPars?: boolean;
}

export function HoleStrip({
    results,
    currentHole,
    onHoleClick,
    size = 'sm',
    showPars = false,
}: HoleStripProps) {
    // Fill in missing holes
    const allHoles = Array.from({ length: 18 }, (_, i) => {
        const result = results.find(r => r.holeNumber === i + 1);
        return {
            holeNumber: i + 1,
            winner: result?.winner || 'none' as HoleWinner,
            par: result?.par,
        };
    });

    return (
        <div className="flex gap-1 overflow-x-auto pb-2 -mx-1 px-1">
            {allHoles.map(hole => (
                <HoleIndicator
                    key={hole.holeNumber}
                    holeNumber={hole.holeNumber}
                    winner={hole.winner}
                    par={showPars ? hole.par : undefined}
                    isCurrentHole={currentHole === hole.holeNumber}
                    onClick={onHoleClick ? () => onHoleClick(hole.holeNumber) : undefined}
                    size={size}
                />
            ))}
        </div>
    );
}

export default HoleIndicator;
