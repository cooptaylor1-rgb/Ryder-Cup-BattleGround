/**
 * Pre-Flight Validation Service
 *
 * Validates trip setup completeness before the first tee time.
 * Catches configuration issues like missing handicaps, incomplete courses,
 * unbalanced teams, and missing lineups.
 */

import type {
    PreFlightCheckResult,
    PreFlightChecklistConfig,
    ValidationItem,
    ValidationCategory,
    ValidationSeverity,
} from '@/lib/types/captain';
import type {
    Trip,
    Player,
    Team,
    TeamMember,
    RyderCupSession,
    Match,
    Course,
    TeeSet,
} from '@/lib/types/models';

// Re-export types for convenience
export type {
    PreFlightCheckResult,
    PreFlightChecklistConfig,
    ValidationItem,
    ValidationCategory,
    ValidationSeverity,
} from '@/lib/types/captain';

// Default configuration
const DEFAULT_CONFIG: PreFlightChecklistConfig = {
    requireBalancedTeams: true,
    requireAllHandicaps: true,
    requireCourseHandicaps: true,
    requireAllLineups: true,
    minimumPlayersPerTeam: 4,
};

/**
 * Create a validation item
 */
function createValidation(
    category: ValidationCategory,
    severity: ValidationSeverity,
    title: string,
    description: string,
    options?: {
        actionLabel?: string;
        actionHref?: string;
        autoFixable?: boolean;
    }
): ValidationItem {
    return {
        id: `${category}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        category,
        severity,
        title,
        description,
        ...options,
    };
}

/**
 * Validate player configuration
 */
function validatePlayers(
    players: Player[],
    teamMembers: TeamMember[],
    config: PreFlightChecklistConfig
): ValidationItem[] {
    const items: ValidationItem[] = [];

    // Check minimum players
    if (players.length < config.minimumPlayersPerTeam * 2) {
        items.push(createValidation(
            'players',
            'error',
            'Not enough players',
            `You need at least ${config.minimumPlayersPerTeam * 2} players (${config.minimumPlayersPerTeam} per team). Currently have ${players.length}.`,
            { actionLabel: 'Add Players', actionHref: '/players' }
        ));
    }

    // Check for players not on teams
    const assignedPlayerIds = new Set(teamMembers.map(tm => tm.playerId));
    const unassignedPlayers = players.filter(p => !assignedPlayerIds.has(p.id));

    if (unassignedPlayers.length > 0) {
        items.push(createValidation(
            'players',
            'warning',
            `${unassignedPlayers.length} player(s) not assigned to teams`,
            `Players without teams: ${unassignedPlayers.map(p => `${p.firstName} ${p.lastName}`).join(', ')}`,
            { actionLabel: 'Assign Teams', actionHref: '/players' }
        ));
    }

    // Check for missing handicaps
    if (config.requireAllHandicaps) {
        const missingHandicaps = players.filter(p => p.handicapIndex === undefined || p.handicapIndex === null);
        if (missingHandicaps.length > 0) {
            items.push(createValidation(
                'handicaps',
                'error',
                `${missingHandicaps.length} player(s) missing handicap index`,
                `Players need handicaps: ${missingHandicaps.map(p => `${p.firstName} ${p.lastName}`).join(', ')}`,
                { actionLabel: 'Edit Players', actionHref: '/players', autoFixable: false }
            ));
        }
    }

    // Check for duplicate names (warning)
    const names = players.map(p => `${p.firstName} ${p.lastName}`.toLowerCase());
    const duplicates = names.filter((name, index) => names.indexOf(name) !== index);
    if (duplicates.length > 0) {
        items.push(createValidation(
            'players',
            'warning',
            'Duplicate player names detected',
            `Consider adding nicknames to distinguish: ${[...new Set(duplicates)].join(', ')}`,
        ));
    }

    return items;
}

/**
 * Validate team configuration
 */
function validateTeams(
    teams: Team[],
    teamMembers: TeamMember[],
    config: PreFlightChecklistConfig
): ValidationItem[] {
    const items: ValidationItem[] = [];

    // Check that we have exactly 2 teams
    if (teams.length !== 2) {
        items.push(createValidation(
            'teams',
            'error',
            'Invalid team count',
            `Ryder Cup format requires exactly 2 teams. You have ${teams.length}.`,
            { actionLabel: 'Setup Teams', actionHref: '/players' }
        ));
        return items;
    }

    // Count members per team
    const teamACounts = teamMembers.filter(tm => tm.teamId === teams[0]?.id).length;
    const teamBCounts = teamMembers.filter(tm => tm.teamId === teams[1]?.id).length;

    // Check minimum per team
    if (teamACounts < config.minimumPlayersPerTeam) {
        items.push(createValidation(
            'teams',
            'error',
            `${teams[0]?.name || 'Team A'} needs more players`,
            `Minimum ${config.minimumPlayersPerTeam} required, currently has ${teamACounts}.`,
            { actionLabel: 'Add to Team', actionHref: '/players' }
        ));
    }

    if (teamBCounts < config.minimumPlayersPerTeam) {
        items.push(createValidation(
            'teams',
            'error',
            `${teams[1]?.name || 'Team B'} needs more players`,
            `Minimum ${config.minimumPlayersPerTeam} required, currently has ${teamBCounts}.`,
            { actionLabel: 'Add to Team', actionHref: '/players' }
        ));
    }

    // Check team balance
    if (config.requireBalancedTeams && Math.abs(teamACounts - teamBCounts) > 1) {
        items.push(createValidation(
            'teams',
            'warning',
            'Teams are unbalanced',
            `${teams[0]?.name || 'Team A'} has ${teamACounts} players, ${teams[1]?.name || 'Team B'} has ${teamBCounts}. Consider rebalancing.`,
            { actionLabel: 'Balance Teams', actionHref: '/players' }
        ));
    }

    return items;
}

/**
 * Validate session configuration
 */
function validateSessions(
    sessions: RyderCupSession[],
    matches: Match[],
    _config: PreFlightChecklistConfig
): ValidationItem[] {
    const items: ValidationItem[] = [];

    // Check that we have sessions
    if (sessions.length === 0) {
        items.push(createValidation(
            'sessions',
            'error',
            'No sessions created',
            'Create at least one session to start the tournament.',
            { actionLabel: 'Create Session', actionHref: '/matchups' }
        ));
        return items;
    }

    // Check each session
    sessions.forEach(session => {
        const sessionMatches = matches.filter(m => m.sessionId === session.id);

        // Check for matches
        if (sessionMatches.length === 0) {
            items.push(createValidation(
                'sessions',
                'warning',
                `${session.name} has no matches`,
                'This session needs matches to be created.',
                { actionLabel: 'Add Matches', actionHref: `/matchups?session=${session.id}` }
            ));
        }

        // Check scheduled date
        if (!session.scheduledDate) {
            items.push(createValidation(
                'schedule',
                'warning',
                `${session.name} has no date`,
                'Set a scheduled date for this session.',
                { actionLabel: 'Set Date', actionHref: `/matchups?session=${session.id}` }
            ));
        }
    });

    return items;
}

/**
 * Validate lineups
 */
function validateLineups(
    sessions: RyderCupSession[],
    matches: Match[],
    config: PreFlightChecklistConfig
): ValidationItem[] {
    const items: ValidationItem[] = [];

    if (!config.requireAllLineups) return items;

    sessions.forEach(session => {
        const sessionMatches = matches.filter(m => m.sessionId === session.id);
        const incompleteMatches = sessionMatches.filter(m =>
            m.teamAPlayerIds.length === 0 || m.teamBPlayerIds.length === 0
        );

        if (incompleteMatches.length > 0) {
            items.push(createValidation(
                'lineups',
                'error',
                `${session.name} has incomplete lineups`,
                `${incompleteMatches.length} of ${sessionMatches.length} matches need player assignments.`,
                { actionLabel: 'Set Lineup', actionHref: `/matchups?session=${session.id}` }
            ));
        }
    });

    // Check for duplicate players in same session
    sessions.forEach(session => {
        const sessionMatches = matches.filter(m => m.sessionId === session.id);
        const allPlayerIds: string[] = [];

        sessionMatches.forEach(m => {
            allPlayerIds.push(...m.teamAPlayerIds, ...m.teamBPlayerIds);
        });

        const duplicates = allPlayerIds.filter((id, index) => allPlayerIds.indexOf(id) !== index);
        if (duplicates.length > 0) {
            items.push(createValidation(
                'lineups',
                'error',
                `Duplicate players in ${session.name}`,
                'A player cannot be in multiple matches within the same session.',
                { actionLabel: 'Fix Lineup', actionHref: `/matchups?session=${session.id}` }
            ));
        }
    });

    return items;
}

/**
 * Validate course configuration
 */
function validateCourses(
    courses: Course[],
    teeSets: TeeSet[],
    sessions: RyderCupSession[],
    matches: Match[],
    config: PreFlightChecklistConfig
): ValidationItem[] {
    const items: ValidationItem[] = [];

    // Check if any sessions use courses
    const matchesWithCourses = matches.filter(m => m.courseId);
    if (matchesWithCourses.length === 0 && sessions.length > 0) {
        items.push(createValidation(
            'courses',
            'warning',
            'No courses assigned to matches',
            'Assign courses to enable handicap calculations.',
            { actionLabel: 'Add Course', actionHref: '/courses' }
        ));
    }

    // Validate tee set completeness
    teeSets.forEach(teeSet => {
        const course = courses.find(c => c.id === teeSet.courseId);
        const courseName = course?.name || 'Unknown Course';

        // Check hole handicaps
        if (!teeSet.holeHandicaps || teeSet.holeHandicaps.length !== 18) {
            items.push(createValidation(
                'courses',
                'error',
                `${courseName} (${teeSet.name}) missing hole handicaps`,
                'All 18 hole handicaps are required for proper stroke allocation.',
                { actionLabel: 'Edit Course', actionHref: '/courses' }
            ));
        } else if (config.requireCourseHandicaps) {
            // Validate handicap values (should be 1-18, each appearing once)
            const sorted = [...teeSet.holeHandicaps].sort((a, b) => a - b);
            const expected = Array.from({ length: 18 }, (_, i) => i + 1);
            const isValid = JSON.stringify(sorted) === JSON.stringify(expected);

            if (!isValid) {
                items.push(createValidation(
                    'courses',
                    'warning',
                    `${courseName} (${teeSet.name}) has invalid hole handicaps`,
                    'Hole handicaps should be unique values from 1-18.',
                    { actionLabel: 'Fix Handicaps', actionHref: '/courses' }
                ));
            }
        }

        // Check hole pars
        if (!teeSet.holePars || teeSet.holePars.length !== 18) {
            items.push(createValidation(
                'courses',
                'error',
                `${courseName} (${teeSet.name}) missing hole pars`,
                'All 18 hole pars are required.',
                { actionLabel: 'Edit Course', actionHref: '/courses' }
            ));
        }

        // Check rating/slope
        if (!teeSet.rating || !teeSet.slope) {
            items.push(createValidation(
                'courses',
                'warning',
                `${courseName} (${teeSet.name}) missing rating/slope`,
                'Course rating and slope are needed for accurate handicap calculations.',
                { actionLabel: 'Edit Course', actionHref: '/courses' }
            ));
        }
    });

    return items;
}

/**
 * Calculate completion percentage
 */
function calculateCompletion(items: ValidationItem[]): number {
    const errors = items.filter(i => i.severity === 'error').length;
    const warnings = items.filter(i => i.severity === 'warning').length;

    if (errors === 0 && warnings === 0) return 100;

    // Weight errors more heavily
    const totalWeight = errors * 2 + warnings;
    const maxWeight = 10; // Reasonable max issues

    return Math.max(0, Math.round((1 - totalWeight / maxWeight) * 100));
}

/**
 * Run pre-flight validation check
 */
export function runPreFlightCheck(
    trip: Trip,
    players: Player[],
    teams: Team[],
    teamMembers: TeamMember[],
    sessions: RyderCupSession[],
    matches: Match[],
    courses: Course[],
    teeSets: TeeSet[],
    config: Partial<PreFlightChecklistConfig> = {}
): PreFlightCheckResult {
    const finalConfig = { ...DEFAULT_CONFIG, ...config };
    const allItems: ValidationItem[] = [];

    // Run all validations
    allItems.push(...validatePlayers(players, teamMembers, finalConfig));
    allItems.push(...validateTeams(teams, teamMembers, finalConfig));
    allItems.push(...validateSessions(sessions, matches, finalConfig));
    allItems.push(...validateLineups(sessions, matches, finalConfig));
    allItems.push(...validateCourses(courses, teeSets, sessions, matches, finalConfig));

    // Categorize results
    const errors = allItems.filter(i => i.severity === 'error');
    const warnings = allItems.filter(i => i.severity === 'warning');
    const info = allItems.filter(i => i.severity === 'info');

    return {
        isReady: errors.length === 0,
        completionPercentage: calculateCompletion(allItems),
        errors,
        warnings,
        info,
        checkedAt: new Date().toISOString(),
    };
}

/**
 * Get quick status summary for dashboard
 */
export function getPreFlightSummary(result: PreFlightCheckResult): {
    status: 'ready' | 'warnings' | 'blocked';
    message: string;
    icon: string;
} {
    if (result.isReady && result.warnings.length === 0) {
        return {
            status: 'ready',
            message: 'Ready to play!',
            icon: '✅',
        };
    }

    if (result.isReady) {
        return {
            status: 'warnings',
            message: `${result.warnings.length} item(s) to review`,
            icon: '⚠️',
        };
    }

    return {
        status: 'blocked',
        message: `${result.errors.length} issue(s) must be resolved`,
        icon: '🚫',
    };
}

/**
 * Group validation items by category
 */
export function groupValidationsByCategory(
    items: ValidationItem[]
): Record<ValidationCategory, ValidationItem[]> {
    const grouped: Record<ValidationCategory, ValidationItem[]> = {
        players: [],
        teams: [],
        sessions: [],
        lineups: [],
        courses: [],
        schedule: [],
        handicaps: [],
    };

    items.forEach(item => {
        grouped[item.category].push(item);
    });

    return grouped;
}
