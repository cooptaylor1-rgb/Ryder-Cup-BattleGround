'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { InvitationManager, QRCodeCard } from '@/components/captain';
import {
  CaptainModeRequiredState,
  CaptainNoTripState,
} from '@/components/captain/CaptainAccessState';
import {
  CloudOff,
  Link2,
  QrCode,
  RefreshCw,
  Send,
  Share2,
  Users,
} from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { ensureTripShareCode, regenerateTripShareCode } from '@/lib/services/tripSyncService';
import { useTripStore, useAccessStore, useToastStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import { getStoredTripShareCode } from '@/lib/utils/tripShareCodeStore';
import { useTripRosterRefresh } from '@/lib/hooks/useTripRosterRefresh';
import { cn } from '@/lib/utils';

export default function InvitesPage() {
  const router = useRouter();
  const { currentTrip, players } = useTripStore(
    useShallow((s) => ({ currentTrip: s.currentTrip, players: s.players })),
  );
  const { isCaptainMode } = useAccessStore(useShallow(s => ({ isCaptainMode: s.isCaptainMode })));
  const { showToast } = useToastStore(useShallow(s => ({ showToast: s.showToast })));
  const [shareCode, setShareCode] = useState<string | null>(null);
  const [isLoadingShareCode, setIsLoadingShareCode] = useState(false);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  // Auto-pull the roster from Supabase every 15s so new invitees show
  // up on the captain's screen without a restart. `tripStore.loadTrip`
  // reads Dexie only — see useTripRosterRefresh for the full story.
  const { isRefreshing: isRefreshingRoster, refresh: refreshRosterFromCloud } = useTripRosterRefresh(
    currentTrip?.id ?? null,
  );

  const handleShare = useCallback(
    async (resolvedShareCode: string, tripName: string) => {
      const shareUrl = `${window.location.origin}/join?code=${resolvedShareCode}`;
      const payload = {
        title: `Join ${tripName}`,
        text: `Join our golf trip with code ${resolvedShareCode}.`,
        url: shareUrl,
      };

      if (navigator.share) {
        try {
          await navigator.share(payload);
          return;
        } catch (error) {
          if ((error as Error).name === 'AbortError') {
            return;
          }
        }
      }

      await navigator.clipboard.writeText(`${payload.text}\n${payload.url}`);
      showToast('success', 'Invite copied to clipboard');
    },
    [showToast]
  );

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

    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) {
        setIsLoadingShareCode(true);
        setShareCode(null);
      }
    });

    void ensureTripShareCode(currentTrip.id)
      .then((resolvedShareCode) => {
        if (!cancelled) {
          setShareCode(resolvedShareCode);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setShareCode(null);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingShareCode(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentTrip]);

  if (!currentTrip) {
    return <CaptainNoTripState description="Start or select a trip to manage invitations." />;
  }

  if (!isCaptainMode) {
    return <CaptainModeRequiredState description="Turn on Captain Mode to access invitations." />;
  }

  const shareUrl = shareCode && origin ? `${origin}/join?code=${shareCode}` : '';
  const tripInfo = {
    tripId: currentTrip.id,
    tripName: currentTrip.name,
    shareCode: shareCode ?? '--------',
    shareUrl,
    captainName: currentTrip.captainName || 'Captain',
    startDate: currentTrip.startDate,
    location: currentTrip.location,
  };

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Invitations"
        subtitle={currentTrip.name}
        icon={<QrCode size={16} className="text-[var(--canvas)]" />}
        backFallback="/captain"
        rightSlot={
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Share2 size={14} />}
            disabled={!shareCode || isLoadingShareCode}
            onClick={() => {
              if (shareCode) {
                void handleShare(shareCode, currentTrip.name);
              }
            }}
          >
            Share
          </Button>
        }
      />

      <main className="container-editorial py-[var(--space-6)] pb-[var(--space-12)]">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--masters)]/14 bg-[linear-gradient(135deg,rgba(10,80,48,0.97),rgba(4,52,30,0.98))] text-[var(--canvas)] shadow-[0_28px_64px_rgba(5,58,35,0.24)]">
          <div className="grid gap-[var(--space-5)] px-[var(--space-5)] py-[var(--space-5)] lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.95fr)]">
            <div>
              <p className="type-overline tracking-[0.18em] text-[color:var(--canvas)]/70">
                Captain Invite Desk
              </p>
              <h1 className="mt-[var(--space-2)] font-serif text-[clamp(2rem,7vw,3.3rem)] italic leading-[1.02] text-[var(--canvas)]">
                Make joining the trip feel inevitable.
              </h1>
              <p className="mt-[var(--space-3)] max-w-[36rem] text-sm leading-7 text-[color:var(--canvas)]/80">
                A good trip invite should look like it belongs to a serious weekend, not like something
                pasted together in the parking lot. Put the code where everyone can see it, then let
                the app do the housekeeping.
              </p>

              <div className="mt-[var(--space-5)] flex flex-wrap gap-[var(--space-3)]">
                <Button
                  variant="secondary"
                  className="border-[color:var(--canvas)]/16 bg-[var(--canvas)] text-[var(--masters)] hover:bg-[color:var(--canvas)]/92"
                  leftIcon={<Share2 size={16} />}
                  disabled={!shareCode || isLoadingShareCode}
                  onClick={() => {
                    if (shareCode) {
                      void handleShare(shareCode, currentTrip.name);
                    }
                  }}
                >
                  {isLoadingShareCode ? 'Preparing invite' : 'Share invite'}
                </Button>
                <Button
                  variant="outline"
                  className="border-[color:var(--canvas)]/22 bg-transparent text-[var(--canvas)] hover:bg-[color:var(--canvas)]/10"
                  leftIcon={<Users size={16} />}
                  onClick={() => router.push('/players')}
                >
                  Review roster
                </Button>
                <Button
                  variant="outline"
                  className="border-[color:var(--canvas)]/22 bg-transparent text-[var(--canvas)] hover:bg-[color:var(--canvas)]/10"
                  leftIcon={
                    <RefreshCw
                      size={16}
                      className={isRefreshingRoster ? 'animate-spin' : undefined}
                    />
                  }
                  onClick={() => void refreshRosterFromCloud()}
                  disabled={isRefreshingRoster || !currentTrip}
                >
                  {isRefreshingRoster ? 'Refreshing…' : 'Refresh roster'}
                </Button>
              </div>
            </div>

            <div className="grid gap-[var(--space-3)] sm:grid-cols-3 lg:grid-cols-1">
              <InviteFactCard icon={<Link2 size={18} />} label="Join code" value={shareCode || 'Waiting'} detail="The same code belongs everywhere players might look." />
              <InviteFactCard icon={<Users size={18} />} label="Roster" value={players.length} detail="The invite should lead into a trip that already feels organized." />
              <InviteFactCard
                icon={<Send size={18} />}
                label="Cloud sync"
                value={isLoadingShareCode ? 'Publishing' : shareCode ? 'Ready' : 'Offline'}
                detail={shareCode ? 'The trip can be shared from the captain desk.' : 'No real share code is available right now.'}
                valueClassName="font-sans text-[1rem] not-italic leading-[1.25]"
              />
            </div>
          </div>
        </section>

        {shareCode ? (
          <section className="mt-[var(--space-6)] grid gap-[var(--space-4)] xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
            <QRCodeCard shareUrl={shareUrl} shareCode={shareCode} tripName={currentTrip.name} />
            <InvitationManager
              tripInfo={tripInfo}
              invitations={[]}
              onSendInvite={() => showToast('success', 'Invite drafted')}
              onRevokeInvite={() => showToast('info', 'Invite revoked')}
              onCopyLink={() => showToast('success', 'Invite copied')}
              onRegenerateCode={async () => {
                if (!currentTrip) return;
                const nextCode = await regenerateTripShareCode(currentTrip.id);
                if (nextCode) {
                  setShareCode(nextCode);
                  showToast('success', 'New invite code is live. Reshare the link.');
                } else {
                  showToast('error', 'Could not regenerate. Check your connection and retry.');
                }
              }}
            />
          </section>
        ) : (
          <section className="mt-[var(--space-6)] rounded-[2rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,238,231,0.98))] p-[var(--space-6)] shadow-[0_20px_44px_rgba(41,29,17,0.08)]">
            <div className="grid gap-[var(--space-5)] lg:grid-cols-[minmax(0,1.1fr)_18rem]">
              <div>
                <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">Invite Status</p>
                <h2 className="mt-[var(--space-2)] font-serif text-[2rem] italic text-[var(--ink)]">
                  The captain board is ready. The cloud invite is not.
                </h2>
                <p className="mt-[var(--space-3)] max-w-[35rem] text-sm leading-7 text-[var(--ink-secondary)]">
                  The trip could not publish a real join code. That usually means the device is offline
                  or cloud sync is unavailable, so the invite desk has to wait for the connection to come back.
                </p>
                <div className="mt-[var(--space-5)]">
                  <Button
                    variant="primary"
                    leftIcon={<Share2 size={16} />}
                    isLoading={isLoadingShareCode}
                    loadingText="Publishing"
                    onClick={() => {
                      if (currentTrip) {
                        setIsLoadingShareCode(true);
                        void ensureTripShareCode(currentTrip.id)
                          .then((resolvedShareCode) => setShareCode(resolvedShareCode))
                          .catch(() => showToast('error', 'Could not publish a trip invite'))
                          .finally(() => setIsLoadingShareCode(false));
                      }
                    }}
                  >
                    Try again
                  </Button>
                </div>
              </div>

              <div className="rounded-[1.6rem] border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/76 p-[var(--space-4)]">
                <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-[color:var(--error)]/10 text-[var(--error)]">
                  <CloudOff size={20} />
                </div>
                <h3 className="mt-[var(--space-3)] text-lg font-semibold text-[var(--ink)]">
                  Share code unavailable
                </h3>
                <p className="mt-[var(--space-2)] text-sm leading-6 text-[var(--ink-secondary)]">
                  The invite desk still has its design language, but it should not pretend the trip is shareable until the real cloud code exists.
                </p>
              </div>
            </div>
          </section>
        )}

        <section className="mt-[var(--space-6)] grid gap-[var(--space-4)] lg:grid-cols-2">
          <InviteSidebarCard
            title="Put the code where the day begins"
            body="The best spot for the QR is usually wherever the group stands still for 30 seconds: breakfast table, rental-house counter, or the first tee before anyone has settled down."
          />
          <InviteSidebarCard
            title="Keep the fallback human"
            body="If cloud sync drops, do not improvise a fake code. Wait for the real one, then send the link once. It is better to look composed ten minutes later than confused right now."
            tone="green"
          />
        </section>
      </main>
    </div>
  );
}

function InviteFactCard({
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
    <div className="rounded-[1.55rem] border border-[color:var(--canvas)]/16 bg-[color:var(--canvas)]/10 p-[var(--space-4)]">
      <div className="flex items-center gap-[var(--space-2)] text-[color:var(--canvas)]/72">
        {icon}
        <span className="type-overline tracking-[0.14em]">{label}</span>
      </div>
      <div className={cn('mt-[var(--space-2)] font-serif text-[2rem] italic leading-none text-[var(--canvas)]', valueClassName)}>
        {value}
      </div>
      <p className="mt-[var(--space-2)] text-xs leading-5 text-[color:var(--canvas)]/72">{detail}</p>
    </div>
  );
}

function InviteSidebarCard({
  title,
  body,
  tone = 'ink',
}: {
  title: string;
  body: string;
  tone?: 'ink' | 'green';
}) {
  return (
    <aside
      className={cn(
        'rounded-[1.8rem] border p-[var(--space-5)] shadow-[0_18px_38px_rgba(41,29,17,0.06)]',
        tone === 'green'
          ? 'border-[var(--masters)]/16 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(239,246,242,0.99))]'
          : 'border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,239,232,0.98))]'
      )}
    >
      <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">Captain note</p>
      <h3 className="mt-[var(--space-2)] font-serif text-[1.75rem] italic text-[var(--ink)]">{title}</h3>
      <p className="mt-[var(--space-3)] text-sm leading-7 text-[var(--ink-secondary)]">{body}</p>
    </aside>
  );
}
