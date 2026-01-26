/**
 * iOS Safe Area Provider & Hooks
 *
 * World-class safe area handling for iPhone notches,
 * Dynamic Island, and home indicator.
 *
 * Provides React context and hooks for responsive
 * safe area inset management across the app.
 */

'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from 'react';

// ============================================
// Types
// ============================================

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface SafeAreaContextValue {
  insets: SafeAreaInsets;
  isIOS: boolean;
  hasDynamicIsland: boolean;
  hasHomeIndicator: boolean;
  /** Keyboard-adjusted bottom inset */
  adjustedBottom: number;
  /** Is keyboard visible */
  isKeyboardVisible: boolean;
}

// ============================================
// Context
// ============================================

const defaultInsets: SafeAreaInsets = {
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};

const SafeAreaContext = createContext<SafeAreaContextValue>({
  insets: defaultInsets,
  isIOS: false,
  hasDynamicIsland: false,
  hasHomeIndicator: false,
  adjustedBottom: 0,
  isKeyboardVisible: false,
});

// ============================================
// Detection Utilities
// ============================================

function detectIOSDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function detectDynamicIsland(): boolean {
  if (typeof window === 'undefined') return false;
  // Dynamic Island devices: iPhone 14 Pro+, 15 series, 16 series
  // These have a top safe area > 50px
  const topInset = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue(
      'env(safe-area-inset-top)'
    ) || '0',
    10
  );
  return topInset > 50;
}

function detectHomeIndicator(): boolean {
  if (typeof window === 'undefined') return false;
  // Home indicator devices have bottom safe area > 20px
  const bottomInset = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue(
      'env(safe-area-inset-bottom)'
    ) || '0',
    10
  );
  return bottomInset > 20;
}

function getSafeAreaInsets(): SafeAreaInsets {
  if (typeof window === 'undefined') return defaultInsets;

  const style = getComputedStyle(document.documentElement);

  return {
    top: parseInt(style.getPropertyValue('env(safe-area-inset-top)') || '0', 10),
    right: parseInt(style.getPropertyValue('env(safe-area-inset-right)') || '0', 10),
    bottom: parseInt(style.getPropertyValue('env(safe-area-inset-bottom)') || '0', 10),
    left: parseInt(style.getPropertyValue('env(safe-area-inset-left)') || '0', 10),
  };
}

// ============================================
// Provider Component
// ============================================

interface SafeAreaProviderProps {
  children: ReactNode;
}

// Helper functions to initialize state (avoid useEffect setState issues)
const getInitialIOS = () => typeof window !== 'undefined' && detectIOSDevice();
const getInitialInsets = () => typeof window !== 'undefined' ? getSafeAreaInsets() : defaultInsets;
const getInitialDynamicIsland = () => typeof window !== 'undefined' && detectDynamicIsland();
const getInitialHomeIndicator = () => typeof window !== 'undefined' && detectHomeIndicator();

export function SafeAreaProvider({ children }: SafeAreaProviderProps) {
  const [insets, setInsets] = useState<SafeAreaInsets>(getInitialInsets);
  const [isIOS, setIsIOS] = useState(getInitialIOS);
  const [hasDynamicIsland, setHasDynamicIsland] = useState(getInitialDynamicIsland);
  const [hasHomeIndicator, setHasHomeIndicator] = useState(getInitialHomeIndicator);
  const [adjustedBottom, setAdjustedBottom] = useState(() => getInitialInsets().bottom);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  useEffect(() => {
    if (!isIOS) {
      // Non-iOS: still get safe area insets (for notched Android, etc.)
      setInsets(getSafeAreaInsets());
      return;
    }

    // Listen for orientation changes
    const handleResize = () => {
      const newInsets = getSafeAreaInsets();
      setInsets(newInsets);
      setHasDynamicIsland(detectDynamicIsland());
      if (!isKeyboardVisible) {
        setAdjustedBottom(newInsets.bottom);
      }
    };

    // Listen for keyboard via visualViewport
    const visualViewport = window.visualViewport;
    if (visualViewport) {
      const handleViewportResize = () => {
        const heightDiff = window.innerHeight - visualViewport.height;
        const keyboardVisible = heightDiff > 150;
        setIsKeyboardVisible(keyboardVisible);

        if (keyboardVisible) {
          // When keyboard is visible, adjust bottom to account for it
          setAdjustedBottom(heightDiff);
        } else {
          setAdjustedBottom(insets.bottom);
        }
      };

      visualViewport.addEventListener('resize', handleViewportResize);
      window.addEventListener('resize', handleResize);
      window.addEventListener('orientationchange', handleResize);

      return () => {
        visualViewport.removeEventListener('resize', handleViewportResize);
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('orientationchange', handleResize);
      };
    }

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [insets.bottom, isKeyboardVisible]);

  // Update CSS custom properties
  useEffect(() => {
    document.documentElement.style.setProperty(
      '--safe-area-top',
      `${insets.top}px`
    );
    document.documentElement.style.setProperty(
      '--safe-area-right',
      `${insets.right}px`
    );
    document.documentElement.style.setProperty(
      '--safe-area-bottom',
      `${insets.bottom}px`
    );
    document.documentElement.style.setProperty(
      '--safe-area-left',
      `${insets.left}px`
    );
    document.documentElement.style.setProperty(
      '--safe-area-adjusted-bottom',
      `${adjustedBottom}px`
    );
  }, [insets, adjustedBottom]);

  return (
    <SafeAreaContext.Provider
      value={{
        insets,
        isIOS,
        hasDynamicIsland,
        hasHomeIndicator,
        adjustedBottom,
        isKeyboardVisible,
      }}
    >
      {children}
    </SafeAreaContext.Provider>
  );
}

// ============================================
// Hooks
// ============================================

/**
 * Access safe area insets and device info
 */
export function useSafeArea() {
  return useContext(SafeAreaContext);
}

/**
 * Get styles for safe area padding
 */
export function useSafeAreaStyle(
  edges: ('top' | 'right' | 'bottom' | 'left')[] = ['top', 'bottom']
) {
  const { insets, adjustedBottom, isKeyboardVisible } = useSafeArea();

  return {
    paddingTop: edges.includes('top') ? insets.top : undefined,
    paddingRight: edges.includes('right') ? insets.right : undefined,
    paddingBottom: edges.includes('bottom')
      ? isKeyboardVisible
        ? adjustedBottom
        : insets.bottom
      : undefined,
    paddingLeft: edges.includes('left') ? insets.left : undefined,
  };
}

/**
 * Hook for managing fixed position elements with safe areas
 */
export function useFixedPosition(position: 'top' | 'bottom') {
  const { insets, adjustedBottom, isKeyboardVisible } = useSafeArea();

  if (position === 'top') {
    return {
      top: insets.top,
      paddingTop: 0,
    };
  }

  return {
    bottom: isKeyboardVisible ? adjustedBottom : insets.bottom,
    paddingBottom: 0,
  };
}

// ============================================
// Safe Area View Component
// ============================================

interface SafeAreaViewProps {
  children: ReactNode;
  edges?: ('top' | 'right' | 'bottom' | 'left')[];
  className?: string;
  style?: React.CSSProperties;
  /** Use margin instead of padding */
  mode?: 'padding' | 'margin';
}

export function SafeAreaView({
  children,
  edges = ['top', 'bottom'],
  className,
  style,
  mode = 'padding',
}: SafeAreaViewProps) {
  const safeStyle = useSafeAreaStyle(edges);

  const appliedStyle: React.CSSProperties =
    mode === 'margin'
      ? {
          marginTop: safeStyle.paddingTop,
          marginRight: safeStyle.paddingRight,
          marginBottom: safeStyle.paddingBottom,
          marginLeft: safeStyle.paddingLeft,
          ...style,
        }
      : {
          ...safeStyle,
          ...style,
        };

  return (
    <div className={className} style={appliedStyle}>
      {children}
    </div>
  );
}

// ============================================
// Edge-specific Components
// ============================================

interface SafeAreaSpacerProps {
  edge: 'top' | 'bottom';
  className?: string;
  minHeight?: number;
}

/**
 * Invisible spacer that accounts for safe area
 */
export function SafeAreaSpacer({
  edge,
  className,
  minHeight = 0,
}: SafeAreaSpacerProps) {
  const { insets, adjustedBottom, isKeyboardVisible } = useSafeArea();

  const height =
    edge === 'top'
      ? Math.max(insets.top, minHeight)
      : Math.max(isKeyboardVisible ? adjustedBottom : insets.bottom, minHeight);

  return (
    <div
      className={className}
      style={{
        height,
        minHeight,
        flexShrink: 0,
      }}
      aria-hidden="true"
    />
  );
}

// ============================================
// Dynamic Island Aware Component
// ============================================

interface DynamicIslandAwareProps {
  children: ReactNode;
  /** Additional top padding when Dynamic Island is present */
  extraPadding?: number;
}

/**
 * Component that adds extra padding for Dynamic Island
 */
export function DynamicIslandAware({
  children,
  extraPadding = 8,
}: DynamicIslandAwareProps) {
  const { hasDynamicIsland, insets } = useSafeArea();

  return (
    <div
      style={{
        paddingTop: hasDynamicIsland ? insets.top + extraPadding : insets.top,
      }}
    >
      {children}
    </div>
  );
}

// ============================================
// Home Indicator Aware Component
// ============================================

interface HomeIndicatorAwareProps {
  children: ReactNode;
  /** Minimum bottom padding even without home indicator */
  minPadding?: number;
}

/**
 * Component that accounts for home indicator
 */
export function HomeIndicatorAware({
  children,
  minPadding = 16,
}: HomeIndicatorAwareProps) {
  const { hasHomeIndicator, insets } = useSafeArea();

  return (
    <div
      style={{
        paddingBottom: hasHomeIndicator
          ? Math.max(insets.bottom, minPadding)
          : minPadding,
      }}
    >
      {children}
    </div>
  );
}

export default SafeAreaProvider;
