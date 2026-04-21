'use client';

/**
 * PWA Prompt Gate
 *
 * Wraps every "install the app" prompt so they don't fire while a
 * first-time user is in the middle of signing in, joining a trip, or
 * completing their profile. The app is web-first; the PWA install is
 * a nice-to-have that exists for offline scoring on the course, not a
 * demand we make of every new arrival.
 *
 * Prompts render when:
 *   - The user is authenticated
 *   - They have at least one local trip (so the app has proven useful)
 *   - They are not on an auth / onboarding / invite route where an
 *     interruption would break focus
 *
 * Everywhere else, children are hidden so the prompt components
 * (with their own timers and dismissal memory) never start counting.
 */

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useAuthStore } from '@/lib/stores';

const SUPPRESSED_PATH_PREFIXES = [
  '/login',
  '/profile/create',
  '/profile/complete',
  '/join',
  '/auth/',
];

export function PWAPromptGate({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? '/';
  const { isAuthenticated, currentUser, hasResolvedSupabaseSession } = useAuthStore();
  const tripCount = useLiveQuery(async () => db.trips.count(), [], 0);

  // Hydration guard: the store rehydrates asynchronously, so on the
  // first paint we don't yet know auth status. Hold the prompts back
  // until the auth bridge has resolved at least once.
  const [hasHydrated, setHasHydrated] = useState(false);
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  if (!hasHydrated) return null;
  if (!hasResolvedSupabaseSession) return null;
  if (!isAuthenticated || !currentUser) return null;
  if (!currentUser.hasCompletedOnboarding) return null;
  if (tripCount < 1) return null;
  if (SUPPRESSED_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;

  return <>{children}</>;
}
