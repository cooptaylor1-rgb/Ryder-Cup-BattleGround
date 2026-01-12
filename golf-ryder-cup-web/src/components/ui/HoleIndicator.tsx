/**
 * Hole Indicator Component
 *
 * Visual indicator showing hole result (won, lost, halved).
 * Used in scorecard and match overview.
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
    const sizeClasses = {
        sm: 'w-7 h-7 text-xs',
        md: 'w-9 h-9 text-sm',
        lg: 'w-11 h-11 text-base',
    };

    const getWinnerClasses = () => {
        switch (winner) {
            case 'teamA':
                return 'bg-team-usa text-white';
            case 'teamB':
                return 'bg-team-europe text-white';
            case 'halved':
                return 'bg-surface-400 text-white dark:bg-surface-500';
            default:
                return 'bg-surface-100 text-surface-500 dark:bg-surface-800 dark:text-surface-400';
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
                'rounded-lg font-medium',
                'transition-all duration-150',
                sizeClasses[size],
                getWinnerClasses(),
                isCurrentHole && 'ring-2 ring-augusta-green ring-offset-2',
                onClick && 'cursor-pointer hover:opacity-90 active:scale-95',
                !onClick && 'cursor-default'
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
