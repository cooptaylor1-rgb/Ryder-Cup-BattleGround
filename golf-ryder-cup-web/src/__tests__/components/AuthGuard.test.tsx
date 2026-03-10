import { describe, expect, it } from 'vitest';
import { isProtectedAppRoute } from '@/components/AuthGuard';

describe('AuthGuard route protection', () => {
  it('keeps primary browse routes public', () => {
    expect(isProtectedAppRoute('/')).toBe(false);
    expect(isProtectedAppRoute('/score')).toBe(false);
    expect(isProtectedAppRoute('/standings')).toBe(false);
    expect(isProtectedAppRoute('/schedule')).toBe(false);
    expect(isProtectedAppRoute('/more')).toBe(false);
    expect(isProtectedAppRoute('/players')).toBe(false);
  });

  it('keeps explicit onboarding and invitation routes public', () => {
    expect(isProtectedAppRoute('/login')).toBe(false);
    expect(isProtectedAppRoute('/profile/create')).toBe(false);
    expect(isProtectedAppRoute('/join/ABCDEFGH')).toBe(false);
    expect(isProtectedAppRoute('/auth/callback')).toBe(false);
    expect(isProtectedAppRoute('/spectator/trip-123')).toBe(false);
  });

  it('leaves captain flows to captain-mode gating while protecting settings and profile routes', () => {
    expect(isProtectedAppRoute('/captain')).toBe(false);
    expect(isProtectedAppRoute('/captain/manage')).toBe(false);
    expect(isProtectedAppRoute('/settings')).toBe(true);
    expect(isProtectedAppRoute('/settings/appearance')).toBe(true);
    expect(isProtectedAppRoute('/profile')).toBe(true);
    expect(isProtectedAppRoute('/profile/complete')).toBe(true);
  });
});
