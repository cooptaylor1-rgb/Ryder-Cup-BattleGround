/**
 * Bottom Navigation — Fried Egg Editorial
 *
 * Clean, warm, understated. The navigation should
 * feel like a quiet anchor, not a busy dashboard.
 *
 * Rendered once in NavigationShell (layout.tsx).
 * Pages no longer render their own BottomNav.
 */

'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAccessStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import { Target, Trophy, Home, Settings, Shield, CalendarDays } from 'lucide-react';
import { useUserInProgressMatch } from '@/lib/hooks';
// Imported via leaf path so the existing `vi.mock('@/lib/hooks', ...)` in
// BottomNav.test.tsx (which mocks only `useUserInProgressMatch`) doesn't
// shadow this hook and turn it into undefined at test time.
import { useHaptic } from '@/lib/hooks/useHaptic';
import {
  getSyncQueueStatus,
  TRIP_SYNC_QUEUE_CHANGED_EVENT,
} from '@/lib/services/tripSyncService';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

// Base nav for non-captains. The 5th slot is swapped in captain mode —
// see `getNavItemsForMode` below.
const BASE_NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Today', icon: Home },
  { href: '/score', label: 'Score', icon: Target },
  { href: '/standings', label: 'Standings', icon: Trophy },
  { href: '/schedule', label: 'Schedule', icon: CalendarDays },
  { href: '/more', label: 'More', icon: Settings },
];

/**
 * When captain mode is on, swap the final "More" entry for "Captain" so the
 * tools captains actually use during an event are one tap away instead of
 * buried under More -> Captain command. Settings and other non-captain
 * admin still live at /more and remain reachable from the captain hub.
 */
function getNavItemsForMode(isCaptainMode: boolean): NavItem[] {
  if (!isCaptainMode) return BASE_NAV_ITEMS;
  return BASE_NAV_ITEMS.map((item) =>
    item.href === '/more' ? { href: '/captain', label: 'Captain', icon: Shield } : item
  );
}

export interface NavBadges {
  today?: number;
  score?: number;
  standings?: number;
  schedule?: number;
  more?: number;
}

export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { isCaptainMode } = useAccessStore(useShallow((s) => ({ isCaptainMode: s.isCaptainMode })));
  const { hasInProgress: hasLiveScoring } = useUserInProgressMatch();
  const haptic = useHaptic();
  const pendingSyncCount = usePendingSyncCount();

  const navItems = getNavItemsForMode(isCaptainMode);

  const isActive = (item: NavItem) => {
    if (item.href === '/') return pathname === '/';
    return pathname.startsWith(item.href);
  };

  const handleNavTap = (item: NavItem) => {
    // Light selection haptic — fires only on a real cross-route tap so
    // re-tapping the active tab doesn't buzz the phone for nothing.
    if (!isActive(item)) {
      haptic.select();
    }
    router.push(item.href);
  };

  // The "More" slot is the catch-all for the items that need sync (settings,
  // backup, captain handoff). Showing a numeric badge there mirrors what the
  // SyncStatusBadge already surfaces on individual pages, but at-a-glance.
  // In captain mode the slot is repurposed to "Captain", which is itself
  // the place that cares about pending writes the most.
  const showSyncBadge = pendingSyncCount > 0;
  const syncBadgeLabel = pendingSyncCount > 9 ? '9+' : String(pendingSyncCount);

  return (
    <nav
      className={cn(
        'nav-premium lg:hidden',
        'fixed bottom-0 left-0 right-0 z-50',
        'flex items-stretch justify-around',
        'min-h-[72px] px-[var(--space-1)] pt-1 border-t border-[var(--rule)] bg-[color:var(--canvas)]/92 backdrop-blur-md',
        'pb-[max(var(--space-1),env(safe-area-inset-bottom,0px))]'
      )}
      aria-label="Main navigation"
    >
      {navItems.map((item) => {
        const active = isActive(item);
        const Icon = item.icon;
        const isSyncSlot = item.href === '/more' || item.href === '/captain';

        return (
          <button
            key={item.href}
            type="button"
            onClick={() => handleNavTap(item)}
            className={cn(
              'relative flex flex-col items-center justify-center',
              'flex-1 min-w-[56px] min-h-[56px] py-1.5',
              'border-none cursor-pointer',
              'transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]/40 focus-visible:ring-inset',
              'active:scale-95 active:opacity-80',
              'rounded-xl [-webkit-tap-highlight-color:transparent]',
              active
                ? 'bg-[color:rgba(0,102,68,0.1)] text-[var(--masters)] shadow-[inset_0_0_0_1px_rgba(0,102,68,0.15)]'
                : 'bg-transparent text-[var(--ink-secondary)] hover:bg-[color:rgba(26,24,21,0.04)]'
            )}
            aria-current={active ? 'page' : undefined}
            aria-label={item.label}
          >
            {/* Active indicator bar */}
            {active && (
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-[var(--masters)]"
                aria-hidden="true"
              />
            )}

            {/* Icon */}
            <div className="relative">
              <Icon
                className={cn('w-[22px] h-[22px]', active && 'scale-110')}
                strokeWidth={active ? 2 : 1.5}
              />

              {/* Captain indicator — only meaningful on the "More" slot when
                  captain mode isn't surfaced directly. When captain mode is
                  on the nav already exposes a Captain tab, so no badge. */}
              {item.href === '/more' && isCaptainMode && (
                <Shield
                  className="absolute -top-0.5 -right-1.5 w-2.5 h-2.5 text-[var(--maroon)]"
                  aria-hidden="true"
                />
              )}
              {/* Live-scoring dot on the Score tab when the user has an
                  in-progress match. Pulses gently so it reads as "live"
                  without becoming visual noise. */}
              {item.href === '/score' && hasLiveScoring && (
                <span
                  className="absolute -top-0.5 -right-1.5 flex h-2.5 w-2.5 items-center justify-center"
                  aria-hidden="true"
                >
                  <span className="absolute inset-0 animate-ping rounded-full bg-[var(--masters)] opacity-70" />
                  <span className="relative h-2 w-2 rounded-full bg-[var(--masters)] ring-2 ring-[var(--canvas)]" />
                </span>
              )}
              {/* Pending-sync count badge on the catch-all slot (More, or
                  Captain when captain mode is on). Shows only when the
                  outbox is non-empty. The captain shield indicator above
                  is hidden when this badge is present so they don't
                  collide on the same icon corner. */}
              {isSyncSlot && showSyncBadge && (
                <span
                  className="absolute -top-1.5 -right-2 flex h-[15px] min-w-[15px] items-center justify-center rounded-full bg-[var(--maroon)] px-[3px] text-[9px] font-bold leading-none text-[var(--canvas)] ring-2 ring-[var(--canvas)]"
                  aria-label={`${pendingSyncCount} pending sync ${pendingSyncCount === 1 ? 'item' : 'items'}`}
                >
                  {syncBadgeLabel}
                </span>
              )}
            </div>

            {/* Label — text-[11px] for outdoor legibility. 10px is too
                small at arm's length in sunlight on the course. */}
            <span
              className={cn(
                'text-[11px] mt-0.5 tracking-[0.02em] font-sans',
                active ? 'font-bold' : 'font-semibold'
              )}
            >
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}

export default BottomNav;

/**
 * Subscribe the nav to the trip-sync queue size so a pending-write count
 * can ride on the More/Captain tab without each page re-implementing it.
 * We piggy-back on the existing TRIP_SYNC_QUEUE_CHANGED_EVENT (already
 * dispatched by the queue on enqueue/flush) instead of polling so the
 * badge updates the moment the outbox changes. A single visibility-aware
 * fallback poll handles cases where the event fired while this nav was
 * unmounted (route transitions remount it).
 */
function usePendingSyncCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const refresh = () => {
      try {
        const status = getSyncQueueStatus();
        setCount(status.pending + status.failed);
      } catch {
        setCount(0);
      }
    };

    refresh();
    window.addEventListener(TRIP_SYNC_QUEUE_CHANGED_EVENT, refresh);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener(TRIP_SYNC_QUEUE_CHANGED_EVENT, refresh);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  return count;
}
