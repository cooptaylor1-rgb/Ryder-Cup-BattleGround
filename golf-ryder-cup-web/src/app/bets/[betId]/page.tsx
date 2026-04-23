'use client';

import { useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  BetDetailHeroSection,
  BetNote,
  LinkedMatchPanel,
  NassauBoard,
  ParticipantsPanel,
  SkinsBoard,
  SkinsResultModal,
  WinnerBoard,
} from '@/components/bets/BetDetailSections';
import { PageHeader } from '@/components/layout';
import { EmptyStatePremium, PageLoadingSkeleton } from '@/components/ui';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { getSideBetDefinition } from '@/lib/constants';
import { db } from '@/lib/db';
import { queueSyncOperation } from '@/lib/services/tripSyncService';
import { useTripStore, useToastStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import type { Match, NassauResults, Player, SideBet } from '@/lib/types/models';
import {
  calculateNextSkinValue,
  calculateSkinsStandings,
  getNassauSummary,
  normalizeSkinsResults,
  upsertHoleResult,
} from '@/lib/utils/sideBetLedger';
import { Check, Home, Trophy } from 'lucide-react';

export default function BetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const betId = params.betId as string;
  const { currentTrip, players } = useTripStore(useShallow(s => ({ currentTrip: s.currentTrip, players: s.players })));
  const { showToast } = useToastStore(useShallow(s => ({ showToast: s.showToast })));
  const { showConfirm, ConfirmDialogComponent } = useConfirmDialog();
  const [selectedHole, setSelectedHole] = useState<number | null>(null);

  const bet = useLiveQuery(() => db.sideBets.get(betId), [betId], null as SideBet | null | undefined);

  const linkedMatch = useLiveQuery(
    async () => {
      if (!bet?.matchId) return undefined;
      const match = await db.matches.get(bet.matchId);
      return match ?? null;
    },
    [bet?.matchId],
    undefined as Match | null | undefined
  );

  const playerById = useMemo(
    () => new Map(players.map((player) => [player.id, player])),
    [players]
  );

  if (!currentTrip) {
    return (
      <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="trophy"
            title="No active trip"
            description="Pick a trip to view the side-bet ledger."
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

  if (bet === null) {
    return <PageLoadingSkeleton title="Loading bet..." variant="detail" />;
  }

  if (bet === undefined) {
    return (
      <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
        <PageHeader
          title="Bet Details"
          subtitle={currentTrip.name}
          onBack={() => router.push('/bets')}
          icon={<Trophy size={16} className="text-[var(--canvas)]" />}
          iconTone="captain"
        />

        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="flag"
            title="That bet isn’t on the board"
            description="It may have been deleted, or this device has not synced it yet."
            action={{ label: 'Back to bets', onClick: () => router.push('/bets') }}
            variant="large"
          />
        </main>
      </div>
    );
  }

  const definition = getSideBetDefinition(bet.type);
  const participants = bet.participantIds
    .map((playerId) => playerById.get(playerId))
    .filter((player): player is Player => Boolean(player));
  const winner = bet.winnerId ? playerById.get(bet.winnerId) : undefined;
  const isSkins = bet.type === 'skins';
  const isNassau = bet.type === 'nassau';
  const teamAPlayers =
    isNassau && bet.nassauTeamA
      ? bet.nassauTeamA
          .map((playerId) => playerById.get(playerId))
          .filter((player): player is Player => Boolean(player))
      : [];
  const teamBPlayers =
    isNassau && bet.nassauTeamB
      ? bet.nassauTeamB
          .map((playerId) => playerById.get(playerId))
          .filter((player): player is Player => Boolean(player))
      : [];
  const skinsStandings = isSkins ? calculateSkinsStandings(bet, participants) : [];
  const nextSkinValue = isSkins ? calculateNextSkinValue(bet) : 0;
  const nassauSummary = isNassau ? getNassauSummary(bet) : null;

  const recordHoleWinner = async (holeNumber: number, winnerId?: string) => {
    const perHole = bet.perHole || definition.defaultPerHole || 5;
    const nextResults = normalizeSkinsResults(
      upsertHoleResult(bet.results || [], holeNumber, winnerId),
      perHole
    );

    await db.sideBets.update(bet.id, { results: nextResults });
    queueSyncOperation('sideBet', bet.id, 'update', bet.tripId, {
      ...bet,
      results: nextResults,
    });
    setSelectedHole(null);
    showToast('success', winnerId ? 'Hole winner recorded' : 'Hole pushed to the next skin');
  };

  const setOverallWinner = async (winnerId: string) => {
    const updates = {
      winnerId,
      status: 'completed' as const,
      completedAt: new Date().toISOString(),
    };
    await db.sideBets.update(bet.id, updates);
    queueSyncOperation('sideBet', bet.id, 'update', bet.tripId, { ...bet, ...updates });
    showToast('success', 'Winner recorded');
  };

  const setNassauWinner = async (
    segment: keyof NassauResults,
    value: NonNullable<NassauResults[keyof NassauResults]>
  ) => {
    const nextResults: NassauResults = {
      ...(bet.nassauResults || {}),
      [segment]: value,
    };
    const isComplete = Boolean(
      nextResults.front9Winner && nextResults.back9Winner && nextResults.overallWinner
    );

    const updates = {
      nassauResults: nextResults,
      status: (isComplete ? 'completed' : 'active') as 'completed' | 'active',
      completedAt: isComplete ? new Date().toISOString() : undefined,
    };
    await db.sideBets.update(bet.id, updates);
    queueSyncOperation('sideBet', bet.id, 'update', bet.tripId, { ...bet, ...updates });
    showToast('success', 'Segment result recorded');
  };

  const reopenBet = async () => {
    const updates = {
      status: 'active' as const,
      winnerId: undefined,
      completedAt: undefined,
    };
    await db.sideBets.update(bet.id, updates);
    queueSyncOperation('sideBet', bet.id, 'update', bet.tripId, { ...bet, ...updates });
    showToast('success', 'Bet reopened');
  };

  const promptDelete = () => {
    showConfirm({
      title: 'Delete Bet',
      message: 'Are you sure you want to remove this bet from the board? This cannot be undone.',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        const tripId = bet.tripId;
        await db.sideBets.delete(bet.id);
        queueSyncOperation('sideBet', bet.id, 'delete', tripId);
        showToast('info', 'Bet deleted');
        router.push('/bets');
      },
    });
  };

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title={bet.name}
        subtitle={currentTrip.name}
        onBack={() => router.push('/bets')}
        icon={<definition.icon size={16} className="text-[var(--canvas)]" />}
        iconTone="captain"
      />

      <main className="container-editorial py-[var(--space-6)] pb-[var(--space-12)]">
        <BetDetailHeroSection
          bet={bet}
          definition={definition}
          linkedMatch={linkedMatch}
          participantsCount={participants.length}
          winner={winner}
          nextSkinValue={nextSkinValue}
          onOpenLinkedMatch={
            linkedMatch ? () => router.push(`/score/${linkedMatch.id}`) : undefined
          }
          onReopen={() => {
            void reopenBet();
          }}
          onDelete={promptDelete}
        />

        <section className="mt-[var(--space-6)] grid gap-[var(--space-4)] xl:grid-cols-[minmax(0,1.15fr)_22rem]">
          <div className="space-y-[var(--space-4)]">
            <LinkedMatchPanel linkedMatch={linkedMatch} />

            {isSkins ? (
              <SkinsBoard
                bet={bet}
                standings={skinsStandings}
                nextSkinValue={nextSkinValue}
                participants={participants}
                onSelectHole={setSelectedHole}
              />
            ) : null}

            {isNassau ? (
              <NassauBoard
                bet={bet}
                teamAPlayers={teamAPlayers}
                teamBPlayers={teamBPlayers}
                summary={nassauSummary}
                onSetWinner={setNassauWinner}
              />
            ) : null}

            {!isSkins && !isNassau ? (
              <WinnerBoard
                bet={bet}
                participants={participants}
                winner={winner}
                onSetWinner={setOverallWinner}
              />
            ) : null}
          </div>

          <aside className="space-y-[var(--space-4)]">
            <ParticipantsPanel participants={participants} winnerId={bet.winnerId} />
            <BetNote
              icon={<definition.icon size={18} />}
              title={
                isSkins
                  ? 'Pushes should feel obvious'
                  : isNassau
                    ? 'Segment the Nassau cleanly'
                    : 'Record the winner once'
              }
              body={
                isSkins
                  ? `The next live skin is worth $${nextSkinValue || bet.perHole || 5}. When a hole is halved, the carry now rolls correctly instead of stacking forever.`
                  : isNassau
                    ? 'Front, back, and overall each carry their own result. Once all three are logged, the bet closes itself.'
                    : 'Simple bets should read like a clean ledger: one format, one winner, one obvious payout.'
              }
              tone="maroon"
            />
            {bet.status === 'completed' ? (
              <BetNote
                icon={<Check size={18} />}
                title="Closed does not mean forgotten"
                body="Completed bets belong in the trip memory too. Reopen only if the board is genuinely wrong."
              />
            ) : null}
          </aside>
        </section>
      </main>

      {selectedHole !== null ? (
        <SkinsResultModal
          holeNumber={selectedHole}
          participants={participants}
          onClose={() => setSelectedHole(null)}
          onSelectWinner={(winnerId) => {
            void recordHoleWinner(selectedHole, winnerId);
          }}
          onPush={() => {
            void recordHoleWinner(selectedHole);
          }}
        />
      ) : null}

      {ConfirmDialogComponent}
    </div>
  );
}
