/**
 * Empty State Component
 *
 * Basic empty state with editorial design.
 * Serif titles, warm cream tones, restrained layout.
 * Re-exports from EmptyStatePremium for backwards compatibility.
 */

'use client';

import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

// Re-export premium versions for backwards compatibility
export {
  EmptyStatePremium,
  NoTournamentsEmpty as NoTripsEmpty,
  NoMatchesEmpty,
  NoSessionsEmpty,
  NoPlayersEmpty,
  NoStandingsEmpty,
  NoCoursesEmpty,
  NoScoresEmpty,
  NoSearchResultsEmpty,
  TournamentCompleteEmpty,
  OfflineEmpty,
  ErrorEmpty,
  // New premium empty states
  NoBetsEmpty,
  NoMessagesEmpty,
  NoPhotosEmpty,
  NoActivityEmpty,
  LoadingEmpty,
} from './EmptyStatePremium';

// Simple EmptyState for basic use cases (when you don't need illustrations)
interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  children?: ReactNode;
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div className={cn('py-16 px-6 text-center', className)}>
      {/* Single icon -- restrained, warm background */}
      <div
        className="w-14 h-14 mx-auto mb-6 rounded-2xl flex items-center justify-center"
        style={{
          background: 'var(--canvas-warm, #F0EDE8)',
          border: '1px solid var(--rule, #E8E4DF)',
        }}
      >
        <Icon
          className="w-7 h-7"
          style={{ color: 'var(--ink-tertiary, #A39E98)' }}
        />
      </div>

      {/* Title -- serif for editorial warmth */}
      <h3
        className="text-xl mb-2"
        style={{
          fontFamily: 'var(--font-serif)',
          fontWeight: 400,
          color: 'var(--ink, #1A1815)',
          lineHeight: 1.25,
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </h3>

      {/* Description -- sans for readability */}
      {description && (
        <p
          className="text-sm max-w-xs mx-auto"
          style={{
            fontFamily: 'var(--font-sans)',
            color: 'var(--ink-secondary, #6B6560)',
            lineHeight: 1.6,
          }}
        >
          {description}
        </p>
      )}

      {/* Action -- btn-premium for Masters green CTA */}
      {action && (
        <button
          onClick={action.onClick}
          className="btn-premium mt-6"
        >
          {action.label}
        </button>
      )}

      {children}
    </div>
  );
}

export default EmptyState;
