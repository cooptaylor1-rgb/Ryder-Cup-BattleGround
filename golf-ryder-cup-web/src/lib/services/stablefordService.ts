/**
 * Stableford Scoring Service
 *
 * Handles Stableford point calculations for individual and team play.
 * Supports both standard USGA and modified (PGA Tour Champions) scoring.
 */

import type { Player, TeeSet } from '../types/models';
import {
    calculateStablefordPoints,
    type StablefordHoleScore,
    type StablefordRoundScore,
    type ScoringMode,
} from '../types/scoringFormats';

// ============================================
// TYPES
// ============================================

export interface StablefordConfig {
    useModifiedScoring: boolean;  // Modified = PGA Tour style
    scoringMode: ScoringMode;     // 'gross' or 'net'
    teamFormat: 'individual' | 'bestBall' | 'combined';
}

export interface StablefordPlayer {
    player: Player;
    courseHandicap: number;
    strokesPerHole: number[];  // Array of 18 strokes given per hole
}

export interface StablefordLeaderboardEntry {
    playerId: string;
    playerName: string;
    teamId?: string;
    totalPoints: number;
    thruHole: number;
    frontNinePoints: number;
    backNinePoints: number;
    holes: StablefordHoleScore[];
}

// ============================================
// HANDICAP HELPERS
// ============================================

/**
 * Calculate course handicap from handicap index
 * Formula: Handicap Index × (Slope Rating / 113) + (Course Rating - Par)
 */
export function calculateCourseHandicap(
    handicapIndex: number,
    teeSet: TeeSet
): number {
    const courseHandicap = Math.round(
        handicapIndex * (teeSet.slope / 113) + (teeSet.rating - teeSet.par)
    );
    return Math.max(0, courseHandicap);
}

/**
 * Calculate strokes received per hole based on course handicap
 * @param courseHandicap - Player's course handicap
 * @param holeHandicaps - Array of 18 handicap rankings (1-18, 1 = hardest)
 * @returns Array of 18 integers (strokes received on each hole)
 */
export function calculateStrokesPerHole(
    courseHandicap: number,
    holeHandicaps: number[]
): number[] {
    if (holeHandicaps.length !== 18) {
        throw new Error('holeHandicaps must have 18 elements');
    }

    const strokes = new Array(18).fill(0);
    const fullStrokes = Math.floor(courseHandicap / 18);
    const remainingStrokes = courseHandicap % 18;

    // Every hole gets the full strokes
    for (let i = 0; i < 18; i++) {
        strokes[i] = fullStrokes;
    }

    // Distribute remaining strokes to hardest holes first
    for (let stroke = 0; stroke < remainingStrokes; stroke++) {
        // Find hole with handicap rank = stroke + 1
        const holeIndex = holeHandicaps.findIndex(rank => rank === stroke + 1);
        if (holeIndex !== -1) {
            strokes[holeIndex]++;
        }
    }

    return strokes;
}

// ============================================
// SCORING
// ============================================

/**
 * Calculate Stableford score for a single hole
 */
export function scoreStablefordHole(
    holeNumber: number,
    par: number,
    grossScore: number,
    strokesReceived: number,
    useModified: boolean = false
): StablefordHoleScore {
    const netScore = grossScore - strokesReceived;
    const points = calculateStablefordPoints(netScore, par, useModified);

    return {
        holeNumber,
        par,
        grossScore,
        netScore,
        strokesReceived,
        stablefordPoints: points,
    };
}

/**
 * Calculate complete Stableford round score for a player
 */
export function calculateStablefordRound(
    player: StablefordPlayer,
    grossScores: (number | null)[],  // Array of 18 gross scores (null if not played)
    holePars: number[],
    useModified: boolean = false
): StablefordRoundScore {
    if (grossScores.length !== 18 || holePars.length !== 18) {
        throw new Error('Must provide 18 scores and 18 pars');
    }

    const holeScores: StablefordHoleScore[] = [];
    let totalGross = 0;
    let totalNet = 0;
    let totalPoints = 0;
    let frontNinePoints = 0;
    let backNinePoints = 0;

    for (let i = 0; i < 18; i++) {
        const grossScore = grossScores[i];
        if (grossScore === null) {
            // Hole not yet played - use placeholder
            holeScores.push({
                holeNumber: i + 1,
                par: holePars[i],
                grossScore: 0,
                netScore: 0,
                strokesReceived: player.strokesPerHole[i],
                stablefordPoints: 0,
            });
            continue;
        }

        const holeScore = scoreStablefordHole(
            i + 1,
            holePars[i],
            grossScore,
            player.strokesPerHole[i],
            useModified
        );

        holeScores.push(holeScore);
        totalGross += grossScore;
        totalNet += holeScore.netScore;
        totalPoints += holeScore.stablefordPoints;

        if (i < 9) {
            frontNinePoints += holeScore.stablefordPoints;
        } else {
            backNinePoints += holeScore.stablefordPoints;
        }
    }

    return {
        playerId: player.player.id,
        playerName: `${player.player.firstName} ${player.player.lastName}`,
        holeScores,
        totalGross,
        totalNet,
        totalPoints,
        frontNinePoints,
        backNinePoints,
    };
}

// ============================================
// LEADERBOARD
// ============================================

/**
 * Build Stableford leaderboard from player scores
 */
export function buildStablefordLeaderboard(
    scores: StablefordRoundScore[]
): StablefordLeaderboardEntry[] {
    const leaderboard: StablefordLeaderboardEntry[] = scores.map(score => {
        // Calculate holes played (where gross score > 0)
        const thruHole = score.holeScores.filter(h => h.grossScore > 0).length;

        return {
            playerId: score.playerId,
            playerName: score.playerName,
            totalPoints: score.totalPoints,
            thruHole,
            frontNinePoints: score.frontNinePoints,
            backNinePoints: score.backNinePoints,
            holes: score.holeScores,
        };
    });

    // Sort by total points (descending)
    return leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);
}

/**
 * Calculate team Stableford score (best ball format)
 * Takes the best Stableford score on each hole from team members
 */
export function calculateTeamBestBallStableford(
    teamScores: StablefordRoundScore[]
): {
    totalPoints: number;
    holePoints: number[];
    bestPlayerPerHole: string[];
} {
    const holePoints: number[] = [];
    const bestPlayerPerHole: string[] = [];

    for (let holeIndex = 0; holeIndex < 18; holeIndex++) {
        let bestPoints = 0;
        let bestPlayer = '';

        for (const playerScore of teamScores) {
            const holeScore = playerScore.holeScores[holeIndex];
            if (holeScore && holeScore.stablefordPoints > bestPoints) {
                bestPoints = holeScore.stablefordPoints;
                bestPlayer = playerScore.playerName;
            }
        }

        holePoints.push(bestPoints);
        bestPlayerPerHole.push(bestPlayer);
    }

    return {
        totalPoints: holePoints.reduce((sum, p) => sum + p, 0),
        holePoints,
        bestPlayerPerHole,
    };
}

// ============================================
// FORMATTING
// ============================================

/**
 * Get point value display with styling class
 */
export function getPointsDisplay(points: number): {
    text: string;
    className: string;
    color: string;
} {
    if (points >= 5) {
        return { text: `+${points}`, className: 'eagle', color: 'var(--eagle, #FFD700)' };
    }
    if (points === 4) {
        return { text: '+4', className: 'birdie', color: 'var(--birdie, #EF4444)' };
    }
    if (points === 2) {
        return { text: '+2', className: 'par', color: 'var(--ink)' };
    }
    if (points === 1) {
        return { text: '+1', className: 'bogey', color: 'var(--bogey, #3B82F6)' };
    }
    return { text: '0', className: 'double', color: 'var(--ink-tertiary)' };
}

/**
 * Format Stableford score comparison
 */
export function formatStablefordComparison(
    playerA: StablefordRoundScore,
    playerB: StablefordRoundScore
): string {
    const diff = playerA.totalPoints - playerB.totalPoints;
    if (diff === 0) return 'Tied';
    if (diff > 0) {
        return `${playerA.playerName} leads by ${diff}`;
    }
    return `${playerB.playerName} leads by ${Math.abs(diff)}`;
}
