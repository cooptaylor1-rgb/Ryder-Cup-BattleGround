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

const PUBLIC_ROUTES = ['/profile/create', '/login', '/join', '/spectator'];

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isAuthenticated, currentUser } = useAuthStore();
  const [isHydrated, setIsHydrated] = useState(useAuthStore.persist.hasHydrated());
  const isPublicRoute = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname?.startsWith(route + '/')
  );
  const requiresAuth = !isPublicRoute;
  const shouldRedirectToProfile = requiresAuth && isHydrated && (!isAuthenticated || !currentUser);

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

    const query = searchParams?.toString();
    const nextPath = query ? `${pathname}?${query}` : pathname;
    router.replace(`/profile/create?next=${encodeURIComponent(nextPath)}`);
  }, [pathname, router, searchParams, shouldRedirectToProfile]);

  if (requiresAuth) {
    if (!isHydrated || !isAuthenticated || !currentUser) {
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
