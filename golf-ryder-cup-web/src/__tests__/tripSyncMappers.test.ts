/**
 * Mutual-inverse tests for the three match-day mappers. Any field a
 * captain actually cares about must survive toCloud → fromCloud
 * with byte-identical shape (modulo the known normalizations —
 * null↔undefined, created_at stamped on empty rows, etc.). A single
 * column rename in one direction will surface as an assertion
 * failure here before it corrupts a real trip.
 */

import { describe, expect, it } from 'vitest';

import type { HoleResult, Match, RyderCupSession } from '@/lib/types/models';
import {
  holeResultFromCloud,
  holeResultToCloud,
  matchFromCloud,
  matchToCloud,
  sessionFromCloud,
  sessionToCloud,
} from '@/lib/services/trip-sync/tripSyncMappers';

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
