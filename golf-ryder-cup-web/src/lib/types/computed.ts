/**
 * Computed/ViewModel types for the UI layer
 */

import { UUID, Player, HoleWinner } from './models';

// ============================================
// MATCH STATE (from ScoringEngine)
// ============================================

/**
 * Match state summary - computed from hole results
 */
export interface MatchState {
    /** Match score: positive = Team A leading, negative = Team B leading */
    matchScore: number;
    holesPlayed: number;
    holesRemaining: number;
    /** Dormie: up by exactly the number of holes remaining */
    isDormie: boolean;
    /** Closed out: up by more holes than remain */
    isClosedOut: boolean;
    /** Human-readable status (e.g., "Team A 2 UP through 6") */
    statusText: string;
    /** Whether more holes can be played */
    canContinue: boolean;
}

// ============================================
// STANDINGS
// ============================================

/**
 * Team standings in the tournament
 */
export interface TeamStandings {
    teamId: UUID;
    teamName: string;
    colorHex?: string;
    totalPoints: number;
    matchesWon: number;
    matchesLost: number;
    matchesHalved: number;
    matchesPlayed: number;
    matchesRemaining: number;
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
    record: string;
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
    /** Total points needed to clinch */
    pointsToWin: number;
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
    score: number;
    /** Strokes advantage: positive = Team A advantage */
    strokesAdvantage: number;
    /** Which team has the advantage (if any) */
    advantageTeam?: string;
    /** Factors explaining the fairness score */
    drivers: FairnessDriver[];
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
