/**
 * Undo Toast Component
 *
 * Masters-inspired undo affordance.
 * Design principles:
 * - Non-modal: doesn't block interaction
 * - Single tap to undo
 * - Auto-dismiss after timeout
 * - Subtle, not distracting
 */

'use client';

import { useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import { Undo2 } from 'lucide-react';

interface UndoToastProps {
    /** Message to display */
    message: string;
    /** Called when undo is clicked */
    onUndo: () => void;
    /** Called when toast dismisses */
    onDismiss: () => void;
}

export function UndoToast({
    message,
    onUndo,
    onDismiss,
}: UndoToastProps) {
    const [isExiting, setIsExiting] = useState(false);

    const handleDismiss = useCallback(() => {
        setIsExiting(true);
        setTimeout(onDismiss, 150);
    }, [onDismiss]);

    const handleUndo = useCallback(() => {
        onUndo();
        handleDismiss();
    }, [onUndo, handleDismiss]);

    return (
        <div
            className={cn(
                'fixed bottom-24 left-1/2 -translate-x-1/2 z-50 lg:bottom-8',
                isExiting ? 'toast-exit' : 'toast-enter'
            )}
        >
            <button
                onClick={handleUndo}
                className={cn(
                    'flex items-center gap-3 px-4 py-3 rounded-lg',
                    'min-w-[280px] cursor-pointer transition-transform transition-colors duration-200',
                    'press-scale border border-[var(--rule)] bg-[var(--surface-raised)] text-[var(--ink)] shadow-[var(--shadow-card-lg)]',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--masters)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--canvas)]'
                )}
            >
                <Undo2 className="w-5 h-5 shrink-0 text-[var(--premium-gold)]" />
                <span className="flex-1 text-sm font-medium text-left text-[var(--ink)]">{message}</span>
                <span className="text-xs font-medium text-[var(--ink-tertiary)]">
                    Tap to undo
                </span>
            </button>
        </div>
    );
}

/**
 * Hook for managing undo toast state
 * Handles auto-dismiss timing
 */
export function useUndoToast(dismissAfterMs = 5000) {
    const [isVisible, setIsVisible] = useState(false);
    const [message, setMessage] = useState('');
    const [undoCallback, setUndoCallback] = useState<(() => void) | null>(null);
    const [, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

    const show = useCallback((newMessage: string, onUndo: () => void) => {
        // Clear any existing timeout
        setTimeoutId(prev => {
            if (prev) clearTimeout(prev);
            return null;
        });

        // Set new timeout for auto-dismiss
        const id = setTimeout(() => {
            setIsVisible(false);
            setUndoCallback(null);
            setTimeoutId(null);
        }, dismissAfterMs);

        setIsVisible(true);
        setMessage(newMessage);
        setUndoCallback(() => onUndo);
        setTimeoutId(id);
    }, [dismissAfterMs]);

    const hide = useCallback(() => {
        setTimeoutId(prev => {
            if (prev) clearTimeout(prev);
            return null;
        });
        setIsVisible(false);
        setUndoCallback(null);
    }, []);

    const handleUndo = useCallback(() => {
        if (undoCallback) {
            undoCallback();
        }
        hide();
    }, [undoCallback, hide]);

    return {
        isVisible,
        message,
        show,
        hide,
        handleUndo,
    };
}

export default UndoToast;
