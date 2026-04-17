import { storeTripShareCode } from '@/lib/utils/tripShareCodeStore';
import { mergeTripPlayers } from '@/lib/utils/tripPlayers';

import { db } from '../../db';
import type { Trip } from '../../types/models';
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

export async function pullTripByShareCode(shareCode: string): Promise<TripSyncResult> {
  if (!canSync()) {
    return { success: false, tripId: '', error: 'Offline' };
  }

  try {
    const { data: trip, error: tripError } = await getTable('trips')
      .select('*')
      .eq('share_code', shareCode.toUpperCase())
      .single();

    if (tripError || !trip) {
      throw new Error('Trip not found with that share code');
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

    await db.transaction(
      'rw',
      [db.trips, db.teams, db.teamMembers, db.players, db.sessions, db.matches, db.holeResults],
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
          scoringSettings: trip.scoring_settings ?? undefined,
          handicapSettings: trip.handicap_settings ?? undefined,
          createdAt: trip.created_at,
          updatedAt: trip.updated_at,
        };
        await db.trips.put(localTrip);

        const { players: normalizedPlayers } = mergeTripPlayers(
          trip.id,
          Array.from(playerRows.values()).map((player) => ({
            id: String(player.id),
            tripId: typeof player.trip_id === 'string' ? player.trip_id : undefined,
            firstName: String(player.first_name ?? ''),
            lastName: String(player.last_name ?? ''),
            email: typeof player.email === 'string' ? player.email : undefined,
            handicapIndex:
              typeof player.handicap_index === 'number' ? player.handicap_index : undefined,
            ghin: typeof player.ghin === 'string' ? player.ghin : undefined,
            teePreference:
              typeof player.tee_preference === 'string' ? player.tee_preference : undefined,
            avatarUrl: typeof player.avatar_url === 'string' ? player.avatar_url : undefined,
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
          await db.sessions.put({
            id: session.id,
            tripId: session.trip_id,
            name: session.name,
            sessionNumber: session.session_number,
            sessionType: session.session_type,
            scheduledDate: session.scheduled_date,
            timeSlot: session.time_slot,
            pointsPerMatch: session.points_per_match,
            notes: session.notes,
            status: session.status,
            isLocked: session.is_locked,
            createdAt: session.created_at,
            updatedAt: session.updated_at,
          });
        }

        for (const match of matches || []) {
          await db.matches.put({
            id: match.id,
            sessionId: match.session_id,
            courseId: match.course_id,
            teeSetId: match.tee_set_id,
            matchOrder: match.match_order,
            status: match.status,
            startTime: match.start_time,
            currentHole: match.current_hole,
            teamAPlayerIds: match.team_a_player_ids,
            teamBPlayerIds: match.team_b_player_ids,
            teamAHandicapAllowance: match.team_a_handicap_allowance,
            teamBHandicapAllowance: match.team_b_handicap_allowance,
            result: match.result,
            margin: match.margin,
            holesRemaining: match.holes_remaining,
            notes: match.notes,
            createdAt: match.created_at,
            updatedAt: match.updated_at,
          });
        }

        for (const holeResult of holeResults || []) {
          await db.holeResults.put({
            id: holeResult.id,
            matchId: holeResult.match_id,
            holeNumber: holeResult.hole_number,
            winner: holeResult.winner,
            teamAStrokes: holeResult.team_a_strokes,
            teamBStrokes: holeResult.team_b_strokes,
            scoredBy: holeResult.scored_by,
            notes: holeResult.notes,
            timestamp: holeResult.timestamp,
          });
        }
      }
    );

    storeTripShareCode(trip.id, shareCode);
    logger.log(`Pulled trip ${trip.id} from cloud`);
    return { success: true, tripId: trip.id, cloudId: trip.id };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Pull failed:', errorMessage);
    return { success: false, tripId: '', error: errorMessage };
  }
}
