import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { db } from '@/lib/db';
import {
  createMatch,
  finalizeMatch,
  getCurrentHole,
  recordHoleResult,
  undoLastScore,
} from '@/lib/services/scoringEngine';
import { buildMatchHandicapContext } from '@/lib/services/matchHandicapService';
import { ScoringEventType } from '@/lib/types/events';
import type { HoleResult, Match, Player, RyderCupSession, Team, TeamMember, Trip } from '@/lib/types/models';

function isoNow() {
  return '2026-03-12T12:00:00.000Z';
}

async function seedTripAndSession(sessionType: RyderCupSession['sessionType'] = 'singles') {
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
    name: 'Session',
    sessionNumber: 1,
    sessionType,
    status: 'scheduled',
    createdAt: now,
  };

  const players: Player[] = [
    { id: 'a1', firstName: 'Alpha', lastName: 'One', handicapIndex: 4 },
    { id: 'a2', firstName: 'Alpha', lastName: 'Two', handicapIndex: 10 },
    { id: 'b1', firstName: 'Bravo', lastName: 'One', handicapIndex: 12 },
    { id: 'b2', firstName: 'Bravo', lastName: 'Two', handicapIndex: 16 },
  ];

  const teams: Team[] = [
    { id: 'team-usa', tripId: trip.id, name: 'USA', color: 'usa', mode: 'ryderCup', createdAt: now },
    { id: 'team-europe', tripId: trip.id, name: 'Europe', color: 'europe', mode: 'ryderCup', createdAt: now },
  ];

  const teamMembers: TeamMember[] = [
    { id: 'tm-a1', teamId: teams[0].id, playerId: 'a1', sortOrder: 1, isCaptain: false, createdAt: now },
    { id: 'tm-a2', teamId: teams[0].id, playerId: 'a2', sortOrder: 2, isCaptain: false, createdAt: now },
    { id: 'tm-b1', teamId: teams[1].id, playerId: 'b1', sortOrder: 1, isCaptain: false, createdAt: now },
    { id: 'tm-b2', teamId: teams[1].id, playerId: 'b2', sortOrder: 2, isCaptain: false, createdAt: now },
  ];

  await db.trips.put(trip);
  await db.sessions.put(session);
  await db.players.bulkPut(players);
  await db.teams.bulkPut(teams);
  await db.teamMembers.bulkPut(teamMembers);

  return { trip, session, players };
}

describe('scoringEngine command flows', () => {
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  afterEach(async () => {
    await db.delete();
  });

  it('recordHoleResult creates, edits, and undoLastScore restores the previous value', async () => {
    await seedTripAndSession();
    const match: Match = {
      id: 'match-1',
      sessionId: 'session-1',
      matchOrder: 1,
      status: 'scheduled',
      currentHole: 1,
      teamAPlayerIds: ['a1'],
      teamBPlayerIds: ['b1'],
      teamAHandicapAllowance: 0,
      teamBHandicapAllowance: 0,
      result: 'notFinished',
      margin: 0,
      holesRemaining: 18,
      createdAt: isoNow(),
      updatedAt: isoNow(),
    };
    await db.matches.put(match);

    const initial = await recordHoleResult('match-1', 1, 'teamA', 4, 5, 'scorer-1');
    expect(initial.winner).toBe('teamA');

    const edited = await recordHoleResult(
      'match-1',
      1,
      'teamB',
      5,
      4,
      'captain-1',
      'wrong winner',
      true
    );

    expect(edited.winner).toBe('teamB');
    expect(edited.scoredBy).toBe('scorer-1');
    expect(edited.lastEditedBy).toBe('captain-1');
    expect(edited.editHistory).toHaveLength(1);
    expect(edited.editHistory?.[0].previousWinner).toBe('teamA');

    const eventsBeforeUndo = (await db.scoringEvents.where('matchId').equals('match-1').toArray()).sort(
      (left, right) => (left.localId ?? 0) - (right.localId ?? 0)
    );
    expect(eventsBeforeUndo.map((event) => event.eventType)).toEqual([
      ScoringEventType.HoleScored,
      ScoringEventType.HoleEdited,
    ]);

    const undone = await undoLastScore('match-1');
    expect(undone).toBe(true);

    const reverted = await db.holeResults.where({ matchId: 'match-1', holeNumber: 1 }).first();
    expect(reverted?.winner).toBe('teamA');
    expect(reverted?.teamAScore).toBe(4);
    expect(reverted?.teamBScore).toBe(5);

    const eventsAfterUndo = (await db.scoringEvents.where('matchId').equals('match-1').toArray()).sort(
      (left, right) => (left.localId ?? 0) - (right.localId ?? 0)
    );
    expect(eventsAfterUndo).toHaveLength(2);
    expect(eventsAfterUndo[0].eventType).toBe(ScoringEventType.HoleScored);
    expect(eventsAfterUndo[1].eventType).toBe(ScoringEventType.HoleUndone);
  });

  it('getCurrentHole skips scored holes but ignores placeholder none results', async () => {
    await seedTripAndSession();
    await db.matches.put({
      id: 'match-1',
      sessionId: 'session-1',
      matchOrder: 1,
      status: 'inProgress',
      currentHole: 2,
      teamAPlayerIds: ['a1'],
      teamBPlayerIds: ['b1'],
      teamAHandicapAllowance: 0,
      teamBHandicapAllowance: 0,
      result: 'notFinished',
      margin: 0,
      holesRemaining: 17,
      createdAt: isoNow(),
      updatedAt: isoNow(),
    });

    const holeResults: HoleResult[] = [
      { id: 'hr-1', matchId: 'match-1', holeNumber: 1, winner: 'teamA', timestamp: isoNow() },
      { id: 'hr-2', matchId: 'match-1', holeNumber: 2, winner: 'none', timestamp: isoNow() },
    ];
    await db.holeResults.bulkPut(holeResults);

    expect(await getCurrentHole('match-1')).toBe(2);
  });

  it('createMatch persists scheduled matches with computed handicap allowances', async () => {
    const { session, players } = await seedTripAndSession();
    const match = await createMatch(session.id, 1, ['a1'], ['b1']);

    const expected = buildMatchHandicapContext({
      sessionType: session.sessionType,
      teamAPlayers: [players[0]],
      teamBPlayers: [players[2]],
    });

    expect(match.status).toBe('scheduled');
    expect(match.teamAHandicapAllowance).toBe(expected.teamAHandicapAllowance);
    expect(match.teamBHandicapAllowance).toBe(expected.teamBHandicapAllowance);

    const stored = await db.matches.get(match.id);
    expect(stored?.id).toBe(match.id);
  });

  it('finalizeMatch marks a closed-out match completed with the stored result and margin', async () => {
    await seedTripAndSession();
    const match: Match = {
      id: 'match-1',
      sessionId: 'session-1',
      matchOrder: 1,
      status: 'inProgress',
      currentHole: 16,
      teamAPlayerIds: ['a1'],
      teamBPlayerIds: ['b1'],
      teamAHandicapAllowance: 0,
      teamBHandicapAllowance: 0,
      result: 'notFinished',
      margin: 0,
      holesRemaining: 3,
      createdAt: isoNow(),
      updatedAt: isoNow(),
    };
    await db.matches.put(match);

    const results: HoleResult[] = [
      { id: 'h1', matchId: match.id, holeNumber: 1, winner: 'teamA', timestamp: isoNow() },
      { id: 'h2', matchId: match.id, holeNumber: 2, winner: 'teamA', timestamp: isoNow() },
      { id: 'h3', matchId: match.id, holeNumber: 3, winner: 'teamA', timestamp: isoNow() },
      { id: 'h4', matchId: match.id, holeNumber: 4, winner: 'teamA', timestamp: isoNow() },
      { id: 'h5', matchId: match.id, holeNumber: 5, winner: 'teamA', timestamp: isoNow() },
      { id: 'h6', matchId: match.id, holeNumber: 6, winner: 'teamA', timestamp: isoNow() },
      { id: 'h7', matchId: match.id, holeNumber: 7, winner: 'teamA', timestamp: isoNow() },
      { id: 'h8', matchId: match.id, holeNumber: 8, winner: 'teamA', timestamp: isoNow() },
      { id: 'h9', matchId: match.id, holeNumber: 9, winner: 'teamA', timestamp: isoNow() },
      { id: 'h10', matchId: match.id, holeNumber: 10, winner: 'teamA', timestamp: isoNow() },
      { id: 'h11', matchId: match.id, holeNumber: 11, winner: 'teamA', timestamp: isoNow() },
      { id: 'h12', matchId: match.id, holeNumber: 12, winner: 'teamA', timestamp: isoNow() },
      { id: 'h13', matchId: match.id, holeNumber: 13, winner: 'teamA', timestamp: isoNow() },
      { id: 'h14', matchId: match.id, holeNumber: 14, winner: 'halved', timestamp: isoNow() },
      { id: 'h15', matchId: match.id, holeNumber: 15, winner: 'halved', timestamp: isoNow() },
    ];
    await db.holeResults.bulkPut(results);

    await finalizeMatch(match.id);

    const updated = await db.matches.get(match.id);
    expect(updated?.status).toBe('completed');
    expect(updated?.result).toBe('teamAWin');
    expect(updated?.margin).toBe(13);
    expect(updated?.holesRemaining).toBe(3);
  });
});
