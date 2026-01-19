/**
 * Database Record Types
 *
 * Types for database records in snake_case format.
 * Used for Supabase/Postgres responses before conversion to camelCase models.
 */

import type { MatchStatus, MatchResultType, HoleWinner, SessionType } from './models';

/**
 * Match record as returned from database (snake_case)
 */
export interface MatchDbRecord {
    id: string;
    session_id: string;
    course_id?: string;
    tee_set_id?: string;
    match_order: number;
    status: MatchStatus;
    start_time?: string;
    current_hole: number;
    team_a_player_ids: string[];
    team_b_player_ids: string[];
    team_a_handicap_allowance?: number;
    team_b_handicap_allowance?: number;
    result?: MatchResultType;
    margin?: number;
    holes_remaining?: number;
    notes?: string;
    created_at: string;
    updated_at: string;
}

/**
 * Hole result record as returned from database (snake_case)
 */
export interface HoleResultDbRecord {
    id: string;
    match_id: string;
    hole_number: number;
    winner: HoleWinner;
    team_a_strokes?: number[];
    team_b_strokes?: number[];
    scored_by?: string;
    notes?: string;
    timestamp: string;
}

/**
 * Session record as returned from database (snake_case)
 */
export interface SessionDbRecord {
    id: string;
    trip_id: string;
    name: string;
    session_number: number;
    session_type: SessionType;
    scheduled_date: string;
    time_slot?: 'morning' | 'afternoon';
    points_per_match?: number;
    notes?: string;
    status: 'scheduled' | 'inProgress' | 'completed';
    is_locked?: boolean;
    created_at: string;
    updated_at: string;
}
