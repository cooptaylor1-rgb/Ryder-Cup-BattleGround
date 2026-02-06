'use client';

// Note: this route is client-only; we intentionally avoid auto-redirects to show explicit empty states.
import { useRouter } from 'next/navigation';
import { useTripStore, useUIStore } from '@/lib/stores';
import { EmptyStatePremium } from '@/components/ui/EmptyStatePremium';
import { BottomNav, PageHeader } from '@/components/layout';
import { InvitationManager } from '@/components/captain';
import { QrCode, Home, MoreHorizontal } from 'lucide-react';

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
      <div
        className="min-h-screen pb-nav page-premium-enter texture-grain"
        style={{ background: 'var(--canvas)' }}
      >
        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="golf-ball"
            title="No active trip"
            description="Start or select a trip to manage invitations."
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
      <div
        className="min-h-screen pb-nav page-premium-enter texture-grain"
        style={{ background: 'var(--canvas)' }}
      >
        <main className="container-editorial py-12">
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
            variant="large"
          />
        </main>
        <BottomNav />
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
            <PageHeader
        title="Invitations"
        subtitle="Manage trip invites"
        icon={<QrCode size={16} style={{ color: 'var(--color-accent)' }} />}
        onBack={() => router.back()}
      />

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

            <BottomNav />
    </div>
  );
}
