'use client';

/**
 * Diagnostics Page
 *
 * Read-only snapshot of device + app state for live-event triage.
 *
 * When a user reports a problem during the tournament, ask them to
 * screenshot this page. It tells you everything you need without a
 * back-and-forth interrogation: app version, sync queue depth, last
 * sync timestamp, IndexedDB row counts per table, online state,
 * captain mode status, browser/device info.
 *
 * Intentionally simple — no fancy components, no inline editors.
 * Just a flat list of facts that's easy to read at arm's length.
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Activity, Copy, RefreshCw } from 'lucide-react';
import { db, exportAllData, getStorageEstimate } from '@/lib/db';
import { exportTripToFile } from '@/lib/services/exportImportService';
import {
  getSyncQueueStatus,
  getTripSyncStatus,
} from '@/lib/services/tripSyncService';
import { useAccessStore } from '@/lib/stores/accessStore';
import { useTripStore } from '@/lib/stores/tripStore';
import { useShallow } from 'zustand/shallow';
import { useToastStore } from '@/lib/stores/toastStore';
import { PageHeader } from '@/components/layout/PageHeader';

interface RowCount {
  table: string;
  count: number;
}

interface StorageEstimate {
  usage: number;
  quota: number;
  usagePercent: number;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`;
}

function formatTimestamp(ms: number | null | undefined): string {
  if (!ms) return 'never';
  const date = new Date(ms);
  const ageMs = Date.now() - ms;
  const ageSec = Math.floor(ageMs / 1000);
  if (ageSec < 60) return `${ageSec}s ago (${date.toLocaleTimeString()})`;
  const ageMin = Math.floor(ageSec / 60);
  if (ageMin < 60) return `${ageMin}m ago (${date.toLocaleTimeString()})`;
  const ageHr = Math.floor(ageMin / 60);
  if (ageHr < 24) return `${ageHr}h ago (${date.toLocaleTimeString()})`;
  return date.toLocaleString();
}

function DiagnosticsRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-[var(--rule)] py-3">
      <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--ink-secondary)]">
        {label}
      </span>
      <span className="text-right font-mono text-sm text-[var(--ink)] break-all">{value}</span>
    </div>
  );
}

export default function DiagnosticsPageClient() {
  const currentTrip = useTripStore(useShallow((s) => s.currentTrip));
  const { isCaptainMode, isAdminMode, captainAttempts } = useAccessStore(
    useShallow((s) => ({
      isCaptainMode: s.isCaptainMode,
      isAdminMode: s.isAdminMode,
      captainAttempts: s.captainAttempts,
    })),
  );
  const showToast = useToastStore((s) => s.showToast);

  const [rowCounts, setRowCounts] = useState<RowCount[]>([]);
  const [storage, setStorage] = useState<StorageEstimate | null>(null);
  const [queue, setQueue] = useState({ pending: 0, failed: 0 });
  const [tripSyncStatus, setTripSyncStatus] = useState<string>('unknown');
  const [isOnline, setIsOnline] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);
  const [now, setNow] = useState(Date.now());

  // Refresh every time the user taps Refresh, plus a clock tick for "X ago" labels.
  useEffect(() => {
    setNow(Date.now());
    setIsOnline(typeof navigator !== 'undefined' ? navigator.onLine : true);

    let cancelled = false;
    const load = async () => {
      const counts: RowCount[] = [];
      for (const table of db.tables) {
        try {
          const count = await table.count();
          if (count > 0) counts.push({ table: table.name, count });
        } catch {
          // best effort
        }
      }
      counts.sort((a, b) => b.count - a.count);

      const est = await getStorageEstimate();
      const queueInfo = getSyncQueueStatus();
      const syncStatus = currentTrip ? getTripSyncStatus(currentTrip.id) : 'unknown';

      if (!cancelled) {
        setRowCounts(counts);
        setStorage(est);
        setQueue(queueInfo);
        setTripSyncStatus(syncStatus);
      }
    };
    void load();

    return () => {
      cancelled = true;
    };
  }, [currentTrip, refreshKey]);

  // Update online state in real time
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    if (typeof window === 'undefined') return;
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const totalRows = rowCounts.reduce((sum, r) => sum + r.count, 0);
  const release = process.env.NEXT_PUBLIC_SENTRY_RELEASE ?? 'unknown';
  const env = process.env.NEXT_PUBLIC_SENTRY_ENV ?? process.env.NODE_ENV ?? 'unknown';
  const version = '0.1.0';

  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
  const viewport =
    typeof window !== 'undefined' ? `${window.innerWidth}×${window.innerHeight}` : 'unknown';

  const handleCopySnapshot = async () => {
    const snapshot = {
      capturedAt: new Date().toISOString(),
      app: { version, release, environment: env },
      device: { userAgent, viewport, online: isOnline },
      currentTrip: currentTrip
        ? {
            id: currentTrip.id,
            name: currentTrip.name,
          }
        : null,
      access: {
        isCaptainMode,
        isAdminMode,
        captainFailedAttempts: captainAttempts.failedAttempts,
        captainLockedUntil: captainAttempts.lockedUntil,
      },
      sync: {
        tripSyncStatus,
        queuePending: queue.pending,
        queueFailed: queue.failed,
      },
      storage: storage,
      rowCounts,
    };
    try {
      await navigator.clipboard.writeText(JSON.stringify(snapshot, null, 2));
      showToast('success', 'Diagnostics snapshot copied to clipboard');
    } catch {
      showToast('error', 'Could not copy to clipboard');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--canvas)] page-premium-enter">
      <PageHeader
        title="Diagnostics"
        subtitle="Snapshot for live triage"
        icon={<Activity size={16} className="text-[var(--canvas)]" />}
        rightSlot={
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              aria-label="Refresh diagnostics"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--ink-secondary)] press-scale"
            >
              <RefreshCw size={18} />
            </button>
            <button
              type="button"
              onClick={handleCopySnapshot}
              aria-label="Copy diagnostics snapshot"
              className="inline-flex h-11 w-11 items-center justify-center rounded-full text-[var(--ink-secondary)] press-scale"
            >
              <Copy size={18} />
            </button>
          </div>
        }
      />

      <main className="container-editorial pb-24 pt-[var(--space-6)] space-y-[var(--space-6)]">
        <p className="text-sm text-[var(--ink-secondary)]">
          When something looks wrong during the event, screenshot this page or tap the copy
          icon and paste it into the support chat. It captures everything an on-call helper
          needs without back-and-forth.
        </p>

        <section className="card-editorial p-[var(--space-5)]">
          <h2 className="type-overline text-[var(--masters)] mb-[var(--space-3)]">App</h2>
          <DiagnosticsRow label="Version" value={version} />
          <DiagnosticsRow
            label="Release SHA"
            value={release.length > 12 ? release.slice(0, 12) : release}
          />
          <DiagnosticsRow label="Environment" value={env} />
          <DiagnosticsRow label="Captured at" value={new Date(now).toLocaleString()} />
        </section>

        <section className="card-editorial p-[var(--space-5)]">
          <h2 className="type-overline text-[var(--masters)] mb-[var(--space-3)]">Device</h2>
          <DiagnosticsRow
            label="Network"
            value={
              <span
                className={
                  isOnline ? 'text-[var(--success)]' : 'text-[var(--warning)]'
                }
              >
                {isOnline ? 'online' : 'offline'}
              </span>
            }
          />
          <DiagnosticsRow label="Viewport" value={viewport} />
          <DiagnosticsRow
            label="User agent"
            value={<span className="text-xs">{userAgent}</span>}
          />
        </section>

        <section className="card-editorial p-[var(--space-5)]">
          <h2 className="type-overline text-[var(--masters)] mb-[var(--space-3)]">
            Sync queue
          </h2>
          <DiagnosticsRow label="Trip status" value={tripSyncStatus} />
          <DiagnosticsRow
            label="Pending"
            value={
              <span
                className={
                  queue.pending > 0 ? 'text-[var(--info)]' : 'text-[var(--ink-tertiary)]'
                }
              >
                {queue.pending}
              </span>
            }
          />
          <DiagnosticsRow
            label="Failed"
            value={
              <span
                className={
                  queue.failed > 0 ? 'text-[var(--error)]' : 'text-[var(--ink-tertiary)]'
                }
              >
                {queue.failed}
              </span>
            }
          />
        </section>

        <section className="card-editorial p-[var(--space-5)]">
          <h2 className="type-overline text-[var(--masters)] mb-[var(--space-3)]">
            Captain & admin
          </h2>
          <DiagnosticsRow
            label="Captain mode"
            value={isCaptainMode ? 'enabled' : 'disabled'}
          />
          <DiagnosticsRow
            label="Admin mode"
            value={isAdminMode ? 'enabled' : 'disabled'}
          />
          <DiagnosticsRow
            label="Captain failed attempts"
            value={captainAttempts.failedAttempts}
          />
          <DiagnosticsRow
            label="Captain locked until"
            value={
              captainAttempts.lockedUntil && captainAttempts.lockedUntil > Date.now()
                ? formatTimestamp(captainAttempts.lockedUntil)
                : 'not locked'
            }
          />
        </section>

        <section className="card-editorial p-[var(--space-5)]">
          <h2 className="type-overline text-[var(--masters)] mb-[var(--space-3)]">
            Current trip
          </h2>
          {currentTrip ? (
            <>
              <DiagnosticsRow label="Name" value={currentTrip.name} />
              <DiagnosticsRow label="ID" value={<span className="text-xs">{currentTrip.id}</span>} />
              <DiagnosticsRow
                label="Created"
                value={new Date(currentTrip.createdAt).toLocaleString()}
              />
            </>
          ) : (
            <p className="text-sm text-[var(--ink-tertiary)]">No active trip selected.</p>
          )}
        </section>

        <section className="card-editorial p-[var(--space-5)]">
          <h2 className="type-overline text-[var(--masters)] mb-[var(--space-3)]">
            IndexedDB ({totalRows.toLocaleString()} rows)
          </h2>
          {storage && (
            <DiagnosticsRow
              label="Storage used"
              value={
                <>
                  {formatBytes(storage.usage)}
                  {storage.quota > 0 && (
                    <span className="text-[var(--ink-tertiary)]">
                      {' '}
                      / {formatBytes(storage.quota)} ({storage.usagePercent.toFixed(1)}%)
                    </span>
                  )}
                </>
              }
            />
          )}
          {rowCounts.length === 0 ? (
            <p className="text-sm text-[var(--ink-tertiary)] mt-[var(--space-3)]">
              Database is empty.
            </p>
          ) : (
            rowCounts.map((row) => (
              <DiagnosticsRow key={row.table} label={row.table} value={row.count.toLocaleString()} />
            ))
          )}
        </section>

        <section className="card-editorial p-[var(--space-5)]">
          <h2 className="type-overline text-[var(--masters)] mb-[var(--space-3)]">
            Local backup
          </h2>
          <p className="text-sm text-[var(--ink-secondary)] mb-[var(--space-3)]">
            Pure client-side backups. They work offline on the course and never touch
            the network. Take one before the event as a known-good baseline, and at any
            point during the event if anything looks weird.
          </p>
          <div className="flex flex-wrap gap-3">
            {currentTrip && (
              <DownloadTripBackupButton
                tripId={currentTrip.id}
                tripName={currentTrip.name}
              />
            )}
            <DownloadAllDataButton />
          </div>
        </section>

        <p className="text-xs text-[var(--ink-tertiary)] text-center">
          <Link href="/" className="underline">
            Back to home
          </Link>
        </p>
      </main>
    </div>
  );
}

/**
 * Triggers a JSON download of every IndexedDB table on the device.
 * Pure client-side; no network round-trip required so it works offline
 * on the course.
 */
function DownloadAllDataButton() {
  const showToast = useToastStore((s) => s.showToast);
  const [busy, setBusy] = useState(false);

  const handleDownload = async () => {
    setBusy(true);
    try {
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      link.href = url;
      link.download = `ryder-cup-backup-${stamp}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showToast('success', 'Backup downloaded');
    } catch (err) {
      showToast(
        'error',
        err instanceof Error ? err.message : 'Backup failed',
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={busy}
      className="inline-flex h-11 items-center gap-2 rounded-full border border-[var(--rule)] bg-[var(--surface)] px-5 text-sm font-semibold text-[var(--ink)] disabled:opacity-50"
    >
      {busy ? 'Exporting…' : 'Download full DB (all trips)'}
    </button>
  );
}

/**
 * Per-trip JSON download — preferred when handing off a single trip
 * to a backup co-organizer or preserving a snapshot mid-event.
 *
 * Uses the existing exportTripToFile service which produces a
 * structured TripExport with matching importTripFromFile for round-
 * trip restore.
 */
function DownloadTripBackupButton({
  tripId,
  tripName,
}: {
  tripId: string;
  tripName: string;
}) {
  const showToast = useToastStore((s) => s.showToast);
  const [busy, setBusy] = useState(false);

  const handleDownload = async () => {
    setBusy(true);
    try {
      await exportTripToFile(tripId);
      showToast('success', `${tripName} backup downloaded`);
    } catch (err) {
      showToast('error', err instanceof Error ? err.message : 'Backup failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={busy}
      className="inline-flex h-11 items-center gap-2 rounded-full bg-[var(--masters)] px-5 text-sm font-semibold text-[var(--canvas)] disabled:opacity-50"
      aria-label={`Download backup for ${tripName}`}
    >
      {busy ? 'Exporting…' : `Download ${tripName} backup`}
    </button>
  );
}
