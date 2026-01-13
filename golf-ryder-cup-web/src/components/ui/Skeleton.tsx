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
      className={cn('animate-pulse-slow rounded', className)}
      style={{ background: 'var(--surface-elevated)' }}
    />
  );
}

export function SkeletonText({ lines = 1, className }: { lines?: number; className?: string }) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-4',
            i === lines - 1 && lines > 1 ? 'w-2/3' : 'w-full'
          )}
        />
      ))}
    </div>
  );
}

export function MatchCardSkeleton() {
  return (
    <div
      className="p-4 rounded-lg space-y-3"
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)'
      }}
    >
      {/* Header */}
      <div className="flex justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>

      {/* Teams */}
      <div className="flex items-stretch gap-3">
        {/* Team A */}
        <div
          className="flex-1 p-3 rounded-lg"
          style={{ background: 'var(--surface-raised)' }}
        >
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
        <div
          className="flex-1 p-3 rounded-lg"
          style={{ background: 'var(--surface-raised)' }}
        >
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
      className="rounded-lg overflow-hidden"
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)'
      }}
    >
      {/* Header */}
      <div
        className="p-4"
        style={{ background: 'var(--surface-raised)' }}
      >
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
      className="rounded-lg divide-y divide-border-subtle"
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)'
      }}
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
      className="p-4 rounded-lg"
      style={{
        background: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)'
      }}
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

export default Skeleton;
