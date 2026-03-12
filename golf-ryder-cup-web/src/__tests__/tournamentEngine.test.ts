import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/lib/db';
import {
  calculateFairnessScore,
  calculateFormatHandicap,
  calculateMagicNumber,
  calculatePlayerLeaderboard,
  calculatePlayerRecord,
  calculateSessionStandings,
  calculateTeamStandings,
  getExtendedFormatConfig,
  getSessionConfig,
  validateSessionLineup,
} from '@/lib/services/tournamentEngine';
import type { HoleResult, Match, Player, RyderCupSession, Team, TeamMember, Trip } from '@/lib/types/models';

function isoNow() {
  return '2026-03-12T12:00:00.000Z';
}

function createHoleResults(
  matchId: string,
  winners: Array<HoleResult['winner']>
): HoleResult[] {
  return winners.map((winner, index) => ({
    id: `${matchId}-hole-${index + 1}`,
    matchId,
    holeNumber: index + 1,
    winner,
    timestamp: isoNow(),
  }));
}

async function seedTournamentTrip() {
  const now = isoNow();
  const trip: Trip = {
    id: 'trip-1',
    name: 'Tournament',
    startDate: now,
    endDate: now,
    isCaptainModeEnabled: true,
    createdAt: now,
    updatedAt: now,
  };

  const session: RyderCupSession = {
    id: 'session-1',
    tripId: trip.id,
    name: 'Singles',
    sessionNumber: 1,
    sessionType: 'singles',
    status: 'inProgress',
    createdAt: now,
  };

  const players: Player[] = [
    { id: 'a1', firstName: 'Alpha', lastName: 'One', handicapIndex: 4 },
    { id: 'a2', firstName: 'Alpha', lastName: 'Two', handicapIndex: 8 },
    { id: 'b1', firstName: 'Bravo', lastName: 'One', handicapIndex: 12 },
    { id: 'b2', firstName: 'Bravo', lastName: 'Two', handicapIndex: 16 },
  ];

  const teams: Team[] = [
    {
      id: 'team-first',
      tripId: trip.id,
      name: 'Visitors',
      color: 'usa',
      mode: 'ryderCup',
      createdAt: now,
    },
    {
      id: 'team-second',
      tripId: trip.id,
      name: 'USA',
      color: 'europe',
      mode: 'ryderCup',
      createdAt: '2026-03-12T12:05:00.000Z',
    },
  ];

  const teamMembers: TeamMember[] = [
    { id: 'tm-a1', teamId: teams[0].id, playerId: 'a1', sortOrder: 1, isCaptain: false, createdAt: now },
    { id: 'tm-a2', teamId: teams[0].id, playerId: 'a2', sortOrder: 2, isCaptain: false, createdAt: now },
    { id: 'tm-b1', teamId: teams[1].id, playerId: 'b1', sortOrder: 1, isCaptain: false, createdAt: now },
    { id: 'tm-b2', teamId: teams[1].id, playerId: 'b2', sortOrder: 2, isCaptain: false, createdAt: now },
  ];

  const matches: Match[] = [
    {
      id: 'match-a-win',
      sessionId: session.id,
      matchOrder: 1,
      status: 'completed',
      currentHole: 10,
      teamAPlayerIds: ['a1'],
      teamBPlayerIds: ['b1'],
      teamAHandicapAllowance: 0,
      teamBHandicapAllowance: 0,
      result: 'teamAWin',
      margin: 8,
      holesRemaining: 8,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'match-halved',
      sessionId: session.id,
      matchOrder: 2,
      status: 'completed',
      currentHole: 18,
      teamAPlayerIds: ['a2'],
      teamBPlayerIds: ['b2'],
      teamAHandicapAllowance: 0,
      teamBHandicapAllowance: 0,
      result: 'halved',
      margin: 0,
      holesRemaining: 0,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'match-square',
      sessionId: session.id,
      matchOrder: 3,
      status: 'inProgress',
      currentHole: 3,
      teamAPlayerIds: ['a1'],
      teamBPlayerIds: ['b2'],
      teamAHandicapAllowance: 0,
      teamBHandicapAllowance: 0,
      result: 'notFinished',
      margin: 0,
      holesRemaining: 16,
      createdAt: now,
      updatedAt: now,
    },
  ];

  const holeResults: HoleResult[] = [
    ...createHoleResults(matches[0].id, Array.from({ length: 10 }, () => 'teamA')),
    ...createHoleResults(matches[1].id, Array.from({ length: 18 }, () => 'halved')),
    ...createHoleResults(matches[2].id, ['teamA', 'teamB']),
  ];

  await db.trips.put(trip);
  await db.sessions.put(session);
  await db.players.bulkPut(players);
  await db.teams.bulkPut(teams);
  await db.teamMembers.bulkPut(teamMembers);
  await db.matches.bulkPut(matches);
  await db.holeResults.bulkPut(holeResults);

  return { trip, session, teams };
}

describe('tournamentEngine', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
  });

  it('calculates team and session standings with completed and projected match totals', async () => {
    const { trip, session } = await seedTournamentTrip();

    const standings = await calculateTeamStandings(trip.id);
    expect(standings.teamAPoints).toBe(1.5);
    expect(standings.teamBPoints).toBe(0.5);
    expect(standings.teamAProjected).toBe(2);
    expect(standings.teamBProjected).toBe(1);
    expect(standings.matchesPlayed).toBe(3);
    expect(standings.matchesCompleted).toBe(2);
    expect(standings.matchesRemaining).toBe(1);
    expect(standings.totalMatches).toBe(3);
    expect(standings.leader).toBe('teamA');
    expect(standings.margin).toBe(1);

    const sessionStandings = await calculateSessionStandings(session.id);
    expect(sessionStandings).toEqual({
      teamAPoints: 1.5,
      teamBPoints: 0.5,
      matchesCompleted: 2,
      totalMatches: 3,
    });
  });

  it('derives player records and leaderboard order from completed matches only', async () => {
    const { trip } = await seedTournamentTrip();

    await expect(calculatePlayerRecord('a1', trip.id)).resolves.toEqual({
      wins: 1,
      losses: 0,
      halves: 0,
      points: 1,
    });

    await expect(calculatePlayerRecord('b2', trip.id)).resolves.toEqual({
      wins: 0,
      losses: 0,
      halves: 1,
      points: 0.5,
    });

    const leaderboard = await calculatePlayerLeaderboard(trip.id);
    expect(leaderboard.map((entry) => entry.playerId)).toEqual(['a1', 'a2', 'b2', 'b1']);
    expect(leaderboard.map((entry) => entry.points)).toEqual([1, 0.5, 0.5, 0]);
  });

  it('calculates fairness using team creation order instead of the team name', async () => {
    const { trip, teams } = await seedTournamentTrip();

    const fairness = await calculateFairnessScore(trip.id, teams[1].id);
    const b1Fairness = fairness.playerFairness?.find((player) => player.playerId === 'b1');
    const b2Fairness = fairness.playerFairness?.find((player) => player.playerId === 'b2');

    expect(b1Fairness?.matchesPlayed).toBe(1);
    expect(b1Fairness?.sessionsPlayed).toBe(1);
    expect(b2Fairness?.matchesPlayed).toBe(2);
    expect(fairness.matchDisparity).toBe(1);
    expect(fairness.sessionDisparity).toBe(0);
  });

  it('keeps magic number and format helpers aligned with legacy fallback behavior', () => {
    expect(calculateMagicNumber({
      teamAPoints: 9,
      teamBPoints: 7,
      matchesPlayed: 16,
      matchesCompleted: 16,
      matchesRemaining: 12,
      totalMatches: 28,
      remainingMatches: 12,
      leader: 'teamA',
      margin: 2,
    }, 12.5)).toEqual({
      teamA: 3.5,
      teamB: 5.5,
      teamANeeded: 3.5,
      teamBNeeded: 5.5,
      teamACanClinch: true,
      teamBCanClinch: true,
      teamAClinched: false,
      teamBClinched: false,
      pointsToWin: 12.5,
      hasClinched: false,
      clinchingTeam: undefined,
      remainingPoints: 12,
    });

    expect(getSessionConfig('singles')).toEqual({
      playersPerTeam: 1,
      matchCount: 12,
      pointsPerMatch: 1,
      description: 'Head-to-head individual matches',
    });

    expect(getExtendedFormatConfig('foursomes')).toMatchObject({
      playersPerTeam: 2,
      category: 'matchPlay',
      scoringType: 'matchPlay',
    });

    expect(getExtendedFormatConfig('mystery-format')).toEqual({
      playersPerTeam: 2,
      matchCount: 4,
      pointsPerMatch: 1,
      description: 'Custom format',
      category: 'custom',
      scoringType: 'hybrid',
    });

    expect(calculateFormatHandicap([10, 20], 'foursomes')).toBe(8);

    expect(validateSessionLineup(
      'fourball',
      [['a1', 'a2'], ['a1', 'a3']],
      ['a1', 'a2', 'a3']
    )).toEqual({
      isValid: false,
      errors: [
        'Expected 4 matches, got 2',
        'Same player appears in multiple matches',
      ],
    });
  });
});
