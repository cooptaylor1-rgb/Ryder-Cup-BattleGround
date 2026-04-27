'use client';

/**
 * Password Reset — New Password Screen
 *
 * Landed on after clicking the recovery link in the password-reset email.
 * The Supabase recovery link redirects directly here with a short-lived
 * session that's only valid for `auth.updateUser`. This page:
 *
 *   1. Reads the URL on mount and asks Supabase to convert whatever it
 *      finds (a PKCE `?code=`, a `?token_hash=&type=recovery`, a legacy
 *      `?token=&type=recovery`, or a `#access_token=` hash bundle) into
 *      a real session.
 *   2. If that yields a session, shows the "pick a new password" form.
 *   3. If it doesn't, immediately tells the user *why* (server error,
 *      missing token, redirect not on allow-list…) and lets them request
 *      another link inline — no need to navigate back to /login.
 *
 * Earlier versions silently waited for the global auth bridge to settle
 * when the URL was missing tokens, which produced the dreaded "page
 * leads to nothing" failure mode for misconfigured email templates.
 */

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, ChevronRight, MailCheck, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui';
import { useAuthStore, useToastStore } from '@/lib/stores';
import {
  completeSupabaseAuthFromUrl,
  describeAuthUrl,
  getSupabaseSession,
  sendPasswordResetEmail,
  setNewPassword,
} from '@/lib/supabase/auth';

type RecoveryStatus =
  | 'verifying'
  | 'ready'
  | 'expired'
  | 'unrecognized'
  | 'error';

interface RecoveryDiagnostic {
  presentKeys: string[];
  hasAnyToken: boolean;
  errorCode: string | null;
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const showToast = useToastStore((state) => state.showToast);

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [status, setStatus] = useState<RecoveryStatus>('verifying');
  const [statusDetail, setStatusDetail] = useState<string | null>(null);
  const [diagnostic, setDiagnostic] = useState<RecoveryDiagnostic | null>(null);

  // Inline "send a new link" form so a stranded user doesn't have to
  // navigate back to /login when their reset link comes up empty.
  const initialEmail = useAuthStore((state) => state.authEmail) ?? '';
  const [resendEmail, setResendEmail] = useState(initialEmail);
  const [resendInFlight, setResendInFlight] = useState(false);
  const [resendSentTo, setResendSentTo] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const finishRecovery = async () => {
      const href = window.location.href;
      const url = describeAuthUrl(href);
      const hasAnyToken =
        url.hasCode ||
        url.hasTokenHash ||
        url.hasLegacyToken ||
        (url.hasAccessToken && url.hasRefreshToken);

      const result = await completeSupabaseAuthFromUrl(href);
      if (cancelled) return;

      // Strip the URL once consumed so a refresh doesn't try to re-verify
      // an already-spent token. Only do this on success / explicit error
      // — leave noop URLs intact in case the user wants to copy them.
      if (
        (result.status === 'success' || result.status === 'error') &&
        (window.location.search || window.location.hash)
      ) {
        window.history.replaceState(null, '', '/auth/reset-password');
      }

      if (result.status === 'success') {
        const session = await getSupabaseSession();
        if (cancelled) return;
        useAuthStore.getState().syncSupabaseSession(session);
        if (session) {
          setStatus('ready');
          return;
        }
        setStatus('expired');
        setStatusDetail(
          "We verified the link but couldn't open a recovery session. The link may have already been used."
        );
        return;
      }

      if (result.status === 'error') {
        setStatus('error');
        setStatusDetail(result.message);
        setDiagnostic({
          presentKeys: url.presentKeys,
          hasAnyToken,
          errorCode: url.errorCode,
        });
        return;
      }

      // result.status === 'noop' — nothing usable in the URL.
      // Before declaring failure, check if the user already has a session
      // (the older Supabase client could have consumed the URL on a prior
      // mount and stored it).
      const existingSession = await getSupabaseSession();
      if (cancelled) return;
      if (existingSession) {
        useAuthStore.getState().syncSupabaseSession(existingSession);
        setStatus('ready');
        return;
      }

      setStatus(hasAnyToken ? 'expired' : 'unrecognized');
      setStatusDetail(
        hasAnyToken
          ? 'The token in this link is no longer valid. Reset links expire quickly and only work once.'
          : "This page didn't receive a valid recovery token. Most often the email link wasn't redirected through this app's domain — request a fresh link below."
      );
      setDiagnostic({
        presentKeys: url.presentKeys,
        hasAnyToken,
        errorCode: url.errorCode,
      });
    };

    void finishRecovery().catch((err) => {
      if (cancelled) return;
      setStatus('error');
      setStatusDetail(err instanceof Error ? err.message : 'Could not verify this reset link.');
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setError(null);
      if (password !== confirm) {
        setError("Those passwords don't match.");
        return;
      }
      if (password.length < 6) {
        setError("Pick a password that's at least 6 characters.");
        return;
      }
      setSubmitting(true);
      try {
        await setNewPassword(password);
        showToast('success', "Password updated. You're signed in.");
        router.replace('/');
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't update password.");
      } finally {
        setSubmitting(false);
      }
    },
    [password, confirm, showToast, router]
  );

  const handleResend = useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      const trimmed = resendEmail.trim().toLowerCase();
      if (!trimmed) {
        setStatusDetail('Enter the email on your account first.');
        return;
      }
      setResendInFlight(true);
      try {
        await sendPasswordResetEmail(trimmed);
        setResendSentTo(trimmed);
        setStatusDetail(null);
      } catch (err) {
        setStatusDetail(
          err instanceof Error ? err.message : "Couldn't send the reset email. Try again."
        );
      } finally {
        setResendInFlight(false);
      }
    },
    [resendEmail]
  );

  const inputClasses =
    'w-full rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--canvas-raised)] px-4 py-3 text-[var(--ink)] outline-none transition-[border-color,box-shadow] focus:border-[var(--masters)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--masters)_16%,transparent)]';

  if (status === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--canvas)]">
        <div className="w-full max-w-md rounded-2xl border border-[var(--rule)] bg-[var(--surface)] p-6 shadow-lg text-center">
          <div className="mx-auto h-10 w-10 rounded-full border-[3px] border-[var(--rule)] border-t-[var(--masters)] animate-spin" />
          <p className="mt-4 text-sm text-[var(--ink-secondary)]">Verifying your reset link…</p>
        </div>
      </div>
    );
  }

  if (status === 'ready') {
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
            disabled={submitting}
            rightIcon={<ChevronRight size={16} />}
          >
            Update password
          </Button>
        </form>
      </div>
    );
  }

  // Failure surfaces — expired, unrecognized, or hard error all share the
  // same recovery layout. The only thing that varies is the headline copy.
  const headline =
    status === 'expired'
      ? 'Reset link expired'
      : status === 'unrecognized'
        ? "This link didn't carry a token"
        : "Couldn't verify this link";
  const subhead = statusDetail ?? 'Request another link below.';

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[var(--canvas)]">
      <div className="w-full max-w-md rounded-2xl border border-[var(--rule)] bg-[var(--surface)] p-6 shadow-lg">
        <h1 className="font-serif italic text-2xl text-[var(--ink-primary)]">{headline}</h1>
        <p className="mt-2 text-sm text-[var(--ink-secondary)]">{subhead}</p>

        {resendSentTo ? (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-[color:var(--masters)]/30 bg-[color:var(--masters)]/8 px-3 py-3 text-sm text-[var(--ink)]">
            <MailCheck size={18} className="mt-0.5 shrink-0 text-[var(--masters)]" />
            <div>
              <p className="font-semibold">A fresh reset link is on its way.</p>
              <p className="mt-1 text-xs text-[var(--ink-secondary)]">
                Sent to <span className="font-mono">{resendSentTo}</span>. Check your inbox (and spam)
                — links expire in about an hour.
              </p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleResend} className="mt-5">
            <label className="block text-sm text-[var(--ink-secondary)]">
              Send a new reset email
              <input
                type="email"
                inputMode="email"
                autoComplete="email"
                className={`${inputClasses} mt-1`}
                value={resendEmail}
                onChange={(e) => setResendEmail(e.target.value)}
                placeholder="you@example.com"
                disabled={resendInFlight}
                required
              />
            </label>
            <Button
              type="submit"
              variant="primary"
              className="mt-4 w-full"
              isLoading={resendInFlight}
              disabled={resendInFlight}
              rightIcon={<RefreshCcw size={16} />}
            >
              Email me a new link
            </Button>
          </form>
        )}

        <Button
          variant="ghost"
          className="mt-3 w-full"
          onClick={() => router.replace('/login')}
        >
          Back to sign in
        </Button>

        {diagnostic && diagnostic.presentKeys.length > 0 && (
          <details className="mt-5 rounded-xl border border-[color:var(--rule)] bg-[color:var(--canvas-sunken)] px-3 py-2 text-xs text-[var(--ink-tertiary)]">
            <summary className="cursor-pointer select-none">
              Technical details (helpful when reporting this)
            </summary>
            <p className="mt-2 break-words">
              URL params received: <span className="font-mono">{diagnostic.presentKeys.join(', ')}</span>
            </p>
            {diagnostic.errorCode && (
              <p className="mt-1 break-words">
                Server returned error code:{' '}
                <span className="font-mono text-[var(--error)]">{diagnostic.errorCode}</span>
              </p>
            )}
            {!diagnostic.hasAnyToken && (
              <p className="mt-1">
                The link didn&apos;t include any of <span className="font-mono">code</span>,{' '}
                <span className="font-mono">token_hash</span>,{' '}
                <span className="font-mono">token</span>, or{' '}
                <span className="font-mono">access_token</span> — the email template or Supabase
                redirect allow-list is likely misconfigured.
              </p>
            )}
          </details>
        )}
      </div>
    </div>
  );
}
