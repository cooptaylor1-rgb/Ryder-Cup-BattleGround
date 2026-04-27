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

import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useAccessStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import { Target, Trophy, Home, Settings, Shield, CalendarDays } from 'lucide-react';

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

  const navItems = getNavItemsForMode(isCaptainMode);

  const isActive = (item: NavItem) => {
    if (item.href === '/') return pathname === '/';
    return pathname.startsWith(item.href);
  };

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

        return (
          <button
            key={item.href}
            type="button"
            onClick={() => router.push(item.href)}
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
