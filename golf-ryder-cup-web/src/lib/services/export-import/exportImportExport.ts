import { db } from '@/lib/db';
import type { Course, Player, TeeSet } from '@/lib/types/models';
import { mergeTripPlayers } from '@/lib/utils/tripPlayers';
import type { TripExport } from '@/lib/types/export';

import { APP_VERSION, fetchCollectionByIds, SCHEMA_VERSION, uniqueStringIds } from './exportImportShared';

export async function exportTrip(
  tripId: string,
  options?: { includeAuditLog?: boolean }
): Promise<TripExport> {
  const trip = await db.trips.get(tripId);
  if (!trip) {
    throw new Error(`Trip not found: ${tripId}`);
  }

  const teams = await db.teams.where('tripId').equals(tripId).toArray();
  const teamIds = teams.map((team) => team.id);
  const teamMembers = await fetchCollectionByIds(teamIds, (ids) =>
    db.teamMembers.where('teamId').anyOf(ids).toArray()
  );

  const playerIds = uniqueStringIds(teamMembers.map((member) => member.playerId));
  const [tripPlayers, linkedPlayers] = await Promise.all([
    db.players.where('tripId').equals(tripId).toArray(),
    playerIds.length === 0
      ? Promise.resolve([] as Player[])
      : db.players.bulkGet(playerIds).then((players) =>
          players.filter((player): player is Player => player !== undefined)
        ),
  ]);
  const { players } = mergeTripPlayers(tripId, tripPlayers, linkedPlayers);

  const sessions = await db.sessions.where('tripId').equals(tripId).toArray();
  const sessionIds = sessions.map((session) => session.id);
  const matches = await fetchCollectionByIds(sessionIds, (ids) =>
    db.matches.where('sessionId').anyOf(ids).toArray()
  );
  const matchIds = matches.map((match) => match.id);
  const holeResults = await fetchCollectionByIds(matchIds, (ids) =>
    db.holeResults.where('matchId').anyOf(ids).toArray()
  );

  const courseIds = uniqueStringIds(matches.map((match) => match.courseId));
  const courses =
    courseIds.length === 0
      ? []
      : (await db.courses.bulkGet(courseIds)).filter((course): course is Course => course !== undefined);

  const teeSetIds = uniqueStringIds(matches.map((match) => match.teeSetId));
  const teeSets =
    teeSetIds.length === 0
      ? []
      : (await db.teeSets.bulkGet(teeSetIds)).filter((teeSet): teeSet is TeeSet => teeSet !== undefined);

  const auditLog = options?.includeAuditLog
    ? await db.auditLog.where('tripId').equals(tripId).toArray()
    : undefined;

  return {
    schemaVersion: SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    appVersion: APP_VERSION,
    trip,
    players,
    teams,
    teamMembers,
    sessions,
    matches,
    holeResults,
    courses,
    teeSets,
    auditLog,
  };
}

export async function exportTripToFile(tripId: string): Promise<void> {
  const exportData = await exportTrip(tripId, { includeAuditLog: true });
  const filename = `${exportData.trip.name.replace(/[^a-z0-9]/gi, '-')}_${new Date()
    .toISOString()
    .split('T')[0]}.json`;

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json',
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
