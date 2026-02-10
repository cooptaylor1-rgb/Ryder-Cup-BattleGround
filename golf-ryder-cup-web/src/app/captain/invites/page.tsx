'use client';

// Note: this route is client-only; we intentionally avoid auto-redirects to show explicit empty states.
import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTripStore, useUIStore } from '@/lib/stores';
import { EmptyStatePremium } from '@/components/ui/EmptyStatePremium';
import { BottomNav, PageHeader } from '@/components/layout';
import { InvitationManager, QRCodeCard } from '@/components/captain';
import { QrCode, Home, MoreHorizontal, Share2 } from 'lucide-react';

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

  // Share via native Share API with clipboard fallback
  const handleShare = useCallback(async (shareCode: string, tripName: string) => {
    const shareUrl = `${window.location.origin}/join?code=${shareCode}`;
    const shareData = {
      title: `Join ${tripName}`,
      text: `Join our golf trip! Use code: ${shareCode}`,
      url: shareUrl,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        // User cancelled or share failed -- fall back to clipboard
        if ((err as Error).name !== 'AbortError') {
          await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
          showToast('success', 'Invite copied to clipboard');
        }
      }
    } else {
      // Desktop fallback: copy to clipboard
      await navigator.clipboard.writeText(`${shareData.text}\n${shareData.url}`);
      showToast('success', 'Invite copied to clipboard');
    }
  }, [showToast]);

  if (!currentTrip) {
    return (
      <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
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
      <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
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
  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/join?code=${shareCode}`;

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
    <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Invitations"
        subtitle="Manage trip invites"
        icon={<QrCode size={16} className="text-[var(--color-accent)]" />}
        onBack={() => router.back()}
      />

      <main className="container-editorial">
        {/* QR Code Section */}
        <section className="pt-[var(--space-6)] pb-[var(--space-4)]">
          <QRCodeCard
            shareUrl={shareUrl}
            shareCode={shareCode}
            tripName={currentTrip.name}
          />

          {/* Share Invite Button */}
          <button
            onClick={() => handleShare(shareCode, currentTrip.name)}
            className="press-scale flex w-full items-center justify-center gap-[var(--space-2)] mt-[var(--space-4)] rounded-[var(--radius-lg)] border-2 border-[var(--masters)] bg-[var(--masters)] px-[var(--space-5)] py-[var(--space-3)] text-[length:var(--text-base)] font-semibold text-white"
          >
            <Share2 size={18} />
            Share Invite
          </button>
        </section>

        <hr className="divider-subtle" />

        {/* Invitation Manager */}
        <section className="section">
          <div className="card p-[var(--space-5)]">
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
