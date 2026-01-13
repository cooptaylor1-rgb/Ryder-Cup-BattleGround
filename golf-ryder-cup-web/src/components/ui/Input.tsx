/**
 * Input Component
 *
 * Text input with consistent styling.
 * Supports labels, hints, errors, and icons.
 */

'use client';

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    hint?: string;
    error?: string;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
    fullWidth?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
    (
        {
            className,
            label,
            hint,
            error,
            leftIcon,
            rightIcon,
            fullWidth = true,
            id,
            disabled,
            ...props
        },
        ref
    ) => {
        const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

        return (
            <div className={cn(fullWidth && 'w-full')}>
                {/* Label */}
                {label && (
                    <label
                        htmlFor={inputId}
                        className={cn(
                            'block text-sm font-medium text-text-secondary mb-1.5',
                            disabled && 'opacity-50',
                        )}
                    >
                        {label}
                    </label>
                )}

                {/* Input wrapper */}
                <div className="relative">
                    {/* Left icon */}
                    {leftIcon && (
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none">
                            <span className="[&>svg]:h-4 [&>svg]:w-4">{leftIcon}</span>
                        </div>
                    )}

                    {/* Input */}
                    <input
                        ref={ref}
                        id={inputId}
                        disabled={disabled}
                        className={cn(
                            // Base styles
                            'block w-full rounded-lg',
                            'bg-surface-elevated border border-surface-border',
                            'text-sm text-text-primary placeholder:text-text-tertiary',
                            'transition-colors duration-150',

                            // Sizing
                            'h-10 px-3',
                            leftIcon && 'pl-10',
                            rightIcon && 'pr-10',

                            // Focus state
                            'focus:outline-none focus:ring-2 focus:ring-augusta-green focus:border-transparent',

                            // Error state
                            error && [
                                'border-error focus:ring-error',
                                'text-error placeholder:text-error/60',
                            ],

                            // Disabled state
                            disabled && 'opacity-50 cursor-not-allowed',

                            className
                        )}
                        aria-invalid={error ? 'true' : undefined}
                        aria-describedby={
                            error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
                        }
                        {...props}
                    />

                    {/* Right icon */}
                    {rightIcon && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-text-tertiary pointer-events-none">
                            <span className="[&>svg]:h-4 [&>svg]:w-4">{rightIcon}</span>
                        </div>
                    )}
                </div>

                {/* Hint or Error */}
                {(hint || error) && (
                    <p
                        id={error ? `${inputId}-error` : `${inputId}-hint`}
                        className={cn(
                            'mt-1.5 text-xs',
                            error ? 'text-error' : 'text-text-tertiary',
                        )}
                    >
                        {error || hint}
                    </p>
                )}
            </div>
        );
    }
);

Input.displayName = 'Input';

export { Input };
export default Input;
