import type { SessionType } from '../../types/models';
import { FORMAT_CONFIGS, type MatchFormat } from '../../types/matchFormats';
import type {
    ExtendedFormatConfig,
    SessionConfig,
    SessionLineupValidation,
} from './tournamentEngineTypes';

export function getSessionConfig(sessionType: SessionType): SessionConfig {
    switch (sessionType) {
        case 'fourball':
            return {
                playersPerTeam: 2,
                matchCount: 4,
                pointsPerMatch: 1,
                description: 'Best ball - each player plays their own ball',
            };
        case 'foursomes':
            return {
                playersPerTeam: 2,
                matchCount: 4,
                pointsPerMatch: 1,
                description: 'Alternate shot - partners alternate shots',
            };
        case 'singles':
            return {
                playersPerTeam: 1,
                matchCount: 12,
                pointsPerMatch: 1,
                description: 'Head-to-head individual matches',
            };
    }
}

export function getExtendedFormatConfig(format: string, totalPlayers?: number): ExtendedFormatConfig {
    const config = FORMAT_CONFIGS[format as MatchFormat];

    if (!config) {
        if (format === 'fourball' || format === 'foursomes' || format === 'singles') {
            const legacyConfig = getSessionConfig(format as SessionType);
            return {
                ...legacyConfig,
                category: 'matchPlay',
                scoringType: 'matchPlay',
            };
        }

        return {
            playersPerTeam: 2,
            matchCount: 4,
            pointsPerMatch: 1,
            description: 'Custom format',
            category: 'custom',
            scoringType: 'hybrid',
        };
    }

    const playersPerTeam = typeof config.playersPerTeam === 'number'
        ? config.playersPerTeam
        : config.playersPerTeam[0];

    let matchCount = 4;
    if (totalPlayers) {
        if (config.teamsRequired === 2) {
            matchCount = Math.floor((totalPlayers / 2) / playersPerTeam);
        } else {
            matchCount = Math.floor(totalPlayers / playersPerTeam);
        }
    }

    return {
        playersPerTeam,
        matchCount: Math.max(1, Math.min(matchCount, 12)),
        pointsPerMatch: 1,
        description: config.description,
        category: config.category,
        scoringType: config.scoringType,
    };
}

export function calculateFormatHandicap(handicaps: number[], format: string): number {
    const config = FORMAT_CONFIGS[format as MatchFormat];

    if (!config || handicaps.length === 0) {
        return 0;
    }

    switch (config.handicapMethod) {
        case 'none':
            return 0;
        case 'full':
            return Math.round(Math.min(...handicaps));
        case 'low-ball':
            return 0;
        case 'percentage':
            if (handicaps.length === 2) {
                const sorted = [...handicaps].sort((left, right) => left - right);
                return Math.round(sorted[0] * 0.6 + sorted[1] * 0.4);
            }
            return Math.round(handicaps.reduce((sum, handicap) => sum + handicap, 0) * 0.35);
        case 'combined': {
            const total = handicaps.reduce((sum, handicap) => sum + handicap, 0);
            const percentages: Record<number, number> = { 2: 0.35, 3: 0.25, 4: 0.10 };
            return Math.round(total * (percentages[handicaps.length] || 0.25));
        }
        case 'average':
            return Math.round(
                (handicaps.reduce((sum, handicap) => sum + handicap, 0) / handicaps.length) * 0.5
            );
        case 'custom':
        default:
            return Math.round(handicaps.reduce((sum, handicap) => sum + handicap, 0) * 0.25);
    }
}

export function validateSessionLineup(
    sessionType: SessionType,
    teamPlayerIds: string[][],
    teamRosterIds: string[]
): SessionLineupValidation {
    const errors: string[] = [];
    const config = getSessionConfig(sessionType);

    if (teamPlayerIds.length !== config.matchCount) {
        errors.push(`Expected ${config.matchCount} matches, got ${teamPlayerIds.length}`);
    }

    for (let index = 0; index < teamPlayerIds.length; index++) {
        if (teamPlayerIds[index].length !== config.playersPerTeam) {
            errors.push(
                `Match ${index + 1}: Expected ${config.playersPerTeam} players, got ${teamPlayerIds[index].length}`
            );
        }
    }

    const allPlayers = teamPlayerIds.flat();
    const uniquePlayers = new Set(allPlayers);
    if (uniquePlayers.size !== allPlayers.length) {
        errors.push('Same player appears in multiple matches');
    }

    for (const playerId of allPlayers) {
        if (!teamRosterIds.includes(playerId)) {
            errors.push(`Player ${playerId} is not on team roster`);
        }
    }

    return {
        isValid: errors.length === 0,
        errors,
    };
}
