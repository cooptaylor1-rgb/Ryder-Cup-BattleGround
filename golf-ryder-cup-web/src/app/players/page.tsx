'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTripStore, useUIStore } from '@/lib/stores';
import { AppShellNew } from '@/components/layout';
import {
    Card,
    SectionHeader,
    Button,
    IconButton,
    Modal,
    ConfirmDialog,
    Input,
    NoPlayersEmptyNew,
} from '@/components/ui';
import { cn, formatPlayerName, formatHandicapIndex } from '@/lib/utils';
import type { Player } from '@/lib/types/models';
import { Plus, Edit2, Trash2, UserPlus, Users, X, ChevronLeft } from 'lucide-react';

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

    // Group players by team
    const teamAPlayers = players.filter(p => getPlayerTeam(p.id)?.id === teamA?.id);
    const teamBPlayers = players.filter(p => getPlayerTeam(p.id)?.id === teamB?.id);
    const unassignedPlayers = players.filter(p => !getPlayerTeam(p.id));

    return (
        <AppShellNew
            headerTitle="Players"
            headerSubtitle={`${players.length} players`}
            showBack
            headerRight={
                isCaptainMode ? (
                    <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setShowAddModal(true)}
                    >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Add
                    </Button>
                ) : undefined
            }
        >
            <div className="p-4 lg:p-6 space-y-6">
                {/* Team USA */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="h-3 w-3 rounded-full bg-team-usa" />
                        <SectionHeader
                            title={teamA?.name || 'Team USA'}
                            subtitle={`${teamAPlayers.length} players`}
                            size="sm"
                        />
                    </div>

                    <Card padding="none" className="overflow-hidden divide-y divide-surface-border/50">
                        {teamAPlayers.length > 0 ? (
                            teamAPlayers.map(player => (
                                <PlayerRow
                                    key={player.id}
                                    player={player}
                                    teamColor="usa"
                                    canEdit={isCaptainMode}
                                    onEdit={() => handleEdit(player)}
                                    onDelete={() => setPlayerToDelete(player)}
                                />
                            ))
                        ) : (
                            <div className="p-6 text-center text-text-tertiary">
                                No players on this team
                            </div>
                        )}
                    </Card>
                </section>

                {/* Team Europe */}
                <section>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="h-3 w-3 rounded-full bg-team-europe" />
                        <SectionHeader
                            title={teamB?.name || 'Team Europe'}
                            subtitle={`${teamBPlayers.length} players`}
                            size="sm"
                        />
                    </div>

                    <Card padding="none" className="overflow-hidden divide-y divide-surface-border/50">
                        {teamBPlayers.length > 0 ? (
                            teamBPlayers.map(player => (
                                <PlayerRow
                                    key={player.id}
                                    player={player}
                                    teamColor="europe"
                                    canEdit={isCaptainMode}
                                    onEdit={() => handleEdit(player)}
                                    onDelete={() => setPlayerToDelete(player)}
                                />
                            ))
                        ) : (
                            <div className="p-6 text-center text-text-tertiary">
                                No players on this team
                            </div>
                        )}
                    </Card>
                </section>

                {/* Unassigned */}
                {unassignedPlayers.length > 0 && (
                    <section>
                        <SectionHeader
                            title="Unassigned"
                            subtitle={`${unassignedPlayers.length} players`}
                            icon={Users}
                            className="mb-3"
                        />

                        <Card padding="none" className="overflow-hidden divide-y divide-surface-border/50">
                            {unassignedPlayers.map(player => (
                                <PlayerRow
                                    key={player.id}
                                    player={player}
                                    canEdit={isCaptainMode}
                                    onEdit={() => handleEdit(player)}
                                    onDelete={() => setPlayerToDelete(player)}
                                />
                            ))}
                        </Card>
                    </section>
                )}

                {/* Empty State */}
                {players.length === 0 && (
                    <Card variant="outlined" padding="none">
                        <NoPlayersEmptyNew onAddPlayer={() => setShowAddModal(true)} />
                    </Card>
                )}
            </div>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={showAddModal}
                onClose={resetForm}
                title={editingPlayer ? 'Edit Player' : 'Add Player'}
            >
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                        <Input
                            label="First Name"
                            required
                            value={formData.firstName}
                            onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                            placeholder="John"
                        />
                        <Input
                            label="Last Name"
                            required
                            value={formData.lastName}
                            onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                            placeholder="Doe"
                        />
                    </div>

                    <Input
                        label="Handicap Index"
                        type="number"
                        value={formData.handicapIndex}
                        onChange={(e) => setFormData(prev => ({ ...prev, handicapIndex: e.target.value }))}
                        placeholder="12.4"
                    />

                    <Input
                        label="Email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="john@example.com"
                    />

                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-2">Team</label>
                        <select
                            value={formData.teamId}
                            onChange={(e) => setFormData(prev => ({ ...prev, teamId: e.target.value }))}
                            className={cn(
                                'w-full px-4 py-3 rounded-lg',
                                'bg-surface-base border border-surface-border',
                                'text-text-primary',
                                'focus:outline-none focus:ring-2 focus:ring-augusta-green/50 focus:border-augusta-green',
                                'transition-colors duration-150',
                            )}
                        >
                            <option value="">Unassigned</option>
                            {teamA && <option value={teamA.id}>{teamA.name}</option>}
                            {teamB && <option value={teamB.id}>{teamB.name}</option>}
                        </select>
                    </div>
                </div>

                <div className="flex gap-3 mt-6">
                    <Button variant="outline" onClick={resetForm} className="flex-1">
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleSave} className="flex-1">
                        {editingPlayer ? 'Save Changes' : 'Add Player'}
                    </Button>
                </div>
            </Modal>

            {/* Delete Confirmation */}
            <ConfirmDialog
                isOpen={!!playerToDelete}
                onClose={() => setPlayerToDelete(null)}
                onConfirm={handleDelete}
                title="Delete Player?"
                description={playerToDelete ? `Are you sure you want to delete ${playerToDelete.firstName} ${playerToDelete.lastName}? This will also remove them from any matches.` : ''}
                confirmLabel="Delete"
                variant="danger"
            />
        </AppShellNew>
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
        <div className="flex items-center justify-between p-4 hover:bg-surface-highlight transition-colors duration-150">
            <div className="flex items-center gap-3 min-w-0">
                {/* Avatar */}
                <div className={cn(
                    'h-10 w-10 rounded-full flex items-center justify-center font-semibold text-sm shrink-0',
                    teamColor === 'usa' && 'bg-team-usa/10 text-team-usa',
                    teamColor === 'europe' && 'bg-team-europe/10 text-team-europe',
                    !teamColor && 'bg-surface-elevated text-text-secondary',
                )}>
                    {player.firstName[0]}{player.lastName[0]}
                </div>

                {/* Info */}
                <div className="min-w-0">
                    <p className="font-medium text-text-primary truncate">
                        {formatPlayerName(player.firstName, player.lastName)}
                    </p>
                    {player.handicapIndex !== undefined && (
                        <p className="text-sm text-text-secondary">
                            HCP: {player.handicapIndex.toFixed(1)}
                        </p>
                    )}
                </div>
            </div>

            {/* Actions */}
            {canEdit && (
                <div className="flex items-center gap-1">
                    <IconButton
                        icon={<Edit2 className="h-4 w-4" />}
                        aria-label="Edit player"
                        size="sm"
                        onClick={onEdit}
                    />
                    <IconButton
                        icon={<Trash2 className="h-4 w-4" />}
                        aria-label="Delete player"
                        size="sm"
                        variant="danger"
                        onClick={onDelete}
                    />
                </div>
            )}
        </div>
    );
}
