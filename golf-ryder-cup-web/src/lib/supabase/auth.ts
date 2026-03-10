import { supabase } from './client';
import { authLogger } from '../utils/logger';

export interface SupabaseSessionIdentity {
  accessToken: string;
  userId: string | null;
  email: string | null;
}

export async function getSupabaseSessionIdentity(): Promise<SupabaseSessionIdentity | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    authLogger.warn('Failed to read Supabase session:', error);
    return null;
  }

  const session = data.session;
  if (!session?.access_token) {
    return null;
  }

  return {
    accessToken: session.access_token,
    userId: session.user.id ?? null,
    email: session.user.email ?? null,
  };
}

export async function getSupabaseAccessToken(): Promise<string | null> {
  const session = await getSupabaseSessionIdentity();
  return session?.accessToken ?? null;
}

export async function requestEmailSignInLink(
  email: string,
  redirectPath: string = '/login'
): Promise<void> {
  if (!supabase) {
    throw new Error('Supabase is not configured');
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('Email is required');
  }

  const emailRedirectTo =
    typeof window === 'undefined'
      ? undefined
      : new URL(redirectPath, window.location.origin).toString();

  const { error } = await supabase.auth.signInWithOtp({
    email: normalizedEmail,
    options: {
      emailRedirectTo,
      shouldCreateUser: true,
    },
  });

  if (error) {
    authLogger.warn('Failed to request Supabase email sign-in link:', error);
    throw new Error(error.message || 'Failed to send sign-in link');
  }
}
