'use client';

import { useMemo } from 'react';

/**
 * useStableArray — returns the same array reference when the element
 * values haven't changed.
 *
 * WHY: React's dependency arrays (useEffect, useMemo, useCallback) and
 * Dexie's useLiveQuery do a SHALLOW comparison of each dep. Arrays
 * derived during render (e.g. `sessions.map(s => s.id)`) produce a new
 * reference on every render, causing effects to re-fire and queries to
 * re-run even when the contents are identical. The usual workaround is
 * `[JSON.stringify(arr)]`, which works but is O(n) on EVERY render.
 *
 * This hook does an O(n) shallow compare of the elements. If nothing
 * changed it returns the cached reference (so downstream shallow-compare
 * is O(1)); if anything changed it returns the new array. Net result:
 * identical behaviour to JSON.stringify with less work per render.
 *
 * @example
 * const sessionIds = useStableArray(sessions.map(s => s.id));
 * const matches = useLiveQuery(
 *   () => db.matches.where('sessionId').anyOf(sessionIds).toArray(),
 *   [sessionIds], // stable, won't re-fire unless ids actually changed
 * );
 *
 * NOTE: Compares elements via strict equality (`===`). Works for arrays
 * of primitives, stable object references, or any value that doesn't
 * change identity between renders. Don't wrap an array of freshly-
 * constructed objects — the comparison will always report "changed".
 */
export function useStableArray<T>(arr: T[]): T[] {
    // This hook deliberately treats each element as the dependency list.
    // React will return the previous array reference while every element
    // is strictly equal, without reading or mutating refs during render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    return useMemo(() => arr, arr);
}
