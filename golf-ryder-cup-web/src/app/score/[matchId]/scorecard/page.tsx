'use client';

import dynamic from 'next/dynamic';
import { PageLoadingSkeleton } from '@/components/ui';

const ScorecardEditorClient = dynamic(
  () => import('@/components/scoring/match-scoring/v2/ScorecardEditorClient'),
  {
    loading: () => <PageLoadingSkeleton title="Scorecard" variant="detail" />,
    ssr: false,
  }
);

export default function ScorecardPage() {
  return <ScorecardEditorClient />;
}
