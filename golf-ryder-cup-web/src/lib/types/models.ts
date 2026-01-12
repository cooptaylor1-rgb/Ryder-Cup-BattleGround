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
// TYPE DEFINITIONS (string literal unions)
// ============================================

/**
 * Match status for match play scoring
 */
export type MatchStatus = 'scheduled' | 'inProgress' | 'completed' | 'cancelled';

/**
 * Match result type - who won?
 */
export type MatchResultType =
    | 'teamAWin'
    | 'teamBWin'
    | 'halved'
    | 'notFinished'
    | 'incomplete'
    | 'oneUp'
    | 'twoAndOne'
    | 'threeAndTwo'
    | 'fourAndThree'
    | 'fiveAndFour'
    | 'sixAndFive';

/**
 * Hole winner for match play
 */
export type HoleWinner = 'teamA' | 'teamB' | 'halved' | 'none';

/**
 * Session type for Ryder Cup format
 */
export type SessionType = 'foursomes' | 'fourball' | 'singles';

/**
 * Team mode (Ryder Cup = 2 teams)
 */
export type TeamMode = 'freeform' | 'ryderCup';

/**
 * Game format types for stroke play
 */
export type FormatType = 'strokePlayGross' | 'strokePlayNet' | 'stableford' | 'bestBall' | 'scramble';

/**
 * Audit action types for captain mode
 */
export type AuditActionType =
    | 'sessionCreated'
    | 'sessionLocked'
    | 'sessionUnlocked'
    | 'pairingCreated'
    | 'pairingEdited'
    | 'pairingDeleted'
    | 'lineupPublished'
    | 'matchStarted'
    | 'matchFinalized'
    | 'scoreEntered'
    | 'scoreEdited'
    | 'scoreUndone'
    | 'captainModeEnabled'
    | 'captainModeDisabled';

/**
 * Schedule item types
 */
export type ScheduleItemType = 'teeTime' | 'meal' | 'activity' | 'travel' | 'event' | 'other';

/**
 * Banter post types
 */
export type BanterPostType = 'message' | 'result' | 'lineup' | 'system';

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
    firstName: string;
    lastName: string;
    email?: string;
    handicapIndex?: number;
    ghin?: string;
    teePreference?: string;
    avatarUrl?: string;
    createdAt?: ISODateString;
    updatedAt?: ISODateString;
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
    color: 'usa' | 'europe'; // Team color identifier
    colorHex?: string;
    icon?: string;
    notes?: string;
    mode: TeamMode;
    createdAt: ISODateString;
    updatedAt?: ISODateString;
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
    sessionNumber: number;
    sessionType: SessionType;
    scheduledDate?: ISODateString;
    timeSlot?: 'AM' | 'PM';
    pointsPerMatch?: number;
    notes?: string;
    status: 'scheduled' | 'inProgress' | 'completed';
    isLocked?: boolean;
    createdAt: ISODateString;
    updatedAt?: ISODateString;
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
    /** Alias for teamAStrokes for compatibility */
    teamAScore?: number;
    /** Alias for teamBStrokes for compatibility */
    teamBScore?: number;
    /** Player who scored this hole */
    scoredBy?: UUID;
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
    scheduled: 'Scheduled',
    inProgress: 'In Progress',
    completed: 'Completed',
    cancelled: 'Cancelled',
};

export const MatchStatusIcon: Record<MatchStatus, string> = {
    scheduled: 'clock',
    inProgress: 'play-circle',
    completed: 'check-circle',
    cancelled: 'x-circle',
};

export const SessionTypeDisplay: Record<SessionType, string> = {
    foursomes: 'Foursomes',
    fourball: 'Fourball',
    singles: 'Singles',
};

export const SessionTypeDescription: Record<SessionType, string> = {
    foursomes: 'Alternate shot - partners take turns hitting the same ball',
    fourball: 'Best ball - each player plays their own ball, best score counts',
    singles: '1v1 match play - head to head competition',
};

export const SessionTypePlayersPerTeam: Record<SessionType, number> = {
    foursomes: 2,
    fourball: 2,
    singles: 1,
};

export const HoleWinnerDisplay: Record<Exclude<HoleWinner, 'none'>, string> = {
    teamA: 'Team A',
    teamB: 'Team B',
    halved: 'Halved',
};

export const AuditActionTypeDisplay: Record<AuditActionType, string> = {
    sessionCreated: 'Session Created',
    sessionLocked: 'Session Locked',
    sessionUnlocked: 'Session Unlocked',
    pairingCreated: 'Pairing Created',
    pairingEdited: 'Pairing Edited',
    pairingDeleted: 'Pairing Deleted',
    lineupPublished: 'Lineup Published',
    matchStarted: 'Match Started',
    matchFinalized: 'Match Finalized',
    scoreEntered: 'Score Entered',
    scoreEdited: 'Score Edited',
    scoreUndone: 'Score Undone',
    captainModeEnabled: 'Captain Mode Enabled',
    captainModeDisabled: 'Captain Mode Disabled',
};
