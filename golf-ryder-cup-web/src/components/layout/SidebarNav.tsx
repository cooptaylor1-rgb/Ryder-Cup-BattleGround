/**
 * Sidebar Navigation Component
 *
 * Masters-inspired rail navigation for desktop.
 * Elegant with gold accents.
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
    Shield,
    Settings,
    Home,
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
                'h-full',
                'transition-all duration-200',
                isExpanded ? 'w-60' : 'w-16',
            )}
            style={{
                background: '#1A1814',
                borderRight: '1px solid rgba(58, 53, 48, 0.5)',
            }}
            aria-label="Main navigation"
        >
            {/* Logo / Brand */}
            <div
                className={cn('h-14 flex items-center px-4')}
                style={{ borderBottom: '1px solid rgba(58, 53, 48, 0.5)' }}
            >
                <div
                    className="flex items-center justify-center h-8 w-8 rounded-lg font-bold text-sm"
                    style={{
                        background: 'linear-gradient(to bottom right, #006747, #004D35)',
                        color: 'white',
                    }}
                >
                    RC
                </div>
                {isExpanded && (
                    <span className="ml-3 font-semibold truncate" style={{ color: '#F5F1E8' }}>
                        Ryder Cup
                    </span>
                )}
            </div>

            {/* Current Trip Context */}
            {currentTrip && isExpanded && (
                <div
                    className="px-3 py-3 mx-2 my-2 rounded-lg"
                    style={{
                        background: '#1E1C18',
                        border: '1px solid #3A3530',
                    }}
                >
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: '#807868' }}>
                        Active Tournament
                    </p>
                    <p className="text-sm font-medium truncate" style={{ color: '#F5F1E8' }}>
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
                                'transition-all duration-200',
                                'focus-visible:outline-none focus-visible:ring-2',
                                'focus-visible:ring-inset',
                            )}
                            style={{
                                color: active ? '#C4A747' : '#B8B0A0',
                                background: active ? 'rgba(196, 167, 71, 0.05)' : 'transparent',
                            }}
                            aria-current={active ? 'page' : undefined}
                        >
                            {/* Active indicator bar - gold */}
                            {active && (
                                <span
                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 rounded-r-full"
                                    style={{ background: '#C4A747' }}
                                    aria-hidden="true"
                                />
                            )}

                            <Icon className={cn(
                                'w-5 h-5 flex-shrink-0 transition-transform',
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
                                <Shield
                                    className={cn(
                                        'w-3.5 h-3.5',
                                        isExpanded ? 'ml-auto' : 'absolute top-2 right-2',
                                    )}
                                    style={{ color: '#006747' }}
                                />
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
                        'h-12',
                        'transition-colors duration-200',
                    )}
                    style={{
                        borderTop: '1px solid rgba(58, 53, 48, 0.5)',
                        color: '#807868',
                    }}
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
