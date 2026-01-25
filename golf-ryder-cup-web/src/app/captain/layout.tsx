import { Suspense } from 'react';
import type { Metadata } from 'next';
import { pageMetadata } from '@/lib/utils/metadata';
import { PageSkeleton, ErrorBoundary } from '@/components/ui';

export const metadata: Metadata = pageMetadata.captain;

export default function CaptainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <ErrorBoundary variant="compact">
            <Suspense fallback={<PageSkeleton />}>
                {children}
            </Suspense>
        </ErrorBoundary>
    );
}
