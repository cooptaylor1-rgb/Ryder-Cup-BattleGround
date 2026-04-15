'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { PageHeader } from '@/components/layout';
import { EmptyStatePremium } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { db } from '@/lib/db';
import { getSideBetDefinition, SIDE_BET_DEFINITIONS } from '@/lib/constants';
import {
  buildCustomSideBet,
  buildNassauSideBet,
  buildQuickSideBet,
} from '@/lib/services/sideBetBuilders';
import { useTripStore, useToastStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import type { Match, SideBet, SideBetType } from '@/lib/types/models';
import { Calculator, Check, Clock, DollarSign, Flag, Home, Plus, Trophy } from 'lucide-react';
import {
  BetsFactCard,
  BetTabButton,
  BetSection,
  EmptyBoardPanel,
  PublicBetCard,
  SideNote,
  BetComposerModal,
} from '@/components/bets/BetsPageSections';

const SettlementView = dynamic(() => import('@/components/SettlementView'), {
  loading: () => (
    <div className="py-12 text-center type-body text-[var(--ink-tertiary)]">Loading settlement...</div>
  ),
});

type BetsTab = 'active' | 'completed' | 'settle';

export default function BetsPageClient() {
  const router = useRouter();
  const { currentTrip, players, sessions } = useTripStore(useShallow(s => ({ currentTrip: s.currentTrip, players: s.players, sessions: s.sessions })));
  const { showToast } = useToastStore(useShallow(s => ({ showToast: s.showToast })));

  const [selectedTab, setSelectedTab] = useState<BetsTab>('active');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [newBetType, setNewBetType] = useState<SideBetType>('skins');
  const [newBetName, setNewBetName] = useState(getSideBetDefinition('skins').label);
  const [newBetPot, setNewBetPot] = useState(String(getSideBetDefinition('skins').defaultPot));
  const [newBetPerHole, setNewBetPerHole] = useState(
    String(getSideBetDefinition('skins').defaultPerHole ?? 5)
  );
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [nassauTeamA, setNassauTeamA] = useState<string[]>([]);
  const [nassauTeamB, setNassauTeamB] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sessionIds = sessions.map((session) => session.id);

  const sideBets = useLiveQuery(
    async () => (currentTrip ? db.sideBets.where('tripId').equals(currentTrip.id).toArray() : []),
    [currentTrip?.id],
    [] as SideBet[]
  );

  const matches = useLiveQuery(
    async () => (sessionIds.length > 0 ? db.matches.where('sessionId').anyOf(sessionIds).toArray() : []),
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
    if (!currentTrip || isSubmitting) {
      return;
    }

    const definition = getSideBetDefinition(type);
    const newBet = buildQuickSideBet({
      tripId: currentTrip.id,
      type,
      participants: players,
    });

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
    if (!currentTrip || isSubmitting) {
      return;
    }

    const definition = getSideBetDefinition(newBetType);
    const name = newBetName.trim() || definition.label;

    try {
      setIsSubmitting(true);

      if (newBetType === 'nassau') {
        if (nassauTeamA.length !== 2 || nassauTeamB.length !== 2) {
          showToast('error', 'Nassau requires exactly two players per side');
          return;
        }

        const newBet = buildNassauSideBet({
          tripId: currentTrip.id,
          name,
          pot: parseInt(newBetPot, 10) || definition.defaultPot,
          match: selectedMatch,
          teamAPlayers: nassauTeamA
            .map((id) => playerById.get(id))
            .filter(Boolean) as typeof players,
          teamBPlayers: nassauTeamB
            .map((id) => playerById.get(id))
            .filter(Boolean) as typeof players,
        });

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

      const newBet = buildCustomSideBet({
        tripId: currentTrip.id,
        type: newBetType,
        name,
        pot: parseInt(newBetPot, 10) || definition.defaultPot,
        perHole:
          newBetType === 'skins'
            ? parseInt(newBetPerHole, 10) || definition.defaultPerHole
            : undefined,
        participants: participantIds
          .map((id) => playerById.get(id))
          .filter(Boolean) as typeof players,
        match: selectedMatch,
      });

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
        backFallback="/"
        rightSlot={
          <Button
            variant="primary"
            size="sm"
            onClick={() => openCreateModal()}
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
              <p className="type-overline tracking-[0.18em] text-[var(--maroon)]">Games Board</p>
              <h1 className="mt-[var(--space-2)] font-serif text-[clamp(2rem,7vw,3.15rem)] italic leading-[1.02] text-[var(--ink)]">
                Keep the side action legible before it turns into argument.
              </h1>
              <p className="mt-[var(--space-3)] max-w-[35rem] type-body-sm text-[var(--ink-secondary)]">
                The best trip games read like a chalkboard, not a rumor. Put the pots, formats, and winners
                somewhere everyone can understand in one glance.
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
              <BetsFactCard
                icon={<Clock size={18} />}
                label="Live"
                value={activeBets.length}
                detail="Bets still on the board"
                tone={activeBets.length > 0 ? 'maroon' : 'ink'}
              />
              <BetsFactCard
                icon={<DollarSign size={18} />}
                label="Pot"
                value={`$${totalPot}`}
                detail="Money still in motion"
                valueClassName="font-sans text-[1.1rem] not-italic"
                tone={totalPot > 0 ? 'green' : 'ink'}
              />
              <BetsFactCard icon={<Flag size={18} />} label="Linked" value={linkedMatches} detail="Match-specific games" />
              <BetsFactCard
                icon={<Check size={18} />}
                label="Settled"
                value={`$${completedPot}`}
                detail="Completed action already paid"
                valueClassName="font-sans text-[1.1rem] not-italic"
              />
            </div>
          </div>
        </section>

        <div className="mt-[var(--space-6)] flex flex-wrap gap-[var(--space-2)]" role="tablist" aria-label="Bet views">
          <BetTabButton
            isActive={selectedTab === 'active'}
            onClick={() => setSelectedTab('active')}
            icon={<Clock size={16} />}
          >
            Active board
          </BetTabButton>
          <BetTabButton
            isActive={selectedTab === 'completed'}
            onClick={() => setSelectedTab('completed')}
            icon={<Check size={16} />}
          >
            Completed
          </BetTabButton>
          <BetTabButton
            isActive={selectedTab === 'settle'}
            onClick={() => setSelectedTab('settle')}
            icon={<Calculator size={16} />}
          >
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
                title={
                  selectedTab === 'active'
                    ? `Active Board (${activeBets.length})`
                    : `Completed Ledger (${completedBets.length})`
                }
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
                    title={
                      selectedTab === 'active'
                        ? 'No bets are on the board yet.'
                        : 'Nothing has been settled yet.'
                    }
                    body={
                      selectedTab === 'active'
                        ? 'Start with one simple game the whole trip understands. More than that, and the action usually becomes noise.'
                        : 'Completed bets will collect here once the winners are recorded.'
                    }
                    actionLabel={selectedTab === 'active' ? 'Create a bet' : 'See active board'}
                    onAction={() =>
                      selectedTab === 'active' ? openCreateModal() : setSelectedTab('active')
                    }
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
                    {SIDE_BET_DEFINITIONS.filter((definition) => definition.type !== 'custom').map(
                      (definition) => (
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
                      )
                    )}
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
                  <Button
                    variant="secondary"
                    onClick={() => setSelectedTab('active')}
                    className="mt-[var(--space-4)] justify-center"
                  >
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
