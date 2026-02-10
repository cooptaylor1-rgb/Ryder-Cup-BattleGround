/**
 * Captain Mode Toggle Component (P0-2)
 *
 * Header-mounted quick toggle for captain mode.
 * Eliminates navigation to "More" page for frequent captain operations.
 *
 * Features:
 * - Shield icon indicates captain status
 * - Tap to toggle (with PIN prompt for enable)
 * - Visual state: grayed = off, green = on
 */

'use client';

import { useState } from 'react';
import { AlertCircle, KeyRound, Shield, ShieldCheck, X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useUIStore } from '@/lib/stores';

interface CaptainToggleProps {
  className?: string;
}

export function CaptainToggle({ className }: CaptainToggleProps) {
  const { isCaptainMode, enableCaptainMode, disableCaptainMode, captainPinHash, resetCaptainPin } =
    useUIStore();
  const [showPinModal, setShowPinModal] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [attempts, setAttempts] = useState(0);

  const handleToggle = () => {
    if (isCaptainMode) {
      disableCaptainMode();
      return;
    }

    // Show PIN modal to enable
    setShowPinModal(true);
    setPin('');
    setError('');
  };

  const handleEnableCaptain = async () => {
    if (pin.length < 4) {
      setError('PIN must be at least 4 digits');
      return;
    }

    try {
      await enableCaptainMode(pin);
      setShowPinModal(false);
      setPin('');
      setAttempts(0);
    } catch (_err) {
      const newAttempts = attempts + 1;
      setAttempts(newAttempts);
      if (newAttempts >= 3) {
        setError('Too many attempts. Use "Forgot PIN?" to reset.');
      } else {
        setError(`Incorrect PIN (${3 - newAttempts} attempts left)`);
      }
    }
  };

  const handleResetPin = () => {
    resetCaptainPin?.();

    setShowResetConfirm(false);
    setShowPinModal(false);
    setPin('');
    setError('');
    setAttempts(0);

    // Reopen modal to set new PIN
    setTimeout(() => setShowPinModal(true), 100);
  };

  return (
    <>
      <button
        onClick={handleToggle}
        className={cn(
          'press-scale p-[var(--space-2)] rounded-[var(--radius-md)] transition-all duration-200 flex items-center justify-center',
          isCaptainMode ? 'bg-[rgba(var(--masters-rgb),0.15)]' : 'bg-transparent',
          className,
        )}
        aria-label={isCaptainMode ? 'Disable captain mode' : 'Enable captain mode'}
        title={isCaptainMode ? 'Captain Mode ON' : 'Enable Captain Mode'}
      >
        {isCaptainMode ? (
          <ShieldCheck
            size={20}
            strokeWidth={2}
            className="text-[var(--masters)]"
          />
        ) : (
          <Shield
            size={20}
            strokeWidth={1.5}
            className="text-[var(--ink-tertiary)]"
          />
        )}
      </button>

      {/* PIN Modal */}
      {showPinModal && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-[var(--space-4)] bg-black/50 backdrop-blur-[4px]"
          onClick={() => setShowPinModal(false)}
        >
          <div
            className="w-full max-w-[320px] rounded-[var(--radius-xl)] bg-[var(--canvas)] p-[var(--space-6)] shadow-[var(--shadow-xl)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="mb-[var(--space-4)] flex items-center justify-between">
              <div className="flex items-center gap-[var(--space-2)]">
                <Shield size={20} className="text-[var(--masters)]" />
                <h3 className="type-title m-0">Captain Mode</h3>
              </div>
              <button
                onClick={() => setShowPinModal(false)}
                className="press-scale rounded-[var(--radius-md)] p-[var(--space-1)] text-[var(--ink-tertiary)]"
                aria-label="Close"
              >
                <X size={20} />
              </button>
            </div>

            {/* Description */}
            <p className="type-caption mb-[var(--space-4)] text-[var(--ink-secondary)]">
              {captainPinHash
                ? 'Enter your captain PIN to unlock advanced controls.'
                : "Set a 4-digit PIN to enable captain mode. You'll need this PIN to re-enable captain mode later."}
            </p>

            {/* PIN Input */}
            <div className="mb-[var(--space-4)]">
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, '');
                  setPin(val);
                  setError('');
                }}
                placeholder="Enter PIN"
                autoFocus
                className={cn(
                  'w-full rounded-[var(--radius-lg)] bg-[var(--canvas-raised)] px-[var(--space-4)] py-[var(--space-3)] text-[var(--text-xl)] text-center tracking-[0.5em] outline-none',
                  error ? 'border-2 border-[var(--error)]' : 'border border-[var(--rule)]',
                )}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleEnableCaptain();
                  }
                }}
              />
              {error && (
                <p className="mt-[var(--space-2)] text-[var(--error)] text-[var(--text-sm)]">
                  {error}
                </p>
              )}
            </div>

            {/* Forgot PIN link */}
            {captainPinHash && (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="btn-ghost mb-[var(--space-3)] w-full text-sm text-[var(--masters)]"
              >
                <KeyRound size={14} className="mr-1 inline align-middle" />
                Forgot PIN?
              </button>
            )}

            {/* Actions */}
            <div className="flex gap-[var(--space-3)]">
              <button onClick={() => setShowPinModal(false)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button
                onClick={handleEnableCaptain}
                disabled={pin.length < 4 || attempts >= 3}
                className="btn-primary flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {captainPinHash ? 'Unlock' : 'Enable'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset PIN Confirmation Modal */}
      {showResetConfirm && (
        <div
          className="fixed inset-0 z-[101] flex items-center justify-center p-[var(--space-4)] bg-black/60 backdrop-blur-[4px]"
          onClick={() => setShowResetConfirm(false)}
        >
          <div
            className="w-full max-w-[300px] rounded-[var(--radius-xl)] bg-[var(--canvas)] p-[var(--space-6)] text-center shadow-[var(--shadow-xl)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto mb-[var(--space-4)] flex h-14 w-14 items-center justify-center rounded-full bg-red-500/10">
              <AlertCircle size={28} className="text-[var(--error)]" />
            </div>
            <h3 className="type-title mb-[var(--space-2)]">Reset Captain PIN?</h3>
            <p className="type-caption mb-[var(--space-4)] text-[var(--ink-secondary)]">
              This will clear your current PIN. You&apos;ll need to set a new one to access captain
              features.
            </p>
            <div className="flex gap-[var(--space-3)]">
              <button onClick={() => setShowResetConfirm(false)} className="btn-secondary flex-1">
                Cancel
              </button>
              <button onClick={handleResetPin} className="btn-danger flex-1">
                Reset PIN
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default CaptainToggle;
