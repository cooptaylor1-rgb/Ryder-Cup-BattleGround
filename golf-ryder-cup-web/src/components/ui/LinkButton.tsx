/**
 * LinkButton — a Next.js Link styled as a Button.
 *
 * Reuses the same visual vocabulary as <Button> (variant, size, icons)
 * but renders a <Link> instead of a <button>, so it works for
 * navigation targets that should look like buttons.
 *
 * This replaces the previous pattern of applying raw `btn-premium` or
 * `btn-secondary` CSS classes directly to <Link> elements, which
 * caused visual inconsistency (different focus rings, hover states,
 * and tap targets from the Button component).
 */
'use client';

import Link from 'next/link';
import { forwardRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { ButtonVariant, ButtonSize } from './Button';

export interface LinkButtonProps {
    href: string;
    variant?: ButtonVariant;
    size?: ButtonSize;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
    fullWidth?: boolean;
    className?: string;
    children: ReactNode;
    /** Pass-through for Link props like `prefetch`, `replace`, etc. */
    prefetch?: boolean;
    replace?: boolean;
    'aria-label'?: string;
}

/**
 * Shared class generation — mirrors the classes in Button.tsx so the
 * two components look identical at rest.
 */
function getLinkButtonClasses(
    variant: ButtonVariant,
    size: ButtonSize,
    fullWidth: boolean,
    className?: string,
) {
    return cn(
        // Base
        'relative inline-flex items-center justify-center gap-2',
        'font-semibold no-underline',
        'transition-transform duration-150 ease-out',
        'hover:scale-[1.02] active:scale-[0.96]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        'focus-visible:ring-gold focus-visible:ring-offset-[color:var(--canvas)]',
        'select-none',

        // Size
        size === 'sm' && 'h-11 px-4 text-sm rounded-lg min-w-[72px]',
        size === 'md' && 'h-12 px-5 text-base rounded-xl min-w-[88px]',
        size === 'lg' && 'h-14 px-6 text-lg rounded-xl min-w-[100px]',
        size === 'icon' && 'h-12 w-12 rounded-xl p-0 min-w-0',

        // Variant
        variant === 'primary' && [
            'bg-[var(--masters)] text-[var(--canvas)]',
            'hover:bg-[color:var(--masters)]/92',
            'shadow-md hover:shadow-lg',
            'border border-[color:var(--masters)]/25',
        ],
        variant === 'secondary' && [
            'bg-[var(--surface-raised)] text-[var(--ink)]',
            'border border-[color:var(--rule)]/40',
            'hover:bg-[var(--surface)] hover:border-gold/40',
            'shadow-sm hover:shadow-md',
        ],
        variant === 'ghost' && [
            'bg-transparent text-[var(--ink-secondary)]',
            'hover:bg-[color:var(--surface)]/60 hover:text-[var(--ink)]',
        ],
        variant === 'danger' && [
            'bg-[var(--error)] text-[var(--canvas)]',
            'hover:bg-[color:var(--error)]/92',
            'shadow-sm hover:shadow-lg',
        ],
        variant === 'outline' && [
            'bg-transparent text-[var(--ink)]',
            'border border-[color:var(--rule)]/40',
            'hover:bg-[color:var(--surface)]/60 hover:border-gold/40',
        ],

        fullWidth && 'w-full',
        className,
    );
}

export const LinkButton = forwardRef<HTMLAnchorElement, LinkButtonProps>(
    (
        {
            href,
            variant = 'primary',
            size = 'md',
            leftIcon,
            rightIcon,
            fullWidth = false,
            className,
            children,
            ...linkProps
        },
        ref,
    ) => {
        return (
            <Link
                ref={ref}
                href={href}
                className={getLinkButtonClasses(variant, size, fullWidth, className)}
                {...linkProps}
            >
                {leftIcon && (
                    <span className="shrink-0" aria-hidden="true">
                        {leftIcon}
                    </span>
                )}
                <span>{children}</span>
                {rightIcon && (
                    <span className="shrink-0" aria-hidden="true">
                        {rightIcon}
                    </span>
                )}
            </Link>
        );
    },
);

LinkButton.displayName = 'LinkButton';

export default LinkButton;
