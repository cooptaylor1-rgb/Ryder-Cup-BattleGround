/**
 * Modal / Dialog Component
 *
 * Masters-inspired modal dialogs.
 * Design principles:
 * - Calm entrance (fade + subtle scale)
 * - Uses design system colors
 * - Accessible: focus management, escape key, aria
 * - No bouncy animations
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
import { Button } from './Button';

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
  const [isExiting, setIsExiting] = useState(false);

  // Handle close with exit animation
  const handleClose = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => {
      setIsExiting(false);
      onClose();
    }, 150);
  }, [onClose]);

  // Handle escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, handleClose]);

  // Focus trap - keep focus inside modal
  useEffect(() => {
    if (!isOpen) return;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = modalRef.current?.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusableElements?.length) return;

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (e.shiftKey && document.activeElement === firstElement) {
        e.preventDefault();
        lastElement.focus();
      } else if (!e.shiftKey && document.activeElement === lastElement) {
        e.preventDefault();
        firstElement.focus();
      }
    };

    document.addEventListener('keydown', handleTab);
    return () => document.removeEventListener('keydown', handleTab);
  }, [isOpen]);

  // Focus management - focus first element on open, restore on close
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
        handleClose();
      }
    },
    [closeOnOverlayClick, handleClose]
  );

  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  const content = (
    <div
      className={cn(
        'fixed inset-0 z-50',
        'flex items-center justify-center p-4',
        'bg-[color:var(--ink)]/75 backdrop-blur-sm',
        isExiting ? 'animate-fade-out' : 'animate-fade-in'
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
          'relative w-full rounded-xl',
          'border border-[var(--rule)] bg-[var(--surface-raised)] shadow-[var(--shadow-card-lg)]',
          sizeClasses[size],
          isExiting ? 'animate-scale-out' : 'animate-scale-in'
        )}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div className="flex items-start justify-between gap-4 p-5 pb-3">
            <div className="flex-1 min-w-0">
              {title && (
                <h2 id="modal-title" className="text-xl font-bold text-[var(--ink-primary)]">
                  {title}
                </h2>
              )}
              {description && (
                <p id="modal-description" className="text-base mt-2 text-[var(--ink-secondary)]">
                  {description}
                </p>
              )}
            </div>
            {showCloseButton && (
              <IconButton
                icon={<X />}
                aria-label="Close dialog"
                variant="ghost"
                size="md"
                onClick={handleClose}
                className="-mr-2 -mt-1"
              />
            )}
          </div>
        )}

        {/* Content */}
        <div className="p-5 pt-3">{children}</div>
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

  // Reset typed text when dialog closes
  const handleClose = () => {
    setTypedText('');
    onClose();
  };

  const handleConfirm = () => {
    if (canConfirm && !isLoading) {
      setTypedText('');
      onConfirm();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={title}
      size="sm"
      closeOnOverlayClick={!isLoading}
      closeOnEscape={!isLoading}
    >
      <div className="space-y-4">
        <p className="text-sm text-[var(--ink-secondary)]">{description}</p>

        {/* Type-to-confirm input */}
        {confirmText && (
          <div className="space-y-2">
            <p className="text-sm text-[var(--ink-secondary)]">
              Type{' '}
              <code className="px-1.5 py-0.5 rounded font-mono text-xs bg-[var(--surface)] text-[var(--error)]">
                {confirmText}
              </code>{' '}
              to confirm:
            </p>
            <input
              type="text"
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              placeholder={confirmText}
              className={cn(
                'w-full px-3 py-2 rounded-lg text-sm',
                'bg-[var(--surface)] border border-[var(--rule)] text-[var(--ink-primary)]',
                'focus:outline-none transition-colors'
              )}
              autoComplete="off"
              autoFocus
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button variant="secondary" onClick={handleClose} disabled={isLoading} fullWidth>
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

export default Modal;
