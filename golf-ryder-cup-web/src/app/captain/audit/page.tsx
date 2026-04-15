'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  CaptainModeRequiredState,
  CaptainNoTripState,
} from '@/components/captain/CaptainAccessState';
import {
  Filter,
  Search,
  ShieldCheck,
  type LucideIcon,
  Target,
  Users,
  Waves,
} from 'lucide-react';
import { PageHeader } from '@/components/layout';
import { Button } from '@/components/ui/Button';
import { db } from '@/lib/db';
import { useTripStore, useAccessStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import type { AuditActionType, AuditLogEntry } from '@/lib/types/models';
import { cn } from '@/lib/utils';

const ACTION_TYPES: AuditActionType[] = [
  'sessionCreated',
  'sessionLocked',
  'sessionUnlocked',
  'pairingCreated',
  'pairingEdited',
  'pairingDeleted',
  'lineupPublished',
  'matchStarted',
  'matchFinalized',
  'scoreEntered',
  'scoreEdited',
  'scoreUndone',
  'captainModeEnabled',
  'captainModeDisabled',
];

const ACTION_META: Record<
  AuditActionType,
  {
    label: string;
    icon: LucideIcon;
    accentClassName: string;
    summary: string;
  }
> = {
  sessionCreated: {
    label: 'Session Created',
    icon: ShieldCheck,
    accentClassName: 'bg-[color:var(--masters)]/10 text-[var(--masters)]',
    summary: 'A new room opened on the board.',
  },
  sessionLocked: {
    label: 'Session Locked',
    icon: Target,
    accentClassName: 'bg-[color:var(--warning)]/10 text-[var(--warning)]',
    summary: 'The card was closed to changes.',
  },
  sessionUnlocked: {
    label: 'Session Unlocked',
    icon: Waves,
    accentClassName: 'bg-[color:var(--team-europe)]/10 text-[var(--team-europe)]',
    summary: 'The room opened back up for edits.',
  },
  pairingCreated: {
    label: 'Pairing Created',
    icon: Users,
    accentClassName: 'bg-[color:var(--team-usa)]/10 text-[var(--team-usa)]',
    summary: 'A match was built and put in play.',
  },
  pairingEdited: {
    label: 'Pairing Edited',
    icon: Filter,
    accentClassName: 'bg-[color:var(--maroon)]/10 text-[var(--maroon)]',
    summary: 'The match card was adjusted after setup.',
  },
  pairingDeleted: {
    label: 'Pairing Deleted',
    icon: Filter,
    accentClassName: 'bg-[color:var(--error)]/10 text-[var(--error)]',
    summary: 'A match card was removed from the board.',
  },
  lineupPublished: {
    label: 'Lineup Published',
    icon: Target,
    accentClassName: 'bg-[color:var(--masters)]/10 text-[var(--masters)]',
    summary: 'The captain made the pairings official.',
  },
  matchStarted: {
    label: 'Match Started',
    icon: Waves,
    accentClassName: 'bg-[color:var(--team-europe)]/10 text-[var(--team-europe)]',
    summary: 'A live card moved from plan to play.',
  },
  matchFinalized: {
    label: 'Match Finalized',
    icon: ShieldCheck,
    accentClassName: 'bg-[color:var(--success)]/10 text-[var(--success)]',
    summary: 'The result is now part of the permanent ledger.',
  },
  scoreEntered: {
    label: 'Score Entered',
    icon: Target,
    accentClassName: 'bg-[color:var(--masters)]/10 text-[var(--masters)]',
    summary: 'A new score was added to the board.',
  },
  scoreEdited: {
    label: 'Score Edited',
    icon: Filter,
    accentClassName: 'bg-[color:var(--warning)]/10 text-[var(--warning)]',
    summary: 'A recorded score was corrected.',
  },
  scoreUndone: {
    label: 'Score Undone',
    icon: Filter,
    accentClassName: 'bg-[color:var(--error)]/10 text-[var(--error)]',
    summary: 'A score entry was rolled back.',
  },
  captainModeEnabled: {
    label: 'Captain Mode On',
    icon: ShieldCheck,
    accentClassName: 'bg-[color:var(--masters)]/10 text-[var(--masters)]',
    summary: 'Captain controls became available.',
  },
  captainModeDisabled: {
    label: 'Captain Mode Off',
    icon: ShieldCheck,
    accentClassName: 'bg-[color:var(--ink-tertiary)]/10 text-[var(--ink-tertiary)]',
    summary: 'Captain controls were closed down.',
  },
};

export default function CaptainAuditLogPage() {
  const router = useRouter();
  const { currentTrip } = useTripStore(useShallow(s => ({ currentTrip: s.currentTrip })));
  const { isCaptainMode } = useAccessStore(useShallow(s => ({ isCaptainMode: s.isCaptainMode })));
  const [actorFilter, setActorFilter] = useState('');
  const [actionFilter, setActionFilter] = useState<'all' | AuditActionType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [capturedNow] = useState(() => Date.now());

  const entries = useLiveQuery(
    async (): Promise<AuditLogEntry[]> => {
      if (!currentTrip) {
        return [];
      }

      return db.auditLog.where('tripId').equals(currentTrip.id).reverse().sortBy('timestamp');
    },
    [currentTrip?.id],
    [] as AuditLogEntry[]
  );

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (actionFilter !== 'all' && entry.actionType !== actionFilter) {
        return false;
      }

      if (actorFilter && !entry.actorName.toLowerCase().includes(actorFilter.toLowerCase())) {
        return false;
      }

      if (searchTerm) {
        const haystack = `${entry.summary} ${entry.details || ''}`.toLowerCase();
        if (!haystack.includes(searchTerm.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [actionFilter, actorFilter, entries, searchTerm]);

  const groupedEntries = useMemo(() => {
    const groups = new Map<string, AuditLogEntry[]>();

    filteredEntries.forEach((entry) => {
      const key = new Date(entry.timestamp).toDateString();
      const bucket = groups.get(key);
      if (bucket) {
        bucket.push(entry);
      } else {
        groups.set(key, [entry]);
      }
    });

    return Array.from(groups.entries());
  }, [filteredEntries]);

  const recentCount = useMemo(() => {
    const threshold = capturedNow - 24 * 60 * 60 * 1000;
    return entries.filter((entry) => new Date(entry.timestamp).getTime() >= threshold).length;
  }, [capturedNow, entries]);

  if (!currentTrip) {
    return <CaptainNoTripState description="Start or select a trip to view the audit log." />;
  }

  if (!isCaptainMode) {
    return <CaptainModeRequiredState description="Turn on Captain Mode to access the audit log." />;
  }

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Audit Log"
        subtitle={currentTrip.name}
        icon={<ShieldCheck size={16} className="text-[var(--canvas)]" />}
        iconContainerClassName="bg-[linear-gradient(135deg,var(--maroon)_0%,var(--maroon-dark)_100%)]"
        backFallback="/captain"
        rightSlot={
          <Button variant="outline" size="sm" leftIcon={<Filter size={14} />} onClick={() => setActionFilter('all')}>
            Reset
          </Button>
        }
      />

      <main className="container-editorial py-[var(--space-6)] pb-[var(--space-12)]">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--maroon-subtle)] bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(247,239,240,0.98))] shadow-[0_26px_56px_rgba(46,34,18,0.08)]">
          <div className="grid gap-[var(--space-5)] px-[var(--space-5)] py-[var(--space-5)] lg:grid-cols-[minmax(0,1.25fr)_minmax(18rem,0.95fr)]">
            <div>
              <p className="type-overline tracking-[0.18em] text-[var(--maroon)]">Captain Ledger</p>
              <h1 className="mt-[var(--space-2)] font-serif text-[clamp(2rem,7vw,3.2rem)] italic leading-[1.02] text-[var(--ink)]">
                A trip feels organized when its changes leave a readable wake.
              </h1>
              <p className="mt-[var(--space-3)] max-w-[36rem] text-sm leading-7 text-[var(--ink-secondary)]">
                The point of an audit log is not paranoia. It is clarity. When the board moves fast,
                the captain should still be able to see what changed, who touched it, and whether the
                story of the day still makes sense.
              </p>
            </div>

            <div className="grid gap-[var(--space-3)] sm:grid-cols-3 lg:grid-cols-1">
              <AuditFactCard icon={<ShieldCheck size={18} />} label="Total entries" value={entries.length} detail="Every captain-side change on the record." />
              <AuditFactCard icon={<Waves size={18} />} label="Last 24 hours" value={recentCount} detail="How busy the board has been today." />
              <AuditFactCard
                icon={<Filter size={18} />}
                label="Filtered view"
                value={filteredEntries.length}
                detail="Entries still visible after the current filters."
              />
            </div>
          </div>
        </section>

        <section className="mt-[var(--space-6)] grid gap-[var(--space-4)] xl:grid-cols-[19rem_minmax(0,1fr)]">
          <aside className="space-y-[var(--space-4)]">
            <section className="rounded-[1.8rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(245,239,232,0.99))] p-[var(--space-5)] shadow-[0_18px_38px_rgba(41,29,17,0.07)]">
              <div className="flex items-center gap-[var(--space-2)] text-[var(--ink-tertiary)]">
                <Filter size={16} />
                <span className="type-overline tracking-[0.15em]">Filters</span>
              </div>

              <div className="mt-[var(--space-4)] space-y-[var(--space-4)]">
                <AuditField label="Actor">
                  <input
                    value={actorFilter}
                    onChange={(event) => setActorFilter(event.target.value)}
                    placeholder="Search by player or captain"
                    className="w-full rounded-xl border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/82 px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--maroon)]"
                  />
                </AuditField>

                <AuditField label="Action">
                  <select
                    value={actionFilter}
                    onChange={(event) => setActionFilter(event.target.value as 'all' | AuditActionType)}
                    className="w-full rounded-xl border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/82 px-4 py-3 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--maroon)]"
                  >
                    <option value="all">All actions</option>
                    {ACTION_TYPES.map((action) => (
                      <option key={action} value={action}>
                        {ACTION_META[action].label}
                      </option>
                    ))}
                  </select>
                </AuditField>

                <AuditField label="Search">
                  <div className="relative">
                    <Search
                      size={14}
                      className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--ink-tertiary)]"
                    />
                    <input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Summary or details"
                      className="w-full rounded-xl border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/82 py-3 pl-10 pr-4 text-sm text-[var(--ink)] outline-none transition focus:border-[var(--maroon)]"
                    />
                  </div>
                </AuditField>
              </div>
            </section>

            <section className="rounded-[1.8rem] border border-[var(--maroon-subtle)] bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(247,240,241,0.99))] p-[var(--space-5)] shadow-[0_18px_38px_rgba(46,34,18,0.06)]">
              <p className="type-overline tracking-[0.15em] text-[var(--maroon)]">Reading the board</p>
              <h2 className="mt-[var(--space-2)] font-serif text-[1.75rem] italic text-[var(--ink)]">
                Look for pace, not noise.
              </h2>
              <p className="mt-[var(--space-3)] text-sm leading-7 text-[var(--ink-secondary)]">
                One edit is a correction. Five in ten minutes usually means the workflow around it needs work.
                The ledger is useful when it reveals patterns, not just incidents.
              </p>
            </section>
          </aside>

          <div className="space-y-[var(--space-4)]">
            {groupedEntries.length === 0 ? (
              <section className="rounded-[1.9rem] border border-dashed border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,238,231,0.98))] p-[var(--space-6)] text-center shadow-[0_18px_38px_rgba(41,29,17,0.05)]">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-[1rem] bg-[var(--surface-raised)] text-[var(--ink-tertiary)]">
                  <ShieldCheck size={18} />
                </div>
                <h2 className="mt-[var(--space-3)] text-lg font-semibold text-[var(--ink)]">
                  No audit entries match the current view.
                </h2>
                <p className="mt-[var(--space-2)] text-sm leading-6 text-[var(--ink-secondary)]">
                  Reset the filters or wait for the next captain-side change to come through the ledger.
                </p>
              </section>
            ) : (
              groupedEntries.map(([day, dayEntries]) => (
                <section
                  key={day}
                  className="rounded-[1.9rem] border border-[color:var(--rule)]/75 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(244,238,231,0.99))] p-[var(--space-5)] shadow-[0_18px_38px_rgba(41,29,17,0.06)]"
                >
                  <div className="flex flex-wrap items-center justify-between gap-[var(--space-3)]">
                    <div>
                      <p className="type-overline tracking-[0.15em] text-[var(--ink-tertiary)]">Ledger Day</p>
                      <h2 className="mt-[var(--space-2)] font-serif text-[1.7rem] italic text-[var(--ink)]">
                        {formatDayLabel(day)}
                      </h2>
                    </div>
                    <span className="rounded-full bg-[color:var(--surface-raised)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-secondary)]">
                      {dayEntries.length} event{dayEntries.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  <div className="mt-[var(--space-4)] space-y-[var(--space-3)]">
                    {dayEntries.map((entry) => (
                      <AuditEntryCard key={entry.id} entry={entry} />
                    ))}
                  </div>
                </section>
              ))
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

function AuditFactCard({
  icon,
  label,
  value,
  detail,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  detail: string;
}) {
  return (
    <div className="rounded-[1.55rem] border border-[color:var(--rule)]/70 bg-[color:var(--surface)]/78 p-[var(--space-4)] shadow-[0_14px_28px_rgba(41,29,17,0.05)]">
      <div className="flex items-center gap-[var(--space-2)] text-[var(--ink-tertiary)]">
        {icon}
        <span className="type-overline tracking-[0.14em]">{label}</span>
      </div>
      <p className="mt-[var(--space-2)] font-serif text-[2rem] italic leading-none text-[var(--ink)]">
        {value}
      </p>
      <p className="mt-[var(--space-2)] text-xs leading-5 text-[var(--ink-secondary)]">{detail}</p>
    </div>
  );
}

function AuditField({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-[var(--space-2)] block text-xs font-semibold uppercase tracking-[0.14em] text-[var(--ink-tertiary)]">
        {label}
      </span>
      {children}
    </label>
  );
}

function AuditEntryCard({ entry }: { entry: AuditLogEntry }) {
  const meta = ACTION_META[entry.actionType];
  const Icon = meta.icon;
  const relatedEntity =
    entry.relatedEntityType && entry.relatedEntityId
      ? `${entry.relatedEntityType} ${entry.relatedEntityId.slice(0, 8)}`
      : null;

  return (
    <article className="rounded-[1.45rem] border border-[color:var(--rule)]/75 bg-[color:var(--surface)]/82 p-[var(--space-4)] shadow-[0_14px_28px_rgba(41,29,17,0.05)]">
      <div className="flex flex-wrap items-start justify-between gap-[var(--space-3)]">
        <div>
          <div className="flex flex-wrap items-center gap-[var(--space-2)]">
            <span className={cn('inline-flex items-center gap-1 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em]', meta.accentClassName)}>
              <Icon size={12} />
              {meta.label}
            </span>
            <span className="rounded-full bg-[color:var(--surface-raised)] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--ink-secondary)]">
              {entry.actorName}
            </span>
          </div>
          <h3 className="mt-[var(--space-3)] text-base font-semibold text-[var(--ink)]">
            {entry.summary}
          </h3>
          <p className="mt-[var(--space-2)] text-sm leading-6 text-[var(--ink-secondary)]">
            {entry.details || meta.summary}
          </p>
        </div>

        <div className="text-right text-xs leading-5 text-[var(--ink-tertiary)]">
          <p>{formatTimestamp(entry.timestamp)}</p>
          {relatedEntity ? <p>{relatedEntity}</p> : null}
        </div>
      </div>
    </article>
  );
}

function formatDayLabel(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
