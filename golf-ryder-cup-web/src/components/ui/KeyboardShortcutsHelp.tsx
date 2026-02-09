/**
 * Keyboard Shortcuts Help Modal
 *
 * Displays available keyboard shortcuts when user presses '?'
 */
'use client';

import { useEffect, useState } from 'react';
import { X, Keyboard, Command } from 'lucide-react';
import { Button } from '@/components/ui';

interface ShortcutCategory {
    name: string;
    shortcuts: {
        keys: string[];
        description: string;
    }[];
}

const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
    {
        name: 'Navigation',
        shortcuts: [
            { keys: ['g', 'h'], description: 'Go to Home' },
            { keys: ['g', 's'], description: 'Go to Standings' },
            { keys: ['g', 'm'], description: 'Go to Matchups' },
            { keys: ['g', 'l'], description: 'Go to Live View' },
            { keys: ['g', 'p'], description: 'Go to Players' },
            { keys: ['g', 'c'], description: 'Go to Captain Mode' },
        ],
    },
    {
        name: 'Scoring',
        shortcuts: [
            { keys: ['←', '→'], description: 'Previous / Next hole' },
            { keys: ['n'], description: 'Next hole' },
            { keys: ['p'], description: 'Previous hole' },
            { keys: ['Ctrl', 'Z'], description: 'Undo last action' },
            { keys: ['Ctrl', 'Shift', 'Z'], description: 'Redo action' },
            { keys: ['Ctrl', 'S'], description: 'Save score' },
        ],
    },
    {
        name: 'General',
        shortcuts: [
            { keys: ['Esc'], description: 'Close modal / Go back' },
            { keys: ['?'], description: 'Show this help' },
        ],
    },
];

export function KeyboardShortcutsHelp() {
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleShowHelp = () => setIsOpen(true);
        window.addEventListener('show-keyboard-help', handleShowHelp);
        return () => window.removeEventListener('show-keyboard-help', handleShowHelp);
    }, []);

    // Close on escape
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0, 0, 0, 0.6)' }}
            onClick={() => setIsOpen(false)}
        >
            <div
                className="card w-full max-w-lg max-h-[80vh] overflow-auto"
                style={{
                    background: 'var(--surface)',
                    animation: 'popIn 0.2s ease-out',
                }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--rule)' }}>
                    <div className="flex items-center gap-3">
                        <div
                            className="w-10 h-10 rounded-xl flex items-center justify-center"
                            style={{ background: 'var(--masters)', color: 'white' }}
                        >
                            <Keyboard size={20} />
                        </div>
                        <h2 className="type-title">Keyboard Shortcuts</h2>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsOpen(false)}
                        data-dismiss="modal"
                    >
                        <X size={20} />
                    </Button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-6">
                    {SHORTCUT_CATEGORIES.map((category) => (
                        <div key={category.name}>
                            <h3 className="type-overline mb-3" style={{ color: 'var(--masters)' }}>
                                {category.name}
                            </h3>
                            <div className="space-y-2">
                                {category.shortcuts.map((shortcut, idx) => (
                                    <div
                                        key={idx}
                                        className="flex items-center justify-between py-2"
                                    >
                                        <span className="type-body">{shortcut.description}</span>
                                        <div className="flex items-center gap-1">
                                            {shortcut.keys.map((key, keyIdx) => (
                                                <span key={keyIdx} className="flex items-center">
                                                    <kbd
                                                        className="px-2 py-1 text-xs font-mono rounded"
                                                        style={{
                                                            background: 'var(--canvas)',
                                                            border: '1px solid var(--rule)',
                                                            color: 'var(--ink)',
                                                            minWidth: '24px',
                                                            textAlign: 'center',
                                                        }}
                                                    >
                                                        {key === 'Ctrl' ? (
                                                            <span className="flex items-center gap-0.5">
                                                                <Command size={12} />
                                                            </span>
                                                        ) : (
                                                            key
                                                        )}
                                                    </kbd>
                                                    {keyIdx < shortcut.keys.length - 1 && (
                                                        <span className="mx-1 text-xs" style={{ color: 'var(--ink-tertiary)' }}>
                                                            +
                                                        </span>
                                                    )}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="p-4 text-center type-caption border-t border-[var(--rule)]">
                    Press <kbd className="px-1.5 py-0.5 mx-1 text-xs rounded bg-[var(--canvas)] border border-[var(--rule)]">?</kbd> anytime to show shortcuts
                </div>
            </div>
        </div>
    );
}
