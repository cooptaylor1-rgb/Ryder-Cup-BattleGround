'use client';

import Link from 'next/link';
import { useState, useCallback, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { EmptyStatePremium } from '@/components/ui/EmptyStatePremium';
import { getSideBetDefinition, SIDE_BET_DEFINITIONS } from '@/lib/constants';
import { db } from '@/lib/db';
import { useTripStore, useUIStore } from '@/lib/stores';
import { betsLogger } from '@/lib/utils/logger';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { cn } from '@/lib/utils';
import type { SideBet, SideBetType, Player } from '@/lib/types/models';
import {
  Check,
  Clock,
  Crown,
  DollarSign,
  Edit3,
  Home,
  MoreHorizontal,
  Plus,
  Save,
  Trash2,
  Users,
  X,
} from 'lucide-react';

export default function CaptainBetsPage() {
  const router = useRouter();
  const { currentTrip, players } = useTripStore();
  const { isCaptainMode, showToast } = useUIStore();
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
    async () => {
      if (!currentTrip) return [];
      return db.sideBets.where('tripId').equals(currentTrip.id).toArray();
    },
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
      if (!currentTrip) return;
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

  if (!currentTrip) {
    return (
      <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="golf-ball"
            title="No active trip"
            description="Start or select a trip to manage side bets."
            action={{
              label: 'Go Home',
              onClick: () => router.push('/'),
              icon: <Home size={16} />,
            }}
            variant="large"
          />
        </main>
      </div>
    );
  }

  if (!isCaptainMode) {
    return (
      <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="trophy"
            title="Captain mode required"
            description="Turn on Captain Mode to access Side Bets."
            action={{
              label: 'Open More',
              onClick: () => router.push('/more'),
              icon: <MoreHorizontal size={16} />,
            }}
            secondaryAction={{
              label: 'Go Home',
              onClick: () => router.push('/'),
            }}
            variant="large"
          />
        </main>
      </div>
    );
  }

  const activeBets = sideBets.filter((bet) => bet.status === 'active' || bet.status === 'pending');
  const completedBets = sideBets.filter((bet) => bet.status === 'completed');
  const totalPot = activeBets.reduce((sum, bet) => sum + (bet.pot || 0), 0);

  const handleCreateBet = async () => {
    if (!currentTrip || isSubmitting) return;
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
  };

  const handleUpdateBet = async (betId: string, updates: Partial<SideBet>) => {
    if (isSubmitting) return;
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
  };

  const handleCompleteBet = async (betId: string, winnerId?: string) => {
    if (isSubmitting) return;
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
  };

  const getPlayer = (id: string) => players.find((player) => player.id === id);

  const getBetMeta = (type: SideBetType) =>
    SIDE_BET_DEFINITIONS.find((candidate) => candidate.type === type);

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Side Bets"
        subtitle={currentTrip.name}
        icon={<DollarSign size={16} className="text-[var(--canvas)]" />}
        iconContainerClassName="bg-[linear-gradient(135deg,var(--maroon)_0%,var(--maroon-dark)_100%)]"
        onBack={() => router.back()}
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
                The best side bets feel intentional, not improvised. Put them on one board, track the pot cleanly, and make the winner obvious when the day is done.
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
              <BetsFactCard icon={<DollarSign size={18} />} label="Active" value={activeBets.length} detail="Open games in motion" tone={activeBets.length > 0 ? 'maroon' : 'ink'} />
              <BetsFactCard icon={<Check size={18} />} label="Completed" value={completedBets.length} detail="Bets already settled" tone={completedBets.length > 0 ? 'green' : 'ink'} />
              <BetsFactCard icon={<DollarSign size={18} />} label="Pot" value={`$${totalPot}`} detail="Money still in play" tone={totalPot > 0 ? 'green' : 'ink'} />
              <BetsFactCard icon={<Users size={18} />} label="Participants" value={players.length} detail="Eligible players in the trip" />
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

            <BetSection
              title={`Active Bets (${activeBets.length})`}
              subtitle="The games still in play."
            >
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
                      onComplete={(winnerId) => handleCompleteBet(bet.id, winnerId)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyPanel
                  title="No bets are on the board."
                  body="Start with skins, closest to the pin, or one custom wager the group will actually track."
                  actionLabel="Create a bet"
                  onAction={() => openCreateModal('skins')}
                />
              )}
            </BetSection>

            {completedBets.length > 0 ? (
              <BetSection
                title={`Completed (${completedBets.length})`}
                subtitle="Settled and logged."
              >
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

function BetsFactCard({
  icon,
  label,
  value,
  detail,
  tone = 'ink',
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  detail: string;
  tone?: 'ink' | 'green' | 'maroon';
}) {
  return (
    <div
      className={cn(
        'rounded-[1.5rem] border p-[var(--space-4)] shadow-[0_16px_34px_rgba(41,29,17,0.05)]',
        tone === 'green'
          ? 'border-[color:var(--success)]/16 bg-[linear-gradient(180deg,rgba(45,122,79,0.10),rgba(255,255,255,0.98))]'
          : tone === 'maroon'
            ? 'border-[color:var(--maroon)]/16 bg-[linear-gradient(180deg,rgba(104,35,48,0.10),rgba(255,255,255,0.98))]'
            : 'border-[color:var(--rule)]/70 bg-[color:var(--surface)]/78'
      )}
    >
      <div className="flex items-center gap-[var(--space-2)] text-[var(--ink-tertiary)]">
        {icon}
        <span className="type-overline tracking-[0.14em]">{label}</span>
      </div>
      <p className="mt-[var(--space-3)] font-serif text-[1.95rem] italic leading-none text-[var(--ink)]">{value}</p>
      <p className="mt-[var(--space-2)] text-sm text-[var(--ink-secondary)]">{detail}</p>
    </div>
  );
}

function BetSection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[1.8rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,239,232,0.99))] p-[var(--space-5)] shadow-[0_20px_46px_rgba(41,29,17,0.08)]">
      <div className="mb-[var(--space-4)]">
        <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">{title}</p>
        <p className="mt-[var(--space-1)] text-sm text-[var(--ink-secondary)]">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function EmptyPanel({
  title,
  body,
  actionLabel,
  onAction,
}: {
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="rounded-[1.5rem] border border-dashed border-[color:var(--rule)]/75 bg-[color:var(--surface)]/74 p-[var(--space-7)] text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-[var(--surface-raised)] text-[var(--ink-tertiary)]">
        <DollarSign size={26} />
      </div>
      <h3 className="mt-[var(--space-4)] font-serif text-[1.7rem] italic text-[var(--ink)]">{title}</h3>
      <p className="mx-auto mt-[var(--space-2)] max-w-[30rem] type-body-sm text-[var(--ink-secondary)]">{body}</p>
      <Button variant="primary" onClick={onAction} leftIcon={<Plus size={16} />} className="mt-[var(--space-5)]">
        {actionLabel}
      </Button>
    </div>
  );
}

function BetComposerModal({
  betTypes,
  editingBet,
  players,
  newBetType,
  newBetName,
  newBetDescription,
  newBetPot,
  newBetHole,
  selectedParticipants,
  isSubmitting,
  onClose,
  onTypeChange,
  onNameChange,
  onDescriptionChange,
  onPotChange,
  onHoleChange,
  onParticipantsChange,
  onSubmit,
}: {
  betTypes: typeof SIDE_BET_DEFINITIONS;
  editingBet: SideBet | null;
  players: Player[];
  newBetType: SideBetType;
  newBetName: string;
  newBetDescription: string;
  newBetPot: number;
  newBetHole: number | undefined;
  selectedParticipants: string[];
  isSubmitting: boolean;
  onClose: () => void;
  onTypeChange: (type: SideBetType) => void;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onPotChange: (value: number) => void;
  onHoleChange: (value: number | undefined) => void;
  onParticipantsChange: (value: string[]) => void;
  onSubmit: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-[color:var(--ink)]/70 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[560px] overflow-auto rounded-[1.8rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,239,232,1))] p-[var(--space-5)] shadow-[0_26px_60px_rgba(17,15,10,0.28)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-[var(--space-3)]">
          <div>
            <p className="type-overline tracking-[0.16em] text-[var(--maroon)]">
              {editingBet ? 'Edit Bet' : 'Create Bet'}
            </p>
            <h2 className="mt-[var(--space-2)] font-serif text-[1.95rem] italic text-[var(--ink)]">
              Keep the wager readable.
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--surface)] text-[var(--ink-tertiary)]"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mt-[var(--space-5)] space-y-[var(--space-4)]">
          {!editingBet ? (
            <div className="rounded-[1.2rem] border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/82 p-[var(--space-3)]">
              <p className="type-overline tracking-[0.15em] text-[var(--ink-tertiary)]">Bet Type</p>
              <div className="mt-[var(--space-3)] flex flex-wrap gap-2">
                {betTypes.map((betType) => (
                  <button
                    key={betType.type}
                    type="button"
                    onClick={() => onTypeChange(betType.type)}
                    className={cn(
                      'rounded-full px-3 py-2 text-sm font-semibold transition-colors',
                      newBetType === betType.type
                        ? 'bg-[var(--maroon)] text-[var(--canvas)]'
                        : 'bg-[color:var(--canvas)]/74 text-[var(--ink-secondary)]'
                    )}
                  >
                    {betType.label}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <label className="block">
            <span className="mb-[var(--space-2)] block text-sm font-semibold text-[var(--ink)]">Name</span>
            <input
              type="text"
              value={newBetName}
              onChange={(event) => onNameChange(event.target.value)}
              className="input w-full"
              placeholder="Skins Game"
            />
          </label>

          <label className="block">
            <span className="mb-[var(--space-2)] block text-sm font-semibold text-[var(--ink)]">Description</span>
            <input
              type="text"
              value={newBetDescription}
              onChange={(event) => onDescriptionChange(event.target.value)}
              className="input w-full"
              placeholder="$5 per hole, carryovers, par-3 only..."
            />
          </label>

          <div className="grid gap-[var(--space-4)] sm:grid-cols-2">
            <label className="block">
              <span className="mb-[var(--space-2)] block text-sm font-semibold text-[var(--ink)]">Pot Amount</span>
              <input
                type="number"
                value={newBetPot}
                onChange={(event) => onPotChange(Number(event.target.value))}
                className="input w-full"
                min={0}
              />
            </label>
            <label className="block">
              <span className="mb-[var(--space-2)] block text-sm font-semibold text-[var(--ink)]">Hole</span>
              <input
                type="number"
                value={newBetHole || ''}
                onChange={(event) => onHoleChange(event.target.value ? Number(event.target.value) : undefined)}
                className="input w-full"
                min={1}
                max={18}
                placeholder="Any"
              />
            </label>
          </div>

          {!editingBet ? (
            <div className="rounded-[1.2rem] border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/82 p-[var(--space-3)]">
              <p className="type-overline tracking-[0.15em] text-[var(--ink-tertiary)]">Participants</p>
              <div className="mt-[var(--space-3)] flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onParticipantsChange(
                      selectedParticipants.length === players.length ? [] : players.map((player) => player.id)
                    )
                  }
                  className={cn(
                    'rounded-full px-3 py-2 text-sm font-semibold transition-colors',
                    selectedParticipants.length === players.length
                      ? 'bg-[var(--maroon)] text-[var(--canvas)]'
                      : 'bg-[color:var(--canvas)]/74 text-[var(--ink-secondary)]'
                  )}
                >
                  {selectedParticipants.length === players.length ? 'All In' : 'Select All'}
                </button>
                {players.map((player) => (
                  <button
                    key={player.id}
                    type="button"
                    onClick={() =>
                      onParticipantsChange(
                        selectedParticipants.includes(player.id)
                          ? selectedParticipants.filter((id) => id !== player.id)
                          : [...selectedParticipants, player.id]
                      )
                    }
                    className={cn(
                      'rounded-full px-3 py-2 text-sm font-semibold transition-colors',
                      selectedParticipants.includes(player.id)
                        ? 'bg-[var(--maroon)] text-[var(--canvas)]'
                        : 'bg-[color:var(--canvas)]/74 text-[var(--ink-secondary)]'
                    )}
                  >
                    {player.firstName}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="flex gap-[var(--space-3)]">
            <Button variant="secondary" onClick={onClose} className="flex-1 justify-center">
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={onSubmit}
              isLoading={isSubmitting}
              leftIcon={<Save size={16} />}
              className="flex-1 justify-center"
            >
              {editingBet ? 'Save Changes' : 'Create Bet'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function BetManagementCard({
  bet,
  getPlayer,
  getBetMeta,
  onEdit,
  onDelete,
  onComplete,
  isCompleted,
}: {
  bet: SideBet;
  getPlayer: (id: string) => Player | undefined;
  getBetMeta: (type: SideBetType) => (typeof SIDE_BET_DEFINITIONS)[number] | undefined;
  onEdit?: () => void;
  onDelete: () => void;
  onComplete?: (winnerId?: string) => void;
  isCompleted?: boolean;
}) {
  const [showWinnerSelect, setShowWinnerSelect] = useState(false);
  const winner = bet.winnerId ? getPlayer(bet.winnerId) : null;
  const meta = getBetMeta(bet.type);
  const accent = meta?.accent || 'var(--maroon)';
  const Icon = meta?.icon || DollarSign;

  return (
    <div className="rounded-[1.45rem] border border-[color:var(--rule)]/70 bg-[color:var(--canvas)]/80 p-[var(--space-4)] shadow-[0_14px_28px_rgba(41,29,17,0.04)]">
      <div className="flex items-start gap-[var(--space-3)]">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem]"
          style={{
            background: isCompleted ? 'var(--success)' : `color-mix(in srgb, ${accent} 14%, white)`,
            color: isCompleted ? 'var(--canvas)' : accent,
          }}
        >
          {isCompleted ? <Check size={20} /> : <Icon size={20} />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-[var(--space-3)]">
            <div>
              <p className="font-serif text-[1.5rem] italic text-[var(--ink)]">{bet.name}</p>
              {bet.description ? (
                <p className="mt-[var(--space-2)] text-sm leading-6 text-[var(--ink-secondary)]">{bet.description}</p>
              ) : null}
            </div>
            {bet.pot ? (
              <span className="rounded-full bg-[color:var(--success)]/12 px-3 py-1 text-sm font-semibold text-[var(--success)]">
                ${bet.pot}
              </span>
            ) : null}
          </div>

          <div className="mt-[var(--space-3)] flex flex-wrap items-center gap-3 text-sm text-[var(--ink-secondary)]">
            {bet.hole ? <span>Hole {bet.hole}</span> : null}
            {isCompleted && winner ? (
              <span className="inline-flex items-center gap-1 text-[var(--success)]">
                <Crown size={14} />
                Won by {winner.firstName}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-[var(--warning)]">
                <Clock size={14} />
                {bet.participantIds.length} players live
              </span>
            )}
          </div>
        </div>
      </div>

      {!isCompleted ? (
        <div className="mt-[var(--space-4)] border-t border-[color:var(--rule)]/65 pt-[var(--space-4)]">
          <div className="flex flex-wrap gap-2">
            {onEdit ? (
              <button
                type="button"
                onClick={onEdit}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/82 px-[var(--space-4)] py-[var(--space-2)] text-sm font-semibold text-[var(--ink-secondary)]"
              >
                <Edit3 size={14} />
                Edit
              </button>
            ) : null}
            {onComplete && !showWinnerSelect ? (
              <button
                type="button"
                onClick={() => setShowWinnerSelect(true)}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[var(--maroon)] px-[var(--space-4)] py-[var(--space-2)] text-sm font-semibold text-[var(--canvas)]"
              >
                <Check size={14} />
                Complete
              </button>
            ) : null}
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[color:var(--error)]/18 bg-[color:var(--error)]/10 px-[var(--space-3)] py-[var(--space-2)] text-sm font-semibold text-[var(--error)]"
            >
              <Trash2 size={14} />
              Delete
            </button>
          </div>

          {showWinnerSelect && onComplete ? (
            <div className="mt-[var(--space-4)] rounded-[1.2rem] border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/82 p-[var(--space-3)]">
              <p className="text-sm font-semibold text-[var(--ink)]">Select winner</p>
              <div className="mt-[var(--space-3)] flex flex-wrap gap-2">
                {bet.participantIds
                  .flatMap((id) => {
                    const player = getPlayer(id);
                    return player ? [{ id, player }] : [];
                  })
                  .map(({ id, player }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        onComplete(id);
                        setShowWinnerSelect(false);
                      }}
                      className="rounded-full bg-[var(--maroon)] px-3 py-2 text-sm font-semibold text-[var(--canvas)]"
                    >
                      {player.firstName}
                    </button>
                  ))}
                <button
                  type="button"
                  onClick={() => {
                    onComplete();
                    setShowWinnerSelect(false);
                  }}
                  className="rounded-full bg-[color:var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--ink-secondary)]"
                >
                  No winner
                </button>
                <button
                  type="button"
                  onClick={() => setShowWinnerSelect(false)}
                  className="rounded-full border border-[color:var(--rule)]/70 bg-[color:var(--canvas)]/74 px-3 py-2 text-sm font-semibold text-[var(--ink-secondary)]"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function CaptainNote({
  title,
  body,
  icon,
  tone = 'ink',
}: {
  title: string;
  body: string;
  icon: ReactNode;
  tone?: 'ink' | 'maroon';
}) {
  return (
    <div
      className={cn(
        'rounded-[1.6rem] border p-[var(--space-5)] shadow-[0_16px_34px_rgba(41,29,17,0.05)]',
        tone === 'maroon'
          ? 'border-[color:var(--maroon)]/16 bg-[linear-gradient(180deg,rgba(104,35,48,0.10),rgba(255,255,255,0.98))]'
          : 'border-[color:var(--rule)]/70 bg-[color:var(--surface)]/82'
      )}
    >
      <div className="flex items-center gap-[var(--space-2)] text-[var(--ink-tertiary)]">
        {icon}
        <span className="type-overline tracking-[0.14em]">Captain Note</span>
      </div>
      <h3 className="mt-[var(--space-3)] font-serif text-[1.55rem] italic text-[var(--ink)]">{title}</h3>
      <p className="mt-[var(--space-2)] text-sm leading-6 text-[var(--ink-secondary)]">{body}</p>
    </div>
  );
}
