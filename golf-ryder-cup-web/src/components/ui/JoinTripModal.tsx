/**
 * Join Trip Modal
 *
 * Allows users to join a trip using a share code.
 * Downloads all trip data and sets up real-time sync.
 */

'use client';

import { useState, useEffect } from 'react';
import { syncService } from '@/lib/supabase';
import { useTripStore } from '@/lib/stores/tripStore';
import { cn } from '@/lib/utils';
import { Users, Loader2, CheckCircle, XCircle, Share2 } from 'lucide-react';

interface JoinTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (tripId: string) => void;
  /** Pre-fill the share code input (e.g. from a deep link) */
  initialCode?: string;
}

export function JoinTripModal({ isOpen, onClose, onSuccess, initialCode }: JoinTripModalProps) {
  const [shareCode, setShareCode] = useState(initialCode || '');

  // Sync initialCode prop changes into local state
  useEffect(() => {
    if (initialCode) {
      setShareCode(initialCode.toUpperCase());
    }
  }, [initialCode]);
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const { loadTrip } = useTripStore();

  const handleJoin = async () => {
    if (!shareCode.trim()) {
      setError('Please enter a share code');
      return;
    }

    setIsJoining(true);
    setError(null);

    try {
      const result = await syncService.joinTripByShareCode(shareCode.trim());

      if (result.success && result.synced > 0 && result.tripId) {
        // Load the trip from local DB (already synced by joinTripByShareCode)
        await loadTrip(result.tripId);
        setSuccess(true);
        setTimeout(() => {
          onSuccess?.(result.tripId!);
          onClose();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-surface-card rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="p-6 border-b border-surface-200 dark:border-surface-700">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-full bg-masters-primary/10">
              <Users className="w-6 h-6 text-masters-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Join a Trip</h2>
              <p className="text-sm text-surface-500">Enter the share code to join</p>
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
              <p className="text-surface-500">Loading trip data...</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <label className="block text-sm font-medium text-surface-600 dark:text-surface-400 mb-2">
                  Share Code
                </label>
                <input
                  type="text"
                  value={shareCode}
                  onChange={(e) => setShareCode(e.target.value.toUpperCase())}
                  placeholder="Enter 6-character code"
                  className={cn(
                    'w-full px-4 py-3 text-center text-2xl font-mono tracking-widest',
                    'rounded-lg border bg-surface-50 dark:bg-surface-800',
                    'focus:outline-none focus:ring-2 focus:ring-masters-primary',
                    error ? 'border-error text-error' : 'border-surface-200 dark:border-surface-700'
                  )}
                  maxLength={6}
                  autoFocus
                />
                {error && (
                  <div className="flex items-center gap-2 mt-2 text-sm text-error">
                    <XCircle className="w-4 h-4" />
                    {error}
                  </div>
                )}
              </div>

              <div className="flex items-center gap-3 p-4 rounded-lg bg-surface-50 dark:bg-surface-800 mb-6">
                <Share2 className="w-5 h-5 text-surface-400" />
                <div className="text-sm text-surface-500">
                  Ask the trip captain for the share code, or find it in the trip settings.
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="flex gap-3 p-6 border-t border-surface-200 dark:border-surface-700">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 rounded-lg border border-surface-200 dark:border-surface-700 text-surface-600 dark:text-surface-400 font-medium hover:bg-surface-50 dark:hover:bg-surface-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleJoin}
              disabled={isJoining || !shareCode.trim()}
              className={cn(
                'flex-1 px-4 py-3 rounded-lg font-medium transition-colors',
                'flex items-center justify-center gap-2',
                'bg-masters-primary text-white',
                'hover:bg-masters-primary-dark',
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
      </div>
    </div>
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
        <span className="font-medium">Share This Trip</span>
      </div>
      <p className="text-sm text-surface-500 mb-4">
        Share this code with others so they can join and see live scores.
      </p>
      <button
        onClick={handleCopy}
        className={cn(
          'w-full py-3 px-4 rounded-lg',
          'bg-surface-card border border-surface-200 dark:border-surface-700',
          'hover:bg-surface-50 dark:hover:bg-surface-800',
          'transition-colors',
          'flex items-center justify-center gap-3'
        )}
      >
        <span className="text-2xl font-mono tracking-[0.5em] font-bold">{shareCode}</span>
        <span className="text-sm text-masters-primary">{copied ? 'Copied!' : 'Copy'}</span>
      </button>
    </div>
  );
}

export default JoinTripModal;
