/**
 * Empty State Component
 *
 * Re-exports from EmptyStatePremium for backwards compatibility.
 * Use EmptyStatePremium directly for the best experience with illustrations.
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
    <div className={cn('py-12 px-4 text-center', className)}>
      <div
        className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
        style={{
          background: 'var(--surface, #1E1C18)',
          border: '1px solid var(--rule, #3A3530)',
        }}
      >
        <Icon
          className="w-8 h-8"
          style={{ color: 'var(--ink-tertiary, #807868)' }}
        />
      </div>
      <h3
        className="text-lg font-semibold mb-1"
        style={{ color: 'var(--ink, #F5F1E8)' }}
      >
        {title}
      </h3>
      {description && (
        <p
          className="text-sm max-w-xs mx-auto"
          style={{ color: 'var(--ink-secondary, #B8B0A0)' }}
        >
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 px-4 py-2 rounded-lg font-medium transition-colors"
          style={{
            background: 'var(--masters, #006747)',
            color: 'white',
          }}
        >
          {action.label}
        </button>
      )}
      {children}
    </div>
  );
}

export default EmptyState;
