/**
 * Golf Illustrations
 *
 * Production-quality SVG illustrations for empty states,
 * onboarding experiences, and hero sections.
 *
 * Design Principles:
 * - Intentional, not decorative
 * - Clear visual hierarchy
 * - Premium feel on iPhone
 * - Consistent sizing & spacing
 * - Subtle animations that enhance, not distract
 */

import { cn } from '@/lib/utils';

interface IllustrationProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    animated?: boolean;
}

/**
 * Standardized size system for iPhone optimization
 * - sm: Inline/compact use (40px) - profile cards, list items
 * - md: Standard empty states (64px) - most common use
 * - lg: Hero sections (96px) - onboarding steps
 * - xl: Full-screen heroes (128px) - welcome screens
 */
const sizeClasses = {
    sm: 'w-10 h-10',    // 40px - compact
    md: 'w-16 h-16',    // 64px - standard
    lg: 'w-24 h-24',    // 96px - hero
    xl: 'w-32 h-32',    // 128px - full hero
};

/**
 * Golf Ball on Tee
 * For: Login page hero, starting a tournament
 * Visual: Simple, iconic golf moment
 */
export function GolfBallTee({ className, size = 'md', animated = true }: IllustrationProps) {
    return (
        <svg
            viewBox="0 0 100 100"
            className={cn(sizeClasses[size], animated && 'animate-float-subtle', className)}
            aria-hidden="true"
        >
            {/* Grass - simplified */}
            <path
                d="M15 82 Q30 78 45 82 Q60 78 75 82 Q90 78 95 82"
                stroke="var(--masters)"
                strokeWidth="2.5"
                strokeLinecap="round"
                fill="none"
                opacity="0.5"
            />

            {/* Tee */}
            <path
                d="M50 62 L50 78 M47 78 L53 78"
                stroke="var(--cream-dark, #D4C5A9)"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
            />

            {/* Ball shadow */}
            <ellipse
                cx="50"
                cy="61"
                rx="12"
                ry="3"
                fill="black"
                opacity="0.08"
            />

            {/* Golf ball */}
            <circle
                cx="50"
                cy="47"
                r="14"
                fill="white"
                stroke="var(--surface-300, #D4D4D4)"
                strokeWidth="1"
            />

            {/* Dimples - cleaner pattern */}
            <g fill="var(--surface-200, #E5E5E5)">
                <circle cx="45" cy="43" r="2" />
                <circle cx="55" cy="43" r="2" />
                <circle cx="50" cy="47" r="2" />
                <circle cx="45" cy="51" r="2" />
                <circle cx="55" cy="51" r="2" />
            </g>

            {/* Shine highlight */}
            <ellipse
                cx="45"
                cy="41"
                rx="4"
                ry="2"
                fill="white"
                opacity="0.7"
            />
        </svg>
    );
}

/**
 * Trophy
 * For: Standings, awards, leaderboards, achievements
 * Visual: Classic golf trophy with clear silhouette
 */
export function TrophyIllustration({ className, size = 'md', animated = true }: IllustrationProps) {
    return (
        <svg
            viewBox="0 0 100 100"
            className={cn(sizeClasses[size], animated && 'animate-trophy-shine', className)}
            aria-hidden="true"
        >
            {/* Ambient glow */}
            <defs>
                <radialGradient id="trophy-glow" cx="50%" cy="35%" r="45%">
                    <stop offset="0%" stopColor="var(--gold, #FFD700)" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="var(--gold, #FFD700)" stopOpacity="0" />
                </radialGradient>
            </defs>
            <circle cx="50" cy="42" r="28" fill="url(#trophy-glow)" />

            {/* Trophy cup */}
            <path
                d="M32 28 L32 48 Q32 62 50 66 Q68 62 68 48 L68 28 Z"
                fill="var(--gold, #FFD700)"
                stroke="var(--masters, #006644)"
                strokeWidth="1.5"
            />

            {/* Left handle */}
            <path
                d="M32 32 Q18 32 18 44 Q18 54 30 54"
                fill="none"
                stroke="var(--gold, #FFD700)"
                strokeWidth="4"
                strokeLinecap="round"
            />

            {/* Right handle */}
            <path
                d="M68 32 Q82 32 82 44 Q82 54 70 54"
                fill="none"
                stroke="var(--gold, #FFD700)"
                strokeWidth="4"
                strokeLinecap="round"
            />

            {/* Stem */}
            <path
                d="M45 66 L45 74 L55 74 L55 66"
                fill="var(--gold, #FFD700)"
            />

            {/* Base */}
            <path
                d="M36 74 L64 74 L67 83 L33 83 Z"
                fill="var(--masters, #006644)"
                stroke="var(--masters, #006644)"
                strokeWidth="1.5"
                strokeLinejoin="round"
            />

            {/* Star decoration */}
            <path
                d="M50 38 L52 44 L58 44 L53 48 L55 54 L50 50 L45 54 L47 48 L42 44 L48 44 Z"
                fill="var(--cream, #FFFEF0)"
            />

            {/* Shine */}
            <path
                d="M37 33 Q41 38 37 46"
                fill="none"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                opacity="0.5"
            />
        </svg>
    );
}

/**
 * Golfers / Two Players
 * For: Team selection, matchups, player rosters
 * Visual: Two competing players in team colors
 */
export function GolfersIllustration({ className, size = 'md', animated = true }: IllustrationProps) {
    return (
        <svg
            viewBox="0 0 100 100"
            className={cn(sizeClasses[size], className)}
            aria-hidden="true"
        >
            {/* USA Player (left) */}
            <g className={cn(animated && 'animate-golfer-left')}>
                {/* Body */}
                <ellipse cx="32" cy="62" rx="11" ry="16" fill="var(--usa-primary, #1E3A5F)" />
                {/* Head */}
                <circle cx="32" cy="40" r="9" fill="var(--cream, #FFFEF0)" />
                {/* Cap */}
                <path d="M23 38 Q32 33 41 38 L39 41 L25 41 Z" fill="var(--usa-primary, #1E3A5F)" />
                {/* Visor */}
                <rect x="22" y="38" width="20" height="2.5" rx="1" fill="var(--usa-dark, #0F1F33)" />
                {/* Club */}
                <path
                    d="M42 48 L54 26"
                    stroke="var(--surface-400, #A3A3A3)"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
                <ellipse cx="55" cy="24" rx="3.5" ry="2.5" fill="var(--surface-500, #737373)" />
            </g>

            {/* Europe Player (right) */}
            <g className={cn(animated && 'animate-golfer-right')}>
                {/* Body */}
                <ellipse cx="68" cy="62" rx="11" ry="16" fill="var(--europe-primary, #1D4E89)" />
                {/* Head */}
                <circle cx="68" cy="40" r="9" fill="var(--cream, #FFFEF0)" />
                {/* Cap */}
                <path d="M59 38 Q68 33 77 38 L75 41 L61 41 Z" fill="var(--europe-primary, #1D4E89)" />
                {/* Visor */}
                <rect x="58" y="38" width="20" height="2.5" rx="1" fill="var(--europe-dark, #0F2847)" />
            </g>

            {/* VS badge in center */}
            <g className={cn(animated && 'animate-pulse-gentle')}>
                <circle cx="50" cy="52" r="9" fill="var(--canvas-raised, #FFFFFF)" stroke="var(--surface-border, #E5E5E5)" strokeWidth="1" />
                <text x="50" y="55.5" textAnchor="middle" fontSize="9" fontWeight="bold" fill="var(--ink, #1C1917)">
                    VS
                </text>
            </g>

            {/* Grass */}
            <path
                d="M10 82 Q25 78 40 82 Q55 78 70 82 Q85 78 95 82"
                stroke="var(--masters, #006644)"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
                opacity="0.4"
            />
        </svg>
    );
}

/**
 * Scorecard
 * For: No scores, scoring empty state, hole-by-hole
 * Visual: Clean scorecard with pencil - action-ready
 */
export function ScorecardIllustration({ className, size = 'md', animated = true }: IllustrationProps) {
    return (
        <svg
            viewBox="0 0 100 100"
            className={cn(sizeClasses[size], className)}
            aria-hidden="true"
        >
            {/* Card background */}
            <rect
                x="18"
                y="18"
                width="64"
                height="64"
                rx="5"
                fill="white"
                stroke="var(--surface-200, #E5E5E5)"
                strokeWidth="1.5"
            />

            {/* Header bar */}
            <rect x="18" y="18" width="64" height="12" rx="5" fill="var(--masters, #006644)" />
            <rect x="18" y="26" width="64" height="4" fill="var(--masters, #006644)" />

            {/* Score grid lines */}
            <g stroke="var(--surface-200, #E5E5E5)" strokeWidth="0.75">
                <line x1="26" y1="36" x2="74" y2="36" />
                <line x1="26" y1="50" x2="74" y2="50" />
                <line x1="26" y1="64" x2="74" y2="64" />
                <line x1="40" y1="36" x2="40" y2="76" />
                <line x1="54" y1="36" x2="54" y2="76" />
                <line x1="68" y1="36" x2="68" y2="76" />
            </g>

            {/* Hole numbers */}
            <g fill="var(--ink-tertiary, #A3A3A3)" fontSize="7" fontWeight="500">
                <text x="33" y="44" textAnchor="middle">1</text>
                <text x="47" y="44" textAnchor="middle">2</text>
                <text x="61" y="44" textAnchor="middle">3</text>
            </g>

            {/* Score marks */}
            <g className={cn(animated && 'animate-scores-fill')}>
                <circle cx="33" cy="57" r="3.5" fill="var(--usa-primary, #1E3A5F)" />
            </g>
            <g className={cn(animated && 'animate-scores-fill')} style={{ animationDelay: '120ms' }}>
                <circle cx="47" cy="70" r="3.5" fill="var(--europe-primary, #1D4E89)" />
            </g>
            <g className={cn(animated && 'animate-scores-fill')} style={{ animationDelay: '240ms' }}>
                <circle cx="61" cy="57" r="3.5" fill="var(--gold, #FFD700)" />
            </g>

            {/* Pencil - positioned to suggest action */}
            <g className={cn(animated && 'animate-pencil-write')}>
                <rect x="70" y="58" width="18" height="5" rx="1" fill="var(--gold, #FFD700)" transform="rotate(-45 79 60.5)" />
                <polygon points="59,76 61,71 66,73" fill="var(--cream, #FFFEF0)" />
                <polygon points="59,76 60,74 62,75" fill="var(--surface-600, #525252)" />
            </g>
        </svg>
    );
}

/**
 * Golf Flag / Pin
 * For: Courses, hole selection, course empty state
 * Visual: Classic pin with rolling ball - course-ready
 */
export function GolfFlagIllustration({ className, size = 'md', animated = true }: IllustrationProps) {
    return (
        <svg
            viewBox="0 0 100 100"
            className={cn(sizeClasses[size], className)}
            aria-hidden="true"
        >
            {/* Ground/green */}
            <ellipse cx="50" cy="82" rx="22" ry="7" fill="var(--masters, #006644)" opacity="0.15" />

            {/* Hole */}
            <ellipse cx="50" cy="82" rx="9" ry="3" fill="var(--surface-800, #262626)" />

            {/* Flag pole */}
            <line
                x1="50"
                y1="82"
                x2="50"
                y2="22"
                stroke="var(--surface-400, #A3A3A3)"
                strokeWidth="2.5"
                strokeLinecap="round"
            />

            {/* Flag */}
            <path
                d="M50 22 Q62 28 50 35 L50 22"
                fill="var(--usa-primary, #1E3A5F)"
                className={cn(animated && 'animate-flag-wave')}
            />

            {/* Ball rolling towards hole */}
            <g className={cn(animated && 'animate-ball-roll')}>
                <circle cx="24" cy="76" r="5" fill="white" stroke="var(--surface-300, #D4D4D4)" strokeWidth="0.75" />
                <g fill="var(--surface-200, #E5E5E5)">
                    <circle cx="22.5" cy="74.5" r="0.8" />
                    <circle cx="25.5" cy="74.5" r="0.8" />
                    <circle cx="24" cy="77.5" r="0.8" />
                </g>
            </g>

            {/* Grass tufts */}
            <path
                d="M20 82 Q28 79 36 82"
                stroke="var(--masters, #006644)"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
                opacity="0.5"
            />
            <path
                d="M64 82 Q72 79 80 82"
                stroke="var(--masters, #006644)"
                strokeWidth="1.5"
                strokeLinecap="round"
                fill="none"
                opacity="0.5"
            />
        </svg>
    );
}

/**
 * Calendar
 * For: Schedule, sessions, trip planning
 * Visual: Clean calendar with golf-day markers
 */
export function CalendarIllustration({ className, size = 'md', animated = true }: IllustrationProps) {
    return (
        <svg
            viewBox="0 0 100 100"
            className={cn(sizeClasses[size], className)}
            aria-hidden="true"
        >
            {/* Calendar body */}
            <rect
                x="18"
                y="22"
                width="64"
                height="58"
                rx="6"
                fill="white"
                stroke="var(--surface-200, #E5E5E5)"
                strokeWidth="1.5"
            />

            {/* Header */}
            <rect x="18" y="22" width="64" height="15" rx="6" fill="var(--masters, #006644)" />
            <rect x="18" y="32" width="64" height="5" fill="var(--masters, #006644)" />

            {/* Ring holes */}
            <circle cx="32" cy="22" r="3" fill="var(--surface-100, #F5F5F5)" stroke="var(--surface-300, #D4D4D4)" strokeWidth="0.75" />
            <circle cx="50" cy="22" r="3" fill="var(--surface-100, #F5F5F5)" stroke="var(--surface-300, #D4D4D4)" strokeWidth="0.75" />
            <circle cx="68" cy="22" r="3" fill="var(--surface-100, #F5F5F5)" stroke="var(--surface-300, #D4D4D4)" strokeWidth="0.75" />

            {/* Rings */}
            <rect x="30" y="14" width="4" height="12" rx="2" fill="var(--surface-400, #A3A3A3)" />
            <rect x="48" y="14" width="4" height="12" rx="2" fill="var(--surface-400, #A3A3A3)" />
            <rect x="66" y="14" width="4" height="12" rx="2" fill="var(--surface-400, #A3A3A3)" />

            {/* Day labels */}
            <g fill="var(--ink-tertiary, #A3A3A3)" fontSize="7" fontWeight="500">
                <text x="29" y="49">M</text>
                <text x="43" y="49">T</text>
                <text x="56" y="49">W</text>
                <text x="70" y="49">T</text>
            </g>

            {/* Golf day markers */}
            <g className={cn(animated && 'animate-stagger-fade')}>
                <circle cx="31" cy="61" r="5" fill="var(--usa-primary, #1E3A5F)" opacity="0.15" stroke="var(--usa-primary, #1E3A5F)" strokeWidth="1" />
                <circle cx="45" cy="61" r="5" fill="var(--europe-primary, #1D4E89)" opacity="0.15" stroke="var(--europe-primary, #1D4E89)" strokeWidth="1" />
                <circle cx="59" cy="61" r="5" fill="var(--gold, #FFD700)" opacity="0.15" stroke="var(--gold, #FFD700)" strokeWidth="1" />
            </g>

            {/* Today marker */}
            <g className={cn(animated && 'animate-pulse-gentle')}>
                <circle cx="73" cy="61" r="5" fill="var(--masters, #006644)" />
                <circle cx="73" cy="61" r="2.5" fill="white" />
            </g>
        </svg>
    );
}

/**
 * Podium / Leaderboard
 * For: Standings, rankings, competition results
 * Visual: Classic 1-2-3 podium with player silhouettes
 */
export function PodiumIllustration({ className, size = 'md', animated = true }: IllustrationProps) {
    return (
        <svg
            viewBox="0 0 100 100"
            className={cn(sizeClasses[size], className)}
            aria-hidden="true"
        >
            {/* 2nd place podium */}
            <g className={cn(animated && 'animate-podium-rise')} style={{ animationDelay: '80ms' }}>
                <rect x="17" y="55" width="20" height="28" rx="2" fill="var(--surface-200, #E5E5E5)" stroke="var(--surface-300, #D4D4D4)" strokeWidth="1" />
                <text x="27" y="72" textAnchor="middle" fontSize="14" fontWeight="bold" fill="var(--surface-500, #737373)">2</text>
                {/* Player */}
                <circle cx="27" cy="44" r="7" fill="var(--europe-primary, #1D4E89)" />
                <ellipse cx="27" cy="49" rx="5" ry="2.5" fill="var(--europe-primary, #1D4E89)" />
            </g>

            {/* 1st place podium (center, tallest) */}
            <g className={cn(animated && 'animate-podium-rise')}>
                <rect x="40" y="42" width="20" height="41" rx="2" fill="var(--gold, #FFD700)" stroke="var(--gold, #FFD700)" strokeWidth="1" />
                <text x="50" y="64" textAnchor="middle" fontSize="14" fontWeight="bold" fill="var(--masters, #006644)">1</text>
                {/* Player */}
                <circle cx="50" cy="31" r="7" fill="var(--usa-primary, #1E3A5F)" />
                <ellipse cx="50" cy="36" rx="5" ry="2.5" fill="var(--usa-primary, #1E3A5F)" />
                {/* Mini trophy */}
                <path d="M47 20 L47 24 Q47 27 50 28 Q53 27 53 24 L53 20 Z" fill="var(--gold, #FFD700)" stroke="var(--masters, #006644)" strokeWidth="0.5" />
            </g>

            {/* 3rd place podium */}
            <g className={cn(animated && 'animate-podium-rise')} style={{ animationDelay: '160ms' }}>
                <rect x="63" y="60" width="20" height="23" rx="2" fill="var(--surface-200, #E5E5E5)" stroke="var(--surface-300, #D4D4D4)" strokeWidth="1" />
                <text x="73" y="75" textAnchor="middle" fontSize="14" fontWeight="bold" fill="var(--surface-500, #737373)">3</text>
                {/* Player */}
                <circle cx="73" cy="49" r="7" fill="var(--surface-400, #A3A3A3)" />
                <ellipse cx="73" cy="54" rx="5" ry="2.5" fill="var(--surface-400, #A3A3A3)" />
            </g>

            {/* Subtle confetti */}
            <g className={cn(animated && 'animate-confetti-fall')} opacity="0.7">
                <rect x="32" y="12" width="3" height="3" rx="0.5" fill="var(--usa-primary, #1E3A5F)" transform="rotate(15 33.5 13.5)" />
                <rect x="56" y="10" width="3" height="3" rx="0.5" fill="var(--europe-primary, #1D4E89)" transform="rotate(-20 57.5 11.5)" />
                <rect x="68" y="14" width="3" height="3" rx="0.5" fill="var(--gold, #FFD700)" transform="rotate(30 69.5 15.5)" />
                <circle cx="42" cy="15" r="1.5" fill="var(--masters, #006644)" />
            </g>
        </svg>
    );
}

/**
 * Golf Swing Silhouette
 * For: Onboarding, welcome screens, action states
 * Visual: Dynamic golfer mid-swing - energetic but refined
 */
export function GolfSwingIllustration({ className, size = 'lg', animated = true }: IllustrationProps) {
    return (
        <svg
            viewBox="0 0 100 100"
            className={cn(sizeClasses[size], className)}
            aria-hidden="true"
        >
            {/* Ambient glow */}
            <defs>
                <radialGradient id="swing-glow" cx="70%" cy="25%" r="50%">
                    <stop offset="0%" stopColor="var(--gold, #FFD700)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="var(--gold, #FFD700)" stopOpacity="0" />
                </radialGradient>
            </defs>
            <circle cx="72" cy="25" r="35" fill="url(#swing-glow)" />

            {/* Golfer silhouette */}
            <g fill="var(--masters, #006644)" className={cn(animated && 'animate-swing')}>
                {/* Head */}
                <circle cx="36" cy="28" r="7" />
                {/* Body */}
                <path d="M36 35 Q34 45 38 54 L44 54 Q42 45 40 35" />
                {/* Back leg */}
                <path d="M38 54 Q36 66 32 80 L36 80 Q38 68 41 54" />
                {/* Front leg */}
                <path d="M41 54 Q46 66 50 80 L46 80 Q44 68 41 54" />
                {/* Arms & club */}
                <path d="M38 40 Q52 28 62 20" strokeWidth="3.5" stroke="var(--masters, #006644)" fill="none" strokeLinecap="round" />
                {/* Club head */}
                <rect x="60" y="16" width="7" height="3.5" rx="1" fill="var(--masters, #006644)" transform="rotate(-45 63.5 17.75)" />
            </g>

            {/* Ball trajectory */}
            <path
                d="M54 72 Q68 50 86 42"
                fill="none"
                stroke="var(--gold, #FFD700)"
                strokeWidth="1.5"
                strokeDasharray="3 3"
                className={cn(animated && 'animate-trajectory')}
                opacity="0.5"
            />

            {/* Ball */}
            <circle
                cx="86"
                cy="42"
                r="3.5"
                fill="white"
                stroke="var(--surface-300, #D4D4D4)"
                className={cn(animated && 'animate-ball-fly')}
                strokeWidth="0.75"
            />

            {/* Ground */}
            <path
                d="M5 85 Q30 82 55 85 Q80 82 95 85"
                stroke="var(--masters, #006644)"
                strokeWidth="2"
                fill="none"
                opacity="0.35"
            />
        </svg>
    );
}

/**
 * Celebration / Winner
 * For: Tournament completion, achievements, success states
 * Visual: Trophy with celebratory accents - joyful but dignified
 */
export function CelebrationIllustration({ className, size = 'lg', animated = true }: IllustrationProps) {
    return (
        <svg
            viewBox="0 0 100 100"
            className={cn(sizeClasses[size], className)}
            aria-hidden="true"
        >
            {/* Subtle burst rays */}
            <g stroke="var(--gold, #FFD700)" strokeWidth="1.5" opacity="0.2" className={cn(animated && 'animate-rays-spin')}>
                {[...Array(8)].map((_, i) => (
                    <line
                        key={i}
                        x1="50"
                        y1="50"
                        x2={50 + 35 * Math.cos((i * Math.PI) / 4)}
                        y2={50 + 35 * Math.sin((i * Math.PI) / 4)}
                    />
                ))}
            </g>

            {/* Central trophy */}
            <g className={cn(animated && 'animate-bounce-in')}>
                <circle cx="50" cy="50" r="22" fill="var(--gold, #FFD700)" opacity="0.15" />
                <path
                    d="M36 42 L36 54 Q36 63 50 67 Q64 63 64 54 L64 42 Z"
                    fill="var(--gold, #FFD700)"
                    stroke="var(--masters, #006644)"
                    strokeWidth="1.5"
                />
                <path d="M36 46 Q27 46 27 52 Q27 57 34 57" fill="none" stroke="var(--gold, #FFD700)" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M64 46 Q73 46 73 52 Q73 57 66 57" fill="none" stroke="var(--gold, #FFD700)" strokeWidth="2.5" strokeLinecap="round" />
                <rect x="46" y="67" width="8" height="6" fill="var(--gold, #FFD700)" />
                <rect x="42" y="73" width="16" height="5" rx="1" fill="var(--masters, #006644)" />
                <path d="M50 49 L51.5 53 L56 53 L52.5 56 L54 60 L50 57 L46 60 L47.5 56 L44 53 L48.5 53 Z" fill="var(--cream, #FFFEF0)" />
            </g>

            {/* Refined confetti */}
            <g className={cn(animated && 'animate-confetti-burst')} opacity="0.6">
                <rect x="22" y="24" width="4" height="4" rx="0.5" fill="var(--usa-primary, #1E3A5F)" transform="rotate(20 24 26)" />
                <rect x="72" y="28" width="4" height="4" rx="0.5" fill="var(--europe-primary, #1D4E89)" transform="rotate(-15 74 30)" />
                <rect x="18" y="58" width="3.5" height="3.5" rx="0.5" fill="var(--gold, #FFD700)" transform="rotate(45 19.75 59.75)" />
                <rect x="78" y="62" width="3.5" height="3.5" rx="0.5" fill="var(--masters, #006644)" transform="rotate(-30 79.75 63.75)" />
                <circle cx="30" cy="36" r="2" fill="var(--usa-primary, #1E3A5F)" opacity="0.8" />
                <circle cx="68" cy="32" r="2" fill="var(--europe-primary, #1D4E89)" opacity="0.8" />
            </g>

            {/* Sparkles */}
            <g fill="var(--gold, #FFD700)" className={cn(animated && 'animate-sparkle')} opacity="0.7">
                <path d="M82 18 L83 20 L85 21 L83 22 L82 24 L81 22 L79 21 L81 20 Z" />
                <path d="M18 28 L19 30 L21 31 L19 32 L18 34 L17 32 L15 31 L17 30 Z" />
            </g>
        </svg>
    );
}

/**
 * Ryder Cup Trophy
 * For: Welcome screen, champions, main branding
 * Visual: The iconic Ryder Cup with golfer figure - premium centerpiece
 */
export function RyderCupTrophyIllustration({ className, size = 'lg', animated = true }: IllustrationProps) {
    return (
        <svg
            viewBox="0 0 100 120"
            className={cn(sizeClasses[size], className)}
            aria-hidden="true"
        >
            {/* Background glow */}
            <defs>
                <radialGradient id="ryder-glow" cx="50%" cy="40%" r="45%">
                    <stop offset="0%" stopColor="var(--gold, #FFD700)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="var(--gold, #FFD700)" stopOpacity="0" />
                </radialGradient>
                <linearGradient id="gold-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFD700" />
                    <stop offset="50%" stopColor="#FFC107" />
                    <stop offset="100%" stopColor="#B8860B" />
                </linearGradient>
                <linearGradient id="gold-shine" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#FFF8DC" />
                    <stop offset="50%" stopColor="#FFD700" />
                    <stop offset="100%" stopColor="#B8860B" />
                </linearGradient>
            </defs>

            <circle cx="50" cy="55" r="40" fill="url(#ryder-glow)" />

            {/* Main cup body */}
            <g className={cn(animated && 'animate-trophy-shine')}>
                {/* Cup bowl */}
                <path
                    d="M28 48 L28 62 Q28 80 50 84 Q72 80 72 62 L72 48 Q72 40 50 37 Q28 40 28 48 Z"
                    fill="url(#gold-gradient)"
                    stroke="#B8860B"
                    strokeWidth="0.75"
                />

                {/* Cup rim */}
                <ellipse cx="50" cy="48" rx="22" ry="7" fill="url(#gold-shine)" stroke="#B8860B" strokeWidth="0.75" />

                {/* Left handle */}
                <path
                    d="M28 52 Q15 52 15 62 Q15 72 28 72"
                    fill="none"
                    stroke="url(#gold-gradient)"
                    strokeWidth="4"
                    strokeLinecap="round"
                />

                {/* Right handle */}
                <path
                    d="M72 52 Q85 52 85 62 Q85 72 72 72"
                    fill="none"
                    stroke="url(#gold-gradient)"
                    strokeWidth="4"
                    strokeLinecap="round"
                />

                {/* Stem */}
                <path
                    d="M45 84 L45 92 L55 92 L55 84"
                    fill="url(#gold-gradient)"
                />

                {/* Base platform */}
                <ellipse cx="50" cy="94" rx="12" ry="3.5" fill="url(#gold-gradient)" stroke="#B8860B" strokeWidth="0.75" />

                {/* Base */}
                <path
                    d="M34 96 L66 96 Q68 104 66 108 L34 108 Q32 104 34 96 Z"
                    fill="url(#gold-gradient)"
                    stroke="#B8860B"
                    strokeWidth="0.75"
                />

                {/* Base bottom */}
                <ellipse cx="50" cy="108" rx="16" ry="4" fill="#B8860B" />

                {/* Golfer figure on top - refined scale */}
                <g transform="translate(50, 32) scale(0.35)">
                    {/* Head */}
                    <circle cx="0" cy="-14" r="7" fill="#B8860B" />
                    {/* Body */}
                    <path d="M0 -7 L-4 12 L4 12 Z" fill="#B8860B" />
                    {/* Back arm with club */}
                    <path d="M-2 0 Q-16 -8 -12 -26" stroke="#B8860B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    {/* Club */}
                    <path d="M-12 -26 L-8 -38" stroke="#B8860B" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                    <rect x="-11" y="-42" width="6" height="4" rx="1" fill="#B8860B" transform="rotate(20 -8 -40)" />
                    {/* Front arm */}
                    <path d="M2 0 Q12 4 8 12" stroke="#B8860B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    {/* Legs */}
                    <path d="M-2 12 L-6 28" stroke="#B8860B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                    <path d="M2 12 L6 28" stroke="#B8860B" strokeWidth="2.5" fill="none" strokeLinecap="round" />
                </g>

                {/* Decorative band */}
                <path
                    d="M31 62 Q50 66 69 62"
                    fill="none"
                    stroke="#FFF8DC"
                    strokeWidth="1.5"
                    opacity="0.5"
                />

                {/* Team labels - subtle */}
                <text x="36" y="72" fontSize="5" fontWeight="600" fill="#B8860B" opacity="0.6">USA</text>
                <text x="58" y="72" fontSize="5" fontWeight="600" fill="#B8860B" opacity="0.6">EUR</text>

                {/* Shine effect */}
                <path
                    d="M33 52 Q37 56 33 64"
                    fill="none"
                    stroke="white"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    opacity="0.35"
                />
            </g>
        </svg>
    );
}

export default {
    GolfBallTee,
    TrophyIllustration,
    GolfersIllustration,
    ScorecardIllustration,
    GolfFlagIllustration,
    CalendarIllustration,
    PodiumIllustration,
    GolfSwingIllustration,
    CelebrationIllustration,
    RyderCupTrophyIllustration,
};
