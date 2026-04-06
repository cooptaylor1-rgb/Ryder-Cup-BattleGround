/**
 * Sentry Edge Configuration
 *
 * This file configures the initialization of Sentry for edge functions.
 * https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

import * as Sentry from "@sentry/nextjs";

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Only enable in production
    enabled: process.env.NODE_ENV === 'production',

    // Tag every event with the deploy release so errors map to commits.
    release: process.env.NEXT_PUBLIC_SENTRY_RELEASE,

    // Tag with deployment environment (production, staging, preview)
    environment: process.env.NEXT_PUBLIC_SENTRY_ENV ?? process.env.NODE_ENV,

    // Send default PII (IP / user agent) for debuggable traces.
    sendDefaultPii: true,

    // Forward structured logs into Sentry Logs.
    enableLogs: true,

    // Adjust this value in production, or use tracesSampler for greater control
    tracesSampleRate: 0.1,

    debug: false,
});
