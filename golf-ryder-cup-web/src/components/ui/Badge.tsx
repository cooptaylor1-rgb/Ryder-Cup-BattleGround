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
                    'bg-[var(--surface-secondary)] text-[var(--ink-secondary)]',
                    'border border-[var(--rule)]',
                ],

                variant === 'primary' && [
                    'bg-[color:var(--masters)]/12 text-[var(--masters)]',
                    'border border-[color:var(--masters)]/25',
                ],

                variant === 'success' && [
                    'bg-[color:var(--success)]/15 text-[var(--success)]',
                    'border border-[color:var(--success)]/25',
                ],

                variant === 'warning' && [
                    'bg-[color:var(--warning)]/12 text-[var(--warning)]',
                    'border border-[color:var(--warning)]/25',
                ],

                variant === 'error' && [
                    'bg-[color:var(--error)]/12 text-[var(--error)]',
                    'border border-[color:var(--error)]/25',
                ],

                variant === 'info' && [
                    'bg-[color:var(--info)]/12 text-[var(--info)]',
                    'border border-[color:var(--info)]/25',
                ],

                variant === 'usa' && [
                    'bg-[color:var(--team-usa)]/12 text-[var(--team-usa)]',
                    'border border-[color:var(--team-usa)]/25',
                ],

                variant === 'europe' && [
                    'bg-[color:var(--team-europe)]/12 text-[var(--team-europe)]',
                    'border border-[color:var(--team-europe)]/25',
                ],

                variant === 'live' && [
                    'bg-[color:var(--error)]/12 text-[var(--error)]',
                    'border border-[color:var(--error)]/30',
                ],

                className
            )}
        >
            {/* Dot indicator */}
            {dot && (
                <span
                    className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        variant === 'default' && 'bg-[var(--ink-tertiary)]',
                        variant === 'primary' && 'bg-[var(--masters)]',
                        variant === 'success' && 'bg-[var(--success)]',
                        variant === 'warning' && 'bg-[var(--warning)]',
                        variant === 'error' && 'bg-[var(--error)]',
                        variant === 'info' && 'bg-[var(--info)]',
                        variant === 'usa' && 'bg-[var(--team-usa)]',
                        variant === 'europe' && 'bg-[var(--team-europe)]',
                        variant === 'live' && 'bg-[var(--error)]',
                        pulse && 'animate-pulse',
                    )}
                    aria-hidden="true"
                />
            )}

            {/* Icon */}
            {icon && (
                <span className="shrink-0 [&>svg]:h-3 [&>svg]:w-3" aria-hidden="true">
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
