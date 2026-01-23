/**
 * MatchSlot Component — Phase 2: Captain Empowerment
 *
 * Droppable zone for match pairings with:
 * - Visual team columns
 * - Handicap balance indicator
 * - Match fairness feedback
 * - Drag-over highlighting
 * - Player slot management
 *
 * Uses @dnd-kit for accessibility-first drag and drop.
 */

'use client';

import { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Scale,
    AlertTriangle,
    CheckCircle2,
    Trophy,
    Clock,
    ChevronDown,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { PlayerCard, EmptyPlayerSlot, type PlayerCardData } from './PlayerCard';

// ============================================
// TYPES
// ============================================

export interface MatchSlotData {
    id: string;
    matchNumber: number;
    teamAPlayers: PlayerCardData[];
    teamBPlayers: PlayerCardData[];
    teeTime?: string;
    startingHole?: number;
    status?: 'pending' | 'in_progress' | 'completed';
    // Computed fields
    teamAHandicap?: number;
    teamBHandicap?: number;
}

interface MatchSlotProps {
    match: MatchSlotData;
    playersPerTeam: number;
    teamAColor: string;
    teamBColor: string;
    teamAName: string;
    teamBName: string;
    isExpanded?: boolean;
    isLocked?: boolean;
    onToggleExpand?: () => void;
    onRemovePlayer?: (playerId: string, team: 'A' | 'B') => void;
    onSetTeeTime?: (time: string) => void;
    className?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate combined handicap for a team
 */
function calculateTeamHandicap(players: PlayerCardData[]): number {
    if (players.length === 0) return 0;
    const total = players.reduce((sum, p) => sum + p.handicapIndex, 0);
    return Math.round(total * 10) / 10;
}

/**
 * Calculate handicap differential and fairness
 */
function calculateHandicapBalance(teamA: number, teamB: number): {
    diff: number;
    level: 'excellent' | 'good' | 'fair' | 'poor';
    label: string;
} {
    const diff = Math.abs(teamA - teamB);

    if (diff <= 2) {
        return { diff, level: 'excellent', label: 'Well Balanced' };
    } else if (diff <= 5) {
        return { diff, level: 'good', label: 'Good Balance' };
    } else if (diff <= 10) {
        return { diff, level: 'fair', label: 'Fair Balance' };
    } else {
        return { diff, level: 'poor', label: 'Unbalanced' };
    }
}

/**
 * Get balance indicator color
 */
function getBalanceColor(level: 'excellent' | 'good' | 'fair' | 'poor'): string {
    switch (level) {
        case 'excellent': return '#22C55E'; // Green
        case 'good': return '#006747'; // Masters green
        case 'fair': return '#F59E0B'; // Amber
        case 'poor': return '#EF4444'; // Red
    }
}

// ============================================
// DROPPABLE TEAM COLUMN
// ============================================

interface TeamColumnProps {
    team: 'A' | 'B';
    matchId: string;
    players: PlayerCardData[];
    maxPlayers: number;
    teamColor: string;
    teamName: string;
    isLocked?: boolean;
    onRemovePlayer?: (playerId: string) => void;
}

function TeamColumn({
    team,
    matchId,
    players,
    maxPlayers,
    teamColor,
    teamName,
    isLocked,
    onRemovePlayer,
}: TeamColumnProps) {
    const droppableId = `${matchId}-team${team}`;

    const { isOver, setNodeRef } = useDroppable({
        id: droppableId,
        data: {
            type: 'match-slot',
            matchId,
            team,
            acceptsTeam: team,
        },
        disabled: isLocked || players.length >= maxPlayers,
    });

    const emptySlots = maxPlayers - players.length;
    const combinedHandicap = calculateTeamHandicap(players);

    return (
        <div
            ref={setNodeRef}
            className={cn(
                'flex-1 p-3 rounded-xl transition-all min-h-[100px]',
                isOver && 'ring-2 scale-[1.01]'
            )}
            style={{
                background: isOver ? `${teamColor}10` : 'var(--surface)',
                ['--tw-ring-color' as string]: teamColor,
            }}
        >
            {/* Team Header */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                    <div
                        className="w-3 h-3 rounded-full"
                        style={{ background: teamColor }}
                    />
                    <span
                        className="text-xs font-semibold uppercase tracking-wide"
                        style={{ color: teamColor }}
                    >
                        {teamName}
                    </span>
                </div>
                {players.length > 0 && (
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ background: `${teamColor}20`, color: teamColor }}>
                        {combinedHandicap.toFixed(1)} hcp
                    </span>
                )}
            </div>

            {/* Players */}
            <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                    {players.map((player) => (
                        <PlayerCard
                            key={player.id}
                            player={player}
                            teamColor={teamColor}
                            teamName={teamName}
                            variant="compact"
                            onRemove={!isLocked && onRemovePlayer ? () => onRemovePlayer(player.id) : undefined}
                        />
                    ))}
                </AnimatePresence>

                {/* Empty Slots */}
                {!isLocked && Array.from({ length: emptySlots }).map((_, i) => (
                    <EmptyPlayerSlot
                        key={`empty-${i}`}
                        teamColor={teamColor}
                        teamName={teamName}
                        isDropTarget={isOver}
                    />
                ))}
            </div>
        </div>
    );
}

// ============================================
// BALANCE INDICATOR
// ============================================

interface BalanceIndicatorProps {
    teamAHandicap: number;
    teamBHandicap: number;
    teamAColor: string;
    teamBColor: string;
}

function BalanceIndicator({ teamAHandicap, teamBHandicap, teamAColor, teamBColor }: BalanceIndicatorProps) {
    const balance = calculateHandicapBalance(teamAHandicap, teamBHandicap);
    const balanceColor = getBalanceColor(balance.level);

    // Calculate bar widths (normalized to show relative handicaps)
    const maxHcp = Math.max(teamAHandicap, teamBHandicap, 10);
    const teamAWidth = (teamAHandicap / maxHcp) * 100;
    const teamBWidth = (teamBHandicap / maxHcp) * 100;

    return (
        <div className="px-3 py-2 rounded-lg" style={{ background: 'var(--canvas-sunken)' }}>
            {/* Header */}
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                    <Scale size={14} style={{ color: balanceColor }} />
                    <span className="text-xs font-medium" style={{ color: balanceColor }}>
                        {balance.label}
                    </span>
                </div>
                <span className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
                    Δ {balance.diff.toFixed(1)}
                </span>
            </div>

            {/* Balance Bar */}
            <div className="relative h-2 rounded-full overflow-hidden" style={{ background: 'var(--rule)' }}>
                {/* Center line */}
                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/50 z-10" />

                {/* Team A (left side) */}
                <motion.div
                    className="absolute top-0 bottom-0 right-1/2 rounded-l-full"
                    style={{ background: teamAColor }}
                    initial={{ width: 0 }}
                    animate={{ width: `${teamAWidth / 2}%` }}
                    transition={{ type: 'spring', damping: 20 }}
                />

                {/* Team B (right side) */}
                <motion.div
                    className="absolute top-0 bottom-0 left-1/2 rounded-r-full"
                    style={{ background: teamBColor }}
                    initial={{ width: 0 }}
                    animate={{ width: `${teamBWidth / 2}%` }}
                    transition={{ type: 'spring', damping: 20 }}
                />
            </div>

            {/* Handicap Labels */}
            <div className="flex justify-between mt-1 text-[10px]" style={{ color: 'var(--ink-tertiary)' }}>
                <span style={{ color: teamAColor }}>{teamAHandicap.toFixed(1)}</span>
                <span style={{ color: teamBColor }}>{teamBHandicap.toFixed(1)}</span>
            </div>
        </div>
    );
}

// ============================================
// MATCH SLOT COMPONENT
// ============================================

export function MatchSlot({
    match,
    playersPerTeam,
    teamAColor,
    teamBColor,
    teamAName,
    teamBName,
    isExpanded = false,
    isLocked = false,
    onToggleExpand,
    onRemovePlayer,
    _onSetTeeTime,
    className,
}: MatchSlotProps) {
    const teamAHandicap = useMemo(
        () => match.teamAHandicap ?? calculateTeamHandicap(match.teamAPlayers),
        [match.teamAPlayers, match.teamAHandicap]
    );

    const teamBHandicap = useMemo(
        () => match.teamBHandicap ?? calculateTeamHandicap(match.teamBPlayers),
        [match.teamBPlayers, match.teamBHandicap]
    );

    const isComplete = match.teamAPlayers.length === playersPerTeam && match.teamBPlayers.length === playersPerTeam;
    const hasPlayers = match.teamAPlayers.length > 0 || match.teamBPlayers.length > 0;

    // Status indicator
    const statusConfig = useMemo(() => {
        switch (match.status) {
            case 'in_progress':
                return { icon: Clock, color: '#F59E0B', label: 'In Progress' };
            case 'completed':
                return { icon: Trophy, color: '#22C55E', label: 'Completed' };
            default:
                if (isComplete) {
                    return { icon: CheckCircle2, color: '#006747', label: 'Ready' };
                }
                return { icon: AlertTriangle, color: '#F59E0B', label: 'Needs Players' };
        }
    }, [match.status, isComplete]);

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                'rounded-2xl overflow-hidden transition-all',
                isExpanded && 'ring-2 ring-offset-2',
                className
            )}
            style={{
                background: 'var(--canvas)',
                border: '1px solid var(--rule)',
                ['--tw-ring-color' as string]: 'var(--masters)',
            }}
        >
            {/* Match Header */}
            <div
                className="flex items-center justify-between px-4 py-3 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
                onClick={onToggleExpand}
            >
                <div className="flex items-center gap-3">
                    {/* Match Number */}
                    <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-lg"
                        style={{
                            background: isComplete ? 'var(--masters)' : 'var(--surface)',
                            color: isComplete ? 'white' : 'var(--ink)',
                            border: isComplete ? 'none' : '1px solid var(--rule)',
                        }}
                    >
                        {match.matchNumber}
                    </div>

                    <div>
                        <h3 className="font-semibold" style={{ color: 'var(--ink)' }}>
                            Match {match.matchNumber}
                        </h3>
                        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--ink-tertiary)' }}>
                            {match.teeTime && (
                                <span className="flex items-center gap-1">
                                    <Clock size={10} />
                                    {match.teeTime}
                                </span>
                            )}
                            {match.startingHole && (
                                <span>Hole {match.startingHole}</span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    {/* Status Badge */}
                    <div
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                        style={{ background: `${statusConfig.color}20`, color: statusConfig.color }}
                    >
                        <statusConfig.icon size={12} />
                        {statusConfig.label}
                    </div>

                    {/* Expand/Collapse */}
                    <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <ChevronDown size={20} style={{ color: 'var(--ink-tertiary)' }} />
                    </motion.div>
                </div>
            </div>

            {/* Expanded Content */}
            <AnimatePresence>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                    >
                        <div className="px-4 pb-4 space-y-3">
                            {/* Balance Indicator */}
                            {hasPlayers && (
                                <BalanceIndicator
                                    teamAHandicap={teamAHandicap}
                                    teamBHandicap={teamBHandicap}
                                    teamAColor={teamAColor}
                                    teamBColor={teamBColor}
                                />
                            )}

                            {/* Team Columns */}
                            <div className="flex gap-3">
                                <TeamColumn
                                    team="A"
                                    matchId={match.id}
                                    players={match.teamAPlayers}
                                    maxPlayers={playersPerTeam}
                                    teamColor={teamAColor}
                                    teamName={teamAName}
                                    isLocked={isLocked}
                                    onRemovePlayer={onRemovePlayer ? (id) => onRemovePlayer(id, 'A') : undefined}
                                />

                                {/* VS Divider */}
                                <div className="flex flex-col items-center justify-center px-2">
                                    <div
                                        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                                        style={{ background: 'var(--surface)', color: 'var(--ink-secondary)', border: '2px solid var(--rule)' }}
                                    >
                                        VS
                                    </div>
                                </div>

                                <TeamColumn
                                    team="B"
                                    matchId={match.id}
                                    players={match.teamBPlayers}
                                    maxPlayers={playersPerTeam}
                                    teamColor={teamBColor}
                                    teamName={teamBName}
                                    isLocked={isLocked}
                                    onRemovePlayer={onRemovePlayer ? (id) => onRemovePlayer(id, 'B') : undefined}
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Collapsed Preview */}
            {!isExpanded && hasPlayers && (
                <div className="px-4 pb-3">
                    <div className="flex items-center justify-center gap-4 text-sm">
                        {/* Team A Preview */}
                        <div className="flex items-center gap-1.5">
                            {match.teamAPlayers.slice(0, 2).map((p) => (
                                <div
                                    key={p.id}
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                                    style={{ background: teamAColor }}
                                    title={`${p.firstName} ${p.lastName}`}
                                >
                                    {p.firstName.charAt(0)}{p.lastName.charAt(0)}
                                </div>
                            ))}
                            {match.teamAPlayers.length === 0 && (
                                <span className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>—</span>
                            )}
                        </div>

                        <span className="text-xs font-medium" style={{ color: 'var(--ink-tertiary)' }}>vs</span>

                        {/* Team B Preview */}
                        <div className="flex items-center gap-1.5">
                            {match.teamBPlayers.slice(0, 2).map((p) => (
                                <div
                                    key={p.id}
                                    className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                                    style={{ background: teamBColor }}
                                    title={`${p.firstName} ${p.lastName}`}
                                >
                                    {p.firstName.charAt(0)}{p.lastName.charAt(0)}
                                </div>
                            ))}
                            {match.teamBPlayers.length === 0 && (
                                <span className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>—</span>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </motion.div>
    );
}

export default MatchSlot;
