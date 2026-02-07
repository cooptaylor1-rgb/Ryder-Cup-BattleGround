/**
 * Bottom Navigation — Fried Egg Editorial
 *
 * Clean, warm, understated. The navigation should
 * feel like a quiet anchor, not a busy dashboard.
 *
 * Design: Warm cream surface, subtle active indicator,
 * characterful typography via Plus Jakarta Sans.
 */

'use client';

import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/lib/stores';
import { Target, Trophy, Home, Settings, Shield, BookOpen } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  badgeKey?: 'today' | 'score' | 'standings' | 'journal' | 'more';
}

const navItems: NavItem[] = [
  { href: '/', label: 'Today', icon: Home, badgeKey: 'today' },
  { href: '/score', label: 'Score', icon: Target, badgeKey: 'score' },
  { href: '/standings', label: 'Standings', icon: Trophy, badgeKey: 'standings' },
  { href: '/social', label: 'Journal', icon: BookOpen, badgeKey: 'journal' },
  { href: '/more', label: 'More', icon: Settings, badgeKey: 'more' },
];

export interface NavBadges {
  today?: number;
  score?: number;
  standings?: number;
  journal?: number;
  more?: number;
}

interface BottomNavProps {
  badges?: NavBadges;
  activeMatchId?: string;
}

export function BottomNav({ badges = {}, activeMatchId }: BottomNavProps) {
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

  const handleNavClick = (item: NavItem) => {
    if (item.href === '/score' && activeMatchId) {
      router.push(`/score/${activeMatchId}`);
    } else {
      router.push(item.href);
    }
  };

  return (
    <nav
      className={cn('nav-premium', 'lg:hidden', 'fixed bottom-0 left-0 right-0 z-50')}
      style={{
        display: 'flex',
        alignItems: 'stretch',
        justifyContent: 'space-around',
        height: '72px',
        paddingLeft: 'var(--space-1)',
        paddingRight: 'var(--space-1)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
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
            onClick={() => handleNavClick(item)}
            className={cn(
              'relative flex flex-col items-center justify-center',
              'flex-1 min-w-[56px] min-h-[56px] py-1.5',
              'transition-all duration-150',
              'focus-visible:outline-none',
              'active:scale-95 active:opacity-80',
              'rounded-xl'
            )}
            style={{
              color: active ? 'var(--masters)' : 'var(--ink-tertiary)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
            aria-current={active ? 'page' : undefined}
          >
            {/* Active indicator — refined gold bar */}
            {active && (
              <span
                style={{
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '24px',
                  height: '2px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--masters)',
                }}
                aria-hidden="true"
              />
            )}

            {/* Icon */}
            <div className="relative">
              <Icon
                className={cn('w-[22px] h-[22px]', active && 'scale-110')}
                strokeWidth={active ? 2 : 1.5}
              />

              {/* Badge */}
              {badgeCount !== undefined && badgeCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-6px',
                    right: '-8px',
                    minWidth: '16px',
                    height: '16px',
                    padding: '0 4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--error)',
                    color: 'white',
                    fontSize: '10px',
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                  aria-label={`${badgeCount} notifications`}
                >
                  {badgeCount > 99 ? '99+' : badgeCount}
                </span>
              )}

              {/* Captain indicator */}
              {item.href === '/more' && isCaptainMode && !badgeCount && (
                <Shield
                  className="absolute -top-0.5 -right-1.5 w-2.5 h-2.5"
                  style={{ color: 'var(--maroon)' }}
                  aria-hidden="true"
                />
              )}
            </div>

            {/* Label */}
            <span
              style={{
                fontSize: '10px',
                marginTop: '2px',
                fontWeight: active ? 700 : 500,
                fontFamily: 'var(--font-sans)',
                letterSpacing: '0.02em',
              }}
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
