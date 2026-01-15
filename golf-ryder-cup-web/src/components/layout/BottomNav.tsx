/**
 * Bottom Navigation Component
 *
 * Mobile-first bottom tab bar.
 * Masters-inspired: restrained, functional, quietly confident.
 *
 * Design principles:
 * - Large touch targets for outdoor use
 * - Clear active state without being loud
 * - Information hierarchy in color, not size
 * - Notification badges for timely alerts
 */

'use client';

import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/lib/stores';
import {
  Target,
  Trophy,
  Home,
  Settings,
  Shield,
  CalendarDays,
  Users,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeKey?: 'home' | 'schedule' | 'score' | 'matches' | 'standings' | 'more';
}

const navItems: NavItem[] = [
  { href: '/', label: 'Home', icon: Home, badgeKey: 'home' },
  { href: '/schedule', label: 'Schedule', icon: CalendarDays, badgeKey: 'schedule' },
  { href: '/score', label: 'Score', icon: Target, badgeKey: 'score' },
  { href: '/matchups', label: 'Matches', icon: Users, badgeKey: 'matches' },
  { href: '/standings', label: 'Standings', icon: Trophy, badgeKey: 'standings' },
  { href: '/more', label: 'More', icon: Settings, badgeKey: 'more' },
];

export interface NavBadges {
  home?: number;
  schedule?: number;
  score?: number;
  matches?: number;
  standings?: number;
  more?: number;
}

interface BottomNavProps {
  badges?: NavBadges;
}

export function BottomNav({ badges = {} }: BottomNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isCaptainMode } = useUIStore();

  const isActive = (item: NavItem) => {
    if (item.href === '/') return pathname === '/';
    return pathname.startsWith(item.href);
  };

  const getBadgeCount = (item: NavItem): number | undefined => {
    if (!item.badgeKey) return undefined;
    return badges[item.badgeKey];
  };

  return (
    <nav
      className={cn(
        'lg:hidden',
        'fixed bottom-0 left-0 right-0 z-50',
        'flex items-stretch justify-around',
        'h-16 px-2',
        'safe-bottom',
      )}
      style={{
        background: 'var(--surface, #1A1814)',
        borderTop: '1px solid var(--rule, rgba(58, 53, 48, 0.5))',
      }}
      aria-label="Main navigation"
    >
      {navItems.map((item) => {
        const active = isActive(item);
        const Icon = item.icon;
        const badgeCount = getBadgeCount(item);

        return (
          <button
            key={item.href}
            onClick={() => router.push(item.href)}
            className={cn(
              'relative flex flex-col items-center justify-center',
              'flex-1 min-w-[48px] py-2',
              'transition-colors',
              'focus-visible:outline-none',
            )}
            style={{
              color: active ? 'var(--masters, #006747)' : 'var(--ink-tertiary, #807868)',
              transitionDuration: '150ms',
            }}
            aria-current={active ? 'page' : undefined}
          >
            {/* Active indicator */}
            {active && (
              <span
                className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                style={{ background: 'var(--masters, #006747)' }}
                aria-hidden="true"
              />
            )}

            {/* Icon with badge */}
            <div className="relative">
              <Icon className={cn('w-5 h-5', active && 'scale-110')} />

              {/* Notification badge */}
              {badgeCount !== undefined && badgeCount > 0 && (
                <span
                  className="absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full text-[10px] font-bold"
                  style={{
                    background: 'var(--error, #DC2626)',
                    color: 'white',
                  }}
                  aria-label={`${badgeCount} notifications`}
                >
                  {badgeCount > 99 ? '99+' : badgeCount}
                </span>
              )}

              {/* Captain badge on More (only if no notification badge) */}
              {item.href === '/more' && isCaptainMode && !badgeCount && (
                <Shield
                  className="absolute -top-0.5 -right-1.5 w-2.5 h-2.5"
                  style={{ color: 'var(--masters, #006747)' }}
                  aria-hidden="true"
                />
              )}
            </div>

            {/* Label */}
            <span
              className={cn(
                'text-[10px] mt-1 font-medium tracking-wide',
                active && 'font-semibold',
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
