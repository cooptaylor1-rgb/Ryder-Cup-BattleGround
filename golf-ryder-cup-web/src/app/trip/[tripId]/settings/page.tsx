'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Download, Upload, Share2, AlertCircle, CheckCircle, Trash2, Home, MoreHorizontal } from 'lucide-react';
import { exportTripToFile, importTripFromFile, shareTripSummary } from '@/lib/services/exportImportService';
import { db } from '@/lib/db';
import { useUIStore } from '@/lib/stores';
import { BottomNav, PageHeader } from '@/components/layout';
import { EmptyStatePremium, PageLoadingSkeleton } from '@/components/ui';

export default function TripSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const tripId = params.tripId as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { showToast } = useUIStore();

  const [isVerifyingTrip, setIsVerifyingTrip] = useState(true);
  const [tripName, setTripName] = useState<string | null>(null);
  const [tripLookupError, setTripLookupError] = useState<string | null>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const loadTrip = async () => {
    try {
      setTripLookupError(null);
      const trip = await db.trips.get(tripId);
      setTripName(trip?.name ?? null);
    } catch {
      setTripLookupError("We couldn't load this trip right now.");
      setTripName(null);
    } finally {
      setIsVerifyingTrip(false);
    }
  };

  useEffect(() => {
    void loadTrip();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportTripToFile(tripId);
      showToast('success', 'Trip exported');
    } catch {
      showToast('error', 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    setImportResult(null);

    try {
      const result = await importTripFromFile(file);
      if (result.success) {
        setImportResult({
          success: true,
          message: `Imported "${result.tripName}" with ${result.stats.players} players, ${result.stats.matches} matches`,
        });
        showToast('success', 'Trip imported');
      } else {
        setImportResult({
          success: false,
          message: 'Import failed. Check file format.',
        });
        showToast('error', 'Import failed');
      }
    } catch {
      setImportResult({
        success: false,
        message: 'Could not read file',
      });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      await shareTripSummary(tripId);
      showToast('success', 'Summary copied to clipboard');
    } catch {
      showToast('error', 'Could not copy summary');
    } finally {
      setIsSharing(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      // Delete all related data
      const sessions = await db.sessions.where('tripId').equals(tripId).toArray();
      const sessionIds = sessions.map((s) => s.id);
      const matches = await db.matches.where('sessionId').anyOf(sessionIds).toArray();
      const matchIds = matches.map((m) => m.id);

      await db.transaction(
        'rw',
        [db.trips, db.teams, db.teamMembers, db.sessions, db.matches, db.holeResults],
        async () => {
          await db.holeResults.where('matchId').anyOf(matchIds).delete();
          await db.matches.where('sessionId').anyOf(sessionIds).delete();
          await db.sessions.where('tripId').equals(tripId).delete();

          const teams = await db.teams.where('tripId').equals(tripId).toArray();
          const teamIds = teams.map((t) => t.id);
          await db.teamMembers.where('teamId').anyOf(teamIds).delete();
          await db.teams.where('tripId').equals(tripId).delete();

          await db.trips.delete(tripId);
        }
      );

      showToast('success', 'Trip deleted');
      router.push('/');
    } catch {
      showToast('error', 'Could not delete trip');
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  if (isVerifyingTrip) {
    return <PageLoadingSkeleton title="Trip Settings" variant="form" />;
  }

  if (tripLookupError) {
    return (
      <main className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
        <div className="absolute inset-0 bg-linear-to-b from-masters-green/15 via-transparent to-transparent pointer-events-none" />
        <div className="relative page-container">
          <PageHeader
            title="Trip Settings"
            icon={<MoreHorizontal size={16} style={{ color: 'var(--color-accent)' }} />}
            onBack={() => router.back()}
            rightSlot={
              <button
                onClick={() => router.push('/')}
                className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
                aria-label="Go home"
              >
                <Home className="w-4 h-4" />
                Home
              </button>
            }
          />

          <div className="content-area">
            <EmptyStatePremium
              illustration="flag"
              title="Couldn’t load trip"
              description={tripLookupError}
              action={{
                label: 'Try again',
                onClick: () => {
                  setIsVerifyingTrip(true);
                  void loadTrip();
                },
              }}
              secondaryAction={{
                label: 'Go Home',
                onClick: () => router.push('/'),
              }}
              variant="large"
            />
          </div>
        </div>
        <BottomNav />
      </main>
    );
  }

  if (!tripName) {
    return (
      <main className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
        <div className="absolute inset-0 bg-linear-to-b from-masters-green/15 via-transparent to-transparent pointer-events-none" />
        <div className="relative page-container">
          <PageHeader
            title="Trip Settings"
            icon={<MoreHorizontal size={16} style={{ color: 'var(--color-accent)' }} />}
            onBack={() => router.back()}
            rightSlot={
              <button
                onClick={() => router.push('/')}
                className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
                aria-label="Go home"
              >
                <Home className="w-4 h-4" />
                Home
              </button>
            }
          />

          <div className="content-area">
            <EmptyStatePremium
              illustration="trophy"
              title="Trip not found"
              description="This trip doesn’t exist or may have been deleted."
              action={{
                label: 'Go Home',
                onClick: () => router.push('/'),
              }}
              secondaryAction={{
                label: 'More',
                onClick: () => router.push('/more'),
              }}
              variant="large"
            />
          </div>
        </div>
        <BottomNav />
      </main>
    );
  }

  return (
    <main className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
      <div className="absolute inset-0 bg-linear-to-b from-masters-green/15 via-transparent to-transparent pointer-events-none" />
      <div className="relative page-container">
        <PageHeader
          title="Trip Settings"
          subtitle={tripName ?? undefined}
          icon={<MoreHorizontal size={16} style={{ color: 'var(--color-accent)' }} />}
          onBack={() => router.push(`/trip/${tripId}`)}
          rightSlot={
            <button
              onClick={() => router.push('/')}
              className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
              aria-label="Go home"
            >
              <Home className="w-4 h-4" />
              Home
            </button>
          }
        />

        <div className="content-area space-y-6">
          {/* Backup & Export Section */}
          <section className="card-elevated overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="type-h3">Backup & Export</h2>
              <p className="text-sm text-text-secondary mt-1">Save your trip data or share with others.</p>
            </div>

            <div className="p-4 space-y-3">
              {/* Export Button */}
              <button
                onClick={handleExport}
                disabled={isExporting}
                className="w-full flex items-center gap-3 p-4 bg-surface/60 hover:bg-surface rounded-xl transition-colors disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-full bg-blue-500/15 flex items-center justify-center">
                  <Download className="w-5 h-5 text-blue-300" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-medium text-text-primary">{isExporting ? 'Exporting…' : 'Export Trip'}</div>
                  <div className="text-sm text-text-secondary">Download as JSON file for backup</div>
                </div>
              </button>

              {/* Import Button */}
              <button
                onClick={handleImportClick}
                disabled={isImporting}
                className="w-full flex items-center gap-3 p-4 bg-surface/60 hover:bg-surface rounded-xl transition-colors disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-full bg-green-500/15 flex items-center justify-center">
                  <Upload className="w-5 h-5 text-green-300" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-medium text-text-primary">{isImporting ? 'Importing…' : 'Import Trip'}</div>
                  <div className="text-sm text-text-secondary">Restore from a backup file</div>
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />

              {/* Import Result */}
              {importResult && (
                <div
                  className={`flex items-start gap-3 p-3 rounded-xl ${
                    importResult.success ? 'bg-green-500/10 text-green-200' : 'bg-red-500/10 text-red-200'
                  }`}
                >
                  {importResult.success ? (
                    <CheckCircle className="w-5 h-5 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 mt-0.5" />
                  )}
                  <div className="text-sm">{importResult.message}</div>
                </div>
              )}

              {/* Share Summary */}
              <button
                onClick={handleShare}
                disabled={isSharing}
                className="w-full flex items-center gap-3 p-4 bg-surface/60 hover:bg-surface rounded-xl transition-colors disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-full bg-gold/15 flex items-center justify-center">
                  <Share2 className="w-5 h-5 text-gold" />
                </div>
                <div className="text-left flex-1">
                  <div className="font-medium text-text-primary">{isSharing ? 'Sharing…' : 'Share Summary'}</div>
                  <div className="text-sm text-text-secondary">Copy a shareable summary to your clipboard</div>
                </div>
              </button>
            </div>
          </section>

          {/* Danger Zone */}
          <section className="card-elevated overflow-hidden">
            <div className="p-4 border-b border-border">
              <h2 className="type-h3 text-red-200">Danger Zone</h2>
              <p className="text-sm text-text-secondary mt-1">Destructive actions can’t be undone.</p>
            </div>

            <div className="p-4 space-y-3">
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full flex items-center gap-3 p-4 bg-red-500/10 hover:bg-red-500/15 rounded-xl transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center">
                    <Trash2 className="w-5 h-5 text-red-200" />
                  </div>
                  <div className="text-left flex-1">
                    <div className="font-medium text-red-200">Delete Trip</div>
                    <div className="text-sm text-red-200/70">Permanently remove this trip and all related data</div>
                  </div>
                </button>
              ) : (
                <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-200 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-semibold text-red-200">Confirm delete</div>
                      <p className="text-sm text-red-200/80 mt-1">
                        This will delete the trip, teams, players, sessions, matches, and scores from this device.
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          onClick={handleDelete}
                          disabled={isDeleting}
                          className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50"
                        >
                          {isDeleting ? 'Deleting…' : 'Yes, delete'}
                        </button>
                        <button
                          onClick={() => {
                            setShowDeleteConfirm(false);
                            setIsDeleting(false);
                          }}
                          className="px-4 py-2 rounded-xl bg-surface/60 hover:bg-surface text-text-primary text-sm font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => router.push('/more')}
                          className="ml-auto px-4 py-2 rounded-xl text-text-secondary hover:text-text-primary text-sm font-semibold inline-flex items-center gap-2"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                          More
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </div>

      <BottomNav />
    </main>
  );
}
