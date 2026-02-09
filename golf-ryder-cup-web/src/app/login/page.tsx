'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores';
import { Mail, Lock, Eye, EyeOff, ArrowRight, UserPlus } from 'lucide-react';
import { BottomNav } from '@/components/layout';

/**
 * LOGIN PAGE — Fried Egg Editorial
 *
 * Warm cream canvas, Instrument Serif display type,
 * generous whitespace, and confident restraint.
 */

export default function LoginPage() {
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
    const success = await login(email, pin);
    setIsSubmitting(false);
    if (success) {
      // useEffect handles redirect
    }
  };

  const handleCreateAccount = () => {
    const nextPath = searchParams?.get('next');
    const nextParam = nextPath ? `?next=${encodeURIComponent(nextPath)}` : '';
    router.push(`/profile/create${nextParam}`);
  };

  const canSubmit = email && pin.length === 4 && !isSubmitting && !isLoading;

  return (
    <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)] flex flex-col">
      {/* Editorial Header */}
      <header
        className="container-editorial"
        style={{ paddingTop: 'max(3rem, env(safe-area-inset-top, 0px))' }}
      >
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-10)' }}>
          {/* Overline */}
          <p
            className="type-overline"
            style={{
              color: 'var(--ink-tertiary)',
              letterSpacing: '0.15em',
              marginBottom: 'var(--space-3)',
            }}
          >
            RYDER CUP BATTLEGROUND
          </p>

          {/* Display heading */}
          <h1
            style={{
              fontFamily: 'var(--font-serif)',
              fontSize: 'clamp(2rem, 8vw, 3rem)',
              fontWeight: 400,
              fontStyle: 'italic',
              color: 'var(--ink)',
              lineHeight: 1.1,
              marginBottom: 'var(--space-3)',
            }}
          >
            Welcome Back
          </h1>

          <p
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-base)',
              color: 'var(--ink-secondary)',
            }}
          >
            Sign in to your trip
          </p>
        </div>
      </header>

      {/* Form */}
      <main className="container-editorial" style={{ flex: 1 }}>
        <form onSubmit={handleLogin} style={{ maxWidth: '400px', margin: '0 auto' }}>
          {/* Email */}
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <label
              htmlFor="email"
              style={{
                display: 'block',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                color: 'var(--ink-secondary)',
                marginBottom: 'var(--space-2)',
                letterSpacing: '0.02em',
              }}
            >
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <Mail
                className="w-5 h-5"
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--ink-tertiary)',
                }}
              />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                style={{
                  width: '100%',
                  padding: '14px 16px 14px 44px',
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-base)',
                  color: 'var(--ink)',
                  background: 'var(--canvas-raised)',
                  border: `1px solid ${error ? 'var(--error)' : 'var(--rule)'}`,
                  borderRadius: 'var(--radius-md)',
                  outline: 'none',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--masters)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,104,71,0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = error ? 'var(--error)' : 'var(--rule)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
            </div>
          </div>

          {/* PIN */}
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <label
              htmlFor="pin"
              style={{
                display: 'block',
                fontFamily: 'var(--font-sans)',
                fontSize: 'var(--text-sm)',
                fontWeight: 500,
                color: 'var(--ink-secondary)',
                marginBottom: 'var(--space-2)',
                letterSpacing: '0.02em',
              }}
            >
              4-Digit PIN
            </label>
            <div style={{ position: 'relative' }}>
              <Lock
                className="w-5 h-5"
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--ink-tertiary)',
                }}
              />
              <input
                id="pin"
                type={showPin ? 'text' : 'password'}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                placeholder="••••"
                inputMode="numeric"
                maxLength={4}
                autoComplete="current-password"
                style={{
                  width: '100%',
                  padding: '14px 48px 14px 44px',
                  fontFamily: 'var(--font-mono)',
                  fontSize: 'var(--text-lg)',
                  letterSpacing: '0.3em',
                  textAlign: 'center',
                  color: 'var(--ink)',
                  background: 'var(--canvas-raised)',
                  border: `1px solid ${error ? 'var(--error)' : 'var(--rule)'}`,
                  borderRadius: 'var(--radius-md)',
                  outline: 'none',
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--masters)';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,104,71,0.1)';
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = error ? 'var(--error)' : 'var(--rule)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  padding: '4px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--ink-tertiary)',
                }}
              >
                {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                padding: 'var(--space-3) var(--space-4)',
                background: 'rgba(166, 61, 64, 0.08)',
                border: '1px solid rgba(166, 61, 64, 0.2)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--space-6)',
              }}
            >
              <p
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--error)',
                }}
              >
                {error}
              </p>
            </div>
          )}

          {/* Sign In Button */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="btn-premium press-scale"
            style={{
              width: '100%',
              padding: '16px 24px',
              background: canSubmit ? 'var(--masters)' : 'var(--rule)',
              color: canSubmit ? 'white' : 'var(--ink-tertiary)',
              border: 'none',
              borderRadius: 'var(--radius-md)',
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-base)',
              fontWeight: 600,
              cursor: canSubmit ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-2)',
              transition: 'all 0.2s ease',
            }}
          >
            {isSubmitting || isLoading ? (
              <>
                <span
                  style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: 'white',
                    borderRadius: '50%',
                    animation: 'spin 0.6s linear infinite',
                  }}
                />
                Signing In...
              </>
            ) : (
              <>
                Sign In
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Divider */}
        <div
          style={{
            maxWidth: '400px',
            margin: 'var(--space-8) auto',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--space-4)',
          }}
        >
          <div style={{ flex: 1, height: '1px', background: 'var(--rule)' }} />
          <span
            style={{
              fontFamily: 'var(--font-sans)',
              fontSize: 'var(--text-sm)',
              color: 'var(--ink-tertiary)',
            }}
          >
            New here?
          </span>
          <div style={{ flex: 1, height: '1px', background: 'var(--rule)' }} />
        </div>

        {/* Create Account */}
        <button
          onClick={handleCreateAccount}
          className="press-scale"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 'var(--space-2)',
            width: '100%',
            maxWidth: '400px',
            margin: '0 auto',
            padding: '14px 24px',
            background: 'transparent',
            color: 'var(--ink)',
            border: '1px solid var(--rule)',
            borderRadius: 'var(--radius-md)',
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-base)',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
        >
          <UserPlus className="w-5 h-5" />
          Create Your Profile
        </button>

        {/* Footer note */}
        <p
          style={{
            textAlign: 'center',
            fontFamily: 'var(--font-sans)',
            fontSize: 'var(--text-xs)',
            color: 'var(--ink-tertiary)',
            marginTop: 'var(--space-8)',
            lineHeight: 1.5,
          }}
        >
          Your data stays on your device.
          <br />
          No account required to browse trips.
        </p>
      </main>

      <BottomNav />
    </div>
  );
}
