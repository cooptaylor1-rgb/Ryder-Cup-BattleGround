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
import { Target, Trophy, Home, Settings, Shield, HelpCircle, BookOpen } from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  badgeKey?: 'today' | 'score' | 'standings' | 'journal' | 'more';
}

// Phase 1 navigation spine: Today / Score / Standings / Journal / More
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
  /** If provided, Score button goes directly to this match (power user optimization) */
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

  // Power user: Smart routing for Score button
  const handleNavClick = (item: NavItem) => {
    if (item.href === '/score' && activeMatchId) {
      // Skip the score list and go directly to the active match
      router.push(`/score/${activeMatchId}`);
    } else {
      router.push(item.href);
    }
  };

  return (
    <nav
      className={cn(
        'nav-premium',
        'lg:hidden',
        'fixed bottom-0 left-0 right-0 z-50',
        'flex items-stretch justify-around',
        'h-20 px-1',
        'safe-bottom'
      )}
      style={{
        background: 'linear-gradient(180deg, var(--surface) 0%, var(--canvas) 100%)',
        borderTop: '1px solid var(--rule)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
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
              <Icon
                className={cn('w-6 h-6', active && 'scale-110')}
                strokeWidth={active ? 2 : 1.75}
              />

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
              className={cn('text-[11px] mt-0.5 font-medium tracking-wide', active && 'font-bold')}
            >
              {item.label}
            </span>
          </button>
        );
      })}

      {/* Keyboard Shortcuts Hint - Power User Feature */}
      <button
        onClick={() => {
          window.dispatchEvent(new CustomEvent('show-keyboard-help'));
        }}
        className={cn(
          'hidden md:flex flex-col items-center justify-center',
          'min-w-[40px] min-h-[40px] py-1.5',
          'transition-all duration-150',
          'focus-visible:outline-none',
          'active:scale-95 active:opacity-80',
          'rounded-xl'
        )}
        style={{
          color: 'var(--ink-tertiary, #807868)',
        }}
        aria-label="Show keyboard shortcuts (press ?)"
        title="Keyboard shortcuts — Press ?"
      >
        <HelpCircle size={18} strokeWidth={1.5} />
        <span className="text-[9px] mt-0.5 opacity-70">?</span>
      </button>
    </nav>
  );
}

export default BottomNav;
