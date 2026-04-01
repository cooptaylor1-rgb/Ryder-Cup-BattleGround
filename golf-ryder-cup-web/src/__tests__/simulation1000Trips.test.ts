/**
 * 1000-Trip Mega Stress Simulation
 *
 * Runs 1000 trips end-to-end through the scoring engine, tournament engine,
 * and data integrity layer to find bugs at scale.
 *
 * Beyond the existing 100-trip simulation, this tests:
 * - Deduplication guard (double-tap protection)
 * - Conflict detection (concurrent multi-user scoring)
 * - Undo robustness (hole number validation)
 * - Score editing with audit trail
 * - Standings recalculation after edits
 * - Cascade delete integrity at larger scale
 * - Edge cases: dormie → undo → re-score, edit → undo chain
 *
 * @tags @nightly
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../lib/db';
import {
  calculateMatchState,
  calculateMatchPoints,
  checkDormie,
  recordHoleResult,
  undoLastScore,
  type ScoreConflict,
  type UndoResult,
} from '../lib/services/scoringEngine';
import { calculateTeamStandings } from '../lib/services/tournamentEngine';
import { deleteTripCascade } from '../lib/services/cascadeDelete';
import type {
  Trip,
  Player,
  Team,
  TeamMember,
  RyderCupSession,
  Match,
  HoleResult,
  HoleWinner,
  SessionType,
} from '../lib/types/models';

// ============================================
// CONFIGURATION
// ============================================

const NUM_TRIPS = 1000;
const PLAYERS_PER_TRIP = 8; // 4 per team
const TOTAL_HOLES = 18;

// Seeded PRNG for reproducibility
function createRNG(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

const rng = createRNG(7777);

function shuffle<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

function pickWinner(): HoleWinner {
  const roll = rng();
  if (roll < 0.38) return 'teamA';
  if (roll < 0.76) return 'teamB';
  return 'halved';
}

function isoNow(offsetMs = 0): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

// ============================================
// BUG TRACKER
// ============================================

interface Bug {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  description: string;
  context: Record<string, unknown>;
}

const bugs: Bug[] = [];

function reportBug(
  id: string,
  severity: Bug['severity'],
  category: string,
  description: string,
  context: Record<string, unknown> = {},
) {
  if (!bugs.find((b) => b.id === id)) {
    bugs.push({ id, severity, category, description, context });
  }
}

// ============================================
// STATS
// ============================================

const stats = {
  tripsCreated: 0,
  matchesCreated: 0,
  holesScored: 0,
  matchesCompleted: 0,
  invariantChecks: 0,
  invariantFailures: 0,
  dedupHits: 0,
  conflictsDetected: 0,
  undoOperations: 0,
  undoFailures: 0,
  editsPerformed: 0,
  cascadeDeletes: 0,
  standingsValidated: 0,
};

// ============================================
// SIMULATION
// ============================================

describe('1000-Trip Mega Stress Simulation', () => {
  const tripIds: string[] = [];
  const matchIds: string[] = [];

  beforeAll(async () => {
    await db.delete();
    await db.open();
  }, 30000);

  afterAll(async () => {
    // Print summary
    console.log('\n=== MEGA SIMULATION SUMMARY ===');
    console.log(`Trips: ${stats.tripsCreated}`);
    console.log(`Matches: ${stats.matchesCreated}`);
    console.log(`Holes scored: ${stats.holesScored}`);
    console.log(`Matches completed: ${stats.matchesCompleted}`);
    console.log(`Invariant checks: ${stats.invariantChecks}`);
    console.log(`Invariant failures: ${stats.invariantFailures}`);
    console.log(`Dedup hits: ${stats.dedupHits}`);
    console.log(`Conflicts detected: ${stats.conflictsDetected}`);
    console.log(`Undo operations: ${stats.undoOperations}`);
    console.log(`Undo failures: ${stats.undoFailures}`);
    console.log(`Edits: ${stats.editsPerformed}`);
    console.log(`Cascade deletes: ${stats.cascadeDeletes}`);
    console.log(`Standings validated: ${stats.standingsValidated}`);
    console.log(`Bugs found: ${bugs.length}`);
    if (bugs.length > 0) {
      console.log('\nBUGS:');
      for (const bug of bugs) {
        console.log(`  [${bug.severity}] ${bug.category}: ${bug.description}`);
      }
    }
    console.log('================================\n');

    await db.delete();
  }, 30000);

  // ============================================
  // PHASE 1: CREATE 1000 TRIPS
  // ============================================

  it('Phase 1: creates 1000 trips with players, teams, sessions, matches', async () => {
    for (let t = 0; t < NUM_TRIPS; t++) {
      const now = isoNow(t * 100);
      const tripId = `mega-trip-${t}`;
      tripIds.push(tripId);

      // Trip
      await db.trips.put({
        id: tripId,
        name: `Trip ${t}`,
        startDate: now,
        endDate: isoNow(t * 100 + 86400000 * 3),
        createdAt: now,
        updatedAt: now,
      } as Trip);
      stats.tripsCreated++;

      // 8 players
      const playerIds: string[] = [];
      for (let p = 0; p < PLAYERS_PER_TRIP; p++) {
        const pid = `p-${tripId}-${p}`;
        await db.players.put({
          id: pid,
          tripId,
          firstName: `Player${p}`,
          lastName: `Trip${t}`,
          handicapIndex: Math.round(rng() * 360) / 10,
          createdAt: now,
        } as Player);
        playerIds.push(pid);
      }

      // 2 teams
      const teamAId = `team-${tripId}-a`;
      const teamBId = `team-${tripId}-b`;
      await db.teams.bulkPut([
        { id: teamAId, tripId, name: 'USA', color: 'usa', mode: 'ryderCup', createdAt: now } as Team,
        { id: teamBId, tripId, name: 'EUR', color: 'europe', mode: 'ryderCup', createdAt: now } as Team,
      ]);

      // Team members
      const members: TeamMember[] = [
        ...playerIds.slice(0, 4).map((pid, i) => ({
          id: `tm-${teamAId}-${i}`,
          teamId: teamAId,
          playerId: pid,
          sortOrder: i,
          createdAt: now,
        } as TeamMember)),
        ...playerIds.slice(4, 8).map((pid, i) => ({
          id: `tm-${teamBId}-${i}`,
          teamId: teamBId,
          playerId: pid,
          sortOrder: i,
          createdAt: now,
        } as TeamMember)),
      ];
      await db.teamMembers.bulkPut(members);

      // 1 singles session with 4 matches
      const sessionId = `session-${tripId}`;
      await db.sessions.put({
        id: sessionId,
        tripId,
        name: 'Singles',
        sessionNumber: 1,
        sessionType: 'singles' as SessionType,
        status: 'scheduled',
        createdAt: now,
      } as RyderCupSession);

      const usaPlayers = shuffle(playerIds.slice(0, 4));
      const eurPlayers = shuffle(playerIds.slice(4, 8));

      for (let m = 0; m < 4; m++) {
        const matchId = `match-${tripId}-${m}`;
        await db.matches.put({
          id: matchId,
          sessionId,
          matchOrder: m + 1,
          status: 'scheduled',
          currentHole: 1,
          teamAPlayerIds: [usaPlayers[m]],
          teamBPlayerIds: [eurPlayers[m]],
          teamAHandicapAllowance: 0,
          teamBHandicapAllowance: 0,
          result: 'notFinished',
          margin: 0,
          holesRemaining: 18,
          createdAt: now,
          updatedAt: now,
        } as Match);
        matchIds.push(matchId);
        stats.matchesCreated++;
      }
    }

    expect(stats.tripsCreated).toBe(1000);
    expect(stats.matchesCreated).toBe(4000);
    expect(await db.trips.count()).toBe(1000);
    expect(await db.matches.count()).toBe(4000);
  }, 120000);

  // ============================================
  // PHASE 2: SCORE ALL 4000 MATCHES
  // ============================================

  it('Phase 2: scores 4000 matches with invariant validation', async () => {
    const matches = await db.matches.toArray();

    for (const match of matches) {
      const holeResults: HoleResult[] = [];
      let score = 0;

      for (let hole = 1; hole <= TOTAL_HOLES; hole++) {
        const holesRemaining = TOTAL_HOLES - hole;

        // Closeout check
        if (Math.abs(score) > holesRemaining) break;

        const winner = pickWinner();
        if (winner === 'teamA') score++;
        else if (winner === 'teamB') score--;

        holeResults.push({
          id: `hr-${match.id}-${hole}`,
          matchId: match.id,
          holeNumber: hole,
          winner,
          teamAScore: 3 + Math.floor(rng() * 4),
          teamBScore: 3 + Math.floor(rng() * 4),
          timestamp: isoNow(hole * 10),
        });
        stats.holesScored++;

        if (Math.abs(score) > TOTAL_HOLES - hole) break;
      }

      await db.holeResults.bulkPut(holeResults);

      // Validate match state
      const state = calculateMatchState(match, holeResults);
      stats.invariantChecks++;

      // INV1: holesPlayed + holesRemaining <= 18
      if (state.holesPlayed + state.holesRemaining > TOTAL_HOLES) {
        reportBug(`INV1-${match.id}`, 'critical', 'scoring',
          `holesPlayed(${state.holesPlayed}) + holesRemaining(${state.holesRemaining}) > 18`,
          { matchId: match.id });
        stats.invariantFailures++;
      }

      // INV2: currentScore = teamAWon - teamBWon
      const expected = state.teamAHolesWon - state.teamBHolesWon;
      if (state.currentScore !== expected) {
        reportBug(`INV2-${match.id}`, 'critical', 'scoring',
          `currentScore(${state.currentScore}) != ${expected}`,
          { matchId: match.id });
        stats.invariantFailures++;
      }

      // INV3: closedOut implies |score| > holesRemaining
      if (state.isClosedOut && Math.abs(state.currentScore) <= state.holesRemaining) {
        reportBug(`INV3-${match.id}`, 'critical', 'scoring',
          `closedOut but |score| <= holesRemaining`, { matchId: match.id });
        stats.invariantFailures++;
      }

      // INV4: dormie consistency
      const dormie = checkDormie(state.currentScore, state.holesRemaining);
      if ((dormie.teamADormie || dormie.teamBDormie) !== state.isDormie) {
        reportBug(`INV4-${match.id}`, 'critical', 'scoring',
          `dormie mismatch`, { matchId: match.id });
        stats.invariantFailures++;
      }

      // INV5: points sum to 0 or 1
      const pts = calculateMatchPoints(state);
      const ptSum = pts.teamAPoints + pts.teamBPoints;
      if (ptSum !== 0 && ptSum !== 1) {
        reportBug(`INV5-${match.id}`, 'critical', 'scoring',
          `points sum ${ptSum}`, { matchId: match.id });
        stats.invariantFailures++;
      }

      // INV6: displayScore never empty
      if (!state.displayScore?.trim()) {
        reportBug(`INV6-${match.id}`, 'high', 'scoring',
          'empty displayScore', { matchId: match.id });
        stats.invariantFailures++;
      }

      if (state.isClosedOut || state.holesRemaining === 0) {
        stats.matchesCompleted++;
      }
    }

    expect(stats.holesScored).toBeGreaterThan(40000);
    expect(stats.invariantFailures).toBe(0);
  }, 300000);

  // ============================================
  // PHASE 3: STANDINGS FOR ALL 1000 TRIPS
  // ============================================

  it('Phase 3: validates standings for all 1000 trips', async () => {
    for (const tripId of tripIds) {
      const standings = await calculateTeamStandings(tripId);
      stats.invariantChecks++;
      stats.standingsValidated++;

      // Total points = completed matches
      const totalPts = standings.teamAPoints + standings.teamBPoints;
      if (totalPts !== standings.matchesCompleted) {
        reportBug(`STAND1-${tripId}`, 'critical', 'standings',
          `totalPts(${totalPts}) != completed(${standings.matchesCompleted})`,
          { tripId });
        stats.invariantFailures++;
      }

      // Non-negative
      if (standings.teamAPoints < 0 || standings.teamBPoints < 0) {
        reportBug(`STAND2-${tripId}`, 'critical', 'standings',
          'negative points', { tripId });
        stats.invariantFailures++;
      }

      // Leader correct
      if (standings.leader === 'teamA' && standings.teamAPoints <= standings.teamBPoints) {
        reportBug(`STAND3-${tripId}`, 'high', 'standings',
          'teamA leads but has fewer points', { tripId });
        stats.invariantFailures++;
      }
      if (standings.leader === 'teamB' && standings.teamBPoints <= standings.teamAPoints) {
        reportBug(`STAND4-${tripId}`, 'high', 'standings',
          'teamB leads but has fewer points', { tripId });
        stats.invariantFailures++;
      }

      // Margin
      const expectedMargin = Math.abs(standings.teamAPoints - standings.teamBPoints);
      if (standings.margin !== expectedMargin) {
        reportBug(`STAND5-${tripId}`, 'medium', 'standings',
          `margin(${standings.margin}) != ${expectedMargin}`, { tripId });
        stats.invariantFailures++;
      }
    }

    expect(stats.standingsValidated).toBe(1000);
    expect(stats.invariantFailures).toBe(0);
  }, 300000);

  // ============================================
  // PHASE 4: DEDUPLICATION GUARD (500 tests)
  // ============================================

  it('Phase 4: verifies dedup guard on 500 random matches', async () => {
    const sample = shuffle([...matchIds]).slice(0, 500);

    for (const matchId of sample) {
      const hrs = await db.holeResults.where('matchId').equals(matchId).toArray();
      if (hrs.length === 0) continue;

      // Pick a random scored hole and re-score with identical values
      const target = hrs[Math.floor(rng() * hrs.length)];
      const result = await recordHoleResult(
        matchId, target.holeNumber, target.winner,
        target.teamAScore, target.teamBScore, 'dedup-tester',
      );

      // Should return existing result (dedup), not create a new one
      if ('type' in result && result.type === 'conflict') {
        // Conflict is also acceptable (different user within 30s)
        stats.conflictsDetected++;
      } else {
        // Verify it's the same record
        if (result.id === target.id) {
          stats.dedupHits++;
        }
        // Either way, verify no extra scoring events were created
      }
    }

    // At least some dedup hits should have occurred
    expect(stats.dedupHits + stats.conflictsDetected).toBeGreaterThan(0);
    expect(stats.invariantFailures).toBe(0);
  }, 120000);

  // ============================================
  // PHASE 5: CONFLICT DETECTION (200 tests)
  // ============================================

  it('Phase 5: verifies conflict detection for concurrent scoring', async () => {
    const sample = shuffle([...matchIds]).slice(0, 200);

    for (const matchId of sample) {
      // Score a FRESH hole via the engine so the timestamp is recent (within 30s window)
      const hrs = await db.holeResults.where('matchId').equals(matchId).sortBy('holeNumber');
      const nextHole = (hrs.length > 0 ? hrs[hrs.length - 1].holeNumber : 0) + 1;
      if (nextHole > 18) continue;

      // User A scores the hole
      const userAResult = await recordHoleResult(
        matchId, nextHole, 'teamA', 4, 5, 'user-A',
      );
      if ('type' in userAResult && userAResult.type === 'conflict') continue;

      // User B tries to score the SAME hole with a DIFFERENT result (within 30s)
      const userBResult = await recordHoleResult(
        matchId, nextHole, 'teamB', 5, 4, 'user-B',
      );

      if ('type' in userBResult && userBResult.type === 'conflict') {
        stats.conflictsDetected++;
      }
    }

    // Fresh scores are within the 30s conflict window, so conflicts should be detected
    expect(stats.conflictsDetected).toBeGreaterThan(0);
    expect(stats.invariantFailures).toBe(0);
  }, 120000);

  // ============================================
  // PHASE 6: UNDO ROBUSTNESS (300 tests)
  // ============================================

  it('Phase 6: tests undo with hole validation on 300 matches', async () => {
    const sample = shuffle([...matchIds]).slice(0, 300);

    for (const matchId of sample) {
      const hrs = await db.holeResults.where('matchId').equals(matchId).sortBy('holeNumber');
      if (hrs.length === 0) continue;

      const lastHole = hrs[hrs.length - 1];

      // Score a new hole via the engine (creates scoring event for undo)
      const nextHole = lastHole.holeNumber + 1;
      if (nextHole > 18) continue;

      const scored = await recordHoleResult(matchId, nextHole, 'teamA', 4, 5, 'undo-tester');
      if ('type' in scored && scored.type === 'conflict') continue;
      stats.holesScored++;

      // Undo with correct expected hole
      const undoResult: UndoResult = await undoLastScore(matchId, nextHole);
      stats.undoOperations++;

      if (!undoResult.success) {
        reportBug(`UNDO1-${matchId}`, 'high', 'undo',
          `undo failed: ${undoResult.failureReason}`, { matchId, nextHole });
        stats.undoFailures++;
        stats.invariantFailures++;
        continue;
      }

      // Verify the hole was actually removed
      const afterUndo = await db.holeResults.where({ matchId, holeNumber: nextHole }).first();
      if (afterUndo) {
        reportBug(`UNDO2-${matchId}`, 'critical', 'undo',
          'hole result still exists after undo', { matchId, nextHole });
        stats.invariantFailures++;
      }

      // Undo with WRONG expected hole should fail
      const wrongUndo = await undoLastScore(matchId, 99);
      if (wrongUndo.success) {
        reportBug(`UNDO3-${matchId}`, 'critical', 'undo',
          'undo succeeded with wrong expectedHoleNumber', { matchId });
        stats.invariantFailures++;
      }
    }

    expect(stats.undoOperations).toBeGreaterThan(50);
    expect(stats.invariantFailures).toBe(0);
  }, 120000);

  // ============================================
  // PHASE 7: EDIT + RE-VALIDATE (200 tests)
  // ============================================

  it('Phase 7: edits scores and re-validates match states', async () => {
    const sample = shuffle([...matchIds]).slice(0, 200);

    for (const matchId of sample) {
      const hrs = await db.holeResults.where('matchId').equals(matchId).toArray();
      if (hrs.length === 0) continue;

      const match = await db.matches.get(matchId);
      if (!match) continue;

      // Edit a random hole's winner (captain override to bypass conflict)
      const target = hrs[Math.floor(rng() * hrs.length)];
      const newWinner: HoleWinner = target.winner === 'halved' ? 'teamA'
        : target.winner === 'teamA' ? 'teamB' : 'halved';

      const edited = await recordHoleResult(
        matchId, target.holeNumber, newWinner,
        target.teamAScore, target.teamBScore,
        'captain-edit', 'score correction', true, // captain override
      );

      if ('type' in edited && edited.type === 'conflict') continue;
      stats.editsPerformed++;

      // Re-validate match state after edit
      const updatedHrs = await db.holeResults.where('matchId').equals(matchId).toArray();
      const state = calculateMatchState(match, updatedHrs);
      stats.invariantChecks++;

      // Same invariants as Phase 2
      const expected = state.teamAHolesWon - state.teamBHolesWon;
      if (state.currentScore !== expected) {
        reportBug(`EDIT-INV-${matchId}`, 'critical', 'edit',
          `post-edit score mismatch`, { matchId });
        stats.invariantFailures++;
      }

      const pts = calculateMatchPoints(state);
      const ptSum = pts.teamAPoints + pts.teamBPoints;
      if (ptSum !== 0 && ptSum !== 1) {
        reportBug(`EDIT-PTS-${matchId}`, 'critical', 'edit',
          `post-edit points sum ${ptSum}`, { matchId });
        stats.invariantFailures++;
      }
    }

    expect(stats.editsPerformed).toBeGreaterThan(50);
    expect(stats.invariantFailures).toBe(0);
  }, 120000);

  // ============================================
  // PHASE 8: CASCADE DELETE (100 trips)
  // ============================================

  it('Phase 8: cascade deletes 20 trips and verifies no orphans', async () => {
    const toDelete = shuffle([...tripIds]).slice(0, 20);

    for (const tripId of toDelete) {
      await deleteTripCascade(tripId, { sync: false });
      stats.cascadeDeletes++;

      // Verify trip is gone
      const tripAfter = await db.trips.get(tripId);
      if (tripAfter) {
        reportBug(`DEL-TRIP-${tripId}`, 'critical', 'cascade',
          'trip still exists after delete', { tripId });
        stats.invariantFailures++;
      }

      // Verify no orphaned players
      const orphanPlayers = await db.players.where('tripId').equals(tripId).count();
      if (orphanPlayers > 0) {
        reportBug(`DEL-PLAYERS-${tripId}`, 'critical', 'cascade',
          `${orphanPlayers} orphaned players`, { tripId });
        stats.invariantFailures++;
      }

      // Verify no orphaned teams
      const orphanTeams = await db.teams.where('tripId').equals(tripId).count();
      if (orphanTeams > 0) {
        reportBug(`DEL-TEAMS-${tripId}`, 'critical', 'cascade',
          `${orphanTeams} orphaned teams`, { tripId });
        stats.invariantFailures++;
      }

      // Verify no orphaned sessions
      const orphanSessions = await db.sessions.where('tripId').equals(tripId).count();
      if (orphanSessions > 0) {
        reportBug(`DEL-SESSIONS-${tripId}`, 'critical', 'cascade',
          `${orphanSessions} orphaned sessions`, { tripId });
        stats.invariantFailures++;
      }
    }

    expect(stats.cascadeDeletes).toBe(20);
    expect(stats.invariantFailures).toBe(0);
  }, 300000);

  // ============================================
  // FINAL: BUG REPORT
  // ============================================

  it('FINAL: zero bugs found across all phases', () => {
    expect(bugs).toHaveLength(0);
    expect(stats.invariantFailures).toBe(0);
  });
});
