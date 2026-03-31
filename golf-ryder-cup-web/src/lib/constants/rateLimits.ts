/**
 * Centralized rate limit configuration.
 * All API routes import from here for consistency.
 */

import type { RateLimitConfig } from '@/lib/utils/apiMiddleware';

/** Public search endpoints — generous limits */
export const RATE_LIMIT_SEARCH: RateLimitConfig = {
  maxRequests: 60,
  windowMs: 60_000,
};

/** Authenticated data operations — moderate limits */
export const RATE_LIMIT_DATA: RateLimitConfig = {
  maxRequests: 30,
  windowMs: 60_000,
};

/** Expensive AI/compute operations — strict limits */
export const RATE_LIMIT_EXPENSIVE: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 60_000,
};

/** Push notification subscription — strict limits */
export const RATE_LIMIT_PUSH: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 60_000,
};
