/**
 * Extended Side Games Service
 *
 * Full implementations of Wolf, Vegas, Hammer, and enhanced Nassau with auto-press.
 * These are popular buddies trip games that add excitement beyond standard skins.
 */

import type { UUID, Player } from '@/lib/types/models';
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
    SettlementTransaction,
    TripSettlementSummary,
    PlayerSettlementBalance,
    SettlementGameItem,
} from '@/lib/types/sideGames';

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

/**
 * Calculate Wolf payouts
 */
export function calculateWolfPayouts(
    game: WolfGame,
    players: Player[]
): { playerId: UUID; playerName: string; netPoints: number; netAmount: number }[] {
    return game.standings.map(standing => {
        const player = players.find(p => p.id === standing.playerId);
        return {
            playerId: standing.playerId,
            playerName: player ? `${player.firstName} ${player.lastName}` : 'Unknown',
            netPoints: standing.points,
            netAmount: standing.points * game.buyIn,
        };
    }).sort((a, b) => b.netAmount - a.netAmount);
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

/**
 * Calculate Vegas payouts
 */
export function calculateVegasPayouts(
    game: VegasGame,
    _players: Player[]
): {
    team1Owes: number;
    team2Owes: number;
    settlementAmount: number;
    winningTeam: 'team1' | 'team2' | 'push';
    breakdown: { holeNumber: number; diff: number; flip: string }[];
} {
    const totalDiff = game.runningScore;
    const settlementAmount = Math.abs(totalDiff) * game.pointValue;

    let winningTeam: 'team1' | 'team2' | 'push';
    if (totalDiff > 0) {
        winningTeam = 'team1';
    } else if (totalDiff < 0) {
        winningTeam = 'team2';
    } else {
        winningTeam = 'push';
    }

    const breakdown = game.holeResults.map(hr => ({
        holeNumber: hr.holeNumber,
        diff: hr.pointDiff,
        flip: [
            hr.team1Flipped ? 'T1' : '',
            hr.team2Flipped ? 'T2' : '',
        ]
            .filter(Boolean)
            .join(',') || '-',
    }));

    return {
        team1Owes: totalDiff < 0 ? settlementAmount : 0,
        team2Owes: totalDiff > 0 ? settlementAmount : 0,
        settlementAmount,
        winningTeam,
        breakdown,
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

/**
 * Calculate Hammer payouts
 */
export function calculateHammerPayouts(
    game: HammerGame,
    _players: Player[]
): {
    team1Total: number;
    team2Total: number;
    netSettlement: number;
    winningTeam: 'team1' | 'team2' | 'push';
    holeBreakdown: { hole: number; value: number; winner: string }[];
} {
    const holeBreakdown = game.holeResults.map(hr => ({
        hole: hr.holeNumber,
        value: hr.pointsWon,
        winner: hr.winner,
    }));

    const team1Total = game.holeResults
        .filter(hr => hr.winner === 'team1')
        .reduce((sum, hr) => sum + hr.pointsWon, 0);

    const team2Total = game.holeResults
        .filter(hr => hr.winner === 'team2')
        .reduce((sum, hr) => sum + hr.pointsWon, 0);

    const netSettlement = team1Total - team2Total;

    let winningTeam: 'team1' | 'team2' | 'push';
    if (netSettlement > 0) {
        winningTeam = 'team1';
    } else if (netSettlement < 0) {
        winningTeam = 'team2';
    } else {
        winningTeam = 'push';
    }

    return {
        team1Total,
        team2Total,
        netSettlement: Math.abs(netSettlement),
        winningTeam,
        holeBreakdown,
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

/**
 * Calculate Nassau payouts including presses
 */
export function calculateNassauPayouts(
    game: NassauEnhanced,
    _players: Player[]
): {
    frontNineResult: { winner: string; amount: number };
    backNineResult: { winner: string; amount: number };
    overallResult: { winner: string; amount: number };
    pressResults: { nine: string; winner: string; amount: number; isAuto: boolean }[];
    totalTeam1: number;
    totalTeam2: number;
    netSettlement: number;
} {
    let totalTeam1 = 0;
    let totalTeam2 = 0;

    // Front nine
    const frontNineResult = {
        winner: game.frontNine.winner || 'push',
        amount: game.baseValue,
    };
    if (game.frontNine.winner === 'team1') totalTeam1 += game.baseValue;
    if (game.frontNine.winner === 'team2') totalTeam2 += game.baseValue;

    // Back nine
    const backNineResult = {
        winner: game.backNine.winner || 'push',
        amount: game.baseValue,
    };
    if (game.backNine.winner === 'team1') totalTeam1 += game.baseValue;
    if (game.backNine.winner === 'team2') totalTeam2 += game.baseValue;

    // Overall
    const overallResult = {
        winner: game.overall.winner || 'push',
        amount: game.baseValue,
    };
    if (game.overall.winner === 'team1') totalTeam1 += game.baseValue;
    if (game.overall.winner === 'team2') totalTeam2 += game.baseValue;

    // Presses (simplified - would need hole-by-hole tracking for accurate press results)
    const pressResults = game.presses.map(press => {
        // For simplicity, using the nine's result for press result
        const nineResult = press.nine === 'front' ? game.frontNine : game.backNine;
        const pressWinner = nineResult.winner || 'push';

        if (pressWinner === 'team1') totalTeam1 += press.value;
        if (pressWinner === 'team2') totalTeam2 += press.value;

        return {
            nine: press.nine,
            winner: pressWinner,
            amount: press.value,
            isAuto: press.isAuto,
        };
    });

    return {
        frontNineResult,
        backNineResult,
        overallResult,
        pressResults,
        totalTeam1,
        totalTeam2,
        netSettlement: Math.abs(totalTeam1 - totalTeam2),
    };
}

// ============================================
// COMPREHENSIVE SETTLEMENT CALCULATOR
// ============================================

/**
 * Generate settlement transactions for a trip
 * Creates minimal number of transactions (debt simplification)
 */
export function generateTripSettlement(
    tripId: UUID,
    wolfGames: WolfGame[],
    vegasGames: VegasGame[],
    hammerGames: HammerGame[],
    nassauGames: NassauEnhanced[],
    skinsResults: { playerId: UUID; amount: number }[],
    players: Player[]
): TripSettlementSummary {
    // Calculate net balance for each player
    const balances = new Map<UUID, number>();
    const breakdowns = new Map<UUID, PlayerSettlementBalance['breakdown']>();

    // Initialize balances
    for (const player of players) {
        balances.set(player.id, 0);
        breakdowns.set(player.id, {
            skins: 0,
            nassau: 0,
            wolf: 0,
            vegas: 0,
            hammer: 0,
            sideBets: 0,
            other: 0,
        });
    }

    // Process Wolf games
    for (const game of wolfGames) {
        if (game.status !== 'completed') continue;
        for (const standing of game.standings) {
            const current = balances.get(standing.playerId) || 0;
            const amount = standing.points * game.buyIn;
            balances.set(standing.playerId, current + amount);
            const breakdown = breakdowns.get(standing.playerId);
            if (breakdown) breakdown.wolf += amount;
        }
    }

    // Process Vegas games
    for (const game of vegasGames) {
        if (game.status !== 'completed') continue;
        const payout = calculateVegasPayouts(game, players);
        const perPlayer = payout.settlementAmount / 2;

        if (payout.winningTeam === 'team1') {
            for (const id of game.team1PlayerIds) {
                balances.set(id, (balances.get(id) || 0) + perPlayer);
                const bd = breakdowns.get(id);
                if (bd) bd.vegas += perPlayer;
            }
            for (const id of game.team2PlayerIds) {
                balances.set(id, (balances.get(id) || 0) - perPlayer);
                const bd = breakdowns.get(id);
                if (bd) bd.vegas -= perPlayer;
            }
        } else if (payout.winningTeam === 'team2') {
            for (const id of game.team2PlayerIds) {
                balances.set(id, (balances.get(id) || 0) + perPlayer);
                const bd = breakdowns.get(id);
                if (bd) bd.vegas += perPlayer;
            }
            for (const id of game.team1PlayerIds) {
                balances.set(id, (balances.get(id) || 0) - perPlayer);
                const bd = breakdowns.get(id);
                if (bd) bd.vegas -= perPlayer;
            }
        }
    }

    // Process Hammer games
    for (const game of hammerGames) {
        if (game.status !== 'completed') continue;
        const payout = calculateHammerPayouts(game, players);
        const perPlayer = payout.netSettlement / 2;

        if (payout.winningTeam === 'team1') {
            for (const id of game.team1PlayerIds) {
                balances.set(id, (balances.get(id) || 0) + perPlayer);
                const bd = breakdowns.get(id);
                if (bd) bd.hammer += perPlayer;
            }
            for (const id of game.team2PlayerIds) {
                balances.set(id, (balances.get(id) || 0) - perPlayer);
                const bd = breakdowns.get(id);
                if (bd) bd.hammer -= perPlayer;
            }
        } else if (payout.winningTeam === 'team2') {
            for (const id of game.team2PlayerIds) {
                balances.set(id, (balances.get(id) || 0) + perPlayer);
                const bd = breakdowns.get(id);
                if (bd) bd.hammer += perPlayer;
            }
            for (const id of game.team1PlayerIds) {
                balances.set(id, (balances.get(id) || 0) - perPlayer);
                const bd = breakdowns.get(id);
                if (bd) bd.hammer -= perPlayer;
            }
        }
    }

    // Process Nassau games
    for (const game of nassauGames) {
        if (game.status !== 'completed') continue;
        const payout = calculateNassauPayouts(game, players);
        const team1Net = payout.totalTeam1 - payout.totalTeam2;
        const perPlayer = Math.abs(team1Net) / 2;

        if (team1Net > 0) {
            for (const id of game.team1PlayerIds) {
                balances.set(id, (balances.get(id) || 0) + perPlayer);
                const bd = breakdowns.get(id);
                if (bd) bd.nassau += perPlayer;
            }
            for (const id of game.team2PlayerIds) {
                balances.set(id, (balances.get(id) || 0) - perPlayer);
                const bd = breakdowns.get(id);
                if (bd) bd.nassau -= perPlayer;
            }
        } else if (team1Net < 0) {
            for (const id of game.team2PlayerIds) {
                balances.set(id, (balances.get(id) || 0) + perPlayer);
                const bd = breakdowns.get(id);
                if (bd) bd.nassau += perPlayer;
            }
            for (const id of game.team1PlayerIds) {
                balances.set(id, (balances.get(id) || 0) - perPlayer);
                const bd = breakdowns.get(id);
                if (bd) bd.nassau -= perPlayer;
            }
        }
    }

    // Process Skins
    for (const result of skinsResults) {
        balances.set(result.playerId, (balances.get(result.playerId) || 0) + result.amount);
        const bd = breakdowns.get(result.playerId);
        if (bd) bd.skins += result.amount;
    }

    // Generate simplified transactions (minimize number of payments)
    const creditors = Array.from(balances.entries())
        .filter(([, bal]) => bal > 0.01)
        .map(([id, bal]) => ({ id, balance: bal }))
        .sort((a, b) => b.balance - a.balance);

    const debtors = Array.from(balances.entries())
        .filter(([, bal]) => bal < -0.01)
        .map(([id, bal]) => ({ id, balance: Math.abs(bal) }))
        .sort((a, b) => b.balance - a.balance);

    const transactions: SettlementTransaction[] = [];

    let i = 0;
    let j = 0;

    while (i < creditors.length && j < debtors.length) {
        const creditor = creditors[i];
        const debtor = debtors[j];
        const amount = Math.min(creditor.balance, debtor.balance);

        if (amount > 0.01) {
            const fromPlayer = players.find(p => p.id === debtor.id);
            const toPlayer = players.find(p => p.id === creditor.id);

            const fromBreakdown = breakdowns.get(debtor.id)!;

            const gameBreakdown: SettlementGameItem[] = [];
            if (fromBreakdown.wolf !== 0) {
                gameBreakdown.push({ gameName: 'Wolf', gameType: 'wolf', amount: Math.abs(fromBreakdown.wolf), description: 'Wolf game net' });
            }
            if (fromBreakdown.vegas !== 0) {
                gameBreakdown.push({ gameName: 'Vegas', gameType: 'vegas', amount: Math.abs(fromBreakdown.vegas), description: 'Vegas game net' });
            }
            if (fromBreakdown.hammer !== 0) {
                gameBreakdown.push({ gameName: 'Hammer', gameType: 'hammer', amount: Math.abs(fromBreakdown.hammer), description: 'Hammer game net' });
            }
            if (fromBreakdown.nassau !== 0) {
                gameBreakdown.push({ gameName: 'Nassau', gameType: 'nassau', amount: Math.abs(fromBreakdown.nassau), description: 'Nassau net' });
            }
            if (fromBreakdown.skins !== 0) {
                gameBreakdown.push({ gameName: 'Skins', gameType: 'skins', amount: Math.abs(fromBreakdown.skins), description: 'Skins net' });
            }

            transactions.push({
                id: crypto.randomUUID(),
                tripId,
                fromPlayerId: debtor.id,
                fromPlayerName: fromPlayer ? `${fromPlayer.firstName} ${fromPlayer.lastName}` : 'Unknown',
                toPlayerId: creditor.id,
                toPlayerName: toPlayer ? `${toPlayer.firstName} ${toPlayer.lastName}` : 'Unknown',
                amount: Math.round(amount * 100) / 100,
                gameBreakdown,
                status: 'pending',
                venmoLink: toPlayer?.venmoUsername
                    ? `venmo://paycharge?txn=pay&recipients=${toPlayer.venmoUsername}&amount=${amount.toFixed(2)}&note=Golf%20Trip%20Settlement`
                    : undefined,
                paypalLink: toPlayer?.paypalUsername
                    ? `https://www.paypal.com/paypalme/${toPlayer.paypalUsername}/${amount.toFixed(2)}`
                    : undefined,
                zelleInfo: toPlayer?.zelleEmail || toPlayer?.zellePhone
                    ? `Send via Zelle to ${toPlayer.zelleEmail || toPlayer.zellePhone}`
                    : undefined,
                createdAt: new Date().toISOString(),
            });
        }

        creditor.balance -= amount;
        debtor.balance -= amount;

        if (creditor.balance < 0.01) i++;
        if (debtor.balance < 0.01) j++;
    }

    // Build player balances
    const playerBalances: PlayerSettlementBalance[] = players.map(player => {
        const netAmount = balances.get(player.id) || 0;
        const breakdown = breakdowns.get(player.id)!;

        const owesTo = transactions
            .filter(t => t.fromPlayerId === player.id)
            .map(t => ({
                playerId: t.toPlayerId,
                playerName: t.toPlayerName,
                amount: t.amount,
            }));

        const owedBy = transactions
            .filter(t => t.toPlayerId === player.id)
            .map(t => ({
                playerId: t.fromPlayerId,
                playerName: t.fromPlayerName,
                amount: t.amount,
            }));

        return {
            playerId: player.id,
            playerName: `${player.firstName} ${player.lastName}`,
            netAmount,
            breakdown,
            owesTo,
            owedBy,
        };
    });

    const totalPot = Math.abs(
        Array.from(balances.values())
            .filter(b => b > 0)
            .reduce((sum, b) => sum + b, 0)
    );

    return {
        tripId,
        totalPot,
        transactions,
        playerBalances,
        isFullySettled: transactions.every(t => t.status === 'completed'),
        generatedAt: new Date().toISOString(),
    };
}

/**
 * Generate Venmo deep link
 */
export function generateVenmoLink(
    recipientUsername: string,
    amount: number,
    note: string
): string {
    const encodedNote = encodeURIComponent(note);
    return `venmo://paycharge?txn=pay&recipients=${recipientUsername}&amount=${amount.toFixed(2)}&note=${encodedNote}`;
}

/**
 * Generate PayPal.me link
 */
export function generatePayPalLink(
    recipientPayPalMe: string,
    amount: number
): string {
    return `https://www.paypal.me/${recipientPayPalMe}/${amount.toFixed(2)}`;
}

/**
 * Generate Zelle instruction text
 */
export function generateZelleInfo(
    recipientEmail: string,
    recipientPhone: string | undefined,
    amount: number
): string {
    const contact = recipientPhone || recipientEmail;
    return `Send $${amount.toFixed(2)} via Zelle to ${contact}`;
}
