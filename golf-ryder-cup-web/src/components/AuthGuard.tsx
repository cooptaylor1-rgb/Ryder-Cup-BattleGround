'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores';

/**
 * AUTH GUARD COMPONENT
 *
 * Restricts only the parts of the app that truly require a profile.
 * Browsing routes stay open so new users can explore before account creation.
 *
 * Always-public routes:
 * - /profile/create
 * - /login
 * - /join/* (trip invitations)
 */

const ALWAYS_PUBLIC_ROUTES = ['/profile/create', '/login', '/join', '/spectator', '/auth/callback'];
const PROTECTED_ROUTE_PREFIXES = ['/settings'];
const PROTECTED_ROUTE_EXACT = ['/profile', '/profile/complete'];

export function isProtectedAppRoute(pathname?: string | null) {
  if (!pathname) {
    return false;
  }

  const isAlwaysPublic = ALWAYS_PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );

  if (isAlwaysPublic) {
    return false;
  }

  if (PROTECTED_ROUTE_EXACT.includes(pathname)) {
    return true;
  }

  return PROTECTED_ROUTE_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );
}

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, currentUser, hasResolvedSupabaseSession } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(useAuthStore.persist.hasHydrated());
  const requiresAuth = isProtectedAppRoute(pathname);
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
