'use client';

import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
    Upload,
    UserPlus,
    X,
    GripVertical,
    Edit2,
    Check,
    AlertCircle,
    Download,
    Trash2,
    Users,
    RefreshCw,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface PlayerInfo {
    id: string;
    name: string;
    handicap?: number;
    email?: string;
    phone?: string;
    team: 'A' | 'B' | null;
}

interface PlayerRosterImportProps {
    players: PlayerInfo[];
    onPlayersChange: (players: PlayerInfo[]) => void;
    teamAName?: string;
    teamBName?: string;
    playersPerTeam?: number;
    className?: string;
}

const generatePlayerId = () => `player-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const SAMPLE_ROSTER = `Name,Handicap,Email
John Smith,12,john@example.com
Mike Johnson,8,mike@example.com
Tom Wilson,15,tom@example.com
Chris Brown,6,chris@example.com
Dave Miller,10,dave@example.com
Jim Davis,18,jim@example.com
Bob Taylor,14,bob@example.com
Sam Anderson,9,sam@example.com`;

export function PlayerRosterImport({
    players,
    onPlayersChange,
    teamAName = 'Team A',
    teamBName = 'Team B',
    playersPerTeam: _playersPerTeam = 8,
    className,
}: PlayerRosterImportProps) {
    const [showImportModal, setShowImportModal] = useState(false);
    const [importText, setImportText] = useState('');
    const [importError, setImportError] = useState<string | null>(null);
    const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'all' | 'teamA' | 'teamB'>('all');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const addPlayer = useCallback((team: PlayerInfo['team'] = null) => {
        const newPlayer: PlayerInfo = {
            id: generatePlayerId(),
            name: '',
            handicap: undefined,
            team,
        };
        onPlayersChange([...players, newPlayer]);
        setEditingPlayer(newPlayer.id);
    }, [players, onPlayersChange]);

    const updatePlayer = useCallback((playerId: string, updates: Partial<PlayerInfo>) => {
        onPlayersChange(players.map(p =>
            p.id === playerId ? { ...p, ...updates } : p
        ));
    }, [players, onPlayersChange]);

    const removePlayer = useCallback((playerId: string) => {
        onPlayersChange(players.filter(p => p.id !== playerId));
    }, [players, onPlayersChange]);

    const assignToTeam = useCallback((playerId: string, team: PlayerInfo['team']) => {
        updatePlayer(playerId, { team });
    }, [updatePlayer]);

    const autoAssignTeams = useCallback(() => {
        // Sort by handicap and alternate assignment
        const sortedPlayers = [...players].sort((a, b) =>
            (a.handicap || 99) - (b.handicap || 99)
        );

        const newPlayers = sortedPlayers.map((player, index) => ({
            ...player,
            team: (index % 2 === 0 ? 'A' : 'B') as PlayerInfo['team'],
        }));

        onPlayersChange(newPlayers);
    }, [players, onPlayersChange]);

    const clearAllPlayers = useCallback(() => {
        onPlayersChange([]);
    }, [onPlayersChange]);

    const parseImport = useCallback(() => {
        setImportError(null);

        if (!importText.trim()) {
            setImportError('Please paste player data');
            return;
        }

        const lines = importText.trim().split('\n');
        const newPlayers: PlayerInfo[] = [];

        // Check if first line is header
        const firstLine = lines[0].toLowerCase();
        const hasHeader = firstLine.includes('name') || firstLine.includes('handicap');
        const dataLines = hasHeader ? lines.slice(1) : lines;

        for (const line of dataLines) {
            const parts = line.split(/[,\t]/).map(p => p.trim());
            if (parts.length === 0 || !parts[0]) continue;

            const player: PlayerInfo = {
                id: generatePlayerId(),
                name: parts[0],
                handicap: parts[1] ? parseFloat(parts[1]) : undefined,
                email: parts[2] || undefined,
                phone: parts[3] || undefined,
                team: null,
            };

            // Validate handicap
            if (player.handicap !== undefined && (isNaN(player.handicap) || player.handicap < 0 || player.handicap > 54)) {
                player.handicap = undefined;
            }

            newPlayers.push(player);
        }

        if (newPlayers.length === 0) {
            setImportError('No valid player data found');
            return;
        }

        onPlayersChange([...players, ...newPlayers]);
        setImportText('');
        setShowImportModal(false);
    }, [importText, players, onPlayersChange]);

    const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            setImportText(text);
        };
        reader.readAsText(file);
    }, []);

    const downloadTemplate = useCallback(() => {
        const blob = new Blob([SAMPLE_ROSTER], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'player_roster_template.csv';
        a.click();
        URL.revokeObjectURL(url);
    }, []);

    // Filter players by tab
    const filteredPlayers = players.filter(p => {
        if (activeTab === 'all') return true;
        if (activeTab === 'teamA') return p.team === 'A';
        if (activeTab === 'teamB') return p.team === 'B';
        return true;
    });

    // Team counts
    const teamACounts = players.filter(p => p.team === 'A').length;
    const teamBCounts = players.filter(p => p.team === 'B').length;
    const unassigned = players.filter(p => p.team === null).length;

    return (
        <div className={cn('space-y-4', className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Users className="w-5 h-5 text-[var(--masters)]" />
                        Player Roster
                    </h3>
                    <p className="text-sm text-[var(--ink-tertiary)]">
                        {players.length} players • {unassigned} unassigned
                    </p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowImportModal(true)}
                        className="btn-secondary text-sm"
                    >
                        <Upload className="w-4 h-4 mr-1" />
                        Import
                    </button>
                    <button
                        onClick={() => addPlayer()}
                        className="btn-primary text-sm"
                    >
                        <UserPlus className="w-4 h-4 mr-1" />
                        Add
                    </button>
                </div>
            </div>

            {/* Team summary */}
            <div className="grid grid-cols-3 gap-2">
                <button
                    onClick={() => setActiveTab('teamA')}
                    className={cn(
                        'p-3 rounded-xl border-2 text-center transition-all',
                        activeTab === 'teamA'
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                            : 'border-[var(--rule)]'
                    )}
                >
                    <p className="text-2xl font-bold text-blue-600">{teamACounts}</p>
                    <p className="text-xs text-[var(--ink-tertiary)] truncate">{teamAName}</p>
                </button>
                <button
                    onClick={() => setActiveTab('all')}
                    className={cn(
                        'p-3 rounded-xl border-2 text-center transition-all',
                        activeTab === 'all'
                            ? 'border-[var(--masters)] bg-[color:var(--masters)]/5'
                            : 'border-[var(--rule)]'
                    )}
                >
                    <p className="text-2xl font-bold">{players.length}</p>
                    <p className="text-xs text-[var(--ink-tertiary)]">Total</p>
                </button>
                <button
                    onClick={() => setActiveTab('teamB')}
                    className={cn(
                        'p-3 rounded-xl border-2 text-center transition-all',
                        activeTab === 'teamB'
                            ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                            : 'border-[var(--rule)]'
                    )}
                >
                    <p className="text-2xl font-bold text-red-600">{teamBCounts}</p>
                    <p className="text-xs text-[var(--ink-tertiary)] truncate">{teamBName}</p>
                </button>
            </div>

            {/* Quick actions */}
            {players.length > 1 && (
                <div className="flex gap-2">
                    <button
                        onClick={autoAssignTeams}
                        className="text-sm text-[var(--masters)] hover:text-[color:var(--masters)]/80 flex items-center gap-1"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Auto-assign by handicap
                    </button>
                    <span className="text-[color:var(--ink-tertiary)]/50">|</span>
                    <button
                        onClick={clearAllPlayers}
                        className="text-sm text-red-500 hover:text-red-600 flex items-center gap-1"
                    >
                        <Trash2 className="w-4 h-4" />
                        Clear all
                    </button>
                </div>
            )}

            {/* Player list */}
            <div className="space-y-2">
                <Reorder.Group
                    axis="y"
                    values={filteredPlayers}
                    onReorder={(newOrder) => {
                        // Merge reordered filtered list with unfiltered players
                        const otherPlayers = players.filter(p => !filteredPlayers.includes(p));
                        onPlayersChange([...newOrder, ...otherPlayers]);
                    }}
                    className="space-y-2"
                >
                    <AnimatePresence mode="popLayout">
                        {filteredPlayers.map(player => (
                            <Reorder.Item
                                key={player.id}
                                value={player}
                                initial={{ opacity: 0, y: -10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="touch-none"
                            >
                                <PlayerCard
                                    player={player}
                                    isEditing={editingPlayer === player.id}
                                    onEdit={() => setEditingPlayer(editingPlayer === player.id ? null : player.id)}
                                    onUpdate={(updates) => updatePlayer(player.id, updates)}
                                    onRemove={() => removePlayer(player.id)}
                                    onAssignTeam={(team) => assignToTeam(player.id, team)}
                                    teamAName={teamAName}
                                    teamBName={teamBName}
                                />
                            </Reorder.Item>
                        ))}
                    </AnimatePresence>
                </Reorder.Group>

                {/* Empty state */}
                {players.length === 0 && (
                    <div className="text-center py-12 px-4">
                        <Users className="w-12 h-12 mx-auto text-[var(--ink-tertiary)] mb-3" />
                        <p className="text-[var(--ink-primary)] font-medium">
                            No players added yet
                        </p>
                        <p className="text-sm text-[var(--ink-tertiary)] mt-1 mb-4">
                            Add players manually or import from a spreadsheet
                        </p>
                        <div className="flex gap-2 justify-center">
                            <button
                                onClick={() => setShowImportModal(true)}
                                className="btn-secondary"
                            >
                                <Upload className="w-4 h-4 mr-1" />
                                Import
                            </button>
                            <button
                                onClick={() => addPlayer()}
                                className="btn-primary"
                            >
                                <UserPlus className="w-4 h-4 mr-1" />
                                Add Player
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Import Modal */}
            <AnimatePresence>
                {showImportModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
                        onClick={() => setShowImportModal(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 100 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 100 }}
                            className="bg-[var(--surface-raised)] rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="p-4 border-b border-[var(--rule)] flex items-center justify-between">
                                <h3 className="font-semibold text-lg">Import Players</h3>
                                <button
                                    onClick={() => setShowImportModal(false)}
                                    className="p-2 hover:bg-[var(--surface-secondary)] rounded-lg"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-4 space-y-4 overflow-y-auto max-h-[60vh]">
                                {/* File upload */}
                                <div>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".csv,.txt"
                                        onChange={handleFileUpload}
                                        className="hidden"
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="w-full p-6 border-2 border-dashed border-[color:var(--rule)]/60 rounded-xl text-center hover:border-[var(--masters)] transition-colors"
                                    >
                                        <Upload className="w-8 h-8 mx-auto mb-2 text-[var(--ink-tertiary)]" />
                                        <p className="font-medium">Upload CSV or TXT file</p>
                                        <p className="text-sm text-[var(--ink-tertiary)]">or paste data below</p>
                                    </button>
                                </div>

                                {/* Text area */}
                                <div>
                                    <label className="text-sm font-medium mb-1.5 block">
                                        Paste player data
                                    </label>
                                    <textarea
                                        value={importText}
                                        onChange={(e) => setImportText(e.target.value)}
                                        placeholder="Name, Handicap, Email (one player per line)"
                                        rows={6}
                                        className="input w-full resize-none font-mono text-sm"
                                    />
                                </div>

                                {/* Error */}
                                {importError && (
                                    <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 flex gap-2">
                                        <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                                        <p className="text-sm text-red-700 dark:text-red-300">{importError}</p>
                                    </div>
                                )}

                                {/* Format help */}
                                <div className="p-3 rounded-xl bg-[var(--surface-secondary)]">
                                    <p className="text-sm font-medium mb-2">Expected format:</p>
                                    <code className="text-xs text-[var(--ink-secondary)] block">
                                        Name, Handicap, Email<br />
                                        John Smith, 12, john@email.com<br />
                                        Jane Doe, 8, jane@email.com
                                    </code>
                                    <button
                                        onClick={downloadTemplate}
                                        className="mt-2 text-sm text-[var(--masters)] hover:text-[color:var(--masters)]/80 flex items-center gap-1"
                                    >
                                        <Download className="w-4 h-4" />
                                        Download template
                                    </button>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-[var(--rule)] flex gap-2">
                                <button
                                    onClick={() => setShowImportModal(false)}
                                    className="btn-secondary flex-1"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={parseImport}
                                    className="btn-primary flex-1"
                                >
                                    Import Players
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// Player Card Component
interface PlayerCardProps {
    player: PlayerInfo;
    isEditing: boolean;
    onEdit: () => void;
    onUpdate: (updates: Partial<PlayerInfo>) => void;
    onRemove: () => void;
    onAssignTeam: (team: PlayerInfo['team']) => void;
    teamAName: string;
    teamBName: string;
}

function PlayerCard({
    player,
    isEditing,
    onEdit,
    onUpdate,
    onRemove,
    onAssignTeam,
    teamAName,
    teamBName,
}: PlayerCardProps) {
    return (
        <div className="card overflow-hidden">
            <div className="p-3 flex items-center gap-3">
                {/* Drag handle */}
                <div className="cursor-grab active:cursor-grabbing p-1 -ml-1 text-[var(--ink-tertiary)] hover:text-[var(--ink-secondary)]">
                    <GripVertical className="w-4 h-4" />
                </div>

                {/* Avatar */}
                <div
                    className={cn(
                        'w-10 h-10 rounded-full flex items-center justify-center text-white font-medium text-sm',
                        player.team === 'A'
                            ? 'bg-blue-500'
                            : player.team === 'B'
                                ? 'bg-red-500'
                                : 'bg-[color:var(--ink-tertiary)]/50'
                    )}
                >
                    {player.name ? player.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : '?'}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    {isEditing ? (
                        <input
                            type="text"
                            value={player.name}
                            onChange={(e) => onUpdate({ name: e.target.value })}
                            placeholder="Player name"
                            className="input w-full text-sm py-1"
                            autoFocus
                        />
                    ) : (
                        <p className="font-medium truncate">{player.name || 'Unnamed player'}</p>
                    )}
                    <div className="flex items-center gap-2 text-sm text-[var(--ink-tertiary)]">
                        {isEditing ? (
                            <input
                                type="number"
                                value={player.handicap ?? ''}
                                onChange={(e) => onUpdate({ handicap: e.target.value ? parseFloat(e.target.value) : undefined })}
                                placeholder="HCP"
                                className="input w-16 text-xs py-0.5"
                                min={0}
                                max={54}
                                step={0.1}
                            />
                        ) : (
                            player.handicap !== undefined && (
                                <span>HCP {player.handicap}</span>
                            )
                        )}
                    </div>
                </div>

                {/* Team assignment */}
                <div className="flex gap-1">
                    <button
                        onClick={() => onAssignTeam(player.team === 'A' ? null : 'A')}
                        className={cn(
                            'px-2 py-1 rounded text-xs font-medium transition-all',
                            player.team === 'A'
                                ? 'bg-blue-500 text-white'
                                : 'bg-[var(--surface-secondary)] hover:bg-blue-500/10'
                        )}
                        title={teamAName}
                    >
                        A
                    </button>
                    <button
                        onClick={() => onAssignTeam(player.team === 'B' ? null : 'B')}
                        className={cn(
                            'px-2 py-1 rounded text-xs font-medium transition-all',
                            player.team === 'B'
                                ? 'bg-red-500 text-white'
                                : 'bg-[var(--surface-secondary)] hover:bg-red-500/10'
                        )}
                        title={teamBName}
                    >
                        B
                    </button>
                </div>

                {/* Actions */}
                <div className="flex gap-1">
                    <button
                        onClick={onEdit}
                        className={cn(
                            'p-2 rounded-lg transition-colors',
                            isEditing
                                ? 'bg-[color:var(--masters)]/10 text-[var(--masters)]'
                                : 'hover:bg-[var(--surface-secondary)]'
                        )}
                    >
                        {isEditing ? <Check className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={onRemove}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                        <X className="w-4 h-4 text-red-500" />
                    </button>
                </div>
            </div>
        </div>
    );
}

export default PlayerRosterImport;
