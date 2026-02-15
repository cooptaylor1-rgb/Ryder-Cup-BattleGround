'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Search, MapPin, Loader2, ChevronRight, Database, X } from 'lucide-react';
import { cn } from '@/lib/utils';
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

interface CourseSearchProps {
    onSelectCourse: (course: {
        name: string;
        location: string;
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

    // Check if API is configured on mount
    useEffect(() => {
        checkGolfCourseAPIConfigured()
            .then(configured => {
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
            const fullCourse = await getCourseById(course.id);
            if (!fullCourse) {
                throw new Error('Could not load course details');
            }

            setSelectedCourse(fullCourse);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load course');
        } finally {
            setIsLoadingDetails(false);
        }
    };

    const handleImportCourse = (tees: GolfCourseAPITee[]) => {
        if (!selectedCourse) return;

        const teeSets = tees.map(tee =>
            convertAPITeeToTeeSet(tee, selectedCourse.id.toString())
        );

        onSelectCourse({
            name: selectedCourse.course_name || selectedCourse.club_name,
            location: formatCourseLocation(selectedCourse.location),
            teeSets,
        });
    };

    // Show loading state while checking configuration
    if (isCheckingConfig) {
        return (
            <div className="p-6 text-center">
                <Loader2 className="w-12 h-12 text-[var(--ink-tertiary)] mx-auto mb-4 animate-spin" />
                <p className="text-sm text-[var(--ink-secondary)]">Checking course database...</p>
            </div>
        );
    }

    if (isConfigured === false) {
        return (
            <div className="p-6 text-center">
                <Database className="w-12 h-12 text-[var(--ink-tertiary)] mx-auto mb-4" />
                <h3 className="font-semibold text-[var(--ink-primary)] mb-2">Course Database Not Configured</h3>
                <p className="text-sm text-[var(--ink-secondary)] mb-4">
                    Set the <code className="bg-[var(--surface-secondary)] px-1 rounded">GOLF_COURSE_API_KEY</code> environment variable to enable course search.
                </p>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="text-sm text-[var(--masters)] hover:underline"
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

        return (
            <div className="p-4">
                <div className="flex items-center justify-between mb-4">
                    <button
                        onClick={() => setSelectedCourse(null)}
                        className="text-sm text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] flex items-center gap-1"
                    >
                        ← Back to search
                    </button>
                    {onClose && (
                        <button onClick={onClose} className="p-1 text-[var(--ink-tertiary)] hover:text-[var(--ink-secondary)]" aria-label="Close">
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
                        {formatCourseLocation(selectedCourse.location)}
                    </p>
                </div>

                {allTees.length === 0 ? (
                    <div className="p-4 bg-[color:var(--warning)]/10 rounded-lg text-[var(--warning)] text-sm">
                        No tee data available for this course. You can still import basic info and add tees manually.
                        <button
                            onClick={() => handleImportCourse([])}
                            className="mt-2 block w-full py-2 bg-[color:var(--warning)]/15 hover:bg-[color:var(--warning)]/20 rounded font-medium text-[var(--ink-primary)]"
                        >
                            Import Course (No Tees)
                        </button>
                    </div>
                ) : (
                    <>
                        <p className="text-sm text-[var(--ink-secondary)] mb-3">
                            Select tees to import ({allTees.length} available):
                        </p>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                            {allTees.map((tee, idx) => (
                                <TeeOption
                                    key={idx}
                                    tee={tee}
                                    onSelect={() => handleImportCourse([tee])}
                                />
                            ))}
                        </div>
                        <button
                            onClick={() => handleImportCourse(allTees)}
                            className="mt-4 w-full py-3 bg-[var(--masters)] text-[var(--canvas)] font-medium rounded-lg hover:bg-[color:var(--masters)]/90"
                        >
                            Import All Tees ({allTees.length})
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
                <h3 className="font-semibold text-[var(--ink-primary)]">Search Course Database</h3>
                {onClose && (
                    <button onClick={onClose} className="p-1 text-[var(--ink-tertiary)] hover:text-[var(--ink-secondary)]" aria-label="Close">
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
                    placeholder="Search by course name or city..."
                    className="w-full px-4 py-3 pl-10 border border-[var(--rule)] bg-[var(--surface-raised)] text-[var(--ink-primary)] placeholder:text-[var(--ink-tertiary)] rounded-lg focus:outline-none focus:ring-2 focus:ring-[color:var(--masters)]/40"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--ink-tertiary)]" />
                <button
                    onClick={handleSearch}
                    disabled={isSearching || query.trim().length < 2}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-[var(--masters)] text-[var(--canvas)] text-sm font-medium rounded-md hover:bg-[color:var(--masters)]/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                </button>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-[color:var(--error)]/10 text-[var(--error)] rounded-lg text-sm">
                    {error}
                </div>
            )}

            {/* Results */}
            {results.length > 0 && (
                <div className="space-y-2 max-h-80 overflow-y-auto">
                    {results.map((course) => (
                        <button
                            key={course.id}
                            onClick={() => handleSelectCourse(course)}
                            disabled={isLoadingDetails}
                            className="w-full p-3 text-left bg-[var(--surface-raised)] border border-[var(--rule)] rounded-lg hover:border-[var(--masters)] hover:bg-[var(--surface-secondary)] transition-colors disabled:opacity-50"
                        >
                            <div className="flex items-center justify-between">
                                <div className="min-w-0 flex-1">
                                    <div className="font-medium text-[var(--ink-primary)] truncate">
                                        {course.course_name || course.club_name}
                                    </div>
                                    <div className="text-sm text-[var(--ink-secondary)] flex items-center gap-1">
                                        <MapPin className="w-3 h-3 shrink-0" />
                                        <span className="truncate">{formatCourseLocation(course.location)}</span>
                                    </div>
                                    {course.tees && (getAllTees(course).length > 0) && (
                                        <div className="text-xs text-[var(--masters)] mt-1">
                                            {getAllTees(course).length} tee{getAllTees(course).length !== 1 ? 's' : ''} available
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
                    <p>No courses found for &quot;{query}&quot;</p>
                    <p className="text-sm mt-1">Try a different search term</p>
                </div>
            )}

            {!query && (
                <div className="text-center py-8 text-[var(--ink-secondary)]">
                    <Database className="w-10 h-10 mx-auto mb-2 opacity-50 text-[var(--ink-tertiary)]" />
                    <p className="text-sm">Search thousands of golf courses worldwide</p>
                </div>
            )}
        </div>
    );
}

function TeeOption({ tee, onSelect }: { tee: GolfCourseAPITee; onSelect: () => void }) {
    const hasHoleData = tee.holes && tee.holes.length > 0;

    return (
        <button
            onClick={onSelect}
            className={cn(
                "w-full p-3 text-left border rounded-lg hover:border-[var(--masters)] transition-colors",
                hasHoleData
                    ? "bg-[var(--surface-raised)] border-[var(--rule)]"
                    : "bg-[var(--surface-secondary)] border-[var(--rule)]"
            )}
        >
            <div className="flex items-center justify-between">
                <div>
                    <div className="font-medium text-[var(--ink-primary)]">{tee.tee_name}</div>
                    <div className="text-sm text-[var(--ink-secondary)]">
                        {tee.total_yards?.toLocaleString()} yards • Par {tee.par_total} • Rating {tee.course_rating}/{tee.slope_rating}
                    </div>
                    {!hasHoleData && (
                        <div className="text-xs text-[var(--warning)] mt-1">
                            No hole-by-hole data
                        </div>
                    )}
                </div>
                <ChevronRight className="w-5 h-5 text-[var(--ink-tertiary)]" />
            </div>
        </button>
    );
}

export default CourseSearch;
