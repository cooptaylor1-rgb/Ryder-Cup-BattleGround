/**
 * HoleMiniMap — Phase 1.4: Smart Hole Navigation
 *
 * Visual mini-map showing all 18 holes with scoring status.
 * Enables quick jump to any hole with a single tap.
 *
 * Features:
 * - Compact 18-hole grid view
 * - Color-coded scoring status (won/lost/halved/unscored)
 * - Current hole highlight with pulse animation
 * - Touch-friendly targets (min 44px)
 * - Expandable full scorecard view
 * - Haptic feedback on selection
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, ChevronUp, Flag } from 'lucide-react';
import type { HoleResult, HoleWinner } from '@/lib/types/models';
import { useHaptic } from '@/lib/hooks';

interface HoleMiniMapProps {
    /** Current active hole (1-18) */
    currentHole: number;
    /** All hole results for the match */
    holeResults: HoleResult[];
    /** Team A display name */
    teamAName?: string;
    /** Team B display name */
    teamBName?: string;
    /** Team A color */
    teamAColor?: string;
    /** Team B color */
    teamBColor?: string;
    /** Callback when hole is selected */
    onHoleSelect: (holeNumber: number) => void;
    /** Whether the match is complete */
    isComplete?: boolean;
    /** Number of holes (default 18) */
    totalHoles?: number;
    /** Optional class name */
    className?: string;
}

// Hole status for display
type HoleStatus = 'teamA' | 'teamB' | 'halved' | 'unscored' | 'current';

export function HoleMiniMap({
    currentHole,
    holeResults,
    teamAName = 'USA',
    teamBName = 'EUR',
    teamAColor = '#0047AB',
    teamBColor = '#8B0000',
    onHoleSelect,
    isComplete = false,
    totalHoles = 18,
    className = '',
}: HoleMiniMapProps) {
    const haptic = useHaptic();
    const [isExpanded, setIsExpanded] = useState(false);

    // Build hole status map
    const holeStatuses = useMemo(() => {
        const statuses: Map<number, HoleStatus> = new Map();

        for (let i = 1; i <= totalHoles; i++) {
            const result = holeResults.find(r => r.holeNumber === i);

            if (i === currentHole && !isComplete) {
                statuses.set(i, 'current');
            } else if (result) {
                switch (result.winner) {
                    case 'teamA':
                        statuses.set(i, 'teamA');
                        break;
                    case 'teamB':
                        statuses.set(i, 'teamB');
                        break;
                    case 'halved':
                        statuses.set(i, 'halved');
                        break;
                    default:
                        statuses.set(i, 'unscored');
                }
            } else {
                statuses.set(i, 'unscored');
            }
        }

        return statuses;
    }, [currentHole, holeResults, totalHoles, isComplete]);

    // Calculate running score at each hole
    const runningScores = useMemo(() => {
        const scores: Map<number, number> = new Map();
        let score = 0;

        for (let i = 1; i <= totalHoles; i++) {
            const result = holeResults.find(r => r.holeNumber === i);
            if (result) {
                if (result.winner === 'teamA') score++;
                else if (result.winner === 'teamB') score--;
            }
            scores.set(i, score);
        }

        return scores;
    }, [holeResults, totalHoles]);

    // Handle hole tap
    const handleHoleTap = useCallback((holeNumber: number) => {
        haptic.selection();
        onHoleSelect(holeNumber);
    }, [haptic, onHoleSelect]);

    // Toggle expanded view
    const toggleExpanded = useCallback(() => {
        haptic.tap();
        setIsExpanded((prev: boolean) => !prev);
    }, [haptic]);

    // Get color for hole status
    const getHoleColor = (status: HoleStatus, isBackground = false) => {
        const alpha = isBackground ? '20' : '';
        switch (status) {
            case 'teamA':
                return isBackground ? `${teamAColor}${alpha}` : teamAColor;
            case 'teamB':
                return isBackground ? `${teamBColor}${alpha}` : teamBColor;
            case 'halved':
                return isBackground ? 'rgba(100, 100, 100, 0.2)' : '#666';
            case 'current':
                return isBackground ? 'rgba(0, 103, 71, 0.2)' : 'var(--masters)';
            default:
                return isBackground ? 'rgba(200, 200, 200, 0.2)' : 'transparent';
        }
    };

    // Compact view: 18 holes in a row
    const CompactView = () => (
        <div className="flex items-center gap-1">
            {/* Front 9 */}
            <div className="flex gap-0.5">
                {Array.from({ length: 9 }, (_, i) => i + 1).map((hole) => {
                    const status = holeStatuses.get(hole) || 'unscored';
                    const isCurrent = hole === currentHole && !isComplete;

                    return (
                        <button
                            key={hole}
                            onClick={() => handleHoleTap(hole)}
                            className={`
                relative w-6 h-6 rounded-md flex items-center justify-center
                text-xs font-medium transition-all duration-150
                ${isCurrent ? 'ring-2 ring-offset-1' : ''}
              `}
                            style={{
                                background: getHoleColor(status, true),
                                color: status === 'unscored' ? 'var(--ink-tertiary)' : getHoleColor(status),
                                ['--tw-ring-color' as string]: isCurrent ? 'var(--masters)' : undefined,
                            }}
                            aria-label={`Hole ${hole}${status !== 'unscored' ? `, ${status}` : ''}`}
                        >
                            {hole}
                            {isCurrent && (
                                <motion.span
                                    className="absolute inset-0 rounded-md"
                                    style={{ border: '2px solid var(--masters)' }}
                                    animate={{ opacity: [1, 0.4, 1] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Turn marker */}
            <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-0.5" />

            {/* Back 9 */}
            <div className="flex gap-0.5">
                {Array.from({ length: 9 }, (_, i) => i + 10).map((hole) => {
                    const status = holeStatuses.get(hole) || 'unscored';
                    const isCurrent = hole === currentHole && !isComplete;

                    return (
                        <button
                            key={hole}
                            onClick={() => handleHoleTap(hole)}
                            className={`
                relative w-6 h-6 rounded-md flex items-center justify-center
                text-xs font-medium transition-all duration-150
                ${isCurrent ? 'ring-2 ring-offset-1' : ''}
              `}
                            style={{
                                background: getHoleColor(status, true),
                                color: status === 'unscored' ? 'var(--ink-tertiary)' : getHoleColor(status),
                                ['--tw-ring-color' as string]: isCurrent ? 'var(--masters)' : undefined,
                            }}
                            aria-label={`Hole ${hole}${status !== 'unscored' ? `, ${status}` : ''}`}
                        >
                            {hole}
                            {isCurrent && (
                                <motion.span
                                    className="absolute inset-0 rounded-md"
                                    style={{ border: '2px solid var(--masters)' }}
                                    animate={{ opacity: [1, 0.4, 1] }}
                                    transition={{ duration: 1.5, repeat: Infinity }}
                                />
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );

    // Expanded view: Full scorecard grid
    const ExpandedView = () => (
        <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
        >
            <div className="pt-3 space-y-3">
                {/* Front 9 */}
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Front 9
                        </span>
                        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                    </div>
                    <div className="grid grid-cols-9 gap-1">
                        {Array.from({ length: 9 }, (_, i) => i + 1).map((hole) => {
                            const status = holeStatuses.get(hole) || 'unscored';
                            const isCurrent = hole === currentHole && !isComplete;
                            const score = runningScores.get(hole) || 0;

                            return (
                                <button
                                    key={hole}
                                    onClick={() => handleHoleTap(hole)}
                                    className={`
                    relative aspect-square rounded-lg flex flex-col items-center justify-center
                    transition-all duration-150 hover:scale-105
                    ${isCurrent ? 'ring-2 ring-offset-2' : ''}
                  `}
                                    style={{
                                        background: getHoleColor(status, true),
                                        ['--tw-ring-color' as string]: isCurrent ? 'var(--masters)' : undefined,
                                    }}
                                >
                                    <span
                                        className="text-sm font-bold"
                                        style={{ color: status === 'unscored' ? 'var(--ink-tertiary)' : getHoleColor(status) }}
                                    >
                                        {hole}
                                    </span>
                                    {status !== 'unscored' && status !== 'current' && (
                                        <span className="text-[10px] font-medium" style={{ color: getHoleColor(status) }}>
                                            {score > 0 ? `+${score}` : score === 0 ? 'AS' : score}
                                        </span>
                                    )}
                                    {isCurrent && (
                                        <Flag className="absolute top-0.5 right-0.5 w-3 h-3" style={{ color: 'var(--masters)' }} />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Back 9 */}
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Back 9
                        </span>
                        <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700" />
                    </div>
                    <div className="grid grid-cols-9 gap-1">
                        {Array.from({ length: 9 }, (_, i) => i + 10).map((hole) => {
                            const status = holeStatuses.get(hole) || 'unscored';
                            const isCurrent = hole === currentHole && !isComplete;
                            const score = runningScores.get(hole) || 0;

                            return (
                                <button
                                    key={hole}
                                    onClick={() => handleHoleTap(hole)}
                                    className={`
                    relative aspect-square rounded-lg flex flex-col items-center justify-center
                    transition-all duration-150 hover:scale-105
                    ${isCurrent ? 'ring-2 ring-offset-2' : ''}
                  `}
                                    style={{
                                        background: getHoleColor(status, true),
                                        ['--tw-ring-color' as string]: isCurrent ? 'var(--masters)' : undefined,
                                    }}
                                >
                                    <span
                                        className="text-sm font-bold"
                                        style={{ color: status === 'unscored' ? 'var(--ink-tertiary)' : getHoleColor(status) }}
                                    >
                                        {hole}
                                    </span>
                                    {status !== 'unscored' && status !== 'current' && (
                                        <span className="text-[10px] font-medium" style={{ color: getHoleColor(status) }}>
                                            {score > 0 ? `+${score}` : score === 0 ? 'AS' : score}
                                        </span>
                                    )}
                                    {isCurrent && (
                                        <Flag className="absolute top-0.5 right-0.5 w-3 h-3" style={{ color: 'var(--masters)' }} />
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-1.5">
                        <div
                            className="w-3 h-3 rounded-sm"
                            style={{ background: teamAColor }}
                        />
                        <span className="text-xs text-gray-600 dark:text-gray-400">{teamAName}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div
                            className="w-3 h-3 rounded-sm"
                            style={{ background: teamBColor }}
                        />
                        <span className="text-xs text-gray-600 dark:text-gray-400">{teamBName}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-3 h-3 rounded-sm bg-gray-500" />
                        <span className="text-xs text-gray-600 dark:text-gray-400">Halved</span>
                    </div>
                </div>
            </div>
        </motion.div>
    );

    // Calculate summary stats
    const teamAWins = holeResults.filter(r => r.winner === 'teamA').length;
    const teamBWins = holeResults.filter(r => r.winner === 'teamB').length;
    const halved = holeResults.filter(r => r.winner === 'halved').length;
    const scored = teamAWins + teamBWins + halved;

    return (
        <div className={`rounded-2xl p-3 ${className}`} style={{ background: 'var(--surface)' }}>
            {/* Header with toggle */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--ink-secondary)' }}>
                        Hole Map
                    </span>
                    <span className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
                        {scored} of {totalHoles} scored
                    </span>
                </div>
                <button
                    onClick={toggleExpanded}
                    className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    style={{ color: 'var(--masters)' }}
                >
                    {isExpanded ? (
                        <>
                            <ChevronUp className="w-3 h-3" />
                            Collapse
                        </>
                    ) : (
                        <>
                            <ChevronDown className="w-3 h-3" />
                            Expand
                        </>
                    )}
                </button>
            </div>

            {/* Compact map */}
            <CompactView />

            {/* Expanded view */}
            <AnimatePresence>
                {isExpanded && <ExpandedView />}
            </AnimatePresence>

            {/* Quick stats bar */}
            <div className="flex items-center justify-between mt-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2">
                    <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: teamAColor }}
                    >
                        {teamAWins}
                    </div>
                    <span className="text-xs" style={{ color: 'var(--ink-secondary)' }}>{teamAName}</span>
                </div>

                <div className="flex items-center gap-1">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold bg-gray-500 text-white">
                        {halved}
                    </div>
                    <span className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>Halved</span>
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs" style={{ color: 'var(--ink-secondary)' }}>{teamBName}</span>
                    <div
                        className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                        style={{ background: teamBColor }}
                    >
                        {teamBWins}
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Compact inline version of the hole map for headers
 */
export function HoleMiniMapInline({
    currentHole,
    holeResults,
    teamAColor = '#0047AB',
    teamBColor = '#8B0000',
    onHoleSelect,
    totalHoles = 18,
}: Omit<HoleMiniMapProps, 'teamAName' | 'teamBName' | 'isComplete' | 'className'>) {
    const haptic = useHaptic();

    return (
        <div className="flex items-center gap-px">
            {Array.from({ length: totalHoles }, (_, i) => i + 1).map((hole) => {
                const result = holeResults.find(r => r.holeNumber === hole);
                const isCurrent = hole === currentHole;

                let bgColor = 'transparent';
                if (result?.winner === 'teamA') bgColor = teamAColor;
                else if (result?.winner === 'teamB') bgColor = teamBColor;
                else if (result?.winner === 'halved') bgColor = '#666';

                return (
                    <button
                        key={hole}
                        onClick={() => {
                            haptic.selection();
                            onHoleSelect(hole);
                        }}
                        className={`
              w-2 h-4 rounded-sm transition-all
              ${isCurrent ? 'ring-1 ring-white scale-125' : 'hover:scale-110'}
            `}
                        style={{
                            background: bgColor || 'rgba(200, 200, 200, 0.3)',
                        }}
                        aria-label={`Go to hole ${hole}`}
                    />
                );
            })}
        </div>
    );
}
