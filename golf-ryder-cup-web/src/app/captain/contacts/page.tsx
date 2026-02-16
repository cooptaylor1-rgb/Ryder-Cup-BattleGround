'use client';

// (no React hooks needed here)
import { useRouter } from 'next/navigation';
// import Link from 'next/link';
import { useTripStore, useUIStore } from '@/lib/stores';
import { EmptyStatePremium } from '@/components/ui/EmptyStatePremium';
import { BottomNav } from '@/components/layout';
import { PageHeader } from '@/components/layout/PageHeader';
import { EmergencyContacts, type ContactPlayer, type VenueContact } from '@/components/captain';
import { Phone, Home, MoreHorizontal } from 'lucide-react';

/**
 * CONTACTS PAGE
 *
 * Emergency contacts and venue information.
 */

export default function ContactsPage() {
  const router = useRouter();
  const { currentTrip, players, teams, teamMembers } = useTripStore();
  const { isCaptainMode } = useUIStore();

  // Note: we avoid auto-redirects here so we can render a clear empty-state instead.

  if (!currentTrip) {
    return (
      <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="golfers"
            title="No active trip"
            description="Start or select a trip to view emergency contacts and venue info."
            action={{
              label: 'Go Home',
              onClick: () => router.push('/'),
              icon: <Home size={16} />,
            }}
            variant="large"
          />
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!isCaptainMode) {
    return (
      <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="trophy"
            title="Captain mode required"
            description="Turn on Captain Mode to access Contacts."
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
        <BottomNav />
      </div>
    );
  }

  // Convert players to ContactPlayer format
  // Note: Phone numbers would typically come from profile data
  const contactPlayers: ContactPlayer[] = players.map((p, index) => {
    const membership = teamMembers.find(tm => tm.playerId === p.id);
    const team = membership ? teams.find(t => t.id === membership.teamId) : undefined;
    const teamId: 'A' | 'B' = team?.name?.toLowerCase().includes('europe') ||
      team?.name?.toLowerCase().includes('eur') ||
      team?.name === 'B' ? 'B' : 'A';

    return {
      id: p.id,
      firstName: p.firstName,
      lastName: p.lastName,
      phone: `555-${String(100 + index).padStart(3, '0')}-${String(1000 + index).padStart(4, '0')}`, // Demo phone
      teamId,
    };
  });

  // Demo venue contacts
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

  const handleCall = (phone: string) => {
    window.open(`tel:${phone}`, '_self');
  };

  const handleText = (phone: string) => {
    window.open(`sms:${phone}`, '_self');
  };

  return (
    <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Contacts"
        subtitle="Emergency & venue info"
        icon={<Phone size={16} className="text-[var(--canvas)]" />}
        iconContainerClassName="bg-gradient-to-br from-slate-500 to-slate-600 shadow-[0_0_16px_rgba(100,116,139,0.3)]"
        onBack={() => router.back()}
      />

      <main className="container-editorial">
        <section className="section">
          <div className="card p-[var(--space-5)]">
            <EmergencyContacts
              players={contactPlayers}
              venueContacts={venueContacts}
              onCall={handleCall}
              onText={handleText}
            />
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
