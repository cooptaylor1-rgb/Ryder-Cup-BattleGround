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

    // Calculate current points
    let teamAPoints = 0;
    let teamBPoints = 0;

    for (const match of matches.filter(m => m.status === 'completed')) {
        const results = holeResults.filter(hr => hr.matchId === match.id);
        const { winner } = calculateMatchWinner(results);

        if (winner === 'teamA') teamAPoints += 1;
        else if (winner === 'teamB') teamBPoints += 1;
        else {
            teamAPoints += 0.5;
            teamBPoints += 0.5;
        }
    }

    // Determine overall status
    const hasLive = matches.some(m => m.status === 'inProgress');
    const hasCompleted = matches.some(m => m.status === 'completed');
    const allCompleted = matches.every(m => m.status === 'completed' || m.status === 'cancelled');

    let currentStatus: 'upcoming' | 'live' | 'completed';
    if (allCompleted && hasCompleted) {
        currentStatus = 'completed';
    } else if (hasLive) {
        currentStatus = 'live';
    } else {
        currentStatus = 'upcoming';
    }

    // Build live matches
    const liveMatches = matches
        .filter(m => m.status === 'inProgress')
        .map(m => buildSpectatorMatch(m, sessions, holeResults, players));

    // Build recent results (last 5 completed)
    const recentResults = matches
        .filter(m => m.status === 'completed')
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
        .slice(0, 5)
        .map(m => buildSpectatorMatch(m, sessions, holeResults, players));

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
            color: 'var(--ryder-usa)',
        },
        teamB: {
            name: teamB?.name || 'Team Europe',
            points: teamBPoints,
            color: 'var(--ryder-europe)',
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
    players: Player[]
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

    // Calculate current score
    const { winner, margin, thruHole } = calculateMatchScore(results);

    let currentScore: string;
    if (match.status === 'completed') {
        if (winner === 'halved') {
            currentScore = 'Halved';
        } else {
            const holesRemaining = 18 - thruHole;
            if (holesRemaining === 0) {
                currentScore = `${margin} UP`;
            } else {
                currentScore = `${margin}&${holesRemaining}`;
            }
        }
    } else if (match.status === 'inProgress') {
        if (margin === 0) {
            currentScore = 'AS'; // All Square
        } else {
            const upTeam = winner === 'teamA' ? 'A' : 'B';
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
        status: match.status,
        currentScore,
        thruHole,
        result: match.status === 'completed' ? currentScore : undefined,
    };
}

/**
 * Calculate match winner from hole results
 */
function calculateMatchWinner(
    results: HoleResult[]
): { winner: 'teamA' | 'teamB' | 'halved'; margin: number } {
    let teamAWins = 0;
    let teamBWins = 0;

    for (const hr of results) {
        if (hr.winner === 'teamA') teamAWins++;
        else if (hr.winner === 'teamB') teamBWins++;
    }

    const margin = Math.abs(teamAWins - teamBWins);

    if (teamAWins > teamBWins) {
        return { winner: 'teamA', margin };
    } else if (teamBWins > teamAWins) {
        return { winner: 'teamB', margin };
    }
    return { winner: 'halved', margin: 0 };
}

/**
 * Calculate current match score
 */
function calculateMatchScore(
    results: HoleResult[]
): { winner: 'teamA' | 'teamB' | 'halved'; margin: number; thruHole: number } {
    let teamAWins = 0;
    let teamBWins = 0;
    let maxHole = 0;

    for (const hr of results) {
        if (hr.winner === 'teamA') teamAWins++;
        else if (hr.winner === 'teamB') teamBWins++;
        maxHole = Math.max(maxHole, hr.holeNumber);
    }

    const margin = Math.abs(teamAWins - teamBWins);

    if (teamAWins > teamBWins) {
        return { winner: 'teamA', margin, thruHole: maxHole };
    } else if (teamBWins > teamAWins) {
        return { winner: 'teamB', margin, thruHole: maxHole };
    }
    return { winner: 'halved', margin: 0, thruHole: maxHole };
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
