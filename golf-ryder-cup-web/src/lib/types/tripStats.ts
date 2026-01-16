/**
 * Trip Stats Types
 *
 * Fun, social tracking beyond golf scores.
 * Track beverages, mishaps, cart chaos, and more!
 */

import type { UUID, ISODateString } from './models';

// ============================================
// STAT CATEGORIES
// ============================================

export type TripStatCategory =
    | 'beverages'
    | 'golf_mishaps'
    | 'golf_highlights'
    | 'cart_chaos'
    | 'social'
    | 'money'
    | 'awards';

// ============================================
// STAT DEFINITIONS
// ============================================

export type BeverageStatType =
    | 'beers'
    | 'cocktails'
    | 'shots'
    | 'waters'
    | 'cart_girl_visits'
    | 'cigars'
    | 'snacks';

export type GolfMishapStatType =
    | 'balls_lost'
    | 'sand_traps'
    | 'water_hazards'
    | 'mulligans'
    | 'club_throws'
    | 'whiffs'
    | 'shanks'
    | 'four_putts';

export type GolfHighlightStatType =
    | 'birdies'
    | 'eagles'
    | 'chip_ins'
    | 'longest_putt'
    | 'longest_drive'
    | 'closest_to_pin'
    | 'greens_in_regulation'
    | 'fairways_hit';

export type CartChaosStatType =
    | 'cart_path_violations'
    | 'near_misses'
    | 'stuck_in_mud'
    | 'wrong_fairway'
    | 'cart_distance';

export type SocialStatType =
    | 'late_to_tee'
    | 'phone_checks'
    | 'naps_taken'
    | 'wildlife_encounters'
    | 'bathroom_breaks'
    | 'excuses_made'
    | 'rules_argued';

export type MoneyStatType =
    | 'side_bet_winnings'
    | 'side_bet_losses'
    | 'pro_shop_spending'
    | 'tips_given'
    | 'drinks_bought_for_others';

export type TripStatType =
    | BeverageStatType
    | GolfMishapStatType
    | GolfHighlightStatType
    | CartChaosStatType
    | SocialStatType
    | MoneyStatType;

// ============================================
// STAT METADATA
// ============================================

export interface StatDefinition {
    type: TripStatType;
    category: TripStatCategory;
    label: string;
    emoji: string;
    description: string;
    unit: 'count' | 'feet' | 'yards' | 'dollars' | 'minutes' | 'miles';
    isNegative?: boolean; // For "bad" stats (like balls lost)
}

export const STAT_DEFINITIONS: Record<TripStatType, StatDefinition> = {
    // Beverages
    beers: { type: 'beers', category: 'beverages', label: 'Beers', emoji: '🍺', description: 'Cold ones consumed', unit: 'count' },
    cocktails: { type: 'cocktails', category: 'beverages', label: 'Cocktails', emoji: '🍹', description: 'Mixed drinks enjoyed', unit: 'count' },
    shots: { type: 'shots', category: 'beverages', label: 'Shots', emoji: '🥃', description: 'Shots taken', unit: 'count' },
    waters: { type: 'waters', category: 'beverages', label: 'Waters', emoji: '💧', description: 'Staying hydrated', unit: 'count' },
    cart_girl_visits: { type: 'cart_girl_visits', category: 'beverages', label: 'Cart Girl Visits', emoji: '🛒', description: 'Beverage cart flagged down', unit: 'count' },
    cigars: { type: 'cigars', category: 'beverages', label: 'Cigars', emoji: '🚬', description: 'Stogies smoked', unit: 'count' },
    snacks: { type: 'snacks', category: 'beverages', label: 'Snacks', emoji: '🌭', description: 'Hot dogs, candy, etc.', unit: 'count' },

    // Golf Mishaps
    balls_lost: { type: 'balls_lost', category: 'golf_mishaps', label: 'Balls Lost', emoji: '⚪', description: 'Gone forever', unit: 'count', isNegative: true },
    sand_traps: { type: 'sand_traps', category: 'golf_mishaps', label: 'Sand Traps', emoji: '🏖️', description: 'Beach time', unit: 'count', isNegative: true },
    water_hazards: { type: 'water_hazards', category: 'golf_mishaps', label: 'Water Hazards', emoji: '💦', description: 'Splash!', unit: 'count', isNegative: true },
    mulligans: { type: 'mulligans', category: 'golf_mishaps', label: 'Mulligans', emoji: '🔄', description: 'Breakfast balls taken', unit: 'count' },
    club_throws: { type: 'club_throws', category: 'golf_mishaps', label: 'Club Throws', emoji: '🤬', description: 'Temper tantrums', unit: 'count', isNegative: true },
    whiffs: { type: 'whiffs', category: 'golf_mishaps', label: 'Whiffs', emoji: '💨', description: 'Complete misses', unit: 'count', isNegative: true },
    shanks: { type: 'shanks', category: 'golf_mishaps', label: 'Shanks', emoji: '↗️', description: 'The dreaded S-word', unit: 'count', isNegative: true },
    four_putts: { type: 'four_putts', category: 'golf_mishaps', label: '4-Putts', emoji: '😱', description: 'Green disasters', unit: 'count', isNegative: true },

    // Golf Highlights
    birdies: { type: 'birdies', category: 'golf_highlights', label: 'Birdies', emoji: '🐦', description: 'One under par', unit: 'count' },
    eagles: { type: 'eagles', category: 'golf_highlights', label: 'Eagles', emoji: '🦅', description: 'Two under par', unit: 'count' },
    chip_ins: { type: 'chip_ins', category: 'golf_highlights', label: 'Chip-Ins', emoji: '🎯', description: 'Chipped it in!', unit: 'count' },
    longest_putt: { type: 'longest_putt', category: 'golf_highlights', label: 'Longest Putt', emoji: '🏌️', description: 'Distance in feet', unit: 'feet' },
    longest_drive: { type: 'longest_drive', category: 'golf_highlights', label: 'Longest Drive', emoji: '💪', description: 'Distance in yards', unit: 'yards' },
    closest_to_pin: { type: 'closest_to_pin', category: 'golf_highlights', label: 'Closest to Pin', emoji: '📍', description: 'Distance in feet', unit: 'feet' },
    greens_in_regulation: { type: 'greens_in_regulation', category: 'golf_highlights', label: 'GIR', emoji: '🟢', description: 'Greens in regulation', unit: 'count' },
    fairways_hit: { type: 'fairways_hit', category: 'golf_highlights', label: 'Fairways Hit', emoji: '✅', description: 'Finding the short grass', unit: 'count' },

    // Cart Chaos
    cart_path_violations: { type: 'cart_path_violations', category: 'cart_chaos', label: 'Path Violations', emoji: '🚫', description: 'Off-roading incidents', unit: 'count' },
    near_misses: { type: 'near_misses', category: 'cart_chaos', label: 'Near Misses', emoji: '😬', description: 'Close calls', unit: 'count' },
    stuck_in_mud: { type: 'stuck_in_mud', category: 'cart_chaos', label: 'Stuck in Mud', emoji: '🏗️', description: 'Needed a push', unit: 'count' },
    wrong_fairway: { type: 'wrong_fairway', category: 'cart_chaos', label: 'Wrong Fairway', emoji: '🗺️', description: 'Got lost', unit: 'count' },
    cart_distance: { type: 'cart_distance', category: 'cart_chaos', label: 'Cart Distance', emoji: '🛣️', description: 'Total miles driven', unit: 'miles' },

    // Social
    late_to_tee: { type: 'late_to_tee', category: 'social', label: 'Late to Tee', emoji: '⏰', description: 'Minutes late', unit: 'minutes', isNegative: true },
    phone_checks: { type: 'phone_checks', category: 'social', label: 'Phone Checks', emoji: '📱', description: 'Couldn\'t stay off phone', unit: 'count' },
    naps_taken: { type: 'naps_taken', category: 'social', label: 'Naps Taken', emoji: '😴', description: 'Recovery sleep', unit: 'count' },
    wildlife_encounters: { type: 'wildlife_encounters', category: 'social', label: 'Wildlife', emoji: '🐊', description: 'Animal sightings', unit: 'count' },
    bathroom_breaks: { type: 'bathroom_breaks', category: 'social', label: 'Bathroom Breaks', emoji: '🚽', description: 'Nature calls', unit: 'count' },
    excuses_made: { type: 'excuses_made', category: 'social', label: 'Excuses Made', emoji: '🤥', description: 'Creative blame-shifting', unit: 'count' },
    rules_argued: { type: 'rules_argued', category: 'social', label: 'Rules Argued', emoji: '📖', description: 'Debated the rulebook', unit: 'count' },

    // Money
    side_bet_winnings: { type: 'side_bet_winnings', category: 'money', label: 'Bet Winnings', emoji: '💰', description: 'Money won', unit: 'dollars' },
    side_bet_losses: { type: 'side_bet_losses', category: 'money', label: 'Bet Losses', emoji: '💸', description: 'Money lost', unit: 'dollars', isNegative: true },
    pro_shop_spending: { type: 'pro_shop_spending', category: 'money', label: 'Pro Shop', emoji: '🛍️', description: 'Shopping damage', unit: 'dollars' },
    tips_given: { type: 'tips_given', category: 'money', label: 'Tips Given', emoji: '💵', description: 'Generosity meter', unit: 'dollars' },
    drinks_bought_for_others: { type: 'drinks_bought_for_others', category: 'money', label: 'Drinks Bought', emoji: '🍻', description: 'For the group', unit: 'dollars' },
};

// ============================================
// CATEGORY METADATA
// ============================================

export interface CategoryDefinition {
    id: TripStatCategory;
    label: string;
    emoji: string;
    description: string;
    color: string;
}

export const CATEGORY_DEFINITIONS: Record<TripStatCategory, CategoryDefinition> = {
    beverages: { id: 'beverages', label: 'Beverages', emoji: '🍺', description: 'Drink tracker', color: '#F59E0B' },
    golf_mishaps: { id: 'golf_mishaps', label: 'Golf Mishaps', emoji: '😅', description: 'The bad shots', color: '#EF4444' },
    golf_highlights: { id: 'golf_highlights', label: 'Highlights', emoji: '⭐', description: 'The good stuff', color: '#10B981' },
    cart_chaos: { id: 'cart_chaos', label: 'Cart Chaos', emoji: '🛒', description: 'Driving adventures', color: '#8B5CF6' },
    social: { id: 'social', label: 'Social', emoji: '😂', description: 'Off-course antics', color: '#EC4899' },
    money: { id: 'money', label: 'Money', emoji: '💰', description: 'Financial damage', color: '#059669' },
    awards: { id: 'awards', label: 'Awards', emoji: '🏆', description: 'Trip superlatives', color: '#D97706' },
};

// ============================================
// PLAYER STAT RECORD
// ============================================

export interface PlayerTripStat {
    id: UUID;
    tripId: UUID;
    playerId: UUID;
    sessionId?: UUID; // Optional - can be per-round or trip-wide
    statType: TripStatType;
    value: number;
    note?: string; // Optional context (e.g., "Lost 3 balls on hole 7")
    timestamp: ISODateString;
    recordedBy?: UUID; // Who logged this stat
}

// ============================================
// AWARDS TYPES
// ============================================

export type AwardType =
    // Positive Awards
    | 'mvp'
    | 'best_dressed'
    | 'worst_dressed'
    | 'best_story'
    | 'most_improved'
    | 'party_animal'
    | 'early_bird'
    | 'night_owl'
    | 'best_attitude'
    | 'clutch_player'
    | 'social_butterfly'
    // Funny Awards
    | 'most_excuses'
    | 'slowest_player'
    | 'best_cheerleader'
    | 'most_lost_balls'
    | 'cart_path_champion'
    | 'beverage_king'
    | 'sand_king'
    | 'water_magnet';

export interface AwardDefinition {
    type: AwardType;
    label: string;
    emoji: string;
    description: string;
    isPositive: boolean;
}

export const AWARD_DEFINITIONS: Record<AwardType, AwardDefinition> = {
    mvp: { type: 'mvp', label: 'Trip MVP', emoji: '🏆', description: 'Most Valuable Player', isPositive: true },
    best_dressed: { type: 'best_dressed', label: 'Best Dressed', emoji: '👔', description: 'Looking sharp', isPositive: true },
    worst_dressed: { type: 'worst_dressed', label: 'Fashion Disaster', emoji: '🎨', description: 'Bold choices', isPositive: false },
    best_story: { type: 'best_story', label: 'Best Story', emoji: '📚', description: 'Master storyteller', isPositive: true },
    most_improved: { type: 'most_improved', label: 'Most Improved', emoji: '📈', description: 'Getting better!', isPositive: true },
    party_animal: { type: 'party_animal', label: 'Party Animal', emoji: '🎉', description: 'Life of the party', isPositive: true },
    early_bird: { type: 'early_bird', label: 'Early Bird', emoji: '🌅', description: 'First one up', isPositive: true },
    night_owl: { type: 'night_owl', label: 'Night Owl', emoji: '🦉', description: 'Last one standing', isPositive: true },
    best_attitude: { type: 'best_attitude', label: 'Best Attitude', emoji: '😊', description: 'Always positive', isPositive: true },
    clutch_player: { type: 'clutch_player', label: 'Clutch Player', emoji: '💎', description: 'Performs under pressure', isPositive: true },
    social_butterfly: { type: 'social_butterfly', label: 'Social Butterfly', emoji: '🦋', description: 'Knows everyone', isPositive: true },
    most_excuses: { type: 'most_excuses', label: 'Excuse Master', emoji: '🤥', description: 'Creative blame-shifting', isPositive: false },
    slowest_player: { type: 'slowest_player', label: 'Slow Poke', emoji: '🐢', description: 'Takes their time', isPositive: false },
    best_cheerleader: { type: 'best_cheerleader', label: 'Best Cheerleader', emoji: '📣', description: 'Loudest supporter', isPositive: true },
    most_lost_balls: { type: 'most_lost_balls', label: 'Ball Hunter', emoji: '🔍', description: 'Keeps Titleist in business', isPositive: false },
    cart_path_champion: { type: 'cart_path_champion', label: 'Off-Road Champion', emoji: '🏎️', description: 'Path? What path?', isPositive: false },
    beverage_king: { type: 'beverage_king', label: 'Beverage King', emoji: '👑', description: 'Cart girl\'s best friend', isPositive: true },
    sand_king: { type: 'sand_king', label: 'Beach Bum', emoji: '🏖️', description: 'Loves the bunkers', isPositive: false },
    water_magnet: { type: 'water_magnet', label: 'Water Magnet', emoji: '🧲', description: 'Splash specialist', isPositive: false },
};

export interface TripAward {
    id: UUID;
    tripId: UUID;
    awardType: AwardType;
    winnerId: UUID;
    nominatedBy?: UUID;
    votes?: UUID[]; // Player IDs who voted
    note?: string;
    awardedAt: ISODateString;
}

// ============================================
// LEADERBOARD TYPES
// ============================================

export interface StatLeaderboardEntry {
    playerId: UUID;
    playerName: string;
    value: number;
    rank: number;
}

export interface CategoryLeaderboard {
    category: TripStatCategory;
    stats: {
        statType: TripStatType;
        leaders: StatLeaderboardEntry[];
    }[];
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function getStatsByCategory(category: TripStatCategory): StatDefinition[] {
    return Object.values(STAT_DEFINITIONS).filter(s => s.category === category);
}

export function formatStatValue(value: number, unit: StatDefinition['unit']): string {
    switch (unit) {
        case 'dollars':
            return `$${value.toLocaleString()}`;
        case 'feet':
            return `${value}ft`;
        case 'yards':
            return `${value}yds`;
        case 'minutes':
            return `${value}min`;
        case 'miles':
            return `${value.toFixed(1)}mi`;
        case 'count':
        default:
            return value.toLocaleString();
    }
}
