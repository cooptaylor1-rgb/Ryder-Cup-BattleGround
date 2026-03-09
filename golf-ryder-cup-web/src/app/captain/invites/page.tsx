'use client';

// Note: this route is client-only; we intentionally avoid auto-redirects to show explicit empty states.
import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTripStore, useUIStore } from '@/lib/stores';
import { EmptyStatePremium } from '@/components/ui/EmptyStatePremium';
import { PageHeader } from '@/components/layout';
import { InvitationManager, QRCodeCard } from '@/components/captain';
import { getTripShareCode } from '@/lib/services/tripSyncService';
import { getStoredTripShareCode } from '@/lib/utils/tripShareCodeStore';
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
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [isLoadingShareCode, setIsLoadingShareCode] = useState(false);

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

  useEffect(() => {
    if (!currentTrip) {
      queueMicrotask(() => {
        setShareCode(null);
        setIsLoadingShareCode(false);
      });
      return;
    }

    const cachedShareCode = getStoredTripShareCode(currentTrip.id);
    if (cachedShareCode) {
      queueMicrotask(() => {
        setShareCode(cachedShareCode);
        setIsLoadingShareCode(false);
      });
      return;
    }

    let isCancelled = false;
    const resetTimer = setTimeout(() => {
      setShareCode(null);
      setIsLoadingShareCode(true);
    }, 0);

    void getTripShareCode(currentTrip.id)
      .then((resolvedShareCode) => {
        if (isCancelled) {
          return;
        }
        setShareCode(resolvedShareCode);
      })
      .catch(() => {
        if (!isCancelled) {
          setShareCode(null);
        }
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingShareCode(false);
        }
      });

    return () => {
      isCancelled = true;
      clearTimeout(resetTimer);
    };
  }, [currentTrip]);

  if (!currentTrip) {
    return (
      <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
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
      </div>
    );
  }

  if (!isCaptainMode) {
    return (
      <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
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
      </div>
    );
  }

  const shareUrl = shareCode
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/join?code=${shareCode}`
    : '';

  const tripInfo = {
    tripId: currentTrip.id,
    tripName: currentTrip.name,
    shareCode: shareCode ?? '',
    shareUrl,
    captainName: 'Captain', // Would come from auth context in production
    startDate: currentTrip.startDate,
    location: currentTrip.location,
  };

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Invitations"
        subtitle="Manage trip invites"
        icon={<QrCode size={16} className="text-[var(--color-accent)]" />}
        onBack={() => router.back()}
      />

      <main className="container-editorial">
        {/* QR Code Section */}
        <section className="pt-[var(--space-6)] pb-[var(--space-4)]">
          {shareCode ? (
            <QRCodeCard
              shareUrl={shareUrl}
              shareCode={shareCode}
              tripName={currentTrip.name}
            />
          ) : (
            <div className="rounded-[var(--radius-lg)] border border-[var(--rule)] bg-[var(--surface-raised)] p-[var(--space-5)]">
              <p className="text-sm font-medium text-[var(--ink)]">
                {isLoadingShareCode ? 'Loading the trip join code...' : 'Trip join code unavailable'}
              </p>
              <p className="mt-2 text-sm text-[var(--ink-secondary)]">
                {isLoadingShareCode
                  ? 'Fetching the real cloud share code for this trip.'
                  : 'Sync this trip to cloud first, then reopen Invitations to share the real join code.'}
              </p>
            </div>
          )}

          {/* Share Invite Button */}
          <button
            onClick={() => shareCode && handleShare(shareCode, currentTrip.name)}
            disabled={!shareCode || isLoadingShareCode}
            className="press-scale flex w-full items-center justify-center gap-[var(--space-2)] mt-[var(--space-4)] rounded-[var(--radius-lg)] border-2 border-[var(--masters)] bg-[var(--masters)] px-[var(--space-5)] py-[var(--space-3)] text-[length:var(--text-base)] font-semibold text-[var(--canvas)]"
          >
            <Share2 size={18} />
            {isLoadingShareCode ? 'Loading Invite' : 'Share Invite'}
          </button>
        </section>

        <hr className="divider-subtle" />

        {/* Invitation Manager */}
        <section className="section">
          {shareCode ? (
            <div className="card p-[var(--space-5)]">
              <InvitationManager
                tripInfo={tripInfo}
                invitations={[]}
                onSendInvite={() => showToast('success', 'Invite sent!')}
                onRevokeInvite={() => showToast('info', 'Invite revoked')}
                onCopyLink={() => showToast('success', 'Link copied!')}
              />
            </div>
          ) : null}
        </section>
      </main>

    </div>
  );
}
