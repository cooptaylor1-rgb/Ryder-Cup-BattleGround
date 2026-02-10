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

  // Avoid hydration mismatch: render a non-interactive placeholder until mounted.
  // This prevents layout shift where the toggle would otherwise disappear.
  if (!mounted) {
    const placeholderClass =
      variant === 'button'
        ? 'h-10 w-10 rounded-lg bg-[var(--surface-secondary)]'
        : variant === 'dropdown'
          ? 'h-10 w-[140px] rounded-lg bg-[var(--surface-secondary)]'
          : 'h-10 w-[210px] rounded-lg bg-[var(--surface-secondary)]';

    return <div aria-hidden className={cn(placeholderClass, className)} />;
  }

  if (variant === 'button') {
    return (
      <button
        onClick={() => handleThemeChange(theme === 'dark' ? 'light' : 'dark')}
        className={cn(
          'p-2 rounded-lg transition-colors',
          'bg-[var(--surface-secondary)]',
          'hover:bg-[var(--surface-tertiary)]',
          className
        )}
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
      </button>
    );
  }

  if (variant === 'dropdown') {
    return (
      <label className={cn('inline-flex items-center gap-2 text-sm text-[var(--ink-secondary)]', className)}>
        <span className="sr-only">Theme</span>
        <select
          value={theme}
          onChange={(e) => handleThemeChange(e.target.value as Theme)}
          className={cn(
            'h-10 rounded-lg border border-[var(--rule)] bg-[var(--surface)] px-3 text-sm',
            'text-[var(--ink-primary)] shadow-sm',
            'focus:outline-none focus:ring-2 focus:ring-[var(--masters)] focus:ring-offset-2 focus:ring-offset-[var(--canvas)]'
          )}
          aria-label="Theme"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="system">System</option>
        </select>
      </label>
    );
  }

  if (variant === 'segmented') {
    return (
      <div
        className={cn('inline-flex rounded-lg bg-[var(--surface-secondary)] p-1', className)}
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
                  ? 'bg-[var(--surface)] text-[var(--ink-primary)] shadow-sm'
                  : 'text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)]'
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

  // Fallback for unknown variant
  return (
    <div className={cn('inline-flex rounded-lg bg-[var(--surface-secondary)] p-1', className)}>
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
                ? 'bg-[var(--surface)] text-[var(--ink-primary)] shadow-sm'
                : 'text-[var(--ink-tertiary)] hover:text-[var(--ink-primary)]'
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

/**
 * Theme Provider Script
 *
 * Inline script to prevent flash of wrong theme.
 * Add this to your layout.tsx before the body content.
 *
 * SECURITY NOTE: This script uses dangerouslySetInnerHTML but is safe because:
 * 1. The script content is a static constant (no user input)
 * 2. localStorage.getItem only returns string values, never executable code
 * 3. The only operations are classList.add/remove with hardcoded class names
 * 4. CSP 'unsafe-inline' is required but mitigated by script simplicity
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
                    } catch (e) {
                        // Theme initialization failed - localStorage unavailable or other error
                        // Fall back to light theme (no action needed as dark class not added)
                    }
                })();
            `,
    }}
  />
);

export default ThemeToggle;
