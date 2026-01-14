/**
 * Sync Service
 *
 * Handles bidirectional synchronization between local IndexedDB and Supabase.
 * Provides offline-first experience with automatic sync when online.
 */

import { supabase, isSupabaseConfigured, getSupabase } from './client';
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

// ============================================
// TYPES
// ============================================

export interface SyncResult {
    success: boolean;
    synced: number;
    errors: string[];
    timestamp: Date;
}

export interface SyncStatus {
    lastSyncAt: Date | null;
    isSyncing: boolean;
    pendingChanges: number;
    error: string | null;
}

// Track pending changes for offline support
interface PendingChange {
    id: string;
    table: string;
    operation: 'insert' | 'update' | 'delete';
    data: unknown;
    timestamp: string;
}

// ============================================
// HELPER: Convert between camelCase and snake_case
// ============================================

function toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function toCamelCase(str: string): string {
    return str.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
}

function convertKeysToSnakeCase<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const snakeKey = toSnakeCase(key);
            result[snakeKey] = obj[key];
        }
    }
    return result;
}

function convertKeysToCamelCase<T extends Record<string, unknown>>(obj: T): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const camelKey = toCamelCase(key);
            result[camelKey] = obj[key];
        }
    }
    return result;
}

// ============================================
// SYNC SERVICE CLASS
// ============================================

class SyncService {
    private pendingChanges: PendingChange[] = [];
    private isSyncing = false;
    private lastSyncAt: Date | null = null;
    private syncListeners: Array<(status: SyncStatus) => void> = [];

    constructor() {
        // Load pending changes from localStorage
        this.loadPendingChanges();

        // Listen for online/offline events
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => this.syncPendingChanges());
        }
    }

    /**
     * Subscribe to sync status changes
     */
    onStatusChange(listener: (status: SyncStatus) => void): () => void {
        this.syncListeners.push(listener);
        return () => {
            this.syncListeners = this.syncListeners.filter((l) => l !== listener);
        };
    }

    private notifyListeners(): void {
        const status = this.getStatus();
        this.syncListeners.forEach((listener) => listener(status));
    }

    /**
     * Get current sync status
     */
    getStatus(): SyncStatus {
        return {
            lastSyncAt: this.lastSyncAt,
            isSyncing: this.isSyncing,
            pendingChanges: this.pendingChanges.length,
            error: null,
        };
    }

    /**
     * Load pending changes from localStorage
     */
    private loadPendingChanges(): void {
        if (typeof window === 'undefined') return;
        try {
            const stored = localStorage.getItem('golf-sync-pending');
            if (stored) {
                this.pendingChanges = JSON.parse(stored);
            }
        } catch {
            this.pendingChanges = [];
        }
    }

    /**
     * Save pending changes to localStorage
     */
    private savePendingChanges(): void {
        if (typeof window === 'undefined') return;
        try {
            localStorage.setItem('golf-sync-pending', JSON.stringify(this.pendingChanges));
        } catch {
            // Storage full or unavailable
        }
    }

    /**
     * Add a pending change for later sync
     */
    addPendingChange(table: string, operation: 'insert' | 'update' | 'delete', data: unknown): void {
        const change: PendingChange = {
            id: crypto.randomUUID(),
            table,
            operation,
            data,
            timestamp: new Date().toISOString(),
        };
        this.pendingChanges.push(change);
        this.savePendingChanges();
        this.notifyListeners();
    }

    /**
     * Sync all pending changes to Supabase
     */
    async syncPendingChanges(): Promise<SyncResult> {
        if (!isSupabaseConfigured || !supabase || this.isSyncing) {
            return { success: false, synced: 0, errors: ['Sync not available'], timestamp: new Date() };
        }

        this.isSyncing = true;
        this.notifyListeners();

        const errors: string[] = [];
        let synced = 0;

        for (const change of [...this.pendingChanges]) {
            try {
                const snakeCaseData = convertKeysToSnakeCase(change.data as Record<string, unknown>);
                const sb = getSupabase();

                switch (change.operation) {
                    case 'insert':
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        await (sb.from(change.table) as any).insert(snakeCaseData);
                        break;
                    case 'update':
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        await (sb.from(change.table) as any)
                            .update(snakeCaseData)
                            .eq('id', (change.data as { id: string }).id);
                        break;
                    case 'delete':
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        await (sb.from(change.table) as any)
                            .delete()
                            .eq('id', (change.data as { id: string }).id);
                        break;
                }

                // Remove from pending
                this.pendingChanges = this.pendingChanges.filter((c) => c.id !== change.id);
                synced++;
            } catch (error) {
                errors.push(`Failed to sync ${change.table}: ${error}`);
            }
        }

        this.savePendingChanges();
        this.lastSyncAt = new Date();
        this.isSyncing = false;
        this.notifyListeners();

        return { success: errors.length === 0, synced, errors, timestamp: new Date() };
    }

    // ============================================
    // TRIP SYNC
    // ============================================

    /**
     * Sync a trip and all related data to Supabase
     */
    async syncTripToCloud(tripId: string): Promise<SyncResult> {
        if (!isSupabaseConfigured || !supabase) {
            return { success: false, synced: 0, errors: ['Supabase not configured'], timestamp: new Date() };
        }

        this.isSyncing = true;
        this.notifyListeners();

        const errors: string[] = [];
        let synced = 0;

        try {
            // Get all local data
            const trip = await db.trips.get(tripId);
            if (!trip) {
                throw new Error('Trip not found');
            }

            const [teams, sessions, teamMembers] = await Promise.all([
                db.teams.where('tripId').equals(tripId).toArray(),
                db.sessions.where('tripId').equals(tripId).toArray(),
                db.teamMembers.toArray(),
            ]);

            const teamIds = teams.map((t) => t.id);
            const sessionIds = sessions.map((s) => s.id);
            const relevantTeamMembers = teamMembers.filter((tm) => teamIds.includes(tm.teamId));
            const playerIds = relevantTeamMembers.map((tm) => tm.playerId);

            const [players, matches] = await Promise.all([
                db.players.where('id').anyOf(playerIds).toArray(),
                db.matches.where('sessionId').anyOf(sessionIds).toArray(),
            ]);

            const matchIds = matches.map((m) => m.id);
            const holeResults = await db.holeResults.where('matchId').anyOf(matchIds).toArray();

            const sb = getSupabase();

            // Upsert to Supabase (using type assertions for dynamic data)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: tripError } = await (sb.from('trips') as any)
                .upsert(convertKeysToSnakeCase(trip as unknown as Record<string, unknown>));
            if (tripError) errors.push(`Trip: ${tripError.message}`);
            else synced++;

            // Sync players
            for (const player of players) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { error } = await (sb.from('players') as any)
                    .upsert(convertKeysToSnakeCase(player as unknown as Record<string, unknown>));
                if (error) errors.push(`Player ${player.id}: ${error.message}`);
                else synced++;
            }

            // Sync teams
            for (const team of teams) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { error } = await (sb.from('teams') as any)
                    .upsert(convertKeysToSnakeCase(team as unknown as Record<string, unknown>));
                if (error) errors.push(`Team ${team.id}: ${error.message}`);
                else synced++;
            }

            // Sync team members
            for (const tm of relevantTeamMembers) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { error } = await (sb.from('team_members') as any)
                    .upsert(convertKeysToSnakeCase(tm as unknown as Record<string, unknown>));
                if (error) errors.push(`TeamMember ${tm.id}: ${error.message}`);
                else synced++;
            }

            // Sync sessions
            for (const session of sessions) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { error } = await (sb.from('sessions') as any)
                    .upsert(convertKeysToSnakeCase(session as unknown as Record<string, unknown>));
                if (error) errors.push(`Session ${session.id}: ${error.message}`);
                else synced++;
            }

            // Sync matches
            for (const match of matches) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { error } = await (sb.from('matches') as any)
                    .upsert(convertKeysToSnakeCase(match as unknown as Record<string, unknown>));
                if (error) errors.push(`Match ${match.id}: ${error.message}`);
                else synced++;
            }

            // Sync hole results
            for (const result of holeResults) {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { error } = await (sb.from('hole_results') as any)
                    .upsert(convertKeysToSnakeCase(result as unknown as Record<string, unknown>));
                if (error) errors.push(`HoleResult ${result.id}: ${error.message}`);
                else synced++;
            }

            this.lastSyncAt = new Date();
        } catch (error) {
            errors.push(`Sync failed: ${error}`);
        }

        this.isSyncing = false;
        this.notifyListeners();

        return { success: errors.length === 0, synced, errors, timestamp: new Date() };
    }

    /**
     * Fetch a trip from Supabase by share code
     */
    async fetchTripByShareCode(shareCode: string): Promise<Trip | null> {
        if (!isSupabaseConfigured || !supabase) {
            return null;
        }

        const { data, error } = await supabase
            .from('trips')
            .select('*')
            .eq('share_code', shareCode.toUpperCase())
            .single();

        if (error || !data) {
            return null;
        }

        return convertKeysToCamelCase(data as unknown as Record<string, unknown>) as unknown as Trip;
    }

    /**
     * Join a trip by share code - downloads all trip data locally
     */
    async joinTripByShareCode(shareCode: string): Promise<SyncResult> {
        if (!isSupabaseConfigured || !supabase) {
            return { success: false, synced: 0, errors: ['Supabase not configured'], timestamp: new Date() };
        }

        this.isSyncing = true;
        this.notifyListeners();

        const errors: string[] = [];
        let synced = 0;

        try {
            // Fetch trip
            const { data: tripData, error: tripError } = await supabase
                .from('trips')
                .select('*')
                .eq('share_code', shareCode.toUpperCase())
                .single();

            if (tripError || !tripData) {
                throw new Error('Trip not found with that share code');
            }

            const trip = convertKeysToCamelCase(tripData as unknown as Record<string, unknown>) as unknown as Trip;
            await db.trips.put(trip);
            synced++;

            // Fetch teams
            const { data: teamsData } = await supabase
                .from('teams')
                .select('*')
                .eq('trip_id', trip.id);

            if (teamsData) {
                for (const teamData of teamsData) {
                    const team = convertKeysToCamelCase(teamData as unknown as Record<string, unknown>) as unknown as Team;
                    await db.teams.put(team);
                    synced++;
                }
            }

            // Fetch sessions
            const { data: sessionsData } = await supabase
                .from('sessions')
                .select('*')
                .eq('trip_id', trip.id);

            if (sessionsData) {
                for (const sessionData of sessionsData) {
                    const session = convertKeysToCamelCase(sessionData as unknown as Record<string, unknown>) as unknown as RyderCupSession;
                    await db.sessions.put(session);
                    synced++;
                }

                // Fetch matches for all sessions
                const sessionIds = (sessionsData as Array<{ id: string }>).map((s) => s.id);
                const { data: matchesData } = await getSupabase()
                    .from('matches')
                    .select('*')
                    .in('session_id', sessionIds);

                if (matchesData) {
                    for (const matchData of matchesData) {
                        const match = convertKeysToCamelCase(matchData as unknown as Record<string, unknown>) as unknown as Match;
                        await db.matches.put(match);
                        synced++;
                    }

                    // Fetch hole results for all matches
                    const matchIds = (matchesData as Array<{ id: string }>).map((m) => m.id);
                    const { data: holeResultsData } = await getSupabase()
                        .from('hole_results')
                        .select('*')
                        .in('match_id', matchIds);

                    if (holeResultsData) {
                        for (const hrData of holeResultsData) {
                            const holeResult = convertKeysToCamelCase(hrData as unknown as Record<string, unknown>) as unknown as HoleResult;
                            await db.holeResults.put(holeResult);
                            synced++;
                        }
                    }
                }
            }

            // Fetch team members and players
            if (teamsData) {
                const teamIds = (teamsData as Array<{ id: string }>).map((t) => t.id);
                const { data: teamMembersData } = await getSupabase()
                    .from('team_members')
                    .select('*')
                    .in('team_id', teamIds);

                if (teamMembersData) {
                    const playerIds = (teamMembersData as Array<{ player_id: string }>).map((tm) => tm.player_id);

                    // Fetch players
                    const { data: playersData } = await getSupabase()
                        .from('players')
                        .select('*')
                        .in('id', playerIds);

                    if (playersData) {
                        for (const playerData of playersData) {
                            const player = convertKeysToCamelCase(playerData as unknown as Record<string, unknown>) as unknown as Player;
                            await db.players.put(player);
                            synced++;
                        }
                    }

                    for (const tmData of teamMembersData) {
                        const tm = convertKeysToCamelCase(tmData as unknown as Record<string, unknown>) as unknown as TeamMember;
                        await db.teamMembers.put(tm);
                        synced++;
                    }
                }
            }

            this.lastSyncAt = new Date();
        } catch (error) {
            errors.push(`Join failed: ${error}`);
        }

        this.isSyncing = false;
        this.notifyListeners();

        return { success: errors.length === 0, synced, errors, timestamp: new Date() };
    }

    // ============================================
    // REAL-TIME UPDATES
    // ============================================

    /**
     * Push a hole result to Supabase immediately
     */
    async pushHoleResult(holeResult: HoleResult): Promise<boolean> {
        if (!isSupabaseConfigured) {
            this.addPendingChange('hole_results', 'insert', holeResult);
            return false;
        }

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (getSupabase().from('hole_results') as any)
                .upsert(convertKeysToSnakeCase(holeResult as unknown as Record<string, unknown>));

            if (error) {
                this.addPendingChange('hole_results', 'insert', holeResult);
                return false;
            }

            return true;
        } catch {
            this.addPendingChange('hole_results', 'insert', holeResult);
            return false;
        }
    }

    /**
     * Push a match update to Supabase immediately
     */
    async pushMatchUpdate(match: Match): Promise<boolean> {
        if (!isSupabaseConfigured) {
            this.addPendingChange('matches', 'update', match);
            return false;
        }

        try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error } = await (getSupabase().from('matches') as any)
                .update(convertKeysToSnakeCase(match as unknown as Record<string, unknown>))
                .eq('id', match.id);

            if (error) {
                this.addPendingChange('matches', 'update', match);
                return false;
            }

            return true;
        } catch {
            this.addPendingChange('matches', 'update', match);
            return false;
        }
    }
}

// Export singleton instance
export const syncService = new SyncService();

// ============================================
// REACT HOOK
// ============================================

import { useEffect, useState } from 'react';

export function useSyncStatus(): SyncStatus {
    const [status, setStatus] = useState<SyncStatus>(syncService.getStatus());

    useEffect(() => {
        return syncService.onStatusChange(setStatus);
    }, []);

    return status;
}
