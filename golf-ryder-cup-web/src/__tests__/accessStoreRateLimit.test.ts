/**
 * Tests for accessStore PIN rate limiting.
 *
 * Verifies that consecutive failed PIN attempts trigger an exponential
 * backoff lockout and that successful attempts reset the counter.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();

let useAccessStore: typeof import('@/lib/stores/accessStore')['useAccessStore'];

describe('accessStore PIN rate limiting', () => {
  beforeEach(async () => {
    localStorageMock.clear();
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    vi.resetModules();
    const mod = await import('@/lib/stores/accessStore');
    useAccessStore = mod.useAccessStore;

    // Reset store to a known state with a real PIN set up
    useAccessStore.setState({
      isCaptainMode: false,
      captainPinHash: null,
      captainAttempts: { failedAttempts: 0, lockedUntil: null },
    });

    // Set the captain PIN to "1234" (this also enables captain mode)
    await useAccessStore.getState().enableCaptainMode('1234');
    useAccessStore.getState().disableCaptainMode();
  });

  it('allows correct PIN after some failed attempts', async () => {
    const store = useAccessStore.getState();

    // 2 failed attempts
    await expect(store.enableCaptainMode('0000')).rejects.toThrow('Incorrect PIN');
    await expect(store.enableCaptainMode('0001')).rejects.toThrow('Incorrect PIN');

    expect(useAccessStore.getState().captainAttempts.failedAttempts).toBe(2);

    // Correct PIN succeeds and resets the counter
    await store.enableCaptainMode('1234');
    expect(useAccessStore.getState().captainAttempts.failedAttempts).toBe(0);
    expect(useAccessStore.getState().captainAttempts.lockedUntil).toBeNull();
    expect(useAccessStore.getState().isCaptainMode).toBe(true);
  });

  it('locks out after 5 consecutive failed attempts', async () => {
    const store = useAccessStore.getState();

    for (let i = 0; i < 4; i++) {
      await expect(store.enableCaptainMode('0000')).rejects.toThrow('Incorrect PIN');
    }
    expect(useAccessStore.getState().captainAttempts.failedAttempts).toBe(4);
    expect(useAccessStore.getState().captainAttempts.lockedUntil).toBeNull();

    // 5th attempt triggers lockout
    await expect(store.enableCaptainMode('0000')).rejects.toThrow(/Locked for/);
    expect(useAccessStore.getState().captainAttempts.failedAttempts).toBe(5);
    expect(useAccessStore.getState().captainAttempts.lockedUntil).toBeGreaterThan(Date.now());
  });

  it('rejects even correct PIN while locked out', async () => {
    const store = useAccessStore.getState();

    // Trigger lockout
    for (let i = 0; i < 5; i++) {
      await expect(store.enableCaptainMode('0000')).rejects.toThrow();
    }

    // Correct PIN is blocked while locked
    await expect(store.enableCaptainMode('1234')).rejects.toThrow(/Try again in/);
  });

  it('exponentially increases lockout duration on continued failures', async () => {
    const store = useAccessStore.getState();

    // First lockout: 5 failures -> 1s
    for (let i = 0; i < 5; i++) {
      await expect(store.enableCaptainMode('0000')).rejects.toThrow();
    }
    const firstLockMs =
      (useAccessStore.getState().captainAttempts.lockedUntil ?? 0) - Date.now();

    // Manually clear the lock window so we can attempt again, but keep the
    // failed-attempts counter so the next failure escalates the lockout.
    useAccessStore.setState({
      captainAttempts: {
        ...useAccessStore.getState().captainAttempts,
        lockedUntil: null,
      },
    });

    // 6th failure -> 2s lockout
    await expect(store.enableCaptainMode('0000')).rejects.toThrow();
    const secondLockMs =
      (useAccessStore.getState().captainAttempts.lockedUntil ?? 0) - Date.now();

    expect(secondLockMs).toBeGreaterThan(firstLockMs);
  });

  it('resetCaptainPin clears the lockout state', async () => {
    const store = useAccessStore.getState();

    for (let i = 0; i < 5; i++) {
      await expect(store.enableCaptainMode('0000')).rejects.toThrow();
    }
    expect(useAccessStore.getState().captainAttempts.lockedUntil).toBeGreaterThan(Date.now());

    useAccessStore.getState().resetCaptainPin();
    expect(useAccessStore.getState().captainAttempts.failedAttempts).toBe(0);
    expect(useAccessStore.getState().captainAttempts.lockedUntil).toBeNull();
  });
});
