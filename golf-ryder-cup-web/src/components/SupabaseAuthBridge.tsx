'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';
import { useAuthStore } from '@/lib/stores';
import { authLogger } from '@/lib/utils/logger';

export function SupabaseAuthBridge() {
  const syncSupabaseSession = useAuthStore((state) => state.syncSupabaseSession);

  useEffect(() => {
    if (!supabase) {
      syncSupabaseSession(null);
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
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        authLogger.warn('Unexpected Supabase auth bridge failure:', error);
        syncSupabaseSession(null);
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      syncSupabaseSession(session);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [syncSupabaseSession]);

  return null;
}
