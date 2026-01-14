/**
 * Theme Toggle Component
 *
 * Allows users to switch between light, dark, and system theme.
 * Persists preference to localStorage.
 */

'use client';

import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Sun, Moon, Monitor } from 'lucide-react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeToggleProps {
    variant?: 'button' | 'dropdown' | 'segmented';
    className?: string;
}

// Apply theme to document
function applyTheme(newTheme: Theme) {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (newTheme === 'dark' || (newTheme === 'system' && systemDark)) {
        root.classList.add('dark');
    } else {
        root.classList.remove('dark');
    }
}

export function ThemeToggle({ variant = 'segmented', className }: ThemeToggleProps) {
    const [theme, setTheme] = useState<Theme>('system');
    const [mounted, setMounted] = useState(false);

    // Load theme on mount
    useEffect(() => {
        setMounted(true);
        const stored = localStorage.getItem('theme') as Theme | null;
        if (stored) {
            setTheme(stored);
            applyTheme(stored);
        }
    }, []);

    const handleThemeChange = (newTheme: Theme) => {
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    };

    // Don't render until mounted to avoid hydration mismatch
    if (!mounted) {
        return null;
    }

    if (variant === 'button') {
        return (
            <button
                onClick={() => handleThemeChange(theme === 'dark' ? 'light' : 'dark')}
                className={cn(
                    'p-2 rounded-lg transition-colors',
                    'bg-surface-100 dark:bg-surface-800',
                    'hover:bg-surface-200 dark:hover:bg-surface-700',
                    className
                )}
                aria-label="Toggle theme"
            >
                {theme === 'dark' ? (
                    <Sun className="w-5 h-5" />
                ) : (
                    <Moon className="w-5 h-5" />
                )}
            </button>
        );
    }

    if (variant === 'segmented') {
        return (
            <div
                className={cn(
                    'inline-flex rounded-lg bg-surface-100 dark:bg-surface-800 p-1',
                    className
                )}
            >
                {[
                    { value: 'light' as Theme, icon: Sun, label: 'Light' },
                    { value: 'dark' as Theme, icon: Moon, label: 'Dark' },
                    { value: 'system' as Theme, icon: Monitor, label: 'System' },
                ].map((option) => {
                    const Icon = option.icon;
                    return (
                        <button
                            key={option.value}
                            onClick={() => handleThemeChange(option.value)}
                            className={cn(
                                'flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                                theme === option.value
                                    ? 'bg-surface-card text-foreground shadow-sm'
                                    : 'text-surface-500 hover:text-foreground'
                            )}
                            aria-label={option.label}
                        >
                            <Icon className="w-4 h-4" />
                            <span className="hidden sm:inline">{option.label}</span>
                        </button>
                    );
                })}
            </div>
        );
    }

    return null;
}

/**
 * Theme Provider Script
 *
 * Inline script to prevent flash of wrong theme.
 * Add this to your layout.tsx before the body content.
 */
export const ThemeScript = () => (
    <script
        dangerouslySetInnerHTML={{
            __html: `
                (function() {
                    try {
                        var theme = localStorage.getItem('theme');
                        var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                        if (theme === 'dark' || (!theme && systemDark) || (theme === 'system' && systemDark)) {
                            document.documentElement.classList.add('dark');
                        } else {
                            document.documentElement.classList.remove('dark');
                        }
                    } catch (e) {}
                })();
            `,
        }}
    />
);

export default ThemeToggle;
