/**
 * Computed/ViewModel types for the UI layer
 */

import { UUID, Player, HoleWinner, Match, HoleResult, MatchStatus } from './models';

// ============================================
// MATCH STATE (from ScoringEngine)
// ============================================

/**
 * Match state - computed from hole results by the scoring engine
 */
export interface MatchState {
    /** The match this state is for */
    match: Match;
    /** Sorted hole results for this match */
    holeResults: HoleResult[];
    /** Current score: positive = Team A leading, negative = Team B leading */
    currentScore: number;
    /** Holes won by Team A */
    teamAHolesWon: number;
    /** Holes won by Team B */
    teamBHolesWon: number;
    /** Number of holes completed */
    holesPlayed: number;
    /** Number of holes remaining */
    holesRemaining: number;
    /** Dormie: up by exactly the number of holes remaining */
    isDormie: boolean;
    /** Closed out: up by more holes than remain */
    isClosedOut: boolean;
    /** Match status */
    status: MatchStatus;
    /** Human-readable score display (e.g., "2 UP", "3&2", "AS") */
    displayScore: string;
    /** Team currently winning, if any (null if halved or not started) */
    winningTeam: 'teamA' | 'teamB' | 'halved' | null;
}

// ============================================
// STANDINGS
// ============================================

/**
 * Team standings in the tournament
 */
export interface TeamStandings {
    teamId?: UUID;
    teamName?: string;
    colorHex?: string;
    totalPoints?: number;
    matchesWon?: number;
    matchesLost?: number;
    matchesHalved?: number;
    matchesPlayed: number;
    matchesRemaining: number;
    /** Points for Team A (USA) */
    teamAPoints: number;
    /** Points for Team B (Europe) */
    teamBPoints: number;
    /** Projected points for Team A */
    teamAProjected?: number;
    /** Projected points for Team B */
    teamBProjected?: number;
    /** Total matches completed */
    matchesCompleted: number;
    /** Total matches in tournament */
    totalMatches: number;
    /** Which team is leading */
    leader: 'teamA' | 'teamB' | null;
    /** Point margin between teams */
    margin: number;
    /** Remaining matches count */
    remainingMatches: number;
}

/**
 * Player leaderboard entry
 */
export interface PlayerLeaderboard {
    playerId: UUID;
    playerName: string;
    teamId: UUID;
    teamName: string;
    points: number;
    wins: number;
    losses: number;
    halves: number;
    /** Formatted record, e.g., "3-1-1" */
    record?: string;
    matchesPlayed: number;
}

/**
 * Magic number calculation for clinching
 */
export interface MagicNumber {
    /** Points Team A needs to clinch */
    teamA: number;
    /** Points Team B needs to clinch */
    teamB: number;
    /** Points Team A needs to clinch */
    teamANeeded: number;
    /** Points Team B needs to clinch */
    teamBNeeded: number;
    /** Has Team A clinched? */
    teamAClinched: boolean;
    /** Has Team B clinched? */
    teamBClinched: boolean;
    /** Can Team A clinch? */
    teamACanClinch?: boolean;
    /** Can Team B clinch? */
    teamBCanClinch?: boolean;
    /** Total points needed to clinch */
    pointsToWin: number;
    /** Remaining points available */
    remainingPoints?: number;
    /** Has either team clinched? */
    hasClinched: boolean;
    /** Which team has clinched (if any) */
    clinchingTeam?: 'A' | 'B';
}

// ============================================
// LINEUP BUILDER
// ============================================

/**
 * A suggested pairing for a match
 */
export interface SuggestedPairing {
    teamAPlayers: Player[];
    teamBPlayers: Player[];
    handicapDifference: number;
    /** How many times these players have been paired as partners */
    repeatPairingScore: number;
    /** How many times these opponents have faced each other */
    repeatOpponentScore: number;
}

/**
 * Fairness driver explaining a fairness impact
 */
export interface FairnessDriver {
    id: string;
    factor: string;
    impact: string;
    severity: 'low' | 'medium' | 'high';
}

/**
 * Fairness score with explainability
 */
export interface FairnessScore {
    /** Score from 0-100, 100 is perfectly fair */
    score?: number;
    /** Overall score (alias for score) */
    overallScore?: number;
    /** Match distribution score */
    matchScore?: number;
    /** Session distribution score */
    sessionScore?: number;
    /** Match disparity */
    matchDisparity?: number;
    /** Session disparity */
    sessionDisparity?: number;
    /** Strokes advantage: positive = Team A advantage */
    strokesAdvantage?: number;
    /** Which team has the advantage (if any) */
    advantageTeam?: string;
    /** Factors explaining the fairness score */
    drivers?: FairnessDriver[];
    /** Suggestions for improvement */
    suggestions?: string[];
    /** Player fairness breakdown */
    playerFairness?: Array<{
        playerId: string;
        playerName: string;
        matchesPlayed: number;
        sessionsPlayed: number;
        expectedMatches: number;
    }>;
}

/**
 * Auto-fill result from lineup service
 */
export interface AutoFillResult {
    pairings: SuggestedPairing[];
    fairnessScore: FairnessScore;
    warnings: string[];
}

// ============================================
// HOLE SCORING
// ============================================

/**
 * Current hole state for scoring UI
 */
export interface CurrentHoleState {
    holeNumber: number;
    par: number;
    handicapRank: number;
    yardage?: number;
    /** Current result for this hole (if scored) */
    currentResult?: HoleWinner;
    /** Strokes Team A receives on this hole */
    teamAStrokes: number;
    /** Strokes Team B receives on this hole */
    teamBStrokes: number;
}

/**
 * Hole result display for hole navigator
 */
export interface HoleResultDisplay {
    holeNumber: number;
    winner: HoleWinner | null;
    isCurrentHole: boolean;
}

// ============================================
// SESSION DISPLAY
// ============================================

/**
 * Session with computed status
 */
export interface SessionDisplay {
    id: UUID;
    name: string;
    displayTitle: string;
    sessionType: string;
    scheduledDate: string;
    timeSlot: 'AM' | 'PM';
    isLocked: boolean;
    matchCount: number;
    completedMatchCount: number;
    inProgressMatchCount: number;
    teamAPoints: number;
    teamBPoints: number;
    status: 'upcoming' | 'in_progress' | 'completed';
}

// ============================================
// MATCH DISPLAY
// ============================================

/**
 * Match with player names and display info
 */
export interface MatchDisplay {
    id: UUID;
    matchOrder: number;
    status: string;
    statusDisplay: string;
    teamAPlayerNames: string[];
    teamBPlayerNames: string[];
    teamAHandicapAllowance: number;
    teamBHandicapAllowance: number;
    currentHole: number;
    matchState: MatchState | null;
    result: string;
    resultDisplay: string;
}

// ============================================
// HOME PAGE
// ============================================

/**
 * Next up card data
 */
export interface NextUpCard {
    sessionId: UUID;
    sessionName: string;
    sessionType: string;
    scheduledDate: string;
    timeSlot: 'AM' | 'PM';
    /** Time until session starts (formatted) */
    timeUntil: string;
    /** Player's match in this session (if any) */
    playerMatch?: {
        matchId: UUID;
        partnerName?: string;
        opponentNames: string[];
        courseName?: string;
    };
}

/**
 * Live match card data
 */
export interface LiveMatchCard {
    matchId: UUID;
    matchOrder: number;
    sessionName: string;
    teamAPlayerNames: string[];
    teamBPlayerNames: string[];
    matchState: MatchState;
    currentHole: number;
}

// ============================================
// COURSE WIZARD
// ============================================

export enum WizardStep {
    BasicInfo = 0,
    TeeSetBasics = 1,
    HolePars = 2,
    HoleHandicaps = 3,
    Review = 4,
}

export interface WizardStepInfo {
    step: WizardStep;
    title: string;
    description: string;
    isComplete: boolean;
    isOptional: boolean;
}

// ============================================
// VALIDATION
// ============================================

export interface ValidationError {
    field: string;
    message: string;
    isBlocking: boolean;
}

export interface ValidationWarning {
    field: string;
    message: string;
    suggestion?: string;
}

export interface ValidationResult {
    isValid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}
