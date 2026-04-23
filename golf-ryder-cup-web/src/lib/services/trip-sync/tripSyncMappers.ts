/**
 * Bidirectional mappers between Dexie (camelCase) and Supabase
 * (snake_case) for the match-day critical entities.
 *
 * The writer in tripSyncEntityWriters built a cloudData object by
 * hand and the pull path in tripSyncTripTransfer did the reverse
 * projection, also by hand. A single typo in one direction silently
 * corrupted data on the next sync cycle — exactly how fourball
 * per-player scores silently vanished for weeks, and exactly how
 * the Match.version column would have silently reset to 0 on pull
 * if the field order ever drifted.
 *
 * Keeping one module that owns the column names makes the
 * projection rules discoverable: grep for `match_order` and you
 * find the single function that writes AND reads it. Round-trip
 * tests (sessionMatchSyncRoundTrip.test.ts, holeResultSyncRound
 * Trip.test.ts) already lock the contract; these mappers just
 * make future edits land in one place instead of two.
 *
 * Scope: Match, RyderCupSession, HoleResult. The non-critical
 * entities (Trip, Player, Team, TeamMember, Course, TeeSet,
 * SideBet, PracticeScore, BanterPost) keep their hand-rolled
 * projection for now — the payoff of the refactor is concentrated
 * in the scoring pipeline.
 */

import type {
  HoleResult,
  HoleResultEdit,
  Match,
  PlayerHoleScore,
  RyderCupSession,
} from '@/lib/types/models';

// ---------------------------------------------------------------
// RyderCupSession
// ---------------------------------------------------------------

export function sessionToCloud(s: RyderCupSession): Record<string, unknown> {
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
    updated_at: s.updatedAt || new Date().toISOString(),
  };
}

export function sessionFromCloud(row: Record<string, unknown>): RyderCupSession {
  return {
    id: String(row.id),
    tripId: String(row.trip_id),
    name: String(row.name ?? ''),
    sessionNumber: Number(row.session_number),
    sessionType: row.session_type as RyderCupSession['sessionType'],
    scheduledDate:
      typeof row.scheduled_date === 'string' ? row.scheduled_date : undefined,
    timeSlot:
      (row.time_slot as RyderCupSession['timeSlot']) ?? undefined,
    firstTeeTime:
      typeof row.first_tee_time === 'string' ? row.first_tee_time : undefined,
    pointsPerMatch:
      typeof row.points_per_match === 'number' ? row.points_per_match : undefined,
    notes: typeof row.notes === 'string' ? row.notes : undefined,
    status: row.status as RyderCupSession['status'],
    isLocked: Boolean(row.is_locked),
    isPracticeSession: row.is_practice_session === true ? true : undefined,
    defaultCourseId:
      typeof row.default_course_id === 'string' ? row.default_course_id : undefined,
    defaultTeeSetId:
      typeof row.default_tee_set_id === 'string' ? row.default_tee_set_id : undefined,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

// ---------------------------------------------------------------
// Match
// ---------------------------------------------------------------

export function matchToCloud(m: Match): Record<string, unknown> {
  const incomingUpdatedAt = m.updatedAt || new Date().toISOString();
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
    // version is client-incremented on every scoring write; persisting
    // it server-side lets other devices detect they raced a stale copy
    // and reconcile instead of silently overwriting.
    version: typeof m.version === 'number' ? m.version : 0,
    notes: m.notes || null,
    updated_at: incomingUpdatedAt,
  };
}

export function matchFromCloud(row: Record<string, unknown>): Match {
  return {
    id: String(row.id),
    sessionId: String(row.session_id),
    courseId: typeof row.course_id === 'string' ? row.course_id : undefined,
    teeSetId: typeof row.tee_set_id === 'string' ? row.tee_set_id : undefined,
    matchOrder: Number(row.match_order ?? 0),
    status: row.status as Match['status'],
    startTime: typeof row.start_time === 'string' ? row.start_time : undefined,
    currentHole: Number(row.current_hole ?? 1),
    // Missing mode column on older deployments should degrade
    // to the default so pre-migration pulls still parse.
    mode:
      row.mode === 'practice' || row.mode === 'ryderCup'
        ? (row.mode as Match['mode'])
        : 'ryderCup',
    teamAPlayerIds: Array.isArray(row.team_a_player_ids)
      ? (row.team_a_player_ids as string[])
      : [],
    teamBPlayerIds: Array.isArray(row.team_b_player_ids)
      ? (row.team_b_player_ids as string[])
      : [],
    teamAHandicapAllowance: Number(row.team_a_handicap_allowance ?? 0),
    teamBHandicapAllowance: Number(row.team_b_handicap_allowance ?? 0),
    result: row.result as Match['result'],
    margin: Number(row.margin ?? 0),
    holesRemaining: Number(row.holes_remaining ?? 0),
    // Carry the server-side version into Dexie so the next write
    // can bump from a known-fresh baseline. Pre-migration servers
    // return undefined here; start at 0.
    version: typeof row.version === 'number' ? row.version : 0,
    notes: typeof row.notes === 'string' ? row.notes : undefined,
    createdAt: String(row.created_at ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? new Date().toISOString()),
  };
}

// ---------------------------------------------------------------
// HoleResult
// ---------------------------------------------------------------

export function holeResultToCloud(h: HoleResult): Record<string, unknown> {
  const incomingTimestamp = h.timestamp || new Date().toISOString();
  return {
    id: h.id,
    match_id: h.matchId,
    hole_number: h.holeNumber,
    winner: h.winner,
    team_a_strokes: h.teamAStrokes || null,
    team_b_strokes: h.teamBStrokes || null,
    // Per-player arrays survive the round-trip as jsonb. Previously
    // only the aggregate team strokes were synced so fourball/best-
    // ball matches silently lost individual gross scores after any
    // refresh or device swap.
    team_a_player_scores: h.teamAPlayerScores ?? null,
    team_b_player_scores: h.teamBPlayerScores ?? null,
    // Audit trail — captains need this to reconstruct disputed
    // scores after a device swap. Kept nullable so older clients
    // without audit data still write fine.
    edit_history: h.editHistory ?? null,
    last_edited_by: h.lastEditedBy ?? null,
    last_edited_at: h.lastEditedAt ?? null,
    edit_reason: h.editReason ?? null,
    scored_by: h.scoredBy || null,
    notes: h.notes || null,
    timestamp: incomingTimestamp,
  };
}

export function holeResultFromCloud(row: Record<string, unknown>): HoleResult {
  return {
    id: String(row.id),
    matchId: String(row.match_id),
    holeNumber: Number(row.hole_number),
    winner: row.winner as HoleResult['winner'],
    teamAStrokes: typeof row.team_a_strokes === 'number' ? row.team_a_strokes : undefined,
    teamBStrokes: typeof row.team_b_strokes === 'number' ? row.team_b_strokes : undefined,
    // Older deployments return undefined for these jsonb columns;
    // we coerce to undefined so the Dexie row stays clean rather
    // than carrying a literal null that later comparisons would
    // have to special-case.
    teamAPlayerScores: Array.isArray(row.team_a_player_scores)
      ? (row.team_a_player_scores as PlayerHoleScore[])
      : undefined,
    teamBPlayerScores: Array.isArray(row.team_b_player_scores)
      ? (row.team_b_player_scores as PlayerHoleScore[])
      : undefined,
    editHistory: Array.isArray(row.edit_history)
      ? (row.edit_history as HoleResultEdit[])
      : undefined,
    lastEditedBy:
      typeof row.last_edited_by === 'string' ? row.last_edited_by : undefined,
    lastEditedAt:
      typeof row.last_edited_at === 'string' ? row.last_edited_at : undefined,
    editReason:
      typeof row.edit_reason === 'string' ? row.edit_reason : undefined,
    scoredBy: typeof row.scored_by === 'string' ? row.scored_by : undefined,
    notes: typeof row.notes === 'string' ? row.notes : undefined,
    timestamp: String(row.timestamp),
  };
}
