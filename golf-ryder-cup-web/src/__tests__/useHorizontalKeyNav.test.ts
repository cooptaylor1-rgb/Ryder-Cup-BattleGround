/**
 * Tests for useHorizontalKeyNav hook
 *
 * Verifies keyboard navigation for horizontal item lists
 * (session pills, tab bars, card rails).
 */

import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHorizontalKeyNav } from '@/lib/hooks/useHorizontalKeyNav';
import type { KeyboardEvent } from 'react';

function createKeyEvent(key: string): KeyboardEvent<HTMLElement> {
  return {
    key,
    preventDefault: vi.fn(),
  } as unknown as KeyboardEvent<HTMLElement>;
}

describe('useHorizontalKeyNav', () => {
  it('returns containerProps with correct role and orientation', () => {
    const { result } = renderHook(() =>
      useHorizontalKeyNav({
        itemCount: 3,
        activeIndex: 0,
        onSelect: vi.fn(),
      })
    );

    expect(result.current.containerProps.role).toBe('tablist');
    expect(result.current.containerProps['aria-orientation']).toBe('horizontal');
    expect(typeof result.current.containerProps.onKeyDown).toBe('function');
  });

  it('returns correct item props for active vs inactive items', () => {
    const { result } = renderHook(() =>
      useHorizontalKeyNav({
        itemCount: 3,
        activeIndex: 1,
        onSelect: vi.fn(),
      })
    );

    const activeProps = result.current.getItemProps(1);
    expect(activeProps.tabIndex).toBe(0);
    expect(activeProps['aria-selected']).toBe(true);
    expect(activeProps.role).toBe('tab');

    const inactiveProps = result.current.getItemProps(0);
    expect(inactiveProps.tabIndex).toBe(-1);
    expect(inactiveProps['aria-selected']).toBe(false);
  });

  it('ArrowRight moves focus forward', () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useHorizontalKeyNav({
        itemCount: 3,
        activeIndex: 0,
        onSelect,
      })
    );

    act(() => {
      result.current.containerProps.onKeyDown(createKeyEvent('ArrowRight'));
    });

    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('ArrowLeft moves focus backward', () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useHorizontalKeyNav({
        itemCount: 3,
        activeIndex: 2,
        onSelect,
      })
    );

    act(() => {
      result.current.containerProps.onKeyDown(createKeyEvent('ArrowLeft'));
    });

    // focusedIndex starts at 2 (activeIndex), ArrowLeft should go to 1
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('wraps around from last to first with ArrowRight', () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useHorizontalKeyNav({
        itemCount: 3,
        activeIndex: 2,
        onSelect,
        wrap: true,
      })
    );

    act(() => {
      result.current.containerProps.onKeyDown(createKeyEvent('ArrowRight'));
    });

    expect(onSelect).toHaveBeenCalledWith(0);
  });

  it('wraps around from first to last with ArrowLeft', () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useHorizontalKeyNav({
        itemCount: 3,
        activeIndex: 0,
        onSelect,
        wrap: true,
      })
    );

    act(() => {
      result.current.containerProps.onKeyDown(createKeyEvent('ArrowLeft'));
    });

    expect(onSelect).toHaveBeenCalledWith(2);
  });

  it('Home key moves to first item', () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useHorizontalKeyNav({
        itemCount: 5,
        activeIndex: 3,
        onSelect,
      })
    );

    act(() => {
      result.current.containerProps.onKeyDown(createKeyEvent('Home'));
    });

    expect(onSelect).toHaveBeenCalledWith(0);
  });

  it('End key moves to last item', () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useHorizontalKeyNav({
        itemCount: 5,
        activeIndex: 1,
        onSelect,
      })
    );

    act(() => {
      result.current.containerProps.onKeyDown(createKeyEvent('End'));
    });

    expect(onSelect).toHaveBeenCalledWith(4);
  });

  it('Enter key calls onSelect with focused index', () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useHorizontalKeyNav({
        itemCount: 3,
        activeIndex: 1,
        onSelect,
      })
    );

    act(() => {
      result.current.containerProps.onKeyDown(createKeyEvent('Enter'));
    });

    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('Space key calls onSelect with focused index', () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useHorizontalKeyNav({
        itemCount: 3,
        activeIndex: 0,
        onSelect,
      })
    );

    act(() => {
      result.current.containerProps.onKeyDown(createKeyEvent(' '));
    });

    expect(onSelect).toHaveBeenCalledWith(0);
  });

  it('does not wrap when wrap is false', () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useHorizontalKeyNav({
        itemCount: 3,
        activeIndex: 2,
        onSelect,
        wrap: false,
      })
    );

    act(() => {
      result.current.containerProps.onKeyDown(createKeyEvent('ArrowRight'));
    });

    expect(onSelect).toHaveBeenCalledWith(2); // stays at last
  });

  it('ignores unrelated keys', () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useHorizontalKeyNav({
        itemCount: 3,
        activeIndex: 0,
        onSelect,
      })
    );

    act(() => {
      result.current.containerProps.onKeyDown(createKeyEvent('a'));
    });

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('supports custom roles', () => {
    const { result } = renderHook(() =>
      useHorizontalKeyNav({
        itemCount: 3,
        activeIndex: 0,
        onSelect: vi.fn(),
        role: 'listbox',
        itemRole: 'option',
      })
    );

    expect(result.current.containerProps.role).toBe('listbox');
    expect(result.current.getItemProps(0).role).toBe('option');
  });

  it('does nothing when itemCount is 0', () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useHorizontalKeyNav({
        itemCount: 0,
        activeIndex: 0,
        onSelect,
      })
    );

    act(() => {
      result.current.containerProps.onKeyDown(createKeyEvent('ArrowRight'));
    });

    expect(onSelect).not.toHaveBeenCalled();
  });

  it('prevents default on navigation keys', () => {
    const onSelect = vi.fn();
    const { result } = renderHook(() =>
      useHorizontalKeyNav({
        itemCount: 3,
        activeIndex: 0,
        onSelect,
      })
    );

    const event = createKeyEvent('ArrowRight');
    act(() => {
      result.current.containerProps.onKeyDown(event);
    });

    expect(event.preventDefault).toHaveBeenCalled();
  });
});
