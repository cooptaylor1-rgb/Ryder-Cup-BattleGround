/**
 * useHorizontalKeyNav Hook
 *
 * Adds keyboard navigation to horizontally-scrollable lists of
 * focusable items (e.g. session selector pills, tab bars, card rails).
 *
 * Features:
 * - Left/Right arrow keys move focus between sibling items
 * - Home/End keys jump to first/last item
 * - Enter/Space activate the focused item
 * - Roving tabindex pattern (only active item is tabbable)
 * - Wraps around at edges
 *
 * Usage:
 *   const navProps = useHorizontalKeyNav({
 *     itemCount: sessions.length,
 *     activeIndex,
 *     onSelect: (index) => setActiveSession(sessions[index].id),
 *   });
 *   // Spread navProps.containerProps on the wrapper
 *   // Spread navProps.getItemProps(index) on each item
 */

'use client';

import { useCallback, useRef, useState, type KeyboardEvent } from 'react';

export interface UseHorizontalKeyNavOptions {
  /** Total number of navigable items */
  itemCount: number;
  /** Currently active/selected index */
  activeIndex: number;
  /** Called when an item is activated (Enter/Space or arrow-focus + auto-select) */
  onSelect: (index: number) => void;
  /** Whether to wrap from last→first and first→last. Defaults to true. */
  wrap?: boolean;
  /** ARIA role for the container. Defaults to 'tablist'. */
  role?: string;
  /** ARIA role for items. Defaults to 'tab'. */
  itemRole?: string;
  /** If true, arrow navigation also fires onSelect (like tabs). Defaults to true. */
  selectOnFocus?: boolean;
}

export interface HorizontalKeyNavContainerProps {
  role: string;
  'aria-orientation': 'horizontal';
  onKeyDown: (e: KeyboardEvent<HTMLElement>) => void;
}

export interface HorizontalKeyNavItemProps {
  role: string;
  tabIndex: number;
  'aria-selected': boolean;
  ref: (el: HTMLElement | null) => void;
}

export interface UseHorizontalKeyNavReturn {
  /** Spread onto the container element */
  containerProps: HorizontalKeyNavContainerProps;
  /** Call with the item index, spread result onto each item element */
  getItemProps: (index: number) => HorizontalKeyNavItemProps;
  /** Currently focused index (may differ from activeIndex during keyboard nav) */
  focusedIndex: number;
}

export function useHorizontalKeyNav(
  options: UseHorizontalKeyNavOptions
): UseHorizontalKeyNavReturn {
  const {
    itemCount,
    activeIndex,
    onSelect,
    wrap = true,
    role = 'tablist',
    itemRole = 'tab',
    selectOnFocus = true,
  } = options;

  const [focusedIndex, setFocusedIndex] = useState(activeIndex);
  const itemRefs = useRef<Map<number, HTMLElement>>(new Map());

  const focusItem = useCallback(
    (index: number) => {
      setFocusedIndex(index);
      const el = itemRefs.current.get(index);
      el?.focus();
      if (selectOnFocus) {
        onSelect(index);
      }
    },
    [onSelect, selectOnFocus]
  );

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLElement>) => {
      if (itemCount === 0) return;

      let nextIndex: number | null = null;

      switch (e.key) {
        case 'ArrowRight':
          e.preventDefault();
          if (wrap) {
            nextIndex = (focusedIndex + 1) % itemCount;
          } else {
            nextIndex = Math.min(focusedIndex + 1, itemCount - 1);
          }
          break;

        case 'ArrowLeft':
          e.preventDefault();
          if (wrap) {
            nextIndex = (focusedIndex - 1 + itemCount) % itemCount;
          } else {
            nextIndex = Math.max(focusedIndex - 1, 0);
          }
          break;

        case 'Home':
          e.preventDefault();
          nextIndex = 0;
          break;

        case 'End':
          e.preventDefault();
          nextIndex = itemCount - 1;
          break;

        case 'Enter':
        case ' ':
          e.preventDefault();
          onSelect(focusedIndex);
          return;

        default:
          return;
      }

      if (nextIndex !== null) {
        focusItem(nextIndex);
      }
    },
    [focusItem, focusedIndex, itemCount, onSelect, wrap]
  );

  const getItemProps = useCallback(
    (index: number): HorizontalKeyNavItemProps => ({
      role: itemRole,
      tabIndex: index === activeIndex ? 0 : -1,
      'aria-selected': index === activeIndex,
      ref: (el: HTMLElement | null) => {
        if (el) {
          itemRefs.current.set(index, el);
        } else {
          itemRefs.current.delete(index);
        }
      },
    }),
    [activeIndex, itemRole]
  );

  const containerProps: HorizontalKeyNavContainerProps = {
    role,
    'aria-orientation': 'horizontal',
    onKeyDown: handleKeyDown,
  };

  return {
    containerProps,
    getItemProps,
    focusedIndex,
  };
}

export default useHorizontalKeyNav;
