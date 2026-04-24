import { storeTripShareCode } from '@/lib/utils/tripShareCodeStore';
import { mergeTripPlayers } from '@/lib/utils/tripPlayers';
import {
  coerceHandicapSettings,
  coerceScoringSettings,
} from '@/lib/utils/tripSettingsGuards';
import {
  holeResultFromCloud,
  matchFromCloud,
  sessionFromCloud,
} from './tripSyncMappers';

import { db } from '../../db';
import type { BanterPost, SideBet, Trip } from '../../types/models';
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
import { canSync, getTable, logger } from './tripSyncShared';
import {
  syncHoleResultToCloud,
  syncMatchToCloud,
  syncPlayerToCloud,
  syncSessionToCloud,
  syncTeamMemberToCloud,
  syncTeamToCloud,
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

    for (const session of sessions) {
      await syncSessionToCloud(session.id, 'update', session);
    }

    for (const match of matches) {
      await syncMatchToCloud(match.id, 'update', match);
    }

    for (const holeResult of holeResults) {
      await syncHoleResultToCloud(holeResult.id, 'update', holeResult);
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
      ],
      async () => {
        const localTrip: Trip = {
          id: trip.id,
          name: trip.name,
          startDate: trip.start_date,
          endDate: trip.end_date,
          location: trip.location,
          notes: trip.notes,
          isCaptainModeEnabled: trip.is_captain_mode_enabled,
          captainName: trip.captain_name,
          isPracticeRound: trip.is_practice_round || undefined,
          // Validate JSONB blobs before writing into typed Dexie row.
          // A malformed blob from an old client would otherwise sit in
          // memory as the typed shape and blow up deep in a reducer
          // the first time a component destructures it.
          scoringSettings: coerceScoringSettings(trip.scoring_settings),
          handicapSettings: coerceHandicapSettings(trip.handicap_settings),
          createdAt: trip.created_at,
          updatedAt: trip.updated_at,
        };
        await db.trips.put(localTrip);

        const { players: normalizedPlayers } = mergeTripPlayers(
          trip.id,
          Array.from(playerRows.values()).map((player) => ({
            id: String(player.id),
            tripId: typeof player.trip_id === 'string' ? player.trip_id : undefined,
            linkedAuthUserId:
              typeof player.linked_auth_user_id === 'string'
                ? player.linked_auth_user_id
                : undefined,
            linkedProfileId:
              typeof player.linked_profile_id === 'string' ? player.linked_profile_id : undefined,
            firstName: String(player.first_name ?? ''),
            lastName: String(player.last_name ?? ''),
            email: typeof player.email === 'string' ? player.email : undefined,
            handicapIndex:
              typeof player.handicap_index === 'number' ? player.handicap_index : undefined,
            ghin: typeof player.ghin === 'string' ? player.ghin : undefined,
            teePreference:
              typeof player.tee_preference === 'string' ? player.tee_preference : undefined,
            avatarUrl: typeof player.avatar_url === 'string' ? player.avatar_url : undefined,
            joinedAt: typeof player.joined_at === 'string' ? player.joined_at : undefined,
            createdAt: typeof player.created_at === 'string' ? player.created_at : undefined,
            updatedAt: typeof player.updated_at === 'string' ? player.updated_at : undefined,
          }))
        );

        for (const player of normalizedPlayers) {
          await db.players.put(player);
        }

        for (const team of teams || []) {
          await db.teams.put({
            id: team.id,
            tripId: team.trip_id,
            name: team.name,
            color: team.color,
            colorHex: team.color_hex,
            icon: team.icon,
            notes: team.notes,
            mode: team.mode,
            createdAt: team.created_at,
          });
        }

        for (const teamMember of teamMembers || []) {
          await db.teamMembers.put({
            id: teamMember.id,
            teamId: teamMember.team_id,
            playerId: teamMember.player_id,
            sortOrder: teamMember.sort_order,
            isCaptain: teamMember.is_captain,
            createdAt: teamMember.created_at,
          });
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
          await db.practiceScores.put({
            id: String(score.id),
            matchId: String(score.match_id),
            playerId: String(score.player_id),
            holeNumber: Number(score.hole_number),
            gross: typeof score.gross === 'number' ? score.gross : undefined,
            createdAt:
              typeof score.created_at === 'string' ? score.created_at : new Date().toISOString(),
            updatedAt:
              typeof score.updated_at === 'string' ? score.updated_at : new Date().toISOString(),
          });
        }

        // Side bets: reverse the syncSideBetToCloud projection. The
        // cloud schema has a single `amount` column and a JSON `notes`
        // blob — syncSideBetToCloud folds the rich shape (perHole,
        // participantIds, results, nassauResults, sessionId, etc.)
        // into the notes blob; here we parse it back out so clients
        // that pulled the bet see the same data model the creator
        // wrote.
        for (const bet of sideBets) {
          const parsedNotes = parseBetNotes(bet.notes);
          await db.sideBets.put({
            id: String(bet.id),
            tripId: String(bet.trip_id),
            matchId: typeof bet.match_id === 'string' ? bet.match_id : undefined,
            sessionId:
              typeof parsedNotes.sessionId === 'string' ? parsedNotes.sessionId : undefined,
            type: (bet.bet_type as SideBet['type']) || 'custom',
            name: String(bet.name ?? ''),
            description:
              typeof parsedNotes.description === 'string' ? parsedNotes.description : '',
            status: (parsedNotes.status as SideBet['status']) || 'active',
            pot: typeof bet.amount === 'number' ? bet.amount : undefined,
            perHole:
              typeof parsedNotes.perHole === 'number' ? parsedNotes.perHole : undefined,
            winnerId: typeof bet.winner_player_id === 'string' ? bet.winner_player_id : undefined,
            hole: typeof bet.hole_number === 'number' ? bet.hole_number : undefined,
            participantIds: Array.isArray(parsedNotes.participantIds)
              ? (parsedNotes.participantIds as string[])
              : [],
            results: Array.isArray(parsedNotes.results)
              ? (parsedNotes.results as SideBet['results'])
              : undefined,
            nassauTeamA: Array.isArray(parsedNotes.nassauTeamA)
              ? (parsedNotes.nassauTeamA as string[])
              : undefined,
            nassauTeamB: Array.isArray(parsedNotes.nassauTeamB)
              ? (parsedNotes.nassauTeamB as string[])
              : undefined,
            nassauResults:
              parsedNotes.nassauResults && typeof parsedNotes.nassauResults === 'object'
                ? (parsedNotes.nassauResults as SideBet['nassauResults'])
                : undefined,
            createdAt:
              typeof bet.created_at === 'string' ? bet.created_at : new Date().toISOString(),
            completedAt:
              typeof parsedNotes.completedAt === 'string'
                ? parsedNotes.completedAt
                : undefined,
          });
        }

        for (const post of banterPosts) {
          await db.banterPosts.put({
            id: String(post.id),
            tripId: String(post.trip_id),
            authorId:
              typeof post.author_id === 'string' ? post.author_id : undefined,
            authorName: String(post.author_name ?? ''),
            content: String(post.content ?? ''),
            postType: (post.post_type as BanterPost['postType']) || 'message',
            emoji: typeof post.emoji === 'string' ? post.emoji : undefined,
            reactions:
              post.reactions && typeof post.reactions === 'object'
                ? (post.reactions as BanterPost['reactions'])
                : undefined,
            relatedMatchId:
              typeof post.related_match_id === 'string' ? post.related_match_id : undefined,
            timestamp:
              typeof post.timestamp === 'string' ? post.timestamp : new Date().toISOString(),
          });
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
