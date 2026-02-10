'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores';
import { Mail, Lock, Eye, EyeOff, ArrowRight, UserPlus } from 'lucide-react';
import { BottomNav } from '@/components/layout';
import { PageLoadingSkeleton } from '@/components/ui';
import { cn } from '@/lib/utils';

/**
 * LOGIN PAGE — Fried Egg Editorial
 *
 * Warm cream canvas, Instrument Serif display type,
 * generous whitespace, and confident restraint.
 */

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, currentUser, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (error) clearError();
  }, [email, pin, error, clearError]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !pin) return;

    setIsSubmitting(true);
    await login(email, pin);
    setIsSubmitting(false);
    // Redirect handled by useEffect.
  };

  const handleCreateAccount = () => {
    const nextPath = searchParams?.get('next');
    const nextParam = nextPath ? `?next=${encodeURIComponent(nextPath)}` : '';
    router.push(`/profile/create${nextParam}`);
  };

  const canSubmit = email && pin.length === 4 && !isSubmitting && !isLoading;

  const inputBaseClasses =
    'w-full rounded-[var(--radius-md)] border bg-[var(--canvas-raised)] px-4 py-3 text-[length:var(--text-base)] text-[var(--ink)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--ink-tertiary)] focus:border-[var(--masters)] focus:ring-4 focus:ring-[color-mix(in_srgb,var(--masters)_16%,transparent)]';

  return (
    <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)] flex flex-col">
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

          {/* PIN */}
          <div className="mb-[var(--space-6)]">
            <label
              htmlFor="pin"
              className="block font-sans text-[length:var(--text-sm)] font-medium text-[var(--ink-secondary)] mb-[var(--space-2)] tracking-[0.02em]"
            >
              4-Digit PIN
            </label>
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

          {/* Error */}
          {error && (
            <div className="rounded-[var(--radius-md)] border border-[color:rgba(166,61,64,0.2)] bg-[color:rgba(166,61,64,0.08)] px-[var(--space-4)] py-[var(--space-3)] mb-[var(--space-6)]">
              <p className="font-sans text-[length:var(--text-sm)] text-[var(--error)]">{error}</p>
            </div>
          )}

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={!canSubmit}
            className={cn(
              'btn-premium press-scale w-full rounded-[var(--radius-md)] px-6 py-4 font-sans text-[length:var(--text-base)] font-semibold flex items-center justify-center gap-[var(--space-2)] transition-[background-color,color,opacity] border border-transparent',
              canSubmit
                ? 'bg-[var(--masters)] text-white'
                : 'bg-[var(--rule)] text-[var(--ink-tertiary)] cursor-not-allowed opacity-90'
            )}
          >
            {isSubmitting || isLoading ? (
              <>
                <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                Signing In...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight className="h-4 w-4" />
              </>
            )}
          </button>
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
          Your data stays on your device.
          <br />
          No account required to browse trips.
        </p>
      </main>

      <BottomNav />
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
