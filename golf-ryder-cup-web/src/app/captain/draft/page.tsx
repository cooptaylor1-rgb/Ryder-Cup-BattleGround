'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { DraftBoard } from '@/components/captain';
import {
  CaptainModeRequiredState,
  CaptainNoTripState,
} from '@/components/captain/CaptainAccessState';
import { PageHeader } from '@/components/layout';
import { EmptyStatePremium } from '@/components/ui/EmptyStatePremium';
import { useTripStore, useUIStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import { draftLogger } from '@/lib/utils/logger';
import {
  CheckCircle2,
  Shuffle,
  Users,
  UsersRound,
} from 'lucide-react';

export default function DraftPage() {
  const router = useRouter();
  const { currentTrip, players, teams, assignPlayerToTeam, teamMembers } = useTripStore(useShallow(s => ({ currentTrip: s.currentTrip, players: s.players, teams: s.teams, assignPlayerToTeam: s.assignPlayerToTeam, teamMembers: s.teamMembers })));
  const { isCaptainMode, showToast } = useUIStore(useShallow(s => ({ isCaptainMode: s.isCaptainMode, showToast: s.showToast })));

  const handleDraftComplete = useCallback(
    async (assignments: Map<string, string>) => {
      let successCount = 0;
      let failedCount = 0;

      try {
        for (const [playerId, teamId] of assignments.entries()) {
          const existingMembership = teamMembers.find((membership) => membership.playerId === playerId);
          if (!existingMembership) {
            try {
              await assignPlayerToTeam(playerId, teamId);
              successCount += 1;
            } catch (error) {
              draftLogger.error(`Failed to assign player ${playerId} to team ${teamId}:`, error);
              failedCount += 1;
            }
          }
        }

        if (failedCount > 0) {
          showToast(
            'warning',
            `Draft partially complete: ${successCount} assigned, ${failedCount} failed. Please retry.`
          );
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
    },
    [assignPlayerToTeam, teamMembers, showToast, router]
  );

  if (!currentTrip) {
    return <CaptainNoTripState description="Start or select a trip to run the team draft." />;
  }

  if (!isCaptainMode) {
    return <CaptainModeRequiredState description="Turn on Captain Mode to access the draft room." />;
  }

  const unassignedPlayers = players.filter(
    (player) => !teamMembers.some((membership) => membership.playerId === player.id)
  );
  const assignedPlayers = players.length - unassignedPlayers.length;

  return (
    <div className="min-h-screen page-premium-enter texture-grain bg-[var(--canvas)]">
      <PageHeader
        title="Team Draft"
        subtitle={currentTrip.name}
        onBack={() => router.back()}
        icon={<Shuffle size={16} className="text-[var(--color-accent)]" />}
      />

      <main className="container-editorial py-[var(--space-6)] pb-[var(--space-12)]">
        <section className="overflow-hidden rounded-[2rem] border border-[var(--rule)] bg-[linear-gradient(180deg,rgba(255,255,255,0.84),rgba(248,244,237,0.96))] shadow-[0_22px_48px_rgba(46,34,18,0.08)]">
          <div className="border-b border-[color:var(--rule)]/80 px-[var(--space-5)] py-[var(--space-5)]">
            <p className="type-overline tracking-[0.18em] text-[var(--ink-tertiary)]">
              Captain&apos;s Room
            </p>
            <h1 className="mt-[var(--space-2)] font-serif text-[clamp(2rem,7vw,3rem)] italic leading-[1.02] text-[var(--ink)]">
              Set the sides.
            </h1>
            <p className="mt-[var(--space-3)] type-body-sm text-[var(--ink-secondary)]">
              The best draft screens feel like a proper war room. Clean rosters, clear stakes,
              and no confusion about who is still on the board.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-[var(--space-3)] px-[var(--space-5)] py-[var(--space-5)] md:grid-cols-4">
            <DraftSummaryCard label="Unassigned" value={unassignedPlayers.length} />
            <DraftSummaryCard label="Assigned" value={assignedPlayers} />
            <DraftSummaryCard label="Teams Ready" value={teams.length} />
            <DraftSummaryCard
              label="Status"
              value={unassignedPlayers.length > 0 ? 'Ready' : 'Complete'}
              valueClassName="font-sans text-[1rem] not-italic"
            />
          </div>
        </section>

        <section className="pt-[var(--space-6)]">
          {unassignedPlayers.length === 0 ? (
            <EmptyStatePremium
              illustration="golfers"
              title="All players assigned"
              description={`All ${players.length} player${players.length === 1 ? '' : 's'} are already on a team.`}
              action={{
                label: 'Back to Captain',
                onClick: () => router.push('/captain'),
                icon: <CheckCircle2 size={16} />,
              }}
              secondaryAction={{
                label: 'Manage Players',
                onClick: () => router.push('/players'),
              }}
              variant="large"
            />
          ) : players.length < 2 ? (
            <EmptyStatePremium
              illustration="golfers"
              title="Add a few more players"
              description="You need at least two players before the draft means anything."
              action={{
                label: 'Manage Players',
                onClick: () => router.push('/players'),
                icon: <Users size={16} />,
              }}
              secondaryAction={{
                label: 'Back to Captain',
                onClick: () => router.push('/captain'),
              }}
              variant="large"
            />
          ) : teams.length < 2 ? (
            <EmptyStatePremium
              illustration="trophy"
              title="Teams aren’t set up yet"
              description="Create both teams first, then come back to sort players onto each side."
              action={{
                label: 'Manage Players',
                onClick: () => router.push('/players'),
                icon: <UsersRound size={16} />,
              }}
              secondaryAction={{
                label: 'Back to Captain',
                onClick: () => router.push('/captain'),
              }}
              variant="large"
            />
          ) : (
            <DraftBoard players={unassignedPlayers} teams={teams} onDraftComplete={handleDraftComplete} />
          )}
        </section>
      </main>
    </div>
  );
}

function DraftSummaryCard({
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
        className={`mt-[var(--space-2)] font-serif text-[1.7rem] italic leading-none text-[var(--ink)] ${valueClassName || ''}`}
      >
        {value}
      </p>
    </div>
  );
}
