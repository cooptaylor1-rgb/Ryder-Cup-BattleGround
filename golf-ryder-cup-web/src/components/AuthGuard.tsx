'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores';

/**
 * AUTH GUARD COMPONENT
 *
 * Ensures users create a profile before using the app.
 * First-time users are redirected to profile creation.
 *
 * Public routes (accessible without profile):
 * - /profile/create
 * - /login
 * - /join/* (trip invitations)
 */

const PUBLIC_ROUTES = ['/profile/create', '/login', '/join', '/spectator', '/auth/callback'];

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, currentUser, hasResolvedSupabaseSession } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(useAuthStore.persist.hasHydrated());
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname?.startsWith(route + '/')
  );
  const requiresAuth = !isPublicRoute;
  const isAuthReady = isHydrated && hasResolvedSupabaseSession;
  const shouldRedirectToProfile = requiresAuth && isAuthReady && (!isAuthenticated || !currentUser);

  useEffect(() => {
    const finishHydration = () => {
      setIsHydrated(true);
    };

    const startHydration = () => {
      setIsHydrated(false);
    };

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
    if (!shouldRedirectToProfile) {
      return;
    }

    const redirectTimer = window.setTimeout(() => {
      const query = searchParams?.toString();
      const nextPath = query ? `${pathname}?${query}` : pathname;
      router.replace(`/profile/create?next=${encodeURIComponent(nextPath)}`);
    }, 0);

    return () => {
      window.clearTimeout(redirectTimer);
    };
  }, [pathname, router, searchParams, shouldRedirectToProfile]);

  if (requiresAuth) {
    if (!isAuthReady || !isAuthenticated || !currentUser) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--canvas)]">
          <div className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full border-[3px] border-[var(--rule)] border-t-[var(--masters)] animate-spin" />
            <p className="text-sm text-[var(--ink-secondary)]">Loading...</p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
