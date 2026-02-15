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

const variantConfig: Record<FormErrorVariant, {
    icon: typeof AlertCircle;
    iconClass: string;
    containerClass: string;
    headingClass: string;
}> = {
    error: {
        icon: AlertCircle,
        iconClass: 'text-[var(--error)]',
        containerClass: 'bg-[color:var(--error)]/12 border border-[color:var(--error)]/25',
        headingClass: 'text-[var(--error)]',
    },
    warning: {
        icon: AlertTriangle,
        iconClass: 'text-[var(--warning)]',
        containerClass: 'bg-[color:var(--warning)]/12 border border-[color:var(--warning)]/25',
        headingClass: 'text-[var(--warning)]',
    },
    success: {
        icon: CheckCircle,
        iconClass: 'text-[var(--success)]',
        containerClass: 'bg-[color:var(--success)]/12 border border-[color:var(--success)]/25',
        headingClass: 'text-[var(--success)]',
    },
    info: {
        icon: Info,
        iconClass: 'text-[var(--info)]',
        containerClass: 'bg-[color:var(--info)]/12 border border-[color:var(--info)]/25',
        headingClass: 'text-[var(--info)]',
    },
};

const summaryLeadCopy: Record<FormErrorVariant, string> = {
    error: 'Please fix the following errors:',
    warning: 'Please review the following:',
    success: 'Success!',
    info: 'Note:',
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
                    'flex items-start gap-2 text-sm mt-1.5 text-[var(--ink-secondary)]',
                    className
                )}
            >
                {showIcon && (
                    <Icon
                        className={cn('w-4 h-4 shrink-0 mt-0.5', config.iconClass)}
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
                    'rounded-lg p-3 text-sm space-y-1',
                    config.containerClass,
                    className
                )}
            >
                <div className="flex items-start gap-2 text-[var(--ink-secondary)]">
                    {showIcon && (
                        <Icon
                            className={cn('w-4 h-4 shrink-0 mt-0.5', config.iconClass)}
                            aria-hidden="true"
                        />
                    )}
                    <div className="flex-1">
                        <p className={cn('font-medium text-[var(--ink-primary)]', config.headingClass)}>
                            {summaryLeadCopy[variant]}
                        </p>
                        <ul className="list-disc list-inside mt-1 space-y-0.5">
                            {messages.map((msg, index) => (
                                <li key={index} className="text-[var(--ink-secondary)]">
                                    {msg}
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </div>
        );
    }

    // Fallback: keep a stable live region even if we somehow reach here.
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
                'text-[var(--ink-tertiary)]',
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
                'bg-[color:var(--error)]/12 border-[color:var(--error)]/30',
                'focus:outline-none focus:ring-2 focus:ring-[color:var(--error)] focus:ring-offset-2',
                className
            )}
        >
            <div className="flex items-start gap-3">
                <AlertCircle
                    className="w-5 h-5 text-[var(--error)] shrink-0 mt-0.5"
                    aria-hidden="true"
                />
                <div className="flex-1 text-[var(--ink-secondary)]">
                    <h2 className="text-base font-semibold text-[var(--ink-primary)]">
                        {title}
                    </h2>
                    <ul className="mt-2 space-y-1">
                        {errors.map((error, index) => (
                            <li
                                key={index}
                                className="text-sm"
                            >
                                {error.field && (
                                    <span className="font-medium text-[var(--ink-primary)]">{error.field}: </span>
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
