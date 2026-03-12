import { v4 as uuidv4 } from 'uuid';

import type { TripExport, ImportResult } from '@/lib/types/export';
import type {
  Course,
  HoleResult,
  Match,
  Player,
  RyderCupSession,
  TeeSet,
  Team,
  TeamMember,
  Trip,
} from '@/lib/types/models';

import { createImportFailure, formatImportError } from './exportImportShared';
import { applyImportTransaction } from './exportImportTransactions';
import type { ImportIdMaps, PreparedImportPayload } from './exportImportTypes';
import { validateExport } from './exportImportValidation';

function createIdMaps(exportData: TripExport): ImportIdMaps {
  return {
    player: new Map(exportData.players.map((player) => [player.id, uuidv4()])),
    team: new Map(exportData.teams.map((team) => [team.id, uuidv4()])),
    session: new Map(exportData.sessions.map((session) => [session.id, uuidv4()])),
    match: new Map(exportData.matches.map((match) => [match.id, uuidv4()])),
    course: new Map(exportData.courses.map((course) => [course.id, uuidv4()])),
    teeSet: new Map(exportData.teeSets.map((teeSet) => [teeSet.id, uuidv4()])),
  };
}

function requireMappedId(map: Map<string, string>, sourceId: string, label: string): string {
  const mappedId = map.get(sourceId);
  if (!mappedId) {
    throw new Error(`Import mapping missing for ${label} ${sourceId}`);
  }

  return mappedId;
}

function prepareImportPayload(exportData: TripExport): PreparedImportPayload {
  const importedAt = new Date().toISOString();
  const newTripId = uuidv4();
  const idMaps = createIdMaps(exportData);

  const trip: Trip = {
    ...exportData.trip,
    id: newTripId,
    name: `${exportData.trip.name} (Imported)`,
    createdAt: importedAt,
    updatedAt: importedAt,
  };

  const players: Player[] = exportData.players.map((player) => ({
    ...player,
    id: requireMappedId(idMaps.player, player.id, 'player'),
    tripId: newTripId,
    createdAt: importedAt,
    updatedAt: importedAt,
  }));

  const teams: Team[] = exportData.teams.map((team) => ({
    ...team,
    id: requireMappedId(idMaps.team, team.id, 'team'),
    tripId: newTripId,
    createdAt: importedAt,
    updatedAt: importedAt,
  }));

  const teamMembers: TeamMember[] = exportData.teamMembers.map((teamMember) => ({
    ...teamMember,
    id: uuidv4(),
    teamId: requireMappedId(idMaps.team, teamMember.teamId, 'team'),
    playerId: requireMappedId(idMaps.player, teamMember.playerId, 'player'),
    createdAt: importedAt,
  }));

  const sessions: RyderCupSession[] = exportData.sessions.map((session) => ({
    ...session,
    id: requireMappedId(idMaps.session, session.id, 'session'),
    tripId: newTripId,
    createdAt: importedAt,
    updatedAt: importedAt,
  }));

  const matches: Match[] = exportData.matches.map((match) => ({
    ...match,
    id: requireMappedId(idMaps.match, match.id, 'match'),
    sessionId: requireMappedId(idMaps.session, match.sessionId, 'session'),
    courseId: match.courseId ? requireMappedId(idMaps.course, match.courseId, 'course') : undefined,
    teeSetId: match.teeSetId ? requireMappedId(idMaps.teeSet, match.teeSetId, 'tee set') : undefined,
    teamAPlayerIds: match.teamAPlayerIds.map((playerId) =>
      requireMappedId(idMaps.player, playerId, 'player')
    ),
    teamBPlayerIds: match.teamBPlayerIds.map((playerId) =>
      requireMappedId(idMaps.player, playerId, 'player')
    ),
    createdAt: importedAt,
    updatedAt: importedAt,
  }));

  const holeResults: HoleResult[] = exportData.holeResults.map((holeResult) => ({
    ...holeResult,
    id: uuidv4(),
    matchId: requireMappedId(idMaps.match, holeResult.matchId, 'match'),
    scoredBy: holeResult.scoredBy
      ? requireMappedId(idMaps.player, holeResult.scoredBy, 'player')
      : undefined,
    teamAPlayerScores: holeResult.teamAPlayerScores?.map((score) => ({
      ...score,
      playerId: requireMappedId(idMaps.player, score.playerId, 'player'),
    })),
    teamBPlayerScores: holeResult.teamBPlayerScores?.map((score) => ({
      ...score,
      playerId: requireMappedId(idMaps.player, score.playerId, 'player'),
    })),
    lastEditedBy: holeResult.lastEditedBy
      ? requireMappedId(idMaps.player, holeResult.lastEditedBy, 'player')
      : undefined,
    editHistory: holeResult.editHistory?.map((edit) => ({
      ...edit,
      editedBy: requireMappedId(idMaps.player, edit.editedBy, 'player'),
    })),
    timestamp: importedAt,
  }));

  const courses: Course[] = exportData.courses.map((course) => ({
    ...course,
    id: requireMappedId(idMaps.course, course.id, 'course'),
    createdAt: importedAt,
    updatedAt: importedAt,
  }));

  const teeSets: TeeSet[] = exportData.teeSets.map((teeSet) => ({
    ...teeSet,
    id: requireMappedId(idMaps.teeSet, teeSet.id, 'tee set'),
    courseId: requireMappedId(idMaps.course, teeSet.courseId, 'course'),
    createdAt: importedAt,
    updatedAt: importedAt,
  }));

  return {
    tripId: newTripId,
    tripName: trip.name,
    stats: {
      players: players.length,
      teams: teams.length,
      sessions: sessions.length,
      matches: matches.length,
      holeResults: holeResults.length,
      courses: courses.length,
    },
    entities: {
      trip,
      players,
      teams,
      teamMembers,
      sessions,
      matches,
      holeResults,
      courses,
      teeSets,
    },
  };
}

export async function importTrip(exportData: TripExport): Promise<ImportResult> {
  const validation = validateExport(exportData);
  if (!validation.valid) {
    return createImportFailure(validation.errors);
  }

  let preparedImport: PreparedImportPayload;

  try {
    preparedImport = prepareImportPayload(exportData);
  } catch (error) {
    return createImportFailure([`Import preparation failed: ${formatImportError(error)}`]);
  }

  try {
    await applyImportTransaction(preparedImport.entities);
  } catch (error) {
    return createImportFailure([`Database error: ${formatImportError(error)}`]);
  }

  return {
    success: true,
    tripId: preparedImport.tripId,
    tripName: preparedImport.tripName,
    stats: preparedImport.stats,
    errors: [],
  };
}

export async function importTripFromFile(file: File): Promise<ImportResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const exportData = JSON.parse(content) as TripExport;
        resolve(await importTrip(exportData));
      } catch (error) {
        resolve(
          createImportFailure([`Failed to parse file: ${formatImportError(error)}`])
        );
      }
    };

    reader.onerror = () => {
      resolve(createImportFailure(['Failed to read file']));
    };

    reader.readAsText(file);
  });
}
