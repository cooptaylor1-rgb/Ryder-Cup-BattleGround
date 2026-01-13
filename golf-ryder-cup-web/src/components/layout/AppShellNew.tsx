/**
 * App Shell Component (Enhanced)
 *
 * Main application layout with responsive navigation.
 * Desktop: Sidebar rail + header + content
 * Mobile: Header + content + bottom nav
 */

'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { useUIStore } from '@/lib/stores';
import { cn } from '@/lib/utils';
import { SidebarNav } from './SidebarNav';
import { HeaderNew } from './HeaderNew';
import { BottomNavNew } from './BottomNavNew';
import { OfflineIndicator, ToastContainer } from '@/components/ui';

interface AppShellNewProps {
    children: ReactNode;
    headerTitle?: string;
    headerSubtitle?: string;
    showHeader?: boolean;
    showNav?: boolean;
    showBack?: boolean;
    headerRight?: ReactNode;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

export function AppShellNew({
    children,
    headerTitle,
    headerSubtitle,
    showHeader = true,
    showNav = true,
    showBack = false,
    headerRight,
    maxWidth = 'xl',
}: AppShellNewProps) {
    const { isDarkMode, isGlobalLoading, globalLoadingMessage } = useUIStore();
    const [sidebarExpanded, setSidebarExpanded] = useState(false);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            style={{ background: '#0F0D0A', color: '#F5F1E8' }}
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
                    <HeaderNew
                        title={headerTitle}
                        subtitle={headerSubtitle}
                        showBack={showBack}
                        rightAction={headerRight}
                        onMenuClick={() => setMobileMenuOpen(!mobileMenuOpen)}
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
                    <div className={cn(
                        'mx-auto w-full',
                        maxWidthClass,
                    )}>
                        {children}
                    </div>
                </main>

                {/* Mobile Bottom Navigation */}
                {showNav && <BottomNavNew />}
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
                        'bg-surface-base/80 backdrop-blur-sm',
                    )}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Loading"
                >
                    <div className={cn(
                        'flex flex-col items-center gap-4',
                        'p-6 rounded-2xl',
                        'bg-surface-raised border border-surface-border',
                        'shadow-elevated',
                    )}>
                        {/* Spinner */}
                        <div className={cn(
                            'w-10 h-10 rounded-full',
                            'border-4 border-surface-border border-t-augusta-green',
                            'animate-spin',
                        )} />

                        {/* Message */}
                        {globalLoadingMessage && (
                            <p className="text-sm text-text-secondary text-center max-w-[200px]">
                                {globalLoadingMessage}
                            </p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default AppShellNew;
