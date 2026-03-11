import { db } from '@/lib/db';
import type { Trip } from '@/lib/types/models';

export interface AdminDatabaseStats {
    trips: number;
    players: number;
    sessions: number;
    matches: number;
    holeResults: number;
    teams: number;
}

export interface AdminSyncMetrics {
    total: number;
    pending: number;
    failed: number;
    oldestPending: number | null;
    averageRetry: number;
    lastAttempt: number | null;
}

export interface OrphanStats {
    orphanedMatches: number;
    orphanedHoleResults: number;
    orphanedTeamMembers: number;
}

interface OrphanRecordIds {
    orphanedMatchIds: string[];
    orphanedHoleResultIds: string[];
    orphanedTeamMemberIds: string[];
}

export const EMPTY_ADMIN_DATABASE_STATS: AdminDatabaseStats = {
    trips: 0,
    players: 0,
    sessions: 0,
    matches: 0,
    holeResults: 0,
    teams: 0,
};

export const EMPTY_SYNC_METRICS: AdminSyncMetrics = {
    total: 0,
    pending: 0,
    failed: 0,
    oldestPending: null,
    averageRetry: 0,
    lastAttempt: null,
};

export async function loadAdminTrips(): Promise<Trip[]> {
    const trips = await db.trips.toArray();
    return trips.sort(
        (a, b) =>
            new Date(b.updatedAt || b.createdAt).getTime() -
            new Date(a.updatedAt || a.createdAt).getTime()
    );
}

export async function loadAdminDatabaseStats(): Promise<AdminDatabaseStats> {
    const [trips, players, sessions, matches, holeResults, teams] = await Promise.all([
        db.trips.count(),
        db.players.count(),
        db.sessions.count(),
        db.matches.count(),
        db.holeResults.count(),
        db.teams.count(),
    ]);

    return { trips, players, sessions, matches, holeResults, teams };
}

export async function loadAdminSyncMetrics(): Promise<AdminSyncMetrics> {
    const items = await db.tripSyncQueue.toArray();
    const pending = items.filter((item) => item.status === 'pending' || item.status === 'syncing');
    const failed = items.filter((item) => item.status === 'failed');
    const oldestPending =
        pending.length > 0
            ? Math.min(...pending.map((item) => new Date(item.createdAt).getTime()))
            : null;
    const averageRetry =
        items.length > 0
            ? Math.round(items.reduce((sum, item) => sum + item.retryCount, 0) / items.length)
            : 0;
    const lastAttempt = items
        .map((item) => item.lastAttemptAt)
        .filter(Boolean)
        .map((value) => new Date(value as string).getTime())
        .sort((a, b) => b - a)[0];

    return {
        total: items.length,
        pending: pending.length,
        failed: failed.length,
        oldestPending,
        averageRetry,
        lastAttempt: lastAttempt || null,
    };
}

export async function scanAdminOrphans(): Promise<OrphanStats> {
    const { orphanedMatchIds, orphanedHoleResultIds, orphanedTeamMemberIds } =
        await getOrphanedRecordIds();

    return {
        orphanedMatches: orphanedMatchIds.length,
        orphanedHoleResults: orphanedHoleResultIds.length,
        orphanedTeamMembers: orphanedTeamMemberIds.length,
    };
}

export async function cleanAdminOrphans(): Promise<OrphanStats> {
    const { orphanedMatchIds, orphanedHoleResultIds, orphanedTeamMemberIds } =
        await getOrphanedRecordIds();

    await db.transaction('rw', [db.matches, db.holeResults, db.teamMembers], async () => {
        if (orphanedMatchIds.length > 0) {
            await db.matches.bulkDelete(orphanedMatchIds);
        }
        if (orphanedHoleResultIds.length > 0) {
            await db.holeResults.bulkDelete(orphanedHoleResultIds);
        }
        if (orphanedTeamMemberIds.length > 0) {
            await db.teamMembers.bulkDelete(orphanedTeamMemberIds);
        }
    });

    return {
        orphanedMatches: orphanedMatchIds.length,
        orphanedHoleResults: orphanedHoleResultIds.length,
        orphanedTeamMembers: orphanedTeamMemberIds.length,
    };
}

async function getOrphanedRecordIds(): Promise<OrphanRecordIds> {
    const [allSessions, allMatches, allHoleResults, allTeams, allTeamMembers] = await Promise.all([
        db.sessions.toArray(),
        db.matches.toArray(),
        db.holeResults.toArray(),
        db.teams.toArray(),
        db.teamMembers.toArray(),
    ]);

    const validSessionIds = new Set(allSessions.map((session) => session.id));
    const validMatches = allMatches.filter((match) => validSessionIds.has(match.sessionId));
    const validMatchIds = new Set(validMatches.map((match) => match.id));
    const orphanedMatchIds = allMatches
        .filter((match) => !validSessionIds.has(match.sessionId))
        .map((match) => match.id);
    const orphanedHoleResultIds = allHoleResults
        .filter((holeResult) => !validMatchIds.has(holeResult.matchId))
        .map((holeResult) => holeResult.id);

    const validTeamIds = new Set(allTeams.map((team) => team.id));
    const orphanedTeamMemberIds = allTeamMembers
        .filter((teamMember) => !validTeamIds.has(teamMember.teamId))
        .map((teamMember) => teamMember.id);

    return {
        orphanedMatchIds,
        orphanedHoleResultIds,
        orphanedTeamMemberIds,
    };
}
