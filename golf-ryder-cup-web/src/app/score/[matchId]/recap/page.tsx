'use client';

import dynamic from 'next/dynamic';
import { PageLoadingSkeleton } from '@/components/ui';

const MatchRecapClient = dynamic(
  () => import('@/components/scoring/match-scoring/v2/MatchRecapClient'),
  {
    loading: () => <PageLoadingSkeleton title="Recap" variant="detail" />,
    ssr: false,
  }
);

export default function MatchRecapPage() {
  return <MatchRecapClient />;
}
