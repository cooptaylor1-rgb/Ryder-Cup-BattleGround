/**
 * Team Color Constants
 *
 * BUG-021 FIX: Centralized team color definitions to ensure consistency
 * across the application. Import from here instead of hardcoding colors.
 *
 * Color meanings:
 * - Team A (USA): Navy blue — matches --team-usa in globals.css
 * - Team B (Europe): Burgundy — matches --team-europe in globals.css
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
        primary: '#1E3A5F',    // Navy — matches --team-usa
        light: '#2A4A73',      // Matches --team-usa-gradient-end
        dark: '#152B47',       // Matches --team-usa-deep
        background: '#EBF0F5', // Matches --team-usa-light
    },
    teamB: {
        primary: '#722F37',    // Burgundy — matches --team-europe
        light: '#8B3D47',      // Matches --team-europe-gradient-end
        dark: '#5A252C',       // Matches --team-europe-deep
        background: '#F5ECEE', // Matches --team-europe-light
    },
} as const;

/** Hex defaults for use where CSS variables can't be concatenated (e.g. opacity suffixes) */
export const TEAM_A_HEX = TEAM_COLOR_PALETTE.teamA.primary;
export const TEAM_B_HEX = TEAM_COLOR_PALETTE.teamB.primary;

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
