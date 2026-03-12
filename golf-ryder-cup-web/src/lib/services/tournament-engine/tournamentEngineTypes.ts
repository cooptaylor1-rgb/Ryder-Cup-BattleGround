import type { SessionType } from '../../types/models';

export interface SessionStandings {
    teamAPoints: number;
    teamBPoints: number;
    matchesCompleted: number;
    totalMatches: number;
}

export interface PlayerRecord {
    wins: number;
    losses: number;
    halves: number;
    points: number;
}

export interface SessionConfig {
    playersPerTeam: number;
    matchCount: number;
    pointsPerMatch: number;
    description: string;
}

export interface ExtendedFormatConfig extends SessionConfig {
    category: string;
    scoringType: string;
}

export interface SessionLineupValidation {
    isValid: boolean;
    errors: string[];
}

export type LegacySessionType = SessionType;
