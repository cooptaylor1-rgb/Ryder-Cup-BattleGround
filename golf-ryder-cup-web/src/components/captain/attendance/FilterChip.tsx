/**
 * A pill-shaped toggle chip used for filtering the attendance roster by status.
 */

import { cn } from '@/lib/utils';

interface FilterChipProps {
  active: boolean;
  label: string;
  onClick: () => void;
  className?: string;
}

export function FilterChip({ active, label, onClick, className }: FilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-[var(--space-3)] py-[var(--space-2)] text-sm font-semibold transition-all',
        active
          ? 'border-[var(--maroon)] bg-[var(--maroon)] text-[var(--canvas)] shadow-[0_10px_24px_rgba(104,35,48,0.16)]'
          : 'border-[color:var(--rule)]/75 bg-[color:var(--surface)]/78 text-[var(--ink-secondary)] hover:border-[var(--maroon-subtle)] hover:text-[var(--ink)]',
        !active && className
      )}
    >
      {label}
    </button>
  );
}
