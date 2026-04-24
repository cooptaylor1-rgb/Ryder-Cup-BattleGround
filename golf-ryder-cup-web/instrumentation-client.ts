/**
 * Sentry Client Instrumentation
 *
 * Next.js 15+ with Turbopack loads this file automatically on the client
 * at startup. It is the modern replacement for the legacy
 * `sentry.client.config.ts`, which does not work reliably under Turbopack.
 *
 * https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
 */

import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production
  enabled: process.env.NODE_ENV === 'production',

  // Tag every event with the deploy release so errors map to commits.
  // Railway exposes the commit SHA at build time; next.config.ts also
  // injects it into NEXT_PUBLIC_SENTRY_RELEASE when not set explicitly.
  release: process.env.NEXT_PUBLIC_SENTRY_RELEASE ?? process.env.RAILWAY_GIT_COMMIT_SHA,

  // Tag with deployment environment (production, staging, preview)
  environment: process.env.NEXT_PUBLIC_SENTRY_ENV ?? process.env.NODE_ENV,

  // Send default PII (IP address, user agent) — required for meaningful
  // session replays. The app contains no sensitive PII in scope of Sentry;
  // scores and names are the most identifying data and those are already
  // intentional product data.
  sendDefaultPii: true,

  // Performance tracing: keep sample rate low on the course to avoid
  // burning battery/data on devices with flaky Wi-Fi.
  tracesSampleRate: 0.1,

  // Session Replay: 10% of all sessions, 100% of sessions with errors.
  // Replay is invaluable for debugging weird on-course UX issues during
  // the live event.
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  // Enable structured logs forwarding so console.error etc. appear in
  // Sentry's Logs product alongside exceptions. Useful during the event
  // for tailing what's happening on a specific device.
  enableLogs: true,

  debug: false,

  integrations: [
    Sentry.replayIntegration({
      // Mask text to avoid accidentally capturing player names / scores
      // in raw form. Replays still show the shape of interactions.
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Filter out common non-actionable errors so we don't drown in noise
  // during the event.
  ignoreErrors: [
    // Browser extension errors
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    // Network errors — these are handled by our normalizeError + in-app UX
    // and don't need to page us.
    'Failed to fetch',
    'NetworkError',
    'Load failed',
    // User-initiated cancellations
    'AbortError',
    // Safari-specific
    'cancelled',
  ],

  beforeSend(event, hint) {
    // Don't send errors in development
    if (process.env.NODE_ENV !== 'production') {
      return null;
    }

    // Filter out chunk load errors (usually from a rolling deployment
    // where the old client references a new bundle URL).
    const error = hint.originalException;
    if (error instanceof Error && error.message.includes('Loading chunk')) {
      return null;
    }

    return event;
  },
});

// Capture App Router client-side navigation transitions so performance
// traces show route changes. Required export for Next.js 15+ App Router.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
