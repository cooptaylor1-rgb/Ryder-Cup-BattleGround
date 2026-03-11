'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

export interface MenuItem {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  href?: string;
  action?: () => void;
  badge?: string;
  tone?: 'default' | 'green' | 'maroon' | 'danger';
  disabled?: boolean;
}

export interface MenuSection {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  items: MenuItem[];
}

export function ProfilePanel({
  isAuthenticated,
  currentUserName,
  currentUserEmail,
  initials,
}: {
  isAuthenticated: boolean;
  currentUserName: string | null;
  currentUserEmail: string | null;
  initials: string;
}) {
  return (
    <section className="rounded-[1.85rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,238,231,0.99))] p-[var(--space-5)] shadow-[0_18px_38px_rgba(41,29,17,0.06)]">
      {isAuthenticated && currentUserName ? (
        <Link href="/profile" className="block">
          <div className="flex items-center gap-[var(--space-4)]">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[linear-gradient(135deg,var(--masters)_0%,var(--masters-deep)_100%)] font-semibold text-[var(--canvas)] shadow-[0_12px_24px_rgba(5,58,35,0.2)]">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="type-overline tracking-[0.14em] text-[var(--ink-tertiary)]">
                Profile
              </p>
              <h2 className="mt-[var(--space-2)] text-lg font-semibold text-[var(--ink)]">
                {currentUserName}
              </h2>
              <p className="mt-[2px] truncate text-sm text-[var(--ink-secondary)]">
                {currentUserEmail}
              </p>
            </div>
          </div>
        </Link>
      ) : (
        <div>
          <p className="type-overline tracking-[0.14em] text-[var(--ink-tertiary)]">Account</p>
          <h2 className="mt-[var(--space-2)] font-serif text-[1.75rem] italic text-[var(--ink)]">
            Sign in when the trip deserves a durable identity.
          </h2>
          <p className="mt-[var(--space-3)] text-sm leading-7 text-[var(--ink-secondary)]">
            Local play still works, but signed-in users get a cleaner bridge between device state
            and the cloud-backed parts of the app.
          </p>
          <div className="mt-[var(--space-4)] flex flex-wrap gap-[var(--space-3)]">
            <Link
              href="/login"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-[var(--masters)] px-[var(--space-4)] py-[var(--space-3)] text-sm font-semibold text-[var(--canvas)] transition-transform duration-150 hover:scale-[1.02]"
            >
              Sign in
            </Link>
            <Link
              href="/profile/create"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/82 px-[var(--space-4)] py-[var(--space-3)] text-sm font-semibold text-[var(--ink)] transition-transform duration-150 hover:scale-[1.02] hover:bg-[var(--surface)]"
            >
              Create profile
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}

export function TripPanel({
  tripName,
  tripDates,
  tripLocation,
  onExit,
}: {
  tripName: string;
  tripDates: string;
  tripLocation?: string;
  onExit: () => void;
}) {
  return (
    <section className="overflow-hidden rounded-[1.85rem] border border-[var(--masters)]/14 bg-[linear-gradient(135deg,rgba(10,80,48,0.97),rgba(4,52,30,0.98))] p-[var(--space-5)] text-[var(--canvas)] shadow-[0_22px_48px_rgba(5,58,35,0.2)]">
      <div className="flex items-start justify-between gap-[var(--space-4)]">
        <div>
          <p className="type-overline tracking-[0.16em] text-[color:var(--canvas)]/72">
            Current Trip
          </p>
          <h2 className="mt-[var(--space-2)] font-serif text-[1.95rem] italic text-[var(--canvas)]">
            {tripName}
          </h2>
          <p className="mt-[var(--space-2)] text-sm leading-6 text-[color:var(--canvas)]/78">
            {tripDates}
          </p>
          {tripLocation ? (
            <p className="mt-[var(--space-2)] text-sm text-[color:var(--canvas)]/74">
              {tripLocation}
            </p>
          ) : null}
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-[color:var(--canvas)]/22 bg-transparent text-[var(--canvas)] hover:bg-[color:var(--canvas)]/10"
          onClick={onExit}
        >
          Exit
        </Button>
      </div>
    </section>
  );
}

export function AccessPanel({
  isCaptainMode,
  isAdminMode,
  onCaptainClick,
  onAdminClick,
  captainIcon,
  adminIcon,
}: {
  isCaptainMode: boolean;
  isAdminMode: boolean;
  onCaptainClick: () => void;
  onAdminClick: () => void;
  captainIcon: ReactNode;
  adminIcon: ReactNode;
}) {
  return (
    <section className="rounded-[1.85rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,238,231,0.99))] p-[var(--space-5)] shadow-[0_18px_38px_rgba(41,29,17,0.06)]">
      <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">Access Modes</p>
      <h2 className="mt-[var(--space-2)] font-serif text-[1.8rem] italic text-[var(--ink)]">
        Unlock the structural tools on purpose.
      </h2>
      <div className="mt-[var(--space-4)] space-y-[var(--space-3)]">
        <ModeRow
          title="Captain mode"
          description={
            isCaptainMode
              ? 'Full lineup and trip editing access is active.'
              : 'Unlock lineups, sessions, and captain controls.'
          }
          icon={captainIcon}
          enabled={isCaptainMode}
          tone="maroon"
          onClick={onCaptainClick}
        />
        <ModeRow
          title="Admin mode"
          description={
            isAdminMode
              ? 'Destructive and elevated tools are active.'
              : 'Reserve the dangerous tools for deliberate use only.'
          }
          icon={adminIcon}
          enabled={isAdminMode}
          tone="danger"
          onClick={onAdminClick}
        />
      </div>
    </section>
  );
}

function ModeRow({
  title,
  description,
  icon,
  enabled,
  tone,
  onClick,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  enabled: boolean;
  tone: 'maroon' | 'danger';
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-[var(--space-3)] rounded-[1.3rem] border px-[var(--space-4)] py-[var(--space-4)] text-left transition-transform duration-150 hover:scale-[1.01]',
        enabled
          ? tone === 'maroon'
            ? 'border-[var(--maroon-subtle)] bg-[color:var(--maroon)]/8'
            : 'border-[color:var(--error)]/25 bg-[color:var(--error)]/7'
          : 'border-[color:var(--rule)]/75 bg-[color:var(--surface)]/82'
      )}
    >
      <div
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-[1rem]',
          enabled
            ? tone === 'maroon'
              ? 'bg-[linear-gradient(135deg,var(--maroon)_0%,var(--maroon-dark)_100%)] text-[var(--canvas)]'
              : 'bg-[var(--error)] text-[var(--canvas)]'
            : 'bg-[var(--surface-raised)] text-[var(--ink-secondary)]'
        )}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-[var(--ink)]">{title}</p>
        <p className="mt-[2px] text-sm leading-6 text-[var(--ink-secondary)]">{description}</p>
      </div>
      <ModeToggle enabled={enabled} tone={tone} />
    </button>
  );
}

export function MenuTile({ item }: { item: MenuItem }) {
  const toneClassName = getTileToneClassName(item.tone || 'default');
  const Icon = item.icon;

  const content = (
    <>
      <div
        className={cn('flex h-11 w-11 items-center justify-center rounded-[1rem]', toneClassName)}
      >
        <Icon size={18} />
      </div>
      <div className="mt-[var(--space-3)] flex items-center gap-[var(--space-2)]">
        <h3 className="text-base font-semibold text-[var(--ink)]">{item.label}</h3>
        {item.badge ? (
          <span className="rounded-full bg-[color:var(--surface-raised)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-secondary)]">
            {item.badge}
          </span>
        ) : null}
      </div>
      <p className="mt-[var(--space-2)] text-sm leading-6 text-[var(--ink-secondary)]">
        {item.description}
      </p>
      <p className="mt-[var(--space-4)] text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
        {item.action ? 'Run tool' : 'Open room'}
      </p>
    </>
  );

  const className = cn(
    'rounded-[1.55rem] border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/82 p-[var(--space-4)] text-left shadow-[0_14px_32px_rgba(41,29,17,0.05)] transition-transform duration-150 hover:scale-[1.01] hover:bg-[var(--surface)]',
    item.disabled && 'cursor-wait opacity-70'
  );

  if (item.href) {
    return (
      <Link href={item.href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={item.action} className={className} disabled={item.disabled}>
      {content}
    </button>
  );
}

export function SidebarNote({
  title,
  body,
  icon,
  tone = 'ink',
}: {
  title: string;
  body: string;
  icon: ReactNode;
  tone?: 'ink' | 'maroon';
}) {
  return (
    <aside
      className={cn(
        'rounded-[1.8rem] border p-[var(--space-5)] shadow-[0_18px_38px_rgba(41,29,17,0.06)]',
        tone === 'maroon'
          ? 'border-[var(--maroon-subtle)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,240,241,0.99))]'
          : 'border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,239,232,0.99))]'
      )}
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[var(--surface-raised)] text-[var(--ink-tertiary)]">
        {icon}
      </div>
      <h3 className="mt-[var(--space-3)] font-serif text-[1.6rem] italic text-[var(--ink)]">
        {title}
      </h3>
      <p className="mt-[var(--space-3)] text-sm leading-7 text-[var(--ink-secondary)]">
        {body}
      </p>
    </aside>
  );
}

export function MoreFactCard({
  label,
  value,
  detail,
  valueClassName,
}: {
  label: string;
  value: string | number;
  detail: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-[1.55rem] border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/78 p-[var(--space-4)] shadow-[0_14px_28px_rgba(41,29,17,0.05)]">
      <p className="type-overline tracking-[0.14em] text-[var(--ink-tertiary)]">{label}</p>
      <p
        className={cn(
          'mt-[var(--space-2)] font-serif text-[2rem] italic leading-none text-[var(--ink)]',
          valueClassName
        )}
      >
        {value}
      </p>
      <p className="mt-[var(--space-2)] text-xs leading-5 text-[var(--ink-secondary)]">
        {detail}
      </p>
    </div>
  );
}

function ModeToggle({
  enabled,
  tone,
}: {
  enabled: boolean;
  tone: 'maroon' | 'danger';
}) {
  return (
    <div
      className="relative h-7 w-12 shrink-0 rounded-[14px] transition-colors duration-200"
      style={{
        background: enabled
          ? tone === 'maroon'
            ? 'var(--maroon)'
            : 'var(--error)'
          : 'var(--rule)',
      }}
    >
      <div
        className="absolute top-[2px] h-6 w-6 rounded-full bg-[var(--surface-raised)] shadow-sm transition-transform duration-200"
        style={{ transform: `translateX(${enabled ? 22 : 2}px)` }}
      />
    </div>
  );
}

function getTileToneClassName(tone: MenuItem['tone']) {
  switch (tone) {
    case 'green':
      return 'bg-[color:var(--masters)]/12 text-[var(--masters)]';
    case 'maroon':
      return 'bg-[color:var(--maroon)]/10 text-[var(--maroon)]';
    case 'danger':
      return 'bg-[color:var(--error)]/10 text-[var(--error)]';
    default:
      return 'bg-[color:var(--surface-raised)] text-[var(--ink-secondary)]';
  }
}

export function formatTripRange(startDate?: string, endDate?: string) {
  if (!startDate || !endDate) {
    return 'Trip dates not set';
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  return `${start.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  })} - ${end.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })}`;
}
