/**
 * Sentry Server Configuration
 *
 * This file configures the initialization of Sentry on the server.
 * The config you add here will be used whenever the server handles a request.
 * https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Only enable in production
    enabled: process.env.NODE_ENV === 'production',

    // Tag every event with the deploy release so errors map to commits.
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE ?? process.env.RAILWAY_GIT_COMMIT_SHA,

    // Tag with deployment environment (production, staging, preview)
    environment: process.env.NEXT_PUBLIC_SENTRY_ENV ?? process.env.NODE_ENV,

    // Send default PII (IP / user agent) for debuggable server traces.
    sendDefaultPii: true,

    // Attach local variable values to server-side stack frames so we can
    // see the state at the crash site. Invaluable during a live event.
    includeLocalVariables: true,

    // Forward structured logs (console.error, logger.error) into Sentry
    // Logs so we can tail production issues from one dashboard.
    enableLogs: true,

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: 0.1,

    debug: false,

    // Filter out common server errors
    ignoreErrors: [
        // Not found errors (expected)
        'ENOENT',
        // Connection resets
        'ECONNRESET',
    ],

    // Before sending, validate the error
    beforeSend(event, _hint) {
        // Don't send errors in development
        if (process.env.NODE_ENV !== 'production') {
            return null;
        }

        return event;
    },
});
