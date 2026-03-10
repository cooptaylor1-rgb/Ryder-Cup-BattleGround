'use client';

import { useRouter } from 'next/navigation';
import { EmptyStatePremium } from '@/components/ui/EmptyStatePremium';
import { Home, MoreHorizontal } from 'lucide-react';

export function CaptainNoTripState({
  description,
  illustration = 'golf-ball',
}: {
  description: string;
  illustration?: 'golf-ball' | 'golfers' | 'trophy' | 'scorecard' | 'flag' | 'calendar' | 'podium' | 'swing' | 'celebration';
}) {
  const router = useRouter();

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
      <main className="container-editorial py-12">
        <EmptyStatePremium
          illustration={illustration}
          title="No active trip"
          description={description}
          action={{
            label: 'Go Home',
            onClick: () => router.push('/'),
            icon: <Home size={16} />,
          }}
          variant="large"
        />
      </main>
    </div>
  );
}

export function CaptainModeRequiredState({
  description,
}: {
  description: string;
}) {
  const router = useRouter();

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
      <main className="container-editorial py-12">
        <EmptyStatePremium
          illustration="trophy"
          title="Captain mode required"
          description={description}
          action={{
            label: 'Open More',
            onClick: () => router.push('/more'),
            icon: <MoreHorizontal size={16} />,
          }}
          secondaryAction={{
            label: 'Go Home',
            onClick: () => router.push('/'),
          }}
          variant="large"
        />
      </main>
    </div>
  );
}
