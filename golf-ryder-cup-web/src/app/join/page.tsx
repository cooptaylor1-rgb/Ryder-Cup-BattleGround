'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { MapPin, Calendar, Crown, ChevronRight } from 'lucide-react';
import { useAuthStore } from '@/lib/stores';
import { PageLoadingSkeleton, Button, EmptyStatePremium } from '@/components/ui';

interface TripPreview {
  id: string;
  name: string;
  startDate: string | null;
  endDate: string | null;
  location: string | null;
  captainName: string | null;
}

function buildJoinPath(code: string | null): string {
  return code ? `/join?code=${encodeURIComponent(code)}` : '/join';
}

function formatDateRange(start: string | null, end: string | null): string | null {
  if (!start) return null;
  const startDate = new Date(start);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' };
  if (!end || end === start) return startDate.toLocaleDateString(undefined, opts);
  const endDate = new Date(end);
  return `${startDate.toLocaleDateString(undefined, opts)} – ${endDate.toLocaleDateString(
    undefined,
    opts
  )}`;
}

function JoinPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get('code');

  const { isAuthenticated, currentUser, hasResolvedSupabaseSession } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(useAuthStore.persist.hasHydrated());
  const [trip, setTrip] = useState<TripPreview | null>(null);
  const [lookupState, setLookupState] = useState<'idle' | 'loading' | 'found' | 'missing' | 'error'>(
    'idle'
  );

  useEffect(() => {
    const finishHydration = () => setIsHydrated(true);
    const startHydration = () => setIsHydrated(false);
    const unsubscribeHydrate = useAuthStore.persist.onHydrate(startHydration);
    const unsubscribeFinishHydration = useAuthStore.persist.onFinishHydration(finishHydration);

    if (!useAuthStore.persist.hasHydrated()) {
      void useAuthStore.persist.rehydrate();
    }

    return () => {
      unsubscribeHydrate();
      unsubscribeFinishHydration();
    };
  }, []);

  // Look up the trip by share code through the server. The API uses the
  // service role for the narrow preview/redeem path; clients no longer
  // query trips.share_code directly, so RLS can stay membership-scoped.
  useEffect(() => {
    if (!code) {
      return;
    }
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setLookupState('loading');
    });
    void fetch(`/api/trips/join?code=${encodeURIComponent(code)}`, {
      cache: 'no-store',
    })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as
          | { trip?: TripPreview }
          | null;
        if (cancelled) return;
        if (response.status === 404) {
          setLookupState('missing');
          return;
        }
        if (!response.ok || !payload?.trip) {
          setLookupState('error');
          return;
        }
        setTrip(payload.trip);
        setLookupState('found');
      })
      .catch(() => {
        if (!cancelled) setLookupState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [code]);

  // Once the user is signed in and onboarded, hand the code off to the
  // JoinTripModal on home. Unauthenticated users wait on the preview
  // screen — we deliberately *don't* auto-redirect so they have a
  // chance to read what they're about to join.
  useEffect(() => {
    if (!isHydrated || !hasResolvedSupabaseSession) return;
    if (lookupState === 'loading') return;
    if (!isAuthenticated || !currentUser) return;
    if (!currentUser.hasCompletedOnboarding) {
      router.replace(`/profile/complete?next=${encodeURIComponent(buildJoinPath(code))}`);
      return;
    }
    if (code) {
      sessionStorage.setItem('pendingJoinCode', code);
    }
    router.replace('/');
  }, [
    code,
    currentUser,
    hasResolvedSupabaseSession,
    isAuthenticated,
    isHydrated,
    lookupState,
    router,
  ]);

  // No code at all — send them home so they can enter one manually.
  if (!code) {
    router.replace('/');
    return <PageLoadingSkeleton title="Loading…" showBackButton={false} variant="default" />;
  }

  if (lookupState === 'loading' || lookupState === 'idle') {
    return <PageLoadingSkeleton title="Looking up your trip…" showBackButton={false} variant="default" />;
  }

  if (lookupState === 'missing') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--canvas)]">
        <EmptyStatePremium
          illustration="trophy"
          title="That invite code didn't match a trip"
          description={`We couldn't find a trip with code "${code.toUpperCase()}". Double-check the code with whoever invited you — codes are case-insensitive but the letters matter.`}
          action={{
            label: 'Back to home',
            onClick: () => router.push('/'),
          }}
        />
      </div>
    );
  }

  if (lookupState === 'error' || !trip) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--canvas)]">
        <EmptyStatePremium
          illustration="trophy"
          title="Couldn't reach the server"
          description="We can't verify the invite code right now. Check your connection and try again."
          action={{
            label: 'Try again',
            onClick: () => window.location.reload(),
          }}
        />
      </div>
    );
  }

  const dateRange = formatDateRange(trip.startDate, trip.endDate);
  const authed = isAuthenticated && currentUser && currentUser.hasCompletedOnboarding;
  const joinPath = buildJoinPath(code);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--canvas)]">
      <div className="w-full max-w-md rounded-2xl border border-[var(--rule)] bg-[var(--surface)] p-6 shadow-lg">
        <p className="type-micro text-[var(--ink-tertiary)] uppercase tracking-wider">
          You&apos;re invited to
        </p>
        <h1 className="type-display mt-1 text-[var(--ink-primary)]">{trip.name}</h1>
        <div className="mt-4 space-y-2 text-sm text-[var(--ink-secondary)]">
          {dateRange && (
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-[var(--ink-tertiary)]" />
              <span>{dateRange}</span>
            </div>
          )}
          {trip.location && (
            <div className="flex items-center gap-2">
              <MapPin size={16} className="text-[var(--ink-tertiary)]" />
              <span>{trip.location}</span>
            </div>
          )}
          {trip.captainName && (
            <div className="flex items-center gap-2">
              <Crown size={16} className="text-[var(--ink-tertiary)]" />
              <span>Hosted by {trip.captainName}</span>
            </div>
          )}
        </div>
        <div className="mt-6">
          {authed ? (
            <Button
              variant="primary"
              className="w-full"
              onClick={() => {
                sessionStorage.setItem('pendingJoinCode', code);
                router.replace('/');
              }}
              rightIcon={<ChevronRight size={16} />}
            >
              Join this trip
            </Button>
          ) : (
            <>
              <Link href={`/login?next=${encodeURIComponent(joinPath)}`}>
                <Button variant="primary" className="w-full" rightIcon={<ChevronRight size={16} />}>
                  Sign in to join
                </Button>
              </Link>
              <p className="mt-3 text-center type-micro text-[var(--ink-tertiary)]">
                New here? You&apos;ll make a quick account on the next screen.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <PageLoadingSkeleton
          title="Looking up your trip…"
          showBackButton={false}
          variant="default"
        />
      }
    >
      <JoinPageInner />
    </Suspense>
  );
}
