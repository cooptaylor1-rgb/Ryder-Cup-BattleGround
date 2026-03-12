import type { UUID } from '@/lib/types/models';
import type { WolfGame, WolfHoleResult } from '@/lib/types/sideGames';

import { DEFAULT_WOLF_CONFIG } from './extendedSideGamesRegistry';

export function getWolfForHole(game: WolfGame, holeNumber: number): UUID {
    const index = (holeNumber - 1) % 4;
    return game.rotation[index];
}

export function wolfChoosesPartner(
    game: WolfGame,
    holeNumber: number,
    wolfId: UUID,
    partnerId?: UUID,
    isPig: boolean = false
): WolfGame {
    const isLoneWolf = !partnerId;

    const wolfStanding = game.standings.find((standing) => standing.playerId === wolfId);
    if (wolfStanding) {
        wolfStanding.wolvesPlayed++;
        if (isLoneWolf) {
            wolfStanding.loneWolfAttempts++;
            if (isPig) {
                wolfStanding.pigAttempts++;
            }
        }
    }

    return {
        ...game,
        status: 'active',
    };
}

export function recordWolfHoleResult(
    game: WolfGame,
    holeNumber: number,
    wolfId: UUID,
    partnerId: UUID | undefined,
    isPig: boolean,
    wolfTeamScore: number,
    packTeamScore: number
): WolfGame {
    const config = { ...DEFAULT_WOLF_CONFIG };
    const isLoneWolf = !partnerId;

    let winner: 'wolf' | 'pack' | 'push';
    if (wolfTeamScore < packTeamScore) {
        winner = 'wolf';
    } else if (packTeamScore < wolfTeamScore) {
        winner = 'pack';
    } else {
        winner = 'push';
    }

    let basePoints = config.pointsPerHole;
    if (isLoneWolf) {
        basePoints *= isPig ? config.pigMultiplier : config.loneWolfMultiplier;
    }

    const pointsExchanged = winner === 'push' ? 0 : basePoints;

    const holeResult: WolfHoleResult = {
        holeNumber,
        wolfId,
        partnerId,
        isLoneWolf,
        isPig,
        teamAScore: wolfTeamScore,
        teamBScore: packTeamScore,
        winner,
        pointsExchanged,
    };

    const newStandings = [...game.standings];
    if (winner !== 'push') {
        if (winner === 'wolf') {
            const wolfStanding = newStandings.find((standing) => standing.playerId === wolfId);
            if (wolfStanding) {
                wolfStanding.points += pointsExchanged * (isLoneWolf ? 3 : 2);
                if (isLoneWolf) {
                    wolfStanding.loneWolfWins++;
                    if (isPig) {
                        wolfStanding.pigWins++;
                    }
                }
            }

            if (partnerId) {
                const partnerStanding = newStandings.find((standing) => standing.playerId === partnerId);
                if (partnerStanding) {
                    partnerStanding.points += pointsExchanged;
                }
            }

            const packIds = game.playerIds.filter((id) => id !== wolfId && id !== partnerId);
            for (const packId of packIds) {
                const packStanding = newStandings.find((standing) => standing.playerId === packId);
                if (packStanding) {
                    packStanding.points -= pointsExchanged;
                }
            }
        } else {
            const wolfStanding = newStandings.find((standing) => standing.playerId === wolfId);
            if (wolfStanding) {
                wolfStanding.points -= pointsExchanged * (isLoneWolf ? 3 : 2);
            }

            if (partnerId) {
                const partnerStanding = newStandings.find((standing) => standing.playerId === partnerId);
                if (partnerStanding) {
                    partnerStanding.points -= pointsExchanged;
                }
            }

            const packIds = game.playerIds.filter((id) => id !== wolfId && id !== partnerId);
            for (const packId of packIds) {
                const packStanding = newStandings.find((standing) => standing.playerId === packId);
                if (packStanding) {
                    packStanding.points += pointsExchanged;
                }
            }
        }
    }

    return {
        ...game,
        holeResults: [...game.holeResults, holeResult],
        standings: newStandings,
        currentWolfIndex: (game.currentWolfIndex + 1) % 4,
    };
}
