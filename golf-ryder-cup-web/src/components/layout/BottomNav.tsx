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
 */

'use client';

import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/lib/stores';
import {
  Target,
  Users,
  Trophy,
  Home,
  Settings,
  Shield,
} from 'lucide-react';

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const navItems: NavItem[] = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/score', label: 'Score', icon: Target },
  { href: '/matchups', label: 'Matches', icon: Users },
  { href: '/standings', label: 'Standings', icon: Trophy },
  { href: '/more', label: 'More', icon: Settings },
];

export function BottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { isCaptainMode } = useUIStore();

  const isActive = (item: NavItem) => {
    if (item.href === '/') return pathname === '/';
    return pathname.startsWith(item.href);
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

        return (
          <button
            key={item.href}
            onClick={() => router.push(item.href)}
            className={cn(
              'relative flex flex-col items-center justify-center',
              'flex-1 min-w-[56px] py-2',
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

            {/* Icon */}
            <div className="relative">
              <Icon className={cn('w-5 h-5', active && 'scale-110')} />
              {/* Captain badge on More */}
              {item.href === '/more' && isCaptainMode && (
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
