/**
 * Sentry Client Configuration
 *
 * This file configures the initialization of Sentry on the client.
 * The config you add here will be used whenever a users loads a page in their browser.
 * https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Only enable in production
    enabled: process.env.NODE_ENV === 'production',

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: 0.1,

    // Setting this option to true will print useful information to the console while you're setting up Sentry.
    debug: false,

    // You can remove this option if you're not planning to use the Sentry Replay feature:
    replaysOnErrorSampleRate: 1.0,

    // This sets the sample rate to be 10%. You may want this to be 100% while
    // in development and sample at a lower rate in production
    replaysSessionSampleRate: 0.1,

    // You can remove this option if you're not planning to use the Sentry Replay feature:
    integrations: [
        Sentry.replayIntegration({
            // Additional Replay configuration goes in here
            maskAllText: true,
            blockAllMedia: true,
        }),
    ],

    // Filter out common non-actionable errors
    ignoreErrors: [
        // Browser extension errors
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed with undelivered notifications',
        // Network errors
        'Failed to fetch',
        'NetworkError',
        'Load failed',
        // User-initiated cancellations
        'AbortError',
        // Safari-specific
        'cancelled',
    ],

    // Before sending, check if it's a useful error
    beforeSend(event, hint) {
        // Don't send errors in development
        if (process.env.NODE_ENV !== 'production') {
            return null;
        }

        // Filter out chunk load errors (usually from deployment)
        const error = hint.originalException;
        if (error instanceof Error && error.message.includes('Loading chunk')) {
            return null;
        }

        return event;
    },
});
