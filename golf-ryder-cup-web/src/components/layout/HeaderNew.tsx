/**
 * Header Component - Masters Inspired
 *
 * Elegant top app bar with serif headlines.
 * Refined styling with gold accents.
 */

'use client';

import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUIStore, useTripStore } from '@/lib/stores';
import { IconButton } from '@/components/ui/IconButton';
import { Badge } from '@/components/ui/Badge';
import { Tooltip } from '@/components/ui/Tooltip';
import {
    ChevronLeft,
    Shield,
    Settings,
    Menu,
    WifiOff,
} from 'lucide-react';

interface HeaderNewProps {
    title?: string;
    subtitle?: string;
    showBack?: boolean;
    rightAction?: React.ReactNode;
    onMenuClick?: () => void;
}

export function HeaderNew({
    title,
    subtitle,
    showBack,
    rightAction,
    onMenuClick,
}: HeaderNewProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { isCaptainMode, disableCaptainMode, isOnline } = useUIStore();
    const { currentTrip } = useTripStore();

    // Determine title based on route if not provided
    const getDefaultTitle = () => {
        if (pathname === '/') return 'Ryder Cup Tracker';
        if (pathname.startsWith('/score/')) return 'Match Scoring';
        if (pathname.startsWith('/score')) return 'Score';
        if (pathname.startsWith('/matchups')) return 'Matchups';
        if (pathname.startsWith('/standings')) return 'Standings';
        if (pathname.startsWith('/players')) return 'Players';
        if (pathname.startsWith('/courses')) return 'Courses';
        if (pathname.startsWith('/more')) return 'Settings';
        if (pathname.startsWith('/trip/new')) return 'New Trip';
        if (pathname.includes('/settings')) return 'Trip Settings';
        return currentTrip?.name || 'Golf Trip';
    };

    const displayTitle = title || getDefaultTitle();

    return (
        <header
            className={cn(
                'sticky top-0 z-40',
                'h-14 px-4',
                'flex items-center gap-3',
                'bg-surface-card/95 backdrop-blur-md',
                'border-b border-surface-border/50',
            )}
        >
            {/* Left side - Back button or Menu */}
            <div className="flex items-center gap-1 min-w-[40px]">
                {showBack ? (
                    <IconButton
                        icon={<ChevronLeft />}
                        aria-label="Go back"
                        variant="ghost"
                        size="sm"
                        onClick={() => router.back()}
                    />
                ) : onMenuClick ? (
                    <IconButton
                        icon={<Menu />}
                        aria-label="Open menu"
                        variant="ghost"
                        size="sm"
                        onClick={onMenuClick}
                        className="lg:hidden"
                    />
                ) : null}
            </div>

            {/* Center - Title & Context */}
            <div className="flex-1 min-w-0 text-center lg:text-left">
                <h1 className="font-serif text-lg font-semibold text-magnolia truncate">
                    {displayTitle}
                </h1>
                {subtitle && (
                    <p className="text-xs text-text-secondary truncate">
                        {subtitle}
                    </p>
                )}
            </div>

            {/* Right side - Status indicators & actions */}
            <div className="flex items-center gap-2 min-w-[40px] justify-end">
                {/* Offline indicator */}
                {!isOnline && (
                    <Tooltip content="You're offline. Changes will sync when reconnected.">
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-warning/10 text-warning">
                            <WifiOff className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium hidden sm:inline">Offline</span>
                        </div>
                    </Tooltip>
                )}

                {/* Captain mode indicator - gold accent */}
                {isCaptainMode && (
                    <Tooltip content="Captain Mode enabled. Tap to disable.">
                        <button
                            onClick={disableCaptainMode}
                            className={cn(
                                'flex items-center gap-1.5 px-2 py-1 rounded-full',
                                'bg-gold/10 text-gold',
                                'hover:bg-gold/20 transition-colors',
                            )}
                        >
                            <Shield className="w-3.5 h-3.5" />
                            <span className="text-xs font-medium hidden sm:inline">Captain</span>
                        </button>
                    </Tooltip>
                )}

                {/* Custom right action */}
                {rightAction}
            </div>
        </header>
    );
}

export default HeaderNew;
