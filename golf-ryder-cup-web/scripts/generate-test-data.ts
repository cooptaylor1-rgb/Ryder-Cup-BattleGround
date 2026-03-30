/**
 * Test Data Generator for QA Simulation
 *
 * Creates varied trip scenarios for comprehensive testing:
 * - Different trip sizes (4-24 players)
 * - Various session types (foursomes, fourball, singles)
 * - Edge cases (tied scores, partial completions, overtime)
 * - Different handicap ranges
 */


// Types matching the app's models
export interface GeneratedTrip {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    location: string;
    notes: string;
    isCaptainModeEnabled: boolean;
    captainName: string;
    playerCount: number;
    sessionCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface GeneratedPlayer {
    id: string;
    firstName: string;
    lastName: string;
    handicapIndex: number;
    ghin?: string;
    email?: string;
    createdAt: string;
    updatedAt: string;
}

export interface GeneratedTeam {
    id: string;
    tripId: string;
    name: string;
    color: string;
    colorHex: string;
    icon: string;
    mode: string;
    createdAt: string;
    updatedAt: string;
}

// Random data pools
const FIRST_NAMES = [
    'John', 'Mike', 'Dave', 'Chris', 'Tom', 'Steve', 'James', 'Robert', 'William', 'Richard',
    'Joseph', 'Charles', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Paul', 'Andrew', 'Brian', 'Kevin',
    'Jason', 'Jeff', 'Ryan', 'Jacob', 'Gary', 'Eric', 'Nicholas', 'Jonathan', 'Larry', 'Justin',
];

const LAST_NAMES = [
    'Smith', 'Johnson', 'Williams', 'Brown', 'Davis', 'Wilson', 'Miller', 'Taylor', 'Anderson',
    'Thomas', 'Jackson', 'White', 'Harris', 'Martin', 'Thompson', 'Garcia', 'Martinez', 'Robinson',
    'Clark', 'Rodriguez', 'Lewis', 'Lee', 'Walker', 'Hall', 'Allen', 'Young', 'King', 'Wright',
];

const LOCATIONS = [
    'Pebble Beach, CA', 'Scottsdale, AZ', 'Myrtle Beach, SC', 'Pinehurst, NC',
    'Palm Springs, CA', 'Orlando, FL', 'Las Vegas, NV', 'San Diego, CA',
    'Austin, TX', 'Charleston, SC', 'Hilton Head, SC', 'Naples, FL',
];

const TRIP_NAMES = [
    'Annual Buddies Trip', 'The Masters Challenge', 'Ryder Cup Rivalry',
    'The Boys Classic', 'Fairway Friends', 'Divot Destroyers',
    'The Weekend Warriors', 'Sunday Slicers', 'Golf Legends Tour',
];

const TEAM_A_NAMES = ['Team USA', 'Team Blue', 'Team Alpha', 'Team Eagles', 'Team Birdies'];
const TEAM_B_NAMES = ['Team Europe', 'Team Red', 'Team Omega', 'Team Bogeys', 'Team Pars'];

const TEAM_A_COLORS = [
    { color: 'usa', colorHex: '#1565C0', icon: '🇺🇸' },
    { color: 'blue', colorHex: '#2563EB', icon: '🔵' },
    { color: 'navy', colorHex: '#1E3A5F', icon: '⚓' },
];

const TEAM_B_COLORS = [
    { color: 'europe', colorHex: '#C62828', icon: '🇪🇺' },
    { color: 'red', colorHex: '#DC2626', icon: '🔴' },
    { color: 'crimson', colorHex: '#991B1B', icon: '🎯' },
];

// Utility functions
function randomElement<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomHandicap(): number {
    // Distribution: more players in 8-18 range
    const distributions = [
        { range: [0, 5], weight: 10 },
        { range: [5, 10], weight: 25 },
        { range: [10, 15], weight: 30 },
        { range: [15, 20], weight: 25 },
        { range: [20, 30], weight: 10 },
    ];

    const totalWeight = distributions.reduce((sum, d) => sum + d.weight, 0);
    let random = Math.random() * totalWeight;

    for (const dist of distributions) {
        random -= dist.weight;
        if (random <= 0) {
            return parseFloat((Math.random() * (dist.range[1] - dist.range[0]) + dist.range[0]).toFixed(1));
        }
    }
    return 12.0; // fallback
}

function generateGhin(): string {
    return String(randomInt(1000000, 9999999));
}

export interface TripScenario {
    type: 'small' | 'medium' | 'large' | 'edge';
    playerCount: number;
    sessionCount: number;
    description: string;
    hasPartialScores: boolean;
    hasTiedMatches: boolean;
    hasCompletedSessions: boolean;
}

// Scenario templates for varied testing
const SCENARIOS: TripScenario[] = [
    // Small trips (4-8 players)
    { type: 'small', playerCount: 4, sessionCount: 1, description: 'Minimal 2v2', hasPartialScores: false, hasTiedMatches: false, hasCompletedSessions: false },
    { type: 'small', playerCount: 6, sessionCount: 2, description: '3v3 weekend', hasPartialScores: true, hasTiedMatches: false, hasCompletedSessions: false },
    { type: 'small', playerCount: 8, sessionCount: 2, description: '4v4 basic', hasPartialScores: false, hasTiedMatches: true, hasCompletedSessions: true },

    // Medium trips (10-16 players)
    { type: 'medium', playerCount: 10, sessionCount: 3, description: '5v5 extended', hasPartialScores: true, hasTiedMatches: false, hasCompletedSessions: false },
    { type: 'medium', playerCount: 12, sessionCount: 3, description: 'Classic 6v6', hasPartialScores: false, hasTiedMatches: false, hasCompletedSessions: true },
    { type: 'medium', playerCount: 14, sessionCount: 4, description: '7v7 multi-day', hasPartialScores: true, hasTiedMatches: true, hasCompletedSessions: false },
    { type: 'medium', playerCount: 16, sessionCount: 4, description: '8v8 full weekend', hasPartialScores: false, hasTiedMatches: false, hasCompletedSessions: true },

    // Large trips (18-24 players)
    { type: 'large', playerCount: 18, sessionCount: 5, description: '9v9 mega trip', hasPartialScores: true, hasTiedMatches: true, hasCompletedSessions: false },
    { type: 'large', playerCount: 20, sessionCount: 5, description: '10v10 challenge', hasPartialScores: false, hasTiedMatches: false, hasCompletedSessions: true },
    { type: 'large', playerCount: 24, sessionCount: 6, description: '12v12 max capacity', hasPartialScores: true, hasTiedMatches: true, hasCompletedSessions: true },

    // Edge cases
    { type: 'edge', playerCount: 4, sessionCount: 1, description: 'All same handicap', hasPartialScores: false, hasTiedMatches: true, hasCompletedSessions: false },
    { type: 'edge', playerCount: 8, sessionCount: 1, description: 'Extreme handicap spread', hasPartialScores: false, hasTiedMatches: false, hasCompletedSessions: false },
    { type: 'edge', playerCount: 12, sessionCount: 1, description: 'All matches tied mid-round', hasPartialScores: true, hasTiedMatches: true, hasCompletedSessions: false },
    { type: 'edge', playerCount: 6, sessionCount: 3, description: 'Captain mode disabled', hasPartialScores: false, hasTiedMatches: false, hasCompletedSessions: false },
];

export interface GeneratedTestData {
    trip: GeneratedTrip;
    players: GeneratedPlayer[];
    teamA: GeneratedTeam;
    teamB: GeneratedTeam;
    scenario: TripScenario;
}

/**
 * Generate a single trip with full data
 */
export function generateTrip(scenario: TripScenario, index: number): GeneratedTestData {
    const now = new Date().toISOString();
    const tripId = crypto.randomUUID();

    // Generate trip dates
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + randomInt(-30, 30));
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + Math.ceil(scenario.sessionCount / 2));

    // Generate trip
    const trip: GeneratedTrip = {
        id: tripId,
        name: `${randomElement(TRIP_NAMES)} ${2024 + Math.floor(index / 20)}`,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        location: randomElement(LOCATIONS),
        notes: `Test trip #${index + 1}: ${scenario.description}`,
        isCaptainModeEnabled: scenario.description !== 'Captain mode disabled',
        captainName: '',
        playerCount: scenario.playerCount,
        sessionCount: scenario.sessionCount,
        createdAt: now,
        updatedAt: now,
    };

    // Generate players
    const usedNames = new Set<string>();
    const players: GeneratedPlayer[] = [];

    for (let i = 0; i < scenario.playerCount; i++) {
        let firstName: string, lastName: string, fullName: string;
        do {
            firstName = randomElement(FIRST_NAMES);
            lastName = randomElement(LAST_NAMES);
            fullName = `${firstName} ${lastName}`;
        } while (usedNames.has(fullName));
        usedNames.add(fullName);

        let handicap: number;
        if (scenario.description === 'All same handicap') {
            handicap = 12.0;
        } else if (scenario.description === 'Extreme handicap spread') {
            handicap = i < scenario.playerCount / 2 ? randomInt(0, 5) : randomInt(25, 36);
        } else {
            handicap = randomHandicap();
        }

        players.push({
            id: crypto.randomUUID(),
            firstName,
            lastName,
            handicapIndex: handicap,
            ghin: generateGhin(),
            email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@test.com`,
            createdAt: now,
            updatedAt: now,
        });
    }

    // Set captain name from first player
    trip.captainName = `${players[0].firstName} ${players[0].lastName}`;

    // Generate teams
    const teamAStyle = randomElement(TEAM_A_COLORS);
    const teamBStyle = randomElement(TEAM_B_COLORS);

    const teamA: GeneratedTeam = {
        id: crypto.randomUUID(),
        tripId,
        name: randomElement(TEAM_A_NAMES),
        ...teamAStyle,
        mode: 'ryderCup',
        createdAt: now,
        updatedAt: now,
    };

    const teamB: GeneratedTeam = {
        id: crypto.randomUUID(),
        tripId,
        name: randomElement(TEAM_B_NAMES),
        ...teamBStyle,
        mode: 'ryderCup',
        createdAt: now,
        updatedAt: now,
    };

    return { trip, players, teamA, teamB, scenario };
}

/**
 * Generate test data for N trips with varied scenarios
 */
export function generateTestSuite(count: number): GeneratedTestData[] {
    const trips: GeneratedTestData[] = [];

    for (let i = 0; i < count; i++) {
        // Cycle through scenarios with some randomness
        const scenarioIndex = i % SCENARIOS.length;
        const scenario = SCENARIOS[scenarioIndex];
        trips.push(generateTrip(scenario, i));
    }

    return trips;
}

// Export for direct execution
if (typeof window === 'undefined' && require.main === module) {
    const testData = generateTestSuite(100);
    console.log(`Generated ${testData.length} test trips`);
    console.log(JSON.stringify(testData, null, 2));
}
