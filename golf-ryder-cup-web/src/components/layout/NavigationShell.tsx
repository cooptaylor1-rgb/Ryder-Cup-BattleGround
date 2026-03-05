/**
 * Navigation Shell — Global navigation wrapper
 *
 * Renders the sidebar (desktop) and bottom nav (mobile) in one place,
 * eliminating per-page BottomNav duplication. Also hosts live-play
 * overlays and the global loading indicator so every route gets them.
 */

'use client';

import { useState, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { usePathname } from 'next/navigation';
import { useTripStore, useUIStore } from '@/lib/stores';
import { SidebarNav } from './SidebarNav';
import { BottomNav } from './BottomNav';

// Lazy-load live-play widgets (they touch IndexedDB)
const FloatingMyMatch = dynamic(
  () => import('@/components/live-play/FloatingMyMatch').then((m) => m.FloatingMyMatch),
  { ssr: false }
);
const QuickStandingsOverlay = dynamic(
  () => import('@/components/live-play/QuickStandingsOverlay').then((m) => m.QuickStandingsOverlay),
  { ssr: false }
);
const NotificationStack = dynamic(
  () => import('@/components/live-play/NotificationSystem').then((m) => m.NotificationStack),
  { ssr: false }
);

/** Routes where the bottom / sidebar nav should be hidden */
const HIDE_NAV_ROUTES = ['/login', '/profile/create', '/join'];

export function NavigationShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const { currentTrip } = useTripStore();
  const { isGlobalLoading, globalLoadingMessage } = useUIStore();

  const hideNav = HIDE_NAV_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );

  return (
    <>
      <div className="flex min-h-screen">
        {/* Desktop sidebar */}
        {!hideNav && (
          <SidebarNav
            isExpanded={sidebarExpanded}
            onToggle={() => setSidebarExpanded((v) => !v)}
          />
        )}

        {/* Page content — bottom padding clears the fixed mobile nav */}
        <div
          className={
            hideNav
              ? 'flex-1 min-w-0'
              : 'flex-1 min-w-0 pb-[calc(100px+env(safe-area-inset-bottom,0px))] lg:pb-0'
          }
        >
          {children}
        </div>
      </div>

      {/* Mobile bottom nav */}
      {!hideNav && <BottomNav />}

      {/* Live-play overlays — only when a trip is active */}
      {currentTrip && (
        <>
          <FloatingMyMatch bottomOffset={hideNav ? 20 : 80} />
          <QuickStandingsOverlay />
          <NotificationStack position="top-right" maxVisible={3} />
        </>
      )}

      {/* Global loading overlay */}
      {isGlobalLoading && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-[color:var(--ink)]/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label="Loading"
        >
          <div className="flex flex-col items-center gap-4 p-6 rounded-2xl bg-[var(--surface-raised)] border border-[var(--rule)] shadow-xl">
            <div className="w-10 h-10 rounded-full border-4 border-[color:var(--rule)] border-t-[var(--masters)] animate-spin" />
            {globalLoadingMessage && (
              <p className="text-sm text-[var(--ink-secondary)] text-center max-w-[200px]">
                {globalLoadingMessage}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
