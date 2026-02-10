/**
 * Team Color Constants
 *
 * BUG-021 FIX: Centralized team color definitions to ensure consistency
 * across the application. Import from here instead of hardcoding colors.
 *
 * Color meanings:
 * - Team A (USA): Cobalt Blue - represents traditional American blue
 * - Team B (Europe): Dark Red - represents traditional European colors
 */

/**
 * Default team colors used throughout the app
 */
export const TEAM_COLORS = {
    /** Team A (typically USA) */
    teamA: 'var(--team-usa)',
    /** Team B (typically Europe) */
    teamB: 'var(--team-europe)',
    /** Neutral/halved color */
    neutral: 'var(--ink-tertiary)',
} as const;

/**
 * Extended color palette for team theming
 */
export const TEAM_COLOR_PALETTE = {
    teamA: {
        primary: '#0047AB',    // Cobalt Blue
        light: '#1E90FF',      // Dodger Blue
        dark: '#00308F',       // Air Force Blue
        background: '#E6F0FF', // Light blue tint
    },
    teamB: {
        primary: '#8B0000',    // Dark Red
        light: '#DC143C',      // Crimson
        dark: '#5C0000',       // Darker red
        background: '#FFE6E6', // Light red tint
    },
} as const;

/**
 * Get team color by team identifier
 */
export function getTeamColor(team: 'teamA' | 'teamB' | 'usa' | 'europe'): string {
    switch (team) {
        case 'teamA':
        case 'usa':
            return TEAM_COLORS.teamA;
        case 'teamB':
        case 'europe':
            return TEAM_COLORS.teamB;
        default:
            return TEAM_COLORS.neutral;
    }
}

/**
 * Get team color from match result
 */
export function getWinnerColor(winner: 'teamA' | 'teamB' | 'halved' | null): string {
    if (winner === 'teamA') return TEAM_COLORS.teamA;
    if (winner === 'teamB') return TEAM_COLORS.teamB;
    return TEAM_COLORS.neutral;
}

export type TeamColorKey = keyof typeof TEAM_COLORS;
