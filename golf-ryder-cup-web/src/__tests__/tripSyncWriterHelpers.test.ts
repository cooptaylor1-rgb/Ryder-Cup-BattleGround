/**
 * The writer helpers are intentionally tiny, but they are used
 * inside every sync writer — a bug here (wrong error message,
 * swallowed supabase error, mis-built delete query) would silently
 * corrupt cloud state across the entire app. Cheap tests, expensive
 * to regress without them.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

import {
  deleteEntityByKey,
  loadEntityForSync,
  throwIfSupabaseError,
} from '@/lib/services/trip-sync/tripSyncWriterHelpers';

vi.mock('@/lib/services/trip-sync/tripSyncShared', () => ({
  getTable: vi.fn(),
}));

describe('loadEntityForSync', () => {
  it('returns the in-memory payload without touching the fallback loader', async () => {
    const fallback = vi.fn();
    const result = await loadEntityForSync({
      data: { id: 'x' },
      entityName: 'Foo',
      fallback,
    });
    expect(result).toEqual({ id: 'x' });
    expect(fallback).not.toHaveBeenCalled();
  });

  it('falls back to Dexie when no payload was passed', async () => {
    const fallback = vi.fn().mockResolvedValue({ id: 'y' });
    const result = await loadEntityForSync<{ id: string }>({
      data: undefined,
      entityName: 'Foo',
      fallback,
    });
    expect(result).toEqual({ id: 'y' });
    expect(fallback).toHaveBeenCalledTimes(1);
  });

  it('throws a descriptive error when the entity cannot be loaded', async () => {
    const fallback = vi.fn().mockResolvedValue(undefined);
    await expect(
      loadEntityForSync<{ id: string }>({
        data: undefined,
        entityName: 'HoleResult',
        fallback,
      })
    ).rejects.toThrow('HoleResult not found locally');
  });
});

describe('deleteEntityByKey', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('calls the Supabase delete chain with the right table + key', async () => {
    const deleteSpy = vi.fn();
    const eqSpy = vi.fn().mockResolvedValue({ error: null });
    const chain = {
      delete() { deleteSpy(); return chain; },
      eq(column: string, value: string) { eqSpy(column, value); return Promise.resolve({ error: null }); },
    };
    const { getTable } = await import('@/lib/services/trip-sync/tripSyncShared');
    (getTable as unknown as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    await deleteEntityByKey({ table: 'sessions', column: 'id', value: 's1' });
    expect(getTable).toHaveBeenCalledWith('sessions');
    expect(deleteSpy).toHaveBeenCalled();
    expect(eqSpy).toHaveBeenCalledWith('id', 's1');
  });

  it('throws when Supabase returns an error', async () => {
    const chain = {
      delete() { return chain; },
      eq() { return Promise.resolve({ error: { message: 'permission denied' } }); },
    };
    const { getTable } = await import('@/lib/services/trip-sync/tripSyncShared');
    (getTable as unknown as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    await expect(
      deleteEntityByKey({ table: 'sessions', column: 'id', value: 's1' })
    ).rejects.toThrow('permission denied');
  });
});

describe('throwIfSupabaseError', () => {
  it('does nothing when error is null', () => {
    expect(() => throwIfSupabaseError({ error: null })).not.toThrow();
  });
  it('throws with the Supabase error message preserved', () => {
    expect(() =>
      throwIfSupabaseError({ error: { message: 'row level security' } })
    ).toThrow('row level security');
  });
});
