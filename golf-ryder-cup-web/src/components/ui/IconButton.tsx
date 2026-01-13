/**
 * IconButton Component
 *
 * Circular icon-only button with proper accessibility.
 * Always includes aria-label for screen readers.
 */

'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export type IconButtonSize = 'sm' | 'md' | 'lg';
export type IconButtonVariant = 'default' | 'ghost' | 'outline' | 'danger';

export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    icon: ReactNode;
    'aria-label': string; // Required for accessibility
    size?: IconButtonSize;
    variant?: IconButtonVariant;
    isLoading?: boolean;
}

const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
    (
        {
            className,
            icon,
            size = 'md',
            variant = 'default',
            isLoading = false,
            disabled,
            ...props
        },
        ref
    ) => {
        const isDisabled = disabled || isLoading;

        return (
            <button
                ref={ref}
                className={cn(
                    // Base styles
                    'relative inline-flex items-center justify-center',
                    'rounded-full transition-all duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                    'focus-visible:ring-offset-surface-base',
                    'disabled:pointer-events-none disabled:opacity-50',
                    'select-none',

                    // Size variants
                    size === 'sm' && 'h-8 w-8',
                    size === 'md' && 'h-10 w-10',
                    size === 'lg' && 'h-12 w-12',

                    // Variant styles
                    variant === 'default' && [
                        'bg-surface-elevated text-text-secondary',
                        'hover:bg-surface-highlight hover:text-text-primary',
                        'active:bg-surface-muted',
                        'focus-visible:ring-surface-border',
                    ],

                    variant === 'ghost' && [
                        'bg-transparent text-text-secondary',
                        'hover:bg-surface-highlight hover:text-text-primary',
                        'active:bg-surface-elevated',
                        'focus-visible:ring-surface-border',
                    ],

                    variant === 'outline' && [
                        'bg-transparent text-text-secondary',
                        'border border-surface-border',
                        'hover:bg-surface-highlight hover:text-text-primary hover:border-surface-elevated',
                        'active:bg-surface-elevated',
                        'focus-visible:ring-augusta-green',
                    ],

                    variant === 'danger' && [
                        'bg-transparent text-error',
                        'hover:bg-error/10',
                        'active:bg-error/20',
                        'focus-visible:ring-error',
                    ],

                    className
                )}
                disabled={isDisabled}
                {...props}
            >
                {isLoading ? (
                    <Loader2
                        className={cn(
                            'animate-spin',
                            size === 'sm' && 'h-4 w-4',
                            size === 'md' && 'h-5 w-5',
                            size === 'lg' && 'h-6 w-6',
                        )}
                        aria-hidden="true"
                    />
                ) : (
                    <span
                        className={cn(
                            'flex items-center justify-center',
                            size === 'sm' && '[&>svg]:h-4 [&>svg]:w-4',
                            size === 'md' && '[&>svg]:h-5 [&>svg]:w-5',
                            size === 'lg' && '[&>svg]:h-6 [&>svg]:w-6',
                        )}
                        aria-hidden="true"
                    >
                        {icon}
                    </span>
                )}
            </button>
        );
    }
);

IconButton.displayName = 'IconButton';

export { IconButton };
export default IconButton;
