'use client';

import dynamic from 'next/dynamic';
import { PageLoadingSkeleton } from '@/components/ui';

const MatchScoringPageClient = dynamic(
  () => import('@/components/scoring/match-scoring/MatchScoringPageClient'),
  {
    loading: () => <PageLoadingSkeleton title="Scoring" variant="detail" />,
    ssr: false,
  }
);

export default function MatchScoringPage() {
  return <MatchScoringPageClient />;
}
