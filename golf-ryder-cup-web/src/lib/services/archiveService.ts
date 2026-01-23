/**
 * Historical Trip Archive Service
 *
 * Archive past trips for historical comparison:
 * - Trip summaries
 * - Year-over-year comparisons
 * - Career tracking
 */

import type {
    TripArchive,
    PlayerCareerStats,
    TripAward,
    PlayerStatistics,
} from '@/lib/types/captain';
import type {
    Trip,
    Team,
    Player,
    Match,
    HoleResult,
    UUID,
} from '@/lib/types/models';

/**
 * Create trip archive entry
 */
export function createTripArchive(
    trip: Trip,
    teams: Team[],
    matches: Match[],
    holeResults: HoleResult[],
    awards: TripAward[],
    players: Player[]
): TripArchive {
    const teamA = teams.find(t => t.color === 'usa') || teams[0];
    const teamB = teams.find(t => t.color === 'europe') || teams[1];

    // Calculate final scores
    let teamAPoints = 0;
    let teamBPoints = 0;

    for (const match of matches.filter(m => m.status === 'completed')) {
        const results = holeResults.filter(hr => hr.matchId === match.id);
        let aWins = 0;
        let bWins = 0;

        for (const hr of results) {
            if (hr.winner === 'teamA') aWins++;
            else if (hr.winner === 'teamB') bWins++;
        }

        if (aWins > bWins) teamAPoints += 1;
        else if (bWins > aWins) teamBPoints += 1;
        else {
            teamAPoints += 0.5;
            teamBPoints += 0.5;
        }
    }

    // Determine winner
    const winner: 'A' | 'B' | 'tie' =
        teamAPoints > teamBPoints ? 'A' :
            teamBPoints > teamAPoints ? 'B' : 'tie';

    const winningTeamName = winner === 'A' ? teamA?.name || 'Team A' :
        winner === 'B' ? teamB?.name || 'Team B' : 'Tied';

    // Find MVP
    const mvpAward = awards.find(a => a.type === 'mvp');
    const _mvpPlayer = mvpAward ? players.find(p => p.id === mvpAward.playerId) : null;

    // Generate highlights
    const highlights = generateHighlights(
        trip,
        teams,
        matches,
        holeResults,
        awards,
        players,
        teamAPoints,
        teamBPoints
    );

    return {
        id: crypto.randomUUID(),
        tripId: trip.id,
        tripName: trip.name,
        year: new Date(trip.startDate).getFullYear(),
        winner,
        winningTeamName,
        finalScore: `${teamAPoints} - ${teamBPoints}`,
        mvpPlayerId: mvpAward?.playerId || '',
        mvpName: mvpAward?.playerName || 'N/A',
        highlights,
        archivedAt: new Date().toISOString(),
    };
}

/**
 * Generate trip highlights
 */
function generateHighlights(
    trip: Trip,
    teams: Team[],
    matches: Match[],
    holeResults: HoleResult[],
    awards: TripAward[],
    players: Player[],
    teamAPoints: number,
    teamBPoints: number
): string[] {
    const highlights: string[] = [];
    const teamA = teams.find(t => t.color === 'usa') || teams[0];
    const teamB = teams.find(t => t.color === 'europe') || teams[1];

    // Final score highlight
    const margin = Math.abs(teamAPoints - teamBPoints);
    if (margin >= 5) {
        const winner = teamAPoints > teamBPoints ? teamA?.name : teamB?.name;
        highlights.push(`${winner} dominated with a ${margin}-point margin`);
    } else if (margin <= 1) {
        highlights.push(`A nail-biter! Decided by just ${margin} point${margin !== 1 ? 's' : ''}`);
    }

    // MVP highlight
    const mvp = awards.find(a => a.type === 'mvp');
    if (mvp) {
        highlights.push(`MVP: ${mvp.playerName} with ${mvp.value}`);
    }

    // Biggest win
    let biggestMargin = 0;
    let biggestWinner = '';

    for (const match of matches.filter(m => m.status === 'completed')) {
        const results = holeResults.filter(hr => hr.matchId === match.id);
        let aWins = 0;
        let bWins = 0;

        for (const hr of results) {
            if (hr.winner === 'teamA') aWins++;
            else if (hr.winner === 'teamB') bWins++;
        }

        const matchMargin = Math.abs(aWins - bWins);
        if (matchMargin > biggestMargin) {
            biggestMargin = matchMargin;
            const winningIds = aWins > bWins ? match.teamAPlayerIds : match.teamBPlayerIds;
            const winningPlayers = winningIds.map(id => players.find(p => p.id === id));
            biggestWinner = winningPlayers.map(p => p?.firstName || '?').join(' & ');
        }
    }

    if (biggestMargin >= 5) {
        highlights.push(`Biggest win: ${biggestWinner} won ${biggestMargin}&${18 - biggestMargin - (biggestMargin > 9 ? 0 : 1)}`);
    }

    // Close matches
    const closeMatches = matches.filter(m => {
        if (m.status !== 'completed') return false;
        const results = holeResults.filter(hr => hr.matchId === m.id);
        let aWins = 0;
        let bWins = 0;
        for (const hr of results) {
            if (hr.winner === 'teamA') aWins++;
            else if (hr.winner === 'teamB') bWins++;
        }
        return Math.abs(aWins - bWins) <= 1;
    });

    if (closeMatches.length >= 3) {
        highlights.push(`${closeMatches.length} matches decided by 1 hole or less`);
    }

    return highlights;
}

/**
 * Compare two trips
 */
export function compareTrips(
    archive1: TripArchive,
    archive2: TripArchive
): {
    scoreDiff: { teamA: number; teamB: number };
    sameMVP: boolean;
    sameWinner: boolean;
    marginDiff: number;
} {
    const [a1Score, b1Score] = archive1.finalScore.split(' - ').map(Number);
    const [a2Score, b2Score] = archive2.finalScore.split(' - ').map(Number);

    return {
        scoreDiff: {
            teamA: a2Score - a1Score,
            teamB: b2Score - b1Score,
        },
        sameMVP: archive1.mvpPlayerId === archive2.mvpPlayerId,
        sameWinner: archive1.winner === archive2.winner,
        marginDiff: Math.abs(a2Score - b2Score) - Math.abs(a1Score - b1Score),
    };
}

/**
 * Get all-time standings across trips
 */
export function getAllTimeStandings(
    archives: TripArchive[]
): {
    teamAWins: number;
    teamBWins: number;
    ties: number;
    totalTeamAPoints: number;
    totalTeamBPoints: number;
} {
    let teamAWins = 0;
    let teamBWins = 0;
    let ties = 0;
    let totalTeamAPoints = 0;
    let totalTeamBPoints = 0;

    for (const archive of archives) {
        const [aPoints, bPoints] = archive.finalScore.split(' - ').map(Number);
        totalTeamAPoints += aPoints;
        totalTeamBPoints += bPoints;

        if (archive.winner === 'A') teamAWins++;
        else if (archive.winner === 'B') teamBWins++;
        else ties++;
    }

    return {
        teamAWins,
        teamBWins,
        ties,
        totalTeamAPoints,
        totalTeamBPoints,
    };
}

/**
 * Player's team membership for a trip
 */
export interface PlayerTeamMembership {
    tripId: UUID;
    teamId: UUID;
    teamColor: 'usa' | 'europe';
}

/**
 * Get player all-time stats across trips
 *
 * @param playerId - The player's ID
 * @param tripStats - Map of trip ID to player's statistics for that trip
 * @param archives - Array of archived trip results
 * @param player - The player entity
 * @param teamMemberships - Optional array of player's team memberships per trip
 */
export function getPlayerAllTimeStats(
    playerId: UUID,
    tripStats: Map<UUID, PlayerStatistics>,
    archives: TripArchive[],
    player: Player,
    teamMemberships?: PlayerTeamMembership[]
): PlayerCareerStats {
    let totalMatches = 0;
    let totalWins = 0;
    let totalLosses = 0;
    let totalHalves = 0;
    let totalPoints = 0;
    let cupWins = 0;
    let mvpAwards = 0;

    // Create a lookup map for team memberships
    const membershipByTrip = new Map<UUID, PlayerTeamMembership>();
    if (teamMemberships) {
        for (const membership of teamMemberships) {
            membershipByTrip.set(membership.tripId, membership);
        }
    }

    const byYear: PlayerCareerStats['byYear'] = [];

    for (const archive of archives) {
        const stats = tripStats.get(archive.tripId);
        if (!stats) continue;

        totalMatches += stats.matchesPlayed;
        totalWins += stats.wins;
        totalLosses += stats.losses;
        totalHalves += stats.halves;
        totalPoints += stats.points;

        if (archive.mvpPlayerId === playerId) {
            mvpAwards++;
        }

        // Calculate cup wins using team membership data
        const membership = membershipByTrip.get(archive.tripId);
        if (membership && archive.winner !== 'tie') {
            // Determine if player was on winning team
            // Team A is typically USA, Team B is Europe
            const playerOnTeamA = membership.teamColor === 'usa';
            const teamAWon = archive.winner === 'A';

            if ((playerOnTeamA && teamAWon) || (!playerOnTeamA && !teamAWon)) {
                cupWins++;
            }
        }

        byYear.push({
            year: archive.year,
            tripId: archive.tripId,
            record: `${stats.wins}-${stats.losses}-${stats.halves}`,
            points: stats.points,
        });
    }

    return {
        playerId,
        playerName: `${player.firstName} ${player.lastName}`,
        tripsPlayed: byYear.length,
        totalMatches,
        totalWins,
        totalLosses,
        totalHalves,
        totalPoints,
        cupWins,
        mvpAwards,
        byYear: byYear.sort((a, b) => b.year - a.year),
    };
}

/**
 * Format archive for display
 */
export function formatArchiveDisplay(archive: TripArchive): {
    title: string;
    subtitle: string;
    scoreDisplay: string;
    winnerBadge: string;
} {
    return {
        title: archive.tripName,
        subtitle: `${archive.year}`,
        scoreDisplay: archive.finalScore,
        winnerBadge: archive.winner === 'tie'
            ? '🤝 Tied'
            : `🏆 ${archive.winningTeamName}`,
    };
}

/**
 * Get trip comparison text
 */
export function getTripComparisonText(
    archive1: TripArchive,
    archive2: TripArchive
): string[] {
    const comparison = compareTrips(archive1, archive2);
    const lines: string[] = [];

    lines.push(`${archive1.year}: ${archive1.finalScore}`);
    lines.push(`${archive2.year}: ${archive2.finalScore}`);
    lines.push('');

    if (comparison.sameWinner) {
        lines.push(`🏆 ${archive2.winningTeamName} defended their title!`);
    } else {
        lines.push(`🔄 ${archive2.winningTeamName} took the cup back!`);
    }

    if (comparison.sameMVP) {
        lines.push(`⭐ ${archive2.mvpName} repeated as MVP!`);
    }

    return lines;
}

/**
 * Search archives by criteria
 */
export function searchArchives(
    archives: TripArchive[],
    criteria: {
        year?: number;
        winner?: 'A' | 'B' | 'tie';
        mvpPlayerId?: UUID;
        minMargin?: number;
    }
): TripArchive[] {
    return archives.filter(archive => {
        if (criteria.year && archive.year !== criteria.year) return false;
        if (criteria.winner && archive.winner !== criteria.winner) return false;
        if (criteria.mvpPlayerId && archive.mvpPlayerId !== criteria.mvpPlayerId) return false;

        if (criteria.minMargin) {
            const [a, b] = archive.finalScore.split(' - ').map(Number);
            if (Math.abs(a - b) < criteria.minMargin) return false;
        }

        return true;
    });
}

/**
 * Export archive to shareable format
 */
export function exportArchiveToText(archive: TripArchive): string {
    const lines = [
        `═══════════════════════════════`,
        `   ${archive.tripName} (${archive.year})`,
        `═══════════════════════════════`,
        ``,
        `   FINAL SCORE: ${archive.finalScore}`,
        `   WINNER: ${archive.winningTeamName}`,
        ``,
        `   MVP: ${archive.mvpName}`,
        ``,
        `   HIGHLIGHTS:`,
        ...archive.highlights.map(h => `   • ${h}`),
        ``,
        `═══════════════════════════════`,
    ];

    return lines.join('\n');
}
