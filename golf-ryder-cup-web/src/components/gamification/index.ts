/**
 * Gamification Components - Barrel Export
 */

export { SideBets } from './SideBets';
export type { SideBet, SideBetType } from './SideBets';

export { Achievements, AchievementBadge, ACHIEVEMENT_DEFINITIONS } from './Achievements';
export type { Achievement, AchievementDefinition } from './Achievements';

export { MomentumMeter, PressureIndicator, calculateMomentum } from './MomentumMeter';

// Achievement Celebration
export {
    AchievementUnlock,
    AchievementNotification,
    type Achievement as UnlockableAchievement,
    type AchievementRarity,
} from './AchievementUnlock';
