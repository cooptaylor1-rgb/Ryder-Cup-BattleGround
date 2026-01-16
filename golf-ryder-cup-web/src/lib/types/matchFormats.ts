/**
 * Match Formats - Comprehensive Golf Game Format Definitions
 *
 * A complete library of golf match formats for:
 * - Match Play (head-to-head competition)
 * - Team Formats (scramble, chapman, etc.)
 * - Points Games (stableford, skins, etc.)
 * - Betting Games (nassau, wolf, vegas)
 */

// ============================================
// FORMAT CATEGORIES
// ============================================

export type FormatCategory =
    | 'matchPlay'      // Head-to-head match play
    | 'teamPlay'       // Team-based formats
    | 'pointsGame'     // Point accumulation
    | 'bettingGame'    // Side bets and games
    | 'strokePlay';    // Traditional stroke play

// ============================================
// COMPREHENSIVE FORMAT TYPE
// ============================================

export type MatchFormat =
    // Match Play Formats
    | 'singles'           // 1v1 match play
    | 'fourball'          // Best ball, 2v2 match play
    | 'foursomes'         // Alternate shot, 2v2 match play
    | 'greensomes'        // Both tee off, choose drive, alternate after
    | 'pinehurst'         // Chapman - switch after tee shot, choose ball
    | 'bloodsome'         // Opponents choose which drive you play
    | 'modified-alternate'// Each hits tee & approach, choose for short game

    // Team Scramble Formats
    | 'scramble'          // Generic scramble
    | 'scramble-2'        // 2-person scramble
    | 'scramble-3'        // 3-person scramble
    | 'scramble-4'        // 4-person scramble
    | 'texas-scramble'    // Scramble with min drive requirements
    | 'florida-scramble'  // Player whose shot selected sits out next
    | 'shamble'           // Scramble off tee, individual after

    // Points/Scoring Formats
    | 'stableford'        // Standard stableford points
    | 'modified-stableford'// Aggressive point distribution
    | 'stroke-play'       // Traditional gross/net
    | 'net-stroke-play'   // Net stroke play with handicap
    | 'medal'             // Low gross and net medals
    | 'par-competition'   // Score vs par each hole (+1, 0, -1)
    | 'bogey-golf'        // Alias for par-competition

    // Multi-Player Games
    | 'better-ball-3'     // 3-player best ball
    | 'better-ball-4'     // 4-player best ball
    | 'best-2-of-4'       // Best 2 of 4 scores count
    | 'worst-ball'        // Must hole out with worst score
    | 'aggregate'         // Combined team scores count

    // Betting/Side Games
    | 'skins'             // Hole-by-hole prizes
    | 'nassau'            // Front 9, back 9, overall bets
    | 'wolf'              // Rotating wolf picks partner
    | 'vegas'             // Team scores create number (e.g., 45 vs 54)
    | 'bingo-bango-bongo' // 3 points per hole
    | 'dots'              // Points for various achievements
    | 'rabbit'            // Catch the rabbit game
    | 'snake'             // Avoid the snake (3-putts)

    // Rotating/Hybrid Formats
    | 'six-six-six'       // Format changes every 6 holes
    | 'round-robin'       // Partners rotate through round
    | 'cha-cha-cha'       // Best 1/2/3 balls progression
    | 'irish-fourball'    // Best 2 of 4 on holes 1-6, etc.
    | 'waltz'             // 1-2-3 best balls rotation

    // Custom/Other
    | 'custom';           // User-defined format

// ============================================
// FORMAT CONFIGURATION
// ============================================

export interface FormatConfig {
    id: MatchFormat;
    name: string;
    shortName: string;
    category: FormatCategory;
    description: string;
    rules: string[];
    playersPerTeam: number | [number, number]; // Fixed or range
    teamsRequired: number;                     // 2 for vs format, 0 for individual
    handicapMethod: HandicapMethod;
    scoringType: ScoringType;
    holesPerMatch: 9 | 18;                    // Standard hole count
    allowsPress?: boolean;                    // Can press bets
    requiresCourse?: boolean;                 // Needs course data
    icon: string;                             // Lucide icon name
    color: string;                            // Theme color class
    popularity: number;                       // 1-5 popularity rating
    complexity: 'beginner' | 'intermediate' | 'advanced';
    tags: string[];
}

export type HandicapMethod =
    | 'none'                // No handicap
    | 'full'                // Full handicap
    | 'percentage'          // Percentage of handicap
    | 'low-ball'            // Strokes off low handicapper
    | 'combined'            // Combined team handicap
    | 'average'             // Average team handicap
    | 'custom';             // Custom calculation

export type ScoringType =
    | 'matchPlay'           // Holes won/lost
    | 'strokePlay'          // Total strokes
    | 'points'              // Point accumulation
    | 'money'               // Dollar amounts
    | 'hybrid';             // Multiple scoring methods

// ============================================
// FORMAT CONFIGURATIONS DATABASE
// ============================================

export const FORMAT_CONFIGS: Record<MatchFormat, FormatConfig> = {
    // ========== MATCH PLAY FORMATS ==========
    singles: {
        id: 'singles',
        name: 'Singles Match Play',
        shortName: 'Singles',
        category: 'matchPlay',
        description: 'Classic 1-on-1 head-to-head match play competition.',
        rules: [
            'One player per side',
            'Each hole is won, lost, or halved',
            'Match ends when one player is up by more holes than remain',
            'Standard handicap strokes apply',
        ],
        playersPerTeam: 1,
        teamsRequired: 2,
        handicapMethod: 'low-ball',
        scoringType: 'matchPlay',
        holesPerMatch: 18,
        allowsPress: true,
        icon: 'User',
        color: 'bg-orange-500',
        popularity: 5,
        complexity: 'beginner',
        tags: ['ryder-cup', 'classic', '1v1'],
    },

    fourball: {
        id: 'fourball',
        name: 'Four-Ball (Best Ball)',
        shortName: 'Four-Ball',
        category: 'matchPlay',
        description: 'Each player plays their own ball. Best score on each team counts.',
        rules: [
            'Two players per team',
            'Each player plays their own ball throughout',
            'Better score of the two partners counts for the hole',
            'Individual handicap strokes apply',
        ],
        playersPerTeam: 2,
        teamsRequired: 2,
        handicapMethod: 'full',
        scoringType: 'matchPlay',
        holesPerMatch: 18,
        allowsPress: true,
        icon: 'Users',
        color: 'bg-blue-500',
        popularity: 5,
        complexity: 'beginner',
        tags: ['ryder-cup', 'best-ball', '2v2'],
    },

    foursomes: {
        id: 'foursomes',
        name: 'Foursomes (Alternate Shot)',
        shortName: 'Foursomes',
        category: 'matchPlay',
        description: 'Partners alternate shots playing one ball per team.',
        rules: [
            'Two players per team, one ball per team',
            'Partners alternate shots',
            'Partners alternate tee shots (odd/even holes)',
            'Team handicap is 50% of combined handicaps',
        ],
        playersPerTeam: 2,
        teamsRequired: 2,
        handicapMethod: 'average',
        scoringType: 'matchPlay',
        holesPerMatch: 18,
        allowsPress: true,
        icon: 'Repeat',
        color: 'bg-purple-500',
        popularity: 4,
        complexity: 'intermediate',
        tags: ['ryder-cup', 'alternate-shot', 'team'],
    },

    greensomes: {
        id: 'greensomes',
        name: 'Greensomes',
        shortName: 'Greensomes',
        category: 'matchPlay',
        description: 'Both partners tee off, choose the better drive, then alternate shots.',
        rules: [
            'Both players tee off',
            'Team selects the better drive',
            'Player whose drive was NOT selected hits second shot',
            'Alternate shots from there',
            'Team handicap: 60% low + 40% high',
        ],
        playersPerTeam: 2,
        teamsRequired: 2,
        handicapMethod: 'percentage',
        scoringType: 'matchPlay',
        holesPerMatch: 18,
        allowsPress: true,
        icon: 'GitMerge',
        color: 'bg-teal-500',
        popularity: 3,
        complexity: 'intermediate',
        tags: ['team', 'selective', 'hybrid'],
    },

    pinehurst: {
        id: 'pinehurst',
        name: 'Pinehurst/Chapman',
        shortName: 'Chapman',
        category: 'matchPlay',
        description: 'Both tee off, switch balls for second shot, choose one ball to finish.',
        rules: [
            'Both players tee off',
            'Players switch balls for their second shot',
            'After second shots, team chooses one ball',
            'Alternate shots to complete the hole',
            'Team handicap: 60% low + 40% high',
        ],
        playersPerTeam: 2,
        teamsRequired: 2,
        handicapMethod: 'percentage',
        scoringType: 'matchPlay',
        holesPerMatch: 18,
        allowsPress: true,
        icon: 'Shuffle',
        color: 'bg-indigo-500',
        popularity: 3,
        complexity: 'advanced',
        tags: ['chapman', 'switch', 'strategic'],
    },

    bloodsome: {
        id: 'bloodsome',
        name: 'Bloodsome',
        shortName: 'Bloodsome',
        category: 'matchPlay',
        description: 'Both tee off, but opponents choose which drive you must play.',
        rules: [
            'Both players tee off',
            'Opposing team selects which drive your team must play',
            'Alternate shots from the selected drive',
            'Strategy: opponents usually pick your worst drive',
        ],
        playersPerTeam: 2,
        teamsRequired: 2,
        handicapMethod: 'average',
        scoringType: 'matchPlay',
        holesPerMatch: 18,
        allowsPress: true,
        icon: 'Skull',
        color: 'bg-red-600',
        popularity: 2,
        complexity: 'intermediate',
        tags: ['cutthroat', 'strategy', 'fun'],
    },

    'modified-alternate': {
        id: 'modified-alternate',
        name: 'Modified Alternate Shot',
        shortName: 'Mod Alt Shot',
        category: 'matchPlay',
        description: 'Both hit tee and approach shots, choose best, alternate from there.',
        rules: [
            'Both players hit tee shots, choose best',
            'Both hit approach shots from there, choose best',
            'Alternate shots for the rest of the hole',
            'Keeps both players involved on every shot type',
        ],
        playersPerTeam: 2,
        teamsRequired: 2,
        handicapMethod: 'percentage',
        scoringType: 'matchPlay',
        holesPerMatch: 18,
        allowsPress: true,
        icon: 'GitFork',
        color: 'bg-violet-500',
        popularity: 2,
        complexity: 'intermediate',
        tags: ['modified', 'hybrid', 'inclusive'],
    },

    // ========== SCRAMBLE FORMATS ==========
    'scramble-2': {
        id: 'scramble-2',
        name: '2-Person Scramble',
        shortName: '2-Scramble',
        category: 'teamPlay',
        description: 'Both players hit every shot, team plays from best position.',
        rules: [
            'Both players hit each shot',
            'Team selects best shot',
            'Both players hit next shot from that spot',
            'Continue until ball is holed',
            'Team handicap: 35% of combined handicaps',
        ],
        playersPerTeam: 2,
        teamsRequired: 0,
        handicapMethod: 'combined',
        scoringType: 'strokePlay',
        holesPerMatch: 18,
        requiresCourse: true,
        icon: 'Users',
        color: 'bg-emerald-500',
        popularity: 5,
        complexity: 'beginner',
        tags: ['scramble', 'popular', 'charity'],
    },

    'scramble-3': {
        id: 'scramble-3',
        name: '3-Person Scramble',
        shortName: '3-Scramble',
        category: 'teamPlay',
        description: 'Three players hit every shot, team plays from best position.',
        rules: [
            'All three players hit each shot',
            'Team selects best shot',
            'All hit from that spot',
            'Team handicap: 20% of combined handicaps',
        ],
        playersPerTeam: 3,
        teamsRequired: 0,
        handicapMethod: 'combined',
        scoringType: 'strokePlay',
        holesPerMatch: 18,
        requiresCourse: true,
        icon: 'Users',
        color: 'bg-emerald-600',
        popularity: 4,
        complexity: 'beginner',
        tags: ['scramble', 'trio'],
    },

    'scramble-4': {
        id: 'scramble-4',
        name: '4-Person Scramble',
        shortName: '4-Scramble',
        category: 'teamPlay',
        description: 'Four players hit every shot, team plays from best position.',
        rules: [
            'All four players hit each shot',
            'Team selects best shot',
            'All hit from that spot',
            'Team handicap: 10% of combined handicaps',
            'Lowest scores typical for this format',
        ],
        playersPerTeam: 4,
        teamsRequired: 0,
        handicapMethod: 'combined',
        scoringType: 'strokePlay',
        holesPerMatch: 18,
        requiresCourse: true,
        icon: 'Users',
        color: 'bg-emerald-700',
        popularity: 5,
        complexity: 'beginner',
        tags: ['scramble', 'corporate', 'popular'],
    },

    'texas-scramble': {
        id: 'texas-scramble',
        name: 'Texas Scramble',
        shortName: 'Texas',
        category: 'teamPlay',
        description: 'Scramble with minimum drive requirements per player.',
        rules: [
            'Standard scramble format',
            'Each player must have at least 3 drives used',
            'Encourages team balance',
            'Usually 4 players per team',
        ],
        playersPerTeam: 4,
        teamsRequired: 0,
        handicapMethod: 'combined',
        scoringType: 'strokePlay',
        holesPerMatch: 18,
        requiresCourse: true,
        icon: 'Star',
        color: 'bg-amber-600',
        popularity: 4,
        complexity: 'intermediate',
        tags: ['scramble', 'balanced', 'fair'],
    },

    'florida-scramble': {
        id: 'florida-scramble',
        name: 'Florida Scramble',
        shortName: 'Florida',
        category: 'teamPlay',
        description: 'Player whose shot is selected sits out the next shot.',
        rules: [
            'Standard scramble selection',
            'Player whose shot was chosen sits out the next shot',
            'Prevents one player from carrying the team',
            'Creates strategic shot selection',
        ],
        playersPerTeam: 4,
        teamsRequired: 0,
        handicapMethod: 'combined',
        scoringType: 'strokePlay',
        holesPerMatch: 18,
        requiresCourse: true,
        icon: 'SunMedium',
        color: 'bg-orange-400',
        popularity: 3,
        complexity: 'intermediate',
        tags: ['scramble', 'rotation', 'strategic'],
    },

    shamble: {
        id: 'shamble',
        name: 'Shamble',
        shortName: 'Shamble',
        category: 'teamPlay',
        description: 'Scramble off the tee only, then each player plays their own ball.',
        rules: [
            'All players tee off',
            'Team selects best tee shot',
            'All players play their own ball from that spot',
            'Best score (or best 2) counts for team',
            'Hybrid of scramble and best ball',
        ],
        playersPerTeam: [2, 4],
        teamsRequired: 0,
        handicapMethod: 'full',
        scoringType: 'strokePlay',
        holesPerMatch: 18,
        requiresCourse: true,
        icon: 'Split',
        color: 'bg-lime-500',
        popularity: 4,
        complexity: 'intermediate',
        tags: ['hybrid', 'scramble', 'individual'],
    },

    // ========== POINTS/SCORING FORMATS ==========
    stableford: {
        id: 'stableford',
        name: 'Stableford',
        shortName: 'Stableford',
        category: 'pointsGame',
        description: 'Point-based scoring. Higher is better. Rewards good play without severe penalty.',
        rules: [
            'Double Eagle: 8 points',
            'Eagle: 5 points',
            'Birdie: 4 points',
            'Par: 2 points',
            'Bogey: 1 point',
            'Double bogey or worse: 0 points',
        ],
        playersPerTeam: 1,
        teamsRequired: 0,
        handicapMethod: 'full',
        scoringType: 'points',
        holesPerMatch: 18,
        requiresCourse: true,
        icon: 'Target',
        color: 'bg-sky-500',
        popularity: 4,
        complexity: 'beginner',
        tags: ['points', 'forgiving', 'handicap'],
    },

    'modified-stableford': {
        id: 'modified-stableford',
        name: 'Modified Stableford',
        shortName: 'Mod Stab',
        category: 'pointsGame',
        description: 'Aggressive point system. Rewards eagles, penalizes bogeys.',
        rules: [
            'Double Eagle: 10 points',
            'Eagle: 8 points',
            'Birdie: 3 points',
            'Par: 0 points',
            'Bogey: -1 point',
            'Double bogey: -3 points',
            'Worse: -5 points',
        ],
        playersPerTeam: 1,
        teamsRequired: 0,
        handicapMethod: 'none',
        scoringType: 'points',
        holesPerMatch: 18,
        requiresCourse: true,
        icon: 'Zap',
        color: 'bg-yellow-500',
        popularity: 3,
        complexity: 'intermediate',
        tags: ['points', 'aggressive', 'pros'],
    },

    'stroke-play': {
        id: 'stroke-play',
        name: 'Stroke Play',
        shortName: 'Stroke',
        category: 'strokePlay',
        description: 'Traditional golf scoring. Total strokes over 18 holes.',
        rules: [
            'Count every stroke',
            'Lowest total score wins',
            'Net score = Gross score - Course handicap',
            'Most common format for handicap rounds',
        ],
        playersPerTeam: 1,
        teamsRequired: 0,
        handicapMethod: 'full',
        scoringType: 'strokePlay',
        holesPerMatch: 18,
        requiresCourse: true,
        icon: 'Hash',
        color: 'bg-slate-500',
        popularity: 5,
        complexity: 'beginner',
        tags: ['classic', 'handicap', 'individual'],
    },

    medal: {
        id: 'medal',
        name: 'Medal Play',
        shortName: 'Medal',
        category: 'strokePlay',
        description: 'Competition for lowest gross and net scores with medals awarded.',
        rules: [
            'Full stroke play format',
            'Awards for low gross overall',
            'Awards for low net overall',
            'Often includes flight divisions',
        ],
        playersPerTeam: 1,
        teamsRequired: 0,
        handicapMethod: 'full',
        scoringType: 'strokePlay',
        holesPerMatch: 18,
        requiresCourse: true,
        icon: 'Medal',
        color: 'bg-amber-500',
        popularity: 4,
        complexity: 'beginner',
        tags: ['competition', 'awards', 'classic'],
    },

    'par-competition': {
        id: 'par-competition',
        name: 'Par Competition',
        shortName: 'Par',
        category: 'pointsGame',
        description: 'Score each hole as win (+1), halve (0), or lose (-1) versus par.',
        rules: [
            'Beat par: +1',
            'Match par: 0',
            'Lose to par: -1',
            'Simple scoring keeps pace of play',
            'Net scores used for handicap',
        ],
        playersPerTeam: 1,
        teamsRequired: 0,
        handicapMethod: 'full',
        scoringType: 'points',
        holesPerMatch: 18,
        requiresCourse: true,
        icon: 'Equal',
        color: 'bg-green-600',
        popularity: 2,
        complexity: 'beginner',
        tags: ['simple', 'par', 'quick'],
    },

    // ========== MULTI-PLAYER GAMES ==========
    'better-ball-3': {
        id: 'better-ball-3',
        name: '3-Player Best Ball',
        shortName: '3-Ball',
        category: 'teamPlay',
        description: 'Three players, best net score counts for the team.',
        rules: [
            'Three players play their own balls',
            'Best net score on each hole counts',
            'Great for odd numbers of players',
            'Full handicap strokes apply',
        ],
        playersPerTeam: 3,
        teamsRequired: 0,
        handicapMethod: 'full',
        scoringType: 'strokePlay',
        holesPerMatch: 18,
        requiresCourse: true,
        icon: 'Users',
        color: 'bg-blue-600',
        popularity: 3,
        complexity: 'beginner',
        tags: ['best-ball', 'trio', 'inclusive'],
    },

    'better-ball-4': {
        id: 'better-ball-4',
        name: '4-Player Best Ball',
        shortName: '4-Ball',
        category: 'teamPlay',
        description: 'Four players, best net score counts for the team.',
        rules: [
            'Four players play their own balls',
            'Best net score on each hole counts',
            'Low pressure, high fun format',
            'Full handicap strokes apply',
        ],
        playersPerTeam: 4,
        teamsRequired: 0,
        handicapMethod: 'full',
        scoringType: 'strokePlay',
        holesPerMatch: 18,
        requiresCourse: true,
        icon: 'Users',
        color: 'bg-blue-700',
        popularity: 3,
        complexity: 'beginner',
        tags: ['best-ball', 'quartet', 'casual'],
    },

    'worst-ball': {
        id: 'worst-ball',
        name: 'Worst Ball',
        shortName: 'Worst',
        category: 'teamPlay',
        description: 'Team must play from the worst shot. Tests consistency.',
        rules: [
            'All players hit each shot',
            'Team must play from the WORST shot',
            'Tests team consistency',
            'Very challenging format',
        ],
        playersPerTeam: [2, 4],
        teamsRequired: 0,
        handicapMethod: 'combined',
        scoringType: 'strokePlay',
        holesPerMatch: 18,
        requiresCourse: true,
        icon: 'ThumbsDown',
        color: 'bg-red-500',
        popularity: 2,
        complexity: 'advanced',
        tags: ['challenging', 'consistency', 'team'],
    },

    aggregate: {
        id: 'aggregate',
        name: 'Aggregate',
        shortName: 'Aggregate',
        category: 'teamPlay',
        description: 'All team scores count. Combined total determines winner.',
        rules: [
            'All players play their own ball',
            'All scores are added together',
            'Lower total wins',
            'Can use best 2 of 4, best 3 of 4, etc.',
        ],
        playersPerTeam: [2, 4],
        teamsRequired: 0,
        handicapMethod: 'full',
        scoringType: 'strokePlay',
        holesPerMatch: 18,
        requiresCourse: true,
        icon: 'Plus',
        color: 'bg-slate-600',
        popularity: 3,
        complexity: 'beginner',
        tags: ['combined', 'team', 'total'],
    },

    // ========== BETTING/SIDE GAMES ==========
    skins: {
        id: 'skins',
        name: 'Skins Game',
        shortName: 'Skins',
        category: 'bettingGame',
        description: 'Win the hole outright to win a "skin". Ties carry over.',
        rules: [
            'Each hole has a "skin" value',
            'Must win hole outright (no ties)',
            'Tied holes carry to next hole',
            'Can accumulate large pots',
        ],
        playersPerTeam: 1,
        teamsRequired: 0,
        handicapMethod: 'full',
        scoringType: 'money',
        holesPerMatch: 18,
        icon: 'Coins',
        color: 'bg-yellow-600',
        popularity: 5,
        complexity: 'beginner',
        tags: ['gambling', 'carryover', 'exciting'],
    },

    nassau: {
        id: 'nassau',
        name: 'Nassau',
        shortName: 'Nassau',
        category: 'bettingGame',
        description: 'Three bets in one: front 9, back 9, and overall match.',
        rules: [
            'Front 9 is one bet',
            'Back 9 is one bet',
            'Overall 18 is one bet',
            'Can press when down by 2',
            'Most popular golf bet format',
        ],
        playersPerTeam: [1, 2],
        teamsRequired: 2,
        handicapMethod: 'low-ball',
        scoringType: 'money',
        holesPerMatch: 18,
        allowsPress: true,
        icon: 'DollarSign',
        color: 'bg-green-500',
        popularity: 5,
        complexity: 'intermediate',
        tags: ['betting', 'classic', 'press'],
    },

    wolf: {
        id: 'wolf',
        name: 'Wolf',
        shortName: 'Wolf',
        category: 'bettingGame',
        description: 'Rotating wolf chooses a partner or goes alone against the group.',
        rules: [
            'Players rotate as "Wolf"',
            'Wolf tees off last, watches others',
            'Wolf picks partner OR goes Lone Wolf',
            'Lone Wolf vs field for double points',
            'Points for winning the hole',
        ],
        playersPerTeam: 1,
        teamsRequired: 0,
        handicapMethod: 'full',
        scoringType: 'points',
        holesPerMatch: 18,
        icon: 'Dog',
        color: 'bg-gray-700',
        popularity: 4,
        complexity: 'intermediate',
        tags: ['gambling', 'strategy', 'social'],
    },

    vegas: {
        id: 'vegas',
        name: 'Vegas',
        shortName: 'Vegas',
        category: 'bettingGame',
        description: 'Team scores create a number. Lower number wins the difference.',
        rules: [
            'Two 2-person teams',
            'Combine scores as a number (4,5 = 45)',
            'Lower number wins difference',
            'Birdie flips opponents score (45 → 54)',
            'Can create big swings',
        ],
        playersPerTeam: 2,
        teamsRequired: 2,
        handicapMethod: 'full',
        scoringType: 'money',
        holesPerMatch: 18,
        icon: 'Dices',
        color: 'bg-pink-600',
        popularity: 3,
        complexity: 'intermediate',
        tags: ['gambling', 'wild', 'team'],
    },

    'bingo-bango-bongo': {
        id: 'bingo-bango-bongo',
        name: 'Bingo Bango Bongo',
        shortName: 'BBB',
        category: 'bettingGame',
        description: 'Three points per hole: first on, closest to pin, first in.',
        rules: [
            'Bingo: First player on the green',
            'Bango: Closest to pin (once all on)',
            'Bongo: First to hole out',
            '3 points available per hole',
            'Rewards different skills',
        ],
        playersPerTeam: 1,
        teamsRequired: 0,
        handicapMethod: 'none',
        scoringType: 'points',
        holesPerMatch: 18,
        icon: 'Trophy',
        color: 'bg-amber-400',
        popularity: 4,
        complexity: 'beginner',
        tags: ['points', 'fun', 'varied'],
    },

    dots: {
        id: 'dots',
        name: 'Dots',
        shortName: 'Dots',
        category: 'bettingGame',
        description: 'Points for various achievements throughout the round.',
        rules: [
            'Birdie: +1 dot',
            'Sandy (up/down from bunker): +1 dot',
            'Greenies (closest on par 3): +1 dot',
            'Polies (1-putt for par+): +1 dot',
            'Customize your own achievements',
        ],
        playersPerTeam: 1,
        teamsRequired: 0,
        handicapMethod: 'none',
        scoringType: 'points',
        holesPerMatch: 18,
        icon: 'Circle',
        color: 'bg-cyan-500',
        popularity: 3,
        complexity: 'beginner',
        tags: ['points', 'achievements', 'fun'],
    },

    rabbit: {
        id: 'rabbit',
        name: 'Rabbit',
        shortName: 'Rabbit',
        category: 'bettingGame',
        description: 'Win a hole to catch the rabbit. Hold it on 9 and 18 to win.',
        rules: [
            'First player to win a hole "catches the rabbit"',
            'Another player wins, rabbit moves to them',
            'Hold rabbit on hole 9 = win front pot',
            'Hold rabbit on hole 18 = win back pot',
        ],
        playersPerTeam: 1,
        teamsRequired: 0,
        handicapMethod: 'full',
        scoringType: 'money',
        holesPerMatch: 18,
        icon: 'Rabbit',
        color: 'bg-pink-400',
        popularity: 3,
        complexity: 'intermediate',
        tags: ['gambling', 'chase', 'exciting'],
    },

    snake: {
        id: 'snake',
        name: 'Snake',
        shortName: 'Snake',
        category: 'bettingGame',
        description: 'Avoid the snake! Last person to 3-putt pays.',
        rules: [
            '3-putt = you have the snake',
            'Snake passes on next 3-putt',
            'Person holding snake at end pays',
            'Creates putting pressure',
        ],
        playersPerTeam: 1,
        teamsRequired: 0,
        handicapMethod: 'none',
        scoringType: 'money',
        holesPerMatch: 18,
        icon: 'Angry',
        color: 'bg-green-700',
        popularity: 4,
        complexity: 'beginner',
        tags: ['gambling', 'putting', 'pressure'],
    },

    // ========== ROTATING/HYBRID FORMATS ==========
    'six-six-six': {
        id: 'six-six-six',
        name: 'Six Six Six',
        shortName: '6-6-6',
        category: 'teamPlay',
        description: 'Format changes every 6 holes. Tests all skills.',
        rules: [
            'Holes 1-6: Best Ball',
            'Holes 7-12: Aggregate/Combined',
            'Holes 13-18: Alternate Shot',
            'Tests team across multiple formats',
        ],
        playersPerTeam: 2,
        teamsRequired: 2,
        handicapMethod: 'percentage',
        scoringType: 'hybrid',
        holesPerMatch: 18,
        icon: 'Shuffle',
        color: 'bg-violet-600',
        popularity: 3,
        complexity: 'advanced',
        tags: ['hybrid', 'varied', 'fun'],
    },

    'round-robin': {
        id: 'round-robin',
        name: 'Round Robin',
        shortName: 'Robin',
        category: 'teamPlay',
        description: 'Partners rotate every 6 holes within a foursome.',
        rules: [
            'Four players form two 2-person teams',
            'Partners switch after holes 6 and 12',
            'Everyone partners with everyone',
            'Individual points accumulated',
        ],
        playersPerTeam: 2,
        teamsRequired: 2,
        handicapMethod: 'low-ball',
        scoringType: 'points',
        holesPerMatch: 18,
        icon: 'RefreshCw',
        color: 'bg-orange-600',
        popularity: 3,
        complexity: 'intermediate',
        tags: ['rotation', 'social', 'fair'],
    },

    'cha-cha-cha': {
        id: 'cha-cha-cha',
        name: 'Cha Cha Cha',
        shortName: 'Cha³',
        category: 'teamPlay',
        description: 'Progressive best ball: 1 best on 1-6, 2 best on 7-12, all 3 on 13-18.',
        rules: [
            'Holes 1-6: Best 1 of 3 scores',
            'Holes 7-12: Best 2 of 3 scores',
            'Holes 13-18: All 3 scores count',
            'Increasing difficulty through round',
        ],
        playersPerTeam: 3,
        teamsRequired: 0,
        handicapMethod: 'full',
        scoringType: 'strokePlay',
        holesPerMatch: 18,
        requiresCourse: true,
        icon: 'TrendingUp',
        color: 'bg-rose-500',
        popularity: 2,
        complexity: 'intermediate',
        tags: ['progressive', 'trio', 'challenge'],
    },

    'irish-fourball': {
        id: 'irish-fourball',
        name: 'Irish Four-Ball',
        shortName: 'Irish',
        category: 'teamPlay',
        description: 'Best 2 scores count on 1-6, best 3 on 7-12, all 4 on 13-18.',
        rules: [
            'Holes 1-6: Best 2 of 4 net scores',
            'Holes 7-12: Best 3 of 4 net scores',
            'Holes 13-18: All 4 net scores',
            'Progressive pressure format',
        ],
        playersPerTeam: 4,
        teamsRequired: 0,
        handicapMethod: 'full',
        scoringType: 'strokePlay',
        holesPerMatch: 18,
        requiresCourse: true,
        icon: 'Layers',
        color: 'bg-green-700',
        popularity: 2,
        complexity: 'intermediate',
        tags: ['progressive', 'team', 'quartet'],
    },

    waltz: {
        id: 'waltz',
        name: 'Waltz',
        shortName: 'Waltz',
        category: 'teamPlay',
        description: 'Repeating 1-2-3 pattern: best 1, best 2, all 3, repeat.',
        rules: [
            'Holes 1, 4, 7, 10, 13, 16: Best 1 score',
            'Holes 2, 5, 8, 11, 14, 17: Best 2 scores',
            'Holes 3, 6, 9, 12, 15, 18: All 3 scores',
            'Like a dance: 1-2-3, 1-2-3',
        ],
        playersPerTeam: 3,
        teamsRequired: 0,
        handicapMethod: 'full',
        scoringType: 'strokePlay',
        holesPerMatch: 18,
        requiresCourse: true,
        icon: 'Music',
        color: 'bg-fuchsia-500',
        popularity: 2,
        complexity: 'intermediate',
        tags: ['pattern', 'trio', 'creative'],
    },

    // ========== ADDITIONAL FORMATS ==========
    scramble: {
        id: 'scramble',
        name: 'Scramble',
        shortName: 'Scramble',
        category: 'teamPlay',
        description: 'All players hit, choose best shot, everyone plays from there.',
        rules: [
            'All players tee off',
            'Team selects best shot',
            'All players hit from that spot',
            'Repeat until ball is holed',
            'Low pressure, fun format',
        ],
        playersPerTeam: [2, 4],
        teamsRequired: 0,
        handicapMethod: 'combined',
        scoringType: 'strokePlay',
        holesPerMatch: 18,
        requiresCourse: true,
        icon: 'Users',
        color: 'bg-emerald-500',
        popularity: 5,
        complexity: 'beginner',
        tags: ['scramble', 'team', 'popular'],
    },

    'net-stroke-play': {
        id: 'net-stroke-play',
        name: 'Net Stroke Play',
        shortName: 'Net Stroke',
        category: 'strokePlay',
        description: 'Stroke play with full handicap applied. Lowest net score wins.',
        rules: [
            'Count every stroke',
            'Apply full course handicap',
            'Net score = Gross - Handicap strokes',
            'Lowest net score wins',
        ],
        playersPerTeam: 1,
        teamsRequired: 0,
        handicapMethod: 'full',
        scoringType: 'strokePlay',
        holesPerMatch: 18,
        requiresCourse: true,
        icon: 'TrendingDown',
        color: 'bg-blue-500',
        popularity: 5,
        complexity: 'beginner',
        tags: ['handicap', 'net', 'fair'],
    },

    'bogey-golf': {
        id: 'bogey-golf',
        name: 'Bogey Golf (Par Competition)',
        shortName: 'Bogey',
        category: 'pointsGame',
        description: 'Play against par on each hole. Beat it (+1), match it (0), lose (-1).',
        rules: [
            'Beat par (net): +1 point',
            'Match par (net): 0 points',
            'Lose to par (net): -1 point',
            'Highest total points wins',
            'Quick and simple scoring',
        ],
        playersPerTeam: 1,
        teamsRequired: 0,
        handicapMethod: 'full',
        scoringType: 'points',
        holesPerMatch: 18,
        requiresCourse: true,
        icon: 'Target',
        color: 'bg-green-600',
        popularity: 3,
        complexity: 'beginner',
        tags: ['par', 'simple', 'quick'],
    },

    'best-2-of-4': {
        id: 'best-2-of-4',
        name: 'Best 2 of 4',
        shortName: 'Best 2/4',
        category: 'teamPlay',
        description: 'Four players, best 2 net scores count on each hole.',
        rules: [
            'Four players play their own ball',
            'Best 2 net scores count for team',
            'Discards worst 2 scores each hole',
            'Full handicap strokes apply',
            'Great for mixed skill levels',
        ],
        playersPerTeam: 4,
        teamsRequired: 0,
        handicapMethod: 'full',
        scoringType: 'strokePlay',
        holesPerMatch: 18,
        requiresCourse: true,
        icon: 'Users',
        color: 'bg-blue-600',
        popularity: 4,
        complexity: 'beginner',
        tags: ['team', 'forgiving', 'quartet'],
    },

    // ========== CUSTOM ==========
    custom: {
        id: 'custom',
        name: 'Custom Format',
        shortName: 'Custom',
        category: 'matchPlay',
        description: 'Create your own custom format with your own rules.',
        rules: [
            'Define your own rules',
            'Set custom handicap method',
            'Choose scoring type',
            'Maximum flexibility',
        ],
        playersPerTeam: [1, 4],
        teamsRequired: 0,
        handicapMethod: 'custom',
        scoringType: 'hybrid',
        holesPerMatch: 18,
        icon: 'Settings',
        color: 'bg-gray-500',
        popularity: 3,
        complexity: 'advanced',
        tags: ['custom', 'flexible', 'creative'],
    },
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get all formats in a category
 */
export function getFormatsByCategory(category: FormatCategory): FormatConfig[] {
    return Object.values(FORMAT_CONFIGS).filter(f => f.category === category);
}

/**
 * Get formats sorted by popularity
 */
export function getPopularFormats(limit?: number): FormatConfig[] {
    const sorted = Object.values(FORMAT_CONFIGS).sort((a, b) => b.popularity - a.popularity);
    return limit ? sorted.slice(0, limit) : sorted;
}

/**
 * Get formats by complexity level
 */
export function getFormatsByComplexity(complexity: FormatConfig['complexity']): FormatConfig[] {
    return Object.values(FORMAT_CONFIGS).filter(f => f.complexity === complexity);
}

/**
 * Search formats by tag
 */
export function getFormatsByTag(tag: string): FormatConfig[] {
    return Object.values(FORMAT_CONFIGS).filter(f =>
        f.tags.some(t => t.toLowerCase().includes(tag.toLowerCase()))
    );
}

/**
 * Get format config by ID
 */
export function getFormatConfig(format: MatchFormat): FormatConfig {
    return FORMAT_CONFIGS[format];
}

/**
 * Check if format supports pressing
 */
export function formatSupportsPress(format: MatchFormat): boolean {
    return FORMAT_CONFIGS[format].allowsPress === true;
}

/**
 * Get display name for a format
 */
export function getFormatDisplayName(format: MatchFormat): string {
    return FORMAT_CONFIGS[format].name;
}

/**
 * Get all categories with their formats
 */
export function getAllCategoriesWithFormats(): Array<{
    category: FormatCategory;
    name: string;
    formats: FormatConfig[];
}> {
    const categoryNames: Record<FormatCategory, string> = {
        matchPlay: 'Match Play',
        teamPlay: 'Team Formats',
        pointsGame: 'Points Games',
        bettingGame: 'Betting Games',
        strokePlay: 'Stroke Play',
    };

    return (Object.keys(categoryNames) as FormatCategory[]).map(category => ({
        category,
        name: categoryNames[category],
        formats: getFormatsByCategory(category),
    }));
}

// ============================================
// HANDICAP CALCULATION HELPERS
// ============================================

/**
 * Calculate team handicap based on format method
 */
export function calculateTeamHandicapForFormat(
    handicaps: number[],
    method: HandicapMethod,
    customPercentage?: number
): number {
    if (handicaps.length === 0) return 0;

    switch (method) {
        case 'none':
            return 0;

        case 'full':
            return Math.min(...handicaps); // Low ball gets strokes

        case 'low-ball':
            // Strokes are difference from lowest
            return 0; // Calculated per player

        case 'percentage':
            // Default: 60% low + 40% high for 2 players
            if (handicaps.length === 2) {
                const sorted = [...handicaps].sort((a, b) => a - b);
                return Math.round(sorted[0] * 0.6 + sorted[1] * 0.4);
            }
            // For more players, use custom percentage of combined
            const combined = handicaps.reduce((a, b) => a + b, 0);
            return Math.round(combined * (customPercentage || 0.35));

        case 'combined':
            // Scramble-style: percentage of combined
            const total = handicaps.reduce((a, b) => a + b, 0);
            const percentages: Record<number, number> = {
                2: 0.35,
                3: 0.25,
                4: 0.10,
            };
            return Math.round(total * (percentages[handicaps.length] || 0.25));

        case 'average':
            // Average for alternate shot
            const avg = handicaps.reduce((a, b) => a + b, 0) / handicaps.length;
            return Math.round(avg * 0.5);

        case 'custom':
            return customPercentage
                ? Math.round(handicaps.reduce((a, b) => a + b, 0) * customPercentage)
                : 0;

        default:
            return 0;
    }
}

// ============================================
// FORMAT COMPATIBILITY CHECKS
// ============================================

/**
 * Check if a format is compatible with a given number of players
 */
export function isFormatCompatible(format: MatchFormat, playerCount: number): boolean {
    const config = FORMAT_CONFIGS[format];
    const playersPerTeam = config.playersPerTeam;

    if (typeof playersPerTeam === 'number') {
        return playerCount >= playersPerTeam * (config.teamsRequired || 1);
    }

    const [min, max] = playersPerTeam;
    return playerCount >= min * (config.teamsRequired || 1) &&
        playerCount <= max * (config.teamsRequired || 1);
}

/**
 * Get recommended formats for a given player count
 */
export function getRecommendedFormats(playerCount: number): FormatConfig[] {
    return Object.values(FORMAT_CONFIGS)
        .filter(f => isFormatCompatible(f.id, playerCount))
        .sort((a, b) => b.popularity - a.popularity);
}
