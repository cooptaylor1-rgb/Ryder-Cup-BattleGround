'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  CaptainModeRequiredState,
  CaptainNoTripState,
} from '@/components/captain/CaptainAccessState';
import { PrintablePairings } from '@/components/captain/PrintablePairings';
import { PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { db } from '@/lib/db';
import { useTripStore, useAccessStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import { cn } from '@/lib/utils';
import type { Match } from '@/lib/types/models';
import {
  CalendarDays,
  Printer,
  Shield,
  Users,
} from 'lucide-react';

export default function CaptainPairingsPage() {
  const router = useRouter();
  const { currentTrip, sessions, teams, players } = useTripStore(useShallow(s => ({ currentTrip: s.currentTrip, sessions: s.sessions, teams: s.teams, players: s.players })));
  const { isCaptainMode } = useAccessStore(useShallow(s => ({ isCaptainMode: s.isCaptainMode })));

  const sessionIds = sessions.map((session) => session.id);
  const matches = useLiveQuery(
    async (): Promise<Match[]> => {
      if (sessionIds.length === 0) return [];
      return db.matches.where('sessionId').anyOf(sessionIds).toArray();
    },
    [sessionIds.join(',')],
    [] as Match[]
  );

  if (!currentTrip) {
    return <CaptainNoTripState description="Start or select a trip to view pairings." />;
  }

  if (!isCaptainMode) {
    return <CaptainModeRequiredState description="Turn on Captain Mode to view and print pairings." />;
  }

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Pairings"
        subtitle={currentTrip.name}
        icon={<Printer size={16} className="text-[var(--canvas)]" />}
        iconContainerClassName="bg-[linear-gradient(135deg,var(--maroon)_0%,var(--maroon-dark)_100%)]"
        backFallback="/captain"
      />

      <main className="container-editorial py-[var(--space-6)] pb-[var(--space-12)]">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--maroon-subtle)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,240,241,0.98))] shadow-[0_24px_52px_rgba(46,34,18,0.08)]">
          <div className="grid gap-[var(--space-5)] px-[var(--space-5)] py-[var(--space-5)] lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.95fr)]">
            <div>
              <p className="type-overline tracking-[0.18em] text-[var(--maroon)]">Captain Print Room</p>
              <h1 className="mt-[var(--space-2)] font-serif text-[clamp(2rem,7vw,3.15rem)] italic leading-[1.02] text-[var(--ink)]">
                Put the pairings somewhere the whole trip can see them.
              </h1>
              <p className="mt-[var(--space-3)] max-w-[35rem] type-body-sm text-[var(--ink-secondary)]">
                A printed sheet is still useful when the first tee wants something physical. Keep the pairing board readable, then let the printable view do its job.
              </p>

              <div className="mt-[var(--space-5)] flex flex-wrap gap-[var(--space-3)]">
                <Button variant="primary" onClick={() => window.print()} leftIcon={<Printer size={16} />}>
                  Print now
                </Button>
                <Link
                  href="/matchups"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[color:var(--rule)]/55 bg-[color:var(--surface)]/78 px-[var(--space-4)] py-[var(--space-3)] text-sm font-semibold text-[var(--ink)] transition-transform duration-150 hover:scale-[1.02] hover:border-[var(--maroon-subtle)] hover:bg-[var(--surface)]"
                >
                  Open matchups
                </Link>
              </div>
            </div>

            <div className="grid gap-[var(--space-3)] sm:grid-cols-3 lg:grid-cols-1">
              <PairingsFactCard icon={<CalendarDays size={18} />} label="Sessions" value={sessions.length} detail="Rounds on the sheet" />
              <PairingsFactCard icon={<Shield size={18} />} label="Matches" value={matches.length} detail="Printed pairing rows" />
              <PairingsFactCard icon={<Users size={18} />} label="Players" value={players.length} detail="Names available to print" />
            </div>
          </div>
        </section>

        <section className="mt-[var(--space-6)] rounded-[2rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,239,232,0.99))] p-[var(--space-5)] shadow-[0_20px_46px_rgba(41,29,17,0.08)]">
          <div className="mb-[var(--space-4)]">
            <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">Printable Sheet</p>
            <h2 className="mt-[var(--space-2)] font-serif text-[1.95rem] italic text-[var(--ink)]">
              Give the course something clean and legible.
            </h2>
          </div>

          <div className={cn('rounded-[1.6rem] border border-[color:var(--rule)]/70 bg-[color:var(--canvas)]/76 p-[var(--space-4)]')}>
            <PrintablePairings
              sessions={sessions}
              matches={matches}
              players={players}
              teams={teams}
              tripName={currentTrip.name}
            />
          </div>
        </section>
      </main>
    </div>
  );
}

function PairingsFactCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  detail: string;
}) {
  return (
    <div className="rounded-[1.5rem] border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/78 p-[var(--space-4)] shadow-[0_16px_34px_rgba(41,29,17,0.05)]">
      <div className="flex items-center gap-[var(--space-2)] text-[var(--ink-tertiary)]">
        {icon}
        <span className="type-overline tracking-[0.14em]">{label}</span>
      </div>
      <p className="mt-[var(--space-3)] font-serif text-[1.95rem] italic leading-none text-[var(--ink)]">{value}</p>
      <p className="mt-[var(--space-2)] text-sm text-[var(--ink-secondary)]">{detail}</p>
    </div>
  );
}
