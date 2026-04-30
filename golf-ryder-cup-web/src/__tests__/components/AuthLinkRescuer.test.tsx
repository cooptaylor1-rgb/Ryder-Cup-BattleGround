import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from '@testing-library/react';

import { AuthLinkRescuer } from '@/components/AuthLinkRescuer';

const { mockRouterPush, mockRouterReplace } = vi.hoisted(() => ({
  mockRouterPush: vi.fn(),
  mockRouterReplace: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockRouterPush, replace: mockRouterReplace }),
}));

const ORIGINAL_LOCATION = window.location;

function stubLocation({
  pathname,
  search,
  hash,
}: {
  pathname: string;
  search: string;
  hash: string;
}) {
  const replace = vi.fn();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: {
      ...ORIGINAL_LOCATION,
      pathname,
      search,
      hash,
      replace,
    },
  });
  return replace;
}

describe('AuthLinkRescuer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: ORIGINAL_LOCATION,
    });
  });

  it('rescues a recovery hash dropped on the home route to /auth/reset-password', () => {
    const replace = stubLocation({
      pathname: '/',
      search: '',
      hash: '#access_token=abc&refresh_token=def&type=recovery',
    });

    render(<AuthLinkRescuer />);

    expect(replace).toHaveBeenCalledWith(
      '/auth/reset-password#access_token=abc&refresh_token=def&type=recovery'
    );
  });

  it('rescues a recovery token_hash query dropped on the home route', () => {
    const replace = stubLocation({
      pathname: '/',
      search: '?token_hash=xyz&type=recovery',
      hash: '',
    });

    render(<AuthLinkRescuer />);

    expect(replace).toHaveBeenCalledWith(
      '/auth/reset-password?token_hash=xyz&type=recovery'
    );
  });

  it('routes a non-recovery PKCE code (no type) to /auth/callback', () => {
    const replace = stubLocation({
      pathname: '/some-other-page',
      search: '?code=signup-confirm-token',
      hash: '',
    });

    render(<AuthLinkRescuer />);

    expect(replace).toHaveBeenCalledWith('/auth/callback?code=signup-confirm-token');
  });

  it('does nothing when already on the reset-password handler', () => {
    const replace = stubLocation({
      pathname: '/auth/reset-password',
      search: '?token_hash=xyz&type=recovery',
      hash: '',
    });

    render(<AuthLinkRescuer />);

    expect(replace).not.toHaveBeenCalled();
  });

  it('does nothing on a plain home visit with no auth params', () => {
    const replace = stubLocation({
      pathname: '/',
      search: '',
      hash: '',
    });

    render(<AuthLinkRescuer />);

    expect(replace).not.toHaveBeenCalled();
  });

  it('does not rescue a hash with only an access_token (incomplete)', () => {
    // Real recovery URLs always carry refresh_token alongside access_token.
    // Anything missing one is more likely an unrelated fragment than a
    // mis-routed auth callback.
    const replace = stubLocation({
      pathname: '/',
      search: '',
      hash: '#access_token=abc',
    });

    render(<AuthLinkRescuer />);

    expect(replace).not.toHaveBeenCalled();
  });
});
