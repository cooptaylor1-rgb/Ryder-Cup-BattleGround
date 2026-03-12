import type { TripExport } from '@/lib/types/export';

import { SCHEMA_VERSION } from './exportImportShared';
import type { ExportValidationResult } from './exportImportTypes';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function validateObjectArray(
  label: string,
  value: unknown,
  errors: string[]
): Array<Record<string, unknown>> | null {
  if (!Array.isArray(value)) {
    errors.push(`Missing or invalid ${label} array`);
    return null;
  }

  const records: Array<Record<string, unknown>> = [];

  value.forEach((item, index) => {
    if (!isRecord(item)) {
      errors.push(`${label} entry ${index + 1} is invalid`);
      return;
    }

    records.push(item);
  });

  return records;
}

function collectUniqueIds(
  label: string,
  records: Array<Record<string, unknown>>,
  errors: string[]
): Set<string> {
  const ids = new Set<string>();

  records.forEach((record, index) => {
    const id = record.id;
    if (!isNonEmptyString(id)) {
      errors.push(`${label} ${index + 1} missing ID`);
      return;
    }

    if (ids.has(id)) {
      errors.push(`Duplicate ${label.toLowerCase()} ID: ${id}`);
      return;
    }

    ids.add(id);
  });

  return ids;
}

function validatePlayerReferences(
  matchId: string,
  playerIds: unknown,
  teamLabel: 'teamAPlayerIds' | 'teamBPlayerIds',
  knownPlayerIds: Set<string>,
  errors: string[]
): void {
  if (!Array.isArray(playerIds) || !playerIds.every(isNonEmptyString)) {
    errors.push(`Match ${matchId} has invalid ${teamLabel}`);
    return;
  }

  playerIds.forEach((playerId) => {
    if (!knownPlayerIds.has(playerId)) {
      errors.push(`Match ${matchId} references missing player ${playerId}`);
    }
  });
}

function validateHolePlayerScores(
  holeLabel: string,
  scoreSetLabel: 'teamAPlayerScores' | 'teamBPlayerScores',
  scores: unknown,
  playerIds: Set<string>,
  errors: string[]
): void {
  if (scores === undefined) {
    return;
  }

  if (!Array.isArray(scores)) {
    errors.push(`${holeLabel} has invalid ${scoreSetLabel}`);
    return;
  }

  scores.forEach((score, index) => {
    if (!isRecord(score) || !isNonEmptyString(score.playerId)) {
      errors.push(`${holeLabel} ${scoreSetLabel} entry ${index + 1} is invalid`);
      return;
    }

    if (!playerIds.has(score.playerId)) {
      errors.push(`${holeLabel} ${scoreSetLabel} references missing player ${score.playerId}`);
    }
  });
}

export function validateExport(data: unknown): ExportValidationResult {
  const errors: string[] = [];

  if (!isRecord(data)) {
    return { valid: false, errors: ['Invalid export format: not an object'] };
  }

  const exp = data as Partial<TripExport>;
  const schemaVersion = exp.schemaVersion;

  if (typeof schemaVersion !== 'number' || !Number.isInteger(schemaVersion)) {
    errors.push('Missing or invalid schema version');
  } else if (schemaVersion > SCHEMA_VERSION) {
    errors.push(
      `Export schema version ${schemaVersion} is newer than supported version ${SCHEMA_VERSION}`
    );
  } else if (schemaVersion < SCHEMA_VERSION) {
    errors.push(
      `Export schema version ${schemaVersion} is older than supported version ${SCHEMA_VERSION}`
    );
  }

  if (!isNonEmptyString(exp.exportedAt)) {
    errors.push('Missing or invalid export timestamp');
  }

  if (!isNonEmptyString(exp.appVersion)) {
    errors.push('Missing or invalid app version');
  }

  if (!isRecord(exp.trip)) {
    errors.push('Missing trip data');
  } else {
    if (!isNonEmptyString(exp.trip.id)) errors.push('Trip missing ID');
    if (!isNonEmptyString(exp.trip.name)) errors.push('Trip missing name');
  }

  const players = validateObjectArray('players', exp.players, errors);
  const teams = validateObjectArray('teams', exp.teams, errors);
  const teamMembers = validateObjectArray('teamMembers', exp.teamMembers, errors);
  const sessions = validateObjectArray('sessions', exp.sessions, errors);
  const matches = validateObjectArray('matches', exp.matches, errors);
  const holeResults = validateObjectArray('holeResults', exp.holeResults, errors);
  const courses = validateObjectArray('courses', exp.courses, errors);
  const teeSets = validateObjectArray('teeSets', exp.teeSets, errors);

  if (exp.auditLog !== undefined && !Array.isArray(exp.auditLog)) {
    errors.push('Audit log must be an array when present');
  }

  if (!isRecord(exp.trip) || !isNonEmptyString(exp.trip.id)) {
    return { valid: errors.length === 0, errors };
  }

  const tripId = exp.trip.id;
  const playerIds = players ? collectUniqueIds('Player', players, errors) : new Set<string>();
  const teamIds = teams ? collectUniqueIds('Team', teams, errors) : new Set<string>();
  const sessionIds = sessions ? collectUniqueIds('Session', sessions, errors) : new Set<string>();
  const matchIds = matches ? collectUniqueIds('Match', matches, errors) : new Set<string>();
  const courseIds = courses ? collectUniqueIds('Course', courses, errors) : new Set<string>();
  const teeSetIds = teeSets ? collectUniqueIds('Tee set', teeSets, errors) : new Set<string>();

  players?.forEach((player, index) => {
    if (player.tripId !== undefined && player.tripId !== null && player.tripId !== tripId) {
      errors.push(
        `Player ${isNonEmptyString(player.id) ? player.id : index + 1} belongs to trip ${String(player.tripId)}, expected ${tripId}`
      );
    }
  });

  teams?.forEach((team, index) => {
    if (!isNonEmptyString(team.tripId)) {
      errors.push(`Team ${isNonEmptyString(team.id) ? team.id : index + 1} missing tripId`);
      return;
    }

    if (team.tripId !== tripId) {
      errors.push(`Team ${String(team.id)} belongs to trip ${team.tripId}, expected ${tripId}`);
    }
  });

  sessions?.forEach((session, index) => {
    if (!isNonEmptyString(session.tripId)) {
      errors.push(
        `Session ${isNonEmptyString(session.id) ? session.id : index + 1} missing tripId`
      );
      return;
    }

    if (session.tripId !== tripId) {
      errors.push(
        `Session ${String(session.id)} belongs to trip ${session.tripId}, expected ${tripId}`
      );
    }
  });

  teamMembers?.forEach((teamMember, index) => {
    const label = `Team member ${isNonEmptyString(teamMember.id) ? teamMember.id : index + 1}`;

    if (!isNonEmptyString(teamMember.teamId)) {
      errors.push(`${label} missing teamId`);
    } else if (!teamIds.has(teamMember.teamId)) {
      errors.push(`${label} references missing team ${teamMember.teamId}`);
    }

    if (!isNonEmptyString(teamMember.playerId)) {
      errors.push(`${label} missing playerId`);
    } else if (!playerIds.has(teamMember.playerId)) {
      errors.push(`${label} references missing player ${teamMember.playerId}`);
    }
  });

  teeSets?.forEach((teeSet, index) => {
    const label = `Tee set ${isNonEmptyString(teeSet.id) ? teeSet.id : index + 1}`;
    if (!isNonEmptyString(teeSet.courseId)) {
      errors.push(`${label} missing courseId`);
      return;
    }

    if (!courseIds.has(teeSet.courseId)) {
      errors.push(`${label} references missing course ${teeSet.courseId}`);
    }
  });

  matches?.forEach((match, index) => {
    const matchId = isNonEmptyString(match.id) ? match.id : `match-${index + 1}`;

    if (!isNonEmptyString(match.sessionId)) {
      errors.push(`Match ${matchId} missing sessionId`);
    } else if (!sessionIds.has(match.sessionId)) {
      errors.push(`Match ${matchId} references missing session ${match.sessionId}`);
    }

    if (match.courseId !== undefined && match.courseId !== null) {
      if (!isNonEmptyString(match.courseId)) {
        errors.push(`Match ${matchId} has invalid courseId`);
      } else if (!courseIds.has(match.courseId)) {
        errors.push(`Match ${matchId} references missing course ${match.courseId}`);
      }
    }

    if (match.teeSetId !== undefined && match.teeSetId !== null) {
      if (!isNonEmptyString(match.teeSetId)) {
        errors.push(`Match ${matchId} has invalid teeSetId`);
      } else if (!teeSetIds.has(match.teeSetId)) {
        errors.push(`Match ${matchId} references missing tee set ${match.teeSetId}`);
      }
    }

    validatePlayerReferences(matchId, match.teamAPlayerIds, 'teamAPlayerIds', playerIds, errors);
    validatePlayerReferences(matchId, match.teamBPlayerIds, 'teamBPlayerIds', playerIds, errors);
  });

  holeResults?.forEach((holeResult, index) => {
    const holeLabel = `Hole result ${isNonEmptyString(holeResult.id) ? holeResult.id : index + 1}`;

    if (!isNonEmptyString(holeResult.matchId)) {
      errors.push(`${holeLabel} missing matchId`);
    } else if (!matchIds.has(holeResult.matchId)) {
      errors.push(`${holeLabel} references missing match ${holeResult.matchId}`);
    }

    if (holeResult.scoredBy !== undefined && holeResult.scoredBy !== null) {
      if (!isNonEmptyString(holeResult.scoredBy)) {
        errors.push(`${holeLabel} has invalid scoredBy`);
      } else if (!playerIds.has(holeResult.scoredBy)) {
        errors.push(`${holeLabel} references missing scorer ${holeResult.scoredBy}`);
      }
    }

    validateHolePlayerScores(
      holeLabel,
      'teamAPlayerScores',
      holeResult.teamAPlayerScores,
      playerIds,
      errors
    );
    validateHolePlayerScores(
      holeLabel,
      'teamBPlayerScores',
      holeResult.teamBPlayerScores,
      playerIds,
      errors
    );
  });

  return { valid: errors.length === 0, errors };
}
