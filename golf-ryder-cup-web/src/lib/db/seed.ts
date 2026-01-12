/**
 * Seed Data Service
 *
 * Creates demo data for development and testing.
 * Includes a realistic Ryder Cup trip scenario.
 */

import { db } from './index';
import { v4 as uuidv4 } from 'uuid';
import {
    Trip,
    Player,
    Team,
    TeamMember,
    RyderCupSession,
    Match,
    Course,
    TeeSet,
    TeamMode,
    SessionType,
    MatchStatus,
    MatchResultType,
} from '@/lib/types/models';

// ============================================
// DEMO PLAYERS
// ============================================

const DEMO_PLAYERS: Omit<Player, 'id' | 'createdAt' | 'updatedAt'>[] = [
    // Team USA
    { firstName: 'John', lastName: 'Smith', handicapIndex: 8.2, ghin: '1234567' },
    { firstName: 'Mike', lastName: 'Johnson', handicapIndex: 12.5, ghin: '2345678' },
    { firstName: 'Dave', lastName: 'Williams', handicapIndex: 6.8, ghin: '3456789' },
    { firstName: 'Chris', lastName: 'Brown', handicapIndex: 14.2, ghin: '4567890' },
    { firstName: 'Tom', lastName: 'Davis', handicapIndex: 10.1, ghin: '5678901' },
    { firstName: 'Steve', lastName: 'Wilson', handicapIndex: 7.4, ghin: '6789012' },
    // Team Europe
    { firstName: 'James', lastName: 'Miller', handicapIndex: 9.3, ghin: '7890123' },
    { firstName: 'Robert', lastName: 'Taylor', handicapIndex: 11.7, ghin: '8901234' },
    { firstName: 'William', lastName: 'Anderson', handicapIndex: 5.9, ghin: '9012345' },
    { firstName: 'Richard', lastName: 'Thomas', handicapIndex: 13.8, ghin: '0123456' },
    { firstName: 'Joseph', lastName: 'Jackson', handicapIndex: 8.6, ghin: '1234560' },
    { firstName: 'Charles', lastName: 'White', handicapIndex: 10.9, ghin: '2345601' },
];

// ============================================
// DEMO COURSE
// ============================================

const DEMO_COURSE = {
    name: 'Pebble Beach Golf Links',
    location: 'Pebble Beach, CA',
};

const DEMO_TEE_SET = {
    name: 'Blue Tees',
    color: 'Blue',
    rating: 74.8,
    slope: 143,
    par: 72,
    // Hole handicaps (1 = hardest, 18 = easiest)
    holeHandicaps: [7, 11, 3, 13, 9, 1, 15, 5, 17, 8, 16, 10, 4, 12, 6, 18, 2, 14],
    // Hole pars
    holePars: [4, 5, 4, 4, 3, 5, 3, 4, 4, 4, 4, 3, 4, 5, 4, 4, 3, 5],
    // Yardages
    yardages: [381, 516, 404, 327, 195, 523, 107, 428, 505, 446, 390, 202, 445, 573, 397, 403, 178, 543],
    totalYardage: 6828,
};

// ============================================
// SEED FUNCTIONS
// ============================================

/**
 * Check if demo data already exists
 */
export async function hasDemoData(): Promise<boolean> {
    const tripCount = await db.trips.count();
    return tripCount > 0;
}

/**
 * Clear all demo data
 */
export async function clearDemoData(): Promise<void> {
    await db.transaction('rw', db.tables, async () => {
        for (const table of db.tables) {
            await table.clear();
        }
    });
}

/**
 * Seed the database with demo data
 */
export async function seedDemoData(): Promise<string> {
    const now = new Date().toISOString();

    // Create trip dates (3 days starting tomorrow)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const endDate = new Date(tomorrow);
    endDate.setDate(endDate.getDate() + 2);

    // Generate IDs
    const tripId = uuidv4();
    const courseId = uuidv4();
    const teeSetId = uuidv4();
    const teamAId = uuidv4();
    const teamBId = uuidv4();

    // Create course
    const course: Course = {
        id: courseId,
        name: DEMO_COURSE.name,
        location: DEMO_COURSE.location,
        createdAt: now,
        updatedAt: now,
    };

    // Create tee set
    const teeSet: TeeSet = {
        id: teeSetId,
        courseId,
        name: DEMO_TEE_SET.name,
        color: DEMO_TEE_SET.color,
        rating: DEMO_TEE_SET.rating,
        slope: DEMO_TEE_SET.slope,
        par: DEMO_TEE_SET.par,
        holeHandicaps: DEMO_TEE_SET.holeHandicaps,
        holePars: DEMO_TEE_SET.holePars,
        yardages: DEMO_TEE_SET.yardages,
        totalYardage: DEMO_TEE_SET.totalYardage,
        createdAt: now,
        updatedAt: now,
    };

    // Create players
    const players: Player[] = DEMO_PLAYERS.map((p, index) => ({
        id: uuidv4(),
        ...p,
        createdAt: now,
        updatedAt: now,
    }));

    // Create trip
    const trip: Trip = {
        id: tripId,
        name: 'Buddies Ryder Cup 2026',
        startDate: tomorrow.toISOString(),
        endDate: endDate.toISOString(),
        location: 'Pebble Beach, CA',
        notes: "The boys are back for another epic showdown! Winner takes the Golden Putter trophy. Losers buy dinner at Stillwater Bar & Grill.",
        isCaptainModeEnabled: true,
        captainName: 'John Smith',
        createdAt: now,
        updatedAt: now,
    };

    // Create teams
    const teamUSA: Team = {
        id: teamAId,
        tripId,
        name: 'Team USA',
        color: 'usa',
        colorHex: '#1565C0',
        icon: '🇺🇸',
        mode: 'ryderCup',
        createdAt: now,
        updatedAt: now,
    };

    const teamEurope: Team = {
        id: teamBId,
        tripId,
        name: 'Team Europe',
        color: 'europe',
        colorHex: '#C62828',
        icon: '🇪🇺',
        mode: 'ryderCup',
        createdAt: now,
        updatedAt: now,
    };

    // Create team members (first 6 players = USA, next 6 = Europe)
    const teamMembers: TeamMember[] = players.map((player, index) => ({
        id: uuidv4(),
        teamId: index < 6 ? teamAId : teamBId,
        playerId: player.id,
        sortOrder: index % 6,
        isCaptain: index === 0 || index === 6, // First player of each team is captain
        createdAt: now,
    }));

    // Create sessions
    const sessions: RyderCupSession[] = [
        {
            id: uuidv4(),
            tripId,
            name: 'Day 1 AM - Foursomes',
            sessionNumber: 1,
            sessionType: 'foursomes',
            scheduledDate: tomorrow.toISOString(),
            timeSlot: 'AM',
            pointsPerMatch: 1,
            status: 'scheduled',
            isLocked: false,
            createdAt: now,
            updatedAt: now,
        },
        {
            id: uuidv4(),
            tripId,
            name: 'Day 1 PM - Fourball',
            sessionNumber: 2,
            sessionType: 'fourball',
            scheduledDate: tomorrow.toISOString(),
            timeSlot: 'PM',
            pointsPerMatch: 1,
            status: 'scheduled',
            isLocked: false,
            createdAt: now,
            updatedAt: now,
        },
        {
            id: uuidv4(),
            tripId,
            name: 'Day 2 - Singles',
            sessionNumber: 3,
            sessionType: 'singles',
            scheduledDate: new Date(tomorrow.getTime() + 24 * 60 * 60 * 1000).toISOString(),
            timeSlot: 'AM',
            pointsPerMatch: 1,
            status: 'scheduled',
            isLocked: false,
            createdAt: now,
            updatedAt: now,
        },
    ];

    // Create matches for first session (Foursomes - 3 matches)
    const foursomesSession = sessions[0];
    const usaPlayers = players.slice(0, 6);
    const europePlayers = players.slice(6, 12);

    const matches: Match[] = [
        // Match 1
        {
            id: uuidv4(),
            sessionId: foursomesSession.id,
            courseId,
            teeSetId,
            matchOrder: 1,
            status: 'scheduled',
            currentHole: 1,
            teamAPlayerIds: [usaPlayers[0].id, usaPlayers[1].id],
            teamBPlayerIds: [europePlayers[0].id, europePlayers[1].id],
            teamAHandicapAllowance: 2,
            teamBHandicapAllowance: 0,
            result: 'notFinished',
            margin: 0,
            holesRemaining: 18,
            createdAt: now,
            updatedAt: now,
        },
        // Match 2
        {
            id: uuidv4(),
            sessionId: foursomesSession.id,
            courseId,
            teeSetId,
            matchOrder: 2,
            status: 'scheduled',
            currentHole: 1,
            teamAPlayerIds: [usaPlayers[2].id, usaPlayers[3].id],
            teamBPlayerIds: [europePlayers[2].id, europePlayers[3].id],
            teamAHandicapAllowance: 0,
            teamBHandicapAllowance: 3,
            result: 'notFinished',
            margin: 0,
            holesRemaining: 18,
            createdAt: now,
            updatedAt: now,
        },
        // Match 3
        {
            id: uuidv4(),
            sessionId: foursomesSession.id,
            courseId,
            teeSetId,
            matchOrder: 3,
            status: 'scheduled',
            currentHole: 1,
            teamAPlayerIds: [usaPlayers[4].id, usaPlayers[5].id],
            teamBPlayerIds: [europePlayers[4].id, europePlayers[5].id],
            teamAHandicapAllowance: 1,
            teamBHandicapAllowance: 1,
            result: 'notFinished',
            margin: 0,
            holesRemaining: 18,
            createdAt: now,
            updatedAt: now,
        },
    ];

    // Save everything to database
    await db.transaction('rw',
        [db.courses, db.teeSets, db.trips, db.players, db.teams, db.teamMembers, db.sessions, db.matches],
        async () => {
            await db.courses.add(course);
            await db.teeSets.add(teeSet);
            await db.trips.add(trip);
            await db.players.bulkAdd(players);
            await db.teams.bulkAdd([teamUSA, teamEurope]);
            await db.teamMembers.bulkAdd(teamMembers);
            await db.sessions.bulkAdd(sessions);
            await db.matches.bulkAdd(matches);
        }
    );

    return tripId;
}

/**
 * Seed with demo data if database is empty
 */
export async function seedIfEmpty(): Promise<string | null> {
    const hasData = await hasDemoData();
    if (!hasData) {
        return await seedDemoData();
    }
    return null;
}
