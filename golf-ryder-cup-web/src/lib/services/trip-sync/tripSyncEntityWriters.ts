import { storeTripShareCode } from '@/lib/utils/tripShareCodeStore';

import { db } from '../../db';
import type {
  Course,
  HoleResult,
  Match,
  Player,
  RyderCupSession,
  Team,
  TeamMember,
  TeeSet,
  Trip,
} from '../../types/models';
import type { SyncOperation, SyncQueueItem } from '../../types/sync';
import { getTable } from './tripSyncShared';

/**
 * Returns true if the row already in Supabase has a newer (or equal)
 * updated_at than the incoming write. Used to implement last-write-wins
 * for mutable tables — without this, two offline devices editing the
 * same entity silently overwrite each other based on sync arrival
 * order, not actual edit time. There is still a narrow race between
 * the select and the upsert, but it closes the worst of the
 * offline-replay data-loss window.
 */
async function isCloudNewer(
  table: 'matches' | 'sessions',
  id: string,
  incomingUpdatedAt: string
): Promise<boolean> {
  const { data: existing } = await getTable(table)
    .select('updated_at')
    .eq('id', id)
    .maybeSingle();

  const existingUpdatedAt =
    existing && typeof (existing as { updated_at?: string }).updated_at === 'string'
      ? (existing as { updated_at: string }).updated_at
      : null;

  if (!existingUpdatedAt) return false;
  return new Date(existingUpdatedAt).getTime() >= new Date(incomingUpdatedAt).getTime();
}

export async function syncEntityToCloud(item: SyncQueueItem): Promise<void> {
  const { entity, entityId, operation, data } = item;

  switch (entity) {
    case 'trip':
      await syncTripToCloud(entityId, operation, data as Trip);
      break;
    case 'player':
      await syncPlayerToCloud(entityId, operation, data as Player, item.tripId);
      break;
    case 'team':
      await syncTeamToCloud(entityId, operation, data as Team);
      break;
    case 'teamMember':
      await syncTeamMemberToCloud(entityId, operation, data as TeamMember);
      break;
    case 'session':
      await syncSessionToCloud(entityId, operation, data as RyderCupSession);
      break;
    case 'match':
      await syncMatchToCloud(entityId, operation, data as Match);
      break;
    case 'holeResult':
      await syncHoleResultToCloud(entityId, operation, data as HoleResult);
      break;
    case 'course':
      await syncCourseToCloud(entityId, operation, data as Course);
      break;
    case 'teeSet':
      await syncTeeSetToCloud(entityId, operation, data as TeeSet);
      break;
  }
}

export async function syncTripToCloud(
  tripId: string,
  operation: SyncOperation,
  data?: Trip
): Promise<void> {
  if (operation === 'delete') {
    const { error } = await getTable('trips').delete().eq('id', tripId);
    if (error) throw new Error(error.message);
    return;
  }

  const trip = data || (await db.trips.get(tripId));
  if (!trip) throw new Error('Trip not found locally');

  const cloudData = {
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
    updated_at: new Date().toISOString(),
  };

  if (operation === 'create') {
    const { data: insertedTrip, error } = await getTable('trips')
      .insert({ ...cloudData, created_at: trip.createdAt })
      .select('share_code')
      .single();
    if (error) throw new Error(error.message);
    if (insertedTrip?.share_code) {
      storeTripShareCode(trip.id, insertedTrip.share_code);
    }
    return;
  }

  const { data: upsertedTrip, error } = await getTable('trips')
    .upsert(cloudData, { onConflict: 'id' })
    .select('share_code')
    .single();
  if (error) throw new Error(error.message);
  if (upsertedTrip?.share_code) {
    storeTripShareCode(trip.id, upsertedTrip.share_code);
  }
}

export async function syncPlayerToCloud(
  playerId: string,
  operation: SyncOperation,
  data?: Player,
  tripId?: string
): Promise<void> {
  if (operation === 'delete') {
    const { error } = await getTable('players').delete().eq('id', playerId);
    if (error) throw new Error(error.message);
    return;
  }

  const player = data || (await db.players.get(playerId));
  if (!player) throw new Error('Player not found locally');

  const cloudData = {
    id: player.id,
    trip_id: player.tripId ?? tripId ?? null,
    first_name: player.firstName,
    last_name: player.lastName,
    email: player.email || null,
    handicap_index: player.handicapIndex || null,
    ghin: player.ghin || null,
    tee_preference: player.teePreference || null,
    avatar_url: player.avatarUrl || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await getTable('players').upsert(cloudData, { onConflict: 'id' });
  if (error) throw new Error(error.message);
}

export async function syncTeamToCloud(
  teamId: string,
  operation: SyncOperation,
  data?: Team
): Promise<void> {
  if (operation === 'delete') {
    const { error } = await getTable('teams').delete().eq('id', teamId);
    if (error) throw new Error(error.message);
    return;
  }

  const team = data || (await db.teams.get(teamId));
  if (!team) throw new Error('Team not found locally');

  const cloudData = {
    id: team.id,
    trip_id: team.tripId,
    name: team.name,
    color: team.color,
    color_hex: team.colorHex || null,
    icon: team.icon || null,
    notes: team.notes || null,
    mode: team.mode || 'ryderCup',
    updated_at: new Date().toISOString(),
  };

  const { error } = await getTable('teams').upsert(cloudData, { onConflict: 'id' });
  if (error) throw new Error(error.message);
}

export async function syncTeamMemberToCloud(
  teamMemberId: string,
  operation: SyncOperation,
  data?: TeamMember
): Promise<void> {
  if (operation === 'delete') {
    const { error } = await getTable('team_members').delete().eq('id', teamMemberId);
    if (error) throw new Error(error.message);
    return;
  }

  const teamMember = data || (await db.teamMembers.get(teamMemberId));
  if (!teamMember) throw new Error('TeamMember not found locally');

  const cloudData = {
    id: teamMember.id,
    team_id: teamMember.teamId,
    player_id: teamMember.playerId,
    sort_order: teamMember.sortOrder || 0,
    is_captain: teamMember.isCaptain || false,
  };

  const { error } = await getTable('team_members').upsert(cloudData, { onConflict: 'id' });
  if (error) throw new Error(error.message);
}

export async function syncSessionToCloud(
  sessionId: string,
  operation: SyncOperation,
  data?: RyderCupSession
): Promise<void> {
  if (operation === 'delete') {
    const { error } = await getTable('sessions').delete().eq('id', sessionId);
    if (error) throw new Error(error.message);
    return;
  }

  const session = data || (await db.sessions.get(sessionId));
  if (!session) throw new Error('Session not found locally');

  const incomingUpdatedAt = session.updatedAt || new Date().toISOString();
  const cloudData = {
    id: session.id,
    trip_id: session.tripId,
    name: session.name,
    session_number: session.sessionNumber,
    session_type: session.sessionType,
    scheduled_date: session.scheduledDate?.split('T')[0] || null,
    time_slot: session.timeSlot || null,
    points_per_match: session.pointsPerMatch || 1.0,
    notes: session.notes || null,
    status: session.status || 'scheduled',
    is_locked: session.isLocked || false,
    is_practice_session: session.isPracticeSession || false,
    updated_at: incomingUpdatedAt,
  };

  // Last-write-wins by updated_at. Two offline devices editing the same
  // session (e.g. captain locking while player edits notes) would otherwise
  // silently overwrite each other based on whichever sync ran last.
  if (await isCloudNewer('sessions', session.id, incomingUpdatedAt)) return;

  const { error } = await getTable('sessions').upsert(cloudData, { onConflict: 'id' });
  if (error) throw new Error(error.message);
}

export async function syncMatchToCloud(
  matchId: string,
  operation: SyncOperation,
  data?: Match
): Promise<void> {
  if (operation === 'delete') {
    const { error } = await getTable('matches').delete().eq('id', matchId);
    if (error) throw new Error(error.message);
    return;
  }

  const match = data || (await db.matches.get(matchId));
  if (!match) throw new Error('Match not found locally');

  const incomingUpdatedAt = match.updatedAt || new Date().toISOString();
  const cloudData = {
    id: match.id,
    session_id: match.sessionId,
    course_id: match.courseId || null,
    tee_set_id: match.teeSetId || null,
    match_order: match.matchOrder || 0,
    status: match.status,
    start_time: match.startTime || null,
    current_hole: match.currentHole || 1,
    team_a_player_ids: match.teamAPlayerIds,
    team_b_player_ids: match.teamBPlayerIds,
    team_a_handicap_allowance: match.teamAHandicapAllowance || 0,
    team_b_handicap_allowance: match.teamBHandicapAllowance || 0,
    result: match.result || 'notFinished',
    margin: match.margin || 0,
    holes_remaining: match.holesRemaining || 0,
    notes: match.notes || null,
    updated_at: incomingUpdatedAt,
  };

  // Last-write-wins by updated_at. Two offline phones editing the same
  // match (captain advancing the hole while player submits a score) would
  // otherwise silently overwrite each other based on sync arrival order.
  if (await isCloudNewer('matches', match.id, incomingUpdatedAt)) return;

  const { error } = await getTable('matches').upsert(cloudData, { onConflict: 'id' });
  if (error) throw new Error(error.message);
}

export async function syncHoleResultToCloud(
  holeResultId: string,
  operation: SyncOperation,
  data?: HoleResult
): Promise<void> {
  if (operation === 'delete') {
    const { error } = await getTable('hole_results').delete().eq('id', holeResultId);
    if (error) throw new Error(error.message);
    return;
  }

  const holeResult = data || (await db.holeResults.get(holeResultId));
  if (!holeResult) throw new Error('HoleResult not found locally');

  const validWinners = new Set(['teamA', 'teamB', 'halved', 'none']);
  if (
    !Number.isInteger(holeResult.holeNumber) ||
    holeResult.holeNumber < 1 ||
    holeResult.holeNumber > 18
  ) {
    throw new Error(`Invalid hole number: ${holeResult.holeNumber}`);
  }
  if (!validWinners.has(holeResult.winner)) {
    throw new Error(`Invalid hole winner: ${holeResult.winner}`);
  }

  const incomingTimestamp = holeResult.timestamp || new Date().toISOString();
  const cloudData = {
    id: holeResult.id,
    match_id: holeResult.matchId,
    hole_number: holeResult.holeNumber,
    winner: holeResult.winner,
    team_a_strokes: holeResult.teamAStrokes || null,
    team_b_strokes: holeResult.teamBStrokes || null,
    scored_by: holeResult.scoredBy || null,
    notes: holeResult.notes || null,
    timestamp: incomingTimestamp,
  };

  // Last-write-wins by timestamp, not by arrival order. Without this check
  // an offline phone that reconnects hours later can silently overwrite a
  // fresher score entered by another device during the offline window —
  // the upsert did not consider timestamps, so whichever write hit Supabase
  // last wrote. There is still a narrow race between the select and the
  // upsert, but it closes the worst of the offline-replay data loss.
  const { data: existing } = await getTable('hole_results')
    .select('timestamp')
    .eq('match_id', holeResult.matchId)
    .eq('hole_number', holeResult.holeNumber)
    .maybeSingle();

  const existingTimestamp =
    existing && typeof (existing as { timestamp?: string }).timestamp === 'string'
      ? (existing as { timestamp: string }).timestamp
      : null;
  if (
    existingTimestamp &&
    new Date(existingTimestamp).getTime() >= new Date(incomingTimestamp).getTime()
  ) {
    // Cloud already has a newer (or equal) version; keep it.
    return;
  }

  const { error } = await getTable('hole_results').upsert(cloudData, {
    onConflict: 'match_id,hole_number',
  });
  if (error) throw new Error(error.message);
}

export async function syncCourseToCloud(
  courseId: string,
  operation: SyncOperation,
  data?: Course
): Promise<void> {
  if (operation === 'delete') {
    const { error } = await getTable('courses').delete().eq('id', courseId);
    if (error) throw new Error(error.message);
    return;
  }

  const course = data || (await db.courses.get(courseId));
  if (!course) throw new Error('Course not found locally');

  const cloudData = {
    id: course.id,
    name: course.name,
    location: course.location || null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await getTable('courses').upsert(cloudData, { onConflict: 'id' });
  if (error) throw new Error(error.message);
}

export async function syncTeeSetToCloud(
  teeSetId: string,
  operation: SyncOperation,
  data?: TeeSet
): Promise<void> {
  if (operation === 'delete') {
    const { error } = await getTable('tee_sets').delete().eq('id', teeSetId);
    if (error) throw new Error(error.message);
    return;
  }

  const teeSet = data || (await db.teeSets.get(teeSetId));
  if (!teeSet) throw new Error('TeeSet not found locally');

  const cloudData = {
    id: teeSet.id,
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
    updated_at: new Date().toISOString(),
  };

  const { error } = await getTable('tee_sets').upsert(cloudData, { onConflict: 'id' });
  if (error) throw new Error(error.message);
}
