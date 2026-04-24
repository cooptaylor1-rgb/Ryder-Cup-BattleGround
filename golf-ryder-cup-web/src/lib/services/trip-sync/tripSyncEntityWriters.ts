import { storeTripShareCode } from '@/lib/utils/tripShareCodeStore';

import { db } from '../../db';
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
} from '../../types/models';
import type { DuesLineItem, PaymentRecord } from '../../types/finances';
import type { Announcement, AttendanceRecord, CartAssignment, TripInvitation } from '../../types/logistics';
import type { SyncOperation, SyncQueueItem } from '../../types/sync';
import { assertExhaustive } from '../../utils/exhaustive';
import { isServerNewer } from './tripSyncLww';
import {
  announcementToCloud,
  attendanceRecordToCloud,
  banterPostToCloud,
  cartAssignmentToCloud,
  courseToCloud,
  duesLineItemToCloud,
  holeResultToCloud,
  matchFromCloud,
  matchToCloud,
  paymentRecordToCloud,
  playerToCloud,
  practiceScoreToCloud,
  sessionToCloud,
  sideBetToCloud,
  teamMemberToCloud,
  teamToCloud,
  teeSetToCloud,
  tripInvitationToCloud,
  tripToCloud,
} from './tripSyncMappers';
import { getTable } from './tripSyncShared';
import {
  deleteEntityByKey,
  loadEntityForSync,
  throwIfSupabaseError,
} from './tripSyncWriterHelpers';

type MatchSyncConflictShape = Pick<
  Match,
  | 'sessionId'
  | 'courseId'
  | 'teeSetId'
  | 'matchOrder'
  | 'status'
  | 'startTime'
  | 'currentHole'
  | 'mode'
  | 'teamAPlayerIds'
  | 'teamBPlayerIds'
  | 'teamAHandicapAllowance'
  | 'teamBHandicapAllowance'
  | 'result'
  | 'margin'
  | 'holesRemaining'
  | 'notes'
>;

function normalizeMatchForConflict(match: Match): MatchSyncConflictShape {
  return {
    sessionId: match.sessionId,
    courseId: match.courseId,
    teeSetId: match.teeSetId,
    matchOrder: match.matchOrder,
    status: match.status,
    startTime: match.startTime,
    currentHole: match.currentHole,
    mode: match.mode || 'ryderCup',
    teamAPlayerIds: [...match.teamAPlayerIds],
    teamBPlayerIds: [...match.teamBPlayerIds],
    teamAHandicapAllowance: match.teamAHandicapAllowance,
    teamBHandicapAllowance: match.teamBHandicapAllowance,
    result: match.result,
    margin: match.margin,
    holesRemaining: match.holesRemaining,
    notes: match.notes,
  };
}

function matchSyncPayloadsEqual(left: Match, right: Match): boolean {
  return JSON.stringify(normalizeMatchForConflict(left)) === JSON.stringify(normalizeMatchForConflict(right));
}

export function getMatchVersionConflict(existing: Match, incoming: Match): string | null {
  const existingVersion = existing.version ?? 0;
  const incomingVersion = incoming.version ?? 0;

  if (existingVersion === 0 && incomingVersion === 0) return null;
  if (existingVersion < incomingVersion) return null;
  if (matchSyncPayloadsEqual(existing, incoming)) return null;

  return `Scoring conflict: cloud match version ${existingVersion} is already at or ahead of local version ${incomingVersion}. Refresh the trip before retrying.`;
}

async function getExistingCloudMatch(matchId: string): Promise<Match | null> {
  const response = await getTable('matches').select('*').eq('id', matchId).maybeSingle();
  throwIfSupabaseError(response);
  return response.data ? matchFromCloud(response.data as Record<string, unknown>) : null;
}

export async function syncEntityToCloud(item: SyncQueueItem): Promise<void> {
  // The `item` variable is a discriminated union over item.entity,
  // so each case below narrows `item.data` to the matching model
  // type automatically. No more `as Trip` / `as HoleResult` casts —
  // if a future writer argument goes stale (e.g. a model gets a
  // new required field), the compiler errors at the call site.
  switch (item.entity) {
    case 'trip':
      await syncTripToCloud(item.entityId, item.operation, item.data);
      break;
    case 'player':
      await syncPlayerToCloud(item.entityId, item.operation, item.data, item.tripId);
      break;
    case 'team':
      await syncTeamToCloud(item.entityId, item.operation, item.data);
      break;
    case 'teamMember':
      await syncTeamMemberToCloud(item.entityId, item.operation, item.data);
      break;
    case 'session':
      await syncSessionToCloud(item.entityId, item.operation, item.data);
      break;
    case 'match':
      await syncMatchToCloud(item.entityId, item.operation, item.data);
      break;
    case 'holeResult':
      await syncHoleResultToCloud(item.entityId, item.operation, item.data);
      break;
    case 'course':
      await syncCourseToCloud(item.entityId, item.operation, item.data, item.tripId);
      break;
    case 'teeSet':
      await syncTeeSetToCloud(item.entityId, item.operation, item.data, item.tripId);
      break;
    case 'sideBet':
      await syncSideBetToCloud(item.entityId, item.operation, item.data);
      break;
    case 'practiceScore':
      await syncPracticeScoreToCloud(item.entityId, item.operation, item.data);
      break;
    case 'banterPost':
      await syncBanterPostToCloud(item.entityId, item.operation, item.data);
      break;
    case 'duesLineItem':
      await syncDuesLineItemToCloud(item.entityId, item.operation, item.data);
      break;
    case 'paymentRecord':
      await syncPaymentRecordToCloud(item.entityId, item.operation, item.data);
      break;
    case 'tripInvitation':
      await syncTripInvitationToCloud(item.entityId, item.operation, item.data);
      break;
    case 'announcement':
      await syncAnnouncementToCloud(item.entityId, item.operation, item.data);
      break;
    case 'attendanceRecord':
      await syncAttendanceRecordToCloud(item.entityId, item.operation, item.data);
      break;
    case 'cartAssignment':
      await syncCartAssignmentToCloud(item.entityId, item.operation, item.data);
      break;
    default:
      assertExhaustive(item, 'Unhandled sync entity');
  }
}

export async function syncTripToCloud(
  tripId: string,
  operation: SyncOperation,
  data?: Trip
): Promise<void> {
  if (operation === 'delete') {
    await deleteEntityByKey({ table: 'trips', column: 'id', value: tripId });
    return;
  }

  const trip = await loadEntityForSync({
    data,
    entityName: 'Trip',
    fallback: () => db.trips.get(tripId),
  });

  const cloudData = tripToCloud(trip);

  if (operation === 'create') {
    const insertResponse = await getTable('trips')
      .insert(cloudData)
      .select('share_code')
      .single();
    throwIfSupabaseError(insertResponse);
    const insertedTrip = insertResponse.data as { share_code?: string } | null;
    if (insertedTrip?.share_code) {
      storeTripShareCode(trip.id, insertedTrip.share_code);
    }
    return;
  }

  const upsertResponse = await getTable('trips')
    .upsert(cloudData, { onConflict: 'id' })
    .select('share_code')
    .single();
  throwIfSupabaseError(upsertResponse);
  const upsertedTrip = upsertResponse.data as { share_code?: string } | null;
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
    await deleteEntityByKey({ table: 'players', column: 'id', value: playerId });
    return;
  }

  const player = await loadEntityForSync({
    data,
    entityName: 'Player',
    fallback: () => db.players.get(playerId),
  });

  const cloudData = playerToCloud(player, tripId);

  throwIfSupabaseError(await getTable('players').upsert(cloudData, { onConflict: 'id' }));
}

export async function syncTeamToCloud(
  teamId: string,
  operation: SyncOperation,
  data?: Team
): Promise<void> {
  if (operation === 'delete') {
    await deleteEntityByKey({ table: 'teams', column: 'id', value: teamId });
    return;
  }

  const team = await loadEntityForSync({
    data,
    entityName: 'Team',
    fallback: () => db.teams.get(teamId),
  });

  const cloudData = teamToCloud(team);

  throwIfSupabaseError(await getTable('teams').upsert(cloudData, { onConflict: 'id' }));
}

export async function syncTeamMemberToCloud(
  teamMemberId: string,
  operation: SyncOperation,
  data?: TeamMember
): Promise<void> {
  if (operation === 'delete') {
    await deleteEntityByKey({ table: 'team_members', column: 'id', value: teamMemberId });
    return;
  }

  const teamMember = await loadEntityForSync({
    data,
    entityName: 'TeamMember',
    fallback: () => db.teamMembers.get(teamMemberId),
  });

  const cloudData = teamMemberToCloud(teamMember);

  throwIfSupabaseError(await getTable('team_members').upsert(cloudData, { onConflict: 'id' }));
}

export async function syncSessionToCloud(
  sessionId: string,
  operation: SyncOperation,
  data?: RyderCupSession
): Promise<void> {
  if (operation === 'delete') {
    await deleteEntityByKey({ table: 'sessions', column: 'id', value: sessionId });
    return;
  }

  const session = await loadEntityForSync({
    data,
    entityName: 'Session',
    fallback: () => db.sessions.get(sessionId),
  });

  const cloudData = sessionToCloud(session);
  const incomingUpdatedAt = cloudData.updated_at as string;

  // Last-write-wins by updated_at. Two offline devices editing the same
  // session (e.g. captain locking while player edits notes) would otherwise
  // silently overwrite each other based on whichever sync ran last.
  if (
    await isServerNewer({
      table: 'sessions',
      timestampColumn: 'updated_at',
      where: { id: session.id },
      incoming: incomingUpdatedAt,
    })
  ) {
    return;
  }

  const { data: returned, error } = await getTable('sessions')
    .upsert(cloudData, { onConflict: 'id' })
    .select('updated_at')
    .single();
  if (!error) {
    // The DB trigger force_server_updated_at overrides client-supplied
    // updated_at with NOW(). Pull the server value back into Dexie so
    // the next LWW comparison on this row is server-time vs server-time
    // instead of silently treating a skewed client clock as the newer.
    const serverUpdatedAt = (returned as { updated_at?: string } | null)?.updated_at;
    if (serverUpdatedAt && serverUpdatedAt !== incomingUpdatedAt) {
      await db.sessions.update(session.id, { updatedAt: serverUpdatedAt });
    }
    return;
  }

  // 23505 = unique_violation. The DB has a unique constraint on
  // (trip_id, session_number); when two offline devices both allocated
  // the same number and this is the second one to land, bump locally
  // to max+1 for the trip and re-upsert so the captain doesn't stay
  // stuck retrying forever against the constraint.
  const isUniqueViolation =
    (error as { code?: string }).code === '23505' ||
    error.message?.includes('sessions_trip_id_session_number_key');
  if (!isUniqueViolation) throw new Error(error.message);

  const existing = await db.sessions.where('tripId').equals(session.tripId).toArray();
  const taken = new Set(existing.map((s) => s.sessionNumber));
  let candidate = Math.max(0, ...existing.map((s) => s.sessionNumber)) + 1;
  while (taken.has(candidate)) candidate += 1;

  const rewrittenAt = new Date().toISOString();
  await db.sessions.update(session.id, { sessionNumber: candidate, updatedAt: rewrittenAt });
  const retryData = { ...cloudData, session_number: candidate, updated_at: rewrittenAt };
  const retryResponse = await getTable('sessions')
    .upsert(retryData, { onConflict: 'id' })
    .select('updated_at')
    .single();
  throwIfSupabaseError(retryResponse);
  const retryServerUpdatedAt = (retryResponse.data as { updated_at?: string } | null)
    ?.updated_at;
  if (retryServerUpdatedAt && retryServerUpdatedAt !== rewrittenAt) {
    await db.sessions.update(session.id, { updatedAt: retryServerUpdatedAt });
  }
}

export async function syncMatchToCloud(
  matchId: string,
  operation: SyncOperation,
  data?: Match
): Promise<void> {
  if (operation === 'delete') {
    await deleteEntityByKey({ table: 'matches', column: 'id', value: matchId });
    return;
  }

  const match = await loadEntityForSync({
    data,
    entityName: 'Match',
    fallback: () => db.matches.get(matchId),
  });

  const cloudData = matchToCloud(match);
  const incomingUpdatedAt = cloudData.updated_at as string;
  const existingMatch = await getExistingCloudMatch(match.id);
  if (existingMatch) {
    const conflict = getMatchVersionConflict(existingMatch, match);
    if (conflict) {
      throw new Error(conflict);
    }

    const existingVersion = existingMatch.version ?? 0;
    const incomingVersion = match.version ?? 0;
    if (
      existingVersion >= incomingVersion &&
      incomingVersion > 0 &&
      matchSyncPayloadsEqual(existingMatch, match)
    ) {
      return;
    }

    // Legacy rows without a version column still use timestamp LWW.
    // Versioned scoring writes take the branch above so concurrent
    // edits fail visibly instead of silently accepting the later
    // queue replay.
    if (
      existingVersion === 0 &&
      incomingVersion === 0 &&
      (await isServerNewer({
        table: 'matches',
        timestampColumn: 'updated_at',
        where: { id: match.id },
        incoming: incomingUpdatedAt,
      }))
    ) {
      return;
    }
  }

  const matchResponse = await getTable('matches')
    .upsert(cloudData, { onConflict: 'id' })
    .select('updated_at')
    .single();
  throwIfSupabaseError(matchResponse);
  // Pull the trigger-set server updated_at back into Dexie so subsequent
  // LWW comparisons compare like-for-like; see sessions writer above.
  const serverUpdatedAt = (matchResponse.data as { updated_at?: string } | null)
    ?.updated_at;
  if (serverUpdatedAt && serverUpdatedAt !== incomingUpdatedAt) {
    await db.matches.update(match.id, { updatedAt: serverUpdatedAt });
  }
}

export async function syncHoleResultToCloud(
  holeResultId: string,
  operation: SyncOperation,
  data?: HoleResult
): Promise<void> {
  if (operation === 'delete') {
    await deleteEntityByKey({ table: 'hole_results', column: 'id', value: holeResultId });
    return;
  }

  const holeResult = await loadEntityForSync({
    data,
    entityName: 'HoleResult',
    fallback: () => db.holeResults.get(holeResultId),
  });

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

  const cloudData = holeResultToCloud(holeResult);
  const incomingTimestamp = cloudData.timestamp as string;

  // Last-write-wins by timestamp — an offline phone reconnecting
  // hours later must not overwrite a fresher score entered by
  // another device during the offline window. hole_results keys
  // on (match_id, hole_number) rather than id, so the shared
  // helper takes the composite where clause.
  if (
    await isServerNewer({
      table: 'hole_results',
      timestampColumn: 'timestamp',
      where: { match_id: holeResult.matchId, hole_number: holeResult.holeNumber },
      incoming: incomingTimestamp,
    })
  ) {
    return;
  }

  throwIfSupabaseError(
    await getTable('hole_results').upsert(cloudData, {
      onConflict: 'match_id,hole_number',
    })
  );
}

export async function syncCourseToCloud(
  courseId: string,
  operation: SyncOperation,
  data?: Course,
  tripId?: string
): Promise<void> {
  if (operation === 'delete') {
    await deleteEntityByKey({ table: 'courses', column: 'id', value: courseId });
    return;
  }

  const course = await loadEntityForSync({
    data,
    entityName: 'Course',
    fallback: () => db.courses.get(courseId),
  });

  const cloudData = courseToCloud(course, tripId);

  throwIfSupabaseError(await getTable('courses').upsert(cloudData, { onConflict: 'id' }));
}

export async function syncTeeSetToCloud(
  teeSetId: string,
  operation: SyncOperation,
  data?: TeeSet,
  tripId?: string
): Promise<void> {
  if (operation === 'delete') {
    await deleteEntityByKey({ table: 'tee_sets', column: 'id', value: teeSetId });
    return;
  }

  const teeSet = await loadEntityForSync({
    data,
    entityName: 'TeeSet',
    fallback: () => db.teeSets.get(teeSetId),
  });

  const cloudData = teeSetToCloud(teeSet, tripId);

  throwIfSupabaseError(await getTable('tee_sets').upsert(cloudData, { onConflict: 'id' }));
}

/**
 * Push a side bet row to Supabase. Before this writer existed the bets
 * surface was Dexie-only — captains created skins/nassau/KP bets, the
 * rows persisted locally, and the cloud never got them. A second
 * device opening the trip saw no bets at all, and the settlement
 * flow had nothing to settle.
 *
 * Column names match the public.side_bets schema. The payload writes
 * the structured columns used by current clients and still fills the
 * legacy `notes` JSON so old rows and pre-migration clients keep
 * round-tripping without data loss.
 */
export async function syncSideBetToCloud(
  sideBetId: string,
  operation: SyncOperation,
  data?: SideBet
): Promise<void> {
  if (operation === 'delete') {
    await deleteEntityByKey({ table: 'side_bets', column: 'id', value: sideBetId });
    return;
  }

  const bet = await loadEntityForSync({
    data,
    entityName: 'SideBet',
    fallback: () => db.sideBets.get(sideBetId),
  });

  const cloudData = sideBetToCloud(bet);

  throwIfSupabaseError(await getTable('side_bets').upsert(cloudData, { onConflict: 'id' }));
}


/**
 * Per-player practice-round stroke score. Minimal shape; upsert by id
 * so re-entering the same hole overwrites in place (the compound
 * unique on (match_id, player_id, hole_number) guards the database
 * side against accidental duplicates from a bad client too).
 */
export async function syncPracticeScoreToCloud(
  practiceScoreId: string,
  operation: SyncOperation,
  data?: PracticeScore
): Promise<void> {
  if (operation === 'delete') {
    await deleteEntityByKey({
      table: 'practice_scores',
      column: 'id',
      value: practiceScoreId,
    });
    return;
  }

  const score = await loadEntityForSync({
    data,
    entityName: 'PracticeScore',
    fallback: () => db.practiceScores.get(practiceScoreId),
  });

  const cloudData = practiceScoreToCloud(score);

  throwIfSupabaseError(
    await getTable('practice_scores').upsert(cloudData, { onConflict: 'id' })
  );
}


/**
 * Banter post sync. One-line shape — no JSON blob hack needed since
 * the table has first-class columns for every field. Upsert by id so
 * reaction edits on the same post update in place.
 */
export async function syncBanterPostToCloud(
  banterPostId: string,
  operation: SyncOperation,
  data?: BanterPost
): Promise<void> {
  if (operation === 'delete') {
    await deleteEntityByKey({
      table: 'banter_posts',
      column: 'id',
      value: banterPostId,
    });
    return;
  }

  const post = await loadEntityForSync({
    data,
    entityName: 'BanterPost',
    fallback: () => db.banterPosts.get(banterPostId),
  });

  const cloudData = banterPostToCloud(post);

  throwIfSupabaseError(
    await getTable('banter_posts').upsert(cloudData, { onConflict: 'id' })
  );
}

export async function syncDuesLineItemToCloud(
  duesLineItemId: string,
  operation: SyncOperation,
  data?: DuesLineItem
): Promise<void> {
  if (operation === 'delete') {
    await deleteEntityByKey({ table: 'dues_line_items', column: 'id', value: duesLineItemId });
    return;
  }

  const item = await loadEntityForSync({
    data,
    entityName: 'DuesLineItem',
    fallback: () => db.duesLineItems.get(duesLineItemId),
  });

  throwIfSupabaseError(
    await getTable('dues_line_items').upsert(duesLineItemToCloud(item), { onConflict: 'id' })
  );
}

export async function syncPaymentRecordToCloud(
  paymentRecordId: string,
  operation: SyncOperation,
  data?: PaymentRecord
): Promise<void> {
  if (operation === 'delete') {
    await deleteEntityByKey({ table: 'payment_records', column: 'id', value: paymentRecordId });
    return;
  }

  const record = await loadEntityForSync({
    data,
    entityName: 'PaymentRecord',
    fallback: () => db.paymentRecords.get(paymentRecordId),
  });

  throwIfSupabaseError(
    await getTable('payment_records').upsert(paymentRecordToCloud(record), { onConflict: 'id' })
  );
}

export async function syncTripInvitationToCloud(
  invitationId: string,
  operation: SyncOperation,
  data?: TripInvitation
): Promise<void> {
  if (operation === 'delete') {
    await deleteEntityByKey({ table: 'trip_invitations', column: 'id', value: invitationId });
    return;
  }

  const invitation = await loadEntityForSync({
    data,
    entityName: 'TripInvitation',
    fallback: () => db.tripInvitations.get(invitationId),
  });

  throwIfSupabaseError(
    await getTable('trip_invitations').upsert(tripInvitationToCloud(invitation), { onConflict: 'id' })
  );
}

export async function syncAnnouncementToCloud(
  announcementId: string,
  operation: SyncOperation,
  data?: Announcement
): Promise<void> {
  if (operation === 'delete') {
    await deleteEntityByKey({ table: 'announcements', column: 'id', value: announcementId });
    return;
  }

  const announcement = await loadEntityForSync({
    data,
    entityName: 'Announcement',
    fallback: () => db.announcements.get(announcementId),
  });

  throwIfSupabaseError(
    await getTable('announcements').upsert(announcementToCloud(announcement), { onConflict: 'id' })
  );
}

export async function syncAttendanceRecordToCloud(
  attendanceRecordId: string,
  operation: SyncOperation,
  data?: AttendanceRecord
): Promise<void> {
  if (operation === 'delete') {
    await deleteEntityByKey({ table: 'attendance_records', column: 'id', value: attendanceRecordId });
    return;
  }

  const record = await loadEntityForSync({
    data,
    entityName: 'AttendanceRecord',
    fallback: () => db.attendanceRecords.get(attendanceRecordId),
  });

  throwIfSupabaseError(
    await getTable('attendance_records').upsert(attendanceRecordToCloud(record), { onConflict: 'id' })
  );
}

export async function syncCartAssignmentToCloud(
  cartAssignmentId: string,
  operation: SyncOperation,
  data?: CartAssignment
): Promise<void> {
  if (operation === 'delete') {
    await deleteEntityByKey({ table: 'cart_assignments', column: 'id', value: cartAssignmentId });
    return;
  }

  const assignment = await loadEntityForSync({
    data,
    entityName: 'CartAssignment',
    fallback: () => db.cartAssignments.get(cartAssignmentId),
  });

  throwIfSupabaseError(
    await getTable('cart_assignments').upsert(cartAssignmentToCloud(assignment), { onConflict: 'id' })
  );
}
