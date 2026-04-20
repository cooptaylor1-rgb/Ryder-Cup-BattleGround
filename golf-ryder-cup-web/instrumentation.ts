/**
 * Next.js Instrumentation Hook
 *
 * Loaded once at server startup. Bootstraps server-side Sentry and runs
 * environment-variable validation so misconfigured deploys fail loudly
 * at boot instead of silently on the first feature use.
 *
 * See https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/
 */

import * as Sentry from '@sentry/nextjs';

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Validate env before anything else so ops sees the result in server
    // logs at deploy time, not 4 hours into an event when sync silently
    // stops working. The dynamic import avoids loading the validator on
    // the edge runtime, where Node APIs used inside the module may not
    // resolve.
    const { validateEnvironment, logValidationResults, getConfiguredFeatures } = await import(
      './src/lib/utils/validateEnv'
    );
    const result = validateEnvironment();
    logValidationResults(result);
    // eslint-disable-next-line no-console
    console.log('[Env] Configured features:', getConfiguredFeatures());

    await import('./sentry.server.config');
  }

  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config');
  }
}

// Auto-capture unhandled server-side request errors.
export const onRequestError = Sentry.captureRequestError;
