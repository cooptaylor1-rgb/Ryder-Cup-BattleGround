import type { EmailOtpType, Session as SupabaseSession } from '@supabase/supabase-js';
import { supabase } from './client';
import { authLogger } from '../utils/logger';

export interface SupabaseSessionIdentity {
  accessToken: string;
  userId: string | null;
  email: string | null;
}

export interface SupabaseAuthCompletionResult {
  status: 'success' | 'error' | 'noop';
  message: string;
}

const SUPPORTED_OTP_TYPES = new Set<EmailOtpType>([
  'magiclink',
  'recovery',
  'invite',
  'signup',
  'email_change',
  'email',
]);

function createCallbackUrl(rawUrl: string | URL): URL {
  if (rawUrl instanceof URL) {
    return rawUrl;
  }

  const base =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  return new URL(rawUrl, base);
}

function getHashParams(url: URL): URLSearchParams {
  return new URLSearchParams(url.hash.startsWith('#') ? url.hash.slice(1) : url.hash);
}

function getAuthErrorMessage(url: URL): string | null {
  const hashParams = getHashParams(url);
  return (
    url.searchParams.get('error_description') ??
    hashParams.get('error_description') ??
    url.searchParams.get('error') ??
    hashParams.get('error') ??
    null
  );
}

export function buildMagicLinkRedirectPath(nextPath?: string | null): string {
  const normalizedNextPath = nextPath?.trim();
  if (!normalizedNextPath) {
    return '/auth/callback';
  }

  const params = new URLSearchParams({
    next: normalizedNextPath,
  });

  return `/auth/callback?${params.toString()}`;
}

export async function getSupabaseSession(): Promise<SupabaseSession | null> {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getSession();

  if (error) {
    authLogger.warn('Failed to read Supabase session:', error);
    return null;
  }

  return data.session ?? null;
}

export async function getSupabaseSessionIdentity(): Promise<SupabaseSessionIdentity | null> {
  const session = await getSupabaseSession();
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
  redirectPath: string = buildMagicLinkRedirectPath('/login')
): Promise<void> {
  if (!supabase) {
    throw new Error('Cloud sign-in is temporarily unavailable. Your data is still saved locally.');
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('Please enter your email address.');
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
    // Preserve the upstream detail so the user (and the captain debugging
    // why an invitee can't sign in) can see whether it's rate-limit,
    // misconfigured redirect, project down, etc. — the previous message
    // swallowed every failure as "check your email address".
    authLogger.warn('Failed to request Supabase email sign-in link:', error);
    const detail = error.message?.trim();
    throw new Error(
      detail
        ? `Couldn’t send the sign-in link: ${detail}`
        : 'Couldn’t send the sign-in link. Check your email address and try again.',
    );
  }
}

export async function completeSupabaseAuthFromUrl(
  rawUrl: string | URL
): Promise<SupabaseAuthCompletionResult> {
  if (!supabase) {
    return {
      status: 'error',
      message: 'Cloud sign-in is unavailable on this device.',
    };
  }

  const url = createCallbackUrl(rawUrl);
  const hashParams = getHashParams(url);
  const authErrorMessage = getAuthErrorMessage(url);

  if (authErrorMessage) {
    return {
      status: 'error',
      message: authErrorMessage,
    };
  }

  const authCode = url.searchParams.get('code');
  if (authCode) {
    const { error } = await supabase.auth.exchangeCodeForSession(authCode);

    if (error) {
      authLogger.warn('Failed to exchange Supabase auth code:', error);
      return {
        status: 'error',
        message: 'This sign-in link has expired. Please request a new one from the login page.',
      };
    }

    return {
      status: 'success',
      message: 'Secure sign-in complete.',
    };
  }

  const tokenHash = url.searchParams.get('token_hash');
  const otpType = url.searchParams.get('type');
  if (tokenHash && otpType && SUPPORTED_OTP_TYPES.has(otpType as EmailOtpType)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType as EmailOtpType,
    });

    if (error) {
      authLogger.warn('Failed to verify Supabase OTP:', error);
      return {
        status: 'error',
        message: 'This sign-in link has expired. Please request a new one from the login page.',
      };
    }

    return {
      status: 'success',
      message: 'Secure sign-in complete.',
    };
  }

  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');
  if (accessToken && refreshToken) {
    const { error } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      authLogger.warn('Failed to restore Supabase session from callback hash:', error);
      return {
        status: 'error',
        message: 'This sign-in link has expired. Please request a new one from the login page.',
      };
    }

    return {
      status: 'success',
      message: 'Secure sign-in complete.',
    };
  }

  return {
    status: 'noop',
    message: 'No sign-in details were found in this link.',
  };
}
