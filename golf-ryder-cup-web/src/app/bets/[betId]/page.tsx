'use client';

import Link from 'next/link';
import { useState, type ReactNode } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { PageHeader } from '@/components/layout';
import { EmptyStatePremium, PageLoadingSkeleton } from '@/components/ui';
import { Button } from '@/components/ui/Button';
import { useConfirmDialog } from '@/components/ui/ConfirmDialog';
import { db } from '@/lib/db';
import { getSideBetDefinition } from '@/lib/constants';
import { useTripStore, useUIStore } from '@/lib/stores';
import type { Match, NassauResults, Player, SideBet, SideBetResult } from '@/lib/types/models';
import { cn } from '@/lib/utils';
import {
  AlertCircle,
  Check,
  ChevronRight,
  Clock,
  DollarSign,
  Flag,
  Home,
  RefreshCw,
  Target,
  Trophy,
  Trash2,
  Users,
  X,
} from 'lucide-react';

export default function BetDetailPage() {
  const router = useRouter();
  const params = useParams();
  const betId = params.betId as string;
  const { currentTrip, players } = useTripStore();
  const { showToast } = useUIStore();
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
          iconContainerClassName="bg-[linear-gradient(135deg,var(--maroon)_0%,var(--maroon-dark)_100%)]"
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
    .map((id) => players.find((player) => player.id === id))
    .filter((player): player is Player => Boolean(player));
  const winner = bet.winnerId ? participants.find((player) => player.id === bet.winnerId) : undefined;
  const isSkins = bet.type === 'skins';
  const isNassau = bet.type === 'nassau';
  const teamAPlayers =
    isNassau && bet.nassauTeamA
      ? bet.nassauTeamA
          .map((id) => players.find((player) => player.id === id))
          .filter((player): player is Player => Boolean(player))
      : [];
  const teamBPlayers =
    isNassau && bet.nassauTeamB
      ? bet.nassauTeamB
          .map((id) => players.find((player) => player.id === id))
          .filter((player): player is Player => Boolean(player))
      : [];
  const skinsStandings = isSkins ? calculateSkinsStandings(bet, participants) : [];
  const nextSkinValue = isSkins ? calculateNextSkinValue(bet) : 0;
  const nassauSummary = isNassau ? getNassauSummary(bet) : null;
  const statusTone = bet.status === 'completed' ? 'green' : 'maroon';

  const recordHoleWinner = async (holeNumber: number, winnerId?: string) => {
    const perHole = bet.perHole || definition.defaultPerHole || 5;
    const nextResults = normalizeSkinsResults(upsertHoleResult(bet.results || [], holeNumber, winnerId), perHole);

    await db.sideBets.update(bet.id, { results: nextResults });
    setSelectedHole(null);
    showToast('success', winnerId ? 'Hole winner recorded' : 'Hole pushed to the next skin');
  };

  const setOverallWinner = async (winnerId: string) => {
    await db.sideBets.update(bet.id, {
      winnerId,
      status: 'completed',
      completedAt: new Date().toISOString(),
    });
    showToast('success', 'Winner recorded');
  };

  const setNassauWinner = async (
    segment: 'front9Winner' | 'back9Winner' | 'overallWinner',
    value: 'teamA' | 'teamB' | 'push'
  ) => {
    const nextResults: NassauResults = {
      ...(bet.nassauResults || {}),
      [segment]: value,
    };
    const isComplete = Boolean(nextResults.front9Winner && nextResults.back9Winner && nextResults.overallWinner);

    await db.sideBets.update(bet.id, {
      nassauResults: nextResults,
      status: isComplete ? 'completed' : 'active',
      completedAt: isComplete ? new Date().toISOString() : undefined,
    });
    showToast('success', 'Segment result recorded');
  };

  const reopenBet = async () => {
    await db.sideBets.update(bet.id, {
      status: 'active',
      winnerId: undefined,
      completedAt: undefined,
    });
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
        await db.sideBets.delete(bet.id);
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
        iconContainerClassName={cn(
          bet.status === 'completed'
            ? 'bg-[linear-gradient(135deg,var(--success)_0%,#1d7d53_100%)]'
            : 'bg-[linear-gradient(135deg,var(--maroon)_0%,var(--maroon-dark)_100%)]'
        )}
      />

      <main className="container-editorial py-[var(--space-6)] pb-[var(--space-12)]">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--maroon-subtle)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,240,241,0.98))] shadow-[0_24px_52px_rgba(46,34,18,0.08)]">
          <div className="grid gap-[var(--space-5)] px-[var(--space-5)] py-[var(--space-5)] lg:grid-cols-[minmax(0,1.28fr)_minmax(18rem,0.96fr)]">
            <div>
              <p className="type-overline tracking-[0.18em] text-[var(--maroon)]">{definition.label}</p>
              <h1 className="mt-[var(--space-2)] font-serif text-[clamp(2rem,7vw,3.15rem)] italic leading-[1.02] text-[var(--ink)]">
                {bet.status === 'completed' && winner
                  ? `${winner.firstName} ${winner.lastName} took the money.`
                  : bet.status === 'completed' && isNassau
                    ? 'The Nassau is settled and the segments are closed.'
                    : 'Keep the wager readable while the round is still moving.'}
              </h1>
              <p className="mt-[var(--space-3)] max-w-[35rem] type-body-sm text-[var(--ink-secondary)]">
                {bet.description || definition.description}
              </p>

              <div className="mt-[var(--space-5)] flex flex-wrap gap-[var(--space-3)]">
                {linkedMatch ? (
                  <Button variant="secondary" onClick={() => router.push(`/score/${linkedMatch.id}`)} leftIcon={<Flag size={16} />}>
                    Open linked match
                  </Button>
                ) : null}
                {bet.status === 'completed' ? (
                  <Button variant="secondary" onClick={() => void reopenBet()} leftIcon={<RefreshCw size={16} />}>
                    Reopen bet
                  </Button>
                ) : null}
                <Button variant="danger" onClick={promptDelete} leftIcon={<Trash2 size={16} />}>
                  Delete
                </Button>
              </div>
            </div>

            <div className="grid gap-[var(--space-3)] sm:grid-cols-2 lg:grid-cols-2">
              <DetailFactCard icon={<DollarSign size={18} />} label="Pot" value={`$${bet.pot || 0}`} detail={isSkins ? `$${bet.perHole || 5} per hole` : isNassau ? 'Three Nassau segments' : 'Winner-take-all'} tone={bet.pot ? 'green' : 'ink'} />
              <DetailFactCard icon={bet.status === 'completed' ? <Check size={18} /> : <Clock size={18} />} label="Status" value={bet.status === 'completed' ? 'Closed' : 'Live'} detail={bet.status === 'completed' ? 'Recorded in the ledger' : 'Still on the board'} tone={statusTone} valueClassName="font-sans text-[1rem] not-italic uppercase tracking-[0.16em]" />
              <DetailFactCard icon={<Users size={18} />} label="Players" value={participants.length} detail="Participants in the game" />
              <DetailFactCard icon={<Flag size={18} />} label="Scope" value={linkedMatch ? `Match ${linkedMatch.matchOrder}` : 'Trip'} detail={linkedMatch ? 'Inside game tied to a match' : 'Trip-wide side action'} valueClassName="font-sans text-[1rem] not-italic" />
            </div>
          </div>
        </section>

        <section className="mt-[var(--space-6)] grid gap-[var(--space-4)] xl:grid-cols-[minmax(0,1.15fr)_22rem]">
          <div className="space-y-[var(--space-4)]">
            <LinkedMatchPanel linkedMatch={linkedMatch} />

            {isSkins ? (
              <SkinsBoard
                bet={bet}
                standings={skinsStandings}
                nextSkinValue={nextSkinValue}
                getPlayer={(playerId) => players.find((player) => player.id === playerId)}
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
              title={isSkins ? 'Pushes should feel obvious' : isNassau ? 'Segment the Nassau cleanly' : 'Record the winner once'}
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

function DetailFactCard({
  icon,
  label,
  value,
  detail,
  tone = 'ink',
  valueClassName,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  detail: string;
  tone?: 'ink' | 'green' | 'maroon';
  valueClassName?: string;
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

function SectionCard({
  overline,
  title,
  subtitle,
  children,
}: {
  overline: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[1.8rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,239,232,0.99))] p-[var(--space-5)] shadow-[0_20px_46px_rgba(41,29,17,0.08)]">
      <div className="mb-[var(--space-4)]">
        <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">{overline}</p>
        <h2 className="mt-[var(--space-2)] font-serif text-[1.95rem] italic text-[var(--ink)]">{title}</h2>
        <p className="mt-[var(--space-2)] text-sm leading-6 text-[var(--ink-secondary)]">{subtitle}</p>
      </div>
      {children}
    </section>
  );
}

function LinkedMatchPanel({ linkedMatch }: { linkedMatch: Match | null | undefined }) {
  if (linkedMatch === undefined) {
    return (
      <SectionCard
        overline="Linked Match"
        title="Looking for the inside game."
        subtitle="This bet references a match. The app is checking whether that match exists on this device."
      >
        <div className="rounded-[1.4rem] border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/78 p-[var(--space-4)] text-sm text-[var(--ink-secondary)]">
          Match data is still loading.
        </div>
      </SectionCard>
    );
  }

  if (linkedMatch === null) {
    return (
      <SectionCard
        overline="Linked Match"
        title="The match card is missing."
        subtitle="This bet is tied to a match that is not available on this device yet."
      >
        <div className="flex items-start gap-[var(--space-3)] rounded-[1.4rem] border border-[color:var(--warning)]/16 bg-[color:var(--warning)]/10 p-[var(--space-4)]">
          <AlertCircle size={18} className="mt-1 text-[var(--warning)]" />
          <p className="text-sm leading-6 text-[var(--ink-secondary)]">
            The wager can still exist even if the linked match has not synced down.
          </p>
        </div>
      </SectionCard>
    );
  }

  return (
    <SectionCard
      overline="Linked Match"
      title={`Match #${linkedMatch.matchOrder}`}
      subtitle="This is an inside game tied directly to one match."
    >
      <div className="flex flex-wrap items-center justify-between gap-[var(--space-3)] rounded-[1.4rem] border border-[color:var(--rule)]/70 bg-[color:var(--canvas)]/78 p-[var(--space-4)]">
        <div className="flex items-center gap-[var(--space-3)]">
          <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[color:var(--maroon)]/10 text-[var(--maroon)]">
            <Flag size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--ink)]">Open the live scoring screen</p>
            <p className="text-sm text-[var(--ink-secondary)]">The underlying match is still the source of truth for the round.</p>
          </div>
        </div>
        <Link
          href={`/score/${linkedMatch.id}`}
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[color:var(--rule)]/65 bg-[color:var(--surface)]/82 px-[var(--space-4)] py-[var(--space-3)] text-sm font-semibold text-[var(--ink)] transition-transform duration-150 hover:scale-[1.02] hover:border-[var(--maroon-subtle)]"
        >
          Open match
        </Link>
      </div>
    </SectionCard>
  );
}

function WinnerBoard({
  bet,
  participants,
  winner,
  onSetWinner,
}: {
  bet: SideBet;
  participants: Player[];
  winner?: Player;
  onSetWinner: (winnerId: string) => Promise<void>;
}) {
  return (
    <SectionCard
      overline="Winner"
      title={bet.status === 'completed' && winner ? `${winner.firstName} ${winner.lastName} won the bet.` : 'Put the winner on the board.'}
      subtitle={
        bet.status === 'completed'
          ? 'This wager is already closed. Reopen it only if the board is wrong.'
          : 'Closest to the pin, long drive, or any simple one-shot bet should end with one decisive name.'
      }
    >
      {bet.status === 'completed' && winner ? (
        <div className="rounded-[1.4rem] border border-[color:var(--success)]/16 bg-[linear-gradient(180deg,rgba(45,122,79,0.10),rgba(255,255,255,0.98))] p-[var(--space-4)]">
          <div className="flex items-center gap-[var(--space-3)]">
            <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-[var(--success)] text-[var(--canvas)]">
              <Trophy size={20} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">{winner.firstName} {winner.lastName}</p>
              <p className="text-sm text-[var(--ink-secondary)]">Winner of the ${bet.pot || 0} pot.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {participants.map((player) => (
            <button
              key={player.id}
              type="button"
              onClick={() => {
                void onSetWinner(player.id);
              }}
              className="rounded-full bg-[var(--maroon)] px-4 py-3 text-sm font-semibold text-[var(--canvas)] transition-transform duration-150 hover:scale-[1.02]"
            >
              {player.firstName} {player.lastName}
            </button>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

function SkinsBoard({
  bet,
  standings,
  nextSkinValue,
  getPlayer,
  onSelectHole,
}: {
  bet: SideBet;
  standings: Array<{ playerId: string; playerName: string; skins: number; winnings: number }>;
  nextSkinValue: number;
  getPlayer: (playerId: string) => Player | undefined;
  onSelectHole: (holeNumber: number) => void;
}) {
  return (
    <SectionCard
      overline="Skins Board"
      title="Track each hole like a proper card."
      subtitle={`The next live skin is worth $${nextSkinValue}. Pushed holes now roll forward cleanly instead of stacking forever.`}
    >
      <div className="grid grid-cols-6 gap-[var(--space-2)]">
        {Array.from({ length: 18 }, (_, index) => index + 1).map((holeNumber) => {
          const result = bet.results?.find((entry) => entry.holeNumber === holeNumber);
          const holeWinner = result?.winnerId ? getPlayer(result.winnerId) : undefined;

          return (
            <button
              key={holeNumber}
              type="button"
              onClick={() => onSelectHole(holeNumber)}
              className={cn(
                'aspect-square rounded-[1rem] border text-center transition-transform duration-150 hover:scale-[1.03]',
                result?.winnerId
                  ? 'border-[color:var(--success)]/18 bg-[var(--success)] text-[var(--canvas)]'
                  : result
                    ? 'border-[color:var(--warning)]/18 bg-[var(--warning)] text-[var(--canvas)]'
                    : 'border-[color:var(--rule)]/70 bg-[color:var(--surface)]/82 text-[var(--ink)]'
              )}
            >
              <div className="flex h-full flex-col items-center justify-center gap-1">
                <span className="text-xs font-bold">{holeNumber}</span>
                {holeWinner ? (
                  <span className="text-[10px] uppercase tracking-[0.08em]">
                    {(holeWinner.lastName || holeWinner.firstName).slice(0, 3)}
                  </span>
                ) : result ? (
                  <span className="text-[10px] uppercase tracking-[0.08em]">Push</span>
                ) : (
                  <span className="text-[10px] uppercase tracking-[0.08em]">Open</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-[var(--space-5)] rounded-[1.4rem] border border-[color:var(--rule)]/70 bg-[color:var(--canvas)]/78 p-[var(--space-4)]">
        <div className="flex items-center justify-between gap-[var(--space-3)]">
          <div>
            <p className="type-overline tracking-[0.14em] text-[var(--ink-tertiary)]">Standings</p>
            <p className="mt-[var(--space-2)] text-sm text-[var(--ink-secondary)]">
              Winners get the accumulated carry attached to their hole.
            </p>
          </div>
          <div className="rounded-full bg-[color:var(--success)]/12 px-3 py-1 text-sm font-semibold text-[var(--success)]">
            Next skin: ${nextSkinValue}
          </div>
        </div>

        {standings.length > 0 ? (
          <div className="mt-[var(--space-4)] space-y-3">
            {standings.map((standing, index) => (
              <div
                key={standing.playerId}
                className="flex items-center justify-between gap-[var(--space-3)] rounded-[1rem] border border-[color:var(--rule)]/60 bg-[color:var(--surface)]/70 px-[var(--space-4)] py-[var(--space-3)]"
              >
                <div className="flex items-center gap-[var(--space-3)]">
                  <span
                    className={cn(
                      'inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold',
                      index === 0
                        ? 'bg-[var(--success)] text-[var(--canvas)]'
                        : 'bg-[color:var(--surface-raised)] text-[var(--ink-secondary)]'
                    )}
                  >
                    {index + 1}
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-[var(--ink)]">{standing.playerName}</p>
                    <p className="text-sm text-[var(--ink-secondary)]">
                      {standing.skins} skin{standing.skins === 1 ? '' : 's'}
                    </p>
                  </div>
                </div>
                <span className="text-sm font-semibold text-[var(--success)]">${standing.winnings}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-[var(--space-4)] rounded-[1rem] border border-dashed border-[color:var(--rule)]/70 bg-[color:var(--surface)]/72 p-[var(--space-5)] text-center text-sm text-[var(--ink-secondary)]">
            No skins have been claimed yet.
          </div>
        )}
      </div>
    </SectionCard>
  );
}

function NassauBoard({
  bet,
  teamAPlayers,
  teamBPlayers,
  summary,
  onSetWinner,
}: {
  bet: SideBet;
  teamAPlayers: Player[];
  teamBPlayers: Player[];
  summary: { teamAWins: number; teamBWins: number; pushes: number; segmentValue: number } | null;
  onSetWinner: (
    segment: 'front9Winner' | 'back9Winner' | 'overallWinner',
    value: 'teamA' | 'teamB' | 'push'
  ) => Promise<void>;
}) {
  const segmentValue = Math.round((bet.pot || 20) / 3);
  const segmentRows = [
    { key: 'front9Winner' as const, label: 'Front Nine' },
    { key: 'back9Winner' as const, label: 'Back Nine' },
    { key: 'overallWinner' as const, label: 'Overall' },
  ];

  return (
    <SectionCard
      overline="Nassau"
      title="Score the three segments cleanly."
      subtitle={`Each segment is worth $${segmentValue}. The bet closes itself when front, back, and overall are all logged.`}
    >
      <div className="grid gap-[var(--space-3)] sm:grid-cols-[1fr_auto_1fr]">
        <TeamPanel label="Team A" tone="usa" players={teamAPlayers} />
        <div className="flex items-center justify-center text-sm font-semibold uppercase tracking-[0.18em] text-[var(--ink-tertiary)]">
          vs
        </div>
        <TeamPanel label="Team B" tone="europe" players={teamBPlayers} />
      </div>

      <div className="mt-[var(--space-5)] space-y-3">
        {segmentRows.map((segment) => {
          const result = bet.nassauResults?.[segment.key];
          return (
            <div
              key={segment.key}
              className="rounded-[1.3rem] border border-[color:var(--rule)]/70 bg-[color:var(--canvas)]/78 p-[var(--space-4)]"
            >
              <div className="flex items-center justify-between gap-[var(--space-3)]">
                <div>
                  <p className="text-sm font-semibold text-[var(--ink)]">{segment.label}</p>
                  <p className="text-sm text-[var(--ink-secondary)]">${segmentValue} segment</p>
                </div>
                {result ? (
                  <span
                    className={cn(
                      'rounded-full px-3 py-1 text-sm font-semibold',
                      result === 'teamA'
                        ? 'bg-[var(--team-usa)] text-white'
                        : result === 'teamB'
                          ? 'bg-[var(--team-europe)] text-white'
                          : 'bg-[var(--warning)] text-[var(--canvas)]'
                    )}
                  >
                    {result === 'push' ? 'Push' : `${result === 'teamA' ? 'Team A' : 'Team B'} wins`}
                  </span>
                ) : (
                  <span className="rounded-full bg-[color:var(--surface)] px-3 py-1 text-sm font-semibold text-[var(--ink-tertiary)]">
                    Open
                  </span>
                )}
              </div>

              {bet.status !== 'completed' ? (
                <div className="mt-[var(--space-3)] flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void onSetWinner(segment.key, 'teamA');
                    }}
                    className="rounded-full bg-[var(--team-usa)] px-4 py-2 text-sm font-semibold text-white"
                  >
                    Team A
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void onSetWinner(segment.key, 'push');
                    }}
                    className="rounded-full bg-[var(--warning)] px-4 py-2 text-sm font-semibold text-[var(--canvas)]"
                  >
                    Push
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void onSetWinner(segment.key, 'teamB');
                    }}
                    className="rounded-full bg-[var(--team-europe)] px-4 py-2 text-sm font-semibold text-white"
                  >
                    Team B
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {summary ? (
        <div className="mt-[var(--space-5)] grid gap-[var(--space-3)] sm:grid-cols-3">
          <SummaryTile label="Team A" value={`${summary.teamAWins} win${summary.teamAWins === 1 ? '' : 's'}`} detail={`$${summary.teamAWins * summary.segmentValue}`} tone="usa" />
          <SummaryTile label="Pushes" value={summary.pushes} detail="Halved segments" />
          <SummaryTile label="Team B" value={`${summary.teamBWins} win${summary.teamBWins === 1 ? '' : 's'}`} detail={`$${summary.teamBWins * summary.segmentValue}`} tone="europe" />
        </div>
      ) : null}
    </SectionCard>
  );
}

function TeamPanel({
  label,
  tone,
  players,
}: {
  label: string;
  tone: 'usa' | 'europe';
  players: Player[];
}) {
  return (
    <div
      className={cn(
        'rounded-[1.2rem] p-[var(--space-4)] text-white',
        tone === 'usa' ? 'bg-[var(--team-usa)]' : 'bg-[var(--team-europe)]'
      )}
    >
      <p className="type-overline tracking-[0.15em] opacity-90">{label}</p>
      <div className="mt-[var(--space-3)] space-y-1">
        {players.map((player) => (
          <p key={player.id} className="text-sm font-semibold">
            {player.firstName} {player.lastName}
          </p>
        ))}
      </div>
    </div>
  );
}

function SummaryTile({
  label,
  value,
  detail,
  tone = 'ink',
}: {
  label: string;
  value: ReactNode;
  detail: string;
  tone?: 'ink' | 'usa' | 'europe';
}) {
  return (
    <div
      className={cn(
        'rounded-[1.2rem] border p-[var(--space-4)] text-center',
        tone === 'usa'
          ? 'border-[color:var(--team-usa)]/18 bg-[color:var(--team-usa)]/8'
          : tone === 'europe'
            ? 'border-[color:var(--team-europe)]/18 bg-[color:var(--team-europe)]/8'
            : 'border-[color:var(--rule)]/70 bg-[color:var(--surface)]/72'
      )}
    >
      <p className="type-overline tracking-[0.14em] text-[var(--ink-tertiary)]">{label}</p>
      <p className="mt-[var(--space-3)] font-serif text-[1.65rem] italic text-[var(--ink)]">{value}</p>
      <p className="mt-[var(--space-2)] text-sm text-[var(--ink-secondary)]">{detail}</p>
    </div>
  );
}

function ParticipantsPanel({
  participants,
  winnerId,
}: {
  participants: Player[];
  winnerId?: string;
}) {
  return (
    <div className="rounded-[1.6rem] border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/82 p-[var(--space-5)] shadow-[0_16px_34px_rgba(41,29,17,0.05)]">
      <div className="flex items-center gap-[var(--space-2)] text-[var(--ink-tertiary)]">
        <Users size={18} />
        <span className="type-overline tracking-[0.14em]">Participants</span>
      </div>
      <div className="mt-[var(--space-4)] space-y-3">
        {participants.map((player) => (
          <div
            key={player.id}
            className="flex items-center gap-[var(--space-3)] rounded-[1.15rem] border border-[color:var(--rule)]/65 bg-[color:var(--canvas)]/72 px-[var(--space-4)] py-[var(--space-3)]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[color:var(--surface)] text-[var(--ink-tertiary)]">
              <Users size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[var(--ink)]">
                {player.firstName} {player.lastName}
              </p>
              {player.handicapIndex !== undefined ? (
                <p className="text-sm text-[var(--ink-secondary)]">HCP {player.handicapIndex}</p>
              ) : null}
            </div>
            {winnerId === player.id ? (
              <span className="rounded-full bg-[color:var(--success)]/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[var(--success)]">
                Winner
              </span>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function BetNote({
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
        <span className="type-overline tracking-[0.14em]">Ledger Note</span>
      </div>
      <h3 className="mt-[var(--space-3)] font-serif text-[1.55rem] italic text-[var(--ink)]">{title}</h3>
      <p className="mt-[var(--space-2)] text-sm leading-6 text-[var(--ink-secondary)]">{body}</p>
    </div>
  );
}

function SkinsResultModal({
  holeNumber,
  participants,
  onClose,
  onSelectWinner,
  onPush,
}: {
  holeNumber: number;
  participants: Player[];
  onClose: () => void;
  onSelectWinner: (winnerId: string) => void;
  onPush: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[color:var(--ink)]/70 p-4" onClick={onClose}>
      <div
        className="w-full max-w-[560px] overflow-auto rounded-[1.8rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,239,232,1))] p-[var(--space-5)] shadow-[0_26px_60px_rgba(17,15,10,0.28)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-[var(--space-3)]">
          <div>
            <p className="type-overline tracking-[0.16em] text-[var(--maroon)]">Record Result</p>
            <h2 className="mt-[var(--space-2)] font-serif text-[1.95rem] italic text-[var(--ink)]">
              Hole {holeNumber}
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

        <div className="mt-[var(--space-5)] space-y-3">
          {participants.map((player) => (
            <button
              key={player.id}
              type="button"
              onClick={() => onSelectWinner(player.id)}
              className="flex w-full items-center gap-[var(--space-3)] rounded-[1.2rem] border border-[color:var(--rule)]/70 bg-[color:var(--canvas)]/76 px-[var(--space-4)] py-[var(--space-4)] text-left transition-transform duration-150 hover:scale-[1.01] hover:border-[var(--maroon-subtle)]"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[var(--success)] text-[var(--canvas)]">
                <Trophy size={18} />
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--ink)]">{player.firstName} {player.lastName}</p>
                <p className="text-sm text-[var(--ink-secondary)]">Record as hole winner</p>
              </div>
              <ChevronRight size={18} className="ml-auto text-[var(--ink-tertiary)]" />
            </button>
          ))}

          <button
            type="button"
            onClick={onPush}
            className="flex w-full items-center gap-[var(--space-3)] rounded-[1.2rem] border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/82 px-[var(--space-4)] py-[var(--space-4)] text-left transition-transform duration-150 hover:scale-[1.01] hover:border-[var(--warning)]/35"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[var(--warning)] text-[var(--canvas)]">
              <Target size={18} />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--ink)]">Push the hole</p>
              <p className="text-sm text-[var(--ink-secondary)]">Carry the value forward to the next skin.</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}

function upsertHoleResult(results: SideBetResult[], holeNumber: number, winnerId?: string) {
  const next = results.filter((entry) => entry.holeNumber !== holeNumber);
  next.push({
    holeNumber,
    winnerId,
    amount: 0,
  });
  return next.sort((left, right) => left.holeNumber - right.holeNumber);
}

function normalizeSkinsResults(results: SideBetResult[], perHole: number) {
  let carry = 0;

  return results
    .sort((left, right) => left.holeNumber - right.holeNumber)
    .map((result) => {
      if (!result.winnerId) {
        carry += perHole;
        return { ...result, amount: perHole };
      }

      const amount = perHole + carry;
      carry = 0;
      return { ...result, amount };
    });
}

function calculateNextSkinValue(bet: SideBet) {
  const perHole = bet.perHole || 5;
  const results = (bet.results || []).sort((left, right) => left.holeNumber - right.holeNumber);
  let carry = 0;

  for (const result of results) {
    if (!result.winnerId) {
      carry += perHole;
    } else {
      carry = 0;
    }
  }

  return perHole + carry;
}

function calculateSkinsStandings(bet: SideBet, participants: Player[]) {
  const standings = new Map<string, { skins: number; winnings: number }>();

  for (const player of participants) {
    standings.set(player.id, { skins: 0, winnings: 0 });
  }

  for (const result of normalizeSkinsResults(bet.results || [], bet.perHole || 5)) {
    if (!result.winnerId) continue;
    const current = standings.get(result.winnerId);
    if (!current) continue;

    standings.set(result.winnerId, {
      skins: current.skins + 1,
      winnings: current.winnings + result.amount,
    });
  }

  return Array.from(standings.entries())
    .map(([playerId, data]) => ({
      playerId,
      playerName:
        participants.find((player) => player.id === playerId)?.lastName ||
        participants.find((player) => player.id === playerId)?.firstName ||
        'Unknown',
      ...data,
    }))
    .filter((standing) => standing.skins > 0)
    .sort((left, right) => right.winnings - left.winnings);
}

function getNassauSummary(bet: SideBet) {
  const results = bet.nassauResults || {};
  let teamAWins = 0;
  let teamBWins = 0;
  let pushes = 0;

  for (const value of [results.front9Winner, results.back9Winner, results.overallWinner]) {
    if (value === 'teamA') teamAWins += 1;
    if (value === 'teamB') teamBWins += 1;
    if (value === 'push') pushes += 1;
  }

  return {
    teamAWins,
    teamBWins,
    pushes,
    segmentValue: Math.round((bet.pot || 20) / 3),
  };
}
