/**
 * iOS Bottom Sheet — World-Class Modal Experience
 *
 * Native-feeling bottom sheet with:
 * - Drag to dismiss with velocity-based animations
 * - Snap points (collapsed, half, full)
 * - Backdrop blur and proper stacking
 * - Keyboard-aware positioning
 * - Haptic feedback on snap
 * - Accessibility support
 *
 * Inspired by Apple's native UISheetPresentationController
 */

'use client';

import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  forwardRef,
  useImperativeHandle,
  type ReactNode,
} from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export type SnapPoint = 'collapsed' | 'half' | 'full';

export interface BottomSheetProps {
  /** Is the sheet open */
  isOpen: boolean;
  /** Callback when sheet should close */
  onClose: () => void;
  /** Content to render in the sheet */
  children: ReactNode;
  /** Available snap points */
  snapPoints?: SnapPoint[];
  /** Initial snap point */
  initialSnap?: SnapPoint;
  /** Title for the header */
  title?: string;
  /** Show close button */
  showCloseButton?: boolean;
  /** Show drag handle */
  showHandle?: boolean;
  /** Enable backdrop tap to close */
  closeOnBackdrop?: boolean;
  /** Enable swipe to dismiss */
  enableSwipeToDismiss?: boolean;
  /** Custom height for collapsed state (%) */
  collapsedHeight?: number;
  /** Custom height for half state (%) */
  halfHeight?: number;
  /** Enable haptic feedback */
  haptics?: boolean;
  /** Additional class for sheet content */
  className?: string;
  /** Callback when snap point changes */
  onSnapChange?: (snap: SnapPoint) => void;
}

export interface BottomSheetRef {
  snapTo: (point: SnapPoint) => void;
  close: () => void;
}

// ============================================
// Utilities
// ============================================

function triggerHaptic(type: 'light' | 'medium' = 'light') {
  if ('vibrate' in navigator) {
    navigator.vibrate(type === 'light' ? 10 : 20);
  }
}

function getSnapPointHeight(
  snap: SnapPoint,
  collapsedHeight: number,
  halfHeight: number
): number {
  switch (snap) {
    case 'collapsed':
      return collapsedHeight;
    case 'half':
      return halfHeight;
    case 'full':
      return 95; // Leave room for status bar
    default:
      return halfHeight;
  }
}

// ============================================
// Component
// ============================================

export const IOSBottomSheet = forwardRef<BottomSheetRef, BottomSheetProps>(
  function IOSBottomSheet(
    {
      isOpen,
      onClose,
      children,
      snapPoints = ['half', 'full'],
      initialSnap = 'half',
      title,
      showCloseButton = true,
      showHandle = true,
      closeOnBackdrop = true,
      enableSwipeToDismiss = true,
      collapsedHeight = 25,
      halfHeight = 50,
      haptics = true,
      className,
      onSnapChange,
    },
    ref
  ) {
    // State
    const [currentSnap, setCurrentSnap] = useState<SnapPoint>(initialSnap);
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    // Refs
    const sheetRef = useRef<HTMLDivElement>(null);
    const startY = useRef(0);
    const startHeight = useRef(0);
    const velocityRef = useRef(0);
    const lastY = useRef(0);
    const lastTime = useRef(0);

    // Calculate current height
    const currentHeight = getSnapPointHeight(
      currentSnap,
      collapsedHeight,
      halfHeight
    );

    // Snap to a specific point
    const snapTo = useCallback(
      (point: SnapPoint) => {
        if (!snapPoints.includes(point)) return;

        setIsAnimating(true);
        setCurrentSnap(point);
        setDragOffset(0);

        if (haptics) {
          triggerHaptic('medium');
        }

        onSnapChange?.(point);

        setTimeout(() => setIsAnimating(false), 300);
      },
      [snapPoints, haptics, onSnapChange]
    );

    // Close the sheet
    const close = useCallback(() => {
      setIsAnimating(true);
      setTimeout(() => {
        onClose();
        setIsAnimating(false);
        setCurrentSnap(initialSnap);
        setDragOffset(0);
      }, 200);
    }, [onClose, initialSnap]);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({ snapTo, close }), [snapTo, close]);

    // Handle drag start
    const handleDragStart = useCallback(
      (clientY: number) => {
        if (!enableSwipeToDismiss && snapPoints.length === 1) return;

        setIsDragging(true);
        startY.current = clientY;
        startHeight.current = currentHeight;
        lastY.current = clientY;
        lastTime.current = performance.now();
        velocityRef.current = 0;
      },
      [currentHeight, enableSwipeToDismiss, snapPoints.length]
    );

    // Handle drag move
    const handleDragMove = useCallback(
      (clientY: number) => {
        if (!isDragging) return;

        const now = performance.now();
        const timeDelta = now - lastTime.current;

        // Calculate velocity
        if (timeDelta > 0) {
          velocityRef.current = (clientY - lastY.current) / timeDelta;
        }

        lastY.current = clientY;
        lastTime.current = now;

        // Calculate offset (positive = dragging down)
        const diff = clientY - startY.current;
        setDragOffset(diff);

        // Haptic at resistance point
        if (diff < -50 && haptics) {
          triggerHaptic('light');
        }
      },
      [isDragging, haptics]
    );

    // Handle drag end
    const handleDragEnd = useCallback(() => {
      if (!isDragging) return;

      setIsDragging(false);
      const velocity = velocityRef.current;
      const offset = dragOffset;

      // Determine action based on velocity and offset
      const shouldClose =
        enableSwipeToDismiss && (velocity > 0.5 || offset > window.innerHeight * 0.3);

      if (shouldClose) {
        close();
        return;
      }

      // Find closest snap point
      const currentHeightPx = (currentHeight / 100) * window.innerHeight;
      const newHeightPx = currentHeightPx - offset;
      const newHeightPercent = (newHeightPx / window.innerHeight) * 100;

      // Check velocity direction for intent
      const isSwipingUp = velocity < -0.2;
      const isSwipingDown = velocity > 0.2;

      let targetSnap = currentSnap;

      const sortedSnaps = [...snapPoints].sort(
        (a, b) =>
          getSnapPointHeight(a, collapsedHeight, halfHeight) -
          getSnapPointHeight(b, collapsedHeight, halfHeight)
      );

      const currentIndex = sortedSnaps.indexOf(currentSnap);

      if (isSwipingUp && currentIndex < sortedSnaps.length - 1) {
        targetSnap = sortedSnaps[currentIndex + 1];
      } else if (isSwipingDown && currentIndex > 0) {
        targetSnap = sortedSnaps[currentIndex - 1];
      } else {
        // Find closest snap point
        let closestSnap = currentSnap;
        let closestDistance = Infinity;

        for (const snap of snapPoints) {
          const snapHeight = getSnapPointHeight(snap, collapsedHeight, halfHeight);
          const distance = Math.abs(snapHeight - newHeightPercent);

          if (distance < closestDistance) {
            closestDistance = distance;
            closestSnap = snap;
          }
        }

        targetSnap = closestSnap;
      }

      snapTo(targetSnap);
    }, [
      isDragging,
      dragOffset,
      enableSwipeToDismiss,
      close,
      currentHeight,
      currentSnap,
      snapPoints,
      collapsedHeight,
      halfHeight,
      snapTo,
    ]);

    // Touch event handlers
    const handleTouchStart = useCallback(
      (e: React.TouchEvent) => {
        handleDragStart(e.touches[0].clientY);
      },
      [handleDragStart]
    );

    const handleTouchMove = useCallback(
      (e: React.TouchEvent) => {
        handleDragMove(e.touches[0].clientY);
      },
      [handleDragMove]
    );

    const handleTouchEnd = useCallback(() => {
      handleDragEnd();
    }, [handleDragEnd]);

    // Lock body scroll when open
    useEffect(() => {
      if (isOpen) {
        document.body.style.overflow = 'hidden';
      } else {
        document.body.style.overflow = '';
      }

      return () => {
        document.body.style.overflow = '';
      };
    }, [isOpen]);

    // Keyboard handling
    useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' && isOpen) {
          close();
        }
      };

      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, close]);

    if (!isOpen) return null;

    // Calculate display height
    const displayHeight = Math.max(
      10,
      Math.min(95, currentHeight - (dragOffset / window.innerHeight) * 100)
    );

    return (
      <>
        {/* Backdrop */}
        <div
          className={cn(
            'fixed inset-0 z-9998 bg-black/40 backdrop-blur-sm',
            'transition-opacity duration-200',
            isAnimating && !isOpen ? 'opacity-0' : 'opacity-100'
          )}
          onClick={closeOnBackdrop ? close : undefined}
          aria-hidden="true"
        />

        {/* Sheet */}
        <div
          ref={sheetRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'sheet-title' : undefined}
          className={cn(
            'fixed left-0 right-0 bottom-0 z-9999',
            'bg-[color:var(--surface-raised)] rounded-t-[20px] shadow-2xl',
            'flex flex-col overflow-hidden',
            !isDragging && 'transition-all duration-300 ease-out',
            isAnimating && !isOpen && 'translate-y-full',
            className
          )}
          style={{
            height: `${displayHeight}vh`,
            maxHeight: '95vh',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          {/* Header with drag handle */}
          <div
            className="shrink-0 pt-3 pb-2 cursor-grab active:cursor-grabbing"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {/* Drag handle */}
            {showHandle && (
              <div className="flex justify-center mb-2">
                <div className="w-10 h-1 rounded-full bg-[color:var(--rule)]" />
              </div>
            )}

            {/* Title bar */}
            {(title || showCloseButton) && (
              <div className="flex items-center justify-between px-4 py-2">
                <h2
                  id="sheet-title"
                  className="text-lg font-semibold text-ink"
                >
                  {title}
                </h2>

                {showCloseButton && (
                  <button
                    onClick={close}
                    className={cn(
                      'p-2 -mr-2 rounded-full',
                      'hover:bg-[color:var(--surface-secondary)] active:bg-[color:var(--surface-tertiary)]',
                      'transition-colors'
                    )}
                    aria-label="Close"
                  >
                    <X className="w-5 h-5 text-ink-secondary" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
            {children}
          </div>

          {/* Snap point indicators */}
          {snapPoints.length > 1 && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2">
              {snapPoints.map((snap) => (
                <button
                  key={snap}
                  onClick={() => snapTo(snap)}
                  className={cn(
                    'w-2 h-2 rounded-full transition-colors',
                    currentSnap === snap
                      ? 'bg-[color:var(--masters)]'
                      : 'bg-[color:var(--rule)] hover:bg-[color:var(--ink-tertiary)]/30'
                  )}
                  aria-label={`Snap to ${snap}`}
                />
              ))}
            </div>
          )}
        </div>
      </>
    );
  }
);

// ============================================
// Simple Bottom Sheet Hook
// ============================================

export function useBottomSheet() {
  const [isOpen, setIsOpen] = useState(false);
  const sheetRef = useRef<BottomSheetRef>(null);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);
  const snapTo = useCallback((point: SnapPoint) => {
    sheetRef.current?.snapTo(point);
  }, []);

  return {
    isOpen,
    open,
    close,
    toggle,
    snapTo,
    sheetRef,
    sheetProps: {
      isOpen,
      onClose: close,
      ref: sheetRef,
    },
  };
}

export default IOSBottomSheet;
