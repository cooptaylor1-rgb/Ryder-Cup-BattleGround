'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTripStore, useUIStore } from '@/lib/stores';
import { EmergencyContacts, type ContactPlayer, type VenueContact } from '@/components/captain';
import {
  ChevronLeft,
  Phone,
  Users,
  Home,
  Target,
  Trophy,
  MoreHorizontal,
  CalendarDays,
} from 'lucide-react';

/**
 * CONTACTS PAGE
 *
 * Emergency contacts and venue information.
 */

export default function ContactsPage() {
  const router = useRouter();
  const { currentTrip, players, teams, teamMembers } = useTripStore();
  const { isCaptainMode } = useUIStore();

  useEffect(() => {
    if (!currentTrip) {
      router.push('/');
      return;
    }
    if (!isCaptainMode) {
      router.push('/more');
    }
  }, [currentTrip, isCaptainMode, router]);

  if (!currentTrip || !isCaptainMode) {
    return null;
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
    <div className="min-h-screen pb-nav page-premium-enter texture-grain" style={{ background: 'var(--canvas)' }}>
      {/* Premium Header */}
      <header className="header-premium">
        <div className="container-editorial flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 press-scale"
              style={{ color: 'var(--ink-secondary)', background: 'transparent', border: 'none', cursor: 'pointer' }}
              aria-label="Back"
            >
              <ChevronLeft size={22} strokeWidth={1.75} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, #64748b 0%, #475569 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 16px rgba(100, 116, 139, 0.3)',
                }}
              >
                <Phone size={16} style={{ color: 'white' }} />
              </div>
              <div>
                <span className="type-overline" style={{ letterSpacing: '0.1em' }}>Contacts</span>
                <p className="type-caption truncate" style={{ marginTop: '2px' }}>
                  Emergency & venue info
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container-editorial">
        <section className="section">
          <div className="card" style={{ padding: 'var(--space-5)' }}>
            <EmergencyContacts
              players={contactPlayers}
              venueContacts={venueContacts}
              onCall={handleCall}
              onText={handleText}
            />
          </div>
        </section>
      </main>

      {/* Bottom Navigation */}
      <nav className="nav-premium bottom-nav">
        <Link href="/" className="nav-item">
          <Home size={22} strokeWidth={1.75} />
          <span>Home</span>
        </Link>
        <Link href="/schedule" className="nav-item">
          <CalendarDays size={22} strokeWidth={1.75} />
          <span>Schedule</span>
        </Link>
        <Link href="/score" className="nav-item">
          <Target size={22} strokeWidth={1.75} />
          <span>Score</span>
        </Link>
        <Link href="/matchups" className="nav-item">
          <Users size={22} strokeWidth={1.75} />
          <span>Matches</span>
        </Link>
        <Link href="/standings" className="nav-item">
          <Trophy size={22} strokeWidth={1.75} />
          <span>Standings</span>
        </Link>
        <Link href="/more" className="nav-item">
          <MoreHorizontal size={22} strokeWidth={1.75} />
          <span>More</span>
        </Link>
      </nav>
    </div>
  );
}
