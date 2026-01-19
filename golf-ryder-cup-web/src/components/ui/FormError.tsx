/**
 * FormError Component
 *
 * Accessible form error/validation messages with aria-live regions.
 * Announces errors to screen readers without interrupting user flow.
 *
 * Design principles:
 * - Uses aria-live="polite" for non-intrusive announcements
 * - Clear visual styling for error states
 * - Supports both inline and summary error displays
 */

'use client';

import { type ReactNode, useId } from 'react';
import { cn } from '@/lib/utils';
import { AlertCircle, AlertTriangle, CheckCircle, Info } from 'lucide-react';

export type FormErrorVariant = 'error' | 'warning' | 'success' | 'info';

export interface FormErrorProps {
    /** The error message to display */
    message?: string | null;
    /** Array of error messages for form summary */
    messages?: string[];
    /** Variant determines styling and icon */
    variant?: FormErrorVariant;
    /** Additional CSS classes */
    className?: string;
    /** Whether to show the icon */
    showIcon?: boolean;
    /** Custom ID for aria-describedby linking */
    id?: string;
    /** Children content (alternative to message prop) */
    children?: ReactNode;
    /**
     * aria-live politeness level
     * - 'polite': Waits for user to pause before announcing (default)
     * - 'assertive': Interrupts immediately (use sparingly)
     */
    ariaLive?: 'polite' | 'assertive';
    /** aria-atomic - announce entire region or just changes */
    ariaAtomic?: boolean;
}

const variantConfig = {
    error: {
        icon: AlertCircle,
        containerClass: 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800',
        textClass: 'text-red-700 dark:text-red-400',
        iconClass: 'text-red-500 dark:text-red-400',
    },
    warning: {
        icon: AlertTriangle,
        containerClass: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800',
        textClass: 'text-amber-700 dark:text-amber-400',
        iconClass: 'text-amber-500 dark:text-amber-400',
    },
    success: {
        icon: CheckCircle,
        containerClass: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800',
        textClass: 'text-green-700 dark:text-green-400',
        iconClass: 'text-green-500 dark:text-green-400',
    },
    info: {
        icon: Info,
        containerClass: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
        textClass: 'text-blue-700 dark:text-blue-400',
        iconClass: 'text-blue-500 dark:text-blue-400',
    },
};

/**
 * Inline form field error message
 *
 * Use below form inputs to display validation errors.
 * Links to input via aria-describedby.
 */
export function FormError({
    message,
    messages,
    variant = 'error',
    className,
    showIcon = true,
    id,
    children,
    ariaLive = 'polite',
    ariaAtomic = true,
}: FormErrorProps) {
    const generatedId = useId();
    const errorId = id || `form-error-${generatedId}`;
    const config = variantConfig[variant];
    const Icon = config.icon;

    // Don't render if no content
    const hasContent = message || (messages && messages.length > 0) || children;
    if (!hasContent) {
        // Return empty live region so screen readers don't announce removal
        return (
            <div
                id={errorId}
                role="alert"
                aria-live={ariaLive}
                aria-atomic={ariaAtomic}
                className="sr-only"
            />
        );
    }

    // Single message or children
    if (message || children) {
        return (
            <div
                id={errorId}
                role="alert"
                aria-live={ariaLive}
                aria-atomic={ariaAtomic}
                className={cn(
                    'flex items-start gap-2 text-sm mt-1.5',
                    config.textClass,
                    className
                )}
            >
                {showIcon && (
                    <Icon
                        className={cn('w-4 h-4 flex-shrink-0 mt-0.5', config.iconClass)}
                        aria-hidden="true"
                    />
                )}
                <span>{children || message}</span>
            </div>
        );
    }

    // Multiple messages (form summary)
    if (messages && messages.length > 0) {
        return (
            <div
                id={errorId}
                role="alert"
                aria-live={ariaLive}
                aria-atomic={ariaAtomic}
                className={cn(
                    'rounded-lg border p-3 text-sm',
                    config.containerClass,
                    className
                )}
            >
                <div className={cn('flex items-start gap-2', config.textClass)}>
                    {showIcon && (
                        <Icon
                            className={cn('w-4 h-4 flex-shrink-0 mt-0.5', config.iconClass)}
                            aria-hidden="true"
                        />
                    )}
                    <div className="flex-1">
                        <p className="font-medium">
                            {variant === 'error' && 'Please fix the following errors:'}
                            {variant === 'warning' && 'Please review the following:'}
                            {variant === 'success' && 'Success!'}
                            {variant === 'info' && 'Note:'}
                        </p>
                        <ul className="list-disc list-inside mt-1 space-y-0.5">
                            {messages.map((msg, index) => (
                                <li key={index}>{msg}</li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        );
    }

    return null;
}

/**
 * Form field hint text
 *
 * Provides accessible hint/help text for form fields.
 * Links to input via aria-describedby.
 */
export interface FormHintProps {
    /** The hint message */
    message: string;
    /** Additional CSS classes */
    className?: string;
    /** Custom ID for aria-describedby linking */
    id?: string;
}

export function FormHint({ message, className, id }: FormHintProps) {
    const generatedId = useId();
    const hintId = id || `form-hint-${generatedId}`;

    return (
        <p
            id={hintId}
            className={cn(
                'text-sm mt-1.5',
                'text-slate-500 dark:text-slate-400',
                className
            )}
        >
            {message}
        </p>
    );
}

/**
 * Accessible form error summary
 *
 * Displays at top of form when submission fails.
 * Focuses automatically for screen reader announcement.
 */
export interface FormErrorSummaryProps {
    /** Title for the error summary */
    title?: string;
    /** Array of error messages */
    errors: Array<{
        field?: string;
        message: string;
    }>;
    /** Additional CSS classes */
    className?: string;
    /** Reference to focus the summary */
    focusRef?: React.RefObject<HTMLDivElement | null>;
}

export function FormErrorSummary({
    title = 'There were errors with your submission',
    errors,
    className,
    focusRef,
}: FormErrorSummaryProps) {
    if (errors.length === 0) return null;

    return (
        <div
            ref={focusRef}
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
            tabIndex={-1}
            className={cn(
                'rounded-xl border p-4',
                'bg-red-50 dark:bg-red-950/30',
                'border-red-200 dark:border-red-800',
                'focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2',
                className
            )}
        >
            <div className="flex items-start gap-3">
                <AlertCircle
                    className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
                    aria-hidden="true"
                />
                <div className="flex-1">
                    <h2 className="text-base font-semibold text-red-700 dark:text-red-400">
                        {title}
                    </h2>
                    <ul className="mt-2 space-y-1">
                        {errors.map((error, index) => (
                            <li
                                key={index}
                                className="text-sm text-red-600 dark:text-red-400"
                            >
                                {error.field && (
                                    <span className="font-medium">{error.field}: </span>
                                )}
                                {error.message}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    );
}

/**
 * Live region for status updates
 *
 * Invisible to sighted users but announced to screen readers.
 * Use for form submission status, loading states, etc.
 */
export interface LiveRegionProps {
    /** The message to announce */
    message: string;
    /** Politeness level */
    ariaLive?: 'polite' | 'assertive';
    /** Additional CSS classes (element is sr-only by default) */
    className?: string;
}

export function LiveRegion({
    message,
    ariaLive = 'polite',
    className,
}: LiveRegionProps) {
    return (
        <div
            role="status"
            aria-live={ariaLive}
            aria-atomic="true"
            className={cn('sr-only', className)}
        >
            {message}
        </div>
    );
}

export default FormError;
