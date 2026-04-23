import { getTable } from './tripSyncShared';

/**
 * Last-write-wins check shared by every mutable-entity writer in
 * the sync pipeline. Returns true if the Supabase row already has
 * a server timestamp >= the incoming edit, meaning the incoming
 * write is stale and should be skipped.
 *
 * Without this, two offline devices editing the same row silently
 * overwrite each other based on sync arrival order, not actual
 * edit time. There is still a narrow race between the select and
 * the upsert (another write can land in between), but it closes
 * the worst of the offline-replay data-loss window.
 *
 * Accepts arbitrary key shape so it works for tables that don't
 * key by `id` — e.g. hole_results uses (match_id, hole_number).
 * Accepts the timestamp column because hole_results uses
 * `timestamp` while everything else uses `updated_at`.
 */
export async function isServerNewer(options: {
  table: string;
  timestampColumn: string;
  where: Record<string, string | number>;
  incoming: string;
}): Promise<boolean> {
  let query = getTable(options.table).select(options.timestampColumn);
  for (const [column, value] of Object.entries(options.where)) {
    query = query.eq(column, value);
  }
  const { data: existing } = await query.maybeSingle();

  const raw =
    existing &&
    typeof (existing as Record<string, unknown>)[options.timestampColumn] === 'string'
      ? ((existing as Record<string, unknown>)[options.timestampColumn] as string)
      : null;

  if (!raw) return false;
  return compareIsoTimestamps(raw, options.incoming) >= 0;
}

/**
 * Compares two ISO-8601 timestamp strings. Returns:
 *   >0 if `a` is later than `b`
 *   <0 if `a` is earlier than `b`
 *    0 if they represent the same instant (or either is unparseable)
 *
 * Exported for tests — the whole LWW correctness story pivots on
 * this comparison, so we lock it down even though the production
 * call site only uses the >= 0 branch.
 */
export function compareIsoTimestamps(a: string, b: string): number {
  const aMs = new Date(a).getTime();
  const bMs = new Date(b).getTime();
  if (!Number.isFinite(aMs) || !Number.isFinite(bMs)) return 0;
  return aMs - bMs;
}
