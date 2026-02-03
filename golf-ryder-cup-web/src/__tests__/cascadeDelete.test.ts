/**
 * Cascade delete tests
 *
 * Phase 0 requirement: deleting a match must not leave orphaned scoring.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { db } from '../lib/db';
import { deleteMatchCascade } from '../lib/services/cascadeDelete';
import type { Trip, RyderCupSession, Match, HoleResult } from '../lib/types/models';
import { ScoringEventType, type ScoringEvent } from '../lib/types/events';

function isoNow() {
  return new Date().toISOString();
}

describe('cascadeDelete', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
  });

  it('deleteMatchCascade removes holeResults + scoringEvents for the match', async () => {
    const now = isoNow();

    const trip: Trip = {
      id: 'trip-1',
      name: 'Test Trip',
      startDate: now,
      endDate: now,
      isCaptainModeEnabled: true,
      createdAt: now,
      updatedAt: now,
    };

    const session: RyderCupSession = {
      id: 'session-1',
      tripId: trip.id,
      name: 'Session 1',
      sessionNumber: 1,
      sessionType: 'fourball',
      status: 'scheduled',
      createdAt: now,
    };

    const match: Match = {
      id: 'match-1',
      sessionId: session.id,
      matchOrder: 1,
      status: 'scheduled',
      currentHole: 1,
      teamAPlayerIds: [],
      teamBPlayerIds: [],
      teamAHandicapAllowance: 0,
      teamBHandicapAllowance: 0,
      result: 'notFinished',
      margin: 0,
      holesRemaining: 18,
      createdAt: now,
      updatedAt: now,
    };

    const holeResult: HoleResult = {
      id: 'hr-1',
      matchId: match.id,
      holeNumber: 1,
      winner: 'teamA',
      timestamp: now,
    };

    const scoringEvent: ScoringEvent = {
      id: 'event-1',
      matchId: match.id,
      eventType: ScoringEventType.HoleScored,
      timestamp: now,
      actorName: 'Test',
      payload: { type: 'hole_scored', holeNumber: 1, winner: 'teamA' },
      synced: false,
    };

    await db.trips.put(trip);
    await db.sessions.put(session);
    await db.matches.put(match);
    await db.holeResults.put(holeResult);
    await db.scoringEvents.add(scoringEvent);

    await deleteMatchCascade(match.id, { sync: false });

    expect(await db.matches.get(match.id)).toBeUndefined();
    expect(await db.holeResults.where('matchId').equals(match.id).count()).toBe(0);
    expect(await db.scoringEvents.where('matchId').equals(match.id).count()).toBe(0);
  });
});
