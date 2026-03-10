'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { PreFlightChecklist } from '@/components/captain';
import {
  CaptainModeRequiredState,
  CaptainNoTripState,
} from '@/components/captain/CaptainAccessState';
import { PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { useTripStore, useUIStore } from '@/lib/stores';
import { cn } from '@/lib/utils';
import {
  CalendarDays,
  Map,
  Rocket,
  Shield,
  Users,
} from 'lucide-react';

export default function ChecklistPage() {
  const router = useRouter();
  const { currentTrip, players, teams, teamMembers, sessions, courses, teeSets } = useTripStore();
  const { isCaptainMode, showToast } = useUIStore();

  const matches: never[] = [];

  const handleAllClear = () => {
    showToast('success', 'All systems go! Ready to play.');
  };

  if (!currentTrip) {
    return <CaptainNoTripState description="Start or select a trip to run the pre-flight checklist." />;
  }

  if (!isCaptainMode) {
    return <CaptainModeRequiredState description="Turn on Captain Mode to access the checklist." />;
  }

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Pre-Flight"
        subtitle={currentTrip.name}
        onBack={() => router.back()}
        icon={<Rocket size={16} className="text-[var(--canvas)]" />}
        iconContainerClassName="bg-[linear-gradient(135deg,var(--maroon)_0%,var(--maroon-dark)_100%)]"
      />

      <main className="container-editorial py-[var(--space-6)] pb-[var(--space-12)]">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--maroon-subtle)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,240,241,0.98))] shadow-[0_24px_52px_rgba(46,34,18,0.08)]">
          <div className="grid gap-[var(--space-5)] px-[var(--space-5)] py-[var(--space-5)] lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.95fr)]">
            <div>
              <p className="type-overline tracking-[0.18em] text-[var(--maroon)]">Captain Readiness</p>
              <h1 className="mt-[var(--space-2)] font-serif text-[clamp(2rem,7vw,3.15rem)] italic leading-[1.02] text-[var(--ink)]">
                Run the trip before the trip runs you.
              </h1>
              <p className="mt-[var(--space-3)] max-w-[35rem] type-body-sm text-[var(--ink-secondary)]">
                Good captaincy often looks boring from the outside. That usually means the checks were done
                before the first tee exposed every missing player, team gap, or course detail at once.
              </p>

              <div className="mt-[var(--space-5)] flex flex-wrap gap-[var(--space-3)]">
                <Button variant="primary" onClick={() => router.push('/captain/manage')} leftIcon={<Shield size={16} />}>
                  Open manage
                </Button>
                <Link
                  href="/players"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[color:var(--rule)]/55 bg-[color:var(--surface)]/78 px-[var(--space-4)] py-[var(--space-3)] text-sm font-semibold text-[var(--ink)] transition-transform duration-150 hover:scale-[1.02] hover:border-[var(--maroon-subtle)] hover:bg-[var(--surface)]"
                >
                  Review roster
                </Link>
              </div>
            </div>

            <div className="grid gap-[var(--space-3)] sm:grid-cols-3 lg:grid-cols-1">
              <ChecklistFactCard icon={<Users size={18} />} label="Players" value={players.length} detail="Rostered for the trip" />
              <ChecklistFactCard icon={<CalendarDays size={18} />} label="Sessions" value={sessions.length} detail="Rounds on the board" />
              <ChecklistFactCard
                icon={<Map size={18} />}
                label="Course Setup"
                value={`${courses.length}/${teeSets.length}`}
                detail="Courses and tee sets loaded"
                tone={courses.length > 0 ? 'green' : 'ink'}
              />
            </div>
          </div>
        </section>

        <section className="mt-[var(--space-6)] grid gap-[var(--space-4)] xl:grid-cols-[minmax(0,1.15fr)_22rem]">
          <div className="rounded-[2rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,239,232,0.99))] p-[var(--space-5)] shadow-[0_20px_46px_rgba(41,29,17,0.08)]">
            <div className="mb-[var(--space-4)]">
              <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">Launch Checklist</p>
              <h2 className="mt-[var(--space-2)] font-serif text-[1.95rem] italic text-[var(--ink)]">
                Check the routing before the day starts moving.
              </h2>
            </div>

            <PreFlightChecklist
              tripId={currentTrip.id}
              trip={currentTrip}
              players={players}
              teams={teams}
              teamMembers={teamMembers}
              sessions={sessions}
              matches={matches}
              courses={courses}
              teeSets={teeSets}
              onAllClear={handleAllClear}
            />
          </div>

          <aside className="space-y-[var(--space-4)]">
            <ChecklistSidebarCard
              title="Fix the inputs first"
              body="Roster, teams, and sessions are the load-bearing pieces. If those are sound, the rest of the board usually follows."
              icon={<Users size={18} />}
            />
            <ChecklistSidebarCard
              title="Do this before breakfast"
              body="The checklist is most valuable before the group is standing on property. After that, it turns from planning tool into damage control."
              icon={<Rocket size={18} />}
              tone="maroon"
            />
            <div className="rounded-[1.6rem] border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/82 p-[var(--space-5)] shadow-[0_16px_34px_rgba(41,29,17,0.05)]">
              <p className="type-overline tracking-[0.15em] text-[var(--ink-tertiary)]">Quick Fixes</p>
              <div className="mt-[var(--space-4)] space-y-3">
                <QuickFixLink href="/players" icon={<Users size={18} />} title="Manage Players" body="Add or edit the roster." />
                <QuickFixLink href="/captain" icon={<Shield size={18} />} title="Captain Command" body="Return to the main board." />
              </div>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}

function ChecklistFactCard({
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
  tone?: 'ink' | 'green';
}) {
  return (
    <div
      className={cn(
        'rounded-[1.5rem] border p-[var(--space-4)] shadow-[0_16px_34px_rgba(41,29,17,0.05)]',
        tone === 'green'
          ? 'border-[color:var(--success)]/16 bg-[linear-gradient(180deg,rgba(45,122,79,0.10),rgba(255,255,255,0.98))]'
          : 'border-[color:var(--rule)]/70 bg-[color:var(--surface)]/78'
      )}
    >
      <div className="flex items-center gap-[var(--space-2)] text-[var(--ink-tertiary)]">
        {icon}
        <span className="type-overline tracking-[0.14em]">{label}</span>
      </div>
      <p className="mt-[var(--space-3)] font-serif text-[1.95rem] italic leading-none text-[var(--ink)]">
        {value}
      </p>
      <p className="mt-[var(--space-2)] text-sm text-[var(--ink-secondary)]">{detail}</p>
    </div>
  );
}

function ChecklistSidebarCard({
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

function QuickFixLink({
  href,
  icon,
  title,
  body,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  body: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-[var(--space-3)] rounded-[1.25rem] border border-[color:var(--rule)]/70 bg-[color:var(--canvas)]/75 px-[var(--space-4)] py-[var(--space-4)] transition-transform duration-150 hover:scale-[1.01] hover:border-[var(--maroon-subtle)]"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[color:var(--maroon)]/10 text-[var(--maroon)]">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-[var(--ink)]">{title}</p>
        <p className="text-sm text-[var(--ink-secondary)]">{body}</p>
      </div>
    </Link>
  );
}
