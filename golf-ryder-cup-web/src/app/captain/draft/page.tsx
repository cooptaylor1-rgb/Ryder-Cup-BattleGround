'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DraftBoard } from '@/components/captain';
import { BottomNav, PageHeader } from '@/components/layout';
import { EmptyStatePremium } from '@/components/ui/EmptyStatePremium';
import { useTripStore, useUIStore } from '@/lib/stores';
import { draftLogger } from '@/lib/utils/logger';
import { Home, MoreHorizontal, Shuffle } from 'lucide-react';

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
          icon={<Shuffle size={16} style={{ color: 'var(--canvas)' }} />}
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
          icon={<Shuffle size={16} style={{ color: 'var(--canvas)' }} />}
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
        icon={<Shuffle size={16} style={{ color: 'var(--canvas)' }} />}
      />

      <main className="container-editorial">
        <section className="section">
          {unassignedPlayers.length === 0 ? (
            <div className="py-12">
              <EmptyStatePremium
                illustration="golfers"
                title="All players assigned"
                description={`All ${players.length} player${players.length === 1 ? '' : 's'} have already been assigned to teams.`}
                action={{
                  label: 'Back to Captain',
                  onClick: () => router.push('/captain'),
                }}
                variant="large"
              />
            </div>
          ) : players.length < 2 ? (
            <div className="py-12">
              <EmptyStatePremium
                illustration="golfers"
                title="Add a few more players"
                description="You need at least 2 players to run a draft."
                action={{
                  label: 'Manage Players',
                  onClick: () => router.push('/players'),
                }}
                secondaryAction={{
                  label: 'Back to Captain',
                  onClick: () => router.push('/captain'),
                }}
                variant="large"
              />
            </div>
          ) : teams.length < 2 ? (
            <div className="py-12">
              <EmptyStatePremium
                illustration="trophy"
                title="Teams aren’t set up yet"
                description="Create or configure both teams before drafting players."
                action={{
                  label: 'Back to Captain',
                  onClick: () => router.push('/captain'),
                }}
                variant="large"
              />
            </div>
          ) : (
            <div className="card p-[var(--space-5)]">
              <DraftBoard players={unassignedPlayers} teams={teams} onDraftComplete={handleDraftComplete} />
            </div>
          )}
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
