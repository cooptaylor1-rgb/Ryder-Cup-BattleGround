'use client';

import Link from 'next/link';
import { type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  EmergencyContacts,
  type ContactPlayer,
  type VenueContact,
} from '@/components/captain';
import {
  CaptainModeRequiredState,
  CaptainNoTripState,
} from '@/components/captain/CaptainAccessState';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { useTripStore, useAccessStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import { cn } from '@/lib/utils';
import {
  Phone,
  Shield,
  Users,
} from 'lucide-react';

export default function ContactsPage() {
  const router = useRouter();
  const { currentTrip, players, teams, teamMembers } = useTripStore(useShallow(s => ({ currentTrip: s.currentTrip, players: s.players, teams: s.teams, teamMembers: s.teamMembers })));
  const { isCaptainMode } = useAccessStore(useShallow(s => ({ isCaptainMode: s.isCaptainMode })));

  if (!currentTrip) {
    return (
      <CaptainNoTripState
        illustration="golfers"
        description="Start or select a trip to view emergency contacts and venue info."
      />
    );
  }

  if (!isCaptainMode) {
    return <CaptainModeRequiredState description="Turn on Captain Mode to access contacts." />;
  }

  const contactPlayers: ContactPlayer[] = players.map((player, index) => {
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
      phone: `555-${String(100 + index).padStart(3, '0')}-${String(1000 + index).padStart(4, '0')}`,
      teamId,
    };
  });

  const venueContacts: VenueContact[] = [
    {
      id: '1',
      name: 'Pro Shop',
      role: 'Pro Shop',
      phone: '555-123-4567',
      isPrimary: true,
    },
    {
      id: '2',
      name: 'Clubhouse',
      role: 'Clubhouse',
      phone: '555-123-4568',
    },
    {
      id: '3',
      name: 'Starter',
      role: 'Starter',
      phone: '555-123-4569',
    },
  ];

  const handleCall = (_playerId: string, phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  const handleText = (_playerId: string, phone: string) => {
    window.open(`sms:${phone}`, '_self');
  };

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Contacts"
        subtitle={currentTrip.name}
        icon={<Phone size={16} className="text-[var(--canvas)]" />}
        iconContainerClassName="bg-[linear-gradient(135deg,var(--maroon)_0%,var(--maroon-dark)_100%)]"
        onBack={() => router.back()}
      />

      <main className="container-editorial py-[var(--space-6)] pb-[var(--space-12)]">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--maroon-subtle)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(247,240,241,0.98))] shadow-[0_24px_52px_rgba(46,34,18,0.08)]">
          <div className="grid gap-[var(--space-5)] px-[var(--space-5)] py-[var(--space-5)] lg:grid-cols-[minmax(0,1.3fr)_minmax(18rem,0.95fr)]">
            <div>
              <p className="type-overline tracking-[0.18em] text-[var(--maroon)]">Captain Logistics</p>
              <h1 className="mt-[var(--space-2)] font-serif text-[clamp(2rem,7vw,3.15rem)] italic leading-[1.02] text-[var(--ink)]">
                Keep the important numbers somewhere better than memory.
              </h1>
              <p className="mt-[var(--space-3)] max-w-[35rem] type-body-sm text-[var(--ink-secondary)]">
                When something goes sideways, nobody wants a scavenger hunt through group texts. Put the
                roster and venue contacts on one clean board before anyone needs them.
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
              <ContactFactCard icon={<Users size={18} />} label="Roster Contacts" value={contactPlayers.length} detail="Players with phone entries" />
              <ContactFactCard icon={<Phone size={18} />} label="Venue Numbers" value={venueContacts.length} detail="Course-side calls in one place" />
              <ContactFactCard
                icon={<Shield size={18} />}
                label="Primary Line"
                value={venueContacts.find((contact) => contact.isPrimary)?.name || 'None'}
                detail="The first call when you need the course"
                valueClassName="font-sans text-[1rem] not-italic leading-[1.2]"
              />
            </div>
          </div>
        </section>

        <section className="mt-[var(--space-6)] grid gap-[var(--space-4)] xl:grid-cols-[minmax(0,1.15fr)_22rem]">
          <div className="rounded-[2rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,239,232,0.99))] p-[var(--space-5)] shadow-[0_20px_46px_rgba(41,29,17,0.08)]">
            <div className="mb-[var(--space-4)]">
              <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">Contact Board</p>
              <h2 className="mt-[var(--space-2)] font-serif text-[1.95rem] italic text-[var(--ink)]">
                Keep the emergency tree short and visible.
              </h2>
            </div>

            <EmergencyContacts
              players={contactPlayers}
              venueContacts={venueContacts}
              onCall={handleCall}
              onText={handleText}
            />
          </div>

          <aside className="space-y-[var(--space-4)]">
            <ContactSidebarCard
              title="Keep it boring"
              body="The best emergency board is the one nobody thinks about until the moment it matters, and then it is exactly where it should be."
              icon={<Phone size={18} />}
            />
            <ContactSidebarCard
              title="Name the primary line"
              body="One designated first call keeps captains from splitting attention across the clubhouse, the pro shop, and whoever happens to answer first."
              icon={<Shield size={18} />}
              tone="maroon"
            />
          </aside>
        </section>
      </main>
    </div>
  );
}

function ContactFactCard({
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

function ContactSidebarCard({
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
