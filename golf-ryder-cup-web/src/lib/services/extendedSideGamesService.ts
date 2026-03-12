/**
 * Extended Side Games Service
 *
 * Public facade for side-game setup, scoring, payouts, and settlement helpers.
 */

export {
    DEFAULT_HAMMER_CONFIG,
    DEFAULT_VEGAS_CONFIG,
    DEFAULT_WOLF_CONFIG,
    createHammerGame,
    createNassauEnhanced,
    createVegasGame,
    createWolfGame,
} from './extended-side-games/extendedSideGamesRegistry';
export {
    getWolfForHole,
    recordWolfHoleResult,
    wolfChoosesPartner,
} from './extended-side-games/extendedSideGamesWolf';
export {
    calculateVegasNumber,
    recordVegasHoleResult,
} from './extended-side-games/extendedSideGamesVegas';
export {
    completeHammerHole,
    processHammerAction,
} from './extended-side-games/extendedSideGamesHammer';
export {
    addManualPress,
    recordNassauHoleResult,
} from './extended-side-games/extendedSideGamesNassau';
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
