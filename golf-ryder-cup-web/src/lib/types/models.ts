/**
 * Golf Ryder Cup App - Domain Models
 *
 * TypeScript types ported from Swift models with enhancements for web.
 * These are the core entities that power the entire application.
 */

// ============================================
// PRIMITIVE TYPES
// ============================================

export type UUID = string;
export type ISODateString = string;

// ============================================
// ENUMS
// ============================================

/**
 * Match status for match play scoring
 */
export enum MatchStatus {
    Scheduled = 'scheduled',
    InProgress = 'in_progress',
    Final = 'final',
    Cancelled = 'cancelled',
}

/**
 * Match result type - who won?
 */
export enum MatchResultType {
    TeamAWin = 'team_a_win',
    TeamBWin = 'team_b_win',
    Halved = 'halved',
    NotFinished = 'not_finished',
}

/**
 * Hole winner for match play
 */
export enum HoleWinner {
    TeamA = 'team_a',
    TeamB = 'team_b',
    Halved = 'halved',
}

/**
 * Session type for Ryder Cup format
 */
export enum SessionType {
    Foursomes = 'foursomes',   // Alternate shot
    Fourball = 'fourball',     // Best ball
    Singles = 'singles',       // 1v1 match play
}

/**
 * Team mode (Ryder Cup = 2 teams)
 */
export enum TeamMode {
    Freeform = 'freeform',
    RyderCup = 'ryder_cup',
}

/**
 * Game format types for stroke play
 */
export enum FormatType {
    StrokePlayGross = 'stroke_play_gross',
    StrokePlayNet = 'stroke_play_net',
    Stableford = 'stableford',
    BestBall = 'best_ball',
    Scramble = 'scramble',
}

/**
 * Audit action types for captain mode
 */
export enum AuditActionType {
    SessionCreated = 'session_created',
    SessionLocked = 'session_locked',
    SessionUnlocked = 'session_unlocked',
    PairingCreated = 'pairing_created',
    PairingEdited = 'pairing_edited',
    PairingDeleted = 'pairing_deleted',
    LineupPublished = 'lineup_published',
    MatchStarted = 'match_started',
    MatchFinalized = 'match_finalized',
    ScoreEntered = 'score_entered',
    ScoreEdited = 'score_edited',
    ScoreUndone = 'score_undone',
    CaptainModeEnabled = 'captain_mode_enabled',
    CaptainModeDisabled = 'captain_mode_disabled',
}

/**
 * Schedule item types
 */
export enum ScheduleItemType {
    TeeTime = 'tee_time',
    Event = 'event',
}

/**
 * Banter post types
 */
export enum BanterPostType {
    Message = 'message',
    Result = 'result',
    Lineup = 'lineup',
    System = 'system',
}

// ============================================
// TRIP
// ============================================

/**
 * Trip entity representing a golf trip/event.
 * The top-level container for all trip data.
 */
export interface Trip {
    id: UUID;
    name: string;
    startDate: ISODateString;
    endDate: ISODateString;
    location?: string;
    notes?: string;
    isCaptainModeEnabled: boolean;
    captainName?: string;
    createdAt: ISODateString;
    updatedAt: ISODateString;
}

// ============================================
// PLAYER
// ============================================

/**
 * Player entity representing a golfer with their profile information.
 */
export interface Player {
    id: UUID;
    name: string;
    handicapIndex: number;
    ghin?: string;
    teePreference?: string;
    avatarUrl?: string;
    createdAt: ISODateString;
    updatedAt: ISODateString;
}

// ============================================
// TEAM
// ============================================

/**
 * Team entity for managing team competitions.
 */
export interface Team {
    id: UUID;
    tripId: UUID;
    name: string;
    colorHex?: string;
    icon?: string;
    notes?: string;
    mode: TeamMode;
    createdAt: ISODateString;
    updatedAt: ISODateString;
}

/**
 * Team member - links a player to a team.
 */
export interface TeamMember {
    id: UUID;
    teamId: UUID;
    playerId: UUID;
    sortOrder: number;
    isCaptain: boolean;
    createdAt: ISODateString;
}

// ============================================
// SESSION (RYDER CUP)
// ============================================

/**
 * Ryder Cup session (e.g., Friday AM Foursomes).
 */
export interface RyderCupSession {
    id: UUID;
    tripId: UUID;
    name: string;
    sessionType: SessionType;
    scheduledDate: ISODateString;
    timeSlot: 'AM' | 'PM';
    pointsPerMatch: number;
    notes?: string;
    isLocked: boolean;
    createdAt: ISODateString;
    updatedAt: ISODateString;
}

// ============================================
// MATCH
// ============================================

/**
 * Match entity for match play scoring.
 *
 * Note: Player IDs are stored as arrays (improved from Swift's comma-separated strings).
 */
export interface Match {
    id: UUID;
    sessionId: UUID;
    courseId?: UUID;
    teeSetId?: UUID;
    matchOrder: number;
    status: MatchStatus;
    startTime?: ISODateString;
    currentHole: number;

    // Player IDs for each team
    teamAPlayerIds: UUID[];
    teamBPlayerIds: UUID[];

    // Handicap allowances (strokes given)
    teamAHandicapAllowance: number;
    teamBHandicapAllowance: number;

    // Final result
    result: MatchResultType;
    margin: number;        // e.g., 3 for "3&2"
    holesRemaining: number; // e.g., 2 for "3&2"

    notes?: string;
    createdAt: ISODateString;
    updatedAt: ISODateString;
}

// ============================================
// HOLE RESULT
// ============================================

/**
 * Result for a single hole in match play.
 */
export interface HoleResult {
    id: UUID;
    matchId: UUID;
    holeNumber: number;
    winner: HoleWinner;
    teamAStrokes?: number;
    teamBStrokes?: number;
    notes?: string;
    timestamp: ISODateString;
}

// ============================================
// COURSE & TEE SET
// ============================================

/**
 * Course entity representing a golf course.
 */
export interface Course {
    id: UUID;
    name: string;
    location?: string;
    createdAt: ISODateString;
    updatedAt: ISODateString;
}

/**
 * Tee set for a course containing rating, slope, and hole handicaps.
 */
export interface TeeSet {
    id: UUID;
    courseId: UUID;
    name: string;
    color?: string;
    rating: number;
    slope: number;
    par: number;
    /** 18 elements where index 0 = hole 1. Value is handicap rank 1-18 (1 = hardest) */
    holeHandicaps: number[];
    /** 18 elements: par for each hole */
    holePars?: number[];
    /** 18 elements: yardage for each hole */
    yardages?: number[];
    totalYardage?: number;
    createdAt: ISODateString;
    updatedAt: ISODateString;
}

// ============================================
// SCHEDULE
// ============================================

/**
 * Schedule day within a trip.
 */
export interface ScheduleDay {
    id: UUID;
    tripId: UUID;
    date: ISODateString;
    notes?: string;
    createdAt: ISODateString;
    updatedAt: ISODateString;
}

/**
 * Schedule item within a day (tee time or event).
 */
export interface ScheduleItem {
    id: UUID;
    scheduleDayId: UUID;
    type: ScheduleItemType;
    title?: string;
    startTime?: ISODateString;
    endTime?: ISODateString;
    teeSetId?: UUID;
    notes?: string;
    createdAt: ISODateString;
    updatedAt: ISODateString;
}

// ============================================
// AUDIT LOG
// ============================================

/**
 * Audit log entry for tracking critical actions.
 */
export interface AuditLogEntry {
    id: UUID;
    tripId: UUID;
    actionType: AuditActionType;
    timestamp: ISODateString;
    actorName: string;
    summary: string;
    details?: string; // JSON string for extra context
    relatedEntityId?: string;
    relatedEntityType?: string;
}

// ============================================
// BANTER
// ============================================

/**
 * Banter post for social feed.
 */
export interface BanterPost {
    id: UUID;
    tripId: UUID;
    content: string;
    authorId?: UUID;
    authorName: string;
    postType: BanterPostType;
    emoji?: string;
    relatedMatchId?: UUID;
    timestamp: ISODateString;
}

// ============================================
// HELPER TYPES
// ============================================

/**
 * Represents data that needs to be synced (Phase 2)
 */
export interface SyncMetadata {
    key: string;
    value: string;
    updatedAt: ISODateString;
}

// ============================================
// DISPLAY HELPERS
// ============================================

export const MatchStatusDisplay: Record<MatchStatus, string> = {
    [MatchStatus.Scheduled]: 'Scheduled',
    [MatchStatus.InProgress]: 'In Progress',
    [MatchStatus.Final]: 'Final',
    [MatchStatus.Cancelled]: 'Cancelled',
};

export const MatchStatusIcon: Record<MatchStatus, string> = {
    [MatchStatus.Scheduled]: 'clock',
    [MatchStatus.InProgress]: 'play-circle',
    [MatchStatus.Final]: 'check-circle',
    [MatchStatus.Cancelled]: 'x-circle',
};

export const SessionTypeDisplay: Record<SessionType, string> = {
    [SessionType.Foursomes]: 'Foursomes',
    [SessionType.Fourball]: 'Fourball',
    [SessionType.Singles]: 'Singles',
};

export const SessionTypeDescription: Record<SessionType, string> = {
    [SessionType.Foursomes]: 'Alternate shot - partners take turns hitting the same ball',
    [SessionType.Fourball]: 'Best ball - each player plays their own ball, best score counts',
    [SessionType.Singles]: '1v1 match play - head to head competition',
};

export const SessionTypePlayersPerTeam: Record<SessionType, number> = {
    [SessionType.Foursomes]: 2,
    [SessionType.Fourball]: 2,
    [SessionType.Singles]: 1,
};

export const HoleWinnerDisplay: Record<HoleWinner, string> = {
    [HoleWinner.TeamA]: 'Team A',
    [HoleWinner.TeamB]: 'Team B',
    [HoleWinner.Halved]: 'Halved',
};

export const AuditActionTypeDisplay: Record<AuditActionType, string> = {
    [AuditActionType.SessionCreated]: 'Session Created',
    [AuditActionType.SessionLocked]: 'Session Locked',
    [AuditActionType.SessionUnlocked]: 'Session Unlocked',
    [AuditActionType.PairingCreated]: 'Pairing Created',
    [AuditActionType.PairingEdited]: 'Pairing Edited',
    [AuditActionType.PairingDeleted]: 'Pairing Deleted',
    [AuditActionType.LineupPublished]: 'Lineup Published',
    [AuditActionType.MatchStarted]: 'Match Started',
    [AuditActionType.MatchFinalized]: 'Match Finalized',
    [AuditActionType.ScoreEntered]: 'Score Entered',
    [AuditActionType.ScoreEdited]: 'Score Edited',
    [AuditActionType.ScoreUndone]: 'Score Undone',
    [AuditActionType.CaptainModeEnabled]: 'Captain Mode Enabled',
    [AuditActionType.CaptainModeDisabled]: 'Captain Mode Disabled',
};
