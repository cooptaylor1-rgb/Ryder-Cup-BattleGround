/**
 * Bottom Navigation Component (Enhanced)
 *
 * Mobile-first bottom tab bar.
 * Masters-inspired elegance with gold accents.
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
                'backdrop-blur-xl',
                'safe-bottom',
            )}
            style={{
                background: 'rgba(26, 24, 20, 0.95)',
                borderTop: '1px solid rgba(58, 53, 48, 0.5)'
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
                            'flex-1 min-w-[64px] py-2',
                            'transition-colors duration-200',
                            'focus-visible:outline-none',
                        )}
                        style={{ color: active ? '#C4A747' : '#807868' }}
                        aria-current={active ? 'page' : undefined}
                    >
                        {/* Icon with subtle scale on active */}
                        <div className="relative">
                            <Icon
                                className={cn(
                                    'w-5 h-5 transition-all duration-200',
                                    active && 'scale-110',
                                )}
                            />
                            {/* Captain badge on More */}
                            {item.href === '/more' && isCaptainMode && (
                                <Shield
                                    className="absolute -top-1 -right-2 w-3 h-3 text-masters-green"
                                    aria-hidden="true"
                                />
                            )}
                        </div>

                        {/* Label */}
                        <span
                            className={cn(
                                'text-[10px] mt-1.5 font-medium tracking-wide',
                                active && 'font-semibold',
                            )}
                        >
                            {item.label}
                        </span>

                        {/* Active indicator - elegant gold dot */}
                        {active && (
                            <span
                                className={cn(
                                    'absolute bottom-1 left-1/2 -translate-x-1/2',
                                    'w-1 h-1 rounded-full',
                                )}
                                style={{ background: '#C4A747' }}
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
