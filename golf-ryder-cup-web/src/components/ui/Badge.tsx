/**
 * Badge / Chip Component - Masters Inspired
 *
 * Elegant labels for status, categories, and metadata.
 * Refined styling with subtle backgrounds and warm tones.
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
                size === 'sm' && 'px-2.5 py-0.5 text-xs',
                size === 'md' && 'px-3 py-1 text-sm',

                // Color variants - Masters refined
                variant === 'default' && [
                    'bg-surface-elevated text-text-secondary',
                    'border border-surface-border',
                ],

                variant === 'primary' && [
                    'bg-masters-green/10 text-masters-green-light',
                    'border border-masters-green/20',
                ],

                variant === 'success' && [
                    'bg-masters-green/10 text-masters-green-light',
                    'border border-masters-green/20',
                ],

                variant === 'warning' && [
                    'bg-gold/10 text-gold-light',
                    'border border-gold/20',
                ],

                variant === 'error' && [
                    'bg-azalea/10 text-azalea',
                    'border border-azalea/20',
                ],

                variant === 'info' && [
                    'bg-info/15 text-info-light',
                    'border border-info/30',
                ],

                variant === 'usa' && [
                    'bg-team-usa/10 text-team-usa-light',
                    'border border-team-usa/20',
                ],

                variant === 'europe' && [
                    'bg-team-europe/10 text-team-europe-light',
                    'border border-team-europe/20',
                ],

                variant === 'live' && [
                    'bg-azalea/15 text-azalea',
                    'border border-azalea/30',
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
