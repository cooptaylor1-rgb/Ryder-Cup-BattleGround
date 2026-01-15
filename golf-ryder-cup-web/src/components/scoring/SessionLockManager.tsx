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
    const { activeTrip } = useTripStore();
    const [showLockModal, setShowLockModal] = useState(false);
    const [showUnlockModal, setShowUnlockModal] = useState(false);
    const [pinInput, setPinInput] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const isLocked = session.isLocked ?? false;
    const captainPin = activeTrip?.captainPin || '1234';

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
        } catch (err) {
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
        } catch (err) {
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
                        <Lock className="w-4 h-4 text-amber-500" />
                        <span className="text-amber-700 dark:text-amber-400">Locked</span>
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
                    <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/30">
                        <Lock className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                        Locking this session will prevent any score changes.
                        Only the Captain can unlock it with the PIN.
                    </p>

                    <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
                        <CardContent className="p-3">
                            <div className="flex items-start gap-2">
                                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                <p className="text-xs text-amber-800 dark:text-amber-300">
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
                            className="flex-1 bg-amber-600 hover:bg-amber-700"
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
                    <div className="flex items-center justify-center w-12 h-12 mx-auto rounded-full bg-blue-100 dark:bg-blue-900/30">
                        <Shield className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                    </div>

                    <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
                        Enter the Captain PIN to unlock this session for editing.
                    </p>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
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
                            className="w-full px-4 py-3 text-center text-2xl tracking-widest border rounded-lg
                                     focus:ring-2 focus:ring-blue-500 focus:border-transparent
                                     dark:bg-gray-800 dark:border-gray-700"
                            placeholder="••••"
                            autoFocus
                        />
                    </div>

                    {error && (
                        <p className="text-sm text-red-600 dark:text-red-400 text-center">
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
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium
                       bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400
                       rounded-full">
            <Lock className="w-3 h-3" />
            Finalized
        </span>
    );
}
