/**
 * Session Lock Manager Component
 *
 * P0-6: Provides session finalize/lock functionality with captain PIN unlock.
 * Prevents accidental score changes after session is complete.
 */

'use client';

import { useState } from 'react';
import { Lock, Unlock, AlertTriangle, Check, Shield } from 'lucide-react';
import { Button, Card, CardContent, Modal } from '@/components/ui';
import type { RyderCupSession } from '@/lib/types/models';
import { db } from '@/lib/db';
import { useTripStore } from '@/lib/stores/tripStore';

interface SessionLockManagerProps {
    session: RyderCupSession;
    onLockChange?: (isLocked: boolean) => void;
    className?: string;
}

export function SessionLockManager({
    session,
    onLockChange,
    className = ''
}: SessionLockManagerProps) {
    const { currentTrip } = useTripStore();
    const [showLockModal, setShowLockModal] = useState(false);
    const [showUnlockModal, setShowUnlockModal] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const isLocked = session.isLocked ?? false;
    const captainPin = currentTrip?.captainPin || '1234';

    const handleLockSession = async () => {
        setIsProcessing(true);
        setError(null);

        try {
            await db.sessions.update(session.id, {
                isLocked: true,
                updatedAt: new Date().toISOString(),
            });
            onLockChange?.(true);
            setShowLockModal(false);
        } catch {
            setError('Failed to lock session. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    const handleUnlockSession = async () => {
        if (pinInput !== captainPin) {
            setError('Incorrect PIN. Please enter the Captain PIN to unlock.');
            return;
        }

        setIsProcessing(true);
        setError(null);

        try {
            await db.sessions.update(session.id, {
                isLocked: false,
                updatedAt: new Date().toISOString(),
            });
            onLockChange?.(false);
            setShowUnlockModal(false);
            setPinInput('');
        } catch {
            setError('Failed to unlock session. Please try again.');
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <>
            {/* Lock Status Button */}
            <Button
                variant={isLocked ? 'secondary' : 'outline'}
                size="sm"
                onClick={() => isLocked ? setShowUnlockModal(true) : setShowLockModal(true)}
                className={`gap-2 ${className}`}
            >
                {isLocked ? (
                    <>
                        <Lock className="w-4 h-4 text-[var(--warning)]" />
                        <span className="text-[var(--warning)]">Locked</span>
                    </>
                ) : (
                    <>
                        <Unlock className="w-4 h-4" />
                        <span>Finalize</span>
                    </>
                )}
            </Button>

            {/* Lock Confirmation Modal */}
            <Modal
                isOpen={showLockModal}
                onClose={() => setShowLockModal(false)}
                title="Finalize Session?"
            >
                <div className="space-y-4">
                    <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-full bg-[color:var(--warning)]/12">
                        <Lock className="w-6 h-6 text-[var(--warning)]" />
                    </div>

                    <p className="text-sm text-[var(--ink-secondary)] text-center">
                        Locking this session will prevent any score changes.
                        Only the Captain can unlock it with the PIN.
                    </p>

                    <Card className="bg-[color:var(--warning)]/10 border-[color:var(--warning)]/25">
                        <CardContent className="p-3">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-[var(--warning)] shrink-0 mt-0.5" />
                                <p className="text-xs text-[var(--warning)]">
                                    Make sure all scores have been verified before finalizing.
                                </p>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => setShowLockModal(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="flex-1 bg-[var(--warning)] text-white hover:bg-[color:var(--warning)]/90"
                            onClick={handleLockSession}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <span className="animate-pulse">Locking...</span>
                            ) : (
                                <>
                                    <Check className="w-4 h-4 mr-1" />
                                    Lock Session
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Unlock Modal with PIN */}
            <Modal
                isOpen={showUnlockModal}
                onClose={() => {
                    setShowUnlockModal(false);
                    setPinInput('');
                    setError(null);
                }}
                title="Unlock Session"
            >
                <div className="space-y-4">
                    <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-full bg-[color:var(--info)]/12">
                        <Shield className="w-6 h-6 text-[var(--info)]" />
                    </div>

                    <p className="text-sm text-[var(--ink-secondary)] text-center">
                        Enter the Captain PIN to unlock this session for editing.
                    </p>

                    <div>
                        <label className="block text-sm font-medium text-[var(--ink-secondary)] mb-2">
                            Captain PIN
                        </label>
                        <input
                            type="password"
                            inputMode="numeric"
                            maxLength={6}
                            value={pinInput}
                            onChange={(e) => {
                                setPinInput(e.target.value.replace(/\D/g, ''));
                                setError(null);
                            }}
                            className="w-full px-4 py-3 text-center text-2xl tracking-widest rounded-lg border border-[var(--rule)]
                                     bg-[var(--surface-raised)] text-[var(--ink-primary)] placeholder:text-[var(--ink-tertiary)]
                                     focus:outline-none focus:ring-2 focus:ring-[color:var(--info)]/40 focus:border-[color:var(--info)]/40"
                            placeholder="••••"
                            autoFocus
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-[var(--error)] text-center">
                            {error}
                        </p>
                    )}

                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                                setShowUnlockModal(false);
                                setPinInput('');
                                setError(null);
                            }}
                        >
                            Cancel
                        </Button>
                        <Button
                            className="flex-1"
                            onClick={handleUnlockSession}
                            disabled={isProcessing || pinInput.length < 4}
                        >
                            {isProcessing ? (
                                <span className="animate-pulse">Unlocking...</span>
                            ) : (
                                <>
                                    <Unlock className="w-4 h-4 mr-1" />
                                    Unlock
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Modal>
        </>
    );
}

/**
 * Session Lock Badge - Display-only component for showing lock status
 */
export function SessionLockBadge({ isLocked }: { isLocked: boolean }) {
    if (!isLocked) return null;

    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full
                       bg-[color:var(--warning)]/12 text-[var(--warning)]
                       border border-[color:var(--warning)]/25">
            <Lock className="w-3 h-3" />
            Finalized
        </span>
    );
}
