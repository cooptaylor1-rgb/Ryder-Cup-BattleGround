/**
 * Bottom Navigation — Augusta Bulletin Editorial
 *
 * Clean, minimal, country club aesthetic.
 * Thin line icons, uppercase micro labels,
 * subtle active underline — not a busy dashboard.
 */

'use client';

import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/lib/stores';
import { Target, Trophy, Home, Settings, Shield, CalendarDays } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  badgeKey?: 'today' | 'score' | 'standings' | 'schedule' | 'more';
}

const navItems: NavItem[] = [
  { href: '/', label: 'Today', icon: Home, badgeKey: 'today' },
  { href: '/score', label: 'Score', icon: Target, badgeKey: 'score' },
  { href: '/standings', label: 'Standings', icon: Trophy, badgeKey: 'standings' },
  { href: '/schedule', label: 'Schedule', icon: CalendarDays, badgeKey: 'schedule' },
  { href: '/more', label: 'More', icon: Settings, badgeKey: 'more' },
];

export interface NavBadges {
  today?: number;
  score?: number;
  standings?: number;
  schedule?: number;
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
        height: '64px',
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
            className="relative flex flex-col items-center justify-center flex-1 min-w-[52px] min-h-[48px]"
            style={{
              color: active ? 'var(--ink)' : 'var(--ink-tertiary)',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
            }}
            aria-current={active ? 'page' : undefined}
          >
            {/* Icon — thin stroke, minimal */}
            <div className="relative">
              <Icon
                className="w-[20px] h-[20px]"
                strokeWidth={active ? 1.75 : 1.25}
              />

              {/* Badge — small, muted */}
              {badgeCount !== undefined && badgeCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: '-5px',
                    right: '-7px',
                    minWidth: '14px',
                    height: '14px',
                    padding: '0 3px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--maroon)',
                    color: '#F5F0E8',
                    fontSize: '9px',
                    fontWeight: 600,
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

            {/* Label — micro uppercase */}
            <span
              style={{
                fontSize: '9px',
                marginTop: '3px',
                fontWeight: active ? 600 : 400,
                fontFamily: 'var(--font-sans)',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {item.label}
            </span>

            {/* Active underline — subtle */}
            {active && (
              <span
                style={{
                  position: 'absolute',
                  bottom: '6px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '14px',
                  height: '1.5px',
                  background: 'var(--ink)',
                  borderRadius: 'var(--radius-full)',
                }}
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </nav>
  );
}

export default BottomNav;
