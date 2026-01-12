/**
 * App Shell Component
 *
 * Main application layout with header, content area, and bottom nav.
 * Handles PWA shell with offline support.
 */

'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/lib/stores';
import { OfflineIndicator, ToastContainer } from '@/components/ui';
import { BottomNav } from './BottomNav';
import { Header } from './Header';
import { cn } from '@/lib/utils';

interface AppShellProps {
    children: React.ReactNode;
    headerTitle?: string;
    showHeader?: boolean;
    showNav?: boolean;
    showBack?: boolean;
    headerRight?: React.ReactNode;
}

export function AppShell({
    children,
    headerTitle,
    showHeader = true,
    showNav = true,
    showBack = false,
    headerRight,
}: AppShellProps) {
    const { isDarkMode, isGlobalLoading, globalLoadingMessage } = useUIStore();

    // Apply dark mode class
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    return (
        <div className={cn(
            'min-h-screen flex flex-col',
            'bg-surface-50 dark:bg-surface-900',
            'text-surface-900 dark:text-surface-100'
        )}>
            {/* Offline Banner */}
            <OfflineIndicator />

            {/* Toast Notifications */}
            <ToastContainer />

            {/* Header */}
            {showHeader && (
                <Header
                    title={headerTitle}
                    showBack={showBack}
                    rightAction={headerRight}
                />
            )}

            {/* Main Content */}
            <main className={cn(
                'flex-1 overflow-y-auto',
                showNav && 'pb-20', // Space for bottom nav
                showHeader && 'pt-0'
            )}>
                {children}
            </main>

            {/* Bottom Navigation */}
            {showNav && <BottomNav />}

            {/* Global Loading Overlay */}
            {isGlobalLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white dark:bg-surface-800 rounded-lg p-6 shadow-xl text-center">
                        <div className="w-8 h-8 border-4 border-augusta-green border-t-transparent rounded-full animate-spin mx-auto" />
                        {globalLoadingMessage && (
                            <p className="mt-3 text-sm text-surface-600 dark:text-surface-400">
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
