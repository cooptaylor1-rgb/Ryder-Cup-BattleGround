/**
 * Draft Mode Service
 *
 * Team selection through various draft formats:
 * - Snake draft (alternating picks)
 * - Auction draft (bidding)
 * - Random assignment
 * - Captain's pick (free selection)
 */

import type {
    DraftType,
    DraftConfig,
    DraftPick,
    DraftState,
} from '@/lib/types/captain';
import type { Player, UUID } from '@/lib/types/models';

// Re-export types for convenience
export type {
    DraftType,
    DraftConfig,
    DraftPick,
    DraftState,
} from '@/lib/types/captain';

/**
 * Create a new draft configuration
 */
export function createDraftConfig(
    tripId: UUID,
    type: DraftType,
    captainIds: UUID[],
    playerCount: number,
    options?: {
        pickTimeSeconds?: number;
        auctionBudget?: number;
    }
): DraftConfig {
    const roundCount = Math.ceil(playerCount / captainIds.length);

    // Randomize draft order
    const shuffledCaptains = [...captainIds].sort(() => Math.random() - 0.5);

    return {
        id: crypto.randomUUID(),
        tripId,
        type,
        status: 'setup',
        roundCount,
        pickTimeSeconds: options?.pickTimeSeconds || (type === 'auction' ? 30 : 60),
        auctionBudget: options?.auctionBudget || 100,
        draftOrder: shuffledCaptains,
        snakeReverse: true,
        createdAt: new Date().toISOString(),
    };
}

/**
 * Get the pick order for a draft round (handles snake)
 */
export function getPickOrderForRound(
    config: DraftConfig,
    round: number
): UUID[] {
    if (config.type === 'snake' && config.snakeReverse && round % 2 === 0) {
        // Even rounds reverse order
        return [...config.draftOrder].reverse();
    }
    return config.draftOrder;
}

/**
 * Initialize draft state
 */
export function initializeDraftState(
    config: DraftConfig,
    availablePlayers: Player[],
    _teamIds: { teamA: UUID; teamB: UUID }
): DraftState {
    return {
        config,
        picks: [],
        currentRound: 1,
        currentPick: 1,
        currentCaptainId: config.draftOrder[0],
        availablePlayers,
        teamARoster: [],
        teamBRoster: [],
        timeRemaining: config.pickTimeSeconds,
    };
}

/**
 * Get current captain's turn
 */
export function getCurrentPicker(state: DraftState): {
    captainId: UUID;
    teamId: 'A' | 'B';
    pickNumber: number;
    round: number;
} {
    const pickOrder = getPickOrderForRound(state.config, state.currentRound);
    const pickIndexInRound = (state.currentPick - 1) % pickOrder.length;
    const captainId = pickOrder[pickIndexInRound];

    // Alternate teams: first captain is Team A
    const captainIndex = state.config.draftOrder.indexOf(captainId);
    const teamId = captainIndex === 0 ? 'A' : 'B';

    return {
        captainId,
        teamId,
        pickNumber: state.currentPick,
        round: state.currentRound,
    };
}

/**
 * Make a draft pick
 */
export function makeDraftPick(
    state: DraftState,
    playerId: UUID,
    auctionPrice?: number
): { newState: DraftState; pick: DraftPick } {
    const picker = getCurrentPicker(state);
    const player = state.availablePlayers.find(p => p.id === playerId);

    if (!player) {
        throw new Error('Player not available');
    }

    const pick: DraftPick = {
        id: crypto.randomUUID(),
        draftId: state.config.id,
        round: picker.round,
        pickNumber: picker.pickNumber,
        captainId: picker.captainId,
        teamId: picker.teamId === 'A' ? state.config.draftOrder[0] : state.config.draftOrder[1],
        playerId,
        auctionPrice,
        timestamp: new Date().toISOString(),
    };

    // Update rosters
    const newTeamARoster = picker.teamId === 'A'
        ? [...state.teamARoster, player]
        : state.teamARoster;
    const newTeamBRoster = picker.teamId === 'B'
        ? [...state.teamBRoster, player]
        : state.teamBRoster;

    // Remove from available
    const newAvailable = state.availablePlayers.filter(p => p.id !== playerId);

    // Calculate next pick
    const pickOrder = getPickOrderForRound(state.config, state.currentRound);
    const pickIndexInRound = (state.currentPick - 1) % pickOrder.length;
    const isLastInRound = pickIndexInRound === pickOrder.length - 1;

    const newRound = isLastInRound ? state.currentRound + 1 : state.currentRound;
    const newPick = state.currentPick + 1;

    // Get next captain
    const nextPickOrder = getPickOrderForRound(state.config, newRound);
    const nextPickIndex = isLastInRound ? 0 : pickIndexInRound + 1;
    const nextCaptainId = nextPickOrder[nextPickIndex];

    // Check if draft is complete
    const isDraftComplete = newAvailable.length === 0 || newRound > state.config.roundCount;

    const newState: DraftState = {
        ...state,
        picks: [...state.picks, pick],
        currentRound: newRound,
        currentPick: newPick,
        currentCaptainId: isDraftComplete ? state.currentCaptainId : nextCaptainId,
        availablePlayers: newAvailable,
        teamARoster: newTeamARoster,
        teamBRoster: newTeamBRoster,
        timeRemaining: state.config.pickTimeSeconds,
    };

    if (isDraftComplete) {
        newState.config = { ...newState.config, status: 'completed' };
    }

    return { newState, pick };
}

/**
 * Auto-pick for timeout or random draft
 */
export function autoPickPlayer(state: DraftState): UUID | null {
    if (state.availablePlayers.length === 0) return null;

    // For auction, pick lowest value player
    // For snake/random, pick random player
    if (state.config.type === 'auction') {
        // Pick player with lowest handicap (least valuable in auction context)
        const sorted = [...state.availablePlayers].sort(
            (a, b) => (a.handicapIndex ?? 54) - (b.handicapIndex ?? 54)
        );
        return sorted[sorted.length - 1]?.id || state.availablePlayers[0].id;
    }

    // Random pick
    const randomIndex = Math.floor(Math.random() * state.availablePlayers.length);
    return state.availablePlayers[randomIndex].id;
}

/**
 * Randomize teams (quick random draft)
 */
export function randomizeTeams(
    players: Player[]
): { teamA: Player[]; teamB: Player[] } {
    const shuffled = [...players].sort(() => Math.random() - 0.5);
    const midpoint = Math.ceil(shuffled.length / 2);

    return {
        teamA: shuffled.slice(0, midpoint),
        teamB: shuffled.slice(midpoint),
    };
}

/**
 * Balance teams by handicap
 */
export function balanceTeamsByHandicap(
    players: Player[]
): { teamA: Player[]; teamB: Player[] } {
    // Sort by handicap
    const sorted = [...players].sort(
        (a, b) => (a.handicapIndex ?? 18) - (b.handicapIndex ?? 18)
    );

    const teamA: Player[] = [];
    const teamB: Player[] = [];

    // Alternate assignment (snake style) to balance
    sorted.forEach((player, index) => {
        // Use 4-pick snake: 1,4,5,8 to A; 2,3,6,7 to B
        const cycle = index % 4;
        if (cycle === 0 || cycle === 3) {
            teamA.push(player);
        } else {
            teamB.push(player);
        }
    });

    return { teamA, teamB };
}

/**
 * Calculate team handicap totals
 */
export function calculateTeamHandicapTotal(players: Player[]): number {
    return players.reduce((sum, p) => sum + (p.handicapIndex ?? 18), 0);
}

/**
 * Get draft summary
 */
export function getDraftSummary(state: DraftState): {
    status: string;
    totalPicks: number;
    teamACount: number;
    teamBCount: number;
    teamAHandicap: number;
    teamBHandicap: number;
    remainingPlayers: number;
    pickHistory: {
        round: number;
        pick: number;
        team: string;
        playerName: string;
    }[];
} {
    return {
        status: state.config.status,
        totalPicks: state.picks.length,
        teamACount: state.teamARoster.length,
        teamBCount: state.teamBRoster.length,
        teamAHandicap: calculateTeamHandicapTotal(state.teamARoster),
        teamBHandicap: calculateTeamHandicapTotal(state.teamBRoster),
        remainingPlayers: state.availablePlayers.length,
        pickHistory: state.picks.map(pick => {
            const player = [...state.teamARoster, ...state.teamBRoster].find(
                p => p.id === pick.playerId
            );
            return {
                round: pick.round,
                pick: pick.pickNumber,
                team: state.config.draftOrder.indexOf(pick.captainId) === 0 ? 'Team A' : 'Team B',
                playerName: player ? `${player.firstName} ${player.lastName}` : 'Unknown',
            };
        }),
    };
}

/**
 * Validate draft is ready to start
 */
export function validateDraftReady(
    config: DraftConfig,
    players: Player[]
): { ready: boolean; errors: string[] } {
    const errors: string[] = [];

    if (config.draftOrder.length < 2) {
        errors.push('Need at least 2 captains for draft');
    }

    if (players.length < 4) {
        errors.push('Need at least 4 players for draft');
    }

    if (config.type === 'auction' && !config.auctionBudget) {
        errors.push('Auction budget not set');
    }

    return {
        ready: errors.length === 0,
        errors,
    };
}

/**
 * Generate draft board display data
 */
export function generateDraftBoard(
    state: DraftState,
    teamAName: string,
    teamBName: string
): {
    columns: { team: string; name: string; picks: { round: number; player: string; handicap: number }[] }[];
    currentPick: { team: string; round: number } | null;
} {
    const columns = [
        {
            team: 'A',
            name: teamAName,
            picks: state.picks
                .filter((_, i) => {
                    const picker = state.config.draftOrder[0];
                    return state.picks[i].captainId === picker;
                })
                .map(pick => {
                    const player = state.teamARoster.find(p => p.id === pick.playerId);
                    return {
                        round: pick.round,
                        player: player ? `${player.firstName} ${player.lastName}` : '-',
                        handicap: player?.handicapIndex ?? 0,
                    };
                }),
        },
        {
            team: 'B',
            name: teamBName,
            picks: state.picks
                .filter((_, i) => {
                    const picker = state.config.draftOrder[1];
                    return state.picks[i].captainId === picker;
                })
                .map(pick => {
                    const player = state.teamBRoster.find(p => p.id === pick.playerId);
                    return {
                        round: pick.round,
                        player: player ? `${player.firstName} ${player.lastName}` : '-',
                        handicap: player?.handicapIndex ?? 0,
                    };
                }),
        },
    ];

    const currentPick = state.config.status === 'in_progress'
        ? {
            team: state.config.draftOrder.indexOf(state.currentCaptainId) === 0 ? teamAName : teamBName,
            round: state.currentRound,
        }
        : null;

    return { columns, currentPick };
}
