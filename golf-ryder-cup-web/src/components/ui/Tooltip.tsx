/**
 * Tooltip Component
 *
 * Simple tooltip for icon-only buttons and info hints.
 * Appears on hover/focus with slight delay.
 */

'use client';

import {
    useState,
    useRef,
    type ReactNode,
    type ReactElement,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

export interface TooltipProps {
    content: ReactNode;
    children: ReactElement<{ onMouseEnter?: () => void; onMouseLeave?: () => void; onFocus?: () => void; onBlur?: () => void }>;
    side?: 'top' | 'bottom' | 'left' | 'right';
    delayMs?: number;
    className?: string;
}

export function Tooltip({
    content,
    children,
    side = 'top',
    delayMs = 200,
    className,
}: TooltipProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const triggerRef = useRef<HTMLDivElement>(null);

    const showTooltip = () => {
        timeoutRef.current = setTimeout(() => {
            if (triggerRef.current) {
                const rect = triggerRef.current.getBoundingClientRect();
                const offset = 8;

                let top: number;
                let left: number;

                switch (side) {
                    case 'top':
                        top = rect.top - offset;
                        left = rect.left + rect.width / 2;
                        break;
                    case 'bottom':
                        top = rect.bottom + offset;
                        left = rect.left + rect.width / 2;
                        break;
                    case 'left':
                        top = rect.top + rect.height / 2;
                        left = rect.left - offset;
                        break;
                    case 'right':
                        top = rect.top + rect.height / 2;
                        left = rect.right + offset;
                        break;
                }

                setPosition({ top, left });
                setIsVisible(true);
            }
        }, delayMs);
    };

    const hideTooltip = () => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
        setIsVisible(false);
    };

    const tooltipContent = isVisible && typeof window !== 'undefined' && (
        createPortal(
            <div
                role="tooltip"
                className={cn(
                    'fixed z-[70] px-2.5 py-1.5',
                    'bg-surface-elevated border border-surface-border',
                    'text-xs text-text-primary font-medium',
                    'rounded-md shadow-lg',
                    'animate-fade-in',
                    'pointer-events-none',

                    // Positioning transforms
                    side === 'top' && '-translate-x-1/2 -translate-y-full',
                    side === 'bottom' && '-translate-x-1/2',
                    side === 'left' && '-translate-x-full -translate-y-1/2',
                    side === 'right' && '-translate-y-1/2',

                    className
                )}
                style={{
                    top: position.top,
                    left: position.left,
                }}
            >
                {content}

                {/* Arrow */}
                <span
                    className={cn(
                        'absolute w-2 h-2 bg-surface-elevated border-surface-border',
                        'rotate-45',
                        side === 'top' && 'bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 border-b border-r',
                        side === 'bottom' && 'top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 border-t border-l',
                        side === 'left' && 'right-0 top-1/2 -translate-y-1/2 translate-x-1/2 border-t border-r',
                        side === 'right' && 'left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 border-b border-l',
                    )}
                    aria-hidden="true"
                />
            </div>,
            document.body
        )
    );

    return (
        <>
            <div
                ref={triggerRef}
                className="inline-flex"
                onMouseEnter={showTooltip}
                onMouseLeave={hideTooltip}
                onFocus={showTooltip}
                onBlur={hideTooltip}
            >
                {children}
            </div>
            {tooltipContent}
        </>
    );
}

export default Tooltip;
