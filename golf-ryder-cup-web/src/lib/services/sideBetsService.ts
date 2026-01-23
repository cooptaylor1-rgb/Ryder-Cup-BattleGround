/**
 * Side Bets & Budget Service
 *
 * Track side games (skins, nassau, etc.) and trip expenses:
 * - Configure side games
 * - Track entries and winners
 * - Calculate settlements
 * - Manage trip budget
 */

import type {
    SideGame,
    SideGameType,
    SideGameScoringMode,
    SideGameEntry,
    SideGameStandings,
    SkinsConfig,
    NassauConfig,
    TripExpense,
    PlayerBalance,
    SettlementSummary,
} from '@/lib/types/captain';
import type { Player, UUID, HoleResult, Match } from '@/lib/types/models';

// Re-export types for convenience
export type {
    SideGame,
    SideGameType,
    SideGameScoringMode,
    SideGameEntry,
    SideGameStandings,
    SkinsConfig,
    NassauConfig,
    TripExpense,
    PlayerBalance,
    SettlementSummary,
};

// Settlement type for individual settlements
export interface Settlement {
    fromPlayerId: UUID;
    toPlayerId: UUID;
    amount: number;
    settled?: boolean;  // Optional flag to track if settlement is complete
}

// ============================================
// SIDE GAME CONFIGURATION
// ============================================

/**
 * Create a new side game
 */
export function createSideGame(
    tripId: UUID,
    type: SideGameType,
    name: string,
    buyIn: number,
    playerIds: UUID[],
    scoringMode: SideGameScoringMode = 'net',
    config?: Record<string, unknown>,
    sessionId?: UUID
): SideGame {
    const defaultConfigs: Record<SideGameType, Record<string, unknown>> = {
        skins: { carryOver: true, doublesAfterCarry: false, holesIncluded: Array.from({ length: 18 }, (_, i) => i + 1) },
        nassau: { frontNineValue: buyIn, backNineValue: buyIn, overallValue: buyIn, autoPressAt: 2, maxPresses: 3 },
        kp: {},
        long_drive: {},
        bingo_bango_bongo: {},
        wolf: {},
        custom: {},
    };

    return {
        id: crypto.randomUUID(),
        tripId,
        sessionId,
        type,
        name,
        buyIn,
        scoringMode,
        playerIds,
        status: 'setup',
        config: config || defaultConfigs[type] || {},
        createdAt: new Date().toISOString(),
    };
}

/**
 * Get skins configuration
 */
export function getSkinsConfig(game: SideGame): SkinsConfig {
    return {
        carryOver: (game.config.carryOver as boolean) ?? true,
        doublesAfterCarry: (game.config.doublesAfterCarry as boolean) ?? false,
        holesIncluded: (game.config.holesIncluded as number[]) ?? Array.from({ length: 18 }, (_, i) => i + 1),
    };
}

/**
 * Get Nassau configuration
 */
export function getNassauConfig(game: SideGame): NassauConfig {
    return {
        frontNineValue: (game.config.frontNineValue as number) ?? game.buyIn,
        backNineValue: (game.config.backNineValue as number) ?? game.buyIn,
        overallValue: (game.config.overallValue as number) ?? game.buyIn,
        autoPressAt: (game.config.autoPressAt as number) ?? 2,
        maxPresses: (game.config.maxPresses as number) ?? 3,
    };
}

// ============================================
// SKINS CALCULATION
// ============================================

/**
 * Calculate skins results for a round
 */
export function calculateSkins(
    game: SideGame,
    holeResults: HoleResult[],
    match: Match,
    _players: Player[]
): SideGameEntry[] {
    const entries: SideGameEntry[] = [];
    const config = getSkinsConfig(game);

    // Group hole results by hole
    const holeScores = new Map<number, { teamA: number | undefined; teamB: number | undefined }>();

    for (const result of holeResults) {
        if (!config.holesIncluded.includes(result.holeNumber)) continue;

        holeScores.set(result.holeNumber, {
            teamA: result.teamAStrokes ?? result.teamAScore,
            teamB: result.teamBStrokes ?? result.teamBScore,
        });
    }

    let carryover = 0;
    const skinValue = game.buyIn;

    for (let hole = 1; hole <= 18; hole++) {
        if (!config.holesIncluded.includes(hole)) continue;

        const scores = holeScores.get(hole);
        if (!scores || scores.teamA === undefined || scores.teamB === undefined) continue;

        const currentValue = skinValue + (config.doublesAfterCarry && carryover > 0 ? carryover : carryover);

        if (scores.teamA < scores.teamB) {
            // Team A wins skin
            const winnerId = match.teamAPlayerIds[0]; // Simplified - would need proper scoring
            entries.push({
                id: crypto.randomUUID(),
                sideGameId: game.id,
                playerId: winnerId,
                holeNumber: hole,
                value: currentValue,
                description: `Skin won on hole ${hole}${carryover > 0 ? ' (with carryover)' : ''}`,
                timestamp: new Date().toISOString(),
            });
            carryover = 0;
        } else if (scores.teamB < scores.teamA) {
            // Team B wins skin
            const winnerId = match.teamBPlayerIds[0];
            entries.push({
                id: crypto.randomUUID(),
                sideGameId: game.id,
                playerId: winnerId,
                holeNumber: hole,
                value: currentValue,
                description: `Skin won on hole ${hole}${carryover > 0 ? ' (with carryover)' : ''}`,
                timestamp: new Date().toISOString(),
            });
            carryover = 0;
        } else {
            // Halved - carryover
            if (config.carryOver) {
                carryover += skinValue;
            }
        }
    }

    return entries;
}

/**
 * Calculate standings for a side game
 */
export function calculateSideGameStandings(
    game: SideGame,
    entries: SideGameEntry[],
    players: Player[]
): SideGameStandings {
    const gameEntries = entries.filter(e => e.sideGameId === game.id);
    const playerTotals = new Map<UUID, number>();
    const playerEntryCounts = new Map<UUID, number>();

    // Initialize all players
    for (const playerId of game.playerIds) {
        playerTotals.set(playerId, 0);
        playerEntryCounts.set(playerId, 0);
    }

    // Sum up entries
    for (const entry of gameEntries) {
        const current = playerTotals.get(entry.playerId) ?? 0;
        playerTotals.set(entry.playerId, current + entry.value);
        playerEntryCounts.set(entry.playerId, (playerEntryCounts.get(entry.playerId) ?? 0) + 1);
    }

    // Build standings
    const standings = Array.from(playerTotals.entries())
        .map(([playerId, winnings]) => {
            const player = players.find(p => p.id === playerId);
            return {
                playerId,
                playerName: player ? `${player.firstName} ${player.lastName}` : 'Unknown',
                winnings,
                entries: playerEntryCounts.get(playerId) ?? 0,
            };
        })
        .sort((a, b) => b.winnings - a.winnings);

    const totalPot = game.playerIds.length * game.buyIn;

    return {
        gameId: game.id,
        standings,
        totalPot,
    };
}

// ============================================
// KP & LONG DRIVE
// ============================================

/**
 * Create KP entry
 */
export function createKPEntry(
    game: SideGame,
    playerId: UUID,
    holeNumber: number,
    distance?: string
): SideGameEntry {
    return {
        id: crypto.randomUUID(),
        sideGameId: game.id,
        playerId,
        holeNumber,
        value: game.buyIn * game.playerIds.length, // Winner takes all
        description: `KP on hole ${holeNumber}${distance ? ` - ${distance}` : ''}`,
        timestamp: new Date().toISOString(),
    };
}

/**
 * Create Long Drive entry
 */
export function createLongDriveEntry(
    game: SideGame,
    playerId: UUID,
    holeNumber: number,
    distance?: string
): SideGameEntry {
    return {
        id: crypto.randomUUID(),
        sideGameId: game.id,
        playerId,
        holeNumber,
        value: game.buyIn * game.playerIds.length,
        description: `Long drive on hole ${holeNumber}${distance ? ` - ${distance}` : ''}`,
        timestamp: new Date().toISOString(),
    };
}

// ============================================
// BUDGET & EXPENSE TRACKING
// ============================================

/**
 * Create trip expense
 */
export function createExpense(
    tripId: UUID,
    category: TripExpense['category'],
    description: string,
    amount: number,
    paidBy: UUID,
    splitAmong: UUID[],
    date?: string
): TripExpense {
    return {
        id: crypto.randomUUID(),
        tripId,
        category,
        description,
        amount,
        paidBy,
        splitAmong,
        splitType: 'equal',
        date: date || new Date().toISOString(),
    };
}

/**
 * Calculate player balances
 */
export function calculatePlayerBalances(
    expenses: TripExpense[],
    players: Player[]
): PlayerBalance[] {
    const balances = new Map<UUID, { paid: number; owed: number }>();

    // Initialize all players
    for (const player of players) {
        balances.set(player.id, { paid: 0, owed: 0 });
    }

    // Process each expense
    for (const expense of expenses) {
        // Add to payer's paid total
        const payerBalance = balances.get(expense.paidBy);
        if (payerBalance) {
            payerBalance.paid += expense.amount;
        }

        // Calculate split
        if (expense.splitType === 'equal') {
            const splitAmount = expense.amount / expense.splitAmong.length;
            for (const playerId of expense.splitAmong) {
                const balance = balances.get(playerId);
                if (balance) {
                    balance.owed += splitAmount;
                }
            }
        } else if (expense.customSplits) {
            for (const split of expense.customSplits) {
                const balance = balances.get(split.playerId);
                if (balance) {
                    balance.owed += split.amount;
                }
            }
        }
    }

    // Build result
    return Array.from(balances.entries()).map(([playerId, balance]) => {
        const player = players.find(p => p.id === playerId);
        return {
            playerId,
            playerName: player ? `${player.firstName} ${player.lastName}` : 'Unknown',
            totalPaid: balance.paid,
            totalOwed: balance.owed,
            netBalance: balance.paid - balance.owed, // Positive = owed money
        };
    });
}

/**
 * Calculate settlements (who owes who)
 */
export function calculateSettlements(
    balances: PlayerBalance[]
): Settlement[] {
    const settlements: Settlement[] = [];

    // Separate into creditors and debtors
    const creditors = balances.filter(b => b.netBalance > 0).sort((a, b) => b.netBalance - a.netBalance);
    const debtors = balances.filter(b => b.netBalance < 0).sort((a, b) => a.netBalance - b.netBalance);

    // Simple settlement algorithm
    let i = 0;
    let j = 0;

    while (i < creditors.length && j < debtors.length) {
        const creditor = creditors[i];
        const debtor = debtors[j];

        const amount = Math.min(creditor.netBalance, Math.abs(debtor.netBalance));

        if (amount > 0.01) { // Avoid tiny amounts
            settlements.push({
                fromPlayerId: debtor.playerId,
                toPlayerId: creditor.playerId,
                amount: Math.round(amount * 100) / 100,
            });
        }

        creditor.netBalance -= amount;
        debtor.netBalance += amount;

        if (creditor.netBalance < 0.01) i++;
        if (debtor.netBalance > -0.01) j++;
    }

    return settlements;
}

/**
 * Generate settlement summary
 */
export function generateSettlementSummary(
    tripId: UUID,
    expenses: TripExpense[],
    players: Player[]
): SettlementSummary {
    const tripExpenses = expenses.filter(e => e.tripId === tripId);
    const totalExpenses = tripExpenses.reduce((sum, e) => sum + e.amount, 0);
    const balances = calculatePlayerBalances(tripExpenses, players);
    const settlements = calculateSettlements([...balances]); // Clone to avoid mutation

    return {
        tripId,
        totalExpenses,
        perPlayerShare: totalExpenses / players.length,
        balances,
        settlements,
    };
}

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
    }).format(amount);
}

/**
 * Get expense categories with totals
 */
export function getExpensesByCategory(
    expenses: TripExpense[]
): { category: TripExpense['category']; total: number; count: number }[] {
    const categories: TripExpense['category'][] = ['green_fees', 'carts', 'meals', 'lodging', 'prizes', 'other'];

    return categories.map(category => ({
        category,
        total: expenses.filter(e => e.category === category).reduce((sum, e) => sum + e.amount, 0),
        count: expenses.filter(e => e.category === category).length,
    })).filter(c => c.count > 0);
}

/**
 * Format settlement for display
 */
export function formatSettlement(
    settlement: { fromPlayerId: UUID; toPlayerId: UUID; amount: number },
    players: Player[]
): string {
    const from = players.find(p => p.id === settlement.fromPlayerId);
    const to = players.find(p => p.id === settlement.toPlayerId);

    const fromName = from ? `${from.firstName}` : 'Unknown';
    const toName = to ? `${to.firstName}` : 'Unknown';

    return `${fromName} pays ${toName} ${formatCurrency(settlement.amount)}`;
}
