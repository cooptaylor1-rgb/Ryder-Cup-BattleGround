'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  CaptainModeRequiredState,
  CaptainNoTripState,
} from '@/components/captain/CaptainAccessState';
import { PageHeader } from '@/components/layout';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { EmptyBoardPanel, BetSection, BetsFactCard } from '@/components/bets/BetsPageSections';
import {
  BetComposerModal,
  BetManagementCard,
  CaptainNote,
} from '@/components/bets/CaptainBetsPageSections';
import { getSideBetDefinition, SIDE_BET_DEFINITIONS } from '@/lib/constants';
import { db } from '@/lib/db';
import { useTripStore, useAccessStore, useToastStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import type { SideBet, SideBetType } from '@/lib/types/models';
import { betsLogger } from '@/lib/utils/logger';
import { Check, DollarSign, Plus, Users } from 'lucide-react';

const VALID_BET_TYPES: SideBetType[] = ['skins', 'nassau', 'ctp', 'longdrive', 'custom'];

export default function CaptainBetsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { currentTrip, players } = useTripStore(useShallow(s => ({ currentTrip: s.currentTrip, players: s.players })));
  const { isCaptainMode } = useAccessStore(useShallow(s => ({ isCaptainMode: s.isCaptainMode })));
  const { showToast } = useToastStore(useShallow(s => ({ showToast: s.showToast })));
  const { showConfirm, ConfirmDialogComponent } = useConfirmDialog();

  const [showComposer, setShowComposer] = useState(false);
  const [editingBet, setEditingBet] = useState<SideBet | null>(null);
  const [newBetType, setNewBetType] = useState<SideBetType>('skins');
  const [newBetName, setNewBetName] = useState('');
  const [newBetDescription, setNewBetDescription] = useState('');
  const [newBetPot, setNewBetPot] = useState(20);
  const [newBetHole, setNewBetHole] = useState<number | undefined>();
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sideBets = useLiveQuery(
    async () => (currentTrip ? db.sideBets.where('tripId').equals(currentTrip.id).toArray() : []),
    [currentTrip?.id],
    []
  );

  const resetForm = useCallback(() => {
    const defaultBet = getSideBetDefinition('skins');
    setNewBetType(defaultBet.type);
    setNewBetName(defaultBet.label);
    setNewBetDescription(defaultBet.description);
    setNewBetPot(defaultBet.defaultPot);
    setNewBetHole(undefined);
    setSelectedParticipants(players.map((player) => player.id));
    setEditingBet(null);
  }, [players]);

  const openCreateModal = useCallback(
    (type: SideBetType) => {
      const betType = getSideBetDefinition(type);
      setNewBetType(type);
      setNewBetName(betType.label);
      setNewBetDescription(betType.description);
      setNewBetPot(betType.defaultPot);
      setNewBetHole(undefined);
      setSelectedParticipants(players.map((player) => player.id));
      setEditingBet(null);
      setShowComposer(true);
    },
    [players]
  );

  // Deep link from the lineup format picker — `/captain/bets?type=skins`
  // lands here with the composer already primed. Guard with a ref so the
  // modal fires once per visit; clear the query so a navigation back
  // doesn't reopen it.
  const typeParam = searchParams?.get('type');
  const prefilledRef = useRef(false);
  useEffect(() => {
    if (prefilledRef.current) return;
    if (!typeParam) return;
    if (!VALID_BET_TYPES.includes(typeParam as SideBetType)) return;
    prefilledRef.current = true;
    openCreateModal(typeParam as SideBetType);
    router.replace('/captain/bets');
  }, [typeParam, openCreateModal, router]);

  const openEditModal = useCallback((bet: SideBet) => {
    setEditingBet(bet);
    setNewBetType(bet.type);
    setNewBetName(bet.name);
    setNewBetDescription(bet.description || '');
    setNewBetPot(bet.pot || 0);
    setNewBetHole(bet.hole);
    setSelectedParticipants(bet.participantIds);
    setShowComposer(true);
  }, []);

  const closeComposer = useCallback(() => {
    setShowComposer(false);
    resetForm();
  }, [resetForm]);

  const executeDeleteBet = useCallback(
    async (betId: string) => {
      if (!currentTrip) {
        return;
      }

      setIsSubmitting(true);
      try {
        await db.sideBets.delete(betId);
        showToast('success', 'Bet deleted');
      } catch (error) {
        betsLogger.error('Failed to delete bet:', error);
        showToast('error', 'Failed to delete bet. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [currentTrip, showToast]
  );

  const handleDeleteBet = useCallback(
    (betId: string) => {
      showConfirm({
        title: 'Delete Bet',
        message: 'Are you sure you want to delete this bet? This action cannot be undone.',
        confirmLabel: 'Delete',
        cancelLabel: 'Cancel',
        variant: 'danger',
        onConfirm: async () => {
          await executeDeleteBet(betId);
        },
      });
    },
    [executeDeleteBet, showConfirm]
  );

  const handleCreateBet = useCallback(async () => {
    if (!currentTrip || isSubmitting) {
      return;
    }

    if (!newBetName.trim()) {
      showToast('error', 'Please enter a bet name');
      return;
    }

    setIsSubmitting(true);
    try {
      const newBet: SideBet = {
        id: crypto.randomUUID(),
        tripId: currentTrip.id,
        type: newBetType,
        name: newBetName,
        description: newBetDescription,
        status: 'active',
        pot: newBetPot,
        participantIds: selectedParticipants,
        hole: newBetHole,
        createdAt: new Date().toISOString(),
      };

      await db.sideBets.add(newBet);
      showToast('success', `${newBetName} created!`);
      closeComposer();
    } catch (error) {
      betsLogger.error('Failed to create bet:', error);
      showToast('error', 'Failed to create bet. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    closeComposer,
    currentTrip,
    isSubmitting,
    newBetDescription,
    newBetHole,
    newBetName,
    newBetPot,
    newBetType,
    selectedParticipants,
    showToast,
  ]);

  const handleUpdateBet = useCallback(
    async (betId: string, updates: Partial<SideBet>) => {
      if (isSubmitting) {
        return;
      }

      setIsSubmitting(true);
      try {
        await db.sideBets.update(betId, updates);
        showToast('success', 'Bet updated');
        closeComposer();
      } catch (error) {
        betsLogger.error('Failed to update bet:', error);
        showToast('error', 'Failed to update bet. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [closeComposer, isSubmitting, showToast]
  );

  const handleCompleteBet = useCallback(
    async (betId: string, winnerId?: string) => {
      if (isSubmitting) {
        return;
      }

      setIsSubmitting(true);
      try {
        await db.sideBets.update(betId, {
          status: 'completed',
          winnerId,
        });
        showToast('success', 'Bet completed!');
      } catch (error) {
        betsLogger.error('Failed to complete bet:', error);
        showToast('error', 'Failed to complete bet. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, showToast]
  );

  if (!currentTrip) {
    return <CaptainNoTripState description="Start or select a trip to manage side bets." />;
  }

  if (!isCaptainMode) {
    return <CaptainModeRequiredState description="Turn on Captain Mode to access side bets." />;
  }

  const activeBets = sideBets.filter((bet) => bet.status === 'active' || bet.status === 'pending');
  const completedBets = sideBets.filter((bet) => bet.status === 'completed');
  const totalPot = activeBets.reduce((sum, bet) => sum + (bet.pot || 0), 0);

  const getPlayer = (id: string) => players.find((player) => player.id === id);
  const getBetMeta = (type: SideBetType) =>
    SIDE_BET_DEFINITIONS.find((candidate) => candidate.type === type);

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Side Bets"
        subtitle={currentTrip.name}
        icon={<DollarSign size={16} className="text-[var(--canvas)]" />}
        iconTone="captain"
        backFallback="/captain"
        rightSlot={
          <Button
            variant="primary"
            size="sm"
            onClick={() => openCreateModal('custom')}
            leftIcon={<Plus size={16} />}
          >
            New Bet
          </Button>
        }
      />

      <main className="container-editorial py-[var(--space-6)] pb-[var(--space-12)]">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--maroon-subtle)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,240,241,0.98))] shadow-[0_24px_52px_rgba(46,34,18,0.08)]">
          <div className="grid gap-[var(--space-5)] px-[var(--space-5)] py-[var(--space-5)] lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.95fr)]">
            <div>
              <p className="type-overline tracking-[0.18em] text-[var(--maroon)]">Captain Games Room</p>
              <h1 className="mt-[var(--space-2)] font-serif text-[clamp(2rem,7vw,3.15rem)] italic leading-[1.02] text-[var(--ink)]">
                Keep the side action organized before it turns into folklore.
              </h1>
              <p className="mt-[var(--space-3)] max-w-[35rem] type-body-sm text-[var(--ink-secondary)]">
                The best side bets feel intentional, not improvised. Put them on one board, track the pot cleanly, and
                make the winner obvious when the day is done.
              </p>

              <div className="mt-[var(--space-5)] flex flex-wrap gap-[var(--space-3)]">
                <Button variant="primary" onClick={() => openCreateModal('custom')} leftIcon={<Plus size={16} />}>
                  Create custom bet
                </Button>
                <Link
                  href="/bets"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[color:var(--rule)]/65 bg-[color:var(--surface)]/82 px-[var(--space-4)] py-[var(--space-3)] text-sm font-semibold text-[var(--ink)] transition-transform duration-150 hover:scale-[1.02] hover:border-[var(--maroon-subtle)] hover:bg-[var(--surface)]"
                >
                  Open public board
                </Link>
              </div>
            </div>

            <div className="grid gap-[var(--space-3)] sm:grid-cols-2 lg:grid-cols-2">
              <BetsFactCard
                icon={<DollarSign size={18} />}
                label="Active"
                value={activeBets.length}
                detail="Open games in motion"
                tone={activeBets.length > 0 ? 'maroon' : 'ink'}
              />
              <BetsFactCard
                icon={<Check size={18} />}
                label="Completed"
                value={completedBets.length}
                detail="Bets already settled"
                tone={completedBets.length > 0 ? 'green' : 'ink'}
              />
              <BetsFactCard
                icon={<DollarSign size={18} />}
                label="Pot"
                value={`$${totalPot}`}
                detail="Money still in play"
                tone={totalPot > 0 ? 'green' : 'ink'}
              />
              <BetsFactCard
                icon={<Users size={18} />}
                label="Participants"
                value={players.length}
                detail="Eligible players in the trip"
              />
            </div>
          </div>
        </section>

        <section className="mt-[var(--space-6)] grid gap-[var(--space-4)] xl:grid-cols-[minmax(0,1.15fr)_22rem]">
          <div className="space-y-[var(--space-4)]">
            <div className="rounded-[1.8rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,239,232,0.99))] p-[var(--space-5)] shadow-[0_20px_46px_rgba(41,29,17,0.08)]">
              <div className="mb-[var(--space-4)]">
                <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">Quick Create</p>
                <h2 className="mt-[var(--space-2)] font-serif text-[1.95rem] italic text-[var(--ink)]">
                  Start with the games people already understand.
                </h2>
              </div>

              <div className="grid gap-[var(--space-3)] md:grid-cols-2">
                {SIDE_BET_DEFINITIONS.map((betType) => (
                  <button
                    key={betType.type}
                    type="button"
                    onClick={() => openCreateModal(betType.type)}
                    className="flex items-center gap-[var(--space-3)] rounded-[1.35rem] border border-[color:var(--rule)]/70 bg-[color:var(--canvas)]/78 p-[var(--space-4)] text-left transition-transform duration-150 hover:scale-[1.01] hover:border-[var(--maroon-subtle)]"
                  >
                    <div
                      className="flex h-11 w-11 items-center justify-center rounded-[1rem]"
                      style={{
                        background: `color-mix(in srgb, ${betType.accent} 14%, white)`,
                        color: betType.accent,
                      }}
                    >
                      <betType.icon size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[var(--ink)]">{betType.label}</p>
                      <p className="text-sm text-[var(--ink-secondary)]">{betType.description}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <BetSection title={`Active Bets (${activeBets.length})`} subtitle="The games still in play.">
              {activeBets.length > 0 ? (
                <div className="space-y-3">
                  {activeBets.map((bet) => (
                    <BetManagementCard
                      key={bet.id}
                      bet={bet}
                      getPlayer={getPlayer}
                      getBetMeta={getBetMeta}
                      onEdit={() => openEditModal(bet)}
                      onDelete={() => handleDeleteBet(bet.id)}
                      onComplete={(winnerId) => void handleCompleteBet(bet.id, winnerId)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyBoardPanel
                  title="No bets are on the board."
                  body="Start with skins, closest to the pin, or one custom wager the group will actually track."
                  actionLabel="Create a bet"
                  onAction={() => openCreateModal('skins')}
                />
              )}
            </BetSection>

            {completedBets.length > 0 ? (
              <BetSection title={`Completed (${completedBets.length})`} subtitle="Settled and logged.">
                <div className="space-y-3">
                  {completedBets.map((bet) => (
                    <BetManagementCard
                      key={bet.id}
                      bet={bet}
                      getPlayer={getPlayer}
                      getBetMeta={getBetMeta}
                      onDelete={() => handleDeleteBet(bet.id)}
                      isCompleted
                    />
                  ))}
                </div>
              </BetSection>
            ) : null}
          </div>

          <aside className="space-y-[var(--space-4)]">
            <CaptainNote
              title="Keep the games legible"
              body="The right bet board feels more like a rules sheet than a gambling story. Make the format obvious and the winner undeniable."
              icon={<DollarSign size={18} />}
            />
            <CaptainNote
              title="Hand the players one clean board"
              body="If the captain room is tidy, the public bets page can stay simple. That is the point: one desk to set the wagers, one board for everyone else to read."
              icon={<Users size={18} />}
              tone="maroon"
            />
          </aside>
        </section>
      </main>

      {showComposer ? (
        <BetComposerModal
          betTypes={SIDE_BET_DEFINITIONS}
          editingBet={editingBet}
          players={players}
          newBetType={newBetType}
          newBetName={newBetName}
          newBetDescription={newBetDescription}
          newBetPot={newBetPot}
          newBetHole={newBetHole}
          selectedParticipants={selectedParticipants}
          isSubmitting={isSubmitting}
          onClose={closeComposer}
          onTypeChange={(type) => {
            const betType = getSideBetDefinition(type);
            setNewBetType(type);
            if (!editingBet) {
              setNewBetName(betType.label);
              setNewBetDescription(betType.description);
              setNewBetPot(betType.defaultPot);
            }
          }}
          onNameChange={setNewBetName}
          onDescriptionChange={setNewBetDescription}
          onPotChange={setNewBetPot}
          onHoleChange={setNewBetHole}
          onParticipantsChange={setSelectedParticipants}
          onSubmit={() => {
            if (editingBet) {
              void handleUpdateBet(editingBet.id, {
                name: newBetName,
                description: newBetDescription,
                pot: newBetPot,
                hole: newBetHole,
              });
              return;
            }

            void handleCreateBet();
          }}
        />
      ) : null}

      {ConfirmDialogComponent}
    </div>
  );
}
