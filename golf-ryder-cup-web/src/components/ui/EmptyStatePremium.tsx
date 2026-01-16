/**
 * Premium Empty State Component
 *
 * World-class empty states with beautiful illustrations,
 * animations, and contextual guidance. Makes "nothing here"
 * feel like an invitation, not a dead end.
 */

'use client';

import { type ReactNode, type ComponentType } from 'react';
import { cn } from '@/lib/utils';
import {
    GolfBallTee,
    TrophyIllustration,
    GolfersIllustration,
    ScorecardIllustration,
    GolfFlagIllustration,
    CalendarIllustration,
    PodiumIllustration,
    GolfSwingIllustration,
    CelebrationIllustration,
} from './illustrations';
import { Plus, ArrowRight, Sparkles, Trophy, Users, Calendar, MapPin, Target, Check, DollarSign, MessageCircle, Camera, RefreshCw } from 'lucide-react';

// ============================================
// TYPES
// ============================================

type IllustrationType =
    | 'golf-ball'
    | 'trophy'
    | 'golfers'
    | 'scorecard'
    | 'flag'
    | 'calendar'
    | 'podium'
    | 'swing'
    | 'celebration';

interface FeatureHint {
    icon?: ReactNode;
    text: string;
}

interface EmptyStatePremiumProps {
    illustration?: IllustrationType;
    customIllustration?: ReactNode;
    title: string;
    description?: string;
    hint?: string;
    features?: FeatureHint[];
    action?: {
        label: string;
        onClick: () => void;
        icon?: ReactNode;
    };
    secondaryAction?: {
        label: string;
        onClick: () => void;
    };
    variant?: 'default' | 'compact' | 'large';
    animated?: boolean;
    className?: string;
    children?: ReactNode;
}

// ============================================
// ILLUSTRATION MAP
// ============================================

const illustrationMap: Record<IllustrationType, ComponentType<{ size?: 'sm' | 'md' | 'lg' | 'xl'; animated?: boolean }>> = {
    'golf-ball': GolfBallTee,
    'trophy': TrophyIllustration,
    'golfers': GolfersIllustration,
    'scorecard': ScorecardIllustration,
    'flag': GolfFlagIllustration,
    'calendar': CalendarIllustration,
    'podium': PodiumIllustration,
    'swing': GolfSwingIllustration,
    'celebration': CelebrationIllustration,
};

// ============================================
// MAIN COMPONENT
// ============================================

export function EmptyStatePremium({
    illustration = 'golf-ball',
    customIllustration,
    title,
    description,
    hint,
    features,
    action,
    secondaryAction,
    variant = 'default',
    animated = true,
    className,
    children,
}: EmptyStatePremiumProps) {
    const IllustrationComponent = illustrationMap[illustration];
    const illustrationSize = variant === 'compact' ? 'md' : variant === 'large' ? 'xl' : 'lg';

    return (
        <div
            className={cn(
                'empty-state-premium',
                variant,
                className
            )}
        >
            {/* Illustration */}
            <div className="empty-state-illustration">
                {customIllustration || (
                    <IllustrationComponent size={illustrationSize} animated={animated} />
                )}
            </div>

            {/* Title */}
            <h3 className="empty-state-title">{title}</h3>

            {/* Description */}
            {description && (
                <p className="empty-state-text">{description}</p>
            )}

            {/* Feature hints */}
            {features && features.length > 0 && (
                <div className="empty-state-features">
                    {features.map((feature, index) => (
                        <div key={index} className="empty-state-feature">
                            <span className="empty-state-feature-icon">
                                {feature.icon || <Check className="w-3 h-3" />}
                            </span>
                            <span>{feature.text}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Primary action */}
            {action && (
                <button
                    onClick={action.onClick}
                    className="empty-state-action press-scale"
                >
                    {action.icon}
                    {action.label}
                </button>
            )}

            {/* Secondary action */}
            {secondaryAction && (
                <button
                    onClick={secondaryAction.onClick}
                    className="empty-state-action-secondary press-scale-sm"
                >
                    {secondaryAction.label}
                    <ArrowRight className="w-4 h-4" />
                </button>
            )}

            {/* Hint text */}
            {hint && (
                <p className="empty-state-hint">{hint}</p>
            )}

            {/* Custom children */}
            {children}
        </div>
    );
}

// ============================================
// PRE-BUILT EMPTY STATES
// Best-in-class experiences for common scenarios
// ============================================

/**
 * No Tournaments Yet
 * First thing users see - make it inviting!
 */
export function NoTournamentsEmpty({
    onCreateTrip,
    onJoinTrip
}: {
    onCreateTrip: () => void;
    onJoinTrip?: () => void;
}) {
    return (
        <EmptyStatePremium
            illustration="trophy"
            title="Your golf adventure awaits"
            description="Create a new trip or join one your captain has set up."
            features={[
                { text: 'Track match play scoring' },
                { text: 'See live leaderboards' },
                { text: 'Crown trip champions' },
            ]}
            action={{
                label: 'Create Your First Trip',
                onClick: onCreateTrip,
                icon: <Plus className="w-5 h-5" />,
            }}
            secondaryAction={onJoinTrip ? {
                label: 'Join a Trip',
                onClick: onJoinTrip,
            } : undefined}
            hint="Got an invite code? Tap 'Join a Trip'"
            variant="large"
        />
    );
}

/**
 * No Matches Yet
 * Players added, now need matchups
 */
export function NoMatchesEmpty({ onSetupMatchups }: { onSetupMatchups: () => void }) {
    return (
        <EmptyStatePremium
            illustration="golfers"
            title="Time to tee it up"
            description="Set up your matchups to start the competition. Pair players head-to-head or in teams."
            action={{
                label: 'Create Matchups',
                onClick: onSetupMatchups,
                icon: <Users className="w-5 h-5" />,
            }}
        />
    );
}

/**
 * No Sessions Yet
 * Tournament exists but no days scheduled
 */
export function NoSessionsEmpty({
    isCaptain,
    onCreateSession,
}: {
    isCaptain: boolean;
    onCreateSession: () => void;
}) {
    return (
        <EmptyStatePremium
            illustration="calendar"
            title={isCaptain ? "Plan your golf days" : "Sessions coming soon"}
            description={
                isCaptain
                    ? "Organize matches by day. Each session can have different formats and matchups."
                    : "Your captain is setting up the schedule. Check back soon!"
            }
            action={
                isCaptain
                    ? {
                        label: 'Add First Session',
                        onClick: onCreateSession,
                        icon: <Calendar className="w-5 h-5" />,
                    }
                    : undefined
            }
            hint={isCaptain ? "Try: Day 1 - Four-ball, Day 2 - Singles" : undefined}
        />
    );
}

/**
 * No Players Yet
 * Trip created but no roster
 */
export function NoPlayersEmpty({ onAddPlayer }: { onAddPlayer?: () => void }) {
    return (
        <EmptyStatePremium
            illustration="golfers"
            title="Build your teams"
            description={onAddPlayer
                ? "Add players to create your USA and Europe rosters. Each player can have their handicap tracked."
                : "Enable Captain Mode to add players to your teams."
            }
            action={onAddPlayer ? {
                label: 'Add First Player',
                onClick: onAddPlayer,
                icon: <Plus className="w-5 h-5" />,
            } : undefined}
            features={onAddPlayer ? [
                { text: 'Track individual stats' },
                { text: 'Handicap calculations' },
                { text: 'Player leaderboards' },
            ] : undefined}
        />
    );
}

/**
 * No Standings Yet
 * Tournament started but no completed matches
 */
export function NoStandingsEmpty() {
    return (
        <EmptyStatePremium
            illustration="podium"
            title="Standings update live"
            description="As matches are scored, team standings and individual stats will appear here."
            variant="compact"
            hint="Score a match to see the leaderboard"
        />
    );
}

/**
 * No Courses Yet
 * Trip needs courses added
 */
export function NoCoursesEmpty({ onSearchCourses }: { onSearchCourses: () => void }) {
    return (
        <EmptyStatePremium
            illustration="flag"
            title="Find your fairways"
            description="Add courses to your trip. Search our database or enter details manually."
            action={{
                label: 'Find Courses',
                onClick: onSearchCourses,
                icon: <MapPin className="w-5 h-5" />,
            }}
        />
    );
}

/**
 * No Scores Yet
 * Match exists but hasn't been scored
 */
export function NoScoresEmpty({ onStartScoring }: { onStartScoring: () => void }) {
    return (
        <EmptyStatePremium
            illustration="scorecard"
            title="Ready when you are"
            description="Tap a match below to start recording scores hole by hole."
            action={{
                label: 'Start Scoring',
                onClick: onStartScoring,
                icon: <Target className="w-5 h-5" />,
            }}
            variant="compact"
        />
    );
}

/**
 * Search No Results
 * Generic empty search state
 */
export function NoSearchResultsEmpty({
    query,
    onClear,
}: {
    query: string;
    onClear?: () => void;
}) {
    return (
        <EmptyStatePremium
            illustration="flag"
            title="No matches found"
            description={`We couldn't find anything for "${query}". Try a different search term.`}
            secondaryAction={
                onClear
                    ? {
                        label: 'Clear search',
                        onClick: onClear,
                    }
                    : undefined
            }
            variant="compact"
        />
    );
}

/**
 * Tournament Complete
 * All matches finished - celebration time!
 */
export function TournamentCompleteEmpty({
    winner,
    onViewAwards,
}: {
    winner: 'USA' | 'Europe' | 'Tie';
    onViewAwards?: () => void;
}) {
    const winnerText = winner === 'Tie' ? "It's a tie!" : `${winner} wins!`;

    return (
        <EmptyStatePremium
            illustration="celebration"
            title={winnerText}
            description="What an incredible tournament! View the full awards and statistics."
            action={
                onViewAwards
                    ? {
                        label: 'View Awards',
                        onClick: onViewAwards,
                        icon: <Trophy className="w-5 h-5" />,
                    }
                    : undefined
            }
            variant="large"
        />
    );
}

/**
 * Offline State
 * When user is offline
 */
export function OfflineEmpty() {
    return (
        <EmptyStatePremium
            illustration="golf-ball"
            title="You're offline"
            description="Some features need an internet connection. Your data is saved locally."
            variant="compact"
            hint="We'll sync when you're back online"
        />
    );
}

/**
 * Error State
 * When something goes wrong
 */
export function ErrorEmpty({
    message,
    onRetry,
}: {
    message?: string;
    onRetry?: () => void;
}) {
    return (
        <EmptyStatePremium
            illustration="flag"
            title="Something went wrong"
            description={message || "We hit a rough patch. Please try again."}
            action={
                onRetry
                    ? {
                        label: 'Try Again',
                        onClick: onRetry,
                        icon: <RefreshCw className="w-5 h-5" />,
                    }
                    : undefined
            }
            variant="compact"
        />
    );
}

/**
 * No Side Bets Yet
 * Encourage fun side action
 */
export function NoBetsEmpty({
    onAddBet,
    isActive = true,
}: {
    onAddBet?: () => void;
    isActive?: boolean;
}) {
    return (
        <EmptyStatePremium
            illustration="trophy"
            title={isActive ? "Make it interesting" : "No completed bets"}
            description={
                isActive
                    ? "Add side bets for skins, closest to pin, long drives, and more. Make every hole count!"
                    : "Completed bets and winners will appear here."
            }
            features={isActive ? [
                { icon: <DollarSign className="w-3 h-3" />, text: 'Skins games & Nassau' },
                { icon: <Target className="w-3 h-3" />, text: 'Closest to pin' },
                { icon: <Trophy className="w-3 h-3" />, text: 'Long drive contests' },
            ] : undefined}
            action={
                isActive && onAddBet
                    ? {
                        label: 'Add First Bet',
                        onClick: onAddBet,
                        icon: <Plus className="w-5 h-5" />,
                    }
                    : undefined
            }
            hint={isActive ? "Keep it friendly, keep it fun" : undefined}
            variant={isActive ? 'default' : 'compact'}
        />
    );
}

/**
 * No Messages Yet
 * Social/chat empty state
 */
export function NoMessagesEmpty({
    onStartChat,
}: {
    onStartChat?: () => void;
}) {
    return (
        <EmptyStatePremium
            illustration="golfers"
            title="The 19th hole awaits"
            description="Start the conversation! Talk smack, celebrate big shots, and keep the banter going."
            features={[
                { icon: <MessageCircle className="w-3 h-3" />, text: 'Team trash talk' },
                { icon: <Sparkles className="w-3 h-3" />, text: 'React to big moments' },
                { icon: <Trophy className="w-3 h-3" />, text: 'Celebrate victories' },
            ]}
            action={
                onStartChat
                    ? {
                        label: 'Start Talking',
                        onClick: onStartChat,
                        icon: <MessageCircle className="w-5 h-5" />,
                    }
                    : undefined
            }
            hint="What happens on the course, stays on the app"
        />
    );
}

/**
 * No Photos Yet
 * Photo gallery empty state
 */
export function NoPhotosEmpty({
    onUploadPhoto,
}: {
    onUploadPhoto?: () => void;
}) {
    return (
        <EmptyStatePremium
            illustration="celebration"
            title="Capture the memories"
            description="Upload photos from your golf trip. Great shots, funny moments, and everything in between!"
            features={[
                { icon: <Camera className="w-3 h-3" />, text: 'Share course photos' },
                { icon: <Users className="w-3 h-3" />, text: 'Team moments' },
                { icon: <Trophy className="w-3 h-3" />, text: 'Victory celebrations' },
            ]}
            action={
                onUploadPhoto
                    ? {
                        label: 'Upload Photo',
                        onClick: onUploadPhoto,
                        icon: <Camera className="w-5 h-5" />,
                    }
                    : undefined
            }
            hint="Every great trip deserves great photos"
        />
    );
}

/**
 * No Activity Yet
 * Activity feed empty state
 */
export function NoActivityEmpty() {
    return (
        <EmptyStatePremium
            illustration="golf-ball"
            title="Activity starts here"
            description="As scores are recorded and matches progress, live updates will appear here."
            variant="compact"
            hint="Play a hole to see it come alive"
        />
    );
}

/**
 * Loading State
 * While content is being fetched
 */
export function LoadingEmpty({
    message,
}: {
    message?: string;
}) {
    return (
        <EmptyStatePremium
            illustration="swing"
            title={message || "Loading..."}
            description="Getting everything ready for you."
            variant="compact"
            animated={true}
        />
    );
}

export default EmptyStatePremium;
