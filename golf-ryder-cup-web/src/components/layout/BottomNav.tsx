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
import { useUIStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import { Target, Trophy, Home, Settings, Shield, CalendarDays } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
}

const navItems: NavItem[] = [
  { href: '/', label: 'Today', icon: Home },
  { href: '/score', label: 'Score', icon: Target },
  { href: '/standings', label: 'Standings', icon: Trophy },
  { href: '/schedule', label: 'Schedule', icon: CalendarDays },
  { href: '/more', label: 'More', icon: Settings },
];

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
  const { isCaptainMode } = useUIStore(useShallow(s => ({ isCaptainMode: s.isCaptainMode })));

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
        'h-[72px] px-[var(--space-1)]',
        'pb-[env(safe-area-inset-bottom,0px)]'
      )}
      aria-label="Main navigation"
    >
      {navItems.map((item) => {
        const active = isActive(item);
        const Icon = item.icon;

        return (
          <button
            key={item.href}
            onClick={() => router.push(item.href)}
            className={cn(
              'relative flex flex-col items-center justify-center',
              'flex-1 min-w-[56px] min-h-[56px] py-1.5',
              'bg-transparent border-none cursor-pointer',
              'transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]/40 focus-visible:ring-inset',
              'active:scale-95 active:opacity-80',
              'rounded-xl [-webkit-tap-highlight-color:transparent]',
              active ? 'text-[var(--masters)]' : 'text-[var(--ink-tertiary)]'
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

              {/* Captain indicator */}
              {item.href === '/more' && isCaptainMode && (
                <Shield
                  className="absolute -top-0.5 -right-1.5 w-2.5 h-2.5 text-[var(--maroon)]"
                  aria-hidden="true"
                />
              )}
            </div>

            {/* Label */}
            <span
              className={cn(
                'text-[10px] mt-0.5 tracking-[0.02em] font-sans',
                active ? 'font-bold' : 'font-medium'
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
