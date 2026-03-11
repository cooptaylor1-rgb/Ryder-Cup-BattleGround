import { formatPlayerName } from '@/lib/utils';
import type { Match } from '@/lib/types';
import type { Player, RyderCupSession } from '@/lib/types/models';
import type {
    FairnessScore,
    MatchSlot,
    Player as LineupPlayer,
    SessionConfig,
} from '@/components/captain';

export type SessionLineupViewMode = 'matches' | 'edit';

export function buildSessionConfig(
    session: RyderCupSession | undefined,
    matches: Match[]
): SessionConfig | null {
    if (!session) return null;

    return {
        id: session.id,
        name: session.name,
        type: session.sessionType,
        playersPerTeam: session.sessionType === 'singles' ? 1 : 2,
        matchCount: matches.length || 4,
        pointsPerMatch: session.pointsPerMatch ?? 1,
    };
}

export function buildInitialMatchSlots(matches: Match[], players: Player[]): MatchSlot[] {
    return matches.map((match) => ({
        id: match.id,
        teamAPlayers: toMatchSlotPlayers(match.teamAPlayerIds, players, 'A'),
        teamBPlayers: toMatchSlotPlayers(match.teamBPlayerIds, players, 'B'),
    }));
}

export function getSessionMatchPlayerNames(playerIds: string[], players: Player[]): string {
    return playerIds
        .map((id) => {
            const player = players.find((entry) => entry.id === id);
            return player ? formatPlayerName(player.firstName, player.lastName, 'short') : 'Unknown';
        })
        .join(' & ');
}

export function getSessionMatchScoreDisplay(
    match: Match,
    teamAName: string,
    teamBName: string
): string {
    if (match.status === 'completed') {
        if (match.result === 'halved') return 'Halved';
        const winner = match.result === 'teamAWin' ? teamAName : teamBName;
        return `${winner} ${match.margin}&${match.holesRemaining}`;
    }
    if (match.status === 'inProgress') {
        return `Thru ${match.currentHole}`;
    }
    return 'Not Started';
}

export function calculateSessionFairness(
    matchSlots: MatchSlot[],
    allLineupPlayers: LineupPlayer[],
    calculateFairnessScore: (pairings: {
        id: string;
        teamAPlayers: LineupPlayer[];
        teamBPlayers: LineupPlayer[];
    }[], allPlayers: LineupPlayer[]) => FairnessScore
): FairnessScore {
    const pairings = matchSlots.map((match) => ({
        id: match.id,
        teamAPlayers: match.teamAPlayers,
        teamBPlayers: match.teamBPlayers,
    }));

    return calculateFairnessScore(pairings, allLineupPlayers);
}

function toMatchSlotPlayers(
    playerIds: string[],
    players: Player[],
    team: 'A' | 'B'
): LineupPlayer[] {
    return playerIds
        .map((id) => {
            const player = players.find((entry) => entry.id === id);
            return player
                ? {
                      id: player.id,
                      firstName: player.firstName,
                      lastName: player.lastName,
                      handicapIndex: player.handicapIndex ?? 0,
                      team,
                      avatarUrl: player.avatarUrl,
                  }
                : null;
        })
        .filter(Boolean) as LineupPlayer[];
}
