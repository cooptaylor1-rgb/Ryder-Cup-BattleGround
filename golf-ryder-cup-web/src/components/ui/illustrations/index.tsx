/**
 * Golf Illustrations
 *
 * Beautiful, hand-crafted SVG illustrations for empty states
 * and onboarding experiences. Masters-inspired elegance.
 */

import { cn } from '@/lib/utils';

interface IllustrationProps {
    className?: string;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    animated?: boolean;
}

const sizeClasses = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
    xl: 'w-48 h-48',
};

/**
 * Golf Ball on Tee
 * For: First-time user experience, starting a tournament
 */
export function GolfBallTee({ className, size = 'md', animated = true }: IllustrationProps) {
    return (
        <svg
            viewBox="0 0 100 100"
            className={cn(sizeClasses[size], animated && 'animate-float', className)}
            aria-hidden="true"
        >
            {/* Grass */}
            <path
                d="M10 85 Q20 80 30 85 Q40 80 50 85 Q60 80 70 85 Q80 80 90 85"
                stroke="var(--masters)"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
                className="opacity-60"
            />

            {/* Tee */}
            <path
                d="M50 65 L50 82 M46 82 L54 82"
                stroke="var(--cream-dark)"
                strokeWidth="4"
                strokeLinecap="round"
                fill="none"
            />

            {/* Ball shadow */}
            <ellipse
                cx="50"
                cy="64"
                rx="14"
                ry="4"
                className="fill-black/10"
            />

            {/* Golf ball */}
            <circle
                cx="50"
                cy="50"
                r="15"
                className="fill-white stroke-surface-300"
                strokeWidth="1"
            />

            {/* Dimples */}
            <g className="fill-surface-200">
                <circle cx="45" cy="45" r="2" />
                <circle cx="55" cy="45" r="2" />
                <circle cx="50" cy="50" r="2" />
                <circle cx="45" cy="55" r="2" />
                <circle cx="55" cy="55" r="2" />
                <circle cx="40" cy="50" r="1.5" />
                <circle cx="60" cy="50" r="1.5" />
            </g>

            {/* Shine */}
            <ellipse
                cx="45"
                cy="42"
                rx="4"
                ry="2"
                className="fill-white opacity-60"
            />
        </svg>
    );
}

/**
 * Trophy
 * For: No tournaments, awards, leaderboards
 */
export function TrophyIllustration({ className, size = 'md', animated = true }: IllustrationProps) {
    return (
        <svg
            viewBox="0 0 100 100"
            className={cn(sizeClasses[size], animated && 'animate-trophy-shine', className)}
            aria-hidden="true"
        >
            {/* Glow */}
            <defs>
                <radialGradient id="trophy-glow" cx="50%" cy="30%" r="50%">
                    <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
                </radialGradient>
            </defs>
            <circle cx="50" cy="40" r="30" fill="url(#trophy-glow)" />

            {/* Trophy cup */}
            <path
                d="M30 25 L30 45 Q30 60 50 65 Q70 60 70 45 L70 25 Z"
                className="fill-gold stroke-masters"
                strokeWidth="2"
            />

            {/* Left handle */}
            <path
                d="M30 30 Q15 30 15 42 Q15 52 28 52"
                fill="none"
                className="stroke-gold"
                strokeWidth="4"
                strokeLinecap="round"
            />

            {/* Right handle */}
            <path
                d="M70 30 Q85 30 85 42 Q85 52 72 52"
                fill="none"
                className="stroke-gold"
                strokeWidth="4"
                strokeLinecap="round"
            />

            {/* Stem */}
            <path
                d="M45 65 L45 75 L55 75 L55 65"
                className="fill-gold"
            />

            {/* Base */}
            <path
                d="M35 75 L65 75 L68 85 L32 85 Z"
                className="fill-masters stroke-masters"
                strokeWidth="2"
                strokeLinejoin="round"
            />

            {/* Star decoration */}
            <path
                d="M50 35 L52 41 L58 41 L53 45 L55 51 L50 47 L45 51 L47 45 L42 41 L48 41 Z"
                className="fill-cream"
            />

            {/* Shine */}
            <path
                d="M35 30 Q40 35 35 45"
                fill="none"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                opacity="0.4"
            />
        </svg>
    );
}

/**
 * Golfers / Two Players
 * For: No players, matchups, team rosters
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
                <ellipse cx="30" cy="65" rx="12" ry="18" className="fill-usa-primary" />
                {/* Head */}
                <circle cx="30" cy="40" r="10" className="fill-cream" />
                {/* Cap */}
                <path d="M20 38 Q30 32 40 38 L38 42 L22 42 Z" className="fill-usa-primary" />
                {/* Visor */}
                <rect x="19" y="38" width="22" height="3" rx="1" className="fill-usa-dark" />
                {/* Club */}
                <path
                    d="M42 50 L55 25"
                    className="stroke-surface-400"
                    strokeWidth="2"
                    strokeLinecap="round"
                />
                <ellipse cx="56" cy="23" rx="4" ry="3" className="fill-surface-500" />
            </g>

            {/* Europe Player (right) */}
            <g className={cn(animated && 'animate-golfer-right')}>
                {/* Body */}
                <ellipse cx="70" cy="65" rx="12" ry="18" className="fill-europe-primary" />
                {/* Head */}
                <circle cx="70" cy="40" r="10" className="fill-cream" />
                {/* Cap */}
                <path d="M60 38 Q70 32 80 38 L78 42 L62 42 Z" className="fill-europe-primary" />
                {/* Visor */}
                <rect x="59" y="38" width="22" height="3" rx="1" className="fill-europe-dark" />
            </g>

            {/* VS badge in center */}
            <g className={cn(animated && 'animate-pulse-gentle')}>
                <circle cx="50" cy="55" r="10" className="fill-canvas-raised stroke-surface-border" strokeWidth="1" />
                <text x="50" y="59" textAnchor="middle" fontSize="10" fontWeight="bold" className="fill-ink">
                    VS
                </text>
            </g>

            {/* Grass */}
            <path
                d="M5 85 Q15 80 25 85 Q35 80 45 85 Q55 80 65 85 Q75 80 85 85 Q95 80 100 85"
                stroke="var(--masters)"
                strokeWidth="3"
                strokeLinecap="round"
                fill="none"
                className="opacity-50"
            />
        </svg>
    );
}

/**
 * Scorecard
 * For: No scores, scoring empty state
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
                x="15"
                y="15"
                width="70"
                height="70"
                rx="6"
                className="fill-white stroke-surface-200"
                strokeWidth="2"
            />

            {/* Header bar */}
            <rect x="15" y="15" width="70" height="14" rx="6" className="fill-masters" />
            <rect x="15" y="23" width="70" height="6" className="fill-masters" />

            {/* Score grid lines */}
            <g stroke="var(--surface-200)" strokeWidth="1">
                <line x1="25" y1="35" x2="75" y2="35" />
                <line x1="25" y1="50" x2="75" y2="50" />
                <line x1="25" y1="65" x2="75" y2="65" />
                <line x1="40" y1="35" x2="40" y2="80" />
                <line x1="55" y1="35" x2="55" y2="80" />
                <line x1="70" y1="35" x2="70" y2="80" />
            </g>

            {/* Hole numbers */}
            <g className="fill-ink-tertiary" fontSize="8" fontWeight="500">
                <text x="32" y="44" textAnchor="middle">1</text>
                <text x="47" y="44" textAnchor="middle">2</text>
                <text x="62" y="44" textAnchor="middle">3</text>
            </g>

            {/* Score marks - animated */}
            <g className={cn('fill-usa-primary', animated && 'animate-scores-fill')}>
                <circle cx="32" cy="57" r="4" />
            </g>
            <g className={cn('fill-europe-primary', animated && 'animate-scores-fill')} style={{ animationDelay: '150ms' }}>
                <circle cx="47" cy="72" r="4" />
            </g>
            <g className={cn('fill-gold', animated && 'animate-scores-fill')} style={{ animationDelay: '300ms' }}>
                <circle cx="62" cy="57" r="4" />
            </g>

            {/* Pencil */}
            <g className={cn(animated && 'animate-pencil-write')}>
                <rect x="72" y="60" width="20" height="6" rx="1" className="fill-gold" transform="rotate(-45 82 63)" />
                <polygon points="60,78 62,72 68,74" className="fill-cream" />
                <polygon points="60,78 61,76 63,77" className="fill-surface-600" />
            </g>
        </svg>
    );
}

/**
 * Golf Flag / Pin
 * For: No courses, course selection
 */
export function GolfFlagIllustration({ className, size = 'md', animated = true }: IllustrationProps) {
    return (
        <svg
            viewBox="0 0 100 100"
            className={cn(sizeClasses[size], className)}
            aria-hidden="true"
        >
            {/* Hole */}
            <ellipse cx="50" cy="85" rx="25" ry="8" className="fill-surface-200" />
            <ellipse cx="50" cy="85" rx="10" ry="4" className="fill-surface-800" />

            {/* Flag pole */}
            <line
                x1="50"
                y1="85"
                x2="50"
                y2="15"
                stroke="var(--surface-400)"
                strokeWidth="3"
                strokeLinecap="round"
            />

            {/* Flag */}
            <path
                d="M50 15 Q65 22 50 30 L50 15"
                className={cn('fill-usa-primary', animated && 'animate-flag-wave')}
            />

            {/* Ball rolling towards hole */}
            <g className={cn(animated && 'animate-ball-roll')}>
                <circle cx="20" cy="78" r="6" className="fill-white stroke-surface-300" strokeWidth="1" />
                <g className="fill-surface-200">
                    <circle cx="18" cy="76" r="1" />
                    <circle cx="22" cy="76" r="1" />
                    <circle cx="20" cy="80" r="1" />
                </g>
            </g>

            {/* Grass around hole */}
            <path
                d="M15 85 Q25 82 35 85"
                stroke="var(--masters)"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
                className="opacity-70"
            />
            <path
                d="M65 85 Q75 82 85 85"
                stroke="var(--masters)"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
                className="opacity-70"
            />
        </svg>
    );
}

/**
 * Calendar
 * For: No sessions, scheduling
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
                x="15"
                y="20"
                width="70"
                height="65"
                rx="8"
                className="fill-white stroke-surface-200"
                strokeWidth="2"
            />

            {/* Header */}
            <rect x="15" y="20" width="70" height="18" rx="8" className="fill-masters" />
            <rect x="15" y="30" width="70" height="8" className="fill-masters" />

            {/* Ring holes */}
            <circle cx="30" cy="20" r="4" className="fill-surface-100 stroke-surface-300" strokeWidth="1" />
            <circle cx="50" cy="20" r="4" className="fill-surface-100 stroke-surface-300" strokeWidth="1" />
            <circle cx="70" cy="20" r="4" className="fill-surface-100 stroke-surface-300" strokeWidth="1" />

            {/* Rings */}
            <rect x="28" y="10" width="4" height="15" rx="2" className="fill-surface-400" />
            <rect x="48" y="10" width="4" height="15" rx="2" className="fill-surface-400" />
            <rect x="68" y="10" width="4" height="15" rx="2" className="fill-surface-400" />

            {/* Day grid */}
            <g className="fill-ink-tertiary" fontSize="9">
                <text x="27" y="54">M</text>
                <text x="42" y="54">T</text>
                <text x="57" y="54">W</text>
                <text x="72" y="54">T</text>
            </g>

            {/* Golf day markers */}
            <g className={cn(animated && 'animate-stagger-fade')}>
                <circle cx="29" cy="67" r="6" className="fill-usa-primary/20 stroke-usa-primary" strokeWidth="1.5" />
                <circle cx="44" cy="67" r="6" className="fill-europe-primary/20 stroke-europe-primary" strokeWidth="1.5" />
                <circle cx="59" cy="67" r="6" className="fill-gold/20 stroke-gold" strokeWidth="1.5" />
            </g>

            {/* Golf ball icon on one day */}
            <g className={cn(animated && 'animate-pulse-gentle')}>
                <circle cx="74" cy="67" r="6" className="fill-masters" />
                <circle cx="74" cy="67" r="3" className="fill-white" />
            </g>
        </svg>
    );
}

/**
 * Podium / Leaderboard
 * For: No standings, rankings
 */
export function PodiumIllustration({ className, size = 'md', animated = true }: IllustrationProps) {
    return (
        <svg
            viewBox="0 0 100 100"
            className={cn(sizeClasses[size], className)}
            aria-hidden="true"
        >
            {/* 2nd place podium */}
            <g className={cn(animated && 'animate-podium-rise')} style={{ animationDelay: '100ms' }}>
                <rect x="15" y="55" width="22" height="30" className="fill-surface-200 stroke-surface-300" strokeWidth="1" />
                <text x="26" y="73" textAnchor="middle" fontSize="16" fontWeight="bold" className="fill-surface-500">2</text>
                {/* Player */}
                <circle cx="26" cy="42" r="8" className="fill-europe-primary" />
                <ellipse cx="26" cy="48" rx="6" ry="3" className="fill-europe-primary" />
            </g>

            {/* 1st place podium (center, tallest) */}
            <g className={cn(animated && 'animate-podium-rise')}>
                <rect x="39" y="40" width="22" height="45" className="fill-gold stroke-gold" strokeWidth="1" />
                <text x="50" y="65" textAnchor="middle" fontSize="16" fontWeight="bold" className="fill-masters">1</text>
                {/* Player with trophy */}
                <circle cx="50" cy="27" r="8" className="fill-usa-primary" />
                <ellipse cx="50" cy="33" rx="6" ry="3" className="fill-usa-primary" />
                {/* Small trophy */}
                <path d="M46 15 L46 20 Q46 24 50 26 Q54 24 54 20 L54 15 Z" className="fill-gold stroke-masters" strokeWidth="0.5" />
            </g>

            {/* 3rd place podium */}
            <g className={cn(animated && 'animate-podium-rise')} style={{ animationDelay: '200ms' }}>
                <rect x="63" y="60" width="22" height="25" className="fill-surface-200 stroke-surface-300" strokeWidth="1" />
                <text x="74" y="76" textAnchor="middle" fontSize="16" fontWeight="bold" className="fill-surface-500">3</text>
                {/* Player */}
                <circle cx="74" cy="47" r="8" className="fill-surface-400" />
                <ellipse cx="74" cy="53" rx="6" ry="3" className="fill-surface-400" />
            </g>

            {/* Confetti */}
            <g className={cn(animated && 'animate-confetti-fall')}>
                <rect x="30" y="8" width="4" height="4" rx="1" className="fill-usa-primary" transform="rotate(15 32 10)" />
                <rect x="55" y="5" width="4" height="4" rx="1" className="fill-europe-primary" transform="rotate(-20 57 7)" />
                <rect x="70" y="10" width="4" height="4" rx="1" className="fill-gold" transform="rotate(30 72 12)" />
                <circle cx="40" cy="12" r="2" className="fill-masters" />
                <circle cx="65" cy="8" r="2" className="fill-usa-secondary" />
            </g>
        </svg>
    );
}

/**
 * Golf Swing Silhouette
 * For: Onboarding, welcome screens
 */
export function GolfSwingIllustration({ className, size = 'lg', animated = true }: IllustrationProps) {
    return (
        <svg
            viewBox="0 0 100 100"
            className={cn(sizeClasses[size], className)}
            aria-hidden="true"
        >
            {/* Sun/background glow */}
            <defs>
                <radialGradient id="swing-glow" cx="70%" cy="20%" r="60%">
                    <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
                </radialGradient>
            </defs>
            <circle cx="75" cy="20" r="40" fill="url(#swing-glow)" />

            {/* Golfer silhouette in swing */}
            <g className={cn('fill-masters', animated && 'animate-swing')}>
                {/* Head */}
                <circle cx="35" cy="25" r="8" />
                {/* Body */}
                <path d="M35 33 Q32 45 38 55 L45 55 Q42 45 40 33" />
                {/* Back leg */}
                <path d="M38 55 Q35 70 30 85 L35 85 Q38 72 42 55" />
                {/* Front leg */}
                <path d="M42 55 Q48 70 52 85 L47 85 Q45 72 42 55" />
                {/* Arms & club */}
                <path d="M37 38 Q55 25 65 15" strokeWidth="4" stroke="var(--masters)" fill="none" strokeLinecap="round" />
                {/* Club head */}
                <rect x="63" y="10" width="8" height="4" rx="1" transform="rotate(-45 67 12)" />
            </g>

            {/* Ball trajectory arc */}
            <path
                d="M55 75 Q70 50 90 40"
                fill="none"
                stroke="var(--gold)"
                strokeWidth="2"
                strokeDasharray="4 4"
                className={cn(animated && 'animate-trajectory')}
                opacity="0.6"
            />

            {/* Ball */}
            <circle
                cx="90"
                cy="40"
                r="4"
                className={cn('fill-white stroke-surface-300', animated && 'animate-ball-fly')}
                strokeWidth="1"
            />

            {/* Ground */}
            <path
                d="M0 88 Q25 85 50 88 Q75 85 100 88"
                stroke="var(--masters)"
                strokeWidth="3"
                fill="none"
                opacity="0.4"
            />
        </svg>
    );
}

/**
 * Celebration / Winner
 * For: Tournament completion, achievements
 */
export function CelebrationIllustration({ className, size = 'lg', animated = true }: IllustrationProps) {
    return (
        <svg
            viewBox="0 0 100 100"
            className={cn(sizeClasses[size], className)}
            aria-hidden="true"
        >
            {/* Burst rays */}
            <g className={cn('stroke-gold', animated && 'animate-rays-spin')} strokeWidth="2" opacity="0.3">
                {[...Array(8)].map((_, i) => (
                    <line
                        key={i}
                        x1="50"
                        y1="50"
                        x2={50 + 40 * Math.cos((i * Math.PI) / 4)}
                        y2={50 + 40 * Math.sin((i * Math.PI) / 4)}
                    />
                ))}
            </g>

            {/* Central trophy */}
            <g className={cn(animated && 'animate-bounce-in')}>
                <circle cx="50" cy="50" r="25" className="fill-gold/20" />
                <path
                    d="M35 40 L35 55 Q35 65 50 70 Q65 65 65 55 L65 40 Z"
                    className="fill-gold stroke-masters"
                    strokeWidth="2"
                />
                <path d="M35 45 Q25 45 25 52 Q25 58 33 58" fill="none" className="stroke-gold" strokeWidth="3" />
                <path d="M65 45 Q75 45 75 52 Q75 58 67 58" fill="none" className="stroke-gold" strokeWidth="3" />
                <rect x="45" y="70" width="10" height="8" className="fill-gold" />
                <rect x="40" y="78" width="20" height="6" rx="1" className="fill-masters" />
                <path d="M50 48 L52 53 L57 53 L53 56 L55 61 L50 58 L45 61 L47 56 L43 53 L48 53 Z" className="fill-cream" />
            </g>

            {/* Confetti particles */}
            <g className={cn(animated && 'animate-confetti-burst')}>
                <rect x="20" y="20" width="6" height="6" rx="1" className="fill-usa-primary" transform="rotate(20 23 23)" />
                <rect x="75" y="25" width="6" height="6" rx="1" className="fill-europe-primary" transform="rotate(-15 78 28)" />
                <rect x="15" y="60" width="5" height="5" rx="1" className="fill-gold" transform="rotate(45 17 62)" />
                <rect x="80" y="65" width="5" height="5" rx="1" className="fill-masters" transform="rotate(-30 82 67)" />
                <circle cx="30" cy="35" r="3" className="fill-usa-secondary" />
                <circle cx="70" cy="30" r="3" className="fill-europe-secondary" />
                <circle cx="25" y="75" r="2" className="fill-gold" />
                <circle cx="78" cy="78" r="2" className="fill-masters" />
            </g>

            {/* Sparkles */}
            <g className={cn('fill-gold', animated && 'animate-sparkle')}>
                <path d="M85 15 L86 18 L89 19 L86 20 L85 23 L84 20 L81 19 L84 18 Z" />
                <path d="M15 25 L16 27 L18 28 L16 29 L15 31 L14 29 L12 28 L14 27 Z" />
                <path d="M88 50 L89 52 L91 53 L89 54 L88 56 L87 54 L85 53 L87 52 Z" />
            </g>
        </svg>
    );
}

/**
 * Ryder Cup Trophy
 * For: Welcome screen, champions, main branding
 * The iconic Ryder Cup trophy with golfer figure on top
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
                <radialGradient id="ryder-glow" cx="50%" cy="40%" r="50%">
                    <stop offset="0%" stopColor="var(--gold)" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="var(--gold)" stopOpacity="0" />
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

            <circle cx="50" cy="50" r="45" fill="url(#ryder-glow)" />

            {/* Main cup body */}
            <g className={cn(animated && 'animate-trophy-shine')}>
                {/* Cup bowl */}
                <path
                    d="M25 45 L25 60 Q25 80 50 85 Q75 80 75 60 L75 45 Q75 35 50 32 Q25 35 25 45 Z"
                    fill="url(#gold-gradient)"
                    stroke="#B8860B"
                    strokeWidth="1"
                />

                {/* Cup rim */}
                <ellipse cx="50" cy="45" rx="25" ry="8" fill="url(#gold-shine)" stroke="#B8860B" strokeWidth="1" />

                {/* Left handle */}
                <path
                    d="M25 50 Q10 50 10 62 Q10 74 25 74"
                    fill="none"
                    stroke="url(#gold-gradient)"
                    strokeWidth="5"
                    strokeLinecap="round"
                />

                {/* Right handle */}
                <path
                    d="M75 50 Q90 50 90 62 Q90 74 75 74"
                    fill="none"
                    stroke="url(#gold-gradient)"
                    strokeWidth="5"
                    strokeLinecap="round"
                />

                {/* Stem */}
                <path
                    d="M44 85 L44 95 L56 95 L56 85"
                    fill="url(#gold-gradient)"
                />

                {/* Base platform */}
                <ellipse cx="50" cy="97" rx="14" ry="4" fill="url(#gold-gradient)" stroke="#B8860B" strokeWidth="1" />

                {/* Base */}
                <path
                    d="M30 100 L70 100 Q72 110 70 115 L30 115 Q28 110 30 100 Z"
                    fill="url(#gold-gradient)"
                    stroke="#B8860B"
                    strokeWidth="1"
                />

                {/* Base bottom */}
                <ellipse cx="50" cy="115" rx="20" ry="5" fill="#B8860B" />

                {/* Golfer figure on top */}
                <g transform="translate(50, 28) scale(0.4)">
                    {/* Head */}
                    <circle cx="0" cy="-15" r="8" fill="#B8860B" />
                    {/* Body */}
                    <path d="M0 -7 L-5 15 L5 15 Z" fill="#B8860B" />
                    {/* Back arm with club */}
                    <path d="M-3 0 Q-20 -10 -15 -30" stroke="#B8860B" strokeWidth="3" fill="none" strokeLinecap="round" />
                    {/* Club */}
                    <path d="M-15 -30 L-10 -45" stroke="#B8860B" strokeWidth="2" fill="none" strokeLinecap="round" />
                    <rect x="-14" y="-50" width="8" height="5" rx="1" fill="#B8860B" transform="rotate(20 -10 -47)" />
                    {/* Front arm */}
                    <path d="M3 0 Q15 5 10 15" stroke="#B8860B" strokeWidth="3" fill="none" strokeLinecap="round" />
                    {/* Legs */}
                    <path d="M-3 15 L-8 35" stroke="#B8860B" strokeWidth="3" fill="none" strokeLinecap="round" />
                    <path d="M3 15 L8 35" stroke="#B8860B" strokeWidth="3" fill="none" strokeLinecap="round" />
                </g>

                {/* Decorative band on cup */}
                <path
                    d="M28 60 Q50 65 72 60"
                    fill="none"
                    stroke="#FFF8DC"
                    strokeWidth="2"
                    opacity="0.6"
                />

                {/* USA text area (left) */}
                <text x="35" y="72" fontSize="6" fontWeight="bold" fill="#B8860B" opacity="0.7">USA</text>

                {/* EUR text area (right) */}
                <text x="57" y="72" fontSize="6" fontWeight="bold" fill="#B8860B" opacity="0.7">EUR</text>

                {/* Shine effect */}
                <path
                    d="M30 50 Q35 55 30 65"
                    fill="none"
                    stroke="white"
                    strokeWidth="2"
                    strokeLinecap="round"
                    opacity="0.4"
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
