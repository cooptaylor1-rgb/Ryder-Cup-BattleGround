/**
 * Achievements Component
 *
 * Displays earned and available badges/achievements.
 * Achievements are earned based on performance and participation.
 */

'use client';

import { useState, useMemo } from 'react';
import { cn, formatPlayerName } from '@/lib/utils';
import { format } from 'date-fns';
import {
    Trophy,
    Medal,
    Star,
    Flame,
    Target,
    Zap,
    Shield,
    Crown,
    Heart,
    Mountain,
    Lock,
    ChevronRight,
} from 'lucide-react';
import type { Player } from '@/lib/types/models';

// ============================================
// TYPES
// ============================================

export interface Achievement {
    id: string;
    playerId: string;
    tripId: string;
    achievementType: string;
    name: string;
    description: string;
    icon: string;
    earnedAt: string;
}

export interface AchievementDefinition {
    type: string;
    name: string;
    description: string;
    icon: string;
    category: 'performance' | 'streak' | 'special' | 'social';
    rarity: 'common' | 'uncommon' | 'rare' | 'legendary';
}

// ============================================
// ACHIEVEMENT DEFINITIONS
// ============================================

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
    // Performance
    {
        type: 'first_win',
        name: 'First Blood',
        description: 'Win your first match',
        icon: 'trophy',
        category: 'performance',
        rarity: 'common',
    },
    {
        type: 'flawless_victory',
        name: 'Flawless Victory',
        description: 'Win a match without losing a hole',
        icon: 'star',
        category: 'performance',
        rarity: 'legendary',
    },
    {
        type: 'comeback_kid',
        name: 'Comeback Kid',
        description: 'Win after being 3 down',
        icon: 'flame',
        category: 'performance',
        rarity: 'rare',
    },
    {
        type: 'dormie_destroyer',
        name: 'Dormie Destroyer',
        description: 'Win from a dormie position against you',
        icon: 'zap',
        category: 'performance',
        rarity: 'rare',
    },
    {
        type: 'closer',
        name: 'The Closer',
        description: 'Close out a match 5&4 or better',
        icon: 'target',
        category: 'performance',
        rarity: 'uncommon',
    },
    {
        type: 'front_nine_hero',
        name: 'Front Nine Hero',
        description: 'Win the front nine by 4+ holes',
        icon: 'medal',
        category: 'performance',
        rarity: 'uncommon',
    },
    {
        type: 'back_nine_bandit',
        name: 'Back Nine Bandit',
        description: 'Win the back nine by 4+ holes',
        icon: 'medal',
        category: 'performance',
        rarity: 'uncommon',
    },

    // Streaks
    {
        type: 'win_streak_3',
        name: 'Hat Trick',
        description: 'Win 3 matches in a row',
        icon: 'flame',
        category: 'streak',
        rarity: 'uncommon',
    },
    {
        type: 'win_streak_5',
        name: 'On Fire',
        description: 'Win 5 matches in a row',
        icon: 'flame',
        category: 'streak',
        rarity: 'rare',
    },
    {
        type: 'hole_streak_5',
        name: 'Hot Streak',
        description: 'Win 5 consecutive holes',
        icon: 'zap',
        category: 'streak',
        rarity: 'rare',
    },
    {
        type: 'undefeated',
        name: 'Undefeated',
        description: 'Go undefeated for an entire trip',
        icon: 'crown',
        category: 'streak',
        rarity: 'legendary',
    },

    // Special
    {
        type: 'mvp',
        name: 'MVP',
        description: 'Earn the most points in a trip',
        icon: 'crown',
        category: 'special',
        rarity: 'legendary',
    },
    {
        type: 'halve_hero',
        name: 'Halve Hero',
        description: 'Halve 3 matches in a single trip',
        icon: 'shield',
        category: 'special',
        rarity: 'uncommon',
    },
    {
        type: 'ironman',
        name: 'Ironman',
        description: 'Play in every match of a trip',
        icon: 'shield',
        category: 'special',
        rarity: 'rare',
    },
    {
        type: 'clutch_player',
        name: 'Clutch Player',
        description: 'Win the deciding match of the trip',
        icon: 'target',
        category: 'special',
        rarity: 'rare',
    },

    // Social
    {
        type: 'team_player',
        name: 'Team Player',
        description: 'Win with 3 different partners',
        icon: 'heart',
        category: 'social',
        rarity: 'uncommon',
    },
    {
        type: 'veteran',
        name: 'Veteran',
        description: 'Participate in 10 trips',
        icon: 'mountain',
        category: 'social',
        rarity: 'rare',
    },
    {
        type: 'centurion',
        name: 'Centurion',
        description: 'Play 100 matches',
        icon: 'mountain',
        category: 'social',
        rarity: 'legendary',
    },
];

// ============================================
// MAIN COMPONENT
// ============================================

interface AchievementsProps {
    achievements: Achievement[];
    player?: Player;
    showLocked?: boolean;
    compact?: boolean;
    className?: string;
}

export function Achievements({
    achievements,
    player,
    showLocked = true,
    compact = false,
    className,
}: AchievementsProps) {
    const [activeCategory, setActiveCategory] = useState<AchievementDefinition['category'] | 'all'>('all');

    // Get earned achievement types
    const earnedTypes = new Set(achievements.map((a) => a.achievementType));

    // Filter by category
    const filteredDefinitions = ACHIEVEMENT_DEFINITIONS.filter(
        (def) => activeCategory === 'all' || def.category === activeCategory
    );

    // Separate earned and locked
    const earned = filteredDefinitions.filter((def) => earnedTypes.has(def.type));
    const locked = showLocked ? filteredDefinitions.filter((def) => !earnedTypes.has(def.type)) : [];

    // Stats
    const totalEarned = achievements.length;
    const totalAvailable = ACHIEVEMENT_DEFINITIONS.length;

    if (compact) {
        return (
            <div className={cn('flex flex-wrap gap-2', className)}>
                {achievements.slice(0, 5).map((achievement) => {
                    const def = ACHIEVEMENT_DEFINITIONS.find((d) => d.type === achievement.achievementType);
                    if (!def) return null;

                    return (
                        <AchievementBadge
                            key={achievement.id}
                            definition={def}
                            earned
                            size="sm"
                        />
                    );
                })}
                {achievements.length > 5 && (
                    <div className="px-2 py-1 rounded bg-surface-100 dark:bg-surface-800 text-sm text-surface-500">
                        +{achievements.length - 5} more
                    </div>
                )}
            </div>
        );
    }

    return (
        <div className={cn('space-y-6', className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-medium flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-secondary-gold" />
                        Achievements
                    </h3>
                    <p className="text-sm text-surface-500">
                        {totalEarned} of {totalAvailable} earned
                    </p>
                </div>
                {player && (
                    <div className="text-right">
                        <div className="text-sm text-surface-500">Player</div>
                        <div className="font-medium">
                            {formatPlayerName(player.firstName, player.lastName, 'short')}
                        </div>
                    </div>
                )}
            </div>

            {/* Progress bar */}
            <div className="h-2 rounded-full bg-surface-200 dark:bg-surface-700 overflow-hidden">
                <div
                    className="h-full rounded-full bg-secondary-gold transition-all"
                    style={{ width: `${(totalEarned / totalAvailable) * 100}%` }}
                />
            </div>

            {/* Category filters */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                {[
                    { value: 'all' as const, label: 'All' },
                    { value: 'performance' as const, label: 'Performance' },
                    { value: 'streak' as const, label: 'Streaks' },
                    { value: 'special' as const, label: 'Special' },
                    { value: 'social' as const, label: 'Social' },
                ].map((cat) => (
                    <button
                        key={cat.value}
                        onClick={() => setActiveCategory(cat.value)}
                        className={cn(
                            'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                            activeCategory === cat.value
                                ? 'bg-secondary-gold text-white'
                                : 'bg-surface-100 dark:bg-surface-800 text-surface-600 dark:text-surface-400'
                        )}
                    >
                        {cat.label}
                    </button>
                ))}
            </div>

            {/* Earned achievements */}
            {earned.length > 0 && (
                <div>
                    <h4 className="text-sm font-medium text-surface-500 mb-3">Earned</h4>
                    <div className="grid grid-cols-2 gap-3">
                        {earned.map((def) => {
                            const achievement = achievements.find((a) => a.achievementType === def.type);
                            return (
                                <AchievementCard
                                    key={def.type}
                                    definition={def}
                                    achievement={achievement}
                                    earned
                                />
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Locked achievements */}
            {locked.length > 0 && (
                <div>
                    <h4 className="text-sm font-medium text-surface-500 mb-3">Locked</h4>
                    <div className="grid grid-cols-2 gap-3">
                        {locked.map((def) => (
                            <AchievementCard
                                key={def.type}
                                definition={def}
                                earned={false}
                            />
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ============================================
// SUB-COMPONENTS
// ============================================

interface AchievementCardProps {
    definition: AchievementDefinition;
    achievement?: Achievement;
    earned: boolean;
}

function AchievementCard({ definition, achievement, earned }: AchievementCardProps) {
    const rarityColors = {
        common: 'from-gray-400 to-gray-500',
        uncommon: 'from-green-400 to-green-600',
        rare: 'from-blue-400 to-blue-600',
        legendary: 'from-yellow-400 to-orange-500',
    };

    return (
        <div
            className={cn(
                'p-4 rounded-xl border transition-all',
                earned
                    ? 'bg-surface-card border-secondary-gold/30'
                    : 'bg-surface-50 dark:bg-surface-800/50 border-surface-200 dark:border-surface-700 opacity-60'
            )}
        >
            <div className="flex items-start gap-3">
                {/* Icon */}
                <div
                    className={cn(
                        'w-12 h-12 rounded-xl flex items-center justify-center',
                        earned
                            ? `bg-gradient-to-br ${rarityColors[definition.rarity]}`
                            : 'bg-surface-200 dark:bg-surface-700'
                    )}
                >
                    {earned ? (
                        <AchievementIcon icon={definition.icon} className="w-6 h-6 text-white" />
                    ) : (
                        <Lock className="w-5 h-5 text-surface-400" />
                    )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{definition.name}</div>
                    <div className="text-xs text-surface-500 mt-0.5">{definition.description}</div>
                    {earned && achievement && (
                        <div className="text-xs text-secondary-gold mt-1">
                            Earned {format(new Date(achievement.earnedAt), 'MMM d, yyyy')}
                        </div>
                    )}
                </div>
            </div>

            {/* Rarity indicator */}
            <div className="mt-3 flex items-center gap-2">
                <div
                    className={cn(
                        'px-2 py-0.5 rounded-full text-xs font-medium',
                        definition.rarity === 'common' && 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
                        definition.rarity === 'uncommon' && 'bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-400',
                        definition.rarity === 'rare' && 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-400',
                        definition.rarity === 'legendary' && 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900 dark:text-yellow-400'
                    )}
                >
                    {definition.rarity.charAt(0).toUpperCase() + definition.rarity.slice(1)}
                </div>
            </div>
        </div>
    );
}

interface AchievementBadgeProps {
    definition: AchievementDefinition;
    earned: boolean;
    size?: 'sm' | 'md' | 'lg';
}

export function AchievementBadge({ definition, earned, size = 'md' }: AchievementBadgeProps) {
    const sizeClasses = {
        sm: 'w-8 h-8',
        md: 'w-10 h-10',
        lg: 'w-14 h-14',
    };

    const iconSizes = {
        sm: 'w-4 h-4',
        md: 'w-5 h-5',
        lg: 'w-7 h-7',
    };

    const rarityColors = {
        common: 'from-gray-400 to-gray-500',
        uncommon: 'from-green-400 to-green-600',
        rare: 'from-blue-400 to-blue-600',
        legendary: 'from-yellow-400 to-orange-500',
    };

    return (
        <div
            className={cn(
                'rounded-full flex items-center justify-center',
                sizeClasses[size],
                earned
                    ? `bg-gradient-to-br ${rarityColors[definition.rarity]}`
                    : 'bg-surface-200 dark:bg-surface-700'
            )}
            title={earned ? definition.name : 'Locked'}
        >
            {earned ? (
                <AchievementIcon icon={definition.icon} className={cn(iconSizes[size], 'text-white')} />
            ) : (
                <Lock className={cn(iconSizes[size], 'text-surface-400')} />
            )}
        </div>
    );
}

function AchievementIcon({ icon, className }: { icon: string; className?: string }) {
    const icons: Record<string, React.ReactNode> = {
        trophy: <Trophy className={className} />,
        medal: <Medal className={className} />,
        star: <Star className={className} />,
        flame: <Flame className={className} />,
        target: <Target className={className} />,
        zap: <Zap className={className} />,
        shield: <Shield className={className} />,
        crown: <Crown className={className} />,
        heart: <Heart className={className} />,
        mountain: <Mountain className={className} />,
    };

    return <>{icons[icon] || <Trophy className={className} />}</>;
}

export default Achievements;
