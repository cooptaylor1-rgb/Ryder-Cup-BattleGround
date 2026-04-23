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
import type { SyncOperation, SyncQueueItem } from '../../types/sync';
import { assertExhaustive } from '../../utils/exhaustive';
import { isServerNewer } from './tripSyncLww';
import { holeResultToCloud, matchToCloud, sessionToCloud } from './tripSyncMappers';
import { getTable } from './tripSyncShared';
import {
  deleteEntityByKey,
  loadEntityForSync,
  throwIfSupabaseError,
} from './tripSyncWriterHelpers';

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
      await syncCourseToCloud(item.entityId, item.operation, item.data);
      break;
    case 'teeSet':
      await syncTeeSetToCloud(item.entityId, item.operation, item.data);
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
    const insertResponse = await getTable('trips')
      .insert({ ...cloudData, created_at: trip.createdAt })
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

  const cloudData = {
    id: teamMember.id,
    team_id: teamMember.teamId,
    player_id: teamMember.playerId,
    sort_order: teamMember.sortOrder || 0,
    is_captain: teamMember.isCaptain || false,
  };

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

  // Last-write-wins by updated_at. Two offline phones editing the same
  // match (captain advancing the hole while player submits a score) would
  // otherwise silently overwrite each other based on sync arrival order.
  if (
    await isServerNewer({
      table: 'matches',
      timestampColumn: 'updated_at',
      where: { id: match.id },
      incoming: incomingUpdatedAt,
    })
  ) {
    return;
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
  data?: Course
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

  const cloudData = {
    id: course.id,
    name: course.name,
    location: course.location || null,
    updated_at: new Date().toISOString(),
  };

  throwIfSupabaseError(await getTable('courses').upsert(cloudData, { onConflict: 'id' }));
}

export async function syncTeeSetToCloud(
  teeSetId: string,
  operation: SyncOperation,
  data?: TeeSet
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

  throwIfSupabaseError(await getTable('tee_sets').upsert(cloudData, { onConflict: 'id' }));
}

/**
 * Push a side bet row to Supabase. Before this writer existed the bets
 * surface was Dexie-only — captains created skins/nassau/KP bets, the
 * rows persisted locally, and the cloud never got them. A second
 * device opening the trip saw no bets at all, and the settlement
 * flow had nothing to settle.
 *
 * Column names match the public.side_bets schema: the `name` / `amount`
 * / `winner_player_id` / `hole_number` / `notes` columns in Supabase
 * don't perfectly mirror the local SideBet model, so the payload
 * flattens the model's pot + perHole + hole + winnerId into those
 * existing columns. The richer fields (description, participantIds,
 * results, nassau team arrays) are stored as JSON in `notes` until the
 * schema grows real columns for them.
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

  const cloudData = {
    id: bet.id,
    trip_id: bet.tripId,
    match_id: bet.matchId ?? null,
    bet_type: bet.type,
    name: bet.name,
    // The schema has a single `amount` column; prefer pot, fall back to
    // perHole for skins-style bets where the pot is per-hole rather
    // than total.
    amount: bet.pot ?? bet.perHole ?? null,
    winner_player_id: bet.winnerId ?? null,
    hole_number: bet.hole ?? null,
    // Fold the app-specific richer shape into notes as JSON so we
    // don't lose it on the round trip.
    notes: JSON.stringify({
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
    }),
    updated_at: new Date().toISOString(),
  };

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

  const cloudData = {
    id: score.id,
    match_id: score.matchId,
    player_id: score.playerId,
    hole_number: score.holeNumber,
    gross: score.gross ?? null,
    updated_at: score.updatedAt || new Date().toISOString(),
  };

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

  const cloudData = {
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
    updated_at: new Date().toISOString(),
  };

  throwIfSupabaseError(
    await getTable('banter_posts').upsert(cloudData, { onConflict: 'id' })
  );
}
