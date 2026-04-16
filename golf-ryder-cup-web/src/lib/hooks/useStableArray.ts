'use client';

import { useRef } from 'react';

/**
 * useStableArray — returns the same array reference when the element
 * values haven't changed, preventing unnecessary re-renders and
 * re-queries in hooks that do shallow dependency comparison.
 *
 * Without this, code like `useLiveQuery(fn, [sessionIds])` re-fires on
 * every render because `sessionIds` is a new array reference even when
 * the contents are identical. `JSON.stringify` works but is O(n) on
 * every render. This hook does an O(n) comparison only when the array
 * length or any element changes, and returns the previous reference
 * otherwise — making the shallow dep check in useLiveQuery a free O(1).
 */
export function useStableArray<T>(arr: T[]): T[] {
    const ref = useRef(arr);

    if (
        ref.current.length !== arr.length ||
        ref.current.some((item, i) => item !== arr[i])
    ) {
        ref.current = arr;
    }

    return ref.current;
}
