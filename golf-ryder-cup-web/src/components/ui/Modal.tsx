/**
 * Modal / Dialog Component
 *
 * Accessible modal with focus management.
 * Supports standard dialogs and confirmation flows.
 */

'use client';

import {
    type ReactNode,
    useEffect,
    useRef,
    useCallback,
    useState,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';
import { Button, type ButtonVariant } from './Button';

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    description?: string;
    children?: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    showCloseButton?: boolean;
    closeOnOverlayClick?: boolean;
    closeOnEscape?: boolean;
}

export function Modal({
    isOpen,
    onClose,
    title,
    description,
    children,
    size = 'md',
    showCloseButton = true,
    closeOnOverlayClick = true,
    closeOnEscape = true,
}: ModalProps) {
    const modalRef = useRef<HTMLDivElement>(null);
    const previousFocusRef = useRef<HTMLElement | null>(null);

    // Handle escape key
    useEffect(() => {
        if (!isOpen || !closeOnEscape) return;

        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, closeOnEscape, onClose]);

    // Focus management
    useEffect(() => {
        if (isOpen) {
            previousFocusRef.current = document.activeElement as HTMLElement;
            // Focus first focusable element in modal
            const focusable = modalRef.current?.querySelector<HTMLElement>(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            focusable?.focus();
        } else {
            previousFocusRef.current?.focus();
        }
    }, [isOpen]);

    // Lock body scroll
    useEffect(() => {
        if (isOpen) {
            const originalOverflow = document.body.style.overflow;
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = originalOverflow;
            };
        }
    }, [isOpen]);

    const handleOverlayClick = useCallback(
        (e: React.MouseEvent) => {
            if (closeOnOverlayClick && e.target === e.currentTarget) {
                onClose();
            }
        },
        [closeOnOverlayClick, onClose]
    );

    if (!isOpen) return null;

    const content = (
        <div
            className={cn(
                'fixed inset-0 z-50',
                'flex items-center justify-center p-4',
                'bg-black/70 backdrop-blur-sm',
                'animate-fade-in',
            )}
            onClick={handleOverlayClick}
            role="presentation"
        >
            <div
                ref={modalRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={title ? 'modal-title' : undefined}
                aria-describedby={description ? 'modal-description' : undefined}
                className={cn(
                    'relative w-full bg-surface-raised rounded-2xl shadow-elevated',
                    'border border-surface-border',
                    'animate-scale-in',
                    size === 'sm' && 'max-w-sm',
                    size === 'md' && 'max-w-md',
                    size === 'lg' && 'max-w-lg',
                    size === 'xl' && 'max-w-xl',
                )}
            >
                {/* Header */}
                {(title || showCloseButton) && (
                    <div className="flex items-start justify-between gap-4 p-4 pb-0">
                        <div className="flex-1 min-w-0">
                            {title && (
                                <h2
                                    id="modal-title"
                                    className="text-lg font-semibold text-text-primary"
                                >
                                    {title}
                                </h2>
                            )}
                            {description && (
                                <p
                                    id="modal-description"
                                    className="text-sm text-text-secondary mt-1"
                                >
                                    {description}
                                </p>
                            )}
                        </div>
                        {showCloseButton && (
                            <IconButton
                                icon={<X />}
                                aria-label="Close dialog"
                                variant="ghost"
                                size="sm"
                                onClick={onClose}
                                className="-mr-1 -mt-1"
                            />
                        )}
                    </div>
                )}

                {/* Content */}
                <div className="p-4">{children}</div>
            </div>
        </div>
    );

    // Portal to body
    if (typeof window === 'undefined') return null;
    return createPortal(content, document.body);
}

/**
 * Confirm Dialog
 *
 * Pre-built confirmation dialog for destructive actions.
 * Supports optional type-to-confirm for dangerous operations.
 */

export interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    description: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'default' | 'danger';
    isLoading?: boolean;
    /** Text the user must type to confirm (for very destructive actions) */
    confirmText?: string;
}

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    description,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'default',
    isLoading = false,
    confirmText,
}: ConfirmDialogProps) {
    const [typedText, setTypedText] = useState('');
    const canConfirm = !confirmText || typedText === confirmText;

    // Reset typed text when dialog opens/closes
    useEffect(() => {
        if (!isOpen) {
            setTypedText('');
        }
    }, [isOpen]);

    const handleConfirm = () => {
        if (canConfirm && !isLoading) {
            onConfirm();
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="sm"
            closeOnOverlayClick={!isLoading}
            closeOnEscape={!isLoading}
        >
            <div className="space-y-4">
                <p className="text-sm text-text-secondary">{description}</p>

                {/* Type-to-confirm input */}
                {confirmText && (
                    <div className="space-y-2">
                        <p className="text-sm text-text-secondary">
                            Type <code className="px-1.5 py-0.5 bg-surface-elevated rounded text-error font-mono text-xs">{confirmText}</code> to confirm:
                        </p>
                        <input
                            type="text"
                            value={typedText}
                            onChange={(e) => setTypedText(e.target.value)}
                            placeholder={confirmText}
                            className={cn(
                                'w-full px-3 py-2 rounded-lg',
                                'bg-surface-elevated border border-surface-border',
                                'text-sm text-text-primary placeholder:text-text-tertiary',
                                'focus:outline-none focus:ring-2 focus:ring-augusta-green',
                                'transition-colors duration-150',
                            )}
                            autoComplete="off"
                            autoFocus
                        />
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-3 pt-2">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        disabled={isLoading}
                        fullWidth
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={variant === 'danger' ? 'danger' : 'primary'}
                        onClick={handleConfirm}
                        disabled={!canConfirm}
                        isLoading={isLoading}
                        fullWidth
                    >
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

// Need to import useState for ConfirmDialog - moved to top

export default Modal;
