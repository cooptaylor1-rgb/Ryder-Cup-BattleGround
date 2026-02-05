'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTripStore, useUIStore } from '@/lib/stores';
import { BottomNav } from '@/components/layout';
import { createLogger } from '@/lib/utils/logger';
import { formatPlayerName } from '@/lib/utils';
import type { Player } from '@/lib/types/models';
import {
  Edit2,
  Trash2,
  UserPlus,
  Users,
  X,
  ChevronLeft,
  UsersRound,
  Plus,
  Check,
} from 'lucide-react';
import {
  EmptyStatePremium,
  NoPlayersPremiumEmpty,
  PageSkeleton,
  PlayerListSkeleton,
} from '@/components/ui';

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
    if (!membership) return null;
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
      <div
        className="min-h-screen pb-nav page-premium-enter texture-grain"
        style={{ background: 'var(--canvas)' }}
      >
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
    <div
      className="min-h-screen pb-nav page-premium-enter texture-grain"
      style={{ background: 'var(--canvas)' }}
    >
      {/* Premium Header */}
      <header className="header-premium">
        <div
          className="container-editorial"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <button
              onClick={() => router.back()}
              className="press-scale"
              style={{
                padding: 'var(--space-1)',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--ink-secondary)',
              }}
              aria-label="Back"
            >
              <ChevronLeft size={20} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-md)',
                  background:
                    'linear-gradient(135deg, var(--masters) 0%, var(--masters-deep) 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: 'var(--shadow-glow-green)',
                }}
              >
                <Users size={16} style={{ color: 'var(--color-accent)' }} />
              </div>
              <div>
                <span className="type-overline" style={{ letterSpacing: '0.1em' }}>
                  Players
                </span>
                <p className="type-meta">{players.length} players</p>
              </div>
            </div>
          </div>
          {isCaptainMode && (
            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
              <button
                onClick={() => setShowBulkAdd(true)}
                className="btn-secondary press-scale"
                style={{
                  padding: 'var(--space-2) var(--space-3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  background:
                    'linear-gradient(135deg, var(--masters) 0%, var(--masters-deep) 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0, 103, 71, 0.3)',
                }}
                title="Add multiple players at once - fastest way to add your group"
              >
                <UsersRound size={16} />
                Add Multiple
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="press-scale"
                style={{
                  padding: 'var(--space-2) var(--space-3)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 'var(--space-2)',
                  background: 'var(--surface-card)',
                  border: '1px solid var(--rule)',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '14px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                <UserPlus size={16} />
                Add One
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="container-editorial" style={{ paddingBottom: 'var(--space-8)' }}>
        {/* Team A */}
        <section className="section">
          <h2
            className="type-overline"
            style={{ color: 'var(--team-usa)', marginBottom: 'var(--space-3)' }}
          >
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
          <h2
            className="type-overline"
            style={{ color: 'var(--team-europe)', marginBottom: 'var(--space-3)' }}
          >
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
              <h2 className="type-overline" style={{ marginBottom: 'var(--space-3)' }}>
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
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-4)',
              }}
            >
              <h2 className="type-headline">{editingPlayer ? 'Edit Player' : 'Add Player'}</h2>
              <button
                onClick={resetForm}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                aria-label="Close"
              >
                <X size={20} style={{ color: 'var(--ink-tertiary)' }} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div
                style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-3)' }}
              >
                <div>
                  <label
                    className="type-meta"
                    style={{ display: 'block', marginBottom: 'var(--space-1)' }}
                  >
                    First Name *
                  </label>
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
                  <label
                    className="type-meta"
                    style={{ display: 'block', marginBottom: 'var(--space-1)' }}
                  >
                    Last Name *
                  </label>
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
                <label
                  className="type-meta"
                  style={{ display: 'block', marginBottom: 'var(--space-1)' }}
                >
                  Handicap Index
                </label>
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
                <label
                  className="type-meta"
                  style={{ display: 'block', marginBottom: 'var(--space-1)' }}
                >
                  Team
                </label>
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

            <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-6)' }}>
              <button
                onClick={resetForm}
                className="btn btn-secondary"
                style={{ flex: 1 }}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="btn btn-primary"
                style={{ flex: 1 }}
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
            <h2 className="type-headline" style={{ marginBottom: 'var(--space-3)' }}>
              Delete Player?
            </h2>
            <p className="type-body" style={{ marginBottom: 'var(--space-4)' }}>
              Are you sure you want to delete {playerToDelete.firstName} {playerToDelete.lastName}?
              This will also remove them from any matches.
            </p>
            <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
              <button
                onClick={() => setPlayerToDelete(null)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
                disabled={isDeleting}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="btn btn-danger"
                style={{ flex: 1 }}
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
            className="modal"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '600px',
              width: '95vw',
              maxHeight: '85vh',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 'var(--space-4)',
                flexShrink: 0,
              }}
            >
              <div>
                <h2 className="type-headline">Add Multiple Players</h2>
                <p className="type-meta" style={{ marginTop: 'var(--space-1)' }}>
                  Fill in names to add players quickly
                </p>
              </div>
              <button
                onClick={() => setShowBulkAdd(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 'var(--space-2)',
                }}
              >
                <X size={20} style={{ color: 'var(--ink-tertiary)' }} />
              </button>
            </div>

            {/* Column headers */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 80px 100px 32px',
                gap: 'var(--space-2)',
                marginBottom: 'var(--space-2)',
                paddingRight: '8px',
                flexShrink: 0,
              }}
            >
              <span className="type-meta" style={{ fontWeight: 600 }}>
                First Name *
              </span>
              <span className="type-meta" style={{ fontWeight: 600 }}>
                Last Name *
              </span>
              <span className="type-meta" style={{ fontWeight: 600 }}>
                HCP
              </span>
              <span className="type-meta" style={{ fontWeight: 600 }}>
                Team
              </span>
              <span></span>
            </div>

            {/* Scrollable rows container */}
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: 'var(--space-4)' }}>
              {bulkRows.map((row, _index) => (
                <div
                  key={row.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 80px 100px 32px',
                    gap: 'var(--space-2)',
                    marginBottom: 'var(--space-2)',
                    alignItems: 'center',
                  }}
                >
                  <input
                    type="text"
                    className="input"
                    value={row.firstName}
                    onChange={(e) => updateBulkRow(row.id, 'firstName', e.target.value)}
                    placeholder="John"
                    style={{ padding: 'var(--space-2)', fontSize: '14px' }}
                  />
                  <input
                    type="text"
                    className="input"
                    value={row.lastName}
                    onChange={(e) => updateBulkRow(row.id, 'lastName', e.target.value)}
                    placeholder="Smith"
                    style={{ padding: 'var(--space-2)', fontSize: '14px' }}
                  />
                  <input
                    type="number"
                    min="-10"
                    max="54"
                    step="0.1"
                    className="input"
                    value={row.handicapIndex}
                    onChange={(e) => updateBulkRow(row.id, 'handicapIndex', e.target.value)}
                    placeholder="12"
                    style={{ padding: 'var(--space-2)', fontSize: '14px' }}
                  />
                  <select
                    value={row.teamId}
                    onChange={(e) => updateBulkRow(row.id, 'teamId', e.target.value)}
                    className="input"
                    style={{ padding: 'var(--space-2)', fontSize: '14px' }}
                  >
                    <option value="">—</option>
                    {teamA && <option value={teamA.id}>{teamA.name?.slice(0, 6) || 'USA'}</option>}
                    {teamB && <option value={teamB.id}>{teamB.name?.slice(0, 6) || 'EUR'}</option>}
                  </select>
                  <button
                    onClick={() => removeBulkRow(row.id)}
                    disabled={bulkRows.length <= 1}
                    style={{
                      background: 'transparent',
                      border: 'none',
                      cursor: bulkRows.length <= 1 ? 'not-allowed' : 'pointer',
                      padding: 'var(--space-1)',
                      opacity: bulkRows.length <= 1 ? 0.3 : 0.6,
                    }}
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
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-2)',
                padding: 'var(--space-2)',
                border: '1px dashed var(--border)',
                borderRadius: 'var(--radius-md)',
                background: 'transparent',
                cursor: 'pointer',
                marginBottom: 'var(--space-4)',
                width: '100%',
                flexShrink: 0,
              }}
            >
              <Plus size={16} style={{ color: 'var(--ink-tertiary)' }} />
              <span className="type-meta">Add another row</span>
            </button>

            {/* Footer */}
            <div style={{ display: 'flex', gap: 'var(--space-3)', flexShrink: 0 }}>
              <button
                onClick={() => setShowBulkAdd(false)}
                className="btn btn-secondary"
                style={{ flex: 1 }}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkSave}
                className="btn btn-primary"
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--space-2)',
                }}
                disabled={validBulkCount === 0}
              >
                <Check size={16} />
                Add{' '}
                {validBulkCount > 0
                  ? `${validBulkCount} Player${validBulkCount > 1 ? 's' : ''}`
                  : 'Players'}
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
        style={{
          width: '36px',
          height: '36px',
          borderRadius: 'var(--radius-full)',
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
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontWeight: 500 }}>{formatPlayerName(player.firstName, player.lastName)}</p>
        {player.handicapIndex !== undefined && (
          <p className="type-meta">HCP: {player.handicapIndex.toFixed(1)}</p>
        )}
      </div>

      {/* Actions */}
      {canEdit && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}>
          <button
            onClick={onEdit}
            style={{
              padding: 'var(--space-2)',
              color: 'var(--ink-secondary)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
            aria-label="Edit player"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={onDelete}
            style={{
              padding: 'var(--space-2)',
              color: 'var(--error)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
            aria-label="Delete player"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
