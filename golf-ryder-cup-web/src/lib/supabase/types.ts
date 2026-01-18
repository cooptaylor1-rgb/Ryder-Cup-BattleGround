/**
 * Supabase Database Types
 *
 * TypeScript types generated for the Golf Ryder Cup database schema.
 * These types ensure type-safety when interacting with Supabase.
 */

export type Json =
    | string
    | number
    | boolean
    | null
    | { [key: string]: Json | undefined }
    | Json[];

export interface Database {
    public: {
        Tables: {
            trips: {
                Row: {
                    id: string;
                    name: string;
                    start_date: string;
                    end_date: string;
                    location: string | null;
                    notes: string | null;
                    is_captain_mode_enabled: boolean;
                    captain_name: string | null;
                    share_code: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    start_date: string;
                    end_date: string;
                    location?: string | null;
                    notes?: string | null;
                    is_captain_mode_enabled?: boolean;
                    captain_name?: string | null;
                    share_code?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    id?: string;
                    name?: string;
                    start_date?: string;
                    end_date?: string;
                    location?: string | null;
                    notes?: string | null;
                    is_captain_mode_enabled?: boolean;
                    captain_name?: string | null;
                    share_code?: string | null;
                    updated_at?: string;
                };
            };
            players: {
                Row: {
                    id: string;
                    first_name: string;
                    last_name: string;
                    email: string | null;
                    handicap_index: number | null;
                    ghin: string | null;
                    tee_preference: string | null;
                    avatar_url: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    first_name: string;
                    last_name: string;
                    email?: string | null;
                    handicap_index?: number | null;
                    ghin?: string | null;
                    tee_preference?: string | null;
                    avatar_url?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    first_name?: string;
                    last_name?: string;
                    email?: string | null;
                    handicap_index?: number | null;
                    ghin?: string | null;
                    tee_preference?: string | null;
                    avatar_url?: string | null;
                    updated_at?: string;
                };
            };
            teams: {
                Row: {
                    id: string;
                    trip_id: string;
                    name: string;
                    color: 'usa' | 'europe';
                    color_hex: string | null;
                    icon: string | null;
                    notes: string | null;
                    mode: 'freeform' | 'ryderCup';
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    trip_id: string;
                    name: string;
                    color: 'usa' | 'europe';
                    color_hex?: string | null;
                    icon?: string | null;
                    notes?: string | null;
                    mode?: 'freeform' | 'ryderCup';
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    name?: string;
                    color?: 'usa' | 'europe';
                    color_hex?: string | null;
                    icon?: string | null;
                    notes?: string | null;
                    mode?: 'freeform' | 'ryderCup';
                    updated_at?: string;
                };
            };
            team_members: {
                Row: {
                    id: string;
                    team_id: string;
                    player_id: string;
                    sort_order: number;
                    is_captain: boolean;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    team_id: string;
                    player_id: string;
                    sort_order?: number;
                    is_captain?: boolean;
                    created_at?: string;
                };
                Update: {
                    sort_order?: number;
                    is_captain?: boolean;
                };
            };
            sessions: {
                Row: {
                    id: string;
                    trip_id: string;
                    name: string;
                    session_number: number;
                    session_type: 'foursomes' | 'fourball' | 'singles';
                    scheduled_date: string | null;
                    time_slot: 'AM' | 'PM' | null;
                    points_per_match: number;
                    notes: string | null;
                    status: 'scheduled' | 'inProgress' | 'completed';
                    is_locked: boolean;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    trip_id: string;
                    name: string;
                    session_number: number;
                    session_type: 'foursomes' | 'fourball' | 'singles';
                    scheduled_date?: string | null;
                    time_slot?: 'AM' | 'PM' | null;
                    points_per_match?: number;
                    notes?: string | null;
                    status?: 'scheduled' | 'inProgress' | 'completed';
                    is_locked?: boolean;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    name?: string;
                    session_number?: number;
                    session_type?: 'foursomes' | 'fourball' | 'singles';
                    scheduled_date?: string | null;
                    time_slot?: 'AM' | 'PM' | null;
                    points_per_match?: number;
                    notes?: string | null;
                    status?: 'scheduled' | 'inProgress' | 'completed';
                    is_locked?: boolean;
                    updated_at?: string;
                };
            };
            matches: {
                Row: {
                    id: string;
                    session_id: string;
                    course_id: string | null;
                    tee_set_id: string | null;
                    match_order: number;
                    status: 'scheduled' | 'inProgress' | 'completed' | 'cancelled';
                    start_time: string | null;
                    current_hole: number;
                    team_a_player_ids: string[];
                    team_b_player_ids: string[];
                    team_a_handicap_allowance: number;
                    team_b_handicap_allowance: number;
                    result: string;
                    margin: number;
                    holes_remaining: number;
                    notes: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    session_id: string;
                    course_id?: string | null;
                    tee_set_id?: string | null;
                    match_order?: number;
                    status?: 'scheduled' | 'inProgress' | 'completed' | 'cancelled';
                    start_time?: string | null;
                    current_hole?: number;
                    team_a_player_ids: string[];
                    team_b_player_ids: string[];
                    team_a_handicap_allowance?: number;
                    team_b_handicap_allowance?: number;
                    result?: string;
                    margin?: number;
                    holes_remaining?: number;
                    notes?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    course_id?: string | null;
                    tee_set_id?: string | null;
                    match_order?: number;
                    status?: 'scheduled' | 'inProgress' | 'completed' | 'cancelled';
                    start_time?: string | null;
                    current_hole?: number;
                    team_a_player_ids?: string[];
                    team_b_player_ids?: string[];
                    team_a_handicap_allowance?: number;
                    team_b_handicap_allowance?: number;
                    result?: string;
                    margin?: number;
                    holes_remaining?: number;
                    notes?: string | null;
                    updated_at?: string;
                };
            };
            hole_results: {
                Row: {
                    id: string;
                    match_id: string;
                    hole_number: number;
                    winner: 'teamA' | 'teamB' | 'halved' | 'none';
                    team_a_strokes: number | null;
                    team_b_strokes: number | null;
                    scored_by: string | null;
                    notes: string | null;
                    timestamp: string;
                };
                Insert: {
                    id?: string;
                    match_id: string;
                    hole_number: number;
                    winner: 'teamA' | 'teamB' | 'halved' | 'none';
                    team_a_strokes?: number | null;
                    team_b_strokes?: number | null;
                    scored_by?: string | null;
                    notes?: string | null;
                    timestamp?: string;
                };
                Update: {
                    hole_number?: number;
                    winner?: 'teamA' | 'teamB' | 'halved' | 'none';
                    team_a_strokes?: number | null;
                    team_b_strokes?: number | null;
                    scored_by?: string | null;
                    notes?: string | null;
                    timestamp?: string;
                };
            };
            courses: {
                Row: {
                    id: string;
                    name: string;
                    location: string | null;
                    api_course_id: string | null;
                    latitude: number | null;
                    longitude: number | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    location?: string | null;
                    api_course_id?: string | null;
                    latitude?: number | null;
                    longitude?: number | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    name?: string;
                    location?: string | null;
                    api_course_id?: string | null;
                    latitude?: number | null;
                    longitude?: number | null;
                    updated_at?: string;
                };
            };
            tee_sets: {
                Row: {
                    id: string;
                    course_id: string;
                    name: string;
                    color: string | null;
                    rating: number;
                    slope: number;
                    par: number;
                    hole_handicaps: number[];
                    hole_pars: number[] | null;
                    yardages: number[] | null;
                    total_yardage: number | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    course_id: string;
                    name: string;
                    color?: string | null;
                    rating: number;
                    slope: number;
                    par: number;
                    hole_handicaps: number[];
                    hole_pars?: number[] | null;
                    yardages?: number[] | null;
                    total_yardage?: number | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    name?: string;
                    color?: string | null;
                    rating?: number;
                    slope?: number;
                    par?: number;
                    hole_handicaps?: number[];
                    hole_pars?: number[] | null;
                    yardages?: number[] | null;
                    total_yardage?: number | null;
                    updated_at?: string;
                };
            };
            // Social features (Step 2)
            photos: {
                Row: {
                    id: string;
                    trip_id: string;
                    match_id: string | null;
                    hole_number: number | null;
                    uploaded_by: string;
                    url: string;
                    thumbnail_url: string | null;
                    caption: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    trip_id: string;
                    match_id?: string | null;
                    hole_number?: number | null;
                    uploaded_by: string;
                    url: string;
                    thumbnail_url?: string | null;
                    caption?: string | null;
                    created_at?: string;
                };
                Update: {
                    caption?: string | null;
                };
            };
            comments: {
                Row: {
                    id: string;
                    trip_id: string;
                    match_id: string | null;
                    player_id: string;
                    content: string;
                    emoji: string | null;
                    created_at: string;
                };
                Insert: {
                    id?: string;
                    trip_id: string;
                    match_id?: string | null;
                    player_id: string;
                    content: string;
                    emoji?: string | null;
                    created_at?: string;
                };
                Update: {
                    content?: string;
                    emoji?: string | null;
                };
            };
            // Gamification (Step 4)
            side_bets: {
                Row: {
                    id: string;
                    trip_id: string;
                    match_id: string | null;
                    bet_type: 'skins' | 'nassau' | 'closest_to_pin' | 'longest_drive' | 'custom';
                    name: string;
                    amount: number | null;
                    winner_player_id: string | null;
                    hole_number: number | null;
                    notes: string | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    trip_id: string;
                    match_id?: string | null;
                    bet_type: 'skins' | 'nassau' | 'closest_to_pin' | 'longest_drive' | 'custom';
                    name: string;
                    amount?: number | null;
                    winner_player_id?: string | null;
                    hole_number?: number | null;
                    notes?: string | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    bet_type?: 'skins' | 'nassau' | 'closest_to_pin' | 'longest_drive' | 'custom';
                    name?: string;
                    amount?: number | null;
                    winner_player_id?: string | null;
                    hole_number?: number | null;
                    notes?: string | null;
                    updated_at?: string;
                };
            };
            achievements: {
                Row: {
                    id: string;
                    player_id: string;
                    trip_id: string;
                    achievement_type: string;
                    name: string;
                    description: string;
                    icon: string;
                    earned_at: string;
                };
                Insert: {
                    id?: string;
                    player_id: string;
                    trip_id: string;
                    achievement_type: string;
                    name: string;
                    description: string;
                    icon: string;
                    earned_at?: string;
                };
                Update: never;
            };
            course_library: {
                Row: {
                    id: string;
                    name: string;
                    location: string | null;
                    city: string | null;
                    state: string | null;
                    country: string;
                    latitude: number | null;
                    longitude: number | null;
                    phone: string | null;
                    website: string | null;
                    notes: string | null;
                    source: 'user' | 'ocr' | 'api' | 'import';
                    api_course_id: string | null;
                    is_verified: boolean;
                    verified_by: string | null;
                    verified_at: string | null;
                    usage_count: number;
                    last_used_at: string | null;
                    created_at: string;
                    updated_at: string;
                    created_by: string | null;
                };
                Insert: {
                    id?: string;
                    name: string;
                    location?: string | null;
                    city?: string | null;
                    state?: string | null;
                    country?: string;
                    latitude?: number | null;
                    longitude?: number | null;
                    phone?: string | null;
                    website?: string | null;
                    notes?: string | null;
                    source?: 'user' | 'ocr' | 'api' | 'import';
                    api_course_id?: string | null;
                    is_verified?: boolean;
                    verified_by?: string | null;
                    verified_at?: string | null;
                    usage_count?: number;
                    last_used_at?: string | null;
                    created_at?: string;
                    updated_at?: string;
                    created_by?: string | null;
                };
                Update: {
                    name?: string;
                    location?: string | null;
                    city?: string | null;
                    state?: string | null;
                    country?: string;
                    latitude?: number | null;
                    longitude?: number | null;
                    phone?: string | null;
                    website?: string | null;
                    notes?: string | null;
                    source?: 'user' | 'ocr' | 'api' | 'import';
                    api_course_id?: string | null;
                    is_verified?: boolean;
                    verified_by?: string | null;
                    verified_at?: string | null;
                    usage_count?: number;
                    last_used_at?: string | null;
                    updated_at?: string;
                    created_by?: string | null;
                };
            };
            course_library_tee_sets: {
                Row: {
                    id: string;
                    course_library_id: string;
                    name: string;
                    color: string | null;
                    color_hex: string | null;
                    gender: 'mens' | 'womens' | 'unisex';
                    rating: number | null;
                    slope: number | null;
                    par: number;
                    total_yardage: number | null;
                    hole_pars: number[];
                    hole_handicaps: number[] | null;
                    hole_yardages: number[] | null;
                    created_at: string;
                    updated_at: string;
                };
                Insert: {
                    id?: string;
                    course_library_id: string;
                    name: string;
                    color?: string | null;
                    color_hex?: string | null;
                    gender?: 'mens' | 'womens' | 'unisex';
                    rating?: number | null;
                    slope?: number | null;
                    par: number;
                    total_yardage?: number | null;
                    hole_pars: number[];
                    hole_handicaps?: number[] | null;
                    hole_yardages?: number[] | null;
                    created_at?: string;
                    updated_at?: string;
                };
                Update: {
                    name?: string;
                    color?: string | null;
                    color_hex?: string | null;
                    gender?: 'mens' | 'womens' | 'unisex';
                    rating?: number | null;
                    slope?: number | null;
                    par?: number;
                    total_yardage?: number | null;
                    hole_pars?: number[];
                    hole_handicaps?: number[] | null;
                    hole_yardages?: number[] | null;
                    updated_at?: string;
                };
            };
        };
        Views: {
            [_ in never]: never;
        };
        Functions: {
            [_ in never]: never;
        };
        Enums: {
            [_ in never]: never;
        };
    };
}

// Helper types for easier usage
export type Trip = Database['public']['Tables']['trips']['Row'];
export type Player = Database['public']['Tables']['players']['Row'];
export type Team = Database['public']['Tables']['teams']['Row'];
export type TeamMember = Database['public']['Tables']['team_members']['Row'];
export type Session = Database['public']['Tables']['sessions']['Row'];
export type Match = Database['public']['Tables']['matches']['Row'];
export type HoleResult = Database['public']['Tables']['hole_results']['Row'];
export type Course = Database['public']['Tables']['courses']['Row'];
export type TeeSet = Database['public']['Tables']['tee_sets']['Row'];
export type Photo = Database['public']['Tables']['photos']['Row'];
export type Comment = Database['public']['Tables']['comments']['Row'];
export type SideBet = Database['public']['Tables']['side_bets']['Row'];
export type Achievement = Database['public']['Tables']['achievements']['Row'];
export type CourseLibrary = Database['public']['Tables']['course_library']['Row'];
export type CourseLibraryTeeSet = Database['public']['Tables']['course_library_tee_sets']['Row'];
