/**
 * Header Component
 *
 * Refined top app bar with clear hierarchy.
 * Masters-inspired: confident, quiet, purposeful.
 */

'use client';

import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUIStore, useTripStore } from '@/lib/stores';
import { IconButton } from '@/components/ui/IconButton';
import {
  ChevronLeft,
  Shield,
  Menu,
  WifiOff,
} from 'lucide-react';

interface HeaderProps {
  title?: string;
  subtitle?: string;
  showBack?: boolean;
  rightAction?: React.ReactNode;
  onMenuClick?: () => void;
}

export function Header({
  title,
  subtitle,
  showBack,
  rightAction,
  onMenuClick,
}: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isCaptainMode, disableCaptainMode, isOnline } = useUIStore();
  const { currentTrip } = useTripStore();

  // Determine title based on route if not provided
  const getDefaultTitle = () => {
    if (pathname === '/') return 'Ryder Cup Tracker';
    if (pathname.startsWith('/score/')) return 'Match Scoring';
    if (pathname.startsWith('/score')) return 'Score';
    if (pathname.startsWith('/matchups')) return 'Matches';
    if (pathname.startsWith('/standings')) return 'Standings';
    if (pathname.startsWith('/players')) return 'Players';
    if (pathname.startsWith('/courses')) return 'Courses';
    if (pathname.startsWith('/more')) return 'Settings';
    if (pathname.startsWith('/trip/new')) return 'New Tournament';
    if (pathname.includes('/settings')) return 'Settings';
    if (pathname.startsWith('/live')) return 'Live Scores';
    if (pathname.startsWith('/social')) return 'Social';
    if (pathname.startsWith('/achievements')) return 'Achievements';
    if (pathname.startsWith('/bets')) return 'Side Bets';
    return currentTrip?.name || 'Tournament';
  };

  const displayTitle = title || getDefaultTitle();

  return (
    <header
      className="sticky top-0 z-40 h-14 px-4 flex items-center gap-3"
      style={{
        background: 'var(--surface, #1A1814)',
        borderBottom: '1px solid var(--rule, rgba(58, 53, 48, 0.5))',
      }}
    >
      {/* Left side - Back button or Menu */}
      <div className="flex items-center min-w-[40px]">
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

      {/* Center - Title */}
      <div className="flex-1 min-w-0 text-center lg:text-left">
        <h1
          className="text-base font-semibold truncate"
          style={{ color: 'var(--ink, #F5F1E8)' }}
        >
          {displayTitle}
        </h1>
        {subtitle && (
          <p
            className="text-xs truncate"
            style={{ color: 'var(--ink-tertiary, #807868)' }}
          >
            {subtitle}
          </p>
        )}
      </div>

      {/* Right side - Status & actions */}
      <div className="flex items-center gap-2 min-w-[40px] justify-end">
        {/* Offline indicator */}
        {!isOnline && (
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium"
            style={{
              background: 'rgba(196, 152, 61, 0.1)',
              color: 'var(--warning, #C4983D)',
            }}
          >
            <WifiOff className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Offline</span>
          </div>
        )}

        {/* Captain mode indicator */}
        {isCaptainMode && (
          <button
            onClick={disableCaptainMode}
            className="flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium transition-colors"
            style={{
              background: 'rgba(0, 103, 71, 0.1)',
              color: 'var(--masters, #006747)',
            }}
            title="Captain Mode enabled. Tap to disable."
          >
            <Shield className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Captain</span>
          </button>
        )}

        {rightAction}
      </div>
    </header>
  );
}

export default Header;
