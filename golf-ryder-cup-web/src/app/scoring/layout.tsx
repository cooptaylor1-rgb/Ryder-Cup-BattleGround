import { Suspense } from 'react';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/utils/metadata';
import { ErrorBoundary, PageLoadingSkeleton } from '@/components/ui';

export const metadata: Metadata = pageMetadata.scoring;

export default function ScoringLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ErrorBoundary variant="compact">
            <Suspense
                fallback={
                    <PageLoadingSkeleton
                        title="Loading scoring…"
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
