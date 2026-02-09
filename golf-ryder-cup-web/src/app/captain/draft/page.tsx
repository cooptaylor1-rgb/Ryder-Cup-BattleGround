'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { DraftBoard } from '@/components/captain';
import { BottomNav, PageHeader } from '@/components/layout';
import { EmptyStatePremium } from '@/components/ui/EmptyStatePremium';
import { useTripStore, useUIStore } from '@/lib/stores';
import { draftLogger } from '@/lib/utils/logger';
import { Home, MoreHorizontal, Shield, Shuffle, Users } from 'lucide-react';

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

  // Note: avoid auto-redirects so we can render explicit empty states.

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

  if (!currentTrip) {
    return (
      <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
        <PageHeader
          title="Team Draft"
          subtitle="No active trip"
          onBack={() => router.back()}
          icon={<Shuffle size={16} style={{ color: 'white' }} />}
        />

        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="golf-ball"
            title="No active trip"
            description="Start or select a trip to run the team draft."
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
      <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
        <PageHeader
          title="Team Draft"
          subtitle="Captain mode required"
          onBack={() => router.back()}
          icon={<Shuffle size={16} style={{ color: 'white' }} />}
        />

        <main className="container-editorial py-12">
          <EmptyStatePremium
            illustration="trophy"
            title="Captain mode required"
            description="Turn on Captain Mode to access Draft."
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

  // Filter out players already assigned to teams
  const unassignedPlayers = players.filter(p =>
    !teamMembers.some(tm => tm.playerId === p.id)
  );

  return (
    <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Team Draft"
        subtitle="Assign players to teams"
        onBack={() => router.back()}
        icon={<Shuffle size={16} style={{ color: 'white' }} />}
      />

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

      <BottomNav />
    </div>
  );
}
