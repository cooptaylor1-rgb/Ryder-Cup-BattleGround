/**
 * SessionCloner Component — Phase 2: Captain Empowerment
 *
 * Quick session duplication with modifications:
 * - Clone existing session lineups
 * - Swap players between teams
 * - Adjust pairings
 * - Schedule for different time
 * - Preview changes before creating
 *
 * Speeds up multi-day tournament setup.
 */

'use client';

import { useState, useMemo } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Copy,
    Calendar,
    Clock,
    ArrowRight,
    RefreshCw,
    CheckCircle2,
    ChevronRight,
    Shuffle,
    UserMinus,
    UserPlus,
    X,
    Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/lib/hooks';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('SessionCloner');

// ============================================
// TYPES
// ============================================

export interface SessionPlayer {
    id: string;
    name: string;
    handicap: number;
    team: 'teamA' | 'teamB';
    avatarUrl?: string;
}

export interface SessionMatch {
    id: string;
    matchNumber: number;
    teamAPlayerIds: string[];
    teamBPlayerIds: string[];
}

export interface SessionTemplate {
    id: string;
    name: string;
    type: 'foursomes' | 'fourball' | 'singles';
    date: string;
    startTime?: string;
    matches: SessionMatch[];
    players: SessionPlayer[];
    teamAName: string;
    teamBName: string;
    teamAColor: string;
    teamBColor: string;
}

export interface CloneOptions {
    newName: string;
    newDate: string;
    newStartTime?: string;
    shufflePairings: boolean;
    swapTeams: boolean;
    excludedPlayerIds: string[];
    replacements: Record<string, string>; // oldPlayerId -> newPlayerId
}

interface SessionClonerProps {
    sourceSession: SessionTemplate;
    availablePlayers: SessionPlayer[];
    onClone: (options: CloneOptions) => Promise<void>;
    onCancel: () => void;
    className?: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function _getPlayersPerTeam(type: SessionTemplate['type']): number {
    switch (type) {
        case 'foursomes': return 2;
        case 'fourball': return 2;
        case 'singles': return 1;
    }
}

function formatDate(isoString: string): string {
    return new Date(isoString).toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
    });
}

function getDefaultNewDate(): string {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
}

// ============================================
// PLAYER SWAP CARD
// ============================================

interface PlayerSwapCardProps {
    player: SessionPlayer;
    isExcluded: boolean;
    replacement?: SessionPlayer;
    onToggleExclude: () => void;
    onSelectReplacement: () => void;
    teamColor: string;
}

function PlayerSwapCard({
    player,
    isExcluded,
    replacement,
    onToggleExclude,
    onSelectReplacement,
    teamColor,
}: PlayerSwapCardProps) {
    const haptic = useHaptic();

    return (
        <div
            className={cn(
                'p-3 rounded-lg transition-all',
                isExcluded && 'opacity-50'
            )}
            style={{
                background: 'var(--surface)',
                borderLeft: `3px solid ${teamColor}`,
            }}
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {player.avatarUrl ? (
                        <Image
                            src={player.avatarUrl}
                            alt={player.name}
                            width={32}
                            height={32}
                            className="w-8 h-8 rounded-full object-cover"
                        />
                    ) : (
                        <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white"
                            style={{ background: teamColor }}
                        >
                            {player.name.charAt(0)}
                        </div>
                    )}
                    <div>
                        <p
                            className={cn(
                                'text-sm font-medium text-[var(--ink-primary)]',
                                isExcluded && 'line-through'
                            )}
                        >
                            {player.name}
                        </p>
                        <p className="text-[10px] text-[var(--ink-tertiary)]">
                            {player.handicap} HCP
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {replacement && (
                        <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs"
                            style={{ background: `${teamColor}20`, color: teamColor }}
                        >
                            <ArrowRight size={10} />
                            {replacement.name.split(' ')[0]}
                        </div>
                    )}

                    <button
                        onClick={() => { haptic.tap(); onToggleExclude(); }}
                        className={cn(
                            'p-1.5 rounded-lg transition-colors',
                            isExcluded
                                ? 'bg-[color:var(--success)]/12 text-[var(--success)] hover:bg-[color:var(--success)]/18'
                                : 'bg-[color:var(--error)]/10 text-[var(--error)] hover:bg-[color:var(--error)]/15'
                        )}
                    >
                        {isExcluded ? (
                            <UserPlus className="h-3.5 w-3.5" />
                        ) : (
                            <UserMinus className="h-3.5 w-3.5" />
                        )}
                    </button>

                    {!isExcluded && (
                        <button
                            onClick={() => { haptic.tap(); onSelectReplacement(); }}
                            className="p-1.5 rounded-lg bg-[var(--rule)] text-[var(--ink-secondary)]"
                        >
                            <Shuffle className="h-3.5 w-3.5" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

// ============================================
// MATCH PREVIEW CARD
// ============================================

interface MatchPreviewCardProps {
    matchNumber: number;
    teamAPlayers: SessionPlayer[];
    teamBPlayers: SessionPlayer[];
    teamAColor: string;
    teamBColor: string;
    isModified: boolean;
}

function MatchPreviewCard({
    matchNumber,
    teamAPlayers,
    teamBPlayers,
    teamAColor,
    teamBColor,
    isModified,
}: MatchPreviewCardProps) {
    return (
        <div
            className={cn(
                'p-3 rounded-lg',
                isModified && 'ring-2 ring-offset-2'
            )}
            style={{
                background: 'var(--surface)',
                ['--tw-ring-color' as string]: '#F59E0B',
            }}
        >
            <div className="flex items-center gap-2 mb-2">
                <div
                    className="w-6 h-6 rounded flex items-center justify-center text-xs font-bold"
                    style={{ background: 'var(--rule)', color: 'var(--ink-secondary)' }}
                >
                    {matchNumber}
                </div>
                {isModified && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium"
                        style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}
                    >
                        Modified
                    </span>
                )}
            </div>

            <div className="flex items-center gap-2">
                {/* Team A */}
                <div className="flex-1">
                    {teamAPlayers.map((p) => (
                        <div key={p.id} className="flex items-center gap-1.5 mb-1">
                            <div className="w-2 h-2 rounded-full" style={{ background: teamAColor }} />
                            <span className="text-xs truncate" style={{ color: 'var(--ink)' }}>
                                {p.name}
                            </span>
                        </div>
                    ))}
                </div>

                <span className="text-xs font-bold" style={{ color: 'var(--ink-tertiary)' }}>VS</span>

                {/* Team B */}
                <div className="flex-1 text-right">
                    {teamBPlayers.map((p) => (
                        <div key={p.id} className="flex items-center justify-end gap-1.5 mb-1">
                            <span className="text-xs truncate" style={{ color: 'var(--ink)' }}>
                                {p.name}
                            </span>
                            <div className="w-2 h-2 rounded-full" style={{ background: teamBColor }} />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

// ============================================
// PLAYER PICKER MODAL
// ============================================

interface PlayerPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    players: SessionPlayer[];
    currentPlayerId: string;
    onSelect: (playerId: string) => void;
    teamColor: string;
    teamName: string;
}

function PlayerPickerModal({
    isOpen,
    onClose,
    players,
    currentPlayerId,
    onSelect,
    teamColor,
    teamName,
}: PlayerPickerModalProps) {
    const haptic = useHaptic();

    if (!isOpen) return null;

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 z-50"
                onClick={onClose}
            />
            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 50 }}
                className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl max-h-[60vh] overflow-hidden"
                style={{ background: 'var(--bg)' }}
            >
                <div className="p-4 border-b" style={{ borderColor: 'var(--rule)' }}>
                    <div className="flex items-center justify-between">
                        <h3 className="font-semibold" style={{ color: 'var(--ink)' }}>
                            Select Replacement
                        </h3>
                        <button onClick={onClose} className="p-1.5 rounded-lg">
                            <X size={18} style={{ color: 'var(--ink-secondary)' }} />
                        </button>
                    </div>
                </div>
                <div className="p-4 overflow-y-auto max-h-[50vh] space-y-2">
                    {players.map((p) => (
                        <button
                            key={p.id}
                            onClick={() => {
                                haptic.press();
                                onSelect(p.id);
                                onClose();
                            }}
                            disabled={p.id === currentPlayerId}
                            className={cn(
                                'w-full flex items-center gap-3 p-3 rounded-lg text-left',
                                p.id === currentPlayerId && 'opacity-50'
                            )}
                            style={{ background: 'var(--surface)' }}
                        >
                            <div
                                className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                                style={{ background: teamColor }}
                            >
                                {p.name.charAt(0)}
                            </div>
                            <div className="flex-1">
                                <p className="font-medium" style={{ color: 'var(--ink)' }}>
                                    {p.name}
                                </p>
                                <p className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
                                    {p.handicap} HCP • {teamName}
                                </p>
                            </div>
                            {p.id === currentPlayerId && (
                                <span className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>Current</span>
                            )}
                        </button>
                    ))}
                </div>
            </motion.div>
        </>
    );
}

// ============================================
// MAIN SESSION CLONER
// ============================================

export function SessionCloner({
    sourceSession,
    availablePlayers,
    onClone,
    onCancel,
    className,
}: SessionClonerProps) {
    const haptic = useHaptic();

    // State
    const [step, setStep] = useState<'options' | 'players' | 'preview'>('options');
    const [newName, setNewName] = useState(`${sourceSession.name} (Copy)`);
    const [newDate, setNewDate] = useState(getDefaultNewDate());
    const [newStartTime, setNewStartTime] = useState(sourceSession.startTime || '08:00');
    const [shufflePairings, _setShufflePairings] = useState(false);
    const [swapTeams, setSwapTeams] = useState(false);
    const [excludedPlayerIds, setExcludedPlayerIds] = useState<Set<string>>(new Set());
    const [replacements, setReplacements] = useState<Record<string, string>>({});
    const [isCloning, setIsCloning] = useState(false);
    const [pickerPlayerId, setPickerPlayerId] = useState<string | null>(null);

    // Compute preview matches
    const previewMatches = useMemo(() => {
        const playerMap = new Map<string, SessionPlayer>();
        for (const p of sourceSession.players) {
            playerMap.set(p.id, p);
        }
        for (const p of availablePlayers) {
            playerMap.set(p.id, p);
        }

        return sourceSession.matches.map((match) => {
            let teamAIds = [...match.teamAPlayerIds];
            let teamBIds = [...match.teamBPlayerIds];

            // Apply replacements
            teamAIds = teamAIds.map(id => replacements[id] || id);
            teamBIds = teamBIds.map(id => replacements[id] || id);

            // Remove excluded
            teamAIds = teamAIds.filter(id => !excludedPlayerIds.has(id));
            teamBIds = teamBIds.filter(id => !excludedPlayerIds.has(id));

            // Swap teams if option selected
            if (swapTeams) {
                [teamAIds, teamBIds] = [teamBIds, teamAIds];
            }

            const teamAPlayers = teamAIds.map(id => playerMap.get(id)).filter(Boolean) as SessionPlayer[];
            const teamBPlayers = teamBIds.map(id => playerMap.get(id)).filter(Boolean) as SessionPlayer[];

            const isModified =
                teamAIds.join(',') !== match.teamAPlayerIds.join(',') ||
                teamBIds.join(',') !== match.teamBPlayerIds.join(',') ||
                swapTeams;

            return {
                matchNumber: match.matchNumber,
                teamAPlayers,
                teamBPlayers,
                isModified,
            };
        });
    }, [sourceSession, availablePlayers, replacements, excludedPlayerIds, swapTeams]);

    const handleToggleExclude = (playerId: string) => {
        setExcludedPlayerIds((prev) => {
            const next = new Set(prev);
            if (next.has(playerId)) {
                next.delete(playerId);
            } else {
                next.add(playerId);
            }
            return next;
        });
    };

    const handleSelectReplacement = (playerId: string, replacementId: string) => {
        setReplacements((prev) => ({
            ...prev,
            [playerId]: replacementId,
        }));
    };

    const handleClone = async () => {
        haptic.impact();
        setIsCloning(true);

        try {
            await onClone({
                newName,
                newDate,
                newStartTime,
                shufflePairings,
                swapTeams,
                excludedPlayerIds: Array.from(excludedPlayerIds),
                replacements,
            });
        } catch (error) {
            logger.error('Clone failed:', error);
            haptic.error();
        } finally {
            setIsCloning(false);
        }
    };

    const canProceed = newName.trim().length > 0 && newDate.length > 0;
    const modifiedCount = previewMatches.filter(m => m.isModified).length;

    return (
        <div className={cn('space-y-4', className)}>
            {/* Header */}
            <div className="flex items-center gap-2">
                <Copy size={20} style={{ color: 'var(--masters)' }} />
                <h2 className="text-xl font-bold" style={{ color: 'var(--ink)' }}>
                    Clone Session
                </h2>
            </div>

            {/* Source Info */}
            <div className="p-3 rounded-lg flex items-center gap-3" style={{ background: 'var(--surface)' }}>
                <Zap size={16} style={{ color: 'var(--masters)' }} />
                <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
                        {sourceSession.name}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
                        {sourceSession.type} • {sourceSession.matches.length} matches • {formatDate(sourceSession.date)}
                    </p>
                </div>
            </div>

            {/* Step: Options */}
            {step === 'options' && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                >
                    {/* Name */}
                    <div>
                        <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--ink)' }}>
                            Session Name
                        </label>
                        <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="w-full p-3 rounded-lg"
                            style={{
                                background: 'var(--surface)',
                                border: '1px solid var(--rule)',
                                color: 'var(--ink)',
                            }}
                        />
                    </div>

                    {/* Date & Time */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--ink)' }}>
                                <Calendar size={14} className="inline mr-1" />
                                Date
                            </label>
                            <input
                                type="date"
                                value={newDate}
                                onChange={(e) => setNewDate(e.target.value)}
                                className="w-full p-3 rounded-lg"
                                style={{
                                    background: 'var(--surface)',
                                    border: '1px solid var(--rule)',
                                    color: 'var(--ink)',
                                }}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium mb-2 block" style={{ color: 'var(--ink)' }}>
                                <Clock size={14} className="inline mr-1" />
                                Start Time
                            </label>
                            <input
                                type="time"
                                value={newStartTime}
                                onChange={(e) => setNewStartTime(e.target.value)}
                                className="w-full p-3 rounded-lg"
                                style={{
                                    background: 'var(--surface)',
                                    border: '1px solid var(--rule)',
                                    color: 'var(--ink)',
                                }}
                            />
                        </div>
                    </div>

                    {/* Quick Options */}
                    <div className="space-y-2">
                        <button
                            onClick={() => { haptic.tap(); setSwapTeams(!swapTeams); }}
                            className="w-full flex items-center justify-between p-3 rounded-lg"
                            style={{ background: swapTeams ? 'rgba(0, 103, 71, 0.1)' : 'var(--surface)' }}
                        >
                            <div className="flex items-center gap-2">
                                <Shuffle size={16} style={{ color: swapTeams ? 'var(--masters)' : 'var(--ink-secondary)' }} />
                                <span className="text-sm" style={{ color: 'var(--ink)' }}>
                                    Swap Teams
                                </span>
                            </div>
                            <div
                                className={cn(
                                    'w-10 h-6 rounded-full p-1 transition-colors',
                                    swapTeams ? 'bg-green-600' : 'bg-gray-300 dark:bg-gray-600'
                                )}
                            >
                                <div
                                    className={cn(
                                        'w-4 h-4 rounded-full bg-white transition-transform',
                                        swapTeams && 'translate-x-4'
                                    )}
                                />
                            </div>
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Step: Players */}
            {step === 'players' && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                >
                    <p className="text-sm" style={{ color: 'var(--ink-secondary)' }}>
                        Adjust player roster for the new session:
                    </p>

                    <div className="space-y-3">
                        {sourceSession.players.map((player) => (
                            <PlayerSwapCard
                                key={player.id}
                                player={player}
                                isExcluded={excludedPlayerIds.has(player.id)}
                                replacement={
                                    replacements[player.id]
                                        ? availablePlayers.find(p => p.id === replacements[player.id])
                                        : undefined
                                }
                                onToggleExclude={() => handleToggleExclude(player.id)}
                                onSelectReplacement={() => setPickerPlayerId(player.id)}
                                teamColor={player.team === 'teamA' ? sourceSession.teamAColor : sourceSession.teamBColor}
                            />
                        ))}
                    </div>

                    {/* Summary */}
                    <div className="p-3 rounded-lg" style={{ background: 'var(--surface)' }}>
                        <div className="flex items-center justify-between text-sm">
                            <span style={{ color: 'var(--ink-secondary)' }}>Excluded</span>
                            <span className="font-semibold" style={{ color: excludedPlayerIds.size > 0 ? '#EF4444' : 'var(--ink)' }}>
                                {excludedPlayerIds.size} players
                            </span>
                        </div>
                        <div className="flex items-center justify-between text-sm mt-1">
                            <span style={{ color: 'var(--ink-secondary)' }}>Replacements</span>
                            <span className="font-semibold" style={{ color: Object.keys(replacements).length > 0 ? '#F59E0B' : 'var(--ink)' }}>
                                {Object.keys(replacements).length} swaps
                            </span>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Step: Preview */}
            {step === 'preview' && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-4"
                >
                    <div className="flex items-center justify-between">
                        <p className="text-sm" style={{ color: 'var(--ink-secondary)' }}>
                            Preview cloned session:
                        </p>
                        {modifiedCount > 0 && (
                            <span className="text-xs px-2 py-1 rounded-full"
                                style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#F59E0B' }}
                            >
                                {modifiedCount} modified
                            </span>
                        )}
                    </div>

                    <div className="space-y-3 max-h-[40vh] overflow-y-auto">
                        {previewMatches.map((match) => (
                            <MatchPreviewCard
                                key={match.matchNumber}
                                matchNumber={match.matchNumber}
                                teamAPlayers={match.teamAPlayers}
                                teamBPlayers={match.teamBPlayers}
                                teamAColor={swapTeams ? sourceSession.teamBColor : sourceSession.teamAColor}
                                teamBColor={swapTeams ? sourceSession.teamAColor : sourceSession.teamBColor}
                                isModified={match.isModified}
                            />
                        ))}
                    </div>

                    {/* Clone Summary */}
                    <div
                        className="p-4 rounded-lg"
                        style={{ background: 'rgba(0, 103, 71, 0.1)' }}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 size={16} style={{ color: 'var(--masters)' }} />
                            <span className="font-semibold" style={{ color: 'var(--masters)' }}>
                                Ready to Clone
                            </span>
                        </div>
                        <ul className="text-xs space-y-1" style={{ color: 'var(--ink-secondary)' }}>
                            <li>• Name: {newName}</li>
                            <li>• Date: {formatDate(newDate)}</li>
                            <li>• Time: {newStartTime}</li>
                            <li>• Matches: {previewMatches.length}</li>
                        </ul>
                    </div>
                </motion.div>
            )}

            {/* Navigation */}
            <div className="flex items-center gap-3 pt-4 border-t" style={{ borderColor: 'var(--rule)' }}>
                {step !== 'options' && (
                    <button
                        onClick={() => {
                            haptic.tap();
                            if (step === 'preview') setStep('players');
                            else if (step === 'players') setStep('options');
                        }}
                        className="px-4 py-2 rounded-lg text-sm font-medium"
                        style={{ background: 'var(--surface)', color: 'var(--ink-secondary)' }}
                    >
                        Back
                    </button>
                )}

                <div className="flex-1" />

                <button
                    onClick={onCancel}
                    className="px-4 py-2 rounded-lg text-sm font-medium"
                    style={{ color: 'var(--ink-secondary)' }}
                >
                    Cancel
                </button>

                {step === 'options' && (
                    <button
                        onClick={() => { haptic.press(); setStep('players'); }}
                        disabled={!canProceed}
                        className={cn(
                            'px-6 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-2',
                            !canProceed && 'opacity-50'
                        )}
                        style={{ background: 'var(--masters)' }}
                    >
                        Next: Players
                        <ChevronRight size={14} />
                    </button>
                )}

                {step === 'players' && (
                    <button
                        onClick={() => { haptic.press(); setStep('preview'); }}
                        className="px-6 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-2"
                        style={{ background: 'var(--masters)' }}
                    >
                        Preview
                        <ChevronRight size={14} />
                    </button>
                )}

                {step === 'preview' && (
                    <button
                        onClick={handleClone}
                        disabled={isCloning}
                        className={cn(
                            'px-6 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-2',
                            isCloning && 'opacity-70'
                        )}
                        style={{ background: 'var(--masters)' }}
                    >
                        {isCloning ? (
                            <>
                                <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{ duration: 1, repeat: Infinity }}
                                >
                                    <RefreshCw size={14} />
                                </motion.div>
                                Creating...
                            </>
                        ) : (
                            <>
                                <Copy size={14} />
                                Create Clone
                            </>
                        )}
                    </button>
                )}
            </div>

            {/* Player Picker Modal */}
            <AnimatePresence>
                {pickerPlayerId && (
                    <PlayerPickerModal
                        isOpen={true}
                        onClose={() => setPickerPlayerId(null)}
                        players={availablePlayers.filter(p => {
                            const original = sourceSession.players.find(o => o.id === pickerPlayerId);
                            return original && p.team === original.team;
                        })}
                        currentPlayerId={pickerPlayerId}
                        onSelect={(id) => handleSelectReplacement(pickerPlayerId, id)}
                        teamColor={
                            sourceSession.players.find(p => p.id === pickerPlayerId)?.team === 'teamA'
                                ? sourceSession.teamAColor
                                : sourceSession.teamBColor
                        }
                        teamName={
                            sourceSession.players.find(p => p.id === pickerPlayerId)?.team === 'teamA'
                                ? sourceSession.teamAName
                                : sourceSession.teamBName
                        }
                    />
                )}
            </AnimatePresence>
        </div>
    );
}

export default SessionCloner;
