/**
 * EmptyStateIllustrations Component — Phase 4: Polish & Delight
 *
 * Beautiful empty state illustrations for various contexts:
 * - No matches yet
 * - No players added
 * - No scores recorded
 * - No photos taken
 * - Search no results
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
        illustration: <GolfFlagIllustration />,
        color: 'var(--masters)',
    },
    'no-players': {
        icon: Users,
        defaultTitle: 'No players added',
        defaultDescription: 'Invite your golf buddies to join the trip.',
        illustration: <PlayersIllustration />,
        color: '#3B82F6',
    },
    'no-scores': {
        icon: Target,
        defaultTitle: 'No scores recorded',
        defaultDescription: 'Start scoring your round to track performance.',
        illustration: <ScorecardIllustration />,
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
        illustration: <TrophyIllustration />,
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
// ILLUSTRATIONS
// ============================================

function GolfFlagIllustration() {
    return (
        <svg viewBox="0 0 200 160" className="w-full h-full">
            {/* Ground */}
            <ellipse cx="100" cy="140" rx="80" ry="12" fill="var(--masters)" opacity="0.2" />

            {/* Flag pole */}
            <motion.line
                x1="100" y1="30" x2="100" y2="130"
                stroke="var(--ink-tertiary)"
                strokeWidth="3"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5 }}
            />

            {/* Flag */}
            <motion.path
                d="M 100 30 L 140 45 L 100 60 Z"
                fill="var(--masters)"
                initial={{ scale: 0, originX: '100px', originY: '45px' }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
            />

            {/* Hole */}
            <motion.ellipse
                cx="100" cy="132" rx="12" ry="4"
                fill="var(--ink)"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 }}
            />

            {/* Golf ball */}
            <motion.circle
                cx="130" cy="128" r="8"
                fill="white"
                stroke="var(--rule)"
                strokeWidth="1"
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.7, type: 'spring' }}
            />
        </svg>
    );
}

function PlayersIllustration() {
    return (
        <svg viewBox="0 0 200 160" className="w-full h-full">
            {/* Background circle */}
            <circle cx="100" cy="80" r="50" fill="#3B82F6" opacity="0.1" />

            {/* Person outlines */}
            {[70, 100, 130].map((cx, i) => (
                <motion.g
                    key={cx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.15 }}
                >
                    <circle cx={cx} cy="60" r="15" fill={i === 1 ? '#3B82F6' : 'var(--rule)'} />
                    <ellipse cx={cx} cy="100" rx="20" ry="25" fill={i === 1 ? '#3B82F6' : 'var(--rule)'} />
                </motion.g>
            ))}

            {/* Plus icon */}
            <motion.g
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5, type: 'spring' }}
            >
                <circle cx="155" cy="90" r="15" fill="#22C55E" />
                <line x1="155" y1="82" x2="155" y2="98" stroke="white" strokeWidth="3" />
                <line x1="147" y1="90" x2="163" y2="90" stroke="white" strokeWidth="3" />
            </motion.g>
        </svg>
    );
}

function ScorecardIllustration() {
    return (
        <svg viewBox="0 0 200 160" className="w-full h-full">
            {/* Card background */}
            <motion.rect
                x="40" y="30" width="120" height="100" rx="8"
                fill="white"
                stroke="var(--rule)"
                strokeWidth="2"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
            />

            {/* Header */}
            <rect x="40" y="30" width="120" height="25" rx="8" fill="var(--masters)" opacity="0.2" />

            {/* Score boxes */}
            {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <motion.rect
                    key={i}
                    x={50 + (i % 9) * 12}
                    y={65 + Math.floor(i / 9) * 20}
                    width="10"
                    height="14"
                    rx="2"
                    fill="var(--rule)"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3 + i * 0.05 }}
                />
            ))}

            {/* Pencil */}
            <motion.g
                initial={{ x: 30, y: -20, rotate: -45 }}
                animate={{ x: 0, y: 0, rotate: 0 }}
                transition={{ delay: 0.8, type: 'spring' }}
            >
                <rect x="145" y="85" width="30" height="6" rx="1" fill="#F59E0B" />
                <polygon points="175,88 185,88 180,85" fill="#FFD700" />
            </motion.g>
        </svg>
    );
}

function CameraIllustration() {
    return (
        <svg viewBox="0 0 200 160" className="w-full h-full">
            {/* Camera body */}
            <motion.rect
                x="50" y="50" width="100" height="70" rx="10"
                fill="var(--ink)"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring' }}
            />

            {/* Flash */}
            <motion.rect
                x="65" y="40" width="25" height="15" rx="3"
                fill="var(--ink-secondary)"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
            />

            {/* Lens */}
            <motion.circle
                cx="100" cy="85" r="25"
                fill="#1F2937"
                stroke="var(--ink-secondary)"
                strokeWidth="4"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, type: 'spring' }}
            />

            {/* Inner lens */}
            <motion.circle
                cx="100" cy="85" r="15"
                fill="#374151"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.4 }}
            />

            {/* Shutter button */}
            <motion.circle
                cx="130" cy="55" r="8"
                fill="#8B5CF6"
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ delay: 0.5 }}
            />

            {/* Photo cards */}
            {[0, 1].map((i) => (
                <motion.rect
                    key={i}
                    x={160 - i * 8}
                    y={70 + i * 5}
                    width="35"
                    height="45"
                    rx="3"
                    fill="white"
                    stroke="var(--rule)"
                    initial={{ x: -30, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.6 + i * 0.1 }}
                    style={{ transformOrigin: 'center' }}
                />
            ))}
        </svg>
    );
}

function SearchIllustration() {
    return (
        <svg viewBox="0 0 200 160" className="w-full h-full">
            {/* Magnifying glass */}
            <motion.circle
                cx="85" cy="70" r="35"
                fill="none"
                stroke="var(--rule)"
                strokeWidth="8"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring' }}
            />

            {/* Handle */}
            <motion.line
                x1="112" y1="97"
                x2="145" y2="130"
                stroke="var(--rule)"
                strokeWidth="10"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.3 }}
            />

            {/* Question mark */}
            <motion.text
                x="85" y="80"
                fontSize="30"
                fill="var(--ink-tertiary)"
                textAnchor="middle"
                fontWeight="bold"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
            >
                ?
            </motion.text>
        </svg>
    );
}

function TripIllustration() {
    return (
        <svg viewBox="0 0 200 160" className="w-full h-full">
            {/* Suitcase */}
            <motion.rect
                x="60" y="60" width="80" height="60" rx="8"
                fill="var(--masters)"
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
            />

            {/* Handle */}
            <motion.path
                d="M 85 60 L 85 45 Q 85 40 90 40 L 110 40 Q 115 40 115 45 L 115 60"
                fill="none"
                stroke="var(--masters)"
                strokeWidth="4"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.3 }}
            />

            {/* Straps */}
            <rect x="60" y="80" width="80" height="4" fill="#006040" />
            <rect x="60" y="100" width="80" height="4" fill="#006040" />

            {/* Golf clubs sticking out */}
            <motion.g
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5 }}
            >
                <line x1="75" y1="60" x2="70" y2="30" stroke="var(--ink-secondary)" strokeWidth="3" />
                <line x1="85" y1="60" x2="82" y2="28" stroke="var(--ink-secondary)" strokeWidth="3" />
                <circle cx="70" cy="28" r="6" fill="var(--ink-secondary)" />
                <rect x="78" y="22" width="8" height="10" fill="var(--ink-secondary)" />
            </motion.g>
        </svg>
    );
}

function TrophyIllustration() {
    return (
        <svg viewBox="0 0 200 160" className="w-full h-full">
            {/* Trophy cup */}
            <motion.path
                d="M 70 40 L 70 80 Q 70 100 100 100 Q 130 100 130 80 L 130 40 Z"
                fill="#FFD700"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring' }}
            />

            {/* Handles */}
            <motion.path
                d="M 70 50 Q 50 50 50 70 Q 50 85 70 85"
                fill="none"
                stroke="#FFD700"
                strokeWidth="8"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.3 }}
            />
            <motion.path
                d="M 130 50 Q 150 50 150 70 Q 150 85 130 85"
                fill="none"
                stroke="#FFD700"
                strokeWidth="8"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.3 }}
            />

            {/* Base */}
            <motion.rect
                x="85" y="100" width="30" height="15"
                fill="#F59E0B"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: 0.4 }}
            />
            <motion.rect
                x="75" y="115" width="50" height="10" rx="2"
                fill="#D97706"
                initial={{ scaleY: 0 }}
                animate={{ scaleY: 1 }}
                transition={{ delay: 0.5 }}
            />

            {/* Star */}
            <motion.text
                x="100" y="75"
                fontSize="24"
                textAnchor="middle"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6 }}
            >
                ⭐
            </motion.text>
        </svg>
    );
}

function ActivityIllustration() {
    return (
        <svg viewBox="0 0 200 160" className="w-full h-full">
            {/* Graph line */}
            <motion.path
                d="M 30 120 L 60 100 L 90 110 L 120 60 L 150 80 L 180 40"
                fill="none"
                stroke="#F59E0B"
                strokeWidth="4"
                strokeLinecap="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 1 }}
            />

            {/* Dots */}
            {[[60, 100], [90, 110], [120, 60], [150, 80]].map(([cx, cy], i) => (
                <motion.circle
                    key={i}
                    cx={cx}
                    cy={cy}
                    r="6"
                    fill="#F59E0B"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 + i * 0.1, type: 'spring' }}
                />
            ))}

            {/* Arrow */}
            <motion.polygon
                points="175,35 185,40 175,55"
                fill="#F59E0B"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
            />
        </svg>
    );
}

function CommentsIllustration() {
    return (
        <svg viewBox="0 0 200 160" className="w-full h-full">
            {/* Chat bubbles */}
            <motion.path
                d="M 40 50 L 120 50 Q 130 50 130 60 L 130 90 Q 130 100 120 100 L 60 100 L 50 115 L 50 100 L 50 100 Q 40 100 40 90 L 40 60 Q 40 50 50 50 Z"
                fill="var(--rule)"
                initial={{ scale: 0, originX: '85px', originY: '80px' }}
                animate={{ scale: 1 }}
            />

            <motion.path
                d="M 70 70 L 150 70 Q 160 70 160 80 L 160 110 Q 160 120 150 120 L 150 135 L 140 120 L 80 120 Q 70 120 70 110 L 70 80 Q 70 70 80 70 Z"
                fill="#EC4899"
                opacity="0.8"
                initial={{ scale: 0, originX: '115px', originY: '100px' }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3 }}
            />

            {/* Dots */}
            {[85, 100, 115].map((cx, i) => (
                <motion.circle
                    key={cx}
                    cx={cx}
                    cy="95"
                    r="4"
                    fill="white"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 + i * 0.1 }}
                />
            ))}
        </svg>
    );
}

function NotificationsIllustration() {
    return (
        <svg viewBox="0 0 200 160" className="w-full h-full">
            {/* Bell */}
            <motion.path
                d="M 100 30 Q 100 30 100 30 Q 65 40 65 80 L 65 100 L 135 100 L 135 80 Q 135 40 100 30 Z"
                fill="#22C55E"
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: 'spring' }}
            />

            {/* Bell bottom */}
            <motion.rect
                x="55" y="100" width="90" height="12" rx="6"
                fill="#22C55E"
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ delay: 0.2 }}
            />

            {/* Clapper */}
            <motion.circle
                cx="100" cy="120" r="10"
                fill="#16A34A"
                initial={{ y: -20 }}
                animate={{ y: 0 }}
                transition={{ delay: 0.3, type: 'spring' }}
            />

            {/* Check mark */}
            <motion.path
                d="M 90 80 L 98 90 L 115 70"
                fill="none"
                stroke="white"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.5, duration: 0.3 }}
            />
        </svg>
    );
}

function CourseIllustration() {
    return (
        <svg viewBox="0 0 200 160" className="w-full h-full">
            {/* Ground */}
            <ellipse cx="100" cy="130" rx="90" ry="20" fill="var(--masters)" opacity="0.2" />

            {/* Trees */}
            {[40, 160].map((cx, i) => (
                <motion.g
                    key={cx}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.2 }}
                >
                    <polygon points={`${cx},40 ${cx - 20},100 ${cx + 20},100`} fill="#22C55E" opacity="0.8" />
                    <rect x={cx - 5} y="100" width="10" height="25" fill="#8B4513" />
                </motion.g>
            ))}

            {/* Flag */}
            <motion.g
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
            >
                <line x1="100" y1="40" x2="100" y2="120" stroke="var(--ink-tertiary)" strokeWidth="3" />
                <polygon points="100,40 130,55 100,70" fill="var(--masters)" />
            </motion.g>

            {/* Hole */}
            <motion.ellipse
                cx="100" cy="122" rx="10" ry="4"
                fill="var(--ink)"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.6 }}
            />
        </svg>
    );
}

function ChecklistIllustration() {
    return (
        <svg viewBox="0 0 200 160" className="w-full h-full">
            {/* Clipboard */}
            <motion.rect
                x="50" y="30" width="100" height="120" rx="8"
                fill="white"
                stroke="var(--rule)"
                strokeWidth="2"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
            />

            {/* Clip */}
            <motion.rect
                x="75" y="20" width="50" height="25" rx="4"
                fill="var(--ink-secondary)"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
            />

            {/* Checkboxes */}
            {[0, 1, 2, 3].map((i) => (
                <motion.g
                    key={i}
                    initial={{ x: -20, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                >
                    <rect x="65" y={55 + i * 25} width="16" height="16" rx="3" fill="#22C55E" />
                    <path
                        d={`M ${69} ${63 + i * 25} L ${73} ${67 + i * 25} L ${79} ${59 + i * 25}`}
                        fill="none"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                    <rect x="90" y={57 + i * 25} width="50" height="10" rx="2" fill="var(--rule)" />
                </motion.g>
            ))}
        </svg>
    );
}

function StatsIllustration() {
    return (
        <svg viewBox="0 0 200 160" className="w-full h-full">
            {/* Bar chart */}
            {[
                { x: 40, h: 60, color: '#3B82F6' },
                { x: 70, h: 80, color: '#22C55E' },
                { x: 100, h: 50, color: '#F59E0B' },
                { x: 130, h: 90, color: '#8B5CF6' },
                { x: 160, h: 70, color: '#EC4899' },
            ].map((bar, i) => (
                <motion.rect
                    key={bar.x}
                    x={bar.x - 12}
                    y={130 - bar.h}
                    width="24"
                    height={bar.h}
                    rx="4"
                    fill={bar.color}
                    initial={{ scaleY: 0, originY: '130px' }}
                    animate={{ scaleY: 1 }}
                    transition={{ delay: i * 0.1 }}
                />
            ))}

            {/* Baseline */}
            <line x1="25" y1="130" x2="175" y2="130" stroke="var(--rule)" strokeWidth="2" />
        </svg>
    );
}

function ReactionsIllustration() {
    return (
        <svg viewBox="0 0 200 160" className="w-full h-full">
            {/* Emoji reactions */}
            {[
                { emoji: '❤️', x: 60, y: 80, delay: 0 },
                { emoji: '🔥', x: 100, y: 60, delay: 0.1 },
                { emoji: '👏', x: 140, y: 80, delay: 0.2 },
                { emoji: '😂', x: 80, y: 110, delay: 0.3 },
                { emoji: '⛳', x: 120, y: 110, delay: 0.4 },
            ].map((item, i) => (
                <motion.text
                    key={i}
                    x={item.x}
                    y={item.y}
                    fontSize="30"
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
                transition={{ delay: 0.6, type: 'spring' }}
            >
                <circle cx="165" cy="95" r="15" fill="var(--rule)" />
                <line x1="165" y1="87" x2="165" y2="103" stroke="var(--ink-tertiary)" strokeWidth="2" />
                <line x1="157" y1="95" x2="173" y2="95" stroke="var(--ink-tertiary)" strokeWidth="2" />
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
