/**
 * ConfirmDialog Component
 *
 * Production-quality confirmation dialog that replaces native confirm().
 * Provides consistent UX, proper accessibility, and prevents XSS vulnerabilities.
 *
 * Features:
 * - Type-safe props
 * - Keyboard navigation (Enter to confirm, Escape to cancel)
 * - Focus trap and management
 * - Customizable button labels and variants
 * - Loading state support
 */

'use client';

import { useCallback, useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle, Info, AlertCircle, CheckCircle } from 'lucide-react';

export type ConfirmVariant = 'danger' | 'warning' | 'info' | 'success';

export interface ConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    title: string;
    message: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: ConfirmVariant;
    /** If true, shows loading state on confirm button during async onConfirm */
    showLoadingOnConfirm?: boolean;
}

const variantConfig: Record<
    ConfirmVariant,
    {
        icon: typeof AlertTriangle;
        iconClassName: string;
        iconBgClassName: string;
        confirmVariant: 'primary' | 'secondary' | 'danger';
    }
> = {
    danger: {
        icon: AlertCircle,
        iconClassName: 'text-[var(--error)]',
        iconBgClassName: 'bg-[color:var(--error)]/15',
        confirmVariant: 'danger',
    },
    warning: {
        icon: AlertTriangle,
        iconClassName: 'text-[var(--warning)]',
        iconBgClassName: 'bg-[color:var(--warning)]/10',
        confirmVariant: 'primary',
    },
    info: {
        icon: Info,
        iconClassName: 'text-[var(--masters)]',
        iconBgClassName: 'bg-[color:var(--masters)]/12',
        confirmVariant: 'primary',
    },
    success: {
        icon: CheckCircle,
        iconClassName: 'text-[var(--success)]',
        iconBgClassName: 'bg-[color:var(--success)]/15',
        confirmVariant: 'primary' as const,
    },
};

export function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'warning',
    showLoadingOnConfirm = true,
}: ConfirmDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const config = variantConfig[variant];
    const Icon = config.icon;

    const handleConfirm = useCallback(async () => {
        if (showLoadingOnConfirm) {
            setIsLoading(true);
        }
        try {
            await onConfirm();
            onClose();
        } finally {
            setIsLoading(false);
        }
    }, [onConfirm, onClose, showLoadingOnConfirm]);

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (e.key === 'Enter' && !isLoading) {
                e.preventDefault();
                handleConfirm();
            }
        },
        [handleConfirm, isLoading]
    );

    return (
        <Modal isOpen={isOpen} onClose={onClose} size="sm" showCloseButton={false}>
            <div className="p-6" onKeyDown={handleKeyDown}>
                {/* Icon */}
                <div className="flex justify-center mb-4">
                    <div
                        className={
                            'w-12 h-12 rounded-full flex items-center justify-center ' +
                            config.iconBgClassName
                        }
                    >
                        <Icon size={24} className={config.iconClassName} aria-hidden="true" />
                    </div>
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-center mb-2 text-[var(--ink-primary)]">
                    {title}
                </h3>

                {/* Message */}
                <p className="text-center mb-6 text-[var(--ink-secondary)]">{message}</p>

                {/* Actions */}
                <div className="flex gap-3">
                    <Button
                        variant="secondary"
                        onClick={onClose}
                        disabled={isLoading}
                        className="flex-1"
                    >
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={config.confirmVariant}
                        onClick={handleConfirm}
                        isLoading={isLoading}
                        className="flex-1"
                    >
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

/**
 * Hook to manage confirm dialog state
 *
 * Usage:
 * ```tsx
 * const { showConfirm, ConfirmDialogComponent } = useConfirmDialog();
 *
 * const handleDelete = () => {
 *   showConfirm({
 *     title: 'Delete Item',
 *     message: 'Are you sure you want to delete this item?',
 *     variant: 'danger',
 *     onConfirm: async () => {
 *       await deleteItem();
 *     },
 *   });
 * };
 *
 * return (
 *   <>
 *     <button onClick={handleDelete}>Delete</button>
 *     {ConfirmDialogComponent}
 *   </>
 * );
 * ```
 */
export function useConfirmDialog() {
    const [isOpen, setIsOpen] = useState(false);
    const [config, setConfig] = useState<Omit<ConfirmDialogProps, 'isOpen' | 'onClose'>>({
        onConfirm: () => {
        },
        title: '',
        message: '',
    });

    const showConfirm = useCallback(
        (options: Omit<ConfirmDialogProps, 'isOpen' | 'onClose'>) => {
            setConfig(options);
            setIsOpen(true);
        },
        []
    );

    const hideConfirm = useCallback(() => {
        setIsOpen(false);
    }, []);

    const ConfirmDialogComponent = <ConfirmDialog isOpen={isOpen} onClose={hideConfirm} {...config} />;

    return {
        showConfirm,
        hideConfirm,
        isOpen,
        ConfirmDialogComponent,
    };
}
