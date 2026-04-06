/**
 * Next.js Instrumentation Hook
 *
 * This file is loaded by Next.js at server startup and is the only way
 * to bootstrap server-side Sentry for the App Router. Without it, the
 * sentry.server.config and sentry.edge.config files are never loaded
 * and any server-side error (API routes, Server Components, server
 * actions, middleware) is silently dropped.
 *
 * Also exports `onRequestError` so Sentry automatically captures every
 * unhandled server-side request error. This requires @sentry/nextjs
 * >= 8.28.0 and Next.js >= 15.
 *
 * https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
 */

import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// Auto-capture unhandled server-side request errors.
export const onRequestError = Sentry.captureRequestError;
