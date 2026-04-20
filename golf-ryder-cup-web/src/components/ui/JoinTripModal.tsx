/**
 * Join Trip Modal
 *
 * Allows users to join a trip using a share code.
 * Downloads all trip data and sets up real-time sync.
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { syncService } from '@/lib/supabase';
import { ensureCurrentUserTripPlayerLink } from '@/lib/services/tripPlayerLinkService';
import { useAuthStore } from '@/lib/stores';
import { useTripStore } from '@/lib/stores/tripStore';
import { useShallow } from 'zustand/shallow';
import { storeTripShareCode } from '@/lib/utils/tripShareCodeStore';
import { withTripPlayerIdentity } from '@/lib/utils/tripPlayerIdentity';
import { cn } from '@/lib/utils';
import { Users, Loader2, CheckCircle, XCircle, Share2 } from 'lucide-react';
import { Modal } from './Modal';

interface JoinTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (tripId: string) => void;
  /** Pre-fill the share code input (e.g. from a deep link) */
  initialCode?: string;
}

export function JoinTripModal({ isOpen, onClose, onSuccess, initialCode }: JoinTripModalProps) {
  const [shareCode, setShareCode] = useState(initialCode || '');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const router = useRouter();
  const { loadTrip } = useTripStore(useShallow(s => ({ loadTrip: s.loadTrip })));
  const { currentUser, isAuthenticated, authUserId } = useAuthStore();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }
    setShareCode(initialCode?.toUpperCase() || '');
    setIsJoining(false);
    setError(null);
    setSuccess(false);
  }, [initialCode, isOpen]);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
    };
  }, []);

  const handleClose = () => {
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = null;
    }
    onClose();
  };

  const handleJoin = async () => {
    if (!shareCode.trim()) {
      setError('Please enter a share code');
      return;
    }

    // Require a completed profile before rostering someone onto a trip.
    // An incomplete-profile invitee would otherwise show up on the
    // captain's roster as a blank card and the captain would have to
    // chase them for their name/email/handicap after the fact. Route
    // them through the appropriate setup page, preserving the share
    // code via the next= param so they finish back at the same modal.
    const trimmedCode = shareCode.trim();
    const joinPath = `/join?code=${encodeURIComponent(trimmedCode)}`;
    if (!isAuthenticated || !currentUser) {
      router.push(`/login?next=${encodeURIComponent(joinPath)}`);
      return;
    }
    if (!currentUser.hasCompletedOnboarding) {
      router.push(`/profile/complete?next=${encodeURIComponent(joinPath)}`);
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const result = await syncService.joinTripByShareCode(trimmedCode);

      if (result.success && result.synced > 0 && result.tripId) {
        storeTripShareCode(result.tripId, shareCode.trim());
        // Load the trip from local DB (already synced by joinTripByShareCode)
        await loadTrip(result.tripId);
        const loadedPlayers = useTripStore.getState?.()?.players ?? [];
        const linkResult = await ensureCurrentUserTripPlayerLink(
          result.tripId,
          loadedPlayers,
          withTripPlayerIdentity(currentUser, authUserId),
          isAuthenticated
        );
        if (
          linkResult.status === 'claimed-name-match' ||
          linkResult.status === 'created' ||
          linkResult.status === 'linked-email' ||
          linkResult.status === 'linked-id'
        ) {
          await loadTrip(result.tripId);
        }
        setSuccess(true);
        successTimeoutRef.current = setTimeout(() => {
          onSuccess?.(result.tripId!);
          handleClose();
        }, 1500);
      } else {
        setError(result.errors[0] || 'Failed to join trip. Please check the code and try again.');
      }
    } catch {
      setError('Failed to join trip. Please check your connection and try again.');
    } finally {
      setIsJoining(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      ariaLabel="Join a Trip"
      showCloseButton={false}
      closeOnOverlayClick={false}
      closeOnEscape={!isJoining}
      size="md"
      overlayClassName="bg-[color:var(--ink)]/58 backdrop-blur-[6px]"
      panelClassName="max-w-md overflow-hidden rounded-2xl border border-[color:var(--rule-strong)]/75 bg-[var(--canvas-raised)] shadow-[0_28px_80px_rgba(26,24,21,0.24)]"
      contentClassName="p-0"
    >
        {/* Header */}
        <div className="border-b border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,242,236,0.94))] p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-masters-primary/10">
              <Users className="w-6 h-6 text-masters-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[var(--ink)]">Join a Trip</h2>
              <p className="text-sm text-[var(--ink-secondary)]">
                Enter the share code to join
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <h3 className="text-lg font-medium text-success mb-2">Successfully Joined!</h3>
              <p className="text-[var(--ink-secondary)]">Loading trip data...</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <label
                  htmlFor="join-trip-share-code"
                  className="mb-2 block text-sm font-semibold text-[var(--ink)]"
                >
                  Share Code
                </label>
                <input
                  id="join-trip-share-code"
                  type="text"
                  value={shareCode}
                  onChange={(e) => setShareCode(e.target.value.toUpperCase())}
                  placeholder="Enter 8-character code"
                  className={cn(
                    'w-full rounded-lg border bg-[var(--canvas)] px-4 py-3 text-center font-mono text-xl font-semibold tracking-[0.24em] sm:text-2xl',
                    'text-[var(--ink)] placeholder:text-[color:var(--ink-secondary)]/85',
                    'focus:outline-none focus:ring-2 focus:ring-gold focus:ring-offset-2 focus:ring-offset-[color:var(--canvas)]',
                    error ? 'border-error text-error' : 'border-[color:var(--rule-strong)]/85'
                  )}
                  maxLength={8}
                  autoFocus
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? 'join-trip-share-code-error' : undefined}
                />
                {error && (
                  <div
                    id="join-trip-share-code-error"
                    role="alert"
                    className="flex items-center gap-2 mt-2 text-sm text-error"
                  >
                    <XCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
              </div>

              <div className="mb-6 flex items-center gap-3 rounded-lg border border-[color:var(--rule)]/70 bg-[var(--surface-muted)] p-4">
                <Share2 className="w-5 h-5 text-[var(--ink-secondary)]" />
                <div className="text-sm text-[var(--ink-secondary)]">
                  Ask the trip captain for the share code, or find it in the trip settings.
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="flex gap-3 border-t border-[color:var(--rule)]/75 bg-[color:var(--canvas)]/96 p-6">
            <button
              onClick={handleClose}
              className="flex-1 rounded-lg border border-[color:var(--rule-strong)]/75 px-4 py-3 font-medium text-[var(--ink)] transition-colors hover:bg-[var(--surface-muted)]"
            >
              Cancel
            </button>
            <button
              onClick={handleJoin}
              disabled={isJoining || !shareCode.trim()}
              className={cn(
                'flex-1 px-4 py-3 rounded-lg font-medium transition-colors',
                'flex items-center justify-center gap-2',
                'bg-[var(--masters)] text-[var(--canvas)]',
                'hover:bg-[var(--masters-deep)]',
                'disabled:opacity-50 disabled:cursor-not-allowed'
              )}
            >
              {isJoining ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Joining...
                </>
              ) : (
                'Join Trip'
              )}
            </button>
          </div>
        )}
    </Modal>
  );
}

/**
 * Share Trip Button/Card
 */
interface ShareTripProps {
  shareCode: string;
  className?: string;
}

export function ShareTripCard({ shareCode, className }: ShareTripProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      className={cn(
        'p-4 rounded-xl bg-masters-primary/5 border border-masters-primary/20',
        className
      )}
    >
      <div className="flex items-center gap-3 mb-3">
        <Share2 className="w-5 h-5 text-masters-primary" />
        <span className="font-medium text-[var(--ink)]">Share This Trip</span>
      </div>
      <p className="text-sm text-[var(--ink-secondary)] mb-4">
        Share this code with others so they can join and see live scores.
      </p>
      <button
        onClick={handleCopy}
        className={cn(
          'w-full py-3 px-4 rounded-lg',
          'bg-[var(--surface-raised)] border border-[color:var(--rule)]/40',
          'hover:bg-[color:var(--surface)]/60',
          'transition-colors',
          'flex items-center justify-center gap-3'
        )}
      >
        <span className="text-2xl font-mono tracking-[0.5em] font-bold text-[var(--ink)]">
          {shareCode}
        </span>
        <span className="text-sm text-masters-primary">{copied ? 'Copied!' : 'Copy'}</span>
      </button>
    </div>
  );
}

export default JoinTripModal;
