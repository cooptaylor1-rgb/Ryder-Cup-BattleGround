/**
 * Header Component
 *
 * Top app bar with title and action buttons.
 * Context-aware based on current route.
 */

'use client';

import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUIStore, useTripStore } from '@/lib/stores';
import {
    ChevronLeft,
    Shield,
    ShieldOff,
    Settings,
    Menu
} from 'lucide-react';

interface HeaderProps {
    title?: string;
    showBack?: boolean;
    rightAction?: React.ReactNode;
}

export function Header({ title, showBack, rightAction }: HeaderProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { isCaptainMode, disableCaptainMode, openModal } = useUIStore();
    const { currentTrip } = useTripStore();

    // Determine title based on route if not provided
    const getDefaultTitle = () => {
        if (pathname.startsWith('/score')) return 'Score';
        if (pathname.startsWith('/matchups')) return 'Matchups';
        if (pathname.startsWith('/standings')) return 'Standings';
        if (pathname.startsWith('/more')) return 'More';
        if (pathname.startsWith('/lineup')) return 'Lineup';
        if (pathname.startsWith('/settings')) return 'Settings';
        return currentTrip?.name || 'Golf Trip';
    };

    const displayTitle = title || getDefaultTitle();

    return (
        <header className={cn(
            'sticky top-0 z-40',
            'h-14 px-4',
            'flex items-center justify-between',
            'bg-surface-50/95 dark:bg-surface-900/95',
            'backdrop-blur-sm',
            'border-b border-surface-200 dark:border-surface-800'
        )}>
            {/* Left side */}
            <div className="flex items-center gap-2 min-w-[60px]">
                {showBack && (
                    <button
                        onClick={() => router.back()}
                        className="p-2 -ml-2 rounded-full hover:bg-surface-200 dark:hover:bg-surface-800 transition-colors"
                        aria-label="Go back"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Center - Title */}
            <h1 className="text-lg font-bold text-center truncate flex-1">
                {displayTitle}
            </h1>

            {/* Right side */}
            <div className="flex items-center gap-1 min-w-[60px] justify-end">
                {rightAction}

                {/* Captain Mode Indicator */}
                {isCaptainMode && (
                    <button
                        onClick={disableCaptainMode}
                        className="p-2 rounded-full text-augusta-green hover:bg-augusta-green/10 transition-colors"
                        aria-label="Captain mode enabled - tap to disable"
                    >
                        <Shield className="w-5 h-5" />
                    </button>
                )}
            </div>
        </header>
    );
}

export default Header;
