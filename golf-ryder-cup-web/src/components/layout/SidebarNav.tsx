/**
 * Sidebar Navigation Component
 *
 * Palantir-inspired rail navigation for desktop.
 * Collapses to bottom nav on mobile.
 */

'use client';

import { usePathname, useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUIStore, useTripStore } from '@/lib/stores';
import { Tooltip } from '@/components/ui/Tooltip';
import {
    Target,
    Users,
    Trophy,
    MoreHorizontal,
    Shield,
    Settings,
    Home,
    Calendar,
    BarChart3,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';

interface NavItem {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    tab: 'home' | 'score' | 'matchups' | 'standings' | 'more';
}

const navItems: NavItem[] = [
    { href: '/', label: 'Home', icon: Home, tab: 'home' },
    { href: '/score', label: 'Score', icon: Target, tab: 'score' },
    { href: '/matchups', label: 'Matchups', icon: Users, tab: 'matchups' },
    { href: '/standings', label: 'Standings', icon: Trophy, tab: 'standings' },
    { href: '/more', label: 'More', icon: Settings, tab: 'more' },
];

interface SidebarNavProps {
    isExpanded?: boolean;
    onToggle?: () => void;
}

export function SidebarNav({ isExpanded = false, onToggle }: SidebarNavProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { isCaptainMode } = useUIStore();
    const { currentTrip } = useTripStore();

    const handleNavClick = (item: NavItem) => {
        router.push(item.href);
    };

    const isActive = (item: NavItem) => {
        if (item.href === '/') return pathname === '/';
        return pathname.startsWith(item.href);
    };

    return (
        <nav
            className={cn(
                'hidden lg:flex flex-col',
                'h-full bg-surface-raised',
                'border-r border-surface-border',
                'transition-all duration-200',
                isExpanded ? 'w-60' : 'w-16',
            )}
            aria-label="Main navigation"
        >
            {/* Logo / Brand */}
            <div className={cn(
                'h-14 flex items-center px-4',
                'border-b border-surface-border',
            )}>
                <div className={cn(
                    'flex items-center justify-center',
                    'h-8 w-8 rounded-lg',
                    'bg-augusta-green text-white',
                    'font-bold text-sm',
                )}>
                    RC
                </div>
                {isExpanded && (
                    <span className="ml-3 font-semibold text-text-primary truncate">
                        Ryder Cup
                    </span>
                )}
            </div>

            {/* Current Trip Context */}
            {currentTrip && isExpanded && (
                <div className={cn(
                    'px-3 py-3 mx-2 my-2',
                    'bg-surface-elevated rounded-lg',
                    'border border-surface-border',
                )}>
                    <p className="text-xs text-text-tertiary uppercase tracking-wider mb-1">
                        Current Trip
                    </p>
                    <p className="text-sm font-medium text-text-primary truncate">
                        {currentTrip.name}
                    </p>
                </div>
            )}

            {/* Nav Items */}
            <div className="flex-1 py-2">
                {navItems.map((item) => {
                    const active = isActive(item);
                    const Icon = item.icon;

                    const button = (
                        <button
                            key={item.href}
                            onClick={() => handleNavClick(item)}
                            className={cn(
                                'relative flex items-center gap-3',
                                'w-full px-4 py-3',
                                'transition-colors duration-150',
                                'focus-visible:outline-none focus-visible:ring-2',
                                'focus-visible:ring-inset focus-visible:ring-augusta-green',
                                active
                                    ? 'text-augusta-green bg-augusta-green/10'
                                    : 'text-text-secondary hover:text-text-primary hover:bg-surface-highlight',
                            )}
                            aria-current={active ? 'page' : undefined}
                        >
                            {/* Active indicator bar */}
                            {active && (
                                <span
                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-augusta-green rounded-r-full"
                                    aria-hidden="true"
                                />
                            )}

                            <Icon className={cn(
                                'w-5 h-5 flex-shrink-0',
                                active && 'scale-110',
                            )} />

                            {isExpanded && (
                                <span className={cn(
                                    'text-sm font-medium truncate',
                                    active && 'font-semibold',
                                )}>
                                    {item.label}
                                </span>
                            )}

                            {/* Captain badge */}
                            {item.tab === 'more' && isCaptainMode && (
                                <Shield className={cn(
                                    'w-3.5 h-3.5 text-augusta-green',
                                    isExpanded ? 'ml-auto' : 'absolute top-2 right-2',
                                )} />
                            )}
                        </button>
                    );

                    // Wrap in tooltip when collapsed
                    if (!isExpanded) {
                        return (
                            <Tooltip key={item.href} content={item.label} side="right">
                                {button}
                            </Tooltip>
                        );
                    }

                    return button;
                })}
            </div>

            {/* Expand/Collapse Toggle */}
            {onToggle && (
                <button
                    onClick={onToggle}
                    className={cn(
                        'flex items-center justify-center',
                        'h-12 border-t border-surface-border',
                        'text-text-tertiary hover:text-text-secondary',
                        'transition-colors duration-150',
                    )}
                    aria-label={isExpanded ? 'Collapse sidebar' : 'Expand sidebar'}
                >
                    {isExpanded ? (
                        <>
                            <ChevronLeft className="w-4 h-4 mr-2" />
                            <span className="text-xs">Collapse</span>
                        </>
                    ) : (
                        <ChevronRight className="w-4 h-4" />
                    )}
                </button>
            )}
        </nav>
    );
}

export default SidebarNav;
