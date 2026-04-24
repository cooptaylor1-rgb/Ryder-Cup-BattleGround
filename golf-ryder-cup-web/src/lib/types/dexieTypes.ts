/**
 * Dexie Query Result Types
 *
 * Type-safe wrappers for Dexie (IndexedDB) query results.
 * These types help eliminate `any` casts when working with
 * useLiveQuery and other Dexie operations.
 *
 * Usage:
 * ```typescript
 * const matches = useLiveQuery(...) as DexieMatch[] | undefined;
 * const results = (rawScores || []).map((result: DexieHoleResult) => {...});
 * ```
 */

import type {
    Match,
    Player,
    HoleResult,
    RyderCupSession,
    Trip,
} from './models';

// ============================================
// DEXIE QUERY RESULT TYPES
// ============================================

/**
 * Match result from Dexie query
 * Includes potential field name variations between DB and app schemas
 */
export type DexieMatch = Match & {
    // Additional legacy field variations that may exist in stored data
    winnerId?: string | null;
    team1PlayerIds?: string[];
    team2PlayerIds?: string[];
    format?: string;
    date?: string;
    courseName?: string;
    tripId?: string;
};

/**
 * HoleResult from Dexie query
 * Handles both naming conventions (teamA/team1, teamB/team2)
 */
export type DexieHoleResult = HoleResult & {
    // Stroke scores might have different naming in legacy data
    team1Score?: number;
    team2Score?: number;
};

/**
 * Player result from Dexie query
 */
export type DexiePlayer = Player & {
    // Stats computed from matches
    stats?: {
        matchesPlayed: number;
        matchesWon: number;
        points: number;
        birdies: number;
        pars: number;
    };
};

/**
 * Session result from Dexie query
 */
export type DexieSession = RyderCupSession & {
    // Computed fields
    matchCount?: number;
};

/**
 * Trip result from Dexie query with settings
 */
export type DexieTrip = Trip;

// ============================================
// HELPER TYPE GUARDS
// ============================================

/**
 * Type guard to check if a match result indicates team1/teamA won
 */
export function isTeamAWin(match: DexieMatch, playerId: string): boolean {
    const isTeam1 = match.team1PlayerIds?.includes(playerId) || match.teamAPlayerIds?.includes(playerId);
    if (match.winnerId === 'team1' && isTeam1) return true;
    if (match.winnerId === 'team2' && !isTeam1) return true;
    if (match.result === 'teamAWin' && isTeam1) return true;
    if (match.result === 'teamBWin' && !isTeam1) return true;
    return false;
}

/**
 * Type guard to check if match was halved
 */
export function isHalved(match: DexieMatch): boolean {
    return match.winnerId === null || match.result === 'halved' || match.result === 'notFinished';
}

/**
 * Get match result for a player
 */
export function getMatchResult(
    match: DexieMatch,
    playerId: string
): 'win' | 'loss' | 'halved' {
    if (isHalved(match)) return 'halved';
    return isTeamAWin(match, playerId) ? 'win' : 'loss';
}

/**
 * Safely get stroke score from hole result with fallback
 */
export function getTeamStrokes(
    result: DexieHoleResult,
    team: 'A' | 'B'
): number {
    if (team === 'A') {
        return result.teamAStrokes ?? result.team1Score ?? 0;
    }
    return result.teamBStrokes ?? result.team2Score ?? 0;
}
