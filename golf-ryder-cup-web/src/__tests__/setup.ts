import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Unit tests must never inherit a developer's real Supabase project env.
// Individual API/config tests stub these back on when they need to exercise
// configured Supabase behavior. Keeping the default blank prevents background
// trip-sync timers from making real network calls during stress simulations.
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', '');
vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', '');

// Mock IndexedDB for Dexie
import 'fake-indexeddb/auto';

// Mock next/navigation
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        back: vi.fn(),
    }),
    useParams: () => ({}),
    useSearchParams: () => new URLSearchParams(),
}));

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    })),
});
