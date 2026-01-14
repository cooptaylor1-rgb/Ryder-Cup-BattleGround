/**
 * Awards Service
 *
 * P2.4 - Computes awards and records from match results
 */

import { db } from '../db';
import type { Match, HoleResult, Player } from '../types/models';
import type { PlayerStats, Award, TripRecords, AwardType } from '../types/awards';
import { AWARD_DEFINITIONS as DEFINITIONS } from '../types/awards';

/**
 * Calculate player statistics for a trip
 */
export async function calculatePlayerStats(tripId: string): Promise<PlayerStats[]> {
    // Load all data
    const teams = await db.teams.where('tripId').equals(tripId).toArray();
    const teamIds = teams.map(t => t.id);
    const teamMembers = await db.teamMembers.where('teamId').anyOf(teamIds).toArray();
    const playerIds = [...new Set(teamMembers.map(tm => tm.playerId))];
    const players = (await db.players.bulkGet(playerIds)).filter(Boolean) as Player[];

    const sessions = await db.sessions.where('tripId').equals(tripId).toArray();
    const sessionIds = sessions.map(s => s.id);
    const matches = await db.matches.where('sessionId').anyOf(sessionIds).toArray();
    const matchIds = matches.map(m => m.id);
    const holeResults = await db.holeResults.where('matchId').anyOf(matchIds).toArray();

    // Create player lookup
    const playerTeamMap = new Map<string, 'usa' | 'europe'>();
    for (const tm of teamMembers) {
        const team = teams.find(t => t.id === tm.teamId);
        if (team) {
            playerTeamMap.set(tm.playerId, team.color);
        }
    }

    // Initialize stats for each player
    const statsMap = new Map<string, PlayerStats>();
    for (const player of players) {
        statsMap.set(player.id, {
            playerId: player.id,
            playerName: `${player.firstName} ${player.lastName}`,
            teamColor: playerTeamMap.get(player.id) || 'usa',
            matchesPlayed: 0,
            wins: 0,
            losses: 0,
            halves: 0,
            points: 0,
            winPercentage: 0,
            biggestWin: 0,
            holesWon: 0,
            holesLost: 0,
            holesHalved: 0,
            currentStreak: 0,
            longestWinStreak: 0,
        });
    }

    // Process each match
    for (const match of matches) {
        if (match.status !== 'completed') continue;

        const matchResults = holeResults.filter(hr => hr.matchId === match.id);
        if (matchResults.length === 0) continue;

        // Calculate match winner
        let teamAScore = 0;
        let teamBScore = 0;

        for (const hr of matchResults) {
            if (hr.winner === 'teamA') teamAScore++;
            else if (hr.winner === 'teamB') teamBScore++;
        }

        const margin = Math.abs(teamAScore - teamBScore);
        const matchWinner = teamAScore > teamBScore ? 'teamA' : teamBScore > teamAScore ? 'teamB' : 'halved';

        // Update stats for each player in the match
        const allPlayerIds = [...match.teamAPlayerIds, ...match.teamBPlayerIds];

        for (const playerId of allPlayerIds) {
            const stats = statsMap.get(playerId);
            if (!stats) continue;

            stats.matchesPlayed++;
            const isTeamA = match.teamAPlayerIds.includes(playerId);

            // Determine if this player won, lost, or halved
            if (matchWinner === 'halved') {
                stats.halves++;
                stats.points += 0.5;
                stats.currentStreak = 0;
            } else if ((matchWinner === 'teamA' && isTeamA) || (matchWinner === 'teamB' && !isTeamA)) {
                stats.wins++;
                stats.points += 1;
                stats.currentStreak = stats.currentStreak >= 0 ? stats.currentStreak + 1 : 1;
                stats.longestWinStreak = Math.max(stats.longestWinStreak, stats.currentStreak);
                stats.biggestWin = Math.max(stats.biggestWin, margin);
            } else {
                stats.losses++;
                stats.currentStreak = stats.currentStreak <= 0 ? stats.currentStreak - 1 : -1;
            }

            // Count holes
            for (const hr of matchResults) {
                if (hr.winner === 'halved') {
                    stats.holesHalved++;
                } else if ((hr.winner === 'teamA' && isTeamA) || (hr.winner === 'teamB' && !isTeamA)) {
                    stats.holesWon++;
                } else if (hr.winner !== 'none') {
                    stats.holesLost++;
                }
            }
        }
    }

    // Calculate win percentages
    for (const stats of statsMap.values()) {
        if (stats.matchesPlayed > 0) {
            stats.winPercentage = (stats.points / stats.matchesPlayed) * 100;
        }
    }

    return Array.from(statsMap.values());
}

/**
 * Compute awards for a trip
 */
export async function computeAwards(tripId: string): Promise<Award[]> {
    const playerStats = await calculatePlayerStats(tripId);
    const awards: Award[] = [];

    // Helper to create award with winner/runner-up
    const createAward = (
        type: AwardType,
        stats: PlayerStats[],
        getValue: (s: PlayerStats) => number,
        formatValue: (v: number) => string | number = (v) => v
    ): Award => {
        const sorted = [...stats]
            .filter(s => s.matchesPlayed > 0)
            .sort((a, b) => getValue(b) - getValue(a));

        const def = DEFINITIONS[type];
        const award: Award = {
            type,
            title: def.title,
            description: def.description,
            icon: def.icon,
        };

        if (sorted.length > 0 && getValue(sorted[0]) > 0) {
            award.winner = {
                playerId: sorted[0].playerId,
                playerName: sorted[0].playerName,
                teamColor: sorted[0].teamColor,
                value: formatValue(getValue(sorted[0])),
            };
        }

        if (sorted.length > 1 && getValue(sorted[1]) > 0) {
            award.runnerUp = {
                playerId: sorted[1].playerId,
                playerName: sorted[1].playerName,
                teamColor: sorted[1].teamColor,
                value: formatValue(getValue(sorted[1])),
            };
        }

        return award;
    };

    // MVP - Most points
    awards.push(createAward('mvp', playerStats, s => s.points, v => `${v} pts`));

    // Best Record - Highest win percentage (min 2 matches)
    const qualifiedPlayers = playerStats.filter(s => s.matchesPlayed >= 2);
    awards.push(createAward('best-record', qualifiedPlayers, s => s.winPercentage, v => `${v.toFixed(0)}%`));

    // Most Wins
    awards.push(createAward('most-wins', playerStats, s => s.wins, v => `${v} wins`));

    // Most Halves
    awards.push(createAward('most-halves', playerStats, s => s.halves, v => `${v} halves`));

    // Biggest Win - show the margin directly since we don't have holes remaining at closeout
    awards.push(createAward('biggest-win', playerStats, s => s.biggestWin, v => `+${v} holes`));

    // Iron Man - Most matches
    awards.push(createAward('iron-man', playerStats, s => s.matchesPlayed, v => `${v} matches`));

    // Streak Master
    awards.push(createAward('streak-master', playerStats, s => s.longestWinStreak, v => `${v} wins`));

    return awards;
}

/**
 * Compute full trip records
 */
export async function computeTripRecords(tripId: string): Promise<TripRecords> {
    const trip = await db.trips.get(tripId);
    if (!trip) throw new Error('Trip not found');

    const teams = await db.teams.where('tripId').equals(tripId).toArray();
    const sessions = await db.sessions.where('tripId').equals(tripId).toArray();
    const sessionIds = sessions.map(s => s.id);
    const matches = await db.matches.where('sessionId').anyOf(sessionIds).toArray();
    const matchIds = matches.map(m => m.id);
    const holeResults = await db.holeResults.where('matchId').anyOf(matchIds).toArray();

    // Calculate final score
    let usaPoints = 0;
    let eurPoints = 0;

    for (const match of matches) {
        if (match.status !== 'completed') continue;

        const matchResults = holeResults.filter(hr => hr.matchId === match.id);
        let teamAWins = 0;
        let teamBWins = 0;

        for (const hr of matchResults) {
            if (hr.winner === 'teamA') teamAWins++;
            else if (hr.winner === 'teamB') teamBWins++;
        }

        if (teamAWins > teamBWins) usaPoints += 1;
        else if (teamBWins > teamAWins) eurPoints += 1;
        else {
            usaPoints += 0.5;
            eurPoints += 0.5;
        }
    }

    // Find biggest session win
    let biggestSessionWin: TripRecords['biggestSessionWin'] = null;

    for (const session of sessions) {
        const sessionMatches = matches.filter(m => m.sessionId === session.id && m.status === 'completed');
        let sessionUSA = 0;
        let sessionEUR = 0;

        for (const match of sessionMatches) {
            const matchResults = holeResults.filter(hr => hr.matchId === match.id);
            let teamAWins = 0;
            let teamBWins = 0;

            for (const hr of matchResults) {
                if (hr.winner === 'teamA') teamAWins++;
                else if (hr.winner === 'teamB') teamBWins++;
            }

            if (teamAWins > teamBWins) sessionUSA += 1;
            else if (teamBWins > teamAWins) sessionEUR += 1;
            else {
                sessionUSA += 0.5;
                sessionEUR += 0.5;
            }
        }

        const sessionMargin = Math.abs(sessionUSA - sessionEUR);
        const currentMargin = biggestSessionWin?.margin || 0;

        if (sessionMargin > currentMargin) {
            biggestSessionWin = {
                sessionType: session.sessionType,
                margin: sessionMargin,
                winningTeam: sessionUSA > sessionEUR ? 'usa' : 'europe',
            };
        }
    }

    const awards = await computeAwards(tripId);
    const playerStats = await calculatePlayerStats(tripId);

    return {
        tripId,
        tripName: trip.name,
        computedAt: new Date().toISOString(),
        finalScore: { usa: usaPoints, europe: eurPoints },
        winner: usaPoints > eurPoints ? 'usa' : eurPoints > usaPoints ? 'europe' : 'halved',
        biggestSessionWin,
        awards,
        playerStats,
    };
}

/**
 * Get leaderboard sorted by points
 */
export async function getPlayerLeaderboard(tripId: string): Promise<PlayerStats[]> {
    const stats = await calculatePlayerStats(tripId);
    return stats.sort((a, b) => {
        // Sort by points first, then by win percentage
        if (b.points !== a.points) return b.points - a.points;
        return b.winPercentage - a.winPercentage;
    });
}
