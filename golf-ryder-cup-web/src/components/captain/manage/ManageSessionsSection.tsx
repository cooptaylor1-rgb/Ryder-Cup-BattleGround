'use client';

import Link from 'next/link';
import { useEffect, useState, type ReactNode } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Edit3,
  Flag,
  Hash,
  Lock,
  MapPin,
  Save,
  Trash2,
  Zap,
} from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { cn, parseDateInLocalZone } from '@/lib/utils';
import { db } from '@/lib/db';
import { buildCanonicalCourseKey } from '@/lib/utils/courseImport';
import { importLibraryCourseIntoTrip } from '@/lib/services/tripCourseImportService';
import { useToastStore, useTripStore } from '@/lib/stores';
import { pauseSession, resumeSession } from '@/lib/services/sessionPauseService';
import { useShallow } from 'zustand/shallow';
import type { Course, Match, RyderCupSession, TeeSet } from '@/lib/types/models';

import { ManageFactCard } from './ManagePageShell';

export interface SessionWithMatches extends RyderCupSession {
  matches: Match[];
}

type SessionStatus = RyderCupSession['status'];
type MatchReadinessState = 'needs-course' | 'needs-tee' | 'ready';

const sessionStatusStyles: Record<
  SessionStatus,
  {
    pill: string;
    panel: string;
    icon: ReactNode;
    label: string;
  }
> = {
  scheduled: {
    pill: 'border-[var(--rule)] bg-[var(--canvas)] text-[var(--ink-secondary)]',
    panel:
      'border-[var(--rule)] bg-[linear-gradient(180deg,rgba(255,255,255,0.86),rgba(248,244,237,0.95))]',
    icon: <Clock3 size={16} className="text-[var(--ink-tertiary)]" />,
    label: 'Scheduled',
  },
  inProgress: {
    pill:
      'border-[color:var(--warning)]/18 bg-[color:var(--warning)]/12 text-[var(--warning)]',
    panel:
      'border-[color:var(--warning)]/16 bg-[linear-gradient(180deg,rgba(184,134,11,0.10),rgba(255,255,255,0.96))]',
    icon: <Zap size={16} className="text-[var(--warning)]" />,
    label: 'In Progress',
  },
  completed: {
    pill:
      'border-[color:var(--success)]/18 bg-[color:var(--success)]/12 text-[var(--success)]',
    panel:
      'border-[color:var(--success)]/16 bg-[linear-gradient(180deg,rgba(45,122,79,0.10),rgba(255,255,255,0.96))]',
    icon: <CheckCircle2 size={16} className="text-[var(--success)]" />,
    label: 'Completed',
  },
  paused: {
    pill: 'border-[var(--rule)] bg-[color:var(--ink)]/6 text-[var(--ink-secondary)]',
    panel:
      'border-[var(--rule)] bg-[linear-gradient(180deg,rgba(0,0,0,0.04),rgba(255,255,255,0.96))]',
    icon: <Lock size={16} className="text-[var(--ink-tertiary)]" />,
    label: 'Paused',
  },
};

function getMatchReadinessState({
  selectedCourse,
  selectedTeeSet,
}: {
  selectedCourse?: Course;
  selectedTeeSet?: TeeSet;
}): MatchReadinessState {
  if (!selectedCourse) {
    return 'needs-course';
  }

  if (!selectedTeeSet) {
    return 'needs-tee';
  }

  return 'ready';
}

function MatchReadinessPill({ readiness }: { readiness: MatchReadinessState }) {
  const config =
    readiness === 'ready'
      ? {
          label: 'Ready for handicaps',
          className:
            'border-[color:var(--success)]/18 bg-[color:var(--success)]/12 text-[var(--success)]',
        }
      : readiness === 'needs-tee'
        ? {
            label: 'Needs tee',
            className:
              'border-[color:var(--warning)]/18 bg-[color:var(--warning)]/12 text-[var(--warning)]',
          }
        : {
            label: 'Needs course',
            className:
              'border-[color:var(--warning)]/18 bg-[color:var(--warning)]/12 text-[var(--warning)]',
          };

  return (
    <div className={cn('rounded-full border px-[var(--space-2)] py-[5px]', config.className)}>
      <span className="type-micro font-semibold">{config.label}</span>
    </div>
  );
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
        onClick={onToggle}
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
        <div className="border-t border-[color:var(--rule)]/75 bg-[rgba(255,255,255,0.52)] px-[var(--space-5)] py-[var(--space-5)]">
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

function SessionSettingsEditor({
  session,
  courses,
  teeSets,
  matchCount,
  onSave,
  onCascadeToMatches,
  onDelete,
  isSubmitting,
}: {
  session: RyderCupSession;
  courses: Course[];
  teeSets: TeeSet[];
  matchCount: number;
  onSave: (updates: Partial<RyderCupSession>) => Promise<void>;
  onCascadeToMatches: (updates: Partial<Match>) => Promise<void>;
  onDelete: () => void;
  isSubmitting: boolean;
}) {
  const [name, setName] = useState(session.name);
  const [sessionType, setSessionType] = useState(session.sessionType);
  const [status, setStatus] = useState<RyderCupSession['status']>(session.status);
  const [pointsPerMatch, setPointsPerMatch] = useState(
    session.pointsPerMatch !== undefined ? String(session.pointsPerMatch) : ''
  );
  const [sessionNumber, setSessionNumber] = useState(String(session.sessionNumber));
  const [isPracticeSession, setIsPracticeSession] = useState(Boolean(session.isPracticeSession));
  // scheduledDate is stored as either a date-only "YYYY-MM-DD" string
  // or an ISO-with-time — slice the first 10 chars so the native
  // date input accepts it. Empty string renders an un-set date picker.
  const [scheduledDate, setScheduledDate] = useState(
    session.scheduledDate ? session.scheduledDate.slice(0, 10) : '',
  );
  const [timeSlot, setTimeSlot] = useState<'' | 'AM' | 'PM'>(session.timeSlot ?? '');
  const [firstTeeTime, setFirstTeeTime] = useState(session.firstTeeTime ?? '');
  const [defaultCourseId, setDefaultCourseId] = useState(session.defaultCourseId ?? '');
  const [defaultTeeSetId, setDefaultTeeSetId] = useState(session.defaultTeeSetId ?? '');
  // useLiveQuery in the parent store refreshes `courses`/`teeSets` on
  // the NEXT tick after Dexie writes, so without a local bridge the
  // dropdowns render for one frame with the new defaultCourseId
  // pointing at nothing — select collapses to "Select course…" and
  // the tee dropdown goes empty. Hold the just-imported rows
  // locally until the prop catches up, then clear.
  const [pendingImport, setPendingImport] = useState<
    { course: Course; teeSets: TeeSet[] } | null
  >(null);

  useEffect(() => {
    if (!pendingImport) return;
    if (courses.some((course) => course.id === pendingImport.course.id)) {
      setPendingImport(null);
    }
  }, [courses, pendingImport]);

  const mergedCourses = pendingImport
    ? courses.some((c) => c.id === pendingImport.course.id)
      ? courses
      : [...courses, pendingImport.course]
    : courses;

  const mergedTeeSets = pendingImport
    ? [
        ...teeSets,
        ...pendingImport.teeSets.filter((t) => !teeSets.some((existing) => existing.id === t.id)),
      ]
    : teeSets;

  // Tee sets are scoped per-course; only show tees that belong to the
  // picked course, and clear the tee if the captain switches courses.
  const availableTees = defaultCourseId
    ? mergedTeeSets.filter((tee) => tee.courseId === defaultCourseId)
    : [];

  const hasChanges =
    name !== session.name ||
    sessionType !== session.sessionType ||
    status !== session.status ||
    sessionNumber !== String(session.sessionNumber) ||
    isPracticeSession !== Boolean(session.isPracticeSession) ||
    defaultCourseId !== (session.defaultCourseId ?? '') ||
    defaultTeeSetId !== (session.defaultTeeSetId ?? '') ||
    scheduledDate !== (session.scheduledDate ? session.scheduledDate.slice(0, 10) : '') ||
    timeSlot !== (session.timeSlot ?? '') ||
    firstTeeTime !== (session.firstTeeTime ?? '') ||
    pointsPerMatch !==
      (session.pointsPerMatch !== undefined ? String(session.pointsPerMatch) : '');

  const courseOrTeeChanged =
    defaultCourseId !== (session.defaultCourseId ?? '') ||
    defaultTeeSetId !== (session.defaultTeeSetId ?? '');

  // Pull the course library so we can offer an "Import from library"
  // optgroup directly in the Session Settings course picker. Without
  // this, a captain with zero trip-courses but several library entries
  // saw an empty dropdown with no path forward — the only way to
  // import was to dig into an individual match card. Matches the same
  // pattern used in MatchManagementCard further down.
  const courseProfiles = useLiveQuery(() => db.courseProfiles.toArray(), [], []);
  const importableProfiles = (courseProfiles ?? []).filter((profile) => {
    const profileKey =
      profile.canonicalKey ||
      buildCanonicalCourseKey({
        name: profile.name,
        city: profile.location,
        state: profile.location,
        country: profile.location,
        sourceUrl: profile.sourceUrl,
      });
    return !courses.some((course) => {
      const courseKey = buildCanonicalCourseKey({
        name: course.name,
        city: course.location,
        state: course.location,
        country: course.location,
      });
      return profileKey && courseKey === profileKey;
    });
  });
  const [isImportingProfile, setIsImportingProfile] = useState(false);
  const { showToast } = useToastStore(useShallow((s) => ({ showToast: s.showToast })));

  const handleCourseSelectChange = async (nextValue: string) => {
    if (!nextValue) {
      setDefaultCourseId('');
      setDefaultTeeSetId('');
      return;
    }
    // Library entries are encoded `profile:<id>` so the dropdown can
    // mix not-yet-imported library courses alongside trip courses.
    if (nextValue.startsWith('profile:')) {
      const profileId = nextValue.slice('profile:'.length);
      setIsImportingProfile(true);
      try {
        const tripId = useTripStore.getState().currentTrip?.id;
        const { course, teeSets: importedTees } = await importLibraryCourseIntoTrip(profileId, {
          tripId,
        });
        // Stash the just-imported rows so the dropdowns have options to
        // match defaultCourseId / defaultTeeSetId until the store's
        // next load-trip cycle. The service already pushed them into
        // the Zustand store, but the locally-scoped pendingImport
        // bridges the single frame before React re-renders with the
        // updated props.
        setPendingImport({ course, teeSets: importedTees });
        setDefaultCourseId(course.id);
        setDefaultTeeSetId(importedTees[0]?.id ?? '');
        showToast('success', `Imported ${course.name} from library`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Import failed';
        showToast('error', `Could not import course: ${message}`);
      } finally {
        setIsImportingProfile(false);
      }
      return;
    }
    setDefaultCourseId(nextValue);
    setDefaultTeeSetId('');
  };

  return (
    <div className="rounded-[1.45rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.78)] p-[var(--space-5)] shadow-[0_12px_24px_rgba(46,34,18,0.05)]">
      <p className="type-overline tracking-[0.16em] text-[var(--ink-tertiary)]">
        Session Settings
      </p>
      <h4 className="mt-[var(--space-2)] type-title-lg text-[var(--ink)]">
        Control the frame
      </h4>
      <p className="mt-[var(--space-2)] type-body-sm text-[var(--ink-secondary)]">
        Set the session status and match value here. Deleting the session removes the entire board
        beneath it.
      </p>

      <div className="mt-[var(--space-5)] space-y-[var(--space-4)]">
        <label className="space-y-[var(--space-2)]">
          <span className="type-meta font-semibold text-[var(--ink)]">Session name</span>
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="input"
            placeholder="e.g., Friday AM Fourball"
          />
        </label>

        <div className="grid grid-cols-2 gap-[var(--space-3)]">
          <label className="space-y-[var(--space-2)]">
            <span className="type-meta font-semibold text-[var(--ink)]">Format</span>
            <select
              value={sessionType}
              onChange={(event) => setSessionType(event.target.value as typeof sessionType)}
              className="input"
            >
              <option value="fourball">Four-Ball</option>
              <option value="foursomes">Foursomes</option>
              <option value="singles">Singles</option>
              <option value="pinehurst">Pinehurst</option>
              <option value="greensomes">Greensomes</option>
              <option value="scramble">Scramble</option>
              <option value="texas-scramble">Texas Scramble</option>
              <option value="shamble">Shamble</option>
              <option value="best-2-of-4">Best 2 of 4</option>
              <option value="cha-cha-cha">Cha-Cha-Cha</option>
              <option value="one-two-three">1-2-3</option>
              <option value="six-six-six">Sixes (6-6-6)</option>
            </select>
          </label>

          <label className="space-y-[var(--space-2)]">
            <span className="type-meta font-semibold text-[var(--ink)]">Order</span>
            <input
              type="number"
              min="1"
              value={sessionNumber}
              onChange={(event) => setSessionNumber(event.target.value)}
              className="input"
              title="Session order in the schedule"
            />
          </label>
        </div>

        {/* Schedule + slot — captains could see these read-only on
            the session header but had no way to correct them from the
            settings editor. Wrong slot stamps "1:00 PM" on every
            morning session; wrong date hides the session from the
            schedule day it should actually live on. */}
        <div className="grid grid-cols-2 gap-[var(--space-3)]">
          <label className="space-y-[var(--space-2)]">
            <span className="type-meta font-semibold text-[var(--ink)]">Date</span>
            <input
              type="date"
              value={scheduledDate}
              onChange={(event) => setScheduledDate(event.target.value)}
              className="input"
            />
          </label>

          <label className="space-y-[var(--space-2)]">
            <span className="type-meta font-semibold text-[var(--ink)]">Slot</span>
            <select
              value={timeSlot}
              onChange={(event) => setTimeSlot(event.target.value as '' | 'AM' | 'PM')}
              className="input"
            >
              <option value="">Not set</option>
              <option value="AM">AM</option>
              <option value="PM">PM</option>
            </select>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-[var(--space-3)]">
          <label className="space-y-[var(--space-2)]">
            <span className="type-meta font-semibold text-[var(--ink)]">First tee time</span>
            <input
              type="time"
              value={firstTeeTime}
              onChange={(event) => setFirstTeeTime(event.target.value)}
              className="input"
            />
            <span className="block type-caption text-[var(--ink-tertiary)]">
              Shown on the schedule and used to stagger match tee times.
            </span>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-[var(--space-3)]">
          <label className="space-y-[var(--space-2)]">
            <span className="type-meta font-semibold text-[var(--ink)]">Status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as RyderCupSession['status'])}
              className="input"
            >
              <option value="scheduled">Scheduled</option>
              <option value="inProgress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </label>

          <label className="space-y-[var(--space-2)]">
            <span className="type-meta font-semibold text-[var(--ink)]">Points per match</span>
            <input
              type="number"
              min="0"
              step="0.5"
              value={pointsPerMatch}
              onChange={(event) => setPointsPerMatch(event.target.value)}
              className="input"
              placeholder="1"
            />
          </label>
        </div>

        {/* Practice toggle. Practice sessions still run end-to-end
            (scoring, live board) but are excluded from the cup standings
            and point totals. Without a toggle in settings the "Practice"
            chip on the header was read-only — the captain had no way to
            undo a misclick from trip setup. */}
        <label className="flex items-start gap-[var(--space-3)] rounded-[var(--radius-md)] border border-[var(--rule)] bg-[rgba(255,255,255,0.6)] px-[var(--space-3)] py-[var(--space-3)]">
          <input
            type="checkbox"
            checked={isPracticeSession}
            onChange={(event) => setIsPracticeSession(event.target.checked)}
            className="mt-1 h-4 w-4 accent-[var(--masters)]"
          />
          <span className="flex-1">
            <span className="block type-meta font-semibold text-[var(--ink)]">
              Practice session
            </span>
            <span className="mt-1 block type-caption text-[var(--ink-secondary)]">
              Score it, chart it, and share it — but keep it out of the cup standings.
            </span>
          </span>
        </label>

        {/* Course + Tee Set. Stored on the session so the captain can
            set them once and (a) have every match created through the
            lineup builder inherit them, and (b) cascade the new value
            to every existing match on save. Before this the captain
            had to hunt per-match, and zero-match sessions had no
            visible control at all. */}
        <div className="space-y-[var(--space-2)] rounded-[var(--radius-md)] border border-[var(--rule)] bg-[rgba(255,255,255,0.6)] px-[var(--space-3)] py-[var(--space-3)]">
          <div>
            <span className="block type-meta font-semibold text-[var(--ink)]">Course &amp; Tee</span>
            <span className="mt-1 block type-caption text-[var(--ink-secondary)]">
              {matchCount === 0
                ? 'Set once now — new matches you publish will inherit it.'
                : `Applies to all ${matchCount} ${matchCount === 1 ? 'match' : 'matches'} on save.`}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-[var(--space-3)] md:grid-cols-2">
            <label className="space-y-[var(--space-1)]">
              <span className="type-caption font-semibold text-[var(--ink-secondary)]">
                Course
                {isImportingProfile ? (
                  <span className="ml-2 text-[10px] font-medium text-[var(--ink-tertiary)]">
                    Importing…
                  </span>
                ) : null}
              </span>
              <select
                value={defaultCourseId}
                onChange={(event) => void handleCourseSelectChange(event.target.value)}
                className="input"
                disabled={isSubmitting || isImportingProfile}
              >
                <option value="">Select course…</option>
                {mergedCourses.length > 0 && (
                  <optgroup label="In this trip">
                    {mergedCourses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.name}
                      </option>
                    ))}
                  </optgroup>
                )}
                {importableProfiles.length > 0 && (
                  <optgroup label="From library (tap to import)">
                    {importableProfiles.map((profile) => (
                      <option key={profile.id} value={`profile:${profile.id}`}>
                        {profile.name}
                        {profile.location ? ` — ${profile.location}` : ''}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
            </label>
            <label className="space-y-[var(--space-1)]">
              <span className="type-caption font-semibold text-[var(--ink-secondary)]">Tee set</span>
              <select
                value={defaultTeeSetId}
                onChange={(event) => setDefaultTeeSetId(event.target.value)}
                className="input"
                disabled={!defaultCourseId || isSubmitting}
              >
                <option value="">
                  {defaultCourseId ? 'Select tee set…' : 'Choose course first'}
                </option>
                {availableTees.map((tee) => (
                  <option key={tee.id} value={tee.id}>
                    {formatTeeOptionLabel(tee)}
                  </option>
                ))}
              </select>
            </label>
          </div>
          {courses.length === 0 && importableProfiles.length === 0 && (
            <p className="type-caption text-[var(--warning)]">
              No courses in the trip or library yet.{' '}
              <Link href="/courses" className="underline underline-offset-2">
                Build or import one
              </Link>
              , then come back to assign.
            </p>
          )}
        </div>
      </div>

      <div className="mt-[var(--space-5)] flex flex-col gap-[var(--space-3)] sm:flex-row">
        <Button
          variant="secondary"
          onClick={async () => {
            // Persist the session fields first so the defaults are on
            // record even if the cascade to matches fails (partial
            // success is preferable to no session save at all).
            await onSave({
              name: name.trim() || session.name,
              sessionType,
              sessionNumber: sessionNumber.trim() ? Number(sessionNumber) : session.sessionNumber,
              status,
              pointsPerMatch: pointsPerMatch.trim() ? Number(pointsPerMatch) : undefined,
              isPracticeSession,
              scheduledDate: scheduledDate || undefined,
              timeSlot: timeSlot || undefined,
              firstTeeTime: firstTeeTime || undefined,
              defaultCourseId: defaultCourseId || undefined,
              defaultTeeSetId: defaultTeeSetId || undefined,
            });
            // Only touch matches when the captain actually changed the
            // course/tee — skipping this when nothing changed avoids a
            // pointless N-match rewrite + sync storm on any other
            // session edit (name, status, points, practice toggle).
            if (courseOrTeeChanged && matchCount > 0) {
              await onCascadeToMatches({
                courseId: defaultCourseId || undefined,
                teeSetId: defaultTeeSetId || undefined,
              });
            }
          }}
          disabled={isSubmitting || !hasChanges}
          leftIcon={<Save size={15} />}
          className="flex-1"
        >
          Save Session
        </Button>
        <Button
          variant="danger"
          onClick={onDelete}
          disabled={isSubmitting}
          leftIcon={<Trash2 size={15} />}
          className="flex-1"
        >
          Delete Session
        </Button>
      </div>
    </div>
  );
}

function MatchManagementCard({
  match,
  courses,
  teeSets,
  teamAName,
  teamBName,
  getPlayerNames,
  isEditing,
  onEdit,
  onCancel,
  onSave,
  onDelete,
  isSubmitting,
}: {
  match: Match;
  courses: Course[];
  teeSets: TeeSet[];
  teamAName: string;
  teamBName: string;
  getPlayerNames: (playerIds: string[]) => string;
  isEditing: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: (updates: Partial<Match>) => Promise<void>;
  onDelete: () => void;
  isSubmitting: boolean;
}) {
  const initialTeeSet = match.teeSetId
    ? teeSets.find((teeSet) => teeSet.id === match.teeSetId)
    : undefined;
  const initialCourseId = match.courseId ?? initialTeeSet?.courseId ?? '';
  const [teamAAllowance, setTeamAAllowance] = useState(String(match.teamAHandicapAllowance));
  const [teamBAllowance, setTeamBAllowance] = useState(String(match.teamBHandicapAllowance));
  const [status, setStatus] = useState<Match['status']>(match.status);
  const [courseId, setCourseId] = useState(initialCourseId);
  const [teeSetId, setTeeSetId] = useState(match.teeSetId ?? '');
  const [isImportingProfile, setIsImportingProfile] = useState(false);
  const { showToast } = useToastStore(useShallow((s) => ({ showToast: s.showToast })));

  // Library-backed course profiles so captains don't have to double-hop
  // through /courses to import before they can assign. The dropdown
  // below shows these in a second optgroup; selecting one runs
  // createCourseFromProfile() and then writes the new trip-course id
  // back into `courseId`.
  const courseProfiles = useLiveQuery(() => db.courseProfiles.toArray(), [], []);
  const teeSetProfiles = useLiveQuery(() => db.teeSetProfiles.toArray(), [], []);

  const importableProfiles = (courseProfiles ?? []).filter((profile) => {
    // Hide profiles whose name/location already has a matching trip
    // course — otherwise the captain sees a duplicate "import" option
    // for a course they already pulled in on a previous session.
    const profileKey =
      profile.canonicalKey ||
      buildCanonicalCourseKey({
        name: profile.name,
        city: profile.location,
        state: profile.location,
        country: profile.location,
        sourceUrl: profile.sourceUrl,
      });
    return !courses.some((course) => {
      const courseKey = buildCanonicalCourseKey({
        name: course.name,
        city: course.location,
        state: course.location,
        country: course.location,
      });
      return profileKey && courseKey === profileKey;
    });
  });

  const teamANames = getPlayerNames(match.teamAPlayerIds);
  const teamBNames = getPlayerNames(match.teamBPlayerIds);
  const selectedCourse = courseId ? courses.find((course) => course.id === courseId) : undefined;
  const selectedTeeSet = teeSetId ? teeSets.find((teeSet) => teeSet.id === teeSetId) : undefined;
  const availableTeeSets = courseId
    ? teeSets
        .filter((teeSet) => teeSet.courseId === courseId)
        .sort((a, b) => a.name.localeCompare(b.name))
    : [];
  const readiness = getMatchReadinessState({ selectedCourse, selectedTeeSet });
  const needsCourseSetup = readiness !== 'ready';
  const libraryHasImportable = importableProfiles.length > 0;
  const missingLibraryData =
    (courses.length === 0 && !libraryHasImportable) ||
    (selectedCourse && availableTeeSets.length === 0);
  const primaryCourseActionLabel = missingLibraryData ? 'Add or import courses' : 'Set course & tee';

  const handleCourseSelectChange = async (nextValue: string) => {
    if (!nextValue) {
      setCourseId('');
      setTeeSetId('');
      return;
    }

    // Library entries are encoded as `profile:<id>` so the select can
    // offer both imported trip courses and not-yet-imported library
    // profiles in a single control.
    if (nextValue.startsWith('profile:')) {
      const profileId = nextValue.slice('profile:'.length);
      setIsImportingProfile(true);
      try {
        const tripId = useTripStore.getState().currentTrip?.id;
        const { course, teeSets: importedTees } = await importLibraryCourseIntoTrip(profileId, {
          tripId,
        });
        setCourseId(course.id);
        setTeeSetId(importedTees[0]?.id ?? '');
        showToast('success', `Imported ${course.name} from library`);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Import failed';
        showToast('error', `Could not import course: ${message}`);
      } finally {
        setIsImportingProfile(false);
      }
      return;
    }

    setCourseId(nextValue);
    const teeSetStillValid = teeSets.some(
      (teeSet) => teeSet.id === teeSetId && teeSet.courseId === nextValue,
    );
    if (!teeSetStillValid) {
      setTeeSetId('');
    }
  };
  // teeSetProfiles is intentionally unused here — the importable
  // profile list above is driven by the profile metadata alone, and
  // createCourseFromProfile reads the tee sets internally when it
  // runs the import. Keeping the hook call so the component
  // re-renders on tee-set edits to the library.
  void teeSetProfiles;
  const statusMeta =
    status === 'completed'
      ? sessionStatusStyles.completed
      : status === 'inProgress'
        ? sessionStatusStyles.inProgress
        : sessionStatusStyles.scheduled;

  if (isEditing) {
    return (
      <div className="rounded-[1.35rem] border border-[var(--masters)] bg-[rgba(255,255,255,0.88)] p-[var(--space-4)] shadow-[0_12px_24px_rgba(46,34,18,0.06)]">
        <div className="flex items-center justify-between gap-[var(--space-3)]">
          <div>
            <p className="type-overline text-[var(--ink-tertiary)]">Match {match.matchOrder}</p>
            <h5 className="mt-[var(--space-1)] type-title text-[var(--ink)]">
              Adjust allowances and status
            </h5>
          </div>
          <SessionStatusPill
            status={
              status === 'completed'
                ? 'completed'
                : status === 'inProgress'
                  ? 'inProgress'
                  : 'scheduled'
            }
          />
        </div>

          <div className="mt-[var(--space-4)] space-y-[var(--space-4)]">
            <label className="space-y-[var(--space-2)]">
              <span className="type-meta font-semibold text-[var(--ink)]">Match status</span>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as Match['status'])}
              className="input"
            >
              <option value="scheduled">Scheduled</option>
              <option value="inProgress">In Progress</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </label>

          <div className="grid gap-[var(--space-3)] sm:grid-cols-2">
            <label className="space-y-[var(--space-2)]">
              <span className="type-meta font-semibold text-[var(--team-usa)]">{teamAName}</span>
              <input
                type="number"
                min="0"
                value={teamAAllowance}
                onChange={(event) => setTeamAAllowance(event.target.value)}
                className="input"
              />
              <p className="type-caption">{teamANames || 'TBD'}</p>
            </label>

            <label className="space-y-[var(--space-2)]">
              <span className="type-meta font-semibold text-[var(--team-europe)]">{teamBName}</span>
              <input
                type="number"
                min="0"
                value={teamBAllowance}
                onChange={(event) => setTeamBAllowance(event.target.value)}
                className="input"
              />
              <p className="type-caption">{teamBNames || 'TBD'}</p>
            </label>
          </div>

          <div className="grid gap-[var(--space-3)] sm:grid-cols-2">
            <label className="space-y-[var(--space-2)]">
              <span className="type-meta font-semibold text-[var(--ink)]">Course</span>
              <select
                value={courseId}
                onChange={(event) => void handleCourseSelectChange(event.target.value)}
                className="input"
                disabled={isImportingProfile}
              >
                <option value="">
                  {isImportingProfile ? 'Importing from library…' : 'No course assigned'}
                </option>
                {courses.length > 0 && (
                  <optgroup label="Trip courses">
                    {courses
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.name}
                        </option>
                      ))}
                  </optgroup>
                )}
                {importableProfiles.length > 0 && (
                  <optgroup label="From library (tap to import)">
                    {importableProfiles
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((profile) => (
                        <option key={profile.id} value={`profile:${profile.id}`}>
                          {profile.name}
                          {profile.location ? ` — ${profile.location}` : ''}
                        </option>
                      ))}
                  </optgroup>
                )}
              </select>
            </label>

            <label className="space-y-[var(--space-2)]">
              <span className="type-meta font-semibold text-[var(--ink)]">Tee set</span>
              <select
                value={teeSetId}
                onChange={(event) => setTeeSetId(event.target.value)}
                className="input"
                disabled={!courseId}
              >
                <option value="">{courseId ? 'Select tee set' : 'Choose course first'}</option>
                {availableTeeSets.map((teeSet) => (
                  <option key={teeSet.id} value={teeSet.id}>
                    {formatTeeOptionLabel(teeSet)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <p className="type-caption">
            {selectedCourse
              ? `${selectedCourse.name}${selectedTeeSet ? ` • ${selectedTeeSet.name}` : ''}`
              : 'Assign the course and tee set here so scoring uses the right card.'}
          </p>
        </div>

        <div className="mt-[var(--space-5)] flex flex-col gap-[var(--space-3)] sm:flex-row">
          <Button
            variant="secondary"
            onClick={onCancel}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={() =>
              onSave({
                status,
                teamAHandicapAllowance: Number(teamAAllowance) || 0,
                teamBHandicapAllowance: Number(teamBAllowance) || 0,
                courseId: courseId || undefined,
                teeSetId: teeSetId || undefined,
              })
            }
            disabled={isSubmitting}
            leftIcon={<Save size={15} />}
            className="flex-1"
          >
            Save Match
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-[1.35rem] border border-[var(--rule)] bg-[rgba(255,255,255,0.78)] p-[var(--space-4)] shadow-[0_10px_20px_rgba(46,34,18,0.05)]">
      <div className="flex items-start justify-between gap-[var(--space-3)]">
        <div>
          <div className="flex items-center gap-[var(--space-2)]">
            <Hash size={14} className="text-[var(--ink-tertiary)]" />
            <p className="type-title-sm text-[var(--ink)]">Match {match.matchOrder}</p>
            <div
              className={cn('rounded-full border px-[var(--space-2)] py-[5px]', statusMeta.pill)}
            >
              <span className="type-micro font-semibold">{statusMeta.label}</span>
            </div>
            <MatchReadinessPill readiness={readiness} />
          </div>
          <div className="mt-[var(--space-3)] grid gap-[var(--space-2)]">
            <div className="flex flex-wrap items-center gap-[var(--space-2)] text-[var(--ink-secondary)]">
              <div className="inline-flex items-center gap-[6px] rounded-full border border-[color:var(--rule)] bg-[color:var(--canvas)]/72 px-[var(--space-2)] py-[6px]">
                <MapPin size={12} className="text-[var(--ink-tertiary)]" />
                <span className="type-micro font-semibold">
                  {selectedCourse?.name ?? 'No course assigned'}
                </span>
              </div>
              <div className="inline-flex items-center gap-[6px] rounded-full border border-[color:var(--rule)] bg-[color:var(--canvas)]/72 px-[var(--space-2)] py-[6px]">
                <Flag size={12} className="text-[var(--ink-tertiary)]" />
                <span className="type-micro font-semibold">
                  {selectedTeeSet?.name ?? 'No tee set'}
                </span>
              </div>
            </div>

            {needsCourseSetup ? (
              <div className="rounded-[1rem] border border-[color:var(--warning)]/18 bg-[color:var(--warning)]/8 px-[var(--space-3)] py-[var(--space-3)]">
                <div className="flex items-start justify-between gap-[var(--space-3)]">
                  <div>
                    <p className="type-meta font-semibold text-[var(--warning)]">
                      {readiness === 'needs-course' ? 'Course required' : 'Tee set required'}
                    </p>
                    <p className="mt-[var(--space-1)] type-caption text-[var(--ink-secondary)]">
                      {courses.length === 0
                        ? 'Start by adding or importing the course into the library, then assign it here.'
                        : selectedCourse && availableTeeSets.length === 0
                          ? 'This course has no tee sets yet. Add them in the library, then return here to assign one.'
                          : 'Set the course and tee set here so handicap calculations use the right card.'}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-[var(--space-2)] sm:flex-row">
                    {missingLibraryData ? (
                      <Link
                        href="/courses"
                        className="inline-flex min-h-12 items-center justify-center rounded-xl border border-[color:var(--gold)]/24 bg-[color:var(--gold)]/10 px-[var(--space-4)] py-[var(--space-3)] text-sm font-semibold text-[var(--ink)] transition-colors hover:bg-[color:var(--gold)]/14"
                        data-testid={`match-course-setup-${match.id}`}
                      >
                        {primaryCourseActionLabel}
                      </Link>
                    ) : (
                      <Button
                        variant="secondary"
                        onClick={onEdit}
                        data-testid={`match-course-setup-${match.id}`}
                      >
                        {primaryCourseActionLabel}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ) : null}

            <div className="rounded-[1rem] border border-[color:var(--team-usa)]/16 bg-[color:var(--team-usa)]/8 px-[var(--space-3)] py-[var(--space-3)]">
              <div className="flex items-center justify-between gap-[var(--space-3)]">
                <span className="type-meta font-semibold text-[var(--team-usa)]">{teamAName}</span>
                <span className="type-micro font-semibold text-[var(--ink-secondary)]">
                  {match.teamAHandicapAllowance} strokes
                </span>
              </div>
              <p className="mt-[var(--space-1)] type-caption text-[var(--ink)]">
                {teamANames || 'TBD'}
              </p>
            </div>

            <div className="rounded-[1rem] border border-[color:var(--team-europe)]/16 bg-[color:var(--team-europe)]/8 px-[var(--space-3)] py-[var(--space-3)]">
              <div className="flex items-center justify-between gap-[var(--space-3)]">
                <span className="type-meta font-semibold text-[var(--team-europe)]">{teamBName}</span>
                <span className="type-micro font-semibold text-[var(--ink-secondary)]">
                  {match.teamBHandicapAllowance} strokes
                </span>
              </div>
              <p className="mt-[var(--space-1)] type-caption text-[var(--ink)]">
                {teamBNames || 'TBD'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-[var(--space-2)]">
          <Button
            variant="outline"
            size="icon"
            onClick={onEdit}
            aria-label={`Edit match ${match.matchOrder}`}
          >
            <Edit3 size={16} />
          </Button>
          <Button
            variant="danger"
            size="icon"
            onClick={onDelete}
            aria-label={`Delete match ${match.matchOrder}`}
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
    </div>
  );
}

function SessionStatusPill({ status }: { status: SessionStatus }) {
  return (
    <div
      className={cn(
        'rounded-full border px-[var(--space-2)] py-[6px]',
        sessionStatusStyles[status].pill
      )}
    >
      <span className="type-micro font-semibold">{sessionStatusStyles[status].label}</span>
    </div>
  );
}

function formatShortDate(isoString: string) {
  // Route through parseDateInLocalZone so a bare YYYY-MM-DD doesn't flip
  // to the prior day in US timezones.
  return parseDateInLocalZone(isoString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatSessionType(type: RyderCupSession['sessionType']) {
  switch (type) {
    case 'foursomes':
      return 'Foursomes';
    case 'fourball':
      return 'Fourball';
    case 'singles':
      return 'Singles';
    default:
      return type;
  }
}

/**
 * Tee option label with rating + slope. Captains picking a tee need
 * the course numbers visible at the point of decision — not buried
 * under another tap — because the handicap answer they're actually
 * trying to compute ("which tees should my group play?") depends on
 * both. Degree signs + slash match the scorecard convention (72.1 /
 * 131). Falls back to just the name when either field is missing so
 * a half-configured tee doesn't render "— NaN/NaN".
 */
function formatTeeOptionLabel(tee: TeeSet): string {
  const rating = Number.isFinite(tee.rating) ? tee.rating.toFixed(1) : null;
  const slope = Number.isFinite(tee.slope) ? String(Math.round(tee.slope)) : null;
  if (rating && slope) {
    return `${tee.name} — ${rating} / ${slope}`;
  }
  return tee.name;
}

