'use client';

import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn, formatPlayerName } from '@/lib/utils';
import { PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { EmptyStatePremium, NoPlayersPremiumEmpty } from '@/components/ui';
import { useTripStore, useUIStore } from '@/lib/stores';
import { createLogger } from '@/lib/utils/logger';
import type { Player } from '@/lib/types/models';
import {
  Edit2,
  Mail,
  Plus,
  Shield,
  Trash2,
  UserPlus,
  Users,
  UsersRound,
  X,
} from 'lucide-react';

interface BulkPlayerRow {
  id: string;
  firstName: string;
  lastName: string;
  handicapIndex: string;
  teamId: string;
}

type RosterTone = 'usa' | 'europe' | 'neutral';

const logger = createLogger('players');

const rosterToneStyles: Record<
  RosterTone,
  {
    panel: string;
    eyebrow: string;
    badge: string;
    avatar: string;
    icon: string;
  }
> = {
  usa: {
    panel:
      'border-[color:var(--team-usa)]/18 bg-[linear-gradient(180deg,rgba(30,58,95,0.08),rgba(255,255,255,0.96))]',
    eyebrow: 'text-[var(--team-usa)]',
    badge:
      'border-[color:var(--team-usa)]/16 bg-[color:var(--team-usa)]/10 text-[var(--team-usa)]',
    avatar: 'bg-[var(--team-usa)]',
    icon: 'text-[var(--team-usa)]',
  },
  europe: {
    panel:
      'border-[color:var(--team-europe)]/18 bg-[linear-gradient(180deg,rgba(114,47,55,0.08),rgba(255,255,255,0.96))]',
    eyebrow: 'text-[var(--team-europe)]',
    badge:
      'border-[color:var(--team-europe)]/16 bg-[color:var(--team-europe)]/10 text-[var(--team-europe)]',
    avatar: 'bg-[var(--team-europe)]',
    icon: 'text-[var(--team-europe)]',
  },
  neutral: {
    panel:
      'border-[color:var(--gold)]/14 bg-[linear-gradient(180deg,rgba(201,162,39,0.08),rgba(255,255,255,0.96))]',
    eyebrow: 'text-[var(--gold-dark)]',
    badge:
      'border-[color:var(--gold)]/16 bg-[color:var(--gold)]/12 text-[var(--gold-dark)]',
    avatar: 'bg-[var(--ink-tertiary)]',
    icon: 'text-[var(--gold-dark)]',
  },
};

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

  const getPlayerTeam = (playerId: string) => {
    const membership = teamMembers.find((tm) => tm.playerId === playerId);
    if (!membership) return undefined;
    return teams.find((team) => team.id === membership.teamId);
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

    if (formData.handicapIndex) {
      const handicap = parseFloat(formData.handicapIndex);
      if (isNaN(handicap) || handicap < -10 || handicap > 54) {
        showToast('error', 'Handicap must be between -10 and 54');
        return;
      }
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      showToast('error', 'Please enter a valid email address');
      return;
    }

    if (formData.email) {
      const emailLower = formData.email.toLowerCase().trim();
      const existingPlayer = players.find(
        (player) => player.email?.toLowerCase() === emailLower && player.id !== editingPlayer?.id
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
        email: formData.email.trim() || undefined,
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
    const validRows = bulkRows.filter((row) => row.firstName.trim() && row.lastName.trim());

    if (validRows.length === 0) {
      showToast('error', 'Add at least one player with first and last name');
      return;
    }

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
        addedCount += 1;
      }

      showToast('success', `Added ${addedCount} player${addedCount === 1 ? '' : 's'}`);
      setShowBulkAdd(false);
      setBulkRows(Array(4).fill(null).map(createEmptyRow));
    } catch (error) {
      logger.error('Failed to bulk add players', { error });
      showToast('error', 'Failed to add some players');
    }
  };

  const teamA = teams.find((team) => team.color === 'usa');
  const teamB = teams.find((team) => team.color === 'europe');
  const teamAPlayers = players.filter((player) => getPlayerTeam(player.id)?.id === teamA?.id);
  const teamBPlayers = players.filter((player) => getPlayerTeam(player.id)?.id === teamB?.id);
  const unassignedPlayers = players.filter((player) => !getPlayerTeam(player.id));
  const playersWithHandicap = players.filter((player) => player.handicapIndex !== undefined);
  const averageHandicap =
    playersWithHandicap.length > 0
      ? (
          playersWithHandicap.reduce((sum, player) => sum + (player.handicapIndex ?? 0), 0) /
          playersWithHandicap.length
        ).toFixed(1)
      : '—';
  const validBulkCount = bulkRows.filter(
    (row) => row.firstName.trim() && row.lastName.trim()
  ).length;

  if (!currentTrip) {
    return (
      <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
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
      </div>
    );
  }

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Players"
        subtitle={currentTrip.name}
        icon={<Users size={16} className="text-[var(--color-accent)]" />}
        onBack={() => router.back()}
      />

      <main className="container-editorial py-[var(--space-6)] pb-[var(--space-12)]">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--rule)] bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(248,244,237,0.96))] shadow-[0_22px_48px_rgba(46,34,18,0.08)]">
          <div className="border-b border-[color:var(--rule)]/80 px-[var(--space-5)] py-[var(--space-5)]">
            <div className="flex flex-col gap-[var(--space-5)]">
              <div className="flex flex-col gap-[var(--space-4)] sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="type-overline tracking-[0.18em] text-[var(--ink-tertiary)]">
                    Roster Room
                  </p>
                  <h1 className="mt-[var(--space-2)] font-serif text-[clamp(2rem,7vw,3.1rem)] italic leading-[1.02] text-[var(--ink)]">
                    Build the field.
                  </h1>
                  <p className="mt-[var(--space-3)] type-body-sm text-[var(--ink-secondary)]">
                    {isCaptainMode
                      ? 'Shape the competition here. Assign each golfer, keep handicaps tidy, and make the player list feel settled before the first lineup card goes up.'
                      : 'The roster is locked to viewing only right now. Turn on Captain Mode if you need to adjust the player list or move golfers onto teams.'}
                  </p>
                </div>

                <div className="inline-flex items-center gap-[var(--space-2)] rounded-full border border-[color:var(--gold)]/16 bg-[color:var(--gold)]/10 px-[var(--space-3)] py-[var(--space-2)]">
                  <Shield size={15} className={isCaptainMode ? 'text-[var(--masters)]' : 'text-[var(--ink-tertiary)]'} />
                  <span className="type-caption font-semibold text-[var(--ink)]">
                    {isCaptainMode ? 'Captain Mode Active' : 'View Only'}
                  </span>
                </div>
              </div>

              {isCaptainMode ? (
                <div className="grid gap-[var(--space-3)] sm:grid-cols-2">
                  <Button
                    variant="primary"
                    leftIcon={<UserPlus size={16} />}
                    onClick={() => setShowAddModal(true)}
                    className="w-full justify-center"
                  >
                    Add One Player
                  </Button>
                  <Button
                    variant="secondary"
                    leftIcon={<UsersRound size={16} />}
                    onClick={() => setShowBulkAdd(true)}
                    className="w-full justify-center border-[color:var(--gold)]/25 bg-[color:var(--gold)]/10 text-[var(--ink)] hover:bg-[color:var(--gold)]/14"
                  >
                    Add In Bulk
                  </Button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-[var(--space-3)] px-[var(--space-5)] py-[var(--space-5)] md:grid-cols-4">
            <PlayersFactCard label="Total Players" value={players.length} />
            <PlayersFactCard label="Assigned" value={players.length - unassignedPlayers.length} />
            <PlayersFactCard label="Awaiting Team" value={unassignedPlayers.length} />
            <PlayersFactCard
              label="Average HCP"
              value={averageHandicap}
              valueClassName="font-sans text-[1rem] not-italic"
            />
          </div>
        </section>

        {players.length === 0 ? (
          <div className="py-[var(--space-10)]">
            <NoPlayersPremiumEmpty onAddPlayer={isCaptainMode ? () => setShowAddModal(true) : undefined} />
          </div>
        ) : (
          <div className="space-y-[var(--space-4)] pt-[var(--space-6)]">
            <RosterSectionCard
              title={teamA?.name || 'USA'}
              eyebrow="United States"
              description="Keep the American side tidy and easy to scan before captain work begins."
              players={teamAPlayers}
              tone="usa"
              canEdit={isCaptainMode}
              onEdit={handleEdit}
              onDelete={setPlayerToDelete}
            />

            <RosterSectionCard
              title={teamB?.name || 'Europe'}
              eyebrow="Europe"
              description="A balanced roster starts here. Handicap clarity matters more than decoration."
              players={teamBPlayers}
              tone="europe"
              canEdit={isCaptainMode}
              onEdit={handleEdit}
              onDelete={setPlayerToDelete}
            />

            <RosterSectionCard
              title="Unassigned"
              eyebrow="Still Waiting"
              description="These players are in the trip but not yet placed on either side."
              players={unassignedPlayers}
              tone="neutral"
              canEdit={isCaptainMode}
              onEdit={handleEdit}
              onDelete={setPlayerToDelete}
            />
          </div>
        )}
      </main>

      {showAddModal ? (
        <div className="modal-backdrop" onClick={resetForm}>
          <div
            className="modal max-w-[560px] overflow-hidden p-0"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-[var(--rule)] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(247,243,236,0.95))] px-[var(--space-6)] py-[var(--space-5)]">
              <div className="flex items-start justify-between gap-[var(--space-4)]">
                <div>
                  <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">
                    {editingPlayer ? 'Roster Edit' : 'New Player'}
                  </p>
                  <h2 className="mt-[var(--space-2)] type-headline">
                    {editingPlayer ? 'Refine player details' : 'Add a golfer to the trip'}
                  </h2>
                  <p className="mt-[var(--space-2)] type-body-sm text-[var(--ink-secondary)]">
                    Keep the essentials clean: name, email, handicap, and where they belong.
                  </p>
                </div>
                <button
                  onClick={resetForm}
                  className="rounded-full border border-[var(--rule)] bg-[var(--canvas-raised)] p-[var(--space-2)] text-[var(--ink-tertiary)] transition-colors hover:bg-[var(--canvas-sunken)]"
                  aria-label="Close player form"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="space-y-[var(--space-4)] px-[var(--space-6)] py-[var(--space-6)]">
              <div className="grid gap-[var(--space-3)] sm:grid-cols-2">
                <label className="space-y-[var(--space-2)]">
                  <span className="type-meta font-semibold text-[var(--ink)]">First name</span>
                  <input
                    type="text"
                    className="input"
                    value={formData.firstName}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, firstName: event.target.value }))
                    }
                    placeholder="John"
                  />
                </label>

                <label className="space-y-[var(--space-2)]">
                  <span className="type-meta font-semibold text-[var(--ink)]">Last name</span>
                  <input
                    type="text"
                    className="input"
                    value={formData.lastName}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, lastName: event.target.value }))
                    }
                    placeholder="Doe"
                  />
                </label>
              </div>

              <label className="space-y-[var(--space-2)]">
                <span className="type-meta font-semibold text-[var(--ink)]">Email</span>
                <input
                  type="email"
                  className="input"
                  value={formData.email}
                  onChange={(event) =>
                    setFormData((prev) => ({ ...prev, email: event.target.value }))
                  }
                  placeholder="john@example.com"
                />
              </label>

              <div className="grid gap-[var(--space-3)] sm:grid-cols-[140px_1fr]">
                <label className="space-y-[var(--space-2)]">
                  <span className="type-meta font-semibold text-[var(--ink)]">Handicap</span>
                  <input
                    type="number"
                    min="-10"
                    max="54"
                    step="0.1"
                    className="input"
                    value={formData.handicapIndex}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, handicapIndex: event.target.value }))
                    }
                    placeholder="12.4"
                  />
                </label>

                <label className="space-y-[var(--space-2)]">
                  <span className="type-meta font-semibold text-[var(--ink)]">Team</span>
                  <select
                    value={formData.teamId}
                    onChange={(event) =>
                      setFormData((prev) => ({ ...prev, teamId: event.target.value }))
                    }
                    className="input"
                  >
                    <option value="">Leave unassigned</option>
                    {teamA ? <option value={teamA.id}>{teamA.name}</option> : null}
                    {teamB ? <option value={teamB.id}>{teamB.name}</option> : null}
                  </select>
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-[var(--space-3)] border-t border-[var(--rule)] bg-[var(--canvas-sunken)] px-[var(--space-6)] py-[var(--space-5)] sm:flex-row">
              <Button variant="secondary" onClick={resetForm} disabled={isSaving} className="flex-1">
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleSave}
                disabled={isSaving}
                isLoading={isSaving}
                loadingText={editingPlayer ? 'Saving...' : 'Adding...'}
                className="flex-1"
              >
                {editingPlayer ? 'Save Player' : 'Add Player'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {playerToDelete ? (
        <div className="modal-backdrop" onClick={() => setPlayerToDelete(null)}>
          <div
            className="modal max-w-[480px] overflow-hidden p-0"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-[var(--rule)] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(247,243,236,0.95))] px-[var(--space-6)] py-[var(--space-5)]">
              <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">
                Remove Player
              </p>
              <h2 className="mt-[var(--space-2)] type-headline">Delete this golfer?</h2>
              <p className="mt-[var(--space-2)] type-body-sm text-[var(--ink-secondary)]">
                {formatPlayerName(playerToDelete.firstName, playerToDelete.lastName)} will be
                removed from the roster and any existing matches.
              </p>
            </div>

            <div className="flex flex-col gap-[var(--space-3)] px-[var(--space-6)] py-[var(--space-5)] sm:flex-row">
              <Button
                variant="secondary"
                onClick={() => setPlayerToDelete(null)}
                disabled={isDeleting}
                className="flex-1"
              >
                Keep Player
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={isDeleting}
                isLoading={isDeleting}
                loadingText="Deleting..."
                className="flex-1"
              >
                Delete Player
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {showBulkAdd ? (
        <div className="modal-backdrop" onClick={() => setShowBulkAdd(false)}>
          <div
            className="modal max-h-[88vh] max-w-[680px] overflow-hidden p-0"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="border-b border-[var(--rule)] bg-[linear-gradient(180deg,rgba(255,255,255,0.9),rgba(247,243,236,0.95))] px-[var(--space-6)] py-[var(--space-5)]">
              <div className="flex items-start justify-between gap-[var(--space-4)]">
                <div>
                  <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">
                    Bulk Entry
                  </p>
                  <h2 className="mt-[var(--space-2)] type-headline">Load the roster quickly</h2>
                  <p className="mt-[var(--space-2)] type-body-sm text-[var(--ink-secondary)]">
                    Enter the names you know now. You can refine the finer details later.
                  </p>
                </div>
                <button
                  onClick={() => setShowBulkAdd(false)}
                  className="rounded-full border border-[var(--rule)] bg-[var(--canvas-raised)] p-[var(--space-2)] text-[var(--ink-tertiary)] transition-colors hover:bg-[var(--canvas-sunken)]"
                  aria-label="Close bulk add"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="mt-[var(--space-4)] grid grid-cols-2 gap-[var(--space-3)] md:grid-cols-4">
                <PlayersFactCard label="Rows" value={bulkRows.length} />
                <PlayersFactCard label="Ready" value={validBulkCount} />
                <PlayersFactCard label="USA" value={bulkRows.filter((row) => row.teamId === teamA?.id).length} />
                <PlayersFactCard label="Europe" value={bulkRows.filter((row) => row.teamId === teamB?.id).length} />
              </div>
            </div>

            <div className="space-y-[var(--space-3)] overflow-y-auto px-[var(--space-6)] py-[var(--space-6)]">
              {bulkRows.map((row, index) => (
                <div
                  key={row.id}
                  className="rounded-[1.35rem] border border-[var(--rule)] bg-[var(--canvas)] p-[var(--space-4)]"
                >
                  <div className="flex items-center justify-between gap-[var(--space-4)]">
                    <div>
                      <p className="type-overline text-[var(--ink-tertiary)]">
                        Player {index + 1}
                      </p>
                      <p className="mt-[var(--space-1)] type-caption">
                        Add the essentials now. Team placement is optional.
                      </p>
                    </div>
                    <button
                      onClick={() => removeBulkRow(row.id)}
                      disabled={bulkRows.length <= 1}
                      className="rounded-full border border-[var(--rule)] bg-[var(--canvas-raised)] p-[var(--space-2)] text-[var(--ink-tertiary)] transition-colors hover:bg-[var(--canvas-sunken)] disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label={`Remove player row ${index + 1}`}
                    >
                      <X size={16} />
                    </button>
                  </div>

                  <div className="mt-[var(--space-4)] grid gap-[var(--space-3)] sm:grid-cols-2">
                    <label className="space-y-[var(--space-2)]">
                      <span className="type-meta font-semibold text-[var(--ink)]">First name</span>
                      <input
                        type="text"
                        className="input"
                        value={row.firstName}
                        onChange={(event) =>
                          updateBulkRow(row.id, 'firstName', event.target.value)
                        }
                        placeholder="John"
                      />
                    </label>

                    <label className="space-y-[var(--space-2)]">
                      <span className="type-meta font-semibold text-[var(--ink)]">Last name</span>
                      <input
                        type="text"
                        className="input"
                        value={row.lastName}
                        onChange={(event) =>
                          updateBulkRow(row.id, 'lastName', event.target.value)
                        }
                        placeholder="Smith"
                      />
                    </label>
                  </div>

                  <div className="mt-[var(--space-3)] grid gap-[var(--space-3)] sm:grid-cols-[140px_1fr]">
                    <label className="space-y-[var(--space-2)]">
                      <span className="type-meta font-semibold text-[var(--ink)]">Handicap</span>
                      <input
                        type="number"
                        min="-10"
                        max="54"
                        step="0.1"
                        className="input"
                        value={row.handicapIndex}
                        onChange={(event) =>
                          updateBulkRow(row.id, 'handicapIndex', event.target.value)
                        }
                        placeholder="12.0"
                      />
                    </label>

                    <label className="space-y-[var(--space-2)]">
                      <span className="type-meta font-semibold text-[var(--ink)]">Team</span>
                      <select
                        value={row.teamId}
                        onChange={(event) => updateBulkRow(row.id, 'teamId', event.target.value)}
                        className="input"
                      >
                        <option value="">Leave unassigned</option>
                        {teamA ? <option value={teamA.id}>{teamA.name}</option> : null}
                        {teamB ? <option value={teamB.id}>{teamB.name}</option> : null}
                      </select>
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-[var(--rule)] bg-[var(--canvas-sunken)] px-[var(--space-6)] py-[var(--space-5)]">
              <button
                onClick={addBulkRow}
                className="mb-[var(--space-4)] flex w-full items-center justify-center gap-[var(--space-2)] rounded-[1rem] border border-dashed border-[color:var(--gold)]/28 bg-[color:var(--gold)]/10 px-[var(--space-4)] py-[var(--space-3)] text-[var(--ink)] transition-colors hover:bg-[color:var(--gold)]/14"
              >
                <Plus size={16} />
                <span className="type-caption font-semibold">Add another row</span>
              </button>

              <div className="flex flex-col gap-[var(--space-3)] sm:flex-row">
                <Button variant="secondary" onClick={() => setShowBulkAdd(false)} className="flex-1">
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleBulkSave}
                  disabled={validBulkCount === 0}
                  className="flex-1"
                >
                  Add {validBulkCount > 0 ? validBulkCount : ''} Player
                  {validBulkCount === 1 ? '' : 's'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function PlayersFactCard({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string | number;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-[1.1rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.72)] px-[var(--space-4)] py-[var(--space-4)] shadow-[0_12px_24px_rgba(46,34,18,0.05)]">
      <p className="type-overline text-[var(--ink-tertiary)]">{label}</p>
      <p
        className={cn(
          'mt-[var(--space-2)] font-serif text-[1.7rem] italic leading-none text-[var(--ink)]',
          valueClassName
        )}
      >
        {value}
      </p>
    </div>
  );
}

function RosterSectionCard({
  title,
  eyebrow,
  description,
  players,
  tone,
  canEdit,
  onEdit,
  onDelete,
}: {
  title: string;
  eyebrow: string;
  description: string;
  players: Player[];
  tone: RosterTone;
  canEdit: boolean;
  onEdit: (player: Player) => void;
  onDelete: (player: Player) => void;
}) {
  const toneStyles = rosterToneStyles[tone];

  return (
    <section
      className={cn(
        'overflow-hidden rounded-[1.8rem] border shadow-[0_18px_36px_rgba(46,34,18,0.06)]',
        toneStyles.panel
      )}
    >
      <div className="border-b border-[color:var(--rule)]/75 px-[var(--space-5)] py-[var(--space-5)]">
        <div className="flex items-start justify-between gap-[var(--space-4)]">
          <div>
            <p className={cn('type-overline tracking-[0.16em]', toneStyles.eyebrow)}>{eyebrow}</p>
            <h2 className="mt-[var(--space-2)] type-display-sm text-[var(--ink)]">{title}</h2>
            <p className="mt-[var(--space-2)] type-body-sm text-[var(--ink-secondary)]">
              {description}
            </p>
          </div>

          <div className={cn('rounded-full border px-[var(--space-3)] py-[var(--space-2)]', toneStyles.badge)}>
            <span className="type-caption font-semibold">{players.length}</span>
          </div>
        </div>
      </div>

      {players.length === 0 ? (
        <div className="px-[var(--space-5)] py-[var(--space-6)]">
          <div className="rounded-[1.25rem] border border-dashed border-[color:var(--rule)]/75 bg-[rgba(255,255,255,0.55)] px-[var(--space-4)] py-[var(--space-5)] text-center">
            <p className="type-title-sm text-[var(--ink)]">No players here yet</p>
            <p className="mt-[var(--space-2)] type-caption">
              Once players land in this section, the roster will feel settled.
            </p>
          </div>
        </div>
      ) : (
        <div className="px-[var(--space-3)] py-[var(--space-3)]">
          {players.map((player, index) => (
            <RosterPlayerRow
              key={player.id}
              player={player}
              tone={tone}
              canEdit={canEdit}
              onEdit={() => onEdit(player)}
              onDelete={() => onDelete(player)}
              className={index > 0 ? 'mt-[var(--space-2)]' : undefined}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function RosterPlayerRow({
  player,
  tone,
  canEdit,
  onEdit,
  onDelete,
  className,
}: {
  player: Player;
  tone: RosterTone;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
  className?: string;
}) {
  const initials = `${player.firstName?.[0] || '?'}${player.lastName?.[0] || '?'}`;
  const toneStyles = rosterToneStyles[tone];

  return (
    <div
      className={cn(
        'flex items-center gap-[var(--space-4)] rounded-[1.2rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.82)] px-[var(--space-4)] py-[var(--space-4)] transition-colors hover:bg-[var(--canvas-raised)]',
        className
      )}
    >
      <div
        className={cn(
          'flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-[0.8rem] font-semibold text-[var(--canvas)] shadow-[0_10px_20px_rgba(26,24,21,0.12)]',
          toneStyles.avatar
        )}
      >
        {initials}
      </div>

      <div className="min-w-0 flex-1">
        <p className="type-title-sm truncate text-[var(--ink)]">
          {formatPlayerName(player.firstName, player.lastName)}
        </p>
        <div className="mt-[var(--space-2)] flex flex-wrap items-center gap-[var(--space-2)]">
          <span className="inline-flex items-center gap-[var(--space-1)] rounded-full border border-[var(--rule)] bg-[var(--canvas)] px-[var(--space-2)] py-[5px] text-[0.74rem] font-semibold text-[var(--ink-secondary)]">
            HCP {player.handicapIndex?.toFixed(1) ?? '—'}
          </span>
          {player.email ? (
            <span className="inline-flex max-w-full items-center gap-[var(--space-1)] rounded-full border border-[var(--rule)] bg-[var(--canvas)] px-[var(--space-2)] py-[5px] text-[0.74rem] font-semibold text-[var(--ink-secondary)]">
              <Mail size={12} className={toneStyles.icon} />
              <span className="truncate">{player.email}</span>
            </span>
          ) : null}
        </div>
      </div>

      {canEdit ? (
        <div className="flex items-center gap-[var(--space-2)]">
          <button
            onClick={onEdit}
            className="rounded-full border border-[var(--rule)] bg-[var(--canvas-raised)] p-[var(--space-2)] text-[var(--ink-secondary)] transition-colors hover:bg-[var(--canvas-sunken)]"
            aria-label={`Edit ${formatPlayerName(player.firstName, player.lastName)}`}
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={onDelete}
            className="rounded-full border border-[color:var(--error)]/20 bg-[color:var(--error)]/8 p-[var(--space-2)] text-[var(--error)] transition-colors hover:bg-[color:var(--error)]/12"
            aria-label={`Delete ${formatPlayerName(player.firstName, player.lastName)}`}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
