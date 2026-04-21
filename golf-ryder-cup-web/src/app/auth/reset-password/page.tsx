'use client';

/**
 * Password Reset — New Password Screen
 *
 * Landed on after clicking the reset email. The Supabase recovery
 * link hands /auth/callback a short-lived session scoped to
 * updateUser, which then redirects here via next=. We don't need to
 * re-verify the user — the session *is* the verification.
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuthStore, useToastStore } from '@/lib/stores';
import { setNewPassword, getSupabaseSession } from '@/lib/supabase/auth';

export default function ResetPasswordPage() {
  const router = useRouter();
  const showToast = useToastStore((state) => state.showToast);
  const hasResolvedSupabaseSession = useAuthStore((state) => state.hasResolvedSupabaseSession);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasRecoverySession, setHasRecoverySession] = useState<boolean | null>(null);

  // Guard the page: without a recovery session the reset has no
  // authority. If the user hit this URL directly or their session
  // expired, send them back to login with a helpful message.
  useEffect(() => {
    if (!hasResolvedSupabaseSession) return;
    let cancelled = false;
    void getSupabaseSession().then((session) => {
      if (cancelled) return;
      setHasRecoverySession(Boolean(session));
    });
    return () => {
      cancelled = true;
    };
  }, [hasResolvedSupabaseSession]);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setError(null);
      if (password !== confirm) {
        setError("Those passwords don't match.");
        return;
      }
      if (password.length < 6) {
        setError('Pick a password that\'s at least 6 characters.');
        return;
      }
      setSubmitting(true);
      try {
        await setNewPassword(password);
        showToast('success', 'Password updated. You\'re signed in.');
        router.replace('/');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Couldn\'t update password.');
      } finally {
        setSubmitting(false);
      }
    },
    [password, confirm, showToast, router]
  );

  const inputClasses =
    'w-full rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--canvas-raised)] px-4 py-3 text-[var(--ink)] outline-none transition-[border-color,box-shadow] focus:border-[var(--masters)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--masters)_16%,transparent)]';

  if (hasRecoverySession === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--canvas)]">
        <div className="w-full max-w-md rounded-2xl border border-[var(--rule)] bg-[var(--surface)] p-6 shadow-lg text-center">
          <h1 className="font-serif italic text-2xl text-[var(--ink-primary)]">
            Reset link expired
          </h1>
          <p className="mt-3 text-sm text-[var(--ink-secondary)]">
            Password reset links are single-use and expire quickly. Request a new one from the
            login page.
          </p>
          <Button
            variant="primary"
            className="mt-5 w-full"
            onClick={() => router.replace('/login')}
          >
            Back to sign in
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--canvas)]">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-2xl border border-[var(--rule)] bg-[var(--surface)] p-6 shadow-lg"
      >
        <div className="flex items-center gap-3">
          <div className="rounded-full bg-[color:var(--masters)]/15 p-2 text-[var(--masters)]">
            <Lock size={20} />
          </div>
          <div>
            <p className="type-overline text-[var(--ink-tertiary)]">Account recovery</p>
            <h1 className="font-serif italic text-xl text-[var(--ink-primary)]">
              Pick a new password
            </h1>
          </div>
        </div>

        <label className="mt-5 block text-sm text-[var(--ink-secondary)]">
          New password
          <input
            autoFocus
            type="password"
            autoComplete="new-password"
            className={`${inputClasses} mt-1`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            minLength={6}
            required
          />
        </label>

        <label className="mt-4 block text-sm text-[var(--ink-secondary)]">
          Confirm password
          <input
            type="password"
            autoComplete="new-password"
            className={`${inputClasses} mt-1`}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={submitting}
            minLength={6}
            required
          />
        </label>

        {error && (
          <p className="mt-3 rounded-md bg-[color:var(--error)]/10 px-3 py-2 text-sm text-[var(--error)]">
            {error}
          </p>
        )}

        <Button
          type="submit"
          variant="primary"
          className="mt-5 w-full"
          isLoading={submitting}
          disabled={submitting || hasRecoverySession !== true}
          rightIcon={<ChevronRight size={16} />}
        >
          Update password
        </Button>
      </form>
    </div>
  );
}
