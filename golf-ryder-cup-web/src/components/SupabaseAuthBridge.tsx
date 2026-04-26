'use client';

import { useEffect } from 'react';
import * as Sentry from '@sentry/nextjs';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase/client';
import {
  getSyncQueueStatus,
  processSyncQueue,
  retryFailedQueue,
  setTripSyncAuthSession,
} from '@/lib/services/tripSyncService';
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

function syncAuthDependentServices(session: Session | null): void {
  setTripSyncAuthSession(session);
  if (!session) return;

  const queue = getSyncQueueStatus();
  if (queue.pending === 0 && queue.failed === 0) return;

  void (async () => {
    if (queue.failed > 0) {
      await retryFailedQueue();
    }
    await processSyncQueue();
  })().catch((error) => {
    authLogger.warn('Failed to process sync queue after Supabase auth resolved:', error);
  });
}

export function SupabaseAuthBridge() {
  const syncSupabaseSession = useAuthStore((state) => state.syncSupabaseSession);

  useEffect(() => {
    if (!supabase) {
      syncSupabaseSession(null);
      syncAuthDependentServices(null);
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
        syncAuthDependentServices(data.session ?? null);
        pushSentryUser(data.session ?? null);
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        authLogger.warn('Unexpected Supabase auth bridge failure:', error);
        syncSupabaseSession(null);
        syncAuthDependentServices(null);
        pushSentryUser(null);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      syncSupabaseSession(session);
      syncAuthDependentServices(session);
      pushSentryUser(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [syncSupabaseSession]);

  return null;
}
