'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  CartAssignmentManager,
  type CartPlayer,
} from '@/components/captain';
import {
  CaptainModeRequiredState,
  CaptainNoTripState,
} from '@/components/captain/CaptainAccessState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { useTripStore, useAccessStore, useToastStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import { cn } from '@/lib/utils';
import {
  Car,
  Shield,
  Users,
} from 'lucide-react';

export default function CartsPage() {
  const router = useRouter();
  const { currentTrip, players, teams, teamMembers } = useTripStore(useShallow(s => ({ currentTrip: s.currentTrip, players: s.players, teams: s.teams, teamMembers: s.teamMembers })));
  const { isCaptainMode } = useAccessStore(useShallow(s => ({ isCaptainMode: s.isCaptainMode })));
  const { showToast } = useToastStore(useShallow(s => ({ showToast: s.showToast })));

  if (!currentTrip) {
    return <CaptainNoTripState description="Start or select a trip to manage cart assignments." />;
  }

  if (!isCaptainMode) {
    return <CaptainModeRequiredState description="Turn on Captain Mode to access cart assignments." />;
  }

  const cartPlayers: CartPlayer[] = players.map((player) => {
    const membership = teamMembers.find((teamMember) => teamMember.playerId === player.id);
    const team = membership ? teams.find((candidate) => candidate.id === membership.teamId) : undefined;
    const teamId: 'A' | 'B' =
      team?.name?.toLowerCase().includes('europe') || team?.name?.toLowerCase().includes('eur') || team?.name === 'B'
        ? 'B'
        : 'A';

    return {
      id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      teamId,
    };
  });

  const teamA = teams.find((team) => team.name?.toLowerCase().includes('usa') || team.name === 'A');
  const teamB = teams.find(
    (team) =>
      team.name?.toLowerCase().includes('europe') || team.name?.toLowerCase().includes('eur') || team.name === 'B'
  );
  const suggestedCartCount = Math.ceil(cartPlayers.length / 2);

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Carts"
        subtitle={currentTrip.name}
        icon={<Car size={16} className="text-[var(--canvas)]" />}
        iconContainerClassName="bg-[linear-gradient(135deg,var(--maroon)_0%,var(--maroon-dark)_100%)]"
        backFallback="/captain"
      />

      <main className="container-editorial py-[var(--space-6)] pb-[var(--space-12)]">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--maroon-subtle)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,240,241,0.98))] shadow-[0_24px_52px_rgba(46,34,18,0.08)]">
          <div className="grid gap-[var(--space-5)] px-[var(--space-5)] py-[var(--space-5)] lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.95fr)]">
            <div>
              <p className="type-overline tracking-[0.18em] text-[var(--maroon)]">Captain Logistics</p>
              <h1 className="mt-[var(--space-2)] font-serif text-[clamp(2rem,7vw,3.15rem)] italic leading-[1.02] text-[var(--ink)]">
                Pair the carts before the lot becomes its own game.
              </h1>
              <p className="mt-[var(--space-3)] max-w-[35rem] type-body-sm text-[var(--ink-secondary)]">
                Cart assignments are small until they are not. Set them while the day is still calm and the
                first tee will feel much less improvised.
              </p>

              <div className="mt-[var(--space-5)] flex flex-wrap gap-[var(--space-3)]">
                <Button variant="primary" onClick={() => router.push('/players')} leftIcon={<Users size={16} />}>
                  Review players
                </Button>
                <Link
                  href="/captain"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[color:var(--rule)]/55 bg-[color:var(--surface)]/78 px-[var(--space-4)] py-[var(--space-3)] text-sm font-semibold text-[var(--ink)] transition-transform duration-150 hover:scale-[1.02] hover:border-[var(--maroon-subtle)] hover:bg-[var(--surface)]"
                >
                  Back to command
                </Link>
              </div>
            </div>

            <div className="grid gap-[var(--space-3)] sm:grid-cols-3 lg:grid-cols-1">
              <CartFactCard icon={<Users size={18} />} label="Players" value={cartPlayers.length} detail="Ready for a seat assignment" />
              <CartFactCard icon={<Car size={18} />} label="Suggested Carts" value={suggestedCartCount} detail="At two players per cart" />
              <CartFactCard
                icon={<Shield size={18} />}
                label="Sides"
                value={`${teamA?.name || 'USA'} / ${teamB?.name || 'Europe'}`}
                detail="Use the board to keep pairings sensible"
                valueClassName="font-sans text-[1rem] not-italic leading-[1.2]"
              />
            </div>
          </div>
        </section>

        <section className="mt-[var(--space-6)] grid gap-[var(--space-4)] xl:grid-cols-[minmax(0,1.15fr)_22rem]">
          <div className="rounded-[2rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,239,232,0.99))] p-[var(--space-5)] shadow-[0_20px_46px_rgba(41,29,17,0.08)]">
            <div className="mb-[var(--space-4)]">
              <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">Cart Board</p>
              <h2 className="mt-[var(--space-2)] font-serif text-[1.95rem] italic text-[var(--ink)]">
                Keep the pairings organized before engines start.
              </h2>
            </div>

            {cartPlayers.length === 0 ? (
              <div className="rounded-[1.5rem] border border-dashed border-[color:var(--rule)]/75 bg-[color:var(--surface)]/74 p-[var(--space-7)] text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[1.25rem] bg-[var(--surface-raised)] text-[var(--ink-tertiary)]">
                  <Car size={26} />
                </div>
                <h3 className="mt-[var(--space-4)] font-serif text-[1.7rem] italic text-[var(--ink)]">
                  No players to assign.
                </h3>
                <p className="mx-auto mt-[var(--space-2)] max-w-[30rem] type-body-sm text-[var(--ink-secondary)]">
                  Add the roster first, then this board can actually solve the parking-lot question.
                </p>
                <Link
                  href="/players"
                  className="mt-[var(--space-5)] inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--maroon)] px-[var(--space-5)] py-[var(--space-3)] text-sm font-semibold text-[var(--canvas)] shadow-[0_12px_28px_rgba(104,35,48,0.22)] transition-transform duration-150 hover:scale-[1.02]"
                >
                  Add players
                </Link>
              </div>
            ) : (
              <CartAssignmentManager
                players={cartPlayers}
                teamAName={teamA?.name || 'USA'}
                teamBName={teamB?.name || 'Europe'}
                onAssignmentsChange={() => {
                  showToast('success', 'Cart assignments updated');
                }}
              />
            )}
          </div>

          <aside className="space-y-[var(--space-4)]">
            <CartSidebarCard
              title="Think in pairs"
              body="If the morning starts with two captains trying to solve carts on the fly, the board is already late. Pair people before they can improvise badly."
              icon={<Car size={18} />}
            />
            <CartSidebarCard
              title="Mix with intent"
              body="Use the cart room to balance social chemistry, pace, and practical needs. A good cart pairing buys more peace than it gets credit for."
              icon={<Shield size={18} />}
              tone="maroon"
            />
          </aside>
        </section>
      </main>
    </div>
  );
}

function CartFactCard({
  icon,
  label,
  value,
  detail,
  valueClassName,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  detail: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/78 p-[var(--space-4)] shadow-[0_16px_34px_rgba(41,29,17,0.05)]">
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

function CartSidebarCard({
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
