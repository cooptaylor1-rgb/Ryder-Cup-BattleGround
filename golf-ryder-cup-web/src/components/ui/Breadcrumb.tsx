/**
 * Breadcrumb Component
 *
 * Navigation aid showing the current location in the app hierarchy.
 * Helps users understand context and navigate back.
 */

'use client';

import { Fragment, type ReactNode } from 'react';
import Link from 'next/link';
import { ChevronRight, Home } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbItem {
    label: string;
    href?: string;
    icon?: ReactNode;
}

export interface BreadcrumbProps {
    items: BreadcrumbItem[];
    className?: string;
    showHome?: boolean;
    separator?: ReactNode;
}

export function Breadcrumb({
    items,
    className,
    showHome = true,
    separator,
}: BreadcrumbProps) {
    const allItems: BreadcrumbItem[] = showHome
        ? [{ label: 'Home', href: '/', icon: <Home className="w-4 h-4" /> }, ...items]
        : items;

    const SeparatorIcon = separator || <ChevronRight className="w-4 h-4 text-[var(--ink-tertiary)]" />;

    return (
        <nav aria-label="Breadcrumb" className={cn('flex items-center', className)}>
            <ol className="flex items-center gap-1.5 text-sm">
                {allItems.map((item, index) => {
                    const isLast = index === allItems.length - 1;
                    const isFirst = index === 0;

                    return (
                        <Fragment key={item.label}>
                            <li className="flex items-center">
                                {item.href && !isLast ? (
                                    <Link
                                        href={item.href}
                                        className={cn(
                                            'flex items-center gap-1.5 px-2 py-1 rounded-lg',
                                            'text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:bg-[color:var(--surface-secondary)]/70',
                                            'transition-colors duration-150',
                                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold'
                                        )}
                                    >
                                        {item.icon}
                                        {!isFirst && <span>{item.label}</span>}
                                    </Link>
                                ) : (
                                    <span
                                        className={cn(
                                            'flex items-center gap-1.5 px-2 py-1',
                                            isLast ? 'text-[var(--ink-primary)] font-medium' : 'text-[var(--ink-secondary)]'
                                        )}
                                        aria-current={isLast ? 'page' : undefined}
                                    >
                                        {item.icon}
                                        {(!isFirst || isLast) && <span>{item.label}</span>}
                                    </span>
                                )}
                            </li>
                            {!isLast && (
                                <li aria-hidden="true" className="flex items-center">
                                    {SeparatorIcon}
                                </li>
                            )}
                        </Fragment>
                    );
                })}
            </ol>
        </nav>
    );
}

/**
 * Simple breadcrumb for common patterns
 */
export function SimpleBreadcrumb({
    parent,
    parentHref,
    current,
    className,
}: {
    parent: string;
    parentHref: string;
    current: string;
    className?: string;
}) {
    return (
        <Breadcrumb
            items={[
                { label: parent, href: parentHref },
                { label: current },
            ]}
            className={className}
        />
    );
}

export default Breadcrumb;
