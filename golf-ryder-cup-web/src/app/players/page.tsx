'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTripStore, useUIStore } from '@/lib/stores';
import { formatPlayerName } from '@/lib/utils';
import type { Player } from '@/lib/types/models';
import { Edit2, Trash2, UserPlus, Users, X, ChevronLeft } from 'lucide-react';
import { NoPlayersPremiumEmpty } from '@/components/ui';

/**
 * PLAYERS PAGE - Editorial Design
 *
 * Player management with clean typography and minimal chrome
 */

export default function PlayersPage() {
    const router = useRouter();
    const { currentTrip, teams, players, teamMembers, addPlayer, updatePlayer, removePlayer, assignPlayerToTeam, removePlayerFromTeam } = useTripStore();
    const { isCaptainMode, showToast } = useUIStore();

    const [showAddModal, setShowAddModal] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
    const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        handicapIndex: '',
        email: '',
        teamId: '',
    });

    useEffect(() => {
        if (!currentTrip) {
            router.push('/');
        }
    }, [currentTrip, router]);

    const getPlayerTeam = (playerId: string) => {
        const membership = teamMembers.find(tm => tm.playerId === playerId);
        if (!membership) return null;
        return teams.find(t => t.id === membership.teamId);
    };

    const resetForm = () => {
        setFormData({ firstName: '', lastName: '', handicapIndex: '', email: '', teamId: '' });
        setEditingPlayer(null);
        setShowAddModal(false);
    };

    const handleEdit = (player: Player) => {
        const team = getPlayerTeam(player.id);
        setFormData({
            firstName: player.firstName,
            lastName: player.lastName,
            handicapIndex: player.handicapIndex?.toString() || '',
            email: player.email || '',
            teamId: team?.id || '',
        });
        setEditingPlayer(player);
        setShowAddModal(true);
    };

    const handleSave = async () => {
        if (!formData.firstName || !formData.lastName) {
            showToast('error', 'First and last name are required');
            return;
        }

        try {
            const playerData = {
                firstName: formData.firstName,
                lastName: formData.lastName,
                handicapIndex: formData.handicapIndex ? parseFloat(formData.handicapIndex) : undefined,
                email: formData.email || undefined,
            };

            if (editingPlayer) {
                await updatePlayer(editingPlayer.id, playerData);
                const currentTeam = getPlayerTeam(editingPlayer.id);
                if (formData.teamId && formData.teamId !== currentTeam?.id) {
                    await assignPlayerToTeam(editingPlayer.id, formData.teamId);
                } else if (!formData.teamId && currentTeam) {
                    await removePlayerFromTeam(editingPlayer.id, currentTeam.id);
                }
                showToast('success', 'Player updated');
            } else {
                const newPlayer = await addPlayer(playerData);
                if (formData.teamId) {
                    await assignPlayerToTeam(newPlayer.id, formData.teamId);
                }
                showToast('success', 'Player added');
            }
            resetForm();
        } catch (error) {
            console.error('Failed to save player:', error);
            showToast('error', 'Failed to save player');
        }
    };

    const handleDelete = async () => {
        if (!playerToDelete) return;
        try {
            await removePlayer(playerToDelete.id);
            setPlayerToDelete(null);
            showToast('info', 'Player deleted');
        } catch (error) {
            console.error('Failed to delete player:', error);
            showToast('error', 'Failed to delete player');
        }
    };

    if (!currentTrip) return null;

    const teamA = teams.find(t => t.color === 'usa');
    const teamB = teams.find(t => t.color === 'europe');
    const teamAPlayers = players.filter(p => getPlayerTeam(p.id)?.id === teamA?.id);
    const teamBPlayers = players.filter(p => getPlayerTeam(p.id)?.id === teamB?.id);
    const unassignedPlayers = players.filter(p => !getPlayerTeam(p.id));

    return (
        <div className="min-h-screen" style={{ background: 'var(--canvas)' }}>
            {/* Header */}
            <header className="header">
                <div className="container-editorial flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.back()} className="nav-item p-1" aria-label="Back">
                            <ChevronLeft size={20} />
                        </button>
                        <div>
                            <span className="type-overline">Players</span>
                            <p className="type-meta">{players.length} players</p>
                        </div>
                    </div>
                    {isCaptainMode && (
                        <button onClick={() => setShowAddModal(true)} className="btn btn-primary" style={{ padding: 'var(--space-2) var(--space-3)' }}>
                            <UserPlus size={16} />
                            Add
                        </button>
                    )}
                </div>
            </header>

            <main className="container-editorial" style={{ paddingBottom: 'var(--space-8)' }}>
                {/* Team A */}
                <section className="section">
                    <h2 className="type-overline" style={{ color: 'var(--team-usa)', marginBottom: 'var(--space-3)' }}>
                        {teamA?.name || 'USA'} ({teamAPlayers.length})
                    </h2>
                    {teamAPlayers.length > 0 ? (
                        <div>
                            {teamAPlayers.map(player => (
                                <PlayerRow
                                    key={player.id}
                                    player={player}
                                    teamColor="usa"
                                    canEdit={isCaptainMode}
                                    onEdit={() => handleEdit(player)}
                                    onDelete={() => setPlayerToDelete(player)}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="type-meta">No players on this team</p>
                    )}
                </section>

                <hr className="divider" />

                {/* Team B */}
                <section className="section">
                    <h2 className="type-overline" style={{ color: 'var(--team-europe)', marginBottom: 'var(--space-3)' }}>
                        {teamB?.name || 'Europe'} ({teamBPlayers.length})
                    </h2>
                    {teamBPlayers.length > 0 ? (
                        <div>
                            {teamBPlayers.map(player => (
                                <PlayerRow
                                    key={player.id}
                                    player={player}
                                    teamColor="europe"
                                    canEdit={isCaptainMode}
                                    onEdit={() => handleEdit(player)}
                                    onDelete={() => setPlayerToDelete(player)}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="type-meta">No players on this team</p>
                    )}
                </section>

                {/* Unassigned */}
                {unassignedPlayers.length > 0 && (
                    <>
                        <hr className="divider" />
                        <section className="section">
                            <h2 className="type-overline" style={{ marginBottom: 'var(--space-3)' }}>
                                Unassigned ({unassignedPlayers.length})
                            </h2>
                            <div>
                                {unassignedPlayers.map(player => (
                                    <PlayerRow
                                        key={player.id}
                                        player={player}
                                        canEdit={isCaptainMode}
                                        onEdit={() => handleEdit(player)}
                                        onDelete={() => setPlayerToDelete(player)}
                                    />
                                ))}
                            </div>
                        </section>
                    </>
                )}

                {/* Premium Empty State */}
                {players.length === 0 && (
                    <NoPlayersPremiumEmpty
                        onAddPlayer={isCaptainMode ? () => setShowAddModal(true) : undefined}
                    />
                )}
            </main>

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="modal-backdrop" onClick={resetForm}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
                            <h2 className="type-headline">{editingPlayer ? 'Edit Player' : 'Add Player'}</h2>
                            <button onClick={resetForm}>
                                <X size={20} style={{ color: 'var(--ink-tertiary)' }} />
                            </button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}>
                                <div>
                                    <label className="type-meta" style={{ display: 'block', marginBottom: 'var(--space-1)' }}>First Name *</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.firstName}
                                        onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                                        placeholder="John"
                                    />
                                </div>
                                <div>
                                    <label className="type-meta" style={{ display: 'block', marginBottom: 'var(--space-1)' }}>Last Name *</label>
                                    <input
                                        type="text"
                                        className="input"
                                        value={formData.lastName}
                                        onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                                        placeholder="Doe"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="type-meta" style={{ display: 'block', marginBottom: 'var(--space-1)' }}>Handicap Index</label>
                                <input
                                    type="number"
                                    className="input"
                                    value={formData.handicapIndex}
                                    onChange={(e) => setFormData(prev => ({ ...prev, handicapIndex: e.target.value }))}
                                    placeholder="12.4"
                                />
                            </div>

                            <div>
                                <label className="type-meta" style={{ display: 'block', marginBottom: 'var(--space-1)' }}>Team</label>
                                <select
                                    value={formData.teamId}
                                    onChange={(e) => setFormData(prev => ({ ...prev, teamId: e.target.value }))}
                                    className="input"
                                >
                                    <option value="">Unassigned</option>
                                    {teamA && <option value={teamA.id}>{teamA.name}</option>}
                                    {teamB && <option value={teamB.id}>{teamB.name}</option>}
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3" style={{ marginTop: 'var(--space-6)' }}>
                            <button onClick={resetForm} className="btn btn-secondary flex-1">Cancel</button>
                            <button onClick={handleSave} className="btn btn-primary flex-1">
                                {editingPlayer ? 'Save' : 'Add'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation */}
            {playerToDelete && (
                <div className="modal-backdrop" onClick={() => setPlayerToDelete(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2 className="type-headline" style={{ marginBottom: 'var(--space-3)' }}>Delete Player?</h2>
                        <p className="type-body" style={{ marginBottom: 'var(--space-4)' }}>
                            Are you sure you want to delete {playerToDelete.firstName} {playerToDelete.lastName}? This will also remove them from any matches.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setPlayerToDelete(null)} className="btn btn-secondary flex-1">Cancel</button>
                            <button onClick={handleDelete} className="btn btn-danger flex-1">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/* Player Row Component */
function PlayerRow({
    player,
    teamColor,
    canEdit,
    onEdit,
    onDelete,
}: {
    player: Player;
    teamColor?: 'usa' | 'europe';
    canEdit: boolean;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const initials = `${player.firstName?.[0] || '?'}${player.lastName?.[0] || '?'}`;
    const bgColor = teamColor === 'usa' ? 'var(--team-usa)' : teamColor === 'europe' ? 'var(--team-europe)' : 'var(--ink-tertiary)';

    return (
        <div className="match-row">
            {/* Avatar */}
            <div
                style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '50%',
                    background: bgColor,
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '13px',
                    fontWeight: 600,
                    opacity: teamColor ? 1 : 0.5,
                }}
            >
                {initials}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <p style={{ fontWeight: 500 }}>{formatPlayerName(player.firstName, player.lastName)}</p>
                {player.handicapIndex !== undefined && (
                    <p className="type-meta">HCP: {player.handicapIndex.toFixed(1)}</p>
                )}
            </div>

            {/* Actions */}
            {canEdit && (
                <div className="flex items-center gap-1">
                    <button onClick={onEdit} style={{ padding: 'var(--space-2)', color: 'var(--ink-secondary)' }}>
                        <Edit2 size={16} />
                    </button>
                    <button onClick={onDelete} style={{ padding: 'var(--space-2)', color: 'var(--error)' }}>
                        <Trash2 size={16} />
                    </button>
                </div>
            )}
        </div>
    );
}
