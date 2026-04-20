'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores';
import { PageLoadingSkeleton } from '@/components/ui';

function buildJoinPath(code: string | null): string {
  return code ? `/join?code=${encodeURIComponent(code)}` : '/join';
}

function JoinPageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get('code');

  const { isAuthenticated, currentUser, hasResolvedSupabaseSession } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(useAuthStore.persist.hasHydrated());

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

  useEffect(() => {
    // Wait for auth state to settle before deciding where to send the
    // invitee. Previously we unconditionally stashed the share code in
    // sessionStorage and redirected home, which meant a first-time
    // invitee with no profile could be rostered onto a trip before
    // they had a name, email, or handicap on file — the captain would
    // then see a blank player card and have to chase them to fill it in.
    if (!isHydrated || !hasResolvedSupabaseSession) return;

    const joinPath = buildJoinPath(code);

    // Not signed in yet: send them through login (which falls through to
    // /profile/create for brand-new users). The next= param preserves
    // the invite code so they land back on /join after finishing.
    if (!isAuthenticated || !currentUser) {
      router.replace(`/login?next=${encodeURIComponent(joinPath)}`);
      return;
    }

    // Signed in but onboarding not complete (name/handicap/etc. empty):
    // force them through profile completion before we wire them into the
    // trip. Same next= trip-back trick.
    if (!currentUser.hasCompletedOnboarding) {
      router.replace(`/profile/complete?next=${encodeURIComponent(joinPath)}`);
      return;
    }

    // Fully ready: hand the code to the JoinTripModal on home.
    if (code) {
      sessionStorage.setItem('pendingJoinCode', code);
    }
    router.replace('/');
  }, [code, currentUser, hasResolvedSupabaseSession, isAuthenticated, isHydrated, router]);

  return <PageLoadingSkeleton title="Joining trip…" showBackButton={false} variant="default" />;
}

export default function JoinPage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton title="Joining trip…" showBackButton={false} variant="default" />}>
      <JoinPageInner />
    </Suspense>
  );
}
