/**
 * 100-User × 100-Trip Stress Simulation
 *
 * Simulates 100 users across 100 trips with full match play scoring
 * to find bugs, inconsistencies, and data integrity issues.
 *
 * What we test:
 * 1. Data creation at scale (trips, players, teams, sessions, matches)
 * 2. Scoring engine correctness across thousands of matches
 * 3. Match state invariants (dormie, closeout, AS, completion)
 * 4. Points calculation consistency (team totals always sum correctly)
 * 5. Awards/statistics correctness
 * 6. Edge cases: halved matches, 1-up on 18, early closeouts (10&8)
 * 7. Cascade delete integrity (no orphaned records)
 * 8. Undo/redo consistency
 * 9. Data cross-reference integrity (foreign keys, IDs)
 * 10. Concurrent-style rapid scoring (multiple matches at once)
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../lib/db';
import {
  calculateMatchState,
  formatMatchScore,
  calculateMatchResult,
  calculateMatchPoints,
  checkDormie,
  wouldCloseOut,
  recordHoleResult,
  undoLastScore,
  formatFinalResult,
} from '../lib/services/scoringEngine';
import { calculateTeamStandings } from '../lib/services/tournamentEngine';
import { calculatePlayerStats } from '../lib/services/awardsService';
import { deleteMatchCascade } from '../lib/services/cascadeDelete';
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
// SIMULATION CONFIGURATION
// ============================================

const NUM_TRIPS = 100;
const PLAYERS_PER_TRIP = 10; // 5 per team
const SESSIONS_PER_TRIP = 3; // foursomes, fourball, singles
const TOTAL_HOLES = 18;

// Seeded pseudo-random number generator for reproducible results
function createRNG(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

const rng = createRNG(42); // Fixed seed for reproducibility

function shuffle<T>(arr: T[]): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
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
  context: Record<string, unknown> = {}
) {
  // Deduplicate by id
  if (!bugs.find(b => b.id === id)) {
    bugs.push({ id, severity, category, description, context });
  }
}

// ============================================
// STATISTICS TRACKING
// ============================================

interface SimStats {
  tripsCreated: number;
  playersCreated: number;
  teamsCreated: number;
  sessionsCreated: number;
  matchesCreated: number;
  holesScored: number;
  matchesCompleted: number;
  matchesClosedOutEarly: number;
  matchesHalved: number;
  matchesWonOnEighteen: number;
  undoOperations: number;
  cascadeDeletes: number;
  invariantChecks: number;
  invariantFailures: number;
  edgeCasesHit: Record<string, number>;
}

const stats: SimStats = {
  tripsCreated: 0,
  playersCreated: 0,
  teamsCreated: 0,
  sessionsCreated: 0,
  matchesCreated: 0,
  holesScored: 0,
  matchesCompleted: 0,
  matchesClosedOutEarly: 0,
  matchesHalved: 0,
  matchesWonOnEighteen: 0,
  undoOperations: 0,
  cascadeDeletes: 0,
  invariantChecks: 0,
  invariantFailures: 0,
  edgeCasesHit: {},
};

function trackEdgeCase(name: string) {
  stats.edgeCasesHit[name] = (stats.edgeCasesHit[name] || 0) + 1;
}

// ============================================
// DATA GENERATORS
// ============================================

const FIRST_NAMES = [
  'Tiger', 'Rory', 'Jordan', 'Brooks', 'Dustin', 'Justin', 'Jon', 'Collin',
  'Viktor', 'Xander', 'Patrick', 'Cameron', 'Sam', 'Tony', 'Scottie',
  'Bryson', 'Tommy', 'Shane', 'Matt', 'Tyrrell', 'Max', 'Will', 'Kevin',
  'Si Woo', 'Hideki', 'Sungjae', 'Joaquin', 'Adam', 'Jason', 'Phil',
  'Bubba', 'Zach', 'Luke', 'Ian', 'Lee', 'Sergio', 'Henrik', 'Martin',
  'Thomas', 'Danny', 'Paul', 'Bernd', 'Alex', 'Ryan', 'Rickie', 'Gary',
  'Padraig', 'Graeme', 'Francesco', 'Thorbjorn',
];

const LAST_NAMES = [
  'Woods', 'McIlroy', 'Spieth', 'Koepka', 'Johnson', 'Thomas', 'Rahm',
  'Morikawa', 'Hovland', 'Schauffele', 'Cantlay', 'Smith', 'Burns', 'Finau',
  'Scheffler', 'DeChambeau', 'Fleetwood', 'Lowry', 'Fitzpatrick', 'Hatton',
  'Homa', 'Zalatoris', 'Kisner', 'Kim', 'Matsuyama', 'Im', 'Niemann', 'Scott',
  'Day', 'Mickelson', 'Watson', 'Johnson', 'Donald', 'Poulter', 'Westwood',
  'Garcia', 'Stenson', 'Kaymer', 'Pieters', 'Willett', 'Casey', 'Wiesberger',
  'Noren', 'Fox', 'Fowler', 'Woodland', 'Harrington', 'McDowell', 'Molinari', 'Olesen',
];

function isoNow(offsetMs = 0): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

function generateTripName(index: number): string {
  const venues = [
    'Whistling Straits', 'Le Golf National', 'Hazeltine', 'Gleneagles',
    'Medinah', 'Celtic Manor', 'Valhalla', 'The K Club', 'Oakland Hills',
    'The Belfry', 'Brookline', 'Kiawah Island', 'Bethpage', 'Marco Simone',
  ];
  return `${venues[index % venues.length]} ${2024 + Math.floor(index / venues.length)}`;
}

function generatePlayer(tripId: string, index: number): Player {
  const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
  const lastName = LAST_NAMES[index % LAST_NAMES.length];
  return {
    id: `player-${tripId}-${index}`,
    tripId,
    firstName,
    lastName,
    handicapIndex: Math.round((rng() * 36) * 10) / 10, // 0.0 to 36.0
    team: index < PLAYERS_PER_TRIP / 2 ? 'usa' : 'europe',
    createdAt: isoNow(),
  };
}

// ============================================
// MAIN SIMULATION
// ============================================

describe('100-User × 100-Trip Stress Simulation', () => {
  // Track all created entity IDs for integrity checks
  const allTripIds: string[] = [];
  const allPlayerIds: string[] = [];
  const allTeamIds: string[] = [];
  const allSessionIds: string[] = [];
  const allMatchIds: string[] = [];
  const tripPlayerMap = new Map<string, string[]>(); // tripId -> playerIds
  const tripTeamMap = new Map<string, { teamAId: string; teamBId: string }>();

  beforeAll(async () => {
    await db.delete();
    await db.open();
  }, 30000);

  afterAll(async () => {
    await db.delete();
  }, 30000);

  // ============================================
  // PHASE 1: CREATE 100 TRIPS WITH 100 PLAYERS
  // ============================================

  it('Phase 1: creates 100 trips with 1000 players, teams, and sessions', async () => {
    for (let t = 0; t < NUM_TRIPS; t++) {
      const now = isoNow(t * 1000);
      const tripId = `trip-${t}`;

      // Create trip
      const trip: Trip = {
        id: tripId,
        name: generateTripName(t),
        startDate: now,
        endDate: isoNow(t * 1000 + 86400000 * 3),
        isCaptainModeEnabled: rng() > 0.5,
        createdAt: now,
        updatedAt: now,
      };
      await db.trips.put(trip);
      allTripIds.push(tripId);
      stats.tripsCreated++;

      // Create 10 players per trip
      const playerIds: string[] = [];
      for (let p = 0; p < PLAYERS_PER_TRIP; p++) {
        const player = generatePlayer(tripId, p);
        await db.players.put(player);
        playerIds.push(player.id);
        allPlayerIds.push(player.id);
        stats.playersCreated++;
      }
      tripPlayerMap.set(tripId, playerIds);

      // Create 2 teams per trip
      const teamAId = `team-${tripId}-usa`;
      const teamBId = `team-${tripId}-europe`;
      const teamA: Team = {
        id: teamAId,
        tripId,
        name: 'USA',
        color: 'usa',
        mode: 'ryderCup',
        createdAt: now,
      };
      const teamB: Team = {
        id: teamBId,
        tripId,
        name: 'Europe',
        color: 'europe',
        mode: 'ryderCup',
        createdAt: now,
      };
      await db.teams.bulkPut([teamA, teamB]);
      allTeamIds.push(teamAId, teamBId);
      tripTeamMap.set(tripId, { teamAId, teamBId });
      stats.teamsCreated += 2;

      // Create team members
      const usaPlayers = playerIds.slice(0, 5);
      const europePlayers = playerIds.slice(5, 10);

      const teamMembers: TeamMember[] = [
        ...usaPlayers.map((pid, i) => ({
          id: `tm-${teamAId}-${pid}`,
          teamId: teamAId,
          playerId: pid,
          sortOrder: i,
          isCaptain: i === 0,
          createdAt: now,
        })),
        ...europePlayers.map((pid, i) => ({
          id: `tm-${teamBId}-${pid}`,
          teamId: teamBId,
          playerId: pid,
          sortOrder: i,
          isCaptain: i === 0,
          createdAt: now,
        })),
      ];
      await db.teamMembers.bulkPut(teamMembers);

      // Create 3 sessions per trip: foursomes, fourball, singles
      const sessionTypes: SessionType[] = ['foursomes', 'fourball', 'singles'];
      for (let s = 0; s < SESSIONS_PER_TRIP; s++) {
        const sessionId = `session-${tripId}-${s}`;
        const session: RyderCupSession = {
          id: sessionId,
          tripId,
          name: `Day ${s + 1} ${sessionTypes[s]}`,
          sessionNumber: s + 1,
          sessionType: sessionTypes[s],
          status: 'scheduled',
          createdAt: now,
        };
        await db.sessions.put(session);
        allSessionIds.push(sessionId);
        stats.sessionsCreated++;

        // Create matches for this session
        const matchCount = sessionTypes[s] === 'singles' ? 5 : 2;
        const shuffledUsa = shuffle(usaPlayers);
        const shuffledEurope = shuffle(europePlayers);

        for (let m = 0; m < matchCount; m++) {
          const matchId = `match-${sessionId}-${m}`;
          let teamAPlayerIds: string[];
          let teamBPlayerIds: string[];

          if (sessionTypes[s] === 'singles') {
            teamAPlayerIds = [shuffledUsa[m]];
            teamBPlayerIds = [shuffledEurope[m]];
          } else {
            // Pairs for foursomes/fourball
            teamAPlayerIds = [shuffledUsa[m * 2], shuffledUsa[m * 2 + 1]];
            teamBPlayerIds = [shuffledEurope[m * 2], shuffledEurope[m * 2 + 1]];
          }

          const match: Match = {
            id: matchId,
            sessionId,
            matchOrder: m + 1,
            status: 'scheduled',
            currentHole: 1,
            teamAPlayerIds,
            teamBPlayerIds,
            teamAHandicapAllowance: 0,
            teamBHandicapAllowance: 0,
            result: 'notFinished',
            margin: 0,
            holesRemaining: 18,
            createdAt: now,
            updatedAt: now,
          };
          await db.matches.put(match);
          allMatchIds.push(matchId);
          stats.matchesCreated++;
        }
      }
    }

    // Verify totals
    expect(stats.tripsCreated).toBe(100);
    expect(stats.playersCreated).toBe(1000);
    expect(stats.teamsCreated).toBe(200);
    expect(stats.sessionsCreated).toBe(300);
    // 2 foursomes + 2 fourball + 5 singles = 9 matches per trip
    expect(stats.matchesCreated).toBe(900);

    // Verify DB counts
    const dbTrips = await db.trips.count();
    const dbPlayers = await db.players.count();
    const dbMatches = await db.matches.count();
    expect(dbTrips).toBe(100);
    expect(dbPlayers).toBe(1000);
    expect(dbMatches).toBe(900);
  }, 60000);

  // ============================================
  // PHASE 2: SCORE ALL MATCHES (PURE FUNCTIONS)
  // ============================================

  it('Phase 2: scores all 900 matches and validates scoring invariants', async () => {
    const matches = await db.matches.toArray();

    for (const match of matches) {
      // Generate hole results
      const holeResults: HoleResult[] = [];
      let score = 0; // running score (positive = teamA leads)

      for (let hole = 1; hole <= TOTAL_HOLES; hole++) {
        const holesRemaining = TOTAL_HOLES - hole;

        // Check if match is already closed out
        if (Math.abs(score) > holesRemaining + 1) {
          trackEdgeCase('earlyCloseout');
          break;
        }

        // Generate random winner with realistic distribution
        const roll = rng();
        let winner: HoleWinner;
        if (roll < 0.35) {
          winner = 'teamA';
          score++;
        } else if (roll < 0.70) {
          winner = 'teamB';
          score--;
        } else {
          winner = 'halved';
        }

        const holeResult: HoleResult = {
          id: `hr-${match.id}-${hole}`,
          matchId: match.id,
          holeNumber: hole,
          winner,
          teamAScore: 3 + Math.floor(rng() * 4), // Realistic scores 3-6
          teamBScore: 3 + Math.floor(rng() * 4),
          timestamp: isoNow(hole * 100),
        };
        holeResults.push(holeResult);
        stats.holesScored++;

        // Check closeout after recording
        const newHolesRemaining = TOTAL_HOLES - hole;
        if (Math.abs(score) > newHolesRemaining) {
          trackEdgeCase('closeoutOnHole');
          break;
        }
      }

      // Bulk insert hole results
      await db.holeResults.bulkPut(holeResults);

      // ============================================
      // INVARIANT CHECKS ON EACH MATCH
      // ============================================

      const matchState = calculateMatchState(match, holeResults);
      stats.invariantChecks++;

      // INVARIANT 1: holesPlayed + holesRemaining must equal 18 or less
      if (matchState.holesPlayed + matchState.holesRemaining > TOTAL_HOLES) {
        reportBug(
          `INV1-${match.id}`,
          'critical',
          'scoring-engine',
          `holesPlayed (${matchState.holesPlayed}) + holesRemaining (${matchState.holesRemaining}) > 18`,
          { matchId: match.id, holesPlayed: matchState.holesPlayed, holesRemaining: matchState.holesRemaining }
        );
        stats.invariantFailures++;
      }

      // INVARIANT 2: |currentScore| must equal |teamAHolesWon - teamBHolesWon|
      const expectedScore = matchState.teamAHolesWon - matchState.teamBHolesWon;
      if (matchState.currentScore !== expectedScore) {
        reportBug(
          `INV2-${match.id}`,
          'critical',
          'scoring-engine',
          `currentScore (${matchState.currentScore}) != teamAWon - teamBWon (${expectedScore})`,
          { matchId: match.id }
        );
        stats.invariantFailures++;
      }

      // INVARIANT 3: If isClosedOut, |score| must be > holesRemaining
      if (matchState.isClosedOut && Math.abs(matchState.currentScore) <= matchState.holesRemaining) {
        reportBug(
          `INV3-${match.id}`,
          'critical',
          'scoring-engine',
          `isClosedOut but |score| (${Math.abs(matchState.currentScore)}) <= holesRemaining (${matchState.holesRemaining})`,
          { matchId: match.id }
        );
        stats.invariantFailures++;
      }

      // INVARIANT 4: isDormie means |score| === holesRemaining
      if (matchState.isDormie) {
        if (Math.abs(matchState.currentScore) !== matchState.holesRemaining) {
          reportBug(
            `INV4-${match.id}`,
            'critical',
            'scoring-engine',
            `isDormie but |score| (${Math.abs(matchState.currentScore)}) != holesRemaining (${matchState.holesRemaining})`,
            { matchId: match.id }
          );
          stats.invariantFailures++;
        }
        trackEdgeCase('dormie');
      }

      // INVARIANT 5: Points must be (1,0), (0,1), (0.5,0.5), or (0,0)
      const points = calculateMatchPoints(matchState);
      const pointSum = points.teamAPoints + points.teamBPoints;
      if (pointSum !== 0 && pointSum !== 1) {
        reportBug(
          `INV5-${match.id}`,
          'critical',
          'scoring-engine',
          `Point total is ${pointSum}, expected 0 or 1`,
          { matchId: match.id, points }
        );
        stats.invariantFailures++;
      }

      // INVARIANT 6: displayScore should never be empty
      if (!matchState.displayScore || matchState.displayScore.trim() === '') {
        reportBug(
          `INV6-${match.id}`,
          'high',
          'scoring-engine',
          'displayScore is empty',
          { matchId: match.id, displayScore: matchState.displayScore }
        );
        stats.invariantFailures++;
      }

      // INVARIANT 7: completed match must have a result type other than 'notFinished'
      const resultType = calculateMatchResult(matchState);
      if (matchState.isClosedOut || matchState.holesRemaining === 0) {
        stats.matchesCompleted++;
        if (resultType === 'notFinished') {
          reportBug(
            `INV7-${match.id}`,
            'high',
            'scoring-engine',
            'Completed match has result type "notFinished"',
            { matchId: match.id, matchState }
          );
          stats.invariantFailures++;
        }
      }

      // INVARIANT 8: formatFinalResult should produce valid text for completed matches
      if (matchState.isClosedOut || matchState.holesRemaining === 0) {
        const finalResult = formatFinalResult(matchState, 'USA', 'Europe');
        if (!finalResult || finalResult.trim() === '') {
          reportBug(
            `INV8-${match.id}`,
            'medium',
            'scoring-engine',
            'formatFinalResult returned empty string for completed match',
            { matchId: match.id }
          );
          stats.invariantFailures++;
        }

        // Check halved match formatting
        if (matchState.currentScore === 0 && matchState.holesRemaining === 0) {
          stats.matchesHalved++;
          if (finalResult !== 'Match Halved') {
            reportBug(
              `INV8a-${match.id}`,
              'medium',
              'scoring-engine',
              `Halved match formatted as "${finalResult}" instead of "Match Halved"`,
              { matchId: match.id }
            );
          }
        }
      }

      // INVARIANT 9: closeout score format should be "X&Y" or "X UP"
      if (matchState.isClosedOut) {
        stats.matchesClosedOutEarly++;
        const ds = matchState.displayScore;
        const validCloseout = /^\d+&\d+$/.test(ds) || /^\d+ UP$/.test(ds);
        if (!validCloseout) {
          reportBug(
            `INV9-${match.id}`,
            'medium',
            'scoring-engine',
            `Closeout displayScore "${ds}" doesn't match expected format`,
            { matchId: match.id, displayScore: ds }
          );
          stats.invariantFailures++;
        }
      }

      // Track won-on-18
      if (matchState.holesRemaining === 0 && matchState.currentScore !== 0 && !matchState.isClosedOut) {
        // This case shouldn't exist — if holesRemaining === 0, it's either closedOut or halved or won on 18
        // Won on 18 means score of +/-1 with 0 remaining (closeout at 18)
        trackEdgeCase('wonOnEighteen');
        stats.matchesWonOnEighteen++;
      }

      // INVARIANT 10: checkDormie consistency
      const dormieCheck = checkDormie(matchState.currentScore, matchState.holesRemaining);
      if ((dormieCheck.teamADormie || dormieCheck.teamBDormie) !== matchState.isDormie) {
        reportBug(
          `INV10-${match.id}`,
          'high',
          'scoring-engine',
          'checkDormie disagrees with calculateMatchState.isDormie',
          {
            matchId: match.id,
            checkDormie: dormieCheck,
            calculateIsDormie: matchState.isDormie,
          }
        );
        stats.invariantFailures++;
      }

      // INVARIANT 11: wouldCloseOut consistency
      // If match IS closed out, then scoring the closing hole should have returned true
      if (holeResults.length > 0 && matchState.isClosedOut) {
        const lastResult = holeResults[holeResults.length - 1];
        const prevScore = matchState.currentScore - (lastResult.winner === 'teamA' ? 1 : lastResult.winner === 'teamB' ? -1 : 0);
        const prevRemaining = matchState.holesRemaining + 1;
        const shouldCloseOut = wouldCloseOut(prevScore, prevRemaining, lastResult.winner);
        if (!shouldCloseOut) {
          reportBug(
            `INV11-${match.id}`,
            'high',
            'scoring-engine',
            'Match is closed out but wouldCloseOut returned false for the closing hole',
            { matchId: match.id, prevScore, prevRemaining, lastWinner: lastResult.winner }
          );
          stats.invariantFailures++;
        }
      }
    }

    // All matches should be processed
    expect(stats.holesScored).toBeGreaterThan(10000);
    expect(stats.invariantFailures).toBe(0);
  }, 120000);

  // ============================================
  // PHASE 3: TEAM STANDINGS VALIDATION
  // ============================================

  it('Phase 3: validates team standings for all 100 trips', async () => {
    for (const tripId of allTripIds) {
      const standings = await calculateTeamStandings(tripId);
      stats.invariantChecks++;

      // INVARIANT 12: Total points must equal completed matches
      const totalPoints = standings.teamAPoints + standings.teamBPoints;
      if (totalPoints !== standings.matchesCompleted) {
        // Each completed match awards exactly 1 point total (win=1+0, halve=0.5+0.5)
        reportBug(
          `INV12-${tripId}`,
          'critical',
          'tournament-engine',
          `Total points (${totalPoints}) != matchesCompleted (${standings.matchesCompleted})`,
          { tripId, standings }
        );
        stats.invariantFailures++;
      }

      // INVARIANT 13: Points must be non-negative
      if (standings.teamAPoints < 0 || standings.teamBPoints < 0) {
        reportBug(
          `INV13-${tripId}`,
          'critical',
          'tournament-engine',
          `Negative points: A=${standings.teamAPoints}, B=${standings.teamBPoints}`,
          { tripId }
        );
        stats.invariantFailures++;
      }

      // INVARIANT 14: Leader must be correct
      if (standings.leader === 'teamA' && standings.teamAPoints <= standings.teamBPoints) {
        reportBug(
          `INV14a-${tripId}`,
          'high',
          'tournament-engine',
          `Leader is teamA but teamAPoints (${standings.teamAPoints}) <= teamBPoints (${standings.teamBPoints})`,
          { tripId }
        );
        stats.invariantFailures++;
      }
      if (standings.leader === 'teamB' && standings.teamBPoints <= standings.teamAPoints) {
        reportBug(
          `INV14b-${tripId}`,
          'high',
          'tournament-engine',
          `Leader is teamB but teamBPoints (${standings.teamBPoints}) <= teamAPoints (${standings.teamAPoints})`,
          { tripId }
        );
        stats.invariantFailures++;
      }
      if (standings.leader === null && standings.teamAPoints !== standings.teamBPoints) {
        reportBug(
          `INV14c-${tripId}`,
          'high',
          'tournament-engine',
          `Leader is null but points are unequal: A=${standings.teamAPoints}, B=${standings.teamBPoints}`,
          { tripId }
        );
        stats.invariantFailures++;
      }

      // INVARIANT 15: Margin must equal |teamAPoints - teamBPoints|
      const expectedMargin = Math.abs(standings.teamAPoints - standings.teamBPoints);
      if (standings.margin !== expectedMargin) {
        reportBug(
          `INV15-${tripId}`,
          'medium',
          'tournament-engine',
          `Margin (${standings.margin}) != |A-B| (${expectedMargin})`,
          { tripId }
        );
        stats.invariantFailures++;
      }

      // INVARIANT 16: matchesCompleted + matchesRemaining must equal totalMatches
      if (standings.matchesCompleted + standings.matchesRemaining !== standings.totalMatches) {
        reportBug(
          `INV16-${tripId}`,
          'high',
          'tournament-engine',
          `matchesCompleted (${standings.matchesCompleted}) + matchesRemaining (${standings.matchesRemaining}) != totalMatches (${standings.totalMatches})`,
          { tripId }
        );
        stats.invariantFailures++;
      }
    }

    expect(stats.invariantFailures).toBe(0);
  }, 120000);

  // ============================================
  // PHASE 4: AWARDS / PLAYER STATS
  // ============================================

  it('Phase 4: validates player stats for 10 sample trips', async () => {
    // Sample 10 trips for awards calculation (expensive operation)
    const sampleTrips = allTripIds.slice(0, 10);

    for (const tripId of sampleTrips) {
      const playerStats = await calculatePlayerStats(tripId);
      stats.invariantChecks++;

      // INVARIANT 17: Every player in the trip should have stats
      const tripPlayers = tripPlayerMap.get(tripId) || [];
      // Some players might not be in completed matches, so stats can be empty
      // But any player WITH stats should be from this trip
      for (const ps of playerStats) {
        if (!tripPlayers.includes(ps.playerId)) {
          reportBug(
            `INV17-${tripId}-${ps.playerId}`,
            'high',
            'awards-service',
            `Player ${ps.playerId} has stats but is not in trip ${tripId}`,
            { tripId, playerId: ps.playerId }
          );
          stats.invariantFailures++;
        }

        // INVARIANT 18: wins + losses + halves must equal matchesPlayed
        if (ps.wins + ps.losses + ps.halves !== ps.matchesPlayed) {
          reportBug(
            `INV18-${tripId}-${ps.playerId}`,
            'critical',
            'awards-service',
            `wins (${ps.wins}) + losses (${ps.losses}) + halves (${ps.halves}) != matchesPlayed (${ps.matchesPlayed})`,
            { tripId, playerId: ps.playerId, stats: ps }
          );
          stats.invariantFailures++;
        }

        // INVARIANT 19: points must equal wins + (halves * 0.5)
        const expectedPoints = ps.wins + ps.halves * 0.5;
        if (Math.abs(ps.points - expectedPoints) > 0.001) {
          reportBug(
            `INV19-${tripId}-${ps.playerId}`,
            'critical',
            'awards-service',
            `points (${ps.points}) != wins + halves*0.5 (${expectedPoints})`,
            { tripId, playerId: ps.playerId }
          );
          stats.invariantFailures++;
        }

        // INVARIANT 20: winPercentage must be between 0 and 1 (or 0 if no matches)
        if (ps.matchesPlayed > 0) {
          if (ps.winPercentage < 0 || ps.winPercentage > 1) {
            reportBug(
              `INV20-${tripId}-${ps.playerId}`,
              'medium',
              'awards-service',
              `winPercentage (${ps.winPercentage}) out of range [0, 1]`,
              { tripId, playerId: ps.playerId }
            );
            stats.invariantFailures++;
          }
        }

        // INVARIANT 21: longestWinStreak must be >= currentStreak (if current is positive)
        if (ps.currentStreak > 0 && ps.longestWinStreak < ps.currentStreak) {
          reportBug(
            `INV21-${tripId}-${ps.playerId}`,
            'medium',
            'awards-service',
            `longestWinStreak (${ps.longestWinStreak}) < currentStreak (${ps.currentStreak})`,
            { tripId, playerId: ps.playerId }
          );
          stats.invariantFailures++;
        }
      }
    }

    expect(stats.invariantFailures).toBe(0);
  }, 60000);

  // ============================================
  // PHASE 5: UNDO / REDO CONSISTENCY
  // ============================================

  it('Phase 5: tests undo operations on 50 random matches', async () => {
    // Pick 50 random matches to test undo
    const matchesToTest = shuffle(allMatchIds).slice(0, 50);

    for (const matchId of matchesToTest) {
      const match = await db.matches.get(matchId);
      if (!match) continue;

      // Get original results
      const originalResults = await db.holeResults
        .where('matchId')
        .equals(matchId)
        .toArray();
      const originalCount = originalResults.length;

      if (originalCount === 0) continue;

      // Record one new result via the engine (to get a scoring event)
      const nextHole = originalCount + 1;
      if (nextHole > 18) continue;

      await recordHoleResult(matchId, nextHole, 'teamA', 4, 5, 'sim-user');
      stats.holesScored++;

      // Verify it was added
      const afterAdd = await db.holeResults
        .where('matchId')
        .equals(matchId)
        .count();
      expect(afterAdd).toBe(originalCount + 1);

      // Undo it
      const undoResult = await undoLastScore(matchId);
      stats.undoOperations++;

      if (undoResult) {
        // Verify the hole result was removed
        const afterUndo = await db.holeResults
          .where('matchId')
          .equals(matchId)
          .count();

        if (afterUndo !== originalCount) {
          reportBug(
            `UNDO-${matchId}`,
            'critical',
            'scoring-engine',
            `After undo, expected ${originalCount} results but got ${afterUndo}`,
            { matchId, originalCount, afterUndo }
          );
          stats.invariantFailures++;
        }
      }
    }

    expect(stats.undoOperations).toBeGreaterThanOrEqual(20); // Some matches are fully scored, can't add hole 19
    expect(stats.invariantFailures).toBe(0);
  }, 60000);

  // ============================================
  // PHASE 6: CASCADE DELETE INTEGRITY
  // ============================================

  it('Phase 6: tests cascade delete on 10 matches leaves no orphans', async () => {
    // Pick 10 matches to cascade-delete
    const toDelete = shuffle(allMatchIds).slice(0, 10);

    for (const matchId of toDelete) {
      // Count before
      const hrBefore = await db.holeResults.where('matchId').equals(matchId).count();
      const eventsBefore = await db.scoringEvents.where('matchId').equals(matchId).count();

      await deleteMatchCascade(matchId, { sync: false });
      stats.cascadeDeletes++;

      // Verify no orphaned records
      const matchAfter = await db.matches.get(matchId);
      const hrAfter = await db.holeResults.where('matchId').equals(matchId).count();
      const eventsAfter = await db.scoringEvents.where('matchId').equals(matchId).count();

      if (matchAfter) {
        reportBug(
          `CASCADE-match-${matchId}`,
          'critical',
          'cascade-delete',
          'Match still exists after cascade delete',
          { matchId }
        );
        stats.invariantFailures++;
      }

      if (hrAfter > 0) {
        reportBug(
          `CASCADE-hr-${matchId}`,
          'critical',
          'cascade-delete',
          `${hrAfter} orphaned holeResults after cascade delete`,
          { matchId, hrBefore, hrAfter }
        );
        stats.invariantFailures++;
      }

      if (eventsAfter > 0) {
        reportBug(
          `CASCADE-events-${matchId}`,
          'critical',
          'cascade-delete',
          `${eventsAfter} orphaned scoringEvents after cascade delete`,
          { matchId, eventsBefore, eventsAfter }
        );
        stats.invariantFailures++;
      }
    }

    expect(stats.cascadeDeletes).toBe(10);
    expect(stats.invariantFailures).toBe(0);
  }, 30000);

  // ============================================
  // PHASE 7: EDGE CASE MATRIX
  // ============================================

  it('Phase 7: exercises scoring engine edge cases', async () => {
    // Create an isolated test match for edge cases
    const edgeSessionId = 'edge-session';
    await db.sessions.put({
      id: edgeSessionId,
      tripId: allTripIds[0],
      name: 'Edge Cases',
      sessionNumber: 99,
      sessionType: 'singles',
      status: 'scheduled',
      createdAt: isoNow(),
    });

    // Edge Case 1: All halved (18 halves = AS)
    {
      const matchId = 'edge-all-halved';
      const match: Match = {
        id: matchId, sessionId: edgeSessionId, matchOrder: 1, status: 'scheduled',
        currentHole: 1, teamAPlayerIds: ['p1'], teamBPlayerIds: ['p2'],
        teamAHandicapAllowance: 0, teamBHandicapAllowance: 0,
        result: 'notFinished', margin: 0, holesRemaining: 18,
        createdAt: isoNow(), updatedAt: isoNow(),
      };
      await db.matches.put(match);

      const results: HoleResult[] = [];
      for (let h = 1; h <= 18; h++) {
        results.push({
          id: `edge-halved-${h}`, matchId, holeNumber: h,
          winner: 'halved', timestamp: isoNow(h),
        });
      }
      await db.holeResults.bulkPut(results);

      const state = calculateMatchState(match, results);
      expect(state.currentScore).toBe(0);
      expect(state.displayScore).toBe('AS');
      expect(state.holesRemaining).toBe(0);
      expect(state.isClosedOut).toBe(false);
      expect(state.isDormie).toBe(false);
      expect(state.status).toBe('completed');

      const pts = calculateMatchPoints(state);
      expect(pts.teamAPoints).toBe(0.5);
      expect(pts.teamBPoints).toBe(0.5);
      trackEdgeCase('allHalved');
    }

    // Edge Case 2: 10&8 blowout (biggest possible closeout)
    {
      const matchId = 'edge-10-8';
      const match: Match = {
        id: matchId, sessionId: edgeSessionId, matchOrder: 2, status: 'scheduled',
        currentHole: 1, teamAPlayerIds: ['p1'], teamBPlayerIds: ['p2'],
        teamAHandicapAllowance: 0, teamBHandicapAllowance: 0,
        result: 'notFinished', margin: 0, holesRemaining: 18,
        createdAt: isoNow(), updatedAt: isoNow(),
      };
      await db.matches.put(match);

      const results: HoleResult[] = [];
      // TeamA wins first 10 holes = 10 up with 8 remaining = closed out
      for (let h = 1; h <= 10; h++) {
        results.push({
          id: `edge-10-8-${h}`, matchId, holeNumber: h,
          winner: 'teamA', timestamp: isoNow(h),
        });
      }
      await db.holeResults.bulkPut(results);

      const state = calculateMatchState(match, results);
      expect(state.currentScore).toBe(10);
      expect(state.holesRemaining).toBe(8);
      expect(state.isClosedOut).toBe(true);
      expect(state.status).toBe('completed');
      // displayScore should be "10&8"
      expect(state.displayScore).toBe('10&8');

      const pts = calculateMatchPoints(state);
      expect(pts.teamAPoints).toBe(1);
      expect(pts.teamBPoints).toBe(0);
      trackEdgeCase('10and8');
    }

    // Edge Case 3: 1 UP on 18 (closest possible win)
    {
      const matchId = 'edge-1up-18';
      const match: Match = {
        id: matchId, sessionId: edgeSessionId, matchOrder: 3, status: 'scheduled',
        currentHole: 1, teamAPlayerIds: ['p1'], teamBPlayerIds: ['p2'],
        teamAHandicapAllowance: 0, teamBHandicapAllowance: 0,
        result: 'notFinished', margin: 0, holesRemaining: 18,
        createdAt: isoNow(), updatedAt: isoNow(),
      };
      await db.matches.put(match);

      const results: HoleResult[] = [];
      // 17 halves + teamA wins 18th = 1 UP
      for (let h = 1; h <= 17; h++) {
        results.push({
          id: `edge-1up18-${h}`, matchId, holeNumber: h,
          winner: 'halved', timestamp: isoNow(h),
        });
      }
      results.push({
        id: 'edge-1up18-18', matchId, holeNumber: 18,
        winner: 'teamA', timestamp: isoNow(18),
      });
      await db.holeResults.bulkPut(results);

      const state = calculateMatchState(match, results);
      expect(state.currentScore).toBe(1);
      expect(state.holesRemaining).toBe(0);
      expect(state.isClosedOut).toBe(true); // 1 > 0 remaining
      expect(state.displayScore).toBe('1 UP');
      trackEdgeCase('1upOn18');
    }

    // Edge Case 4: Dormie (3 up with 3 to play)
    {
      const matchId = 'edge-dormie';
      const match: Match = {
        id: matchId, sessionId: edgeSessionId, matchOrder: 4, status: 'scheduled',
        currentHole: 1, teamAPlayerIds: ['p1'], teamBPlayerIds: ['p2'],
        teamAHandicapAllowance: 0, teamBHandicapAllowance: 0,
        result: 'notFinished', margin: 0, holesRemaining: 18,
        createdAt: isoNow(), updatedAt: isoNow(),
      };
      await db.matches.put(match);

      const results: HoleResult[] = [];
      // TeamA wins holes 1,2,3 then 12 halves = 3 up with 3 to play (dormie at hole 15)
      for (let h = 1; h <= 15; h++) {
        results.push({
          id: `edge-dormie-${h}`, matchId, holeNumber: h,
          winner: h <= 3 ? 'teamA' : 'halved', timestamp: isoNow(h),
        });
      }
      await db.holeResults.bulkPut(results);

      const state = calculateMatchState(match, results);
      expect(state.currentScore).toBe(3);
      expect(state.holesRemaining).toBe(3);
      expect(state.isDormie).toBe(true);
      expect(state.isClosedOut).toBe(false); // 3 is NOT > 3
      trackEdgeCase('dormieExact');
    }

    // Edge Case 5: Empty match (0 holes scored)
    {
      const matchId = 'edge-empty';
      const match: Match = {
        id: matchId, sessionId: edgeSessionId, matchOrder: 5, status: 'scheduled',
        currentHole: 1, teamAPlayerIds: ['p1'], teamBPlayerIds: ['p2'],
        teamAHandicapAllowance: 0, teamBHandicapAllowance: 0,
        result: 'notFinished', margin: 0, holesRemaining: 18,
        createdAt: isoNow(), updatedAt: isoNow(),
      };
      await db.matches.put(match);

      const state = calculateMatchState(match, []);
      expect(state.currentScore).toBe(0);
      expect(state.holesPlayed).toBe(0);
      expect(state.holesRemaining).toBe(18);
      expect(state.displayScore).toBe('AS');
      expect(state.status).toBe('scheduled');
      expect(state.isDormie).toBe(false);
      expect(state.isClosedOut).toBe(false);
      expect(state.winningTeam).toBeNull();

      const pts = calculateMatchPoints(state);
      expect(pts.teamAPoints).toBe(0);
      expect(pts.teamBPoints).toBe(0);
      trackEdgeCase('emptyMatch');
    }

    // Edge Case 6: Duplicate hole results (same hole scored twice, latest wins)
    {
      const matchId = 'edge-duplicate';
      const match: Match = {
        id: matchId, sessionId: edgeSessionId, matchOrder: 6, status: 'scheduled',
        currentHole: 1, teamAPlayerIds: ['p1'], teamBPlayerIds: ['p2'],
        teamAHandicapAllowance: 0, teamBHandicapAllowance: 0,
        result: 'notFinished', margin: 0, holesRemaining: 18,
        createdAt: isoNow(), updatedAt: isoNow(),
      };
      await db.matches.put(match);

      const results: HoleResult[] = [
        // Hole 1 scored twice - first teamA, then teamB (later timestamp wins)
        { id: 'dup-1a', matchId, holeNumber: 1, winner: 'teamA', timestamp: '2026-01-01T10:00:00Z' },
        { id: 'dup-1b', matchId, holeNumber: 1, winner: 'teamB', timestamp: '2026-01-01T10:05:00Z' },
        // Hole 2 normal
        { id: 'dup-2', matchId, holeNumber: 2, winner: 'teamA', timestamp: '2026-01-01T10:10:00Z' },
      ];

      const state = calculateMatchState(match, results);
      // Hole 1 should be teamB (later timestamp), hole 2 is teamA = AS
      expect(state.currentScore).toBe(0);
      expect(state.holesPlayed).toBe(2);
      expect(state.displayScore).toBe('AS');
      trackEdgeCase('duplicateHoleResult');
    }

    // Edge Case 7: Invalid hole numbers (should be filtered out)
    {
      const matchId = 'edge-invalid-holes';
      const match: Match = {
        id: matchId, sessionId: edgeSessionId, matchOrder: 7, status: 'scheduled',
        currentHole: 1, teamAPlayerIds: ['p1'], teamBPlayerIds: ['p2'],
        teamAHandicapAllowance: 0, teamBHandicapAllowance: 0,
        result: 'notFinished', margin: 0, holesRemaining: 18,
        createdAt: isoNow(), updatedAt: isoNow(),
      };
      await db.matches.put(match);

      const results: HoleResult[] = [
        { id: 'inv-0', matchId, holeNumber: 0, winner: 'teamA', timestamp: isoNow() }, // Invalid
        { id: 'inv-1', matchId, holeNumber: 1, winner: 'teamA', timestamp: isoNow() }, // Valid
        { id: 'inv-19', matchId, holeNumber: 19, winner: 'teamA', timestamp: isoNow() }, // Invalid
        { id: 'inv-neg', matchId, holeNumber: -1, winner: 'teamA', timestamp: isoNow() }, // Invalid
      ];

      const state = calculateMatchState(match, results);
      // Only hole 1 should count
      expect(state.holesPlayed).toBe(1);
      expect(state.currentScore).toBe(1);
      trackEdgeCase('invalidHoleNumber');
    }
  }, 30000);

  // ============================================
  // PHASE 8: DATA INTEGRITY CROSS-CHECKS
  // ============================================

  it('Phase 8: validates data integrity across all tables', async () => {
    // INTEGRITY 1: All holeResults reference existing matches
    const allHR = await db.holeResults.toArray();
    const matchIdSet = new Set((await db.matches.toArray()).map(m => m.id));

    for (const hr of allHR) {
      if (!matchIdSet.has(hr.matchId)) {
        reportBug(
          `INTEG1-${hr.id}`,
          'critical',
          'data-integrity',
          `HoleResult ${hr.id} references non-existent match ${hr.matchId}`,
          { holeResultId: hr.id, matchId: hr.matchId }
        );
        stats.invariantFailures++;
      }
    }

    // INTEGRITY 2: All matches reference existing sessions
    const allMatches = await db.matches.toArray();
    const sessionIdSet = new Set((await db.sessions.toArray()).map(s => s.id));

    for (const m of allMatches) {
      if (!sessionIdSet.has(m.sessionId)) {
        reportBug(
          `INTEG2-${m.id}`,
          'critical',
          'data-integrity',
          `Match ${m.id} references non-existent session ${m.sessionId}`,
          { matchId: m.id, sessionId: m.sessionId }
        );
        stats.invariantFailures++;
      }
    }

    // INTEGRITY 3: All sessions reference existing trips
    const allSessions = await db.sessions.toArray();
    const tripIdSet = new Set((await db.trips.toArray()).map(t => t.id));

    for (const s of allSessions) {
      if (!tripIdSet.has(s.tripId)) {
        reportBug(
          `INTEG3-${s.id}`,
          'critical',
          'data-integrity',
          `Session ${s.id} references non-existent trip ${s.tripId}`,
          { sessionId: s.id, tripId: s.tripId }
        );
        stats.invariantFailures++;
      }
    }

    // INTEGRITY 4: All team members reference existing teams and players
    const allTM = await db.teamMembers.toArray();
    const teamIdSet = new Set((await db.teams.toArray()).map(t => t.id));
    const playerIdSet = new Set((await db.players.toArray()).map(p => p.id));

    for (const tm of allTM) {
      if (!teamIdSet.has(tm.teamId)) {
        reportBug(
          `INTEG4a-${tm.id}`,
          'critical',
          'data-integrity',
          `TeamMember ${tm.id} references non-existent team ${tm.teamId}`,
          { teamMemberId: tm.id, teamId: tm.teamId }
        );
        stats.invariantFailures++;
      }
      if (!playerIdSet.has(tm.playerId)) {
        reportBug(
          `INTEG4b-${tm.id}`,
          'critical',
          'data-integrity',
          `TeamMember ${tm.id} references non-existent player ${tm.playerId}`,
          { teamMemberId: tm.id, playerId: tm.playerId }
        );
        stats.invariantFailures++;
      }
    }

    // INTEGRITY 5: No duplicate hole results for the same match+hole
    const hrByMatchHole = new Map<string, number>();
    for (const hr of allHR) {
      const key = `${hr.matchId}:${hr.holeNumber}`;
      hrByMatchHole.set(key, (hrByMatchHole.get(key) || 0) + 1);
    }

    for (const [_key, count] of hrByMatchHole) {
      if (count > 1) {
        // This is not necessarily a bug if deduplication is handled at query time
        // But it's worth tracking since it can cause inconsistent UI
        trackEdgeCase('duplicateHoleInDB');
      }
    }

    // INTEGRITY 6: Hole results should have valid winner values
    const validWinners = new Set(['teamA', 'teamB', 'halved', 'none']);
    for (const hr of allHR) {
      if (!validWinners.has(hr.winner)) {
        reportBug(
          `INTEG6-${hr.id}`,
          'critical',
          'data-integrity',
          `HoleResult ${hr.id} has invalid winner: "${hr.winner}"`,
          { holeResultId: hr.id, winner: hr.winner }
        );
        stats.invariantFailures++;
      }
    }

    expect(stats.invariantFailures).toBe(0);
  }, 30000);

  // ============================================
  // PHASE 9: SCORING ENGINE STRESS TEST
  // ============================================

  it('Phase 9: stress-tests calculateMatchState with adversarial inputs', () => {
    // Test with empty arrays
    const emptyMatch: Match = {
      id: 'stress-empty', sessionId: 'x', matchOrder: 1, status: 'scheduled',
      currentHole: 1, teamAPlayerIds: [], teamBPlayerIds: [],
      teamAHandicapAllowance: 0, teamBHandicapAllowance: 0,
      result: 'notFinished', margin: 0, holesRemaining: 18,
      createdAt: isoNow(), updatedAt: isoNow(),
    };

    // Should not throw with empty results
    const state1 = calculateMatchState(emptyMatch, []);
    expect(state1.holesPlayed).toBe(0);

    // Test with all 'none' winners (should count as 0 holes played)
    const noneResults: HoleResult[] = Array.from({ length: 18 }, (_, i) => ({
      id: `none-${i}`, matchId: 'stress-empty', holeNumber: i + 1,
      winner: 'none' as HoleWinner, timestamp: isoNow(),
    }));
    const state2 = calculateMatchState(emptyMatch, noneResults);
    expect(state2.holesPlayed).toBe(0);

    // Test with exactly 18 teamA wins (18&0? No, it closes out at 10&8)
    // Let's build it incrementally
    let maxConsecutive = 0;
    for (let consecutiveWins = 1; consecutiveWins <= 18; consecutiveWins++) {
      const results: HoleResult[] = Array.from({ length: consecutiveWins }, (_, i) => ({
        id: `consec-${i}`, matchId: 'stress-empty', holeNumber: i + 1,
        winner: 'teamA' as HoleWinner, timestamp: isoNow(i),
      }));

      const state = calculateMatchState(emptyMatch, results);

      if (state.isClosedOut) {
        maxConsecutive = consecutiveWins;
        break;
      }
    }
    // After 10 consecutive wins (10 up with 8 remaining), should be closed out
    expect(maxConsecutive).toBe(10);

    // Test formatMatchScore edge cases
    expect(formatMatchScore(0, 18, false, 0)).toBe('AS'); // Not started
    expect(formatMatchScore(0, 10, false, 8)).toBe('AS'); // Mid-match AS
    expect(formatMatchScore(1, 0, true, 18)).toBe('1 UP'); // 1 UP on 18
    expect(formatMatchScore(5, 4, true, 14)).toBe('5&4'); // 5&4
    expect(formatMatchScore(-3, 2, true, 16)).toBe('3&2'); // 3&2 (team B wins)
    expect(formatMatchScore(10, 8, true, 10)).toBe('10&8'); // Blowout
  }, 10000);

  // ============================================
  // PHASE 10: FINAL REPORT
  // ============================================

  it('Phase 10: generates final simulation report', () => {
    console.log('\n');
    console.log('╔══════════════════════════════════════════════════════╗');
    console.log('║   100-USER × 100-TRIP SIMULATION REPORT             ║');
    console.log('╚══════════════════════════════════════════════════════╝');
    console.log('');
    console.log('📊 SCALE:');
    console.log(`   Trips created:        ${stats.tripsCreated}`);
    console.log(`   Players created:      ${stats.playersCreated}`);
    console.log(`   Teams created:        ${stats.teamsCreated}`);
    console.log(`   Sessions created:     ${stats.sessionsCreated}`);
    console.log(`   Matches created:      ${stats.matchesCreated}`);
    console.log(`   Holes scored:         ${stats.holesScored}`);
    console.log('');
    console.log('📈 RESULTS:');
    console.log(`   Matches completed:    ${stats.matchesCompleted}`);
    console.log(`   Early closeouts:      ${stats.matchesClosedOutEarly}`);
    console.log(`   Halved matches:       ${stats.matchesHalved}`);
    console.log(`   Won on 18th:          ${stats.matchesWonOnEighteen}`);
    console.log('');
    console.log('🔧 OPERATIONS:');
    console.log(`   Undo operations:      ${stats.undoOperations}`);
    console.log(`   Cascade deletes:      ${stats.cascadeDeletes}`);
    console.log(`   Invariant checks:     ${stats.invariantChecks}`);
    console.log(`   Invariant failures:   ${stats.invariantFailures}`);
    console.log('');
    console.log('🎯 EDGE CASES HIT:');
    for (const [name, count] of Object.entries(stats.edgeCasesHit)) {
      console.log(`   ${name}: ${count}`);
    }
    console.log('');

    if (bugs.length === 0) {
      console.log('✅ NO BUGS FOUND — All invariants passed!');
    } else {
      console.log(`🐛 BUGS FOUND: ${bugs.length}`);
      console.log('');
      for (const bug of bugs) {
        console.log(`   [${bug.severity.toUpperCase()}] ${bug.id}`);
        console.log(`   Category: ${bug.category}`);
        console.log(`   ${bug.description}`);
        console.log(`   Context: ${JSON.stringify(bug.context)}`);
        console.log('');
      }
    }

    console.log('═══════════════════════════════════════════════════════');

    // The test passes regardless — the report above is the output
    // But we DO fail if there were critical bugs
    const criticalBugs = bugs.filter(b => b.severity === 'critical');
    expect(criticalBugs).toHaveLength(0);
  });
});
