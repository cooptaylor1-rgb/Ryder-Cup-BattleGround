/**
 * Live Match Banner Component
 *
 * A prominent, attention-grabbing banner that appears when live matches are in progress.
 * Designed to be unmissable - the first thing users see when matches are happening.
 *
 * Features:
 * - Pulsing animation to draw attention
 * - Live match count
 * - One-tap navigation to live scores
 * - Optional dismissal
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { Tv, ChevronRight, X, Play, Users } from 'lucide-react';

interface LiveMatchBannerProps {
  matchCount: number;
  currentHole?: number;
  closestMatch?: {
    teamA: string;
    teamB: string;
    score: string;
  };
  onDismiss?: () => void;
  className?: string;
}

export function LiveMatchBanner({
  matchCount,
  currentHole,
  closestMatch,
  onDismiss,
  className,
}: LiveMatchBannerProps) {
  const router = useRouter();
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed || matchCount === 0) return null;

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <button
      onClick={() => router.push('/live')}
      className={cn(
        'w-full relative overflow-hidden rounded-2xl p-4',
        'transition-transform active:scale-[0.98]',
        'group cursor-pointer text-left',
        className
      )}
      style={{
        background: 'linear-gradient(135deg, var(--error) 0%, color-mix(in srgb, var(--error) 72%, black 28%) 100%)',
      }}
    >
      {/* Pulsing background effect */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background:
            'radial-gradient(circle at 30% 50%, color-mix(in srgb, var(--canvas-raised) 22%, transparent) 0%, transparent 55%)',
          animation: 'pulse 2s ease-in-out infinite',
        }}
      />

      {/* Dismiss button */}
      {onDismiss && (
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1.5 rounded-full bg-[color:var(--canvas-raised)]/10 hover:bg-[color:var(--canvas-raised)]/20 transition-colors z-10"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4 text-[color:var(--canvas-raised)]/80" />
        </button>
      )}

      <div className="relative flex items-center gap-4">
        {/* Live indicator */}
        <div className="shrink-0">
          <div className="relative">
            <div
              className="w-14 h-14 rounded-xl flex items-center justify-center"
              style={{ background: 'color-mix(in srgb, var(--canvas-raised) 18%, transparent)' }}
            >
              <Tv className="w-7 h-7 text-[color:var(--canvas-raised)]" />
            </div>
            {/* Pulsing dot */}
            <span className="absolute -top-1 -right-1 flex h-4 w-4">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[color:var(--canvas-raised)] opacity-75" />
              <span className="relative inline-flex rounded-full h-4 w-4 bg-[color:var(--canvas-raised)]" />
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-bold bg-[color:var(--canvas-raised)] text-[color:var(--error)]">
              <Play className="w-3 h-3 fill-current" />
              LIVE
            </span>
            {currentHole && (
              <span className="text-[color:var(--canvas-raised)]/80 text-sm font-medium">
                Hole {currentHole}
              </span>
            )}
          </div>

          <p className="text-[color:var(--canvas-raised)] font-semibold text-lg">
            {matchCount} {matchCount === 1 ? 'Match' : 'Matches'} in Progress
          </p>

          {closestMatch && (
            <p className="text-[color:var(--canvas-raised)]/80 text-sm mt-0.5 truncate">
              {closestMatch.teamA} vs {closestMatch.teamB} • {closestMatch.score}
            </p>
          )}
        </div>

        {/* Arrow */}
        <ChevronRight className="w-6 h-6 text-[color:var(--canvas-raised)]/60 group-hover:text-[color:var(--canvas-raised)] transition-colors shrink-0" />
      </div>

      {/* Bottom action hint */}
      <div className="relative mt-3 pt-3 border-t border-[color:var(--canvas-raised)]/20 flex items-center justify-center gap-2 text-[color:var(--canvas-raised)]/80 text-sm">
        <Users className="w-4 h-4" />
        <span>Tap to watch live scoring</span>
      </div>
    </button>
  );
}

/**
 * Compact version for use in lists or cards
 */
interface LiveMatchPillProps {
  matchCount: number;
  onClick?: () => void;
  className?: string;
}

export function LiveMatchPill({ matchCount, onClick, className }: LiveMatchPillProps) {
  const router = useRouter();

  if (matchCount === 0) return null;

  return (
    <button
      onClick={onClick || (() => router.push('/live'))}
      className={cn(
        'inline-flex items-center gap-2 px-3 py-1.5 rounded-full',
        'transition-all hover:scale-105 active:scale-95',
        className
      )}
      style={{
        background: 'linear-gradient(135deg, var(--error) 0%, color-mix(in srgb, var(--error) 72%, black 28%) 100%)',
      }}
    >
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[color:var(--canvas-raised)] opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-[color:var(--canvas-raised)]" />
      </span>
      <span className="text-[color:var(--canvas-raised)] text-sm font-semibold">
        {matchCount} Live
      </span>
    </button>
  );
}

export default LiveMatchBanner;
