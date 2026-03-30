/**
 * Stores barrel export
 */

export { useTripStore } from './tripStore';
export { useScoringStore } from './scoringStore';
export { useUIStore } from './uiStore';
export { useAuthStore, type UserProfile } from './authStore';

// Focused stores (prefer these over useUIStore for better re-render isolation)
export { useToastStore, type Toast } from './toastStore';
export { useThemeStore, type Theme, type AccentTheme } from './themeStore';
export { useAccessStore } from './accessStore';
export { useScoringPrefsStore } from './scoringPrefsStore';
