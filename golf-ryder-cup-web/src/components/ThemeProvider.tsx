'use client';

import { useEffect } from 'react';
import { useUIStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import { TEAM_COLOR_PALETTE } from '@/lib/constants/teamColors';

/**
 * ThemeProvider
 *
 * Applies the theme class to the document on mount and when theme changes.
 * Must be rendered client-side to access document.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme, setTheme, autoTheme, accentTheme } = useUIStore(useShallow(s => ({ theme: s.theme, setTheme: s.setTheme, autoTheme: s.autoTheme, accentTheme: s.accentTheme })));

  // Apply theme on mount and when it changes
  // Apply theme on mount and toggle auto-theme interval.
  // Only depend on autoTheme — setTheme is a stable Zustand action ref,
  // and including theme caused the interval to restart on every theme change.
  useEffect(() => {
    if (!autoTheme) {
      setTheme(theme);
      return;
    }

    const applyAutoTheme = () => {
      const hour = new Date().getHours();
      const isNight = hour >= 19 || hour < 6;
      setTheme(isNight ? 'dark' : 'outdoor');
    };

    applyAutoTheme();
    const intervalId = setInterval(applyAutoTheme, 10 * 60 * 1000);
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoTheme]);

  useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;
    if (accentTheme === 'masters') {
      root.style.removeProperty('--masters');
      root.style.removeProperty('--masters-hover');
      root.style.removeProperty('--masters-deep');
      root.style.removeProperty('--masters-subtle');
      root.style.removeProperty('--masters-glow');
      return;
    }

    const palette = accentTheme === 'usa' ? TEAM_COLOR_PALETTE.teamA : TEAM_COLOR_PALETTE.teamB;
    root.style.setProperty('--masters', palette.primary);
    root.style.setProperty('--masters-hover', palette.light);
    root.style.setProperty('--masters-deep', palette.dark);
    root.style.setProperty('--masters-subtle', palette.background);
    root.style.setProperty('--masters-glow', 'rgba(0, 0, 0, 0.18)');
  }, [accentTheme]);

  return <>{children}</>;
}

export default ThemeProvider;
