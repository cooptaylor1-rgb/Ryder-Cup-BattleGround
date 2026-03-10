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
  Link as LinkIcon,
  WifiOff,
} from 'lucide-react';
import { PageLoadingSkeleton } from '@/components/ui';
import { cn } from '@/lib/utils';
import { buildMagicLinkRedirectPath, requestEmailSignInLink } from '@/lib/supabase/auth';
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
  const [isSendingMagicLink, setIsSendingMagicLink] = useState(false);
  const [magicLinkSentTo, setMagicLinkSentTo] = useState<string | null>(null);
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
    if (error) {
      clearError();
    }
    if (magicLinkSentTo) {
      setMagicLinkSentTo(null);
    }
  }, [email, pin, error, clearError, magicLinkSentTo]);

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

  const handleMagicLink = async () => {
    if (!email || !isSupabaseConfigured) {
      return;
    }

    setIsSendingMagicLink(true);

    try {
      await requestEmailSignInLink(email, buildMagicLinkRedirectPath(nextPath));
      setMagicLinkSentTo(email.trim().toLowerCase());
      clearError();
    } catch (requestError) {
      const message =
        requestError instanceof Error ? requestError.message : 'Failed to send sign-in link';
      useAuthStore.setState({ error: message });
    } finally {
      setIsSendingMagicLink(false);
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
              <button
                type="button"
                onClick={handleMagicLink}
                disabled={!email || isSendingMagicLink}
                className={cn(
                  'btn-premium press-scale mb-[var(--space-4)] w-full rounded-[var(--radius-md)] px-6 py-4 font-sans text-[length:var(--text-base)] font-semibold flex items-center justify-center gap-[var(--space-2)] transition-[background-color,color,opacity] border border-transparent',
                  email && !isSendingMagicLink
                    ? 'bg-[var(--masters)] text-[var(--canvas)]'
                    : 'bg-[var(--rule)] text-[var(--ink-tertiary)] cursor-not-allowed opacity-90'
                )}
              >
                {isSendingMagicLink ? (
                  <>
                    <span className="h-4 w-4 rounded-full border-2 border-[color:var(--canvas)]/30 border-t-[color:var(--canvas)] animate-spin" />
                    Sending Link...
                  </>
                ) : (
                  <>
                    Email Me a Secure Sign-In Link
                    <LinkIcon className="h-4 w-4" />
                  </>
                )}
              </button>

              {magicLinkSentTo && (
                <div className="rounded-[var(--radius-md)] border border-[var(--masters)]/20 bg-[var(--masters)]/10 px-[var(--space-4)] py-[var(--space-3)] mb-[var(--space-6)]">
                  <p className="font-sans text-[length:var(--text-sm)] text-[var(--ink)]">
                    Sign-in link sent to {magicLinkSentTo}. Open it on this device to finish secure
                    sign-in.
                  </p>
                </div>
              )}

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
