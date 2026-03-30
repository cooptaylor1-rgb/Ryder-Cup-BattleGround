import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

/* ── HeroMetaPill ── */
interface HeroMetaPillProps {
  icon: React.ReactNode;
  children: React.ReactNode;
}

export const HeroMetaPill = React.memo(function HeroMetaPill({
  icon,
  children,
}: HeroMetaPillProps) {
  return (
    <div className="inline-flex items-center gap-[var(--space-2)] rounded-full border border-[var(--rule)] bg-[rgba(255,255,255,0.72)] px-[var(--space-3)] py-[var(--space-2)] text-[var(--text-xs)] font-medium text-[var(--ink-secondary)]">
      <span className="text-[var(--masters)]">{icon}</span>
      <span>{children}</span>
    </div>
  );
});

/* ── HeroMetaStat ── */
interface HeroMetaStatProps {
  label: string;
  value: number | string;
}

export const HeroMetaStat = React.memo(function HeroMetaStat({
  label,
  value,
}: HeroMetaStatProps) {
  return (
    <div className="rounded-[1rem] border border-[var(--rule)] bg-[var(--canvas)] px-[var(--space-3)] py-[var(--space-2)] text-center">
      <p className="type-micro uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">{label}</p>
      <p className="mt-[2px] font-serif text-[1.2rem] italic text-[var(--ink)]">{value}</p>
    </div>
  );
});

/* ── HomeSectionHeader ── */
interface HomeSectionHeaderProps {
  eyebrow: React.ReactNode;
  title: string;
  action?: React.ReactNode;
}

export const HomeSectionHeader = React.memo(function HomeSectionHeader({
  eyebrow,
  title,
  action,
}: HomeSectionHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-[var(--space-4)]">
      <div className="min-w-0">
        <p className="type-overline tracking-[0.15em] text-[var(--ink-tertiary)]">{eyebrow}</p>
        <h2 className="mt-[var(--space-2)] font-serif text-[clamp(1.45rem,5vw,2rem)] italic leading-[1.08] text-[var(--ink)]">
          {title}
        </h2>
      </div>
      {action && <div className="shrink-0 pt-[2px]">{action}</div>}
    </div>
  );
});

/* ── SetupStep ── */
export interface SetupStepProps {
  number: number;
  label: string;
  done: boolean;
  href: string;
  hint?: string;
}

export const SetupStep = React.memo(function SetupStep({
  number,
  label,
  done,
  href,
  hint,
}: SetupStepProps) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-[var(--space-3)] p-[var(--space-3)] rounded-[var(--radius-md)] no-underline text-[var(--ink)] transition-[background] duration-fast ease-out ${
        done
          ? 'bg-[var(--masters-subtle)] border border-[rgba(0,102,68,0.2)]'
          : 'bg-[var(--canvas-sunken)] border border-[var(--rule)]'
      }`}
    >
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
          done
            ? 'bg-[var(--masters)] text-[var(--canvas)]'
            : 'bg-[var(--rule)] text-[var(--ink-tertiary)]'
        }`}
      >
        {done ? '✓' : number}
      </div>
      <div className="flex-1">
        <p className={`type-title-sm ${done ? 'text-[var(--masters)]' : 'text-[var(--ink)]'}`}>{label}</p>
        {hint && <p className="type-micro mt-[2px]">{hint}</p>}
      </div>
      <ChevronRight size={14} className={done ? 'text-[var(--masters)]' : 'text-[var(--ink-tertiary)]'} />
    </Link>
  );
});
