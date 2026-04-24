/**
 * Mutual-inverse tests for the three match-day mappers. Any field a
 * captain actually cares about must survive toCloud → fromCloud
 * with byte-identical shape (modulo the known normalizations —
 * null↔undefined, created_at stamped on empty rows, etc.). A single
 * column rename in one direction will surface as an assertion
 * failure here before it corrupts a real trip.
 */

import { describe, expect, it } from 'vitest';

import type { DuesLineItem, PaymentRecord } from '@/lib/types/finances';
import type {
  BanterPost,
  Course,
  HoleResult,
  Match,
  Player,
  PracticeScore,
  RyderCupSession,
  SideBet,
  Team,
  TeamMember,
  TeeSet,
  Trip,
} from '@/lib/types/models';
import {
  banterPostFromCloud,
  banterPostToCloud,
  courseFromCloud,
  courseToCloud,
  duesLineItemFromCloud,
  duesLineItemToCloud,
  holeResultFromCloud,
  holeResultToCloud,
  matchFromCloud,
  matchToCloud,
  paymentRecordFromCloud,
  paymentRecordToCloud,
  playerFromCloud,
  playerToCloud,
  practiceScoreFromCloud,
  practiceScoreToCloud,
  sessionFromCloud,
  sessionToCloud,
  sideBetFromCloud,
  sideBetToCloud,
  teamFromCloud,
  teamMemberFromCloud,
  teamMemberToCloud,
  teamToCloud,
  teeSetFromCloud,
  teeSetToCloud,
  tripFromCloud,
  tripToCloud,
} from '@/lib/services/trip-sync/tripSyncMappers';

describe('canonical non-scoring sync mappers', () => {
  it('round-trips trips, players, teams, and memberships', () => {
    const trip: Trip = {
      id: 'trip-1',
      name: 'Pinehurst Cup',
      startDate: '2026-05-01T12:00:00Z',
      endDate: '2026-05-04T12:00:00Z',
      location: 'Pinehurst, NC',
      notes: 'Bring rain gear',
      isCaptainModeEnabled: true,
      captainName: 'Coop',
      isPracticeRound: false,
      createdAt: '2026-04-23T12:00:00Z',
      updatedAt: '2026-04-23T13:00:00Z',
    };
    expect(tripFromCloud(tripToCloud(trip))).toMatchObject({
      id: trip.id,
      name: trip.name,
      location: trip.location,
      isCaptainModeEnabled: true,
    });

    const player: Player = {
      id: 'player-1',
      tripId: 'trip-1',
      linkedAuthUserId: 'auth-1',
      linkedProfileId: 'profile-1',
      firstName: 'Sam',
      lastName: 'Snead',
      email: 'sam@example.com',
      handicapIndex: 4.2,
      joinedAt: '2026-04-23T12:05:00Z',
    };
    expect(playerFromCloud(playerToCloud(player))).toMatchObject({
      tripId: 'trip-1',
      linkedAuthUserId: 'auth-1',
      linkedProfileId: 'profile-1',
      handicapIndex: 4.2,
    });

    const team: Team = {
      id: 'team-1',
      tripId: 'trip-1',
      name: 'Team A',
      color: 'usa',
      colorHex: '#002868',
      icon: 'flag',
      notes: 'Blue polos',
      mode: 'ryderCup',
      createdAt: '2026-04-23T12:00:00Z',
      updatedAt: '2026-04-23T13:00:00Z',
    };
    expect(teamFromCloud(teamToCloud(team))).toMatchObject({
      id: team.id,
      colorHex: '#002868',
      mode: 'ryderCup',
    });

    const member: TeamMember = {
      id: 'member-1',
      teamId: 'team-1',
      playerId: 'player-1',
      sortOrder: 2,
      isCaptain: true,
      createdAt: '2026-04-23T12:00:00Z',
    };
    expect(teamMemberFromCloud(teamMemberToCloud(member))).toEqual(member);
  });

  it('round-trips course and tee data including hole arrays', () => {
    const course: Course = {
      id: 'course-1',
      name: 'No. 2',
      location: 'Pinehurst',
      createdAt: '2026-04-23T12:00:00Z',
      updatedAt: '2026-04-23T13:00:00Z',
    };
    expect(courseToCloud(course, 'trip-1').trip_id).toBe('trip-1');
    expect(courseFromCloud(courseToCloud(course, 'trip-1'))).toMatchObject(course);

    const teeSet: TeeSet = {
      id: 'tee-1',
      courseId: 'course-1',
      name: 'Blue',
      color: 'blue',
      rating: 72.1,
      slope: 135,
      par: 72,
      holeHandicaps: Array.from({ length: 18 }, (_, index) => index + 1),
      holePars: Array.from({ length: 18 }, () => 4),
      yardages: Array.from({ length: 18 }, () => 400),
      totalYardage: 7200,
      createdAt: '2026-04-23T12:00:00Z',
      updatedAt: '2026-04-23T13:00:00Z',
    };
    const parsed = teeSetFromCloud(teeSetToCloud(teeSet, 'trip-1'));
    expect(parsed.holeHandicaps).toEqual(teeSet.holeHandicaps);
    expect(parsed.holePars).toEqual(teeSet.holePars);
    expect(parsed.yardages).toEqual(teeSet.yardages);
    expect(parsed.totalYardage).toBe(7200);
  });

  it('round-trips side bets, practice scores, banter, and finances', () => {
    const sideBet: SideBet = {
      id: 'bet-1',
      tripId: 'trip-1',
      sessionId: 'session-1',
      type: 'nassau',
      name: 'Nassau',
      description: 'Team nassau',
      status: 'completed',
      pot: 6000,
      perHole: 500,
      participantIds: ['p1', 'p2', 'p3', 'p4'],
      nassauTeamA: ['p1', 'p2'],
      nassauTeamB: ['p3', 'p4'],
      nassauResults: { front9Winner: 'teamA', back9Winner: 'push', overallWinner: 'teamB' },
      createdAt: '2026-04-23T12:00:00Z',
      completedAt: '2026-04-23T18:00:00Z',
    };
    const parsedBet = sideBetFromCloud(sideBetToCloud(sideBet));
    expect(parsedBet.sessionId).toBe('session-1');
    expect(parsedBet.participantIds).toEqual(sideBet.participantIds);
    expect(parsedBet.nassauResults?.overallWinner).toBe('teamB');

    const practiceScore: PracticeScore = {
      id: 'practice-1',
      matchId: 'match-1',
      playerId: 'player-1',
      holeNumber: 3,
      gross: 4,
      createdAt: '2026-04-23T12:00:00Z',
      updatedAt: '2026-04-23T13:00:00Z',
    };
    expect(practiceScoreFromCloud(practiceScoreToCloud(practiceScore))).toEqual(practiceScore);

    const post: BanterPost = {
      id: 'post-1',
      tripId: 'trip-1',
      authorId: 'player-1',
      authorName: 'Sam',
      content: 'Birdie train',
      postType: 'message',
      emoji: 'birdie',
      reactions: { fire: ['player-2'] },
      relatedMatchId: 'match-1',
      timestamp: '2026-04-23T13:00:00Z',
    };
    expect(banterPostFromCloud(banterPostToCloud(post))).toEqual(post);

    const dues: DuesLineItem = {
      id: 'dues-1',
      tripId: 'trip-1',
      playerId: 'player-1',
      category: 'green_fee',
      description: 'Round 1',
      amount: 15000,
      amountPaid: 5000,
      status: 'partial',
      dueDate: '2026-05-01T00:00:00Z',
      paidVia: 'venmo',
      createdBy: 'captain-1',
      createdAt: '2026-04-23T12:00:00Z',
      updatedAt: '2026-04-23T13:00:00Z',
    };
    expect(duesLineItemFromCloud(duesLineItemToCloud(dues))).toMatchObject(dues);

    const payment: PaymentRecord = {
      id: 'payment-1',
      tripId: 'trip-1',
      fromPlayerId: 'player-1',
      toPlayerId: 'captain-1',
      amount: 5000,
      method: 'venmo',
      lineItemIds: ['dues-1'],
      reference: 'txn-1',
      confirmedBy: 'captain-1',
      confirmedAt: '2026-04-23T13:00:00Z',
      notes: 'Deposit',
      createdAt: '2026-04-23T13:00:00Z',
    };
    expect(paymentRecordFromCloud(paymentRecordToCloud(payment))).toEqual(payment);
  });
});

describe('sessionToCloud / sessionFromCloud', () => {
  it('round-trips the match-day critical fields', () => {
    const session: RyderCupSession = {
      id: 'sess-1',
      tripId: 'trip-1',
      name: 'Day 1 AM',
      sessionNumber: 1,
      sessionType: 'fourball',
      scheduledDate: '2026-05-02',
      timeSlot: 'AM',
      firstTeeTime: '08:30',
      pointsPerMatch: 1,
      notes: 'Shotgun start',
      status: 'scheduled',
      isLocked: false,
      isPracticeSession: undefined,
      defaultCourseId: 'c1',
      defaultTeeSetId: 't1',
      createdAt: '2026-04-23T12:00:00Z',
      updatedAt: '2026-04-23T12:00:00Z',
    };
    const parsed = sessionFromCloud(sessionToCloud(session));
    expect(parsed.name).toBe(session.name);
    expect(parsed.sessionType).toBe('fourball');
    expect(parsed.firstTeeTime).toBe('08:30');
    expect(parsed.defaultCourseId).toBe('c1');
    expect(parsed.defaultTeeSetId).toBe('t1');
    expect(parsed.status).toBe('scheduled');
  });

  it('preserves isPracticeSession=true so bifurcation invariants hold after sync', () => {
    const practice: RyderCupSession = {
      id: 's',
      tripId: 't',
      name: 'Warm-up',
      sessionNumber: 0,
      sessionType: 'fourball',
      pointsPerMatch: 0,
      status: 'scheduled',
      isPracticeSession: true,
      createdAt: '2026-04-23T12:00:00Z',
      updatedAt: '2026-04-23T12:00:00Z',
    };
    const parsed = sessionFromCloud(sessionToCloud(practice));
    expect(parsed.isPracticeSession).toBe(true);
  });

  it('drops isPracticeSession when false so the flag is never noisily stored', () => {
    const cup: RyderCupSession = {
      id: 's',
      tripId: 't',
      name: 'Cup',
      sessionNumber: 1,
      sessionType: 'fourball',
      pointsPerMatch: 1,
      status: 'scheduled',
      isPracticeSession: false,
      createdAt: '2026-04-23T12:00:00Z',
      updatedAt: '2026-04-23T12:00:00Z',
    };
    const parsed = sessionFromCloud(sessionToCloud(cup));
    expect(parsed.isPracticeSession).toBeUndefined();
  });
});

describe('matchToCloud / matchFromCloud', () => {
  it('round-trips team rosters, allowances, status, mode, and version', () => {
    const match: Match = {
      id: 'm-1',
      sessionId: 's-1',
      courseId: 'c1',
      teeSetId: 't1',
      matchOrder: 3,
      status: 'inProgress',
      currentHole: 7,
      mode: 'ryderCup',
      teamAPlayerIds: ['pA1', 'pA2'],
      teamBPlayerIds: ['pB1', 'pB2'],
      teamAHandicapAllowance: 4,
      teamBHandicapAllowance: 2,
      result: 'notFinished',
      margin: 1,
      holesRemaining: 11,
      version: 5,
      createdAt: '2026-04-23T12:00:00Z',
      updatedAt: '2026-04-23T18:00:00Z',
    };
    const parsed = matchFromCloud(matchToCloud(match));
    expect(parsed.teamAPlayerIds).toEqual(match.teamAPlayerIds);
    expect(parsed.teamBPlayerIds).toEqual(match.teamBPlayerIds);
    expect(parsed.teamAHandicapAllowance).toBe(4);
    expect(parsed.teamBHandicapAllowance).toBe(2);
    expect(parsed.matchOrder).toBe(3);
    expect(parsed.status).toBe('inProgress');
    expect(parsed.mode).toBe('ryderCup');
    expect(parsed.version).toBe(5);
    expect(parsed.margin).toBe(1);
    expect(parsed.holesRemaining).toBe(11);
  });

  it('coerces unknown mode values to ryderCup (backward compat)', () => {
    const row = {
      ...matchToCloud({
        id: 'x',
        sessionId: 's',
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
        createdAt: '2026-04-23T12:00:00Z',
        updatedAt: '2026-04-23T12:00:00Z',
      }),
      mode: 'something-unknown',
    };
    expect(matchFromCloud(row).mode).toBe('ryderCup');
  });

  it('defaults version to 0 when cloud predates the column', () => {
    const row = matchToCloud({
      id: 'x',
      sessionId: 's',
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
      createdAt: '2026-04-23T12:00:00Z',
      updatedAt: '2026-04-23T12:00:00Z',
    });
    delete row.version;
    expect(matchFromCloud(row).version).toBe(0);
  });
});

describe('holeResultToCloud / holeResultFromCloud', () => {
  it('preserves fourball per-player scores through a round-trip', () => {
    const hr: HoleResult = {
      id: 'hr-1',
      matchId: 'm-1',
      holeNumber: 7,
      winner: 'teamA',
      teamAStrokes: 4,
      teamBStrokes: 5,
      teamAPlayerScores: [
        { playerId: 'pA1', grossScore: 4, netScore: 4, isBestBall: true },
        { playerId: 'pA2', grossScore: 5, netScore: 4 },
      ],
      teamBPlayerScores: [
        { playerId: 'pB1', grossScore: 5, netScore: 5, isBestBall: true },
      ],
      scoredBy: 'pA1',
      timestamp: '2026-04-23T18:00:00Z',
    };
    const parsed = holeResultFromCloud(holeResultToCloud(hr));
    expect(parsed.teamAPlayerScores).toEqual(hr.teamAPlayerScores);
    expect(parsed.teamBPlayerScores).toEqual(hr.teamBPlayerScores);
    expect(parsed.winner).toBe('teamA');
    expect(parsed.teamAStrokes).toBe(4);
  });

  it('coerces missing jsonb columns to undefined rather than null', () => {
    // Simulates a row returned from a Supabase deployment that
    // predates the add_scoring_sync_columns migration.
    const preMigration: Record<string, unknown> = {
      id: 'hr-2',
      match_id: 'm-1',
      hole_number: 1,
      winner: 'halved',
      team_a_strokes: 4,
      team_b_strokes: 4,
      timestamp: '2026-04-23T18:00:00Z',
    };
    const parsed = holeResultFromCloud(preMigration);
    expect(parsed.teamAPlayerScores).toBeUndefined();
    expect(parsed.teamBPlayerScores).toBeUndefined();
    expect(parsed.editHistory).toBeUndefined();
    expect(parsed.lastEditedAt).toBeUndefined();
  });

  it('preserves the edit audit trail through a round-trip', () => {
    const hr: HoleResult = {
      id: 'hr-3',
      matchId: 'm-1',
      holeNumber: 8,
      winner: 'teamA',
      teamAStrokes: 4,
      teamBStrokes: 5,
      editHistory: [
        {
          editedAt: '2026-04-23T18:05:00Z',
          editedBy: 'captain-1',
          previousWinner: 'teamB',
          newWinner: 'teamA',
          reason: 'Ball moved at address',
          isCaptainOverride: true,
        },
      ],
      lastEditedBy: 'captain-1',
      lastEditedAt: '2026-04-23T18:05:00Z',
      editReason: 'Ball moved at address',
      timestamp: '2026-04-23T18:00:00Z',
    };
    const parsed = holeResultFromCloud(holeResultToCloud(hr));
    expect(parsed.editHistory).toEqual(hr.editHistory);
    expect(parsed.editReason).toBe('Ball moved at address');
  });
});
