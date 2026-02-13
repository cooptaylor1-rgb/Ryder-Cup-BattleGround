/**
 * Enhanced Statistics & Career Tracking Service
 *
 * Extended player statistics including:
 * - Career stats across trips
 * - Head-to-head rivalry records
 * - Historical comparisons
 * - Format-specific performance
 */

import type {
    PlayerStatistics,
    TripAward,
    AwardType,
    PlayerCareerStats,
    RivalryRecord,
} from '@/lib/types/captain';
import type {
    Player,
    Match,
    RyderCupSession,
    HoleResult,
    UUID,
} from '@/lib/types/models';
import { countHoleWins } from './multiRoundStatsService';

// ============================================
// ENHANCED PLAYER STATISTICS
// ============================================

/**
 * Calculate comprehensive player statistics for a trip
 */
export function calculateEnhancedPlayerStats(
    playerId: UUID,
    tripId: UUID,
    matches: Match[],
    sessions: RyderCupSession[],
    holeResults: HoleResult[],
    _players: Player[]
): PlayerStatistics {
    // Get all matches this player participated in
    const playerMatches = matches.filter(
        m => m.teamAPlayerIds.includes(playerId) || m.teamBPlayerIds.includes(playerId)
    );

    // Initialize stats
    const stats: PlayerStatistics = {
        playerId,
        tripId,
        matchesPlayed: 0,
        wins: 0,
        losses: 0,
        halves: 0,
        points: 0,
        winPercentage: 0,
        singlesRecord: { w: 0, l: 0, h: 0 },
        foursomesRecord: { w: 0, l: 0, h: 0 },
        fourballRecord: { w: 0, l: 0, h: 0 },
        holesWon: 0,
        holesLost: 0,
        holesHalved: 0,
        biggestWin: 0,
        comebacks: 0,
        closingRate: 0,
    };

    // Track partnership data
    const partnerRecords = new Map<UUID, { w: number; l: number; h: number }>();
    const opponentRecords = new Map<UUID, { w: number; l: number; h: number }>();

    // Track closing ability
    let closingSituations = 0;
    let successfulCloses = 0;

    for (const match of playerMatches) {
        if (match.status !== 'completed') continue;

        const session = sessions.find(s => s.id === match.sessionId);
        if (!session) continue;

        const isTeamA = match.teamAPlayerIds.includes(playerId);
        const matchHoleResults = holeResults.filter(hr => hr.matchId === match.id);

        // Determine match outcome
        let teamAHoles = 0;
        let teamBHoles = 0;
        let wasDown2AtAnyPoint = false;
        let wasUp2AtAnyPoint = false;
        let currentMargin = 0;

        for (const hr of matchHoleResults.sort((a, b) => a.holeNumber - b.holeNumber)) {
            if (hr.winner === 'teamA') {
                teamAHoles++;
                currentMargin = isTeamA ? currentMargin + 1 : currentMargin - 1;
            } else if (hr.winner === 'teamB') {
                teamBHoles++;
                currentMargin = isTeamA ? currentMargin - 1 : currentMargin + 1;
            } else {
                stats.holesHalved++;
            }

            // Track hole outcomes for player
            const playerWonHole = (hr.winner === 'teamA' && isTeamA) || (hr.winner === 'teamB' && !isTeamA);
            const playerLostHole = (hr.winner === 'teamA' && !isTeamA) || (hr.winner === 'teamB' && isTeamA);

            if (playerWonHole) stats.holesWon++;
            if (playerLostHole) stats.holesLost++;

            // Track comebacks and closings
            if (currentMargin <= -2) wasDown2AtAnyPoint = true;
            if (currentMargin >= 2) wasUp2AtAnyPoint = true;
        }

        const margin = Math.abs(teamAHoles - teamBHoles);
        const winner = teamAHoles > teamBHoles ? 'teamA' : teamBHoles > teamAHoles ? 'teamB' : 'halved';
        const playerWon = (winner === 'teamA' && isTeamA) || (winner === 'teamB' && !isTeamA);
        stats.matchesPlayed++;

        if (winner === 'halved') {
            stats.halves++;
            stats.points += 0.5;
        } else if (playerWon) {
            stats.wins++;
            stats.points += 1;
            stats.biggestWin = Math.max(stats.biggestWin, margin);

            // Check for comeback
            if (wasDown2AtAnyPoint) {
                stats.comebacks++;
            }
        } else {
            stats.losses++;
        }

        // Track closing ability
        if (wasUp2AtAnyPoint) {
            closingSituations++;
            if (playerWon) successfulCloses++;
        }

        // Update format-specific records
        const record = getFormatRecord(stats, session.sessionType);
        if (winner === 'halved') {
            record.h++;
        } else if (playerWon) {
            record.w++;
        } else {
            record.l++;
        }

        // Track partner records (for team formats)
        if (session.sessionType !== 'singles') {
            const teammates = isTeamA ? match.teamAPlayerIds : match.teamBPlayerIds;
            const partnerId = teammates.find(id => id !== playerId);

            if (partnerId) {
                const partnerRecord = partnerRecords.get(partnerId) || { w: 0, l: 0, h: 0 };
                if (winner === 'halved') partnerRecord.h++;
                else if (playerWon) partnerRecord.w++;
                else partnerRecord.l++;
                partnerRecords.set(partnerId, partnerRecord);
            }
        }

        // Track opponent records
        const opponents = isTeamA ? match.teamBPlayerIds : match.teamAPlayerIds;
        for (const oppId of opponents) {
            const oppRecord = opponentRecords.get(oppId) || { w: 0, l: 0, h: 0 };
            if (winner === 'halved') oppRecord.h++;
            else if (playerWon) oppRecord.w++;
            else oppRecord.l++;
            opponentRecords.set(oppId, oppRecord);
        }
    }

    // Calculate percentages
    if (stats.matchesPlayed > 0) {
        stats.winPercentage = (stats.points / stats.matchesPlayed) * 100;
    }

    if (closingSituations > 0) {
        stats.closingRate = (successfulCloses / closingSituations) * 100;
    }

    // Find best partner
    if (partnerRecords.size > 0) {
        const bestPartner = Array.from(partnerRecords.entries())
            .filter(([_, record]) => record.w + record.l + record.h >= 1)
            .sort((a, b) => {
                const aWinPct = a[1].w / (a[1].w + a[1].l + a[1].h);
                const bWinPct = b[1].w / (b[1].w + b[1].l + b[1].h);
                return bWinPct - aWinPct;
            })[0];

        if (bestPartner) {
            stats.bestPartner = {
                playerId: bestPartner[0],
                record: `${bestPartner[1].w}-${bestPartner[1].l}-${bestPartner[1].h}`,
            };
        }
    }

    // Find worst matchup
    if (opponentRecords.size > 0) {
        const worstMatchup = Array.from(opponentRecords.entries())
            .filter(([_, record]) => record.w + record.l + record.h >= 2)
            .sort((a, b) => {
                const aWinPct = a[1].w / (a[1].w + a[1].l + a[1].h);
                const bWinPct = b[1].w / (b[1].w + b[1].l + b[1].h);
                return aWinPct - bWinPct;
            })[0];

        if (worstMatchup) {
            stats.worstMatchup = {
                playerId: worstMatchup[0],
                record: `${worstMatchup[1].w}-${worstMatchup[1].l}-${worstMatchup[1].h}`,
            };
        }
    }

    return stats;
}

function getFormatRecord(
    stats: PlayerStatistics,
    sessionType: 'singles' | 'foursomes' | 'fourball'
): { w: number; l: number; h: number } {
    switch (sessionType) {
        case 'singles':
            return stats.singlesRecord;
        case 'foursomes':
            return stats.foursomesRecord;
        case 'fourball':
            return stats.fourballRecord;
    }
}

// ============================================
// AWARDS CALCULATION
// ============================================

/**
 * Calculate all awards for a trip
 */
export function calculateTripAwards(
    tripId: UUID,
    playerStats: PlayerStatistics[],
    matches: Match[],
    holeResults: HoleResult[],
    players: Player[]
): TripAward[] {
    const awards: TripAward[] = [];
    const now = new Date().toISOString();

    // Filter to only players with matches
    const activePlayers = playerStats.filter(s => s.matchesPlayed > 0);

    // MVP - Most points
    const mvp = [...activePlayers].sort((a, b) => b.points - a.points)[0];
    if (mvp) {
        const player = players.find(p => p.id === mvp.playerId);
        awards.push({
            id: `${tripId}-mvp`,
            tripId,
            type: 'mvp',
            playerId: mvp.playerId,
            playerName: player ? `${player.firstName} ${player.lastName}` : 'Unknown',
            value: `${mvp.points} points`,
            description: 'Most points earned',
            rank: 1,
            calculatedAt: now,
        });
    }

    // Iron Man - Most matches played
    const ironMan = [...activePlayers].sort((a, b) => b.matchesPlayed - a.matchesPlayed)[0];
    if (ironMan && ironMan.matchesPlayed > mvp?.matchesPlayed) {
        const player = players.find(p => p.id === ironMan.playerId);
        awards.push({
            id: `${tripId}-iron_man`,
            tripId,
            type: 'iron_man',
            playerId: ironMan.playerId,
            playerName: player ? `${player.firstName} ${player.lastName}` : 'Unknown',
            value: `${ironMan.matchesPlayed} matches`,
            description: 'Most matches played',
            calculatedAt: now,
        });
    }

    // Best Record - Highest win percentage (min 2 matches)
    const qualified = activePlayers.filter(s => s.matchesPlayed >= 2);
    const bestRecord = [...qualified].sort((a, b) => b.winPercentage - a.winPercentage)[0];
    if (bestRecord) {
        const player = players.find(p => p.id === bestRecord.playerId);
        awards.push({
            id: `${tripId}-consistent`,
            tripId,
            type: 'consistent',
            playerId: bestRecord.playerId,
            playerName: player ? `${player.firstName} ${player.lastName}` : 'Unknown',
            value: `${bestRecord.wins}-${bestRecord.losses}-${bestRecord.halves}`,
            description: `${bestRecord.winPercentage.toFixed(0)}% win rate`,
            calculatedAt: now,
        });
    }

    // Halve Master - Most halved matches
    const halvemaster = [...activePlayers].sort((a, b) => b.halves - a.halves)[0];
    if (halvemaster && halvemaster.halves > 0) {
        const player = players.find(p => p.id === halvemaster.playerId);
        awards.push({
            id: `${tripId}-halve_master`,
            tripId,
            type: 'halve_master',
            playerId: halvemaster.playerId,
            playerName: player ? `${player.firstName} ${player.lastName}` : 'Unknown',
            value: `${halvemaster.halves} halved`,
            description: 'Most halved matches',
            calculatedAt: now,
        });
    }

    // Comeback Kid - Most comebacks
    const comebackKid = [...activePlayers].sort((a, b) => b.comebacks - a.comebacks)[0];
    if (comebackKid && comebackKid.comebacks > 0) {
        const player = players.find(p => p.id === comebackKid.playerId);
        awards.push({
            id: `${tripId}-comeback_kid`,
            tripId,
            type: 'comeback_kid',
            playerId: comebackKid.playerId,
            playerName: player ? `${player.firstName} ${player.lastName}` : 'Unknown',
            value: `${comebackKid.comebacks} comebacks`,
            description: 'Most wins from 2+ down',
            calculatedAt: now,
        });
    }

    // Hot Streak - Best single format performance
    const singlesBest = [...activePlayers]
        .filter(s => s.singlesRecord.w + s.singlesRecord.l + s.singlesRecord.h >= 2)
        .sort((a, b) => {
            const aPct = a.singlesRecord.w / (a.singlesRecord.w + a.singlesRecord.l + a.singlesRecord.h);
            const bPct = b.singlesRecord.w / (b.singlesRecord.w + b.singlesRecord.l + b.singlesRecord.h);
            return bPct - aPct;
        })[0];

    if (singlesBest && singlesBest.singlesRecord.w > 0) {
        const player = players.find(p => p.id === singlesBest.playerId);
        awards.push({
            id: `${tripId}-hot_streak`,
            tripId,
            type: 'hot_streak',
            playerId: singlesBest.playerId,
            playerName: player ? `${player.firstName} ${player.lastName}` : 'Unknown',
            value: `${singlesBest.singlesRecord.w}-${singlesBest.singlesRecord.l}-${singlesBest.singlesRecord.h}`,
            description: 'Best singles record',
            calculatedAt: now,
        });
    }

    // Anchor - Most losses (fun award)
    const anchor = [...activePlayers].sort((a, b) => b.losses - a.losses)[0];
    if (anchor && anchor.losses >= 2) {
        const player = players.find(p => p.id === anchor.playerId);
        awards.push({
            id: `${tripId}-anchor`,
            tripId,
            type: 'anchor',
            playerId: anchor.playerId,
            playerName: player ? `${player.firstName} ${player.lastName}` : 'Unknown',
            value: `${anchor.losses} losses`,
            description: 'Most room for improvement',
            calculatedAt: now,
        });
    }

    return awards;
}

// ============================================
// CAREER & RIVALRY TRACKING
// ============================================

/**
 * Build career stats across multiple trips
 */
export function buildCareerStats(
    playerId: UUID,
    tripStats: { tripId: UUID; year: number; tripName: string; stats: PlayerStatistics }[],
    player: Player
): PlayerCareerStats {
    let totalMatches = 0;
    let totalWins = 0;
    let totalLosses = 0;
    let totalHalves = 0;
    let totalPoints = 0;
    const cupWins = 0;
    const mvpAwards = 0;

    const byYear = tripStats.map(({ tripId, year, stats }) => {
        totalMatches += stats.matchesPlayed;
        totalWins += stats.wins;
        totalLosses += stats.losses;
        totalHalves += stats.halves;
        totalPoints += stats.points;

        return {
            year,
            tripId,
            record: `${stats.wins}-${stats.losses}-${stats.halves}`,
            points: stats.points,
        };
    });

    return {
        playerId,
        playerName: `${player.firstName} ${player.lastName}`,
        tripsPlayed: tripStats.length,
        totalMatches,
        totalWins,
        totalLosses,
        totalHalves,
        totalPoints,
        cupWins,
        mvpAwards,
        byYear,
    };
}

/**
 * Calculate head-to-head rivalry record
 */
export function calculateRivalry(
    player1Id: UUID,
    player2Id: UUID,
    matches: { tripId: UUID; year: number; match: Match }[],
    holeResults: HoleResult[],
    players: Player[]
): RivalryRecord {
    const player1 = players.find(p => p.id === player1Id);
    const player2 = players.find(p => p.id === player2Id);

    let player1Wins = 0;
    let player2Wins = 0;
    let halves = 0;
    let lastMatch = '';

    const matchHistory: RivalryRecord['matchHistory'] = [];

    for (const { tripId, year, match } of matches) {
        // Check if both players were opponents
        const p1TeamA = match.teamAPlayerIds.includes(player1Id);
        const p2TeamA = match.teamAPlayerIds.includes(player2Id);

        if (p1TeamA === p2TeamA) continue; // Same team, not opponents

        const results = holeResults.filter(hr => hr.matchId === match.id);
        const { teamAWins: teamAScore, teamBWins: teamBScore } = countHoleWins(results);

        let result: 'player1' | 'player2' | 'halved';
        let score: string;

        if (teamAScore === teamBScore) {
            result = 'halved';
            halves++;
            score = 'Halved';
        } else if ((teamAScore > teamBScore && p1TeamA) || (teamBScore > teamAScore && !p1TeamA)) {
            result = 'player1';
            player1Wins++;
            const margin = Math.abs(teamAScore - teamBScore);
            score = `${margin} up`;
        } else {
            result = 'player2';
            player2Wins++;
            const margin = Math.abs(teamAScore - teamBScore);
            score = `${margin} up`;
        }

        matchHistory.push({ tripId, year, result, score });
        lastMatch = match.createdAt;
    }

    return {
        player1Id,
        player1Name: player1 ? `${player1.firstName} ${player1.lastName}` : 'Unknown',
        player2Id,
        player2Name: player2 ? `${player2.firstName} ${player2.lastName}` : 'Unknown',
        totalMatches: matchHistory.length,
        player1Wins,
        player2Wins,
        halves,
        lastMatch,
        matchHistory,
    };
}

/**
 * Get all rivalries for a player
 */
export function getPlayerRivalries(
    playerId: UUID,
    allMatches: { tripId: UUID; year: number; match: Match }[],
    holeResults: HoleResult[],
    players: Player[]
): RivalryRecord[] {
    // Find all opponents
    const opponentIds = new Set<UUID>();

    for (const { match } of allMatches) {
        const isTeamA = match.teamAPlayerIds.includes(playerId);
        if (isTeamA || match.teamBPlayerIds.includes(playerId)) {
            const opponents = isTeamA ? match.teamBPlayerIds : match.teamAPlayerIds;
            opponents.forEach(id => opponentIds.add(id));
        }
    }

    // Calculate rivalry with each opponent
    return Array.from(opponentIds)
        .map(oppId => calculateRivalry(playerId, oppId, allMatches, holeResults, players))
        .filter(r => r.totalMatches >= 2)
        .sort((a, b) => b.totalMatches - a.totalMatches);
}

/**
 * Format record string
 */
export function formatRecord(w: number, l: number, h: number): string {
    return `${w}-${l}-${h}`;
}

/**
 * Get award display info
 */
export function getAwardDisplayInfo(type: AwardType): {
    emoji: string;
    title: string;
    color: string;
} {
    const info: Record<AwardType, { emoji: string; title: string; color: string }> = {
        mvp: { emoji: '🏆', title: 'MVP', color: 'gold' },
        iron_man: { emoji: '💪', title: 'Iron Man', color: 'blue' },
        clutch_performer: { emoji: '🎯', title: 'Clutch Performer', color: 'red' },
        hot_streak: { emoji: '🔥', title: 'Hot Streak', color: 'orange' },
        consistent: { emoji: '📈', title: 'Mr. Consistent', color: 'green' },
        comeback_kid: { emoji: '⚡', title: 'Comeback Kid', color: 'purple' },
        halve_master: { emoji: '🤝', title: 'Halve Master', color: 'teal' },
        best_partner: { emoji: '👯', title: 'Best Partner', color: 'pink' },
        giant_killer: { emoji: '🗡️', title: 'Giant Killer', color: 'red' },
        anchor: { emoji: '⚓', title: 'The Anchor', color: 'gray' },
        close_call: { emoji: '😅', title: 'Close Call', color: 'yellow' },
        dormie_escape: { emoji: '🏃', title: 'Dormie Escape', color: 'green' },
    };

    return info[type] || { emoji: '🏅', title: type, color: 'gray' };
}
