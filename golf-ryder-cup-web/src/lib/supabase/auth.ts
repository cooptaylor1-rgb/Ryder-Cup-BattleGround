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

const FALLBACK_PUBLIC_APP_ORIGIN = 'https://ryder-cup-battleground.app';
const PLACEHOLDER_APP_HOSTS = new Set(['your-app-domain.com']);
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0']);

function parseHttpOrigin(rawOrigin?: string | null): string | null {
  const value = rawOrigin?.trim();
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      return null;
    }
    if (PLACEHOLDER_APP_HOSTS.has(url.hostname)) {
      return null;
    }
    return url.origin;
  } catch {
    return null;
  }
}

function isLocalOrigin(origin: string): boolean {
  try {
    return LOCAL_HOSTS.has(new URL(origin).hostname);
  } catch {
    return false;
  }
}

export function getAuthRedirectOrigin(): string {
  const configuredOrigin = parseHttpOrigin(process.env.NEXT_PUBLIC_APP_URL);
  if (configuredOrigin) {
    return configuredOrigin;
  }

  const browserOrigin =
    typeof window !== 'undefined' ? parseHttpOrigin(window.location.origin) : null;
  if (browserOrigin && !(process.env.NODE_ENV === 'production' && isLocalOrigin(browserOrigin))) {
    return browserOrigin;
  }

  if (process.env.NODE_ENV === 'production') {
    return FALLBACK_PUBLIC_APP_ORIGIN;
  }

  return browserOrigin ?? 'http://localhost:3000';
}

function createCallbackUrl(rawUrl: string | URL): URL {
  if (rawUrl instanceof URL) {
    return rawUrl;
  }

  return new URL(rawUrl, getAuthRedirectOrigin());
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

  const emailRedirectTo = new URL(redirectPath, getAuthRedirectOrigin()).toString();

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
        : 'Couldn’t send the sign-in link. Check your email address and try again.'
    );
  }
}

/**
 * Email+password sign-up. Produces an immediately-usable session when the
 * Supabase project has "Confirm email" disabled (Auth → Providers → Email).
 * The friend-group event doesn't need verification — captains share the
 * trip code, invitees pick a password, they're in. This replaces the
 * magic-link flow that was hitting Supabase's free-tier email rate limits
 * (3-4 per hour) and blocking the event entirely.
 */
export async function signUpWithEmailPassword(email: string, password: string): Promise<void> {
  if (!supabase) {
    throw new Error('Cloud sign-in is temporarily unavailable. Your data is still saved locally.');
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) throw new Error('Please enter your email address.');
  if (!password || password.length < 6) {
    throw new Error('Please choose a password that is at least 6 characters.');
  }

  const { error } = await supabase.auth.signUp({ email: normalizedEmail, password });
  if (error) {
    authLogger.warn('Supabase sign-up failed:', error);
    const detail = error.message?.trim();
    throw new Error(detail ? `Sign-up failed: ${detail}` : 'Sign-up failed. Please try again.');
  }
}

/**
 * Email+password sign-in. Returns normally on success; the Supabase
 * session listener wired up in SupabaseAuthBridge picks up the new
 * session and drives the rest of the redirect flow.
 */
export async function signInWithEmailPassword(email: string, password: string): Promise<void> {
  if (!supabase) {
    throw new Error('Cloud sign-in is temporarily unavailable. Your data is still saved locally.');
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) throw new Error('Please enter your email address.');
  if (!password) throw new Error('Please enter your password.');

  const { error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });
  if (error) {
    authLogger.warn('Supabase password sign-in failed:', error);
    const detail = error.message?.trim();
    throw new Error(
      detail ? `Sign-in failed: ${detail}` : 'Sign-in failed. Check your email and password.'
    );
  }
}

/**
 * Email a password-reset link. Supabase sends a one-time recovery link
 * that redirects back to /auth/callback?next=/auth/reset-password; the
 * callback establishes a short-lived recovery session and hands off to
 * the set-new-password screen. Used by the Forgot Password link on
 * /login for players who signed up during onboarding and can't
 * remember the password they picked.
 */
export async function sendPasswordResetEmail(email: string): Promise<void> {
  if (!supabase) {
    throw new Error('Password reset is unavailable on this device right now.');
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) throw new Error('Enter the email on your account first.');

  const redirectTo = `${getAuthRedirectOrigin()}/auth/callback?next=${encodeURIComponent('/auth/reset-password')}`;

  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo,
  });
  if (error) {
    authLogger.warn('Supabase password reset request failed:', error);
    const detail = error.message?.trim();
    throw new Error(
      detail ? `Couldn't send reset email: ${detail}` : "Couldn't send reset email. Try again."
    );
  }
}

/**
 * Set a new password on the currently authenticated session. The
 * recovery-link redirect gives us a session that's only valid for
 * updateUser operations; this is the one the reset page calls after
 * the user picks a new password.
 */
export async function setNewPassword(password: string): Promise<void> {
  if (!supabase) {
    throw new Error('Cloud auth is unavailable on this device right now.');
  }
  if (!password || password.length < 6) {
    throw new Error("Pick a password that's at least 6 characters.");
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    authLogger.warn('Supabase password update failed:', error);
    const detail = error.message?.trim();
    throw new Error(detail ? `Couldn't update password: ${detail}` : "Couldn't update password.");
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

  // Build a message that includes the upstream Supabase detail so failures
  // like "redirect_to URL not allowed", "Email link is invalid or has
  // expired", or "Email rate limit exceeded" show the real cause instead
  // of a generic "link expired" that sends the user back to request
  // another one for no reason.
  const linkFailureMessage = (error: { message?: string } | null | undefined): string => {
    const detail = error?.message?.trim();
    if (!detail) {
      return 'This sign-in link has expired. Please request a new one from the login page.';
    }
    return `Sign-in link rejected by the server: ${detail}`;
  };

  const authCode = url.searchParams.get('code');
  if (authCode) {
    const { error } = await supabase.auth.exchangeCodeForSession(authCode);

    if (error) {
      authLogger.warn('Failed to exchange Supabase auth code:', error);
      return { status: 'error', message: linkFailureMessage(error) };
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
      return { status: 'error', message: linkFailureMessage(error) };
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
      return { status: 'error', message: linkFailureMessage(error) };
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
