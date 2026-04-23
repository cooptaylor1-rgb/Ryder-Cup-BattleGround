/**
 * Practice rounds must stay out of cup standings.
 *
 * Two guards are in place — session.isPracticeSession filters out the
 * whole session, and match.mode==='practice' filters out an individual
 * match inside an otherwise-normal session. Test both.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/lib/db';
import { calculateTeamStandings } from '@/lib/services/tournamentEngine';
import type { HoleResult, Match, RyderCupSession, Trip } from '@/lib/types/models';

function isoNow() {
  return '2026-04-23T12:00:00.000Z';
}

function createHoleResults(
  matchId: string,
  winners: Array<HoleResult['winner']>
): HoleResult[] {
  return winners.map((winner, index) => ({
    id: `${matchId}-hole-${index + 1}`,
    matchId,
    holeNumber: index + 1,
    winner,
    timestamp: isoNow(),
  }));
}

describe('calculateTeamStandings — practice exclusion', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
  });

  it('does not count points from a practice session', async () => {
    const now = isoNow();
    const trip: Trip = {
      id: 'trip-1',
      name: 'Trip',
      startDate: now,
      endDate: now,
      isCaptainModeEnabled: true,
      createdAt: now,
      updatedAt: now,
    };
    await db.trips.add(trip);

    const practiceSession: RyderCupSession = {
      id: 'practice-1',
      tripId: trip.id,
      name: 'Thursday practice',
      sessionNumber: 1,
      sessionType: 'fourBall',
      pointsPerMatch: 1,
      status: 'completed',
      isPracticeSession: true,
      createdAt: now,
    };
    const cupSession: RyderCupSession = {
      id: 'cup-1',
      tripId: trip.id,
      name: 'Friday AM',
      sessionNumber: 2,
      sessionType: 'fourBall',
      pointsPerMatch: 1,
      status: 'completed',
      createdAt: now,
    };
    await db.sessions.bulkAdd([practiceSession, cupSession]);

    // A practice match that would otherwise award cup points to team A
    const practiceMatch: Match = {
      id: 'practice-match-1',
      sessionId: practiceSession.id,
      mode: 'practice',
      matchOrder: 1,
      status: 'completed',
      currentHole: 18,
      teamAPlayerIds: ['p1', 'p2', 'p3', 'p4'],
      teamBPlayerIds: [],
      teamAHandicapAllowance: 0,
      teamBHandicapAllowance: 0,
      result: 'notFinished',
      margin: 0,
      holesRemaining: 0,
      createdAt: now,
      updatedAt: now,
    };
    // A cup match where team A wins 5&4 (13 holes played, all won by A)
    const cupMatch: Match = {
      id: 'cup-match-1',
      sessionId: cupSession.id,
      mode: 'ryderCup',
      matchOrder: 1,
      status: 'completed',
      currentHole: 14,
      teamAPlayerIds: ['a1', 'a2'],
      teamBPlayerIds: ['b1', 'b2'],
      teamAHandicapAllowance: 0,
      teamBHandicapAllowance: 0,
      result: 'notFinished',
      margin: 5,
      holesRemaining: 4,
      createdAt: now,
      updatedAt: now,
    };
    await db.matches.bulkAdd([practiceMatch, cupMatch]);

    // Practice match has phantom team-A wins; cup match also has team-A wins
    await db.holeResults.bulkAdd([
      ...createHoleResults(practiceMatch.id, new Array(13).fill('teamA')),
      ...createHoleResults(cupMatch.id, new Array(13).fill('teamA')),
    ]);

    const standings = await calculateTeamStandings(trip.id);

    // Only the cup match (worth 1 point to team A) should count.
    expect(standings.teamAPoints).toBe(1);
    expect(standings.teamBPoints).toBe(0);
    expect(standings.totalMatches).toBe(1);
  });

  it('skips individual practice matches even inside a non-practice session', async () => {
    const now = isoNow();
    const trip: Trip = {
      id: 'trip-2',
      name: 'Mixed',
      startDate: now,
      endDate: now,
      isCaptainModeEnabled: true,
      createdAt: now,
      updatedAt: now,
    };
    await db.trips.add(trip);

    const session: RyderCupSession = {
      id: 'session-1',
      tripId: trip.id,
      name: 'Cup session',
      sessionNumber: 1,
      sessionType: 'fourBall',
      pointsPerMatch: 1,
      status: 'completed',
      createdAt: now,
    };
    await db.sessions.add(session);

    const practiceMatch: Match = {
      id: 'match-prac',
      sessionId: session.id,
      mode: 'practice',
      matchOrder: 1,
      status: 'completed',
      currentHole: 18,
      teamAPlayerIds: ['p1', 'p2'],
      teamBPlayerIds: [],
      teamAHandicapAllowance: 0,
      teamBHandicapAllowance: 0,
      result: 'notFinished',
      margin: 0,
      holesRemaining: 0,
      createdAt: now,
      updatedAt: now,
    };
    const cupMatch: Match = {
      id: 'match-cup',
      sessionId: session.id,
      mode: 'ryderCup',
      matchOrder: 2,
      status: 'completed',
      currentHole: 18,
      teamAPlayerIds: ['a1'],
      teamBPlayerIds: ['b1'],
      teamAHandicapAllowance: 0,
      teamBHandicapAllowance: 0,
      result: 'notFinished',
      margin: 0,
      holesRemaining: 0,
      createdAt: now,
      updatedAt: now,
    };
    await db.matches.bulkAdd([practiceMatch, cupMatch]);

    await db.holeResults.bulkAdd([
      ...createHoleResults(practiceMatch.id, new Array(18).fill('teamA')),
      ...createHoleResults(cupMatch.id, new Array(18).fill('halved')),
    ]);

    const standings = await calculateTeamStandings(trip.id);

    // Only the cup match counts, ends tied = 0.5 each
    expect(standings.totalMatches).toBe(1);
    expect(standings.teamAPoints).toBe(0.5);
    expect(standings.teamBPoints).toBe(0.5);
  });
});
