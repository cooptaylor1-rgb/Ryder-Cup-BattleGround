/**
 * Section Header Component
 *
 * Consistent section titles with optional actions.
 * Palantir-inspired: brutal hierarchy, clear structure.
 */

'use client';

import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface SectionHeaderProps {
    title: string;
    subtitle?: string;
    icon?: LucideIcon;
    action?: ReactNode;
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function SectionHeader({
    title,
    subtitle,
    icon: Icon,
    action,
    size = 'md',
    className,
}: SectionHeaderProps) {
    return (
        <div className={cn('flex items-center justify-between gap-4', className)}>
            <div className="flex items-center gap-3 min-w-0">
                {Icon && (
                    <div className={cn(
                        'flex items-center justify-center rounded-lg',
                        'bg-augusta-green/10 text-augusta-green',
                        size === 'sm' && 'h-8 w-8',
                        size === 'md' && 'h-10 w-10',
                        size === 'lg' && 'h-12 w-12',
                    )}>
                        <Icon className={cn(
                            size === 'sm' && 'h-4 w-4',
                            size === 'md' && 'h-5 w-5',
                            size === 'lg' && 'h-6 w-6',
                        )} />
                    </div>
                )}
                <div className="min-w-0">
                    <h2 className={cn(
                        'font-semibold text-text-primary truncate',
                        size === 'sm' && 'text-sm',
                        size === 'md' && 'text-base',
                        size === 'lg' && 'text-lg',
                    )}>
                        {title}
                    </h2>
                    {subtitle && (
                        <p className={cn(
                            'text-text-secondary truncate',
                            size === 'sm' && 'text-xs',
                            size === 'md' && 'text-sm',
                            size === 'lg' && 'text-sm',
                        )}>
                            {subtitle}
                        </p>
                    )}
                </div>
            </div>
            {action && (
                <div className="flex-shrink-0">
                    {action}
                </div>
            )}
        </div>
    );
}

export default SectionHeader;
