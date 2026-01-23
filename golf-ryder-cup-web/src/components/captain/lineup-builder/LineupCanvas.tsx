/**
 * LineupCanvas Component — Phase 2: Captain Empowerment
 *
 * Full-page drag-and-drop interface for creating match lineups:
 * - Available players pool (by team)
 * - Match slots with drop zones
 * - Auto-balance optimization
 * - Real-time fairness feedback
 * - Save/publish workflow
 *
 * Uses @dnd-kit for accessibility-first drag and drop.
 */

'use client';

import { useState, useCallback, useMemo } from 'react';
import {
    DndContext,
    DragOverlay,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragStartEvent,
    type DragEndEvent,
    type DragOverEvent,
} from '@dnd-kit/core';
import {
    sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users,
    Save,
    Lock,
    AlertTriangle,
    CheckCircle2,
    ChevronDown,
    Scale,
    Wand2,
    RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/lib/hooks';
import {
    DraggablePlayerCard,
    PlayerCard,
    type PlayerCardData,
} from './PlayerCard';
import { MatchSlot, type MatchSlotData } from './MatchSlot';

// ============================================
// TYPES
// ============================================

export interface SessionConfig {
    id: string;
    name: string;
    type: 'foursomes' | 'fourball' | 'singles';
    playersPerTeam: 1 | 2;
    matchCount: number;
    pointsPerMatch: number;
}

export interface FairnessScore {
    overall: number; // 0-100
    handicapBalance: number;
    experienceBalance: number;
    warnings: string[];
}

interface LineupCanvasProps {
    session: SessionConfig;
    teamAPlayers: PlayerCardData[];
    teamBPlayers: PlayerCardData[];
    teamAColor?: string;
    teamBColor?: string;
    teamAName?: string;
    teamBName?: string;
    initialMatches?: MatchSlotData[];
    isLocked?: boolean;
    onSave?: (matches: MatchSlotData[]) => void;
    onPublish?: (matches: MatchSlotData[]) => void;
    onAutoBalance?: (players: PlayerCardData[], matches: MatchSlotData[]) => MatchSlotData[];
    calculateFairness?: (matches: MatchSlotData[]) => FairnessScore;
    className?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function createEmptyMatches(count: number): MatchSlotData[] {
    return Array.from({ length: count }, (_, i) => ({
        id: `match-${i + 1}`,
        matchNumber: i + 1,
        teamAPlayers: [],
        teamBPlayers: [],
    }));
}

function getAssignedPlayerIds(matches: MatchSlotData[]): Set<string> {
    const ids = new Set<string>();
    for (const match of matches) {
        match.teamAPlayers.forEach(p => ids.add(p.id));
        match.teamBPlayers.forEach(p => ids.add(p.id));
    }
    return ids;
}

// ============================================
// PLAYER POOL COMPONENT
// ============================================

interface PlayerPoolProps {
    team: 'A' | 'B';
    players: PlayerCardData[];
    teamColor: string;
    teamName: string;
    isExpanded: boolean;
    onToggle: () => void;
    isLocked?: boolean;
}

function PlayerPool({
    _team,
    players,
    teamColor,
    teamName,
    isExpanded,
    onToggle,
    _isLocked,
}: PlayerPoolProps) {
    return (
        <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--canvas)', border: '1px solid var(--rule)' }}>
            {/* Header */}
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between px-4 py-3 transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
            >
                <div className="flex items-center gap-3">
                    <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center"
                        style={{ background: teamColor }}
                    >
                        <Users size={16} className="text-white" />
                    </div>
                    <div className="text-left">
                        <h3 className="font-semibold" style={{ color: 'var(--ink)' }}>
                            {teamName}
                        </h3>
                        <p className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
                            {players.length} available
                        </p>
                    </div>
                </div>

                <motion.div
                    animate={{ rotate: isExpanded ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                >
                    <ChevronDown size={20} style={{ color: 'var(--ink-tertiary)' }} />
                </motion.div>
            </button>

            {/* Player List */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-3 pb-3 space-y-2 max-h-[300px] overflow-y-auto">
                            {players.length === 0 ? (
                                <p className="text-center py-4 text-sm" style={{ color: 'var(--ink-tertiary)' }}>
                                    All players assigned
                                </p>
                            ) : (
                                players.map((player) => (
                                    <DraggablePlayerCard
                                        key={player.id}
                                        player={player}
                                        teamColor={teamColor}
                                        teamName={teamName}
                                        variant="standard"
                                        showStats
                                    />
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ============================================
// FAIRNESS PANEL
// ============================================

interface FairnessPanelProps {
    score: FairnessScore | null;
    isCalculating?: boolean;
}

function FairnessPanel({ score, isCalculating }: FairnessPanelProps) {
    if (isCalculating) {
        return (
            <div className="p-4 rounded-xl animate-pulse" style={{ background: 'var(--surface)' }}>
                <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-3" />
                <div className="h-8 w-full bg-gray-200 dark:bg-gray-700 rounded" />
            </div>
        );
    }

    if (!score) {
        return (
            <div className="p-4 rounded-xl text-center" style={{ background: 'var(--surface)' }}>
                <Scale size={24} className="mx-auto mb-2" style={{ color: 'var(--ink-tertiary)' }} />
                <p className="text-sm" style={{ color: 'var(--ink-tertiary)' }}>
                    Add players to see fairness score
                </p>
            </div>
        );
    }

    const getScoreColor = (value: number) => {
        if (value >= 80) return '#22C55E';
        if (value >= 60) return '#006747';
        if (value >= 40) return '#F59E0B';
        return '#EF4444';
    };

    const overallColor = getScoreColor(score.overall);

    return (
        <div className="p-4 rounded-xl" style={{ background: 'var(--surface)' }}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Scale size={16} style={{ color: overallColor }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                        Lineup Fairness
                    </span>
                </div>
                <span
                    className="text-2xl font-bold"
                    style={{ color: overallColor }}
                >
                    {score.overall}
                </span>
            </div>

            {/* Score Bars */}
            <div className="space-y-2">
                <div>
                    <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: 'var(--ink-tertiary)' }}>Handicap Balance</span>
                        <span style={{ color: getScoreColor(score.handicapBalance) }}>{score.handicapBalance}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--rule)' }}>
                        <motion.div
                            className="h-full rounded-full"
                            style={{ background: getScoreColor(score.handicapBalance) }}
                            initial={{ width: 0 }}
                            animate={{ width: `${score.handicapBalance}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                        />
                    </div>
                </div>

                <div>
                    <div className="flex justify-between text-xs mb-1">
                        <span style={{ color: 'var(--ink-tertiary)' }}>Experience Balance</span>
                        <span style={{ color: getScoreColor(score.experienceBalance) }}>{score.experienceBalance}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--rule)' }}>
                        <motion.div
                            className="h-full rounded-full"
                            style={{ background: getScoreColor(score.experienceBalance) }}
                            initial={{ width: 0 }}
                            animate={{ width: `${score.experienceBalance}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
                        />
                    </div>
                </div>
            </div>

            {/* Warnings */}
            {score.warnings.length > 0 && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--rule)' }}>
                    {score.warnings.map((warning, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs" style={{ color: '#F59E0B' }}>
                            <AlertTriangle size={12} className="shrink-0 mt-0.5" />
                            <span>{warning}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ============================================
// LINEUP CANVAS MAIN COMPONENT
// ============================================

export function LineupCanvas({
    session,
    teamAPlayers,
    teamBPlayers,
    teamAColor = '#0047AB',
    teamBColor = '#8B0000',
    teamAName = 'Team USA',
    teamBName = 'Team Europe',
    initialMatches,
    isLocked = false,
    onSave,
    onPublish,
    onAutoBalance,
    calculateFairness,
    className,
}: LineupCanvasProps) {
    const haptic = useHaptic();

    // State
    const [matches, setMatches] = useState<MatchSlotData[]>(
        initialMatches || createEmptyMatches(session.matchCount)
    );
    const [activePlayer, setActivePlayer] = useState<PlayerCardData | null>(null);
    const [expandedPool, setExpandedPool] = useState<'A' | 'B' | null>('A');
    const [expandedMatch, setExpandedMatch] = useState<string | null>(matches[0]?.id || null);
    const [hasChanges, setHasChanges] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Sensors for drag
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Computed values
    const assignedIds = useMemo(() => getAssignedPlayerIds(matches), [matches]);

    const availableTeamA = useMemo(
        () => teamAPlayers.filter(p => !assignedIds.has(p.id)),
        [teamAPlayers, assignedIds]
    );

    const availableTeamB = useMemo(
        () => teamBPlayers.filter(p => !assignedIds.has(p.id)),
        [teamBPlayers, assignedIds]
    );

    const fairnessScore = useMemo(
        () => calculateFairness?.(matches) || null,
        [matches, calculateFairness]
    );

    const validation = useMemo(() => {
        const errors: string[] = [];
        const warnings: string[] = [];

        matches.forEach((match, i) => {
            if (match.teamAPlayers.length !== session.playersPerTeam) {
                errors.push(`Match ${i + 1}: Team A needs ${session.playersPerTeam} player(s)`);
            }
            if (match.teamBPlayers.length !== session.playersPerTeam) {
                errors.push(`Match ${i + 1}: Team B needs ${session.playersPerTeam} player(s)`);
            }
        });

        if (fairnessScore?.warnings) {
            warnings.push(...fairnessScore.warnings);
        }

        return { errors, warnings, isValid: errors.length === 0 };
    }, [matches, session.playersPerTeam, fairnessScore]);

    // Drag handlers
    const handleDragStart = useCallback((event: DragStartEvent) => {
        const player = event.active.data.current?.player as PlayerCardData;
        if (player) {
            setActivePlayer(player);
            haptic.select();
        }
    }, [haptic]);

    const handleDragOver = useCallback((event: DragOverEvent) => {
        // Haptic feedback when hovering over valid drop zone
        const overId = event.over?.id as string;
        if (overId?.includes('-team')) {
            haptic.tap();
        }
    }, [haptic]);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        setActivePlayer(null);

        const { active, over } = event;
        if (!over) return;

        const player = active.data.current?.player as PlayerCardData;
        const overData = over.data.current;

        if (!player || !overData) return;

        // Check if dropping on a match slot
        if (overData.type === 'match-slot') {
            const { matchId, team } = overData as { matchId: string; team: 'A' | 'B' };

            // Validate team match
            if (player.team !== team) {
                haptic.error();
                return;
            }

            setMatches(prev => {
                // First remove player from any existing match
                const newMatches = prev.map(match => ({
                    ...match,
                    teamAPlayers: match.teamAPlayers.filter(p => p.id !== player.id),
                    teamBPlayers: match.teamBPlayers.filter(p => p.id !== player.id),
                }));

                // Then add to target match
                return newMatches.map(match => {
                    if (match.id !== matchId) return match;

                    const targetPlayers = team === 'A' ? match.teamAPlayers : match.teamBPlayers;

                    // Check if slot is full
                    if (targetPlayers.length >= session.playersPerTeam) {
                        return match;
                    }

                    if (team === 'A') {
                        return { ...match, teamAPlayers: [...match.teamAPlayers, player] };
                    } else {
                        return { ...match, teamBPlayers: [...match.teamBPlayers, player] };
                    }
                });
            });

            haptic.success();
            setHasChanges(true);
        }
    }, [session.playersPerTeam, haptic]);

    // Action handlers
    const handleRemovePlayer = useCallback((matchId: string, playerId: string, team: 'A' | 'B') => {
        if (isLocked) return;

        setMatches(prev =>
            prev.map(match => {
                if (match.id !== matchId) return match;
                return {
                    ...match,
                    teamAPlayers: team === 'A'
                        ? match.teamAPlayers.filter(p => p.id !== playerId)
                        : match.teamAPlayers,
                    teamBPlayers: team === 'B'
                        ? match.teamBPlayers.filter(p => p.id !== playerId)
                        : match.teamBPlayers,
                };
            })
        );

        haptic.tap();
        setHasChanges(true);
    }, [isLocked, haptic]);

    const handleAutoBalance = useCallback(() => {
        if (isLocked || !onAutoBalance) return;

        const allPlayers = [...teamAPlayers, ...teamBPlayers];
        const optimized = onAutoBalance(allPlayers, matches);
        setMatches(optimized);
        setHasChanges(true);
        haptic.success();
    }, [isLocked, onAutoBalance, teamAPlayers, teamBPlayers, matches, haptic]);

    const handleReset = useCallback(() => {
        if (isLocked) return;

        setMatches(createEmptyMatches(session.matchCount));
        setHasChanges(true);
        haptic.warning();
    }, [isLocked, session.matchCount, haptic]);

    const handleSave = useCallback(async () => {
        setIsSaving(true);
        try {
            await onSave?.(matches);
            setHasChanges(false);
            haptic.success();
        } finally {
            setIsSaving(false);
        }
    }, [matches, onSave, haptic]);

    const handlePublish = useCallback(async () => {
        if (!validation.isValid) return;

        setIsSaving(true);
        try {
            await onPublish?.(matches);
            haptic.success();
        } finally {
            setIsSaving(false);
        }
    }, [matches, validation.isValid, onPublish, haptic]);

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
        >
            <div className={cn('space-y-4', className)}>
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>
                            {session.name}
                        </h2>
                        <p className="text-sm" style={{ color: 'var(--ink-secondary)' }}>
                            {session.type} • {session.matchCount} matches • {session.pointsPerMatch} pts each
                        </p>
                    </div>

                    {isLocked ? (
                        <div
                            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium"
                            style={{ background: 'var(--surface)', color: 'var(--ink-secondary)' }}
                        >
                            <Lock size={14} />
                            Locked
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            {/* Reset Button */}
                            <button
                                onClick={handleReset}
                                className="p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                                title="Clear all"
                            >
                                <RotateCcw size={18} style={{ color: 'var(--ink-secondary)' }} />
                            </button>

                            {/* Auto Balance */}
                            {onAutoBalance && (
                                <button
                                    onClick={handleAutoBalance}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                                    style={{ background: 'var(--surface)', color: 'var(--masters)' }}
                                >
                                    <Wand2 size={16} />
                                    Auto Balance
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Fairness Score */}
                <FairnessPanel score={fairnessScore} />

                {/* Validation Warnings */}
                {(validation.errors.length > 0 || validation.warnings.length > 0) && (
                    <div className="space-y-2">
                        {validation.errors.map((error, i) => (
                            <div
                                key={`error-${i}`}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                                style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#EF4444' }}
                            >
                                <AlertTriangle size={14} />
                                {error}
                            </div>
                        ))}
                        {validation.warnings.map((warning, i) => (
                            <div
                                key={`warning-${i}`}
                                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm"
                                style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}
                            >
                                <AlertTriangle size={14} />
                                {warning}
                            </div>
                        ))}
                    </div>
                )}

                {/* Player Pools */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <PlayerPool
                        team="A"
                        players={availableTeamA}
                        teamColor={teamAColor}
                        teamName={teamAName}
                        isExpanded={expandedPool === 'A'}
                        onToggle={() => setExpandedPool(expandedPool === 'A' ? null : 'A')}
                        isLocked={isLocked}
                    />
                    <PlayerPool
                        team="B"
                        players={availableTeamB}
                        teamColor={teamBColor}
                        teamName={teamBName}
                        isExpanded={expandedPool === 'B'}
                        onToggle={() => setExpandedPool(expandedPool === 'B' ? null : 'B')}
                        isLocked={isLocked}
                    />
                </div>

                {/* Match Slots */}
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--ink-secondary)' }}>
                        Matches
                    </h3>
                    {matches.map((match) => (
                        <MatchSlot
                            key={match.id}
                            match={match}
                            playersPerTeam={session.playersPerTeam}
                            teamAColor={teamAColor}
                            teamBColor={teamBColor}
                            teamAName={teamAName}
                            teamBName={teamBName}
                            isExpanded={expandedMatch === match.id}
                            isLocked={isLocked}
                            onToggleExpand={() => setExpandedMatch(expandedMatch === match.id ? null : match.id)}
                            onRemovePlayer={(playerId, team) => handleRemovePlayer(match.id, playerId, team)}
                        />
                    ))}
                </div>

                {/* Action Buttons */}
                {!isLocked && (
                    <div className="flex gap-3 pt-4 sticky bottom-4">
                        <button
                            onClick={handleSave}
                            disabled={!hasChanges || isSaving}
                            className="flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all"
                            style={{
                                background: hasChanges ? 'var(--surface)' : 'var(--surface)',
                                color: hasChanges ? 'var(--masters)' : 'var(--ink-tertiary)',
                                border: '1px solid var(--rule)',
                                opacity: hasChanges ? 1 : 0.5,
                            }}
                        >
                            <Save size={18} />
                            Save Draft
                        </button>

                        <button
                            onClick={handlePublish}
                            disabled={!validation.isValid || isSaving}
                            className="flex-1 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-all text-white"
                            style={{
                                background: validation.isValid ? 'var(--masters)' : 'var(--ink-tertiary)',
                                opacity: validation.isValid ? 1 : 0.5,
                            }}
                        >
                            {validation.isValid ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
                            Publish Lineup
                        </button>
                    </div>
                )}
            </div>

            {/* Drag Overlay */}
            <DragOverlay>
                {activePlayer && (
                    <PlayerCard
                        player={activePlayer}
                        teamColor={activePlayer.team === 'A' ? teamAColor : teamBColor}
                        teamName={activePlayer.team === 'A' ? teamAName : teamBName}
                        variant="standard"
                        isDragging
                    />
                )}
            </DragOverlay>
        </DndContext>
    );
}

export default LineupCanvas;
