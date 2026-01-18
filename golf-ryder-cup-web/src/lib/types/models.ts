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
 * Session type for Ryder Cup format (legacy - match play only)
 */
export type SessionType = 'foursomes' | 'fourball' | 'singles';

/**
 * Extended session type supporting all match formats
 * For full configuration details, see matchFormats.ts
 */
export type ExtendedSessionType =
    | SessionType
    // Match Play Formats
    | 'greensomes'
    | 'pinehurst'
    | 'bloodsome'
    | 'modified-alternate'
    // Team Scramble Formats
    | 'scramble'
    | 'scramble-2'
    | 'scramble-3'
    | 'scramble-4'
    | 'texas-scramble'
    | 'florida-scramble'
    | 'shamble'
    // Points/Scoring Formats
    | 'stableford'
    | 'modified-stableford'
    | 'stroke-play'
    | 'net-stroke-play'
    | 'medal'
    | 'par-competition'
    | 'bogey-golf'
    // Multi-Player Games
    | 'better-ball-3'
    | 'better-ball-4'
    | 'best-2-of-4'
    | 'worst-ball'
    | 'aggregate'
    // Betting/Side Games
    | 'skins'
    | 'nassau'
    | 'wolf'
    | 'vegas'
    | 'bingo-bango-bongo'
    | 'dots'
    | 'rabbit'
    | 'snake'
    // Rotating/Hybrid Formats
    | 'six-six-six'
    | 'round-robin'
    | 'cha-cha-cha'
    | 'irish-fourball'
    | 'waltz'
    // Custom
    | 'custom';

// Note: ScoringMode is exported from scoringFormats.ts to avoid duplication

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
export type BanterPostType = 'message' | 'result' | 'lineup' | 'system' | 'prediction' | 'cart' | 'cart_sighting';

// ============================================
// TRIP
// ============================================

/**
 * Trip settings for configuring competition rules.
 */
export interface TripSettings {
    pointsToWin: number;
    totalMatches: number;
    allowSpectators: boolean;
    isPublic: boolean;
}

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
    captainPin?: string;
    settings?: TripSettings;
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
    tripId?: UUID;
    firstName: string;
    lastName: string;
    email?: string;
    handicapIndex?: number;
    ghin?: string;
    teePreference?: string;
    avatarUrl?: string;
    team?: 'usa' | 'europe';
    // Payment info for settlements
    venmoUsername?: string;
    paypalUsername?: string;
    zelleEmail?: string;
    zellePhone?: string;
    joinedAt?: ISODateString;
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

    // P0-4: Audit trail fields
    /** Player who last edited this score (if edited) */
    lastEditedBy?: UUID;
    /** When the score was last edited */
    lastEditedAt?: ISODateString;
    /** Reason for edit (required for captain overrides) */
    editReason?: string;
    /** History of edits for dispute resolution */
    editHistory?: HoleResultEdit[];
}

/**
 * P0-4: Audit entry for score edits
 */
export interface HoleResultEdit {
    editedAt: ISODateString;
    editedBy: UUID;
    previousWinner: HoleWinner;
    newWinner: HoleWinner;
    reason?: string;
    isCaptainOverride?: boolean;
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
// SIDE BETS
// ============================================

export type SideBetType = 'skins' | 'nassau' | 'ctp' | 'longdrive' | 'custom';
export type SideBetStatus = 'active' | 'completed' | 'pending';

/**
 * Side bet for tracking skins, CTP, long drive, nassau, and custom bets.
 * Can be trip-wide or linked to a specific match.
 */
export interface SideBet {
    id: UUID;
    tripId: UUID;
    matchId?: UUID;  // Optional: link bet to specific match for "inside games"
    sessionId?: UUID; // Optional: link bet to specific session
    type: SideBetType;
    name: string;
    description: string;
    status: SideBetStatus;
    pot?: number;
    perHole?: number;  // For skins: amount per hole
    winnerId?: UUID;
    hole?: number;
    participantIds: UUID[];
    results?: SideBetResult[];  // Track hole-by-hole results for skins

    // Nassau-specific fields (2v2 match format)
    nassauTeamA?: UUID[];  // 2 player IDs for Team A
    nassauTeamB?: UUID[];  // 2 player IDs for Team B
    nassauResults?: NassauResults;  // Front 9, Back 9, Overall results

    createdAt: ISODateString;
    completedAt?: ISODateString;
}

/**
 * Nassau bet results - tracks winner of each segment
 */
export interface NassauResults {
    front9Winner?: 'teamA' | 'teamB' | 'push';
    back9Winner?: 'teamA' | 'teamB' | 'push';
    overallWinner?: 'teamA' | 'teamB' | 'push';
}

/**
 * Individual result for skins/hole-based bets
 */
export interface SideBetResult {
    holeNumber: number;
    winnerId?: UUID;  // undefined = carry-over
    amount: number;
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
