'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Save, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { db } from '@/lib/db';
import { buildCanonicalCourseKey } from '@/lib/utils/courseImport';
import { importLibraryCourseIntoTrip } from '@/lib/services/tripCourseImportService';
import { useToastStore, useTripStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import type { Course, Match, RyderCupSession, TeeSet } from '@/lib/types/models';

import { formatTeeOptionLabel } from './manageSessionsPresentation';

/**
 * Full edit form for a single session: name, format, status,
 * scheduled date + time slot, first tee time, course + tee defaults
 * that cascade into new matches, and the delete button.
 *
 * Extracted from ManageSessionsSection so the parent card stays
 * focused on orchestration. All state is self-contained; the
 * parent talks to the editor through onSave / onCascadeToMatches /
 * onDelete callbacks.
 */
export function SessionSettingsEditor({
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
