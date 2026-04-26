import { afterEach, describe, expect, it, vi } from 'vitest';

import { validateEnvironment } from '@/lib/utils/validateEnv';

const LEGACY_ANON_JWT = [
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9',
    'eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRlc3QiLCJyb2xlIjoiYW5vbiJ9',
    'signature',
].join('.');

describe('validateEnvironment', () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it('accepts legacy JWT Supabase anon keys', () => {
        vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
        vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', LEGACY_ANON_JWT);

        expect(validateEnvironment().invalid).not.toContainEqual(
            expect.stringContaining('NEXT_PUBLIC_SUPABASE_ANON_KEY')
        );
    });

    it('accepts current Supabase publishable keys', () => {
        vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
        vi.stubEnv(
            'NEXT_PUBLIC_SUPABASE_ANON_KEY',
            'sb_publishable_abcdefghijklmnopqrstuv_12345678'
        );

        expect(validateEnvironment().invalid).not.toContainEqual(
            expect.stringContaining('NEXT_PUBLIC_SUPABASE_ANON_KEY')
        );
    });

    it('rejects malformed Supabase public keys', () => {
        vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
        vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'not-a-supabase-key');

        expect(validateEnvironment().invalid).toContainEqual(
            expect.stringContaining('NEXT_PUBLIC_SUPABASE_ANON_KEY')
        );
    });
});
