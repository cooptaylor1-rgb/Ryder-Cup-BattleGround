/**
 * Skeleton Loading Components
 *
 * Placeholder components for loading states.
 * Design principles:
 * - Uses design system tokens
 * - Subtle pulse animation
 * - Matches content dimensions
 */

import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse-slow rounded bg-[var(--surface-elevated)]', className)}
    />
  );
}

export function SkeletonText({ lines = 1, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn('h-4', i === lines - 1 && lines > 1 ? 'w-2/3' : 'w-full')}
        />
      ))}
    </div>
  );
}

export function MatchCardSkeleton() {
  return (
    <div
      className={cn(
        'p-4 rounded-lg space-y-3',
        'bg-[var(--surface-card)] border border-[color:var(--border-subtle)]'
      )}
    >
      {/* Header */}
      <div className="flex justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>

      {/* Teams */}
      <div className="flex items-stretch gap-3">
        {/* Team A */}
        <div className="flex-1 p-3 rounded-lg bg-[var(--surface-raised)]">
          <Skeleton className="h-3 w-10 mb-2" />
          <Skeleton className="h-4 w-24 mb-1" />
          <Skeleton className="h-4 w-20" />
        </div>

        {/* Score */}
        <div className="flex flex-col items-center justify-center px-4">
          <Skeleton className="h-8 w-12" />
          <Skeleton className="h-3 w-10 mt-2" />
        </div>

        {/* Team B */}
        <div className="flex-1 p-3 rounded-lg bg-[var(--surface-raised)]">
          <Skeleton className="h-3 w-10 mb-2" />
          <Skeleton className="h-4 w-24 mb-1" />
          <Skeleton className="h-4 w-20" />
        </div>
      </div>
    </div>
  );
}

export function StandingsCardSkeleton() {
  return (
    <div
      className={cn(
        'rounded-lg overflow-hidden',
        'bg-[var(--surface-card)] border border-[color:var(--border-subtle)]'
      )}
    >
      {/* Header */}
      <div className="p-4 bg-[var(--surface-raised)]">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-4 w-32 mt-2" />
      </div>

      {/* Score Display */}
      <div className="p-6">
        <div className="flex items-center justify-between">
          <div className="text-center flex-1">
            <Skeleton className="h-3 w-3 rounded-full mx-auto mb-2" />
            <Skeleton className="h-4 w-16 mx-auto" />
            <Skeleton className="h-10 w-12 mx-auto mt-2" />
          </div>
          <div className="px-6">
            <Skeleton className="h-4 w-16 mx-auto" />
            <Skeleton className="h-8 w-12 mx-auto mt-2" />
          </div>
          <div className="text-center flex-1">
            <Skeleton className="h-3 w-3 rounded-full mx-auto mb-2" />
            <Skeleton className="h-4 w-16 mx-auto" />
            <Skeleton className="h-10 w-12 mx-auto mt-2" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function PlayerListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div
      className={cn(
        'rounded-lg divide-y divide-border-subtle',
        'bg-[var(--surface-card)] border border-[color:var(--border-subtle)]'
      )}
    >
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-4 flex items-center gap-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20 mt-1" />
          </div>
          <Skeleton className="h-4 w-8" />
        </div>
      ))}
    </div>
  );
}

export function SessionCardSkeleton() {
  return (
    <div
      className={cn('p-4 rounded-lg', 'bg-[var(--surface-card)] border border-[color:var(--border-subtle)]')}
    >
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24 mt-1" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    </div>
  );
}

// Live Match Card Skeleton (for jumbotron view)
export function LiveMatchCardSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden bg-[var(--surface)] border border-[var(--rule)]">
      {/* Header */}
      <div className="px-4 py-2 flex items-center justify-between bg-[color:var(--surface-tertiary)]/60">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-5 w-20 rounded-full" />
      </div>

      {/* Teams */}
      <div className="p-4 space-y-2">
        <div className="flex items-center justify-between py-3 px-4 rounded-lg">
          <div className="flex items-center gap-3">
            <Skeleton className="w-3 h-3 rounded-full" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
        <div className="flex items-center justify-between py-3 px-4 rounded-lg">
          <div className="flex items-center gap-3">
            <Skeleton className="w-3 h-3 rounded-full" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
      </div>

      {/* Progress */}
      <div className="px-4 pb-4">
        <div className="flex gap-1">
          {Array.from({ length: 18 }).map((_, i) => (
            <Skeleton key={i} className="h-1 flex-1 rounded-full" />
          ))}
        </div>
      </div>
    </div>
  );
}

// Achievement Card Skeleton
export function AchievementCardSkeleton() {
  return (
    <div
      className={cn('p-4 rounded-xl relative', 'bg-[var(--surface)] border border-[var(--rule)]')}
    >
      <Skeleton className="absolute top-2 right-2 h-4 w-12 rounded-full" />
      <Skeleton className="w-12 h-12 rounded-xl mb-3" />
      <Skeleton className="h-4 w-20 mb-1" />
      <Skeleton className="h-3 w-full" />
    </div>
  );
}

// Side Bet Card Skeleton
export function BetCardSkeleton() {
  return (
    <div className={cn('p-4 rounded-xl', 'bg-[var(--surface)] border border-[var(--rule)]')}>
      <div className="flex items-start gap-3">
        <Skeleton className="w-10 h-10 rounded-lg" />
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-5 w-12" />
          </div>
          <Skeleton className="h-3 w-40 mt-2" />
          <Skeleton className="h-3 w-20 mt-2" />
        </div>
      </div>
    </div>
  );
}

// Comment/Social Card Skeleton
export function CommentCardSkeleton() {
  return (
    <div className={cn('p-4 rounded-xl', 'bg-[var(--surface)] border border-[var(--rule)]')}>
      <div className="flex items-center gap-3 mb-3">
        <Skeleton className="w-10 h-10 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-16 mt-1" />
        </div>
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-3/4 mt-2" />
      <div className="flex gap-2 mt-3">
        <Skeleton className="h-6 w-12 rounded-full" />
        <Skeleton className="h-6 w-12 rounded-full" />
      </div>
    </div>
  );
}

// Photo Grid Skeleton
export function PhotoGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} className="aspect-square rounded-lg" />
      ))}
    </div>
  );
}

// Weather Widget Skeleton
export function WeatherWidgetSkeleton() {
  return (
    <div className={cn('p-4 rounded-xl', 'bg-[var(--surface)] border border-[var(--rule)]')}>
      <div className="flex items-center gap-3">
        <Skeleton className="w-12 h-12 rounded-full" />
        <div className="flex-1">
          <Skeleton className="h-6 w-16" />
          <Skeleton className="h-3 w-32 mt-1" />
        </div>
      </div>
    </div>
  );
}

// Home Dashboard Skeleton
export function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      {/* Quick Actions */}
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="text-center">
            <Skeleton className="w-12 h-12 rounded-xl mx-auto" />
            <Skeleton className="h-3 w-12 mx-auto mt-2" />
          </div>
        ))}
      </div>

      {/* Weather */}
      <WeatherWidgetSkeleton />

      {/* Standings */}
      <StandingsCardSkeleton />

      {/* Sessions */}
      <div className="space-y-3">
        <SessionCardSkeleton />
        <SessionCardSkeleton />
      </div>
    </div>
  );
}

// Full Page Skeleton with optional header
export function PageSkeleton({
  showHeader = true,
  children,
}: {
  showHeader?: boolean;
  children?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--canvas)]">
      {showHeader && (
        <div className="h-14 px-4 flex items-center gap-3 bg-[var(--surface)] border-b border-[var(--rule)]">
          <Skeleton className="w-8 h-8 rounded-lg" />
          <Skeleton className="h-5 w-32" />
        </div>
      )}
      <div className="p-4">{children || <DashboardSkeleton />}</div>
    </div>
  );
}

export default Skeleton;
