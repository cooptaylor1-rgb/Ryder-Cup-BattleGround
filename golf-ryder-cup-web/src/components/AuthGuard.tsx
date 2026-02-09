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
  const [isHydrated, setIsHydrated] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Wait for Zustand hydration from localStorage
  useEffect(() => {
    // Give Zustand a moment to hydrate from localStorage
    const timer = setTimeout(() => {
      setIsHydrated(true);
    }, 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Don't check until hydration is complete
    if (!isHydrated) return;

    // Allow public routes without authentication
    const isPublicRoute = PUBLIC_ROUTES.some(
      (route) => pathname === route || pathname?.startsWith(route + '/')
    );

    if (isPublicRoute) {
      // Defer to avoid setState-in-effect
      const timeoutId = setTimeout(() => setIsChecking(false), 0);
      return () => clearTimeout(timeoutId);
    }

    // If not authenticated, redirect to profile creation
    if (!isAuthenticated || !currentUser) {
      const query = searchParams?.toString();
      const nextPath = query ? `${pathname}?${query}` : pathname;
      router.replace(`/profile/create?next=${encodeURIComponent(nextPath)}`);
      return;
    }

    // User is authenticated, allow access - defer to avoid setState-in-effect
    const timeoutId = setTimeout(() => setIsChecking(false), 0);
    return () => clearTimeout(timeoutId);
  }, [isHydrated, isAuthenticated, currentUser, pathname, router, searchParams]);

  // Show nothing while checking authentication (prevents flash)
  if (!isHydrated || isChecking) {
    // Check if this is a public route - if so, don't block
    const isPublicRoute = PUBLIC_ROUTES.some(
      (route) => pathname === route || pathname?.startsWith(route + '/')
    );

    if (!isPublicRoute) {
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
