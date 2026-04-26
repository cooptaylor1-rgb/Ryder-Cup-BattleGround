import { getTable } from './tripSyncShared';

type SupabaseSyncError = {
  message: string;
  code?: string;
  details?: string;
  hint?: string;
};

/**
 * Loader shared by every sync writer. If the caller passed the
 * entity payload (happens when queueSyncOperation was called with
 * a freshly-built row), use it directly; otherwise fall back to
 * reading the current Dexie row.
 *
 * The entity-not-found case is a hard error because the writer's
 * whole job is to push a local-authoritative row to cloud. If the
 * row is gone, either the queue is stale (deleted locally between
 * enqueue and drain) or some earlier cleanup deleted it mistakenly.
 * Throwing surfaces the condition to the retry loop instead of
 * silently upserting a zeroed-out row.
 */
export async function loadEntityForSync<T>(options: {
  data: T | undefined;
  entityName: string;
  fallback: () => Promise<T | undefined>;
}): Promise<T> {
  const entity = options.data ?? (await options.fallback());
  if (!entity) throw new Error(`${options.entityName} not found locally`);
  return entity;
}

/**
 * Deletes a row by a single-column key. Most entities delete by id;
 * callers with composite keys or custom where clauses should fall
 * back to getTable directly. Centralized so the "throw on supabase
 * error" pattern lives in one place.
 */
export async function deleteEntityByKey(options: {
  table: string;
  column: string;
  value: string;
}): Promise<void> {
  const { error } = await getTable(options.table)
    .delete()
    .eq(options.column, options.value);
  if (error) {
    throw new Error(
      formatSupabaseSyncError(error, {
        table: options.table,
        operation: 'delete',
      })
    );
  }
}

export function formatSupabaseSyncError(
  error: SupabaseSyncError,
  context?: { table?: string; operation?: string }
): string {
  const prefix =
    context?.table || context?.operation
      ? `[${[context.operation, context.table].filter(Boolean).join(' ')}] `
      : '';
  const parts = [`${prefix}${error.message}`];

  if (error.code) parts.push(`code: ${error.code}`);
  if (error.details) parts.push(`details: ${error.details}`);
  if (error.hint) parts.push(`hint: ${error.hint}`);

  return parts.join(' | ');
}

/**
 * Throws if a Supabase PostgrestResponse carries an error. Sync
 * writers repeat `if (error) throw new Error(error.message)`
 * after every upsert — centralizing it keeps the writer code
 * focused on the shape of each payload instead of the error
 * boilerplate.
 */
export function throwIfSupabaseError(
  response: { error: SupabaseSyncError | null },
  context?: { table?: string; operation?: string }
): void {
  if (response.error) throw new Error(formatSupabaseSyncError(response.error, context));
}
