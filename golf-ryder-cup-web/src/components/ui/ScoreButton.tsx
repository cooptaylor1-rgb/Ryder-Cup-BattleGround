/**
 * Score Button Component
 *
 * Large, tappable button for recording hole winners.
 * Designed for outdoor use with gloves - 60px+ touch target.
 */

'use client';

import { cn } from '@/lib/utils';
import { useHaptic } from '@/lib/hooks';
import type { HoleWinner } from '@/lib/types/models';

interface ScoreButtonProps {
    winner: HoleWinner;
    label: string;
    teamColor?: 'usa' | 'europe';
    isSelected?: boolean;
    disabled?: boolean;
    onClick: () => void;
    size?: 'sm' | 'md' | 'lg';
}

export function ScoreButton({
    winner,
    label,
    teamColor,
    isSelected = false,
    disabled = false,
    onClick,
    size = 'lg',
}: ScoreButtonProps) {
    const haptic = useHaptic();

    const handleClick = () => {
        if (disabled) return;
        if (isSelected) {
            haptic.tap();
        } else {
            haptic.press();
        }
        onClick();
    };

    const sizeClasses = {
        sm: 'h-14 min-w-[100px] text-lg',
        md: 'h-16 min-w-[120px] text-xl',
        lg: 'h-20 min-w-[140px] text-2xl',
    };

    const getColorClasses = () => {
        if (winner === 'halved') {
            return isSelected
                ? 'bg-surface-400 text-white border-surface-500 shadow-lg'
                : 'bg-surface-100 text-surface-700 border-surface-400 dark:bg-surface-800 dark:text-surface-200 dark:border-surface-500 hover:bg-surface-200';
        }

        if (teamColor === 'usa') {
            return isSelected
                ? 'bg-team-usa text-white border-team-usa shadow-xl shadow-team-usa/40 scale-[1.02]'
                : 'bg-team-usa/15 text-team-usa border-team-usa/50 hover:bg-team-usa/25 hover:border-team-usa';
        }

        if (teamColor === 'europe') {
            return isSelected
                ? 'bg-team-europe text-white border-team-europe shadow-xl shadow-team-europe/40 scale-[1.02]'
                : 'bg-team-europe/15 text-team-europe border-team-europe/50 hover:bg-team-europe/25 hover:border-team-europe';
        }

        return 'bg-surface-100 text-surface-800 border-surface-400';
    };

    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={disabled}
            className={cn(
                'score-btn',
                'relative flex items-center justify-center',
                'font-bold rounded-xl border-2',
                'transition-all duration-150',
                'active:scale-95',
                'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-augusta-green',
                sizeClasses[size],
                getColorClasses(),
                disabled && 'opacity-50 cursor-not-allowed',
                isSelected && 'ring-2 ring-offset-2 ring-augusta-green'
            )}
            aria-pressed={isSelected}
        >
            {label}
            {isSelected && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-augusta-green rounded-full flex items-center justify-center">
                    <svg
                        className="w-3 h-3 text-white"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={3}
                            d="M5 13l4 4L19 7"
                        />
                    </svg>
                </span>
            )}
        </button>
    );
}

export default ScoreButton;
