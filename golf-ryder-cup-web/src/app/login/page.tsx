'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  UserPlus,
  WifiOff,
} from 'lucide-react';
import { PageLoadingSkeleton } from '@/components/ui';
import { cn } from '@/lib/utils';
import { signInWithEmailPassword, signUpWithEmailPassword } from '@/lib/supabase/auth';
import { isSupabaseConfigured } from '@/lib/supabase/client';

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
    authEmail,
    hasResolvedSupabaseSession,
  } = useAuthStore();

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

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      const nextPath = searchParams?.get('next');
      if (!currentUser.hasCompletedOnboarding) {
        const nextParam = nextPath ? `?next=${encodeURIComponent(nextPath)}` : '';
        router.push(`/profile/complete${nextParam}`);
      } else {
        router.push(nextPath || '/');
      }
    }
  }, [isAuthenticated, currentUser, router, searchParams]);

  useEffect(() => {
    if (!hasResolvedSupabaseSession || !authEmail || currentUser) {
      return;
    }

    const nextPath = searchParams?.get('next');
    const nextParam = nextPath ? `?next=${encodeURIComponent(nextPath)}` : '';
    router.replace(`/profile/create${nextParam}`);
  }, [authEmail, currentUser, hasResolvedSupabaseSession, router, searchParams]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email, password, pin]);

  const nextPath = searchParams?.get('next');
  const nextParam = nextPath ? `?next=${encodeURIComponent(nextPath)}` : '';

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
      // Supabase returns "User already registered" when a signup email
      // collides with an existing row. Rewrite the message with an
      // action the user can take — the raw error sounds like a bug.
      const friendly = /already registered/i.test(raw)
        ? 'That email already has an account. Switch to Sign in and use your existing password (or reset it if you\'ve forgotten).'
        : /invalid login credentials/i.test(raw)
          ? 'Email or password didn\'t match. Double-check both, or switch to Sign up if you\'re new here.'
          : raw;
      useAuthStore.setState({ error: friendly });
    } finally {
      setIsCloudAuthInFlight(false);
    }
  };

  const handleCreateAccount = () => {
    router.push(`/profile/create${nextParam}`);
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
            Welcome Back
          </h1>

          <p className="font-sans text-[length:var(--text-base)] text-[var(--ink-secondary)]">
            Sign in to your trip
          </p>
        </div>
      </header>

      {/* Form */}
      <main className="container-editorial flex-1">
        <form onSubmit={handleLogin} className="max-w-sm mx-auto">
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
                    className={cn(inputBaseClasses, 'pl-11 pr-12', error && 'border-[var(--error)]')}
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
                    ? "New here? Create an account instead."
                    : 'Already have an account? Sign in instead.'}
                </button>
              </div>

              <div className="mx-auto my-[var(--space-6)] flex items-center gap-[var(--space-4)]">
                <div className="h-px flex-1 bg-[var(--rule)]" />
                <span className="font-sans text-sm text-[var(--ink-tertiary)]">
                  Offline fallback only
                </span>
                <div className="h-px flex-1 bg-[var(--rule)]" />
              </div>
            </>
          )}

          {error && (
            <div className="rounded-[var(--radius-md)] border border-[color:var(--error)]/20 bg-[color:var(--error)]/10 px-[var(--space-4)] py-[var(--space-3)] mb-[var(--space-6)]">
              <p className="font-sans text-[length:var(--text-sm)] text-[var(--error)]">
                {error}
              </p>
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
                    Offline detected. Magic-link sign-in will work again when your connection returns.
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
          Secure sign-in works best with the email link.
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
