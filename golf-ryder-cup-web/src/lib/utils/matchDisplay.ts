/**
 * Match Display Utilities
 *
 * Shared visual/display logic used by both YourMatchCard (hero on home)
 * and MatchCard (list view in sessions/live). Centralising here means
 * design changes to score colors or status badges update everywhere
 * without maintaining parallel implementations.
 */

/**
 * Returns the CSS class for the score text color based on which team is
 * leading (or all-square). A positive `currentScore` means Team A leads.
 */
export function getScoreColorClass(currentScore: number): string {
    if (currentScore > 0) return 'text-team-usa';
    if (currentScore < 0) return 'text-team-europe';
    return 'text-[var(--ink-tertiary)]';
}

/**
 * For the hero (YourMatchCard) variant: returns the score color relative
 * to the viewing user rather than the absolute team. "Green if you're
 * winning, red if you're losing."
 */
export function getUserRelativeScoreClass(
    currentScore: number,
    userTeam: 'A' | 'B' | undefined,
): string {
    if (currentScore === 0 || !userTeam) return 'text-[var(--ink-secondary)]';

    const isTeamALeading = currentScore > 0;
    const userLeading =
        (isTeamALeading && userTeam === 'A') || (!isTeamALeading && userTeam === 'B');

    return userLeading ? 'text-[var(--team-usa)]' : 'text-[var(--team-europe)]';
}

export type MatchStatusDisplay = {
    label: string;
    tone: 'success' | 'warning' | 'info' | 'default';
};

/**
 * Derive a compact status label + colour tone from match-state scalars.
 * Both card variants can render this however they like (badge, chip, text).
 */
export function getMatchStatusDisplay(
    status: string,
    holesPlayed: number,
    isDormie: boolean,
): MatchStatusDisplay {
    if (status === 'completed') return { label: 'Complete', tone: 'success' };
    if (isDormie) return { label: 'Dormie', tone: 'warning' };
    if (holesPlayed > 0) return { label: `Hole ${holesPlayed}`, tone: 'info' };
    return { label: 'Not Started', tone: 'default' };
}
