/**
 * Trip Template Service
 *
 * Generates complete trips from templates with sessions, matches, and default settings.
 * Also handles trip duplication.
 */

import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import type {
    Trip,
    Team,
    RyderCupSession,
    Match,
    Player,
    TeamMember,
} from '../types/models';
import { getTemplateById } from '@/lib/types/templates';

/**
 * Options for creating a trip from template
 */
export interface CreateFromTemplateOptions {
    tripName: string;
    startDate: Date;
    location?: string;
    captainName?: string;
    teamAName?: string;
    teamBName?: string;
}

/**
 * Options for duplicating a trip
 */
export interface DuplicateTripOptions {
    newName: string;
    newStartDate: Date;
    copyPlayers: boolean;
    copyCourses: boolean;
}

/**
 * Result of trip creation
 */
export interface TripCreationResult {
    trip: Trip;
    teams: Team[];
    sessions: RyderCupSession[];
    matches: Match[];
}

/**
 * Create a trip from a template
 */
export async function createTripFromTemplate(
    templateId: string,
    options: CreateFromTemplateOptions
): Promise<TripCreationResult> {
    const template = getTemplateById(templateId);
    if (!template) {
        throw new Error(`Template not found: ${templateId}`);
    }

    const now = new Date().toISOString();
    const tripId = uuidv4();

    // Calculate end date based on template days
    const endDate = new Date(options.startDate);
    endDate.setDate(endDate.getDate() + template.days - 1);

    // Create trip
    const trip: Trip = {
        id: tripId,
        name: options.tripName,
        startDate: options.startDate.toISOString(),
        endDate: endDate.toISOString(),
        location: options.location,
        isCaptainModeEnabled: true,
        captainName: options.captainName,
        createdAt: now,
        updatedAt: now,
    };

    // Create teams
    const teams: Team[] = [
        {
            id: uuidv4(),
            tripId,
            name: options.teamAName || 'Team USA',
            color: 'usa',
            colorHex: '#B31942',
            mode: 'ryderCup',
            createdAt: now,
        },
        {
            id: uuidv4(),
            tripId,
            name: options.teamBName || 'Team Europe',
            color: 'europe',
            colorHex: '#003399',
            mode: 'ryderCup',
            createdAt: now,
        },
    ];

    // Create sessions from template
    const sessions: RyderCupSession[] = [];
    const matches: Match[] = [];
    let sessionNumber = 1;

    for (const templateSession of template.sessions) {
        const sessionId = uuidv4();
        const sessionDate = new Date(options.startDate);
        sessionDate.setDate(sessionDate.getDate() + templateSession.dayOffset);

        const session: RyderCupSession = {
            id: sessionId,
            tripId,
            name: templateSession.name || `Session ${sessionNumber}`,
            sessionNumber,
            sessionType: templateSession.sessionType,
            scheduledDate: sessionDate.toISOString(),
            timeSlot: templateSession.timeSlot,
            pointsPerMatch: 1,
            status: 'scheduled',
            isLocked: false,
            createdAt: now,
            updatedAt: now,
        };
        sessions.push(session);

        // Create empty matches for this session
        for (let i = 0; i < templateSession.matchCount; i++) {
            const match: Match = {
                id: uuidv4(),
                sessionId,
                matchOrder: i + 1,
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
            matches.push(match);
        }

        sessionNumber++;
    }

    // Save to database
    await db.transaction('rw', [db.trips, db.teams, db.sessions, db.matches], async () => {
        await db.trips.add(trip);
        await db.teams.bulkAdd(teams);
        await db.sessions.bulkAdd(sessions);
        await db.matches.bulkAdd(matches);
    });

    return { trip, teams, sessions, matches };
}

/**
 * Duplicate an existing trip
 */
export async function duplicateTrip(
    sourceTripId: string,
    options: DuplicateTripOptions
): Promise<TripCreationResult> {
    const now = new Date().toISOString();

    // Load source trip and related data
    const sourceTrip = await db.trips.get(sourceTripId);
    if (!sourceTrip) {
        throw new Error(`Source trip not found: ${sourceTripId}`);
    }

    const sourceTeams = await db.teams.where('tripId').equals(sourceTripId).toArray();
    const sourceSessions = await db.sessions.where('tripId').equals(sourceTripId).toArray();

    // Calculate date offset
    const sourceStartDate = new Date(sourceTrip.startDate);
    const newStartDate = options.newStartDate;
    const dayOffset = Math.floor((newStartDate.getTime() - sourceStartDate.getTime()) / (1000 * 60 * 60 * 24));

    // Create new trip
    const newTripId = uuidv4();
    const sourceEndDate = new Date(sourceTrip.endDate);
    const newEndDate = new Date(sourceEndDate);
    newEndDate.setDate(newEndDate.getDate() + dayOffset);

    const newTrip: Trip = {
        id: newTripId,
        name: options.newName,
        startDate: newStartDate.toISOString(),
        endDate: newEndDate.toISOString(),
        location: sourceTrip.location,
        isCaptainModeEnabled: sourceTrip.isCaptainModeEnabled,
        captainName: sourceTrip.captainName,
        createdAt: now,
        updatedAt: now,
    };

    // Create ID mappings for related entities
    const teamIdMap = new Map<string, string>();
    const sessionIdMap = new Map<string, string>();

    // Create new teams
    const newTeams: Team[] = sourceTeams.map(team => {
        const newId = uuidv4();
        teamIdMap.set(team.id, newId);
        return {
            ...team,
            id: newId,
            tripId: newTripId,
            createdAt: now,
            updatedAt: now,
        };
    });

    // Create new sessions with adjusted dates
    const newSessions: RyderCupSession[] = sourceSessions.map(session => {
        const newId = uuidv4();
        sessionIdMap.set(session.id, newId);

        let newSessionDate: string | undefined;
        if (session.scheduledDate) {
            const sessionDate = new Date(session.scheduledDate);
            sessionDate.setDate(sessionDate.getDate() + dayOffset);
            newSessionDate = sessionDate.toISOString();
        }

        return {
            ...session,
            id: newId,
            tripId: newTripId,
            scheduledDate: newSessionDate,
            status: 'scheduled' as const,
            isLocked: false,
            createdAt: now,
            updatedAt: now,
        };
    });

    // Create new matches (empty, no scores)
    const newMatches: Match[] = [];
    for (const session of sourceSessions) {
        const sourceMatches = await db.matches.where('sessionId').equals(session.id).toArray();
        for (const match of sourceMatches) {
            newMatches.push({
                id: uuidv4(),
                sessionId: sessionIdMap.get(session.id)!,
                matchOrder: match.matchOrder,
                status: 'scheduled',
                currentHole: 0,
                teamAPlayerIds: [], // Don't copy player assignments
                teamBPlayerIds: [],
                teamAHandicapAllowance: 0,
                teamBHandicapAllowance: 0,
                result: 'notFinished',
                margin: 0,
                holesRemaining: 18,
                createdAt: now,
                updatedAt: now,
            });
        }
    }

    // Optionally copy players and team members
    let newPlayers: Player[] = [];
    let newTeamMembers: TeamMember[] = [];

    if (options.copyPlayers) {
        const sourceTeamMembers = await db.teamMembers
            .where('teamId')
            .anyOf(sourceTeams.map(t => t.id))
            .toArray();

        const playerIds = [...new Set(sourceTeamMembers.map(tm => tm.playerId))];
        const sourcePlayers = await db.players.bulkGet(playerIds);

        const playerIdMap = new Map<string, string>();
        newPlayers = sourcePlayers
            .filter((p): p is Player => p !== undefined)
            .map(player => {
                const newId = uuidv4();
                playerIdMap.set(player.id, newId);
                return {
                    ...player,
                    id: newId,
                    createdAt: now,
                    updatedAt: now,
                };
            });

        newTeamMembers = sourceTeamMembers.map(tm => ({
            id: uuidv4(),
            teamId: teamIdMap.get(tm.teamId)!,
            playerId: playerIdMap.get(tm.playerId)!,
            sortOrder: tm.sortOrder,
            isCaptain: tm.isCaptain,
            createdAt: now,
        }));
    }

    // Save to database
    await db.transaction(
        'rw',
        [db.trips, db.teams, db.sessions, db.matches, db.players, db.teamMembers],
        async () => {
            await db.trips.add(newTrip);
            await db.teams.bulkAdd(newTeams);
            await db.sessions.bulkAdd(newSessions);
            await db.matches.bulkAdd(newMatches);
            if (newPlayers.length > 0) {
                await db.players.bulkAdd(newPlayers);
            }
            if (newTeamMembers.length > 0) {
                await db.teamMembers.bulkAdd(newTeamMembers);
            }
        }
    );

    return { trip: newTrip, teams: newTeams, sessions: newSessions, matches: newMatches };
}

/**
 * Preview what a template will create (without saving)
 */
export function previewTemplateTrip(
    templateId: string,
    options: CreateFromTemplateOptions
): {
    days: number;
    sessions: Array<{ name: string; type: string; matches: number; date: string }>;
    totalMatches: number;
    totalPoints: number;
} {
    const template = getTemplateById(templateId);
    if (!template) {
        throw new Error(`Template not found: ${templateId}`);
    }

    const sessions = template.sessions.map(session => {
        const sessionDate = new Date(options.startDate);
        sessionDate.setDate(sessionDate.getDate() + session.dayOffset);

        return {
            name: session.name || `${session.sessionType} - ${session.timeSlot}`,
            type: session.sessionType,
            matches: session.matchCount,
            date: sessionDate.toLocaleDateString(),
        };
    });

    const totalMatches = sessions.reduce((sum, s) => sum + s.matches, 0);

    return {
        days: template.days,
        sessions,
        totalMatches,
        totalPoints: totalMatches, // 1 point per match
    };
}
