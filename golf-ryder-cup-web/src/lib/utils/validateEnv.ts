/**
 * Environment Variable Validation
 *
 * Validates required environment variables at startup and provides
 * clear error messages for missing configuration.
 *
 * Usage: Import in layout.tsx or _app.tsx to run validation on startup
 */

import { createLogger } from './logger';

const logger = createLogger('Env');

// ============================================
// TYPES
// ============================================

interface EnvConfig {
    /** Name of the environment variable */
    name: string;
    /** Whether the variable is required */
    required: boolean;
    /** Description for error messages */
    description: string;
    /** Optional validator function */
    validate?: (value: string) => boolean;
    /** Error message if validation fails */
    validationError?: string;
}

interface ValidationResult {
    valid: boolean;
    missing: string[];
    invalid: string[];
    warnings: string[];
}

// ============================================
// ENVIRONMENT VARIABLE DEFINITIONS
// ============================================

const ENV_CONFIGS: EnvConfig[] = [
    // Supabase (optional for local-only mode)
    {
        name: 'NEXT_PUBLIC_SUPABASE_URL',
        required: false,
        description: 'Supabase project URL for cloud sync',
        validate: (v) => v.startsWith('https://') && v.includes('supabase'),
        validationError: 'Must be a valid Supabase URL (https://xxx.supabase.co)',
    },
    {
        name: 'NEXT_PUBLIC_SUPABASE_ANON_KEY',
        required: false,
        description: 'Supabase anonymous key for client-side access',
        validate: (v) => v.length > 100, // Supabase keys are long JWTs
        validationError: 'Must be a valid Supabase anon key (JWT)',
    },

    // Sentry (optional for error monitoring)
    {
        name: 'SENTRY_DSN',
        required: false,
        description: 'Sentry DSN for error tracking',
        validate: (v) => v.startsWith('https://') && v.includes('sentry'),
        validationError: 'Must be a valid Sentry DSN URL',
    },
    {
        name: 'SENTRY_ORG',
        required: false,
        description: 'Sentry organization name',
    },
    {
        name: 'SENTRY_PROJECT',
        required: false,
        description: 'Sentry project name',
    },

    // API Keys (all optional)
    {
        name: 'GOLF_COURSE_API_KEY',
        required: false,
        description: 'Golf Course API key for course lookups',
    },
    {
        name: 'ANTHROPIC_API_KEY',
        required: false,
        description: 'Anthropic API key for scorecard OCR',
        validate: (v) => v.startsWith('sk-ant-'),
        validationError: 'Must be a valid Anthropic API key (starts with sk-ant-)',
    },
    {
        name: 'OPENAI_API_KEY',
        required: false,
        description: 'OpenAI API key for AI features',
        validate: (v) => v.startsWith('sk-'),
        validationError: 'Must be a valid OpenAI API key (starts with sk-)',
    },
    {
        name: 'GHIN_API_KEY',
        required: false,
        description: 'GHIN API key for handicap lookups',
    },
];

// ============================================
// VALIDATION FUNCTIONS
// ============================================

/**
 * Validate all environment variables
 */
export function validateEnvironment(): ValidationResult {
    const result: ValidationResult = {
        valid: true,
        missing: [],
        invalid: [],
        warnings: [],
    };

    for (const config of ENV_CONFIGS) {
        const value = process.env[config.name];

        if (!value || value.trim() === '') {
            if (config.required) {
                result.missing.push(`${config.name} - ${config.description}`);
                result.valid = false;
            } else {
                // Optional but recommended
                if (config.name.includes('SUPABASE')) {
                    result.warnings.push(
                        `${config.name} not set - cloud sync will be disabled`
                    );
                }
            }
            continue;
        }

        // Run validation if provided
        if (config.validate && !config.validate(value)) {
            result.invalid.push(
                `${config.name} - ${config.validationError || 'Invalid format'}`
            );
            result.valid = false;
        }
    }

    return result;
}

/**
 * Log validation results
 */
export function logValidationResults(result: ValidationResult): void {
    if (result.valid && result.warnings.length === 0) {
        logger.info('✓ Environment variables validated successfully');
        return;
    }

    if (result.missing.length > 0) {
        logger.error('Missing required environment variables:');
        result.missing.forEach((msg) => logger.error(`  - ${msg}`));
    }

    if (result.invalid.length > 0) {
        logger.error('Invalid environment variables:');
        result.invalid.forEach((msg) => logger.error(`  - ${msg}`));
    }

    if (result.warnings.length > 0) {
        logger.warn('Environment warnings:');
        result.warnings.forEach((msg) => logger.warn(`  - ${msg}`));
    }
}

/**
 * Get environment variable with default
 */
export function getEnv(name: string, defaultValue: string = ''): string {
    return process.env[name] || defaultValue;
}

/**
 * Get required environment variable (throws if missing)
 */
export function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

/**
 * Check if an optional feature is configured
 */
export function isFeatureConfigured(feature: 'supabase' | 'sentry' | 'ocr' | 'golfApi'): boolean {
    switch (feature) {
        case 'supabase':
            return !!(
                process.env.NEXT_PUBLIC_SUPABASE_URL &&
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
            );
        case 'sentry':
            return !!process.env.SENTRY_DSN;
        case 'ocr':
            return !!(process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY);
        case 'golfApi':
            return !!(
                process.env.GOLF_COURSE_API_KEY ||
                process.env.NEXT_PUBLIC_GOLF_COURSE_API_KEY
            );
        default:
            return false;
    }
}

/**
 * Get a summary of configured features
 */
export function getConfiguredFeatures(): Record<string, boolean> {
    return {
        supabase: isFeatureConfigured('supabase'),
        sentry: isFeatureConfigured('sentry'),
        ocr: isFeatureConfigured('ocr'),
        golfApi: isFeatureConfigured('golfApi'),
    };
}

// ============================================
// AUTO-VALIDATION ON IMPORT (Development only)
// ============================================

if (process.env.NODE_ENV === 'development') {
    const result = validateEnvironment();
    logValidationResults(result);
}
