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
import { Button } from './Button';
import type { LucideIcon } from 'lucide-react';
import { Inbox } from 'lucide-react';

// Re-export premium versions for backwards compatibility
export {
  EmptyStatePremium,
  NoTournamentsEmpty,
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
      <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--rule)] bg-[var(--surface-secondary)]">
        <Icon className="h-7 w-7 text-[var(--ink-tertiary)]" />
      </div>

      {/* Title -- serif for editorial warmth */}
      <h3
        className="text-xl mb-2"
        style={{
          fontFamily: 'var(--font-serif)',
          fontWeight: 400,
          color: 'var(--ink, #1A1815)',
          lineHeight: 1.25,
          letterSpacing: 0,
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

      {/* Action -- primary Button for Masters green CTA */}
      {action && (
        <Button variant="primary" onClick={action.onClick} className="mt-6">
          {action.label}
        </Button>
      )}

      {children}
    </div>
  );
}

export default EmptyState;
