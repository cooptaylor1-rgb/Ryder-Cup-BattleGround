'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Detects an auth callback that landed on the wrong path and forwards
 * it to /auth/reset-password (or /auth/callback for non-recovery flows)
 * preserving every search and hash param.
 *
 * Why: if Supabase's "Redirect URLs" allow-list doesn't include
 * /auth/reset-password and /auth/callback, the recovery email's
 * verify-then-redirect step falls back to Site URL — usually `/`. The
 * recovery tokens come along with the URL but the home page renders
 * normally, so the user looks at "the generic app page" and assumes
 * the link is broken. This rescuer catches that misroute on any path
 * other than the two real handlers and re-routes preserving params,
 * so a misconfigured allow-list doesn't strand a player who actually
 * got the email.
 */

const RESCUE_TARGETS = {
  recovery: '/auth/reset-password',
  // Anything else that smells like an auth callback (signup confirm,
  // invite, magic link if it ever comes back, etc.) lands at the
  // generic callback page that already understands every token shape.
  generic: '/auth/callback',
};

const SAFE_PATHS = new Set(['/auth/reset-password', '/auth/callback']);

function hasAuthMaterial(search: URLSearchParams, hash: URLSearchParams): boolean {
  return (
    search.has('code') ||
    search.has('token_hash') ||
    search.has('token') ||
    (hash.has('access_token') && hash.has('refresh_token'))
  );
}

function detectType(search: URLSearchParams, hash: URLSearchParams): string | null {
  return search.get('type') ?? hash.get('type');
}

export function AuthLinkRescuer() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const { pathname, search, hash } = window.location;
    if (SAFE_PATHS.has(pathname)) return;

    const searchParams = new URLSearchParams(search);
    const hashParams = new URLSearchParams(hash.startsWith('#') ? hash.slice(1) : hash);
    if (!hasAuthMaterial(searchParams, hashParams)) return;

    const type = detectType(searchParams, hashParams);
    // Recovery is the one we know the destination for. Everything else
    // — signup confirms, magic links, OAuth — already has a callback
    // handler that knows how to route post-completion.
    const target = type === 'recovery' ? RESCUE_TARGETS.recovery : RESCUE_TARGETS.generic;

    // Preserve search + hash so the destination page can finish the
    // verify/exchange. router.replace strips the hash on App Router,
    // so do the navigation through window.location to keep the hash
    // for the implicit flow (#access_token=&refresh_token=&type=recovery).
    const destination = `${target}${search}${hash}`;
    window.location.replace(destination);
  }, [router]);

  return null;
}
