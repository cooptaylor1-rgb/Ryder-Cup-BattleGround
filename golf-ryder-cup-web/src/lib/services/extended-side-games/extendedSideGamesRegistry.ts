import type { UUID } from '@/lib/types/models';
import type {
    HammerConfig,
    HammerGame,
    NassauEnhanced,
    VegasConfig,
    VegasGame,
    WolfConfig,
    WolfGame,
} from '@/lib/types/sideGames';

export const DEFAULT_WOLF_CONFIG: WolfConfig = {
    pointsPerHole: 1,
    loneWolfMultiplier: 2,
    pigMultiplier: 3,
    blindWolfBonus: 1,
};

export const DEFAULT_VEGAS_CONFIG: VegasConfig = {
    flipEnabled: true,
    flipThreshold: 8,
    maxPointsPerHole: undefined,
    birdieBonus: 0,
};

export const DEFAULT_HAMMER_CONFIG: HammerConfig = {
    startingValue: 1,
    valueMultiplier: 2,
    maxHammersPerHole: 4,
    autoAcceptFinal: true,
};

function createId(): string {
    return crypto.randomUUID();
}

function createTimestamp(): string {
    return new Date().toISOString();
}

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

    const rotation = [...playerIds].sort(() => Math.random() - 0.5);

    return {
        id: createId(),
        tripId,
        sessionId,
        name,
        buyIn,
        playerIds,
        rotation,
        currentWolfIndex: 0,
        pigAvailable: true,
        holeResults: [],
        standings: playerIds.map((id) => ({
            playerId: id,
            points: 0,
            wolvesPlayed: 0,
            loneWolfAttempts: 0,
            loneWolfWins: 0,
            pigAttempts: 0,
            pigWins: 0,
        })),
        status: 'setup',
        createdAt: createTimestamp(),
    };
}

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
        id: createId(),
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
        createdAt: createTimestamp(),
    };
}

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
        id: createId(),
        tripId,
        sessionId,
        name,
        startingValue,
        team1PlayerIds,
        team2PlayerIds,
        currentValue: startingValue,
        hammerHolder: 'team1',
        maxHammers,
        holeResults: [],
        runningScore: 0,
        status: 'setup',
        createdAt: createTimestamp(),
    };
}

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
        id: createId(),
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
        createdAt: createTimestamp(),
    };
}
