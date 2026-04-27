'use client';

import Link from 'next/link';
import { useState } from 'react';
import { ChevronDown, ChevronUp, Lock } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { useToastStore } from '@/lib/stores';
import { pauseSession, resumeSession } from '@/lib/services/sessionPauseService';
import { useShallow } from 'zustand/shallow';
import type { Course, Match, RyderCupSession, TeeSet } from '@/lib/types/models';

import { ManageFactCard } from './ManagePageShell';
import {
  formatShortDate,
  formatSessionType,
  sessionStatusStyles,
  SessionStatusPill,
} from './manageSessionsPresentation';
import { MatchManagementCard } from './MatchManagementCard';
import { SessionSettingsEditor } from './SessionSettingsEditor';

export interface SessionWithMatches extends RyderCupSession {
  matches: Match[];
}

export function SessionManagementCard({
  session,
  courses,
  teeSets,
  isExpanded,
  onToggle,
  onSaveSession,
  onDeleteSession,
  teamAName,
  teamBName,
  getPlayerNames,
  editingMatchId,
  onEditMatch,
  onSaveMatch,
  onDeleteMatch,
  isSubmitting,
}: {
  session: SessionWithMatches;
  courses: Course[];
  teeSets: TeeSet[];
  isExpanded: boolean;
  onToggle: () => void;
  onSaveSession: (updates: Partial<RyderCupSession>) => Promise<void>;
  onDeleteSession: () => void;
  teamAName: string;
  teamBName: string;
  getPlayerNames: (playerIds: string[]) => string;
  editingMatchId: string | null;
  onEditMatch: (matchId: string | null) => void;
  onSaveMatch: (matchId: string, updates: Partial<Match>) => Promise<void>;
  onDeleteMatch: (matchId: string) => void;
  isSubmitting: boolean;
}) {
  const statusMeta = sessionStatusStyles[session.status];
  const detailsId = `session-${session.id}-details`;
  const { showToast } = useToastStore(
    useShallow((s) => ({ showToast: s.showToast })),
  );

  const handlePauseToggle = async () => {
    try {
      if (session.status === 'paused') {
        await resumeSession(session.id);
        showToast('success', 'Session resumed');
      } else {
        await pauseSession(session.id);
        showToast('info', 'Session paused — matches remain intact.');
      }
    } catch (error) {
      showToast(
        'error',
        error instanceof Error ? error.message : 'Could not change session state',
      );
    }
  };
  const canPauseOrResume =
    session.status === 'inProgress' || session.status === 'paused';

  return (
    <section
      className={cn(
        'overflow-hidden rounded-[1.85rem] border shadow-[0_18px_36px_rgba(46,34,18,0.06)]',
        statusMeta.panel
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={detailsId}
        className="flex w-full items-start gap-[var(--space-4)] border-none bg-transparent px-[var(--space-5)] py-[var(--space-5)] text-left"
      >
        <div className="mt-[var(--space-1)] shrink-0">{statusMeta.icon}</div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-[var(--space-3)] sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">
                Session {session.sessionNumber}
              </p>
              <h3 className="mt-[var(--space-2)] type-title-lg text-[var(--ink)]">
                {session.name}
              </h3>
              <p className="mt-[var(--space-2)] type-body-sm text-[var(--ink-secondary)]">
                {formatSessionType(session.sessionType)}
                {session.timeSlot ? ` · ${session.timeSlot}` : ''}
                {session.scheduledDate ? ` · ${formatShortDate(session.scheduledDate)}` : ''}
              </p>
            </div>

            <div className="flex items-center gap-[var(--space-2)]">
              {session.isPracticeSession ? (
                <div
                  className="inline-flex items-center gap-[var(--space-1)] rounded-full border border-[color:var(--info)]/20 bg-[color:var(--info)]/10 px-[var(--space-2)] py-[6px]"
                  title="Practice session — doesn't count toward the cup"
                >
                  <span className="type-micro font-semibold text-[var(--info)]">
                    Practice
                  </span>
                </div>
              ) : null}
              <SessionStatusPill status={session.status} />
              {session.isLocked ? (
                <div className="inline-flex items-center gap-[var(--space-1)] rounded-full border border-[color:var(--gold)]/18 bg-[color:var(--gold)]/10 px-[var(--space-2)] py-[6px]">
                  <Lock size={12} className="text-[var(--gold-dark)]" />
                  <span className="type-micro font-semibold text-[var(--gold-dark)]">Locked</span>
                </div>
              ) : null}
              {isExpanded ? (
                <ChevronUp size={20} className="text-[var(--ink-tertiary)]" />
              ) : (
                <ChevronDown size={20} className="text-[var(--ink-tertiary)]" />
              )}
            </div>
          </div>

          <div className="mt-[var(--space-4)] grid grid-cols-2 gap-[var(--space-3)] md:grid-cols-4">
            <ManageFactCard
              label="Matches"
              value={session.matches.length}
              valueClassName="font-sans text-[1rem] not-italic"
            />
            <ManageFactCard
              label="Points/Match"
              value={session.pointsPerMatch ?? '—'}
              valueClassName="font-sans text-[1rem] not-italic"
            />
            <ManageFactCard
              label="Status"
              value={statusMeta.label}
              valueClassName="font-sans text-[1rem] not-italic"
            />
            <ManageFactCard
              label="Board"
              value={isExpanded ? 'Open' : 'Closed'}
              valueClassName="font-sans text-[1rem] not-italic"
            />
          </div>
        </div>
      </button>

      {isExpanded ? (
        <div
          id={detailsId}
          className="border-t border-[color:var(--rule)]/75 bg-[rgba(255,255,255,0.52)] px-[var(--space-5)] py-[var(--space-5)]"
        >
          {canPauseOrResume && (
            <div className="mb-[var(--space-4)] flex flex-wrap items-center gap-[var(--space-3)] rounded-[1.25rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.7)] px-[var(--space-4)] py-[var(--space-3)]">
              <div className="flex-1 min-w-0">
                <p className="type-overline tracking-[0.14em] text-[var(--ink-tertiary)]">
                  {session.status === 'paused' ? 'Session paused' : 'Live session'}
                </p>
                <p className="mt-[var(--space-1)] type-body-sm text-[var(--ink-secondary)]">
                  {session.status === 'paused'
                    ? 'Matches are on hold during this pause. Resume when play restarts.'
                    : 'Pause for rain delays or other interruptions. Match state stays intact.'}
                </p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={handlePauseToggle}
                disabled={isSubmitting}
              >
                {session.status === 'paused' ? 'Resume session' : 'Pause session'}
              </Button>
            </div>
          )}
          <div className="grid gap-[var(--space-4)] lg:grid-cols-[0.92fr_1.08fr]">
            <SessionSettingsEditor
              key={`${session.id}:${session.status}:${session.pointsPerMatch ?? ''}:${session.defaultCourseId ?? ''}:${session.defaultTeeSetId ?? ''}:${session.scheduledDate ?? ''}:${session.timeSlot ?? ''}`}
              session={session}
              courses={courses}
              teeSets={teeSets}
              onSave={onSaveSession}
              onCascadeToMatches={async (updates) => {
                for (const match of session.matches) {
                  await onSaveMatch(match.id, updates);
                }
              }}
              matchCount={session.matches.length}
              onDelete={onDeleteSession}
              isSubmitting={isSubmitting}
            />

            <div className="space-y-[var(--space-3)]">
              <div className="rounded-[1.35rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.72)] px-[var(--space-4)] py-[var(--space-4)]">
                <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">
                  Match Board
                </p>
                <h4 className="mt-[var(--space-2)] type-title text-[var(--ink)]">
                  Live pairings and allowances
                </h4>
                <p className="mt-[var(--space-2)] type-body-sm text-[var(--ink-secondary)]">
                  Edit a match here to assign its course and tee set before handicap-based scoring starts.
                </p>
              </div>

              {session.matches.length === 0 ? (
                <div className="rounded-[1.35rem] border border-dashed border-[var(--rule)] bg-[rgba(255,255,255,0.56)] px-[var(--space-4)] py-[var(--space-5)] text-center">
                  <p className="type-title-sm text-[var(--ink)]">No matches in this session</p>
                  <p className="mt-[var(--space-2)] type-caption">
                    Build pairings first, then come back here to fine-tune them.
                  </p>
                  <Link
                    href="/lineup/new"
                    className="mt-[var(--space-3)] inline-flex items-center justify-center rounded-lg border border-[var(--masters)] bg-[var(--masters)] px-[var(--space-4)] py-[var(--space-2)] text-sm font-semibold text-[var(--canvas)] transition-transform hover:scale-[1.02]"
                  >
                    Build pairings
                  </Link>
                </div>
              ) : (
                <>
                  {session.matches.map((match) => (
                    <MatchManagementCard
                      key={`${match.id}:${match.status}:${match.teamAHandicapAllowance}:${match.teamBHandicapAllowance}:${match.courseId ?? ''}:${match.teeSetId ?? ''}:${editingMatchId === match.id ? 'edit' : 'view'}`}
                      match={match}
                      courses={courses}
                      teeSets={teeSets}
                      teamAName={teamAName}
                      teamBName={teamBName}
                      getPlayerNames={getPlayerNames}
                      isEditing={editingMatchId === match.id}
                      onEdit={() => onEditMatch(match.id)}
                      onCancel={() => onEditMatch(null)}
                      onSave={(updates) => onSaveMatch(match.id, updates)}
                      onDelete={() => onDeleteMatch(match.id)}
                      isSubmitting={isSubmitting}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}



