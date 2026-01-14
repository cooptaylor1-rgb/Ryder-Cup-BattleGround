/**
 * Pull to Refresh Component
 *
 * Native-feeling pull-to-refresh for mobile web apps.
 * Uses touch events and spring animations for smooth UX.
 *
 * Features:
 * - Smooth spring animation
 * - Haptic feedback (where supported)
 * - Customizable threshold and resistance
 * - Loading state with spinner
 */

'use client';

import { useState, useRef, useCallback, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { RefreshCw, ArrowDown } from 'lucide-react';

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  children: ReactNode;
  threshold?: number;
  resistance?: number;
  className?: string;
  disabled?: boolean;
}

type PullState = 'idle' | 'pulling' | 'ready' | 'refreshing';

export function PullToRefresh({
  onRefresh,
  children,
  threshold = 80,
  resistance = 2.5,
  className,
  disabled = false,
}: PullToRefreshProps) {
  const [pullState, setPullState] = useState<PullState>('idle');
  const [pullDistance, setPullDistance] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;

    const container = containerRef.current;
    if (!container) return;

    // Only start pull if at top of scroll
    if (container.scrollTop > 0) return;

    startYRef.current = e.touches[0].clientY;
    isPullingRef.current = true;
    setPullState('pulling');
  }, [disabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isPullingRef.current || disabled) return;

    const container = containerRef.current;
    if (!container) return;

    // Don't interfere if scrolled down
    if (container.scrollTop > 0) {
      isPullingRef.current = false;
      setPullState('idle');
      setPullDistance(0);
      return;
    }

    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;

    if (diff < 0) {
      isPullingRef.current = false;
      setPullState('idle');
      setPullDistance(0);
      return;
    }

    // Apply resistance curve for natural feel
    const adjustedDistance = Math.pow(diff, 1 / resistance) * (resistance * 2);
    setPullDistance(Math.min(adjustedDistance, threshold * 1.5));

    // Update state based on distance
    if (adjustedDistance >= threshold) {
      setPullState('ready');
      // Haptic feedback if supported
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    } else {
      setPullState('pulling');
    }

    // Prevent scroll while pulling
    if (adjustedDistance > 5) {
      e.preventDefault();
    }
  }, [disabled, threshold, resistance]);

  const handleTouchEnd = useCallback(async () => {
    if (!isPullingRef.current || disabled) return;

    isPullingRef.current = false;

    if (pullState === 'ready') {
      setPullState('refreshing');
      setPullDistance(threshold * 0.8);

      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      }

      // Animate back
      setPullState('idle');
      setPullDistance(0);
    } else {
      // Spring back
      setPullState('idle');
      setPullDistance(0);
    }
  }, [disabled, pullState, threshold, onRefresh]);

  const getIndicatorContent = () => {
    switch (pullState) {
      case 'pulling':
        return (
          <ArrowDown
            className="w-5 h-5 transition-transform"
            style={{
              transform: `rotate(${Math.min(pullDistance / threshold, 1) * 180}deg)`,
              color: 'var(--ink-secondary)',
            }}
          />
        );
      case 'ready':
        return (
          <ArrowDown
            className="w-5 h-5"
            style={{
              transform: 'rotate(180deg)',
              color: 'var(--masters)',
            }}
          />
        );
      case 'refreshing':
        return (
          <RefreshCw
            className="w-5 h-5 animate-spin"
            style={{ color: 'var(--masters)' }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-y-auto', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ touchAction: pullState === 'idle' ? 'auto' : 'none' }}
    >
      {/* Pull indicator */}
      <div
        className={cn(
          'absolute left-0 right-0 flex items-center justify-center',
          'pointer-events-none transition-opacity',
          pullState === 'idle' && 'opacity-0',
        )}
        style={{
          top: Math.max(pullDistance - 48, -48),
          height: 48,
        }}
      >
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center',
            'transition-transform shadow-lg',
          )}
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--rule)',
            transform: `scale(${Math.min(pullDistance / (threshold * 0.5), 1)})`,
          }}
        >
          {getIndicatorContent()}
        </div>
      </div>

      {/* Content with transform */}
      <div
        className="transition-transform duration-200"
        style={{
          transform: `translateY(${pullDistance}px)`,
          transitionDuration: pullState === 'idle' ? '300ms' : '0ms',
        }}
      >
        {children}
      </div>
    </div>
  );
}

/**
 * Simple pull-to-refresh trigger hook for custom implementations
 */
export function usePullToRefresh(onRefresh: () => Promise<void>) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    if (isRefreshing) return;

    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [isRefreshing, onRefresh]);

  return { isRefreshing, refresh };
}

export default PullToRefresh;
