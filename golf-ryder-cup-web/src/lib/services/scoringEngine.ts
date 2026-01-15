/**
 * Scoring Engine Service
 *
 * Handles match scoring logic for Ryder Cup style match play:
 * - Hole-by-hole score tracking
 * - Match state calculation (up/down/AS)
 * - Dormie detection (can't lose with remaining holes)
 * - Closeout detection (match decided)
 * - Undo support via event sourcing
 *
 * Ported from Swift: ScoringEngine.swift
 */

import type {
    Match,
    HoleResult,
    HoleWinner,
    MatchStatus,
    MatchResultType,
    TeamMember,
    HoleResultEdit,
} from '../types/models';
import { ScoringEventType, type ScoringEvent, type HoleScoredPayload, type HoleEditedPayload, type HoleUndonePayload } from '../types/events';
import type { MatchState } from '../types/computed';
import { db } from '../db';

// ============================================
// CONSTANTS
// ============================================

const TOTAL_HOLES = 18;

// ============================================
// MATCH STATE CALCULATION
// ============================================

/**
 * Calculate the current state of a match from hole results.
 *
 * Match state includes:
 * - Score (e.g., "2 UP", "AS", "3 DN")
 * - Holes played
 * - Whether dormie (can't lose)
 * - Whether match is closed out
 * - Projected result
 *
 * @param match - The match to calculate state for
 * @param holeResults - Array of hole results for this match
 * @returns Calculated match state
 */
export function calculateMatchState(
    match: Match,
    holeResults: HoleResult[]
): MatchState {
    // Sort hole results by hole number
    const sortedResults = [...holeResults].sort((a, b) => a.holeNumber - b.holeNumber);

    // Calculate running total
    let teamAHolesWon = 0;
    let teamBHolesWon = 0;
    let holesPlayed = 0;

    for (const result of sortedResults) {
        if (result.winner === 'teamA') {
            teamAHolesWon++;
            holesPlayed++;
        } else if (result.winner === 'teamB') {
            teamBHolesWon++;
            holesPlayed++;
        } else if (result.winner === 'halved') {
            holesPlayed++;
        }
        // Skip 'none' (not yet recorded)
    }

    const currentScore = teamAHolesWon - teamBHolesWon;
    const holesRemaining = TOTAL_HOLES - holesPlayed;

    // Dormie: ahead by exactly the number of holes remaining
    const isDormieTeamA = currentScore > 0 && currentScore === holesRemaining;
    const isDormieTeamB = currentScore < 0 && Math.abs(currentScore) === holesRemaining;
    const isDormie = isDormieTeamA || isDormieTeamB;

    // Closed out: lead is greater than holes remaining
    const isClosedOut = Math.abs(currentScore) > holesRemaining;

    // Determine status
    let status: MatchStatus = 'scheduled';
    if (holesPlayed > 0) {
        status = isClosedOut ? 'completed' : 'inProgress';
    }
    // Only mark as completed if all holes have actual results (not 'none')
    const actualScoredHoles = sortedResults.filter(r => r.winner !== 'none').length;
    if (actualScoredHoles === TOTAL_HOLES && !isClosedOut) {
        status = 'completed';
    }

    return {
        match,
        holeResults: sortedResults,
        currentScore,
        teamAHolesWon,
        teamBHolesWon,
        holesPlayed,
        holesRemaining,
        isDormie,
        isClosedOut,
        status,
        displayScore: formatMatchScore(currentScore, holesRemaining, isClosedOut, holesPlayed),
        winningTeam: determineWinningTeam(currentScore, holesPlayed, holesRemaining),
    };
}

/**
 * Format match score for display.
 *
 * @param score - Current score differential (positive = Team A leads)
 * @param holesRemaining - Number of holes left
 * @param isClosedOut - Whether match is over
 * @param holesPlayed - Number of holes completed
 * @returns Formatted score string (e.g., "2 UP", "3&2", "AS")
 */
export function formatMatchScore(
    score: number,
    holesRemaining: number,
    isClosedOut: boolean,
    holesPlayed: number
): string {
    if (holesPlayed === 0) {
        return 'AS'; // All Square before match starts
    }

    if (score === 0) {
        return 'AS'; // All Square
    }

    const absScore = Math.abs(score);

    if (isClosedOut) {
        // Final result format: "3&2" means won 3 up with 2 to play
        return `${absScore}&${holesRemaining}`;
    }

    // In progress format
    return `${absScore} ${score > 0 ? 'UP' : 'DN'}`;
}

/**
 * Determine which team is winning or won.
 *
 * @param score - Current score (positive = Team A leads)
 * @param holesPlayed - Holes completed
 * @param holesRemaining - Holes remaining
 * @returns 'teamA' | 'teamB' | 'halved' | null
 */
function determineWinningTeam(
    score: number,
    holesPlayed: number,
    holesRemaining: number
): 'teamA' | 'teamB' | 'halved' | null {
    if (holesPlayed === 0) return null;

    const isClosedOut = Math.abs(score) > holesRemaining;
    const isComplete = holesRemaining === 0 || isClosedOut;

    if (!isComplete) {
        // Match in progress - return current leader
        if (score > 0) return 'teamA';
        if (score < 0) return 'teamB';
        return null;
    }

    // Match complete
    if (score > 0) return 'teamA';
    if (score < 0) return 'teamB';
    return 'halved';
}

// ============================================
// HOLE RESULT MANAGEMENT
// ============================================

/**
 * Record a hole result for a match.
 * Creates event for undo capability.
 *
 * @param matchId - The match ID
 * @param holeNumber - Hole number (1-18)
 * @param winner - Who won the hole
 * @param teamAScore - Optional Team A stroke score
 * @param teamBScore - Optional Team B stroke score
 * @param scoredBy - ID of the user recording the score
 * @param editReason - Optional reason for edit (required for captain overrides)
 * @param isCaptainOverride - Whether this is a captain override (P0-4)
 * @returns The created hole result
 */
export async function recordHoleResult(
    matchId: string,
    holeNumber: number,
    winner: HoleWinner,
    teamAScore?: number,
    teamBScore?: number,
    scoredBy?: string,
    editReason?: string,
    isCaptainOverride?: boolean
): Promise<HoleResult> {
    // Check for existing result
    const existing = await db.holeResults
        .where({ matchId, holeNumber })
        .first();

    const now = new Date().toISOString();

    // P0-4: Build audit trail for edits
    let editHistory: HoleResultEdit[] = existing?.editHistory || [];
    if (existing && existing.winner !== winner) {
        const editEntry: HoleResultEdit = {
            editedAt: now,
            editedBy: scoredBy || 'unknown',
            previousWinner: existing.winner,
            newWinner: winner,
            reason: editReason,
            isCaptainOverride,
        };
        editHistory = [...editHistory, editEntry];
    }

    const result: HoleResult = {
        id: existing?.id || crypto.randomUUID(),
        matchId,
        holeNumber,
        winner,
        teamAScore,
        teamBScore,
        scoredBy: existing ? existing.scoredBy : scoredBy, // Keep original scorer
        timestamp: existing?.timestamp || now, // Keep original timestamp
        // P0-4: Audit fields
        lastEditedBy: existing ? scoredBy : undefined,
        lastEditedAt: existing ? now : undefined,
        editReason: existing ? editReason : undefined,
        editHistory: editHistory.length > 0 ? editHistory : undefined,
    };

    // Save to database
    await db.holeResults.put(result);

    // Record scoring event for undo
    const payload = existing
        ? {
            type: 'hole_edited' as const,
            holeNumber,
            previousWinner: existing.winner,
            newWinner: winner,
            previousTeamAStrokes: existing.teamAScore,
            previousTeamBStrokes: existing.teamBScore,
            newTeamAStrokes: teamAScore,
            newTeamBStrokes: teamBScore,
        }
        : {
            type: 'hole_scored' as const,
            holeNumber,
            winner,
            teamAStrokes: teamAScore,
            teamBStrokes: teamBScore,
        };

    const event: ScoringEvent = {
        id: crypto.randomUUID(),
        eventType: existing ? ScoringEventType.HoleEdited : ScoringEventType.HoleScored,
        matchId,
        timestamp: now,
        actorName: scoredBy || 'unknown',
        payload,
        synced: false,
    };

    await db.scoringEvents.add(event);

    return result;
}

/**
 * Undo the last scoring action for a match.
 *
 * @param matchId - The match ID
 * @returns true if undo was successful
 */
export async function undoLastScore(matchId: string): Promise<boolean> {
    // Get the most recent event for this match
    const events = await db.scoringEvents
        .where('matchId')
        .equals(matchId)
        .reverse()
        .sortBy('timestamp');

    if (events.length === 0) {
        return false;
    }

    const lastEvent = events[0];

    if (lastEvent.eventType === ScoringEventType.HoleScored || lastEvent.eventType === ScoringEventType.HoleEdited) {
        const payload = lastEvent.payload as HoleScoredPayload | HoleEditedPayload;
        const holeNumber = payload.holeNumber;

        if (payload.type === 'hole_edited') {
            const editPayload = payload as HoleEditedPayload;
            // Revert to previous state
            await db.holeResults
                .where({ matchId, holeNumber })
                .modify({
                    winner: editPayload.previousWinner,
                    teamAScore: editPayload.previousTeamAStrokes,
                    teamBScore: editPayload.previousTeamBStrokes,
                });
        } else {
            // Delete the result (it was newly created)
            await db.holeResults
                .where({ matchId, holeNumber })
                .delete();
        }

        // Record the undo event
        const undoPayload: HoleUndonePayload = {
            type: 'hole_undone',
            holeNumber,
            previousWinner: payload.type === 'hole_edited'
                ? (payload as HoleEditedPayload).previousWinner
                : (payload as HoleScoredPayload).winner,
            previousTeamAStrokes: payload.type === 'hole_edited'
                ? (payload as HoleEditedPayload).previousTeamAStrokes
                : (payload as HoleScoredPayload).teamAStrokes,
            previousTeamBStrokes: payload.type === 'hole_edited'
                ? (payload as HoleEditedPayload).previousTeamBStrokes
                : (payload as HoleScoredPayload).teamBStrokes,
        };

        const undoEvent: ScoringEvent = {
            id: crypto.randomUUID(),
            eventType: ScoringEventType.HoleUndone,
            matchId,
            timestamp: new Date().toISOString(),
            actorName: 'user',
            payload: undoPayload,
            synced: false,
        };

        await db.scoringEvents.add(undoEvent);

        // Delete the original event
        await db.scoringEvents.delete(lastEvent.id);

        return true;
    }

    return false;
}

/**
 * Get the current hole for scoring (first unscored hole).
 *
 * @param matchId - The match ID
 * @returns Next hole number to score, or null if complete
 */
export async function getCurrentHole(matchId: string): Promise<number | null> {
    const results = await db.holeResults
        .where('matchId')
        .equals(matchId)
        .toArray();

    const scoredHoles = new Set(
        results
            .filter(r => r.winner !== 'none')
            .map(r => r.holeNumber)
    );

    for (let hole = 1; hole <= TOTAL_HOLES; hole++) {
        if (!scoredHoles.has(hole)) {
            return hole;
        }
    }

    return null; // All holes scored
}

// ============================================
// MATCH RESULT CALCULATION
// ============================================

/**
 * Calculate the match result type when match is complete.
 *
 * @param matchState - Current match state
 * @returns Match result type
 */
export function calculateMatchResult(matchState: MatchState): MatchResultType {
    if (!matchState.isClosedOut && matchState.holesRemaining > 0) {
        return 'incomplete';
    }

    if (matchState.currentScore === 0) {
        return 'halved';
    }

    const absScore = Math.abs(matchState.currentScore);
    const holesRemaining = matchState.holesRemaining;

    // Special cases
    if (holesRemaining === 0 && absScore === 1) {
        return 'oneUp'; // Won 1-up on 18th
    }

    // Standard closed out result
    // e.g., 3&2 means won by 3 with 2 holes remaining
    // Convert to result type (we'll use the score for display)
    switch (absScore) {
        case 1: return 'oneUp';
        case 2: return holesRemaining >= 1 ? 'twoAndOne' : 'incomplete';
        case 3: return holesRemaining >= 2 ? 'threeAndTwo' : 'incomplete';
        case 4: return holesRemaining >= 3 ? 'fourAndThree' : 'incomplete';
        case 5: return holesRemaining >= 4 ? 'fiveAndFour' : 'incomplete';
        default: return 'sixAndFive'; // Larger wins
    }
}

/**
 * Format the final match result for display.
 *
 * @param matchState - Final match state
 * @param teamAName - Team A name (for display)
 * @param teamBName - Team B name (for display)
 * @returns Formatted result string
 */
export function formatFinalResult(
    matchState: MatchState,
    teamAName: string,
    teamBName: string
): string {
    if (matchState.currentScore === 0 && matchState.holesRemaining === 0) {
        return 'Match Halved';
    }

    const winner = matchState.currentScore > 0 ? teamAName : teamBName;
    return `${winner} won ${matchState.displayScore}`;
}

// ============================================
// DORMIE & CLOSEOUT HELPERS
// ============================================

/**
 * Check if a team is dormie (can't lose).
 *
 * @param score - Current score differential
 * @param holesRemaining - Holes left to play
 * @returns Object indicating dormie status for each team
 */
export function checkDormie(
    score: number,
    holesRemaining: number
): { teamADormie: boolean; teamBDormie: boolean } {
    return {
        teamADormie: score > 0 && score === holesRemaining,
        teamBDormie: score < 0 && Math.abs(score) === holesRemaining,
    };
}

/**
 * Check if a score would close out the match.
 *
 * @param currentScore - Current score differential
 * @param holesRemaining - Holes remaining before this hole
 * @param proposedWinner - Who would win this hole
 * @returns Whether recording this would end the match
 */
export function wouldCloseOut(
    currentScore: number,
    holesRemaining: number,
    proposedWinner: HoleWinner
): boolean {
    if (proposedWinner === 'halved' || proposedWinner === 'none') {
        // A halve can close out if already dormie
        return Math.abs(currentScore) > holesRemaining - 1;
    }

    let newScore = currentScore;
    if (proposedWinner === 'teamA') {
        newScore++;
    } else if (proposedWinner === 'teamB') {
        newScore--;
    }

    return Math.abs(newScore) > holesRemaining - 1;
}

// ============================================
// POINTS CALCULATION
// ============================================

/**
 * Calculate points earned from match result.
 *
 * Standard Ryder Cup scoring:
 * - Win: 1 point
 * - Halve: 0.5 points each
 * - Loss: 0 points
 *
 * @param matchState - Final match state
 * @returns Points for Team A and Team B
 */
export function calculateMatchPoints(matchState: MatchState): {
    teamAPoints: number;
    teamBPoints: number;
} {
    if (matchState.holesRemaining > 0 && !matchState.isClosedOut) {
        // Match incomplete
        return { teamAPoints: 0, teamBPoints: 0 };
    }

    if (matchState.currentScore === 0) {
        // Halved
        return { teamAPoints: 0.5, teamBPoints: 0.5 };
    }

    if (matchState.currentScore > 0) {
        // Team A won
        return { teamAPoints: 1, teamBPoints: 0 };
    }

    // Team B won
    return { teamAPoints: 0, teamBPoints: 1 };
}

// ============================================
// MATCH CREATION HELPERS
// ============================================

/**
 * Create a new match with proper initialization.
 *
 * @param sessionId - Session this match belongs to
 * @param matchNumber - Order within the session (1, 2, 3...)
 * @param teamAPlayers - Team A player IDs
 * @param teamBPlayers - Team B player IDs
 * @returns Created match
 */
export async function createMatch(
    sessionId: string,
    matchNumber: number,
    teamAPlayers: string[],
    teamBPlayers: string[]
): Promise<Match> {
    const now = new Date().toISOString();
    const match: Match = {
        id: crypto.randomUUID(),
        sessionId,
        matchOrder: matchNumber,
        teamAPlayerIds: teamAPlayers,
        teamBPlayerIds: teamBPlayers,
        status: 'scheduled',
        currentHole: 1,
        teamAHandicapAllowance: 0,
        teamBHandicapAllowance: 0,
        result: 'notFinished',
        margin: 0,
        holesRemaining: 18,
        createdAt: now,
        updatedAt: now,
    };

    await db.matches.add(match);
    return match;
}

/**
 * Update match status and winner when completed.
 *
 * @param matchId - The match to finalize
 */
export async function finalizeMatch(matchId: string): Promise<void> {
    const match = await db.matches.get(matchId);
    if (!match) return;

    const holeResults = await db.holeResults
        .where('matchId')
        .equals(matchId)
        .toArray();

    const matchState = calculateMatchState(match, holeResults);

    if (matchState.isClosedOut || matchState.holesRemaining === 0) {
        const points = calculateMatchPoints(matchState);
        const resultType = calculateMatchResult(matchState);

        await db.matches.update(matchId, {
            status: 'completed',
            result: resultType,
            margin: Math.abs(matchState.currentScore),
            holesRemaining: matchState.holesRemaining,
            updatedAt: new Date().toISOString(),
        });
    }
}

// ============================================
// SCORING ENGINE OBJECT
// ============================================

/**
 * Scoring Engine service object.
 * Groups all functions for easier importing.
 */
export const ScoringEngine = {
    // Match state
    calculateMatchState,
    formatMatchScore,

    // Hole results
    recordHoleResult,
    undoLastScore,
    getCurrentHole,

    // Match results
    calculateMatchResult,
    formatFinalResult,
    calculateMatchPoints,

    // Helpers
    checkDormie,
    wouldCloseOut,

    // Match management
    createMatch,
    finalizeMatch,
};

export default ScoringEngine;
