'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import {
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Trophy,
  Zap,
  type LucideIcon,
} from 'lucide-react';

export interface CaptainCommandAction {
  id: string;
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
  tone: 'maroon' | 'ink';
}

export interface CaptainSessionListItem {
  id: string;
  name: string;
  sessionType: string;
  scheduledDate?: string;
  isLocked?: boolean;
}

export function GateFactCard({
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
          'mt-[var(--space-2)] font-serif text-[1.5rem] italic leading-none text-[var(--ink)]',
          valueClassName
        )}
      >
        {value}
      </p>
    </div>
  );
}

export function CaptainFactCard({
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

export function ReadinessPill({
  tone,
  children,
}: {
  tone: 'ready' | 'building' | 'needs';
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-[var(--space-2)] rounded-full border px-[var(--space-3)] py-[var(--space-2)]',
        tone === 'ready' &&
          'border-[color:var(--success)]/18 bg-[color:var(--success)]/10 text-[var(--success)]',
        tone === 'building' &&
          'border-[color:var(--warning)]/18 bg-[color:var(--warning)]/10 text-[var(--warning)]',
        tone === 'needs' &&
          'border-[color:var(--maroon)]/18 bg-[color:var(--maroon)]/10 text-[var(--maroon)]'
      )}
    >
      {tone === 'ready' ? (
        <CheckCircle2 size={14} />
      ) : tone === 'building' ? (
        <Clock3 size={14} />
      ) : (
        <AlertTriangle size={14} />
      )}
      <span className="type-caption font-semibold">{children}</span>
    </div>
  );
}

export function CaptainSectionHeading({
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
      <p className="type-overline tracking-[0.16em] text-[var(--maroon)]">{eyebrow}</p>
      <h2 className="mt-[var(--space-2)] type-display-sm text-[var(--ink)]">{title}</h2>
      <p className="mt-[var(--space-2)] type-body-sm text-[var(--ink-secondary)]">
        {description}
      </p>
    </div>
  );
}

export function CommandActionCard({ action }: { action: CaptainCommandAction }) {
  const toneClass =
    action.tone === 'maroon'
      ? 'border-[color:var(--maroon)]/16 bg-[linear-gradient(180deg,rgba(114,47,55,0.08),rgba(255,255,255,0.96))]'
      : 'border-[var(--rule)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,244,237,0.96))]';
  const iconClass =
    action.tone === 'maroon'
      ? 'border-[color:var(--maroon)]/16 bg-[color:var(--maroon)]/10 text-[var(--maroon)]'
      : 'border-[color:var(--gold)]/18 bg-[color:var(--gold)]/10 text-[var(--gold-dark)]';

  return (
    <Link href={action.href} className={cn('card-premium card-interactive p-[var(--space-5)]', toneClass)}>
      <div className="flex items-start justify-between gap-[var(--space-4)]">
        <div className={cn('flex h-11 w-11 items-center justify-center rounded-full border', iconClass)}>
          <action.icon size={20} strokeWidth={1.8} />
        </div>
        <ChevronRight size={18} className="mt-[var(--space-1)] text-[var(--ink-tertiary)]" />
      </div>
      <h3 className="mt-[var(--space-5)] type-title-lg text-[var(--ink)]">{action.label}</h3>
      <p className="mt-[var(--space-2)] type-body-sm text-[var(--ink-secondary)]">
        {action.description}
      </p>
    </Link>
  );
}

export function SessionGroupCard({
  title,
  description,
  tone,
  sessions,
  emptyTitle,
  emptyDescription,
}: {
  title: string;
  description: string;
  tone: 'live' | 'upcoming' | 'completed';
  sessions: CaptainSessionListItem[];
  emptyTitle: string;
  emptyDescription: string;
}) {
  const toneClass =
    tone === 'live'
      ? 'border-[color:var(--masters)]/16 bg-[linear-gradient(180deg,rgba(0,102,68,0.08),rgba(255,255,255,0.96))]'
      : tone === 'completed'
        ? 'border-[color:var(--success)]/16 bg-[linear-gradient(180deg,rgba(45,122,79,0.08),rgba(255,255,255,0.96))]'
        : 'border-[var(--rule)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92),rgba(248,244,237,0.96))]';
  const icon =
    tone === 'live' ? (
      <Zap size={16} />
    ) : tone === 'completed' ? (
      <Trophy size={16} />
    ) : (
      <CalendarDays size={16} />
    );

  return (
    <section
      className={cn(
        'overflow-hidden rounded-[1.7rem] border shadow-[0_18px_36px_rgba(46,34,18,0.06)]',
        toneClass
      )}
    >
      <div className="border-b border-[color:var(--rule)]/80 px-[var(--space-5)] py-[var(--space-5)]">
        <div className="flex items-start gap-[var(--space-3)]">
          <div className="mt-[2px]">{icon}</div>
          <div>
            <p className="type-title text-[var(--ink)]">{title}</p>
            <p className="mt-[var(--space-1)] type-body-sm text-[var(--ink-secondary)]">
              {description}
            </p>
          </div>
        </div>
      </div>

      <div className="px-[var(--space-3)] py-[var(--space-3)]">
        {sessions.length === 0 ? (
          <div className="rounded-[1.2rem] border border-dashed border-[var(--rule)] bg-[rgba(255,255,255,0.6)] px-[var(--space-4)] py-[var(--space-5)] text-center">
            <p className="type-title-sm text-[var(--ink)]">{emptyTitle}</p>
            <p className="mt-[var(--space-2)] type-caption">{emptyDescription}</p>
          </div>
        ) : (
          sessions.map((session, index) => (
            <Link
              key={session.id}
              href={`/lineup/${session.id}`}
              className={cn(
                'flex items-center gap-[var(--space-4)] rounded-[1.2rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.8)] px-[var(--space-4)] py-[var(--space-4)] transition-colors hover:bg-[var(--canvas-raised)]',
                index > 0 ? 'mt-[var(--space-2)]' : undefined
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="type-title-sm truncate text-[var(--ink)]">{session.name}</p>
                <p className="mt-[var(--space-1)] type-caption capitalize">
                  {session.sessionType}
                  {session.scheduledDate
                    ? ` · ${new Date(session.scheduledDate).toLocaleDateString()}`
                    : ''}
                </p>
              </div>

              {session.isLocked ? (
                <div className="inline-flex items-center gap-[var(--space-1)] rounded-full border border-[color:var(--gold)]/18 bg-[color:var(--gold)]/10 px-[var(--space-2)] py-[6px]">
                  <span className="type-micro font-semibold text-[var(--gold-dark)]">Locked</span>
                </div>
              ) : null}

              <ChevronRight size={18} className="text-[var(--ink-tertiary)]" />
            </Link>
          ))
        )}
      </div>
    </section>
  );
}

export function TeamOverviewCard({
  name,
  count,
  tone,
  summary,
}: {
  name: string;
  count: number;
  tone: 'usa' | 'europe';
  summary: string;
}) {
  const toneClass =
    tone === 'usa'
      ? 'border-[color:var(--team-usa)]/16 bg-[linear-gradient(180deg,rgba(30,58,95,0.08),rgba(255,255,255,0.96))]'
      : 'border-[color:var(--team-europe)]/16 bg-[linear-gradient(180deg,rgba(114,47,55,0.08),rgba(255,255,255,0.96))]';
  const textClass = tone === 'usa' ? 'text-[var(--team-usa)]' : 'text-[var(--team-europe)]';

  return (
    <div
      className={cn(
        'rounded-[1.5rem] border p-[var(--space-5)] shadow-[0_16px_32px_rgba(46,34,18,0.06)]',
        toneClass
      )}
    >
      <p className={cn('type-overline tracking-[0.16em]', textClass)}>{summary}</p>
      <h3 className="mt-[var(--space-2)] type-title-lg text-[var(--ink)]">{name}</h3>
      <div className="mt-[var(--space-4)] flex items-end justify-between gap-[var(--space-4)]">
        <div>
          <p className="font-serif text-[2.4rem] italic leading-none text-[var(--ink)]">{count}</p>
          <p className="mt-[var(--space-1)] type-caption">players</p>
        </div>
        <Link href="/players" className={cn('type-caption font-semibold no-underline', textClass)}>
          Manage roster
        </Link>
      </div>
    </div>
  );
}
