/**
 * Empty State Component - Masters Inspired
 *
 * Elegant, instructive empty states.
 * Refined typography and warm accents.
 */

'use client';

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from './Button';
import type { LucideIcon } from 'lucide-react';
import {
    Trophy,
    Users,
    Calendar,
    MapPin,
    BarChart3,
    Inbox,
    Plus,
    Sparkles,
    Target,
} from 'lucide-react';

export interface EmptyStateNewProps {
    icon?: LucideIcon;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
        icon?: LucideIcon;
    };
    secondaryAction?: {
        label: string;
        onClick: () => void;
    };
    variant?: 'default' | 'compact' | 'large';
    className?: string;
    children?: ReactNode;
}

export function EmptyStateNew({
    icon: Icon = Inbox,
    title,
    description,
    action,
    secondaryAction,
    variant = 'default',
    className,
    children,
}: EmptyStateNewProps) {
    return (
        <div
            className={cn(
                'flex flex-col items-center justify-center text-center',
                variant === 'compact' && 'py-8 px-4',
                variant === 'default' && 'py-12 px-6',
                variant === 'large' && 'py-16 px-8',
                className
            )}
        >
            {/* Icon container with subtle animation */}
            <div
                className={cn(
                    'relative mb-4',
                    variant === 'large' && 'mb-6',
                )}
            >
                {/* Glow effect - Masters gold */}
                <div
                    className={cn(
                        'absolute inset-0 rounded-full blur-xl opacity-10',
                        'bg-gold',
                    )}
                    aria-hidden="true"
                />

                {/* Icon circle */}
                <div
                    className={cn(
                        'relative flex items-center justify-center rounded-2xl',
                        'bg-surface-elevated border border-surface-border',
                        variant === 'compact' && 'h-12 w-12',
                        variant === 'default' && 'h-16 w-16',
                        variant === 'large' && 'h-20 w-20',
                    )}
                >
                    <Icon
                        className={cn(
                            'text-text-tertiary',
                            variant === 'compact' && 'h-6 w-6',
                            variant === 'default' && 'h-8 w-8',
                            variant === 'large' && 'h-10 w-10',
                        )}
                    />
                </div>
            </div>

            {/* Title - Serif */}
            <h3
                className={cn(
                    'font-serif font-semibold text-magnolia',
                    variant === 'compact' && 'text-base',
                    variant === 'default' && 'text-lg',
                    variant === 'large' && 'text-xl',
                )}
            >
                {title}
            </h3>

            {/* Description */}
            {description && (
                <p
                    className={cn(
                        'text-text-secondary mt-2 max-w-sm',
                        variant === 'compact' && 'text-sm',
                        variant === 'default' && 'text-sm',
                        variant === 'large' && 'text-base',
                    )}
                >
                    {description}
                </p>
            )}

            {/* Actions */}
            {(action || secondaryAction || children) && (
                <div
                    className={cn(
                        'flex flex-col sm:flex-row items-center gap-3',
                        variant === 'compact' && 'mt-4',
                        variant === 'default' && 'mt-6',
                        variant === 'large' && 'mt-8',
                    )}
                >
                    {action && (
                        <Button
                            onClick={action.onClick}
                            leftIcon={action.icon && <action.icon className="h-4 w-4" />}
                            size={variant === 'large' ? 'lg' : 'md'}
                        >
                            {action.label}
                        </Button>
                    )}
                    {secondaryAction && (
                        <Button
                            variant="ghost"
                            onClick={secondaryAction.onClick}
                            size={variant === 'large' ? 'lg' : 'md'}
                        >
                            {secondaryAction.label}
                        </Button>
                    )}
                    {children}
                </div>
            )}
        </div>
    );
}

// ============================================
// PRE-BUILT EMPTY STATES
// ============================================

export function NoTripsEmptyNew({ onCreateTrip }: { onCreateTrip: () => void }) {
    return (
        <EmptyStateNew
            icon={Trophy}
            title="No trips yet"
            description="Start your golf adventure! Create a trip to begin tracking your Ryder Cup style matches."
            action={{
                label: 'Create trip',
                onClick: onCreateTrip,
                icon: Plus,
            }}
            variant="large"
        />
    );
}

export function NoMatchesEmptyNew({ onSetupMatchups }: { onSetupMatchups: () => void }) {
    return (
        <EmptyStateNew
            icon={Users}
            title="No matches scheduled"
            description="Set up your matchups to start scoring. You'll be tracking points in no time!"
            action={{
                label: 'Set up matchups',
                onClick: onSetupMatchups,
                icon: Plus,
            }}
        />
    );
}

export function NoSessionsEmptyNew({
    isCaptain,
    onCreateSession,
}: {
    isCaptain: boolean;
    onCreateSession: () => void;
}) {
    return (
        <EmptyStateNew
            icon={Calendar}
            title="No sessions yet"
            description={
                isCaptain
                    ? "Create a session to organize your matches by day and format."
                    : "No sessions have been created yet. Ask your captain to set things up!"
            }
            action={
                isCaptain
                    ? {
                        label: 'Create session',
                        onClick: onCreateSession,
                        icon: Plus,
                    }
                    : undefined
            }
        />
    );
}

export function NoPlayersEmptyNew({ onAddPlayer }: { onAddPlayer: () => void }) {
    return (
        <EmptyStateNew
            icon={Users}
            title="No players added"
            description="Add players to your trip roster. You'll need at least 2 players per team to start."
            action={{
                label: 'Add player',
                onClick: onAddPlayer,
                icon: Plus,
            }}
        />
    );
}

export function NoStandingsEmptyNew() {
    return (
        <EmptyStateNew
            icon={BarChart3}
            title="No standings data"
            description="Complete some matches to see the leaderboard. Every point counts!"
            variant="compact"
        />
    );
}

export function NoCoursesEmptyNew({ onSearchCourses }: { onSearchCourses: () => void }) {
    return (
        <EmptyStateNew
            icon={MapPin}
            title="No courses saved"
            description="Search for golf courses to add them to your trip. Course data helps with scoring."
            action={{
                label: 'Search courses',
                onClick: onSearchCourses,
                icon: Sparkles,
            }}
        />
    );
}

export function NoScoresEmptyNew({ onStartScoring }: { onStartScoring: () => void }) {
    return (
        <EmptyStateNew
            icon={Target}
            title="Ready to score"
            description="Tap a match to start recording hole-by-hole results. The standings update live!"
            action={{
                label: 'Start scoring',
                onClick: onStartScoring,
            }}
            variant="compact"
        />
    );
}

export default EmptyStateNew;
