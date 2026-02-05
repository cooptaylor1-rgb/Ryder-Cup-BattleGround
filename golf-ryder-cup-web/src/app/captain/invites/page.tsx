'use client';

// Note: this route is client-only; we intentionally avoid auto-redirects to show explicit empty states.
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTripStore, useUIStore } from '@/lib/stores';
import { EmptyStatePremium } from '@/components/ui/EmptyStatePremium';
import { InvitationManager } from '@/components/captain';
import {
  ChevronLeft,
  QrCode,
  Users,
  Home,
  Target,
  Trophy,
  MoreHorizontal,
  CalendarDays,
} from 'lucide-react';

/**
 * INVITATIONS PAGE
 *
 * Manage trip invitations via QR codes and invite links.
 */

export default function InvitesPage() {
  const router = useRouter();
  const { currentTrip } = useTripStore();
  const { isCaptainMode, showToast } = useUIStore();

  // Note: avoid auto-redirects so we can render explicit empty states.

  if (!currentTrip) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--canvas)' }}>
        <div className="container-editorial section">
          <EmptyStatePremium
            illustration="golf-ball"
            title="No active trip"
            description="Start or select a trip to manage invitations."
            action={{
              label: 'Go Home',
              onClick: () => router.push('/'),
              icon: <Home size={16} />,
            }}
          />
        </div>
      </div>
    );
  }

  if (!isCaptainMode) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--canvas)' }}>
        <div className="container-editorial section">
          <EmptyStatePremium
            illustration="trophy"
            title="Captain mode required"
            description="Turn on Captain Mode to access Invitations."
            action={{
              label: 'Open More',
              onClick: () => router.push('/more'),
              icon: <MoreHorizontal size={16} />,
            }}
            secondaryAction={{
              label: 'Go Home',
              onClick: () => router.push('/'),
            }}
          />
        </div>
      </div>
    );
  }

  // Generate a share code from trip id
  const shareCode = currentTrip.id.substring(0, 8).toUpperCase();
  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/join/${shareCode}`;

  const tripInfo = {
    tripId: currentTrip.id,
    tripName: currentTrip.name,
    shareCode,
    shareUrl,
    captainName: 'Captain', // Would come from auth context in production
    startDate: currentTrip.startDate,
    location: currentTrip.location,
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
                  background: 'linear-gradient(135deg, #ec4899 0%, #db2777 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 16px rgba(236, 72, 153, 0.3)',
                }}
              >
                <QrCode size={16} style={{ color: 'white' }} />
              </div>
              <div>
                <span className="type-overline" style={{ letterSpacing: '0.1em' }}>Invitations</span>
                <p className="type-caption truncate" style={{ marginTop: '2px' }}>
                  Manage trip invites
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container-editorial">
        <section className="section">
          <div className="card" style={{ padding: 'var(--space-5)' }}>
            <InvitationManager
              tripInfo={tripInfo}
              invitations={[]}
              onSendInvite={() => showToast('success', 'Invite sent!')}
              onRevokeInvite={() => showToast('info', 'Invite revoked')}
              onCopyLink={() => showToast('success', 'Link copied!')}
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
