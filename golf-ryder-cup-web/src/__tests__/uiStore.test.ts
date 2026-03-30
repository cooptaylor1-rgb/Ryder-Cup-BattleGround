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

let useToastStore: (typeof import('@/lib/stores'))['useToastStore'];

describe('uiStore toasts', () => {
  beforeEach(async () => {
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });
    Object.defineProperty(globalThis, 'localStorage', {
      value: localStorageMock,
      writable: true,
    });

    localStorageMock.clear();
    vi.resetModules();
    ({ useToastStore } = await import('@/lib/stores'));
    useToastStore.setState({ toasts: [] });
  });

  it('deduplicates identical active toasts', () => {
    const store = useToastStore.getState();

    store.showToast('success', 'All systems go! Ready to play.', 0);
    store.showToast('success', 'All systems go! Ready to play.', 0);

    expect(useToastStore.getState().toasts).toHaveLength(1);
  });

  it('keeps distinct toasts even when the type matches', () => {
    const store = useToastStore.getState();

    store.showToast('success', 'Captain Mode enabled', 0);
    store.showToast('success', 'All systems go! Ready to play.', 0);

    expect(useToastStore.getState().toasts).toHaveLength(2);
    expect(useToastStore.getState().toasts.map((toast) => toast.message)).toEqual([
      'Captain Mode enabled',
      'All systems go! Ready to play.',
    ]);
  });
});
