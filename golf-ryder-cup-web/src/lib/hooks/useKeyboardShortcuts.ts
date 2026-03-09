/**
 * Keyboard Shortcuts Hook
 *
 * Production-quality keyboard navigation for the Golf Ryder Cup app.
 * Provides shortcuts for scoring, navigation, and common actions.
 */

import { useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface ShortcutConfig {
    /** Key combination (e.g., 'ctrl+z', 'escape', 'g s') */
    key: string;
    /** Description for help menu */
    description: string;
    /** Callback function */
    action: () => void;
    /** Only trigger when specific conditions are met */
    when?: () => boolean;
    /** Prevent default browser behavior */
    preventDefault?: boolean;
}

interface UseKeyboardShortcutsOptions {
    /** Enable/disable all shortcuts */
    enabled?: boolean;
    /** Custom shortcuts to add */
    shortcuts?: ShortcutConfig[];
}

// Parse key string into components
function parseKeyCombo(keyStr: string): {
    key: string;
    ctrl: boolean;
    alt: boolean;
    shift: boolean;
    meta: boolean;
} {
    const parts = keyStr.toLowerCase().split('+').map(p => p.trim());
    const key = parts[parts.length - 1];

    return {
        key,
        ctrl: parts.includes('ctrl') || parts.includes('control'),
        alt: parts.includes('alt'),
        shift: parts.includes('shift'),
        meta: parts.includes('meta') || parts.includes('cmd'),
    };
}

// Check if event matches key combo
function matchesKeyCombo(
    event: KeyboardEvent,
    combo: ReturnType<typeof parseKeyCombo>
): boolean {
    const eventKey = event.key.toLowerCase();

    // Handle special keys
    const keyMatches =
        eventKey === combo.key ||
        event.code.toLowerCase() === combo.key ||
        (combo.key === 'escape' && eventKey === 'escape') ||
        (combo.key === 'enter' && eventKey === 'enter') ||
        (combo.key === 'space' && eventKey === ' ');

    return (
        keyMatches &&
        event.ctrlKey === combo.ctrl &&
        event.altKey === combo.alt &&
        event.shiftKey === combo.shift &&
        event.metaKey === combo.meta
    );
}

// Check if user is typing in an input
function isTypingInInput(): boolean {
    const activeElement = document.activeElement;
    if (!activeElement) return false;

    const tagName = activeElement.tagName.toLowerCase();
    if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
        return true;
    }

    // Check for contenteditable
    if (activeElement.getAttribute('contenteditable') === 'true') {
        return true;
    }

    return false;
}

/**
 * Hook for registering keyboard shortcuts
 */
export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
    const { enabled = true, shortcuts = [] } = options;
    const router = useRouter();
    const pathname = usePathname();
    const sequenceRef = useRef<string>('');
    const sequenceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Default navigation shortcuts (vim-style g prefix)
    const defaultShortcuts: ShortcutConfig[] = useMemo(() => [
        // Navigation shortcuts (g + key)
        {
            key: 'g h',
            description: 'Go to Home',
            action: () => router.push('/'),
        },
        {
            key: 'g s',
            description: 'Go to Standings',
            action: () => router.push('/standings'),
        },
        {
            key: 'g m',
            description: 'Go to Matchups',
            action: () => router.push('/matchups'),
        },
        {
            key: 'g l',
            description: 'Go to Live View',
            action: () => router.push('/live'),
        },
        {
            key: 'g p',
            description: 'Go to Players',
            action: () => router.push('/players'),
        },
        {
            key: 'g c',
            description: 'Go to Captain Mode',
            action: () => router.push('/captain'),
        },
        // Quick actions
        {
            key: 'escape',
            description: 'Close modal / Go back',
            action: () => {
                // Try to close any open modal first
                const closeButton = document.querySelector('[data-dismiss="modal"]');
                if (closeButton instanceof HTMLElement) {
                    closeButton.click();
                } else {
                    router.back();
                }
            },
            preventDefault: true,
        },
        {
            key: '?',
            description: 'Show keyboard shortcuts help',
            action: () => {
                // Dispatch custom event for help modal
                window.dispatchEvent(new CustomEvent('show-keyboard-help'));
            },
            when: () => !isTypingInInput(),
        },
    ], [router]);

    // Combine default and custom shortcuts
    const allShortcuts = useMemo(
        () => [...defaultShortcuts, ...shortcuts],
        [defaultShortcuts, shortcuts]
    );

    // Handle keyboard events
    const handleKeyDown = useCallback(
        (event: KeyboardEvent) => {
            if (!enabled) return;

            // Skip if typing in input (except for escape)
            if (isTypingInInput() && event.key !== 'Escape') {
                return;
            }

            // Handle sequence shortcuts (e.g., 'g h')
            const key = event.key.toLowerCase();

            // Clear sequence timeout
            if (sequenceTimeoutRef.current) {
                clearTimeout(sequenceTimeoutRef.current);
            }

            // Build sequence
            sequenceRef.current += sequenceRef.current ? ` ${key}` : key;

            // Check for sequence matches
            const sequenceShortcut = allShortcuts.find(
                (s) =>
                    s.key.toLowerCase() === sequenceRef.current &&
                    (!s.when || s.when())
            );

            if (sequenceShortcut) {
                if (sequenceShortcut.preventDefault !== false) {
                    event.preventDefault();
                }
                sequenceShortcut.action();
                sequenceRef.current = '';
                return;
            }

            // Check for single key or combo matches
            for (const shortcut of allShortcuts) {
                // Skip sequence shortcuts for single key check
                if (shortcut.key.includes(' ')) continue;

                const combo = parseKeyCombo(shortcut.key);

                if (matchesKeyCombo(event, combo)) {
                    // Check condition
                    if (shortcut.when && !shortcut.when()) {
                        continue;
                    }

                    if (shortcut.preventDefault !== false) {
                        event.preventDefault();
                    }

                    shortcut.action();
                    sequenceRef.current = '';
                    return;
                }
            }

            // Set timeout to clear sequence
            sequenceTimeoutRef.current = setTimeout(() => {
                sequenceRef.current = '';
            }, 1000);
        },
        [enabled, allShortcuts]
    );

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            if (sequenceTimeoutRef.current) {
                clearTimeout(sequenceTimeoutRef.current);
            }
        };
    }, [handleKeyDown]);

    // Return utilities for custom usage
    return {
        shortcuts: allShortcuts,
        isEnabled: enabled,
        currentPath: pathname,
    };
}

/**
 * Hook specifically for scoring shortcuts
 */
export function useScoringShortcuts(options: {
    onUndo?: () => void;
    onRedo?: () => void;
    onNextHole?: () => void;
    onPrevHole?: () => void;
    onSaveScore?: () => void;
    enabled?: boolean;
}) {
    const {
        onUndo,
        onRedo,
        onNextHole,
        onPrevHole,
        onSaveScore,
        enabled = true,
    } = options;

    const shortcuts: ShortcutConfig[] = [];

    if (onUndo) {
        shortcuts.push({
            key: 'ctrl+z',
            description: 'Undo last action',
            action: onUndo,
        });
    }

    if (onRedo) {
        shortcuts.push({
            key: 'ctrl+shift+z',
            description: 'Redo last action',
            action: onRedo,
        });
        shortcuts.push({
            key: 'ctrl+y',
            description: 'Redo last action',
            action: onRedo,
        });
    }

    if (onNextHole) {
        shortcuts.push({
            key: 'ArrowRight',
            description: 'Next hole',
            action: onNextHole,
            when: () => !isTypingInInput(),
        });
        shortcuts.push({
            key: 'n',
            description: 'Next hole',
            action: onNextHole,
            when: () => !isTypingInInput(),
        });
    }

    if (onPrevHole) {
        shortcuts.push({
            key: 'ArrowLeft',
            description: 'Previous hole',
            action: onPrevHole,
            when: () => !isTypingInInput(),
        });
        shortcuts.push({
            key: 'p',
            description: 'Previous hole',
            action: onPrevHole,
            when: () => !isTypingInInput(),
        });
    }

    if (onSaveScore) {
        shortcuts.push({
            key: 'ctrl+s',
            description: 'Save score',
            action: onSaveScore,
            preventDefault: true,
        });
    }

    return useKeyboardShortcuts({ enabled, shortcuts });
}

export type { ShortcutConfig };
