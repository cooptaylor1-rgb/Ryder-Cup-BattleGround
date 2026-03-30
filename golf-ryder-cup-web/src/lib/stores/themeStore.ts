/**
 * Theme Store
 *
 * Manages visual theme, dark mode, and accent color.
 * Persisted to localStorage.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ============================================
// TYPES
// ============================================

export type Theme = 'light' | 'dark' | 'outdoor';
export type AccentTheme = 'masters' | 'usa' | 'europe';

interface ThemeState {
  theme: Theme;
  isDarkMode: boolean;
  autoTheme: boolean;
  accentTheme: AccentTheme;
  setTheme: (theme: Theme) => void;
  toggleDarkMode: () => void;
  setAutoTheme: (enabled: boolean) => void;
  setAccentTheme: (theme: AccentTheme) => void;
}

// ============================================
// STORE
// ============================================

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'outdoor' as Theme,
      isDarkMode: false,
      autoTheme: false,
      accentTheme: 'masters' as AccentTheme,

      setTheme: (theme: Theme) => {
        set({ theme, isDarkMode: theme === 'dark' });

        if (typeof document !== 'undefined') {
          document.documentElement.classList.remove('dark', 'outdoor');
          if (theme === 'dark') {
            document.documentElement.classList.add('dark');
          } else if (theme === 'outdoor') {
            document.documentElement.classList.add('outdoor');
          }
        }
      },

      toggleDarkMode: () => {
        const currentTheme = get().theme;
        const newTheme = currentTheme === 'dark' ? 'outdoor' : 'dark';
        get().setTheme(newTheme);
      },

      setAutoTheme: (enabled) => {
        set({ autoTheme: enabled });
      },

      setAccentTheme: (theme) => {
        set({ accentTheme: theme });
      },
    }),
    {
      name: 'golf-theme-storage',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
