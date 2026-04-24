/**
 * Spectator Mode Service
 *
 * Read-only view of tournament progress:
 * - Live scoreboard
 * - Match status
 * - No edit controls
 */

import type {
    SpectatorView,
    SpectatorMatch,
} from '@/lib/types/captain';
import type {
    Trip,
    Team,
    RyderCupSession,
    Match,
    HoleResult,
    Player,
} from '@/lib/types/models';
import type { MatchState } from '@/lib/types/computed';

import { TEAM_COLORS } from '@/lib/constants/teamColors';
import {
    calculateMatchPoints,
    calculateMatchState,
} from '@/lib/services/scoringEngine';

function isCompletedMatchState(state: MatchState): boolean {
    return state.isClosedOut || state.holesRemaining === 0;
}

function getSpectatorStatus(match: Match, state: MatchState): Match['status'] {
    if (match.status === 'cancelled') return 'cancelled';
    if (isCompletedMatchState(state)) return 'completed';
    if (state.holesPlayed > 0 || match.status === 'inProgress') return 'inProgress';
    return 'scheduled';
}

function isTerminalSpectatorStatus(status: Match['status']): boolean {
    return status === 'completed' || status === 'cancelled';
}

/**
 * Build spectator view for a trip
 */
export function buildSpectatorView(
    trip: Trip,
    teams: Team[],
    sessions: RyderCupSession[],
    matches: Match[],
    holeResults: HoleResult[],
    players: Player[],
    pointsToWin: number = 14.5
): SpectatorView {
    const teamA = teams.find(t => t.color === 'usa') || teams[0];
    const teamB = teams.find(t => t.color === 'europe') || teams[1];
    const cupSessionIds = new Set(
        sessions
            .filter((session) => !session.isPracticeSession)
            .map((session) => session.id)
    );
    const cupMatches = matches.filter(
        (match) => cupSessionIds.has(match.sessionId) && match.mode !== 'practice'
    );
    const spectatorMatches = cupMatches.map((match) => {
        const results = holeResults.filter((holeResult) => holeResult.matchId === match.id);
        const state = calculateMatchState(match, results);
        const status = getSpectatorStatus(match, state);
        return { match, state, status };
    });

    // Calculate current points
    let teamAPoints = 0;
    let teamBPoints = 0;

    for (const { state } of spectatorMatches.filter((entry) => entry.status === 'completed')) {
        const points = calculateMatchPoints(state);
        teamAPoints += points.teamAPoints;
        teamBPoints += points.teamBPoints;
    }

    // Determine overall status
    const hasLive = spectatorMatches.some((entry) => entry.status === 'inProgress');
    const hasCompleted = spectatorMatches.some((entry) => entry.status === 'completed');
    const allCompleted =
        spectatorMatches.length > 0 &&
        spectatorMatches.every((entry) => isTerminalSpectatorStatus(entry.status));

    let currentStatus: 'upcoming' | 'live' | 'completed';
    if (allCompleted && hasCompleted) {
        currentStatus = 'completed';
    } else if (hasLive) {
        currentStatus = 'live';
    } else {
        currentStatus = 'upcoming';
    }

    // Build live matches
    const liveMatches = spectatorMatches
        .filter((entry) => entry.status === 'inProgress')
        .map((entry) => buildSpectatorMatch(entry.match, sessions, holeResults, players, entry.state));

    // Build recent results (last 5 completed)
    const recentResults = spectatorMatches
        .filter((entry) => entry.status === 'completed')
        .sort(
            (a, b) =>
                new Date(b.match.updatedAt).getTime() - new Date(a.match.updatedAt).getTime()
        )
        .slice(0, 5)
        .map((entry) => buildSpectatorMatch(entry.match, sessions, holeResults, players, entry.state));

    // Calculate magic number
    const teamANeeds = Math.max(0, pointsToWin - teamAPoints);
    const teamBNeeds = Math.max(0, pointsToWin - teamBPoints);

    let magicNumber: SpectatorView['magicNumber'] = undefined;
    if (teamANeeds <= teamBNeeds && teamANeeds < pointsToWin) {
        magicNumber = { team: 'A', points: teamANeeds };
    } else if (teamBNeeds < teamANeeds && teamBNeeds < pointsToWin) {
        magicNumber = { team: 'B', points: teamBNeeds };
    }

    return {
        tripId: trip.id,
        tripName: trip.name,
        teamA: {
            name: teamA?.name || 'Team USA',
            points: teamAPoints,
            color: TEAM_COLORS.teamA,
        },
        teamB: {
            name: teamB?.name || 'Team Europe',
            points: teamBPoints,
            color: TEAM_COLORS.teamB,
        },
        pointsToWin,
        currentStatus,
        liveMatches,
        recentResults,
        magicNumber,
    };
}

/**
 * Build spectator match data
 */
function buildSpectatorMatch(
    match: Match,
    sessions: RyderCupSession[],
    holeResults: HoleResult[],
    players: Player[],
    precomputedState?: MatchState
): SpectatorMatch {
    const session = sessions.find(s => s.id === match.sessionId);
    const results = holeResults.filter(hr => hr.matchId === match.id);

    // Get player names
    const teamAPlayers = match.teamAPlayerIds
        .map(id => players.find(p => p.id === id))
        .filter(Boolean)
        .map(p => `${p!.firstName[0]}. ${p!.lastName}`)
        .join(' & ');

    const teamBPlayers = match.teamBPlayerIds
        .map(id => players.find(p => p.id === id))
        .filter(Boolean)
        .map(p => `${p!.firstName[0]}. ${p!.lastName}`)
        .join(' & ');

    // Calculate current score using shared scoring engine logic
    const summary = precomputedState ?? calculateMatchState(match, results);
    const status = getSpectatorStatus(match, summary);
    const margin = Math.abs(summary.currentScore);
    const thruHole = summary.holesPlayed;

    let currentScore: string;
    if (status === 'completed') {
        currentScore = summary.winningTeam === 'halved' ? 'Halved' : summary.displayScore;
    } else if (status === 'inProgress') {
        if (margin === 0 || !summary.winningTeam || summary.winningTeam === 'halved') {
            currentScore = 'AS';
        } else {
            const upTeam = summary.winningTeam === 'teamA' ? 'A' : 'B';
            currentScore = `${upTeam} ${margin} UP`;
        }
    } else {
        currentScore = '-';
    }

    return {
        id: match.id,
        sessionName: session?.name || 'Match',
        teamAPlayers,
        teamBPlayers,
        status,
        currentScore,
        thruHole,
        result: status === 'completed' ? currentScore : undefined,
    };
}

/**
 * Format score for spectator display
 */
export function formatSpectatorMatchScore(
    winner: 'teamA' | 'teamB' | 'halved',
    margin: number,
    holesRemaining: number
): string {
    if (winner === 'halved') return 'Halved';
    if (holesRemaining === 0) return `${margin} UP`;
    if (margin > holesRemaining) return `${margin}&${holesRemaining}`;
    return `${margin} UP`;
}

/**
 * Calculate projected final score
 */
export function calculateProjectedScore(
    currentTeamAPoints: number,
    currentTeamBPoints: number,
    liveMatches: SpectatorMatch[]
): { teamA: number; teamB: number } {
    let projectedA = currentTeamAPoints;
    let projectedB = currentTeamBPoints;

    for (const match of liveMatches) {
        // Assume current leader wins
        if (match.currentScore.includes('A')) {
            projectedA += 1;
        } else if (match.currentScore.includes('B')) {
            projectedB += 1;
        } else {
            // All square - split
            projectedA += 0.5;
            projectedB += 0.5;
        }
    }

    return { teamA: projectedA, teamB: projectedB };
}

/**
 * Generate scoreboard text for sharing
 */
export function generateScoreboardText(view: SpectatorView): string {
    const lines: string[] = [
        `🏆 ${view.tripName}`,
        '',
        `${view.teamA.name}: ${view.teamA.points}`,
        `${view.teamB.name}: ${view.teamB.points}`,
        '',
    ];

    if (view.currentStatus === 'live' && view.liveMatches.length > 0) {
        lines.push('🔴 LIVE MATCHES:');
        for (const match of view.liveMatches) {
            lines.push(`  ${match.teamAPlayers} vs ${match.teamBPlayers}`);
            lines.push(`  Score: ${match.currentScore} (Thru ${match.thruHole})`);
        }
    }

    if (view.magicNumber) {
        const team = view.magicNumber.team === 'A' ? view.teamA.name : view.teamB.name;
        lines.push('');
        lines.push(`✨ ${team} needs ${view.magicNumber.points} pts to win!`);
    }

    return lines.join('\n');
}

/**
 * Get session status summary
 */
export function getSessionSummary(
    session: RyderCupSession,
    matches: Match[]
): {
    total: number;
    completed: number;
    inProgress: number;
    upcoming: number;
    teamAWins: number;
    teamBWins: number;
    halved: number;
} {
    const sessionMatches = matches.filter(m => m.sessionId === session.id);

    return {
        total: sessionMatches.length,
        completed: sessionMatches.filter(m => m.status === 'completed').length,
        inProgress: sessionMatches.filter(m => m.status === 'inProgress').length,
        upcoming: sessionMatches.filter(m => m.status === 'scheduled').length,
        teamAWins: sessionMatches.filter(m => m.result === 'teamAWin').length,
        teamBWins: sessionMatches.filter(m => m.result === 'teamBWin').length,
        halved: sessionMatches.filter(m => m.result === 'halved').length,
    };
}
