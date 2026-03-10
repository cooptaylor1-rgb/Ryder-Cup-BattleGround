'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { PageHeader } from '@/components/layout';
import { EmptyStatePremium } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { db } from '@/lib/db';
import { getSideBetDefinition, SIDE_BET_DEFINITIONS } from '@/lib/constants';
import { useTripStore, useUIStore } from '@/lib/stores';
import type { Match, Player, SideBet, SideBetType } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import {
  Calculator,
  Check,
  ChevronRight,
  Clock,
  DollarSign,
  Flag,
  Home,
  Plus,
  Trophy,
  Users,
  X,
} from 'lucide-react';

const SettlementView = dynamic(() => import('@/components/SettlementView'), {
  loading: () => <div className="py-12 text-center type-body text-[var(--ink-tertiary)]">Loading settlement...</div>,
});

type BetsTab = 'active' | 'completed' | 'settle';

export default function BetsPage() {
  const router = useRouter();
  const { currentTrip, players, sessions } = useTripStore();
  const { showToast } = useUIStore();

  const [selectedTab, setSelectedTab] = useState<BetsTab>('active');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [newBetType, setNewBetType] = useState<SideBetType>('skins');
  const [newBetName, setNewBetName] = useState(getSideBetDefinition('skins').label);
  const [newBetPot, setNewBetPot] = useState(String(getSideBetDefinition('skins').defaultPot));
  const [newBetPerHole, setNewBetPerHole] = useState(String(getSideBetDefinition('skins').defaultPerHole ?? 5));
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [nassauTeamA, setNassauTeamA] = useState<string[]>([]);
  const [nassauTeamB, setNassauTeamB] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sessionIds = sessions.map((session) => session.id);

  const sideBets = useLiveQuery(
    async () => {
      if (!currentTrip) return [];
      return db.sideBets.where('tripId').equals(currentTrip.id).toArray();
    },
    [currentTrip?.id],
    [] as SideBet[]
  );

  const matches = useLiveQuery(
    async () => {
      if (sessionIds.length === 0) return [];
      return db.matches.where('sessionId').anyOf(sessionIds).toArray();
    },
    [sessionIds.join('|')],
    [] as Match[]
  );

  if (!currentTrip) {
    return (
      <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="trophy"
            title="No active trip"
            description="Select or create a trip to track side games, skins, and the rest of the action."
            action={{
              label: 'Go home',
              onClick: () => router.push('/'),
              icon: <Home size={16} />,
            }}
            secondaryAction={{ label: 'More', onClick: () => router.push('/more') }}
            variant="large"
          />
        </main>
      </div>
    );
  }

  const activeBets = sideBets.filter((bet) => bet.status === 'active' || bet.status === 'pending');
  const completedBets = sideBets.filter((bet) => bet.status === 'completed');
  const totalPot = activeBets.reduce((sum, bet) => sum + (bet.pot || 0), 0);
  const completedPot = completedBets.reduce((sum, bet) => sum + (bet.pot || 0), 0);
  const linkedMatches = new Set(sideBets.flatMap((bet) => (bet.matchId ? [bet.matchId] : []))).size;

  const playerById = new Map(players.map((player) => [player.id, player]));
  const matchById = new Map(matches.map((match) => [match.id, match]));

  const openCreateModal = (type: SideBetType = 'skins') => {
    const definition = getSideBetDefinition(type);
    setNewBetType(type);
    setNewBetName(definition.label);
    setNewBetPot(String(definition.defaultPot));
    setNewBetPerHole(String(definition.defaultPerHole ?? 5));
    setSelectedMatch(null);
    setSelectedParticipants(players.map((player) => player.id));
    setNassauTeamA([]);
    setNassauTeamB([]);
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setIsSubmitting(false);
  };

  const handleBetTypeChange = (type: SideBetType) => {
    const definition = getSideBetDefinition(type);
    setNewBetType(type);
    setNewBetName(definition.label);
    setNewBetPot(String(definition.defaultPot));
    setNewBetPerHole(String(definition.defaultPerHole ?? 5));
    setSelectedMatch(null);
    setSelectedParticipants(players.map((player) => player.id));
    setNassauTeamA([]);
    setNassauTeamB([]);
  };

  const createQuickBet = async (type: SideBetType) => {
    if (!currentTrip || isSubmitting) return;

    const definition = getSideBetDefinition(type);
    const newBet: SideBet = {
      id: crypto.randomUUID(),
      tripId: currentTrip.id,
      type,
      name: definition.label,
      description: definition.description,
      status: 'active',
      pot: definition.defaultPot,
      perHole: definition.defaultPerHole,
      participantIds: players.map((player) => player.id),
      createdAt: new Date().toISOString(),
    };

    try {
      setIsSubmitting(true);
      await db.sideBets.add(newBet);
      showToast('success', `${definition.label} added`);
    } catch {
      showToast('error', 'Failed to create bet. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleParticipant = (playerId: string) => {
    setSelectedParticipants((current) =>
      current.includes(playerId) ? current.filter((id) => id !== playerId) : [...current, playerId]
    );
  };

  const toggleNassauPlayer = (team: 'A' | 'B', playerId: string) => {
    if (team === 'A') {
      setNassauTeamA((current) => {
        if (nassauTeamB.includes(playerId)) return current;
        if (current.includes(playerId)) return current.filter((id) => id !== playerId);
        if (current.length >= 2) return current;
        return [...current, playerId];
      });
      return;
    }

    setNassauTeamB((current) => {
      if (nassauTeamA.includes(playerId)) return current;
      if (current.includes(playerId)) return current.filter((id) => id !== playerId);
      if (current.length >= 2) return current;
      return [...current, playerId];
    });
  };

  const createCustomBet = async () => {
    if (!currentTrip || isSubmitting) return;

    const definition = getSideBetDefinition(newBetType);
    const name = newBetName.trim() || definition.label;

    try {
      setIsSubmitting(true);

      if (newBetType === 'nassau') {
        if (nassauTeamA.length !== 2 || nassauTeamB.length !== 2) {
          showToast('error', 'Nassau requires exactly two players per side');
          return;
        }

        const teamANames = nassauTeamA
          .map((id) => playerById.get(id)?.lastName || playerById.get(id)?.firstName)
          .filter(Boolean)
          .join(' & ');
        const teamBNames = nassauTeamB
          .map((id) => playerById.get(id)?.lastName || playerById.get(id)?.firstName)
          .filter(Boolean)
          .join(' & ');

        const newBet: SideBet = {
          id: crypto.randomUUID(),
          tripId: currentTrip.id,
          type: 'nassau',
          name,
          description: `${teamANames} vs ${teamBNames}`,
          status: 'active',
          pot: parseInt(newBetPot, 10) || definition.defaultPot,
          participantIds: [...nassauTeamA, ...nassauTeamB],
          nassauTeamA,
          nassauTeamB,
          nassauResults: {},
          createdAt: new Date().toISOString(),
        };

        await db.sideBets.add(newBet);
        showToast('success', `${name} created`);
        closeCreateModal();
        router.push(`/bets/${newBet.id}`);
        return;
      }

      const participantIds = selectedMatch
        ? [...selectedMatch.teamAPlayerIds, ...selectedMatch.teamBPlayerIds]
        : selectedParticipants;

      if (participantIds.length < 2) {
        showToast('error', 'Choose at least two participants');
        return;
      }

      const newBet: SideBet = {
        id: crypto.randomUUID(),
        tripId: currentTrip.id,
        matchId: selectedMatch?.id,
        type: newBetType,
        name,
        description: selectedMatch
          ? `Inside game for Match #${selectedMatch.matchOrder}`
          : definition.description,
        status: 'active',
        pot: parseInt(newBetPot, 10) || definition.defaultPot,
        perHole: newBetType === 'skins' ? parseInt(newBetPerHole, 10) || definition.defaultPerHole : undefined,
        participantIds,
        createdAt: new Date().toISOString(),
      };

      await db.sideBets.add(newBet);
      showToast('success', `${name} created`);
      closeCreateModal();
      router.push(`/bets/${newBet.id}`);
    } catch {
      showToast('error', 'Failed to create bet. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayedBets = selectedTab === 'active' ? activeBets : completedBets;

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Side Bets"
        subtitle={currentTrip.name}
        icon={<DollarSign size={16} className="text-[var(--canvas)]" />}
        iconContainerClassName="bg-[linear-gradient(135deg,var(--maroon)_0%,var(--maroon-dark)_100%)]"
        onBack={() => router.back()}
        rightSlot={
          <Button variant="primary" size="sm" onClick={() => openCreateModal()} leftIcon={<Plus size={16} />}>
            New Bet
          </Button>
        }
      />

      <main className="container-editorial py-[var(--space-6)] pb-[var(--space-12)]">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--maroon-subtle)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,240,241,0.98))] shadow-[0_24px_52px_rgba(46,34,18,0.08)]">
          <div className="grid gap-[var(--space-5)] px-[var(--space-5)] py-[var(--space-5)] lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.95fr)]">
            <div>
              <p className="type-overline tracking-[0.18em] text-[var(--maroon)]">Games Board</p>
              <h1 className="mt-[var(--space-2)] font-serif text-[clamp(2rem,7vw,3.15rem)] italic leading-[1.02] text-[var(--ink)]">
                Keep the side action legible before it turns into argument.
              </h1>
              <p className="mt-[var(--space-3)] max-w-[35rem] type-body-sm text-[var(--ink-secondary)]">
                The best trip games read like a chalkboard, not a rumor. Put the pots, formats, and winners somewhere everyone can understand in one glance.
              </p>

              <div className="mt-[var(--space-5)] flex flex-wrap gap-[var(--space-3)]">
                <Button variant="primary" onClick={() => openCreateModal()} leftIcon={<Plus size={16} />}>
                  Build a custom wager
                </Button>
                <Link
                  href="/captain/bets"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[color:var(--rule)]/65 bg-[color:var(--surface)]/82 px-[var(--space-4)] py-[var(--space-3)] text-sm font-semibold text-[var(--ink)] transition-transform duration-150 hover:scale-[1.02] hover:border-[var(--maroon-subtle)] hover:bg-[var(--surface)]"
                >
                  Open captain desk
                </Link>
              </div>
            </div>

            <div className="grid gap-[var(--space-3)] sm:grid-cols-2 lg:grid-cols-2">
              <BetsFactCard icon={<Clock size={18} />} label="Live" value={activeBets.length} detail="Bets still on the board" tone={activeBets.length > 0 ? 'maroon' : 'ink'} />
              <BetsFactCard icon={<DollarSign size={18} />} label="Pot" value={`$${totalPot}`} detail="Money still in motion" valueClassName="font-sans text-[1.1rem] not-italic" tone={totalPot > 0 ? 'green' : 'ink'} />
              <BetsFactCard icon={<Flag size={18} />} label="Linked" value={linkedMatches} detail="Match-specific games" />
              <BetsFactCard icon={<Check size={18} />} label="Settled" value={`$${completedPot}`} detail="Completed action already paid" valueClassName="font-sans text-[1.1rem] not-italic" />
            </div>
          </div>
        </section>

        <div className="mt-[var(--space-6)] flex flex-wrap gap-[var(--space-2)]" role="tablist" aria-label="Bet views">
          <BetTabButton isActive={selectedTab === 'active'} onClick={() => setSelectedTab('active')} icon={<Clock size={16} />}>
            Active board
          </BetTabButton>
          <BetTabButton isActive={selectedTab === 'completed'} onClick={() => setSelectedTab('completed')} icon={<Check size={16} />}>
            Completed
          </BetTabButton>
          <BetTabButton isActive={selectedTab === 'settle'} onClick={() => setSelectedTab('settle')} icon={<Calculator size={16} />}>
            Settlement
          </BetTabButton>
        </div>

        <section className="mt-[var(--space-6)] grid gap-[var(--space-4)] xl:grid-cols-[minmax(0,1.15fr)_22rem]">
          <div className="space-y-[var(--space-4)]">
            {selectedTab === 'settle' ? (
              <section className="rounded-[1.8rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,239,232,0.99))] p-[var(--space-5)] shadow-[0_20px_46px_rgba(41,29,17,0.08)]">
                <div className="mb-[var(--space-4)]">
                  <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">Settlement Room</p>
                  <h2 className="mt-[var(--space-2)] font-serif text-[1.95rem] italic text-[var(--ink)]">
                    Figure out what everyone owes while the round is still fresh.
                  </h2>
                </div>
                <div className="rounded-[1.5rem] border border-[color:var(--rule)]/70 bg-[color:var(--canvas)]/78 p-[var(--space-4)]">
                  <SettlementView />
                </div>
              </section>
            ) : (
              <BetSection
                title={selectedTab === 'active' ? `Active Board (${activeBets.length})` : `Completed Ledger (${completedBets.length})`}
                subtitle={
                  selectedTab === 'active'
                    ? 'The games currently shaping the trip.'
                    : 'Everything that has already been decided.'
                }
              >
                {displayedBets.length > 0 ? (
                  <div className="space-y-3">
                    {displayedBets.map((bet) => (
                      <PublicBetCard
                        key={bet.id}
                        bet={bet}
                        getPlayer={(playerId) => playerById.get(playerId)}
                        linkedMatch={bet.matchId ? matchById.get(bet.matchId) : undefined}
                        onOpen={() => router.push(`/bets/${bet.id}`)}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyBoardPanel
                    title={selectedTab === 'active' ? 'No bets are on the board yet.' : 'Nothing has been settled yet.'}
                    body={
                      selectedTab === 'active'
                        ? 'Start with one simple game the whole trip understands. More than that, and the action usually becomes noise.'
                        : 'Completed bets will collect here once the winners are recorded.'
                    }
                    actionLabel={selectedTab === 'active' ? 'Create a bet' : 'See active board'}
                    onAction={() => (selectedTab === 'active' ? openCreateModal() : setSelectedTab('active'))}
                  />
                )}
              </BetSection>
            )}
          </div>

          <aside className="space-y-[var(--space-4)]">
            {selectedTab === 'active' ? (
              <>
                <section className="rounded-[1.8rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,239,232,0.99))] p-[var(--space-5)] shadow-[0_18px_38px_rgba(41,29,17,0.06)]">
                  <div className="flex items-center gap-[var(--space-2)] text-[var(--ink-tertiary)]">
                    <Plus size={16} />
                    <span className="type-overline tracking-[0.15em]">Quick Start</span>
                  </div>
                  <div className="mt-[var(--space-4)] grid gap-[var(--space-3)]">
                    {SIDE_BET_DEFINITIONS.filter((definition) => definition.type !== 'custom').map((definition) => (
                      <button
                        key={definition.type}
                        type="button"
                        onClick={() => {
                          void createQuickBet(definition.type);
                        }}
                        className="flex items-center gap-[var(--space-3)] rounded-[1.25rem] border border-[color:var(--rule)]/70 bg-[color:var(--canvas)]/75 px-[var(--space-4)] py-[var(--space-4)] text-left transition-transform duration-150 hover:scale-[1.01] hover:border-[var(--maroon-subtle)]"
                      >
                        <div
                          className="flex h-11 w-11 items-center justify-center rounded-[1rem]"
                          style={{
                            background: `color-mix(in srgb, ${definition.accent} 14%, white)`,
                            color: definition.accent,
                          }}
                        >
                          <definition.icon size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-[var(--ink)]">{definition.label}</p>
                          <p className="text-sm text-[var(--ink-secondary)]">{definition.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </section>

                <SideNote
                  icon={<Trophy size={18} />}
                  title="Keep the games readable"
                  body="A good bet board is conservative. If the rule needs a speech, it probably is not the right side action for a trip already carrying enough story."
                  tone="maroon"
                />
              </>
            ) : selectedTab === 'completed' ? (
              <>
                <SideNote
                  icon={<Check size={18} />}
                  title="The finished ledger matters"
                  body="Finished bets are part of the trip memory too. A neat ledger keeps the winners clear and the settlement shorter."
                />
                <SideNote
                  icon={<Calculator size={18} />}
                  title="Go settle while it is fresh"
                  body="If the list of completed bets is growing, move over to settlement before the numbers start relying on memory."
                  tone="maroon"
                />
              </>
            ) : (
              <>
                <SideNote
                  icon={<DollarSign size={18} />}
                  title="Pay the stories while they still sound true"
                  body="Settlement is easier when the board is current. Finish the active bets, then let the ledger do the uncomfortable part."
                />
                <div className="rounded-[1.6rem] border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/82 p-[var(--space-5)] shadow-[0_16px_34px_rgba(41,29,17,0.05)]">
                  <p className="type-overline tracking-[0.15em] text-[var(--ink-tertiary)]">Next move</p>
                  <h3 className="mt-[var(--space-3)] font-serif text-[1.55rem] italic text-[var(--ink)]">
                    Return to the live board if anything is still unsettled.
                  </h3>
                  <Button variant="secondary" onClick={() => setSelectedTab('active')} className="mt-[var(--space-4)] justify-center">
                    Open active bets
                  </Button>
                </div>
              </>
            )}
          </aside>
        </section>
      </main>

      {showCreateModal ? (
        <BetComposerModal
          matches={matches}
          players={players}
          selectedMatch={selectedMatch}
          newBetType={newBetType}
          newBetName={newBetName}
          newBetPot={newBetPot}
          newBetPerHole={newBetPerHole}
          selectedParticipants={selectedParticipants}
          nassauTeamA={nassauTeamA}
          nassauTeamB={nassauTeamB}
          isSubmitting={isSubmitting}
          onClose={closeCreateModal}
          onBetTypeChange={handleBetTypeChange}
          onNameChange={setNewBetName}
          onPotChange={setNewBetPot}
          onPerHoleChange={setNewBetPerHole}
          onMatchChange={setSelectedMatch}
          onParticipantToggle={toggleParticipant}
          onNassauPlayerToggle={toggleNassauPlayer}
          onSubmit={() => {
            void createCustomBet();
          }}
        />
      ) : null}
    </div>
  );
}

function BetsFactCard({
  icon,
  label,
  value,
  detail,
  valueClassName,
  tone = 'ink',
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  detail: string;
  valueClassName?: string;
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
      <p className={cn('mt-[var(--space-3)] font-serif text-[1.95rem] italic leading-none text-[var(--ink)]', valueClassName)}>
        {value}
      </p>
      <p className="mt-[var(--space-2)] text-sm text-[var(--ink-secondary)]">{detail}</p>
    </div>
  );
}

function BetTabButton({
  isActive,
  onClick,
  icon,
  children,
}: {
  isActive: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-[var(--space-4)] py-[var(--space-3)] text-sm font-semibold transition-colors',
        isActive
          ? 'bg-[var(--maroon)] text-[var(--canvas)]'
          : 'border border-[color:var(--rule)]/65 bg-[color:var(--surface)]/82 text-[var(--ink-secondary)] hover:border-[var(--maroon-subtle)] hover:text-[var(--ink)]'
      )}
    >
      {icon}
      <span>{children}</span>
    </button>
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

function EmptyBoardPanel({
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

function PublicBetCard({
  bet,
  getPlayer,
  linkedMatch,
  onOpen,
}: {
  bet: SideBet;
  getPlayer: (playerId: string) => Player | undefined;
  linkedMatch?: Match;
  onOpen: () => void;
}) {
  const definition = getSideBetDefinition(bet.type);
  const summary = getBetSummary(bet, getPlayer);

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-[1.45rem] border border-[color:var(--rule)]/70 bg-[color:var(--canvas)]/80 p-[var(--space-4)] text-left shadow-[0_14px_28px_rgba(41,29,17,0.04)] transition-transform duration-150 hover:scale-[1.01] hover:border-[var(--maroon-subtle)]"
    >
      <div className="flex items-start gap-[var(--space-3)]">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[1rem]"
          style={{
            background:
              bet.status === 'completed'
                ? 'var(--success)'
                : `color-mix(in srgb, ${definition.accent} 14%, white)`,
            color: bet.status === 'completed' ? 'var(--canvas)' : definition.accent,
          }}
        >
          {bet.status === 'completed' ? <Check size={20} /> : <definition.icon size={20} />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-[var(--space-3)]">
            <div>
              <p className="font-serif text-[1.5rem] italic text-[var(--ink)]">{bet.name}</p>
              <p className="mt-[var(--space-2)] text-sm leading-6 text-[var(--ink-secondary)]">
                {bet.description || definition.description}
              </p>
            </div>
            {bet.pot ? (
              <span className="rounded-full bg-[color:var(--success)]/12 px-3 py-1 text-sm font-semibold text-[var(--success)]">
                ${bet.pot}
              </span>
            ) : null}
          </div>

          <div className="mt-[var(--space-3)] flex flex-wrap items-center gap-3 text-sm text-[var(--ink-secondary)]">
            <span>{definition.label}</span>
            {bet.perHole ? <span>${bet.perHole}/hole</span> : null}
            {linkedMatch ? <span>Match #{linkedMatch.matchOrder}</span> : <span>Trip-wide</span>}
          </div>

          <div className="mt-[var(--space-3)] flex flex-wrap items-center gap-2 text-sm">
            {summary.icon}
            <span className={summary.textClassName}>{summary.text}</span>
          </div>

          <div className="mt-[var(--space-2)] text-sm text-[var(--ink-tertiary)]">
            {bet.type === 'nassau'
              ? 'Two versus two Nassau'
              : `${bet.participantIds.length} player${bet.participantIds.length === 1 ? '' : 's'} involved`}
          </div>
        </div>

        <ChevronRight size={18} className="mt-1 shrink-0 text-[var(--ink-tertiary)]" />
      </div>
    </button>
  );
}

function SideNote({
  icon,
  title,
  body,
  tone = 'ink',
}: {
  icon: ReactNode;
  title: string;
  body: string;
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
        <span className="type-overline tracking-[0.14em]">Club Note</span>
      </div>
      <h3 className="mt-[var(--space-3)] font-serif text-[1.55rem] italic text-[var(--ink)]">{title}</h3>
      <p className="mt-[var(--space-2)] text-sm leading-6 text-[var(--ink-secondary)]">{body}</p>
    </div>
  );
}

function BetComposerModal({
  matches,
  players,
  selectedMatch,
  newBetType,
  newBetName,
  newBetPot,
  newBetPerHole,
  selectedParticipants,
  nassauTeamA,
  nassauTeamB,
  isSubmitting,
  onClose,
  onBetTypeChange,
  onNameChange,
  onPotChange,
  onPerHoleChange,
  onMatchChange,
  onParticipantToggle,
  onNassauPlayerToggle,
  onSubmit,
}: {
  matches: Match[];
  players: Player[];
  selectedMatch: Match | null;
  newBetType: SideBetType;
  newBetName: string;
  newBetPot: string;
  newBetPerHole: string;
  selectedParticipants: string[];
  nassauTeamA: string[];
  nassauTeamB: string[];
  isSubmitting: boolean;
  onClose: () => void;
  onBetTypeChange: (type: SideBetType) => void;
  onNameChange: (value: string) => void;
  onPotChange: (value: string) => void;
  onPerHoleChange: (value: string) => void;
  onMatchChange: (match: Match | null) => void;
  onParticipantToggle: (playerId: string) => void;
  onNassauPlayerToggle: (team: 'A' | 'B', playerId: string) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[color:var(--ink)]/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-[620px] overflow-auto rounded-[1.8rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,239,232,1))] p-[var(--space-5)] shadow-[0_26px_60px_rgba(17,15,10,0.28)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-[var(--space-3)]">
          <div>
            <p className="type-overline tracking-[0.16em] text-[var(--maroon)]">Create Bet</p>
            <h2 className="mt-[var(--space-2)] font-serif text-[1.95rem] italic text-[var(--ink)]">
              Make the wager obvious before the stories start.
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
          <div className="rounded-[1.2rem] border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/82 p-[var(--space-3)]">
            <p className="type-overline tracking-[0.15em] text-[var(--ink-tertiary)]">Bet Type</p>
            <div className="mt-[var(--space-3)] flex flex-wrap gap-2">
              {SIDE_BET_DEFINITIONS.map((definition) => (
                <button
                  key={definition.type}
                  type="button"
                  onClick={() => onBetTypeChange(definition.type)}
                  className={cn(
                    'rounded-full px-3 py-2 text-sm font-semibold transition-colors',
                    newBetType === definition.type
                      ? 'bg-[var(--maroon)] text-[var(--canvas)]'
                      : 'bg-[color:var(--canvas)]/74 text-[var(--ink-secondary)]'
                  )}
                >
                  {definition.label}
                </button>
              ))}
            </div>
          </div>

          <FormField label="Name">
            <input
              type="text"
              value={newBetName}
              onChange={(event) => onNameChange(event.target.value)}
              className="input w-full"
              placeholder={getSideBetDefinition(newBetType).label}
            />
          </FormField>

          <div className="grid gap-[var(--space-4)] sm:grid-cols-2">
            <FormField label="Total Pot">
              <input
                type="number"
                min={0}
                value={newBetPot}
                onChange={(event) => onPotChange(event.target.value)}
                className="input w-full"
              />
            </FormField>
            {newBetType === 'skins' ? (
              <FormField label="Per Hole">
                <input
                  type="number"
                  min={0}
                  value={newBetPerHole}
                  onChange={(event) => onPerHoleChange(event.target.value)}
                  className="input w-full"
                />
              </FormField>
            ) : (
              <div className="rounded-[1.2rem] border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/74 px-[var(--space-4)] py-[var(--space-3)]">
                <p className="text-sm font-semibold text-[var(--ink)]">Format</p>
                <p className="mt-[var(--space-1)] text-sm text-[var(--ink-secondary)]">
                  {getSideBetDefinition(newBetType).description}
                </p>
              </div>
            )}
          </div>

          {newBetType !== 'nassau' ? (
            <div className="rounded-[1.2rem] border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/82 p-[var(--space-3)]">
              <p className="type-overline tracking-[0.15em] text-[var(--ink-tertiary)]">Scope</p>
              <div className="mt-[var(--space-3)] grid gap-2">
                <SelectableRow isSelected={!selectedMatch} onClick={() => onMatchChange(null)} icon={<Users size={16} />}>
                  <span className="font-semibold text-[var(--ink)]">Trip-wide</span>
                  <span className="text-sm text-[var(--ink-secondary)]">Everyone on the trip can be part of the game.</span>
                </SelectableRow>
                {matches.map((match) => (
                  <SelectableRow
                    key={match.id}
                    isSelected={selectedMatch?.id === match.id}
                    onClick={() => onMatchChange(match)}
                    icon={<Flag size={16} />}
                  >
                    <span className="font-semibold text-[var(--ink)]">Match #{match.matchOrder}</span>
                    <span className="text-sm text-[var(--ink-secondary)]">
                      {buildMatchPlayerNames(match, players)}
                    </span>
                  </SelectableRow>
                ))}
              </div>
            </div>
          ) : null}

          {newBetType === 'nassau' ? (
            <div className="rounded-[1.2rem] border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/82 p-[var(--space-3)]">
              <p className="type-overline tracking-[0.15em] text-[var(--ink-tertiary)]">Nassau Teams</p>
              <p className="mt-[var(--space-2)] text-sm text-[var(--ink-secondary)]">
                Pick two players for each side. Nassau is front nine, back nine, and overall.
              </p>
              <div className="mt-[var(--space-4)] grid gap-[var(--space-4)] sm:grid-cols-2">
                <SelectionGroup title={`Team A (${nassauTeamA.length}/2)`}>
                  {players.map((player) => (
                    <PlayerChip
                      key={`team-a-${player.id}`}
                      player={player}
                      isSelected={nassauTeamA.includes(player.id)}
                      isDisabled={nassauTeamB.includes(player.id)}
                      tone="usa"
                      onClick={() => onNassauPlayerToggle('A', player.id)}
                    />
                  ))}
                </SelectionGroup>
                <SelectionGroup title={`Team B (${nassauTeamB.length}/2)`}>
                  {players.map((player) => (
                    <PlayerChip
                      key={`team-b-${player.id}`}
                      player={player}
                      isSelected={nassauTeamB.includes(player.id)}
                      isDisabled={nassauTeamA.includes(player.id)}
                      tone="europe"
                      onClick={() => onNassauPlayerToggle('B', player.id)}
                    />
                  ))}
                </SelectionGroup>
              </div>
            </div>
          ) : !selectedMatch ? (
            <div className="rounded-[1.2rem] border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/82 p-[var(--space-3)]">
              <p className="type-overline tracking-[0.15em] text-[var(--ink-tertiary)]">Participants</p>
              <div className="mt-[var(--space-3)] flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (selectedParticipants.length === players.length) {
                      players.forEach((player) => {
                        if (selectedParticipants.includes(player.id)) onParticipantToggle(player.id);
                      });
                      return;
                    }
                    players.forEach((player) => {
                      if (!selectedParticipants.includes(player.id)) onParticipantToggle(player.id);
                    });
                  }}
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
                    onClick={() => onParticipantToggle(player.id)}
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
              leftIcon={<Plus size={16} />}
              className="flex-1 justify-center"
            >
              Create Bet
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SelectableRow({
  isSelected,
  onClick,
  icon,
  children,
}: {
  isSelected: boolean;
  onClick: () => void;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-start gap-[var(--space-3)] rounded-[1.15rem] border px-[var(--space-4)] py-[var(--space-3)] text-left transition-colors',
        isSelected
          ? 'border-[var(--maroon)] bg-[color:var(--maroon)]/6'
          : 'border-[color:var(--rule)]/70 bg-[color:var(--canvas)]/74'
      )}
    >
      <div className={cn('mt-1 text-[var(--ink-tertiary)]', isSelected ? 'text-[var(--maroon)]' : '')}>{icon}</div>
      <div className="flex min-w-0 flex-1 flex-col">{children}</div>
    </button>
  );
}

function SelectionGroup({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-[var(--ink)]">{title}</p>
      <div className="mt-[var(--space-3)] flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function PlayerChip({
  player,
  isSelected,
  isDisabled,
  tone,
  onClick,
}: {
  player: Player;
  isSelected: boolean;
  isDisabled: boolean;
  tone: 'usa' | 'europe';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={isDisabled}
      onClick={onClick}
      className={cn(
        'rounded-full px-3 py-2 text-sm font-semibold transition-colors',
        isDisabled
          ? 'cursor-not-allowed bg-[color:var(--surface)] text-[var(--ink-tertiary)] opacity-50'
          : isSelected && tone === 'usa'
            ? 'bg-[var(--team-usa)] text-white'
            : isSelected && tone === 'europe'
              ? 'bg-[var(--team-europe)] text-white'
              : 'bg-[color:var(--canvas)]/74 text-[var(--ink-secondary)]'
      )}
    >
      {player.firstName} {player.lastName}
    </button>
  );
}

function FormField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-[var(--space-2)] block text-sm font-semibold text-[var(--ink)]">{label}</span>
      {children}
    </label>
  );
}

function buildMatchPlayerNames(match: Match, players: Player[]) {
  return [...match.teamAPlayerIds, ...match.teamBPlayerIds]
    .map((id) => players.find((player) => player.id === id))
    .filter((player): player is Player => Boolean(player))
    .map((player) => player.lastName || player.firstName)
    .join(', ');
}

function getBetSummary(
  bet: SideBet,
  getPlayer: (playerId: string) => Player | undefined
): { icon: ReactNode; text: string; textClassName: string } {
  if (bet.type === 'nassau' && bet.nassauResults) {
    const { teamAWins, teamBWins, completed } = getNassauSummary(bet);
    const text =
      bet.status === 'completed'
        ? `Final: ${teamAWins}-${teamBWins}`
        : `${completed}/3 segments scored • ${teamAWins}-${teamBWins}`;

    return {
      icon: <Trophy size={14} className={bet.status === 'completed' ? 'text-[var(--success)]' : 'text-[var(--warning)]'} />,
      text,
      textClassName: bet.status === 'completed' ? 'text-[var(--success)]' : 'text-[var(--warning)]',
    };
  }

  if (bet.status === 'completed' && bet.winnerId) {
    const winner = getPlayer(bet.winnerId);
    return {
      icon: <Check size={14} className="text-[var(--success)]" />,
      text: winner ? `Won by ${winner.firstName} ${winner.lastName}` : 'Completed',
      textClassName: 'text-[var(--success)]',
    };
  }

  return {
    icon: <Clock size={14} className="text-[var(--warning)]" />,
    text: bet.status === 'completed' ? 'Completed' : 'In progress',
    textClassName: bet.status === 'completed' ? 'text-[var(--success)]' : 'text-[var(--warning)]',
  };
}

function getNassauSummary(bet: SideBet) {
  const results = bet.nassauResults || {};
  let teamAWins = 0;
  let teamBWins = 0;

  if (results.front9Winner === 'teamA') teamAWins += 1;
  if (results.front9Winner === 'teamB') teamBWins += 1;
  if (results.back9Winner === 'teamA') teamAWins += 1;
  if (results.back9Winner === 'teamB') teamBWins += 1;
  if (results.overallWinner === 'teamA') teamAWins += 1;
  if (results.overallWinner === 'teamB') teamBWins += 1;

  const completed = [results.front9Winner, results.back9Winner, results.overallWinner].filter(Boolean).length;
  return { teamAWins, teamBWins, completed };
}
