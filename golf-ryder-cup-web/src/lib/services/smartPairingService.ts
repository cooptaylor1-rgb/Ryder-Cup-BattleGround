/**
 * Smart Pairing Service
 *
 * Intelligent pairing suggestions with history awareness:
 * - Track pairing history across sessions
 * - Avoid repeat matchups
 * - Balance handicaps
 * - Respect constraints
 * - Calculate fairness scores
 */

import type {
    PairingHistoryEntry,
    PairingConstraint,
    PairingSuggestion,
    SmartPairingConfig,
    PairingAnalysis,
} from '@/lib/types/captain';
import type { Player, Match, RyderCupSession, SessionType, UUID } from '@/lib/types/models';

// Re-export types for convenience
export type {
    PairingHistoryEntry,
    PairingConstraint,
    PairingSuggestion,
    SmartPairingConfig,
    PairingAnalysis,
} from '@/lib/types/captain';

// Default configuration
const DEFAULT_CONFIG: SmartPairingConfig = {
    avoidRepeatMatchups: true,
    avoidRepeatPartnerships: false, // Less strict by default
    maxHandicapGap: 10,
    balanceExperience: true,
    respectConstraints: true,
    prioritizeCompetitiveMatches: true,
};

/**
 * Extract pairing history from matches
 */
export function extractPairingHistory(
    matches: Match[],
    sessions: RyderCupSession[],
    tripId: UUID
): PairingHistoryEntry[] {
    const history: PairingHistoryEntry[] = [];

    for (const match of matches) {
        const session = sessions.find(s => s.id === match.sessionId);
        if (!session) continue;

        // Record opponent matchups
        for (const player1 of match.teamAPlayerIds) {
            for (const player2 of match.teamBPlayerIds) {
                history.push({
                    id: `${match.id}-${player1}-${player2}-opp`,
                    tripId,
                    sessionId: session.id,
                    matchId: match.id,
                    player1Id: player1,
                    player2Id: player2,
                    relationship: 'opponents',
                    sessionType: session.sessionType,
                    timestamp: match.createdAt,
                });
            }
        }

        // Record partner pairings (for team formats)
        if (session.sessionType !== 'singles') {
            // Team A partners
            if (match.teamAPlayerIds.length >= 2) {
                history.push({
                    id: `${match.id}-teamA-partners`,
                    tripId,
                    sessionId: session.id,
                    matchId: match.id,
                    player1Id: match.teamAPlayerIds[0],
                    player2Id: match.teamAPlayerIds[1],
                    relationship: 'partners',
                    sessionType: session.sessionType,
                    timestamp: match.createdAt,
                });
            }
            // Team B partners
            if (match.teamBPlayerIds.length >= 2) {
                history.push({
                    id: `${match.id}-teamB-partners`,
                    tripId,
                    sessionId: session.id,
                    matchId: match.id,
                    player1Id: match.teamBPlayerIds[0],
                    player2Id: match.teamBPlayerIds[1],
                    relationship: 'partners',
                    sessionType: session.sessionType,
                    timestamp: match.createdAt,
                });
            }
        }
    }

    return history;
}

/**
 * Count matchups between two players
 */
export function countMatchups(
    player1Id: UUID,
    player2Id: UUID,
    history: PairingHistoryEntry[],
    relationship?: 'partners' | 'opponents'
): number {
    return history.filter(h =>
        ((h.player1Id === player1Id && h.player2Id === player2Id) ||
            (h.player1Id === player2Id && h.player2Id === player1Id)) &&
        (!relationship || h.relationship === relationship)
    ).length;
}

/**
 * Get matchup matrix for all players
 */
export function getMatchupMatrix(
    playerIds: UUID[],
    history: PairingHistoryEntry[]
): Map<string, number> {
    const matrix = new Map<string, number>();

    for (let i = 0; i < playerIds.length; i++) {
        for (let j = i + 1; j < playerIds.length; j++) {
            const key = [playerIds[i], playerIds[j]].sort().join('-');
            matrix.set(key, countMatchups(playerIds[i], playerIds[j], history, 'opponents'));
        }
    }

    return matrix;
}

/**
 * Calculate handicap gap for a match
 */
function calculateHandicapGap(
    teamAPlayers: Player[],
    teamBPlayers: Player[],
    sessionType: SessionType
): number {
    const teamAHandicap = calculateTeamHandicap(teamAPlayers, sessionType);
    const teamBHandicap = calculateTeamHandicap(teamBPlayers, sessionType);
    return Math.abs(teamAHandicap - teamBHandicap);
}

/**
 * Calculate team handicap based on session type
 */
function calculateTeamHandicap(players: Player[], sessionType: SessionType): number {
    if (players.length === 0) return 18; // Default if no players

    const handicaps = players.map(p => p.handicapIndex ?? 18); // Default to 18 if missing

    switch (sessionType) {
        case 'singles':
            return handicaps[0] ?? 18;
        case 'fourball':
            // Best ball - use lower handicap
            return handicaps.length > 0 ? Math.min(...handicaps) : 18;
        case 'foursomes':
            // Alternate shot - use average
            return handicaps.length > 0 ? handicaps.reduce((a, b) => a + b, 0) / handicaps.length : 18;
        default:
            return handicaps.length > 0 ? handicaps.reduce((a, b) => a + b, 0) / handicaps.length : 18;
    }
}

/**
 * Check if a pairing violates constraints
 */
function checkConstraints(
    teamAPlayerIds: UUID[],
    teamBPlayerIds: UUID[],
    constraints: PairingConstraint[]
): string[] {
    const violations: string[] = [];

    for (const constraint of constraints) {
        const allPlayers = [...teamAPlayerIds, ...teamBPlayerIds];
        const p1InMatch = allPlayers.includes(constraint.player1Id);
        const p2InMatch = allPlayers.includes(constraint.player2Id);

        switch (constraint.type) {
            case 'must_pair':
                // Both must be on same team
                if (p1InMatch !== p2InMatch) {
                    violations.push(`Players must be paired together: ${constraint.reason || 'constraint'}`);
                } else if (p1InMatch && p2InMatch) {
                    const p1OnA = teamAPlayerIds.includes(constraint.player1Id);
                    const p2OnA = teamAPlayerIds.includes(constraint.player2Id);
                    if (p1OnA !== p2OnA) {
                        violations.push(`Players must be partners, not opponents: ${constraint.reason || 'constraint'}`);
                    }
                }
                break;

            case 'must_not_pair':
                // Must not be on same team
                if (p1InMatch && p2InMatch) {
                    const p1OnA = teamAPlayerIds.includes(constraint.player1Id);
                    const p2OnA = teamAPlayerIds.includes(constraint.player2Id);
                    if (p1OnA === p2OnA) {
                        violations.push(`Players must not be partners: ${constraint.reason || 'constraint'}`);
                    }
                }
                break;

            case 'must_not_oppose':
                // Must not face each other
                if (p1InMatch && p2InMatch) {
                    const p1OnA = teamAPlayerIds.includes(constraint.player1Id);
                    const p2OnA = teamAPlayerIds.includes(constraint.player2Id);
                    if (p1OnA !== p2OnA) {
                        violations.push(`Players must not face each other: ${constraint.reason || 'constraint'}`);
                    }
                }
                break;
        }
    }

    return violations;
}

/**
 * Calculate fairness score for a pairing
 */
function calculateFairnessScore(
    teamAPlayers: Player[],
    teamBPlayers: Player[],
    sessionType: SessionType,
    history: PairingHistoryEntry[],
    constraints: PairingConstraint[],
    config: SmartPairingConfig
): { score: number; breakdown: Record<string, number>; warnings: string[] } {
    let score = 100;
    const breakdown: Record<string, number> = {};
    const warnings: string[] = [];

    // Handicap balance (40 points)
    const handicapGap = calculateHandicapGap(teamAPlayers, teamBPlayers, sessionType);
    const handicapScore = Math.max(0, 40 - (handicapGap * 4));
    breakdown.handicap = handicapScore;
    score = score - (40 - handicapScore);

    if (handicapGap > config.maxHandicapGap) {
        warnings.push(`Large handicap gap: ${handicapGap.toFixed(1)} strokes`);
    }

    // Repeat matchups (30 points)
    if (config.avoidRepeatMatchups) {
        const teamAIds = teamAPlayers.map(p => p.id);
        const teamBIds = teamBPlayers.map(p => p.id);
        let repeatCount = 0;

        for (const aId of teamAIds) {
            for (const bId of teamBIds) {
                repeatCount += countMatchups(aId, bId, history, 'opponents');
            }
        }

        const repeatScore = Math.max(0, 30 - (repeatCount * 10));
        breakdown.repeats = repeatScore;
        score = score - (30 - repeatScore);

        if (repeatCount > 0) {
            warnings.push(`Repeat matchup (${repeatCount} previous meeting${repeatCount > 1 ? 's' : ''})`);
        }
    } else {
        breakdown.repeats = 30;
    }

    // Repeat partnerships (15 points)
    if (config.avoidRepeatPartnerships && sessionType !== 'singles') {
        let partnerRepeatCount = 0;

        if (teamAPlayers.length >= 2) {
            partnerRepeatCount += countMatchups(teamAPlayers[0].id, teamAPlayers[1].id, history, 'partners');
        }
        if (teamBPlayers.length >= 2) {
            partnerRepeatCount += countMatchups(teamBPlayers[0].id, teamBPlayers[1].id, history, 'partners');
        }

        const partnerScore = Math.max(0, 15 - (partnerRepeatCount * 5));
        breakdown.partnerships = partnerScore;
        score = score - (15 - partnerScore);

        if (partnerRepeatCount > 0) {
            warnings.push('Repeat partnership');
        }
    } else {
        breakdown.partnerships = 15;
    }

    // Constraint violations (15 points)
    if (config.respectConstraints) {
        const violations = checkConstraints(
            teamAPlayers.map(p => p.id),
            teamBPlayers.map(p => p.id),
            constraints
        );

        const constraintScore = Math.max(0, 15 - (violations.length * 15));
        breakdown.constraints = constraintScore;
        score = score - (15 - constraintScore);

        warnings.push(...violations);
    } else {
        breakdown.constraints = 15;
    }

    return { score: Math.max(0, Math.min(100, score)), breakdown, warnings };
}

/**
 * Generate smart pairing suggestions for a session
 */
export function generatePairingSuggestions(
    session: RyderCupSession,
    teamAPlayers: Player[],
    teamBPlayers: Player[],
    history: PairingHistoryEntry[],
    constraints: PairingConstraint[],
    matchCount: number,
    config: Partial<SmartPairingConfig> = {}
): PairingSuggestion[] {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    const playersPerTeam = session.sessionType === 'singles' ? 1 : 2;

    // Simple greedy algorithm for now
    // In production, could use more sophisticated optimization

    const suggestions: PairingSuggestion[] = [];
    const usedTeamA = new Set<string>();
    const usedTeamB = new Set<string>();

    for (let slot = 0; slot < matchCount; slot++) {
        const availableA = teamAPlayers.filter(p => !usedTeamA.has(p.id));
        const availableB = teamBPlayers.filter(p => !usedTeamB.has(p.id));

        if (availableA.length < playersPerTeam || availableB.length < playersPerTeam) {
            break; // Not enough players
        }

        // Find best pairing for this slot
        let bestPairing: {
            teamA: Player[];
            teamB: Player[];
            score: number;
            warnings: string[];
        } | null = null;

        // Generate candidate pairings
        const teamACombos = getCombinations(availableA, playersPerTeam);
        const teamBCombos = getCombinations(availableB, playersPerTeam);

        for (const teamA of teamACombos) {
            for (const teamB of teamBCombos) {
                const { score, warnings } = calculateFairnessScore(
                    teamA,
                    teamB,
                    session.sessionType,
                    history,
                    constraints,
                    finalConfig
                );

                if (!bestPairing || score > bestPairing.score) {
                    bestPairing = { teamA, teamB, score, warnings };
                }
            }
        }

        if (bestPairing) {
            const handicapGap = calculateHandicapGap(
                bestPairing.teamA,
                bestPairing.teamB,
                session.sessionType
            );

            suggestions.push({
                matchSlot: slot + 1,
                teamAPlayers: bestPairing.teamA.map(p => p.id),
                teamBPlayers: bestPairing.teamB.map(p => p.id),
                handicapGap,
                fairnessScore: bestPairing.score,
                reasoning: generateReasoning(bestPairing.teamA, bestPairing.teamB, history),
                warnings: bestPairing.warnings,
            });

            // Mark players as used
            bestPairing.teamA.forEach(p => usedTeamA.add(p.id));
            bestPairing.teamB.forEach(p => usedTeamB.add(p.id));
        }
    }

    return suggestions;
}

/**
 * Generate reasoning text for a pairing
 */
function generateReasoning(
    teamAPlayers: Player[],
    teamBPlayers: Player[],
    history: PairingHistoryEntry[]
): string[] {
    const reasons: string[] = [];

    // Check if fresh matchup
    let isFirstMeeting = true;
    for (const a of teamAPlayers) {
        for (const b of teamBPlayers) {
            if (countMatchups(a.id, b.id, history, 'opponents') > 0) {
                isFirstMeeting = false;
                break;
            }
        }
    }

    if (isFirstMeeting) {
        reasons.push('First-time matchup');
    }

    // Handicap comparison
    const avgA = teamAPlayers.reduce((sum, p) => sum + (p.handicapIndex ?? 18), 0) / teamAPlayers.length;
    const avgB = teamBPlayers.reduce((sum, p) => sum + (p.handicapIndex ?? 18), 0) / teamBPlayers.length;
    const diff = Math.abs(avgA - avgB);

    if (diff < 2) {
        reasons.push('Well-matched handicaps');
    } else if (diff < 5) {
        reasons.push('Competitive handicap gap');
    }

    return reasons;
}

/**
 * Get all combinations of size k from array
 */
function getCombinations<T>(array: T[], k: number): T[][] {
    if (k === 1) {
        return array.map(item => [item]);
    }

    const result: T[][] = [];

    for (let i = 0; i <= array.length - k; i++) {
        const head = array[i];
        const tailCombos = getCombinations(array.slice(i + 1), k - 1);

        for (const tailCombo of tailCombos) {
            result.push([head, ...tailCombo]);
        }
    }

    return result;
}

/**
 * Analyze complete session pairings
 */
export function analyzeSessionPairings(
    session: RyderCupSession,
    matches: Match[],
    teamAPlayers: Player[],
    teamBPlayers: Player[],
    history: PairingHistoryEntry[],
    constraints: PairingConstraint[],
    config: Partial<SmartPairingConfig> = {}
): PairingAnalysis {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    const sessionMatches = matches.filter(m => m.sessionId === session.id);

    let totalFairness = 0;
    let totalHandicapScore = 0;
    let repeatMatchups = 0;
    let repeatPartnerships = 0;
    const allViolations: string[] = [];

    // Calculate total stroke advantage
    let strokeDiff = 0;

    for (const match of sessionMatches) {
        const matchTeamA = teamAPlayers.filter(p => match.teamAPlayerIds.includes(p.id));
        const matchTeamB = teamBPlayers.filter(p => match.teamBPlayerIds.includes(p.id));

        const { score, breakdown, warnings } = calculateFairnessScore(
            matchTeamA,
            matchTeamB,
            session.sessionType,
            history,
            constraints,
            finalConfig
        );

        totalFairness += score;
        totalHandicapScore += breakdown.handicap || 0;

        // Count repeats
        for (const aId of match.teamAPlayerIds) {
            for (const bId of match.teamBPlayerIds) {
                repeatMatchups += countMatchups(aId, bId, history, 'opponents');
            }
        }

        // Count partner repeats
        if (session.sessionType !== 'singles' && match.teamAPlayerIds.length >= 2) {
            repeatPartnerships += countMatchups(match.teamAPlayerIds[0], match.teamAPlayerIds[1], history, 'partners');
        }
        if (session.sessionType !== 'singles' && match.teamBPlayerIds.length >= 2) {
            repeatPartnerships += countMatchups(match.teamBPlayerIds[0], match.teamBPlayerIds[1], history, 'partners');
        }

        // Calculate stroke advantage
        const teamAHdcp = calculateTeamHandicap(matchTeamA, session.sessionType);
        const teamBHdcp = calculateTeamHandicap(matchTeamB, session.sessionType);
        strokeDiff += teamBHdcp - teamAHdcp; // Positive = Team A advantage

        allViolations.push(...warnings.filter(w => w.includes('constraint')));
    }

    const matchCount = sessionMatches.length || 1;

    return {
        sessionId: session.id,
        overallFairnessScore: Math.round(totalFairness / matchCount),
        handicapBalance: Math.round((totalHandicapScore / matchCount) * (100 / 40)),
        experienceBalance: 100, // Would need more data
        repeatMatchupCount: repeatMatchups,
        repeatPartnershipCount: repeatPartnerships,
        constraintViolations: [...new Set(allViolations)],
        suggestions: generateSuggestions(totalFairness / matchCount, repeatMatchups),
        strokeAdvantage: {
            team: strokeDiff > 0.5 ? 'A' : strokeDiff < -0.5 ? 'B' : 'even',
            strokes: Math.abs(strokeDiff),
        },
    };
}

/**
 * Generate improvement suggestions
 */
function generateSuggestions(fairnessScore: number, repeatCount: number): string[] {
    const suggestions: string[] = [];

    if (fairnessScore < 70) {
        suggestions.push('Consider using Auto-Fill for better balance');
    }

    if (repeatCount > 2) {
        suggestions.push('Multiple repeat matchups - try shuffling pairings');
    }

    if (suggestions.length === 0) {
        suggestions.push('Pairings look well-balanced');
    }

    return suggestions;
}
