'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, ChevronUp, Share2, Shield } from 'lucide-react';
import { HomeSectionHeader, SetupStep } from './HomeSharedComponents';
import type { Match, Player, RyderCupSession, Team, TeamMember } from '@/lib/types/models';

interface CaptainSetupGuideProps {
  players: Player[];
  teams: Team[];
  teamMembers: TeamMember[];
  sessions: RyderCupSession[];
  tripMatches: Match[];
  onInviteFriends: () => void;
}

/**
 * Captain Setup Guide
 *
 * Displayed on the home page until the trip is cup-ready. The checklist
 * covers five steps; once three or more are complete the guide collapses
 * to a one-line summary showing just the next action, so captains late in
 * setup see the action to take, not a wall of checkmarks they've already
 * scanned. Any regression (e.g. the captain deletes a course) brings the
 * relevant step back to 'todo'.
 *
 * Extracted from HomePage so the expand/collapse state has a clean home
 * and the page itself stays readable.
 */
export function CaptainSetupGuide({
  players,
  teams,
  teamMembers,
  sessions,
  tripMatches,
  onInviteFriends,
}: CaptainSetupGuideProps) {
  const hasPlayers = players.length >= 4;
  const hasTeams = teams.length >= 2 && teamMembers.length >= 4;
  const hasSessions = sessions.length > 0;
  const hasMatches = tripMatches.length > 0;
  const hasCourses = tripMatches.length > 0 && tripMatches.every((m) => Boolean(m.courseId));

  const steps = [hasPlayers, hasTeams, hasSessions, hasMatches, hasCourses];
  const done = steps.filter(Boolean).length;
  const allDone = done === steps.length;
  const pct = Math.round((done / steps.length) * 100);

  // Default to collapsed so Home doesn't duplicate the Captain Blocker
  // dashboard card, which already surfaces the single most-urgent next
  // action. The full 5-step list stays one tap away via the toggle and
  // at /captain/checklist.
  const [expanded, setExpanded] = useState(false);

  if (allDone) return null;

  const orderedSteps = [
    { label: 'Add Players', done: hasPlayers, href: '/players' as const },
    { label: 'Assign Teams', done: hasTeams, href: '/players?panel=draft' as const },
    { label: 'Create First Session', done: hasSessions, href: '/lineup/new?mode=session' as const },
    { label: 'Publish a Lineup', done: hasMatches, href: '/lineup/new' as const },
    { label: 'Assign Courses', done: hasCourses, href: '/captain/manage' as const },
  ];
  const nextStep = orderedSteps.find((step) => !step.done);

  return (
    <section className="rounded-[1.5rem] border border-[color:var(--maroon-subtle)] bg-[linear-gradient(180deg,var(--surface-raised)_0%,var(--surface-secondary)_100%)] px-[var(--space-5)] py-[var(--space-5)] shadow-[0_12px_30px_rgba(91,35,51,0.08)]">
      <HomeSectionHeader
        eyebrow={
          <span className="inline-flex items-center gap-[var(--space-1)] text-[var(--maroon)]">
            <Shield size={12} className="align-middle" />
            Captain Setup
          </span>
        }
        title="Build the trip before the first shot is struck."
      />
      <div className="mt-[var(--space-4)]">
        <div className="card-captain">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="mb-[var(--space-4)] flex min-h-11 w-full items-center gap-[var(--space-3)] rounded-2xl border-0 bg-transparent text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] active:scale-[0.99]"
          >
            <p className="type-title-sm flex-1">
              {!expanded && nextStep ? `Next: ${nextStep.label}` : 'Get Your Trip Ready'}
            </p>
            <span className="type-micro font-semibold text-[var(--masters)]">
              {done} / {steps.length} · {pct}%
            </span>
            {expanded ? (
              <ChevronUp size={16} className="text-[var(--ink-tertiary)]" />
            ) : (
              <ChevronDown size={16} className="text-[var(--ink-tertiary)]" />
            )}
          </button>

          <div
            className="h-1 rounded-full mb-[var(--space-4)] bg-[var(--canvas-sunken)]"
            style={{ overflow: 'hidden' }}
          >
            <div
              className="h-full rounded-full bg-[var(--masters)] transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>

          {expanded ? (
            <>
              <div className="flex flex-col gap-[var(--space-2)]">
                <SetupStep
                  number={1}
                  label="Add Players"
                  done={hasPlayers}
                  href="/players"
                  hint={
                    hasPlayers
                      ? `${players.length} on the roster`
                      : `${players.length} added — need at least 4`
                  }
                />
                <SetupStep
                  number={2}
                  label="Assign Teams"
                  done={hasTeams}
                  href="/players?panel=draft"
                  hint={hasTeams ? 'Both sides have players' : 'Draft players to teams'}
                />
                <SetupStep
                  number={3}
                  label="Create First Session"
                  done={hasSessions}
                  href="/lineup/new?mode=session"
                  hint={
                    hasSessions
                      ? `${sessions.length} session${sessions.length === 1 ? '' : 's'} scheduled`
                      : 'Set up rounds and formats'
                  }
                />
                <SetupStep
                  number={4}
                  label="Publish a Lineup"
                  done={hasMatches}
                  href="/lineup/new"
                  hint={
                    hasMatches
                      ? `${tripMatches.length} match${tripMatches.length === 1 ? '' : 'es'} on the board`
                      : 'Pair players into matches'
                  }
                />
                <SetupStep
                  number={5}
                  label="Assign Courses"
                  done={hasCourses}
                  href="/captain/manage"
                  hint={
                    hasCourses
                      ? 'Every match has a course'
                      : hasMatches
                        ? `${tripMatches.filter((m) => !m.courseId).length} match${tripMatches.filter((m) => !m.courseId).length === 1 ? '' : 'es'} still need a course`
                        : 'Needed before matches can be scored with handicaps'
                  }
                />
              </div>

              {players.length >= 2 && (
                <button
                  type="button"
                  onClick={onInviteFriends}
                  className="mt-[var(--space-4)] flex min-h-11 w-full items-center justify-center gap-[var(--space-2)] rounded-xl border border-[var(--rule)] bg-[var(--surface)] px-[var(--space-4)] py-[var(--space-3)] text-[var(--text-sm)] font-medium text-[var(--ink)] press-scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
                >
                  <Share2 size={16} className="text-[var(--masters)]" />
                  Share invite link with your group
                </button>
              )}
            </>
          ) : nextStep ? (
            // Collapsed state: one-tap deep-link to the next
            // outstanding action. No scanning through
            // checkmarks once the captain is mostly done.
            <Link
              href={nextStep.href}
              className="mt-[var(--space-1)] inline-flex min-h-10 items-center gap-[var(--space-2)] rounded-full px-1 text-sm font-medium text-[var(--masters)] no-underline press-scale focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
            >
              Continue
              <ChevronRight size={15} aria-hidden="true" />
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
