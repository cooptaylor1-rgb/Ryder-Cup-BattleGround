/**
 * Captain's Toolkit - Types
 *
 * Comprehensive types for captain features including:
 * - Pre-flight validation
 * - Bulk player import
 * - Smart pairings with history
 * - Tee time management
 * - Draft mode
 * - Side bets & budget tracking
 * - Awards & statistics
 * - Historical archives
 */

import type { UUID, ISODateString, Player, SessionType, MatchStatus } from './models';

// ============================================
// PRE-FLIGHT VALIDATION
// ============================================

export type ValidationSeverity = 'error' | 'warning' | 'info';
export type ValidationCategory =
    | 'players'
    | 'teams'
    | 'sessions'
    | 'lineups'
    | 'courses'
    | 'schedule'
    | 'handicaps';

export interface ValidationItem {
    id: string;
    severity: ValidationSeverity;
    category: ValidationCategory;
    title: string;
    description: string;
    actionLabel?: string;
    actionHref?: string;
    autoFixable?: boolean;
}

export interface PreFlightCheckResult {
    isReady: boolean;
    completionPercentage: number;
    errors: ValidationItem[];
    warnings: ValidationItem[];
    info: ValidationItem[];
    checkedAt: ISODateString;
}

export interface PreFlightChecklistConfig {
    requireBalancedTeams: boolean;
    requireAllHandicaps: boolean;
    requireCourseHandicaps: boolean;
    requireAllLineups: boolean;
    minimumPlayersPerTeam: number;
}

// ============================================
// BULK PLAYER IMPORT
// ============================================

export type ImportSource = 'csv' | 'contacts' | 'ghin' | 'manual' | 'clipboard';

export interface PlayerImportRow {
    firstName: string;
    lastName: string;
    email?: string;
    handicapIndex?: number;
    ghin?: string;
    team?: 'A' | 'B';
    phone?: string;
}

export interface ImportValidationResult {
    isValid: boolean;
    row: PlayerImportRow;
    rowNumber: number;
    errors: string[];
    warnings: string[];
}

export interface BulkImportResult {
    success: boolean;
    totalRows: number;
    importedCount: number;
    skippedCount: number;
    errorCount: number;
    validationResults: ImportValidationResult[];
    importedPlayers: Player[];
}

export interface GHINLookupResult {
    found: boolean;
    ghinNumber: string;
    playerName?: string;
    handicapIndex?: number;
    club?: string;
    lastRevision?: ISODateString;
    error?: string;
}

// ============================================
// SMART PAIRINGS WITH HISTORY
// ============================================

export interface PairingHistoryEntry {
    id: UUID;
    tripId: UUID;
    sessionId: UUID;
    matchId: UUID;
    player1Id: UUID;
    player2Id: UUID;
    relationship: 'partners' | 'opponents';
    sessionType: SessionType;
    timestamp: ISODateString;
}

export interface PairingConstraint {
    id: UUID;
    tripId: UUID;
    type: 'must_pair' | 'must_not_pair' | 'must_not_oppose';
    player1Id: UUID;
    player2Id: UUID;
    reason?: string;
    createdAt: ISODateString;
}

export interface PairingSuggestion {
    matchSlot: number;
    teamAPlayers: UUID[];
    teamBPlayers: UUID[];
    handicapGap: number;
    fairnessScore: number;
    reasoning: string[];
    warnings: string[];
}

export interface SmartPairingConfig {
    avoidRepeatMatchups: boolean;
    avoidRepeatPartnerships: boolean;
    maxHandicapGap: number;
    balanceExperience: boolean;
    respectConstraints: boolean;
    prioritizeCompetitiveMatches: boolean;
}

export interface PairingAnalysis {
    sessionId: UUID;
    overallFairnessScore: number; // 0-100
    handicapBalance: number; // 0-100
    experienceBalance: number; // 0-100
    repeatMatchupCount: number;
    repeatPartnershipCount: number;
    constraintViolations: string[];
    suggestions: string[];
    strokeAdvantage: {
        team: 'A' | 'B' | 'even';
        strokes: number;
    };
}

// ============================================
// TEE TIME MANAGEMENT
// ============================================

export type TeeTimeMode = 'staggered' | 'shotgun' | 'wave' | 'custom';

export interface TeeTimeSlot {
    id: UUID;
    sessionId: UUID;
    matchId?: UUID;
    time: ISODateString;
    startingHole: number; // 1 for regular, varies for shotgun
    groupName?: string;
    notes?: string;
}

export interface TeeTimeGeneratorConfig {
    mode: TeeTimeMode;
    firstTeeTime: string; // HH:mm format
    intervalMinutes: number;
    reverseOrder?: boolean;
    shotgunHoles?: number[]; // For shotgun starts
    waveConfig?: {
        waveName: string;
        startTime: string;
        matchIds: UUID[];
    }[];
}

export interface GeneratedTeeSheet {
    sessionId: UUID;
    slots: TeeTimeSlot[];
    totalDuration: number; // minutes
    firstTeeTime: string;
    lastTeeTime: string;
}

// ============================================
// DRAFT MODE
// ============================================

export type DraftType = 'snake' | 'auction' | 'random' | 'captain_pick';
export type DraftStatus = 'setup' | 'in_progress' | 'completed' | 'cancelled';

export interface DraftConfig {
    id: UUID;
    tripId: UUID;
    type: DraftType;
    status: DraftStatus;
    roundCount: number;
    pickTimeSeconds?: number; // Time limit per pick
    auctionBudget?: number; // For auction draft
    draftOrder: UUID[]; // Captain IDs in pick order
    snakeReverse: boolean;
    createdAt: ISODateString;
}

export interface DraftPick {
    id: UUID;
    draftId: UUID;
    round: number;
    pickNumber: number;
    captainId: UUID;
    teamId: UUID;
    playerId: UUID;
    auctionPrice?: number;
    timestamp: ISODateString;
}

export interface DraftState {
    config: DraftConfig;
    picks: DraftPick[];
    currentRound: number;
    currentPick: number;
    currentCaptainId: UUID;
    availablePlayers: Player[];
    teamARoster: Player[];
    teamBRoster: Player[];
    timeRemaining?: number;
}

// ============================================
// COMMUNICATION HUB
// ============================================

export type MessageTargetType = 'all' | 'team_a' | 'team_b' | 'captains' | 'specific';

export interface MessageTemplate {
    id: string;
    name: string;
    title: string;
    message: string;
    category: 'lineup' | 'schedule' | 'reminder' | 'results' | 'general';
    icon: string;
    variables?: string[]; // Placeholders like {{sessionName}}
}

export interface CaptainMessage {
    id: UUID;
    tripId: UUID;
    title: string;
    message: string;
    targetType: MessageTargetType;
    targetPlayerIds?: UUID[];
    priority: 'normal' | 'urgent';
    sentAt: ISODateString;
    readBy: UUID[];
    createdBy: UUID;
}

export interface ReadReceipt {
    messageId: UUID;
    playerId: UUID;
    readAt: ISODateString;
    device?: string;
}

export interface MessageStats {
    totalSent: number;
    totalRead: number;
    readRate: number;
    unreadPlayerIds: UUID[];
}

// ============================================
// WEATHER INTEGRATION
// ============================================

export interface WeatherForecast {
    date: ISODateString;
    timeSlot: 'AM' | 'PM';
    temperature: {
        high: number;
        low: number;
        unit: 'F' | 'C';
    };
    conditions: string;
    icon: string;
    precipitation: {
        chance: number;
        type?: 'rain' | 'snow' | 'mixed';
    };
    wind: {
        speed: number;
        direction: string;
        gusts?: number;
    };
    humidity: number;
    uvIndex: number;
    sunrise?: string;
    sunset?: string;
}

export interface WeatherAlert {
    id: string;
    type: 'watch' | 'warning' | 'advisory';
    title: string;
    description: string;
    severity: 'minor' | 'moderate' | 'severe';
    startTime: ISODateString;
    endTime: ISODateString;
}

export interface SessionWeather {
    sessionId: UUID;
    forecast: WeatherForecast;
    alerts: WeatherAlert[];
    recommendation: 'go' | 'monitor' | 'delay' | 'cancel';
    lastUpdated: ISODateString;
}

// ============================================
// SIDE BETS & BUDGET
// ============================================

export type SideGameType = 'skins' | 'nassau' | 'kp' | 'long_drive' | 'bingo_bango_bongo' | 'wolf' | 'custom';
export type SideGameScoringMode = 'gross' | 'net';

export interface SideGame {
    id: UUID;
    tripId: UUID;
    sessionId?: UUID;
    type: SideGameType;
    name: string;
    buyIn: number;
    scoringMode: SideGameScoringMode;
    playerIds: UUID[];
    status: 'setup' | 'active' | 'completed';
    config: Record<string, unknown>; // Type-specific config
    createdAt: ISODateString;
}

export interface SkinsConfig {
    carryOver: boolean;
    doublesAfterCarry: boolean;
    holesIncluded: number[]; // Which holes count
}

export interface NassauConfig {
    frontNineValue: number;
    backNineValue: number;
    overallValue: number;
    autoPressAt: number;
    maxPresses: number;
}

export interface SideGameEntry {
    id: UUID;
    sideGameId: UUID;
    playerId: UUID;
    holeNumber?: number;
    value: number; // Points or money
    description: string;
    timestamp: ISODateString;
}

export interface SideGameStandings {
    gameId: UUID;
    standings: {
        playerId: UUID;
        playerName: string;
        winnings: number;
        entries: number;
    }[];
    totalPot: number;
}

// Budget tracking
export interface TripExpense {
    id: UUID;
    tripId: UUID;
    category: 'green_fees' | 'carts' | 'meals' | 'lodging' | 'prizes' | 'other';
    description: string;
    amount: number;
    paidBy: UUID;
    splitAmong: UUID[];
    splitType: 'equal' | 'custom';
    customSplits?: { playerId: UUID; amount: number }[];
    date: ISODateString;
    receipt?: string; // URL to receipt image
}

export interface PlayerBalance {
    playerId: UUID;
    playerName: string;
    totalPaid: number;
    totalOwed: number;
    netBalance: number; // Positive = owed money, negative = owes money
}

export interface SettlementSummary {
    tripId: UUID;
    totalExpenses: number;
    perPlayerShare: number;
    balances: PlayerBalance[];
    settlements: {
        fromPlayerId: UUID;
        toPlayerId: UUID;
        amount: number;
    }[];
}

// ============================================
// AWARDS & STATISTICS
// ============================================

export type AwardType =
    | 'mvp'                    // Most points
    | 'iron_man'              // Most matches played
    | 'clutch_performer'      // Won deciding match
    | 'hot_streak'            // Best single session
    | 'consistent'            // Best win percentage
    | 'comeback_kid'          // Biggest comeback win
    | 'halve_master'          // Most halved matches
    | 'best_partner'          // Best record as partner
    | 'giant_killer'          // Beat higher ranked opponent
    | 'anchor'                // Most losses (fun award)
    | 'close_call'            // Most matches decided on 18
    | 'dormie_escape';        // Came back from dormie

export interface TripAward {
    id: UUID;
    tripId: UUID;
    type: AwardType;
    playerId: UUID;
    playerName: string;
    value: string; // "3.5 points", "4-1-0 record"
    description: string;
    rank?: number; // For leaderboard awards
    calculatedAt: ISODateString;
}

export interface PlayerStatistics {
    playerId: UUID;
    tripId: UUID;
    // Overall record
    matchesPlayed: number;
    wins: number;
    losses: number;
    halves: number;
    points: number;
    winPercentage: number;
    // By format
    singlesRecord: { w: number; l: number; h: number };
    foursomesRecord: { w: number; l: number; h: number };
    fourballRecord: { w: number; l: number; h: number };
    // Advanced stats
    holesWon: number;
    holesLost: number;
    holesHalved: number;
    biggestWin: number; // Margin
    comebacks: number; // Times came back from 2+ down
    closingRate: number; // % of matches closed when 2+ up
    // Partnership stats
    bestPartner?: { playerId: UUID; record: string };
    worstMatchup?: { playerId: UUID; record: string };
}

export interface TripRecords {
    tripId: UUID;
    records: {
        type: string;
        description: string;
        playerId: UUID;
        playerName: string;
        value: string;
        matchId?: UUID;
    }[];
}

// ============================================
// SPECTATOR MODE
// ============================================

export interface SpectatorView {
    tripId: UUID;
    tripName: string;
    teamA: { name: string; points: number; color: string };
    teamB: { name: string; points: number; color: string };
    pointsToWin: number;
    currentStatus: 'upcoming' | 'live' | 'completed';
    liveMatches: SpectatorMatch[];
    recentResults: SpectatorMatch[];
    magicNumber?: {
        team: 'A' | 'B';
        points: number;
    };
}

export interface SpectatorMatch {
    id: UUID;
    sessionName: string;
    teamAPlayers: string; // "J. Smith & M. Jones"
    teamBPlayers: string;
    status: MatchStatus;
    currentScore: string; // "2 UP", "AS", "3&2"
    thruHole: number;
    result?: string;
}

// ============================================
// HISTORICAL ARCHIVE
// ============================================

export interface TripArchive {
    id: UUID;
    tripId: UUID;
    tripName: string;
    year: number;
    winner: 'A' | 'B' | 'tie';
    winningTeamName: string;
    finalScore: string; // "15.5 - 12.5"
    mvpPlayerId: UUID;
    mvpName: string;
    highlights: string[];
    archivedAt: ISODateString;
}

export interface PlayerCareerStats {
    playerId: UUID;
    playerName: string;
    tripsPlayed: number;
    totalMatches: number;
    totalWins: number;
    totalLosses: number;
    totalHalves: number;
    totalPoints: number;
    cupWins: number;
    mvpAwards: number;
    byYear: {
        year: number;
        tripId: UUID;
        record: string;
        points: number;
    }[];
}

export interface RivalryRecord {
    player1Id: UUID;
    player1Name: string;
    player2Id: UUID;
    player2Name: string;
    totalMatches: number;
    player1Wins: number;
    player2Wins: number;
    halves: number;
    lastMatch: ISODateString;
    matchHistory: {
        tripId: UUID;
        year: number;
        result: 'player1' | 'player2' | 'halved';
        score: string;
    }[];
}

// ============================================
// SESSION LOCKING & AUDIT
// ============================================

export type LockReason =
    | 'scoring_started'
    | 'lineup_published'
    | 'captain_locked'
    | 'match_completed';

export interface SessionLock {
    sessionId: UUID;
    isLocked: boolean;
    lockedAt?: ISODateString;
    lockedBy?: UUID;
    lockReason?: LockReason;
    autoLocked: boolean;
}

export interface AuditLogFilter {
    tripId: UUID;
    startDate?: ISODateString;
    endDate?: ISODateString;
    actionTypes?: string[];
    actorName?: string;
    entityId?: UUID;
}

export interface AuditLogSummary {
    totalActions: number;
    byType: Record<string, number>;
    byActor: Record<string, number>;
    recentActions: {
        timestamp: ISODateString;
        action: string;
        actor: string;
        summary: string;
    }[];
}

// ============================================
// BACKUP & EXPORT
// ============================================

export interface TripBackup {
    schemaVersion: number;
    exportedAt: ISODateString;
    exportedBy: string;
    trip: {
        id: UUID;
        name: string;
        startDate: ISODateString;
        endDate: ISODateString;
        location?: string;
    };
    players: Player[];
    teams: unknown[];
    sessions: unknown[];
    matches: unknown[];
    holeResults: unknown[];
    courses: unknown[];
    awards?: TripAward[];
    sideGames?: SideGame[];
    checksum: string;
}

export interface BackupRestoreResult {
    success: boolean;
    tripId?: UUID;
    itemsRestored: {
        players: number;
        sessions: number;
        matches: number;
        courses: number;
    };
    warnings: string[];
    errors: string[];
}

export interface ExportFormat {
    type: 'json' | 'pdf' | 'csv' | 'image';
    options: {
        includeScores?: boolean;
        includePhotos?: boolean;
        includeSideGames?: boolean;
        includeAuditLog?: boolean;
    };
}
