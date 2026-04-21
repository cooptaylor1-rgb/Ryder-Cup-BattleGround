import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

export function navigateBackOr(router: AppRouterInstance, fallbackHref: string) {
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back();
    return;
  }

  router.push(fallbackHref);
}

/**
 * Only accept same-origin relative paths as post-auth redirect targets.
 * Rejects absolute URLs ("https://evil.com"), protocol-relative URLs
 * ("//evil.com"), and anything that isn't clearly a local app path.
 * Returns the fallback when the input is absent or unsafe so callers
 * can route straight into `router.push(safeNextPath(next))`.
 */
export function safeNextPath(raw: string | null | undefined, fallback = '/'): string {
  if (!raw) return fallback;
  if (!raw.startsWith('/')) return fallback;
  if (raw.startsWith('//') || raw.startsWith('/\\')) return fallback;
  return raw;
}
