import { db } from '../../db';
import type { MagicNumber, PlayerLeaderboard, TeamStandings } from '../../types/computed';
import type { HoleResult } from '../../types/models';
import { calculateMatchPoints, calculateMatchState } from '../scoringEngine';
import type { PlayerRecord, SessionStandings } from './tournamentEngineTypes';

type MatchState = ReturnType<typeof calculateMatchState>;

function groupHoleResultsByMatch(allHoleResults: HoleResult[]): Map<string, HoleResult[]> {
    const resultsByMatch = new Map<string, HoleResult[]>();

    for (const result of allHoleResults) {
        const existing = resultsByMatch.get(result.matchId) || [];
        existing.push(result);
        resultsByMatch.set(result.matchId, existing);
    }

    return resultsByMatch;
}

function isCompletedMatch(matchState: MatchState): boolean {
    return matchState.isClosedOut || matchState.holesRemaining === 0;
}

function calculateProjectedMatchPoints(matchState: MatchState): {
    teamAProjected: number;
    teamBProjected: number;
} {
    const absLead = Math.abs(matchState.currentScore);
    const holesLeft = matchState.holesRemaining;

    if (absLead === 0) {
        return { teamAProjected: 0.5, teamBProjected: 0.5 };
    }

    let projectedPointsForLeader: number;
    let projectedPointsForTrailer: number;

    if (absLead >= holesLeft) {
        projectedPointsForLeader = 0.95;
        projectedPointsForTrailer = 0.05;
    } else {
        const leadRatio = absLead / holesLeft;
        projectedPointsForLeader = Math.min(0.5 + leadRatio * 0.45, 0.95);
        projectedPointsForTrailer = 1 - projectedPointsForLeader;
    }

    if (matchState.currentScore > 0) {
        return {
            teamAProjected: projectedPointsForLeader,
            teamBProjected: projectedPointsForTrailer,
        };
    }

    return {
        teamAProjected: projectedPointsForTrailer,
        teamBProjected: projectedPointsForLeader,
    };
}

export async function calculateTeamStandings(tripId: string): Promise<TeamStandings> {
    const sessions = await db.sessions
        .where('tripId')
        .equals(tripId)
        .toArray();

    const sessionIds = sessions.map((session) => session.id);
    const matches = await db.matches
        .where('sessionId')
        .anyOf(sessionIds)
        .toArray();

    const matchIds = matches.map((match) => match.id);
    const allHoleResults = await db.holeResults
        .where('matchId')
        .anyOf(matchIds)
        .toArray();

    const resultsByMatch = groupHoleResultsByMatch(allHoleResults);

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

        if (isCompletedMatch(matchState)) {
            matchesCompleted++;
            const points = calculateMatchPoints(matchState);
            teamAPoints += points.teamAPoints;
            teamBPoints += points.teamBPoints;
        }
    }

    let teamAProjected = teamAPoints;
    let teamBProjected = teamBPoints;

    for (const match of matches) {
        const holeResults = resultsByMatch.get(match.id) || [];
        const matchState = calculateMatchState(match, holeResults);

        if (matchState.holesPlayed > 0 && matchState.holesRemaining > 0 && !matchState.isClosedOut) {
            const projected = calculateProjectedMatchPoints(matchState);
            teamAProjected += projected.teamAProjected;
            teamBProjected += projected.teamBProjected;
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

export async function calculateSessionStandings(sessionId: string): Promise<SessionStandings> {
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

        if (isCompletedMatch(matchState)) {
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

export async function calculatePlayerRecord(
    playerId: string,
    tripId: string
): Promise<PlayerRecord> {
    const sessions = await db.sessions
        .where('tripId')
        .equals(tripId)
        .toArray();

    const sessionIds = sessions.map((session) => session.id);
    const allMatches = await db.matches
        .where('sessionId')
        .anyOf(sessionIds)
        .toArray();

    const playerMatches = allMatches.filter(
        (match) => match.teamAPlayerIds.includes(playerId) || match.teamBPlayerIds.includes(playerId)
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

        if (isCompletedMatch(matchState)) {
            const playerOnTeamA = match.teamAPlayerIds.includes(playerId);

            if (matchState.currentScore === 0) {
                halves++;
            } else if (matchState.currentScore > 0) {
                if (playerOnTeamA) {
                    wins++;
                } else {
                    losses++;
                }
            } else if (playerOnTeamA) {
                losses++;
            } else {
                wins++;
            }
        }
    }

    const points = wins + halves * 0.5;

    return { wins, losses, halves, points };
}

export async function calculatePlayerLeaderboard(tripId: string): Promise<PlayerLeaderboard[]> {
    const teamMembers = await db.teamMembers.toArray();
    const teams = await db.teams.where('tripId').equals(tripId).toArray();
    const teamIds = teams.map((team) => team.id);

    const tripMembers = teamMembers.filter((teamMember) => teamIds.includes(teamMember.teamId));
    const playerIds = tripMembers.map((teamMember) => teamMember.playerId);

    const players = await db.players
        .where('id')
        .anyOf(playerIds)
        .toArray();

    const leaderboard: PlayerLeaderboard[] = [];

    for (const player of players) {
        const record = await calculatePlayerRecord(player.id, tripId);
        const teamMember = tripMembers.find((member) => member.playerId === player.id);
        const team = teams.find((entry) => entry.id === teamMember?.teamId);

        leaderboard.push({
            playerId: player.id,
            playerName: `${player.firstName} ${player.lastName}`,
            teamId: team?.id || '',
            teamName: team?.name || 'Unknown',
            ...record,
            matchesPlayed: record.wins + record.losses + record.halves,
        });
    }

    leaderboard.sort((left, right) => {
        if (right.points !== left.points) {
            return right.points - left.points;
        }

        const leftWinPct = left.matchesPlayed > 0 ? left.wins / left.matchesPlayed : 0;
        const rightWinPct = right.matchesPlayed > 0 ? right.wins / right.matchesPlayed : 0;
        return rightWinPct - leftWinPct;
    });

    return leaderboard;
}

export function calculateMagicNumber(
    standings: TeamStandings,
    customPointsToWin?: number
): MagicNumber {
    const pointsToWin = customPointsToWin ?? 14.5;

    const teamANeeded = Math.max(0, pointsToWin - standings.teamAPoints);
    const teamBNeeded = Math.max(0, pointsToWin - standings.teamBPoints);

    const teamACanClinch = teamANeeded <= standings.remainingMatches;
    const teamBCanClinch = teamBNeeded <= standings.remainingMatches;

    const teamAClinched = standings.teamAPoints >= pointsToWin;
    const teamBClinched = standings.teamBPoints >= pointsToWin;

    return {
        teamA: teamANeeded,
        teamB: teamBNeeded,
        teamANeeded,
        teamBNeeded,
        teamACanClinch,
        teamBCanClinch,
        teamAClinched,
        teamBClinched,
        pointsToWin,
        hasClinched: teamAClinched || teamBClinched,
        clinchingTeam: teamAClinched ? 'A' : teamBClinched ? 'B' : undefined,
        remainingPoints: standings.remainingMatches,
    };
}
