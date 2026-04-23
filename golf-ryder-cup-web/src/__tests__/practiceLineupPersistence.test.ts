/**
 * Practice lineup persistence tests
 *
 * Guards the contract with the sync queue + Dexie layer: practice
 * groups land as mode='practice' matches, existing groups are wiped
 * and rebuilt on re-publish, and each group's tee time flows into
 * Match.teeTime.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { db } from '../lib/db';
import {
  savePracticeLineup,
  type PracticeGroupDraft,
} from '../lib/services/lineup-builder/practiceLineupPersistence';
import type { RyderCupSession, Trip } from '../lib/types/models';

function isoNow() {
  return new Date().toISOString();
}

async function seedTripAndSession(options?: {
  isPracticeSession?: boolean;
}): Promise<{ trip: Trip; session: RyderCupSession }> {
  const now = isoNow();

  const trip: Trip = {
    id: 'trip-practice-1',
    name: 'Trip',
    startDate: now,
    endDate: now,
    isCaptainModeEnabled: true,
    createdAt: now,
    updatedAt: now,
  };
  await db.trips.add(trip);

  const session: RyderCupSession = {
    id: 'session-practice-1',
    tripId: trip.id,
    name: 'Thursday Practice',
    sessionNumber: 1,
    sessionType: 'fourBall',
    pointsPerMatch: 0,
    status: 'scheduled',
    isLocked: false,
    isPracticeSession: options?.isPracticeSession ?? true,
    createdAt: now,
    updatedAt: now,
  };
  await db.sessions.add(session);

  return { trip, session };
}

describe('savePracticeLineup', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
  });

  it('creates Match rows with mode=practice and all players in teamAPlayerIds', async () => {
    const { session } = await seedTripAndSession();

    const groups: PracticeGroupDraft[] = [
      {
        localId: 'g1',
        groupNumber: 1,
        playerIds: ['p1', 'p2', 'p3', 'p4'],
        teeTime: '08:00',
      },
      {
        localId: 'g2',
        groupNumber: 2,
        playerIds: ['p5', 'p6'],
        teeTime: '08:10',
      },
    ];

    const result = await savePracticeLineup(session.id, groups);
    expect(result.success).toBe(true);
    expect(result.matchIds).toHaveLength(2);

    const written = await db.matches.where('sessionId').equals(session.id).toArray();
    expect(written).toHaveLength(2);

    const firstGroup = written.find((m) => m.matchOrder === 1);
    expect(firstGroup?.mode).toBe('practice');
    expect(firstGroup?.teamAPlayerIds).toEqual(['p1', 'p2', 'p3', 'p4']);
    expect(firstGroup?.teamBPlayerIds).toEqual([]);
    expect(firstGroup?.teamAHandicapAllowance).toBe(0);
    expect(firstGroup?.teamBHandicapAllowance).toBe(0);
    expect(firstGroup?.teeTime).toBe('08:00');

    const secondGroup = written.find((m) => m.matchOrder === 2);
    expect(secondGroup?.teamAPlayerIds).toEqual(['p5', 'p6']);
    expect(secondGroup?.teeTime).toBe('08:10');
  });

  it('re-publish replaces the prior groups instead of duplicating them', async () => {
    const { session } = await seedTripAndSession();

    await savePracticeLineup(session.id, [
      { localId: 'g1', groupNumber: 1, playerIds: ['p1', 'p2'], teeTime: '08:00' },
      { localId: 'g2', groupNumber: 2, playerIds: ['p3', 'p4'], teeTime: '08:10' },
    ]);
    expect(await db.matches.where('sessionId').equals(session.id).count()).toBe(2);

    // Re-publish with fewer groups — any leftover rows must be gone.
    const secondResult = await savePracticeLineup(session.id, [
      {
        localId: 'g-new',
        groupNumber: 1,
        playerIds: ['p1', 'p2', 'p3'],
        teeTime: '09:00',
      },
    ]);
    expect(secondResult.success).toBe(true);
    const written = await db.matches.where('sessionId').equals(session.id).toArray();
    expect(written).toHaveLength(1);
    expect(written[0]?.teamAPlayerIds).toEqual(['p1', 'p2', 'p3']);
    expect(written[0]?.teeTime).toBe('09:00');
  });

  it('skips groups with no players', async () => {
    const { session } = await seedTripAndSession();

    const result = await savePracticeLineup(session.id, [
      { localId: 'g1', groupNumber: 1, playerIds: ['p1', 'p2'], teeTime: '08:00' },
      { localId: 'g2', groupNumber: 2, playerIds: [], teeTime: '08:10' },
    ]);

    expect(result.success).toBe(true);
    expect(result.matchIds).toHaveLength(1);
    const written = await db.matches.where('sessionId').equals(session.id).toArray();
    expect(written).toHaveLength(1);
    expect(written[0]?.matchOrder).toBe(1);
  });

  it('omits teeTime when the group is published without one set', async () => {
    const { session } = await seedTripAndSession();

    await savePracticeLineup(session.id, [
      { localId: 'g1', groupNumber: 1, playerIds: ['p1', 'p2'], teeTime: '' },
    ]);

    const written = await db.matches.where('sessionId').equals(session.id).toArray();
    expect(written[0]?.teeTime).toBeUndefined();
  });

  it('returns failure when the session is missing', async () => {
    const result = await savePracticeLineup('no-such-session', []);
    expect(result.success).toBe(false);
    expect(result.matchIds).toHaveLength(0);
  });

  it('inherits the session default course/tee into the published groups', async () => {
    const { session } = await seedTripAndSession();
    await db.sessions.update(session.id, {
      defaultCourseId: 'course-1',
      defaultTeeSetId: 'tee-1',
    });

    await savePracticeLineup(session.id, [
      { localId: 'g1', groupNumber: 1, playerIds: ['p1', 'p2'], teeTime: '08:00' },
    ]);

    const written = await db.matches.where('sessionId').equals(session.id).first();
    expect(written?.courseId).toBe('course-1');
    expect(written?.teeSetId).toBe('tee-1');
  });
});
