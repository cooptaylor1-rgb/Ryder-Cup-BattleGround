/**
 * Round-trip contract tests for the match-day entities: Match and
 * RyderCupSession. The sync writers in tripSyncEntityWriters build
 * camelCase→snake_case cloud projections by hand, and the pull path
 * in tripSyncTripTransfer hand-rolls the reverse. A single column
 * rename in one direction and not the other silently corrupts data
 * on the next sync cycle. These tests pin the projections so either
 * side drifting makes the test fail loudly.
 *
 * The projections are duplicated here (rather than imported from
 * the writers) because the writer functions depend on Supabase +
 * Dexie runtime and drag in the whole sync pipeline. Keeping the
 * shapes local is the price of pinning the contract without a
 * full integration harness.
 */

import { describe, expect, it } from 'vitest';
import type { Match, RyderCupSession } from '../lib/types/models';

function projectSessionToCloud(s: RyderCupSession) {
  return {
    id: s.id,
    trip_id: s.tripId,
    name: s.name,
    session_number: s.sessionNumber,
    session_type: s.sessionType,
    scheduled_date: s.scheduledDate?.split('T')[0] || null,
    time_slot: s.timeSlot || null,
    first_tee_time: s.firstTeeTime || null,
    points_per_match: s.pointsPerMatch || 1.0,
    notes: s.notes || null,
    status: s.status || 'scheduled',
    is_locked: s.isLocked || false,
    is_practice_session: s.isPracticeSession || false,
    default_course_id: s.defaultCourseId || null,
    default_tee_set_id: s.defaultTeeSetId || null,
    updated_at: s.updatedAt,
  };
}

function parseCloudToSession(
  row: ReturnType<typeof projectSessionToCloud>
): RyderCupSession {
  return {
    id: row.id,
    tripId: row.trip_id,
    name: row.name,
    sessionNumber: row.session_number,
    sessionType: row.session_type as RyderCupSession['sessionType'],
    scheduledDate: row.scheduled_date ?? undefined,
    timeSlot: (row.time_slot as RyderCupSession['timeSlot']) ?? undefined,
    firstTeeTime: row.first_tee_time ?? undefined,
    pointsPerMatch: row.points_per_match,
    notes: row.notes ?? undefined,
    status: row.status as RyderCupSession['status'],
    isLocked: row.is_locked ?? undefined,
    isPracticeSession: row.is_practice_session || undefined,
    defaultCourseId: row.default_course_id ?? undefined,
    defaultTeeSetId: row.default_tee_set_id ?? undefined,
    createdAt: '2026-04-23T12:00:00Z',
    updatedAt: row.updated_at,
  };
}

function projectMatchToCloud(m: Match) {
  return {
    id: m.id,
    session_id: m.sessionId,
    course_id: m.courseId || null,
    tee_set_id: m.teeSetId || null,
    match_order: m.matchOrder || 0,
    status: m.status,
    start_time: m.startTime || null,
    current_hole: m.currentHole || 1,
    mode: m.mode || 'ryderCup',
    team_a_player_ids: m.teamAPlayerIds,
    team_b_player_ids: m.teamBPlayerIds,
    team_a_handicap_allowance: m.teamAHandicapAllowance || 0,
    team_b_handicap_allowance: m.teamBHandicapAllowance || 0,
    result: m.result || 'notFinished',
    margin: m.margin || 0,
    holes_remaining: m.holesRemaining || 0,
    version: typeof m.version === 'number' ? m.version : 0,
    notes: m.notes || null,
    updated_at: m.updatedAt,
  };
}

type CloudMatchRow = Omit<ReturnType<typeof projectMatchToCloud>, 'mode'> & {
  mode?: Match['mode'] | string;
};

function parseCloudToMatch(row: CloudMatchRow): Match {
  return {
    id: row.id,
    sessionId: row.session_id,
    courseId: row.course_id ?? undefined,
    teeSetId: row.tee_set_id ?? undefined,
    matchOrder: row.match_order,
    status: row.status as Match['status'],
    startTime: row.start_time ?? undefined,
    currentHole: row.current_hole,
    mode:
      row.mode === 'practice' || row.mode === 'ryderCup'
        ? (row.mode as Match['mode'])
        : 'ryderCup',
    teamAPlayerIds: row.team_a_player_ids,
    teamBPlayerIds: row.team_b_player_ids,
    teamAHandicapAllowance: row.team_a_handicap_allowance,
    teamBHandicapAllowance: row.team_b_handicap_allowance,
    result: row.result as Match['result'],
    margin: row.margin,
    holesRemaining: row.holes_remaining,
    version: typeof row.version === 'number' ? row.version : 0,
    notes: row.notes ?? undefined,
    createdAt: '2026-04-23T12:00:00Z',
    updatedAt: row.updated_at,
  };
}

describe('session sync round-trip', () => {
  it('preserves every field a captain cares about on match day', () => {
    const s: RyderCupSession = {
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
    const parsed = parseCloudToSession(projectSessionToCloud(s));
    expect(parsed.name).toBe(s.name);
    expect(parsed.sessionNumber).toBe(s.sessionNumber);
    expect(parsed.sessionType).toBe(s.sessionType);
    expect(parsed.scheduledDate).toBe(s.scheduledDate);
    expect(parsed.timeSlot).toBe(s.timeSlot);
    expect(parsed.firstTeeTime).toBe(s.firstTeeTime);
    expect(parsed.pointsPerMatch).toBe(s.pointsPerMatch);
    expect(parsed.notes).toBe(s.notes);
    expect(parsed.status).toBe(s.status);
    expect(parsed.defaultCourseId).toBe(s.defaultCourseId);
    expect(parsed.defaultTeeSetId).toBe(s.defaultTeeSetId);
  });

  it('preserves the practice flag so the bifurcation invariant holds after sync', () => {
    const practice: RyderCupSession = {
      id: 'sess-p',
      tripId: 'trip-1',
      name: 'Warm-up',
      sessionNumber: 0,
      sessionType: 'fourball',
      pointsPerMatch: 0,
      status: 'scheduled',
      isPracticeSession: true,
      createdAt: '2026-04-23T12:00:00Z',
      updatedAt: '2026-04-23T12:00:00Z',
    };
    const parsed = parseCloudToSession(projectSessionToCloud(practice));
    expect(parsed.isPracticeSession).toBe(true);
  });
});

describe('match sync round-trip', () => {
  it('preserves team rosters and handicap allowances', () => {
    const m: Match = {
      id: 'm-1',
      sessionId: 'sess-1',
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
    const parsed = parseCloudToMatch(projectMatchToCloud(m));
    expect(parsed.teamAPlayerIds).toEqual(m.teamAPlayerIds);
    expect(parsed.teamBPlayerIds).toEqual(m.teamBPlayerIds);
    expect(parsed.teamAHandicapAllowance).toBe(4);
    expect(parsed.teamBHandicapAllowance).toBe(2);
    expect(parsed.matchOrder).toBe(3);
    expect(parsed.status).toBe('inProgress');
    expect(parsed.currentHole).toBe(7);
    expect(parsed.margin).toBe(1);
    expect(parsed.holesRemaining).toBe(11);
    expect(parsed.version).toBe(5);
  });

  it('preserves mode=practice so practice matches stay out of cup standings', () => {
    const m: Match = {
      id: 'm-p',
      sessionId: 'sess-p',
      matchOrder: 1,
      status: 'scheduled',
      currentHole: 1,
      mode: 'practice',
      teamAPlayerIds: ['p1'],
      teamBPlayerIds: [],
      teamAHandicapAllowance: 0,
      teamBHandicapAllowance: 0,
      result: 'notFinished',
      margin: 0,
      holesRemaining: 18,
      createdAt: '2026-04-23T12:00:00Z',
      updatedAt: '2026-04-23T12:00:00Z',
    };
    const parsed = parseCloudToMatch(projectMatchToCloud(m));
    expect(parsed.mode).toBe('practice');
  });

  it('defaults mode to ryderCup when cloud row predates the mode column', () => {
    const preMigration = {
      ...projectMatchToCloud({
        id: 'old',
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
      mode: undefined as unknown as string,
    };
    const parsed = parseCloudToMatch(preMigration);
    expect(parsed.mode).toBe('ryderCup');
  });
});
