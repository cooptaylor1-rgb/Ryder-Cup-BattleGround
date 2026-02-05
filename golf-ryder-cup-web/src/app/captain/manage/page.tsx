'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { deleteMatchCascade, deleteSessionCascade } from '@/lib/services/cascadeDelete';
import { useTripStore, useUIStore } from '@/lib/stores';
import { EmptyStatePremium } from '@/components/ui/EmptyStatePremium';
import { captainLogger } from '@/lib/utils/logger';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import {
    ChevronLeft,
    Settings,
    Users,
    Home,
    Target,
    Trophy,
    MoreHorizontal,
    CalendarDays,
    Edit3,
    Save,
    Trash2,
    Plus,
    ChevronDown,
    ChevronUp,
    CheckCircle,
    Clock,
    Zap,
    Hash,
    UserCheck,
} from 'lucide-react';
import type { RyderCupSession, Match, Player } from '@/lib/types/models';

/**
 * CAPTAIN MANAGE PAGE
 *
 * Comprehensive trip management for captains.
 * Edit sessions, matches, player handicaps, and strokes.
 */

interface SessionWithMatches extends RyderCupSession {
    matches: Match[];
}

export default function CaptainManagePage() {
    const router = useRouter();
    const { currentTrip, players, updateSession: _updateSession } = useTripStore();
    const { isCaptainMode, showToast } = useUIStore();
    const { showConfirm, ConfirmDialogComponent } = useConfirmDialog();

    const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
    const [editingMatch, setEditingMatch] = useState<string | null>(null);
    const [editingPlayer, setEditingPlayer] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Load sessions for current trip
    const sessions = useLiveQuery(
        async () => currentTrip
            ? await db.sessions.where('tripId').equals(currentTrip.id).toArray()
            : [],
        [currentTrip?.id],
        [] as RyderCupSession[]
    );

    // Load all matches
    const matches = useLiveQuery(
        () => db.matches.toArray(),
        [],
        [] as Match[]
    );

    // Define all useCallback hooks BEFORE any early returns (React rules of hooks)
    const executeDeleteMatch = useCallback(async (matchId: string) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await deleteMatchCascade(matchId);
            showToast('success', 'Match deleted');
        } catch (error) {
            captainLogger.error('Failed to delete match:', error);
            showToast('error', 'Failed to delete match');
        } finally {
            setIsSubmitting(false);
        }
    }, [isSubmitting, showToast]);

    const handleDeleteMatch = useCallback((matchId: string) => {
        if (isSubmitting) return;
        showConfirm({
            title: 'Delete Match',
            message: 'Are you sure you want to delete this match? All scores will be lost.',
            confirmLabel: 'Delete Match',
            cancelLabel: 'Cancel',
            variant: 'danger',
            onConfirm: async () => {
                await executeDeleteMatch(matchId);
            },
        });
    }, [isSubmitting, showConfirm, executeDeleteMatch]);

    const executeDeleteSession = useCallback(async (sessionId: string) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await deleteSessionCascade(sessionId);
            showToast('success', 'Session deleted');
        } catch (error) {
            captainLogger.error('Failed to delete session:', error);
            showToast('error', 'Failed to delete session. Some data may be partially deleted.');
        } finally {
            setIsSubmitting(false);
        }
    }, [isSubmitting, showToast]);

    const handleDeleteSession = useCallback((sessionId: string) => {
        if (isSubmitting) return;
        showConfirm({
            title: 'Delete Session',
            message: 'Are you sure you want to delete this session? All matches and scores will be lost.',
            confirmLabel: 'Delete Session',
            cancelLabel: 'Cancel',
            variant: 'danger',
            onConfirm: async () => {
                await executeDeleteSession(sessionId);
            },
        });
    }, [isSubmitting, showConfirm, executeDeleteSession]);

    // Note: avoid auto-redirects so we can render explicit empty states.

    if (!currentTrip) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--canvas)' }}>
                <div className="container-editorial section">
                    <EmptyStatePremium
                        illustration="golf-ball"
                        title="No active trip"
                        description="Start or select a trip to manage sessions and matches."
                        action={{
                            label: 'Go Home',
                            onClick: () => router.push('/'),
                            icon: <Home size={16} />,
                        }}
                    />
                </div>
            </div>
        );
    }

    if (!isCaptainMode) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--canvas)' }}>
                <div className="container-editorial section">
                    <EmptyStatePremium
                        illustration="trophy"
                        title="Captain mode required"
                        description="Turn on Captain Mode to access Manage."
                        action={{
                            label: 'Open More',
                            onClick: () => router.push('/more'),
                            icon: <MoreHorizontal size={16} />,
                        }}
                        secondaryAction={{
                            label: 'Go Home',
                            onClick: () => router.push('/'),
                        }}
                    />
                </div>
            </div>
        );
    }

    // Group matches by session
    const sessionsWithMatches: SessionWithMatches[] = sessions.map(session => ({
        ...session,
        matches: matches.filter(m => m.sessionId === session.id).sort((a, b) => a.matchOrder - b.matchOrder),
    })).sort((a, b) => a.sessionNumber - b.sessionNumber);

    const toggleSession = (sessionId: string) => {
        setExpandedSessions(prev => {
            const next = new Set(prev);
            if (next.has(sessionId)) {
                next.delete(sessionId);
            } else {
                next.add(sessionId);
            }
            return next;
        });
    };

    // Get player names for a list of IDs
    const getPlayerNames = (playerIds: string[]) => {
        return playerIds
            .map(id => players.find(p => p.id === id))
            .filter(Boolean)
            .map(p => p!.firstName)
            .join(' & ');
    };

    const handleUpdateSession = async (sessionId: string, updates: Partial<RyderCupSession>) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await db.sessions.update(sessionId, { ...updates, updatedAt: new Date().toISOString() });
            showToast('success', 'Session updated');
        } catch (error) {
            captainLogger.error('Failed to update session:', error);
            showToast('error', 'Failed to update session');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateMatch = async (matchId: string, updates: Partial<Match>) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await db.matches.update(matchId, { ...updates, updatedAt: new Date().toISOString() });
            showToast('success', 'Match updated');
            setEditingMatch(null);
        } catch (error) {
            captainLogger.error('Failed to update match:', error);
            showToast('error', 'Failed to update match');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdatePlayer = async (playerId: string, updates: Partial<Player>) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        try {
            await db.players.update(playerId, updates);
            showToast('success', 'Player updated');
            setEditingPlayer(null);
        } catch (error) {
            captainLogger.error('Failed to update player:', error);
            showToast('error', 'Failed to update player');
        } finally {
            setIsSubmitting(false);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle size={16} className="text-green-500" />;
            case 'inProgress':
                return <Zap size={16} className="text-amber-500" />;
            default:
                return <Clock size={16} className="text-gray-400" />;
        }
    };

    return (
        <div className="min-h-screen pb-nav page-premium-enter texture-grain" style={{ background: 'var(--canvas)' }}>
            {/* Premium Header */}
            <header className="header-premium">
                <div className="container-editorial flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => router.back()}
                            className="p-2 -ml-2 press-scale"
                            style={{ color: 'var(--ink-secondary)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                            aria-label="Back"
                        >
                            <ChevronLeft size={22} strokeWidth={1.75} />
                        </button>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                            <div
                                style={{
                                    width: '32px',
                                    height: '32px',
                                    borderRadius: 'var(--radius-md)',
                                    background: 'linear-gradient(135deg, var(--masters) 0%, var(--masters-deep) 100%)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: 'var(--shadow-glow-green)',
                                }}
                            >
                                <Settings size={16} style={{ color: 'var(--color-accent)' }} />
                            </div>
                            <div>
                                <span className="type-overline" style={{ letterSpacing: '0.1em' }}>Manage Trip</span>
                                <p className="type-caption truncate" style={{ marginTop: '2px' }}>
                                    Sessions, Matches & Players
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <main className="container-editorial">
                {/* Sessions Section */}
                <section className="section">
                    <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
                        <h2 className="type-overline">Sessions & Matches</h2>
                        <Link
                            href="/lineup/new"
                            className="btn-premium"
                            style={{ padding: 'var(--space-2) var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}
                        >
                            <Plus size={16} />
                            New Session
                        </Link>
                    </div>

                    {sessionsWithMatches.length === 0 ? (
                        <div className="card-premium" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
                            <CalendarDays size={32} style={{ color: 'var(--ink-tertiary)', margin: '0 auto var(--space-3)' }} />
                            <p style={{ color: 'var(--ink-secondary)' }}>No sessions yet</p>
                            <p className="type-meta" style={{ marginTop: 'var(--space-2)' }}>
                                Create a lineup to add sessions and matches
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {sessionsWithMatches.map((session) => (
                                <div key={session.id} className="card-premium" style={{ overflow: 'hidden' }}>
                                    {/* Session Header */}
                                    <button
                                        onClick={() => toggleSession(session.id)}
                                        className="w-full press-scale"
                                        style={{
                                            padding: 'var(--space-4)',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 'var(--space-3)',
                                            background: 'transparent',
                                            border: 'none',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                        }}
                                    >
                                        {getStatusIcon(session.status)}
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontWeight: 600, color: 'var(--ink)' }}>{session.name}</p>
                                            <p className="type-meta">
                                                {session.matches.length} match{session.matches.length !== 1 ? 'es' : ''} • {session.sessionType}
                                                {session.scheduledDate && ` • ${new Date(session.scheduledDate).toLocaleDateString()}`}
                                            </p>
                                        </div>
                                        {expandedSessions.has(session.id) ? (
                                            <ChevronUp size={20} style={{ color: 'var(--ink-tertiary)' }} />
                                        ) : (
                                            <ChevronDown size={20} style={{ color: 'var(--ink-tertiary)' }} />
                                        )}
                                    </button>

                                    {/* Expanded Session Content */}
                                    {expandedSessions.has(session.id) && (
                                        <div style={{ borderTop: '1px solid var(--rule-faint)' }}>
                                            {/* Session Actions */}
                                            <div style={{ padding: 'var(--space-3) var(--space-4)', background: 'var(--canvas-sunken)', display: 'flex', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
                                                <select
                                                    value={session.status}
                                                    onChange={(e) => handleUpdateSession(session.id, { status: e.target.value as RyderCupSession['status'] })}
                                                    className="input"
                                                    style={{ padding: 'var(--space-2)', fontSize: 'var(--text-sm)', width: 'auto' }}
                                                >
                                                    <option value="scheduled">Scheduled</option>
                                                    <option value="inProgress">In Progress</option>
                                                    <option value="completed">Completed</option>
                                                </select>
                                                <input
                                                    type="number"
                                                    placeholder="Points/match"
                                                    value={session.pointsPerMatch || ''}
                                                    onChange={(e) => handleUpdateSession(session.id, { pointsPerMatch: Number(e.target.value) || undefined })}
                                                    className="input"
                                                    style={{ padding: 'var(--space-2)', fontSize: 'var(--text-sm)', width: '120px' }}
                                                />
                                                <button
                                                    onClick={() => handleDeleteSession(session.id)}
                                                    className="press-scale"
                                                    style={{
                                                        padding: 'var(--space-2)',
                                                        background: 'var(--error)',
                                                        color: 'white',
                                                        border: 'none',
                                                        borderRadius: 'var(--radius-md)',
                                                        cursor: 'pointer',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 'var(--space-1)',
                                                        fontSize: 'var(--text-sm)',
                                                    }}
                                                >
                                                    <Trash2 size={14} />
                                                    Delete
                                                </button>
                                            </div>

                                            {/* Matches List */}
                                            <div style={{ padding: 'var(--space-3) var(--space-4)' }}>
                                                <p className="type-overline" style={{ marginBottom: 'var(--space-3)', fontSize: '11px' }}>Matches</p>
                                                {session.matches.length === 0 ? (
                                                    <p className="type-meta" style={{ color: 'var(--ink-tertiary)' }}>No matches in this session</p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {session.matches.map((match) => (
                                                            <MatchEditor
                                                                key={match.id}
                                                                match={match}
                                                                players={players}
                                                                getPlayerNames={getPlayerNames}
                                                                isEditing={editingMatch === match.id}
                                                                onEdit={() => setEditingMatch(match.id)}
                                                                onSave={(updates) => handleUpdateMatch(match.id, updates)}
                                                                onCancel={() => setEditingMatch(null)}
                                                                onDelete={() => handleDeleteMatch(match.id)}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <hr className="divider" />

                {/* Players Section */}
                <section className="section">
                    <h2 className="type-overline" style={{ marginBottom: 'var(--space-4)' }}>Player Handicaps</h2>

                    <div className="space-y-2">
                        {players.map((player) => (
                            <PlayerEditor
                                key={player.id}
                                player={player}
                                isEditing={editingPlayer === player.id}
                                onEdit={() => setEditingPlayer(player.id)}
                                onSave={(updates) => handleUpdatePlayer(player.id, updates)}
                                onCancel={() => setEditingPlayer(null)}
                            />
                        ))}
                    </div>

                    {players.length === 0 && (
                        <div className="card-premium" style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
                            <Users size={32} style={{ color: 'var(--ink-tertiary)', margin: '0 auto var(--space-3)' }} />
                            <p style={{ color: 'var(--ink-secondary)' }}>No players yet</p>
                        </div>
                    )}
                </section>
            </main>

            {/* Bottom Navigation */}
            <nav className="nav-premium bottom-nav">
                <Link href="/" className="nav-item">
                    <Home size={22} strokeWidth={1.75} />
                    <span>Home</span>
                </Link>
                <Link href="/schedule" className="nav-item">
                    <CalendarDays size={22} strokeWidth={1.75} />
                    <span>Schedule</span>
                </Link>
                <Link href="/score" className="nav-item">
                    <Target size={22} strokeWidth={1.75} />
                    <span>Score</span>
                </Link>
                <Link href="/matchups" className="nav-item">
                    <Users size={22} strokeWidth={1.75} />
                    <span>Matches</span>
                </Link>
                <Link href="/standings" className="nav-item">
                    <Trophy size={22} strokeWidth={1.75} />
                    <span>Standings</span>
                </Link>
                <Link href="/more" className="nav-item">
                    <MoreHorizontal size={22} strokeWidth={1.75} />
                    <span>More</span>
                </Link>
            </nav>

            {/* Confirm Dialog */}
            {ConfirmDialogComponent}
        </div>
    );
}

/**
 * Match Editor Component
 */
interface MatchEditorProps {
    match: Match;
    players: Player[];
    getPlayerNames: (ids: string[]) => string;
    isEditing: boolean;
    onEdit: () => void;
    onSave: (updates: Partial<Match>) => void;
    onCancel: () => void;
    onDelete: () => void;
}

function MatchEditor({ match, players: _players, getPlayerNames, isEditing, onEdit, onSave, onCancel, onDelete }: MatchEditorProps) {
    const [teamAAllowance, setTeamAAllowance] = useState(match.teamAHandicapAllowance);
    const [teamBAllowance, setTeamBAllowance] = useState(match.teamBHandicapAllowance);
    const [status, setStatus] = useState(match.status);

    const teamANames = getPlayerNames(match.teamAPlayerIds);
    const teamBNames = getPlayerNames(match.teamBPlayerIds);

    if (isEditing) {
        return (
            <div className="card" style={{ padding: 'var(--space-3)', background: 'var(--canvas-raised)', border: '2px solid var(--masters)' }}>
                <div className="space-y-3">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="type-meta" style={{ fontWeight: 600 }}>Match #{match.matchOrder}</span>
                        <select
                            value={status}
                            onChange={(e) => setStatus(e.target.value as Match['status'])}
                            className="input"
                            style={{ padding: 'var(--space-1) var(--space-2)', fontSize: 'var(--text-sm)', width: 'auto' }}
                        >
                            <option value="scheduled">Scheduled</option>
                            <option value="inProgress">In Progress</option>
                            <option value="completed">Completed</option>
                        </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                        <div>
                            <label className="type-micro" style={{ display: 'block', marginBottom: 'var(--space-1)', color: 'var(--team-usa)' }}>
                                Team USA: {teamANames || 'TBD'}
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                <span className="type-micro">Strokes:</span>
                                <input
                                    type="number"
                                    value={teamAAllowance}
                                    onChange={(e) => setTeamAAllowance(Number(e.target.value))}
                                    className="input"
                                    style={{ padding: 'var(--space-1) var(--space-2)', width: '60px', textAlign: 'center' }}
                                    min={0}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="type-micro" style={{ display: 'block', marginBottom: 'var(--space-1)', color: 'var(--team-europe)' }}>
                                Team EUR: {teamBNames || 'TBD'}
                            </label>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                <span className="type-micro">Strokes:</span>
                                <input
                                    type="number"
                                    value={teamBAllowance}
                                    onChange={(e) => setTeamBAllowance(Number(e.target.value))}
                                    className="input"
                                    style={{ padding: 'var(--space-1) var(--space-2)', width: '60px', textAlign: 'center' }}
                                    min={0}
                                />
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                        <button
                            onClick={onCancel}
                            className="press-scale"
                            style={{
                                padding: 'var(--space-2) var(--space-3)',
                                background: 'var(--canvas-sunken)',
                                border: '1px solid var(--rule)',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                fontSize: 'var(--text-sm)',
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => onSave({ teamAHandicapAllowance: teamAAllowance, teamBHandicapAllowance: teamBAllowance, status })}
                            className="btn-premium press-scale"
                            style={{ padding: 'var(--space-2) var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}
                        >
                            <Save size={14} />
                            Save
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="match-row press-scale"
            style={{ cursor: 'pointer' }}
            onClick={onEdit}
        >
            <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-1)' }}>
                    <Hash size={14} style={{ color: 'var(--ink-tertiary)' }} />
                    <span className="type-meta" style={{ fontWeight: 600 }}>Match {match.matchOrder}</span>
                    <span className={`type-micro px-2 py-0.5 rounded-full ${match.status === 'completed' ? 'bg-green-500/20 text-green-600' :
                        match.status === 'inProgress' ? 'bg-amber-500/20 text-amber-600' :
                            'bg-gray-500/20 text-gray-500'
                        }`}>
                        {match.status}
                    </span>
                </div>
                <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                    <span className="type-caption">
                        <span style={{ color: 'var(--team-usa)' }}>{teamANames || 'TBD'}</span>
                        {match.teamAHandicapAllowance > 0 && (
                            <span className="type-micro" style={{ marginLeft: 'var(--space-1)' }}>({match.teamAHandicapAllowance} strokes)</span>
                        )}
                    </span>
                    <span className="type-caption" style={{ color: 'var(--ink-tertiary)' }}>vs</span>
                    <span className="type-caption">
                        <span style={{ color: 'var(--team-europe)' }}>{teamBNames || 'TBD'}</span>
                        {match.teamBHandicapAllowance > 0 && (
                            <span className="type-micro" style={{ marginLeft: 'var(--space-1)' }}>({match.teamBHandicapAllowance} strokes)</span>
                        )}
                    </span>
                </div>
            </div>
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button
                    onClick={(e) => { e.stopPropagation(); onEdit(); }}
                    className="press-scale"
                    style={{ padding: 'var(--space-2)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                    <Edit3 size={16} style={{ color: 'var(--masters)' }} />
                </button>
                <button
                    onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    className="press-scale"
                    style={{ padding: 'var(--space-2)', background: 'transparent', border: 'none', cursor: 'pointer' }}
                >
                    <Trash2 size={16} style={{ color: 'var(--error)' }} />
                </button>
            </div>
        </div>
    );
}

/**
 * Player Editor Component
 */
interface PlayerEditorProps {
    player: Player;
    isEditing: boolean;
    onEdit: () => void;
    onSave: (updates: Partial<Player>) => void;
    onCancel: () => void;
}

function PlayerEditor({ player, isEditing, onEdit, onSave, onCancel }: PlayerEditorProps) {
    const [handicap, setHandicap] = useState(player.handicapIndex || 0);
    const [firstName, setFirstName] = useState(player.firstName);
    const [lastName, setLastName] = useState(player.lastName);

    if (isEditing) {
        return (
            <div className="card" style={{ padding: 'var(--space-3)', background: 'var(--canvas-raised)', border: '2px solid var(--masters)' }}>
                <div className="space-y-3">
                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                        <div style={{ flex: 1 }}>
                            <label className="type-micro" style={{ display: 'block', marginBottom: 'var(--space-1)' }}>First Name</label>
                            <input
                                type="text"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                className="input"
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label className="type-micro" style={{ display: 'block', marginBottom: 'var(--space-1)' }}>Last Name</label>
                            <input
                                type="text"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                className="input"
                                style={{ width: '100%' }}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="type-micro" style={{ display: 'block', marginBottom: 'var(--space-1)' }}>Handicap Index</label>
                        <input
                            type="number"
                            value={handicap}
                            onChange={(e) => setHandicap(Number(e.target.value))}
                            className="input"
                            style={{ width: '100px' }}
                            step={0.1}
                            min={0}
                            max={54}
                        />
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                        <button
                            onClick={onCancel}
                            className="press-scale"
                            style={{
                                padding: 'var(--space-2) var(--space-3)',
                                background: 'var(--canvas-sunken)',
                                border: '1px solid var(--rule)',
                                borderRadius: 'var(--radius-md)',
                                cursor: 'pointer',
                                fontSize: 'var(--text-sm)',
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={() => onSave({ firstName, lastName, handicapIndex: handicap })}
                            className="btn-premium press-scale"
                            style={{ padding: 'var(--space-2) var(--space-3)', display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}
                        >
                            <Save size={14} />
                            Save
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="match-row press-scale"
            style={{ cursor: 'pointer' }}
            onClick={onEdit}
        >
            <UserCheck size={18} style={{ color: 'var(--masters)' }} />
            <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 500 }}>{player.firstName} {player.lastName}</p>
                <p className="type-meta">
                    Handicap: {player.handicapIndex !== undefined && player.handicapIndex !== null ? player.handicapIndex : 'Not set'}
                </p>
            </div>
            <Edit3 size={16} style={{ color: 'var(--ink-tertiary)' }} />
        </div>
    );
}
