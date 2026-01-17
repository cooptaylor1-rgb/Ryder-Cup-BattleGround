/**
 * Button Component - Masters Inspired
 *
 * Primary action component with elegant styling.
 * Follows WCAG 2.2 touch target guidelines (44px minimum).
 * Masters-inspired: restrained luxury, confident, gold accents.
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
                    'font-semibold',
                    // Transitions - separate for performance
                    'transition-transform duration-150 ease-out',
                    // Enhanced interaction feedback
                    'hover:scale-[1.02] active:scale-[0.96]',
                    // Focus ring - standardized gold for consistency
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                    'focus-visible:ring-gold focus-visible:ring-offset-surface-base',
                    // Disabled states with grayscale for better visibility
                    'disabled:pointer-events-none disabled:opacity-50 disabled:grayscale',
                    'disabled:hover:scale-100',
                    'select-none',

                    // Size variants - iPhone optimized: minimum 44px touch targets per Apple HIG
                    size === 'sm' && 'h-11 px-4 text-sm rounded-lg min-w-[72px]',
                    size === 'md' && 'h-12 px-5 text-base rounded-xl min-w-[88px]',
                    size === 'lg' && 'h-14 px-6 text-lg rounded-xl min-w-[100px]',
                    size === 'icon' && 'h-12 w-12 rounded-xl p-0 min-w-0',

                    // Variant styles - Masters elegance
                    variant === 'primary' && [
                        'bg-[#006747] text-white font-semibold',
                        'hover:bg-[#1B8F6A]',
                        'shadow-md hover:shadow-lg',
                        'active:shadow-inner active:bg-[#004D35]',
                        'border border-[#004D35]/20',
                    ],

                    variant === 'secondary' && [
                        'bg-surface-elevated text-magnolia',
                        'border border-surface-border',
                        'hover:bg-surface-highlight hover:border-gold/40',
                        'shadow-sm hover:shadow-md',
                    ],

                    variant === 'ghost' && [
                        'bg-transparent text-text-secondary',
                        'hover:bg-surface-highlight hover:text-magnolia',
                    ],

                    variant === 'danger' && [
                        'bg-azalea text-white',
                        'hover:bg-azalea/90',
                        'shadow-sm hover:shadow-lg',
                        'active:shadow-inner',
                    ],

                    variant === 'outline' && [
                        'bg-transparent text-magnolia',
                        'border border-surface-border',
                        'hover:bg-surface-highlight hover:border-gold/40',
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
