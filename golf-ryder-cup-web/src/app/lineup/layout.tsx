import { Suspense } from 'react';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/utils/metadata';
import { ErrorBoundary, PageLoadingSkeleton } from '@/components/ui';

export const metadata: Metadata = pageMetadata.lineup;

export default function LineupLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ErrorBoundary variant="compact">
            <Suspense
                fallback={
                    <PageLoadingSkeleton
                        title="Loading lineups…"
                        showBackButton={false}
                        variant="list"
                    />
                }
            >
                {children}
            </Suspense>
        </ErrorBoundary>
    );
}
