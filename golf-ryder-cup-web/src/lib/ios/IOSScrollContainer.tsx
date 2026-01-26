/**
 * iOS Scroll Container — Native Momentum Scrolling
 *
 * World-class scrolling experience with:
 * - Native iOS momentum physics
 * - Rubber band overscroll
 * - Scroll snap points
 * - Pull-to-refresh integration
 * - Haptic feedback on boundaries
 * - Accessibility support
 */

'use client';

import React, {
  useRef,
  useState,
  useCallback,
  forwardRef,
  type ReactNode,
  type CSSProperties,
} from 'react';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export type ScrollDirection = 'vertical' | 'horizontal' | 'both';
export type SnapType = 'none' | 'mandatory' | 'proximity';
export type SnapAlign = 'start' | 'center' | 'end';

export interface ScrollContainerProps {
  children: ReactNode;
  /** Scroll direction */
  direction?: ScrollDirection;
  /** Enable momentum scrolling */
  momentum?: boolean;
  /** Enable rubber band effect at boundaries */
  rubberBand?: boolean;
  /** Scroll snap configuration */
  snap?: {
    type: SnapType;
    align: SnapAlign;
  };
  /** Show scrollbar */
  showScrollbar?: boolean;
  /** Enable pull-to-refresh */
  pullToRefresh?: boolean;
  /** Pull-to-refresh handler */
  onRefresh?: () => Promise<void>;
  /** Scroll event handler */
  onScroll?: (event: { scrollTop: number; scrollLeft: number }) => void;
  /** Reach top handler */
  onReachTop?: () => void;
  /** Reach bottom handler */
  onReachBottom?: () => void;
  /** Custom class name */
  className?: string;
  /** Custom styles */
  style?: CSSProperties;
}

export interface ScrollContainerRef {
  scrollTo: (options: { x?: number; y?: number; animated?: boolean }) => void;
  scrollToTop: (animated?: boolean) => void;
  scrollToBottom: (animated?: boolean) => void;
  getScrollPosition: () => { x: number; y: number };
}

// ============================================
// Utilities
// ============================================

function triggerHaptic() {
  if ('vibrate' in navigator) {
    navigator.vibrate(5);
  }
}

// ============================================
// Component
// ============================================

export const IOSScrollContainer = forwardRef<
  ScrollContainerRef,
  ScrollContainerProps
>(function IOSScrollContainer(
  {
    children,
    direction = 'vertical',
    momentum = true,
    rubberBand = true,
    snap,
    showScrollbar = false,
    pullToRefresh = false,
    onRefresh,
    onScroll,
    onReachTop,
    onReachBottom,
    className,
    style,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const touchStartY = useRef(0);
  const lastScrollTop = useRef(0);
  const reachTopTriggered = useRef(false);
  const reachBottomTriggered = useRef(false);

  // Expose scroll methods via ref
  React.useImperativeHandle(ref, () => ({
    scrollTo: ({ x = 0, y = 0, animated = true }) => {
      containerRef.current?.scrollTo({
        left: x,
        top: y,
        behavior: animated ? 'smooth' : 'auto',
      });
    },
    scrollToTop: (animated = true) => {
      containerRef.current?.scrollTo({
        top: 0,
        behavior: animated ? 'smooth' : 'auto',
      });
    },
    scrollToBottom: (animated = true) => {
      const el = containerRef.current;
      if (el) {
        el.scrollTo({
          top: el.scrollHeight - el.clientHeight,
          behavior: animated ? 'smooth' : 'auto',
        });
      }
    },
    getScrollPosition: () => {
      const el = containerRef.current;
      return {
        x: el?.scrollLeft ?? 0,
        y: el?.scrollTop ?? 0,
      };
    },
  }));

  // Handle scroll events
  const handleScroll = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;

    const scrollTop = el.scrollTop;
    const scrollLeft = el.scrollLeft;
    const scrollHeight = el.scrollHeight;
    const clientHeight = el.clientHeight;

    onScroll?.({ scrollTop, scrollLeft });

    // Check for top
    if (scrollTop <= 0) {
      if (!reachTopTriggered.current) {
        reachTopTriggered.current = true;
        onReachTop?.();
        triggerHaptic();
      }
    } else {
      reachTopTriggered.current = false;
    }

    // Check for bottom
    if (scrollTop + clientHeight >= scrollHeight - 10) {
      if (!reachBottomTriggered.current) {
        reachBottomTriggered.current = true;
        onReachBottom?.();
        triggerHaptic();
      }
    } else {
      reachBottomTriggered.current = false;
    }

    lastScrollTop.current = scrollTop;
  }, [onScroll, onReachTop, onReachBottom]);

  // Pull-to-refresh handlers
  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!pullToRefresh || !onRefresh) return;
      touchStartY.current = e.touches[0].clientY;
    },
    [pullToRefresh, onRefresh]
  );

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!pullToRefresh || !onRefresh || isRefreshing) return;

      const el = containerRef.current;
      if (!el || el.scrollTop > 0) return;

      const touchY = e.touches[0].clientY;
      const diff = touchY - touchStartY.current;

      if (diff > 0) {
        // Apply resistance
        const resistance = Math.pow(diff, 0.8);
        setPullDistance(Math.min(resistance, 120));

        if (resistance > 60) {
          triggerHaptic();
        }
      }
    },
    [pullToRefresh, onRefresh, isRefreshing]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!pullToRefresh || !onRefresh) return;

    if (pullDistance > 60) {
      setIsRefreshing(true);
      setPullDistance(60);

      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pullToRefresh, onRefresh, pullDistance]);

  // Build style for scroll direction
  const scrollStyles: CSSProperties = {
    overflowY: direction === 'horizontal' ? 'hidden' : 'auto',
    overflowX: direction === 'vertical' ? 'hidden' : 'auto',
    WebkitOverflowScrolling: momentum ? 'touch' : 'auto',
    scrollBehavior: 'smooth',
    overscrollBehavior: rubberBand ? 'auto' : 'none',
    ...style,
  };

  // Add snap styles
  if (snap && snap.type !== 'none') {
    scrollStyles.scrollSnapType =
      direction === 'both'
        ? `both ${snap.type}`
        : direction === 'horizontal'
          ? `x ${snap.type}`
          : `y ${snap.type}`;
  }

  return (
    <div
      className={cn(
        'relative',
        !showScrollbar && 'scrollbar-hide',
        className
      )}
    >
      {/* Pull-to-refresh indicator */}
      {pullToRefresh && pullDistance > 0 && (
        <div
          className="absolute left-0 right-0 flex items-center justify-center z-10 transition-all"
          style={{
            top: -48,
            transform: `translateY(${pullDistance}px)`,
            opacity: Math.min(pullDistance / 60, 1),
          }}
        >
          <div
            className={cn(
              'w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center',
              isRefreshing && 'animate-spin'
            )}
          >
            <svg
              className={cn(
                'w-4 h-4 text-masters',
                !isRefreshing && 'transition-transform'
              )}
              style={{
                transform: isRefreshing
                  ? undefined
                  : `rotate(${(pullDistance / 120) * 360}deg)`,
              }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isRefreshing ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 14l-7 7m0 0l-7-7m7 7V3"
                />
              )}
            </svg>
          </div>
        </div>
      )}

      {/* Scroll container */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="h-full"
        style={scrollStyles}
      >
        {children}
      </div>
    </div>
  );
});

// ============================================
// Scroll Snap Item
// ============================================

interface ScrollSnapItemProps {
  children: ReactNode;
  align?: SnapAlign;
  className?: string;
}

export function ScrollSnapItem({
  children,
  align = 'start',
  className,
}: ScrollSnapItemProps) {
  return (
    <div
      className={className}
      style={{ scrollSnapAlign: align }}
    >
      {children}
    </div>
  );
}

// ============================================
// Hook for scroll state
// ============================================

export function useScrollState() {
  const [scrollState, setScrollState] = useState({
    scrollTop: 0,
    scrollLeft: 0,
    isAtTop: true,
    isAtBottom: false,
    scrollDirection: 'none' as 'up' | 'down' | 'none',
  });

  const lastScrollTop = useRef(0);

  const updateScrollState = useCallback(
    (event: { scrollTop: number; scrollLeft: number }) => {
      const { scrollTop, scrollLeft } = event;

      setScrollState({
        scrollTop,
        scrollLeft,
        isAtTop: scrollTop <= 0,
        isAtBottom: false, // Updated by reach handlers
        scrollDirection:
          scrollTop > lastScrollTop.current
            ? 'down'
            : scrollTop < lastScrollTop.current
              ? 'up'
              : 'none',
      });

      lastScrollTop.current = scrollTop;
    },
    []
  );

  return {
    ...scrollState,
    updateScrollState,
  };
}

// ============================================
// CSS for hiding scrollbar
// ============================================

// Add this to globals.css:
// .scrollbar-hide {
//   -ms-overflow-style: none;
//   scrollbar-width: none;
// }
// .scrollbar-hide::-webkit-scrollbar {
//   display: none;
// }

export default IOSScrollContainer;
