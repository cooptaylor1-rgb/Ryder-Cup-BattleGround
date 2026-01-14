/**
 * App Shell Component
 *
 * Main application layout with responsive navigation.
 * Desktop: Sidebar rail + header + content
 * Mobile: Header + content + bottom nav
 *
 * Masters-inspired: elegant, restrained, world-class.
 */

'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { useUIStore } from '@/lib/stores';
import { cn } from '@/lib/utils';
import { SidebarNav } from './SidebarNav';
import { Header } from './Header';
import { BottomNav } from './BottomNav';
import { OfflineIndicator, ToastContainer } from '@/components/ui';

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
    setMobileMenuOpen(false);
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

      {/* Global Loading Overlay */}
      {isGlobalLoading && (
        <div
          className={cn(
            'fixed inset-0 z-[60]',
            'flex items-center justify-center',
            'bg-black/50 backdrop-blur-sm',
          )}
          role="dialog"
          aria-modal="true"
          aria-label="Loading"
        >
          <div
            className={cn(
              'flex flex-col items-center gap-4',
              'p-6 rounded-2xl',
              'bg-white dark:bg-gray-800',
              'shadow-xl',
            )}
          >
            {/* Spinner */}
            <div
              className={cn(
                'w-10 h-10 rounded-full',
                'border-4 border-gray-200 border-t-green-600',
                'animate-spin',
              )}
            />

            {/* Message */}
            {globalLoadingMessage && (
              <p className="text-sm text-gray-600 dark:text-gray-300 text-center max-w-[200px]">
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
