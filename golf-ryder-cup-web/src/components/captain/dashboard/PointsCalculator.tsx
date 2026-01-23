/**
 * PointsCalculator Component — Phase 2: Captain Empowerment
 *
 * Tracks running totals with "what-if" scenario capabilities:
 * - Current cumulative points display
 * - Projected outcomes slider
 * - Match-by-match contribution breakdown
 * - Winning scenarios visualization
 * - Points needed to win/halve calculations
 *
 * Helps captains understand exact scenarios for victory.
 */

'use client';

import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Calculator,
    Trophy,
    Target,
    CheckCircle2,
    ChevronDown,
    ChevronUp,
    Zap,
    Info,
    Lock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/lib/hooks';

// ============================================
// TYPES
// ============================================

export type MatchOutcome = 'teamA' | 'teamB' | 'halved' | 'projected';

export interface ProjectedMatch {
    id: string;
    matchNumber: number;
    teamANames: string[];
    teamBNames: string[];
    currentScore: number; // Match play score
    holesPlayed: number;
    holesRemaining: number;
    isCompleted: boolean;
    lockedOutcome?: MatchOutcome; // If match is closed out
    projectedOutcome: MatchOutcome; // User's prediction
    probability: {
        teamA: number;
        halved: number;
        teamB: number;
    };
}

interface PointsCalculatorProps {
    teamAName: string;
    teamBName: string;
    teamAColor?: string;
    teamBColor?: string;
    totalMatchPoints: number; // Total points available (1 per match)
    currentTeamAPoints: number; // Already won
    currentTeamBPoints: number; // Already won
    matches: ProjectedMatch[];
    targetPoints?: number; // Points needed to win (e.g., 14.5 for 28 matches)
    onProjectionChange?: (matchId: string, outcome: MatchOutcome) => void;
    className?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculatePointsFromOutcome(
    outcome: MatchOutcome,
    team: 'A' | 'B'
): number {
    if (outcome === 'halved') return 0.5;
    if (outcome === 'teamA' && team === 'A') return 1;
    if (outcome === 'teamB' && team === 'B') return 1;
    return 0;
}

function _getOutcomeColor(
    outcome: MatchOutcome,
    teamAColor: string,
    teamBColor: string
): string {
    if (outcome === 'teamA') return teamAColor;
    if (outcome === 'teamB') return teamBColor;
    if (outcome === 'halved') return '#6B7280';
    return 'var(--ink-tertiary)';
}

function formatDecimal(num: number): string {
    if (num % 1 === 0) return num.toString();
    return num.toFixed(1);
}

// ============================================
// OUTCOME SELECTOR
// ============================================

interface OutcomeSelectorProps {
    matchId: string;
    currentOutcome: MatchOutcome;
    isLocked: boolean;
    teamAColor: string;
    teamBColor: string;
    teamAName: string;
    teamBName: string;
    probability: {
        teamA: number;
        halved: number;
        teamB: number;
    };
    onChange: (matchId: string, outcome: MatchOutcome) => void;
}

function OutcomeSelector({
    matchId,
    currentOutcome,
    isLocked,
    teamAColor,
    teamBColor,
    teamAName,
    teamBName,
    probability,
    onChange,
}: OutcomeSelectorProps) {
    const haptic = useHaptic();

    const options: { value: MatchOutcome; label: string; color: string; prob: number }[] = [
        { value: 'teamA', label: teamAName, color: teamAColor, prob: probability.teamA },
        { value: 'halved', label: 'Halved', color: '#6B7280', prob: probability.halved },
        { value: 'teamB', label: teamBName, color: teamBColor, prob: probability.teamB },
    ];

    const handleSelect = (outcome: MatchOutcome) => {
        if (isLocked) return;
        haptic.tap();
        onChange(matchId, outcome);
    };

    return (
        <div className="flex items-center gap-1">
            {options.map((opt) => {
                const isSelected = currentOutcome === opt.value;
                return (
                    <button
                        key={opt.value}
                        onClick={() => handleSelect(opt.value)}
                        disabled={isLocked}
                        className={cn(
                            'relative px-2 py-1 rounded-md text-xs font-medium transition-all',
                            isSelected ? 'text-white' : 'opacity-40 hover:opacity-70',
                            isLocked && 'cursor-not-allowed'
                        )}
                        style={{
                            background: isSelected ? opt.color : 'transparent',
                            border: `1px solid ${opt.color}`,
                        }}
                    >
                        {isLocked && isSelected && (
                            <Lock size={8} className="absolute -top-1 -right-1" />
                        )}
                        <span className="whitespace-nowrap">
                            {opt.label.length > 6 ? opt.label.substring(0, 3) : opt.label}
                        </span>
                        <span className="block text-[8px] opacity-70 mt-0.5">
                            {Math.round(opt.prob * 100)}%
                        </span>
                    </button>
                );
            })}
        </div>
    );
}

// ============================================
// MATCH PROJECTION ROW
// ============================================

interface MatchProjectionRowProps {
    match: ProjectedMatch;
    teamAColor: string;
    teamBColor: string;
    teamAName: string;
    teamBName: string;
    onChange: (matchId: string, outcome: MatchOutcome) => void;
}

function MatchProjectionRow({
    match,
    teamAColor,
    teamBColor,
    teamAName,
    teamBName,
    onChange,
}: MatchProjectionRowProps) {
    const isLocked = !!match.lockedOutcome;
    const outcome = match.lockedOutcome || match.projectedOutcome;

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className={cn(
                'flex items-center justify-between p-3 rounded-lg',
                isLocked ? 'bg-gray-50 dark:bg-gray-800/50' : ''
            )}
            style={{ background: isLocked ? undefined : 'var(--surface)' }}
        >
            {/* Match Info */}
            <div className="flex items-center gap-3 flex-1 min-w-0">
                <div
                    className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
                    style={{ background: 'var(--rule)', color: 'var(--ink-secondary)' }}
                >
                    {match.matchNumber}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm truncate" style={{ color: 'var(--ink)' }}>
                        {match.teamANames.join(' & ')}
                    </div>
                    <div className="text-xs truncate" style={{ color: 'var(--ink-tertiary)' }}>
                        vs {match.teamBNames.join(' & ')}
                    </div>
                </div>
            </div>

            {/* Current Status */}
            <div className="px-3 text-center">
                {match.isCompleted ? (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                        style={{ background: 'var(--positive-bg)', color: 'var(--positive)' }}
                    >
                        Final
                    </span>
                ) : (
                    <div>
                        <span className="text-sm font-bold" style={{
                            color: match.currentScore > 0 ? teamAColor :
                                match.currentScore < 0 ? teamBColor : 'var(--ink-tertiary)'
                        }}>
                            {match.currentScore > 0 ? `+${match.currentScore}` : match.currentScore}
                        </span>
                        <span className="text-[10px] block" style={{ color: 'var(--ink-tertiary)' }}>
                            {match.holesPlayed} holes
                        </span>
                    </div>
                )}
            </div>

            {/* Outcome Selector */}
            <OutcomeSelector
                matchId={match.id}
                currentOutcome={outcome}
                isLocked={isLocked}
                teamAColor={teamAColor}
                teamBColor={teamBColor}
                teamAName={teamAName}
                teamBName={teamBName}
                probability={match.probability}
                onChange={onChange}
            />
        </motion.div>
    );
}

// ============================================
// SCENARIO SUMMARY CARD
// ============================================

interface ScenarioSummaryCardProps {
    teamName: string;
    teamColor: string;
    currentPoints: number;
    projectedPoints: number;
    targetPoints: number;
    isLeading: boolean;
}

function ScenarioSummaryCard({
    teamName,
    teamColor,
    currentPoints,
    projectedPoints,
    targetPoints,
    isLeading,
}: ScenarioSummaryCardProps) {
    const willWin = projectedPoints >= targetPoints;
    const pointsNeeded = Math.max(0, targetPoints - currentPoints);
    const willReach = projectedPoints >= targetPoints;

    return (
        <div
            className="p-4 rounded-xl"
            style={{
                background: `${teamColor}10`,
                border: isLeading ? `2px solid ${teamColor}` : '1px solid var(--rule)',
            }}
        >
            <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 rounded-full" style={{ background: teamColor }} />
                <span className="font-semibold" style={{ color: teamColor }}>
                    {teamName}
                </span>
                {willWin && (
                    <Trophy size={14} style={{ color: teamColor }} />
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <p className="text-[10px] uppercase" style={{ color: 'var(--ink-tertiary)' }}>
                        Current
                    </p>
                    <p className="text-2xl font-bold" style={{ color: teamColor }}>
                        {formatDecimal(currentPoints)}
                    </p>
                </div>
                <div>
                    <p className="text-[10px] uppercase" style={{ color: 'var(--ink-tertiary)' }}>
                        Projected
                    </p>
                    <p className="text-2xl font-bold" style={{ color: teamColor }}>
                        {formatDecimal(projectedPoints)}
                    </p>
                </div>
            </div>

            <div className="mt-3 pt-3 border-t" style={{ borderColor: `${teamColor}30` }}>
                <div className="flex items-center justify-between text-sm">
                    <span style={{ color: 'var(--ink-secondary)' }}>Need to win:</span>
                    <span className="font-semibold" style={{ color: willReach ? 'var(--positive)' : 'var(--ink)' }}>
                        {formatDecimal(pointsNeeded)} pts
                    </span>
                </div>
            </div>
        </div>
    );
}

// ============================================
// MAIN POINTS CALCULATOR
// ============================================

export function PointsCalculator({
    teamAName,
    teamBName,
    teamAColor = '#0047AB',
    teamBColor = '#8B0000',
    totalMatchPoints,
    currentTeamAPoints,
    currentTeamBPoints,
    matches,
    targetPoints = totalMatchPoints / 2 + 0.5,
    onProjectionChange,
    className,
}: PointsCalculatorProps) {
    const haptic = useHaptic();
    const [localProjections, setLocalProjections] = useState<Record<string, MatchOutcome>>({});
    const [showDetails, setShowDetails] = useState(false);

    // Calculate projected points
    const projectedResults = useMemo(() => {
        let projectedTeamA = currentTeamAPoints;
        let projectedTeamB = currentTeamBPoints;

        for (const match of matches) {
            if (match.isCompleted || match.lockedOutcome) continue;

            const outcome = localProjections[match.id] || match.projectedOutcome;
            projectedTeamA += calculatePointsFromOutcome(outcome, 'A');
            projectedTeamB += calculatePointsFromOutcome(outcome, 'B');
        }

        return {
            teamA: projectedTeamA,
            teamB: projectedTeamB,
        };
    }, [matches, localProjections, currentTeamAPoints, currentTeamBPoints]);

    // Determine winner
    const winner = useMemo(() => {
        if (projectedResults.teamA >= targetPoints) return 'teamA';
        if (projectedResults.teamB >= targetPoints) return 'teamB';
        if (projectedResults.teamA === projectedResults.teamB) return 'halved';
        return null;
    }, [projectedResults, targetPoints]);

    const handleProjectionChange = useCallback((matchId: string, outcome: MatchOutcome) => {
        setLocalProjections(prev => ({ ...prev, [matchId]: outcome }));
        onProjectionChange?.(matchId, outcome);
    }, [onProjectionChange]);

    const toggleDetails = () => {
        haptic.tap();
        setShowDetails(!showDetails);
    };

    // Separate completed and ongoing matches
    const completedMatches = matches.filter(m => m.isCompleted || m.lockedOutcome);
    const ongoingMatches = matches.filter(m => !m.isCompleted && !m.lockedOutcome);

    return (
        <div className={cn('space-y-4', className)}>
            {/* Header */}
            <div className="flex items-center gap-2">
                <Calculator size={20} style={{ color: 'var(--masters)' }} />
                <h2 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>
                    Points Calculator
                </h2>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
                <ScenarioSummaryCard
                    teamName={teamAName}
                    teamColor={teamAColor}
                    currentPoints={currentTeamAPoints}
                    projectedPoints={projectedResults.teamA}
                    targetPoints={targetPoints}
                    isLeading={projectedResults.teamA > projectedResults.teamB}
                />
                <ScenarioSummaryCard
                    teamName={teamBName}
                    teamColor={teamBColor}
                    currentPoints={currentTeamBPoints}
                    projectedPoints={projectedResults.teamB}
                    targetPoints={targetPoints}
                    isLeading={projectedResults.teamB > projectedResults.teamA}
                />
            </div>

            {/* Target Indicator */}
            <div
                className="p-3 rounded-lg flex items-center justify-between"
                style={{ background: 'var(--surface)' }}
            >
                <div className="flex items-center gap-2">
                    <Target size={16} style={{ color: 'var(--ink-secondary)' }} />
                    <span className="text-sm" style={{ color: 'var(--ink-secondary)' }}>
                        Points to win
                    </span>
                </div>
                <span className="font-bold" style={{ color: 'var(--ink)' }}>
                    {formatDecimal(targetPoints)}
                </span>
            </div>

            {/* Projected Winner Banner */}
            {winner && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-xl flex items-center justify-center gap-3"
                    style={{
                        background: winner === 'teamA' ? teamAColor :
                            winner === 'teamB' ? teamBColor : 'var(--ink-tertiary)',
                    }}
                >
                    <Trophy size={24} color="white" />
                    <span className="text-lg font-bold text-white">
                        {winner === 'teamA' ? teamAName :
                            winner === 'teamB' ? teamBName : 'Halved'} Projected to Win
                    </span>
                </motion.div>
            )}

            {/* Match Details Toggle */}
            <button
                onClick={toggleDetails}
                className="w-full flex items-center justify-between p-3 rounded-lg"
                style={{ background: 'var(--surface)' }}
            >
                <span className="text-sm font-medium" style={{ color: 'var(--ink-secondary)' }}>
                    {showDetails ? 'Hide' : 'Show'} Match Details
                </span>
                {showDetails ? (
                    <ChevronUp size={18} style={{ color: 'var(--ink-secondary)' }} />
                ) : (
                    <ChevronDown size={18} style={{ color: 'var(--ink-secondary)' }} />
                )}
            </button>

            {/* Match Details */}
            <AnimatePresence>
                {showDetails && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-4 overflow-hidden"
                    >
                        {/* Ongoing Matches */}
                        {ongoingMatches.length > 0 && (
                            <div>
                                <h3 className="text-sm font-semibold uppercase mb-2 flex items-center gap-2"
                                    style={{ color: 'var(--ink-secondary)' }}
                                >
                                    <Zap size={14} />
                                    In Progress ({ongoingMatches.length})
                                </h3>
                                <div className="space-y-2">
                                    {ongoingMatches.map(match => (
                                        <MatchProjectionRow
                                            key={match.id}
                                            match={{
                                                ...match,
                                                projectedOutcome: localProjections[match.id] || match.projectedOutcome
                                            }}
                                            teamAColor={teamAColor}
                                            teamBColor={teamBColor}
                                            teamAName={teamAName}
                                            teamBName={teamBName}
                                            onChange={handleProjectionChange}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Completed Matches */}
                        {completedMatches.length > 0 && (
                            <div>
                                <h3 className="text-sm font-semibold uppercase mb-2 flex items-center gap-2"
                                    style={{ color: 'var(--ink-tertiary)' }}
                                >
                                    <CheckCircle2 size={14} />
                                    Completed ({completedMatches.length})
                                </h3>
                                <div className="space-y-2 opacity-60">
                                    {completedMatches.map(match => (
                                        <MatchProjectionRow
                                            key={match.id}
                                            match={match}
                                            teamAColor={teamAColor}
                                            teamBColor={teamBColor}
                                            teamAName={teamAName}
                                            teamBName={teamBName}
                                            onChange={handleProjectionChange}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Info Note */}
                        <div
                            className="flex items-start gap-2 p-3 rounded-lg text-xs"
                            style={{ background: 'rgba(0, 103, 71, 0.1)', color: 'var(--masters)' }}
                        >
                            <Info size={14} className="flex-shrink-0 mt-0.5" />
                            <span>
                                Tap the outcome buttons to project different scenarios.
                                Locked matches (closed out) cannot be changed.
                                Probabilities are based on current match state.
                            </span>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default PointsCalculator;
