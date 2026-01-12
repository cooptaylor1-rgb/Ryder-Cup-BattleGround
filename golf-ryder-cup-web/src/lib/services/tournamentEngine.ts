/**
 * Tournament Engine Service
 *
 * Handles overall Ryder Cup tournament logic:
 * - Team standings and points totals
 * - Player records (W-L-H)
 * - Session standings
 * - Magic number calculation
 * - Fairness scoring for lineup validation
 *
 * Ported from Swift: TournamentEngine.swift
 */

import type {
    Trip,
    Team,
    TeamMember,
    Player,
    RyderCupSession,
    Match,
    HoleResult,
    SessionType,
} from '../types/models';
import type {
    TeamStandings,
    PlayerLeaderboard,
    MagicNumber,
    FairnessScore,
    MatchState,
} from '../types/computed';
import { db } from '../db';
import { calculateMatchState, calculateMatchPoints } from './scoringEngine';

// ============================================
// TEAM STANDINGS
// ============================================

/**
 * Calculate current team standings for a trip.
 *
 * @param tripId - The trip ID
 * @returns Team standings with points, matches played, etc.
 */
export async function calculateTeamStandings(tripId: string): Promise<TeamStandings> {
    // Get all sessions for this trip
    const sessions = await db.sessions
        .where('tripId')
        .equals(tripId)
        .toArray();

    // Get all matches for these sessions
    const sessionIds = sessions.map(s => s.id);
    const matches = await db.matches
        .where('sessionId')
        .anyOf(sessionIds)
        .toArray();

    // Get all hole results for these matches
    const matchIds = matches.map(m => m.id);
    const allHoleResults = await db.holeResults
        .where('matchId')
        .anyOf(matchIds)
        .toArray();

    // Group hole results by match
    const resultsByMatch = new Map<string, HoleResult[]>();
    for (const result of allHoleResults) {
        const existing = resultsByMatch.get(result.matchId) || [];
        existing.push(result);
        resultsByMatch.set(result.matchId, existing);
    }

    // Calculate points
    let teamAPoints = 0;
    let teamBPoints = 0;
    let matchesPlayed = 0;
    let matchesCompleted = 0;

    for (const match of matches) {
        const holeResults = resultsByMatch.get(match.id) || [];
        const matchState = calculateMatchState(match, holeResults);

        if (matchState.holesPlayed > 0) {
            matchesPlayed++;
        }

        if (matchState.isClosedOut || matchState.holesRemaining === 0) {
            matchesCompleted++;
            const points = calculateMatchPoints(matchState);
            teamAPoints += points.teamAPoints;
            teamBPoints += points.teamBPoints;
        }
    }

    // Calculate projected points from in-progress matches
    let teamAProjected = teamAPoints;
    let teamBProjected = teamBPoints;

    for (const match of matches) {
        const holeResults = resultsByMatch.get(match.id) || [];
        const matchState = calculateMatchState(match, holeResults);

        if (matchState.holesPlayed > 0 && matchState.holesRemaining > 0 && !matchState.isClosedOut) {
            // In progress - project based on current state
            if (matchState.currentScore > 0) {
                teamAProjected += 1;
            } else if (matchState.currentScore < 0) {
                teamBProjected += 1;
            } else {
                teamAProjected += 0.5;
                teamBProjected += 0.5;
            }
        }
    }

    const totalMatches = matches.length;
    const remainingMatches = totalMatches - matchesCompleted;

    return {
        teamAPoints,
        teamBPoints,
        teamAProjected,
        teamBProjected,
        matchesPlayed,
        matchesCompleted,
        matchesRemaining: remainingMatches,
        totalMatches,
        remainingMatches,
        leader: teamAPoints > teamBPoints ? 'teamA' : teamAPoints < teamBPoints ? 'teamB' : null,
        margin: Math.abs(teamAPoints - teamBPoints),
    };
}

// ============================================
// SESSION STANDINGS
// ============================================

/**
 * Calculate standings for a specific session.
 *
 * @param sessionId - The session ID
 * @returns Session standings
 */
export async function calculateSessionStandings(sessionId: string): Promise<{
    teamAPoints: number;
    teamBPoints: number;
    matchesCompleted: number;
    totalMatches: number;
}> {
    const matches = await db.matches
        .where('sessionId')
        .equals(sessionId)
        .toArray();

    let teamAPoints = 0;
    let teamBPoints = 0;
    let matchesCompleted = 0;

    for (const match of matches) {
        const holeResults = await db.holeResults
            .where('matchId')
            .equals(match.id)
            .toArray();

        const matchState = calculateMatchState(match, holeResults);

        if (matchState.isClosedOut || matchState.holesRemaining === 0) {
            matchesCompleted++;
            const points = calculateMatchPoints(matchState);
            teamAPoints += points.teamAPoints;
            teamBPoints += points.teamBPoints;
        }
    }

    return {
        teamAPoints,
        teamBPoints,
        matchesCompleted,
        totalMatches: matches.length,
    };
}

// ============================================
// PLAYER RECORDS
// ============================================

/**
 * Calculate a player's tournament record (W-L-H).
 *
 * @param playerId - The player ID
 * @param tripId - The trip ID
 * @returns Player's win-loss-halve record
 */
export async function calculatePlayerRecord(
    playerId: string,
    tripId: string
): Promise<{ wins: number; losses: number; halves: number; points: number }> {
    // Get all sessions for this trip
    const sessions = await db.sessions
        .where('tripId')
        .equals(tripId)
        .toArray();

    // Find all matches this player participated in
    const sessionIds = sessions.map(s => s.id);
    const allMatches = await db.matches
        .where('sessionId')
        .anyOf(sessionIds)
        .toArray();

    const playerMatches = allMatches.filter(
        m => m.teamAPlayerIds.includes(playerId) || m.teamBPlayerIds.includes(playerId)
    );

    let wins = 0;
    let losses = 0;
    let halves = 0;

    for (const match of playerMatches) {
        const holeResults = await db.holeResults
            .where('matchId')
            .equals(match.id)
            .toArray();

        const matchState = calculateMatchState(match, holeResults);

        if (matchState.isClosedOut || matchState.holesRemaining === 0) {
            const playerOnTeamA = match.teamAPlayerIds.includes(playerId);

            if (matchState.currentScore === 0) {
                halves++;
            } else if (matchState.currentScore > 0) {
                playerOnTeamA ? wins++ : losses++;
            } else {
                playerOnTeamA ? losses++ : wins++;
            }
        }
    }

    const points = wins + (halves * 0.5);

    return { wins, losses, halves, points };
}

/**
 * Calculate leaderboard for all players in a trip.
 *
 * @param tripId - The trip ID
 * @returns Sorted player leaderboard
 */
export async function calculatePlayerLeaderboard(tripId: string): Promise<PlayerLeaderboard[]> {
    // Get all players for this trip
    const teamMembers = await db.teamMembers.toArray();
    const teams = await db.teams.where('tripId').equals(tripId).toArray();
    const teamIds = teams.map(t => t.id);

    const tripMembers = teamMembers.filter(tm => teamIds.includes(tm.teamId));
    const playerIds = tripMembers.map(tm => tm.playerId);

    const players = await db.players
        .where('id')
        .anyOf(playerIds)
        .toArray();

    // Calculate records for each player
    const leaderboard: PlayerLeaderboard[] = [];

    for (const player of players) {
        const record = await calculatePlayerRecord(player.id, tripId);
        const teamMember = tripMembers.find(tm => tm.playerId === player.id);
        const team = teams.find(t => t.id === teamMember?.teamId);

        leaderboard.push({
            playerId: player.id,
            playerName: `${player.firstName} ${player.lastName}`,
            teamId: team?.id || '',
            teamName: team?.name || 'Unknown',
            ...record,
            matchesPlayed: record.wins + record.losses + record.halves,
        });
    }

    // Sort by points (descending), then win percentage
    leaderboard.sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        const aWinPct = a.matchesPlayed > 0 ? a.wins / a.matchesPlayed : 0;
        const bWinPct = b.matchesPlayed > 0 ? b.wins / b.matchesPlayed : 0;
        return bWinPct - aWinPct;
    });

    return leaderboard;
}

// ============================================
// MAGIC NUMBER
// ============================================

/**
 * Calculate the "magic number" - points needed to clinch.
 *
 * In Ryder Cup, you need 14.5 points to win (majority of 28 possible).
 * This calculates how close each team is to that threshold.
 *
 * @param standings - Current team standings
 * @returns Magic number for each team
 */
export function calculateMagicNumber(standings: TeamStandings): MagicNumber {
    const POINTS_TO_WIN = 14.5;

    const teamANeeded = Math.max(0, POINTS_TO_WIN - standings.teamAPoints);
    const teamBNeeded = Math.max(0, POINTS_TO_WIN - standings.teamBPoints);

    const teamACanClinch = teamANeeded <= standings.remainingMatches;
    const teamBCanClinch = teamBNeeded <= standings.remainingMatches;

    const teamAClinched = standings.teamAPoints >= POINTS_TO_WIN;
    const teamBClinched = standings.teamBPoints >= POINTS_TO_WIN;

    return {
        teamA: teamANeeded,
        teamB: teamBNeeded,
        teamANeeded,
        teamBNeeded,
        teamACanClinch,
        teamBCanClinch,
        teamAClinched,
        teamBClinched,
        pointsToWin: POINTS_TO_WIN,
        hasClinched: teamAClinched || teamBClinched,
        clinchingTeam: teamAClinched ? 'A' : teamBClinched ? 'B' : undefined,
        remainingPoints: standings.remainingMatches,
    };
}

// ============================================
// FAIRNESS SCORING
// ============================================

/**
 * Calculate fairness score for lineup distribution.
 *
 * Ensures:
 * - Players get roughly equal playing time
 * - No one sits out too many sessions
 * - Handicap distribution is balanced
 *
 * @param tripId - The trip ID
 * @param teamId - The team to analyze
 * @returns Fairness score and suggestions
 */
export async function calculateFairnessScore(
    tripId: string,
    teamId: string
): Promise<FairnessScore> {
    const sessions = await db.sessions
        .where('tripId')
        .equals(tripId)
        .toArray();

    const teamMembers = await db.teamMembers
        .where('teamId')
        .equals(teamId)
        .toArray();

    const playerIds = teamMembers.map(tm => tm.playerId);
    const players = await db.players
        .where('id')
        .anyOf(playerIds)
        .toArray();

    // Count matches per player
    const matchCounts = new Map<string, number>();
    const sessionCounts = new Map<string, number>();

    for (const player of players) {
        matchCounts.set(player.id, 0);
        sessionCounts.set(player.id, 0);
    }

    for (const session of sessions) {
        const matches = await db.matches
            .where('sessionId')
            .equals(session.id)
            .toArray();

        const team = await db.teams.get(teamId);
        const isTeamA = team?.name === 'Team USA'; // Simplified check

        const playersInSession = new Set<string>();

        for (const match of matches) {
            const teamPlayers = isTeamA ? match.teamAPlayerIds : match.teamBPlayerIds;

            for (const pid of teamPlayers) {
                if (playerIds.includes(pid)) {
                    matchCounts.set(pid, (matchCounts.get(pid) || 0) + 1);
                    playersInSession.add(pid);
                }
            }
        }

        for (const pid of playersInSession) {
            sessionCounts.set(pid, (sessionCounts.get(pid) || 0) + 1);
        }
    }

    // Calculate fairness metrics
    const matchCountValues = Array.from(matchCounts.values());
    const maxMatches = Math.max(...matchCountValues);
    const minMatches = Math.min(...matchCountValues);
    const matchDisparity = maxMatches - minMatches;

    const sessionCountValues = Array.from(sessionCounts.values());
    const maxSessions = Math.max(...sessionCountValues);
    const minSessions = Math.min(...sessionCountValues);
    const sessionDisparity = maxSessions - minSessions;

    // Score: 100 = perfect balance, lower = more imbalanced
    const matchScore = matchDisparity <= 1 ? 100 : Math.max(0, 100 - (matchDisparity - 1) * 20);
    const sessionScore = sessionDisparity <= 1 ? 100 : Math.max(0, 100 - (sessionDisparity - 1) * 25);
    const overallScore = (matchScore + sessionScore) / 2;

    // Generate suggestions
    const suggestions: string[] = [];

    if (matchDisparity > 2) {
        const underused = players.filter(p => matchCounts.get(p.id) === minMatches);
        const overused = players.filter(p => matchCounts.get(p.id) === maxMatches);

        if (underused.length > 0 && overused.length > 0) {
            suggestions.push(
                `Consider playing ${underused[0].firstName} more (${minMatches} matches) ` +
                `and ${overused[0].firstName} less (${maxMatches} matches)`
            );
        }
    }

    if (sessionDisparity > 1) {
        const sittingOut = players.filter(p => sessionCounts.get(p.id) === 0);
        if (sittingOut.length > 0) {
            suggestions.push(
                `${sittingOut.map(p => p.firstName).join(', ')} haven't played yet`
            );
        }
    }

    // Player fairness breakdown
    const playerFairness = players.map(p => ({
        playerId: p.id,
        playerName: `${p.firstName} ${p.lastName}`,
        matchesPlayed: matchCounts.get(p.id) || 0,
        sessionsPlayed: sessionCounts.get(p.id) || 0,
        expectedMatches: Math.round(sessions.length * 4 / players.length), // Approximate
    }));

    return {
        overallScore,
        matchScore,
        sessionScore,
        matchDisparity,
        sessionDisparity,
        suggestions,
        playerFairness,
    };
}

// ============================================
// SESSION TYPE HELPERS
// ============================================

/**
 * Get match configuration for a session type.
 *
 * @param sessionType - Type of session
 * @returns Configuration for the session
 */
export function getSessionConfig(sessionType: SessionType): {
    playersPerTeam: number;
    matchCount: number;
    pointsPerMatch: number;
    description: string;
} {
    switch (sessionType) {
        case 'fourball':
            return {
                playersPerTeam: 2,
                matchCount: 4,
                pointsPerMatch: 1,
                description: 'Best ball - each player plays their own ball',
            };
        case 'foursomes':
            return {
                playersPerTeam: 2,
                matchCount: 4,
                pointsPerMatch: 1,
                description: 'Alternate shot - partners alternate shots',
            };
        case 'singles':
            return {
                playersPerTeam: 1,
                matchCount: 12,
                pointsPerMatch: 1,
                description: 'Head-to-head individual matches',
            };
    }
}

/**
 * Validate lineup for a session.
 *
 * @param sessionType - Type of session
 * @param teamPlayerIds - Array of player IDs per match
 * @param teamRosterIds - All available player IDs
 * @returns Validation result
 */
export function validateSessionLineup(
    sessionType: SessionType,
    teamPlayerIds: string[][],
    teamRosterIds: string[]
): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    const config = getSessionConfig(sessionType);

    // Check match count
    if (teamPlayerIds.length !== config.matchCount) {
        errors.push(`Expected ${config.matchCount} matches, got ${teamPlayerIds.length}`);
    }

    // Check players per match
    for (let i = 0; i < teamPlayerIds.length; i++) {
        if (teamPlayerIds[i].length !== config.playersPerTeam) {
            errors.push(
                `Match ${i + 1}: Expected ${config.playersPerTeam} players, got ${teamPlayerIds[i].length}`
            );
        }
    }

    // Check for duplicates
    const allPlayers = teamPlayerIds.flat();
    const uniquePlayers = new Set(allPlayers);
    if (uniquePlayers.size !== allPlayers.length) {
        errors.push('Same player appears in multiple matches');
    }

    // Check all players are on roster
    for (const pid of allPlayers) {
        if (!teamRosterIds.includes(pid)) {
            errors.push(`Player ${pid} is not on team roster`);
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}

// ============================================
// TOURNAMENT ENGINE OBJECT
// ============================================

/**
 * Tournament Engine service object.
 * Groups all functions for easier importing.
 */
export const TournamentEngine = {
    // Standings
    calculateTeamStandings,
    calculateSessionStandings,
    calculateMagicNumber,

    // Player stats
    calculatePlayerRecord,
    calculatePlayerLeaderboard,

    // Fairness
    calculateFairnessScore,

    // Session helpers
    getSessionConfig,
    validateSessionLineup,
};

export default TournamentEngine;
