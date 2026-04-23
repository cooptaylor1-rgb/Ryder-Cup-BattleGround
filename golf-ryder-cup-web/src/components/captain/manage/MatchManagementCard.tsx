'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Edit3, Flag, Hash, MapPin, Save, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { db } from '@/lib/db';
import { buildCanonicalCourseKey } from '@/lib/utils/courseImport';
import { importLibraryCourseIntoTrip } from '@/lib/services/tripCourseImportService';
import { useToastStore, useTripStore } from '@/lib/stores';
import { useShallow } from 'zustand/shallow';
import type { Course, Match, TeeSet } from '@/lib/types/models';

import {
  formatTeeOptionLabel,
  getMatchReadinessState,
  MatchReadinessPill,
  sessionStatusStyles,
  SessionStatusPill,
} from './manageSessionsPresentation';

/**
 * Single-match row inside a SessionManagementCard: status + course
 * + tee + handicap allowances + roster-of-team.
 *
 * Extracted from ManageSessionsSection so the 1100-line parent can
 * focus on the session orchestration. All state here is local to
 * the card; parent communicates via onSave / onDelete / onEdit /
 * onCancel callbacks. `isEditing` is a controlled prop so the
 * parent can enforce "one edit at a time" semantics across all
 * matches in a session.
 */
export function MatchManagementCard({
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
