/**
 * Path to Victory Service (Production Quality)
 *
 * Calculates tournament clinch scenarios:
 * - How many of remaining matches each team needs to win
 * - Minimum points needed to clinch
 * - "If X wins N of remaining M, they clinch"
 * - Elimination scenarios
 */

import type { TeamStandings } from '@/lib/types/computed';

// ============================================
// TYPES
// ============================================

export interface VictoryScenario {
    winsNeeded: number;
    halvesAllowed: number;
    probability: 'high' | 'medium' | 'low' | 'unlikely';
    description: string;
}

export interface PathToVictory {
    teamA: {
        name: string;
        currentPoints: number;
        pointsNeeded: number;
        canClinch: boolean;
        hasClinched: boolean;
        isEliminated: boolean;
        scenarios: VictoryScenario[];
        bestCase: string;
        worstCase: string;
    };
    teamB: {
        name: string;
        currentPoints: number;
        pointsNeeded: number;
        canClinch: boolean;
        hasClinched: boolean;
        isEliminated: boolean;
        scenarios: VictoryScenario[];
        bestCase: string;
        worstCase: string;
    };
    remainingMatches: number;
    remainingPoints: number;
    pointsToWin: number;
    tieBreaker: string;
    isDecided: boolean;
    dramatic: boolean; // True if close race
}

// ============================================
// MAIN CALCULATOR
// ============================================

/**
 * Calculate path to victory for both teams
 */
export function calculatePathToVictory(
    standings: TeamStandings,
    pointsToWin: number,
    teamAName: string = 'Team USA',
    teamBName: string = 'Team Europe'
): PathToVictory {
    const { teamAPoints, teamBPoints, remainingMatches } = standings;
    const remainingPoints = remainingMatches; // 1 point per match

    // Points needed to reach winning threshold
    const teamANeeded = Math.max(0, pointsToWin - teamAPoints);
    const teamBNeeded = Math.max(0, pointsToWin - teamBPoints);

    // Check clinch/elimination status
    const teamAHasClinched = teamAPoints >= pointsToWin;
    const teamBHasClinched = teamBPoints >= pointsToWin;

    // Can team clinch with remaining points?
    const teamACanClinch = teamAPoints + remainingPoints >= pointsToWin;
    const teamBCanClinch = teamBPoints + remainingPoints >= pointsToWin;

    // Is team eliminated?
    const teamAIsEliminated = !teamACanClinch && teamBHasClinched;
    const teamBIsEliminated = !teamBCanClinch && teamAHasClinched;

    // Calculate scenarios for each team
    const teamAScenarios = calculateScenarios(teamANeeded, remainingMatches);
    const teamBScenarios = calculateScenarios(teamBNeeded, remainingMatches);

    // Best/worst case descriptions
    const teamABestCase = describeBestCase(teamAPoints, remainingPoints, pointsToWin, teamAName);
    const teamAWorstCase = describeWorstCase(teamAPoints, pointsToWin, teamAName);
    const teamBBestCase = describeBestCase(teamBPoints, remainingPoints, pointsToWin, teamBName);
    const teamBWorstCase = describeWorstCase(teamBPoints, pointsToWin, teamBName);

    // Is it dramatic (close race)?
    const margin = Math.abs(teamAPoints - teamBPoints);
    const dramatic = margin <= 3 && remainingMatches >= 2 && !teamAHasClinched && !teamBHasClinched;

    return {
        teamA: {
            name: teamAName,
            currentPoints: teamAPoints,
            pointsNeeded: teamANeeded,
            canClinch: teamACanClinch,
            hasClinched: teamAHasClinched,
            isEliminated: teamAIsEliminated,
            scenarios: teamAScenarios,
            bestCase: teamABestCase,
            worstCase: teamAWorstCase,
        },
        teamB: {
            name: teamBName,
            currentPoints: teamBPoints,
            pointsNeeded: teamBNeeded,
            canClinch: teamBCanClinch,
            hasClinched: teamBHasClinched,
            isEliminated: teamBIsEliminated,
            scenarios: teamBScenarios,
            bestCase: teamBBestCase,
            worstCase: teamBWorstCase,
        },
        remainingMatches,
        remainingPoints,
        pointsToWin,
        tieBreaker: 'Defending champion retains the cup on a tie',
        isDecided: teamAHasClinched || teamBHasClinched,
        dramatic,
    };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function calculateScenarios(pointsNeeded: number, remainingMatches: number): VictoryScenario[] {
    const scenarios: VictoryScenario[] = [];

    if (pointsNeeded <= 0) {
        // Already clinched
        return [{
            winsNeeded: 0,
            halvesAllowed: remainingMatches,
            probability: 'high',
            description: 'Already clinched!',
        }];
    }

    if (pointsNeeded > remainingMatches) {
        // Cannot clinch
        return [{
            winsNeeded: remainingMatches + 1,
            halvesAllowed: 0,
            probability: 'unlikely',
            description: 'Cannot clinch - not enough matches remaining',
        }];
    }

    // Generate possible win/halve combinations
    for (let wins = 0; wins <= remainingMatches; wins++) {
        const pointsFromWins = wins;
        const remainingAfterWins = remainingMatches - wins;

        // How many halves needed to reach pointsNeeded?
        const additionalPointsNeeded = pointsNeeded - pointsFromWins;

        if (additionalPointsNeeded <= 0) {
            // Wins alone are enough
            const halvesAllowed = remainingAfterWins;
            const probability = getProbability(wins, remainingMatches);

            scenarios.push({
                winsNeeded: wins,
                halvesAllowed,
                probability,
                description: formatScenario(wins, 0, remainingMatches),
            });
            break; // First valid scenario is the best
        } else {
            // Need some halves too
            const halvesNeeded = Math.ceil(additionalPointsNeeded * 2);
            if (halvesNeeded <= remainingAfterWins) {
                const halvesAllowed = remainingAfterWins - halvesNeeded;
                const probability = getProbability(wins + halvesNeeded / 2, remainingMatches);

                scenarios.push({
                    winsNeeded: wins,
                    halvesAllowed,
                    probability,
                    description: formatScenario(wins, halvesNeeded, remainingMatches),
                });
            }
        }
    }

    // Return top 3 most likely scenarios
    return scenarios.slice(0, 3);
}

function getProbability(effectiveWins: number, totalMatches: number): VictoryScenario['probability'] {
    const ratio = effectiveWins / totalMatches;
    if (ratio <= 0.25) return 'high';
    if (ratio <= 0.5) return 'medium';
    if (ratio <= 0.75) return 'low';
    return 'unlikely';
}

function formatScenario(wins: number, halves: number, total: number): string {
    if (wins === 0 && halves === 0) {
        return 'Already clinched!';
    }

    const parts: string[] = [];

    if (wins > 0) {
        parts.push(`win ${wins}`);
    }
    if (halves > 0) {
        parts.push(`halve ${halves}`);
    }

    const losses = total - wins - halves;
    if (losses > 0 && parts.length > 0) {
        return `${parts.join(' and ')} of ${total} remaining`;
    }

    return parts.join(' and ') + ` of ${total} remaining`;
}

function describeBestCase(currentPoints: number, remaining: number, toWin: number, teamName: string): string {
    const maxPoints = currentPoints + remaining;
    if (maxPoints >= toWin) {
        return `${teamName} can reach ${maxPoints} points by winning all remaining matches`;
    }
    return `${teamName} can reach ${maxPoints} points maximum`;
}

function describeWorstCase(currentPoints: number, toWin: number, teamName: string): string {
    if (currentPoints >= toWin) {
        return `${teamName} has already clinched`;
    }
    return `${teamName} stays at ${currentPoints} points if losing all remaining`;
}

// ============================================
// QUICK SUMMARY
// ============================================

/**
 * Get a quick one-liner for each team's path
 */
export function getQuickSummary(pathToVictory: PathToVictory): {
    teamASummary: string;
    teamBSummary: string;
} {
    const { teamA, teamB, remainingMatches } = pathToVictory;

    let teamASummary: string;
    let teamBSummary: string;

    if (teamA.hasClinched) {
        teamASummary = `${teamA.name} has clinched the cup! 🏆`;
    } else if (teamA.isEliminated) {
        teamASummary = `${teamA.name} has been eliminated`;
    } else if (teamA.pointsNeeded <= 0) {
        teamASummary = `${teamA.name} needs any result to clinch`;
    } else {
        teamASummary = `${teamA.name} needs ${teamA.pointsNeeded} of ${remainingMatches} to clinch`;
    }

    if (teamB.hasClinched) {
        teamBSummary = `${teamB.name} has clinched the cup! 🏆`;
    } else if (teamB.isEliminated) {
        teamBSummary = `${teamB.name} has been eliminated`;
    } else if (teamB.pointsNeeded <= 0) {
        teamBSummary = `${teamB.name} needs any result to clinch`;
    } else {
        teamBSummary = `${teamB.name} needs ${teamB.pointsNeeded} of ${remainingMatches} to clinch`;
    }

    return { teamASummary, teamBSummary };
}

// ============================================
// DRAMATIC MOMENT DETECTION
// ============================================

/**
 * Detect if this is a dramatic moment worth highlighting
 */
export function detectDramaticMoment(pathToVictory: PathToVictory): {
    isDramatic: boolean;
    headline: string;
    subtext: string;
} | null {
    const { teamA, teamB, remainingMatches, pointsToWin: _pointsToWin } = pathToVictory;

    // One team about to clinch
    if (teamA.pointsNeeded === 0.5 || teamA.pointsNeeded === 1) {
        return {
            isDramatic: true,
            headline: `${teamA.name} on the brink!`,
            subtext: `Just ${teamA.pointsNeeded} point${teamA.pointsNeeded === 1 ? '' : 's'} from victory`,
        };
    }

    if (teamB.pointsNeeded === 0.5 || teamB.pointsNeeded === 1) {
        return {
            isDramatic: true,
            headline: `${teamB.name} on the brink!`,
            subtext: `Just ${teamB.pointsNeeded} point${teamB.pointsNeeded === 1 ? '' : 's'} from victory`,
        };
    }

    // Tied with few remaining
    if (teamA.currentPoints === teamB.currentPoints && remainingMatches <= 3) {
        return {
            isDramatic: true,
            headline: 'Dead Heat!',
            subtext: `All square with ${remainingMatches} match${remainingMatches === 1 ? '' : 'es'} to play`,
        };
    }

    // Comeback territory
    const margin = Math.abs(teamA.currentPoints - teamB.currentPoints);
    const trailing = teamA.currentPoints < teamB.currentPoints ? teamA : teamB;
    const _leading = teamA.currentPoints < teamB.currentPoints ? teamB : teamA;

    if (margin >= 3 && trailing.canClinch && remainingMatches >= margin) {
        return {
            isDramatic: true,
            headline: 'Comeback possible!',
            subtext: `${trailing.name} trails by ${margin} but can still win`,
        };
    }

    return null;
}
