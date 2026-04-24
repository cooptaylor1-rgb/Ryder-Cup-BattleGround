/**
 * Cascade delete tests
 *
 * Phase 0 requirement: deleting a match must not leave orphaned scoring.
 * Phase 2 requirement: deleting a trip must leave zero orphaned rows across all trip-scoped tables.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { db } from '../lib/db';
import {
  deleteMatchCascade,
  deleteSessionCascade,
  deleteTripCascade,
} from '../lib/services/cascadeDelete';
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

  it('deleteTripCascade removes data from all trip-scoped tables', async () => {
    const now = isoNow();
    const tripId = 'trip-cascade';

    // Seed root trip
    await db.trips.put({
      id: tripId, name: 'Cascade Trip', startDate: now, endDate: now,
      isCaptainModeEnabled: true, createdAt: now, updatedAt: now,
    });

    // Teams + members
    await db.teams.put({ id: 'team-1', tripId, name: 'USA', color: 'usa', mode: 'ryderCup', createdAt: now });
    await db.teamMembers.put({ id: 'tm-1', teamId: 'team-1', playerId: 'p-1', sortOrder: 0, isCaptain: false, createdAt: now });

    // Players
    await db.players.put({ id: 'p-1', tripId, firstName: 'John', lastName: 'Doe', handicapIndex: 10 });

    // Sessions + matches + holeResults + scoringEvents
    await db.sessions.put({
      id: 'sess-1', tripId, name: 'S1', sessionNumber: 1, sessionType: 'fourball', status: 'scheduled', createdAt: now,
    });
    await db.matches.put({
      id: 'match-1', sessionId: 'sess-1', matchOrder: 1, status: 'scheduled', currentHole: 1,
      teamAPlayerIds: [], teamBPlayerIds: [], teamAHandicapAllowance: 0, teamBHandicapAllowance: 0,
      result: 'notFinished', margin: 0, holesRemaining: 18, createdAt: now, updatedAt: now,
    });
    await db.holeResults.put({ id: 'hr-1', matchId: 'match-1', holeNumber: 1, winner: 'teamA', timestamp: now });
    await db.scoringEvents.add({
      id: 'se-1', matchId: 'match-1', eventType: ScoringEventType.HoleScored,
      timestamp: now, actorName: 'Test', payload: { type: 'hole_scored', holeNumber: 1, winner: 'teamA' }, synced: false,
    });

    // Schedule
    await db.scheduleDays.put({ id: 'sd-1', tripId, date: now } as never);
    await db.scheduleItems.put({ id: 'si-1', scheduleDayId: 'sd-1', type: 'teeTime', sortOrder: 0 } as never);

    // Audit + banter
    await db.auditLog.put({ id: 'al-1', tripId, timestamp: now, actionType: 'score_override', description: 'test', actorName: 'Test' } as never);
    await db.banterPosts.put({ id: 'bp-1', tripId, timestamp: now, content: 'Banter', type: 'system' } as never);

    // Side bets
    await db.sideBets.put({ id: 'sb-1', tripId, title: 'Bet', status: 'active', createdAt: now, createdBy: 'p-1' } as never);

    // Extended side games
    await db.wolfGames.put({ id: 'wg-1', tripId, sessionId: 'sess-1', status: 'active', createdAt: now } as never);
    await db.vegasGames.put({ id: 'vg-1', tripId, sessionId: 'sess-1', status: 'active', createdAt: now } as never);
    await db.hammerGames.put({ id: 'hg-1', tripId, sessionId: 'sess-1', status: 'active', createdAt: now } as never);
    await db.nassauGames.put({ id: 'ng-1', tripId, sessionId: 'sess-1', status: 'active', createdAt: now } as never);
    await db.settlements.put({ id: 'set-1', tripId, fromPlayerId: 'p-1', toPlayerId: 'p-1', fromPlayerName: 'A', toPlayerName: 'B', amount: 10, status: 'pending', gameBreakdown: [], createdAt: now } as never);

    // Social
    await db.chatThreads.put({ id: 'ct-1', tripId, title: 'Thread', createdAt: now } as never);
    await db.chatMessages.put({ id: 'cm-1', tripId, threadId: 'ct-1', authorId: 'p-1', content: 'Hi', timestamp: now } as never);
    await db.trashTalks.put({ id: 'tt-1', tripId, authorId: 'p-1', authorName: 'J', content: 'Trash', type: 'manual', likes: [], comments: [], isHidden: false, reactions: {}, timestamp: now } as never);
    // (photos / photoAlbums were dropped in Dexie v15 — feature
    // never shipped a writer so no seed rows to cascade here.)
    await db.polls.put({ id: 'po-1', tripId, question: 'Q?', creatorId: 'p-1', creatorName: 'J', createdById: 'p-1', type: 'single', category: 'general', options: [], voters: [], status: 'active', isAnonymous: false, expiresAt: now } as never);
    await db.headToHeadRecords.put({ id: 'h2h-1', tripId, player1Id: 'p-1', player2Id: 'p-1', wins: 0, losses: 0, halves: 0 } as never);
    await db.tripArchives.put({ id: 'ta-1', tripId, archivedAt: now, tripName: 'Test', location: 'FL', startDate: now, endDate: now, winner: 'usa', finalScore: { teamA: 10, teamB: 8 }, teamAName: 'USA', teamBName: 'EUR', playerCount: 8, players: [], totalMatches: 4, totalHolesPlayed: 72, closestMatch: 'N/A', biggestBlowout: 'N/A', awards: [], highlights: [], photoCount: 0, sideGamesSummary: [] } as never);

    // Stats
    await db.tripStats.put({ id: 'ts-1', tripId, playerId: 'p-1', statType: 'birdies', value: 3, timestamp: now } as never);
    await db.tripAwards.put({ id: 'tw-1', tripId, awardType: 'mvp', winnerId: 'p-1', awardedAt: now });

    // Sync queue
    await db.tripSyncQueue.put({ id: 'sq-1', tripId, entity: 'trip', entityId: tripId, operation: 'create', status: 'pending', retryCount: 0, createdAt: now } as never);

    // Finances
    await db.duesLineItems.put({ id: 'dl-1', tripId, playerId: 'p-1', category: 'green_fee', amount: 50, status: 'unpaid', description: 'Greens fee' } as never);
    await db.paymentRecords.put({ id: 'pr-1', tripId, fromPlayerId: 'p-1', amount: 50, method: 'cash', lineItemIds: ['dl-1'], createdAt: now });

    // Trip logistics
    await db.tripInvitations.put({ id: 'invite-1', tripId, recipientName: 'Player', recipientEmail: 'player@example.com', inviteCode: 'ABCD1234', inviteUrl: '/join?code=ABCD1234&invite=invite-1', role: 'player', status: 'sent', createdAt: now, updatedAt: now } as never);
    await db.announcements.put({ id: 'ann-1', tripId, title: 'Tee times', message: 'Arrive early', priority: 'normal', category: 'schedule', status: 'sent', author: { name: 'Captain', role: 'captain' }, createdAt: now, updatedAt: now } as never);
    await db.attendanceRecords.put({ id: 'att-1', tripId, playerId: 'p-1', sessionId: 'sess-1', status: 'checked-in', createdAt: now, updatedAt: now });
    await db.cartAssignments.put({ id: 'cart-1', tripId, sessionId: 'sess-1', cartNumber: 'Cart 1', playerIds: ['p-1'], maxCapacity: 2, createdAt: now, updatedAt: now });

    // Execute cascade delete
    const result = await deleteTripCascade(tripId, { sync: false });

    // Verify EVERY table is clean
    expect(await db.trips.get(tripId)).toBeUndefined();
    expect(await db.teams.where('tripId').equals(tripId).count()).toBe(0);
    expect(await db.teamMembers.where('teamId').equals('team-1').count()).toBe(0);
    expect(await db.players.where('tripId').equals(tripId).count()).toBe(0);
    expect(await db.sessions.where('tripId').equals(tripId).count()).toBe(0);
    expect(await db.matches.where('sessionId').equals('sess-1').count()).toBe(0);
    expect(await db.holeResults.where('matchId').equals('match-1').count()).toBe(0);
    expect(await db.scoringEvents.where('matchId').equals('match-1').count()).toBe(0);
    expect(await db.scheduleDays.where('tripId').equals(tripId).count()).toBe(0);
    expect(await db.scheduleItems.where('scheduleDayId').equals('sd-1').count()).toBe(0);
    expect(await db.auditLog.where('tripId').equals(tripId).count()).toBe(0);
    expect(await db.banterPosts.where('tripId').equals(tripId).count()).toBe(0);
    expect(await db.sideBets.where('tripId').equals(tripId).count()).toBe(0);
    expect(await db.wolfGames.where('tripId').equals(tripId).count()).toBe(0);
    expect(await db.vegasGames.where('tripId').equals(tripId).count()).toBe(0);
    expect(await db.hammerGames.where('tripId').equals(tripId).count()).toBe(0);
    expect(await db.nassauGames.where('tripId').equals(tripId).count()).toBe(0);
    expect(await db.settlements.where('tripId').equals(tripId).count()).toBe(0);
    expect(await db.chatMessages.where('tripId').equals(tripId).count()).toBe(0);
    expect(await db.chatThreads.where('tripId').equals(tripId).count()).toBe(0);
    expect(await db.trashTalks.where('tripId').equals(tripId).count()).toBe(0);
    expect(await db.polls.where('tripId').equals(tripId).count()).toBe(0);
    expect(await db.headToHeadRecords.where('tripId').equals(tripId).count()).toBe(0);
    expect(await db.tripArchives.where('tripId').equals(tripId).count()).toBe(0);
    expect(await db.tripStats.where('tripId').equals(tripId).count()).toBe(0);
    expect(await db.tripAwards.where('tripId').equals(tripId).count()).toBe(0);
    expect(await db.tripSyncQueue.where('tripId').equals(tripId).count()).toBe(0);
    expect(await db.duesLineItems.where('tripId').equals(tripId).count()).toBe(0);
    expect(await db.paymentRecords.where('tripId').equals(tripId).count()).toBe(0);
    expect(await db.tripInvitations.where('tripId').equals(tripId).count()).toBe(0);
    expect(await db.announcements.where('tripId').equals(tripId).count()).toBe(0);
    expect(await db.attendanceRecords.where('tripId').equals(tripId).count()).toBe(0);
    expect(await db.cartAssignments.where('tripId').equals(tripId).count()).toBe(0);

    expect(result.tablesCleared).toBe(32);
    expect(result.recordsDeleted).toBeGreaterThan(0);
  });

  it('deleteSessionCascade removes matches, holeResults, practiceScores, and scoringEvents for the session', async () => {
    const now = isoNow();

    const trip: Trip = {
      id: 'trip-sess',
      name: 'Trip',
      startDate: now,
      endDate: now,
      isCaptainModeEnabled: true,
      createdAt: now,
      updatedAt: now,
    };
    await db.trips.add(trip);

    const session: RyderCupSession = {
      id: 'sess-cascade',
      tripId: trip.id,
      name: 'Day 1 AM',
      sessionNumber: 1,
      sessionType: 'fourball',
      pointsPerMatch: 1,
      status: 'scheduled',
      createdAt: now,
    };
    await db.sessions.add(session);

    // Two matches under this session plus one in a DIFFERENT session to
    // confirm the cascade doesn't over-reach and wipe unrelated rows.
    const matches: Match[] = [
      {
        id: 'm-1',
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
      },
      {
        id: 'm-2',
        sessionId: session.id,
        matchOrder: 2,
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
      },
      {
        id: 'm-other',
        sessionId: 'sess-other',
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
      },
    ];
    await db.matches.bulkAdd(matches);

    const holeResults: HoleResult[] = [
      { id: 'hr-1', matchId: 'm-1', holeNumber: 1, winner: 'teamA', timestamp: now },
      { id: 'hr-2', matchId: 'm-2', holeNumber: 1, winner: 'halved', timestamp: now },
      { id: 'hr-other', matchId: 'm-other', holeNumber: 1, winner: 'teamA', timestamp: now },
    ];
    await db.holeResults.bulkAdd(holeResults);

    await db.practiceScores.add({
      id: 'ps-1',
      matchId: 'm-1',
      playerId: 'p-1',
      holeNumber: 1,
      gross: 4,
      createdAt: now,
      updatedAt: now,
    });

    const scoringEvents: ScoringEvent[] = [
      {
        id: 'se-1',
        matchId: 'm-1',
        eventType: ScoringEventType.HoleScored,
        timestamp: now,
        actorName: 'Tester',
        payload: { type: 'hole_scored', holeNumber: 1, winner: 'teamA' },
        synced: false,
      },
      {
        id: 'se-other',
        matchId: 'm-other',
        eventType: ScoringEventType.HoleScored,
        timestamp: now,
        actorName: 'Tester',
        payload: { type: 'hole_scored', holeNumber: 1, winner: 'teamA' },
        synced: false,
      },
    ];
    await db.scoringEvents.bulkAdd(scoringEvents);

    await deleteSessionCascade(session.id, { sync: false });

    // Session + its two matches + their holeResults + practiceScores +
    // scoringEvents are gone.
    expect(await db.sessions.get(session.id)).toBeUndefined();
    expect(await db.matches.where('sessionId').equals(session.id).count()).toBe(0);
    expect(await db.holeResults.where('matchId').anyOf(['m-1', 'm-2']).count()).toBe(0);
    expect(await db.practiceScores.where('matchId').equals('m-1').count()).toBe(0);
    expect(await db.scoringEvents.where('matchId').equals('m-1').count()).toBe(0);

    // Other session's match and its data survive — over-reach check.
    expect(await db.matches.get('m-other')).toBeDefined();
    expect(await db.holeResults.get('hr-other')).toBeDefined();
    expect(await db.scoringEvents.where('id').equals('se-other').first()).toBeDefined();
  });

  it('deleteMatchCascade with sync=true queues cloud deletes for match + children', async () => {
    const now = isoNow();
    const trip: Trip = {
      id: 'trip-qd',
      name: 'T',
      startDate: now,
      endDate: now,
      isCaptainModeEnabled: true,
      createdAt: now,
      updatedAt: now,
    };
    await db.trips.add(trip);

    const session: RyderCupSession = {
      id: 'sess-qd',
      tripId: trip.id,
      name: 'S',
      sessionNumber: 1,
      sessionType: 'fourball',
      pointsPerMatch: 1,
      status: 'scheduled',
      createdAt: now,
    };
    await db.sessions.add(session);

    const match: Match = {
      id: 'm-qd',
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
    await db.matches.add(match);

    await db.holeResults.add({
      id: 'hr-qd',
      matchId: match.id,
      holeNumber: 1,
      winner: 'teamA',
      timestamp: now,
    });

    await deleteMatchCascade(match.id, { sync: true });

    // The sync queue should carry delete ops for match + each child
    // entity so cloud state stays consistent. Without this queueing,
    // a device that went offline mid-delete would keep the row in
    // Supabase and the next pull would resurrect it locally.
    const queued = await db.tripSyncQueue
      .where('tripId')
      .equals(trip.id)
      .toArray();
    const deleteOps = queued.filter((q) => q.operation === 'delete');
    const entities = deleteOps.map((q) => `${q.entity}:${q.entityId}`);
    expect(entities).toContain('match:m-qd');
    expect(entities).toContain('holeResult:hr-qd');
  });
});
