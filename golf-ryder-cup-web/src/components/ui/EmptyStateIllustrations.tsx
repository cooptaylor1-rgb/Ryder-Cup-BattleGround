/**
 * EmptyStateIllustrations Component — Phase 4: Polish & Delight
 *
 * Beautiful empty state illustrations for various contexts.
 * Consolidates with core illustrations library where possible.
 *
 * Turns empty into engaging with helpful CTAs.
 */

'use client';

import { ReactNode } from 'react';
import { motion } from 'framer-motion';
import {
    Calendar,
    Users,
    Award,
    Camera,
    Search,
    Trophy,
    Flag,
    Target,
    MessageCircle,
    Bell,
    MapPin,
    ClipboardList,
    TrendingUp,
    Heart,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHaptic } from '@/lib/hooks';

// Import shared illustrations from core library
import {
    TrophyIllustration as SharedTrophy,
    GolfFlagIllustration as SharedGolfFlag,
    ScorecardIllustration as SharedScorecard,
    GolfersIllustration as SharedGolfers,
    CalendarIllustration as SharedCalendar,
} from '@/components/ui/illustrations';

// ============================================
// TYPES
// ============================================

export type EmptyStateType =
    | 'no-matches'
    | 'no-players'
    | 'no-scores'
    | 'no-photos'
    | 'no-results'
    | 'no-trips'
    | 'no-standings'
    | 'no-activity'
    | 'no-comments'
    | 'no-notifications'
    | 'no-courses'
    | 'no-checklist'
    | 'no-stats'
    | 'no-reactions';

interface EmptyStateProps {
    type: EmptyStateType;
    title?: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
    size?: 'sm' | 'md' | 'lg';
}

// ============================================
// WRAPPER FOR SHARED ILLUSTRATIONS
// (Adds empty-state animation wrapper)
// ============================================

function AnimatedIllustrationWrapper({ children }: { children: ReactNode }) {
    return (
        <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className="w-full h-full flex items-center justify-center"
        >
            {children}
        </motion.div>
    );
}

// ============================================
// ILLUSTRATIONS CONFIG
// ============================================

interface EmptyStateConfig {
    icon: typeof Calendar;
    defaultTitle: string;
    defaultDescription: string;
    illustration: ReactNode;
    color: string;
}

const EMPTY_STATE_CONFIG: Record<EmptyStateType, EmptyStateConfig> = {
    'no-matches': {
        icon: Flag,
        defaultTitle: 'No matches yet',
        defaultDescription: 'Create your first match to get the competition started!',
        illustration: (
            <AnimatedIllustrationWrapper>
                <SharedGolfFlag size="lg" animated />
            </AnimatedIllustrationWrapper>
        ),
        color: 'var(--masters)',
    },
    'no-players': {
        icon: Users,
        defaultTitle: 'No players added',
        defaultDescription: 'Invite your golf buddies to join the trip.',
        illustration: (
            <AnimatedIllustrationWrapper>
                <SharedGolfers size="lg" animated />
            </AnimatedIllustrationWrapper>
        ),
        color: '#3B82F6',
    },
    'no-scores': {
        icon: Target,
        defaultTitle: 'No scores recorded',
        defaultDescription: 'Start scoring your round to track performance.',
        illustration: (
            <AnimatedIllustrationWrapper>
                <SharedScorecard size="lg" animated />
            </AnimatedIllustrationWrapper>
        ),
        color: '#22C55E',
    },
    'no-photos': {
        icon: Camera,
        defaultTitle: 'No photos yet',
        defaultDescription: 'Capture moments from your golf trip.',
        illustration: <CameraIllustration />,
        color: '#8B5CF6',
    },
    'no-results': {
        icon: Search,
        defaultTitle: 'No results found',
        defaultDescription: 'Try adjusting your search or filters.',
        illustration: <SearchIllustration />,
        color: '#6B7280',
    },
    'no-trips': {
        icon: MapPin,
        defaultTitle: 'No trips yet',
        defaultDescription: 'Create your first golf trip to get started.',
        illustration: <TripIllustration />,
        color: 'var(--masters)',
    },
    'no-standings': {
        icon: Trophy,
        defaultTitle: 'No standings yet',
        defaultDescription: 'Complete some matches to see the leaderboard.',
        illustration: (
            <AnimatedIllustrationWrapper>
                <SharedTrophy size="lg" animated />
            </AnimatedIllustrationWrapper>
        ),
        color: '#FFD700',
    },
    'no-activity': {
        icon: TrendingUp,
        defaultTitle: 'No recent activity',
        defaultDescription: 'Activity will appear here as the trip progresses.',
        illustration: <ActivityIllustration />,
        color: '#F59E0B',
    },
    'no-comments': {
        icon: MessageCircle,
        defaultTitle: 'No comments yet',
        defaultDescription: 'Be the first to start the conversation!',
        illustration: <CommentsIllustration />,
        color: '#EC4899',
    },
    'no-notifications': {
        icon: Bell,
        defaultTitle: 'All caught up!',
        defaultDescription: "You've seen all your notifications.",
        illustration: <NotificationsIllustration />,
        color: '#22C55E',
    },
    'no-courses': {
        icon: MapPin,
        defaultTitle: 'No courses added',
        defaultDescription: 'Add a golf course to start planning.',
        illustration: <CourseIllustration />,
        color: 'var(--masters)',
    },
    'no-checklist': {
        icon: ClipboardList,
        defaultTitle: 'Checklist complete!',
        defaultDescription: 'All items have been checked off.',
        illustration: <ChecklistIllustration />,
        color: '#22C55E',
    },
    'no-stats': {
        icon: Award,
        defaultTitle: 'No stats yet',
        defaultDescription: 'Play some rounds to see your statistics.',
        illustration: <StatsIllustration />,
        color: '#3B82F6',
    },
    'no-reactions': {
        icon: Heart,
        defaultTitle: 'No reactions yet',
        defaultDescription: 'Be the first to react!',
        illustration: <ReactionsIllustration />,
        color: '#EF4444',
    },
};

// ============================================
// UNIQUE ILLUSTRATIONS (not in core library)
// Refined for visual clarity and premium feel
// ============================================

function CameraIllustration() {
    return (
        <svg viewBox="0 0 100 80" className="w-full h-full">
            {/* Camera body */}
            <motion.rect
                x="20" y="25" width="60" height="40" rx="6"
                fill="var(--ink)"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', duration: 0.4 }}
            />

            {/* Flash bump */}
            <motion.rect
                x="28" y="18" width="16" height="10" rx="2"
                fill="var(--ink-secondary)"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
            />

            {/* Lens */}
            <motion.circle
                cx="50" cy="45" r="14"
                fill="#1F2937"
                stroke="var(--ink-secondary)"
                strokeWidth="3"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
            />

            {/* Inner lens */}
            <motion.circle
                cx="50" cy="45" r="8"
                fill="#374151"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 }}
            />

            {/* Shutter button */}
            <motion.circle
                cx="68" cy="30" r="5"
                fill="#8B5CF6"
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.15, 1] }}
                transition={{ delay: 0.35 }}
            />
        </svg>
    );
}

function SearchIllustration() {
    return (
        <svg viewBox="0 0 100 80" className="w-full h-full">
            {/* Magnifying glass circle */}
            <motion.circle
                cx="40" cy="35" r="20"
                fill="none"
                stroke="var(--rule)"
                strokeWidth="5"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', duration: 0.4 }}
            />

            {/* Handle */}
            <motion.line
                x1="54" y1="49"
                x2="72" y2="67"
                stroke="var(--rule)"
                strokeWidth="6"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.25 }}
            />

            {/* Question mark */}
            <motion.text
                x="40" y="42"
                fontSize="18"
                fill="var(--ink-tertiary)"
                textAnchor="middle"
                fontWeight="bold"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
            >
                ?
            </motion.text>
        </svg>
    );
}

function TripIllustration() {
    return (
        <svg viewBox="0 0 100 80" className="w-full h-full">
            {/* Suitcase body */}
            <motion.rect
                x="25" y="30" width="50" height="38" rx="5"
                fill="var(--masters)"
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', duration: 0.4 }}
            />

            {/* Handle */}
            <motion.path
                d="M 38 30 L 38 22 Q 38 18 42 18 L 58 18 Q 62 18 62 22 L 62 30"
                fill="none"
                stroke="var(--masters)"
                strokeWidth="3"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.2 }}
            />

            {/* Straps */}
            <rect x="25" y="42" width="50" height="3" fill="#006040" />
            <rect x="25" y="55" width="50" height="3" fill="#006040" />

            {/* Golf clubs sticking out */}
            <motion.g
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.35 }}
            >
                <line x1="33" y1="30" x2="30" y2="12" stroke="var(--ink-secondary)" strokeWidth="2" />
                <line x1="40" y1="30" x2="38" y2="10" stroke="var(--ink-secondary)" strokeWidth="2" />
                <circle cx="30" cy="10" r="4" fill="var(--ink-secondary)" />
                <rect x="35" y="6" width="6" height="7" rx="1" fill="var(--ink-secondary)" />
            </motion.g>
        </svg>
    );
}

function ActivityIllustration() {
    return (
        <svg viewBox="0 0 100 80" className="w-full h-full">
            {/* Graph line */}
            <motion.path
                d="M 10 60 L 25 48 L 45 54 L 60 28 L 80 38 L 95 18"
                fill="none"
                stroke="#F59E0B"
                strokeWidth="3"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.8 }}
            />

            {/* Dots */}
            {[[25, 48], [45, 54], [60, 28], [80, 38]].map(([cx, cy], i) => (
                <motion.circle
                    key={i}
                    cx={cx}
                    cy={cy}
                    r="4"
                    fill="#F59E0B"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.4 + i * 0.08, type: 'spring' }}
                />
            ))}

            {/* Arrow tip */}
            <motion.polygon
                points="92,14 98,18 92,28"
                fill="#F59E0B"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
            />
        </svg>
    );
}

function CommentsIllustration() {
    return (
        <svg viewBox="0 0 100 80" className="w-full h-full">
            {/* Back bubble */}
            <motion.path
                d="M 15 25 L 60 25 Q 68 25 68 33 L 68 50 Q 68 58 60 58 L 28 58 L 20 68 L 20 58 Q 15 58 15 50 L 15 33 Q 15 25 23 25 Z"
                fill="var(--rule)"
                initial={{ scale: 0, originX: '42px', originY: '45px' }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', duration: 0.4 }}
            />

            {/* Front bubble */}
            <motion.path
                d="M 32 38 L 77 38 Q 85 38 85 46 L 85 58 Q 85 66 77 66 L 77 76 L 70 66 L 40 66 Q 32 66 32 58 L 32 46 Q 32 38 40 38 Z"
                fill="#EC4899"
                opacity="0.85"
                initial={{ scale: 0, originX: '58px', originY: '55px' }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: 'spring' }}
            />

            {/* Typing dots */}
            {[48, 58, 68].map((cx, i) => (
                <motion.circle
                    key={cx}
                    cx={cx}
                    cy="52"
                    r="3"
                    fill="white"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.4 + i * 0.08 }}
                />
            ))}
        </svg>
    );
}

function NotificationsIllustration() {
    return (
        <svg viewBox="0 0 100 80" className="w-full h-full">
            {/* Bell body */}
            <motion.path
                d="M 50 12 Q 28 18 28 42 L 28 52 L 72 52 L 72 42 Q 72 18 50 12 Z"
                fill="#22C55E"
                initial={{ y: -12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring', duration: 0.4 }}
            />

            {/* Bell bottom band */}
            <motion.rect
                x="22" y="52" width="56" height="8" rx="4"
                fill="#22C55E"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.15 }}
            />

            {/* Clapper */}
            <motion.circle
                cx="50" cy="65" r="6"
                fill="#16A34A"
                initial={{ y: -12 }}
                animate={{ y: 0 }}
                transition={{ delay: 0.25, type: 'spring' }}
            />

            {/* Check mark */}
            <motion.path
                d="M 43 40 L 48 46 L 58 34"
                fill="none"
                stroke="white"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.4, duration: 0.25 }}
            />
        </svg>
    );
}

function CourseIllustration() {
    return (
        <svg viewBox="0 0 100 80" className="w-full h-full">
            {/* Ground */}
            <ellipse cx="50" cy="68" rx="45" ry="10" fill="var(--masters)" opacity="0.2" />

            {/* Trees */}
            {[15, 85].map((cx, i) => (
                <motion.g
                    key={cx}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.12 }}
                >
                    <polygon points={`${cx},18 ${cx - 10},55 ${cx + 10},55`} fill="#22C55E" opacity="0.8" />
                    <rect x={cx - 3} y="55" width="6" height="12" fill="#8B4513" />
                </motion.g>
            ))}

            {/* Flag */}
            <motion.g
                initial={{ y: 12, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.25 }}
            >
                <line x1="50" y1="20" x2="50" y2="62" stroke="var(--ink-tertiary)" strokeWidth="2" />
                <polygon points="50,20 68,30 50,40" fill="var(--masters)" />
            </motion.g>

            {/* Hole */}
            <motion.ellipse
                cx="50" cy="64" rx="6" ry="2.5"
                fill="var(--ink)"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4 }}
            />
        </svg>
    );
}

function ChecklistIllustration() {
    return (
        <svg viewBox="0 0 100 80" className="w-full h-full">
            {/* Clipboard */}
            <motion.rect
                x="20" y="12" width="60" height="65" rx="5"
                fill="white"
                stroke="var(--rule)"
                strokeWidth="2"
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', duration: 0.4 }}
            />

            {/* Clip */}
            <motion.rect
                x="35" y="6" width="30" height="14" rx="3"
                fill="var(--ink-secondary)"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.15 }}
            />

            {/* Checkboxes */}
            {[0, 1, 2, 3].map((i) => (
                <motion.g
                    key={i}
                    initial={{ x: -12, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.25 + i * 0.08 }}
                >
                    <rect x="28" y={26 + i * 14} width="10" height="10" rx="2" fill="#22C55E" />
                    <path
                        d={`M 30 ${31 + i * 14} L 33 ${34 + i * 14} L 37 ${29 + i * 14}`}
                        fill="none"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                    />
                    <rect x="44" y={28 + i * 14} width="28" height="6" rx="1.5" fill="var(--rule)" />
                </motion.g>
            ))}
        </svg>
    );
}

function StatsIllustration() {
    return (
        <svg viewBox="0 0 100 80" className="w-full h-full">
            {/* Bar chart */}
            {[
                { x: 15, h: 30, color: '#3B82F6' },
                { x: 32, h: 42, color: '#22C55E' },
                { x: 49, h: 25, color: '#F59E0B' },
                { x: 66, h: 48, color: '#8B5CF6' },
                { x: 83, h: 36, color: '#EC4899' },
            ].map((bar, i) => (
                <motion.rect
                    key={bar.x}
                    x={bar.x - 6}
                    y={68 - bar.h}
                    width="12"
                    height={bar.h}
                    rx="2"
                    fill={bar.color}
                    initial={{ scaleY: 0, originY: '68px' }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: i * 0.08 }}
                />
            ))}

            {/* Baseline */}
            <line x1="5" y1="68" x2="95" y2="68" stroke="var(--rule)" strokeWidth="1.5" />
        </svg>
    );
}

function ReactionsIllustration() {
    return (
        <svg viewBox="0 0 100 80" className="w-full h-full">
            {/* Emoji reactions */}
            {[
                { emoji: '❤️', x: 25, y: 42, delay: 0 },
                { emoji: '🔥', x: 50, y: 28, delay: 0.08 },
                { emoji: '👏', x: 75, y: 42, delay: 0.16 },
                { emoji: '😂', x: 35, y: 58, delay: 0.24 },
                { emoji: '⛳', x: 65, y: 58, delay: 0.32 },
            ].map((item, i) => (
                <motion.text
                    key={i}
                    x={item.x}
                    y={item.y}
                    fontSize="18"
                    textAnchor="middle"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: item.delay, type: 'spring' }}
                >
                    {item.emoji}
                </motion.text>
            ))}

            {/* Plus button */}
            <motion.g
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.45, type: 'spring' }}
            >
                <circle cx="88" cy="50" r="8" fill="var(--rule)" />
                <line x1="88" y1="45" x2="88" y2="55" stroke="var(--ink-tertiary)" strokeWidth="1.5" />
                <line x1="83" y1="50" x2="93" y2="50" stroke="var(--ink-tertiary)" strokeWidth="1.5" />
            </motion.g>
        </svg>
    );
}

// ============================================
// MAIN COMPONENT
// ============================================

export function EmptyState({
    type,
    title,
    description,
    actionLabel,
    onAction,
    className,
    size = 'md',
}: EmptyStateProps) {
    const haptic = useHaptic();
    const config = EMPTY_STATE_CONFIG[type];

    const sizeClasses = {
        sm: 'py-6',
        md: 'py-12',
        lg: 'py-20',
    };

    const illustrationSizes = {
        sm: 'w-24 h-24',
        md: 'w-40 h-40',
        lg: 'w-56 h-56',
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
                'flex flex-col items-center justify-center text-center px-6',
                sizeClasses[size],
                className
            )}
        >
            {/* Illustration */}
            <div className={cn('mb-6', illustrationSizes[size])}>
                {config.illustration}
            </div>

            {/* Title */}
            <h3
                className="text-lg font-semibold mb-2"
                style={{ color: 'var(--ink)' }}
            >
                {title || config.defaultTitle}
            </h3>

            {/* Description */}
            <p
                className="text-sm max-w-xs mb-6"
                style={{ color: 'var(--ink-secondary)' }}
            >
                {description || config.defaultDescription}
            </p>

            {/* Action Button */}
            {actionLabel && onAction && (
                <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                        haptic.tap();
                        onAction();
                    }}
                    className="px-6 py-3 rounded-xl font-semibold text-white"
                    style={{ background: config.color }}
                >
                    {actionLabel}
                </motion.button>
            )}
        </motion.div>
    );
}

export default EmptyState;
