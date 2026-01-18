/**
 * Golf Ryder Cup App - Dexie Database Schema
 *
 * IndexedDB wrapper providing:
 * - Type-safe tables matching domain models
 * - Event log for scoring actions (append-only)
 * - Reactive hooks with useLiveQuery
 * - Offline-first persistence
 */

import Dexie, { type Table } from 'dexie';
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
    ScheduleDay,
    ScheduleItem,
    AuditLogEntry,
    BanterPost,
    SideBet,
    SyncMetadata,
} from '@/lib/types/models';
import type { ScoringEvent } from '@/lib/types/events';
import type { CourseProfile, TeeSetProfile } from '@/lib/types/courseProfile';
import type { PlayerTripStat, TripAward } from '@/lib/types/tripStats';
import type {
    ChatMessage,
    ChatThread,
    TrashTalk,
    Photo,
    PhotoAlbum,
    Poll,
    HeadToHeadRecord,
    TripArchive,
} from '@/lib/types/social';
import type {
    WolfGame,
    VegasGame,
    HammerGame,
    NassauEnhanced,
    SettlementTransaction,
} from '@/lib/types/sideGames';

/**
 * Course Library Sync Queue Entry
 * Tracks pending cloud syncs with retry support
 */
export interface CourseSyncQueueEntry {
    queueId?: number; // Auto-increment
    courseProfileId: string;
    source: 'user' | 'ocr' | 'api' | 'import';
    status: 'pending' | 'syncing' | 'failed' | 'completed';
    retryCount: number;
    lastError?: string;
    createdAt: string;
    lastAttemptAt?: string;
    completedAt?: string;
}

/**
 * Golf Trip Database
 *
 * Extends Dexie with typed tables for all domain models.
 */
export class GolfTripDB extends Dexie {
    // Core entities
    trips!: Table<Trip>;
    players!: Table<Player>;
    teams!: Table<Team>;
    teamMembers!: Table<TeamMember>;

    // Tournament entities
    sessions!: Table<RyderCupSession>;
    matches!: Table<Match>;
    holeResults!: Table<HoleResult>;

    // Course entities
    courses!: Table<Course>;
    teeSets!: Table<TeeSet>;

    // Course Library (v1.2)
    courseProfiles!: Table<CourseProfile>;
    teeSetProfiles!: Table<TeeSetProfile>;

    // Schedule entities
    scheduleDays!: Table<ScheduleDay>;
    scheduleItems!: Table<ScheduleItem>;

    // Trip Stats (v1.3)
    tripStats!: Table<PlayerTripStat>;
    tripAwards!: Table<TripAward>;

    // Audit & social
    auditLog!: Table<AuditLogEntry>;
    banterPosts!: Table<BanterPost>;

    // Side bets
    sideBets!: Table<SideBet>;

    // Extended side games (v7)
    wolfGames!: Table<WolfGame>;
    vegasGames!: Table<VegasGame>;
    hammerGames!: Table<HammerGame>;
    nassauGames!: Table<NassauEnhanced>;
    settlements!: Table<SettlementTransaction>;

    // Social features (v7)
    chatMessages!: Table<ChatMessage>;
    chatThreads!: Table<ChatThread>;
    trashTalks!: Table<TrashTalk>;
    photos!: Table<Photo>;
    photoAlbums!: Table<PhotoAlbum>;
    polls!: Table<Poll>;
    headToHeadRecords!: Table<HeadToHeadRecord>;
    tripArchives!: Table<TripArchive>;

    // Event sourcing for scoring (append-only)
    scoringEvents!: Table<ScoringEvent>;

    // Sync metadata (Phase 2)
    syncMeta!: Table<SyncMetadata>;

    // Course Library Sync Queue (v8)
    courseSyncQueue!: Table<CourseSyncQueueEntry>;

    constructor() {
        super('GolfTripDB');

        // Schema version 1
        this.version(1).stores({
            // Primary key + indexed fields
            // Format: 'primaryKey, index1, index2, [compound+index]'

            trips: 'id, name, startDate',

            players: 'id, name, handicapIndex',

            teams: 'id, tripId, name',

            teamMembers: 'id, teamId, playerId, [teamId+playerId]',

            sessions: 'id, tripId, scheduledDate, [tripId+scheduledDate]',

            matches: 'id, sessionId, status, [sessionId+matchOrder]',

            holeResults: 'id, matchId, holeNumber, [matchId+holeNumber]',

            courses: 'id, name',

            teeSets: 'id, courseId, [courseId+name]',

            scheduleDays: 'id, tripId, date, [tripId+date]',

            scheduleItems: 'id, scheduleDayId, startTime',

            auditLog: 'id, tripId, timestamp, actionType, [tripId+timestamp]',

            banterPosts: 'id, tripId, timestamp, [tripId+timestamp]',

            // Event log - auto-increment localId for ordering
            scoringEvents: '++localId, id, matchId, timestamp, synced, [matchId+timestamp]',

            // Sync metadata (key-value store)
            syncMeta: 'key',
        });

        // Schema version 2 - Course Library
        this.version(2).stores({
            // Course Library tables (v1.2)
            courseProfiles: 'id, name',
            teeSetProfiles: 'id, courseProfileId, [courseProfileId+name]',
        });

        // Schema version 3 - Side Bets
        this.version(3).stores({
            // Side bets table
            sideBets: 'id, tripId, status, [tripId+status]',
        });

        // Schema version 4 - Trip Stats
        this.version(4).stores({
            // Trip stats and awards tables
            tripStats: 'id, tripId, playerId, sessionId, statType, [tripId+playerId], [tripId+statType], [playerId+statType]',
            tripAwards: 'id, tripId, awardType, winnerId, [tripId+awardType]',
        });

        // Schema version 5 - Add tripId index to players
        this.version(5).stores({
            players: 'id, tripId, name, handicapIndex',
        });

        // Schema version 6 - Add compound index for efficient sync queries
        this.version(6).stores({
            // Add [matchId+synced] compound index for sync queue queries
            scoringEvents:
                '++localId, id, matchId, timestamp, synced, [matchId+timestamp], [matchId+synced]',
        });

        // Schema version 7 - Extended side games and social features
        this.version(7).stores({
            // Extended side games
            wolfGames: 'id, tripId, sessionId, status, [tripId+status]',
            vegasGames: 'id, tripId, sessionId, status, [tripId+status]',
            hammerGames: 'id, tripId, sessionId, status, [tripId+status]',
            nassauGames: 'id, tripId, sessionId, status, [tripId+status]',
            settlements: 'id, tripId, fromPlayerId, toPlayerId, status, [tripId+status]',

            // Social features - Chat
            chatMessages: 'id, tripId, threadId, authorId, timestamp, [tripId+timestamp], [threadId+timestamp]',
            chatThreads: 'id, tripId, createdAt, [tripId+createdAt]',

            // Social features - Trash Talk
            trashTalks: 'id, tripId, authorId, targetId, timestamp, [tripId+timestamp]',

            // Social features - Photos
            photos: 'id, tripId, albumId, uploaderId, uploadedAt, [tripId+uploadedAt], [albumId+uploadedAt]',
            photoAlbums: 'id, tripId, createdAt, [tripId+createdAt]',

            // Social features - Polls
            polls: 'id, tripId, createdById, status, expiresAt, [tripId+status], [tripId+expiresAt]',

            // Social features - Nemesis tracking
            headToHeadRecords: 'id, tripId, player1Id, player2Id, [tripId+player1Id], [player1Id+player2Id]',

            // Trip archive
            tripArchives: 'id, tripId, archivedAt',
        });

        // Schema version 8 - Course Library Sync Queue
        this.version(8).stores({
            // Offline sync queue for course library
            courseSyncQueue: '++queueId, courseProfileId, status, retryCount, createdAt, [status+retryCount]',
        });
    }
}

/**
 * Singleton database instance
 */
export const db = new GolfTripDB();

// ============================================
// HOOKS FOR REACTIVE QUERIES
// ============================================

/**
 * Re-export useLiveQuery from dexie-react-hooks for convenience
 */
export { useLiveQuery } from 'dexie-react-hooks';

// ============================================
// DATABASE HELPERS
// ============================================

/**
 * Clear all data from the database (use with caution!)
 */
export async function clearAllData(): Promise<void> {
    await db.transaction('rw', db.tables, async () => {
        for (const table of db.tables) {
            await table.clear();
        }
    });
}

/**
 * Export all data as JSON (for backup)
 */
export async function exportAllData(): Promise<Record<string, unknown[]>> {
    const data: Record<string, unknown[]> = {};

    await db.transaction('r', db.tables, async () => {
        for (const table of db.tables) {
            data[table.name] = await table.toArray();
        }
    });

    return data;
}

/**
 * Import data from JSON backup
 */
export async function importData(data: Record<string, unknown[]>): Promise<void> {
    await db.transaction('rw', db.tables, async () => {
        for (const [tableName, records] of Object.entries(data)) {
            const table = db.table(tableName);
            if (table && records.length > 0) {
                await table.bulkPut(records);
            }
        }
    });
}

/**
 * Get database storage estimate
 */
export async function getStorageEstimate(): Promise<{
    usage: number;
    quota: number;
    usagePercent: number;
}> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        const usage = estimate.usage ?? 0;
        const quota = estimate.quota ?? 0;
        return {
            usage,
            quota,
            usagePercent: quota > 0 ? (usage / quota) * 100 : 0,
        };
    }
    return { usage: 0, quota: 0, usagePercent: 0 };
}

// ============================================
// QUERY HELPERS
// ============================================

/**
 * Get a trip with all related data
 */
export async function getTripWithRelations(tripId: string) {
    const trip = await db.trips.get(tripId);
    if (!trip) return null;

    const [teams, sessions, scheduleDays, auditLog, banterPosts] = await Promise.all([
        db.teams.where('tripId').equals(tripId).toArray(),
        db.sessions.where('tripId').equals(tripId).sortBy('scheduledDate'),
        db.scheduleDays.where('tripId').equals(tripId).sortBy('date'),
        db.auditLog.where('tripId').equals(tripId).reverse().sortBy('timestamp'),
        db.banterPosts.where('tripId').equals(tripId).reverse().sortBy('timestamp'),
    ]);

    return {
        ...trip,
        teams,
        sessions,
        scheduleDays,
        auditLog,
        banterPosts,
    };
}

/**
 * Get a session with all matches
 */
export async function getSessionWithMatches(sessionId: string) {
    const session = await db.sessions.get(sessionId);
    if (!session) return null;

    const matches = await db.matches
        .where('sessionId')
        .equals(sessionId)
        .sortBy('matchOrder');

    return {
        ...session,
        matches,
    };
}

/**
 * Get a match with all hole results
 */
export async function getMatchWithResults(matchId: string) {
    const match = await db.matches.get(matchId);
    if (!match) return null;

    const holeResults = await db.holeResults
        .where('matchId')
        .equals(matchId)
        .sortBy('holeNumber');

    return {
        ...match,
        holeResults,
    };
}

/**
 * Get team members with player data
 */
export async function getTeamWithPlayers(teamId: string) {
    const team = await db.teams.get(teamId);
    if (!team) return null;

    const members = await db.teamMembers
        .where('teamId')
        .equals(teamId)
        .sortBy('sortOrder');

    const playerIds = members.map(m => m.playerId);
    const players = await db.players
        .where('id')
        .anyOf(playerIds)
        .toArray();

    // Map players to members
    const playersMap = new Map(players.map(p => [p.id, p]));
    const membersWithPlayers = members.map(m => ({
        ...m,
        player: playersMap.get(m.playerId),
    }));

    return {
        ...team,
        members: membersWithPlayers,
    };
}

/**
 * Get all scoring events for a match
 */
export async function getScoringEventsForMatch(matchId: string) {
    return db.scoringEvents
        .where('matchId')
        .equals(matchId)
        .sortBy('timestamp');
}

/**
 * Get unsynced scoring events (for Phase 2)
 */
export async function getUnsyncedEvents() {
    return db.scoringEvents
        .where('synced')
        .equals(0)
        .toArray();
}
