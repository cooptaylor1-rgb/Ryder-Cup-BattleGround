'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface BuilderFactProps {
  label: string;
  value: number | string;
  note?: string;
}

export function BuilderFact({ label, value, note }: BuilderFactProps) {
  return (
    <div className="rounded-[20px] border border-[color:var(--rule)]/75 bg-[color:var(--canvas)]/72 px-3 py-3 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
        {label}
      </p>
      <p className="mt-1 font-serif text-[length:var(--text-xl)] text-[var(--ink)]">{value}</p>
      {note && <p className="mt-1 text-[11px] text-[var(--ink-secondary)]">{note}</p>}
    </div>
  );
}

export interface BuilderStatusPillProps {
  label: string;
  icon: ReactNode;
  tone?: 'muted' | 'masters';
}

export function BuilderStatusPill({ label, icon, tone = 'muted' }: BuilderStatusPillProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium',
        tone === 'masters'
          ? 'bg-[color:rgba(0,102,68,0.12)] text-[var(--masters)]'
          : 'bg-[color:var(--surface)] text-[var(--ink-secondary)]'
      )}
    >
      {icon}
      {label}
    </div>
  );
}
