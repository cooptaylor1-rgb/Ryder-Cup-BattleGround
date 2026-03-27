/**
 * Stable ID generation using crypto.randomUUID().
 *
 * Replaces ad-hoc `Date.now() + Math.random()` patterns throughout the
 * codebase with a single, collision-resistant helper backed by the
 * Web Crypto API (available in all modern browsers and Node ≥ 19).
 */
export function generateId(prefix?: string): string {
  const uuid = crypto.randomUUID();
  return prefix ? `${prefix}-${uuid}` : uuid;
}
