/**
 * App Shell Component
 *
 * Main application layout with responsive navigation.
 * Desktop: Sidebar rail + header + content
 * Mobile: Header + content + bottom nav
 *
 * Masters-inspired: elegant, restrained, world-class.
 *
 * Enhanced with live play components (v2.0):
 * - Floating "My Match" FAB
 * - Quick standings overlay (swipe down)
 * - Notification system
 */

'use client';

import { useState, useEffect, type ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useUIStore, useTripStore } from '@/lib/stores';
import { cn } from '@/lib/utils';
import { SidebarNav } from './SidebarNav';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { OfflineIndicator, ToastContainer } from '@/components/ui';

// Dynamic imports for live play components to prevent SSR issues with IndexedDB
const FloatingMyMatch = dynamic(
  () => import('@/components/live-play/FloatingMyMatch').then(mod => mod.FloatingMyMatch),
  { ssr: false }
);
const QuickStandingsOverlay = dynamic(
  () => import('@/components/live-play/QuickStandingsOverlay').then(mod => mod.QuickStandingsOverlay),
  { ssr: false }
);
const NotificationStack = dynamic(
  () => import('@/components/live-play/NotificationSystem').then(mod => mod.NotificationStack),
  { ssr: false }
);

interface AppShellProps {
  children: ReactNode;
  headerTitle?: string;
  headerSubtitle?: string;
  showHeader?: boolean;
  showNav?: boolean;
  showBack?: boolean;
  headerRight?: ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

export function AppShell({
  children,
  headerTitle,
  headerSubtitle,
  showHeader = true,
  showNav = true,
  showBack = false,
  headerRight,
  maxWidth = 'xl',
}: AppShellProps) {
  const { isDarkMode, isGlobalLoading, globalLoadingMessage } = useUIStore();
  const { currentTrip } = useTripStore();
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [, setMobileMenuOpen] = useState(false);

  // Apply dark mode class
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Close mobile menu on route change
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setMobileMenuOpen(false);
    }, 0);
    return () => clearTimeout(timeoutId);
  }, [headerTitle]);

  const maxWidthClass = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    '2xl': 'max-w-screen-2xl',
    full: 'max-w-full',
  }[maxWidth];

  return (
    <div
      className={cn('min-h-screen flex')}
      style={{ background: 'var(--canvas, #0F0D0A)', color: 'var(--ink, #F5F1E8)' }}
    >
      {/* Desktop Sidebar */}
      {showNav && (
        <SidebarNav
          isExpanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded(!sidebarExpanded)}
        />
      )}

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        {showHeader && (
          <Header
            title={headerTitle}
            subtitle={headerSubtitle}
            showBack={showBack}
            rightAction={headerRight}
          />
        )}

        {/* Main Content */}
        <main
          className={cn(
            'flex-1 overflow-y-auto',
            // Bottom padding for mobile nav
            showNav && 'pb-20 lg:pb-0',
          )}
        >
          <div className={cn('mx-auto w-full', maxWidthClass)}>
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        {showNav && <BottomNav />}
      </div>

      {/* Floating elements */}
      <OfflineIndicator />
      <ToastContainer />

      {/* Live Play Components - Only show when in an active trip */}
      {currentTrip && (
        <>
          {/* Floating "My Match" FAB - Quick access to your current match */}
          <FloatingMyMatch bottomOffset={showNav ? 80 : 20} />

          {/* Quick Standings Overlay - Pull down gesture */}
          <QuickStandingsOverlay />

          {/* Notification Stack - Real-time updates */}
          <NotificationStack position="top-right" maxVisible={3} />
        </>
      )}

      {/* Global Loading Overlay */}
      {isGlobalLoading && (
        <div
          className={cn(
            'fixed inset-0 z-[60]',
            'flex items-center justify-center',
            'bg-[color:var(--ink)]/50 backdrop-blur-sm',
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Loading"
        >
          <div
            className={cn(
              'flex flex-col items-center gap-4',
              'p-6 rounded-2xl',
              'bg-[var(--surface-raised)]',
              'border border-[var(--rule)]',
              'shadow-xl',
            )}
          >
            {/* Spinner */}
            <div
              className={cn(
                'w-10 h-10 rounded-full',
                'border-4 border-[color:var(--rule)] border-t-[var(--masters)]',
                'animate-spin',
              )}
            />

            {/* Message */}
            {globalLoadingMessage && (
              <p className="text-sm text-[var(--ink-secondary)] text-center max-w-[200px]">
                {globalLoadingMessage}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default AppShell;
