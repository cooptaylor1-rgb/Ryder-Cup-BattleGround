'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores';
import { Button, Card, CardContent } from '@/components/ui';
import { GolfBallTee } from '@/components/ui/illustrations';
import { Mail, Lock, Eye, EyeOff, ArrowRight, UserPlus, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BottomNav } from '@/components/layout/BottomNav';

/**
 * LOGIN PAGE
 *
 * Beautiful login experience for returning users.
 * New users are directed to create a profile.
 */

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, currentUser, isLoading, error, clearError } = useAuthStore();

  const [email, setEmail] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      const nextPath = searchParams?.get('next');
      // If onboarding not complete, redirect to complete profile
      if (!currentUser.hasCompletedOnboarding) {
        const nextParam = nextPath ? `?next=${encodeURIComponent(nextPath)}` : '';
        router.push(`/profile/complete${nextParam}`);
      } else {
        router.push(nextPath || '/');
      }
    }
  }, [isAuthenticated, currentUser, router, searchParams]);

  // Clear errors when inputs change
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [email, pin, error, clearError]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !pin) return;

    setIsSubmitting(true);
    const success = await login(email, pin);
    setIsSubmitting(false);

    if (success) {
      // The useEffect will handle the redirect based on onboarding status
    }
  };

  const handleCreateAccount = () => {
    const nextPath = searchParams?.get('next');
    const nextParam = nextPath ? `?next=${encodeURIComponent(nextPath)}` : '';
    router.push(`/profile/create${nextParam}`);
  };

  return (
    <div className="min-h-screen pb-nav bg-linear-to-b from-masters/5 via-surface-50 to-surface-100 flex flex-col">
      {/* Header */}
      <header className="pt-safe-area-inset-top">
        <div className="p-6 text-center">
          <div className="flex justify-center mb-4">
            <GolfBallTee size="lg" animated />
          </div>
          <h1 className="text-display-sm text-surface-900 font-semibold tracking-tight">
            Golf Ryder Cup
          </h1>
          <p className="text-body-md text-surface-600 mt-1">
            Your ultimate Ryder Cup trip companion
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-start justify-center px-4 pb-8">
        <div className="w-full max-w-sm">
          <Card variant="elevated" className="overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-surface-200">
              <button className="flex-1 py-4 text-center font-medium text-surface-900 border-b-2 border-masters">
                <LogIn className="w-4 h-4 inline-block mr-2" />
                Sign In
              </button>
              <button
                onClick={handleCreateAccount}
                className="flex-1 py-4 text-center font-medium text-surface-500 hover:text-surface-700 transition-colors"
              >
                <UserPlus className="w-4 h-4 inline-block mr-2" />
                New Account
              </button>
            </div>

            <CardContent className="p-6">
              <form onSubmit={handleLogin} className="space-y-5">
                {/* Email Input */}
                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="block text-label-md text-surface-700 font-medium"
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                      className={cn(
                        'w-full pl-11 pr-4 py-3 rounded-xl border bg-white',
                        'text-body-md placeholder:text-surface-400',
                        'focus:outline-none focus:ring-2 focus:ring-masters/30 focus:border-masters',
                        'transition-all duration-200',
                        error ? 'border-red-300' : 'border-surface-200'
                      )}
                    />
                  </div>
                </div>

                {/* PIN Input */}
                <div className="space-y-2">
                  <label htmlFor="pin" className="block text-label-md text-surface-700 font-medium">
                    4-Digit PIN
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-400" />
                    <input
                      id="pin"
                      type={showPin ? 'text' : 'password'}
                      value={pin}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                        setPin(value);
                      }}
                      placeholder="••••"
                      inputMode="numeric"
                      maxLength={4}
                      autoComplete="current-password"
                      className={cn(
                        'w-full pl-11 pr-12 py-3 rounded-xl border bg-white',
                        'text-body-md placeholder:text-surface-400 tracking-[0.5em] text-center',
                        'focus:outline-none focus:ring-2 focus:ring-masters/30 focus:border-masters',
                        'transition-all duration-200',
                        error ? 'border-red-300' : 'border-surface-200'
                      )}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-surface-400 hover:text-surface-600"
                    >
                      {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                    <p className="text-sm text-red-700">{error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full"
                  disabled={!email || pin.length !== 4 || isSubmitting || isLoading}
                >
                  {isSubmitting || isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing In...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      Sign In
                      <ArrowRight className="w-4 h-4" />
                    </span>
                  )}
                </Button>
              </form>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-surface-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 bg-white text-surface-500">New to Golf Buddies?</span>
                </div>
              </div>

              {/* Create Account CTA */}
              <button
                onClick={handleCreateAccount}
                className={cn(
                  'w-full py-3 px-4 rounded-xl border-2 border-dashed border-surface-300',
                  'text-surface-700 font-medium',
                  'hover:border-masters hover:bg-masters/5 hover:text-masters',
                  'transition-all duration-200',
                  'flex items-center justify-center gap-2'
                )}
              >
                <UserPlus className="w-5 h-5" />
                Create Your Profile
              </button>
            </CardContent>
          </Card>

          {/* Footer */}
          <p className="text-center text-caption text-surface-500 mt-6">
            Your data stays on your device.
            <br />
            No account required to browse trips.
          </p>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
