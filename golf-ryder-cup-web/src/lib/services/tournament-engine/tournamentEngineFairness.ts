import { db } from '../../db';
import type { FairnessScore } from '../../types/computed';

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

    const playerIds = teamMembers.map((teamMember) => teamMember.playerId);
    const players = await db.players
        .where('id')
        .anyOf(playerIds)
        .toArray();

    const matchCounts = new Map<string, number>();
    const sessionCounts = new Map<string, number>();

    for (const player of players) {
        matchCounts.set(player.id, 0);
        sessionCounts.set(player.id, 0);
    }

    const allTeams = await db.teams
        .where('tripId')
        .equals(tripId)
        .sortBy('createdAt');

    const teamAId = allTeams[0]?.id;

    for (const session of sessions) {
        const matches = await db.matches
            .where('sessionId')
            .equals(session.id)
            .toArray();

        const isTeamA = teamId === teamAId;
        const playersInSession = new Set<string>();

        for (const match of matches) {
            const teamPlayers = isTeamA ? match.teamAPlayerIds : match.teamBPlayerIds;

            for (const playerId of teamPlayers) {
                if (playerIds.includes(playerId)) {
                    matchCounts.set(playerId, (matchCounts.get(playerId) || 0) + 1);
                    playersInSession.add(playerId);
                }
            }
        }

        for (const playerId of playersInSession) {
            sessionCounts.set(playerId, (sessionCounts.get(playerId) || 0) + 1);
        }
    }

    const matchCountValues = Array.from(matchCounts.values());
    const maxMatches = matchCountValues.length > 0 ? Math.max(...matchCountValues) : 0;
    const minMatches = matchCountValues.length > 0 ? Math.min(...matchCountValues) : 0;
    const matchDisparity = maxMatches - minMatches;

    const sessionCountValues = Array.from(sessionCounts.values());
    const maxSessions = sessionCountValues.length > 0 ? Math.max(...sessionCountValues) : 0;
    const minSessions = sessionCountValues.length > 0 ? Math.min(...sessionCountValues) : 0;
    const sessionDisparity = maxSessions - minSessions;

    const matchScore = matchDisparity <= 1 ? 100 : Math.max(0, 100 - (matchDisparity - 1) * 20);
    const sessionScore = sessionDisparity <= 1 ? 100 : Math.max(0, 100 - (sessionDisparity - 1) * 25);
    const overallScore = (matchScore + sessionScore) / 2;

    const suggestions: string[] = [];

    if (matchDisparity > 2) {
        const underused = players.filter((player) => matchCounts.get(player.id) === minMatches);
        const overused = players.filter((player) => matchCounts.get(player.id) === maxMatches);

        if (underused.length > 0 && overused.length > 0) {
            suggestions.push(
                `Consider playing ${underused[0].firstName} more (${minMatches} matches) ` +
                `and ${overused[0].firstName} less (${maxMatches} matches)`
            );
        }
    }

    if (sessionDisparity > 1) {
        const sittingOut = players.filter((player) => sessionCounts.get(player.id) === 0);
        if (sittingOut.length > 0) {
            suggestions.push(`${sittingOut.map((player) => player.firstName).join(', ')} haven't played yet`);
        }
    }

    const playerFairness = players.map((player) => ({
        playerId: player.id,
        playerName: `${player.firstName} ${player.lastName}`,
        matchesPlayed: matchCounts.get(player.id) || 0,
        sessionsPlayed: sessionCounts.get(player.id) || 0,
        expectedMatches: players.length > 0 ? Math.round((sessions.length * 4) / players.length) : 0,
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
