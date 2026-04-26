'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { DraftBoard } from '@/components/captain';
import { ArrowRight, CheckCircle2, Plus, RefreshCw, Shield, Shuffle, Sparkles, UserPlus, Users, UsersRound, X } from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { EmptyStatePremium, NoPlayersEmpty } from '@/components/ui';
import {
  PlayersFactCard,
  RosterSectionCard,
  type RosterPlayerQuickAction,
} from '@/components/players/PlayersPageSections';
import { useTripStore, useAccessStore, useToastStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import type { Player } from '@/lib/types/models';
import { createLogger } from '@/lib/utils/logger';
import { useTripRosterRefresh } from '@/lib/hooks/useTripRosterRefresh';

import {
  createEmptyRow,
  getHandicapValue,
  isValidEmail,
  isValidHandicapIndex,
  type BulkPlayerRow,
} from './playersFormHelpers';

type CommandCenterPanel = 'roster' | 'draft';

const logger = createLogger('players');

const INITIAL_FORM_DATA = {
  firstName: '',
  lastName: '',
  handicapIndex: '',
  email: '',
  teamId: '',
};

export default function PlayersPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
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
  } = useTripStore(useShallow(s => ({ currentTrip: s.currentTrip, teams: s.teams, players: s.players, teamMembers: s.teamMembers, addPlayer: s.addPlayer, updatePlayer: s.updatePlayer, removePlayer: s.removePlayer, assignPlayerToTeam: s.assignPlayerToTeam, removePlayerFromTeam: s.removePlayerFromTeam })));
  const { isCaptainMode } = useAccessStore(useShallow(s => ({ isCaptainMode: s.isCaptainMode })));
  const { showToast } = useToastStore(useShallow(s => ({ showToast: s.showToast })));

  // Poll the cloud for new signups while the captain watches the Roster
  // Desk. Without this the page only reflects whatever was in local
  // Dexie when the trip loaded — invitees signing up from their own
  // devices never landed here. Manual refresh is wired into the
  // rightSlot of the PageHeader below.
  const { isRefreshing: isRefreshingRoster, refresh: refreshRoster } = useTripRosterRefresh(
    currentTrip?.id ?? null,
  );

  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [playerToDelete, setPlayerToDelete] = useState<Player | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM_DATA);
  const [activePanel, setActivePanel] = useState<CommandCenterPanel>(
    searchParams.get('panel') === 'draft' ? 'draft' : 'roster'
  );
  const [bulkRows, setBulkRows] = useState<BulkPlayerRow[]>(() =>
    Array(4)
      .fill(null)
      .map(() => createEmptyRow())
  );

  useEffect(() => {
    setActivePanel(searchParams.get('panel') === 'draft' ? 'draft' : 'roster');
  }, [searchParams]);

  const getPlayerTeam = useCallback(
    (playerId: string) => {
      const membership = teamMembers.find((tm) => tm.playerId === playerId);
      if (!membership) return undefined;
      return teams.find((team) => team.id === membership.teamId);
    },
    [teamMembers, teams]
  );

  const resetForm = useCallback(() => {
    setFormData(INITIAL_FORM_DATA);
    setEditingPlayer(null);
    setShowAddModal(false);
  }, []);

  const handleEdit = useCallback(
    (player: Player) => {
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
    },
    [getPlayerTeam]
  );

  const handleSave = async () => {
    if (!formData.firstName || !formData.lastName) {
      showToast('error', 'First and last name are required');
      return;
    }

    if (formData.handicapIndex && !isValidHandicapIndex(formData.handicapIndex)) {
      showToast('error', 'Handicap must be between -10 and 54');
      return;
    }

    if (formData.email && !isValidEmail(formData.email)) {
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
      if (row.handicapIndex && !isValidHandicapIndex(row.handicapIndex)) {
        showToast(
          'error',
          `Invalid handicap for ${row.firstName} ${row.lastName}. Must be -10 to 54.`
        );
        return;
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
      setBulkRows(
        Array(4)
          .fill(null)
          .map(() => createEmptyRow())
      );
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
  const teamSizeGap = Math.abs(teamAPlayers.length - teamBPlayers.length);
  const readyForClassicMatches = Math.min(teamAPlayers.length, teamBPlayers.length) >= 4;
  const rosterReadyForCaptainFlow = unassignedPlayers.length === 0 && teamSizeGap <= 1;
  const rosterStatusTone = rosterReadyForCaptainFlow
    ? 'border-[color:var(--success)]/18 bg-[color:var(--success)]/10 text-[var(--success)]'
    : 'border-[color:var(--warning)]/18 bg-[color:var(--warning)]/10 text-[var(--warning)]';
  const rosterStatusLabel = rosterReadyForCaptainFlow
    ? 'Roster balanced and captain-ready'
    : unassignedPlayers.length > 0
      ? `${unassignedPlayers.length} player${unassignedPlayers.length === 1 ? '' : 's'} still need a side`
      : `Teams are off by ${teamSizeGap} player${teamSizeGap === 1 ? '' : 's'}`;
  const draftEligiblePlayers = unassignedPlayers;

  const handlePanelChange = useCallback(
    (nextPanel: CommandCenterPanel) => {
      setActivePanel(nextPanel);

      const params = new URLSearchParams(searchParams.toString());
      if (nextPanel === 'draft') {
        params.set('panel', 'draft');
      } else {
        params.delete('panel');
      }

      const nextQuery = params.toString();
      router.replace(nextQuery ? `/players?${nextQuery}` : '/players');
    },
    [router, searchParams]
  );

  const movePlayerToTeam = useCallback(
    async (player: Player, targetTeamId: string) => {
      try {
        await assignPlayerToTeam(player.id, targetTeamId);
        const nextTeam = teams.find((team) => team.id === targetTeamId);
        showToast(
          'success',
          `${player.firstName} ${player.lastName} moved to ${nextTeam?.name || 'the team'}`
        );
      } catch (error) {
        logger.error('Failed to reassign player', { error, playerId: player.id, targetTeamId });
        showToast('error', 'Failed to move player');
      }
    },
    [assignPlayerToTeam, showToast, teams]
  );

  const unassignPlayer = useCallback(
    async (player: Player) => {
      const currentTeam = getPlayerTeam(player.id);
      if (!currentTeam) return;

      try {
        await removePlayerFromTeam(player.id, currentTeam.id);
        showToast('info', `${player.firstName} ${player.lastName} moved to unassigned`);
      } catch (error) {
        logger.error('Failed to unassign player', { error, playerId: player.id });
        showToast('error', 'Failed to unassign player');
      }
    },
    [getPlayerTeam, removePlayerFromTeam, showToast]
  );

  const handleAutoBalanceTeams = useCallback(async () => {
    if (!teamA || !teamB) {
      showToast('error', 'Both teams must exist before you can auto-balance');
      return;
    }

    if (players.length < 2) {
      showToast('error', 'Add more players before auto-balancing the roster');
      return;
    }

    try {
      const handicaps = players
        .map((player) => player.handicapIndex)
        .filter((handicap): handicap is number => handicap !== undefined);
      const fallbackHandicap =
        handicaps.length > 0
          ? handicaps.reduce((sum, handicap) => sum + handicap, 0) / handicaps.length
          : 18;

      const sortedPlayers = [...players].sort((a, b) => {
        const handicapDelta = getHandicapValue(a, fallbackHandicap) - getHandicapValue(b, fallbackHandicap);
        if (handicapDelta !== 0) return handicapDelta;

        return `${a.lastName}${a.firstName}`.localeCompare(`${b.lastName}${b.firstName}`);
      });

      const nextAssignments = new Map<string, string>();
      const teamBuckets = {
        usa: { count: 0, total: 0 },
        europe: { count: 0, total: 0 },
      };

      sortedPlayers.forEach((player) => {
        const handicap = getHandicapValue(player, fallbackHandicap);
        const assignToUsa =
          teamBuckets.usa.count < teamBuckets.europe.count ||
          (teamBuckets.usa.count === teamBuckets.europe.count &&
            teamBuckets.usa.total > teamBuckets.europe.total);

        if (assignToUsa) {
          nextAssignments.set(player.id, teamA.id);
          teamBuckets.usa.count += 1;
          teamBuckets.usa.total += handicap;
        } else {
          nextAssignments.set(player.id, teamB.id);
          teamBuckets.europe.count += 1;
          teamBuckets.europe.total += handicap;
        }
      });

      for (const player of sortedPlayers) {
        const targetTeamId = nextAssignments.get(player.id);
        if (!targetTeamId) continue;
        await assignPlayerToTeam(player.id, targetTeamId);
      }

      showToast('success', 'Teams auto-balanced for an immediate captain-ready split');
    } catch (error) {
      logger.error('Failed to auto-balance teams', { error });
      showToast('error', 'Failed to auto-balance teams');
    }
  }, [assignPlayerToTeam, players, showToast, teamA, teamB]);

  const getTeamQuickActions = useCallback(
    (section: 'usa' | 'europe' | 'unassigned') => {
      return (player: Player): RosterPlayerQuickAction[] => {
        const actions: RosterPlayerQuickAction[] = [];

        if (section !== 'usa' && teamA) {
          actions.push({
            id: `${player.id}-usa`,
            label: `Move to ${teamA.name}`,
            onClick: () => {
              void movePlayerToTeam(player, teamA.id);
            },
            tone: 'usa',
          });
        }

        if (section !== 'europe' && teamB) {
          actions.push({
            id: `${player.id}-europe`,
            label: `Move to ${teamB.name}`,
            onClick: () => {
              void movePlayerToTeam(player, teamB.id);
            },
            tone: 'europe',
          });
        }

        if (section !== 'unassigned') {
          actions.push({
            id: `${player.id}-unassign`,
            label: 'Unassign',
            onClick: () => {
              void unassignPlayer(player);
            },
            tone: 'neutral',
          });
        }

        return actions;
      };
    },
    [movePlayerToTeam, teamA, teamB, unassignPlayer]
  );

  const handleDraftComplete = useCallback(
    async (assignments: Map<string, string>) => {
      let successCount = 0;
      let failedCount = 0;

      try {
        for (const [playerId, teamId] of assignments.entries()) {
          const existingMembership = teamMembers.find((membership) => membership.playerId === playerId);
          if (existingMembership) continue;

          try {
            await assignPlayerToTeam(playerId, teamId);
            successCount += 1;
          } catch (error) {
            logger.error('Failed to assign drafted player', { error, playerId, teamId });
            failedCount += 1;
          }
        }

        if (failedCount > 0) {
          showToast(
            'warning',
            `Draft partially complete: ${successCount} assigned, ${failedCount} failed. Please retry.`
          );
          return;
        }

        if (successCount > 0) {
          showToast('success', `Draft complete. ${successCount} player${successCount === 1 ? '' : 's'} assigned.`);
          handlePanelChange('roster');
          return;
        }

        showToast('info', 'All players were already assigned.');
        handlePanelChange('roster');
      } catch (error) {
        logger.error('Draft flow failed', { error });
        showToast('error', 'Draft failed. Please try again.');
      }
    },
    [assignPlayerToTeam, handlePanelChange, showToast, teamMembers]
  );

  if (!currentTrip) {
    return (
      <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
        <PageHeader
          title="Players"
          subtitle="No active trip"
          icon={<Users size={16} className="text-[var(--color-accent)]" />}
          backFallback="/"
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
        backFallback="/"
        rightSlot={
          <button
            type="button"
            onClick={() => void refreshRoster()}
            disabled={isRefreshingRoster}
            className="inline-flex items-center gap-1.5 rounded-full border border-[color:var(--rule)] bg-[var(--canvas)] px-3 py-1.5 text-xs font-semibold text-[var(--ink-secondary)] disabled:opacity-60"
            aria-label="Refresh roster from cloud"
          >
            <RefreshCw size={12} className={isRefreshingRoster ? 'animate-spin' : undefined} />
            {isRefreshingRoster ? 'Refreshing…' : 'Refresh'}
          </button>
        }
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
                  <Shield
                    size={15}
                    className={
                      isCaptainMode ? 'text-[var(--masters)]' : 'text-[var(--ink-tertiary)]'
                    }
                  />
                  <span className="type-caption font-semibold text-[var(--ink)]">
                    {isCaptainMode ? 'Captain Mode Active' : 'View Only'}
                  </span>
                </div>
              </div>

              {isCaptainMode ? (
                <div className="grid gap-[var(--space-3)] sm:grid-cols-3">
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
                  <Button
                    variant="secondary"
                    leftIcon={<Sparkles size={16} />}
                    onClick={() => {
                      void handleAutoBalanceTeams();
                    }}
                    className="w-full justify-center"
                  >
                    Auto-Balance Teams
                  </Button>
                </div>
              ) : null}

              <div className="rounded-[1.5rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.72)] p-[var(--space-4)] shadow-[0_14px_28px_rgba(46,34,18,0.05)]">
                <div className="flex flex-col gap-[var(--space-4)] lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className={`inline-flex items-center gap-[var(--space-2)] rounded-full border px-[var(--space-3)] py-[var(--space-2)] ${rosterStatusTone}`}>
                      <span className="type-caption font-semibold">{rosterStatusLabel}</span>
                    </div>
                    <h2 className="mt-[var(--space-3)] type-title-lg text-[var(--ink)]">
                      Get the roster ready before lineup day.
                    </h2>
                    <p className="mt-[var(--space-2)] type-body-sm text-[var(--ink-secondary)]">
                      World-class captain flow means no dead ends: place every golfer, keep the sides even, then jump straight into session building with confidence.
                    </p>
                  </div>

                  <div className="grid gap-[var(--space-3)] sm:grid-cols-2 lg:min-w-[320px]">
                    <div className="rounded-[1.1rem] border border-[var(--rule)] bg-[var(--canvas)] px-[var(--space-4)] py-[var(--space-3)]">
                      <p className="type-overline text-[var(--ink-tertiary)]">Next captain move</p>
                      <p className="mt-[var(--space-2)] type-title-sm text-[var(--ink)]">
                        {rosterReadyForCaptainFlow ? 'Open lineup studio' : 'Finish team assignment'}
                      </p>
                      <p className="mt-[var(--space-1)] type-caption text-[var(--ink-secondary)]">
                        {rosterReadyForCaptainFlow
                          ? readyForClassicMatches
                            ? 'Your roster is ready to build the next session.'
                            : 'You have balance, but add more players before full four-ball cards.'
                          : 'Use the quick move actions below or auto-balance the full field.'}
                      </p>
                    </div>

                    <Link
                      href={rosterReadyForCaptainFlow ? '/captain/lineup/new' : '/players?panel=draft'}
                      className="flex items-center justify-between rounded-[1.1rem] border border-[color:var(--maroon)]/16 bg-[linear-gradient(180deg,rgba(114,47,55,0.08),rgba(255,255,255,0.96))] px-[var(--space-4)] py-[var(--space-4)] no-underline transition-transform hover:-translate-y-[1px]"
                    >
                      <div>
                        <p className="type-overline text-[var(--maroon)]">
                          {rosterReadyForCaptainFlow ? 'Ready for lineups' : 'Need assignment help'}
                        </p>
                        <p className="mt-[var(--space-1)] type-title-sm text-[var(--ink)]">
                          {rosterReadyForCaptainFlow ? 'Continue to lineups' : 'Open draft board'}
                        </p>
                      </div>
                      <ArrowRight size={18} className="text-[var(--maroon)]" />
                    </Link>
                  </div>
                </div>
              </div>
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

        <section className="pt-[var(--space-6)]">
          <div className="overflow-hidden rounded-[2rem] border border-[var(--rule)] bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(248,244,237,0.96))] shadow-[0_22px_48px_rgba(46,34,18,0.08)]">
            <div className="border-b border-[color:var(--rule)]/80 px-[var(--space-5)] py-[var(--space-5)]">
              <div className="flex flex-col gap-[var(--space-4)] lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <p className="type-overline tracking-[0.18em] text-[var(--ink-tertiary)]">
                    Captain Roster
                  </p>
                  <h2 className="mt-[var(--space-2)] font-serif text-[clamp(1.9rem,6vw,2.7rem)] italic leading-[1.04] text-[var(--ink)]">
                    Manage roster moves and the draft from one place.
                  </h2>
                  <p className="mt-[var(--space-3)] type-body-sm text-[var(--ink-secondary)]">
                    Keep the player list visible, move golfers manually when you need precision, or switch into the draft without leaving the roster page.
                  </p>
                </div>

                <div className="grid gap-[var(--space-2)] sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => handlePanelChange('roster')}
                    className={`rounded-[1rem] border px-[var(--space-4)] py-[var(--space-3)] text-left transition-colors ${
                      activePanel === 'roster'
                        ? 'border-[color:var(--maroon)]/18 bg-[color:var(--maroon)]/10'
                        : 'border-[var(--rule)] bg-[rgba(255,255,255,0.74)]'
                    }`}
                  >
                    <p className="type-overline text-[var(--ink-tertiary)]">Roster view</p>
                    <p className="mt-[var(--space-1)] type-title-sm text-[var(--ink)]">Manage players</p>
                    <p className="mt-[var(--space-1)] type-caption text-[var(--ink-secondary)]">
                      Manual assignment, edits, and cleanup.
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handlePanelChange('draft')}
                    className={`rounded-[1rem] border px-[var(--space-4)] py-[var(--space-3)] text-left transition-colors ${
                      activePanel === 'draft'
                        ? 'border-[color:var(--maroon)]/18 bg-[color:var(--maroon)]/10'
                        : 'border-[var(--rule)] bg-[rgba(255,255,255,0.74)]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-[var(--space-2)]">
                      <div>
                        <p className="type-overline text-[var(--ink-tertiary)]">Draft</p>
                        <p className="mt-[var(--space-1)] type-title-sm text-[var(--ink)]">Assign teams live</p>
                      </div>
                      <span className="inline-flex items-center rounded-full border border-[color:var(--gold)]/18 bg-[color:var(--gold)]/10 px-[var(--space-2)] py-[5px] text-[0.72rem] font-semibold text-[var(--gold-dark)]">
                        {draftEligiblePlayers.length} left
                      </span>
                    </div>
                    <p className="mt-[var(--space-1)] type-caption text-[var(--ink-secondary)]">
                      Run snake, auction, random, or balanced assignment here.
                    </p>
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-[var(--space-3)] px-[var(--space-5)] py-[var(--space-5)] md:grid-cols-4">
              <PlayersFactCard
                label="Active Workspace"
                value={activePanel === 'draft' ? 'Draft' : 'Roster'}
                valueClassName="font-sans text-[1rem] not-italic"
              />
              <PlayersFactCard label="Draftable" value={draftEligiblePlayers.length} />
              <PlayersFactCard label="Team Gap" value={teamSizeGap} />
              <PlayersFactCard
                label="Next Move"
                value={draftEligiblePlayers.length > 0 ? 'Assign' : 'Lineup'}
                valueClassName="font-sans text-[1rem] not-italic"
              />
            </div>
          </div>
        </section>

        {players.length === 0 ? (
          <div className="py-[var(--space-10)]">
            <NoPlayersEmpty
              onAddPlayer={isCaptainMode ? () => setShowAddModal(true) : undefined}
            />
          </div>
        ) : (
          <div className="space-y-[var(--space-4)] pt-[var(--space-6)]">
            {activePanel === 'draft' ? (
              <section className="pb-[var(--space-2)]">
                {!isCaptainMode ? (
                  <EmptyStatePremium
                    illustration="golfers"
                    title="Captain Mode required"
                    description="Turn on Captain Mode to run the draft from the roster page."
                    variant="large"
                  />
                ) : draftEligiblePlayers.length === 0 ? (
                  <EmptyStatePremium
                    illustration="golfers"
                    title="The draft is clear"
                    description="Every player already has a side. Fine-tune the roster manually below or move straight into lineup work."
                    action={{
                      label: 'Build lineups',
                      onClick: () => router.push('/captain/lineup/new'),
                      icon: <CheckCircle2 size={16} />,
                    }}
                    secondaryAction={{
                      label: 'Return to roster',
                      onClick: () => handlePanelChange('roster'),
                    }}
                    variant="large"
                  />
                ) : players.length < 2 ? (
                  <EmptyStatePremium
                    illustration="golfers"
                    title="Add a few more players"
                    description="You need at least two players before the draft means anything."
                    action={{
                      label: 'Add player',
                      onClick: () => setShowAddModal(true),
                      icon: <Users size={16} />,
                    }}
                    secondaryAction={{
                      label: 'Return to roster',
                      onClick: () => handlePanelChange('roster'),
                    }}
                    variant="large"
                  />
                ) : teams.length < 2 ? (
                  <EmptyStatePremium
                    illustration="trophy"
                    title="Teams aren’t set up yet"
                    description="Create both teams first, then come back here to sort players onto each side."
                    secondaryAction={{
                      label: 'Return to roster',
                      onClick: () => handlePanelChange('roster'),
                    }}
                    variant="large"
                  />
                ) : (
                  <DraftBoard
                    players={draftEligiblePlayers}
                    teams={teams}
                    onDraftComplete={handleDraftComplete}
                  />
                )}
              </section>
            ) : null}

            <RosterSectionCard
              title={teamA?.name || 'USA'}
              eyebrow="United States"
              description="Keep the American side tidy and easy to scan before captain work begins."
              players={teamAPlayers}
              tone="usa"
              canEdit={isCaptainMode}
              onEdit={handleEdit}
              onDelete={setPlayerToDelete}
              getQuickActions={isCaptainMode ? getTeamQuickActions('usa') : undefined}
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
              getQuickActions={isCaptainMode ? getTeamQuickActions('europe') : undefined}
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
              getQuickActions={isCaptainMode ? getTeamQuickActions('unassigned') : undefined}
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
              <Button
                variant="secondary"
                onClick={resetForm}
                disabled={isSaving}
                className="flex-1"
              >
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
                {playerToDelete.firstName} {playerToDelete.lastName} will be removed from the
                roster and any existing matches.
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
                <PlayersFactCard
                  label="USA"
                  value={bulkRows.filter((row) => row.teamId === teamA?.id).length}
                />
                <PlayersFactCard
                  label="Europe"
                  value={bulkRows.filter((row) => row.teamId === teamB?.id).length}
                />
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
                        onChange={(event) => updateBulkRow(row.id, 'firstName', event.target.value)}
                        placeholder="John"
                      />
                    </label>

                    <label className="space-y-[var(--space-2)]">
                      <span className="type-meta font-semibold text-[var(--ink)]">Last name</span>
                      <input
                        type="text"
                        className="input"
                        value={row.lastName}
                        onChange={(event) => updateBulkRow(row.id, 'lastName', event.target.value)}
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
                <Button
                  variant="secondary"
                  onClick={() => setShowBulkAdd(false)}
                  className="flex-1"
                >
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
