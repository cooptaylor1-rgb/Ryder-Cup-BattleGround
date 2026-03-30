/**
 * A single metric tile used in the attendance stats summary grid.
 */

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AttendanceMetricCardProps {
  label: string;
  value: ReactNode;
  detail: string;
  tone: 'ink' | 'gold' | 'green' | 'maroon';
}

const toneClassNames = {
  ink: 'border-[color:var(--rule)]/70 bg-[color:var(--surface)]/80',
  gold:
    'border-[color:var(--warning)]/18 bg-[linear-gradient(180deg,rgba(184,134,11,0.10),rgba(255,255,255,0.98))]',
  green:
    'border-[color:var(--success)]/16 bg-[linear-gradient(180deg,rgba(45,122,79,0.10),rgba(255,255,255,0.98))]',
  maroon:
    'border-[color:var(--maroon)]/16 bg-[linear-gradient(180deg,rgba(104,35,48,0.10),rgba(255,255,255,0.98))]',
} satisfies Record<'ink' | 'gold' | 'green' | 'maroon', string>;

export function AttendanceMetricCard({ label, value, detail, tone }: AttendanceMetricCardProps) {
  return (
    <div className={cn('rounded-[1.35rem] border p-[var(--space-4)]', toneClassNames[tone])}>
      <p className="type-overline tracking-[0.15em] text-[var(--ink-tertiary)]">{label}</p>
      <p className="mt-[var(--space-3)] font-serif text-[1.9rem] italic leading-none text-[var(--ink)]">
        {value}
      </p>
      <p className="mt-[var(--space-2)] text-sm text-[var(--ink-secondary)]">{detail}</p>
    </div>
  );
}
