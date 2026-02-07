'use client';

/**
 * Lineup Builder Page (Production Quality)
 *
 * Drag-and-drop interface for building match lineups with:
 * - Visual player cards with handicap display
 * - Auto-fill algorithm with fairness optimization
 * - Real-time fairness scoring
 * - Touch-friendly interactions
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    ArrowLeft,
    Sparkles,
    RotateCcw,
    Save,
    Users,
    AlertTriangle,
    Check,
    ChevronRight,
    Lock,
    GripVertical,
} from 'lucide-react';
import { colors } from '@/lib/design-system/tokens';
import {
    initializeLineupState,
    autoFillLineup,
    calculateFairnessScore,
    saveLineup,
    movePlayerToMatch,
    removePlayerFromMatch,
    clearLineup,
    type LineupState,
    type LineupPlayer,
    type LineupMatch,
    type FairnessScore,
} from '@/lib/services/lineupBuilderService';

import { useTripStore } from '@/lib/stores';
import { BottomNav } from '@/components/layout';
import { EmptyStatePremium, PageLoadingSkeleton } from '@/components/ui';

// Extended type for drag operations
type DraggedPlayer = LineupPlayer & { matchNumber?: number };

// ============================================
// MAIN COMPONENT
// ============================================

export default function LineupBuilderPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const sessionId = searchParams.get('sessionId');
    const { currentTrip: trip } = useTripStore();

    const [lineupState, setLineupState] = useState<LineupState | null>(null);
    const [fairnessScore, setFairnessScore] = useState<FairnessScore | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [draggedPlayer, setDraggedPlayer] = useState<LineupPlayer | null>(null);
    const [dragOverTarget, setDragOverTarget] = useState<{
        matchNumber: number;
        team: 'teamA' | 'teamB';
    } | null>(null);
    const [showFairnessDetails, setShowFairnessDetails] = useState(false);


    // ============================================
    // INITIALIZE
    // ============================================

    useEffect(() => {
        const init = async () => {
            if (!sessionId) {
                setLoading(false);
                return;
            }

            const state = await initializeLineupState(sessionId);
            setLineupState(state);

            if (state && trip) {
                const score = await calculateFairnessScore(state, trip.id);
                setFairnessScore(score);
            }

            setLoading(false);
        };

        init();
    }, [sessionId, trip]);

    // ============================================
    // UPDATE FAIRNESS SCORE
    // ============================================

    const updateFairnessScore = useCallback(
        async (state: LineupState) => {
            if (!trip) return;
            const score = await calculateFairnessScore(state, trip.id);
            setFairnessScore(score);
        },
        [trip]
    );

    // ============================================
    // HANDLERS
    // ============================================

    const handleAutoFill = async () => {
        if (!lineupState || !trip) return;
        setLoading(true);

        const newState = await autoFillLineup(lineupState, trip.id);
        setLineupState(newState);
        await updateFairnessScore(newState);

        setLoading(false);
    };

    const handleClear = () => {
        if (!lineupState) return;
        const newState = clearLineup(lineupState);
        setLineupState(newState);
        updateFairnessScore(newState);
    };

    const handleSave = async () => {
        if (!lineupState || !trip) return;
        setSaving(true);

        const result = await saveLineup(lineupState, trip.id);
        if (result.success) {
            router.back();
        }

        setSaving(false);
    };

    // ============================================
    // DRAG AND DROP
    // ============================================

    const handleDragStart = (player: LineupPlayer, fromMatch?: number) => {
        setDraggedPlayer({ ...player, matchNumber: fromMatch } as DraggedPlayer);
    };

    const handleDragOver = (
        e: React.DragEvent,
        matchNumber: number,
        team: 'teamA' | 'teamB'
    ) => {
        e.preventDefault();
        setDragOverTarget({ matchNumber, team });
    };

    const handleDragLeave = () => {
        setDragOverTarget(null);
    };

    const handleDrop = (matchNumber: number, team: 'teamA' | 'teamB') => {
        if (!draggedPlayer || !lineupState) return;

        let newState = lineupState;

        // If coming from a match, remove from there first
        const fromMatch = (draggedPlayer as DraggedPlayer).matchNumber;
        if (fromMatch !== undefined) {
            newState = removePlayerFromMatch(newState, draggedPlayer.id, fromMatch);
        }

        // Add to new match
        newState = movePlayerToMatch(newState, draggedPlayer.id, matchNumber, team);
        setLineupState(newState);
        updateFairnessScore(newState);

        setDraggedPlayer(null);
        setDragOverTarget(null);
    };

    const handleRemovePlayer = (playerId: string, matchNumber: number) => {
        if (!lineupState) return;
        const newState = removePlayerFromMatch(lineupState, playerId, matchNumber);
        setLineupState(newState);
        updateFairnessScore(newState);
    };

    // ============================================
    // TOUCH SUPPORT
    // ============================================

    const [selectedPlayer, setSelectedPlayer] = useState<{
        player: LineupPlayer;
        fromMatch?: number;
    } | null>(null);

    const handlePlayerTap = (player: LineupPlayer, fromMatch?: number) => {
        if (selectedPlayer?.player.id === player.id) {
            setSelectedPlayer(null);
        } else {
            setSelectedPlayer({ player, fromMatch });
        }
    };

    const handleSlotTap = (matchNumber: number, team: 'teamA' | 'teamB') => {
        if (!selectedPlayer || !lineupState) return;

        let newState = lineupState;

        // If coming from a match, remove from there first
        if (selectedPlayer.fromMatch !== undefined) {
            newState = removePlayerFromMatch(
                newState,
                selectedPlayer.player.id,
                selectedPlayer.fromMatch
            );
        }

        // Add to new match
        newState = movePlayerToMatch(newState, selectedPlayer.player.id, matchNumber, team);
        setLineupState(newState);
        updateFairnessScore(newState);

        setSelectedPlayer(null);
    };

    // ============================================
    // RENDER
    // ============================================

    if (!trip) {
        return (
            <div
                className="min-h-screen pb-nav page-premium-enter texture-grain"
                style={{ background: 'var(--canvas)' }}
            >
                <main className="container-editorial py-12">
                    <EmptyStatePremium
                        illustration="trophy"
                        title="No active trip"
                        description="Start or select a trip to build a lineup."
                        action={{ label: 'Back to Home', onClick: () => router.push('/') }}
                        variant="large"
                    />
                </main>
                <BottomNav />
            </div>
        );
    }

    if (loading) {
        return <PageLoadingSkeleton title="Loading lineup builder…" showBackButton={false} />;
    }

    if (!sessionId || !lineupState) {
        return (
            <div
                className="min-h-screen pb-nav page-premium-enter texture-grain"
                style={{ background: 'var(--canvas)' }}
            >
                <main className="container-editorial py-12">
                    <EmptyStatePremium
                        illustration="calendar"
                        title="No session selected"
                        description="Select a session to build the lineup."
                        action={{ label: 'Go Back', onClick: () => router.back() }}
                        secondaryAction={{ label: 'Back to Home', onClick: () => router.push('/') }}
                        variant="large"
                    />
                </main>
                <BottomNav />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#0A0A0A]">
            {/* Header */}
            <header className="sticky top-0 z-40 bg-[#141414] border-b border-[#2A2A2A] px-4 py-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.back()}
                            className="p-2 -ml-2 hover:bg-[#282828] rounded-lg transition-colors"
                        >
                            <ArrowLeft className="w-5 h-5 text-[#A0A0A0]" />
                        </button>
                        <div>
                            <h1 className="text-lg font-semibold text-white">
                                Lineup Builder
                            </h1>
                            <p className="text-xs text-[#707070]">
                                {lineupState.sessionType} • {lineupState.playersPerMatch}v{lineupState.playersPerMatch}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2 bg-[#004225] text-white rounded-lg flex items-center gap-2 hover:bg-[#2E7D32] transition-colors disabled:opacity-50"
                    >
                        {saving ? (
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                            <Save className="w-4 h-4" />
                        )}
                        Save
                    </button>
                </div>
            </header>

            {/* Fairness Score Banner */}
            {fairnessScore && (
                <div
                    className="mx-4 mt-4 p-4 rounded-xl border cursor-pointer transition-colors"
                    style={{
                        backgroundColor:
                            fairnessScore.overall >= 80
                                ? 'rgba(76, 175, 80, 0.1)'
                                : fairnessScore.overall >= 60
                                    ? 'rgba(255, 152, 0, 0.1)'
                                    : 'rgba(239, 83, 80, 0.1)',
                        borderColor:
                            fairnessScore.overall >= 80
                                ? colors.semantic.success
                                : fairnessScore.overall >= 60
                                    ? colors.semantic.warning
                                    : colors.semantic.error,
                    }}
                    onClick={() => setShowFairnessDetails(!showFairnessDetails)}
                >
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div
                                className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg"
                                style={{
                                    backgroundColor:
                                        fairnessScore.overall >= 80
                                            ? colors.semantic.success
                                            : fairnessScore.overall >= 60
                                                ? colors.semantic.warning
                                                : colors.semantic.error,
                                    color: '#FFFFFF',
                                }}
                            >
                                {fairnessScore.overall}
                            </div>
                            <div>
                                <h3 className="font-medium text-white">Fairness Score</h3>
                                <p className="text-sm text-[#A0A0A0]">
                                    {fairnessScore.favoredTeam === 'balanced'
                                        ? 'Well balanced lineup'
                                        : `${fairnessScore.favoredTeam === 'usa' ? 'USA' : 'Europe'} favored by ${fairnessScore.advantageStrokes} strokes`}
                                </p>
                            </div>
                        </div>
                        <ChevronRight
                            className={`w-5 h-5 text-[#707070] transition-transform ${showFairnessDetails ? 'rotate-90' : ''}`}
                        />
                    </div>

                    {showFairnessDetails && (
                        <div className="mt-4 pt-4 border-t border-[#2A2A2A] space-y-3">
                            <ScoreBar label="Handicap Balance" value={fairnessScore.handicapBalance} />
                            <ScoreBar label="Pairing Variety" value={fairnessScore.pairingVariety} />
                            <ScoreBar label="Matchup Balance" value={fairnessScore.matchupBalance} />

                            {fairnessScore.issues.length > 0 && (
                                <div className="mt-4 space-y-2">
                                    {fairnessScore.issues.map((issue, i) => (
                                        <div
                                            key={i}
                                            className="flex items-center gap-2 text-sm"
                                            style={{
                                                color:
                                                    issue.severity === 'high'
                                                        ? colors.semantic.error
                                                        : issue.severity === 'medium'
                                                            ? colors.semantic.warning
                                                            : colors.text.secondary,
                                            }}
                                        >
                                            <AlertTriangle className="w-4 h-4 shrink-0" />
                                            <span>{issue.message}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 px-4 mt-4">
                <button
                    onClick={handleAutoFill}
                    disabled={loading}
                    className="flex-1 py-3 bg-[#141414] border border-[#2A2A2A] rounded-xl flex items-center justify-center gap-2 text-[#FFD54F] hover:bg-[#1A1A1A] transition-colors"
                >
                    <Sparkles className="w-5 h-5" />
                    Auto-Fill
                </button>
                <button
                    onClick={handleClear}
                    className="flex-1 py-3 bg-[#141414] border border-[#2A2A2A] rounded-xl flex items-center justify-center gap-2 text-[#A0A0A0] hover:bg-[#1A1A1A] transition-colors"
                >
                    <RotateCcw className="w-5 h-5" />
                    Clear
                </button>
            </div>

            {/* Selected Player Indicator */}
            {selectedPlayer && (
                <div className="mx-4 mt-4 p-3 bg-[#004225] rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Check className="w-5 h-5 text-white" />
                        <span className="text-white font-medium">
                            {selectedPlayer.player.name} selected
                        </span>
                    </div>
                    <button
                        onClick={() => setSelectedPlayer(null)}
                        className="text-white/70 text-sm"
                    >
                        Cancel
                    </button>
                </div>
            )}

            {/* Match Slots */}
            <div className="p-4 space-y-4">
                {Array.from({
                    length: Math.max(
                        lineupState.matches.length + 1,
                        Math.min(
                            Math.ceil(lineupState.availableTeamA.length / lineupState.playersPerMatch),
                            Math.ceil(lineupState.availableTeamB.length / lineupState.playersPerMatch)
                        ) + lineupState.matches.length
                    ),
                }).map((_, i) => {
                    const matchNumber = i + 1;
                    const match = lineupState.matches.find((m) => m.matchNumber === matchNumber);

                    return (
                        <MatchSlot
                            key={matchNumber}
                            matchNumber={matchNumber}
                            match={match}
                            playersPerMatch={lineupState.playersPerMatch}
                            dragOverTarget={dragOverTarget}
                            selectedPlayer={selectedPlayer}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onRemovePlayer={handleRemovePlayer}
                            onPlayerDragStart={handleDragStart}
                            onPlayerTap={handlePlayerTap}
                            onSlotTap={handleSlotTap}
                        />
                    );
                })}
            </div>

            {/* Available Players */}
            <div className="p-4 pb-24">
                <h3 className="text-sm font-medium text-[#A0A0A0] mb-3">Available Players</h3>
                <div className="grid grid-cols-2 gap-4">
                    {/* Team USA */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium" style={{ color: colors.team.usa.light }}>
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.team.usa.primary }} />
                            USA ({lineupState.availableTeamA.length})
                        </div>
                        <div className="space-y-2">
                            {lineupState.availableTeamA.map((player) => (
                                <PlayerChip
                                    key={player.id}
                                    player={player}
                                    isSelected={selectedPlayer?.player.id === player.id}
                                    onDragStart={() => handleDragStart(player)}
                                    onTap={() => handlePlayerTap(player)}
                                />
                            ))}
                            {lineupState.availableTeamA.length === 0 && (
                                <p className="text-xs text-[#505050] italic">All players assigned</p>
                            )}
                        </div>
                    </div>

                    {/* Team Europe */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium" style={{ color: colors.team.europe.light }}>
                            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: colors.team.europe.primary }} />
                            Europe ({lineupState.availableTeamB.length})
                        </div>
                        <div className="space-y-2">
                            {lineupState.availableTeamB.map((player) => (
                                <PlayerChip
                                    key={player.id}
                                    player={player}
                                    isSelected={selectedPlayer?.player.id === player.id}
                                    onDragStart={() => handleDragStart(player)}
                                    onTap={() => handlePlayerTap(player)}
                                />
                            ))}
                            {lineupState.availableTeamB.length === 0 && (
                                <p className="text-xs text-[#505050] italic">All players assigned</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ============================================
// SUB-COMPONENTS
// ============================================

function ScoreBar({ label, value }: { label: string; value: number }) {
    return (
        <div className="space-y-1">
            <div className="flex items-center justify-between text-sm">
                <span className="text-[#A0A0A0]">{label}</span>
                <span className="text-white font-medium">{value}</span>
            </div>
            <div className="h-1.5 bg-[#282828] rounded-full overflow-hidden">
                <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                        width: `${value}%`,
                        backgroundColor:
                            value >= 80
                                ? colors.semantic.success
                                : value >= 60
                                    ? colors.semantic.warning
                                    : colors.semantic.error,
                    }}
                />
            </div>
        </div>
    );
}

interface MatchSlotProps {
    matchNumber: number;
    match?: LineupMatch;
    playersPerMatch: number;
    dragOverTarget: { matchNumber: number; team: 'teamA' | 'teamB' } | null;
    selectedPlayer: { player: LineupPlayer; fromMatch?: number } | null;
    onDragOver: (e: React.DragEvent, matchNumber: number, team: 'teamA' | 'teamB') => void;
    onDragLeave: () => void;
    onDrop: (matchNumber: number, team: 'teamA' | 'teamB') => void;
    onRemovePlayer: (playerId: string, matchNumber: number) => void;
    onPlayerDragStart: (player: LineupPlayer, fromMatch: number) => void;
    onPlayerTap: (player: LineupPlayer, fromMatch: number) => void;
    onSlotTap: (matchNumber: number, team: 'teamA' | 'teamB') => void;
}

function MatchSlot({
    matchNumber,
    match,
    playersPerMatch,
    dragOverTarget,
    selectedPlayer,
    onDragOver,
    onDragLeave,
    onDrop,
    onRemovePlayer,
    onPlayerDragStart,
    onPlayerTap,
    onSlotTap,
}: MatchSlotProps) {
    const teamAPlayers = match?.teamAPlayers || [];
    const teamBPlayers = match?.teamBPlayers || [];
    const isLocked = match?.locked || false;

    const teamAHandicap = teamAPlayers.reduce((sum, p) => sum + (p.handicap ?? 18), 0);
    const teamBHandicap = teamBPlayers.reduce((sum, p) => sum + (p.handicap ?? 18), 0);
    const handicapDiff = Math.abs(teamAHandicap - teamBHandicap);

    const isTeamADragTarget =
        dragOverTarget?.matchNumber === matchNumber && dragOverTarget?.team === 'teamA';
    const isTeamBDragTarget =
        dragOverTarget?.matchNumber === matchNumber && dragOverTarget?.team === 'teamB';

    const canAddToTeamA = teamAPlayers.length < playersPerMatch && !isLocked;
    const canAddToTeamB = teamBPlayers.length < playersPerMatch && !isLocked;

    return (
        <div className="bg-[#141414] rounded-xl border border-[#2A2A2A] overflow-hidden">
            {/* Match Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-[#1A1A1A] border-b border-[#2A2A2A]">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">Match {matchNumber}</span>
                    {isLocked && (
                        <Lock className="w-3.5 h-3.5 text-[#707070]" />
                    )}
                </div>
                {teamAPlayers.length > 0 && teamBPlayers.length > 0 && (
                    <div
                        className="text-xs px-2 py-0.5 rounded-full"
                        style={{
                            backgroundColor:
                                handicapDiff <= 3
                                    ? 'rgba(76, 175, 80, 0.2)'
                                    : handicapDiff <= 6
                                        ? 'rgba(255, 152, 0, 0.2)'
                                        : 'rgba(239, 83, 80, 0.2)',
                            color:
                                handicapDiff <= 3
                                    ? colors.semantic.success
                                    : handicapDiff <= 6
                                        ? colors.semantic.warning
                                        : colors.semantic.error,
                        }}
                    >
                        Δ {handicapDiff}
                    </div>
                )}
            </div>

            {/* Match Content */}
            <div className="grid grid-cols-2 gap-px bg-[#2A2A2A]">
                {/* Team A Side */}
                <div
                    className={`bg-[#141414] p-3 transition-colors ${isTeamADragTarget ? 'bg-[#1565C0]/20' : ''
                        } ${canAddToTeamA && selectedPlayer?.player.teamColor === 'usa' ? 'ring-2 ring-inset ring-[#1565C0]/50' : ''}`}
                    onDragOver={(e) => canAddToTeamA && onDragOver(e, matchNumber, 'teamA')}
                    onDragLeave={onDragLeave}
                    onDrop={() => canAddToTeamA && onDrop(matchNumber, 'teamA')}
                    onClick={() => {
                        if (canAddToTeamA && selectedPlayer?.player.teamColor === 'usa') {
                            onSlotTap(matchNumber, 'teamA');
                        }
                    }}
                >
                    <div className="space-y-2">
                        {teamAPlayers.map((player) => (
                            <PlayerInMatch
                                key={player.id}
                                player={player}
                                matchNumber={matchNumber}
                                locked={isLocked}
                                onRemove={onRemovePlayer}
                                onDragStart={onPlayerDragStart}
                                onTap={onPlayerTap}
                            />
                        ))}
                        {canAddToTeamA &&
                            Array.from({ length: playersPerMatch - teamAPlayers.length }).map(
                                (_, i) => (
                                    <EmptySlot
                                        key={i}
                                        team="usa"
                                        isDropTarget={isTeamADragTarget}
                                        isSelectTarget={selectedPlayer?.player.teamColor === 'usa'}
                                    />
                                )
                            )}
                    </div>
                </div>

                {/* Team B Side */}
                <div
                    className={`bg-[#141414] p-3 transition-colors ${isTeamBDragTarget ? 'bg-[#C62828]/20' : ''
                        } ${canAddToTeamB && selectedPlayer?.player.teamColor === 'europe' ? 'ring-2 ring-inset ring-[#C62828]/50' : ''}`}
                    onDragOver={(e) => canAddToTeamB && onDragOver(e, matchNumber, 'teamB')}
                    onDragLeave={onDragLeave}
                    onDrop={() => canAddToTeamB && onDrop(matchNumber, 'teamB')}
                    onClick={() => {
                        if (canAddToTeamB && selectedPlayer?.player.teamColor === 'europe') {
                            onSlotTap(matchNumber, 'teamB');
                        }
                    }}
                >
                    <div className="space-y-2">
                        {teamBPlayers.map((player) => (
                            <PlayerInMatch
                                key={player.id}
                                player={player}
                                matchNumber={matchNumber}
                                locked={isLocked}
                                onRemove={onRemovePlayer}
                                onDragStart={onPlayerDragStart}
                                onTap={onPlayerTap}
                            />
                        ))}
                        {canAddToTeamB &&
                            Array.from({ length: playersPerMatch - teamBPlayers.length }).map(
                                (_, i) => (
                                    <EmptySlot
                                        key={i}
                                        team="europe"
                                        isDropTarget={isTeamBDragTarget}
                                        isSelectTarget={selectedPlayer?.player.teamColor === 'europe'}
                                    />
                                )
                            )}
                    </div>
                </div>
            </div>
        </div>
    );
}

interface PlayerChipProps {
    player: LineupPlayer;
    isSelected: boolean;
    onDragStart: () => void;
    onTap: () => void;
}

function PlayerChip({ player, isSelected, onDragStart, onTap }: PlayerChipProps) {
    const teamColor =
        player.teamColor === 'usa' ? colors.team.usa.primary : colors.team.europe.primary;

    return (
        <div
            draggable
            onDragStart={onDragStart}
            onClick={onTap}
            className={`p-3 rounded-lg cursor-grab active:cursor-grabbing transition-all select-none ${isSelected ? 'ring-2 ring-[#FFD54F] ring-offset-1 ring-offset-[#0A0A0A]' : ''
                }`}
            style={{
                backgroundColor: `${teamColor}20`,
                borderLeft: `3px solid ${teamColor}`,
            }}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <GripVertical className="w-4 h-4 text-[#505050]" />
                    <span className="text-sm font-medium text-white">{player.firstName}</span>
                </div>
                <span className="text-xs font-mono text-[#A0A0A0]">
                    {player.handicap !== null ? player.handicap.toFixed(1) : '-'}
                </span>
            </div>
        </div>
    );
}

interface PlayerInMatchProps {
    player: LineupPlayer;
    matchNumber: number;
    locked: boolean;
    onRemove: (playerId: string, matchNumber: number) => void;
    onDragStart: (player: LineupPlayer, fromMatch: number) => void;
    onTap: (player: LineupPlayer, fromMatch: number) => void;
}

function PlayerInMatch({
    player,
    matchNumber,
    locked,
    onRemove,
    onDragStart,
    onTap,
}: PlayerInMatchProps) {
    const teamColor =
        player.teamColor === 'usa' ? colors.team.usa.primary : colors.team.europe.primary;

    return (
        <div
            draggable={!locked}
            onDragStart={() => !locked && onDragStart(player, matchNumber)}
            onClick={(e) => {
                e.stopPropagation();
                if (!locked) onTap(player, matchNumber);
            }}
            className={`p-2 rounded-lg transition-colors select-none ${locked ? 'opacity-75' : 'cursor-grab active:cursor-grabbing hover:bg-[#282828]'
                }`}
            style={{
                backgroundColor: `${teamColor}20`,
            }}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {!locked && <GripVertical className="w-3.5 h-3.5 text-[#505050]" />}
                    <span className="text-sm font-medium text-white">{player.firstName}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-[#A0A0A0]">
                        {player.handicap !== null ? player.handicap.toFixed(1) : '-'}
                    </span>
                    {!locked && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemove(player.id, matchNumber);
                            }}
                            className="p-1 hover:bg-[#3A3A3A] rounded transition-colors"
                        >
                            <span className="text-xs text-[#707070]">×</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

interface EmptySlotProps {
    team: 'usa' | 'europe';
    isDropTarget: boolean;
    isSelectTarget: boolean;
}

function EmptySlot({ isDropTarget, isSelectTarget }: EmptySlotProps) {
    return (
        <div
            className={`p-3 rounded-lg border-2 border-dashed transition-colors ${isDropTarget || isSelectTarget
                ? 'border-[#FFD54F] bg-[#FFD54F]/10'
                : 'border-[#3A3A3A]'
                }`}
        >
            <div className="flex items-center justify-center gap-2 text-[#505050]">
                <Users className="w-4 h-4" />
                <span className="text-xs">Drop player here</span>
            </div>
        </div>
    );
}
