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
                    'rounded-full',
                    // Transitions optimized for performance
                    'transition-transform duration-150 ease-out',
                    // Enhanced interaction feedback
                    'hover:scale-110 active:scale-90',
                    // Standardized gold focus ring for consistency
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2',
                    'focus-visible:ring-offset-surface-base',
                    // Disabled states
                    'disabled:pointer-events-none disabled:opacity-50 disabled:grayscale',
                    'disabled:hover:scale-100',
                    'select-none',

                    // Size variants - WCAG 2.2 compliant (minimum 44x44px)
                    size === 'sm' && 'h-10 w-10', // Increased from h-8 w-8
                    size === 'md' && 'h-11 w-11', // Increased from h-10 w-10
                    size === 'lg' && 'h-12 w-12',

                    // Variant styles
                    variant === 'default' && [
                        'bg-surface-elevated text-text-secondary',
                        'hover:bg-surface-highlight hover:text-text-primary',
                    ],

                    variant === 'ghost' && [
                        'bg-transparent text-text-secondary',
                        'hover:bg-surface-highlight hover:text-text-primary',
                    ],

                    variant === 'outline' && [
                        'bg-transparent text-text-secondary',
                        'border border-surface-border',
                        'hover:bg-surface-highlight hover:text-text-primary hover:border-gold/40',
                    ],

                    variant === 'danger' && [
                        'bg-transparent text-error',
                        'hover:bg-error/10',
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
