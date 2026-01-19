'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTripStore, useUIStore } from '@/lib/stores';
import { draftLogger } from '@/lib/utils/logger';
import { DraftBoard } from '@/components/captain';
import {
  ChevronLeft,
  Shield,
  Shuffle,
  Users,
  Home,
  Target,
  Trophy,
  MoreHorizontal,
  CalendarDays,
} from 'lucide-react';

/**
 * TEAM DRAFT PAGE
 *
 * Assign players to teams using various draft methods:
 * - Snake Draft: Take turns picking players
 * - Auction Draft: Bid on players with limited budget
 * - Random: Randomly assign players
 * - Auto-Balance: Balance teams by handicap
 */

export default function DraftPage() {
  const router = useRouter();
  const { currentTrip, players, teams, assignPlayerToTeam, teamMembers } = useTripStore();
  const { isCaptainMode, showToast } = useUIStore();

  useEffect(() => {
    if (!currentTrip) {
      router.push('/');
      return;
    }
    if (!isCaptainMode) {
      router.push('/more');
    }
  }, [currentTrip, isCaptainMode, router]);

  const handleDraftComplete = useCallback(async (assignments: Map<string, string>) => {
    // Apply the draft results to the trip store
    let successCount = 0;
    let failedCount = 0;

    try {
      for (const [playerId, teamId] of assignments.entries()) {
        // Check if player is already assigned
        const existingMembership = teamMembers.find(tm => tm.playerId === playerId);
        if (!existingMembership) {
          try {
            await assignPlayerToTeam(playerId, teamId);
            successCount++;
          } catch (error) {
            draftLogger.error(`Failed to assign player ${playerId} to team ${teamId}:`, error);
            failedCount++;
          }
        }
      }

      if (failedCount > 0) {
        showToast('warning', `Draft partially complete: ${successCount} assigned, ${failedCount} failed. Please retry.`);
      } else if (successCount > 0) {
        showToast('success', `Draft complete! ${successCount} players assigned to teams.`);
        router.push('/captain');
      } else {
        showToast('info', 'All players were already assigned.');
        router.push('/captain');
      }
    } catch (error) {
      draftLogger.error('Draft failed:', error);
      showToast('error', 'Draft failed. Please try again.');
    }
  }, [assignPlayerToTeam, teamMembers, showToast, router]);

  if (!currentTrip || !isCaptainMode) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--canvas)' }}>
        <div className="animate-pulse text-center">
          <div className="w-12 h-12 rounded-full mx-auto mb-4" style={{ background: 'var(--surface-elevated)' }} />
          <div className="h-4 w-24 mx-auto rounded" style={{ background: 'var(--surface-elevated)' }} />
        </div>
      </div>
    );
  }

  // Filter out players already assigned to teams
  const unassignedPlayers = players.filter(p =>
    !teamMembers.some(tm => tm.playerId === p.id)
  );

  return (
    <div className="min-h-screen pb-nav page-premium-enter texture-grain" style={{ background: 'var(--canvas)' }}>
      {/* Premium Header */}
      <header className="header-premium">
        <div className="container-editorial flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 -ml-2 press-scale"
              style={{ color: 'var(--ink-secondary)', background: 'transparent', border: 'none', cursor: 'pointer' }}
              aria-label="Back"
            >
              <ChevronLeft size={22} strokeWidth={1.75} />
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 0 16px rgba(139, 92, 246, 0.3)',
                }}
              >
                <Shuffle size={16} style={{ color: 'white' }} />
              </div>
              <div>
                <span className="type-overline" style={{ letterSpacing: '0.1em' }}>Team Draft</span>
                <p className="type-caption truncate" style={{ marginTop: '2px' }}>
                  Assign players to teams
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container-editorial">
        <section className="section">
          {unassignedPlayers.length === 0 ? (
            <div className="card text-center" style={{ padding: 'var(--space-8)' }}>
              <Users size={48} style={{ color: 'var(--ink-tertiary)', margin: '0 auto var(--space-4)' }} />
              <h2 className="type-title-sm" style={{ marginBottom: 'var(--space-2)' }}>
                All Players Assigned
              </h2>
              <p className="type-caption" style={{ marginBottom: 'var(--space-4)' }}>
                All {players.length} players have been assigned to teams.
              </p>
              <Link href="/captain" className="btn btn-primary">
                Back to Captain
              </Link>
            </div>
          ) : players.length < 2 ? (
            <div className="card text-center" style={{ padding: 'var(--space-8)' }}>
              <Users size={48} style={{ color: 'var(--ink-tertiary)', margin: '0 auto var(--space-4)' }} />
              <h2 className="type-title-sm" style={{ marginBottom: 'var(--space-2)' }}>
                Need More Players
              </h2>
              <p className="type-caption" style={{ marginBottom: 'var(--space-4)' }}>
                Add at least 2 players to start the draft.
              </p>
              <Link href="/players" className="btn btn-primary">
                Add Players
              </Link>
            </div>
          ) : teams.length < 2 ? (
            <div className="card text-center" style={{ padding: 'var(--space-8)' }}>
              <Shield size={48} style={{ color: 'var(--ink-tertiary)', margin: '0 auto var(--space-4)' }} />
              <h2 className="type-title-sm" style={{ marginBottom: 'var(--space-2)' }}>
                Teams Not Set Up
              </h2>
              <p className="type-caption" style={{ marginBottom: 'var(--space-4)' }}>
                Teams need to be configured before drafting.
              </p>
              <Link href="/captain" className="btn btn-primary">
                Back to Captain
              </Link>
            </div>
          ) : (
            <div className="card" style={{ padding: 'var(--space-5)' }}>
              <DraftBoard
                players={unassignedPlayers}
                teams={teams}
                onDraftComplete={handleDraftComplete}
              />
            </div>
          )}
        </section>
      </main>

      {/* Bottom Navigation */}
      <nav className="nav-premium bottom-nav">
        <Link href="/" className="nav-item">
          <Home size={22} strokeWidth={1.75} />
          <span>Home</span>
        </Link>
        <Link href="/schedule" className="nav-item">
          <CalendarDays size={22} strokeWidth={1.75} />
          <span>Schedule</span>
        </Link>
        <Link href="/score" className="nav-item">
          <Target size={22} strokeWidth={1.75} />
          <span>Score</span>
        </Link>
        <Link href="/matchups" className="nav-item">
          <Users size={22} strokeWidth={1.75} />
          <span>Matches</span>
        </Link>
        <Link href="/standings" className="nav-item">
          <Trophy size={22} strokeWidth={1.75} />
          <span>Standings</span>
        </Link>
        <Link href="/more" className="nav-item">
          <MoreHorizontal size={22} strokeWidth={1.75} />
          <span>More</span>
        </Link>
      </nav>
    </div>
  );
}
