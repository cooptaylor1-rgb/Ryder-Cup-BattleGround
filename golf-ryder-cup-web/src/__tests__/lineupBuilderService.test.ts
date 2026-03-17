import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { db } from '@/lib/db';
import {
  calculateFairnessScore,
  clearLineup,
  getPairingHistory,
  movePlayerToMatch,
  removePlayerFromMatch,
  saveLineup,
  type LineupPlayer,
  type LineupState,
} from '@/lib/services/lineupBuilderService';
import { buildMatchHandicapContext } from '@/lib/services/matchHandicapService';
import type { Match, Player, RyderCupSession, Team, TeamMember, Trip } from '@/lib/types/models';

function isoNow() {
  return '2026-03-12T12:00:00.000Z';
}

function createLineupPlayer(
  id: string,
  teamColor: 'usa' | 'europe',
  handicap: number
): LineupPlayer {
  return {
    id,
    name: `Player ${id}`,
    firstName: 'Player',
    lastName: id,
    handicap,
    teamColor,
    teamId: `${teamColor}-team`,
  };
}

describe('lineupBuilderService', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await db.delete();
  });

  it('movePlayerToMatch and removePlayerFromMatch keep the pools consistent and sorted', () => {
    const teamAHigh = createLineupPlayer('a-high', 'usa', 18);
    const teamALow = createLineupPlayer('a-low', 'usa', 6);
    const teamBPlayer = createLineupPlayer('b-1', 'europe', 9);

    const state: LineupState = {
      sessionId: 'session-1',
      sessionType: 'fourball',
      playersPerMatch: 2,
      matches: [],
      availableTeamA: [teamAHigh, teamALow],
      availableTeamB: [teamBPlayer],
    };

    const moved = movePlayerToMatch(state, teamAHigh.id, 1, 'teamA');
    expect(moved.matches).toHaveLength(1);
    expect(moved.matches[0].teamAPlayers.map((player) => player.id)).toEqual([teamAHigh.id]);
    expect(moved.availableTeamA.map((player) => player.id)).toEqual([teamALow.id]);

    const removed = removePlayerFromMatch(moved, teamAHigh.id, 1);
    expect(removed.matches[0].teamAPlayers).toHaveLength(0);
    expect(removed.availableTeamA.map((player) => player.id)).toEqual([teamALow.id, teamAHigh.id]);
  });

  it('clearLineup preserves locked matches and returns unlocked players to the available pools', () => {
    const lockedA = createLineupPlayer('locked-a', 'usa', 5);
    const lockedB = createLineupPlayer('locked-b', 'europe', 7);
    const freeA = createLineupPlayer('free-a', 'usa', 12);
    const freeB = createLineupPlayer('free-b', 'europe', 14);

    const state: LineupState = {
      sessionId: 'session-1',
      sessionType: 'fourball',
      playersPerMatch: 2,
      matches: [
        {
          matchNumber: 1,
          teamAPlayers: [freeA],
          teamBPlayers: [freeB],
          locked: false,
        },
        {
          matchNumber: 5,
          teamAPlayers: [lockedA],
          teamBPlayers: [lockedB],
          locked: true,
        },
      ],
      availableTeamA: [],
      availableTeamB: [],
    };

    const cleared = clearLineup(state);

    expect(cleared.matches).toHaveLength(1);
    expect(cleared.matches[0].locked).toBe(true);
    expect(cleared.matches[0].matchNumber).toBe(1);
    expect(cleared.availableTeamA.map((player) => player.id)).toEqual([freeA.id]);
    expect(cleared.availableTeamB.map((player) => player.id)).toEqual([freeB.id]);
  });

  it('getPairingHistory and calculateFairnessScore reflect repeat partners and opponents from prior sessions', async () => {
    const now = isoNow();

    const trip: Trip = {
      id: 'trip-1',
      name: 'Trip',
      startDate: now,
      endDate: now,
      isCaptainModeEnabled: true,
      createdAt: now,
      updatedAt: now,
    };

    const previousSession: RyderCupSession = {
      id: 'session-old',
      tripId: trip.id,
      name: 'Old Session',
      sessionNumber: 1,
      sessionType: 'fourball',
      status: 'completed',
      createdAt: now,
    };

    const currentSession: RyderCupSession = {
      id: 'session-new',
      tripId: trip.id,
      name: 'New Session',
      sessionNumber: 2,
      sessionType: 'fourball',
      status: 'scheduled',
      createdAt: now,
    };

    const previousMatch: Match = {
      id: 'match-old',
      sessionId: previousSession.id,
      matchOrder: 1,
      status: 'completed',
      currentHole: 18,
      teamAPlayerIds: ['a1', 'a2'],
      teamBPlayerIds: ['b1', 'b2'],
      teamAHandicapAllowance: 0,
      teamBHandicapAllowance: 0,
      result: 'teamAWin',
      margin: 2,
      holesRemaining: 1,
      createdAt: now,
      updatedAt: now,
    };

    await db.trips.put(trip);
    await db.sessions.bulkPut([previousSession, currentSession]);
    await db.matches.put(previousMatch);

    const history = await getPairingHistory(trip.id, currentSession.id);
    expect(history.get('a1')?.partnerCounts.get('a2')).toBe(1);
    expect(history.get('a1')?.opponentCounts.get('b1')).toBe(1);

    const fairness = await calculateFairnessScore(
      {
        sessionId: currentSession.id,
        sessionType: 'fourball',
        playersPerMatch: 2,
        matches: [
          {
            matchNumber: 1,
            teamAPlayers: [createLineupPlayer('a1', 'usa', 4), createLineupPlayer('a2', 'usa', 6)],
            teamBPlayers: [createLineupPlayer('b1', 'europe', 18), createLineupPlayer('b2', 'europe', 20)],
            locked: false,
          },
        ],
        availableTeamA: [],
        availableTeamB: [],
      },
      trip.id
    );

    expect(fairness.overall).toBeLessThan(100);
    expect(fairness.issues.some((issue) => issue.message.includes('repeat partner'))).toBe(true);
    expect(fairness.issues.some((issue) => issue.message.includes('repeat opponent'))).toBe(true);
    expect(fairness.favoredTeam).toBe('usa');
  });

  it('saveLineup creates scheduled matches with computed handicap allowances', async () => {
    const now = isoNow();
    const trip: Trip = {
      id: 'trip-1',
      name: 'Trip',
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
      status: 'scheduled',
      createdAt: now,
    };

    const players: Player[] = [
      { id: 'a1', firstName: 'Alpha', lastName: 'One', handicapIndex: 4 },
      { id: 'b1', firstName: 'Bravo', lastName: 'One', handicapIndex: 12 },
    ];

    const teams: Team[] = [
      { id: 'team-usa', tripId: trip.id, name: 'USA', color: 'usa', mode: 'ryderCup', createdAt: now },
      { id: 'team-europe', tripId: trip.id, name: 'Europe', color: 'europe', mode: 'ryderCup', createdAt: now },
    ];

    const teamMembers: TeamMember[] = [
      { id: 'tm-1', teamId: 'team-usa', playerId: 'a1', sortOrder: 1, isCaptain: false, createdAt: now },
      { id: 'tm-2', teamId: 'team-europe', playerId: 'b1', sortOrder: 1, isCaptain: false, createdAt: now },
    ];

    await db.trips.put(trip);
    await db.sessions.put(session);
    await db.players.bulkPut(players);
    await db.teams.bulkPut(teams);
    await db.teamMembers.bulkPut(teamMembers);

    const state: LineupState = {
      sessionId: session.id,
      sessionType: session.sessionType,
      playersPerMatch: 1,
      matches: [
        {
          matchNumber: 1,
          teamAPlayers: [createLineupPlayer('a1', 'usa', 4)],
          teamBPlayers: [createLineupPlayer('b1', 'europe', 12)],
          locked: false,
        },
      ],
      availableTeamA: [],
      availableTeamB: [],
    };

    const result = await saveLineup(state, trip.id);
    expect(result.success).toBe(true);
    expect(result.matchIds).toHaveLength(1);

    const savedMatch = await db.matches.get(result.matchIds[0]);
    const expected = buildMatchHandicapContext({
      sessionType: session.sessionType,
      teamAPlayers: [players[0]],
      teamBPlayers: [players[1]],
    });

    expect(savedMatch?.status).toBe('scheduled');
    expect(savedMatch?.teamAPlayerIds).toEqual(['a1']);
    expect(savedMatch?.teamBPlayerIds).toEqual(['b1']);
    expect(savedMatch?.teamAHandicapAllowance).toBe(expected.teamAHandicapAllowance);
    expect(savedMatch?.teamBHandicapAllowance).toBe(expected.teamBHandicapAllowance);
  });

  it('saveLineup updates existing session matches instead of leaving template slots empty', async () => {
    const now = isoNow();
    const trip: Trip = {
      id: 'trip-1',
      name: 'Trip',
      startDate: now,
      endDate: now,
      isCaptainModeEnabled: true,
      createdAt: now,
      updatedAt: now,
    };

    const session: RyderCupSession = {
      id: 'session-1',
      tripId: trip.id,
      name: 'Opening Foursomes',
      sessionNumber: 1,
      sessionType: 'foursomes',
      status: 'scheduled',
      createdAt: now,
    };

    const players: Player[] = [
      { id: 'a1', firstName: 'Alpha', lastName: 'One', handicapIndex: 4 },
      { id: 'a2', firstName: 'Alpha', lastName: 'Two', handicapIndex: 7 },
      { id: 'b1', firstName: 'Bravo', lastName: 'One', handicapIndex: 10 },
      { id: 'b2', firstName: 'Bravo', lastName: 'Two', handicapIndex: 12 },
    ];

    const existingMatch: Match = {
      id: 'match-1',
      sessionId: session.id,
      matchOrder: 1,
      status: 'scheduled',
      currentHole: 0,
      teamAPlayerIds: [],
      teamBPlayerIds: [],
      teamAHandicapAllowance: 0,
      teamBHandicapAllowance: 0,
      result: 'notFinished',
      margin: 0,
      holesRemaining: 18,
      createdAt: now,
      updatedAt: now,
    };

    await db.trips.put(trip);
    await db.sessions.put(session);
    await db.players.bulkPut(players);
    await db.matches.put(existingMatch);

    const state: LineupState = {
      sessionId: session.id,
      sessionType: session.sessionType,
      playersPerMatch: 4,
      matches: [
        {
          matchNumber: 1,
          teamAPlayers: [
            createLineupPlayer('a1', 'usa', 4),
            createLineupPlayer('a2', 'usa', 7),
          ],
          teamBPlayers: [
            createLineupPlayer('b1', 'europe', 10),
            createLineupPlayer('b2', 'europe', 12),
          ],
          locked: false,
        },
      ],
      availableTeamA: [],
      availableTeamB: [],
    };

    const result = await saveLineup(state, trip.id);
    expect(result.success).toBe(true);
    expect(result.matchIds).toEqual([existingMatch.id]);

    const savedMatch = await db.matches.get(existingMatch.id);
    expect(savedMatch?.teamAPlayerIds).toEqual(['a1', 'a2']);
    expect(savedMatch?.teamBPlayerIds).toEqual(['b1', 'b2']);
  });
});
