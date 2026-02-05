/**
 * Feature Flags System
 *
 * Production-ready feature flag management for:
 * - Gradual rollouts
 * - A/B testing
 * - User-specific features
 * - Environment-based features
 *
 * @example
 * const { isEnabled } = useFeatureFlag('new-scoring-ui');
 * if (isEnabled) { ... }
 */

'use client';

import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react';

// ============================================
// TYPES
// ============================================

export type FeatureFlagValue = boolean | string | number;

export interface FeatureFlag {
  /** Flag identifier */
  key: string;
  /** Flag value (boolean, string, or number for A/B variants) */
  value: FeatureFlagValue;
  /** Description of the feature */
  description?: string;
  /** Rollout percentage (0-100) for gradual rollouts */
  rolloutPercentage?: number;
  /** User IDs that always get this flag enabled */
  enabledUserIds?: string[];
  /** User IDs that always get this flag disabled */
  disabledUserIds?: string[];
  /** Environments where this flag is enabled */
  environments?: ('development' | 'staging' | 'production')[];
  /** Expiration date for temporary flags */
  expiresAt?: string;
}

export interface FeatureFlagConfig {
  /** All feature flags */
  flags: Record<string, FeatureFlag>;
  /** Default values for flags not in config */
  defaults?: Record<string, FeatureFlagValue>;
  /** Current user ID for targeting */
  userId?: string;
  /** Current environment */
  environment?: 'development' | 'staging' | 'production';
}

interface FeatureFlagContextValue {
  flags: Record<string, FeatureFlag>;
  isEnabled: (key: string) => boolean;
  getValue: <T extends FeatureFlagValue>(key: string, defaultValue: T) => T;
  setOverride: (key: string, value: FeatureFlagValue) => void;
  clearOverride: (key: string) => void;
  clearAllOverrides: () => void;
  getVariant: (key: string) => string | null;
}

// ============================================
// DEFAULT FLAGS CONFIGURATION
// ============================================

export const defaultFlags: Record<string, FeatureFlag> = {
  // UI Features
  'dark-mode': {
    key: 'dark-mode',
    value: true,
    description: 'Enable dark mode theme option',
    environments: ['development', 'staging', 'production'],
  },
  'new-scoring-ui': {
    key: 'new-scoring-ui',
    value: true,
    description: 'New enhanced scoring interface',
    rolloutPercentage: 100,
  },
  'live-reactions': {
    key: 'live-reactions',
    value: true,
    description: 'Real-time emoji reactions on matches',
  },
  'push-notifications': {
    key: 'push-notifications',
    value: true,
    description: 'Web push notifications for match updates',
  },
  'export-pdf': {
    key: 'export-pdf',
    value: true,
    description: 'Export scorecards and standings to PDF',
  },
  'share-native': {
    key: 'share-native',
    value: true,
    description: 'Native share API for scores and standings',
  },

  // Performance Features
  'prefetch-matches': {
    key: 'prefetch-matches',
    value: true,
    description: 'Prefetch match data on good connections',
  },
  'offline-photos': {
    key: 'offline-photos',
    value: false,
    description: 'Cache photos for offline viewing',
    rolloutPercentage: 50,
  },

  // Experimental Features
  'ai-scoring-ocr': {
    key: 'ai-scoring-ocr',
    value: false,
    description: 'AI-powered scorecard OCR',
    environments: ['development', 'staging'],
  },
  'voice-commands': {
    key: 'voice-commands',
    value: false,
    description: 'Voice command score entry',
    environments: ['development'],
  },

  // A/B Test Variants
  'leaderboard-style': {
    key: 'leaderboard-style',
    value: 'classic',
    description: 'A/B test: classic vs compact leaderboard',
  },
};

// ============================================
// UTILITIES
// ============================================

/**
 * Generate a consistent hash for a user ID
 */
function hashUserId(userId: string): number {
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

/**
 * Check if a user is in the rollout percentage
 */
function isUserInRollout(userId: string | undefined, percentage: number): boolean {
  if (percentage >= 100) return true;
  if (percentage <= 0) return false;
  if (!userId) return percentage >= 50; // Default to 50% for anonymous

  const hash = hashUserId(userId);
  return (hash % 100) < percentage;
}

/**
 * Get stored overrides from localStorage
 */
function getStoredOverrides(): Record<string, FeatureFlagValue> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem('feature-flag-overrides');
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Save overrides to localStorage
 */
function saveOverrides(overrides: Record<string, FeatureFlagValue>): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('feature-flag-overrides', JSON.stringify(overrides));
  } catch {
    // Ignore storage errors
  }
}

// ============================================
// CONTEXT
// ============================================

const FeatureFlagContext = createContext<FeatureFlagContextValue | null>(null);

// ============================================
// PROVIDER
// ============================================

export interface FeatureFlagProviderProps {
  children: ReactNode;
  /** Custom flags configuration */
  config?: Partial<FeatureFlagConfig>;
  /** Current user ID for targeting */
  userId?: string;
}

export function FeatureFlagProvider({
  children,
  config,
  userId,
}: FeatureFlagProviderProps) {
  const [overrides, setOverrides] = useState<Record<string, FeatureFlagValue>>({});
  const environment = (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development';

  // Load overrides from localStorage on mount
  useEffect(() => {
    setOverrides(getStoredOverrides());
  }, []);

  // Merge default flags with custom config
  const flags: Record<string, FeatureFlag> = {
    ...defaultFlags,
    ...config?.flags,
  };

  /**
   * Check if a feature flag is enabled
   */
  const isEnabled = useCallback((key: string): boolean => {
    // Check for override first
    if (key in overrides) {
      return Boolean(overrides[key]);
    }

    const flag = flags[key];
    if (!flag) {
      // Check defaults
      const defaults = config?.defaults;
      if (defaults && key in defaults) {
        return Boolean(defaults[key]);
      }
      return false;
    }

    // Check expiration
    if (flag.expiresAt && new Date(flag.expiresAt) < new Date()) {
      return false;
    }

    // Check environment
    if (flag.environments && !flag.environments.includes(environment)) {
      return false;
    }

    // Check user-specific enable/disable
    if (userId) {
      if (flag.enabledUserIds?.includes(userId)) return true;
      if (flag.disabledUserIds?.includes(userId)) return false;
    }

    // Check rollout percentage
    if (flag.rolloutPercentage !== undefined) {
      return isUserInRollout(userId, flag.rolloutPercentage);
    }

    return Boolean(flag.value);
  }, [flags, overrides, config?.defaults, environment, userId]);

  /**
   * Get the value of a feature flag
   */
  const getValue = useCallback(<T extends FeatureFlagValue>(key: string, defaultValue: T): T => {
    if (key in overrides) {
      return overrides[key] as T;
    }

    const flag = flags[key];
    if (!flag) {
      const defaults = config?.defaults;
      if (defaults && key in defaults) {
        return defaults[key] as T;
      }
      return defaultValue;
    }

    return flag.value as T;
  }, [flags, overrides, config?.defaults]);

  /**
   * Set a local override for a flag (useful for testing)
   */
  const setOverride = useCallback((key: string, value: FeatureFlagValue) => {
    setOverrides(prev => {
      const next = { ...prev, [key]: value };
      saveOverrides(next);
      return next;
    });
  }, []);

  /**
   * Clear a specific override
   */
  const clearOverride = useCallback((key: string) => {
    setOverrides(prev => {
      const next = { ...prev };
      delete next[key];
      saveOverrides(next);
      return next;
    });
  }, []);

  /**
   * Clear all overrides
   */
  const clearAllOverrides = useCallback(() => {
    setOverrides({});
    saveOverrides({});
  }, []);

  /**
   * Get variant for A/B testing
   */
  const getVariant = useCallback((key: string): string | null => {
    const value = getValue(key, null as unknown as string);
    return typeof value === 'string' ? value : null;
  }, [getValue]);

  const contextValue: FeatureFlagContextValue = {
    flags,
    isEnabled,
    getValue,
    setOverride,
    clearOverride,
    clearAllOverrides,
    getVariant,
  };

  return (
    <FeatureFlagContext.Provider value={contextValue}>
      {children}
    </FeatureFlagContext.Provider>
  );
}

// ============================================
// HOOKS
// ============================================

/**
 * Hook to access feature flag context
 */
export function useFeatureFlags(): FeatureFlagContextValue {
  const context = useContext(FeatureFlagContext);
  if (!context) {
    throw new Error('useFeatureFlags must be used within a FeatureFlagProvider');
  }
  return context;
}

/**
 * Hook to check a specific feature flag
 */
export function useFeatureFlag(key: string): { isEnabled: boolean; value: FeatureFlagValue } {
  const { isEnabled, getValue } = useFeatureFlags();
  return {
    isEnabled: isEnabled(key),
    value: getValue(key, false),
  };
}

/**
 * Hook for A/B test variants
 */
export function useVariant(key: string, defaultVariant: string = 'control'): string {
  const { getVariant } = useFeatureFlags();
  return getVariant(key) || defaultVariant;
}

// ============================================
// STANDALONE CHECK (for server-side)
// ============================================

/**
 * Check feature flag without context (server-side safe)
 */
export function checkFeatureFlag(
  key: string,
  options?: {
    userId?: string;
    environment?: 'development' | 'staging' | 'production';
  }
): boolean {
  const flag = defaultFlags[key];
  if (!flag) return false;

  const env = options?.environment || process.env.NODE_ENV || 'development';

  if (flag.environments && !flag.environments.includes(env as 'development' | 'staging' | 'production')) {
    return false;
  }

  if (flag.rolloutPercentage !== undefined) {
    return isUserInRollout(options?.userId, flag.rolloutPercentage);
  }

  return Boolean(flag.value);
}

export default FeatureFlagProvider;
