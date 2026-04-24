/**
 * Last-write-wins comparison is the one place that decides whether
 * an incoming offline edit should overwrite whatever Supabase
 * currently has. Every mutable-entity writer funnels through it.
 * A subtle regression here silently corrupts data on sync, so
 * lock the comparison semantics down.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';

import { compareIsoTimestamps, isServerNewer } from '@/lib/services/trip-sync/tripSyncLww';

type FakeRow = Record<string, unknown> | null;

function makeBuilder(row: FakeRow) {
  const chain = {
    select() { return chain; },
    eq() { return chain; },
    async maybeSingle() { return { data: row }; },
  };
  return chain;
}

vi.mock('@/lib/services/trip-sync/tripSyncShared', () => ({
  getTable: vi.fn(),
}));

describe('compareIsoTimestamps', () => {
  it('returns a positive number when a is later than b', () => {
    expect(
      compareIsoTimestamps('2026-04-23T18:00:00Z', '2026-04-23T17:00:00Z')
    ).toBeGreaterThan(0);
  });
  it('returns a negative number when a is earlier than b', () => {
    expect(
      compareIsoTimestamps('2026-04-23T17:00:00Z', '2026-04-23T18:00:00Z')
    ).toBeLessThan(0);
  });
  it('returns 0 when equal', () => {
    expect(
      compareIsoTimestamps('2026-04-23T18:00:00Z', '2026-04-23T18:00:00Z')
    ).toBe(0);
  });
  it('returns 0 when either timestamp is unparseable rather than throwing', () => {
    expect(compareIsoTimestamps('not-a-date', '2026-04-23T18:00:00Z')).toBe(0);
    expect(compareIsoTimestamps('2026-04-23T18:00:00Z', 'not-a-date')).toBe(0);
  });
});

describe('isServerNewer', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('returns true when the cloud row has a strictly newer timestamp', async () => {
    const { getTable } = await import('@/lib/services/trip-sync/tripSyncShared');
    (getTable as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      makeBuilder({ updated_at: '2026-04-23T18:00:00Z' })
    );

    const result = await isServerNewer({
      table: 'sessions',
      timestampColumn: 'updated_at',
      where: { id: 's1' },
      incoming: '2026-04-23T17:00:00Z',
    });

    expect(result).toBe(true);
  });

  it('returns true when timestamps tie so the incoming write yields to cloud', async () => {
    const { getTable } = await import('@/lib/services/trip-sync/tripSyncShared');
    (getTable as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      makeBuilder({ updated_at: '2026-04-23T18:00:00Z' })
    );

    const result = await isServerNewer({
      table: 'matches',
      timestampColumn: 'updated_at',
      where: { id: 'm1' },
      incoming: '2026-04-23T18:00:00Z',
    });

    expect(result).toBe(true);
  });

  it('returns false when the incoming write is newer than the cloud row', async () => {
    const { getTable } = await import('@/lib/services/trip-sync/tripSyncShared');
    (getTable as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      makeBuilder({ updated_at: '2026-04-23T17:00:00Z' })
    );

    const result = await isServerNewer({
      table: 'sessions',
      timestampColumn: 'updated_at',
      where: { id: 's1' },
      incoming: '2026-04-23T18:00:00Z',
    });

    expect(result).toBe(false);
  });

  it('returns false when the row does not exist yet (first write wins)', async () => {
    const { getTable } = await import('@/lib/services/trip-sync/tripSyncShared');
    (getTable as unknown as ReturnType<typeof vi.fn>).mockReturnValue(
      makeBuilder(null)
    );

    const result = await isServerNewer({
      table: 'sessions',
      timestampColumn: 'updated_at',
      where: { id: 'new' },
      incoming: '2026-04-23T18:00:00Z',
    });

    expect(result).toBe(false);
  });

  it('supports composite keys for hole_results lookups', async () => {
    const { getTable } = await import('@/lib/services/trip-sync/tripSyncShared');
    const eqSpy = vi.fn();
    const chain = {
      select() { return chain; },
      eq(...args: unknown[]) {
        eqSpy(...args);
        return chain;
      },
      async maybeSingle() {
        return { data: { timestamp: '2026-04-23T18:00:00Z' } };
      },
    };
    (getTable as unknown as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    const result = await isServerNewer({
      table: 'hole_results',
      timestampColumn: 'timestamp',
      where: { match_id: 'm1', hole_number: 7 },
      incoming: '2026-04-23T17:00:00Z',
    });

    expect(result).toBe(true);
    expect(eqSpy).toHaveBeenCalledWith('match_id', 'm1');
    expect(eqSpy).toHaveBeenCalledWith('hole_number', 7);
  });

  it('reads from the specified timestamp column rather than hardcoding updated_at', async () => {
    const { getTable } = await import('@/lib/services/trip-sync/tripSyncShared');
    const selectSpy = vi.fn();
    const chain = {
      select(col: string) {
        selectSpy(col);
        return chain;
      },
      eq() { return chain; },
      async maybeSingle() {
        return { data: { timestamp: '2026-04-23T18:00:00Z' } };
      },
    };
    (getTable as unknown as ReturnType<typeof vi.fn>).mockReturnValue(chain);

    await isServerNewer({
      table: 'hole_results',
      timestampColumn: 'timestamp',
      where: { match_id: 'm1', hole_number: 7 },
      incoming: '2026-04-23T17:00:00Z',
    });

    expect(selectSpy).toHaveBeenCalledWith('timestamp');
  });
});
