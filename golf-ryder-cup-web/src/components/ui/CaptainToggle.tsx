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
import { KeyRound, Shield, ShieldCheck } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useAccessStore } from '@/lib/stores';
import { ConfirmDialog, Modal } from './Modal';

interface CaptainToggleProps {
  className?: string;
}

export function CaptainToggle({ className }: CaptainToggleProps) {
  const { isCaptainMode, enableCaptainMode, disableCaptainMode, captainPinHash, resetCaptainPin } =
    useAccessStore();
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

  const handleClosePinModal = () => {
    setShowPinModal(false);
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
    } catch (err) {
      // The store enforces an exponential lockout after repeated failures and
      // returns a descriptive message ("Too many incorrect Captain PIN
      // attempts. Locked for 1m."). Surface that directly when present.
      const message = err instanceof Error ? err.message : 'Incorrect PIN';
      const isLockoutMessage = /locked|try again in|too many/i.test(message);

      if (isLockoutMessage) {
        setError(message);
        return;
      }

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

      <Modal
        isOpen={showPinModal}
        onClose={handleClosePinModal}
        ariaLabel="Captain Mode"
        showCloseButton={false}
        closeOnOverlayClick
        closeOnEscape
        size="sm"
        overlayClassName="z-[100] bg-[color:var(--ink)]/50 backdrop-blur-[4px]"
        panelClassName="max-w-[320px] rounded-[var(--radius-xl)] border-0 bg-[var(--canvas)] shadow-[var(--shadow-xl)]"
        contentClassName="p-[var(--space-6)]"
      >
        <div className="mb-[var(--space-4)] flex items-center gap-[var(--space-2)]">
          <Shield size={20} className="text-[var(--masters)]" />
          <h3 className="type-title m-0">Captain Mode</h3>
        </div>

        <p className="type-caption mb-[var(--space-4)] text-[var(--ink-secondary)]">
          {captainPinHash
            ? 'Enter your captain PIN to unlock advanced controls.'
            : "Set a 4-digit PIN to enable captain mode. You'll need this PIN to re-enable captain mode later."}
        </p>

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
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'captain-pin-error' : undefined}
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
            <p id="captain-pin-error" className="mt-[var(--space-2)] text-[var(--error)] text-[var(--text-sm)]">
              {error}
            </p>
          )}
        </div>

        {captainPinHash && (
          <button
            onClick={() => setShowResetConfirm(true)}
            className="btn-ghost mb-[var(--space-3)] w-full text-sm text-[var(--masters)]"
          >
            <KeyRound size={14} className="mr-1 inline align-middle" />
            Forgot PIN?
          </button>
        )}

        <div className="flex gap-[var(--space-3)]">
          <button onClick={handleClosePinModal} className="btn-secondary flex-1">
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
      </Modal>

      <ConfirmDialog
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleResetPin}
        title="Reset Captain PIN?"
        description="This will clear your current PIN. You'll need to set a new one to access captain features."
        confirmLabel="Reset PIN"
        cancelLabel="Cancel"
        variant="danger"
      />
    </>
  );
}

export default CaptainToggle;
