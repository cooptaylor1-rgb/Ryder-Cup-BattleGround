import { calculateMatchState } from '@/lib/services/scoringEngine';
import type { Match } from '@/lib/types';
import type { MatchState } from '@/lib/types/computed';
import type { HoleResult, Player, RyderCupSession } from '@/lib/types/models';
import { resolveCurrentTripPlayer, type CurrentTripPlayerIdentity } from '@/lib/utils/tripPlayerIdentity';

export function findCurrentUserPlayer(
    players: Player[],
    currentUser: CurrentTripPlayerIdentity | null,
    isAuthenticated: boolean
): Player | undefined {
    return resolveCurrentTripPlayer(players, currentUser, isAuthenticated) ?? undefined;
}

export function getDefaultActiveScoringSession(
    sessions: RyderCupSession[]
): RyderCupSession | undefined {
    return sessions.find((session) => session.status === 'inProgress') ??
        sessions.find((session) => session.status === 'scheduled');
}

export function getResolvedActiveScoringSession(
    sessions: RyderCupSession[],
    selectedSessionId: string | null
): RyderCupSession | undefined {
    const defaultSession = getDefaultActiveScoringSession(sessions);
    return selectedSessionId
        ? sessions.find((session) => session.id === selectedSessionId) ?? defaultSession
        : defaultSession;
}

export function buildHoleResultsByMatchId(holeResults: HoleResult[] | undefined) {
    const list = holeResults ?? [];
    const map = new Map<string, HoleResult[]>();

    for (const result of list) {
        const existing = map.get(result.matchId) ?? [];
        existing.push(result);
        map.set(result.matchId, existing);
    }

    return map;
}

export function buildScoringMatchStates(
    matches: Match[] | undefined,
    holeResultsByMatchId: Map<string, HoleResult[]>
): MatchState[] {
    return (matches ?? []).map((match) => {
        const results = holeResultsByMatchId.get(match.id) ?? [];
        return calculateMatchState(match, results);
    });
}

export function getQuickContinueMatchId(matchStates: MatchState[]): string | undefined {
    const inProgressMatches = matchStates.filter((state) => state.status === 'inProgress');
    if (inProgressMatches.length !== 1) return undefined;
    return inProgressMatches[0]?.match.id;
}

export function buildScoreSessionStats(
    matchStates: MatchState[],
    currentUserPlayerId?: string
) {
    let live = 0;
    let completed = 0;
    let userMatches = 0;

    for (const matchState of matchStates) {
        if (matchState.status === 'inProgress') live += 1;
        if (matchState.status === 'completed') completed += 1;

        if (
            currentUserPlayerId &&
            (matchState.match.teamAPlayerIds.includes(currentUserPlayerId) ||
                matchState.match.teamBPlayerIds.includes(currentUserPlayerId))
        ) {
            userMatches += 1;
        }
    }

    return { live, completed, userMatches };
}

export function getMatchPlayers(playerIds: string[], players: Player[]): Player[] {
    return playerIds
        .map((id) => players.find((player) => player.id === id))
        .filter(Boolean) as Player[];
}
