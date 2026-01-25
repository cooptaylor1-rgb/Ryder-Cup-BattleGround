/**
 * AutoBalance Engine — Phase 2: Captain Empowerment
 *
 * Intelligent algorithm for optimizing match pairings:
 * - Handicap-based balancing
 * - Experience matching
 * - Win rate consideration
 * - Fairness scoring
 *
 * Uses a greedy optimization with swapping for refinement.
 */

import type { PlayerCardData } from './PlayerCard';
import type { MatchSlotData } from './MatchSlot';
import type { FairnessScore, SessionConfig } from './LineupCanvas';

// ============================================
// TYPES
// ============================================

export interface BalanceWeights {
    handicap: number;       // Weight for handicap balance (0-1)
    experience: number;     // Weight for experience balance (0-1)
    winRate: number;        // Weight for win rate balance (0-1)
}

export interface BalanceConfig {
    weights: BalanceWeights;
    maxIterations: number;
    targetFairness: number;
}

export const DEFAULT_BALANCE_CONFIG: BalanceConfig = {
    weights: {
        handicap: 0.6,
        experience: 0.25,
        winRate: 0.15,
    },
    maxIterations: 100,
    targetFairness: 85,
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate combined handicap for a team
 */
export function calculateTeamHandicap(players: PlayerCardData[]): number {
    if (players.length === 0) return 0;
    return players.reduce((sum, p) => sum + p.handicapIndex, 0);
}

/**
 * Calculate average win rate for a team
 */
export function calculateTeamWinRate(players: PlayerCardData[]): number {
    if (players.length === 0) return 50;

    const validPlayers = players.filter(p =>
        p.matchesPlayed !== undefined && p.matchesPlayed > 0
    );

    if (validPlayers.length === 0) return 50;

    const rates = validPlayers.map(p => {
        const total = (p.matchesWon || 0) + (p.matchesLost || 0) + (p.matchesHalved || 0);
        if (total === 0) return 50;
        return ((p.matchesWon || 0) + (p.matchesHalved || 0) * 0.5) / total * 100;
    });

    return rates.reduce((a, b) => a + b, 0) / rates.length;
}

/**
 * Calculate average experience (matches played) for a team
 */
export function calculateTeamExperience(players: PlayerCardData[]): number {
    if (players.length === 0) return 0;

    const total = players.reduce((sum, p) => sum + (p.matchesPlayed || 0), 0);
    return total / players.length;
}

/**
 * Calculate match fairness score (0-100)
 */
export function calculateMatchFairness(
    teamA: PlayerCardData[],
    teamB: PlayerCardData[],
    weights: BalanceWeights = DEFAULT_BALANCE_CONFIG.weights
): number {
    // Handicap balance (lower diff = better)
    const hcpA = calculateTeamHandicap(teamA);
    const hcpB = calculateTeamHandicap(teamB);
    const hcpDiff = Math.abs(hcpA - hcpB);
    const hcpScore = Math.max(0, 100 - hcpDiff * 5); // 5 points penalty per stroke

    // Experience balance
    const expA = calculateTeamExperience(teamA);
    const expB = calculateTeamExperience(teamB);
    const expDiff = Math.abs(expA - expB);
    const maxExp = Math.max(expA, expB, 1);
    const expScore = Math.max(0, 100 - (expDiff / maxExp) * 50);

    // Win rate balance
    const wrA = calculateTeamWinRate(teamA);
    const wrB = calculateTeamWinRate(teamB);
    const wrDiff = Math.abs(wrA - wrB);
    const wrScore = Math.max(0, 100 - wrDiff);

    // Weighted average
    return Math.round(
        hcpScore * weights.handicap +
        expScore * weights.experience +
        wrScore * weights.winRate
    );
}

/**
 * Calculate overall lineup fairness
 */
export function calculateLineupFairness(
    matches: MatchSlotData[],
    weights: BalanceWeights = DEFAULT_BALANCE_CONFIG.weights
): FairnessScore {
    const warnings: string[] = [];

    // Filter to matches with players
    const validMatches = matches.filter(
        m => m.teamAPlayers.length > 0 || m.teamBPlayers.length > 0
    );

    if (validMatches.length === 0) {
        return {
            overall: 0,
            handicapBalance: 0,
            experienceBalance: 0,
            warnings: ['No players assigned yet'],
        };
    }

    // Calculate per-match scores
    const matchScores = validMatches.map(match => ({
        fairness: calculateMatchFairness(match.teamAPlayers, match.teamBPlayers, weights),
        hcpDiff: Math.abs(
            calculateTeamHandicap(match.teamAPlayers) -
            calculateTeamHandicap(match.teamBPlayers)
        ),
        expDiff: Math.abs(
            calculateTeamExperience(match.teamAPlayers) -
            calculateTeamExperience(match.teamBPlayers)
        ),
    }));

    // Average scores
    const avgFairness = matchScores.reduce((sum, m) => sum + m.fairness, 0) / matchScores.length;

    // Calculate component scores
    const hcpDiffs = matchScores.map(m => m.hcpDiff);
    const avgHcpDiff = hcpDiffs.reduce((a, b) => a + b, 0) / hcpDiffs.length;
    const handicapBalance = Math.max(0, Math.round(100 - avgHcpDiff * 5));

    const expDiffs = matchScores.map(m => m.expDiff);
    const avgExpDiff = expDiffs.reduce((a, b) => a + b, 0) / expDiffs.length;
    const experienceBalance = Math.max(0, Math.round(100 - avgExpDiff * 10));

    // Generate warnings
    const unbalancedMatches = matchScores.filter(m => m.hcpDiff > 10);
    if (unbalancedMatches.length > 0) {
        warnings.push(`${unbalancedMatches.length} match(es) have handicap difference > 10`);
    }

    const inexperiencedPairings = matchScores.filter(m => m.expDiff > 5);
    if (inexperiencedPairings.length > 0) {
        warnings.push(`${inexperiencedPairings.length} match(es) have large experience gap`);
    }

    return {
        overall: Math.round(avgFairness),
        handicapBalance,
        experienceBalance,
        warnings,
    };
}

// ============================================
// AUTO BALANCE ALGORITHM
// ============================================

/**
 * Greedy algorithm to create balanced pairings
 *
 * Strategy:
 * 1. Sort players by handicap
 * 2. Pair strongest with weakest iteratively
 * 3. Distribute across matches
 * 4. Refine with swaps if needed
 */
export function autoBalanceLineup(
    teamAPlayers: PlayerCardData[],
    teamBPlayers: PlayerCardData[],
    session: SessionConfig,
    config: BalanceConfig = DEFAULT_BALANCE_CONFIG
): MatchSlotData[] {
    const { playersPerTeam, matchCount } = session;

    // Sort by handicap (ascending - lowest first)
    const sortedA = [...teamAPlayers].sort((a, b) => a.handicapIndex - b.handicapIndex);
    const sortedB = [...teamBPlayers].sort((a, b) => a.handicapIndex - b.handicapIndex);

    // Initialize empty matches
    const matches: MatchSlotData[] = Array.from({ length: matchCount }, (_, i) => ({
        id: `match-${i + 1}`,
        matchNumber: i + 1,
        teamAPlayers: [],
        teamBPlayers: [],
    }));

    // Distribute Team A players using serpentine draft
    // Match 1 gets lowest, Match N gets next lowest, then reverse
    let direction = 1;
    let matchIndex = 0;

    for (const player of sortedA) {
        // Find next match with room
        while (matches[matchIndex].teamAPlayers.length >= playersPerTeam) {
            matchIndex += direction;
            if (matchIndex >= matchCount) {
                direction = -1;
                matchIndex = matchCount - 1;
            } else if (matchIndex < 0) {
                direction = 1;
                matchIndex = 0;
            }
        }

        matches[matchIndex].teamAPlayers.push(player);

        // Move to next match
        matchIndex += direction;
        if (matchIndex >= matchCount || matchIndex < 0) {
            direction *= -1;
            matchIndex = Math.max(0, Math.min(matchCount - 1, matchIndex + direction));
        }
    }

    // Distribute Team B players to balance handicaps
    // For each match, find the Team B player(s) that best balance the handicap
    const remainingB = [...sortedB];

    for (const match of matches) {
        const teamAHcp = calculateTeamHandicap(match.teamAPlayers);

        // Find best matching players from remaining pool
        for (let slot = 0; slot < playersPerTeam && remainingB.length > 0; slot++) {
            // Calculate target handicap to balance
            const currentBHcp = calculateTeamHandicap(match.teamBPlayers);
            const targetHcp = (teamAHcp - currentBHcp) / (playersPerTeam - slot);

            // Find closest match
            let bestIndex = 0;
            let bestDiff = Infinity;

            for (let i = 0; i < remainingB.length; i++) {
                const diff = Math.abs(remainingB[i].handicapIndex - targetHcp);
                if (diff < bestDiff) {
                    bestDiff = diff;
                    bestIndex = i;
                }
            }

            // Assign player
            match.teamBPlayers.push(remainingB[bestIndex]);
            remainingB.splice(bestIndex, 1);
        }
    }

    // Refinement phase: Try swapping to improve fairness
    let improved = true;
    let iterations = 0;

    while (improved && iterations < config.maxIterations) {
        improved = false;
        iterations++;

        const currentFairness = calculateLineupFairness(matches, config.weights);
        if (currentFairness.overall >= config.targetFairness) {
            break;
        }

        // Try swapping players between matches
        for (let i = 0; i < matches.length && !improved; i++) {
            for (let j = i + 1; j < matches.length && !improved; j++) {
                // Try swapping Team A players
                for (let ai = 0; ai < matches[i].teamAPlayers.length && !improved; ai++) {
                    for (let aj = 0; aj < matches[j].teamAPlayers.length && !improved; aj++) {
                        // Create test swap
                        const testMatches = matches.map((m, idx) => {
                            if (idx === i) {
                                const newPlayers = [...m.teamAPlayers];
                                newPlayers[ai] = matches[j].teamAPlayers[aj];
                                return { ...m, teamAPlayers: newPlayers };
                            }
                            if (idx === j) {
                                const newPlayers = [...m.teamAPlayers];
                                newPlayers[aj] = matches[i].teamAPlayers[ai];
                                return { ...m, teamAPlayers: newPlayers };
                            }
                            return m;
                        });

                        const newFairness = calculateLineupFairness(testMatches, config.weights);
                        if (newFairness.overall > currentFairness.overall) {
                            // Apply swap
                            const temp = matches[i].teamAPlayers[ai];
                            matches[i].teamAPlayers[ai] = matches[j].teamAPlayers[aj];
                            matches[j].teamAPlayers[aj] = temp;
                            improved = true;
                        }
                    }
                }

                // Try swapping Team B players
                for (let bi = 0; bi < matches[i].teamBPlayers.length && !improved; bi++) {
                    for (let bj = 0; bj < matches[j].teamBPlayers.length && !improved; bj++) {
                        const testMatches = matches.map((m, idx) => {
                            if (idx === i) {
                                const newPlayers = [...m.teamBPlayers];
                                newPlayers[bi] = matches[j].teamBPlayers[bj];
                                return { ...m, teamBPlayers: newPlayers };
                            }
                            if (idx === j) {
                                const newPlayers = [...m.teamBPlayers];
                                newPlayers[bj] = matches[i].teamBPlayers[bi];
                                return { ...m, teamBPlayers: newPlayers };
                            }
                            return m;
                        });

                        const newFairness = calculateLineupFairness(testMatches, config.weights);
                        if (newFairness.overall > currentFairness.overall) {
                            const temp = matches[i].teamBPlayers[bi];
                            matches[i].teamBPlayers[bi] = matches[j].teamBPlayers[bj];
                            matches[j].teamBPlayers[bj] = temp;
                            improved = true;
                        }
                    }
                }
            }
        }
    }

    return matches;
}

/**
 * Suggest player swaps to improve fairness
 */
export interface SwapSuggestion {
    fromMatch: number;
    toMatch: number;
    player: PlayerCardData;
    swapWith: PlayerCardData;
    improvement: number;
    reason: string;
}

export function suggestSwaps(
    matches: MatchSlotData[],
    config: BalanceConfig = DEFAULT_BALANCE_CONFIG
): SwapSuggestion[] {
    const suggestions: SwapSuggestion[] = [];
    const currentFairness = calculateLineupFairness(matches, config.weights);

    // Look for potential improvements
    for (let i = 0; i < matches.length; i++) {
        for (let j = i + 1; j < matches.length; j++) {
            // Check Team A swaps
            for (const playerI of matches[i].teamAPlayers) {
                for (const playerJ of matches[j].teamAPlayers) {
                    // Simulate swap
                    const testMatches = matches.map((m, idx) => {
                        if (idx === i) {
                            return {
                                ...m,
                                teamAPlayers: m.teamAPlayers.map(p =>
                                    p.id === playerI.id ? playerJ : p
                                ),
                            };
                        }
                        if (idx === j) {
                            return {
                                ...m,
                                teamAPlayers: m.teamAPlayers.map(p =>
                                    p.id === playerJ.id ? playerI : p
                                ),
                            };
                        }
                        return m;
                    });

                    const newFairness = calculateLineupFairness(testMatches, config.weights);
                    const improvement = newFairness.overall - currentFairness.overall;

                    if (improvement >= 3) { // Only suggest if meaningful improvement
                        suggestions.push({
                            fromMatch: i + 1,
                            toMatch: j + 1,
                            player: playerI,
                            swapWith: playerJ,
                            improvement,
                            reason: `Improves handicap balance in Match ${i + 1} and ${j + 1}`,
                        });
                    }
                }
            }

            // Check Team B swaps (similar logic)
            for (const playerI of matches[i].teamBPlayers) {
                for (const playerJ of matches[j].teamBPlayers) {
                    const testMatches = matches.map((m, idx) => {
                        if (idx === i) {
                            return {
                                ...m,
                                teamBPlayers: m.teamBPlayers.map(p =>
                                    p.id === playerI.id ? playerJ : p
                                ),
                            };
                        }
                        if (idx === j) {
                            return {
                                ...m,
                                teamBPlayers: m.teamBPlayers.map(p =>
                                    p.id === playerJ.id ? playerI : p
                                ),
                            };
                        }
                        return m;
                    });

                    const newFairness = calculateLineupFairness(testMatches, config.weights);
                    const improvement = newFairness.overall - currentFairness.overall;

                    if (improvement >= 3) {
                        suggestions.push({
                            fromMatch: i + 1,
                            toMatch: j + 1,
                            player: playerI,
                            swapWith: playerJ,
                            improvement,
                            reason: `Improves handicap balance in Match ${i + 1} and ${j + 1}`,
                        });
                    }
                }
            }
        }
    }

    // Sort by improvement (descending)
    return suggestions.sort((a, b) => b.improvement - a.improvement).slice(0, 5);
}

const AutoBalanceEngine = {
    autoBalanceLineup,
    calculateLineupFairness,
    calculateMatchFairness,
    suggestSwaps,
    DEFAULT_BALANCE_CONFIG,
};

export default AutoBalanceEngine;
