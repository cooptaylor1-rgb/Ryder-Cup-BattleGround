/**
 * Logger Utility
 *
 * Production-safe logging that:
 * - Silences debug/info/log in production
 * - Always shows errors and warnings
 * - Provides consistent formatting
 */

type LogLevel = 'debug' | 'info' | 'log' | 'warn' | 'error';

interface Logger {
    debug: (...args: unknown[]) => void;
    info: (...args: unknown[]) => void;
    log: (...args: unknown[]) => void;
    warn: (...args: unknown[]) => void;
    error: (...args: unknown[]) => void;
}

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Create a namespaced logger
 */
export function createLogger(namespace: string): Logger {
    const prefix = `[${namespace}]`;

    return {
        debug: (...args: unknown[]) => {
            if (isDevelopment) {
                console.debug(prefix, ...args);
            }
        },
        info: (...args: unknown[]) => {
            if (isDevelopment) {
                console.info(prefix, ...args);
            }
        },
        log: (...args: unknown[]) => {
            if (isDevelopment) {
                console.log(prefix, ...args);
            }
        },
        warn: (...args: unknown[]) => {
            // Warnings are always shown
            console.warn(prefix, ...args);
        },
        error: (...args: unknown[]) => {
            // Errors are always shown
            console.error(prefix, ...args);
        },
    };
}

/**
 * Default logger for general use
 */
export const logger = createLogger('App');

/**
 * PWA-specific logger
 */
export const pwaLogger = createLogger('PWA');

/**
 * Auth-specific logger
 */
export const authLogger = createLogger('Auth');

/**
 * Scoring-specific logger
 */
export const scoringLogger = createLogger('Scoring');

/**
 * API-specific logger
 */
export const apiLogger = createLogger('API');

/**
 * Captain toolkit logger
 */
export const captainLogger = createLogger('Captain');
