/**
 * Trip Stats Service
 *
 * Manages fun stats tracking for golf trips.
 * Provides CRUD operations and leaderboard calculations.
 */

import { db } from '@/lib/db';
import type { UUID } from '@/lib/types/models';
import type {
    PlayerTripStat,
    TripAward,
    TripStatType,
    AwardType,
    StatLeaderboardEntry,
} from '@/lib/types/tripStats';

// ============================================
// STAT MANAGEMENT
// ============================================

/**
 * Add or update a stat for a player
 */
export async function recordStat(params: {
    tripId: UUID;
    playerId: UUID;
    statType: TripStatType;
    value: number;
    sessionId?: UUID;
    note?: string;
    recordedBy?: UUID;
}): Promise<PlayerTripStat> {
    const stat: PlayerTripStat = {
        id: crypto.randomUUID() as UUID,
        tripId: params.tripId,
        playerId: params.playerId,
        statType: params.statType,
        value: params.value,
        sessionId: params.sessionId,
        note: params.note,
        recordedBy: params.recordedBy,
        timestamp: new Date().toISOString(),
    };

    await db.tripStats.add(stat);
    return stat;
}

/**
 * Increment a stat value by amount (default 1)
 */
export async function incrementStat(params: {
    tripId: UUID;
    playerId: UUID;
    statType: TripStatType;
    amount?: number;
    sessionId?: UUID;
    note?: string;
    recordedBy?: UUID;
}): Promise<PlayerTripStat> {
    const amount = params.amount ?? 1;

    // For session-specific stats, increment the session stat
    // For trip-wide stats, increment the total
    const existing = await db.tripStats
        .where('[tripId+playerId]')
        .equals([params.tripId, params.playerId])
        .filter(s =>
            s.statType === params.statType &&
            (params.sessionId ? s.sessionId === params.sessionId : !s.sessionId)
        )
        .first();

    if (existing) {
        const newValue = existing.value + amount;
        await db.tripStats.update(existing.id, {
            value: newValue,
            timestamp: new Date().toISOString(),
            note: params.note ?? existing.note,
        });
        return { ...existing, value: newValue };
    }

    return recordStat({
        tripId: params.tripId,
        playerId: params.playerId,
        statType: params.statType,
        value: amount,
        sessionId: params.sessionId,
        note: params.note,
        recordedBy: params.recordedBy,
    });
}

/**
 * Get all stats for a player in a trip
 */
export async function getPlayerStats(tripId: UUID, playerId: UUID): Promise<PlayerTripStat[]> {
    return db.tripStats
        .where('[tripId+playerId]')
        .equals([tripId, playerId])
        .toArray();
}

/**
 * Get all stats for a trip
 */
export async function getTripStats(tripId: UUID): Promise<PlayerTripStat[]> {
    return db.tripStats
        .where('tripId')
        .equals(tripId)
        .toArray();
}

/**
 * Get stats for a specific session
 */
export async function getSessionStats(tripId: UUID, sessionId: UUID): Promise<PlayerTripStat[]> {
    return db.tripStats
        .where('tripId')
        .equals(tripId)
        .filter(s => s.sessionId === sessionId)
        .toArray();
}

/**
 * Delete a stat entry
 */
export async function deleteStat(statId: UUID): Promise<void> {
    await db.tripStats.delete(statId);
}

/**
 * Update a stat entry
 */
export async function updateStat(statId: UUID, updates: Partial<Pick<PlayerTripStat, 'value' | 'note'>>): Promise<void> {
    await db.tripStats.update(statId, {
        ...updates,
        timestamp: new Date().toISOString(),
    });
}

// ============================================
// LEADERBOARDS
// ============================================

/**
 * Get leaderboard for a specific stat type
 */
export async function getStatLeaderboard(
    tripId: UUID,
    statType: TripStatType
): Promise<StatLeaderboardEntry[]> {
    const stats = await db.tripStats
        .where('[tripId+statType]')
        .equals([tripId, statType])
        .toArray();

    // Aggregate by player (sum all their stat entries)
    const playerTotals = new Map<UUID, number>();

    for (const stat of stats) {
        const current = playerTotals.get(stat.playerId) ?? 0;
        playerTotals.set(stat.playerId, current + stat.value);
    }

    // Get player names
    const players = await db.players.bulkGet([...playerTotals.keys()]);
    const playerNames = new Map(
        players.filter(Boolean).map(p => [p!.id, `${p!.firstName} ${p!.lastName}`])
    );

    // Sort by value (descending) and assign ranks
    const entries: StatLeaderboardEntry[] = [...playerTotals.entries()]
        .map(([playerId, value]) => ({
            playerId,
            playerName: playerNames.get(playerId) ?? 'Unknown',
            value,
            rank: 0,
        }))
        .sort((a, b) => b.value - a.value);

    // Assign ranks (handle ties)
    let currentRank = 1;
    for (let i = 0; i < entries.length; i++) {
        if (i > 0 && entries[i].value < entries[i - 1].value) {
            currentRank = i + 1;
        }
        entries[i].rank = currentRank;
    }

    return entries;
}

/**
 * Get aggregated player totals for a trip
 */
export async function getPlayerTotals(
    tripId: UUID,
    playerId: UUID
): Promise<Map<TripStatType, number>> {
    const stats = await getPlayerStats(tripId, playerId);

    const totals = new Map<TripStatType, number>();
    for (const stat of stats) {
        const current = totals.get(stat.statType) ?? 0;
        totals.set(stat.statType, current + stat.value);
    }

    return totals;
}

/**
 * Get trip-wide totals for all stats
 */
export async function getTripTotals(tripId: UUID): Promise<Map<TripStatType, number>> {
    const stats = await getTripStats(tripId);

    const totals = new Map<TripStatType, number>();
    for (const stat of stats) {
        const current = totals.get(stat.statType) ?? 0;
        totals.set(stat.statType, current + stat.value);
    }

    return totals;
}

// ============================================
// AWARDS MANAGEMENT
// ============================================

/**
 * Award a player
 */
export async function giveAward(params: {
    tripId: UUID;
    awardType: AwardType;
    winnerId: UUID;
    nominatedBy?: UUID;
    note?: string;
}): Promise<TripAward> {
    // Check if award already given
    const existing = await db.tripAwards
        .where('[tripId+awardType]')
        .equals([params.tripId, params.awardType])
        .first();

    if (existing) {
        // Update existing award
        await db.tripAwards.update(existing.id, {
            winnerId: params.winnerId,
            nominatedBy: params.nominatedBy,
            note: params.note,
            awardedAt: new Date().toISOString(),
        });
        return { ...existing, ...params, awardedAt: new Date().toISOString() };
    }

    const award: TripAward = {
        id: crypto.randomUUID() as UUID,
        tripId: params.tripId,
        awardType: params.awardType,
        winnerId: params.winnerId,
        nominatedBy: params.nominatedBy,
        note: params.note,
        awardedAt: new Date().toISOString(),
    };

    await db.tripAwards.add(award);
    return award;
}

/**
 * Get all awards for a trip
 */
export async function getTripAwards(tripId: UUID): Promise<TripAward[]> {
    return db.tripAwards.where('tripId').equals(tripId).toArray();
}

/**
 * Get awards won by a player
 */
export async function getPlayerAwards(tripId: UUID, playerId: UUID): Promise<TripAward[]> {
    return db.tripAwards
        .where('tripId')
        .equals(tripId)
        .filter(a => a.winnerId === playerId)
        .toArray();
}

/**
 * Remove an award
 */
export async function removeAward(awardId: UUID): Promise<void> {
    await db.tripAwards.delete(awardId);
}

// ============================================
// AUTO-AWARD SUGGESTIONS
// ============================================

/**
 * Get suggested awards based on trip stats
 * Returns player IDs for each auto-calculable award
 */
export async function getSuggestedAwards(tripId: UUID): Promise<Map<AwardType, UUID>> {
    const suggestions = new Map<AwardType, UUID>();

    // Get stat leaderboards for auto-awards
    const ballsLostLeader = await getStatLeaderboard(tripId, 'balls_lost');
    if (ballsLostLeader.length > 0 && ballsLostLeader[0].value > 0) {
        suggestions.set('most_lost_balls', ballsLostLeader[0].playerId);
    }

    const beersLeader = await getStatLeaderboard(tripId, 'beers');
    const cocktailsLeader = await getStatLeaderboard(tripId, 'cocktails');
    const shotsLeader = await getStatLeaderboard(tripId, 'shots');

    // Combine beverage totals
    const beverageTotals = new Map<UUID, number>();
    for (const leader of [...beersLeader, ...cocktailsLeader, ...shotsLeader]) {
        const current = beverageTotals.get(leader.playerId) ?? 0;
        beverageTotals.set(leader.playerId, current + leader.value);
    }

    if (beverageTotals.size > 0) {
        const topBeverage = [...beverageTotals.entries()]
            .sort((a, b) => b[1] - a[1])[0];
        if (topBeverage && topBeverage[1] > 0) {
            suggestions.set('beverage_king', topBeverage[0]);
        }
    }

    const sandLeader = await getStatLeaderboard(tripId, 'sand_traps');
    if (sandLeader.length > 0 && sandLeader[0].value > 0) {
        suggestions.set('sand_king', sandLeader[0].playerId);
    }

    const waterLeader = await getStatLeaderboard(tripId, 'water_hazards');
    if (waterLeader.length > 0 && waterLeader[0].value > 0) {
        suggestions.set('water_magnet', waterLeader[0].playerId);
    }

    const excusesLeader = await getStatLeaderboard(tripId, 'excuses_made');
    if (excusesLeader.length > 0 && excusesLeader[0].value > 0) {
        suggestions.set('most_excuses', excusesLeader[0].playerId);
    }

    const cartPathLeader = await getStatLeaderboard(tripId, 'cart_path_violations');
    if (cartPathLeader.length > 0 && cartPathLeader[0].value > 0) {
        suggestions.set('cart_path_champion', cartPathLeader[0].playerId);
    }

    return suggestions;
}

// ============================================
// QUICK STATS HELPERS
// ============================================

/**
 * Quick increment for common stats (one-tap tracking)
 */
export const quickStats = {
    beer: (tripId: UUID, playerId: UUID, sessionId?: UUID) =>
        incrementStat({ tripId, playerId, statType: 'beers', sessionId }),

    cocktail: (tripId: UUID, playerId: UUID, sessionId?: UUID) =>
        incrementStat({ tripId, playerId, statType: 'cocktails', sessionId }),

    shot: (tripId: UUID, playerId: UUID, sessionId?: UUID) =>
        incrementStat({ tripId, playerId, statType: 'shots', sessionId }),

    ballLost: (tripId: UUID, playerId: UUID, sessionId?: UUID) =>
        incrementStat({ tripId, playerId, statType: 'balls_lost', sessionId }),

    sandTrap: (tripId: UUID, playerId: UUID, sessionId?: UUID) =>
        incrementStat({ tripId, playerId, statType: 'sand_traps', sessionId }),

    water: (tripId: UUID, playerId: UUID, sessionId?: UUID) =>
        incrementStat({ tripId, playerId, statType: 'water_hazards', sessionId }),

    mulligan: (tripId: UUID, playerId: UUID, sessionId?: UUID) =>
        incrementStat({ tripId, playerId, statType: 'mulligans', sessionId }),

    cigar: (tripId: UUID, playerId: UUID, sessionId?: UUID) =>
        incrementStat({ tripId, playerId, statType: 'cigars', sessionId }),
};
