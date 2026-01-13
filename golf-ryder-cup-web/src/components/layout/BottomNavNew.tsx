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

export function BottomNavNew() {
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
                background: 'var(--surface-base)',
                borderTop: '1px solid var(--border-subtle)'
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
                            color: active ? 'var(--masters-green)' : 'var(--text-disabled)',
                            transitionDuration: 'var(--duration-fast)'
                        }}
                        aria-current={active ? 'page' : undefined}
                    >
                        {/* Icon */}
                        <div className="relative">
                            <Icon className="w-5 h-5" />
                            {/* Captain badge on More - subtle */}
                            {item.href === '/more' && isCaptainMode && (
                                <Shield
                                    className="absolute -top-0.5 -right-1.5 w-2.5 h-2.5"
                                    style={{ color: 'var(--masters-green)' }}
                                    aria-hidden="true"
                                />
                            )}
                        </div>

                        {/* Label */}
                        <span
                            className={cn(
                                'text-[10px] mt-1 font-medium tracking-wide',
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

export default BottomNavNew;
