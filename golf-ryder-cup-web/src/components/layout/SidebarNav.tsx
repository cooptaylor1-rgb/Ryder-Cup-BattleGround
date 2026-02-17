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
    Trophy,
    Shield,
    Settings,
    Home,
    ChevronLeft,
    ChevronRight,
    BookOpen,
} from 'lucide-react';

interface NavItem {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    tab: 'today' | 'score' | 'standings' | 'journal' | 'more';
}

// Phase 1 navigation spine: Today / Score / Standings / Journal / More
const navItems: NavItem[] = [
    { href: '/', label: 'Today', icon: Home, tab: 'today' },
    { href: '/score', label: 'Score', icon: Target, tab: 'score' },
    { href: '/standings', label: 'Standings', icon: Trophy, tab: 'standings' },
    { href: '/social', label: 'Journal', icon: BookOpen, tab: 'journal' },
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
                'bg-[var(--canvas-sunken)]',
                'border-r border-[color:var(--rule)]/50'
            )}
            aria-label="Main navigation"
        >
            {/* Logo / Brand */}
            <div
                className={cn('h-14 flex items-center px-4 border-b border-[color:var(--rule)]/50')}
            >
                <div
                    className="flex items-center justify-center h-8 w-8 rounded-lg font-bold text-sm bg-[linear-gradient(to_bottom_right,var(--masters)_0%,var(--masters-hover)_100%)] text-[var(--canvas)]"
                >
                    RC
                </div>
                {isExpanded && (
                    <span className="ml-3 font-semibold truncate text-[var(--ink)]">
                        Ryder Cup
                    </span>
                )}
            </div>

            {/* Current Trip Context */}
            {currentTrip && isExpanded && (
                <div className="px-3 py-3 mx-2 my-2 rounded-lg bg-[var(--canvas-raised)] border border-[color:var(--rule)]/60">
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 text-[var(--ink-tertiary)]">
                        Active Tournament
                    </p>
                    <p className="text-sm font-medium truncate text-[var(--ink)]">{currentTrip.name}</p>
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
                                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset',
                                'focus-visible:ring-[color:var(--gold)]/35',
                                active
                                    ? 'text-[var(--gold)] bg-[color:var(--gold)]/5'
                                    : 'text-[var(--ink-secondary)] hover:bg-[var(--surface-secondary)]'
                            )}
                            aria-current={active ? 'page' : undefined}
                        >
                            {/* Active indicator bar - gold */}
                            {active && (
                                <span
                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 rounded-r-full bg-[var(--gold)]"
                                    aria-hidden="true"
                                />
                            )}

                            <Icon className={cn(
                                'w-5 h-5 shrink-0 transition-transform',
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
                                        'text-[var(--masters)]'
                                    )}
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
                        'border-t border-[color:var(--rule)]/50',
                        'text-[var(--ink-tertiary)]',
                        'hover:bg-[var(--surface-secondary)]'
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
