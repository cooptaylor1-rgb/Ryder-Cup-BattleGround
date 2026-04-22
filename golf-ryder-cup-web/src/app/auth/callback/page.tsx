'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { EmptyStatePremium, PageLoadingSkeleton } from '@/components/ui';
import { useAuthStore, useToastStore } from '@/lib/stores';
import {
  completeSupabaseAuthFromUrl,
  getSupabaseSession,
} from '@/lib/supabase/auth';
import { safeNextPath } from '@/lib/utils/navigation';

type CallbackState = 'processing' | 'success' | 'error' | 'noop';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const showToast = useToastStore((state) => state.showToast);
  const [state, setState] = useState<CallbackState>('processing');
  const [message, setMessage] = useState('Completing secure sign-in...');

  useEffect(() => {
    let isCancelled = false;
    let redirectTimer: number | null = null;

    const finishSignIn = async () => {
      const result = await completeSupabaseAuthFromUrl(window.location.href);

      if (isCancelled) {
        return;
      }

      setState(result.status);
      setMessage(result.message);

      if (result.status !== 'success') {
        if (result.status === 'error') {
          showToast('error', result.message);
        }
        return;
      }

      const session = await getSupabaseSession();
      if (isCancelled) {
        return;
      }

      useAuthStore.getState().syncSupabaseSession(session);
      const authState = useAuthStore.getState();
      const nextPath = safeNextPath(searchParams?.get('next'));
      const nextParam = `?next=${encodeURIComponent(nextPath)}`;

      let destination = nextPath;
      if (!authState.currentUser && authState.authEmail) {
        destination = `/profile/create${nextParam}`;
      } else if (authState.currentUser && !authState.currentUser.hasCompletedOnboarding) {
        destination = `/profile/complete${nextParam}`;
      }

      showToast('success', result.message);

      redirectTimer = window.setTimeout(() => {
        router.replace(destination);
      }, 900);
    };

    void finishSignIn();

    return () => {
      isCancelled = true;
      if (redirectTimer) {
        window.clearTimeout(redirectTimer);
      }
    };
  }, [router, searchParams, showToast]);

  if (state === 'processing' || state === 'success') {
    return (
      <div className="min-h-screen page-premium-enter texture-grain bg-canvas">
        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration={state === 'success' ? 'celebration' : 'swing'}
            title={state === 'success' ? 'Sign-In Complete' : 'Opening Your Secure Sign-In'}
            description={message}
            hint="Stay on this screen for a moment while we open the right part of the app."
            variant="large"
          />
        </main>
      </div>
    );
  }

  const nextPath = safeNextPath(searchParams?.get('next'));
  const nextParam = nextPath !== '/' ? `?next=${encodeURIComponent(nextPath)}` : '';

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-canvas">
      <main className="container-editorial py-12">
        <EmptyStatePremium
          illustration={state === 'error' ? 'scorecard' : 'flag'}
          title={state === 'error' ? 'This Link Did Not Work' : 'Nothing To Finish'}
          description={message}
          action={{
            label: 'Back to Sign In',
            onClick: () => router.push(`/login${nextParam}`),
          }}
          secondaryAction={{
            label: 'Go Home',
            onClick: () => router.push('/'),
          }}
          variant="large"
        />
      </main>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<PageLoadingSkeleton title="Completing sign-in..." variant="detail" />}>
      <AuthCallbackContent />
    </Suspense>
  );
}
