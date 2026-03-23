/**
 * Seeder Configuration & Runner
 *
 * Provides deterministic seeding for test data creation.
 * Supports SMALL (quick tests) and LARGE (stress tests) datasets.
 */

import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// CONFIGURATION
// ============================================================================

export type SeedSize = 'small' | 'large';

export interface SeederConfig {
    size: SeedSize;
    seed?: string; // For deterministic randomness
    tripCount: number;
    playersPerTrip: number;
    sessionsPerTrip: number;
    matchesPerSession: number;
    scoresPerMatch: number;
}

export const SEED_CONFIGS: Record<SeedSize, Omit<SeederConfig, 'seed'>> = {
    small: {
        size: 'small',
        tripCount: 1,
        playersPerTrip: 12,
        sessionsPerTrip: 2,
        matchesPerSession: 4,
        scoresPerMatch: 9, // 9 holes of scoring
    },
    large: {
        size: 'large',
        tripCount: 3,
        playersPerTrip: 48,
        sessionsPerTrip: 6,
        matchesPerSession: 8,
        scoresPerMatch: 18, // Full 18 holes
    },
};

// ============================================================================
// SEEDED RANDOM NUMBER GENERATOR
// ============================================================================

export function createSeededRNG(seed: string): () => number {
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
        const char = seed.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }

    return function () {
        hash = Math.imul(hash ^ (hash >>> 15), hash | 1);
        hash = hash ^ (hash + Math.imul(hash ^ (hash >>> 7), hash | 61));
        return ((hash ^ (hash >>> 14)) >>> 0) / 4294967296;
    };
}

// ============================================================================
// DATA GENERATORS
// ============================================================================

const FIRST_NAMES = [
    'John', 'Mike', 'Dave', 'Chris', 'Tom', 'Steve', 'James', 'Robert',
    'William', 'Richard', 'Joseph', 'Charles', 'Daniel', 'Matthew', 'Anthony',
    'Mark', 'Donald', 'Paul', 'Steven', 'Andrew', 'Joshua', 'Kenneth', 'Kevin',
    'Brian', 'George', 'Timothy', 'Ronald', 'Edward', 'Jason', 'Jeffrey',
    'Ryan', 'Jacob', 'Gary', 'Nicholas', 'Eric', 'Jonathan', 'Stephen', 'Larry',
    'Justin', 'Scott', 'Brandon', 'Benjamin', 'Samuel', 'Raymond', 'Gregory',
    'Frank', 'Alexander', 'Patrick', 'Jack', 'Dennis',
];

const LAST_NAMES = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Davis', 'Wilson', 'Miller',
    'Taylor', 'Anderson', 'Thomas', 'Jackson', 'White', 'Harris', 'Martin',
    'Thompson', 'Garcia', 'Martinez', 'Robinson', 'Clark', 'Rodriguez',
    'Lewis', 'Lee', 'Walker', 'Hall', 'Allen', 'Young', 'King', 'Wright',
    'Scott', 'Green', 'Baker', 'Adams', 'Nelson', 'Hill', 'Ramirez', 'Campbell',
    'Mitchell', 'Roberts', 'Carter', 'Phillips', 'Evans', 'Turner', 'Torres',
    'Parker', 'Collins', 'Edwards', 'Stewart', 'Flores', 'Morris', 'Murphy',
];

const COURSE_NAMES = [
    'Pebble Beach Golf Links',
    'Augusta National Golf Club',
    'Pinehurst No. 2',
    'TPC Sawgrass',
    'Whistling Straits',
    'Torrey Pines (South)',
    'Bethpage Black',
    'Shinnecock Hills',
    'Oakmont Country Club',
    'Merion Golf Club',
];

export interface GeneratedPlayer {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    handicapIndex: number;
    ghin: string;
    team?: 'usa' | 'europe';
}

export interface GeneratedTrip {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    location: string;
    players: GeneratedPlayer[];
    sessions: GeneratedSession[];
}

export interface GeneratedSession {
    id: string;
    name: string;
    sessionNumber: number;
    sessionType: 'foursomes' | 'fourball' | 'singles';
    matches: GeneratedMatch[];
}

export interface GeneratedMatch {
    id: string;
    sessionId: string;
    teamAPlayerIds: string[];
    teamBPlayerIds: string[];
    status: 'scheduled' | 'inProgress' | 'completed';
    scores?: GeneratedScore[];
}

export interface GeneratedScore {
    holeNumber: number;
    winner: 'teamA' | 'teamB' | 'halved';
    teamAResult?: number;
    teamBResult?: number;
}

/**
 * Generate deterministic test data
 */
export function generateTestData(config: SeederConfig): GeneratedTrip[] {
    const rng = createSeededRNG(config.seed || 'default-seed');
    const trips: GeneratedTrip[] = [];

    for (let t = 0; t < config.tripCount; t++) {
        const tripId = uuidv4();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() + 1 + (t * 7));

        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 2);

        // Generate players
        const players: GeneratedPlayer[] = [];
        const usedNames = new Set<string>();

        for (let p = 0; p < config.playersPerTrip; p++) {
            let firstName: string, lastName: string, fullName: string;

            do {
                firstName = FIRST_NAMES[Math.floor(rng() * FIRST_NAMES.length)];
                lastName = LAST_NAMES[Math.floor(rng() * LAST_NAMES.length)];
                fullName = `${firstName} ${lastName}`;
            } while (usedNames.has(fullName));

            usedNames.add(fullName);

            players.push({
                id: uuidv4(),
                firstName,
                lastName,
                email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@test.com`,
                handicapIndex: Math.round((rng() * 20 + 2) * 10) / 10,
                ghin: Math.floor(rng() * 9000000 + 1000000).toString(),
                team: p < config.playersPerTrip / 2 ? 'usa' : 'europe',
            });
        }

        // Generate sessions
        const sessions: GeneratedSession[] = [];
        const sessionTypes: Array<'foursomes' | 'fourball' | 'singles'> = ['foursomes', 'fourball', 'singles'];

        for (let s = 0; s < config.sessionsPerTrip; s++) {
            const sessionId = uuidv4();
            const sessionType = sessionTypes[s % sessionTypes.length];

            // Generate matches
            const matches: GeneratedMatch[] = [];
            const teamAPlayers = players.filter(p => p.team === 'usa');
            const teamBPlayers = players.filter(p => p.team === 'europe');

            for (let m = 0; m < config.matchesPerSession; m++) {
                const matchId = uuidv4();
                const isTeamFormat = sessionType !== 'singles';
                const playersPerTeam = isTeamFormat ? 2 : 1;

                const teamAIds = teamAPlayers
                    .slice(m * playersPerTeam, (m + 1) * playersPerTeam)
                    .map(p => p.id);
                const teamBIds = teamBPlayers
                    .slice(m * playersPerTeam, (m + 1) * playersPerTeam)
                    .map(p => p.id);

                // Determine match status
                const statusRoll = rng();
                const status: 'scheduled' | 'inProgress' | 'completed' =
                    statusRoll < 0.3 ? 'scheduled' :
                        statusRoll < 0.5 ? 'inProgress' : 'completed';

                // Generate scores if match has started
                const scores: GeneratedScore[] = [];
                if (status !== 'scheduled') {
                    const holesPlayed = status === 'completed'
                        ? config.scoresPerMatch
                        : Math.floor(rng() * config.scoresPerMatch);

                    for (let h = 1; h <= holesPlayed; h++) {
                        const winnerRoll = rng();
                        scores.push({
                            holeNumber: h,
                            winner: winnerRoll < 0.4 ? 'teamA' : winnerRoll < 0.8 ? 'teamB' : 'halved',
                        });
                    }
                }

                matches.push({
                    id: matchId,
                    sessionId,
                    teamAPlayerIds: teamAIds,
                    teamBPlayerIds: teamBIds,
                    status,
                    scores: scores.length > 0 ? scores : undefined,
                });
            }

            sessions.push({
                id: sessionId,
                name: `Day ${Math.floor(s / 2) + 1} ${s % 2 === 0 ? 'AM' : 'PM'} ${sessionType.charAt(0).toUpperCase() + sessionType.slice(1)}`,
                sessionNumber: s + 1,
                sessionType,
                matches,
            });
        }

        trips.push({
            id: tripId,
            name: `Test Cup ${new Date().getFullYear()} - Trip ${t + 1}`,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            location: COURSE_NAMES[t % COURSE_NAMES.length],
            players,
            sessions,
        });
    }

    return trips;
}

/**
 * Convert generated data to IndexedDB seed format
 */
export function toIndexedDBFormat(trips: GeneratedTrip[]): {
    trips: unknown[];
    players: unknown[];
    teams: unknown[];
    teamMembers: unknown[];
    sessions: unknown[];
    matches: unknown[];
} {
    const now = new Date().toISOString();
    const result = {
        trips: [] as unknown[],
        players: [] as unknown[],
        teams: [] as unknown[],
        teamMembers: [] as unknown[],
        sessions: [] as unknown[],
        matches: [] as unknown[],
    };

    for (const trip of trips) {
        // Trip
        result.trips.push({
            id: trip.id,
            name: trip.name,
            startDate: trip.startDate,
            endDate: trip.endDate,
            location: trip.location,
            isCaptainModeEnabled: true,
            createdAt: now,
            updatedAt: now,
        });

        // Teams
        const teamAId = uuidv4();
        const teamBId = uuidv4();

        result.teams.push(
            {
                id: teamAId,
                tripId: trip.id,
                name: 'Team USA',
                color: 'usa',
                mode: 'ryderCup',
                createdAt: now,
            },
            {
                id: teamBId,
                tripId: trip.id,
                name: 'Team Europe',
                color: 'europe',
                mode: 'ryderCup',
                createdAt: now,
            }
        );

        // Players & Team Members
        for (const player of trip.players) {
            result.players.push({
                ...player,
                tripId: trip.id,
                createdAt: now,
                updatedAt: now,
            });

            result.teamMembers.push({
                id: uuidv4(),
                teamId: player.team === 'usa' ? teamAId : teamBId,
                playerId: player.id,
                sortOrder: 0,
                isCaptain: false,
                createdAt: now,
            });
        }

        // Sessions & Matches
        for (const session of trip.sessions) {
            const sessionStatuses = session.matches.map((match) => match.status);
            const sessionStatus =
                sessionStatuses.some((status) => status === 'inProgress')
                    ? 'inProgress'
                    : sessionStatuses.length > 0 && sessionStatuses.every((status) => status === 'completed')
                        ? 'completed'
                        : 'scheduled';
            const sessionDate = new Date(trip.startDate);
            sessionDate.setDate(sessionDate.getDate() + Math.floor((session.sessionNumber - 1) / 2));

            result.sessions.push({
                id: session.id,
                tripId: trip.id,
                name: session.name,
                sessionNumber: session.sessionNumber,
                sessionType: session.sessionType,
                scheduledDate: sessionDate.toISOString(),
                timeSlot: session.sessionNumber % 2 === 1 ? 'AM' : 'PM',
                pointsPerMatch: 1,
                status: sessionStatus,
                isLocked: false,
                createdAt: now,
                updatedAt: now,
            });

            for (const [matchIndex, match] of session.matches.entries()) {
                const holesPlayed = match.scores?.length ?? 0;
                result.matches.push({
                    id: match.id,
                    sessionId: match.sessionId,
                    tripId: trip.id,
                    matchOrder: matchIndex + 1,
                    teamAPlayerIds: match.teamAPlayerIds,
                    teamBPlayerIds: match.teamBPlayerIds,
                    status: match.status,
                    currentHole: Math.min(18, Math.max(1, holesPlayed + 1)),
                    teamAHandicapAllowance: 0,
                    teamBHandicapAllowance: 0,
                    result: match.status === 'completed' ? 'halved' : 'notFinished',
                    margin: 0,
                    holesRemaining: Math.max(0, 18 - holesPlayed),
                    createdAt: now,
                    updatedAt: now,
                });
            }
        }
    }

    return result;
}

/**
 * Get statistics about generated data
 */
export function getDataStats(trips: GeneratedTrip[]): {
    totalTrips: number;
    totalPlayers: number;
    totalSessions: number;
    totalMatches: number;
    completedMatches: number;
    inProgressMatches: number;
    scheduledMatches: number;
    totalScores: number;
} {
    let totalPlayers = 0;
    let totalSessions = 0;
    let totalMatches = 0;
    let completedMatches = 0;
    let inProgressMatches = 0;
    let scheduledMatches = 0;
    let totalScores = 0;

    for (const trip of trips) {
        totalPlayers += trip.players.length;
        totalSessions += trip.sessions.length;

        for (const session of trip.sessions) {
            totalMatches += session.matches.length;

            for (const match of session.matches) {
                if (match.status === 'completed') completedMatches++;
                else if (match.status === 'inProgress') inProgressMatches++;
                else scheduledMatches++;

                totalScores += match.scores?.length || 0;
            }
        }
    }

    return {
        totalTrips: trips.length,
        totalPlayers,
        totalSessions,
        totalMatches,
        completedMatches,
        inProgressMatches,
        scheduledMatches,
        totalScores,
    };
}
