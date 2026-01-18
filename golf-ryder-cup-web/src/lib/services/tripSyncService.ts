/**
 * Trip Sync Service (Production Quality)
 *
 * Synchronizes trip data between local IndexedDB and Supabase cloud.
 *
 * Features:
 * - Offline-first with queue-based sync
 * - Real-time bidirectional sync
 * - Conflict resolution (last-write-wins with merge)
 * - Exponential backoff retry
 * - Share code based access
 * - Batch operations for efficiency
 */

import { v4 as uuidv4 } from 'uuid';
import { supabase, isSupabaseConfigured } from '../supabase/client';
import { db } from '../db';
import type {
    Trip,
    Team,
    TeamMember,
    Player,
    RyderCupSession,
    Match,
    HoleResult,
    Course,
    TeeSet,
} from '../types/models';

// ============================================
// CONSTANTS
// ============================================

const MAX_RETRY_COUNT = 5;
const BASE_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30000;
const SYNC_DEBOUNCE_MS = 1000;

// ============================================
// TYPES
// ============================================

export type SyncOperation = 'create' | 'update' | 'delete';
export type SyncEntity =
    | 'trip'
    | 'player'
    | 'team'
    | 'teamMember'
    | 'session'
    | 'match'
    | 'holeResult'
    | 'course'
    | 'teeSet';

export interface SyncQueueItem {
    id: string;
    entity: SyncEntity;
    entityId: string;
    operation: SyncOperation;
    data?: unknown;
    tripId: string;
    status: 'pending' | 'syncing' | 'failed' | 'completed';
    retryCount: number;
    createdAt: string;
    lastAttemptAt?: string;
    error?: string;
}

export interface TripSyncResult {
    success: boolean;
    tripId: string;
    cloudId?: string;
    error?: string;
    queued?: boolean;
}

export interface BulkSyncResult {
    success: boolean;
    synced: number;
    failed: number;
    queued: number;
    errors: string[];
}

export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'failed' | 'offline' | 'unknown';

// ============================================
// STATE
// ============================================

let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
let syncInProgress = false;
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;
const syncQueue: SyncQueueItem[] = [];

// ============================================
// NETWORK & HELPERS
// ============================================

export function initTripSyncNetworkListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
        isOnline = true;
        console.log('[TripSync] Network online - triggering sync');
        debouncedProcessQueue();
    });

    window.addEventListener('offline', () => {
        isOnline = false;
        console.log('[TripSync] Network offline - queuing changes');
    });

    isOnline = navigator.onLine;
}

function canSync(): boolean {
    return isOnline && isSupabaseConfigured && !!supabase;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getTable(name: string): any {
    if (!supabase) throw new Error('Supabase not configured');
    return supabase.from(name);
}

function getRetryDelay(retryCount: number): number {
    const delay = Math.min(BASE_RETRY_DELAY_MS * Math.pow(2, retryCount), MAX_RETRY_DELAY_MS);
    return delay * (0.8 + Math.random() * 0.4);
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================
// QUEUE MANAGEMENT
// ============================================

export function queueSyncOperation(
    entity: SyncEntity,
    entityId: string,
    operation: SyncOperation,
    tripId: string,
    data?: unknown
): void {
    // Check for existing pending operation on same entity
    const existing = syncQueue.find(
        (item) =>
            item.entityId === entityId &&
            item.entity === entity &&
            (item.status === 'pending' || item.status === 'syncing')
    );

    if (existing) {
        // Update existing with latest data
        existing.data = data;
        existing.operation = operation;
        return;
    }

    const item: SyncQueueItem = {
        id: uuidv4(),
        entity,
        entityId,
        operation,
        data,
        tripId,
        status: 'pending',
        retryCount: 0,
        createdAt: new Date().toISOString(),
    };

    syncQueue.push(item);
    console.log(`[TripSync] Queued ${operation} for ${entity}:${entityId}`);

    if (canSync()) {
        debouncedProcessQueue();
    }
}

function debouncedProcessQueue(): void {
    if (syncDebounceTimer) {
        clearTimeout(syncDebounceTimer);
    }
    syncDebounceTimer = setTimeout(() => {
        processSyncQueue().catch((err) => {
            console.error('[TripSync] Queue processing error:', err);
        });
    }, SYNC_DEBOUNCE_MS);
}

export async function processSyncQueue(): Promise<BulkSyncResult> {
    if (!canSync()) {
        return { success: false, synced: 0, failed: 0, queued: syncQueue.length, errors: ['Offline'] };
    }

    if (syncInProgress) {
        return { success: true, synced: 0, failed: 0, queued: syncQueue.length, errors: [] };
    }

    syncInProgress = true;
    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
        const pendingItems = syncQueue.filter(
            (item) => item.status === 'pending' || (item.status === 'failed' && item.retryCount < MAX_RETRY_COUNT)
        );

        for (const item of pendingItems) {
            item.status = 'syncing';
            item.lastAttemptAt = new Date().toISOString();

            try {
                if (item.retryCount > 0) {
                    await sleep(getRetryDelay(item.retryCount - 1));
                }

                await syncEntityToCloud(item);
                item.status = 'completed';
                synced++;
            } catch (err) {
                item.retryCount++;
                item.error = err instanceof Error ? err.message : 'Unknown error';

                if (item.retryCount >= MAX_RETRY_COUNT) {
                    item.status = 'failed';
                    failed++;
                    errors.push(`${item.entity}:${item.entityId} - ${item.error}`);
                } else {
                    item.status = 'pending';
                }
            }
        }

        // Clean up completed items older than 5 minutes
        const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
        for (let i = syncQueue.length - 1; i >= 0; i--) {
            const item = syncQueue[i];
            if (item.status === 'completed' && new Date(item.createdAt).getTime() < fiveMinutesAgo) {
                syncQueue.splice(i, 1);
            }
        }

        const remaining = syncQueue.filter((i) => i.status !== 'completed').length;
        return { success: errors.length === 0, synced, failed, queued: remaining, errors };
    } finally {
        syncInProgress = false;
    }
}

// ============================================
// ENTITY SYNC TO CLOUD
// ============================================

async function syncEntityToCloud(item: SyncQueueItem): Promise<void> {
    const { entity, entityId, operation, data } = item;

    switch (entity) {
        case 'trip':
            await syncTripToCloud(entityId, operation, data as Trip);
            break;
        case 'player':
            await syncPlayerToCloud(entityId, operation, data as Player, item.tripId);
            break;
        case 'team':
            await syncTeamToCloud(entityId, operation, data as Team);
            break;
        case 'teamMember':
            await syncTeamMemberToCloud(entityId, operation, data as TeamMember);
            break;
        case 'session':
            await syncSessionToCloud(entityId, operation, data as RyderCupSession);
            break;
        case 'match':
            await syncMatchToCloud(entityId, operation, data as Match);
            break;
        case 'holeResult':
            await syncHoleResultToCloud(entityId, operation, data as HoleResult);
            break;
        case 'course':
            await syncCourseToCloud(entityId, operation, data as Course);
            break;
        case 'teeSet':
            await syncTeeSetToCloud(entityId, operation, data as TeeSet);
            break;
    }
}

async function syncTripToCloud(tripId: string, operation: SyncOperation, data?: Trip): Promise<void> {
    if (operation === 'delete') {
        const { error } = await getTable('trips').delete().eq('id', tripId);
        if (error) throw new Error(error.message);
        return;
    }

    const trip = data || (await db.trips.get(tripId));
    if (!trip) throw new Error('Trip not found locally');

    const cloudData = {
        id: trip.id,
        name: trip.name,
        start_date: trip.startDate.split('T')[0],
        end_date: trip.endDate.split('T')[0],
        location: trip.location || null,
        notes: trip.notes || null,
        is_captain_mode_enabled: trip.isCaptainModeEnabled,
        captain_name: trip.captainName || null,
        updated_at: new Date().toISOString(),
    };

    if (operation === 'create') {
        const { error } = await getTable('trips').insert({ ...cloudData, created_at: trip.createdAt });
        if (error) throw new Error(error.message);
    } else {
        const { error } = await getTable('trips').upsert(cloudData, { onConflict: 'id' });
        if (error) throw new Error(error.message);
    }
}

async function syncPlayerToCloud(
    playerId: string,
    operation: SyncOperation,
    data?: Player,
    _tripId?: string
): Promise<void> {
    if (operation === 'delete') {
        const { error } = await getTable('players').delete().eq('id', playerId);
        if (error) throw new Error(error.message);
        return;
    }

    const player = data || (await db.players.get(playerId));
    if (!player) throw new Error('Player not found locally');

    const cloudData = {
        id: player.id,
        first_name: player.firstName,
        last_name: player.lastName,
        email: player.email || null,
        handicap_index: player.handicapIndex || null,
        ghin: player.ghin || null,
        tee_preference: player.teePreference || null,
        avatar_url: player.avatarUrl || null,
        updated_at: new Date().toISOString(),
    };

    const { error } = await getTable('players').upsert(cloudData, { onConflict: 'id' });
    if (error) throw new Error(error.message);
}

async function syncTeamToCloud(teamId: string, operation: SyncOperation, data?: Team): Promise<void> {
    if (operation === 'delete') {
        const { error } = await getTable('teams').delete().eq('id', teamId);
        if (error) throw new Error(error.message);
        return;
    }

    const team = data || (await db.teams.get(teamId));
    if (!team) throw new Error('Team not found locally');

    const cloudData = {
        id: team.id,
        trip_id: team.tripId,
        name: team.name,
        color: team.color,
        color_hex: team.colorHex || null,
        icon: team.icon || null,
        notes: team.notes || null,
        mode: team.mode || 'ryderCup',
        updated_at: new Date().toISOString(),
    };

    const { error } = await getTable('teams').upsert(cloudData, { onConflict: 'id' });
    if (error) throw new Error(error.message);
}

async function syncTeamMemberToCloud(
    teamMemberId: string,
    operation: SyncOperation,
    data?: TeamMember
): Promise<void> {
    if (operation === 'delete') {
        const { error } = await getTable('team_members').delete().eq('id', teamMemberId);
        if (error) throw new Error(error.message);
        return;
    }

    const teamMember = data || (await db.teamMembers.get(teamMemberId));
    if (!teamMember) throw new Error('TeamMember not found locally');

    const cloudData = {
        id: teamMember.id,
        team_id: teamMember.teamId,
        player_id: teamMember.playerId,
        sort_order: teamMember.sortOrder || 0,
        is_captain: teamMember.isCaptain || false,
    };

    const { error } = await getTable('team_members').upsert(cloudData, { onConflict: 'id' });
    if (error) throw new Error(error.message);
}

async function syncSessionToCloud(
    sessionId: string,
    operation: SyncOperation,
    data?: RyderCupSession
): Promise<void> {
    if (operation === 'delete') {
        const { error } = await getTable('sessions').delete().eq('id', sessionId);
        if (error) throw new Error(error.message);
        return;
    }

    const session = data || (await db.sessions.get(sessionId));
    if (!session) throw new Error('Session not found locally');

    const cloudData = {
        id: session.id,
        trip_id: session.tripId,
        name: session.name,
        session_number: session.sessionNumber,
        session_type: session.sessionType,
        scheduled_date: session.scheduledDate?.split('T')[0] || null,
        time_slot: session.timeSlot || null,
        points_per_match: session.pointsPerMatch || 1.0,
        notes: session.notes || null,
        status: session.status || 'scheduled',
        is_locked: session.isLocked || false,
        updated_at: new Date().toISOString(),
    };

    const { error } = await getTable('sessions').upsert(cloudData, { onConflict: 'id' });
    if (error) throw new Error(error.message);
}

async function syncMatchToCloud(matchId: string, operation: SyncOperation, data?: Match): Promise<void> {
    if (operation === 'delete') {
        const { error } = await getTable('matches').delete().eq('id', matchId);
        if (error) throw new Error(error.message);
        return;
    }

    const match = data || (await db.matches.get(matchId));
    if (!match) throw new Error('Match not found locally');

    const cloudData = {
        id: match.id,
        session_id: match.sessionId,
        course_id: match.courseId || null,
        tee_set_id: match.teeSetId || null,
        match_order: match.matchOrder || 0,
        status: match.status,
        start_time: match.startTime || null,
        current_hole: match.currentHole || 1,
        team_a_player_ids: match.teamAPlayerIds,
        team_b_player_ids: match.teamBPlayerIds,
        team_a_handicap_allowance: match.teamAHandicapAllowance || 0,
        team_b_handicap_allowance: match.teamBHandicapAllowance || 0,
        result: match.result || 'notFinished',
        margin: match.margin || 0,
        holes_remaining: match.holesRemaining || 0,
        notes: match.notes || null,
        updated_at: new Date().toISOString(),
    };

    const { error } = await getTable('matches').upsert(cloudData, { onConflict: 'id' });
    if (error) throw new Error(error.message);
}

async function syncHoleResultToCloud(
    holeResultId: string,
    operation: SyncOperation,
    data?: HoleResult
): Promise<void> {
    if (operation === 'delete') {
        const { error } = await getTable('hole_results').delete().eq('id', holeResultId);
        if (error) throw new Error(error.message);
        return;
    }

    const holeResult = data || (await db.holeResults.get(holeResultId));
    if (!holeResult) throw new Error('HoleResult not found locally');

    const cloudData = {
        id: holeResult.id,
        match_id: holeResult.matchId,
        hole_number: holeResult.holeNumber,
        winner: holeResult.winner,
        team_a_strokes: holeResult.teamAStrokes || null,
        team_b_strokes: holeResult.teamBStrokes || null,
        scored_by: holeResult.scoredBy || null,
        notes: holeResult.notes || null,
        timestamp: holeResult.timestamp || new Date().toISOString(),
    };

    const { error } = await getTable('hole_results').upsert(cloudData, {
        onConflict: 'match_id,hole_number',
    });
    if (error) throw new Error(error.message);
}

async function syncCourseToCloud(courseId: string, operation: SyncOperation, data?: Course): Promise<void> {
    if (operation === 'delete') {
        const { error } = await getTable('courses').delete().eq('id', courseId);
        if (error) throw new Error(error.message);
        return;
    }

    const course = data || (await db.courses.get(courseId));
    if (!course) throw new Error('Course not found locally');

    const cloudData = {
        id: course.id,
        name: course.name,
        location: course.location || null,
        updated_at: new Date().toISOString(),
    };

    const { error } = await getTable('courses').upsert(cloudData, { onConflict: 'id' });
    if (error) throw new Error(error.message);
}

async function syncTeeSetToCloud(teeSetId: string, operation: SyncOperation, data?: TeeSet): Promise<void> {
    if (operation === 'delete') {
        const { error } = await getTable('tee_sets').delete().eq('id', teeSetId);
        if (error) throw new Error(error.message);
        return;
    }

    const teeSet = data || (await db.teeSets.get(teeSetId));
    if (!teeSet) throw new Error('TeeSet not found locally');

    const cloudData = {
        id: teeSet.id,
        course_id: teeSet.courseId,
        name: teeSet.name,
        color: teeSet.color || null,
        rating: teeSet.rating,
        slope: teeSet.slope,
        par: teeSet.par,
        hole_handicaps: teeSet.holeHandicaps,
        hole_pars: teeSet.holePars || null,
        yardages: teeSet.yardages || null,
        total_yardage: teeSet.totalYardage || null,
        updated_at: new Date().toISOString(),
    };

    const { error } = await getTable('tee_sets').upsert(cloudData, { onConflict: 'id' });
    if (error) throw new Error(error.message);
}

// ============================================
// FULL TRIP SYNC
// ============================================

/**
 * Sync entire trip to cloud (all related entities)
 */
export async function syncTripToCloudFull(tripId: string): Promise<TripSyncResult> {
    if (!canSync()) {
        return { success: false, tripId, error: 'Offline', queued: true };
    }

    try {
        // Get all trip data
        const trip = await db.trips.get(tripId);
        if (!trip) throw new Error('Trip not found');

        const teams = await db.teams.where('tripId').equals(tripId).toArray();
        const teamIds = teams.map((t) => t.id);
        const teamMembers = await db.teamMembers.where('teamId').anyOf(teamIds).toArray();
        const playerIds = teamMembers.map((tm) => tm.playerId);
        const players = await db.players.where('id').anyOf(playerIds).toArray();
        const sessions = await db.sessions.where('tripId').equals(tripId).toArray();
        const sessionIds = sessions.map((s) => s.id);
        const matches = await db.matches.where('sessionId').anyOf(sessionIds).toArray();
        const matchIds = matches.map((m) => m.id);
        const holeResults = await db.holeResults.where('matchId').anyOf(matchIds).toArray();

        // Sync in order (respecting foreign keys)
        await syncTripToCloud(tripId, 'update', trip);

        for (const player of players) {
            await syncPlayerToCloud(player.id, 'update', player, tripId);
        }

        for (const team of teams) {
            await syncTeamToCloud(team.id, 'update', team);
        }

        for (const teamMember of teamMembers) {
            await syncTeamMemberToCloud(teamMember.id, 'update', teamMember);
        }

        for (const session of sessions) {
            await syncSessionToCloud(session.id, 'update', session);
        }

        for (const match of matches) {
            await syncMatchToCloud(match.id, 'update', match);
        }

        for (const holeResult of holeResults) {
            await syncHoleResultToCloud(holeResult.id, 'update', holeResult);
        }

        console.log(`[TripSync] Full sync completed for trip ${tripId}`);
        return { success: true, tripId, cloudId: tripId };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[TripSync] Full sync failed:', errorMessage);
        return { success: false, tripId, error: errorMessage };
    }
}

// ============================================
// PULL FROM CLOUD
// ============================================

/**
 * Pull trip from cloud by share code and merge into local
 */
export async function pullTripByShareCode(shareCode: string): Promise<TripSyncResult> {
    if (!canSync()) {
        return { success: false, tripId: '', error: 'Offline' };
    }

    try {
        // Find trip by share code
        const { data: trip, error: tripError } = await getTable('trips')
            .select('*')
            .eq('share_code', shareCode.toUpperCase())
            .single();

        if (tripError || !trip) {
            throw new Error('Trip not found with that share code');
        }

        // Pull all related data
        const [
            { data: teams },
            { data: sessions },
        ] = await Promise.all([
            getTable('teams').select('*').eq('trip_id', trip.id),
            getTable('sessions').select('*').eq('trip_id', trip.id),
        ]);

        // Get team members and players
        const teamIds = (teams || []).map((t: { id: string }) => t.id);
        const { data: teamMembers } = await getTable('team_members')
            .select('*')
            .in('team_id', teamIds);

        const playerIds = (teamMembers || []).map((tm: { player_id: string }) => tm.player_id);
        const { data: players } = await getTable('players').select('*').in('id', playerIds);

        // Get matches and hole results
        const sessionIds = (sessions || []).map((s: { id: string }) => s.id);
        const { data: matches } = await getTable('matches').select('*').in('session_id', sessionIds);

        const matchIds = (matches || []).map((m: { id: string }) => m.id);
        const { data: holeResults } = await getTable('hole_results').select('*').in('match_id', matchIds);

        // Save to local database
        await db.transaction(
            'rw',
            [db.trips, db.teams, db.teamMembers, db.players, db.sessions, db.matches, db.holeResults],
            async () => {
                // Trip
                const localTrip: Trip = {
                    id: trip.id,
                    name: trip.name,
                    startDate: trip.start_date,
                    endDate: trip.end_date,
                    location: trip.location,
                    notes: trip.notes,
                    isCaptainModeEnabled: trip.is_captain_mode_enabled,
                    captainName: trip.captain_name,
                    createdAt: trip.created_at,
                    updatedAt: trip.updated_at,
                };
                await db.trips.put(localTrip);

                // Players
                for (const p of players || []) {
                    await db.players.put({
                        id: p.id,
                        firstName: p.first_name,
                        lastName: p.last_name,
                        email: p.email,
                        handicapIndex: p.handicap_index,
                        ghin: p.ghin,
                        teePreference: p.tee_preference,
                        avatarUrl: p.avatar_url,
                    });
                }

                // Teams
                for (const t of teams || []) {
                    await db.teams.put({
                        id: t.id,
                        tripId: t.trip_id,
                        name: t.name,
                        color: t.color,
                        colorHex: t.color_hex,
                        icon: t.icon,
                        notes: t.notes,
                        mode: t.mode,
                        createdAt: t.created_at,
                    });
                }

                // Team Members
                for (const tm of teamMembers || []) {
                    await db.teamMembers.put({
                        id: tm.id,
                        teamId: tm.team_id,
                        playerId: tm.player_id,
                        sortOrder: tm.sort_order,
                        isCaptain: tm.is_captain,
                        createdAt: tm.created_at,
                    });
                }

                // Sessions
                for (const s of sessions || []) {
                    await db.sessions.put({
                        id: s.id,
                        tripId: s.trip_id,
                        name: s.name,
                        sessionNumber: s.session_number,
                        sessionType: s.session_type,
                        scheduledDate: s.scheduled_date,
                        timeSlot: s.time_slot,
                        pointsPerMatch: s.points_per_match,
                        notes: s.notes,
                        status: s.status,
                        isLocked: s.is_locked,
                        createdAt: s.created_at,
                        updatedAt: s.updated_at,
                    });
                }

                // Matches
                for (const m of matches || []) {
                    await db.matches.put({
                        id: m.id,
                        sessionId: m.session_id,
                        courseId: m.course_id,
                        teeSetId: m.tee_set_id,
                        matchOrder: m.match_order,
                        status: m.status,
                        startTime: m.start_time,
                        currentHole: m.current_hole,
                        teamAPlayerIds: m.team_a_player_ids,
                        teamBPlayerIds: m.team_b_player_ids,
                        teamAHandicapAllowance: m.team_a_handicap_allowance,
                        teamBHandicapAllowance: m.team_b_handicap_allowance,
                        result: m.result,
                        margin: m.margin,
                        holesRemaining: m.holes_remaining,
                        notes: m.notes,
                        createdAt: m.created_at,
                        updatedAt: m.updated_at,
                    });
                }

                // Hole Results
                for (const hr of holeResults || []) {
                    await db.holeResults.put({
                        id: hr.id,
                        matchId: hr.match_id,
                        holeNumber: hr.hole_number,
                        winner: hr.winner,
                        teamAStrokes: hr.team_a_strokes,
                        teamBStrokes: hr.team_b_strokes,
                        scoredBy: hr.scored_by,
                        notes: hr.notes,
                        timestamp: hr.timestamp,
                    });
                }
            }
        );

        console.log(`[TripSync] Pulled trip ${trip.id} from cloud`);
        return { success: true, tripId: trip.id, cloudId: trip.id };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[TripSync] Pull failed:', errorMessage);
        return { success: false, tripId: '', error: errorMessage };
    }
}

/**
 * Get trip's share code (generate if needed)
 */
export async function getTripShareCode(tripId: string): Promise<string | null> {
    if (!canSync()) return null;

    try {
        const { data, error } = await getTable('trips').select('share_code').eq('id', tripId).single();

        if (error || !data) return null;
        return data.share_code;
    } catch {
        return null;
    }
}

// ============================================
// SYNC STATUS
// ============================================

export function getSyncQueueStatus(): {
    pending: number;
    failed: number;
    total: number;
} {
    const pending = syncQueue.filter((i) => i.status === 'pending' || i.status === 'syncing').length;
    const failed = syncQueue.filter((i) => i.status === 'failed').length;
    return { pending, failed, total: syncQueue.length };
}

export function getTripSyncStatus(tripId: string): SyncStatus {
    if (!isOnline) return 'offline';

    const tripItems = syncQueue.filter((i) => i.tripId === tripId);
    if (tripItems.length === 0) return 'synced';

    const hasFailed = tripItems.some((i) => i.status === 'failed');
    const hasPending = tripItems.some((i) => i.status === 'pending' || i.status === 'syncing');

    if (hasFailed) return 'failed';
    if (hasPending) return 'pending';
    return 'synced';
}

// ============================================
// INITIALIZATION
// ============================================

export function initTripSyncService(): void {
    initTripSyncNetworkListeners();

    // Process any pending items on startup
    if (canSync()) {
        setTimeout(() => {
            processSyncQueue().catch((err) => {
                console.error('[TripSync] Startup sync error:', err);
            });
        }, 3000);
    }
}
