'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { navigateBackOr } from '@/lib/utils/navigation';

/**
 * useSmartBack — consistent back-button behavior across pages.
 *
 * Returns a handler that:
 *   1. Uses `router.back()` when the app has history to pop (the user arrived
 *      via an in-app click), so they return to the exact screen they came from.
 *   2. Falls back to `fallbackHref` when there is no history — e.g. the page
 *      was opened from a notification, a shared deep-link, or a fresh tab.
 *      Without a fallback the back button would be a no-op or drop the user
 *      out of the app entirely.
 *
 * Always pass a sensible fallback (`'/'` is a safe default, but prefer the
 * logical parent — e.g. a session page should fall back to `/schedule`, a
 * captain sub-page to `/captain`).
 *
 * Wraps the existing `navigateBackOr` utility so the same behavior is
 * available both as a hook (for PageHeader's `backFallback` prop) and as a
 * function call (for bespoke handlers).
 */
export function useSmartBack(fallbackHref: string = '/') {
    const router = useRouter();

    return useCallback(() => {
        navigateBackOr(router, fallbackHref);
    }, [router, fallbackHref]);
}
