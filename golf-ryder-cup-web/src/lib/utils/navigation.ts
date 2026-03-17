import type { AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime';

export function navigateBackOr(router: AppRouterInstance, fallbackHref: string) {
  if (typeof window !== 'undefined' && window.history.length > 1) {
    router.back();
    return;
  }

  router.push(fallbackHref);
}
