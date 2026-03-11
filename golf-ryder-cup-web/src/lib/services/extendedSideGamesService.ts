/**
 * Extended Side Games Service
 *
 * Full implementations of Wolf, Vegas, Hammer, and enhanced Nassau with auto-press.
 * These are popular buddies trip games that add excitement beyond standard skins.
 */

import type { UUID } from '@/lib/types/models';
import type {
    WolfGame,
    WolfHoleResult,
    WolfConfig,
    VegasGame,
    VegasHoleResult,
    VegasConfig,
    HammerGame,
    HammerAction,
    HammerConfig,
    NassauEnhanced,
    NassauPress,
} from '@/lib/types/sideGames';
export {
    calculateHammerPayouts,
    calculateNassauPayouts,
    calculateVegasPayouts,
    calculateWolfPayouts,
} from './extendedSideGamesPayouts';
export {
    generatePayPalLink,
    generateTripSettlement,
    generateVenmoLink,
    generateZelleInfo,
} from './extendedSideGamesSettlement';

// ============================================
// WOLF GAME
// ============================================

/**
 * Default Wolf configuration
 */
export const DEFAULT_WOLF_CONFIG: WolfConfig = {
    pointsPerHole: 1,
    loneWolfMultiplier: 2,
    pigMultiplier: 3,
    blindWolfBonus: 1,
};

/**
 * Create a new Wolf game
 */
export function createWolfGame(
    tripId: UUID,
    name: string,
    buyIn: number,
    playerIds: UUID[],
    sessionId?: UUID,
    _config: Partial<WolfConfig> = {}
): WolfGame {
    if (playerIds.length !== 4) {
        throw new Error('Wolf requires exactly 4 players');
    }

    // Randomize initial wolf order
    const rotation = [...playerIds].sort(() => Math.random() - 0.5);

    return {
        id: crypto.randomUUID(),
        tripId,
        sessionId,
        name,
        buyIn,
        playerIds,
        rotation,
        currentWolfIndex: 0,
        pigAvailable: true,
        holeResults: [],
        standings: playerIds.map(id => ({
            playerId: id,
            points: 0,
            wolvesPlayed: 0,
            loneWolfAttempts: 0,
            loneWolfWins: 0,
            pigAttempts: 0,
            pigWins: 0,
        })),
        status: 'setup',
        createdAt: new Date().toISOString(),
    };
}

/**
 * Get the current wolf for a hole
 */
export function getWolfForHole(game: WolfGame, holeNumber: number): UUID {
    // Rotate through players every 4 holes
    const index = (holeNumber - 1) % 4;
    return game.rotation[index];
}

/**
 * Record Wolf choosing a partner (or going lone/pig)
 */
export function wolfChoosesPartner(
    game: WolfGame,
    holeNumber: number,
    wolfId: UUID,
    partnerId?: UUID,
    isPig: boolean = false
): WolfGame {
    const isLoneWolf = !partnerId;

    // Update wolf's stats
    const wolfStanding = game.standings.find(s => s.playerId === wolfId);
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

/**
 * Record a Wolf hole result
 */
export function recordWolfHoleResult(
    game: WolfGame,
    holeNumber: number,
    wolfId: UUID,
    partnerId: UUID | undefined,
    isPig: boolean,
    wolfTeamScore: number, // Net score for wolf team
    packTeamScore: number // Net score for pack team
): WolfGame {
    const config = { ...DEFAULT_WOLF_CONFIG };
    const isLoneWolf = !partnerId;

    // Determine winner
    let winner: 'wolf' | 'pack' | 'push';
    if (wolfTeamScore < packTeamScore) {
        winner = 'wolf';
    } else if (packTeamScore < wolfTeamScore) {
        winner = 'pack';
    } else {
        winner = 'push';
    }

    // Calculate points
    let basePoints = config.pointsPerHole;
    if (isLoneWolf) {
        basePoints *= isPig ? config.pigMultiplier : config.loneWolfMultiplier;
    }

    const pointsExchanged = winner === 'push' ? 0 : basePoints;

    // Record hole result
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

    // Update standings
    const newStandings = [...game.standings];
    if (winner !== 'push') {
        if (winner === 'wolf') {
            // Wolf team wins
            const wolfStanding = newStandings.find(s => s.playerId === wolfId);
            if (wolfStanding) {
                wolfStanding.points += pointsExchanged * (isLoneWolf ? 3 : 2); // Win from 3 or 2 opponents
                if (isLoneWolf) {
                    wolfStanding.loneWolfWins++;
                    if (isPig) wolfStanding.pigWins++;
                }
            }
            if (partnerId) {
                const partnerStanding = newStandings.find(s => s.playerId === partnerId);
                if (partnerStanding) {
                    partnerStanding.points += pointsExchanged;
                }
            }
            // Pack loses
            const packIds = game.playerIds.filter(
                id => id !== wolfId && id !== partnerId
            );
            for (const packId of packIds) {
                const packStanding = newStandings.find(s => s.playerId === packId);
                if (packStanding) {
                    packStanding.points -= pointsExchanged;
                }
            }
        } else {
            // Pack wins
            const wolfStanding = newStandings.find(s => s.playerId === wolfId);
            if (wolfStanding) {
                wolfStanding.points -= pointsExchanged * (isLoneWolf ? 3 : 2);
            }
            if (partnerId) {
                const partnerStanding = newStandings.find(s => s.playerId === partnerId);
                if (partnerStanding) {
                    partnerStanding.points -= pointsExchanged;
                }
            }
            // Pack wins
            const packIds = game.playerIds.filter(
                id => id !== wolfId && id !== partnerId
            );
            for (const packId of packIds) {
                const packStanding = newStandings.find(s => s.playerId === packId);
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

// ============================================
// VEGAS GAME
// ============================================

/**
 * Default Vegas configuration
 */
export const DEFAULT_VEGAS_CONFIG: VegasConfig = {
    flipEnabled: true,
    flipThreshold: 8,
    maxPointsPerHole: undefined, // No cap
    birdieBonus: 0,
};

/**
 * Create a new Vegas game
 */
export function createVegasGame(
    tripId: UUID,
    name: string,
    pointValue: number,
    team1PlayerIds: UUID[],
    team2PlayerIds: UUID[],
    sessionId?: UUID,
    config: Partial<VegasConfig> = {}
): VegasGame {
    if (team1PlayerIds.length !== 2 || team2PlayerIds.length !== 2) {
        throw new Error('Vegas requires exactly 2 players per team');
    }

    return {
        id: crypto.randomUUID(),
        tripId,
        sessionId,
        name,
        pointValue,
        team1PlayerIds,
        team2PlayerIds,
        flipEnabled: config.flipEnabled ?? DEFAULT_VEGAS_CONFIG.flipEnabled,
        flipThreshold: config.flipThreshold ?? DEFAULT_VEGAS_CONFIG.flipThreshold,
        holeResults: [],
        runningScore: 0,
        status: 'setup',
        createdAt: new Date().toISOString(),
    };
}

/**
 * Calculate Vegas number from two scores
 * Lower score goes first (e.g., 4,5 = 45; 5,4 = 45)
 * If flipped due to bad hole, higher score goes first (e.g., 4,8 flipped = 84)
 */
export function calculateVegasNumber(
    score1: number,
    score2: number,
    shouldFlip: boolean
): number {
    const low = Math.min(score1, score2);
    const high = Math.max(score1, score2);

    if (shouldFlip) {
        return high * 10 + low;
    }
    return low * 10 + high;
}

/**
 * Record a Vegas hole result
 */
export function recordVegasHoleResult(
    game: VegasGame,
    holeNumber: number,
    team1Scores: [number, number],
    team2Scores: [number, number]
): VegasGame {
    // Check if either team should be flipped
    const team1HasBad = team1Scores.some(s => s >= game.flipThreshold);
    const team2HasBad = team2Scores.some(s => s >= game.flipThreshold);

    const team1Flipped = game.flipEnabled && team1HasBad;
    const team2Flipped = game.flipEnabled && team2HasBad;

    const team1Vegas = calculateVegasNumber(team1Scores[0], team1Scores[1], team1Flipped);
    const team2Vegas = calculateVegasNumber(team2Scores[0], team2Scores[1], team2Flipped);

    const pointDiff = team2Vegas - team1Vegas; // Positive = team1 advantage
    const newRunningTotal = game.runningScore + pointDiff;

    const holeResult: VegasHoleResult = {
        holeNumber,
        team1Scores,
        team2Scores,
        team1Vegas,
        team2Vegas,
        team1Flipped,
        team2Flipped,
        pointDiff,
        runningTotal: newRunningTotal,
    };

    return {
        ...game,
        holeResults: [...game.holeResults, holeResult],
        runningScore: newRunningTotal,
        status: 'active',
    };
}

// ============================================
// HAMMER GAME
// ============================================

/**
 * Default Hammer configuration
 */
export const DEFAULT_HAMMER_CONFIG: HammerConfig = {
    startingValue: 1,
    valueMultiplier: 2,
    maxHammersPerHole: 4,
    autoAcceptFinal: true,
};

/**
 * Create a new Hammer game
 */
export function createHammerGame(
    tripId: UUID,
    name: string,
    startingValue: number,
    team1PlayerIds: UUID[],
    team2PlayerIds: UUID[],
    sessionId?: UUID,
    maxHammers: number = 4
): HammerGame {
    return {
        id: crypto.randomUUID(),
        tripId,
        sessionId,
        name,
        startingValue,
        team1PlayerIds,
        team2PlayerIds,
        currentValue: startingValue,
        hammerHolder: 'team1', // Team1 starts with hammer
        maxHammers,
        holeResults: [],
        runningScore: 0,
        status: 'setup',
        createdAt: new Date().toISOString(),
    };
}

/**
 * Process a hammer action
 */
export function processHammerAction(
    game: HammerGame,
    holeNumber: number,
    team: 'team1' | 'team2',
    action: 'hammer' | 'accept' | 'decline'
): { game: HammerGame; holeComplete: boolean; winner?: 'team1' | 'team2' | 'halved' } {
    const config = { ...DEFAULT_HAMMER_CONFIG, startingValue: game.startingValue };

    // Find or create current hole result
    let currentHole = game.holeResults.find(hr => hr.holeNumber === holeNumber);
    if (!currentHole) {
        currentHole = {
            holeNumber,
            hammerActions: [],
            finalValue: game.startingValue,
            winner: 'halved',
            pointsWon: 0,
        };
    }

    const hammerAction: HammerAction = {
        team,
        action,
        valueAfter: action === 'hammer'
            ? currentHole.finalValue * config.valueMultiplier
            : currentHole.finalValue,
        timestamp: new Date().toISOString(),
    };

    currentHole.hammerActions.push(hammerAction);

    let holeComplete = false;
    let winner: 'team1' | 'team2' | 'halved' | undefined;

    if (action === 'hammer') {
        // Double the value, opponent must respond
        currentHole.finalValue *= config.valueMultiplier;

        // Check if max hammers reached
        const hammerCount = currentHole.hammerActions.filter(a => a.action === 'hammer').length;
        if (hammerCount >= game.maxHammers && config.autoAcceptFinal) {
            holeComplete = true;
            // Winner determined by actual scores (not here)
        }
    } else if (action === 'decline') {
        // Declining team loses the hole at previous value
        holeComplete = true;
        winner = team === 'team1' ? 'team2' : 'team1';
        currentHole.winner = winner;
        currentHole.pointsWon = currentHole.finalValue / config.valueMultiplier; // Previous value
    } else if (action === 'accept') {
        // Hole plays out at current value
        // Winner determined by actual scores
    }

    // Update hole results
    const newHoleResults = game.holeResults.filter(hr => hr.holeNumber !== holeNumber);
    newHoleResults.push(currentHole);
    newHoleResults.sort((a, b) => a.holeNumber - b.holeNumber);

    // Switch hammer holder after successful hammer
    const newHammerHolder = action === 'hammer'
        ? (team === 'team1' ? 'team2' : 'team1')
        : game.hammerHolder;

    return {
        game: {
            ...game,
            holeResults: newHoleResults,
            currentValue: currentHole.finalValue,
            hammerHolder: newHammerHolder,
            status: 'active',
        },
        holeComplete,
        winner,
    };
}

/**
 * Complete a hammer hole with actual scores
 */
export function completeHammerHole(
    game: HammerGame,
    holeNumber: number,
    team1Score: number,
    team2Score: number
): HammerGame {
    const currentHole = game.holeResults.find(hr => hr.holeNumber === holeNumber);
    if (!currentHole) {
        throw new Error(`No hammer result found for hole ${holeNumber}`);
    }

    // If already completed (decline), return as-is
    if (currentHole.winner !== 'halved') {
        return game;
    }

    let winner: 'team1' | 'team2' | 'halved';
    if (team1Score < team2Score) {
        winner = 'team1';
    } else if (team2Score < team1Score) {
        winner = 'team2';
    } else {
        winner = 'halved';
    }

    currentHole.winner = winner;
    currentHole.pointsWon = winner === 'halved' ? 0 : currentHole.finalValue;

    // Update running score
    let newRunningScore = game.runningScore;
    if (winner === 'team1') {
        newRunningScore += currentHole.pointsWon;
    } else if (winner === 'team2') {
        newRunningScore -= currentHole.pointsWon;
    }

    const newHoleResults = game.holeResults.map(hr =>
        hr.holeNumber === holeNumber ? currentHole : hr
    );

    // Reset to starting value for next hole
    return {
        ...game,
        holeResults: newHoleResults,
        runningScore: newRunningScore,
        currentValue: game.startingValue,
    };
}

// ============================================
// NASSAU WITH AUTO-PRESS
// ============================================

/**
 * Create enhanced Nassau with auto-press
 */
export function createNassauEnhanced(
    tripId: UUID,
    name: string,
    baseValue: number,
    team1PlayerIds: UUID[],
    team2PlayerIds: UUID[],
    sessionId?: UUID,
    autoPressEnabled: boolean = true,
    autoPressThreshold: number = 2,
    maxPresses: number = 3
): NassauEnhanced {
    return {
        id: crypto.randomUUID(),
        tripId,
        sessionId,
        name,
        baseValue,
        team1PlayerIds,
        team2PlayerIds,
        autoPressEnabled,
        autoPressThreshold,
        maxPresses,
        presses: [],
        frontNine: {
            team1Holes: 0,
            team2Holes: 0,
            halvesCount: 0,
            presses: [],
        },
        backNine: {
            team1Holes: 0,
            team2Holes: 0,
            halvesCount: 0,
            presses: [],
        },
        overall: {
            team1Total: 0,
            team2Total: 0,
        },
        status: 'setup',
        createdAt: new Date().toISOString(),
    };
}

/**
 * Record a Nassau hole result
 */
export function recordNassauHoleResult(
    game: NassauEnhanced,
    holeNumber: number,
    team1Score: number,
    team2Score: number
): NassauEnhanced {
    const nine = holeNumber <= 9 ? 'front' : 'back';
    const nineResult = nine === 'front' ? { ...game.frontNine } : { ...game.backNine };

    // Record hole winner
    if (team1Score < team2Score) {
        nineResult.team1Holes++;
    } else if (team2Score < team1Score) {
        nineResult.team2Holes++;
    } else {
        nineResult.halvesCount++;
    }

    // Check for auto-press
    const newPresses: NassauPress[] = [];
    if (game.autoPressEnabled) {
        const team1Down = nineResult.team2Holes - nineResult.team1Holes;
        const team2Down = nineResult.team1Holes - nineResult.team2Holes;
        const existingNinePresses = game.presses.filter(p => p.nine === nine);

        // Team 1 auto-press
        if (
            team1Down >= game.autoPressThreshold &&
            existingNinePresses.filter(p => p.pressedByTeam === 'team1').length < game.maxPresses
        ) {
            // Check if we need a new press (every N holes down)
            const pressCount = existingNinePresses.filter(p => p.pressedByTeam === 'team1').length;
            if (team1Down >= game.autoPressThreshold * (pressCount + 1)) {
                newPresses.push({
                    id: crypto.randomUUID(),
                    nine,
                    startHole: holeNumber + 1,
                    pressedByTeam: 'team1',
                    value: game.baseValue,
                    isAuto: true,
                });
            }
        }

        // Team 2 auto-press
        if (
            team2Down >= game.autoPressThreshold &&
            existingNinePresses.filter(p => p.pressedByTeam === 'team2').length < game.maxPresses
        ) {
            const pressCount = existingNinePresses.filter(p => p.pressedByTeam === 'team2').length;
            if (team2Down >= game.autoPressThreshold * (pressCount + 1)) {
                newPresses.push({
                    id: crypto.randomUUID(),
                    nine,
                    startHole: holeNumber + 1,
                    pressedByTeam: 'team2',
                    value: game.baseValue,
                    isAuto: true,
                });
            }
        }
    }

    // Update overall totals
    const newOverall = { ...game.overall };
    if (team1Score < team2Score) {
        newOverall.team1Total++;
    } else if (team2Score < team1Score) {
        newOverall.team2Total++;
    }

    // Check for nine completion
    if (holeNumber === 9 || holeNumber === 18) {
        if (nineResult.team1Holes > nineResult.team2Holes) {
            nineResult.winner = 'team1';
        } else if (nineResult.team2Holes > nineResult.team1Holes) {
            nineResult.winner = 'team2';
        } else {
            nineResult.winner = 'push';
        }
    }

    // Update overall winner if round complete
    if (holeNumber === 18) {
        if (newOverall.team1Total > newOverall.team2Total) {
            newOverall.winner = 'team1';
        } else if (newOverall.team2Total > newOverall.team1Total) {
            newOverall.winner = 'team2';
        } else {
            newOverall.winner = 'push';
        }
    }

    return {
        ...game,
        frontNine: nine === 'front' ? nineResult : game.frontNine,
        backNine: nine === 'back' ? nineResult : game.backNine,
        overall: newOverall,
        presses: [...game.presses, ...newPresses],
        status: holeNumber === 18 ? 'completed' : 'active',
    };
}

/**
 * Manually add a press
 */
export function addManualPress(
    game: NassauEnhanced,
    nine: 'front' | 'back' | 'overall',
    team: 'team1' | 'team2',
    startHole: number,
    value?: number
): NassauEnhanced {
    const existingPresses = game.presses.filter(
        p => p.nine === nine && p.pressedByTeam === team
    );

    if (existingPresses.length >= game.maxPresses) {
        throw new Error(`Maximum presses (${game.maxPresses}) already reached for this nine`);
    }

    const newPress: NassauPress = {
        id: crypto.randomUUID(),
        nine,
        startHole,
        pressedByTeam: team,
        value: value ?? game.baseValue,
        isAuto: false,
    };

    return {
        ...game,
        presses: [...game.presses, newPress],
    };
}
