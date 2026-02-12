/**
 * Card Component - Masters Inspired
 *
 * Elegant container with warm shadows and refined styling.
 * Understated luxury with subtle gold highlights.
 */

'use client';

import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export type CardVariant = 'default' | 'elevated' | 'outlined' | 'ghost';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
    variant?: CardVariant;
    padding?: 'none' | 'sm' | 'md' | 'lg';
    interactive?: boolean;
    selected?: boolean;
    asChild?: boolean;
}

const Card = forwardRef<HTMLDivElement, CardProps>(
    (
        {
            className,
            variant = 'default',
            padding = 'md',
            interactive = false,
            selected = false,
            children,
            ...props
        },
        ref
    ) => {
        return (
            <div
                ref={ref}
                className={cn(
                    // Base styles
                    'rounded-xl transition-all duration-200',

                    // Padding variants - iPhone optimized
                    padding === 'none' && 'p-0',
                    padding === 'sm' && 'p-4',
                    padding === 'md' && 'p-5',
                    padding === 'lg' && 'p-6',

                    // Card variants - Masters elegance
                    variant === 'default' && [
                        'bg-[var(--surface)]',
                        'shadow-card-md',
                        'border border-[var(--rule)]',
                    ],

                    variant === 'elevated' && [
                        'bg-[var(--surface-raised)]',
                        'shadow-card-lg',
                        'border border-[color:var(--rule)]/50',
                    ],

                    variant === 'outlined' && [
                        'bg-transparent',
                        'border border-[var(--rule)]',
                    ],

                    variant === 'ghost' && [
                        'bg-transparent',
                        'border border-transparent',
                    ],

                    // Interactive states - refined hover with gold accent
                    interactive && [
                        'cursor-pointer',
                        // Enhanced hover feedback
                        'hover:scale-[1.01] hover:shadow-card-lg',
                        'hover:border-gold/30',
                        // Satisfying press feedback
                        'active:scale-[0.98] active:shadow-card-sm',
                        // Consistent gold focus ring
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2',
                        // Transition for smoothness
                        'transition-all duration-150 ease-out',
                        // Ensure minimum touch target
                        'min-h-[56px]',
                    ],

                    // Selected state - gold highlight
                    selected && [
                        'border-gold/50',
                        'ring-1 ring-gold/30',
                        'shadow-glow-gold',
                    ],

                    className
                )}
                tabIndex={interactive ? 0 : undefined}
                role={interactive ? 'button' : undefined}
                {...props}
            >
                {children}
            </div>
        );
    }
);

Card.displayName = 'Card';

// Card Header subcomponent
export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
    title?: string;
    subtitle?: string;
    action?: ReactNode;
}

const CardHeader = forwardRef<HTMLDivElement, CardHeaderProps>(
    ({ className, title, subtitle, action, children, ...props }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    'flex items-start justify-between gap-4',
                    className
                )}
                {...props}
            >
                {title || subtitle ? (
                    <div className="flex-1 min-w-0">
                        {title && (
                            <h3 className="text-base font-semibold text-[var(--ink-primary)] truncate">
                                {title}
                            </h3>
                        )}
                        {subtitle && (
                            <p className="text-sm text-[var(--ink-secondary)] mt-0.5 truncate">
                                {subtitle}
                            </p>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 min-w-0">{children}</div>
                )}
                {action && (
                    <div className="shrink-0">{action}</div>
                )}
            </div>
        );
    }
);

CardHeader.displayName = 'CardHeader';

// Card Content subcomponent
const CardContent = forwardRef<
    HTMLDivElement,
    HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn('pt-3', className)}
        {...props}
    />
));

CardContent.displayName = 'CardContent';

// Card Footer subcomponent
const CardFooter = forwardRef<
    HTMLDivElement,
    HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            'flex items-center justify-end gap-2 pt-4',
            'border-t border-[color:var(--rule)]/50 mt-4',
            className
        )}
        {...props}
    />
));

CardFooter.displayName = 'CardFooter';

export { Card, CardHeader, CardContent, CardFooter };
export default Card;
