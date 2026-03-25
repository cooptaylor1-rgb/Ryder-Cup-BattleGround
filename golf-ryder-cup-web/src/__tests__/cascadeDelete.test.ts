/**
 * Cascade delete tests
 *
 * Phase 0 requirement: deleting a match must not leave orphaned scoring.
 * Phase 2 requirement: deleting a trip must leave zero orphaned rows across all 30 tables.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';

import { db } from '../lib/db';
import { deleteMatchCascade, deleteTripCascade } from '../lib/services/cascadeDelete';
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

  it('deleteTripCascade removes data from all 30 tables for the trip', async () => {
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
    await db.scheduleDays.put({ id: 'sd-1', tripId, date: now, dayNumber: 1, label: 'Day 1' });
    await db.scheduleItems.put({ id: 'si-1', scheduleDayId: 'sd-1', type: 'teeTime', label: '8am', sortOrder: 0 });

    // Audit + banter
    await db.auditLog.put({ id: 'al-1', tripId, timestamp: now, actionType: 'test', description: 'test', actorName: 'Test' });
    await db.banterPosts.put({ id: 'bp-1', tripId, timestamp: now, message: 'Banter', type: 'system' });

    // Side bets
    await db.sideBets.put({ id: 'sb-1', tripId, title: 'Bet', status: 'open', createdAt: now, createdBy: 'p-1' });

    // Extended side games
    await db.wolfGames.put({ id: 'wg-1', tripId, sessionId: 'sess-1', status: 'active', createdAt: now });
    await db.vegasGames.put({ id: 'vg-1', tripId, sessionId: 'sess-1', status: 'active', createdAt: now });
    await db.hammerGames.put({ id: 'hg-1', tripId, sessionId: 'sess-1', status: 'active', createdAt: now });
    await db.nassauGames.put({ id: 'ng-1', tripId, sessionId: 'sess-1', status: 'active', createdAt: now });
    await db.settlements.put({ id: 'set-1', tripId, fromPlayerId: 'p-1', toPlayerId: 'p-1', amount: 10, status: 'pending', createdAt: now });

    // Social
    await db.chatThreads.put({ id: 'ct-1', tripId, title: 'Thread', createdAt: now });
    await db.chatMessages.put({ id: 'cm-1', tripId, threadId: 'ct-1', authorId: 'p-1', content: 'Hi', timestamp: now });
    await db.trashTalks.put({ id: 'tt-1', tripId, authorId: 'p-1', content: 'Trash', timestamp: now });
    await db.photoAlbums.put({ id: 'pa-1', tripId, name: 'Album', createdAt: now });
    await db.photos.put({ id: 'ph-1', tripId, albumId: 'pa-1', uploaderId: 'p-1', url: 'http://x', uploadedAt: now });
    await db.polls.put({ id: 'po-1', tripId, question: 'Q?', createdById: 'p-1', status: 'active', expiresAt: now });
    await db.headToHeadRecords.put({ id: 'h2h-1', tripId, playerAId: 'p-1', playerBId: 'p-1', wins: 0, losses: 0, halves: 0 });
    await db.tripArchives.put({ id: 'ta-1', tripId, archivedAt: now, data: {} });

    // Stats
    await db.tripStats.put({ id: 'ts-1', tripId, playerId: 'p-1' });
    await db.tripAwards.put({ id: 'tw-1', tripId, awardType: 'mvp', winnerId: 'p-1' });

    // Sync queue
    await db.tripSyncQueue.put({ id: 'sq-1', tripId, entityType: 'trip', entityId: tripId, operation: 'create', status: 'pending', retryCount: 0, createdAt: now });

    // Finances
    await db.duesLineItems.put({ id: 'dl-1', tripId, playerId: 'p-1', category: 'greens', amount: 50, status: 'unpaid', description: 'Greens fee' });
    await db.paymentRecords.put({ id: 'pr-1', tripId, fromPlayerId: 'p-1', amount: 50, createdAt: now });

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
    expect(await db.photos.where('tripId').equals(tripId).count()).toBe(0);
    expect(await db.photoAlbums.where('tripId').equals(tripId).count()).toBe(0);
    expect(await db.polls.where('tripId').equals(tripId).count()).toBe(0);
    expect(await db.headToHeadRecords.where('tripId').equals(tripId).count()).toBe(0);
    expect(await db.tripArchives.where('tripId').equals(tripId).count()).toBe(0);
    expect(await db.tripStats.where('tripId').equals(tripId).count()).toBe(0);
    expect(await db.tripAwards.where('tripId').equals(tripId).count()).toBe(0);
    expect(await db.tripSyncQueue.where('tripId').equals(tripId).count()).toBe(0);
    expect(await db.duesLineItems.where('tripId').equals(tripId).count()).toBe(0);
    expect(await db.paymentRecords.where('tripId').equals(tripId).count()).toBe(0);

    expect(result.tablesCleared).toBe(30);
    expect(result.recordsDeleted).toBeGreaterThan(0);
  });
});
