/**
 * Safe JSON parse utility with Zod runtime validation.
 *
 * Replaces the unsafe `JSON.parse(x) as T` pattern with validated
 * parsing that returns `null` on schema mismatch instead of silently
 * passing corrupt data through.
 */

import { type ZodType, type ZodError } from 'zod';
import { createLogger } from './logger';

const logger = createLogger('SafeParse');

/**
 * Parse a JSON string and validate against a Zod schema.
 *
 * Returns `null` when:
 *  - `json` is null/undefined/empty string
 *  - `json` is not valid JSON
 *  - The parsed value doesn't match the schema
 *
 * In all failure cases a warning is logged so data corruption
 * is observable without crashing the app.
 */
export function safeParse<T>(json: string | null | undefined, schema: ZodType<T>): T | null {
  if (json == null || json === '') return null;

  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    logger.warn('Invalid JSON', { preview: json.slice(0, 80) });
    return null;
  }

  const result = schema.safeParse(raw);
  if (result.success) {
    return result.data;
  }

  logger.warn('Schema validation failed', {
    issues: (result.error as ZodError).issues.slice(0, 3),
  });
  return null;
}
