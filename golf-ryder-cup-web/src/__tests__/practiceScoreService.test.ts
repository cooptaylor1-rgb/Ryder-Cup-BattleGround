/**
 * Practice-score service: upsert semantics and sync queue contract.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { db } from '../lib/db';
import {
  getPracticeScoresForMatch,
  upsertPracticeScore,
} from '../lib/services/practiceScoreService';

describe('upsertPracticeScore', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
  });

  it('creates a new row on first entry for (match, player, hole)', async () => {
    const saved = await upsertPracticeScore({
      matchId: 'm1',
      playerId: 'p1',
      holeNumber: 4,
      gross: 5,
      tripId: 't1',
    });
    expect(saved.gross).toBe(5);
    expect(await db.practiceScores.count()).toBe(1);
  });

  it('updates the same row when entered again for the same slot', async () => {
    await upsertPracticeScore({
      matchId: 'm1',
      playerId: 'p1',
      holeNumber: 4,
      gross: 5,
      tripId: 't1',
    });
    const updated = await upsertPracticeScore({
      matchId: 'm1',
      playerId: 'p1',
      holeNumber: 4,
      gross: 4,
      tripId: 't1',
    });

    expect(await db.practiceScores.count()).toBe(1);
    const stored = await db.practiceScores.get(updated.id);
    expect(stored?.gross).toBe(4);
  });

  it('treats gross=undefined as a clear without deleting the row', async () => {
    await upsertPracticeScore({
      matchId: 'm1',
      playerId: 'p1',
      holeNumber: 7,
      gross: 6,
      tripId: 't1',
    });
    const cleared = await upsertPracticeScore({
      matchId: 'm1',
      playerId: 'p1',
      holeNumber: 7,
      gross: undefined,
      tripId: 't1',
    });
    expect(cleared.gross).toBeUndefined();
    const stored = await db.practiceScores.get(cleared.id);
    expect(stored?.gross).toBeUndefined();
  });

  it('keeps separate rows per (player, hole) pair', async () => {
    await upsertPracticeScore({
      matchId: 'm1',
      playerId: 'p1',
      holeNumber: 1,
      gross: 4,
      tripId: 't1',
    });
    await upsertPracticeScore({
      matchId: 'm1',
      playerId: 'p2',
      holeNumber: 1,
      gross: 5,
      tripId: 't1',
    });
    await upsertPracticeScore({
      matchId: 'm1',
      playerId: 'p1',
      holeNumber: 2,
      gross: 3,
      tripId: 't1',
    });

    expect(await db.practiceScores.count()).toBe(3);
  });
});

describe('getPracticeScoresForMatch', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
  });

  it('returns only the given match and sorts by hole then player', async () => {
    await upsertPracticeScore({
      matchId: 'm1',
      playerId: 'zeta',
      holeNumber: 2,
      gross: 5,
      tripId: 't1',
    });
    await upsertPracticeScore({
      matchId: 'm1',
      playerId: 'alpha',
      holeNumber: 2,
      gross: 4,
      tripId: 't1',
    });
    await upsertPracticeScore({
      matchId: 'm1',
      playerId: 'alpha',
      holeNumber: 1,
      gross: 3,
      tripId: 't1',
    });
    await upsertPracticeScore({
      matchId: 'other-match',
      playerId: 'alpha',
      holeNumber: 1,
      gross: 7,
      tripId: 't1',
    });

    const rows = await getPracticeScoresForMatch('m1');
    expect(rows).toHaveLength(3);
    expect(rows[0]?.holeNumber).toBe(1);
    expect(rows[1]?.holeNumber).toBe(2);
    expect(rows[1]?.playerId).toBe('alpha');
    expect(rows[2]?.playerId).toBe('zeta');
  });
});
