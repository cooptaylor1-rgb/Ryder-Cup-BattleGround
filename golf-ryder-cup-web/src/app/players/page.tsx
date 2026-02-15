'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTripStore, useUIStore } from '@/lib/stores';
import { BottomNav, PageHeader } from '@/components/layout';
import { createLogger } from '@/lib/utils/logger';
import { formatPlayerName } from '@/lib/utils';
import type { Player } from '@/lib/types/models';
import {
  Edit2,
  Trash2,
  UserPlus,
  Users,
  X,
  UsersRound,
  Plus,
  Check,
} from 'lucide-react';
import { EmptyStatePremium, NoPlayersPremiumEmpty } from '@/components/ui';

// Bulk player entry row type
interface BulkPlayerRow {
  id: string;
  firstName: string;
  lastName: string;
  handicapIndex: string;
  teamId: string;
}

/**
 * PLAYERS PAGE - Editorial Design
 *
 * Player management with clean typography and minimal chrome
 */

const logger = createLogger('players');

export default function PlayersPage() {
  const router = useRouter();
  const {
    currentTrip,
    teams,
    players,
    teamMembers,
    addPlayer,
    updatePlayer,
    removePlayer,
    assignPlayerToTeam,
    removePlayerFromTeam,
  } = useTripStore();
  const { isCaptainMode, showToast } = useUIStore();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    handicapIndex: '',
    email: '',
    teamId: '',
  });

  // Bulk add state - start with 4 empty rows
  const createEmptyRow = (): BulkPlayerRow => ({
    id: crypto.randomUUID(),
    firstName: '',
    lastName: '',
    handicapIndex: '',
    teamId: '',
  });
  const [bulkRows, setBulkRows] = useState<BulkPlayerRow[]>(() =>
    Array(4).fill(null).map(createEmptyRow)
  );

  // If no active trip, we show a premium empty state instead of redirecting.

  const getPlayerTeam = (playerId: string) => {
    const membership = teamMembers.find((tm) => tm.playerId === playerId);
    if (!membership) return undefined;
    return teams.find((t) => t.id === membership.teamId);
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

    // Validate handicap range (-10 to 54 per USGA rules)
    if (formData.handicapIndex) {
      const handicap = parseFloat(formData.handicapIndex);
      if (isNaN(handicap) || handicap < -10 || handicap > 54) {
        showToast('error', 'Handicap must be between -10 and 54');
        return;
      }
    }

    // Validate email format if provided
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      showToast('error', 'Please enter a valid email address');
      return;
    }

    // Check for duplicate email
    if (formData.email) {
      const emailLower = formData.email.toLowerCase().trim();
      const existingPlayer = players.find(
        (p) => p.email?.toLowerCase() === emailLower && p.id !== editingPlayer?.id
      );
      if (existingPlayer) {
        showToast(
          'error',
          `Email already used by ${existingPlayer.firstName} ${existingPlayer.lastName}`
        );
        return;
      }
    }

    try {
      setIsSaving(true);
      const playerData = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        handicapIndex: formData.handicapIndex ? parseFloat(formData.handicapIndex) : undefined,
        email: formData.email?.trim() || undefined,
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
      logger.error('Failed to save player', { error });
      showToast('error', 'Failed to save player');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!playerToDelete || isDeleting) return;
    try {
      setIsDeleting(true);
      await removePlayer(playerToDelete.id);
      setPlayerToDelete(null);
      showToast('info', 'Player deleted');
    } catch (error) {
      logger.error('Failed to delete player', { error });
      showToast('error', 'Failed to delete player');
    } finally {
      setIsDeleting(false);
    }
  };

  // Bulk add handlers
  const updateBulkRow = useCallback((id: string, field: keyof BulkPlayerRow, value: string) => {
    setBulkRows((prev) => prev.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  }, []);

  const addBulkRow = useCallback(() => {
    setBulkRows((prev) => [...prev, createEmptyRow()]);
  }, []);

  const removeBulkRow = useCallback((id: string) => {
    setBulkRows((prev) => prev.filter((row) => row.id !== id));
  }, []);

  const handleBulkSave = async () => {
    // Filter rows that have at least first AND last name
    const validRows = bulkRows.filter((row) => row.firstName.trim() && row.lastName.trim());

    if (validRows.length === 0) {
      showToast('error', 'Add at least one player with first and last name');
      return;
    }

    // Validate all handicaps before saving
    for (const row of validRows) {
      if (row.handicapIndex) {
        const handicap = parseFloat(row.handicapIndex);
        if (isNaN(handicap) || handicap < -10 || handicap > 54) {
          showToast(
            'error',
            `Invalid handicap for ${row.firstName} ${row.lastName}. Must be -10 to 54.`
          );
          return;
        }
      }
    }

    try {
      let addedCount = 0;
      for (const row of validRows) {
        const playerData = {
          firstName: row.firstName.trim(),
          lastName: row.lastName.trim(),
          handicapIndex: row.handicapIndex ? parseFloat(row.handicapIndex) : undefined,
        };
        const newPlayer = await addPlayer(playerData);
        if (row.teamId) {
          await assignPlayerToTeam(newPlayer.id, row.teamId);
        }
        addedCount++;
      }
      showToast('success', `Added ${addedCount} player${addedCount > 1 ? 's' : ''}`);
      setShowBulkAdd(false);
      setBulkRows(Array(4).fill(null).map(createEmptyRow));
    } catch (error) {
      logger.error('Failed to bulk add players', { error });
      showToast('error', 'Failed to add some players');
    }
  };

  const validBulkCount = bulkRows.filter(
    (row) => row.firstName.trim() && row.lastName.trim()
  ).length;

  if (!currentTrip) {
    return (
      <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
        <PageHeader
          title="Players"
          subtitle="No active trip"
          icon={<Users size={16} className="text-[var(--color-accent)]" />}
          onBack={() => router.back()}
        />

        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="trophy"
            title="No active trip"
            description="Start or select a trip to manage players."
            action={{ label: 'Back to Home', onClick: () => router.push('/') }}
            variant="large"
          />
        </main>
        <BottomNav />
      </div>
    );
  }

  const teamA = teams.find((t) => t.color === 'usa');
  const teamB = teams.find((t) => t.color === 'europe');
  const teamAPlayers = players.filter((p) => getPlayerTeam(p.id)?.id === teamA?.id);
  const teamBPlayers = players.filter((p) => getPlayerTeam(p.id)?.id === teamB?.id);
  const unassignedPlayers = players.filter((p) => !getPlayerTeam(p.id));

  return (
    <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Players"
        subtitle={`${players.length} player${players.length === 1 ? '' : 's'}`}
        icon={<Users size={16} className="text-[var(--color-accent)]" />}
        onBack={() => router.back()}
        rightSlot={
          isCaptainMode ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowBulkAdd(true)}
                className="press-scale inline-flex items-center gap-[var(--space-2)] rounded-[var(--radius-md)] bg-gradient-to-br from-[var(--masters)] to-[var(--masters-deep)] px-[var(--space-3)] py-[var(--space-2)] text-[14px] font-semibold text-[var(--canvas)] shadow-[0_2px_8px_rgba(0,103,71,0.3)]"
                title="Add multiple players at once"
              >
                <UsersRound size={16} />
                Add Multiple
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="press-scale inline-flex items-center gap-[var(--space-2)] rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--surface-card)] px-[var(--space-3)] py-[var(--space-2)] text-[14px] font-medium"
              >
                <UserPlus size={16} />
                Add One
              </button>
            </div>
          ) : null
        }
      />

      <main className="container-editorial pb-[var(--space-8)]">
        {/* Team A */}
        <section className="section">
          <h2 className="type-overline mb-[var(--space-3)] text-[var(--team-usa)]">
            {teamA?.name || 'USA'} ({teamAPlayers.length})
          </h2>
          {teamAPlayers.length > 0 ? (
            <div>
              {teamAPlayers.map((player) => (
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
          <h2 className="type-overline mb-[var(--space-3)] text-[var(--team-europe)]">
            {teamB?.name || 'Europe'} ({teamBPlayers.length})
          </h2>
          {teamBPlayers.length > 0 ? (
            <div>
              {teamBPlayers.map((player) => (
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
              <h2 className="type-overline mb-[var(--space-3)]">
                Unassigned ({unassignedPlayers.length})
              </h2>
              <div>
                {unassignedPlayers.map((player) => (
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
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-[var(--space-4)]">
              <h2 className="type-headline">{editingPlayer ? 'Edit Player' : 'Add Player'}</h2>
              <button
                onClick={resetForm}
                className="cursor-pointer border-0 bg-transparent p-0"
                aria-label="Close"
              >
                <X size={20} className="text-[var(--ink-tertiary)]" />
              </button>
            </div>

            <div className="flex flex-col gap-[var(--space-4)]">
              <div className="grid grid-cols-2 gap-[var(--space-3)]">
                <div>
                  <label className="type-meta block mb-[var(--space-1)]">First Name *</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.firstName}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, firstName: e.target.value }))
                    }
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="type-meta block mb-[var(--space-1)]">Last Name *</label>
                  <input
                    type="text"
                    className="input"
                    value={formData.lastName}
                    onChange={(e) => setFormData((prev) => ({ ...prev, lastName: e.target.value }))}
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="type-meta block mb-[var(--space-1)]">Handicap Index</label>
                <input
                  type="number"
                  min="-10"
                  max="54"
                  step="0.1"
                  className="input"
                  value={formData.handicapIndex}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, handicapIndex: e.target.value }))
                  }
                  placeholder="12.4"
                />
              </div>

              <div>
                <label className="type-meta block mb-[var(--space-1)]">Team</label>
                <select
                  value={formData.teamId}
                  onChange={(e) => setFormData((prev) => ({ ...prev, teamId: e.target.value }))}
                  className="input"
                >
                  <option value="">Unassigned</option>
                  {teamA && <option value={teamA.id}>{teamA.name}</option>}
                  {teamB && <option value={teamB.id}>{teamB.name}</option>}
                </select>
              </div>
            </div>

            <div className="mt-[var(--space-6)] flex gap-[var(--space-3)]">
              <button
                onClick={resetForm}
                className="btn btn-secondary flex-1"
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="btn btn-primary flex-1"
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : editingPlayer ? 'Save' : 'Add'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {playerToDelete && (
        <div className="modal-backdrop" onClick={() => setPlayerToDelete(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="type-headline mb-[var(--space-3)]">Delete Player?</h2>
            <p className="type-body mb-[var(--space-4)]">
              Are you sure you want to delete {playerToDelete.firstName} {playerToDelete.lastName}?
              This will also remove them from any matches.
            </p>
            <div className="flex gap-[var(--space-3)]">
              <button
                onClick={() => setPlayerToDelete(null)}
                className="btn btn-secondary flex-1"
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="btn btn-danger flex-1"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Add Modal */}
      {showBulkAdd && (
        <div className="modal-backdrop" onClick={() => setShowBulkAdd(false)}>
          <div
            className="modal flex max-h-[85vh] w-[95vw] max-w-[600px] flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-[var(--space-4)] flex shrink-0 items-center justify-between">
              <div>
                <h2 className="type-headline">Add Multiple Players</h2>
                <p className="type-meta mt-[var(--space-1)]">Fill in names to add players quickly</p>
              </div>
              <button
                onClick={() => setShowBulkAdd(false)}
                className="cursor-pointer border-0 bg-transparent p-[var(--space-2)]"
              >
                <X size={20} className="text-[var(--ink-tertiary)]" />
              </button>
            </div>

            {/* Column headers */}
            <div className="mb-[var(--space-2)] grid shrink-0 gap-[var(--space-2)] pr-2 [grid-template-columns:1fr_1fr_80px_100px_32px]">
              <span className="type-meta font-semibold">First Name *</span>
              <span className="type-meta font-semibold">Last Name *</span>
              <span className="type-meta font-semibold">HCP</span>
              <span className="type-meta font-semibold">Team</span>
              <span />
            </div>

            {/* Scrollable rows container */}
            <div className="mb-[var(--space-4)] flex-1 overflow-y-auto">
              {bulkRows.map((row, _index) => (
                <div
                  key={row.id}
                  className="mb-[var(--space-2)] grid items-center gap-[var(--space-2)] [grid-template-columns:1fr_1fr_80px_100px_32px]"
                >
                  <input
                    type="text"
                    className="input px-[var(--space-2)] text-[14px]"
                    value={row.firstName}
                    onChange={(e) => updateBulkRow(row.id, 'firstName', e.target.value)}
                    placeholder="John"
                  />
                  <input
                    type="text"
                    className="input px-[var(--space-2)] text-[14px]"
                    value={row.lastName}
                    onChange={(e) => updateBulkRow(row.id, 'lastName', e.target.value)}
                    placeholder="Smith"
                  />
                  <input
                    type="number"
                    min="-10"
                    max="54"
                    step="0.1"
                    className="input px-[var(--space-2)] text-[14px]"
                    value={row.handicapIndex}
                    onChange={(e) => updateBulkRow(row.id, 'handicapIndex', e.target.value)}
                    placeholder="12"
                  />
                  <select
                    value={row.teamId}
                    onChange={(e) => updateBulkRow(row.id, 'teamId', e.target.value)}
                    className="input px-[var(--space-2)] text-[14px]"
                  >
                    <option value="">—</option>
                    {teamA && <option value={teamA.id}>{teamA.name?.slice(0, 6) || 'USA'}</option>}
                    {teamB && <option value={teamB.id}>{teamB.name?.slice(0, 6) || 'EUR'}</option>}
                  </select>
                  <button
                    onClick={() => removeBulkRow(row.id)}
                    disabled={bulkRows.length <= 1}
                    className={`border-0 bg-transparent p-[var(--space-1)] ${
                      bulkRows.length <= 1 ? 'cursor-not-allowed opacity-30' : 'cursor-pointer opacity-60'
                    }`}
                    title="Remove row"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add row button */}
            <button
              onClick={addBulkRow}
              className="mb-[var(--space-4)] flex w-full shrink-0 cursor-pointer items-center justify-center gap-[var(--space-2)] rounded-[var(--radius-md)] border border-dashed border-[color:var(--rule)]/40 bg-transparent p-[var(--space-2)]"
            >
              <Plus size={16} className="text-[var(--ink-tertiary)]" />
              <span className="type-meta">Add another row</span>
            </button>

            {/* Footer */}
            <div className="flex shrink-0 gap-[var(--space-3)]">
              <button
                onClick={() => setShowBulkAdd(false)}
                className="btn btn-secondary flex-1"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkSave}
                className="btn btn-primary flex-1"
                disabled={validBulkCount === 0}
              >
                <span className="inline-flex items-center justify-center gap-[var(--space-2)]">
                  <Check size={16} />
                  Add{' '}
                  {validBulkCount > 0
                    ? `${validBulkCount} Player${validBulkCount > 1 ? 's' : ''}`
                    : 'Players'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNav />
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
  const bgColor =
    teamColor === 'usa'
      ? 'var(--team-usa)'
      : teamColor === 'europe'
        ? 'var(--team-europe)'
        : 'var(--ink-tertiary)';

  return (
    <div className="match-row">
      {/* Avatar */}
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-full text-[13px] font-semibold text-[var(--canvas)] ${
          teamColor ? 'opacity-100' : 'opacity-50'
        }`}
        style={{ background: bgColor }}
      >
        {initials}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="font-medium">{formatPlayerName(player.firstName, player.lastName)}</p>
        {player.handicapIndex !== undefined && (
          <p className="type-meta">HCP: {player.handicapIndex.toFixed(1)}</p>
        )}
      </div>

      {/* Actions */}
      {canEdit && (
        <div className="flex items-center gap-[var(--space-1)]">
          <button
            onClick={onEdit}
            className="cursor-pointer border-0 bg-transparent p-[var(--space-2)] text-[var(--ink-secondary)]"
            aria-label="Edit player"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={onDelete}
            className="cursor-pointer border-0 bg-transparent p-[var(--space-2)] text-[var(--error)]"
            aria-label="Delete player"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
