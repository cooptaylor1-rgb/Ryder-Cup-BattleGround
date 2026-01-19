/**
 * Lineup Builder Service (Production Quality)
 *
 * Provides algorithms and utilities for building match lineups:
 * - Auto-fill with handicap balancing
 * - Fairness scoring
 * - Pairing history tracking
 * - Drag-and-drop support
 */

import { db } from '../db';
import type {
    UUID,
    Player,
    Match,
} from '../types/models';

// ============================================
// TYPES
// ============================================

export interface LineupPlayer {
    id: UUID;
    name: string;
    firstName: string;
    lastName: string;
    handicap: number | null;
    teamColor: 'usa' | 'europe';
    teamId: UUID;
}

export interface LineupMatch {
    matchNumber: number;
    teamAPlayers: LineupPlayer[];
    teamBPlayers: LineupPlayer[];
    locked: boolean;
}

export interface LineupState {
    sessionId: UUID;
    sessionType: string;
    playersPerMatch: number;
    matches: LineupMatch[];
    availableTeamA: LineupPlayer[];
    availableTeamB: LineupPlayer[];
}

export interface FairnessScore {
    overall: number; // 0-100
    handicapBalance: number;
    pairingVariety: number;
    matchupBalance: number;
    issues: FairnessIssue[];
    favoredTeam: 'usa' | 'europe' | 'balanced';
    advantageStrokes: number;
}

export interface FairnessIssue {
    severity: 'low' | 'medium' | 'high';
    message: string;
    matchNumber?: number;
}

export interface PairingHistory {
    playerId: UUID;
    partnerIds: UUID[]; // Players they've been partnered with
    opponentIds: UUID[]; // Players they've faced
    partnerCounts: Map<UUID, number>;
    opponentCounts: Map<UUID, number>;
}

export interface AutoFillOptions {
    optimizeForHandicap: boolean;
    minimizeRepeatPartners: boolean;
    minimizeRepeatOpponents: boolean;
    respectLockedMatches: boolean;
}

// ============================================
// CONSTANTS
// ============================================

const DEFAULT_AUTO_FILL_OPTIONS: AutoFillOptions = {
    optimizeForHandicap: true,
    minimizeRepeatPartners: true,
    minimizeRepeatOpponents: true,
    respectLockedMatches: true,
};

// ============================================
// LINEUP STATE MANAGEMENT
// ============================================

/**
 * Initialize lineup state for a session
 */
export async function initializeLineupState(
    sessionId: UUID
): Promise<LineupState | null> {
    const session = await db.sessions.get(sessionId);
    if (!session) return null;

    // Get teams for this trip
    const teams = await db.teams.where('tripId').equals(session.tripId).toArray();
    const teamA = teams.find((t) => t.color === 'usa');
    const teamB = teams.find((t) => t.color === 'europe');
    if (!teamA || !teamB) return null;

    // Get team members
    const allMembers = await db.teamMembers
        .where('teamId')
        .anyOf([teamA.id, teamB.id])
        .toArray();

    const playerIds = allMembers.map((m) => m.playerId);
    const allPlayers = (await db.players.bulkGet(playerIds)).filter(Boolean) as Player[];

    // Build player lookup
    const memberTeamMap = new Map<UUID, UUID>();
    for (const m of allMembers) {
        memberTeamMap.set(m.playerId, m.teamId);
    }

    const teamAPlayers: LineupPlayer[] = [];
    const teamBPlayers: LineupPlayer[] = [];

    for (const player of allPlayers) {
        const teamId = memberTeamMap.get(player.id);
        if (!teamId) continue;

        const lineupPlayer: LineupPlayer = {
            id: player.id,
            name: `${player.firstName} ${player.lastName}`,
            firstName: player.firstName,
            lastName: player.lastName,
            handicap: player.handicapIndex ?? null,
            teamColor: teamId === teamA.id ? 'usa' : 'europe',
            teamId,
        };

        if (teamId === teamA.id) {
            teamAPlayers.push(lineupPlayer);
        } else {
            teamBPlayers.push(lineupPlayer);
        }
    }

    // Sort by handicap (lower first)
    const sortByHandicap = (a: LineupPlayer, b: LineupPlayer) =>
        (a.handicap ?? 99) - (b.handicap ?? 99);
    teamAPlayers.sort(sortByHandicap);
    teamBPlayers.sort(sortByHandicap);

    // Get existing matches
    const existingMatches = await db.matches
        .where('sessionId')
        .equals(sessionId)
        .sortBy('matchOrder');

    // Determine players per match based on session type
    const playersPerMatch = session.sessionType === 'singles' ? 1 : 2;

    // Build lineup matches from existing or create empty slots
    const matches: LineupMatch[] = [];
    const usedTeamAPlayerIds = new Set<UUID>();
    const usedTeamBPlayerIds = new Set<UUID>();

    for (const match of existingMatches) {
        const teamAMatchPlayers = teamAPlayers.filter((p) =>
            match.teamAPlayerIds.includes(p.id)
        );
        const teamBMatchPlayers = teamBPlayers.filter((p) =>
            match.teamBPlayerIds.includes(p.id)
        );

        teamAMatchPlayers.forEach((p) => usedTeamAPlayerIds.add(p.id));
        teamBMatchPlayers.forEach((p) => usedTeamBPlayerIds.add(p.id));

        matches.push({
            matchNumber: match.matchOrder,
            teamAPlayers: teamAMatchPlayers,
            teamBPlayers: teamBMatchPlayers,
            locked: match.status !== 'scheduled',
        });
    }

    // Calculate available players
    const availableTeamA = teamAPlayers.filter((p) => !usedTeamAPlayerIds.has(p.id));
    const availableTeamB = teamBPlayers.filter((p) => !usedTeamBPlayerIds.has(p.id));

    return {
        sessionId,
        sessionType: session.sessionType,
        playersPerMatch,
        matches,
        availableTeamA,
        availableTeamB,
    };
}

// ============================================
// AUTO-FILL ALGORITHM
// ============================================

/**
 * Auto-fill lineup with optimized pairings
 */
export async function autoFillLineup(
    state: LineupState,
    tripId: UUID,
    options: AutoFillOptions = DEFAULT_AUTO_FILL_OPTIONS
): Promise<LineupState> {
    const history = await getPairingHistory(tripId, state.sessionId);

    // Get all available players
    let availableA = [...state.availableTeamA];
    let availableB = [...state.availableTeamB];

    // Determine how many matches we can fill
    const minPlayers = Math.min(availableA.length, availableB.length);
    const matchesToFill = Math.floor(minPlayers / state.playersPerMatch);

    const newMatches = [...state.matches];

    for (let i = 0; i < matchesToFill; i++) {
        // Find or create match slot
        let matchIndex = newMatches.findIndex(
            (m) =>
                m.teamAPlayers.length < state.playersPerMatch &&
                m.teamBPlayers.length < state.playersPerMatch &&
                (!options.respectLockedMatches || !m.locked)
        );

        if (matchIndex === -1) {
            // Create new match
            newMatches.push({
                matchNumber: newMatches.length + 1,
                teamAPlayers: [],
                teamBPlayers: [],
                locked: false,
            });
            matchIndex = newMatches.length - 1;
        }

        const match = newMatches[matchIndex];

        // Select players for this match
        const selectedA = selectPlayersForMatch(
            availableA,
            state.playersPerMatch - match.teamAPlayers.length,
            history,
            match.teamAPlayers.map((p) => p.id),
            options
        );

        const selectedB = selectPlayersForMatch(
            availableB,
            state.playersPerMatch - match.teamBPlayers.length,
            history,
            match.teamBPlayers.map((p) => p.id),
            options
        );

        // Add to match
        match.teamAPlayers = [...match.teamAPlayers, ...selectedA];
        match.teamBPlayers = [...match.teamBPlayers, ...selectedB];

        // Remove from available
        const selectedAIds = new Set(selectedA.map((p) => p.id));
        const selectedBIds = new Set(selectedB.map((p) => p.id));
        availableA = availableA.filter((p) => !selectedAIds.has(p.id));
        availableB = availableB.filter((p) => !selectedBIds.has(p.id));
    }

    // If optimizing for handicap, rebalance matchups
    if (options.optimizeForHandicap) {
        optimizeMatchupsByHandicap(newMatches);
    }

    return {
        ...state,
        matches: newMatches,
        availableTeamA: availableA,
        availableTeamB: availableB,
    };
}

function selectPlayersForMatch(
    available: LineupPlayer[],
    count: number,
    history: Map<UUID, PairingHistory>,
    existingPartnerIds: UUID[],
    options: AutoFillOptions
): LineupPlayer[] {
    if (available.length === 0 || count === 0) return [];

    // Score each available player
    const scored = available.map((player) => {
        let score = 0;
        const playerHistory = history.get(player.id);

        // Prefer players we haven't partnered with existing players
        if (options.minimizeRepeatPartners && playerHistory) {
            for (const partnerId of existingPartnerIds) {
                const partnerCount = playerHistory.partnerCounts.get(partnerId) || 0;
                score -= partnerCount * 10;
            }
        }

        // Add some randomness to avoid predictable lineups
        score += Math.random() * 5;

        return { player, score };
    });

    // Sort by score (higher is better)
    scored.sort((a, b) => b.score - a.score);

    return scored.slice(0, count).map((s) => s.player);
}

function optimizeMatchupsByHandicap(matches: LineupMatch[]): void {
    // Sort each team's players by combined handicap
    const matchHandicaps = matches.map((match, index) => {
        const teamAHandicap = match.teamAPlayers.reduce(
            (sum, p) => sum + (p.handicap ?? 20),
            0
        );
        const teamBHandicap = match.teamBPlayers.reduce(
            (sum, p) => sum + (p.handicap ?? 20),
            0
        );
        return { index, teamAHandicap, teamBHandicap, diff: teamAHandicap - teamBHandicap };
    });

    // Sort matches by handicap (strongest first)
    matchHandicaps.sort((a, b) => a.teamAHandicap - b.teamAHandicap);

    // Reorder matches to balance overall handicap advantage
    const reordered: LineupMatch[] = [];
    let teamAAdvantage = 0;

    for (const mh of matchHandicaps) {
        const match = matches[mh.index];
        if (teamAAdvantage > 0) {
            // Team A has been favored, put them against stronger Team B
            reordered.push(match);
        } else {
            // Team B has been favored, give Team A an easier matchup
            reordered.unshift(match);
        }
        teamAAdvantage += mh.diff;
    }

    // Update match numbers
    for (let i = 0; i < reordered.length; i++) {
        matches[i] = { ...reordered[i], matchNumber: i + 1 };
    }
}

// ============================================
// FAIRNESS SCORING
// ============================================

/**
 * Calculate fairness score for a lineup
 */
export async function calculateFairnessScore(
    state: LineupState,
    tripId: UUID
): Promise<FairnessScore> {
    const history = await getPairingHistory(tripId, state.sessionId);
    const issues: FairnessIssue[] = [];

    // 1. Handicap Balance (0-100)
    let totalTeamAHandicap = 0;
    let totalTeamBHandicap = 0;

    for (const match of state.matches) {
        const teamAHcp = match.teamAPlayers.reduce((sum, p) => sum + (p.handicap ?? 18), 0);
        const teamBHcp = match.teamBPlayers.reduce((sum, p) => sum + (p.handicap ?? 18), 0);
        totalTeamAHandicap += teamAHcp;
        totalTeamBHandicap += teamBHcp;

        // Check for lopsided individual matches
        const matchDiff = Math.abs(teamAHcp - teamBHcp);
        if (matchDiff > 10) {
            issues.push({
                severity: 'high',
                message: `Match ${match.matchNumber} has ${matchDiff} stroke handicap difference`,
                matchNumber: match.matchNumber,
            });
        } else if (matchDiff > 6) {
            issues.push({
                severity: 'medium',
                message: `Match ${match.matchNumber} has ${matchDiff} stroke difference`,
                matchNumber: match.matchNumber,
            });
        }
    }

    const totalDiff = Math.abs(totalTeamAHandicap - totalTeamBHandicap);
    const maxPossibleDiff = state.matches.length * state.playersPerMatch * 36; // Worst case
    const handicapBalance = Math.max(0, 100 - (totalDiff / maxPossibleDiff) * 100 * 10);

    // 2. Pairing Variety (0-100)
    let repeatPartners = 0;
    let totalPairings = 0;

    for (const match of state.matches) {
        if (state.playersPerMatch === 2) {
            // Check Team A partners
            if (match.teamAPlayers.length === 2) {
                totalPairings++;
                const [p1, p2] = match.teamAPlayers;
                const h1 = history.get(p1.id);
                if (h1 && h1.partnerCounts.get(p2.id)) {
                    repeatPartners++;
                }
            }
            // Check Team B partners
            if (match.teamBPlayers.length === 2) {
                totalPairings++;
                const [p1, p2] = match.teamBPlayers;
                const h1 = history.get(p1.id);
                if (h1 && h1.partnerCounts.get(p2.id)) {
                    repeatPartners++;
                }
            }
        }
    }

    const pairingVariety = totalPairings > 0 ? 100 - (repeatPartners / totalPairings) * 100 : 100;

    if (repeatPartners > 0) {
        issues.push({
            severity: 'low',
            message: `${repeatPartners} repeat partner pairing${repeatPartners > 1 ? 's' : ''}`,
        });
    }

    // 3. Matchup Balance (0-100)
    let repeatMatchups = 0;
    let totalMatchups = 0;

    for (const match of state.matches) {
        for (const teamAPlayer of match.teamAPlayers) {
            for (const teamBPlayer of match.teamBPlayers) {
                totalMatchups++;
                const h1 = history.get(teamAPlayer.id);
                if (h1 && h1.opponentCounts.get(teamBPlayer.id)) {
                    repeatMatchups++;
                }
            }
        }
    }

    const matchupBalance = totalMatchups > 0 ? 100 - (repeatMatchups / totalMatchups) * 50 : 100;

    if (repeatMatchups > 2) {
        issues.push({
            severity: 'medium',
            message: `${repeatMatchups} repeat opponent matchup${repeatMatchups > 1 ? 's' : ''}`,
        });
    }

    // Overall score (weighted average)
    const overall = Math.round(
        handicapBalance * 0.5 + pairingVariety * 0.25 + matchupBalance * 0.25
    );

    // Determine advantage
    const advantageStrokes = (totalTeamAHandicap - totalTeamBHandicap) / state.matches.length;
    const favoredTeam: 'usa' | 'europe' | 'balanced' =
        advantageStrokes > 1 ? 'europe' : advantageStrokes < -1 ? 'usa' : 'balanced';

    return {
        overall,
        handicapBalance: Math.round(handicapBalance),
        pairingVariety: Math.round(pairingVariety),
        matchupBalance: Math.round(matchupBalance),
        issues,
        favoredTeam,
        advantageStrokes: Math.abs(Math.round(advantageStrokes * 10) / 10),
    };
}

// ============================================
// PAIRING HISTORY
// ============================================

/**
 * Get pairing history for a trip
 */
export async function getPairingHistory(
    tripId: UUID,
    excludeSessionId?: UUID
): Promise<Map<UUID, PairingHistory>> {
    // Get all sessions for this trip
    const sessions = await db.sessions.where('tripId').equals(tripId).toArray();
    const sessionIds = sessions
        .filter((s) => s.id !== excludeSessionId)
        .map((s) => s.id);

    // Get all matches from previous sessions
    const matches = await db.matches.where('sessionId').anyOf(sessionIds).toArray();

    const historyMap = new Map<UUID, PairingHistory>();

    const getOrCreate = (playerId: UUID): PairingHistory => {
        let h = historyMap.get(playerId);
        if (!h) {
            h = {
                playerId,
                partnerIds: [],
                opponentIds: [],
                partnerCounts: new Map(),
                opponentCounts: new Map(),
            };
            historyMap.set(playerId, h);
        }
        return h;
    };

    for (const match of matches) {
        // Record partnerships within teams
        for (const p1 of match.teamAPlayerIds) {
            const h1 = getOrCreate(p1);
            for (const p2 of match.teamAPlayerIds) {
                if (p1 !== p2) {
                    h1.partnerIds.push(p2);
                    h1.partnerCounts.set(p2, (h1.partnerCounts.get(p2) || 0) + 1);
                }
            }
            // Record opponents
            for (const opp of match.teamBPlayerIds) {
                h1.opponentIds.push(opp);
                h1.opponentCounts.set(opp, (h1.opponentCounts.get(opp) || 0) + 1);
            }
        }

        // Same for Team B
        for (const p1 of match.teamBPlayerIds) {
            const h1 = getOrCreate(p1);
            for (const p2 of match.teamBPlayerIds) {
                if (p1 !== p2) {
                    h1.partnerIds.push(p2);
                    h1.partnerCounts.set(p2, (h1.partnerCounts.get(p2) || 0) + 1);
                }
            }
            for (const opp of match.teamAPlayerIds) {
                h1.opponentIds.push(opp);
                h1.opponentCounts.set(opp, (h1.opponentCounts.get(opp) || 0) + 1);
            }
        }
    }

    return historyMap;
}

// ============================================
// SAVE LINEUP
// ============================================

/**
 * Save lineup state to database (creates/updates matches)
 */
export async function saveLineup(
    state: LineupState,
    _tripId: UUID
): Promise<{ success: boolean; matchIds: UUID[] }> {
    const session = await db.sessions.get(state.sessionId);
    if (!session) {
        return { success: false, matchIds: [] };
    }

    const matchIds: UUID[] = [];
    const now = new Date().toISOString();

    for (const lineupMatch of state.matches) {
        if (lineupMatch.teamAPlayers.length === 0 && lineupMatch.teamBPlayers.length === 0) {
            continue;
        }

        // Check if match already exists
        const existingMatches = await db.matches
            .where('sessionId')
            .equals(state.sessionId)
            .filter((m) => m.matchOrder === lineupMatch.matchNumber)
            .toArray();

        const teamAPlayerIds = lineupMatch.teamAPlayers.map((p) => p.id);
        const teamBPlayerIds = lineupMatch.teamBPlayers.map((p) => p.id);

        if (existingMatches.length > 0) {
            // Update existing match
            const match = existingMatches[0];
            await db.matches.update(match.id, {
                teamAPlayerIds,
                teamBPlayerIds,
                updatedAt: now,
            });
            matchIds.push(match.id);
        } else {
            // Create new match
            const matchId = crypto.randomUUID();
            const newMatch: Match = {
                id: matchId,
                sessionId: state.sessionId,
                matchOrder: lineupMatch.matchNumber,
                status: 'scheduled',
                currentHole: 1,
                teamAPlayerIds,
                teamBPlayerIds,
                teamAHandicapAllowance: 0,
                teamBHandicapAllowance: 0,
                result: 'notFinished',
                margin: 0,
                holesRemaining: 18,
                createdAt: now,
                updatedAt: now,
            };
            await db.matches.add(newMatch);
            matchIds.push(matchId);
        }
    }

    return { success: true, matchIds };
}

// ============================================
// UTILITIES
// ============================================

/**
 * Move a player from available pool to a match
 */
export function movePlayerToMatch(
    state: LineupState,
    playerId: UUID,
    matchNumber: number,
    team: 'teamA' | 'teamB'
): LineupState {
    const newState = { ...state };
    const isTeamA = team === 'teamA';

    // Find player in available pool
    const availablePool = isTeamA ? [...state.availableTeamA] : [...state.availableTeamB];
    const playerIndex = availablePool.findIndex((p) => p.id === playerId);

    if (playerIndex === -1) return state;

    const [player] = availablePool.splice(playerIndex, 1);

    // Find or create match
    const matches = [...state.matches];
    let matchIndex = matches.findIndex((m) => m.matchNumber === matchNumber);

    if (matchIndex === -1) {
        matches.push({
            matchNumber,
            teamAPlayers: [],
            teamBPlayers: [],
            locked: false,
        });
        matchIndex = matches.length - 1;
    }

    const match = { ...matches[matchIndex] };
    if (isTeamA) {
        match.teamAPlayers = [...match.teamAPlayers, player];
    } else {
        match.teamBPlayers = [...match.teamBPlayers, player];
    }
    matches[matchIndex] = match;

    return {
        ...newState,
        matches,
        availableTeamA: isTeamA ? availablePool : state.availableTeamA,
        availableTeamB: isTeamA ? state.availableTeamB : availablePool,
    };
}

/**
 * Remove a player from a match back to available pool
 */
export function removePlayerFromMatch(
    state: LineupState,
    playerId: UUID,
    matchNumber: number
): LineupState {
    const newState = { ...state };
    const matches = [...state.matches];
    const matchIndex = matches.findIndex((m) => m.matchNumber === matchNumber);

    if (matchIndex === -1) return state;

    const match = { ...matches[matchIndex] };
    let player: LineupPlayer | undefined;
    let isTeamA = true;

    // Check Team A
    const teamAIndex = match.teamAPlayers.findIndex((p) => p.id === playerId);
    if (teamAIndex !== -1) {
        player = match.teamAPlayers[teamAIndex];
        match.teamAPlayers = match.teamAPlayers.filter((p) => p.id !== playerId);
    } else {
        // Check Team B
        const teamBIndex = match.teamBPlayers.findIndex((p) => p.id === playerId);
        if (teamBIndex !== -1) {
            player = match.teamBPlayers[teamBIndex];
            match.teamBPlayers = match.teamBPlayers.filter((p) => p.id !== playerId);
            isTeamA = false;
        }
    }

    if (!player) return state;

    matches[matchIndex] = match;

    return {
        ...newState,
        matches,
        availableTeamA: isTeamA
            ? [...state.availableTeamA, player].sort((a, b) => (a.handicap ?? 99) - (b.handicap ?? 99))
            : state.availableTeamA,
        availableTeamB: !isTeamA
            ? [...state.availableTeamB, player].sort((a, b) => (a.handicap ?? 99) - (b.handicap ?? 99))
            : state.availableTeamB,
    };
}

/**
 * Clear all matches (reset lineup)
 */
export function clearLineup(state: LineupState): LineupState {
    const allTeamAPlayers: LineupPlayer[] = [];
    const allTeamBPlayers: LineupPlayer[] = [];

    // Collect all players from matches
    for (const match of state.matches) {
        if (!match.locked) {
            allTeamAPlayers.push(...match.teamAPlayers);
            allTeamBPlayers.push(...match.teamBPlayers);
        }
    }

    // Add back to available pools
    const availableTeamA = [...state.availableTeamA, ...allTeamAPlayers].sort(
        (a, b) => (a.handicap ?? 99) - (b.handicap ?? 99)
    );
    const availableTeamB = [...state.availableTeamB, ...allTeamBPlayers].sort(
        (a, b) => (a.handicap ?? 99) - (b.handicap ?? 99)
    );

    // Keep only locked matches
    const matches = state.matches.filter((m) => m.locked).map((m, i) => ({
        ...m,
        matchNumber: i + 1,
    }));

    return {
        ...state,
        matches,
        availableTeamA,
        availableTeamB,
    };
}
