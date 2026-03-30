/**
 * A small action button shown in the expanded section of a player check-in card.
 */

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface ActionChipProps {
  label: string;
  icon: ReactNode;
  className: string;
  onClick: () => void;
}

export function ActionChip({ label, icon, className, onClick }: ActionChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-xl px-[var(--space-3)] py-[0.7rem] text-sm font-semibold transition-transform hover:scale-[1.02]',
        className
      )}
    >
      {icon}
      {label}
    </button>
  );
}
