import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/lib/db';
import { exportTrip, importTrip, validateExport } from '@/lib/services/exportImportService';
import type { TripExport } from '@/lib/types/export';
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

function isoNow() {
  return '2026-03-12T12:00:00.000Z';
}

function createExportFixture(): {
  trip: Trip;
  players: Player[];
  teams: Team[];
  teamMembers: TeamMember[];
  sessions: RyderCupSession[];
  matches: Match[];
  holeResults: HoleResult[];
  courses: Course[];
  teeSets: TeeSet[];
  exportData: TripExport;
} {
  const now = isoNow();
  const trip: Trip = {
    id: 'trip-1',
    name: 'Founders Cup',
    startDate: now,
    endDate: now,
    location: 'Pine Ridge',
    isCaptainModeEnabled: true,
    createdAt: now,
    updatedAt: now,
  };

  const players: Player[] = [
    {
      id: 'player-a1',
      tripId: trip.id,
      firstName: 'Alice',
      lastName: 'Ace',
      handicapIndex: 8.2,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'player-b1',
      tripId: trip.id,
      firstName: 'Ben',
      lastName: 'Birdie',
      handicapIndex: 12.4,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const teams: Team[] = [
    {
      id: 'team-usa',
      tripId: trip.id,
      name: 'Team USA',
      color: 'usa',
      mode: 'ryderCup',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'team-europe',
      tripId: trip.id,
      name: 'Team Europe',
      color: 'europe',
      mode: 'ryderCup',
      createdAt: now,
      updatedAt: now,
    },
  ];

  const teamMembers: TeamMember[] = [
    {
      id: 'tm-a1',
      teamId: teams[0].id,
      playerId: players[0].id,
      sortOrder: 1,
      isCaptain: true,
      createdAt: now,
    },
    {
      id: 'tm-b1',
      teamId: teams[1].id,
      playerId: players[1].id,
      sortOrder: 1,
      isCaptain: true,
      createdAt: now,
    },
  ];

  const sessions: RyderCupSession[] = [
    {
      id: 'session-1',
      tripId: trip.id,
      name: 'Singles',
      sessionNumber: 1,
      sessionType: 'singles',
      status: 'scheduled',
      createdAt: now,
      updatedAt: now,
    },
  ];

  const courses: Course[] = [
    {
      id: 'course-1',
      name: 'Pine Ridge',
      location: 'North Carolina',
      createdAt: now,
      updatedAt: now,
    },
  ];

  const teeSets: TeeSet[] = [
    {
      id: 'tee-1',
      courseId: courses[0].id,
      name: 'Blue',
      rating: 71.4,
      slope: 132,
      par: 72,
      holeHandicaps: [1, 13, 3, 15, 5, 17, 7, 9, 11, 2, 14, 4, 16, 6, 18, 8, 10, 12],
      createdAt: now,
      updatedAt: now,
    },
  ];

  const matches: Match[] = [
    {
      id: 'match-1',
      sessionId: sessions[0].id,
      courseId: courses[0].id,
      teeSetId: teeSets[0].id,
      matchOrder: 1,
      status: 'scheduled',
      currentHole: 1,
      teamAPlayerIds: [players[0].id],
      teamBPlayerIds: [players[1].id],
      teamAHandicapAllowance: 0,
      teamBHandicapAllowance: 4,
      result: 'notFinished',
      margin: 0,
      holesRemaining: 18,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const holeResults: HoleResult[] = [
    {
      id: 'hole-1',
      matchId: matches[0].id,
      holeNumber: 1,
      winner: 'teamA',
      teamAScore: 4,
      teamBScore: 5,
      scoredBy: players[0].id,
      teamAPlayerScores: [{ playerId: players[0].id, grossScore: 4 }],
      teamBPlayerScores: [{ playerId: players[1].id, grossScore: 5 }],
      timestamp: now,
    },
  ];

  const exportData: TripExport = {
    schemaVersion: 1,
    exportedAt: now,
    appVersion: '1.2.0',
    trip,
    players,
    teams,
    teamMembers,
    sessions,
    matches,
    holeResults,
    courses,
    teeSets,
  };

  return {
    trip,
    players,
    teams,
    teamMembers,
    sessions,
    matches,
    holeResults,
    courses,
    teeSets,
    exportData,
  };
}

async function seedTripFixture() {
  const fixture = createExportFixture();

  await db.trips.put(fixture.trip);
  await db.players.bulkPut(fixture.players);
  await db.teams.bulkPut(fixture.teams);
  await db.teamMembers.bulkPut(fixture.teamMembers);
  await db.sessions.bulkPut(fixture.sessions);
  await db.courses.bulkPut(fixture.courses);
  await db.teeSets.bulkPut(fixture.teeSets);
  await db.matches.bulkPut(fixture.matches);
  await db.holeResults.bulkPut(fixture.holeResults);

  return fixture;
}

describe('exportImportService', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await db.delete();
  });

  it('round-trips an exported trip into a fully remapped imported trip', async () => {
    const fixture = await seedTripFixture();

    const exported = await exportTrip(fixture.trip.id);
    const result = await importTrip(exported);

    expect(result.success).toBe(true);
    expect(result.tripId).not.toBe(fixture.trip.id);
    expect(result.tripName).toBe('Founders Cup (Imported)');

    const importedTrip = await db.trips.get(result.tripId);
    expect(importedTrip?.name).toBe('Founders Cup (Imported)');

    const importedPlayers = await db.players.where('tripId').equals(result.tripId).toArray();
    expect(importedPlayers).toHaveLength(fixture.players.length);
    expect(importedPlayers.every((player) => player.tripId === result.tripId)).toBe(true);

    const importedTeams = await db.teams.where('tripId').equals(result.tripId).toArray();
    expect(importedTeams).toHaveLength(fixture.teams.length);

    const importedSessions = await db.sessions.where('tripId').equals(result.tripId).toArray();
    expect(importedSessions).toHaveLength(fixture.sessions.length);

    const importedMatches = await db.matches
      .where('sessionId')
      .anyOf(importedSessions.map((session) => session.id))
      .toArray();
    expect(importedMatches).toHaveLength(fixture.matches.length);

    const importedPlayerIds = new Set(importedPlayers.map((player) => player.id));
    expect(importedMatches[0].teamAPlayerIds.every((playerId) => importedPlayerIds.has(playerId))).toBe(
      true
    );
    expect(importedMatches[0].teamBPlayerIds.every((playerId) => importedPlayerIds.has(playerId))).toBe(
      true
    );
    expect(importedMatches[0].courseId).not.toBe(fixture.matches[0].courseId);
    expect(importedMatches[0].teeSetId).not.toBe(fixture.matches[0].teeSetId);

    const importedHoleResults = await db.holeResults.where('matchId').equals(importedMatches[0].id).toArray();
    expect(importedHoleResults).toHaveLength(fixture.holeResults.length);
    expect(importedHoleResults[0].scoredBy && importedPlayerIds.has(importedHoleResults[0].scoredBy)).toBe(
      true
    );
  });

  it('validateExport rejects unsupported schema versions and broken references', () => {
    const { exportData } = createExportFixture();

    const newerVersion = validateExport({ ...exportData, schemaVersion: 2 });
    expect(newerVersion.valid).toBe(false);
    expect(newerVersion.errors.some((error) => error.includes('newer than supported version'))).toBe(
      true
    );

    const invalidReference = createExportFixture().exportData;
    invalidReference.teamMembers[0].playerId = 'missing-player';

    const validation = validateExport(invalidReference);
    expect(validation.valid).toBe(false);
    expect(validation.errors).toContain('Team member tm-a1 references missing player missing-player');
  });

  it('blocks malformed imports before any records are written', async () => {
    const { exportData } = createExportFixture();
    exportData.matches[0].sessionId = 'missing-session';

    const result = await importTrip(exportData);

    expect(result.success).toBe(false);
    expect(result.errors).toContain('Match match-1 references missing session missing-session');

    const [tripCount, playerCount, sessionCount] = await Promise.all([
      db.trips.count(),
      db.players.count(),
      db.sessions.count(),
    ]);

    expect(tripCount).toBe(0);
    expect(playerCount).toBe(0);
    expect(sessionCount).toBe(0);
  });

  it('rolls back the entire restore if a write fails mid-transaction', async () => {
    const { exportData } = createExportFixture();
    vi.spyOn(db.sessions, 'bulkAdd').mockRejectedValueOnce(new Error('Session write failed'));

    const result = await importTrip(exportData);

    expect(result.success).toBe(false);
    expect(result.errors[0]).toContain('Session write failed');

    const [tripCount, playerCount, teamCount, teamMemberCount, sessionCount, matchCount] =
      await Promise.all([
        db.trips.count(),
        db.players.count(),
        db.teams.count(),
        db.teamMembers.count(),
        db.sessions.count(),
        db.matches.count(),
      ]);

    expect(tripCount).toBe(0);
    expect(playerCount).toBe(0);
    expect(teamCount).toBe(0);
    expect(teamMemberCount).toBe(0);
    expect(sessionCount).toBe(0);
    expect(matchCount).toBe(0);
  });
});
