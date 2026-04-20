'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/stores';
import { authLogger } from '@/lib/utils/logger';

/**
 * Push the authenticated user onto Sentry's scope so error events
 * arrive tagged with the user id and email. Without this, production
 * crashes can only be triaged by stack trace — no way to tell which
 * captain or player tripped them, or whether an error is hitting one
 * person or everyone.
 */
function pushSentryUser(session: Session | null): void {
  if (!session?.user) {
    Sentry.setUser(null);
    return;
  }
  Sentry.setUser({
    id: session.user.id,
    email: session.user.email ?? undefined,
  });
}

export function SupabaseAuthBridge() {
  const syncSupabaseSession = useAuthStore((state) => state.syncSupabaseSession);

  useEffect(() => {
    if (!supabase) {
      syncSupabaseSession(null);
      pushSentryUser(null);
      return;
    }

    let isMounted = true;

    void supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!isMounted) {
          return;
        }

        if (error) {
          authLogger.warn('Failed to initialize Supabase auth bridge:', error);
        }

        syncSupabaseSession(data.session ?? null);
        pushSentryUser(data.session ?? null);
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        authLogger.warn('Unexpected Supabase auth bridge failure:', error);
        syncSupabaseSession(null);
        pushSentryUser(null);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      syncSupabaseSession(session);
      pushSentryUser(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [syncSupabaseSession]);

  return null;
}
