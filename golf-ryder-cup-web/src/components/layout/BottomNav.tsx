/**
 * Bottom Navigation Component
 *
 * Mobile-first bottom tab bar for main navigation.
 * Large touch targets for outdoor use.
 */

'use client';

import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/lib/stores';
import {
    Target,
    Users,
    Trophy,
    MoreHorizontal,
    Shield
} from 'lucide-react';

interface NavItem {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    tab: 'score' | 'matchups' | 'standings' | 'more';
}

const navItems: NavItem[] = [
    { href: '/score', label: 'Score', icon: Target, tab: 'score' },
    { href: '/matchups', label: 'Matchups', icon: Users, tab: 'matchups' },
    { href: '/standings', label: 'Standings', icon: Trophy, tab: 'standings' },
    { href: '/more', label: 'More', icon: MoreHorizontal, tab: 'more' },
];

export function BottomNav() {
    const router = useRouter();
    const pathname = usePathname();
    const { activeTab, setActiveTab, isCaptainMode } = useUIStore();

    const handleNavClick = (item: NavItem) => {
        setActiveTab(item.tab);
        router.push(item.href);
    };

    return (
        <nav className="bottom-nav" aria-label="Main navigation">
            {navItems.map((item) => {
                const isActive = pathname.startsWith(item.href) || activeTab === item.tab;
                const Icon = item.icon;

                return (
                    <button
                        key={item.href}
                        onClick={() => handleNavClick(item)}
                        className={cn(
                            'flex flex-col items-center justify-center',
                            'min-w-[64px] py-2 px-3',
                            'transition-colors duration-150',
                            isActive
                                ? 'text-augusta-green'
                                : 'text-surface-500 hover:text-surface-700 dark:hover:text-surface-300'
                        )}
                        aria-current={isActive ? 'page' : undefined}
                    >
                        <div className="relative">
                            <Icon className={cn(
                                'w-6 h-6 transition-transform',
                                isActive && 'scale-110'
                            )} />
                            {item.tab === 'more' && isCaptainMode && (
                                <Shield className="absolute -top-1 -right-2 w-3 h-3 text-augusta-green" />
                            )}
                        </div>
                        <span className={cn(
                            'text-xs mt-1 font-medium',
                            isActive && 'font-bold'
                        )}>
                            {item.label}
                        </span>
                        {isActive && (
                            <div className="absolute bottom-0 w-12 h-0.5 bg-augusta-green rounded-full" />
                        )}
                    </button>
                );
            })}
        </nav>
    );
}

export default BottomNav;
