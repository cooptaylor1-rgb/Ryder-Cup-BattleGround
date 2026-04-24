import { storeTripShareCode } from '@/lib/utils/tripShareCodeStore';
import { mergeTripPlayers } from '@/lib/utils/tripPlayers';
import {
  announcementFromCloud,
  attendanceRecordFromCloud,
  banterPostFromCloud,
  cartAssignmentFromCloud,
  courseFromCloud,
  duesLineItemFromCloud,
  holeResultFromCloud,
  matchFromCloud,
  parseSideBetNotes,
  paymentRecordFromCloud,
  playerFromCloud,
  practiceScoreFromCloud,
  sessionFromCloud,
  sideBetFromCloud,
  teamFromCloud,
  teamMemberFromCloud,
  teeSetFromCloud,
  tripFromCloud,
} from './tripSyncMappers';

import { db } from '../../db';
import { getPendingSyncIdsForTrip } from './tripSyncQueue';
import { supabase } from '../../supabase/client';

/**
 * Per-entity local orphan cleanup: for each entity we pulled, delete
 * the local Dexie rows scoped to this trip that are NOT in the cloud
 * response AND do NOT have a pending sync op. The pending-op gate is
 * what makes this safe against "local-only-awaiting-push" rows — an
 * offline-created player whose create hasn't synced yet would
 * otherwise vanish the moment the captain came back online, before
 * the queue had a chance to push it.
 */
async function reconcileLocalOrphans({
  tripId,
  cloudPlayerIds,
  cloudTeamIds,
  cloudTeamMemberIds,
  cloudSessionIds,
  cloudMatchIds,
  cloudHoleResultIds,
  cloudPracticeScoreIds,
  cloudSideBetIds,
  cloudBanterPostIds,
  cloudDuesLineItemIds,
  cloudPaymentRecordIds,
  cloudAnnouncementIds,
  cloudAttendanceRecordIds,
  cloudCartAssignmentIds,
}: {
  tripId: string;
  cloudPlayerIds: string[];
  cloudTeamIds: string[];
  cloudTeamMemberIds: string[];
  cloudSessionIds: string[];
  cloudMatchIds: string[];
  cloudHoleResultIds: string[];
  cloudPracticeScoreIds: string[];
  cloudSideBetIds: string[];
  cloudBanterPostIds: string[];
  cloudDuesLineItemIds: string[];
  cloudPaymentRecordIds: string[];
  cloudAnnouncementIds: string[];
  cloudAttendanceRecordIds: string[];
  cloudCartAssignmentIds: string[];
}): Promise<void> {
  // Snapshot the pending sync-queue ids once so we don't repeatedly
  // walk the queue inside the per-entity filters.
  const pendingByEntity = {
    player: getPendingSyncIdsForTrip(tripId, 'player'),
    team: getPendingSyncIdsForTrip(tripId, 'team'),
    teamMember: getPendingSyncIdsForTrip(tripId, 'teamMember'),
    session: getPendingSyncIdsForTrip(tripId, 'session'),
    match: getPendingSyncIdsForTrip(tripId, 'match'),
    holeResult: getPendingSyncIdsForTrip(tripId, 'holeResult'),
    practiceScore: getPendingSyncIdsForTrip(tripId, 'practiceScore'),
    sideBet: getPendingSyncIdsForTrip(tripId, 'sideBet'),
    banterPost: getPendingSyncIdsForTrip(tripId, 'banterPost'),
    duesLineItem: getPendingSyncIdsForTrip(tripId, 'duesLineItem'),
    paymentRecord: getPendingSyncIdsForTrip(tripId, 'paymentRecord'),
    announcement: getPendingSyncIdsForTrip(tripId, 'announcement'),
    attendanceRecord: getPendingSyncIdsForTrip(tripId, 'attendanceRecord'),
    cartAssignment: getPendingSyncIdsForTrip(tripId, 'cartAssignment'),
  };

  const cloud = {
    player: new Set(cloudPlayerIds),
    team: new Set(cloudTeamIds),
    teamMember: new Set(cloudTeamMemberIds),
    session: new Set(cloudSessionIds),
    match: new Set(cloudMatchIds),
    holeResult: new Set(cloudHoleResultIds),
    practiceScore: new Set(cloudPracticeScoreIds),
    sideBet: new Set(cloudSideBetIds),
    banterPost: new Set(cloudBanterPostIds),
    duesLineItem: new Set(cloudDuesLineItemIds),
    paymentRecord: new Set(cloudPaymentRecordIds),
    announcement: new Set(cloudAnnouncementIds),
    attendanceRecord: new Set(cloudAttendanceRecordIds),
    cartAssignment: new Set(cloudCartAssignmentIds),
  };

  // Players scoped to this trip.
  const localPlayers = await db.players.where('tripId').equals(tripId).toArray();
  for (const player of localPlayers) {
    if (cloud.player.has(player.id)) continue;
    if (pendingByEntity.player.has(player.id)) continue;
    await db.players.delete(player.id);
  }

  // Teams scoped to this trip.
  const localTeams = await db.teams.where('tripId').equals(tripId).toArray();
  const localTeamIds: string[] = [];
  for (const team of localTeams) {
    localTeamIds.push(team.id);
    if (cloud.team.has(team.id)) continue;
    if (pendingByEntity.team.has(team.id)) continue;
    await db.teams.delete(team.id);
  }

  // Team members: scoped by team id (they have no tripId column of
  // their own). Use the captured local team ids to avoid wiping
  // team members for OTHER trips sharing this client.
  if (localTeamIds.length > 0) {
    const localTeamMembers = await db.teamMembers.where('teamId').anyOf(localTeamIds).toArray();
    for (const member of localTeamMembers) {
      if (cloud.teamMember.has(member.id)) continue;
      if (pendingByEntity.teamMember.has(member.id)) continue;
      await db.teamMembers.delete(member.id);
    }
  }

  // Sessions scoped to this trip.
  const localSessions = await db.sessions.where('tripId').equals(tripId).toArray();
  const localSessionIds: string[] = [];
  for (const session of localSessions) {
    localSessionIds.push(session.id);
    if (cloud.session.has(session.id)) continue;
    if (pendingByEntity.session.has(session.id)) continue;
    await db.sessions.delete(session.id);
  }

  // Matches: scoped by sessionId (no tripId column). Collect ids
  // before any deletes so hole_results / practice_scores below can
  // filter by match id too.
  let localMatchIds: string[] = [];
  if (localSessionIds.length > 0) {
    const localMatches = await db.matches.where('sessionId').anyOf(localSessionIds).toArray();
    for (const match of localMatches) {
      localMatchIds.push(match.id);
      if (cloud.match.has(match.id)) continue;
      if (pendingByEntity.match.has(match.id)) continue;
      await db.matches.delete(match.id);
    }
    // Refresh the list to the matches that survived the delete.
    localMatchIds = (
      await db.matches.where('sessionId').anyOf(localSessionIds).toArray()
    ).map((m) => m.id);
  }

  // Hole results / practice scores scoped by match id.
  if (localMatchIds.length > 0) {
    const localHoleResults = await db.holeResults
      .where('matchId')
      .anyOf(localMatchIds)
      .toArray();
    for (const hr of localHoleResults) {
      if (cloud.holeResult.has(hr.id)) continue;
      if (pendingByEntity.holeResult.has(hr.id)) continue;
      await db.holeResults.delete(hr.id);
    }

    const localPracticeScores = await db.practiceScores
      .where('matchId')
      .anyOf(localMatchIds)
      .toArray();
    for (const ps of localPracticeScores) {
      if (cloud.practiceScore.has(ps.id)) continue;
      if (pendingByEntity.practiceScore.has(ps.id)) continue;
      await db.practiceScores.delete(ps.id);
    }
  }

  // Side bets scoped to this trip.
  const localSideBets = await db.sideBets.where('tripId').equals(tripId).toArray();
  for (const bet of localSideBets) {
    if (cloud.sideBet.has(bet.id)) continue;
    if (pendingByEntity.sideBet.has(bet.id)) continue;
    await db.sideBets.delete(bet.id);
  }

  // Banter posts scoped to this trip.
  const localBanterPosts = await db.banterPosts.where('tripId').equals(tripId).toArray();
  for (const post of localBanterPosts) {
    if (cloud.banterPost.has(post.id)) continue;
    if (pendingByEntity.banterPost.has(post.id)) continue;
    await db.banterPosts.delete(post.id);
  }

  const localDuesLineItems = await db.duesLineItems.where('tripId').equals(tripId).toArray();
  for (const item of localDuesLineItems) {
    if (cloud.duesLineItem.has(item.id)) continue;
    if (pendingByEntity.duesLineItem.has(item.id)) continue;
    await db.duesLineItems.delete(item.id);
  }

  const localPaymentRecords = await db.paymentRecords.where('tripId').equals(tripId).toArray();
  for (const record of localPaymentRecords) {
    if (cloud.paymentRecord.has(record.id)) continue;
    if (pendingByEntity.paymentRecord.has(record.id)) continue;
    await db.paymentRecords.delete(record.id);
  }

  const localAnnouncements = await db.announcements.where('tripId').equals(tripId).toArray();
  for (const announcement of localAnnouncements) {
    if (cloud.announcement.has(announcement.id)) continue;
    if (pendingByEntity.announcement.has(announcement.id)) continue;
    await db.announcements.delete(announcement.id);
  }

  const localAttendanceRecords = await db.attendanceRecords.where('tripId').equals(tripId).toArray();
  for (const record of localAttendanceRecords) {
    if (cloud.attendanceRecord.has(record.id)) continue;
    if (pendingByEntity.attendanceRecord.has(record.id)) continue;
    await db.attendanceRecords.delete(record.id);
  }

  const localCartAssignments = await db.cartAssignments.where('tripId').equals(tripId).toArray();
  for (const assignment of localCartAssignments) {
    if (cloud.cartAssignment.has(assignment.id)) continue;
    if (pendingByEntity.cartAssignment.has(assignment.id)) continue;
    await db.cartAssignments.delete(assignment.id);
  }
}

/**
 * syncSideBetToCloud folds richer fields (perHole, participantIds,
 * results, sessionId, nassauResults, etc.) into the `notes` column
 * as JSON because the table only has a single `amount` column. The
 * pull path reverses that: parse the blob back, tolerating any
 * malformed / empty string so a captain who typed free-text notes
 * on an old bet doesn't break the roster pull.
 */
export function parseBetNotes(raw: unknown): Record<string, unknown> {
  return parseSideBetNotes(raw);
}
import { canSync, getTable, logger } from './tripSyncShared';
import {
  syncAnnouncementToCloud,
  syncAttendanceRecordToCloud,
  syncBanterPostToCloud,
  syncCartAssignmentToCloud,
  syncCourseToCloud,
  syncDuesLineItemToCloud,
  syncHoleResultToCloud,
  syncMatchToCloud,
  syncPaymentRecordToCloud,
  syncPlayerToCloud,
  syncPracticeScoreToCloud,
  syncSessionToCloud,
  syncSideBetToCloud,
  syncTeamMemberToCloud,
  syncTeamToCloud,
  syncTeeSetToCloud,
  syncTripToCloud,
} from './tripSyncEntityWriters';
import type { TripSyncResult } from './tripSyncTypes';

export async function syncTripToCloudFull(tripId: string): Promise<TripSyncResult> {
  if (!canSync()) {
    return { success: false, tripId, error: 'Offline', queued: true };
  }

  try {
    const trip = await db.trips.get(tripId);
    if (!trip) throw new Error('Trip not found');

    const teams = await db.teams.where('tripId').equals(tripId).toArray();
    const teamIds = teams.map((team) => team.id);
    const teamMembers =
      teamIds.length === 0
        ? []
        : await db.teamMembers.where('teamId').anyOf(teamIds).toArray();
    const playerIds = [...new Set(teamMembers.map((teamMember) => teamMember.playerId))];
    const [tripPlayers, linkedPlayers] = await Promise.all([
      db.players.where('tripId').equals(tripId).toArray(),
      playerIds.length === 0 ? [] : db.players.where('id').anyOf(playerIds).toArray(),
    ]);
    const { players, backfilledPlayers } = mergeTripPlayers(
      tripId,
      tripPlayers,
      linkedPlayers
    );
    if (backfilledPlayers.length > 0) {
      await db.players.bulkPut(backfilledPlayers);
    }
    const sessions = await db.sessions.where('tripId').equals(tripId).toArray();
    const sessionIds = sessions.map((session) => session.id);
    const matches =
      sessionIds.length === 0 ? [] : await db.matches.where('sessionId').anyOf(sessionIds).toArray();
    const matchIds = matches.map((match) => match.id);
    const holeResults =
      matchIds.length === 0 ? [] : await db.holeResults.where('matchId').anyOf(matchIds).toArray();
    const courseIds = [
      ...new Set(
        [
          ...sessions.flatMap((session) => [session.defaultCourseId]),
          ...matches.flatMap((match) => [match.courseId]),
        ].filter((id): id is string => Boolean(id))
      ),
    ];
    const courses =
      courseIds.length === 0 ? [] : await db.courses.where('id').anyOf(courseIds).toArray();
    const teeSetIds = [
      ...new Set(
        [
          ...sessions.flatMap((session) => [session.defaultTeeSetId]),
          ...matches.flatMap((match) => [match.teeSetId]),
        ].filter((id): id is string => Boolean(id))
      ),
    ];
    const courseTeeSets =
      courseIds.length === 0 ? [] : await db.teeSets.where('courseId').anyOf(courseIds).toArray();
    const explicitTeeSets =
      teeSetIds.length === 0 ? [] : await db.teeSets.where('id').anyOf(teeSetIds).toArray();
    const teeSets = Array.from(
      new Map([...courseTeeSets, ...explicitTeeSets].map((teeSet) => [teeSet.id, teeSet])).values()
    );
    const practiceScores =
      matchIds.length === 0
        ? []
        : await db.practiceScores.where('matchId').anyOf(matchIds).toArray();
    const [
      sideBets,
      banterPosts,
      duesLineItems,
      paymentRecords,
      announcements,
      attendanceRecords,
      cartAssignments,
    ] = await Promise.all([
      db.sideBets.where('tripId').equals(tripId).toArray(),
      db.banterPosts.where('tripId').equals(tripId).toArray(),
      db.duesLineItems.where('tripId').equals(tripId).toArray(),
      db.paymentRecords.where('tripId').equals(tripId).toArray(),
      db.announcements.where('tripId').equals(tripId).toArray(),
      db.attendanceRecords.where('tripId').equals(tripId).toArray(),
      db.cartAssignments.where('tripId').equals(tripId).toArray(),
    ]);

    await syncTripToCloud(tripId, 'update', trip);

    for (const player of players) {
      await syncPlayerToCloud(player.id, 'update', player, tripId);
    }

    for (const team of teams) {
      await syncTeamToCloud(team.id, 'update', team);
    }

    for (const teamMember of teamMembers) {
      await syncTeamMemberToCloud(teamMember.id, 'update', teamMember);
    }

    for (const course of courses) {
      await syncCourseToCloud(course.id, 'update', course, tripId);
    }

    for (const teeSet of teeSets) {
      await syncTeeSetToCloud(teeSet.id, 'update', teeSet, tripId);
    }

    for (const session of sessions) {
      await syncSessionToCloud(session.id, 'update', session);
    }

    for (const match of matches) {
      await syncMatchToCloud(match.id, 'update', match);
    }

    for (const holeResult of holeResults) {
      await syncHoleResultToCloud(holeResult.id, 'update', holeResult);
    }

    for (const score of practiceScores) {
      await syncPracticeScoreToCloud(score.id, 'update', score);
    }

    for (const bet of sideBets) {
      await syncSideBetToCloud(bet.id, 'update', bet);
    }

    for (const post of banterPosts) {
      await syncBanterPostToCloud(post.id, 'update', post);
    }

    for (const item of duesLineItems) {
      await syncDuesLineItemToCloud(item.id, 'update', item);
    }

    for (const record of paymentRecords) {
      await syncPaymentRecordToCloud(record.id, 'update', record);
    }

    for (const announcement of announcements) {
      await syncAnnouncementToCloud(announcement.id, 'update', announcement);
    }

    for (const record of attendanceRecords) {
      await syncAttendanceRecordToCloud(record.id, 'update', record);
    }

    for (const assignment of cartAssignments) {
      await syncCartAssignmentToCloud(assignment.id, 'update', assignment);
    }

    logger.log(`Full sync completed for trip ${tripId}`);
    return { success: true, tripId, cloudId: tripId };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Full sync failed:', errorMessage);
    return { success: false, tripId, error: errorMessage };
  }
}

async function getSupabaseAccessToken(): Promise<string | null> {
  if (!supabase) return null;

  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

async function redeemShareCodeForTripId(
  shareCode: string
): Promise<{ tripId: string; shareCode: string }> {
  if (typeof fetch !== 'function') {
    throw new Error('Trip join requires the app server');
  }

  const token = await getSupabaseAccessToken();
  const response = await fetch('/api/trips/join', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ code: shareCode }),
  });

  const payload = (await response.json().catch(() => null)) as
    | { tripId?: string; shareCode?: string; message?: string; error?: string }
    | null;

  if (!response.ok || !payload?.tripId) {
    throw new Error(payload?.message ?? payload?.error ?? 'Trip not found with that share code');
  }

  return {
    tripId: payload.tripId,
    shareCode: payload.shareCode ?? shareCode,
  };
}

export async function pullTripByShareCode(shareCode: string): Promise<TripSyncResult> {
  if (!canSync()) {
    return { success: false, tripId: '', error: 'Offline' };
  }

  try {
    const redeemed = await redeemShareCodeForTripId(shareCode.trim().toUpperCase());
    storeTripShareCode(redeemed.tripId, redeemed.shareCode);
    return pullTripCore({ tripId: redeemed.tripId });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Share-code redeem failed:', errorMessage);
    return { success: false, tripId: '', error: errorMessage };
  }
}

/**
 * Pull a trip and its children from Supabase by tripId. Mirrors
 * pullTripByShareCode but skips the share-code lookup — used by the
 * app-wide roster poll, where the captain already knows their own
 * tripId and may or may not have their share code cached in
 * localStorage. Without this, a captain whose localStorage was
 * cleared (or who created the trip on a different browser) stayed
 * on a frozen roster forever because the share-code fallback would
 * silently no-op.
 */
export async function pullTripById(tripId: string): Promise<TripSyncResult> {
  return pullTripCore({ tripId });
}

async function pullTripCore(lookup: {
  tripId?: string;
}): Promise<TripSyncResult> {
  if (!canSync()) {
    return { success: false, tripId: '', error: 'Offline' };
  }

  try {
    const { data: trip, error: tripError } = await getTable('trips')
      .select('*')
      .eq('id', lookup.tripId)
      .single();

    if (tripError || !trip) {
      throw new Error('Trip not found with that id');
    }

    const [{ data: teams }, { data: sessions }] = await Promise.all([
      getTable('teams').select('*').eq('trip_id', trip.id),
      getTable('sessions').select('*').eq('trip_id', trip.id),
    ]);

    const teamIds = (teams || []).map((team: { id: string }) => team.id);
    const { data: teamMembers } =
      teamIds.length === 0
        ? { data: [] }
        : await getTable('team_members').select('*').in('team_id', teamIds);

    const playerIds = [...new Set((teamMembers || []).map(
      (teamMember: { player_id: string }) => teamMember.player_id
    ))];
    const [{ data: tripPlayers }, { data: linkedPlayers }] = await Promise.all([
      getTable('players').select('*').eq('trip_id', trip.id),
      playerIds.length === 0
        ? Promise.resolve({ data: [] as Array<Record<string, unknown>> })
        : getTable('players').select('*').in('id', playerIds),
    ]);
    const playerRows = new Map<string, Record<string, unknown>>();
    for (const player of (tripPlayers as Array<Record<string, unknown>> | null) ?? []) {
      playerRows.set(String(player.id), player);
    }
    for (const player of (linkedPlayers as Array<Record<string, unknown>> | null) ?? []) {
      playerRows.set(String(player.id), player);
    }

    const sessionIds = (sessions || []).map((session: { id: string }) => session.id);
    const { data: matches } =
      sessionIds.length === 0
        ? { data: [] }
        : await getTable('matches').select('*').in('session_id', sessionIds);

    const matchIds = (matches || []).map((match: { id: string }) => match.id);
    const { data: holeResults } =
      matchIds.length === 0
        ? { data: [] }
        : await getTable('hole_results').select('*').in('match_id', matchIds);

    const sessionRows = (sessions as Array<Record<string, unknown>> | null) ?? [];
    const matchRows = (matches as Array<Record<string, unknown>> | null) ?? [];
    const referencedCourseIds = [
      ...new Set(
        [
          ...sessionRows.map((session) => session.default_course_id),
          ...matchRows.map((match) => match.course_id),
        ].filter((id): id is string => typeof id === 'string')
      ),
    ];
    const { data: tripCoursesRaw } = await getTable('courses')
      .select('*')
      .eq('trip_id', trip.id)
      .then(
        (response: { data: unknown; error: { code?: string } | null }) =>
          response.error
            ? { data: [] as Array<Record<string, unknown>> }
            : (response as { data: Array<Record<string, unknown>> }),
        () => ({ data: [] as Array<Record<string, unknown>> })
      );
    const { data: referencedCoursesRaw } =
      referencedCourseIds.length === 0
        ? { data: [] as Array<Record<string, unknown>> }
        : await getTable('courses').select('*').in('id', referencedCourseIds);
    const courses = Array.from(
      new Map(
        [
          ...((tripCoursesRaw as Array<Record<string, unknown>> | null) ?? []),
          ...((referencedCoursesRaw as Array<Record<string, unknown>> | null) ?? []),
        ].map((course) => [String(course.id), course])
      ).values()
    );

    const courseIds = courses.map((course) => String(course.id));
    const referencedTeeSetIds = [
      ...new Set(
        [
          ...sessionRows.map((session) => session.default_tee_set_id),
          ...matchRows.map((match) => match.tee_set_id),
        ].filter((id): id is string => typeof id === 'string')
      ),
    ];
    const { data: tripTeeSetsRaw } = await getTable('tee_sets')
      .select('*')
      .eq('trip_id', trip.id)
      .then(
        (response: { data: unknown; error: { code?: string } | null }) =>
          response.error
            ? { data: [] as Array<Record<string, unknown>> }
            : (response as { data: Array<Record<string, unknown>> }),
        () => ({ data: [] as Array<Record<string, unknown>> })
      );
    const { data: courseTeeSetsRaw } =
      courseIds.length === 0
        ? { data: [] as Array<Record<string, unknown>> }
        : await getTable('tee_sets').select('*').in('course_id', courseIds);
    const { data: referencedTeeSetsRaw } =
      referencedTeeSetIds.length === 0
        ? { data: [] as Array<Record<string, unknown>> }
        : await getTable('tee_sets').select('*').in('id', referencedTeeSetIds);
    const teeSets = Array.from(
      new Map(
        [
          ...((tripTeeSetsRaw as Array<Record<string, unknown>> | null) ?? []),
          ...((courseTeeSetsRaw as Array<Record<string, unknown>> | null) ?? []),
          ...((referencedTeeSetsRaw as Array<Record<string, unknown>> | null) ?? []),
        ].map((teeSet) => [String(teeSet.id), teeSet])
      ).values()
    );

    // Practice-round per-player strokes. Keyed by match_id just like
    // hole_results so we fetch the full set in one round-trip. If the
    // practice_scores table doesn't exist yet (e.g. captain hasn't
    // applied the migration) Supabase returns a 404 and we treat the
    // data as empty rather than bubbling the error — pre-migration
    // clients just won't see practice leaderboards.
    const { data: practiceScoresRaw } =
      matchIds.length === 0
        ? { data: [] as Array<Record<string, unknown>> }
        : await getTable('practice_scores')
            .select('*')
            .in('match_id', matchIds)
            .then(
              (response: { data: unknown; error: { code?: string } | null }) =>
                response.error
                  ? { data: [] as Array<Record<string, unknown>> }
                  : (response as { data: Array<Record<string, unknown>> }),
              () => ({ data: [] as Array<Record<string, unknown>> })
            );
    const practiceScores =
      (practiceScoresRaw as Array<Record<string, unknown>> | null) ?? [];

    // Side bets scoped to this trip. Writes already sync up via
    // queueSyncOperation at every UI mutation site; this is the
    // missing pull half — without it, a bet created on one device
    // reached Supabase but never appeared on other devices until
    // those devices hit a page that read Supabase directly. Now
    // every 15s roster poll brings them along.
    const { data: sideBetsRaw } = await getTable('side_bets')
      .select('*')
      .eq('trip_id', trip.id);
    const sideBets = (sideBetsRaw as Array<Record<string, unknown>> | null) ?? [];

    // Banter posts. Tolerate a missing banter_posts table (migration
    // not yet applied) the same way practice_scores does.
    const { data: banterRaw } = await getTable('banter_posts')
      .select('*')
      .eq('trip_id', trip.id)
      .then(
        (response: { data: unknown; error: { code?: string } | null }) =>
          response.error
            ? { data: [] as Array<Record<string, unknown>> }
            : (response as { data: Array<Record<string, unknown>> }),
        () => ({ data: [] as Array<Record<string, unknown>> })
      );
    const banterPosts = (banterRaw as Array<Record<string, unknown>> | null) ?? [];

    const { data: duesRaw } = await getTable('dues_line_items')
      .select('*')
      .eq('trip_id', trip.id)
      .then(
        (response: { data: unknown; error: { code?: string } | null }) =>
          response.error
            ? { data: [] as Array<Record<string, unknown>> }
            : (response as { data: Array<Record<string, unknown>> }),
        () => ({ data: [] as Array<Record<string, unknown>> })
      );
    const duesLineItems = (duesRaw as Array<Record<string, unknown>> | null) ?? [];

    const { data: paymentsRaw } = await getTable('payment_records')
      .select('*')
      .eq('trip_id', trip.id)
      .then(
        (response: { data: unknown; error: { code?: string } | null }) =>
          response.error
            ? { data: [] as Array<Record<string, unknown>> }
            : (response as { data: Array<Record<string, unknown>> }),
        () => ({ data: [] as Array<Record<string, unknown>> })
      );
    const paymentRecords = (paymentsRaw as Array<Record<string, unknown>> | null) ?? [];

    const { data: announcementsRaw } = await getTable('announcements')
      .select('*')
      .eq('trip_id', trip.id)
      .then(
        (response: { data: unknown; error: { code?: string } | null }) =>
          response.error
            ? { data: [] as Array<Record<string, unknown>> }
            : (response as { data: Array<Record<string, unknown>> }),
        () => ({ data: [] as Array<Record<string, unknown>> })
      );
    const announcements = (announcementsRaw as Array<Record<string, unknown>> | null) ?? [];

    const { data: attendanceRaw } = await getTable('attendance_records')
      .select('*')
      .eq('trip_id', trip.id)
      .then(
        (response: { data: unknown; error: { code?: string } | null }) =>
          response.error
            ? { data: [] as Array<Record<string, unknown>> }
            : (response as { data: Array<Record<string, unknown>> }),
        () => ({ data: [] as Array<Record<string, unknown>> })
      );
    const attendanceRecords = (attendanceRaw as Array<Record<string, unknown>> | null) ?? [];

    const { data: cartAssignmentsRaw } = await getTable('cart_assignments')
      .select('*')
      .eq('trip_id', trip.id)
      .then(
        (response: { data: unknown; error: { code?: string } | null }) =>
          response.error
            ? { data: [] as Array<Record<string, unknown>> }
            : (response as { data: Array<Record<string, unknown>> }),
        () => ({ data: [] as Array<Record<string, unknown>> })
      );
    const cartAssignments = (cartAssignmentsRaw as Array<Record<string, unknown>> | null) ?? [];

    await db.transaction(
      'rw',
      [
        db.trips,
        db.teams,
        db.teamMembers,
        db.players,
        db.sessions,
        db.matches,
        db.holeResults,
        db.practiceScores,
        db.sideBets,
        db.banterPosts,
        db.courses,
        db.teeSets,
        db.duesLineItems,
        db.paymentRecords,
        db.announcements,
        db.attendanceRecords,
        db.cartAssignments,
      ],
      async () => {
        await db.trips.put(tripFromCloud(trip as Record<string, unknown>));

        const { players: normalizedPlayers } = mergeTripPlayers(
          trip.id,
          Array.from(playerRows.values()).map((player) => playerFromCloud(player, trip.id))
        );

        for (const player of normalizedPlayers) {
          await db.players.put(player);
        }

        for (const team of teams || []) {
          await db.teams.put(teamFromCloud(team as Record<string, unknown>));
        }

        for (const teamMember of teamMembers || []) {
          await db.teamMembers.put(teamMemberFromCloud(teamMember as Record<string, unknown>));
        }

        for (const course of courses) {
          await db.courses.put(courseFromCloud(course));
        }

        for (const teeSet of teeSets) {
          await db.teeSets.put(teeSetFromCloud(teeSet));
        }

        for (const session of sessions || []) {
          await db.sessions.put(sessionFromCloud(session as Record<string, unknown>));
        }

        for (const match of matches || []) {
          await db.matches.put(matchFromCloud(match as Record<string, unknown>));
        }

        for (const holeResult of holeResults || []) {
          await db.holeResults.put(
            holeResultFromCloud(holeResult as Record<string, unknown>)
          );
        }

        for (const score of practiceScores || []) {
          await db.practiceScores.put(practiceScoreFromCloud(score));
        }

        for (const bet of sideBets) {
          await db.sideBets.put(sideBetFromCloud(bet));
        }

        for (const post of banterPosts) {
          await db.banterPosts.put(banterPostFromCloud(post));
        }

        for (const item of duesLineItems) {
          await db.duesLineItems.put(duesLineItemFromCloud(item));
        }

        for (const record of paymentRecords) {
          await db.paymentRecords.put(paymentRecordFromCloud(record));
        }

        for (const announcement of announcements) {
          await db.announcements.put(announcementFromCloud(announcement));
        }

        for (const record of attendanceRecords) {
          await db.attendanceRecords.put(attendanceRecordFromCloud(record));
        }

        for (const assignment of cartAssignments) {
          await db.cartAssignments.put(cartAssignmentFromCloud(assignment));
        }
      }
    );

    // Orphan-row cleanup: local Dexie accumulates rows the cloud no
    // longer has (e.g. a duplicate player deleted server-side, a
    // session deleted on another device). Without cleanup, the
    // captain keeps seeing ghost entries forever because
    // pullTripCore only ever does db.<table>.put. The cleanup is
    // gated per-entity on the sync queue: we never delete a local
    // row whose id has a pending create/update op, because that
    // row is local-only-awaiting-push, not genuinely orphaned.
    await reconcileLocalOrphans({
      tripId: trip.id,
      cloudPlayerIds: Array.from(playerRows.keys()),
      cloudTeamIds: (teams ?? []).map((t: { id: string }) => String(t.id)),
      cloudTeamMemberIds: (teamMembers ?? []).map((tm: { id: string }) => String(tm.id)),
      cloudSessionIds: (sessions ?? []).map((s: { id: string }) => String(s.id)),
      cloudMatchIds: (matches ?? []).map((m: { id: string }) => String(m.id)),
      cloudHoleResultIds: (holeResults ?? []).map((hr: { id: string }) => String(hr.id)),
      cloudPracticeScoreIds: practiceScores.map((ps) => String(ps.id)),
      cloudSideBetIds: sideBets.map((b) => String(b.id)),
      cloudBanterPostIds: banterPosts.map((p) => String(p.id)),
      cloudDuesLineItemIds: duesLineItems.map((item) => String(item.id)),
      cloudPaymentRecordIds: paymentRecords.map((record) => String(record.id)),
      cloudAnnouncementIds: announcements.map((announcement) => String(announcement.id)),
      cloudAttendanceRecordIds: attendanceRecords.map((record) => String(record.id)),
      cloudCartAssignmentIds: cartAssignments.map((assignment) => String(assignment.id)),
    });

    const resolvedShareCode =
      typeof trip.share_code === 'string' ? trip.share_code : undefined;
    if (resolvedShareCode) {
      storeTripShareCode(trip.id, resolvedShareCode);
    }
    logger.log(`Pulled trip ${trip.id} from cloud`);
    return { success: true, tripId: trip.id, cloudId: trip.id };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Pull failed:', errorMessage);
    return { success: false, tripId: '', error: errorMessage };
  }
}
