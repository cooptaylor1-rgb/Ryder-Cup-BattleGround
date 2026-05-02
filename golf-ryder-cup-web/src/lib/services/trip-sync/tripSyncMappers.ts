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
 * Scope: every trip-sync entity that has a local Dexie model and a
 * Supabase table. Writers and pull code import these same functions
 * so a field rename lands in one place.
 */

import type { DuesLineItem, PaymentRecord } from '@/lib/types/finances';
import type { Announcement, AttendanceRecord, CartAssignment, TripInvitation } from '@/lib/types/logistics';
import {
  coerceHandicapSettings,
  coerceScoringSettings,
} from '@/lib/utils/tripSettingsGuards';
import type {
  BanterPost,
  Course,
  HoleResult,
  HoleResultEdit,
  Match,
  Player,
  PlayerHoleScore,
  PracticeScore,
  RyderCupSession,
  SideBet,
  Team,
  TeamMember,
  TeeSet,
  Trip,
} from '@/lib/types/models';

const nowIso = () => new Date().toISOString();

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function numberOrUndefined(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function numberArrayOrUndefined(value: unknown): number[] | undefined {
  return Array.isArray(value) && value.every((item) => typeof item === 'number')
    ? (value as number[])
    : undefined;
}

function parseJsonObject(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw !== 'string' || raw.trim() === '') return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function optionalNumber(value: unknown): number | undefined {
  return numberOrUndefined(value);
}

function jsonArrayOrUndefined<T = unknown>(value: unknown): T[] | undefined {
  return Array.isArray(value) ? (value as T[]) : undefined;
}

function jsonObjectOrUndefined<T = Record<string, unknown>>(value: unknown): T | undefined {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as T) : undefined;
}

function hasObjectKeys(value: object | undefined): boolean {
  return Boolean(value && Object.keys(value).length > 0);
}

// ---------------------------------------------------------------
// Trip
// ---------------------------------------------------------------

export function tripToCloud(trip: Trip): Record<string, unknown> {
  return {
    id: trip.id,
    name: trip.name,
    start_date: trip.startDate.split('T')[0],
    end_date: trip.endDate.split('T')[0],
    location: trip.location || null,
    notes: trip.notes || null,
    is_captain_mode_enabled: trip.isCaptainModeEnabled,
    captain_name: trip.captainName || null,
    is_practice_round: trip.isPracticeRound || false,
    scoring_settings: trip.scoringSettings ?? null,
    handicap_settings: trip.handicapSettings ?? null,
    manual_team_a_points: trip.manualTeamAPoints ?? null,
    manual_team_b_points: trip.manualTeamBPoints ?? null,
    created_at: trip.createdAt,
    updated_at: trip.updatedAt || nowIso(),
  };
}

export function tripFromCloud(row: Record<string, unknown>): Trip {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    startDate: String(row.start_date ?? ''),
    endDate: String(row.end_date ?? ''),
    location: optionalString(row.location),
    notes: optionalString(row.notes),
    isCaptainModeEnabled: row.is_captain_mode_enabled === true,
    captainName: optionalString(row.captain_name),
    isPracticeRound: row.is_practice_round === true ? true : undefined,
    scoringSettings: coerceScoringSettings(row.scoring_settings),
    handicapSettings: coerceHandicapSettings(row.handicap_settings),
    manualTeamAPoints: numberOrUndefined(row.manual_team_a_points),
    manualTeamBPoints: numberOrUndefined(row.manual_team_b_points),
    createdAt: String(row.created_at ?? nowIso()),
    updatedAt: String(row.updated_at ?? nowIso()),
  };
}

// ---------------------------------------------------------------
// Player / Team / TeamMember
// ---------------------------------------------------------------

export function playerToCloud(player: Player, fallbackTripId?: string): Record<string, unknown> {
  return {
    id: player.id,
    trip_id: player.tripId ?? fallbackTripId ?? null,
    linked_auth_user_id: player.linkedAuthUserId ?? null,
    linked_profile_id: player.linkedProfileId ?? null,
    first_name: player.firstName,
    last_name: player.lastName,
    email: player.email || null,
    handicap_index: typeof player.handicapIndex === 'number' ? player.handicapIndex : null,
    ghin: player.ghin || null,
    tee_preference: player.teePreference || null,
    avatar_url: player.avatarUrl || null,
    joined_at: player.joinedAt || null,
    created_at: player.createdAt ?? nowIso(),
    updated_at: player.updatedAt ?? nowIso(),
  };
}

export function playerFromCloud(row: Record<string, unknown>, fallbackTripId?: string): Player {
  return {
    id: String(row.id),
    tripId: optionalString(row.trip_id) ?? fallbackTripId,
    linkedAuthUserId: optionalString(row.linked_auth_user_id),
    linkedProfileId: optionalString(row.linked_profile_id),
    firstName: String(row.first_name ?? ''),
    lastName: String(row.last_name ?? ''),
    email: optionalString(row.email),
    handicapIndex: numberOrUndefined(row.handicap_index),
    ghin: optionalString(row.ghin),
    teePreference: optionalString(row.tee_preference),
    avatarUrl: optionalString(row.avatar_url),
    joinedAt: optionalString(row.joined_at),
    createdAt: optionalString(row.created_at),
    updatedAt: optionalString(row.updated_at),
  };
}

export function teamToCloud(team: Team): Record<string, unknown> {
  return {
    id: team.id,
    trip_id: team.tripId,
    name: team.name,
    color: team.color,
    color_hex: team.colorHex || null,
    icon: team.icon || null,
    notes: team.notes || null,
    mode: team.mode || 'ryderCup',
    created_at: team.createdAt,
    updated_at: team.updatedAt || nowIso(),
  };
}

export function teamFromCloud(row: Record<string, unknown>): Team {
  return {
    id: String(row.id),
    tripId: String(row.trip_id),
    name: String(row.name ?? ''),
    color: row.color as Team['color'],
    colorHex: optionalString(row.color_hex),
    icon: optionalString(row.icon),
    notes: optionalString(row.notes),
    mode: (row.mode as Team['mode']) || 'ryderCup',
    createdAt: String(row.created_at ?? nowIso()),
    updatedAt: optionalString(row.updated_at),
  };
}

export function teamMemberToCloud(member: TeamMember): Record<string, unknown> {
  return {
    id: member.id,
    team_id: member.teamId,
    player_id: member.playerId,
    sort_order: member.sortOrder || 0,
    is_captain: member.isCaptain || false,
    created_at: member.createdAt,
  };
}

export function teamMemberFromCloud(row: Record<string, unknown>): TeamMember {
  return {
    id: String(row.id),
    teamId: String(row.team_id),
    playerId: String(row.player_id),
    sortOrder: Number(row.sort_order ?? 0),
    isCaptain: row.is_captain === true,
    createdAt: String(row.created_at ?? nowIso()),
  };
}

// ---------------------------------------------------------------
// Course / TeeSet
// ---------------------------------------------------------------

export function courseToCloud(course: Course, tripId?: string): Record<string, unknown> {
  return {
    id: course.id,
    trip_id: tripId ?? null,
    name: course.name,
    location: course.location || null,
    created_at: course.createdAt,
    updated_at: course.updatedAt || nowIso(),
  };
}

export function courseFromCloud(row: Record<string, unknown>): Course {
  return {
    id: String(row.id),
    name: String(row.name ?? ''),
    location: optionalString(row.location),
    createdAt: String(row.created_at ?? nowIso()),
    updatedAt: String(row.updated_at ?? nowIso()),
  };
}

export function teeSetToCloud(teeSet: TeeSet, tripId?: string): Record<string, unknown> {
  return {
    id: teeSet.id,
    trip_id: tripId ?? null,
    course_id: teeSet.courseId,
    name: teeSet.name,
    color: teeSet.color || null,
    rating: teeSet.rating,
    slope: teeSet.slope,
    par: teeSet.par,
    hole_handicaps: teeSet.holeHandicaps,
    hole_pars: teeSet.holePars || null,
    yardages: teeSet.yardages || null,
    total_yardage: teeSet.totalYardage || null,
    created_at: teeSet.createdAt,
    updated_at: teeSet.updatedAt || nowIso(),
  };
}

export function teeSetFromCloud(row: Record<string, unknown>): TeeSet {
  return {
    id: String(row.id),
    courseId: String(row.course_id),
    name: String(row.name ?? ''),
    color: optionalString(row.color),
    rating: Number(row.rating ?? 0),
    slope: Number(row.slope ?? 0),
    par: Number(row.par ?? 72),
    holeHandicaps: numberArrayOrUndefined(row.hole_handicaps) ?? [],
    holePars: numberArrayOrUndefined(row.hole_pars),
    yardages: numberArrayOrUndefined(row.yardages),
    totalYardage: numberOrUndefined(row.total_yardage),
    createdAt: String(row.created_at ?? nowIso()),
    updatedAt: String(row.updated_at ?? nowIso()),
  };
}

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
    created_at: s.createdAt,
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
    createdAt: String(row.created_at ?? nowIso()),
    updatedAt: String(row.updated_at ?? nowIso()),
  };
}

// ---------------------------------------------------------------
// Match
// ---------------------------------------------------------------

export function matchToCloud(m: Match): Record<string, unknown> {
  const incomingUpdatedAt = m.updatedAt || nowIso();
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
    created_at: m.createdAt,
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
    createdAt: String(row.created_at ?? nowIso()),
    updatedAt: String(row.updated_at ?? nowIso()),
  };
}

// ---------------------------------------------------------------
// HoleResult
// ---------------------------------------------------------------

export function holeResultToCloud(h: HoleResult): Record<string, unknown> {
  const incomingTimestamp = h.timestamp || nowIso();
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

// ---------------------------------------------------------------
// PracticeScore / SideBet / BanterPost
// ---------------------------------------------------------------

export function practiceScoreToCloud(score: PracticeScore): Record<string, unknown> {
  return {
    id: score.id,
    match_id: score.matchId,
    player_id: score.playerId,
    hole_number: score.holeNumber,
    gross: score.gross ?? null,
    created_at: score.createdAt,
    updated_at: score.updatedAt || nowIso(),
  };
}

export function practiceScoreFromCloud(row: Record<string, unknown>): PracticeScore {
  return {
    id: String(row.id),
    matchId: String(row.match_id),
    playerId: String(row.player_id),
    holeNumber: Number(row.hole_number),
    gross: numberOrUndefined(row.gross),
    createdAt: String(row.created_at ?? nowIso()),
    updatedAt: String(row.updated_at ?? nowIso()),
  };
}

export function packSideBetNotes(bet: SideBet): string {
  return JSON.stringify({
    description: bet.description,
    perHole: bet.perHole,
    status: bet.status,
    participantIds: bet.participantIds,
    sessionId: bet.sessionId,
    results: bet.results,
    nassauTeamA: bet.nassauTeamA,
    nassauTeamB: bet.nassauTeamB,
    nassauResults: bet.nassauResults,
    completedAt: bet.completedAt,
  });
}

export function parseSideBetNotes(raw: unknown): Record<string, unknown> {
  return parseJsonObject(raw);
}

export function sideBetToCloud(bet: SideBet): Record<string, unknown> {
  return {
    id: bet.id,
    trip_id: bet.tripId,
    match_id: bet.matchId ?? null,
    session_id: bet.sessionId ?? null,
    bet_type: bet.type,
    name: bet.name,
    description: bet.description || null,
    status: bet.status,
    amount: bet.pot ?? bet.perHole ?? null,
    per_hole: bet.perHole ?? null,
    winner_player_id: bet.winnerId ?? null,
    hole_number: bet.hole ?? null,
    participant_ids: bet.participantIds,
    results: bet.results ?? [],
    nassau_team_a: bet.nassauTeamA ?? [],
    nassau_team_b: bet.nassauTeamB ?? [],
    nassau_results: bet.nassauResults ?? {},
    completed_at: bet.completedAt ?? null,
    notes: packSideBetNotes(bet),
    created_at: bet.createdAt,
    updated_at: nowIso(),
  };
}

export function sideBetFromCloud(row: Record<string, unknown>): SideBet {
  const parsedNotes = parseSideBetNotes(row.notes);
  const participantIds = stringArray(row.participant_ids);
  const parsedParticipantIds = stringArray(parsedNotes.participantIds);
  const results = jsonArrayOrUndefined<NonNullable<SideBet['results']>[number]>(row.results);
  const parsedResults = jsonArrayOrUndefined<NonNullable<SideBet['results']>[number]>(
    parsedNotes.results
  );
  const nassauTeamA = stringArray(row.nassau_team_a);
  const parsedNassauTeamA = stringArray(parsedNotes.nassauTeamA);
  const nassauTeamB = stringArray(row.nassau_team_b);
  const parsedNassauTeamB = stringArray(parsedNotes.nassauTeamB);
  const nassauResults = jsonObjectOrUndefined<NonNullable<SideBet['nassauResults']>>(
    row.nassau_results
  );
  const parsedNassauResults = jsonObjectOrUndefined<NonNullable<SideBet['nassauResults']>>(
    parsedNotes.nassauResults
  );

  return {
    id: String(row.id),
    tripId: String(row.trip_id),
    matchId: optionalString(row.match_id),
    sessionId: optionalString(row.session_id) ?? optionalString(parsedNotes.sessionId),
    type: (row.bet_type as SideBet['type']) || 'custom',
    name: String(row.name ?? ''),
    description:
      optionalString(row.description) ??
      (typeof parsedNotes.description === 'string' ? parsedNotes.description : ''),
    status:
      (row.status as SideBet['status']) || (parsedNotes.status as SideBet['status']) || 'active',
    pot: numberOrUndefined(row.amount),
    perHole: numberOrUndefined(row.per_hole) ?? numberOrUndefined(parsedNotes.perHole),
    winnerId: optionalString(row.winner_player_id),
    hole: numberOrUndefined(row.hole_number),
    participantIds: participantIds.length > 0 ? participantIds : parsedParticipantIds,
    results: results && results.length > 0 ? results : parsedResults,
    nassauTeamA:
      nassauTeamA.length > 0
        ? nassauTeamA
        : parsedNassauTeamA.length > 0
          ? parsedNassauTeamA
          : undefined,
    nassauTeamB:
      nassauTeamB.length > 0
        ? nassauTeamB
        : parsedNassauTeamB.length > 0
          ? parsedNassauTeamB
          : undefined,
    nassauResults: hasObjectKeys(nassauResults) ? nassauResults : parsedNassauResults,
    createdAt: String(row.created_at ?? nowIso()),
    completedAt:
      optionalString(row.completed_at) ??
      optionalString(row.settled_at) ??
      optionalString(parsedNotes.completedAt),
  };
}

export function banterPostToCloud(post: BanterPost): Record<string, unknown> {
  return {
    id: post.id,
    trip_id: post.tripId,
    author_id: post.authorId ?? null,
    author_name: post.authorName,
    content: post.content,
    post_type: post.postType,
    emoji: post.emoji ?? null,
    reactions: post.reactions ?? null,
    related_match_id: post.relatedMatchId ?? null,
    timestamp: post.timestamp,
    updated_at: nowIso(),
  };
}

export function banterPostFromCloud(row: Record<string, unknown>): BanterPost {
  return {
    id: String(row.id),
    tripId: String(row.trip_id),
    authorId: optionalString(row.author_id),
    authorName: String(row.author_name ?? ''),
    content: String(row.content ?? ''),
    postType: (row.post_type as BanterPost['postType']) || 'message',
    emoji: optionalString(row.emoji),
    reactions:
      row.reactions && typeof row.reactions === 'object'
        ? (row.reactions as BanterPost['reactions'])
        : undefined,
    relatedMatchId: optionalString(row.related_match_id),
    timestamp: String(row.timestamp ?? nowIso()),
  };
}

// ---------------------------------------------------------------
// Trip logistics
// ---------------------------------------------------------------

export function tripInvitationToCloud(invitation: TripInvitation): Record<string, unknown> {
  return {
    id: invitation.id,
    trip_id: invitation.tripId,
    recipient_name: invitation.recipientName ?? null,
    recipient_email: invitation.recipientEmail ?? null,
    recipient_phone: invitation.recipientPhone ?? null,
    invite_code: invitation.inviteCode || null,
    invite_url: invitation.inviteUrl || null,
    assigned_team: invitation.assignedTeam ?? null,
    role: invitation.role,
    status: invitation.status,
    created_by_auth_user_id: invitation.createdByAuthUserId ?? null,
    accepted_by_auth_user_id: invitation.acceptedByAuthUserId ?? null,
    accepted_player_id: invitation.acceptedPlayerId ?? null,
    sent_at: invitation.sentAt ?? null,
    opened_at: invitation.openedAt ?? null,
    accepted_at: invitation.acceptedAt ?? null,
    revoked_at: invitation.revokedAt ?? null,
    expires_at: invitation.expiresAt ?? null,
    created_at: invitation.createdAt,
    updated_at: invitation.updatedAt,
  };
}

export function tripInvitationFromCloud(row: Record<string, unknown>): TripInvitation {
  return {
    id: String(row.id),
    tripId: String(row.trip_id),
    recipientName: optionalString(row.recipient_name),
    recipientEmail: optionalString(row.recipient_email),
    recipientPhone: optionalString(row.recipient_phone),
    inviteCode: String(row.invite_code ?? ''),
    inviteUrl: String(row.invite_url ?? ''),
    assignedTeam: row.assigned_team === 'A' || row.assigned_team === 'B' ? row.assigned_team : undefined,
    role: (row.role as TripInvitation['role']) || 'player',
    status: (row.status as TripInvitation['status']) || 'pending',
    createdByAuthUserId: optionalString(row.created_by_auth_user_id),
    acceptedByAuthUserId: optionalString(row.accepted_by_auth_user_id),
    acceptedPlayerId: optionalString(row.accepted_player_id),
    sentAt: optionalString(row.sent_at),
    openedAt: optionalString(row.opened_at),
    acceptedAt: optionalString(row.accepted_at),
    revokedAt: optionalString(row.revoked_at),
    expiresAt: optionalString(row.expires_at),
    createdAt: String(row.created_at ?? nowIso()),
    updatedAt: String(row.updated_at ?? nowIso()),
  };
}

export function announcementToCloud(announcement: Announcement): Record<string, unknown> {
  return {
    id: announcement.id,
    trip_id: announcement.tripId,
    title: announcement.title,
    message: announcement.message,
    priority: announcement.priority,
    category: announcement.category,
    status: announcement.status,
    author_auth_user_id: announcement.authorAuthUserId ?? null,
    author_player_id: announcement.authorPlayerId ?? null,
    read_count: announcement.readCount ?? 0,
    total_recipients: announcement.totalRecipients ?? null,
    metadata: {
      ...(announcement.metadata ?? {}),
      authorName: announcement.author.name,
      authorRole: announcement.author.role,
    },
    sent_at: announcement.sentAt ?? null,
    created_at: announcement.createdAt,
    updated_at: announcement.updatedAt,
  };
}

export function announcementFromCloud(row: Record<string, unknown>): Announcement {
  const metadata = parseJsonObject(row.metadata);
  const authorName = optionalString(metadata.authorName) ?? 'Captain';

  return {
    id: String(row.id),
    tripId: String(row.trip_id),
    title: String(row.title ?? ''),
    message: String(row.message ?? ''),
    priority: (row.priority as Announcement['priority']) || 'normal',
    category: (row.category as Announcement['category']) || 'general',
    status: (row.status as Announcement['status']) || 'sent',
    authorAuthUserId: optionalString(row.author_auth_user_id),
    authorPlayerId: optionalString(row.author_player_id),
    readCount: optionalNumber(row.read_count) ?? 0,
    totalRecipients: optionalNumber(row.total_recipients),
    metadata,
    sentAt: optionalString(row.sent_at),
    createdAt: String(row.created_at ?? nowIso()),
    updatedAt: String(row.updated_at ?? nowIso()),
    author: {
      name: authorName,
      role: 'captain',
    },
  };
}

export function attendanceRecordToCloud(record: AttendanceRecord): Record<string, unknown> {
  return {
    id: record.id,
    trip_id: record.tripId,
    player_id: record.playerId,
    session_id: record.sessionId ?? null,
    match_id: record.matchId ?? null,
    status: record.status,
    eta: record.eta ?? null,
    notes: record.notes ?? null,
    last_location: record.lastLocation ?? null,
    check_in_time: record.checkInTime ?? null,
    updated_by_auth_user_id: record.updatedByAuthUserId ?? null,
    updated_by_player_id: record.updatedByPlayerId ?? null,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

export function attendanceRecordFromCloud(row: Record<string, unknown>): AttendanceRecord {
  return {
    id: String(row.id),
    tripId: String(row.trip_id),
    playerId: String(row.player_id),
    sessionId: optionalString(row.session_id),
    matchId: optionalString(row.match_id),
    status: (row.status as AttendanceRecord['status']) || 'not-arrived',
    eta: optionalString(row.eta),
    notes: optionalString(row.notes),
    lastLocation: optionalString(row.last_location),
    checkInTime: optionalString(row.check_in_time),
    updatedByAuthUserId: optionalString(row.updated_by_auth_user_id),
    updatedByPlayerId: optionalString(row.updated_by_player_id),
    createdAt: String(row.created_at ?? nowIso()),
    updatedAt: String(row.updated_at ?? nowIso()),
  };
}

export function cartAssignmentToCloud(assignment: CartAssignment): Record<string, unknown> {
  return {
    id: assignment.id,
    trip_id: assignment.tripId,
    session_id: assignment.sessionId ?? null,
    match_id: assignment.matchId ?? null,
    cart_number: assignment.cartNumber,
    player_ids: assignment.playerIds,
    max_capacity: assignment.maxCapacity,
    notes: assignment.notes ?? null,
    created_by_auth_user_id: assignment.createdByAuthUserId ?? null,
    created_at: assignment.createdAt,
    updated_at: assignment.updatedAt,
  };
}

export function cartAssignmentFromCloud(row: Record<string, unknown>): CartAssignment {
  return {
    id: String(row.id),
    tripId: String(row.trip_id),
    sessionId: optionalString(row.session_id),
    matchId: optionalString(row.match_id),
    cartNumber: String(row.cart_number ?? ''),
    playerIds: stringArray(row.player_ids),
    maxCapacity: Number(row.max_capacity ?? 2),
    notes: optionalString(row.notes),
    createdByAuthUserId: optionalString(row.created_by_auth_user_id),
    createdAt: String(row.created_at ?? nowIso()),
    updatedAt: String(row.updated_at ?? nowIso()),
  };
}

// ---------------------------------------------------------------
// Finances
// ---------------------------------------------------------------

export function duesLineItemToCloud(item: DuesLineItem): Record<string, unknown> {
  return {
    id: item.id,
    trip_id: item.tripId,
    player_id: item.playerId,
    category: item.category,
    description: item.description,
    amount: item.amount,
    amount_paid: item.amountPaid,
    status: item.status,
    due_date: item.dueDate ?? null,
    paid_at: item.paidAt ?? null,
    paid_via: item.paidVia ?? null,
    notes: item.notes ?? null,
    created_by: item.createdBy,
    created_at: item.createdAt,
    updated_at: item.updatedAt,
  };
}

export function duesLineItemFromCloud(row: Record<string, unknown>): DuesLineItem {
  return {
    id: String(row.id),
    tripId: String(row.trip_id),
    playerId: String(row.player_id),
    category: row.category as DuesLineItem['category'],
    description: String(row.description ?? ''),
    amount: Number(row.amount ?? 0),
    amountPaid: Number(row.amount_paid ?? 0),
    status: (row.status as DuesLineItem['status']) || 'unpaid',
    dueDate: optionalString(row.due_date),
    paidAt: optionalString(row.paid_at),
    paidVia: row.paid_via as DuesLineItem['paidVia'],
    notes: optionalString(row.notes),
    createdBy: String(row.created_by ?? ''),
    createdAt: String(row.created_at ?? nowIso()),
    updatedAt: String(row.updated_at ?? nowIso()),
  };
}

export function paymentRecordToCloud(payment: PaymentRecord): Record<string, unknown> {
  return {
    id: payment.id,
    trip_id: payment.tripId,
    from_player_id: payment.fromPlayerId,
    to_player_id: payment.toPlayerId ?? null,
    amount: payment.amount,
    method: payment.method,
    line_item_ids: payment.lineItemIds,
    reference: payment.reference ?? null,
    confirmed_by: payment.confirmedBy ?? null,
    confirmed_at: payment.confirmedAt ?? null,
    notes: payment.notes ?? null,
    created_at: payment.createdAt,
    updated_at: nowIso(),
  };
}

export function paymentRecordFromCloud(row: Record<string, unknown>): PaymentRecord {
  return {
    id: String(row.id),
    tripId: String(row.trip_id),
    fromPlayerId: String(row.from_player_id),
    toPlayerId: optionalString(row.to_player_id),
    amount: Number(row.amount ?? 0),
    method: row.method as PaymentRecord['method'],
    lineItemIds: stringArray(row.line_item_ids),
    reference: optionalString(row.reference),
    confirmedBy: optionalString(row.confirmed_by),
    confirmedAt: optionalString(row.confirmed_at),
    notes: optionalString(row.notes),
    createdAt: String(row.created_at ?? nowIso()),
  };
}
