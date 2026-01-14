/**
 * Export/Import Service
 *
 * Handles trip backup, export, and import functionality.
 * All exports are JSON-based for portability and future compatibility.
 */

import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import type {
    Trip,
    Player,
    Team,
    TeamMember,
    RyderCupSession,
    Match,
    HoleResult,
    Course,
    TeeSet,
} from '../types/models';
import type { TripExport, ImportResult } from '../types/export';

const APP_VERSION = '1.2.0';
const SCHEMA_VERSION = 1;

/**
 * Export a trip to a JSON object
 */
export async function exportTrip(
    tripId: string,
    options?: { includeAuditLog?: boolean }
): Promise<TripExport> {
    // Load trip
    const trip = await db.trips.get(tripId);
    if (!trip) {
        throw new Error(`Trip not found: ${tripId}`);
    }

    // Load related data
    const teams = await db.teams.where('tripId').equals(tripId).toArray();
    const teamIds = teams.map((t) => t.id);

    const teamMembers = await db.teamMembers
        .where('teamId')
        .anyOf(teamIds)
        .toArray();

    const playerIds = [...new Set(teamMembers.map((tm) => tm.playerId))];
    const players = (await db.players.bulkGet(playerIds)).filter(
        (p): p is Player => p !== undefined
    );

    const sessions = await db.sessions.where('tripId').equals(tripId).toArray();
    const sessionIds = sessions.map((s) => s.id);

    const matches = await db.matches
        .where('sessionId')
        .anyOf(sessionIds)
        .toArray();
    const matchIds = matches.map((m) => m.id);

    const holeResults = await db.holeResults
        .where('matchId')
        .anyOf(matchIds)
        .toArray();

    // Get unique course IDs from matches
    const courseIds = [...new Set(matches.map((m) => m.courseId).filter(Boolean))] as string[];
    const courses = (await db.courses.bulkGet(courseIds)).filter(
        (c): c is Course => c !== undefined
    );

    const teeSetIds = [...new Set(matches.map((m) => m.teeSetId).filter(Boolean))] as string[];
    const teeSets = (await db.teeSets.bulkGet(teeSetIds)).filter(
        (t): t is TeeSet => t !== undefined
    );

    // Optionally include audit log
    let auditLog;
    if (options?.includeAuditLog) {
        auditLog = await db.auditLog.where('tripId').equals(tripId).toArray();
    }

    return {
        schemaVersion: SCHEMA_VERSION,
        exportedAt: new Date().toISOString(),
        appVersion: APP_VERSION,
        trip,
        players,
        teams,
        teamMembers,
        sessions,
        matches,
        holeResults,
        courses,
        teeSets,
        auditLog,
    };
}

/**
 * Export trip to a downloadable JSON file
 */
export async function exportTripToFile(tripId: string): Promise<void> {
    const exportData = await exportTrip(tripId, { includeAuditLog: true });
    const filename = `${exportData.trip.name.replace(/[^a-z0-9]/gi, '-')}_${new Date().toISOString().split('T')[0]
        }.json`;

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Validate an export file before importing
 */
export function validateExport(data: unknown): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!data || typeof data !== 'object') {
        errors.push('Invalid export format: not an object');
        return { valid: false, errors };
    }

    const exp = data as Partial<TripExport>;

    if (!exp.schemaVersion || typeof exp.schemaVersion !== 'number') {
        errors.push('Missing or invalid schema version');
    } else if (exp.schemaVersion > SCHEMA_VERSION) {
        errors.push(
            `Export schema version ${exp.schemaVersion} is newer than supported version ${SCHEMA_VERSION}`
        );
    }

    if (!exp.trip || typeof exp.trip !== 'object') {
        errors.push('Missing trip data');
    } else {
        if (!exp.trip.id) errors.push('Trip missing ID');
        if (!exp.trip.name) errors.push('Trip missing name');
    }

    if (!Array.isArray(exp.players)) {
        errors.push('Missing or invalid players array');
    }

    if (!Array.isArray(exp.teams)) {
        errors.push('Missing or invalid teams array');
    }

    if (!Array.isArray(exp.sessions)) {
        errors.push('Missing or invalid sessions array');
    }

    if (!Array.isArray(exp.matches)) {
        errors.push('Missing or invalid matches array');
    }

    return { valid: errors.length === 0, errors };
}

/**
 * Import a trip from an export file
 * Creates a new trip with new IDs to avoid collisions
 */
export async function importTrip(exportData: TripExport): Promise<ImportResult> {
    const validation = validateExport(exportData);
    if (!validation.valid) {
        return {
            success: false,
            tripId: '',
            tripName: '',
            stats: { players: 0, teams: 0, sessions: 0, matches: 0, holeResults: 0, courses: 0 },
            errors: validation.errors,
        };
    }

    const now = new Date().toISOString();
    const errors: string[] = [];

    // Generate new IDs and create mappings
    const idMap = {
        trip: new Map<string, string>(),
        player: new Map<string, string>(),
        team: new Map<string, string>(),
        session: new Map<string, string>(),
        match: new Map<string, string>(),
        course: new Map<string, string>(),
        teeSet: new Map<string, string>(),
    };

    // New trip ID
    const newTripId = uuidv4();
    idMap.trip.set(exportData.trip.id, newTripId);

    // Map player IDs
    exportData.players.forEach((p) => {
        idMap.player.set(p.id, uuidv4());
    });

    // Map team IDs
    exportData.teams.forEach((t) => {
        idMap.team.set(t.id, uuidv4());
    });

    // Map session IDs
    exportData.sessions.forEach((s) => {
        idMap.session.set(s.id, uuidv4());
    });

    // Map match IDs
    exportData.matches.forEach((m) => {
        idMap.match.set(m.id, uuidv4());
    });

    // Map course IDs
    exportData.courses.forEach((c) => {
        idMap.course.set(c.id, uuidv4());
    });

    // Map tee set IDs
    exportData.teeSets.forEach((t) => {
        idMap.teeSet.set(t.id, uuidv4());
    });

    // Create new entities with remapped IDs
    const newTrip: Trip = {
        ...exportData.trip,
        id: newTripId,
        name: `${exportData.trip.name} (Imported)`,
        createdAt: now,
        updatedAt: now,
    };

    const newPlayers: Player[] = exportData.players.map((p) => ({
        ...p,
        id: idMap.player.get(p.id)!,
        createdAt: now,
        updatedAt: now,
    }));

    const newTeams: Team[] = exportData.teams.map((t) => ({
        ...t,
        id: idMap.team.get(t.id)!,
        tripId: newTripId,
        createdAt: now,
        updatedAt: now,
    }));

    const newTeamMembers: TeamMember[] = exportData.teamMembers.map((tm) => ({
        ...tm,
        id: uuidv4(),
        teamId: idMap.team.get(tm.teamId)!,
        playerId: idMap.player.get(tm.playerId)!,
        createdAt: now,
    }));

    const newSessions: RyderCupSession[] = exportData.sessions.map((s) => ({
        ...s,
        id: idMap.session.get(s.id)!,
        tripId: newTripId,
        createdAt: now,
        updatedAt: now,
    }));

    const newMatches: Match[] = exportData.matches.map((m) => {
        const newMatchId = idMap.match.get(m.id);
        const newSessionId = idMap.session.get(m.sessionId);
        if (!newMatchId || !newSessionId) {
            throw new Error(`Missing ID mapping for match ${m.id}`);
        }
        return {
            ...m,
            id: newMatchId,
            sessionId: newSessionId,
            courseId: m.courseId ? idMap.course.get(m.courseId) : undefined,
            teeSetId: m.teeSetId ? idMap.teeSet.get(m.teeSetId) : undefined,
            teamAPlayerIds: m.teamAPlayerIds.map((id) => idMap.player.get(id) || id),
            teamBPlayerIds: m.teamBPlayerIds.map((id) => idMap.player.get(id) || id),
            createdAt: now,
            updatedAt: now,
        };
    });

    const newHoleResults: HoleResult[] = exportData.holeResults.map((hr) => {
        const newMatchId = idMap.match.get(hr.matchId);
        if (!newMatchId) {
            throw new Error(`Missing ID mapping for hole result matchId ${hr.matchId}`);
        }
        return {
            ...hr,
            id: uuidv4(),
            matchId: newMatchId,
            scoredBy: hr.scoredBy ? idMap.player.get(hr.scoredBy) : undefined,
            timestamp: now,
        };
    });

    const newCourses: Course[] = exportData.courses.map((c) => {
        const newCourseId = idMap.course.get(c.id);
        if (!newCourseId) {
            throw new Error(`Missing ID mapping for course ${c.id}`);
        }
        return {
            ...c,
            id: newCourseId,
            createdAt: now,
            updatedAt: now,
        };
    });

    const newTeeSets: TeeSet[] = exportData.teeSets.map((t) => {
        const newTeeSetId = idMap.teeSet.get(t.id);
        const newCourseId = idMap.course.get(t.courseId);
        if (!newTeeSetId || !newCourseId) {
            throw new Error(`Missing ID mapping for tee set ${t.id}`);
        }
        return {
            ...t,
            id: newTeeSetId,
            courseId: newCourseId,
            createdAt: now,
            updatedAt: now,
        };
    });

    // Save everything in a transaction
    try {
        await db.transaction(
            'rw',
            [
                db.trips,
                db.players,
                db.teams,
                db.teamMembers,
                db.sessions,
                db.matches,
                db.holeResults,
                db.courses,
                db.teeSets,
            ],
            async () => {
                await db.trips.add(newTrip);
                if (newPlayers.length > 0) await db.players.bulkAdd(newPlayers);
                if (newTeams.length > 0) await db.teams.bulkAdd(newTeams);
                if (newTeamMembers.length > 0) await db.teamMembers.bulkAdd(newTeamMembers);
                if (newSessions.length > 0) await db.sessions.bulkAdd(newSessions);
                if (newMatches.length > 0) await db.matches.bulkAdd(newMatches);
                if (newHoleResults.length > 0) await db.holeResults.bulkAdd(newHoleResults);
                if (newCourses.length > 0) await db.courses.bulkAdd(newCourses);
                if (newTeeSets.length > 0) await db.teeSets.bulkAdd(newTeeSets);
            }
        );
    } catch (error) {
        errors.push(`Database error: ${error}`);
        return {
            success: false,
            tripId: '',
            tripName: '',
            stats: { players: 0, teams: 0, sessions: 0, matches: 0, holeResults: 0, courses: 0 },
            errors,
        };
    }

    return {
        success: true,
        tripId: newTripId,
        tripName: newTrip.name,
        stats: {
            players: newPlayers.length,
            teams: newTeams.length,
            sessions: newSessions.length,
            matches: newMatches.length,
            holeResults: newHoleResults.length,
            courses: newCourses.length,
        },
        errors: [],
    };
}

/**
 * Import trip from a file input
 */
export async function importTripFromFile(file: File): Promise<ImportResult> {
    return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const content = e.target?.result as string;
                const exportData = JSON.parse(content) as TripExport;
                const result = await importTrip(exportData);
                resolve(result);
            } catch (error) {
                resolve({
                    success: false,
                    tripId: '',
                    tripName: '',
                    stats: { players: 0, teams: 0, sessions: 0, matches: 0, holeResults: 0, courses: 0 },
                    errors: [`Failed to parse file: ${error}`],
                });
            }
        };

        reader.onerror = () => {
            resolve({
                success: false,
                tripId: '',
                tripName: '',
                stats: { players: 0, teams: 0, sessions: 0, matches: 0, holeResults: 0, courses: 0 },
                errors: ['Failed to read file'],
            });
        };

        reader.readAsText(file);
    });
}

/**
 * Generate a shareable text summary of a trip
 */
export async function generateTripSummary(tripId: string): Promise<string> {
    const trip = await db.trips.get(tripId);
    if (!trip) throw new Error('Trip not found');

    const teams = await db.teams.where('tripId').equals(tripId).toArray();
    const sessions = await db.sessions.where('tripId').equals(tripId).toArray();
    const sessionIds = sessions.map((s) => s.id);
    const matches = await db.matches.where('sessionId').anyOf(sessionIds).toArray();
    const matchIds = matches.map((m) => m.id);
    const holeResults = await db.holeResults.where('matchId').anyOf(matchIds).toArray();

    // Calculate team points
    let teamAPoints = 0;
    let teamBPoints = 0;
    let completedMatches = 0;

    for (const match of matches) {
        if (match.status === 'completed') {
            completedMatches++;
            const matchResults = holeResults.filter((hr) => hr.matchId === match.id);
            let teamAWins = 0;
            let teamBWins = 0;

            matchResults.forEach((hr) => {
                if (hr.winner === 'teamA') teamAWins++;
                else if (hr.winner === 'teamB') teamBWins++;
            });

            if (teamAWins > teamBWins) teamAPoints += 1;
            else if (teamBWins > teamAWins) teamBPoints += 1;
            else {
                teamAPoints += 0.5;
                teamBPoints += 0.5;
            }
        }
    }

    const teamA = teams.find((t) => t.color === 'usa');
    const teamB = teams.find((t) => t.color === 'europe');

    const lines = [
        `🏆 ${trip.name}`,
        `📅 ${new Date(trip.startDate).toLocaleDateString()} - ${new Date(trip.endDate).toLocaleDateString()}`,
        trip.location ? `📍 ${trip.location}` : '',
        '',
        '📊 STANDINGS',
        `${teamA?.name || 'Team USA'}: ${teamAPoints}`,
        `${teamB?.name || 'Team Europe'}: ${teamBPoints}`,
        '',
        `✅ ${completedMatches} of ${matches.length} matches complete`,
        '',
        '#RyderCup #GolfTrip',
    ].filter(Boolean);

    return lines.join('\n');
}

/**
 * Copy trip summary to clipboard
 */
export async function shareTripSummary(tripId: string): Promise<void> {
    const summary = await generateTripSummary(tripId);
    await navigator.clipboard.writeText(summary);
}
