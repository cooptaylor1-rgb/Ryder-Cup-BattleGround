/**
 * Lineup Builder Components — Barrel Export
 *
 * Phase 2: Captain Empowerment
 *
 * Drag-and-drop lineup creation with:
 * - PlayerCard for draggable players
 * - MatchSlot for drop zones
 * - LineupCanvas for full interface
 * - AutoBalance for optimization
 */

// Player Card
export {
    PlayerCard,
    DraggablePlayerCard,
    PlayerCardSkeleton,
    EmptyPlayerSlot,
    type PlayerCardData,
    type FormTrend,
} from './PlayerCard';

// Match Slot
export {
    MatchSlot,
    type MatchSlotData,
} from './MatchSlot';

// Lineup Canvas
export {
    LineupCanvas,
    type SessionConfig,
    type FairnessScore,
} from './LineupCanvas';

// Auto Balance Engine
export {
    autoBalanceLineup,
    calculateLineupFairness,
    calculateMatchFairness,
    calculateTeamHandicap,
    calculateTeamWinRate,
    calculateTeamExperience,
    suggestSwaps,
    DEFAULT_BALANCE_CONFIG,
    type BalanceWeights,
    type BalanceConfig,
    type SwapSuggestion,
} from './AutoBalanceEngine';
