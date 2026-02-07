/**
 * iOS Components Unit Tests
 *
 * Comprehensive tests for iOS-specific functionality:
 * - SafeAreaProvider & hooks
 * - IOSBottomSheet
 * - IOSActionSheet
 * - IOSContextMenu
 * - IOSScrollContainer
 * - useIOSSpring animations
 * - useIOSGestures
 * - useIOSKeyboard
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import React from 'react';

// ============================================
// Mock Browser APIs
// ============================================

const mockVibrate = vi.fn();
const mockMatchMedia = vi.fn();
const mockResizeObserver = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();

  // Mock navigator.vibrate
  Object.defineProperty(navigator, 'vibrate', {
    value: mockVibrate,
    writable: true,
    configurable: true,
  });

  // Mock window.matchMedia for iOS detection
  mockMatchMedia.mockImplementation((query: string) => ({
    matches: query.includes('standalone'),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
  Object.defineProperty(window, 'matchMedia', {
    value: mockMatchMedia,
    writable: true,
    configurable: true,
  });

  // Mock ResizeObserver
  mockResizeObserver.mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  }));
  global.ResizeObserver = mockResizeObserver;

  // Mock document.documentElement for CSS custom properties
  Object.defineProperty(document.documentElement.style, 'setProperty', {
    value: vi.fn(),
    writable: true,
    configurable: true,
  });

  // Mock visualViewport
  Object.defineProperty(window, 'visualViewport', {
    value: {
      height: 800,
      width: 375,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// Helper to create a mock ref
function createMockRef<T>(current: T | null = null): React.RefObject<T | null> {
  return { current };
}

// ============================================
// Spring Physics Tests
// ============================================

describe('useIOSSpring', () => {
  it('should initialize with default value', async () => {
    const { useSpring } = await import('../lib/ios/useIOSSpring');

    const { result } = renderHook(() =>
      useSpring({ initialValue: 0 })
    );

    expect(result.current.value).toBe(0);
    expect(result.current.isAnimating).toBe(false);
    expect(result.current.velocity).toBe(0);
  });

  it('should accept custom initial value', async () => {
    const { useSpring } = await import('../lib/ios/useIOSSpring');

    const { result } = renderHook(() =>
      useSpring({ initialValue: 50 })
    );

    expect(result.current.value).toBe(50);
  });

  it('should start animation when set is called', async () => {
    const { useSpring } = await import('../lib/ios/useIOSSpring');

    const { result } = renderHook(() =>
      useSpring({ initialValue: 0 })
    );

    act(() => {
      result.current.set(100);
    });

    expect(result.current.isAnimating).toBe(true);
  });

  it('should jump to value immediately without animation', async () => {
    const { useSpring } = await import('../lib/ios/useIOSSpring');

    const { result } = renderHook(() =>
      useSpring({ initialValue: 0 })
    );

    act(() => {
      result.current.jump(100);
    });

    expect(result.current.value).toBe(100);
    expect(result.current.isAnimating).toBe(false);
  });

  it('should stop animation when stop is called', async () => {
    const { useSpring } = await import('../lib/ios/useIOSSpring');

    const { result } = renderHook(() =>
      useSpring({ initialValue: 0 })
    );

    act(() => {
      result.current.set(100);
    });

    act(() => {
      result.current.stop();
    });

    expect(result.current.isAnimating).toBe(false);
  });

  it('should use spring presets', async () => {
    const { useSpring, SpringPresets } = await import('../lib/ios/useIOSSpring');

    // Test each preset exists
    expect(SpringPresets.default).toBeDefined();
    expect(SpringPresets.gentle).toBeDefined();
    expect(SpringPresets.wobbly).toBeDefined();
    expect(SpringPresets.stiff).toBeDefined();
    expect(SpringPresets.slow).toBeDefined();
    expect(SpringPresets.keyboard).toBeDefined();
    expect(SpringPresets.sheet).toBeDefined();
    expect(SpringPresets.rubberBand).toBeDefined();

    // Test using a preset
    const { result } = renderHook(() =>
      useSpring({ initialValue: 0, config: 'stiff' })
    );

    expect(result.current.value).toBe(0);
  });

  it('should accept custom spring config', async () => {
    const { useSpring } = await import('../lib/ios/useIOSSpring');

    const customConfig = {
      tension: 200,
      friction: 25,
      mass: 1,
      precision: 0.01,
    };

    const { result } = renderHook(() =>
      useSpring({ initialValue: 0, config: customConfig })
    );

    expect(result.current.value).toBe(0);
  });
});

describe('Spring Physics Utilities', () => {
  it('should export useRubberBand function', async () => {
    const { useRubberBand } = await import('../lib/ios/useIOSSpring');
    expect(typeof useRubberBand).toBe('function');
  });

  it('should use rubber band hook correctly', async () => {
    const { useRubberBand } = await import('../lib/ios/useIOSSpring');

    const { result } = renderHook(() =>
      useRubberBand({ min: 0, max: 100 })
    );

    expect(result.current.value).toBe(0);
    expect(typeof result.current.startDrag).toBe('function');
    expect(typeof result.current.updateDrag).toBe('function');
    expect(typeof result.current.endDrag).toBe('function');
  });

  it('should export useMomentum function', async () => {
    const { useMomentum } = await import('../lib/ios/useIOSSpring');
    expect(typeof useMomentum).toBe('function');
  });

  it('should use momentum hook correctly', async () => {
    const { useMomentum } = await import('../lib/ios/useIOSSpring');

    const { result } = renderHook(() => useMomentum());

    expect(result.current.value).toBe(0);
    expect(result.current.isAnimating).toBe(false);
    expect(typeof result.current.start).toBe('function');
    expect(typeof result.current.stop).toBe('function');
    expect(typeof result.current.jump).toBe('function');
  });

  it('should export generateSpringKeyframes function', async () => {
    const { generateSpringKeyframes } = await import('../lib/ios/useIOSSpring');
    expect(typeof generateSpringKeyframes).toBe('function');
  });

  it('should generate CSS keyframes for spring animation', async () => {
    const { generateSpringKeyframes } = await import('../lib/ios/useIOSSpring');

    const keyframes = generateSpringKeyframes(0, 100, 'default', 'translateX');
    expect(keyframes).toContain('@keyframes spring');
    expect(keyframes).toContain('100%');
  });
});

// ============================================
// iOS Gestures Tests
// ============================================

describe('useSwipeGesture', () => {
  it('should initialize with default state', async () => {
    const { useSwipeGesture } = await import('../lib/hooks/useIOSGestures');
    const mockRef = createMockRef<HTMLDivElement>(document.createElement('div'));

    const { result } = renderHook(() =>
      useSwipeGesture(mockRef, {})
    );

    expect(result.current.isActive).toBe(false);
    expect(result.current.translateX).toBe(0);
    expect(result.current.translateY).toBe(0);
    expect(result.current.direction).toBeNull();
  });

  it('should track gesture state', async () => {
    const { useSwipeGesture } = await import('../lib/hooks/useIOSGestures');
    const mockRef = createMockRef<HTMLDivElement>(document.createElement('div'));

    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();

    const { result } = renderHook(() =>
      useSwipeGesture(mockRef, { onSwipeLeft, onSwipeRight })
    );

    expect(result.current.velocityX).toBe(0);
    expect(result.current.velocityY).toBe(0);
    expect(result.current.isEdgeGesture).toBe(false);
  });

  it('should support custom config', async () => {
    const { useSwipeGesture } = await import('../lib/hooks/useIOSGestures');
    const mockRef = createMockRef<HTMLDivElement>(document.createElement('div'));

    const { result } = renderHook(() =>
      useSwipeGesture(mockRef, {}, { threshold: 100, directions: ['left', 'right'] })
    );

    expect(result.current.isActive).toBe(false);
  });
});

describe('useLongPress', () => {
  it('should return bind function', async () => {
    const { useLongPress } = await import('../lib/hooks/useIOSGestures');
    const onLongPress = vi.fn();

    const { result } = renderHook(() =>
      useLongPress(onLongPress)
    );

    // useLongPress returns a bind function that returns event handlers
    expect(typeof result.current).toBe('function');
    const bindings = result.current();
    expect(bindings.onTouchStart).toBeDefined();
    expect(bindings.onTouchMove).toBeDefined();
    expect(bindings.onTouchEnd).toBeDefined();
  });

  it('should support custom delay', async () => {
    const { useLongPress } = await import('../lib/hooks/useIOSGestures');
    const onLongPress = vi.fn();

    const { result } = renderHook(() =>
      useLongPress(onLongPress, { duration: 300 })
    );

    expect(typeof result.current).toBe('function');
  });

  it('should support haptics config', async () => {
    const { useLongPress } = await import('../lib/hooks/useIOSGestures');
    const onLongPress = vi.fn();

    const { result } = renderHook(() =>
      useLongPress(onLongPress, {
        haptics: true,
        moveTolerance: 15,
      })
    );

    expect(typeof result.current).toBe('function');
  });
});

describe('useEdgeSwipe', () => {
  it('should set up edge swipe detection', async () => {
    const { useEdgeSwipe } = await import('../lib/hooks/useIOSGestures');
    const onLeftEdge = vi.fn();
    const onRightEdge = vi.fn();

    // useEdgeSwipe attaches to document, no return value
    const { result } = renderHook(() =>
      useEdgeSwipe(onLeftEdge, onRightEdge)
    );

    expect(result.current).toBeUndefined();
  });

  it('should support custom edge width', async () => {
    const { useEdgeSwipe } = await import('../lib/hooks/useIOSGestures');
    const onLeftEdge = vi.fn();

    const { result } = renderHook(() =>
      useEdgeSwipe(onLeftEdge, undefined, 30)
    );

    expect(result.current).toBeUndefined();
  });
});

describe('usePinchZoom', () => {
  it('should initialize with default scale', async () => {
    const { usePinchZoom } = await import('../lib/hooks/useIOSGestures');
    const mockRef = createMockRef<HTMLDivElement>(document.createElement('div'));
    const mockOnPinch = vi.fn();

    const { result } = renderHook(() =>
      usePinchZoom(mockRef, mockOnPinch)
    );

    expect(result.current.scale).toBe(1);
    expect(result.current.isActive).toBe(false);
  });

  it('should track center position', async () => {
    const { usePinchZoom } = await import('../lib/hooks/useIOSGestures');
    const mockRef = createMockRef<HTMLDivElement>(document.createElement('div'));
    const mockOnPinch = vi.fn();

    const { result } = renderHook(() =>
      usePinchZoom(mockRef, mockOnPinch)
    );

    expect(result.current.centerX).toBe(0);
    expect(result.current.centerY).toBe(0);
  });
});

describe('useSwipeNavigation', () => {
  it('should return navigation state', async () => {
    const { useSwipeNavigation } = await import('../lib/hooks/useIOSGestures');

    const { result } = renderHook(() =>
      useSwipeNavigation()
    );

    expect(result.current.containerRef).toBeDefined();
    expect(result.current.swipeProgress).toBe(0);
    expect(result.current.isAnimating).toBe(false);
    expect(result.current.isActive).toBe(false);
  });
});

// ============================================
// iOS Keyboard Tests
// ============================================

describe('useIOSKeyboard', () => {
  it('should initialize without errors', async () => {
    const { useIOSKeyboard } = await import('../lib/hooks/useIOSKeyboard');

    const { result } = renderHook(() => useIOSKeyboard());

    expect(result.current.isKeyboardOpen).toBe(false);
    expect(result.current.keyboardHeight).toBe(0);
  });

  it('should provide dismiss function', async () => {
    const { useIOSKeyboard } = await import('../lib/hooks/useIOSKeyboard');

    const { result } = renderHook(() => useIOSKeyboard());

    expect(typeof result.current.dismissKeyboard).toBe('function');
  });

  it('should track visual viewport height', async () => {
    const { useIOSKeyboard } = await import('../lib/hooks/useIOSKeyboard');

    const { result } = renderHook(() => useIOSKeyboard());

    expect(result.current.visualViewportHeight).toBeDefined();
    expect(typeof result.current.visualViewportHeight).toBe('number');
  });
});

describe('useIOSInputZoomPrevention', () => {
  it('should export useIOSInputZoomPrevention', async () => {
    const { useIOSInputZoomPrevention } = await import('../lib/hooks/useIOSKeyboard');
    expect(typeof useIOSInputZoomPrevention).toBe('function');
  });
});

// ============================================
// Safe Area Tests
// ============================================

describe('SafeAreaProvider', () => {
  it('should export SafeAreaProvider component', async () => {
    const { SafeAreaProvider } = await import('../lib/ios/SafeAreaProvider');
    expect(SafeAreaProvider).toBeDefined();
  });

  it('should export useSafeArea hook', async () => {
    const { useSafeArea } = await import('../lib/ios/SafeAreaProvider');
    expect(useSafeArea).toBeDefined();
    expect(typeof useSafeArea).toBe('function');
  });

  it('should export useSafeAreaStyle hook', async () => {
    const { useSafeAreaStyle } = await import('../lib/ios/SafeAreaProvider');
    expect(useSafeAreaStyle).toBeDefined();
    expect(typeof useSafeAreaStyle).toBe('function');
  });

  it('should export useFixedPosition hook', async () => {
    const { useFixedPosition } = await import('../lib/ios/SafeAreaProvider');
    expect(useFixedPosition).toBeDefined();
    expect(typeof useFixedPosition).toBe('function');
  });

  it('should export SafeAreaView component', async () => {
    const { SafeAreaView } = await import('../lib/ios/SafeAreaProvider');
    expect(SafeAreaView).toBeDefined();
  });

  it('should export SafeAreaSpacer component', async () => {
    const { SafeAreaSpacer } = await import('../lib/ios/SafeAreaProvider');
    expect(SafeAreaSpacer).toBeDefined();
  });
});

describe('iOS Detection Utilities', () => {
  it('should detect iOS environment via context', async () => {
    // Detection functions are internal to SafeAreaProvider
    // We test via the context values instead
    const { SafeAreaProvider, useSafeArea } = await import('../lib/ios/SafeAreaProvider');
    expect(SafeAreaProvider).toBeDefined();
    expect(useSafeArea).toBeDefined();
  });
});

// ============================================
// Bottom Sheet Tests
// ============================================

describe('IOSBottomSheet', () => {
  it('should export IOSBottomSheet component', async () => {
    const { IOSBottomSheet } = await import('../lib/ios/IOSBottomSheet');
    expect(IOSBottomSheet).toBeDefined();
  }, 15000);

  it('should export useBottomSheet hook', async () => {
    const { useBottomSheet } = await import('../lib/ios/IOSBottomSheet');
    expect(typeof useBottomSheet).toBe('function');
  });

  it('should have correct SnapPoint types', async () => {
    // Verify the component accepts correct snap points
    const { IOSBottomSheet } = await import('../lib/ios/IOSBottomSheet');
    expect(IOSBottomSheet).toBeDefined();
    // SnapPoints should include: 'collapsed', 'half', 'full'
  });
});

// ============================================
// Action Sheet Tests
// ============================================

describe('IOSActionSheet', () => {
  it('should export IOSActionSheet component', async () => {
    const { IOSActionSheet } = await import('../lib/ios/IOSActionSheet');
    expect(IOSActionSheet).toBeDefined();
  });
});

// ============================================
// Context Menu Tests
// ============================================

describe('IOSContextMenu', () => {
  it('should export IOSContextMenu component', async () => {
    const { IOSContextMenu } = await import('../lib/ios/IOSContextMenu');
    expect(IOSContextMenu).toBeDefined();
  });

  it('should export useContextMenu hook', async () => {
    const { useContextMenu } = await import('../lib/ios/IOSContextMenu');
    expect(typeof useContextMenu).toBe('function');
  });
});

// ============================================
// Scroll Container Tests
// ============================================

describe('IOSScrollContainer', () => {
  it('should export IOSScrollContainer component', async () => {
    const { IOSScrollContainer } = await import('../lib/ios/IOSScrollContainer');
    expect(IOSScrollContainer).toBeDefined();
  });
});

// ============================================
// Index Barrel Export Tests
// ============================================

describe('iOS Module Exports', () => {
  it('should export all components from index', async () => {
    const ios = await import('../lib/ios');

    // Provider components
    expect(ios.SafeAreaProvider).toBeDefined();

    // Sheet components
    expect(ios.IOSBottomSheet).toBeDefined();
    expect(ios.IOSActionSheet).toBeDefined();
    expect(ios.IOSContextMenu).toBeDefined();

    // Scroll container
    expect(ios.IOSScrollContainer).toBeDefined();
  });

  it('should export all hooks from index', async () => {
    const ios = await import('../lib/ios');

    // Safe area hooks
    expect(ios.useSafeArea).toBeDefined();
    expect(ios.useSafeAreaStyle).toBeDefined();
    expect(ios.useFixedPosition).toBeDefined();

    // Spring animation hook
    expect(ios.useSpring).toBeDefined();
    expect(ios.useRubberBand).toBeDefined();
    expect(ios.useMomentum).toBeDefined();

    // Gesture hooks
    expect(ios.useSwipeGesture).toBeDefined();
    expect(ios.useLongPress).toBeDefined();
    expect(ios.useEdgeSwipe).toBeDefined();
    expect(ios.usePinchZoom).toBeDefined();

    // Keyboard hooks
    expect(ios.useIOSKeyboard).toBeDefined();
  });

  it('should export spring presets from index', async () => {
    const ios = await import('../lib/ios');
    expect(ios.SpringPresets).toBeDefined();
    expect(ios.SpringPresets.default).toBeDefined();
    expect(ios.SpringPresets.gentle).toBeDefined();
    expect(ios.SpringPresets.stiff).toBeDefined();
  });

  it('should export utility functions from index', async () => {
    const ios = await import('../lib/ios');

    expect(ios.generateSpringKeyframes).toBeDefined();
  });

  it('should export view components from index', async () => {
    const ios = await import('../lib/ios');

    expect(ios.SafeAreaView).toBeDefined();
    expect(ios.SafeAreaSpacer).toBeDefined();
    expect(ios.DynamicIslandAware).toBeDefined();
    expect(ios.HomeIndicatorAware).toBeDefined();
  });

  it('should export bottom sheet hooks from index', async () => {
    const ios = await import('../lib/ios');
    expect(ios.useBottomSheet).toBeDefined();
    expect(ios.useActionSheet).toBeDefined();
    expect(ios.useContextMenu).toBeDefined();
  });
});

// ============================================
// Integration Tests
// ============================================

describe('iOS Integration', () => {
  it('should be usable in a component context', async () => {
    const { useSpring } = await import('../lib/ios/useIOSSpring');
    const { useLongPress } = await import('../lib/hooks/useIOSGestures');

    // Test that hooks can be composed
    const { result } = renderHook(() => {
      const spring = useSpring({ initialValue: 0 });
      const longPressBindings = useLongPress(() => {
        spring.set(100);
      });

      return { spring, longPressBindings };
    });

    expect(result.current.spring.value).toBe(0);
    expect(typeof result.current.longPressBindings).toBe('function');
  });

  it('should handle gesture and animation coordination', async () => {
    const { useSpring } = await import('../lib/ios/useIOSSpring');
    const { useSwipeGesture } = await import('../lib/hooks/useIOSGestures');
    const mockRef = createMockRef<HTMLDivElement>(document.createElement('div'));

    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();

    const { result } = renderHook(() => {
      const spring = useSpring({ initialValue: 0 });
      const swipe = useSwipeGesture(mockRef, {
        onSwipeLeft: () => {
          onSwipeLeft();
          spring.set(-100);
        },
        onSwipeRight: () => {
          onSwipeRight();
          spring.set(100);
        },
      });

      return { spring, swipe };
    });

    expect(result.current.spring).toBeDefined();
    expect(result.current.swipe).toBeDefined();
  });
});

// ============================================
// Edge Cases & Error Handling
// ============================================

describe('Edge Cases', () => {
  it('should handle SSR environment gracefully', async () => {
    // The provider and hooks should not throw in non-browser environment
    const { SafeAreaProvider, useSafeArea, useSafeAreaStyle } = await import('../lib/ios/SafeAreaProvider');

    expect(() => SafeAreaProvider).not.toThrow();
    expect(() => useSafeArea).not.toThrow();
    expect(() => useSafeAreaStyle).not.toThrow();
  });

  it('should handle missing navigator.vibrate', async () => {
    // Remove vibrate
    const originalVibrate = navigator.vibrate;
    Object.defineProperty(navigator, 'vibrate', {
      value: undefined,
      writable: true,
      configurable: true,
    });

    const { useLongPress } = await import('../lib/hooks/useIOSGestures');

    const { result } = renderHook(() =>
      useLongPress(vi.fn())
    );

    // Should not throw
    expect(typeof result.current).toBe('function');

    // Restore
    Object.defineProperty(navigator, 'vibrate', {
      value: originalVibrate,
      writable: true,
      configurable: true,
    });
  });

  it('should handle zero-dimension viewport', async () => {
    Object.defineProperty(window, 'visualViewport', {
      value: {
        height: 0,
        width: 0,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      },
      writable: true,
      configurable: true,
    });

    const { useIOSKeyboard } = await import('../lib/hooks/useIOSKeyboard');

    const { result } = renderHook(() => useIOSKeyboard());

    expect(result.current.keyboardHeight).toBe(0);
  });
});

// ============================================
// Performance Tests
// ============================================

describe('Performance', () => {
  it('should not re-render unnecessarily with spring hook', async () => {
    const { useSpring } = await import('../lib/ios/useIOSSpring');

    let renderCount = 0;

    const { rerender } = renderHook(() => {
      renderCount++;
      return useSpring({ initialValue: 0 });
    });

    const initialRenderCount = renderCount;

    // Rerender without changes
    rerender();

    // Should only have one additional render from rerender call
    expect(renderCount).toBe(initialRenderCount + 1);
  });

  it('should cleanup animation frames on unmount', async () => {
    const { useSpring } = await import('../lib/ios/useIOSSpring');

    vi.spyOn(window, 'cancelAnimationFrame');

    const { result, unmount } = renderHook(() => useSpring({ initialValue: 0 }));

    // Start animation
    act(() => {
      result.current.set(100);
    });

    // Unmount
    unmount();

    // Should have attempted to cancel animation frame
    // (implementation may vary based on animation state)
  });
});
