'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTripStore, useUIStore } from '@/lib/stores';
import { AppShell } from '@/components/layout';
import { cn, formatPlayerName, formatHandicapIndex } from '@/lib/utils';
import type { Player } from '@/lib/types/models';
import { Plus, Edit2, Trash2, UserPlus, Users, X } from 'lucide-react';

export default function PlayersPage() {
    const router = useRouter();
    const { currentTrip, teams, players, teamMembers, addPlayer, updatePlayer, removePlayer, assignPlayerToTeam, removePlayerFromTeam } = useTripStore();
    const { isCaptainMode, showToast } = useUIStore();

    const [showAddModal, setShowAddModal] = useState(false);
    const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        handicapIndex: '',
        email: '',
        teamId: '',
    });

    // Redirect if no trip
    useEffect(() => {
        if (!currentTrip) {
            router.push('/');
        }
    }, [currentTrip, router]);

    // Get player's team
    const getPlayerTeam = (playerId: string) => {
        const membership = teamMembers.find(tm => tm.playerId === playerId);
        if (!membership) return null;
        return teams.find(t => t.id === membership.teamId);
    };

    // Reset form
    const resetForm = () => {
        setFormData({
            firstName: '',
            lastName: '',
            handicapIndex: '',
            email: '',
            teamId: '',
        });
        setEditingPlayer(null);
        setShowAddModal(false);
    };

    // Open edit modal
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

    // Save player
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
                // Update existing player
                await updatePlayer(editingPlayer.id, playerData);

                // Update team assignment
                const currentTeam = getPlayerTeam(editingPlayer.id);
                if (formData.teamId && formData.teamId !== currentTeam?.id) {
                    await assignPlayerToTeam(editingPlayer.id, formData.teamId);
                } else if (!formData.teamId && currentTeam) {
                    await removePlayerFromTeam(editingPlayer.id, currentTeam.id);
                }

                showToast('success', 'Player updated');
            } else {
                // Add new player
                const newPlayer = await addPlayer(playerData);

                // Assign to team if selected
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

    // Delete player
    const handleDelete = async (player: Player) => {
        if (!confirm(`Delete ${player.firstName} ${player.lastName}?`)) return;

        try {
            await removePlayer(player.id);
            showToast('info', 'Player deleted');
        } catch (error) {
            console.error('Failed to delete player:', error);
            showToast('error', 'Failed to delete player');
        }
    };

    if (!currentTrip) return null;

    const teamA = teams.find(t => t.color === 'usa');
    const teamB = teams.find(t => t.color === 'europe');

    // Group players by team
    const teamAPlayers = players.filter(p => getPlayerTeam(p.id)?.id === teamA?.id);
    const teamBPlayers = players.filter(p => getPlayerTeam(p.id)?.id === teamB?.id);
    const unassignedPlayers = players.filter(p => !getPlayerTeam(p.id));

    return (
        <AppShell
            showBack
            headerTitle="Players"
            headerRight={
                isCaptainMode && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="p-2 rounded-full hover:bg-surface-200 dark:hover:bg-surface-800"
                    >
                        <UserPlus className="w-5 h-5" />
                    </button>
                )
            }
        >
            <div className="p-4 space-y-6">
                {/* Team USA */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-3 h-3 rounded-full bg-team-usa" />
                        <h2 className="font-semibold text-team-usa">{teamA?.name || 'Team USA'}</h2>
                        <span className="text-sm text-surface-500">({teamAPlayers.length})</span>
                    </div>

                    <div className="card divide-y divide-surface-200 dark:divide-surface-700">
                        {teamAPlayers.length > 0 ? (
                            teamAPlayers.map(player => (
                                <PlayerRow
                                    key={player.id}
                                    player={player}
                                    teamColor="usa"
                                    canEdit={isCaptainMode}
                                    onEdit={() => handleEdit(player)}
                                    onDelete={() => handleDelete(player)}
                                />
                            ))
                        ) : (
                            <div className="p-4 text-center text-surface-400">
                                No players on this team
                            </div>
                        )}
                    </div>
                </section>

                {/* Team Europe */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-3 h-3 rounded-full bg-team-europe" />
                        <h2 className="font-semibold text-team-europe">{teamB?.name || 'Team Europe'}</h2>
                        <span className="text-sm text-surface-500">({teamBPlayers.length})</span>
                    </div>

                    <div className="card divide-y divide-surface-200 dark:divide-surface-700">
                        {teamBPlayers.length > 0 ? (
                            teamBPlayers.map(player => (
                                <PlayerRow
                                    key={player.id}
                                    player={player}
                                    teamColor="europe"
                                    canEdit={isCaptainMode}
                                    onEdit={() => handleEdit(player)}
                                    onDelete={() => handleDelete(player)}
                                />
                            ))
                        ) : (
                            <div className="p-4 text-center text-surface-400">
                                No players on this team
                            </div>
                        )}
                    </div>
                </section>

                {/* Unassigned */}
                {unassignedPlayers.length > 0 && (
                    <section>
                        <div className="flex items-center gap-2 mb-3">
                            <Users className="w-4 h-4 text-surface-400" />
                            <h2 className="font-semibold text-surface-500">Unassigned</h2>
                            <span className="text-sm text-surface-500">({unassignedPlayers.length})</span>
                        </div>

                        <div className="card divide-y divide-surface-200 dark:divide-surface-700">
                            {unassignedPlayers.map(player => (
                                <PlayerRow
                                    key={player.id}
                                    player={player}
                                    canEdit={isCaptainMode}
                                    onEdit={() => handleEdit(player)}
                                    onDelete={() => handleDelete(player)}
                                />
                            ))}
                        </div>
                    </section>
                )}

                {/* Empty State */}
                {players.length === 0 && (
                    <div className="text-center py-12">
                        <Users className="w-16 h-16 mx-auto mb-4 text-surface-300" />
                        <p className="text-surface-500 mb-4">No players yet</p>
                        {isCaptainMode && (
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="btn-primary"
                            >
                                Add First Player
                            </button>
                        )}
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {showAddModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
                    <div className="card w-full max-w-md max-h-[90vh] overflow-y-auto sm:rounded-xl rounded-t-xl">
                        <div className="sticky top-0 bg-white dark:bg-surface-900 p-4 border-b border-surface-200 dark:border-surface-700 flex items-center justify-between">
                            <h3 className="text-lg font-semibold">
                                {editingPlayer ? 'Edit Player' : 'Add Player'}
                            </h3>
                            <button
                                onClick={resetForm}
                                className="p-2 rounded-full hover:bg-surface-100 dark:hover:bg-surface-800"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-4 space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1">First Name *</label>
                                    <input
                                        type="text"
                                        value={formData.firstName}
                                        onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                                        className="w-full p-3 rounded-lg border border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-800"
                                        placeholder="John"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Last Name *</label>
                                    <input
                                        type="text"
                                        value={formData.lastName}
                                        onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                                        className="w-full p-3 rounded-lg border border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-800"
                                        placeholder="Doe"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Handicap Index</label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={formData.handicapIndex}
                                    onChange={(e) => setFormData(prev => ({ ...prev, handicapIndex: e.target.value }))}
                                    className="w-full p-3 rounded-lg border border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-800"
                                    placeholder="12.4"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                    className="w-full p-3 rounded-lg border border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-800"
                                    placeholder="john@example.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">Team</label>
                                <select
                                    value={formData.teamId}
                                    onChange={(e) => setFormData(prev => ({ ...prev, teamId: e.target.value }))}
                                    className="w-full p-3 rounded-lg border border-surface-300 dark:border-surface-600 bg-surface-50 dark:bg-surface-800"
                                >
                                    <option value="">Unassigned</option>
                                    {teamA && <option value={teamA.id}>{teamA.name}</option>}
                                    {teamB && <option value={teamB.id}>{teamB.name}</option>}
                                </select>
                            </div>
                        </div>

                        <div className="p-4 border-t border-surface-200 dark:border-surface-700 flex gap-3">
                            <button
                                onClick={resetForm}
                                className="flex-1 py-3 rounded-lg border border-surface-300 dark:border-surface-600 font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex-1 py-3 rounded-lg bg-augusta-green text-white font-medium"
                            >
                                {editingPlayer ? 'Save Changes' : 'Add Player'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppShell>
    );
}

// Player Row Component
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
    return (
        <div className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3 min-w-0">
                {/* Avatar */}
                <div className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm',
                    teamColor === 'usa' && 'bg-team-usa/10 text-team-usa',
                    teamColor === 'europe' && 'bg-team-europe/10 text-team-europe',
                    !teamColor && 'bg-surface-200 dark:bg-surface-700 text-surface-600 dark:text-surface-300'
                )}>
                    {player.firstName[0]}{player.lastName[0]}
                </div>

                {/* Info */}
                <div className="min-w-0">
                    <p className="font-medium truncate">
                        {formatPlayerName(player.firstName, player.lastName)}
                    </p>
                    {player.handicapIndex !== undefined && (
                        <p className="text-sm text-surface-500">
                            HCP: {player.handicapIndex.toFixed(1)}
                        </p>
                    )}
                </div>
            </div>

            {/* Actions */}
            {canEdit && (
                <div className="flex items-center gap-1">
                    <button
                        onClick={onEdit}
                        className="p-2 rounded-full hover:bg-surface-100 dark:hover:bg-surface-800 text-surface-400"
                    >
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                </div>
            )}
        </div>
    );
}
