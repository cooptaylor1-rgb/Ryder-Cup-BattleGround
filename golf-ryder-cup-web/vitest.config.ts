import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
    plugins: [react()],
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: ['./src/__tests__/setup.ts'],
        include: ['src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        // Bumped from the 10s default. The pre-push hook runs ~80 test files in
        // parallel forks and the jsdom setup inside `beforeEach` (mocking
        // window.localStorage etc.) routinely loses the 10s race when CPU is
        // contended, even though the hook code itself is microsecond-fast.
        // 30s is generous enough to absorb that contention without masking real
        // hangs (a true hang still fails — just later).
        hookTimeout: 30_000,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'text-summary', 'json', 'html', 'lcov'],
            reportsDirectory: './coverage',
            exclude: [
                'node_modules/',
                'src/__tests__/setup.ts',
                '**/*.d.ts',
                '**/*.config.*',
                '**/types/**',
            ],
            // Thresholds for world-class quality
            thresholds: {
                statements: 90,
                branches: 85,
                functions: 90,
                lines: 90,
            },
        },
    },
    resolve: {
        alias: {
            '@': resolve(__dirname, './src'),
        },
    },
});
