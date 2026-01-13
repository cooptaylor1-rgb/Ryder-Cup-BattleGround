/**
 * Badge / Chip Component
 *
 * Small labels for status, categories, and metadata.
 * Spotify-inspired: confident, clear, subtle personality.
 */

'use client';

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type BadgeVariant =
    | 'default'
    | 'primary'
    | 'success'
    | 'warning'
    | 'error'
    | 'info'
    | 'usa'
    | 'europe'
    | 'live';

export type BadgeSize = 'sm' | 'md';

export interface BadgeProps {
    variant?: BadgeVariant;
    size?: BadgeSize;
    dot?: boolean;
    pulse?: boolean;
    icon?: ReactNode;
    children: ReactNode;
    className?: string;
}

export function Badge({
    variant = 'default',
    size = 'sm',
    dot = false,
    pulse = false,
    icon,
    children,
    className,
}: BadgeProps) {
    return (
        <span
            className={cn(
                // Base styles
                'inline-flex items-center gap-1.5 font-medium rounded-full',
                'whitespace-nowrap select-none',

                // Size variants
                size === 'sm' && 'px-2 py-0.5 text-xs',
                size === 'md' && 'px-3 py-1 text-sm',

                // Color variants
                variant === 'default' && [
                    'bg-surface-elevated text-text-secondary',
                    'border border-surface-border',
                ],

                variant === 'primary' && [
                    'bg-augusta-green/15 text-augusta-light',
                    'border border-augusta-green/30',
                ],

                variant === 'success' && [
                    'bg-success/15 text-success-light',
                    'border border-success/30',
                ],

                variant === 'warning' && [
                    'bg-warning/15 text-warning',
                    'border border-warning/30',
                ],

                variant === 'error' && [
                    'bg-error/15 text-error-light',
                    'border border-error/30',
                ],

                variant === 'info' && [
                    'bg-info/15 text-info-light',
                    'border border-info/30',
                ],

                variant === 'usa' && [
                    'bg-team-usa/15 text-team-usa-light',
                    'border border-team-usa/30',
                ],

                variant === 'europe' && [
                    'bg-team-europe/15 text-team-europe-light',
                    'border border-team-europe/30',
                ],

                variant === 'live' && [
                    'bg-error/20 text-error-light',
                    'border border-error/30',
                ],

                className
            )}
        >
            {/* Dot indicator */}
            {dot && (
                <span
                    className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        variant === 'default' && 'bg-text-secondary',
                        variant === 'primary' && 'bg-augusta-green',
                        variant === 'success' && 'bg-success',
                        variant === 'warning' && 'bg-warning',
                        variant === 'error' && 'bg-error',
                        variant === 'info' && 'bg-info',
                        variant === 'usa' && 'bg-team-usa',
                        variant === 'europe' && 'bg-team-europe',
                        variant === 'live' && 'bg-error',
                        pulse && 'animate-pulse',
                    )}
                    aria-hidden="true"
                />
            )}

            {/* Icon */}
            {icon && (
                <span className="flex-shrink-0 [&>svg]:h-3 [&>svg]:w-3" aria-hidden="true">
                    {icon}
                </span>
            )}

            {/* Label */}
            {children}
        </span>
    );
}

/**
 * Status Badge - Preset configurations for common statuses
 */
export interface StatusBadgeProps {
    status: 'live' | 'scheduled' | 'inProgress' | 'completed' | 'dormie' | 'notStarted';
    className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
    const configs: Record<StatusBadgeProps['status'], { variant: BadgeVariant; label: string; dot?: boolean; pulse?: boolean }> = {
        live: { variant: 'live', label: 'Live', dot: true, pulse: true },
        inProgress: { variant: 'info', label: 'In Progress', dot: true },
        scheduled: { variant: 'default', label: 'Scheduled' },
        completed: { variant: 'success', label: 'Complete' },
        dormie: { variant: 'warning', label: 'Dormie', dot: true },
        notStarted: { variant: 'default', label: 'Not Started' },
    };

    const config = configs[status];

    return (
        <Badge
            variant={config.variant}
            dot={config.dot}
            pulse={config.pulse}
            className={className}
        >
            {config.label}
        </Badge>
    );
}

export default Badge;
