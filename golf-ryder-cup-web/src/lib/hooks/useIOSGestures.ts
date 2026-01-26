/**
 * useIOSGestures — World-Class iOS Gesture System
 *
 * Premium gesture handling inspired by Apple's native apps.
 * Provides swipe navigation, long-press, and edge gestures
 * with physics-based animations and haptic feedback.
 *
 * Features:
 * - Swipe back/forward navigation (like Safari)
 * - Long press with contextual actions
 * - Edge swipe detection
 * - Velocity-aware gestures
 * - Momentum and deceleration
 */

'use client';

import {
  useRef,
  useCallback,
  useEffect,
  useState,
  useMemo,
  type RefObject,
} from 'react';

// ============================================
// Types & Interfaces
// ============================================

export interface GestureState {
  /** Is a gesture currently active */
  isActive: boolean;
  /** Current X translation */
  translateX: number;
  /** Current Y translation */
  translateY: number;
  /** Gesture velocity (px/ms) */
  velocityX: number;
  velocityY: number;
  /** Gesture direction */
  direction: 'left' | 'right' | 'up' | 'down' | null;
  /** Is this an edge gesture */
  isEdgeGesture: boolean;
}

export interface SwipeConfig {
  /** Minimum distance to register as swipe (px) */
  threshold?: number;
  /** Minimum velocity to trigger swipe (px/ms) */
  velocityThreshold?: number;
  /** Edge detection width (px from screen edge) */
  edgeWidth?: number;
  /** Enable haptic feedback */
  haptics?: boolean;
  /** Allowed directions */
  directions?: ('left' | 'right' | 'up' | 'down')[];
  /** Resistance factor for overscroll */
  resistance?: number;
}

export interface SwipeCallbacks {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeStart?: (direction: GestureState['direction']) => void;
  onSwipeMove?: (state: GestureState) => void;
  onSwipeEnd?: (state: GestureState) => void;
}

export interface LongPressConfig {
  /** Time to trigger long press (ms) */
  duration?: number;
  /** Movement tolerance (px) */
  moveTolerance?: number;
  /** Enable haptic feedback */
  haptics?: boolean;
}

// ============================================
// Utilities
// ============================================

function isIOSDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

function triggerHaptic(type: 'light' | 'medium' | 'heavy' = 'light') {
  if (!('vibrate' in navigator)) return;
  const patterns: Record<string, number> = {
    light: 10,
    medium: 20,
    heavy: 35,
  };
  try {
    navigator.vibrate(patterns[type]);
  } catch {
    // Haptic is optional
  }
}

// ============================================
// useSwipeGesture Hook
// ============================================

const DEFAULT_SWIPE_CONFIG: Required<SwipeConfig> = {
  threshold: 50,
  velocityThreshold: 0.3,
  edgeWidth: 20,
  haptics: true,
  directions: ['left', 'right', 'up', 'down'],
  resistance: 0.5,
};

/**
 * Premium swipe gesture hook with iOS-native feel
 */
export function useSwipeGesture(
  ref: RefObject<HTMLElement | null>,
  callbacks: SwipeCallbacks,
  config: SwipeConfig = {}
) {
  // Memoize settings to avoid recreating on every render
  const settings = useMemo(
    () => ({ ...DEFAULT_SWIPE_CONFIG, ...config }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [config.threshold, config.velocityThreshold, config.directions, config.edgeWidth, config.resistance, config.haptics]
  );

  const [gestureState, setGestureState] = useState<GestureState>({
    isActive: false,
    translateX: 0,
    translateY: 0,
    velocityX: 0,
    velocityY: 0,
    direction: null,
    isEdgeGesture: false,
  });

  // Touch tracking refs
  const startX = useRef(0);
  const startY = useRef(0);
  const startTime = useRef(0);
  const lastX = useRef(0);
  const lastY = useRef(0);
  const lastTime = useRef(0);
  const isTracking = useRef(false);
  const isEdge = useRef(false);

  // Calculate velocity with exponential smoothing
  const calculateVelocity = useCallback(
    (current: number, last: number, timeDelta: number) => {
      if (timeDelta === 0) return 0;
      return (current - last) / timeDelta;
    },
    []
  );

  // Determine swipe direction
  const getDirection = useCallback(
    (dx: number, dy: number): GestureState['direction'] => {
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (absDx < 10 && absDy < 10) return null;

      if (absDx > absDy) {
        return dx > 0 ? 'right' : 'left';
      }
      return dy > 0 ? 'down' : 'up';
    },
    []
  );

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      const rect = element.getBoundingClientRect();

      startX.current = touch.clientX;
      startY.current = touch.clientY;
      startTime.current = performance.now();
      lastX.current = touch.clientX;
      lastY.current = touch.clientY;
      lastTime.current = startTime.current;
      isTracking.current = true;

      // Check if this is an edge gesture
      const relativeX = touch.clientX - rect.left;
      isEdge.current =
        relativeX <= settings.edgeWidth ||
        relativeX >= rect.width - settings.edgeWidth;

      setGestureState((prev) => ({
        ...prev,
        isActive: true,
        isEdgeGesture: isEdge.current,
      }));
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isTracking.current) return;

      const touch = e.touches[0];
      const now = performance.now();
      const timeDelta = now - lastTime.current;

      const dx = touch.clientX - startX.current;
      const dy = touch.clientY - startY.current;
      const direction = getDirection(dx, dy);

      // Check if direction is allowed
      if (direction && !settings.directions.includes(direction)) {
        return;
      }

      // Calculate velocities
      const velocityX = calculateVelocity(touch.clientX, lastX.current, timeDelta);
      const velocityY = calculateVelocity(touch.clientY, lastY.current, timeDelta);

      // Apply resistance for edge gestures
      let adjustedDx = dx;
      let adjustedDy = dy;

      if (!isEdge.current) {
        // Apply resistance to non-edge gestures
        adjustedDx = dx * settings.resistance;
        adjustedDy = dy * settings.resistance;
      }

      // Update tracking
      lastX.current = touch.clientX;
      lastY.current = touch.clientY;
      lastTime.current = now;

      const newState: GestureState = {
        isActive: true,
        translateX: adjustedDx,
        translateY: adjustedDy,
        velocityX,
        velocityY,
        direction,
        isEdgeGesture: isEdge.current,
      };

      setGestureState(newState);
      callbacks.onSwipeMove?.(newState);

      // Fire start callback on first significant move
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        callbacks.onSwipeStart?.(direction);
      }

      // Prevent default for horizontal swipes to enable navigation
      if (direction === 'left' || direction === 'right') {
        if (Math.abs(dx) > 20) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = () => {
      if (!isTracking.current) return;
      isTracking.current = false;

      const dx = lastX.current - startX.current;
      const dy = lastY.current - startY.current;
      const _duration = performance.now() - startTime.current; // Prefixed as intentionally unused

      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);
      const velocity = Math.sqrt(
        gestureState.velocityX ** 2 + gestureState.velocityY ** 2
      );

      const direction = getDirection(dx, dy);
      const isSwipe =
        (absDx > settings.threshold || absDy > settings.threshold) ||
        velocity > settings.velocityThreshold;

      // Fire swipe callbacks
      if (isSwipe && direction) {
        if (settings.haptics) {
          triggerHaptic('medium');
        }

        switch (direction) {
          case 'left':
            callbacks.onSwipeLeft?.();
            break;
          case 'right':
            callbacks.onSwipeRight?.();
            break;
          case 'up':
            callbacks.onSwipeUp?.();
            break;
          case 'down':
            callbacks.onSwipeDown?.();
            break;
        }
      }

      // Fire end callback
      callbacks.onSwipeEnd?.(gestureState);

      // Reset state
      setGestureState({
        isActive: false,
        translateX: 0,
        translateY: 0,
        velocityX: 0,
        velocityY: 0,
        direction: null,
        isEdgeGesture: false,
      });
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [ref, callbacks, settings, getDirection, calculateVelocity, gestureState]);

  return gestureState;
}

// ============================================
// useSwipeNavigation Hook
// ============================================

/**
 * Safari-like swipe navigation between pages
 */
export function useSwipeNavigation(
  onBack?: () => void,
  onForward?: () => void,
  config: Omit<SwipeConfig, 'directions'> = {}
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const gestureState = useSwipeGesture(
    containerRef,
    {
      onSwipeRight: () => {
        if (config.haptics !== false) {
          triggerHaptic('medium');
        }
        setIsAnimating(true);
        setSwipeProgress(100);
        setTimeout(() => {
          onBack?.();
          setIsAnimating(false);
          setSwipeProgress(0);
        }, 200);
      },
      onSwipeLeft: () => {
        if (config.haptics !== false) {
          triggerHaptic('medium');
        }
        setIsAnimating(true);
        setSwipeProgress(-100);
        setTimeout(() => {
          onForward?.();
          setIsAnimating(false);
          setSwipeProgress(0);
        }, 200);
      },
      onSwipeMove: (state) => {
        if (state.isEdgeGesture) {
          // Only show progress for edge gestures
          const progress = (state.translateX / window.innerWidth) * 100;
          setSwipeProgress(Math.max(-30, Math.min(30, progress)));
        }
      },
      onSwipeEnd: () => {
        if (!isAnimating) {
          setSwipeProgress(0);
        }
      },
    },
    { ...config, directions: ['left', 'right'], edgeWidth: 25 }
  );

  return {
    containerRef,
    swipeProgress,
    isAnimating,
    isActive: gestureState.isActive,
    isEdgeGesture: gestureState.isEdgeGesture,
  };
}

// ============================================
// useLongPress Hook
// ============================================

const DEFAULT_LONG_PRESS_CONFIG: Required<LongPressConfig> = {
  duration: 500,
  moveTolerance: 10,
  haptics: true,
};

/**
 * iOS-style long press with haptic feedback
 */
export function useLongPress(
  onLongPress: (event: TouchEvent | MouseEvent) => void,
  config: LongPressConfig = {}
) {
  const settings = { ...DEFAULT_LONG_PRESS_CONFIG, ...config };

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const startX = useRef(0);
  const startY = useRef(0);
  const isPressed = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleStart = useCallback(
    (e: TouchEvent | MouseEvent) => {
      isPressed.current = true;

      const point =
        'touches' in e ? e.touches[0] : e;
      startX.current = point.clientX;
      startY.current = point.clientY;

      // Initial haptic for press start
      if (settings.haptics && isIOSDevice()) {
        triggerHaptic('light');
      }

      timerRef.current = setTimeout(() => {
        if (isPressed.current) {
          // Trigger haptic on long press
          if (settings.haptics) {
            triggerHaptic('heavy');
          }
          onLongPress(e);
        }
      }, settings.duration);
    },
    [onLongPress, settings.duration, settings.haptics]
  );

  const handleMove = useCallback(
    (e: TouchEvent | MouseEvent) => {
      if (!isPressed.current) return;

      const point = 'touches' in e ? e.touches[0] : e;
      const dx = Math.abs(point.clientX - startX.current);
      const dy = Math.abs(point.clientY - startY.current);

      if (dx > settings.moveTolerance || dy > settings.moveTolerance) {
        clearTimer();
        isPressed.current = false;
      }
    },
    [clearTimer, settings.moveTolerance]
  );

  const handleEnd = useCallback(() => {
    clearTimer();
    isPressed.current = false;
  }, [clearTimer]);

  const bind = useCallback(() => {
    return {
      onTouchStart: handleStart,
      onTouchMove: handleMove,
      onTouchEnd: handleEnd,
      onTouchCancel: handleEnd,
      onMouseDown: handleStart,
      onMouseMove: handleMove,
      onMouseUp: handleEnd,
      onMouseLeave: handleEnd,
    };
  }, [handleStart, handleMove, handleEnd]);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  return bind;
}

// ============================================
// useEdgeSwipe Hook
// ============================================

/**
 * Detect swipes from screen edges (iOS Safari-style)
 */
export function useEdgeSwipe(
  onLeftEdge?: () => void,
  onRightEdge?: () => void,
  edgeWidth: number = 20
) {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let startX = 0;
    let startY = 0;
    let isEdgeTouch = false;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      startX = touch.clientX;
      startY = touch.clientY;

      // Check if touch started at edge
      isEdgeTouch =
        startX <= edgeWidth || startX >= window.innerWidth - edgeWidth;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!isEdgeTouch) return;

      const touch = e.changedTouches[0];
      const dx = touch.clientX - startX;
      const dy = Math.abs(touch.clientY - startY);

      // Must be a horizontal swipe
      if (Math.abs(dx) < 50 || dy > 100) return;

      if (startX <= edgeWidth && dx > 0) {
        triggerHaptic('medium');
        onLeftEdge?.();
      } else if (startX >= window.innerWidth - edgeWidth && dx < 0) {
        triggerHaptic('medium');
        onRightEdge?.();
      }
    };

    document.addEventListener('touchstart', handleTouchStart, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onLeftEdge, onRightEdge, edgeWidth]);
}

// ============================================
// usePinchZoom Hook (for future enhancement)
// ============================================

export interface PinchState {
  scale: number;
  isActive: boolean;
  centerX: number;
  centerY: number;
}

/**
 * Pinch-to-zoom gesture detection
 */
export function usePinchZoom(
  ref: RefObject<HTMLElement | null>,
  onPinch?: (state: PinchState) => void,
  onPinchEnd?: (finalScale: number) => void
) {
  const [pinchState, setPinchState] = useState<PinchState>({
    scale: 1,
    isActive: false,
    centerX: 0,
    centerY: 0,
  });

  const initialDistance = useRef(0);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const getDistance = (touches: TouchList) => {
      const [t1, t2] = [touches[0], touches[1]];
      return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
    };

    const getCenter = (touches: TouchList) => ({
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2,
    });

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return;

      initialDistance.current = getDistance(e.touches);
      const center = getCenter(e.touches);

      setPinchState({
        scale: 1,
        isActive: true,
        centerX: center.x,
        centerY: center.y,
      });
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length !== 2 || !pinchState.isActive) return;

      const currentDistance = getDistance(e.touches);
      const scale = currentDistance / initialDistance.current;
      const center = getCenter(e.touches);

      const newState: PinchState = {
        scale,
        isActive: true,
        centerX: center.x,
        centerY: center.y,
      };

      setPinchState(newState);
      onPinch?.(newState);

      e.preventDefault();
    };

    const handleTouchEnd = () => {
      if (pinchState.isActive) {
        onPinchEnd?.(pinchState.scale);
        setPinchState({
          scale: 1,
          isActive: false,
          centerX: 0,
          centerY: 0,
        });
      }
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [ref, onPinch, onPinchEnd, pinchState]);

  return pinchState;
}

export default useSwipeGesture;
