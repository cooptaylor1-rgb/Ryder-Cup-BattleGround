'use client';

import React, { useState, useCallback } from 'react';
import { Search, MapPin, Loader2, ChevronRight, Database, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    searchCourses,
    getCourseById,
    formatCourseLocation,
    getAllTees,
    convertAPITeeToTeeSet,
    isGolfCourseAPIConfigured,
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

    const isConfigured = isGolfCourseAPIConfigured();

    const handleSearch = useCallback(async () => {
        if (!query.trim() || query.trim().length < 2) {
            setResults([]);
            return;
        }

        setIsSearching(true);
        setError(null);

        try {
            const courses = await searchCourses(query);
            setResults(courses);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Search failed');
            setResults([]);
        } finally {
            setIsSearching(false);
        }
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

    if (!isConfigured) {
        return (
            <div className="p-6 text-center">
                <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="font-semibold text-gray-900 mb-2">Course Database Not Configured</h3>
                <p className="text-sm text-gray-500 mb-4">
                    Set the <code className="bg-gray-100 px-1 rounded">NEXT_PUBLIC_GOLF_COURSE_API_KEY</code> environment variable to enable course search.
                </p>
                {onClose && (
                    <button
                        onClick={onClose}
                        className="text-sm text-augusta-green hover:underline"
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
                        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                    >
                        ← Back to search
                    </button>
                    {onClose && (
                        <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
                            <X className="w-5 h-5" />
                        </button>
                    )}
                </div>

                <div className="mb-4">
                    <h3 className="font-semibold text-lg text-gray-900">
                        {selectedCourse.course_name || selectedCourse.club_name}
                    </h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        {formatCourseLocation(selectedCourse.location)}
                    </p>
                </div>

                {allTees.length === 0 ? (
                    <div className="p-4 bg-yellow-50 rounded-lg text-yellow-800 text-sm">
                        No tee data available for this course. You can still import basic info and add tees manually.
                        <button
                            onClick={() => handleImportCourse([])}
                            className="mt-2 block w-full py-2 bg-yellow-100 hover:bg-yellow-200 rounded font-medium"
                        >
                            Import Course (No Tees)
                        </button>
                    </div>
                ) : (
                    <>
                        <p className="text-sm text-gray-600 mb-3">
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
                            className="mt-4 w-full py-3 bg-augusta-green text-white font-medium rounded-lg hover:bg-augusta-green/90"
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
                <h3 className="font-semibold text-gray-900">Search Course Database</h3>
                {onClose && (
                    <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
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
                    className="w-full px-4 py-3 pl-10 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-augusta-green/50"
                />
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <button
                    onClick={handleSearch}
                    disabled={isSearching || query.trim().length < 2}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1.5 bg-augusta-green text-white text-sm font-medium rounded-md hover:bg-augusta-green/90 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
                </button>
            </div>

            {error && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
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
                            className="w-full p-3 text-left bg-white border border-gray-200 rounded-lg hover:border-augusta-green hover:bg-augusta-green/5 transition-colors disabled:opacity-50"
                        >
                            <div className="flex items-center justify-between">
                                <div className="min-w-0 flex-1">
                                    <div className="font-medium text-gray-900 truncate">
                                        {course.course_name || course.club_name}
                                    </div>
                                    <div className="text-sm text-gray-500 flex items-center gap-1">
                                        <MapPin className="w-3 h-3 flex-shrink-0" />
                                        <span className="truncate">{formatCourseLocation(course.location)}</span>
                                    </div>
                                    {course.tees && (getAllTees(course).length > 0) && (
                                        <div className="text-xs text-augusta-green mt-1">
                                            {getAllTees(course).length} tee{getAllTees(course).length !== 1 ? 's' : ''} available
                                        </div>
                                    )}
                                </div>
                                <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {results.length === 0 && query && !isSearching && !error && (
                <div className="text-center py-8 text-gray-500">
                    <p>No courses found for "{query}"</p>
                    <p className="text-sm mt-1">Try a different search term</p>
                </div>
            )}

            {!query && (
                <div className="text-center py-8 text-gray-500">
                    <Database className="w-10 h-10 mx-auto mb-2 opacity-50" />
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
                "w-full p-3 text-left border rounded-lg hover:border-augusta-green transition-colors",
                hasHoleData ? "bg-white border-gray-200" : "bg-gray-50 border-gray-100"
            )}
        >
            <div className="flex items-center justify-between">
                <div>
                    <div className="font-medium text-gray-900">{tee.tee_name}</div>
                    <div className="text-sm text-gray-500">
                        {tee.total_yards?.toLocaleString()} yards • Par {tee.par_total} • Rating {tee.course_rating}/{tee.slope_rating}
                    </div>
                    {!hasHoleData && (
                        <div className="text-xs text-yellow-600 mt-1">
                            ⚠️ No hole-by-hole data
                        </div>
                    )}
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
        </button>
    );
}

export default CourseSearch;
