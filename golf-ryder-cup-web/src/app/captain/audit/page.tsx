'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { useTripStore, useUIStore } from '@/lib/stores';
import type { AuditActionType, AuditLogEntry } from '@/lib/types/models';
import { EmptyStatePremium } from '@/components/ui/EmptyStatePremium';
import { BottomNav } from '@/components/layout';
import { ChevronLeft, ShieldCheck, Filter, Search, Home, MoreHorizontal } from 'lucide-react';

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

export default function CaptainAuditLogPage() {
  const router = useRouter();
  const { currentTrip } = useTripStore();
  const { isCaptainMode } = useUIStore();
  const [actorFilter, setActorFilter] = useState('');
  const [actionFilter, setActionFilter] = useState<'all' | AuditActionType>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Note: avoid auto-redirects so we can render explicit empty states.

  const entries = useLiveQuery(
    async (): Promise<AuditLogEntry[]> => {
      if (!currentTrip) return [];
      const base = await db.auditLog
        .where('tripId')
        .equals(currentTrip.id)
        .reverse()
        .sortBy('timestamp');
      return base;
    },
    [currentTrip?.id],
    [] as AuditLogEntry[]
  );

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (actionFilter !== 'all' && entry.actionType !== actionFilter) return false;
      if (actorFilter && !entry.actorName.toLowerCase().includes(actorFilter.toLowerCase())) {
        return false;
      }
      if (searchTerm) {
        const haystack = `${entry.summary} ${entry.details || ''}`.toLowerCase();
        if (!haystack.includes(searchTerm.toLowerCase())) return false;
      }
      return true;
    });
  }, [entries, actionFilter, actorFilter, searchTerm]);

  if (!currentTrip) {
    return (
      <div
        className="min-h-screen pb-nav page-premium-enter texture-grain"
        style={{ background: 'var(--canvas)' }}
      >
        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="golf-ball"
            title="No active trip"
            description="Start or select a trip to view the audit log."
            action={{
              label: 'Go Home',
              onClick: () => router.push('/'),
              icon: <Home size={16} />,
            }}
            variant="large"
          />
        </main>
        <BottomNav />
      </div>
    );
  }

  if (!isCaptainMode) {
    return (
      <div
        className="min-h-screen pb-nav page-premium-enter texture-grain"
        style={{ background: 'var(--canvas)' }}
      >
        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="trophy"
            title="Captain mode required"
            description="Turn on Captain Mode to access the audit log."
            action={{
              label: 'Open More',
              onClick: () => router.push('/more'),
              icon: <MoreHorizontal size={16} />,
            }}
            secondaryAction={{
              label: 'Go Home',
              onClick: () => router.push('/'),
            }}
            variant="large"
          />
        </main>
        <BottomNav />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen pb-nav page-premium-enter texture-grain"
      style={{ background: 'var(--canvas)' }}
    >
      <header className="header-premium">
        <div className="container-editorial flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 -ml-2 press-scale"
            style={{ color: 'var(--ink-secondary)' }}
          >
            <ChevronLeft size={22} />
          </button>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--masters)' }}
            >
              <ShieldCheck size={18} style={{ color: 'white' }} />
            </div>
            <div>
              <p className="type-overline">Captain Audit Log</p>
              <p className="type-caption" style={{ color: 'var(--ink-tertiary)' }}>
                Monitor critical scoring and lineup changes
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container-editorial section">
        <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
          <div className="flex flex-col gap-3">
            <div
              className="flex items-center gap-2 text-sm"
              style={{ color: 'var(--ink-secondary)' }}
            >
              <Filter size={16} />
              Filters
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
                  Actor
                </label>
                <input
                  value={actorFilter}
                  onChange={(event) => setActorFilter(event.target.value)}
                  placeholder="Search by name"
                  className="w-full mt-1 px-3 py-2 rounded-lg border"
                  style={{
                    borderColor: 'var(--rule)',
                    background: 'var(--surface-card)',
                    color: 'var(--ink)',
                  }}
                />
              </div>
              <div>
                <label className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
                  Action
                </label>
                <select
                  value={actionFilter}
                  onChange={(event) =>
                    setActionFilter(event.target.value as 'all' | AuditActionType)
                  }
                  className="w-full mt-1 px-3 py-2 rounded-lg border"
                  style={{
                    borderColor: 'var(--rule)',
                    background: 'var(--surface-card)',
                    color: 'var(--ink)',
                  }}
                >
                  <option value="all">All actions</option>
                  {ACTION_TYPES.map((action) => (
                    <option key={action} value={action}>
                      {action}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
                  Search
                </label>
                <div className="relative mt-1">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2"
                    style={{ color: 'var(--ink-tertiary)' }}
                  />
                  <input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Summary or details"
                    className="w-full pl-9 pr-3 py-2 rounded-lg border"
                    style={{
                      borderColor: 'var(--rule)',
                      background: 'var(--surface-card)',
                      color: 'var(--ink)',
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {filteredEntries.length === 0 ? (
            <div className="card" style={{ padding: 'var(--space-5)', textAlign: 'center' }}>
              <p className="type-body" style={{ color: 'var(--ink-secondary)' }}>
                No audit entries match these filters yet.
              </p>
            </div>
          ) : (
            filteredEntries.map((entry) => (
              <div key={entry.id} className="card" style={{ padding: 'var(--space-4)' }}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                      {entry.summary}
                    </p>
                    <p className="text-xs mt-1" style={{ color: 'var(--ink-tertiary)' }}>
                      {entry.actionType} • {entry.actorName}
                    </p>
                    {entry.details && (
                      <p className="text-xs mt-2" style={{ color: 'var(--ink-secondary)' }}>
                        {entry.details}
                      </p>
                    )}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--ink-tertiary)' }}>
                    {new Date(entry.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
