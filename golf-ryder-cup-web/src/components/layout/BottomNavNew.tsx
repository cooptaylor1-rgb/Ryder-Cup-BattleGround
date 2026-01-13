/**
 * Bottom Navigation Component (Enhanced)
 *
 * Mobile-first bottom tab bar.
 * Large touch targets, Spotify-inspired micro-interactions.
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
    { href: '/matchups', label: 'Matchups', icon: Users },
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
                'lg:hidden', // Hide on desktop (use sidebar)
                'fixed bottom-0 left-0 right-0 z-50',
                'flex items-stretch justify-around',
                'h-16 px-2',
                'bg-surface-raised/95 backdrop-blur-md',
                'border-t border-surface-border',
                'safe-bottom',
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
                            'flex-1 min-w-[64px] py-2',
                            'transition-colors duration-150',
                            'focus-visible:outline-none focus-visible:bg-surface-highlight',
                            active
                                ? 'text-augusta-green'
                                : 'text-text-tertiary',
                        )}
                        aria-current={active ? 'page' : undefined}
                    >
                        {/* Icon with subtle scale on active */}
                        <div className="relative">
                            <Icon
                                className={cn(
                                    'w-6 h-6 transition-transform duration-150',
                                    active && 'scale-110',
                                )}
                            />
                            {/* Captain badge on More */}
                            {item.href === '/more' && isCaptainMode && (
                                <Shield
                                    className="absolute -top-1 -right-2 w-3 h-3 text-augusta-green"
                                    aria-hidden="true"
                                />
                            )}
                        </div>

                        {/* Label */}
                        <span
                            className={cn(
                                'text-[10px] mt-1 font-medium',
                                active && 'font-semibold',
                            )}
                        >
                            {item.label}
                        </span>

                        {/* Active indicator dot */}
                        {active && (
                            <span
                                className={cn(
                                    'absolute bottom-1 left-1/2 -translate-x-1/2',
                                    'w-1 h-1 rounded-full bg-augusta-green',
                                )}
                                aria-hidden="true"
                            />
                        )}
                    </button>
                );
            })}
        </nav>
    );
}

export default BottomNavNew;
