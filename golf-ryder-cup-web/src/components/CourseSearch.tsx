'use client';

import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Search, MapPin, Loader2, ChevronRight, Database, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { db } from '@/lib/db';
import {
  searchCourses,
  getCourseById,
  formatCourseLocation,
  getAllTees,
  convertAPITeeToTeeSet,
  checkGolfCourseAPIConfigured,
  type GolfCourseAPICourse,
  type GolfCourseAPITee,
} from '@/lib/services/golfCourseAPIService';
import { buildCanonicalCourseKey, findDuplicateCourseProfiles } from '@/lib/utils/courseImport';

function getCourseResultSubline(course: GolfCourseAPICourse): string {
  const location = formatCourseLocation(course.location);
  if (location) return location;

  if (course.website) {
    try {
      return new URL(course.website).hostname.replace(/^www\./, '');
    } catch {
      // fall through
    }
  }

  switch (course.source) {
    case 'web':
      return 'Web profile';
    case 'osm':
      return 'Map discovery';
    case 'rapidapi':
      return 'Course directory';
    case 'ghin':
      return 'GHIN';
    default:
      return 'Course search result';
  }
}

function getCourseDetailStatus(course: GolfCourseAPICourse): {
  tone: 'success' | 'warning' | 'neutral';
  title: string;
  description: string;
} {
  if (course.dataCompleteness === 'playable' || course.hasPlayableTeeData) {
    return {
      tone: 'success',
      title: 'Playable tee data found',
      description: 'Ratings, slopes, or usable yardage data were extracted for this course.',
    };
  }

  if (course.dataCompleteness === 'basic') {
    return {
      tone: 'warning',
      title: 'Basic course profile only',
      description:
        'The importer found profile details, but tee setup still needs to be added manually.',
    };
  }

  return {
    tone: 'neutral',
    title: 'Limited course data',
    description:
      'This result may only contain a lightweight profile until a scorecard or tee source is found.',
  };
}

interface CourseSearchProps {
  onSelectCourse: (course: {
    name: string;
    location: string;
    sourceUrl?: string;
    canonicalKey?: string;
    duplicateCandidates?: GolfCourseAPICourse['duplicateCandidates'];
    teeSets: Array<{
      name: string;
      color: string;
      rating: number;
      slope: number;
      par: number;
      yardage: number;
      holePars: number[];
      holeHandicaps: number[];
    }>;
  }) => void;
  onClose?: () => void;
}

export function CourseSearch({ onSelectCourse, onClose }: CourseSearchProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GolfCourseAPICourse[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<GolfCourseAPICourse | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [isCheckingConfig, setIsCheckingConfig] = useState(true);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSearchRef = useRef<string>('');
  const existingCourseProfiles = useLiveQuery(() => db.courseProfiles.toArray(), [], []);
  const duplicateCandidates = useMemo(
    () =>
      selectedCourse
        ? findDuplicateCourseProfiles({
            name: selectedCourse.course_name || selectedCourse.club_name,
            city: selectedCourse.location?.city,
            state: selectedCourse.location?.state,
            country: selectedCourse.location?.country,
            sourceUrl: selectedCourse.sourcePageUrl || selectedCourse.website,
            existingProfiles: existingCourseProfiles ?? [],
          })
        : [],
    [existingCourseProfiles, selectedCourse]
  );

  // Check if API is configured on mount
  useEffect(() => {
    checkGolfCourseAPIConfigured()
      .then((configured) => {
        setIsConfigured(configured);
      })
      .catch(() => {
        setIsConfigured(false);
      })
      .finally(() => setIsCheckingConfig(false));
  }, []);

  // Debounced auto-search when query changes
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Don't search if query is too short or same as last search
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      return;
    }

    // Debounce: wait 400ms after typing stops
    searchTimeoutRef.current = setTimeout(() => {
      if (query.trim() !== lastSearchRef.current) {
        performSearch(query.trim());
      }
    }, 400);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query]);

  const performSearch = async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    lastSearchRef.current = searchQuery;
    setIsSearching(true);
    setError(null);

    try {
      const courses = await searchCourses(searchQuery);
      // Only update if this is still the current search
      if (lastSearchRef.current === searchQuery) {
        setResults(courses);
      }
    } catch (err) {
      if (lastSearchRef.current === searchQuery) {
        setError(err instanceof Error ? err.message : 'Search failed');
        setResults([]);
      }
    } finally {
      if (lastSearchRef.current === searchQuery) {
        setIsSearching(false);
      }
    }
  };

  const handleSearch = useCallback(async () => {
    if (!query.trim() || query.trim().length < 2) {
      setResults([]);
      return;
    }
    // Force immediate search (bypass debounce)
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    performSearch(query.trim());
  }, [query]);

  const handleSelectCourse = async (course: GolfCourseAPICourse) => {
    setIsLoadingDetails(true);
    setError(null);

    try {
      // Fetch full course details
      const fullCourse = await getCourseById(course.id, {
        website: course.website,
        title: course.course_name || course.club_name,
        description: course.description,
      });

      setSelectedCourse(fullCourse ?? course);
    } catch (err) {
      setSelectedCourse(course);
      setError(err instanceof Error ? err.message : 'Failed to load course');
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const handleImportCourse = (tees: GolfCourseAPITee[]) => {
    if (!selectedCourse) return;

    const teeSets = tees.map((tee) => convertAPITeeToTeeSet(tee, selectedCourse.id.toString()));

    onSelectCourse({
      name: selectedCourse.course_name || selectedCourse.club_name,
      location: formatCourseLocation(selectedCourse.location),
      sourceUrl: selectedCourse.sourcePageUrl || selectedCourse.website,
      canonicalKey: buildCanonicalCourseKey({
        name: selectedCourse.course_name || selectedCourse.club_name,
        city: selectedCourse.location?.city,
        state: selectedCourse.location?.state,
        country: selectedCourse.location?.country,
        sourceUrl: selectedCourse.sourcePageUrl || selectedCourse.website,
      }),
      duplicateCandidates,
      teeSets,
    });
  };

  // Show loading state while checking configuration
  if (isCheckingConfig) {
    return (
      <div className="p-6 text-center">
        <Loader2 className="w-12 h-12 text-[var(--ink-tertiary)] mx-auto mb-4 animate-spin" />
        <p className="text-sm text-[var(--ink-secondary)]">Checking course search...</p>
      </div>
    );
  }

  if (isConfigured === false) {
    return (
      <div className="p-6 text-center">
        <Database className="w-12 h-12 text-[var(--ink-tertiary)] mx-auto mb-4" />
        <h3 className="font-semibold text-[var(--ink-primary)] mb-2">
          Course search is unavailable
        </h3>
        <p className="text-sm text-[var(--ink-secondary)] mb-4">
          Add the course manually for now. Saved courses and manual tee details still work.
        </p>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-10 items-center rounded-full px-1 text-sm font-semibold text-[var(--masters)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
          >
            Enter course manually instead
          </button>
        )}
      </div>
    );
  }

  // Course detail view
  if (selectedCourse) {
    const allTees = getAllTees(selectedCourse);
    const detailStatus = getCourseDetailStatus(selectedCourse);
    const extractedSourceUrl = selectedCourse.sourcePageUrl || selectedCourse.website;
    const courseSiteUrl =
      selectedCourse.website && selectedCourse.website !== extractedSourceUrl
        ? selectedCourse.website
        : null;

    return (
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => setSelectedCourse(null)}
            className="flex min-h-10 items-center gap-1 rounded-full px-1 text-sm text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
          >
            ← Back to search
          </button>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--ink-tertiary)] hover:text-[var(--ink-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="mb-4">
          <h3 className="font-semibold text-lg text-[var(--ink-primary)]">
            {selectedCourse.course_name || selectedCourse.club_name}
          </h3>
          <p className="text-sm text-[var(--ink-secondary)] flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            {getCourseResultSubline(selectedCourse)}
          </p>
          {selectedCourse.description && (
            <p className="mt-3 text-sm leading-6 text-[var(--ink-secondary)]">
              {selectedCourse.description}
            </p>
          )}
          <div
            className={cn(
              'mt-4 rounded-xl border px-4 py-3',
              detailStatus.tone === 'success'
                ? 'border-[color:var(--success)]/25 bg-[color:var(--success)]/10'
                : detailStatus.tone === 'warning'
                  ? 'border-[color:var(--warning)]/25 bg-[color:var(--warning)]/10'
                  : 'border-[var(--rule)] bg-[var(--surface-secondary)]'
            )}
          >
            <p className="text-sm font-semibold text-[var(--ink-primary)]">{detailStatus.title}</p>
            <p className="mt-1 text-sm leading-6 text-[var(--ink-secondary)]">
              {detailStatus.description}
            </p>
            {selectedCourse.provenance?.length ? (
              <p className="mt-2 text-xs uppercase tracking-[0.12em] text-[var(--ink-tertiary)]">
                {selectedCourse.provenance[0]?.label}
              </p>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {extractedSourceUrl ? (
              <a
                href={extractedSourceUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-10 items-center rounded-full px-1 text-sm font-medium text-[var(--masters)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
              >
                View source
              </a>
            ) : null}
            {courseSiteUrl ? (
              <a
                href={courseSiteUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-10 items-center rounded-full px-1 text-sm font-medium text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
              >
                Visit course site
              </a>
            ) : null}
          </div>
          {selectedCourse.sourceAssets?.length ? (
            <div className="mt-4 rounded-xl border border-[var(--rule)] bg-[var(--surface-secondary)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-tertiary)]">
                Source details
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {selectedCourse.sourceAssets.map((asset) => (
                  <span
                    key={asset.url}
                    className="rounded-full border border-[var(--rule)] bg-[var(--canvas)] px-2 py-1 text-[11px] font-medium text-[var(--ink-secondary)]"
                  >
                    {asset.kind === 'scorecard' ? 'Scorecard' : 'Linked page'} ·{' '}
                    {asset.label || asset.url}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
          {selectedCourse.missingFields?.length ? (
            <div className="mt-4 rounded-xl border border-[var(--rule)] bg-[var(--surface-secondary)] px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--ink-tertiary)]">
                Still missing
              </p>
              <p className="mt-2 text-sm leading-6 text-[var(--ink-secondary)]">
                {selectedCourse.missingFields
                  .map((field) =>
                    field === 'tee-data'
                      ? 'tee data'
                      : field === 'ratings-or-yardage'
                        ? 'ratings or structured yardage'
                        : field === 'hole-layout'
                          ? '18-hole layout'
                          : field
                  )
                  .join(', ')}
              </p>
            </div>
          ) : null}
          {duplicateCandidates.length > 0 ? (
            <div className="mt-4 rounded-xl border border-[color:var(--warning)]/25 bg-[color:var(--warning)]/10 px-4 py-3">
              <p className="text-sm font-semibold text-[var(--warning)]">
                This may already be in your course library
              </p>
              <div className="mt-2 space-y-2">
                {duplicateCandidates.map((candidate) => (
                  <div key={candidate.id} className="text-sm text-[var(--ink-secondary)]">
                    <span className="font-medium text-[var(--ink)]">{candidate.name}</span>
                    {candidate.location ? ` · ${candidate.location}` : ''}
                    <span className="ml-2 text-[var(--ink-tertiary)]">({candidate.reason})</span>
                  </div>
                ))}
              </div>
              {onClose ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="mt-3 inline-flex min-h-10 items-center rounded-full px-1 text-sm font-semibold text-[var(--masters)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
                >
                  Review existing library
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        {allTees.length === 0 ? (
          <div className="p-4 bg-[color:var(--warning)]/10 rounded-lg text-[var(--warning)] text-sm">
            {selectedCourse.dataCompleteness === 'basic'
              ? 'The importer found course details but no playable tee data. You can still import the profile and add tees manually.'
              : 'No tee data is available for this course yet. You can still import basic info and add tees manually.'}
            <button
              type="button"
              onClick={() => handleImportCourse([])}
              className="mt-2 block min-h-11 w-full rounded bg-[color:var(--warning)]/15 py-2 font-medium text-[var(--ink-primary)] hover:bg-[color:var(--warning)]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              {duplicateCandidates.length > 0
                ? 'Import Anyway (No Tees)'
                : 'Import Course (No Tees)'}
            </button>
          </div>
        ) : (
          <>
            <p className="text-sm text-[var(--ink-secondary)] mb-3">
              Choose tees to import ({allTees.length} available):
            </p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {allTees.map((tee, idx) => (
                <TeeOption
                  key={idx}
                  tee={tee}
                  onSelect={() => handleImportCourse([tee])}
                  importLabel={duplicateCandidates.length > 0 ? 'Import anyway' : 'Import'}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={() => handleImportCourse(allTees)}
              className="mt-4 min-h-11 w-full rounded-lg bg-[var(--masters)] py-3 font-medium text-[var(--canvas)] hover:bg-[color:var(--masters)]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            >
              {duplicateCandidates.length > 0
                ? `Import Anyway (${allTees.length} tees)`
                : `Import All Tees (${allTees.length})`}
            </button>
          </>
        )}
      </div>
    );
  }

  // Search view
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[var(--ink-primary)]">Find a course</h3>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-[var(--ink-tertiary)] hover:text-[var(--ink-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Search input */}
      <div className="relative mb-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Course name or city"
          className="w-full px-4 py-3 pl-10 border border-[var(--rule)] bg-[var(--surface-raised)] text-[var(--ink-primary)] placeholder:text-[var(--ink-tertiary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--masters)]/40"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--ink-tertiary)]" />
        <button
          type="button"
          onClick={handleSearch}
          disabled={isSearching || query.trim().length < 2}
          className="absolute right-2 top-1/2 min-h-9 -translate-y-1/2 rounded-md bg-[var(--masters)] px-3 py-1.5 text-sm font-medium text-[var(--canvas)] hover:bg-[color:var(--masters)]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-[color:var(--error)]/10 rounded-lg text-sm flex items-center justify-between gap-3">
          <span className="text-[var(--error)]">{error}</span>
          <button
            type="button"
            onClick={() => performSearch(query)}
            className="min-h-9 shrink-0 rounded-full border border-[color:var(--error)]/30 px-3 py-1.5 text-xs font-semibold text-[var(--error)] transition-colors hover:bg-[color:var(--error)]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)]"
          >
            Try again
          </button>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {results.map((course) => (
            <button
              type="button"
              key={course.id}
              onClick={() => handleSelectCourse(course)}
              disabled={isLoadingDetails}
              className="w-full rounded-lg border border-[var(--rule)] bg-[var(--surface-raised)] p-3 text-left transition-colors hover:border-[var(--masters)] hover:bg-[var(--surface-secondary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)] disabled:opacity-50"
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-[var(--ink-primary)] truncate">
                    {course.course_name || course.club_name}
                  </div>
                  <div className="text-sm text-[var(--ink-secondary)] flex items-center gap-1">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">{getCourseResultSubline(course)}</span>
                  </div>
                  {course.description && (
                    <div className="mt-1 text-xs leading-5 text-[var(--ink-tertiary)] line-clamp-2">
                      {course.description}
                    </div>
                  )}
                  {course.tees && getAllTees(course).length > 0 && (
                    <div className="text-xs text-[var(--masters)] mt-1">
                      {getAllTees(course).length} tee{getAllTees(course).length !== 1 ? 's' : ''}{' '}
                      available
                    </div>
                  )}
                </div>
                <ChevronRight className="w-5 h-5 text-[var(--ink-tertiary)] shrink-0" />
              </div>
            </button>
          ))}
        </div>
      )}

      {results.length === 0 && query && !isSearching && !error && (
        <div className="text-center py-8 text-[var(--ink-secondary)]">
          <p className="font-medium">No courses found for &quot;{query}&quot;</p>
          <div className="mt-3 space-y-1 text-sm">
            <p>Try searching by city name, or use a shorter course name.</p>
            <p className="text-[var(--ink-tertiary)]">
              Example: &quot;Pinehurst&quot; or &quot;Myrtle Beach&quot;
            </p>
          </div>
        </div>
      )}

      {!query && (
        <div className="text-center py-8 text-[var(--ink-secondary)]">
          <Database className="w-10 h-10 mx-auto mb-2 opacity-50 text-[var(--ink-tertiary)]" />
          <p className="text-sm">Search by course name, city, or club</p>
        </div>
      )}
    </div>
  );
}

function TeeOption({
  tee,
  onSelect,
  importLabel = 'Import',
}: {
  tee: GolfCourseAPITee;
  onSelect: () => void;
  importLabel?: string;
}) {
  const hasHoleData = tee.holes && tee.holes.length > 0;

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'w-full min-h-14 rounded-lg border p-3 text-left transition-colors hover:border-[var(--masters)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--focus-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]',
        hasHoleData
          ? 'border-[var(--rule)] bg-[var(--surface-raised)]'
          : 'border-[var(--rule)] bg-[var(--surface-secondary)]'
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium text-[var(--ink-primary)]">{tee.tee_name}</div>
          <div className="text-sm text-[var(--ink-secondary)]">
            {tee.total_yards?.toLocaleString()} yards • Par {tee.par_total} • Rating{' '}
            {tee.course_rating}/{tee.slope_rating}
          </div>
          {!hasHoleData && (
            <div className="text-xs text-[var(--warning)] mt-1">No hole-by-hole data</div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--masters)]">
            {importLabel}
          </span>
          <ChevronRight className="w-5 h-5 text-[var(--ink-tertiary)]" />
        </div>
      </div>
    </button>
  );
}

export default CourseSearch;
