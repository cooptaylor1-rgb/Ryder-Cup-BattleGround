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
import { useTripStore, useToastStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import { zIndex } from '@/lib/constants/zIndex';
import { SidebarNav } from './SidebarNav';
import { BottomNav } from './BottomNav';
import { SyncFailureBanner } from '@/components/SyncFailureBanner';
import { GlobalSyncIndicator } from '@/components/GlobalSyncIndicator';

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
  const { currentTrip } = useTripStore(useShallow(s => ({ currentTrip: s.currentTrip })));
  const { isGlobalLoading, globalLoadingMessage } = useToastStore(useShallow(s => ({ isGlobalLoading: s.isGlobalLoading, globalLoadingMessage: s.globalLoadingMessage })));

  const hideNav = HIDE_NAV_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + '/')
  );
  const isCaptainRoute = pathname === '/captain' || pathname.startsWith('/captain/');
  const isScheduleRoute = pathname === '/schedule' || pathname.startsWith('/schedule/');
  const isScoreRoute = pathname === '/score' || pathname.startsWith('/score/');
  const isTripSetupRoute = pathname === '/trip/new' || pathname.startsWith('/trip/new/');
  const showLiveChrome = Boolean(currentTrip && !hideNav && !isCaptainRoute && !isTripSetupRoute);
  const showFloatingMyMatch = showLiveChrome && !isScoreRoute && !isScheduleRoute;
  const showQuickStandingsOverlay = Boolean(
    currentTrip && !hideNav && (isScoreRoute || isScheduleRoute)
  );

  return (
    <>
      {/* Site-wide escalation banner for sync failures. Kept outside the
          flex layout so it overlays the page without shifting content.
          Renders nothing when the queue has no failed operations. */}
      {!hideNav && <SyncFailureBanner />}

      {/* Always-on pending-sync indicator. Top-right pill that
          surfaces queue activity on every page (standings, home,
          schedule, etc.) — previously only the cockpit showed
          pending state. Hides itself when the queue is clean and
          when the failure banner takes over. */}
      {!hideNav && <GlobalSyncIndicator />}

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

      {/* Live-play overlays — kept route-aware so mobile scoring and schedule
          screens do not stack multiple floating controls in the same corner. */}
      {showFloatingMyMatch && <FloatingMyMatch bottomOffset={80} />}
      {showQuickStandingsOverlay && <QuickStandingsOverlay />}
      {showLiveChrome && <NotificationStack position="top-right" maxVisible={3} />}

      {/* Global loading overlay */}
      {isGlobalLoading && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-[color:var(--ink)]/50 backdrop-blur-sm"
          style={{ zIndex: zIndex.modal }}
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
