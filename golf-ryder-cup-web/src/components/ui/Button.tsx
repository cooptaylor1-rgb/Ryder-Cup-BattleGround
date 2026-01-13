/**
 * Button Component
 *
 * Primary action component with multiple variants.
 * Follows WCAG 2.2 touch target guidelines (44px minimum).
 * Palantir-inspired: restrained, confident, clear hierarchy.
 */

'use client';

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
    loadingText?: string;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
    fullWidth?: boolean;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    (
        {
            className,
            variant = 'primary',
            size = 'md',
            isLoading = false,
            loadingText,
            leftIcon,
            rightIcon,
            fullWidth = false,
            disabled,
            children,
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
                    'relative inline-flex items-center justify-center gap-2',
                    'font-medium transition-all duration-150',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                    'focus-visible:ring-offset-surface-base',
                    'disabled:pointer-events-none disabled:opacity-50',
                    'select-none',

                    // Size variants
                    size === 'sm' && 'h-8 px-3 text-sm rounded-md min-w-[64px]',
                    size === 'md' && 'h-10 px-4 text-sm rounded-lg min-w-[80px]',
                    size === 'lg' && 'h-12 px-6 text-base rounded-lg min-w-[96px]',
                    size === 'icon' && 'h-10 w-10 rounded-lg p-0 min-w-0',

                    // Variant styles
                    variant === 'primary' && [
                        'bg-augusta-green text-white',
                        'hover:bg-augusta-light active:bg-primary-dark',
                        'focus-visible:ring-augusta-green',
                        'shadow-sm hover:shadow-md',
                    ],

                    variant === 'secondary' && [
                        'bg-surface-elevated text-white',
                        'border border-surface-border',
                        'hover:bg-surface-highlight active:bg-surface-muted',
                        'focus-visible:ring-surface-border',
                    ],

                    variant === 'ghost' && [
                        'bg-transparent text-text-secondary',
                        'hover:bg-surface-highlight hover:text-text-primary',
                        'active:bg-surface-elevated',
                        'focus-visible:ring-surface-border',
                    ],

                    variant === 'danger' && [
                        'bg-error text-white',
                        'hover:bg-error-dark active:bg-error-dark',
                        'focus-visible:ring-error',
                        'shadow-sm hover:shadow-md',
                    ],

                    variant === 'outline' && [
                        'bg-transparent text-text-primary',
                        'border border-surface-border',
                        'hover:bg-surface-highlight hover:border-surface-elevated',
                        'active:bg-surface-elevated',
                        'focus-visible:ring-augusta-green',
                    ],

                    // Full width
                    fullWidth && 'w-full',

                    // Loading state cursor
                    isLoading && 'cursor-wait',

                    className
                )}
                disabled={isDisabled}
                {...props}
            >
                {/* Loading spinner */}
                {isLoading && (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                )}

                {/* Left icon */}
                {!isLoading && leftIcon && (
                    <span className="flex-shrink-0" aria-hidden="true">
                        {leftIcon}
                    </span>
                )}

                {/* Label */}
                {(children || loadingText) && (
                    <span className={cn(isLoading && !loadingText && 'opacity-0')}>
                        {isLoading && loadingText ? loadingText : children}
                    </span>
                )}

                {/* Right icon */}
                {!isLoading && rightIcon && (
                    <span className="flex-shrink-0" aria-hidden="true">
                        {rightIcon}
                    </span>
                )}
            </button>
        );
    }
);

Button.displayName = 'Button';

export { Button };
export default Button;
