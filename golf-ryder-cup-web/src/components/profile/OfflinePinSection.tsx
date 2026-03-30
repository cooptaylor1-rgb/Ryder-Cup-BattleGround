'use client';

import { useState } from 'react';
import { Lock } from 'lucide-react';
import { createLogger } from '@/lib/utils/logger';

const logger = createLogger('profile:offline-pin');

interface OfflinePinSectionProps {
  hasOfflinePin: boolean;
  isEditing: boolean;
  onSavePin: (pin: string) => Promise<void>;
  onPinSaved: () => void;
  showToast: (type: 'success' | 'error', message: string) => void;
}

export function OfflinePinSection({
  hasOfflinePin,
  isEditing,
  onSavePin,
  onPinSaved,
  showToast,
}: OfflinePinSectionProps) {
  const [showOfflinePinForm, setShowOfflinePinForm] = useState(false);
  const [offlinePin, setOfflinePinValue] = useState('');
  const [confirmOfflinePin, setConfirmOfflinePin] = useState('');
  const [isSavingOfflinePin, setIsSavingOfflinePin] = useState(false);

  const handleSaveOfflinePin = async () => {
    if (!/^\d{4}$/.test(offlinePin)) {
      showToast('error', 'Offline PIN must be exactly 4 digits');
      return;
    }

    if (offlinePin !== confirmOfflinePin) {
      showToast('error', 'Offline PINs do not match');
      return;
    }

    setIsSavingOfflinePin(true);
    try {
      await onSavePin(offlinePin);
      onPinSaved();
      setShowOfflinePinForm(false);
      setOfflinePinValue('');
      setConfirmOfflinePin('');
      showToast('success', hasOfflinePin ? 'Offline PIN updated' : 'Offline PIN saved');
    } catch (error) {
      logger.error('Failed to save offline PIN', { error });
      showToast(
        'error',
        error instanceof Error ? error.message : 'Failed to save offline PIN'
      );
    } finally {
      setIsSavingOfflinePin(false);
    }
  };

  return (
    <section className="bg-canvas-raised border border-rule rounded-[var(--radius-lg)] p-[var(--space-6)] mb-[var(--space-6)]">
      <span className="type-overline text-ink-tertiary tracking-[0.15em] block mb-[var(--space-2)]">
        Access
      </span>
      <h3 className="font-serif text-[length:var(--text-xl)] italic font-normal text-ink m-0 mb-[var(--space-3)] leading-[1.2]">
        Offline Sign-In
      </h3>
      <p className="font-sans text-[length:var(--text-sm)] text-ink-secondary m-0 mb-[var(--space-4)] leading-[1.6]">
        Email sign-in stays your primary account access. Add a 4-digit PIN only if you want
        this device to keep working offline.
      </p>
      <div className="rounded-[var(--radius-md)] border border-rule bg-canvas px-[var(--space-4)] py-[var(--space-4)] mb-[var(--space-4)]">
        <div className="flex items-start justify-between gap-[var(--space-3)]">
          <div>
            <p className="font-sans text-[length:var(--text-sm)] font-semibold text-ink m-0">
              {hasOfflinePin ? 'Offline PIN saved on this device' : 'Offline PIN not set'}
            </p>
            <p className="font-sans text-[length:var(--text-xs)] text-ink-tertiary m-0 mt-[var(--space-1)] leading-[1.5]">
              {hasOfflinePin
                ? 'You can use your device PIN from the sign-in screen when email or network access is unavailable.'
                : 'Without a PIN, this device will rely on your secure email sign-in link.'}
            </p>
          </div>
          {!isEditing && (
            <button
              type="button"
              onClick={() => setShowOfflinePinForm((prev) => !prev)}
              className="press-scale rounded-[var(--radius-full)] border border-rule bg-canvas-raised px-[var(--space-3)] py-[var(--space-2)] font-sans text-[length:var(--text-xs)] font-semibold text-ink-secondary"
            >
              {showOfflinePinForm ? 'Cancel' : hasOfflinePin ? 'Update PIN' : 'Add PIN'}
            </button>
          )}
        </div>
      </div>

      {showOfflinePinForm && !isEditing && (
        <div className="grid grid-cols-1 gap-[var(--space-4)] sm:grid-cols-2">
          <div>
            <label className="flex items-center gap-[var(--space-1)] font-sans text-[length:var(--text-xs)] font-semibold tracking-[0.15em] uppercase text-ink-tertiary mb-[var(--space-2)]">
              <Lock className="w-4 h-4 text-ink-faint" />
              New PIN
            </label>
            <input
              type="password"
              value={offlinePin}
              onChange={(e) => setOfflinePinValue(e.target.value.replace(/\D/g, '').slice(0, 4))}
              inputMode="numeric"
              maxLength={4}
              className="w-full py-[var(--space-2)] px-[var(--space-3)] rounded-[var(--radius-md)] border border-rule bg-canvas-raised font-mono text-[length:var(--text-base)] tracking-[0.3em] text-center text-ink outline-none transition-[border-color,box-shadow] duration-fast box-border focus:border-masters focus:shadow-[var(--shadow-focus)]"
              placeholder="••••"
            />
          </div>
          <div>
            <label className="flex items-center gap-[var(--space-1)] font-sans text-[length:var(--text-xs)] font-semibold tracking-[0.15em] uppercase text-ink-tertiary mb-[var(--space-2)]">
              <Lock className="w-4 h-4 text-ink-faint" />
              Confirm PIN
            </label>
            <input
              type="password"
              value={confirmOfflinePin}
              onChange={(e) =>
                setConfirmOfflinePin(e.target.value.replace(/\D/g, '').slice(0, 4))
              }
              inputMode="numeric"
              maxLength={4}
              className="w-full py-[var(--space-2)] px-[var(--space-3)] rounded-[var(--radius-md)] border border-rule bg-canvas-raised font-mono text-[length:var(--text-base)] tracking-[0.3em] text-center text-ink outline-none transition-[border-color,box-shadow] duration-fast box-border focus:border-masters focus:shadow-[var(--shadow-focus)]"
              placeholder="••••"
            />
          </div>

          <div className="sm:col-span-2 flex justify-end">
            <button
              type="button"
              onClick={handleSaveOfflinePin}
              disabled={isSavingOfflinePin}
              className="btn-premium press-scale"
              style={{
                opacity: isSavingOfflinePin ? 0.6 : 1,
                cursor: isSavingOfflinePin ? 'not-allowed' : 'pointer',
              }}
            >
              {isSavingOfflinePin ? 'Saving PIN...' : hasOfflinePin ? 'Update Offline PIN' : 'Save Offline PIN'}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
