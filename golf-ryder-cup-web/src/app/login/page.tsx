'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores';
import { Mail, Lock, Eye, EyeOff, ArrowRight, UserPlus, WifiOff } from 'lucide-react';
import { PageLoadingSkeleton } from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  sendPasswordResetEmail,
  signInWithEmailPassword,
  signUpWithEmailPassword,
} from '@/lib/supabase/auth';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { safeNextPath } from '@/lib/utils/navigation';

/**
 * LOGIN PAGE — Fried Egg Editorial
 *
 * Warm cream canvas, Instrument Serif display type,
 * generous whitespace, and confident restraint.
 */

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    login,
    isAuthenticated,
    currentUser,
    isLoading,
    error,
    clearError,
    authUserId,
    authEmail,
    hasResolvedSupabaseSession,
  } = useAuthStore();

  const requestedNext = searchParams?.get('next') ?? searchParams?.get('returnTo');
  const nextPath = safeNextPath(requestedNext);
  const nextParam = nextPath !== '/' ? `?next=${encodeURIComponent(nextPath)}` : '';
  const cloudSignInRequested = searchParams?.get('cloud') === '1' && isSupabaseConfigured;
  const needsCloudSession =
    cloudSignInRequested && isAuthenticated && Boolean(currentUser) && !authUserId;

  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Email+password replaces the old magic-link flow (Supabase's built-in
  // SMTP hit its 3-4/hour rate limit during the event and blocked
  // everyone). Users pick a password at signup; no emails ever sent.
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authMode, setAuthMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [isCloudAuthInFlight, setIsCloudAuthInFlight] = useState(false);
  const [showOfflinePinForm, setShowOfflinePinForm] = useState(!isSupabaseConfigured);
  const [isOffline, setIsOffline] = useState(false);
  const [isResetInFlight, setIsResetInFlight] = useState(false);
  const [resetSentTo, setResetSentTo] = useState<string | null>(null);
  const [didPrefillCloudEmail, setDidPrefillCloudEmail] = useState(false);

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      if (cloudSignInRequested && !authUserId) {
        return;
      }

      if (!currentUser.hasCompletedOnboarding) {
        const nextParam = nextPath !== '/' ? `?next=${encodeURIComponent(nextPath)}` : '';
        router.push(`/profile/complete${nextParam}`);
      } else {
        router.push(nextPath);
      }
    }
  }, [authUserId, cloudSignInRequested, currentUser, isAuthenticated, nextPath, router]);

  useEffect(() => {
    if (!hasResolvedSupabaseSession || !authEmail || currentUser) {
      return;
    }

    const nextParam = nextPath !== '/' ? `?next=${encodeURIComponent(nextPath)}` : '';
    router.replace(`/profile/create${nextParam}`);
  }, [authEmail, currentUser, hasResolvedSupabaseSession, nextPath, router]);

  useEffect(() => {
    if (!cloudSignInRequested || didPrefillCloudEmail || email) {
      return;
    }

    const preferredEmail = currentUser?.email ?? authEmail ?? '';
    if (preferredEmail) {
      setEmail(preferredEmail);
      setDidPrefillCloudEmail(true);
    }
  }, [authEmail, cloudSignInRequested, currentUser?.email, didPrefillCloudEmail, email]);

  useEffect(() => {
    if (!isSupabaseConfigured || typeof window === 'undefined') {
      return;
    }

    const syncConnectionState = () => {
      const offline = !window.navigator.onLine;
      setIsOffline(offline);
      if (offline) {
        setShowOfflinePinForm(true);
      }
    };

    syncConnectionState();
    window.addEventListener('online', syncConnectionState);
    window.addEventListener('offline', syncConnectionState);

    return () => {
      window.removeEventListener('online', syncConnectionState);
      window.removeEventListener('offline', syncConnectionState);
    };
  }, []);

  useEffect(() => {
    // Intentionally only re-run when the user edits email/password/pin.
    // Including `error` in the dep array would cause this effect to
    // clear the error the instant it's set, making sign-in failures
    // invisible.
    if (error) {
      clearError();
    }
    // If the user starts editing the email after asking for a reset,
    // the "sent to X" confirmation is stale — clear it so they don't
    // think the new email is what was sent.
    setResetSentTo((current) =>
      current && current !== email.trim().toLowerCase() ? null : current
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, password, pin]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showOfflinePinForm || !email || !pin) return;

    setIsSubmitting(true);
    await login(email, pin);
    setIsSubmitting(false);
    // Redirect handled by useEffect.
  };

  const handleCloudAuth = async () => {
    if (!email || !password || !isSupabaseConfigured) {
      return;
    }

    setIsCloudAuthInFlight(true);
    try {
      if (authMode === 'sign-up') {
        await signUpWithEmailPassword(email, password);
      } else {
        await signInWithEmailPassword(email, password);
      }
      clearError();
      // The Supabase session listener (SupabaseAuthBridge) picks up the
      // new session; the useEffect at the top of this component drives
      // the redirect to /profile/create or the original next= path.
    } catch (requestError) {
      const raw = requestError instanceof Error ? requestError.message : 'Sign-in failed';
      // Map the common Supabase error families onto copy the user
      // can act on. Anything unmapped falls through to the raw
      // message so we never hide a real failure, but covers the
      // cases that show up in Sentry 95% of the time:
      //   - duplicate email on sign-up
      //   - wrong password on sign-in
      //   - weak password ("Password should be at least N characters")
      //   - malformed email
      //   - network drops / Supabase 500s
      //   - rate limit
      const friendly = /already registered/i.test(raw)
        ? "That email already has an account. Switch to Sign in and use your existing password (or reset it if you've forgotten)."
        : /invalid login credentials/i.test(raw)
          ? "Email or password didn't match. Double-check both, or switch to Sign up if you're new here."
          : /password.*(at least|length|too (short|weak)|characters)/i.test(raw)
            ? 'Pick a longer password — at least 6 characters.'
            : /invalid.*email|unable to validate email/i.test(raw)
              ? "That email doesn't look right. Check for typos and try again."
              : /rate limit|too many requests/i.test(raw)
                ? 'Too many attempts in a short window. Wait a minute and try again.'
                : /network|fetch|failed to fetch/i.test(raw)
                  ? "Couldn't reach the server. Check your connection and try again — your local work is safe."
                  : /user not found/i.test(raw)
                    ? 'No account on that email yet. Switch to Sign up to create one.'
                    : raw;
      useAuthStore.setState({ error: friendly });
    } finally {
      setIsCloudAuthInFlight(false);
    }
  };

  const handleCreateAccount = () => {
    router.push(`/profile/create${nextParam}`);
  };

  const handleForgotPassword = async () => {
    if (!email || !isSupabaseConfigured) {
      useAuthStore.setState({
        error: 'Enter the email on your account first so we know where to send the reset link.',
      });
      return;
    }
    setIsResetInFlight(true);
    clearError();
    try {
      await sendPasswordResetEmail(email);
      setResetSentTo(email.trim().toLowerCase());
    } catch (requestError) {
      const message =
        requestError instanceof Error
          ? requestError.message
          : "Couldn't send the reset email. Try again.";
      useAuthStore.setState({ error: message });
    } finally {
      setIsResetInFlight(false);
    }
  };

  const canSubmit = Boolean(
    showOfflinePinForm && email && pin.length === 4 && !isSubmitting && !isLoading
  );

  const inputBaseClasses =
    'w-full rounded-[var(--radius-md)] border bg-[var(--canvas-raised)] px-4 py-3 text-[length:var(--text-base)] text-[var(--ink)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--ink-tertiary)] focus:border-[var(--masters)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--masters)_16%,transparent)]';

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)] flex flex-col">
      {/* Editorial Header */}
      <header className="container-editorial pt-[max(3rem,env(safe-area-inset-top,0px))]">
        <div className="text-center mb-[var(--space-10)]">
          <p className="type-overline text-[var(--ink-tertiary)] tracking-[0.15em] mb-[var(--space-3)]">
            RYDER CUP BATTLEGROUND
          </p>

          <h1 className="font-serif italic font-normal text-[clamp(2rem,8vw,3rem)] leading-[1.1] text-[var(--ink)] mb-[var(--space-3)]">
            {needsCloudSession ? 'Finish Cloud Sign-In' : 'Welcome Back'}
          </h1>

          <p className="font-sans text-[length:var(--text-base)] text-[var(--ink-secondary)]">
            {needsCloudSession
              ? 'Enter your account password to send saved changes.'
              : 'Sign in to your trip'}
          </p>
        </div>
      </header>

      {/* Form */}
      <main className="container-editorial flex-1">
        <form onSubmit={handleLogin} className="max-w-sm mx-auto">
          {/* Email */}
          {needsCloudSession && (
            <div className="mb-[var(--space-6)] rounded-[var(--radius-md)] border border-[color:var(--warning)]/25 bg-[color:var(--warning)]/10 px-[var(--space-4)] py-[var(--space-3)]">
              <p className="font-sans text-[length:var(--text-sm)] font-semibold text-[var(--ink)]">
                Local profile is signed in. Cloud saving still needs your account session.
              </p>
              <p className="mt-1 font-sans text-[length:var(--text-xs)] leading-relaxed text-[var(--ink-secondary)]">
                After this sign-in, the saved changes on this device will retry automatically.
              </p>
            </div>
          )}

          {/* Email */}
          <div className="mb-[var(--space-6)]">
            <label
              htmlFor="email"
              className="block font-sans text-[length:var(--text-sm)] font-medium text-[var(--ink-secondary)] mb-[var(--space-2)] tracking-[0.02em]"
            >
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-[14px] top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--ink-tertiary)]" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                aria-invalid={Boolean(error)}
                className={cn(inputBaseClasses, 'pl-11', error && 'border-[var(--error)]')}
              />
            </div>
          </div>

          {isSupabaseConfigured && (
            <>
              {/* Password field. The old magic-link button lived here and
                  kept getting rate-limited by Supabase's built-in SMTP;
                  password auth needs no email delivery at all. */}
              <div className="mb-[var(--space-6)]">
                <label
                  htmlFor="password"
                  className="block font-sans text-[length:var(--text-sm)] font-medium text-[var(--ink-secondary)] mb-[var(--space-2)] tracking-[0.02em]"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-[14px] top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--ink-tertiary)]" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={authMode === 'sign-up' ? 'At least 6 characters' : 'Your password'}
                    autoComplete={authMode === 'sign-up' ? 'new-password' : 'current-password'}
                    aria-invalid={Boolean(error)}
                    className={cn(
                      inputBaseClasses,
                      'pl-11 pr-12',
                      error && 'border-[var(--error)]'
                    )}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && email && password && !isCloudAuthInFlight) {
                        e.preventDefault();
                        void handleCloudAuth();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--ink-tertiary)] transition-opacity hover:opacity-80"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {/* Sign-in users get a forgot-password escape hatch;
                    sign-up users don't need one (no password yet). */}
                {authMode === 'sign-in' && (
                  <div className="mt-[var(--space-2)] flex justify-end">
                    {resetSentTo ? (
                      <span className="text-xs text-[var(--masters)]">
                        Reset email sent to {resetSentTo}. Check your inbox.
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={handleForgotPassword}
                        disabled={isResetInFlight || !email || !isSupabaseConfigured}
                        className="text-xs text-[var(--ink-secondary)] underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {isResetInFlight ? 'Sending reset link…' : 'Forgot password?'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleCloudAuth}
                disabled={!email || !password || isCloudAuthInFlight}
                className={cn(
                  'btn-premium press-scale mb-[var(--space-4)] w-full rounded-[var(--radius-md)] px-6 py-4 font-sans text-[length:var(--text-base)] font-semibold flex items-center justify-center gap-[var(--space-2)] transition-[background-color,color,opacity] border border-transparent',
                  email && password && !isCloudAuthInFlight
                    ? 'bg-[var(--masters)] text-[var(--canvas)]'
                    : 'bg-[var(--rule)] text-[var(--ink-tertiary)] cursor-not-allowed opacity-90'
                )}
              >
                {isCloudAuthInFlight ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-[color:var(--canvas)]/30 border-t-[color:var(--canvas)] animate-spin" />
                    {authMode === 'sign-up' ? 'Creating account…' : 'Signing in…'}
                  </>
                ) : (
                  <>
                    {authMode === 'sign-up' ? 'Create Account' : 'Sign In'}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>

              <div className="mb-[var(--space-6)] text-center">
                <button
                  type="button"
                  onClick={() => setAuthMode((m) => (m === 'sign-in' ? 'sign-up' : 'sign-in'))}
                  className="font-sans text-[length:var(--text-sm)] text-[var(--masters)] underline-offset-4 hover:underline"
                >
                  {authMode === 'sign-in'
                    ? 'New here? Create an account instead.'
                    : 'Already have an account? Sign in instead.'}
                </button>
              </div>

              <div className="mx-auto my-[var(--space-6)] flex items-center gap-[var(--space-4)]">
                <div className="h-px flex-1 bg-[var(--rule)]" />
                <span className="font-sans text-sm text-[var(--ink-tertiary)]">
                  Use offline PIN
                </span>
                <div className="h-px flex-1 bg-[var(--rule)]" />
              </div>
            </>
          )}

          {error && (
            <div className="rounded-[var(--radius-md)] border border-[color:var(--error)]/20 bg-[color:var(--error)]/10 px-[var(--space-4)] py-[var(--space-3)] mb-[var(--space-6)]">
              <p className="font-sans text-[length:var(--text-sm)] text-[var(--error)]">{error}</p>
            </div>
          )}

          {isSupabaseConfigured && (
            <div className="mb-[var(--space-6)] rounded-[var(--radius-md)] border border-[var(--rule)] bg-[var(--canvas-raised)] px-[var(--space-4)] py-[var(--space-4)]">
              <div className="flex items-start justify-between gap-[var(--space-3)]">
                <div>
                  <p className="font-sans text-[length:var(--text-sm)] font-semibold text-[var(--ink)]">
                    Use an offline PIN on this device
                  </p>
                  <p className="mt-[var(--space-1)] font-sans text-[length:var(--text-xs)] text-[var(--ink-tertiary)] leading-relaxed">
                    {isOffline
                      ? 'You appear to be offline. Use the PIN already saved on this device.'
                      : 'Only use this when email is unavailable or you need this device to keep working offline.'}
                  </p>
                </div>
                {!isOffline && (
                  <button
                    type="button"
                    onClick={() => setShowOfflinePinForm((prev) => !prev)}
                    className="press-scale rounded-[var(--radius-full)] border border-[var(--rule)] px-[var(--space-3)] py-[var(--space-1)] font-sans text-[length:var(--text-xs)] font-semibold text-[var(--ink-secondary)]"
                  >
                    {showOfflinePinForm ? 'Hide PIN' : 'Use Offline PIN'}
                  </button>
                )}
              </div>

              {isOffline && (
                <div className="mt-[var(--space-3)] flex items-center gap-[var(--space-2)] rounded-[var(--radius-sm)] bg-[var(--surface)] px-[var(--space-3)] py-[var(--space-2)]">
                  <WifiOff className="h-4 w-4 text-[var(--ink-tertiary)]" />
                  <p className="font-sans text-[length:var(--text-xs)] text-[var(--ink-secondary)]">
                    Offline detected. Cloud sign-in will work again when your connection returns.
                  </p>
                </div>
              )}
            </div>
          )}

          {showOfflinePinForm && (
            <>
              <div className="mb-[var(--space-6)]">
                <label
                  htmlFor="pin"
                  className="block font-sans text-[length:var(--text-sm)] font-medium text-[var(--ink-secondary)] mb-[var(--space-2)] tracking-[0.02em]"
                >
                  4-Digit PIN
                </label>
                <p className="mb-[var(--space-2)] font-sans text-[length:var(--text-xs)] text-[var(--ink-tertiary)]">
                  This only works if you already saved offline access on this device.
                </p>
                <div className="relative">
                  <Lock className="absolute left-[14px] top-1/2 -translate-y-1/2 h-5 w-5 text-[var(--ink-tertiary)]" />
                  <input
                    id="pin"
                    type={showPin ? 'text' : 'password'}
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="••••"
                    inputMode="numeric"
                    maxLength={4}
                    autoComplete="current-password"
                    aria-invalid={Boolean(error)}
                    className={cn(
                      inputBaseClasses,
                      'pl-11 pr-12 font-mono text-[length:var(--text-lg)] tracking-[0.3em] text-center',
                      error && 'border-[var(--error)]'
                    )}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPin((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-[var(--ink-tertiary)] transition-opacity hover:opacity-80"
                    aria-label={showPin ? 'Hide PIN' : 'Show PIN'}
                  >
                    {showPin ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Sign In Button */}
              <button
                type="submit"
                disabled={!canSubmit}
                className={cn(
                  'press-scale w-full rounded-[var(--radius-md)] px-6 py-4 font-sans text-[length:var(--text-base)] font-semibold flex items-center justify-center gap-[var(--space-2)] transition-[background-color,color,opacity,border-color] border',
                  canSubmit
                    ? 'bg-transparent text-[var(--ink)] border-[var(--rule)]'
                    : 'bg-[var(--surface)] text-[var(--ink-tertiary)] border-[var(--rule)] cursor-not-allowed opacity-90'
                )}
              >
                {isSubmitting || isLoading ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-[color:var(--canvas)]/30 border-t-[color:var(--canvas)] animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    Use Offline PIN
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </>
          )}
        </form>

        {/* Divider */}
        <div className="mx-auto my-[var(--space-8)] flex max-w-sm items-center gap-[var(--space-4)]">
          <div className="h-px flex-1 bg-[var(--rule)]" />
          <span className="font-sans text-sm text-[var(--ink-tertiary)]">New here?</span>
          <div className="h-px flex-1 bg-[var(--rule)]" />
        </div>

        {/* Create Account */}
        <button
          onClick={handleCreateAccount}
          className="press-scale w-full max-w-sm mx-auto flex items-center justify-center gap-[var(--space-2)] rounded-[var(--radius-md)] border border-[var(--rule)] bg-transparent px-6 py-3.5 font-sans text-[length:var(--text-base)] font-medium text-[var(--ink)] transition-[background-color] hover:bg-[var(--surface)]"
        >
          <UserPlus className="h-5 w-5" />
          Create Your Profile
        </button>

        {/* Footer note */}
        <p className="text-center font-sans text-[length:var(--text-xs)] text-[var(--ink-tertiary)] mt-[var(--space-8)] leading-relaxed">
          Cloud sign-in keeps your saved changes moving across devices.
          <br />
          Offline PIN access is device-specific and optional.
        </p>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton title="Loading sign in…" showBackButton={false} />}>
      <LoginPageContent />
    </Suspense>
  );
}
