'use client';

/**
 * Stableford Scorecard Component
 *
 * Displays and allows editing of Stableford scores with:
 * - Points display with color coding
 * - Gross/Net score toggle
 * - Front 9 / Back 9 / Total breakdown
 */

import { useState } from 'react';
import { ChevronLeft, ChevronRight, Target } from 'lucide-react';
import type { StablefordRoundScore, StablefordHoleScore } from '@/lib/types/scoringFormats';
import { getPointsDisplay } from '@/lib/services/stablefordService';
import { cn } from '@/lib/utils';

interface StablefordScorecardProps {
    score: StablefordRoundScore;
    holePars: number[];
    onScoreChange?: (holeNumber: number, grossScore: number) => void;
    readonly?: boolean;
}

export function StablefordScorecard({
    score,
    holePars,
    onScoreChange,
    readonly = false,
}: StablefordScorecardProps) {
    const [currentHole, setCurrentHole] = useState(1);
    const [showNet, setShowNet] = useState(true);

    const currentHoleScore = score.holeScores[currentHole - 1];
    const par = holePars[currentHole - 1] || 4;

    const handleScoreChange = (value: number) => {
        if (onScoreChange && !readonly) {
            onScoreChange(currentHole, value);
        }
    };

    return (
        <div className="space-y-6">
            {/* Points Summary */}
            <div className="p-4 rounded-2xl bg-[var(--canvas-raised)] border border-[var(--rule)]">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="type-overline">Stableford Points</h3>
                    <button
                        onClick={() => setShowNet(!showNet)}
                        className="text-xs px-2 py-1 rounded bg-[var(--surface)] text-[var(--ink-secondary)]"
                    >
                        {showNet ? 'Net' : 'Gross'}
                    </button>
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                        <p className="type-meta mb-1">Front 9</p>
                        <p className="text-2xl font-bold text-[var(--masters)]">
                            {score.frontNinePoints}
                        </p>
                    </div>
                    <div>
                        <p className="type-meta mb-1">Back 9</p>
                        <p className="text-2xl font-bold text-[var(--masters)]">
                            {score.backNinePoints}
                        </p>
                    </div>
                    <div>
                        <p className="type-meta mb-1">Total</p>
                        <p className="text-3xl font-bold text-[var(--masters)]">
                            {score.totalPoints}
                        </p>
                    </div>
                </div>
            </div>

            {/* Current Hole Scoring */}
            <div className="p-4 rounded-2xl bg-[var(--canvas-raised)] border border-[var(--rule)]">
                {/* Hole Navigation */}
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => setCurrentHole(Math.max(1, currentHole - 1))}
                        disabled={currentHole === 1}
                        className={cn(
                            'p-2 rounded-full',
                            currentHole === 1
                                ? 'bg-transparent text-[var(--ink-tertiary)]'
                                : 'bg-[var(--surface)] text-[var(--ink)]'
                        )}
                    >
                        <ChevronLeft size={20} />
                    </button>

                    <div className="text-center">
                        <p className="type-overline">Hole {currentHole}</p>
                        <p className="type-meta">Par {par}</p>
                    </div>

                    <button
                        onClick={() => setCurrentHole(Math.min(18, currentHole + 1))}
                        disabled={currentHole === 18}
                        className={cn(
                            'p-2 rounded-full',
                            currentHole === 18
                                ? 'bg-transparent text-[var(--ink-tertiary)]'
                                : 'bg-[var(--surface)] text-[var(--ink)]'
                        )}
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>

                {/* Score Input */}
                {!readonly && (
                    <div className="grid grid-cols-6 gap-2 mb-4">
                        {[par - 2, par - 1, par, par + 1, par + 2, par + 3]
                            .filter((value) => value >= 1)
                            .map((value) => {
                                const isSelected = currentHoleScore?.grossScore === value;
                                return (
                                    <button
                                        key={value}
                                        onClick={() => handleScoreChange(value)}
                                        className={cn(
                                            'py-3 rounded-xl font-semibold transition-all',
                                            isSelected
                                                ? 'bg-[var(--masters)] text-white'
                                                : 'bg-[var(--surface)] text-[var(--ink)] border border-[var(--rule)]'
                                        )}
                                    >
                                        {value}
                                    </button>
                                );
                            })}
                    </div>
                )}

                {/* Current Hole Points */}
                {currentHoleScore && currentHoleScore.grossScore > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--surface)]">
                        <div className="flex items-center gap-3">
                            <Target size={16} className="text-[var(--ink-secondary)]" />
                            <span className="type-body">
                                {showNet
                                    ? `Net ${currentHoleScore.netScore}`
                                    : `Gross ${currentHoleScore.grossScore}`}
                            </span>
                        </div>
                        <span
                            className="font-bold text-lg"
                            style={{ color: getPointsDisplay(currentHoleScore.stablefordPoints).color }}
                        >
                            {getPointsDisplay(currentHoleScore.stablefordPoints).text} pts
                        </span>
                    </div>
                )}
            </div>

            {/* Hole-by-Hole Grid */}
            <div className="p-4 rounded-2xl bg-[var(--canvas-raised)] border border-[var(--rule)]">
                <h3 className="type-overline mb-4">Scorecard</h3>

                {/* Front 9 */}
                <div className="mb-4">
                    <p className="type-meta mb-2">Front 9</p>
                    <div className="grid grid-cols-9 gap-1">
                        {score.holeScores.slice(0, 9).map((hole, idx) => (
                            <HoleCell
                                key={idx}
                                hole={hole}
                                isActive={currentHole === idx + 1}
                                onClick={() => setCurrentHole(idx + 1)}
                            />
                        ))}
                    </div>
                </div>

                {/* Back 9 */}
                <div>
                    <p className="type-meta mb-2">Back 9</p>
                    <div className="grid grid-cols-9 gap-1">
                        {score.holeScores.slice(9, 18).map((hole, idx) => (
                            <HoleCell
                                key={idx}
                                hole={hole}
                                isActive={currentHole === idx + 10}
                                onClick={() => setCurrentHole(idx + 10)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function HoleCell({
    hole,
    isActive,
    onClick,
}: {
    hole: StablefordHoleScore;
    isActive: boolean;
    onClick: () => void;
}) {
    const pointsDisplay = getPointsDisplay(hole.stablefordPoints);
    const hasScore = hole.grossScore > 0;

    return (
        <button
            onClick={onClick}
            className={cn(
                'flex flex-col items-center p-1.5 rounded-lg transition-all',
                isActive
                    ? 'bg-[var(--masters)]'
                    : hasScore
                        ? 'bg-[var(--surface)] border border-[var(--rule)]'
                        : 'bg-transparent border border-[var(--rule)]'
            )}
        >
            <span
                className={cn(
                    'text-[10px] font-medium',
                    isActive ? 'text-white' : 'text-[var(--ink-tertiary)]'
                )}
            >
                {hole.holeNumber}
            </span>
            {hasScore ? (
                <span
                    className={cn('text-xs font-bold', isActive ? 'text-white' : undefined)}
                    style={isActive ? undefined : { color: pointsDisplay.color }}
                >
                    {hole.stablefordPoints}
                </span>
            ) : (
                <span
                    className={cn('text-xs', isActive ? 'text-white/50' : 'text-[var(--ink-tertiary)]')}
                >
                    -
                </span>
            )}
        </button>
    );
}
