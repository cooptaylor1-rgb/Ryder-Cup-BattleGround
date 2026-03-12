import type { ReactNode } from 'react';
import Link from 'next/link';
import { Plus } from 'lucide-react';

import { cn } from '@/lib/utils';

export function ManageFactCard({
  label,
  value,
  valueClassName,
}: {
  label: string;
  value: string | number;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-[1.1rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.72)] px-[var(--space-4)] py-[var(--space-4)] shadow-[0_12px_24px_rgba(46,34,18,0.05)]">
      <p className="type-overline text-[var(--ink-tertiary)]">{label}</p>
      <p
        className={cn(
          'mt-[var(--space-2)] font-serif text-[1.7rem] italic leading-none text-[var(--ink)]',
          valueClassName
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function ManageSectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mb-[var(--space-4)]">
      <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">{eyebrow}</p>
      <h2 className="mt-[var(--space-2)] type-display-sm text-[var(--ink)]">{title}</h2>
      <p className="mt-[var(--space-2)] type-body-sm text-[var(--ink-secondary)]">{description}</p>
    </div>
  );
}

export function EmptyManageCard({
  icon,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  icon: ReactNode;
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className="card-premium p-[var(--space-6)] text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[var(--rule)] bg-[var(--canvas-sunken)]">
        {icon}
      </div>
      <h3 className="mt-[var(--space-4)] type-title-lg text-[var(--ink)]">{title}</h3>
      <p className="mt-[var(--space-2)] type-body-sm text-[var(--ink-secondary)]">{description}</p>
      <Link
        href={actionHref}
        className="btn-premium mt-[var(--space-5)] inline-flex items-center gap-[var(--space-2)] rounded-[1rem] px-[var(--space-4)] py-[var(--space-3)]"
      >
        <Plus size={16} />
        {actionLabel}
      </Link>
    </div>
  );
}
