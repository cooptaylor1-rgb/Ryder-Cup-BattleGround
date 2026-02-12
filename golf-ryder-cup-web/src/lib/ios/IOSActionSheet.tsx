/**
 * iOS Action Sheet — Native-Style Action Picker
 *
 * Replicates iOS's UIActionSheet with:
 * - Slide up from bottom animation
 * - Grouped actions with cancel button
 * - Destructive action styling
 * - Backdrop blur
 * - Haptic feedback
 * - Accessibility support
 */

'use client';

import React, { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface ActionSheetAction {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Optional icon */
  icon?: ReactElement;
  /** Is this a destructive action */
  destructive?: boolean;
  /** Is this action disabled */
  disabled?: boolean;
  /** Action handler */
  onSelect: () => void;
}

export interface ActionSheetProps {
  /** Is the sheet visible */
  isOpen: boolean;
  /** Close handler */
  onClose: () => void;
  /** Optional title */
  title?: string;
  /** Optional message */
  message?: string;
  /** Action items */
  actions: ActionSheetAction[];
  /** Cancel button label */
  cancelLabel?: string;
  /** Enable haptic feedback */
  haptics?: boolean;
}

// ============================================
// Utilities
// ============================================

function triggerHaptic(type: 'light' | 'medium' = 'light') {
  if ('vibrate' in navigator) {
    navigator.vibrate(type === 'light' ? 10 : 20);
  }
}

// ============================================
// Component
// ============================================

export function IOSActionSheet({
  isOpen,
  onClose,
  title,
  message,
  actions,
  cancelLabel = 'Cancel',
  haptics = true,
}: ActionSheetProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  // Track visibility separately for animation timing
  // Using a ref to track previous isOpen state to avoid synchronous setState
  const wasOpenRef = useRef(isOpen);
  const [isVisible, setIsVisible] = useState(isOpen);
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Handle open/close animations via ref comparison
  useEffect(() => {
    // Clean up any pending close timer
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }

    if (isOpen && !wasOpenRef.current) {
      // Opening - use requestAnimationFrame to avoid synchronous setState
      requestAnimationFrame(() => {
        setIsVisible(true);
        requestAnimationFrame(() => {
          setIsAnimating(true);
        });
      });
    } else if (!isOpen && wasOpenRef.current) {
      // Closing - use requestAnimationFrame to avoid synchronous setState
      requestAnimationFrame(() => {
        setIsAnimating(false);
      });
      closeTimerRef.current = setTimeout(() => {
        setIsVisible(false);
      }, 300);
    }

    wasOpenRef.current = isOpen;

    return () => {
      if (closeTimerRef.current) {
        clearTimeout(closeTimerRef.current);
      }
    };
  }, [isOpen]);

  // Lock body scroll
  useEffect(() => {
    if (isVisible) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isVisible]);

  // Handle action selection
  const handleAction = useCallback(
    (action: ActionSheetAction) => {
      if (action.disabled) return;

      if (haptics) {
        triggerHaptic(action.destructive ? 'medium' : 'light');
      }

      onClose();
      // Small delay to let animation complete
      setTimeout(() => {
        action.onSelect();
      }, 100);
    },
    [haptics, onClose]
  );

  // Handle cancel
  const handleCancel = useCallback(() => {
    if (haptics) {
      triggerHaptic('light');
    }
    onClose();
  }, [haptics, onClose]);

  // Keyboard handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        handleCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleCancel]);

  if (!isVisible) return null;

  // Separate destructive actions
  const regularActions = actions.filter((a) => !a.destructive);
  const destructiveActions = actions.filter((a) => a.destructive);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-9998 bg-black/40 backdrop-blur-sm',
          'transition-opacity duration-300',
          isAnimating ? 'opacity-100' : 'opacity-0'
        )}
        onClick={handleCancel}
        aria-hidden="true"
      />

      {/* Action Sheet Container */}
      <div
        className={cn(
          'fixed inset-x-0 bottom-0 z-9999 p-3',
          'transition-transform duration-300 ease-out',
          isAnimating ? 'translate-y-0' : 'translate-y-full'
        )}
        style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
      >
        {/* Main actions group */}
        <div className="bg-[color:var(--surface-raised)]/95 backdrop-blur-xl rounded-2xl overflow-hidden mb-2 shadow-xl">
          {/* Header */}
          {(title || message) && (
            <div className="px-4 py-3 text-center border-b border-[color:var(--rule)]/50">
              {title && (
                <h2 className="text-sm font-semibold text-ink-secondary">
                  {title}
                </h2>
              )}
              {message && (
                <p className="text-xs text-ink-tertiary mt-1">{message}</p>
              )}
            </div>
          )}

          {/* Regular Actions */}
          {regularActions.map((action, index) => (
            <button
              key={action.id}
              onClick={() => handleAction(action)}
              disabled={action.disabled}
              className={cn(
                'w-full flex items-center justify-center gap-2',
                'px-4 py-4 text-[17px] font-normal',
                'transition-colors duration-100',
                'active:bg-[color:var(--surface-secondary)]',
                index > 0 && 'border-t border-[color:var(--rule)]/50',
                action.disabled
                  ? 'opacity-40 cursor-not-allowed text-ink-tertiary'
                  : 'text-[color:var(--info)]'
              )}
            >
              {action.icon && (
                <span className="w-5 h-5">{action.icon}</span>
              )}
              {action.label}
            </button>
          ))}

          {/* Destructive Actions */}
          {destructiveActions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleAction(action)}
              disabled={action.disabled}
              className={cn(
                'w-full flex items-center justify-center gap-2',
                'px-4 py-4 text-[17px] font-normal',
                'transition-colors duration-100',
                'active:bg-[color:var(--error)]/10',
                'border-t border-[color:var(--rule)]/50',
                action.disabled
                  ? 'opacity-40 cursor-not-allowed text-[color:var(--error)]/50'
                  : 'text-[color:var(--error)]'
              )}
            >
              {action.icon && (
                <span className="w-5 h-5">{action.icon}</span>
              )}
              {action.label}
            </button>
          ))}
        </div>

        {/* Cancel button (separate group) */}
        <button
          onClick={handleCancel}
          className={cn(
            'w-full py-4 rounded-2xl',
            'bg-[color:var(--surface-raised)]/95 backdrop-blur-xl shadow-xl',
            'text-[17px] font-semibold text-[color:var(--info)]',
            'transition-colors duration-100',
            'active:bg-[color:var(--surface-secondary)]'
          )}
        >
          {cancelLabel}
        </button>
      </div>
    </>
  );
}

// ============================================
// Hook for easy usage
// ============================================

export function useActionSheet() {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<Omit<ActionSheetProps, 'isOpen' | 'onClose'> | null>(null);

  const open = useCallback(
    (options: Omit<ActionSheetProps, 'isOpen' | 'onClose'>) => {
      setConfig(options);
      setIsOpen(true);
    },
    []
  );

  const close = useCallback(() => {
    setIsOpen(false);
  }, []);

  const ActionSheet = useCallback(() => {
    if (!config) return null;

    return (
      <IOSActionSheet
        isOpen={isOpen}
        onClose={close}
        {...config}
      />
    );
  }, [isOpen, close, config]);

  return {
    isOpen,
    open,
    close,
    ActionSheet,
  };
}

// ============================================
// Confirm Action Sheet (common pattern)
// ============================================

export interface ConfirmActionSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
  confirmDestructive?: boolean;
  cancelLabel?: string;
}

export function ConfirmActionSheet({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = 'Confirm',
  confirmDestructive = false,
  cancelLabel = 'Cancel',
}: ConfirmActionSheetProps) {
  return (
    <IOSActionSheet
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      message={message}
      cancelLabel={cancelLabel}
      actions={[
        {
          id: 'confirm',
          label: confirmLabel,
          destructive: confirmDestructive,
          onSelect: onConfirm,
        },
      ]}
    />
  );
}

export default IOSActionSheet;
