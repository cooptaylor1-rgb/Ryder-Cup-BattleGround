import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/lib/db';
import { ensureCurrentUserTripPlayerLink } from '@/lib/services/tripPlayerLinkService';
import type { Player } from '@/lib/types/models';
import { assessTripPlayerLink } from '@/lib/utils/tripPlayerIdentity';

vi.mock('@/lib/services/tripSyncService', () => ({
  queueSyncOperation: vi.fn(),
}));

const now = '2026-03-22T12:00:00.000Z';

describe('tripPlayerIdentity', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
  });

  it('resolves an already-linked player by email', () => {
    const players: Player[] = [
      {
        id: 'player-1',
        tripId: 'trip-1',
        firstName: 'Tom',
        lastName: 'Morris',
        email: 'tom@example.com',
      },
    ];

    const result = assessTripPlayerLink(
      players,
      {
        id: 'user-1',
        email: 'Tom@Example.com',
        firstName: 'Tom',
        lastName: 'Morris',
      },
      true
    );

    expect(result.status).toBe('linked-email');
    expect(result.player?.id).toBe('player-1');
  });

  it('claims a unique name match by attaching the signed-in email', async () => {
    const existingPlayer: Player = {
      id: 'player-1',
      tripId: 'trip-1',
      firstName: 'Tom',
      lastName: 'Morris',
      createdAt: now,
      updatedAt: now,
    };
    await db.players.put(existingPlayer);

    const result = await ensureCurrentUserTripPlayerLink(
      'trip-1',
      [existingPlayer],
      {
        id: 'user-1',
        email: 'tom@example.com',
        firstName: 'Tom',
        lastName: 'Morris',
      },
      true
    );

    expect(result.status).toBe('claimed-name-match');
    expect(result.player?.email).toBe('tom@example.com');

    const storedPlayer = await db.players.get(existingPlayer.id);
    expect(storedPlayer?.email).toBe('tom@example.com');
  });

  it('creates a trip-owned player when the user is not yet on the roster', async () => {
    const result = await ensureCurrentUserTripPlayerLink(
      'trip-1',
      [],
      {
        id: 'user-1',
        email: 'new@example.com',
        firstName: 'New',
        lastName: 'Player',
        handicapIndex: 12.4,
      },
      true
    );

    expect(result.status).toBe('created');
    expect(result.player?.tripId).toBe('trip-1');
    expect(result.player?.email).toBe('new@example.com');

    const storedPlayers = await db.players.toArray();
    expect(storedPlayers).toHaveLength(1);
    expect(storedPlayers[0]?.email).toBe('new@example.com');
  });

  it('leaves ambiguous name matches unresolved', async () => {
    const players: Player[] = [
      {
        id: 'player-1',
        tripId: 'trip-1',
        firstName: 'Tom',
        lastName: 'Morris',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'player-2',
        tripId: 'trip-1',
        firstName: 'Tom',
        lastName: 'Morris',
        createdAt: now,
        updatedAt: now,
      },
    ];

    const result = await ensureCurrentUserTripPlayerLink(
      'trip-1',
      players,
      {
        id: 'user-1',
        email: 'tom@example.com',
        firstName: 'Tom',
        lastName: 'Morris',
      },
      true
    );

    expect(result.status).toBe('ambiguous-name-match');
    expect(result.player).toBeNull();
    expect(result.candidates).toHaveLength(2);
  });
});
