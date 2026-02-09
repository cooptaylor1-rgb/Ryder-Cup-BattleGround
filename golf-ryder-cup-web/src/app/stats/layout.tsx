import { Suspense } from 'react';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/utils/metadata';
import { ErrorBoundary, PageLoadingSkeleton } from '@/components/ui';

export const metadata: Metadata = pageMetadata.stats;

export default function StatsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ErrorBoundary variant="compact">
            <Suspense
                fallback={
                    <PageLoadingSkeleton
                        title="Loading stats…"
                        showBackButton={false}
                        variant="grid"
                    />
                }
            >
                {children}
            </Suspense>
        </ErrorBoundary>
    );
}
