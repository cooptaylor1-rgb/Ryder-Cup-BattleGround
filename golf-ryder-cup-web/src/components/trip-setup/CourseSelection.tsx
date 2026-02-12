'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Search,
    MapPin,
    Star,
    ChevronDown,
    ChevronUp,
    Loader2,
    X,
    Plus,
    Check,
    Mountain,
    Compass,
    TreePine,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createLogger } from '@/lib/utils/logger';
import {
    searchCourses as searchCoursesAPI,
    checkGolfCourseAPIConfigured,
    type GolfCourseAPICourse,
} from '@/lib/services/golfCourseAPIService';

const logger = createLogger('CourseSelection');

export interface CourseInfo {
    id: string;
    name: string;
    address: string;
    city: string;
    state: string;
    country: string;
    phone?: string;
    website?: string;
    rating?: number;
    slope?: number;
    par?: number;
    holes?: number;
    yardage?: number;
    teeBoxes?: TeeBox[];
    imageUrl?: string;
}

export interface TeeBox {
    name: string;
    color: string;
    rating: number;
    slope: number;
    yardage: number;
}

interface CourseSelectionProps {
    selectedCourses: CourseInfo[];
    onCoursesChange: (courses: CourseInfo[]) => void;
    maxCourses?: number;
    className?: string;
}

// Mock course data for demo (will be replaced with API)
const DEMO_COURSES: CourseInfo[] = [
    {
        id: 'pebble-beach',
        name: 'Pebble Beach Golf Links',
        address: '1700 17 Mile Drive',
        city: 'Pebble Beach',
        state: 'CA',
        country: 'USA',
        phone: '(831) 622-8723',
        website: 'pebblebeach.com',
        rating: 75.5,
        slope: 145,
        par: 72,
        holes: 18,
        yardage: 6828,
        teeBoxes: [
            { name: 'Championship', color: 'black', rating: 75.5, slope: 145, yardage: 6828 },
            { name: 'Tournament', color: 'blue', rating: 73.8, slope: 140, yardage: 6494 },
            { name: 'Regular', color: 'white', rating: 71.2, slope: 130, yardage: 6068 },
            { name: 'Forward', color: 'gold', rating: 69.5, slope: 125, yardage: 5576 },
        ],
    },
    {
        id: 'pinehurst-2',
        name: 'Pinehurst No. 2',
        address: '80 Carolina Vista Drive',
        city: 'Pinehurst',
        state: 'NC',
        country: 'USA',
        rating: 75.3,
        slope: 138,
        par: 72,
        holes: 18,
        yardage: 7588,
    },
    {
        id: 'kiawah-ocean',
        name: 'Kiawah Island Ocean Course',
        address: '1000 Ocean Course Dr',
        city: 'Kiawah Island',
        state: 'SC',
        country: 'USA',
        rating: 77.2,
        slope: 148,
        par: 72,
        holes: 18,
        yardage: 7356,
    },
];

export function CourseSelection({
    selectedCourses,
    onCoursesChange,
    maxCourses = 5,
    className,
}: CourseSelectionProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<CourseInfo[]>([]);
    const [showSearch, setShowSearch] = useState(false);
    const [_expandedCourse, _setExpandedCourse] = useState<string | null>(null);
    const [isApiConfigured, setIsApiConfigured] = useState<boolean | null>(null);

    // Check if API is configured on mount
    useEffect(() => {
        checkGolfCourseAPIConfigured().then(setIsApiConfigured);
    }, []);

    // Search with debounce - uses real API when configured, falls back to demo
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        setIsSearching(true);
        const timer = setTimeout(async () => {
            try {
                // Try real API first if configured
                if (isApiConfigured) {
                    const apiResults = await searchCoursesAPI(searchQuery);
                    const convertedResults: CourseInfo[] = apiResults.map((course: GolfCourseAPICourse) => ({
                        id: `api-${course.id}`,
                        name: course.course_name || course.club_name,
                        address: course.location.address || '',
                        city: course.location.city || '',
                        state: course.location.state || '',
                        country: course.location.country || 'USA',
                        rating: course.tees?.male?.[0]?.course_rating,
                        slope: course.tees?.male?.[0]?.slope_rating,
                        par: course.tees?.male?.[0]?.par_total,
                        yardage: course.tees?.male?.[0]?.total_yards,
                        holes: 18,
                    }));
                    setSearchResults(convertedResults);
                } else {
                    // Fallback to demo courses
                    const query = searchQuery.toLowerCase();
                    const results = DEMO_COURSES.filter(
                        c =>
                            c.name.toLowerCase().includes(query) ||
                            c.city.toLowerCase().includes(query) ||
                            c.state.toLowerCase().includes(query)
                    );
                    setSearchResults(results);
                }
            } catch (error) {
                logger.error('Course search error:', error);
                // Fallback to demo on error
                const query = searchQuery.toLowerCase();
                const results = DEMO_COURSES.filter(
                    c =>
                        c.name.toLowerCase().includes(query) ||
                        c.city.toLowerCase().includes(query) ||
                        c.state.toLowerCase().includes(query)
                );
                setSearchResults(results);
            } finally {
                setIsSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [searchQuery, isApiConfigured]);

    const addCourse = useCallback((course: CourseInfo) => {
        if (selectedCourses.length >= maxCourses) return;
        if (selectedCourses.some(c => c.id === course.id)) return;

        onCoursesChange([...selectedCourses, course]);
        setSearchQuery('');
        setShowSearch(false);
    }, [selectedCourses, onCoursesChange, maxCourses]);

    const removeCourse = useCallback((courseId: string) => {
        onCoursesChange(selectedCourses.filter(c => c.id !== courseId));
    }, [selectedCourses, onCoursesChange]);

    const reorderCourse = useCallback((courseId: string, direction: 'up' | 'down') => {
        const index = selectedCourses.findIndex(c => c.id === courseId);
        if (index === -1) return;

        const newIndex = direction === 'up' ? index - 1 : index + 1;
        if (newIndex < 0 || newIndex >= selectedCourses.length) return;

        const newCourses = [...selectedCourses];
        [newCourses[index], newCourses[newIndex]] = [newCourses[newIndex], newCourses[index]];
        onCoursesChange(newCourses);
    }, [selectedCourses, onCoursesChange]);

    return (
        <div className={cn('space-y-4', className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-[var(--masters)]" />
                        Course Selection
                    </h3>
                    <p className="text-sm text-[var(--ink-tertiary)]">
                        {selectedCourses.length} of {maxCourses} courses selected
                    </p>
                </div>
                {selectedCourses.length < maxCourses && (
                    <button
                        onClick={() => setShowSearch(true)}
                        className="btn-secondary text-sm"
                    >
                        <Plus className="w-4 h-4 mr-1" />
                        Add Course
                    </button>
                )}
            </div>

            {/* Selected courses */}
            <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                    {selectedCourses.map((course, index) => (
                        <motion.div
                            key={course.id}
                            layout
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="card overflow-hidden"
                        >
                            <div className="p-4">
                                <div className="flex items-start gap-3">
                                    {/* Day indicator */}
                                    <div className="w-10 h-10 rounded-lg bg-[color:var(--masters)]/10 flex items-center justify-center shrink-0">
                                        <span className="font-bold text-[var(--masters)]">D{index + 1}</span>
                                    </div>

                                    {/* Course info */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-medium truncate">{course.name}</h4>
                                        <p className="text-sm text-[var(--ink-tertiary)]">
                                            {course.city}, {course.state}
                                        </p>
                                        <div className="flex items-center gap-4 mt-2 text-xs text-[var(--ink-tertiary)]">
                                            {course.par && (
                                                <span className="flex items-center gap-1">
                                                    <TreePine className="w-3 h-3" />
                                                    Par {course.par}
                                                </span>
                                            )}
                                            {course.yardage && (
                                                <span className="flex items-center gap-1">
                                                    <Compass className="w-3 h-3" />
                                                    {course.yardage.toLocaleString()} yds
                                                </span>
                                            )}
                                            {course.rating && course.slope && (
                                                <span className="flex items-center gap-1">
                                                    <Mountain className="w-3 h-3" />
                                                    {course.rating}/{course.slope}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex flex-col gap-1">
                                        <button
                                            onClick={() => reorderCourse(course.id, 'up')}
                                            disabled={index === 0}
                                            className={cn(
                                                'p-1.5 rounded transition-colors',
                                                index === 0
                                                    ? 'text-[color:var(--ink-tertiary)]/40'
                                                    : 'text-[var(--ink-tertiary)] hover:bg-[var(--surface-secondary)]'
                                            )}
                                        >
                                            <ChevronUp className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => reorderCourse(course.id, 'down')}
                                            disabled={index === selectedCourses.length - 1}
                                            className={cn(
                                                'p-1.5 rounded transition-colors',
                                                index === selectedCourses.length - 1
                                                    ? 'text-[color:var(--ink-tertiary)]/40'
                                                    : 'text-[var(--ink-tertiary)] hover:bg-[var(--surface-secondary)]'
                                            )}
                                        >
                                            <ChevronDown className="w-4 h-4" />
                                        </button>
                                    </div>

                                    <button
                                        onClick={() => removeCourse(course.id)}
                                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                    >
                                        <X className="w-4 h-4 text-red-500" />
                                    </button>
                                </div>

                                {/* Tee box selector */}
                                {course.teeBoxes && course.teeBoxes.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-[var(--rule)]">
                                        <p className="text-xs font-medium text-[var(--ink-tertiary)] mb-2">Available Tees</p>
                                        <div className="flex flex-wrap gap-2">
                                            {course.teeBoxes.map(tee => (
                                                <div
                                                    key={tee.name}
                                                    className="px-2 py-1 rounded-lg bg-[var(--surface-secondary)] text-xs flex items-center gap-2"
                                                >
                                                    <div
                                                        className="w-3 h-3 rounded-full"
                                                        style={{
                                                            backgroundColor: tee.color === 'gold' ? '#D4AF37'
                                                                : tee.color === 'white' ? '#E5E7EB'
                                                                    : tee.color
                                                        }}
                                                    />
                                                    <span>{tee.name}</span>
                                                    <span className="text-[var(--ink-tertiary)]">
                                                        {tee.yardage.toLocaleString()}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>

                {/* Empty state */}
                {selectedCourses.length === 0 && (
                    <button
                        onClick={() => setShowSearch(true)}
                        className="w-full p-8 border-2 border-dashed border-[color:var(--rule)]/40 rounded-xl text-[var(--ink-tertiary)] hover:border-[var(--masters)] hover:text-[var(--masters)] transition-colors"
                    >
                        <MapPin className="w-8 h-8 mx-auto mb-2" />
                        <p className="font-medium">No courses selected</p>
                        <p className="text-sm mt-1">Search and add courses for your trip</p>
                    </button>
                )}
            </div>

            {/* Search modal */}
            <AnimatePresence>
                {showSearch && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-4"
                        onClick={() => setShowSearch(false)}
                    >
                        <motion.div
                            initial={{ opacity: 0, y: 100 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 100 }}
                            className="bg-[var(--surface-raised)] rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {/* Search header */}
                            <div className="p-4 border-b border-[var(--rule)]">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[color:var(--ink-tertiary)]/70" />
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search courses by name or location..."
                                        className="input w-full pl-10 pr-10"
                                        autoFocus
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-3 top-1/2 -translate-y-1/2"
                                        >
                                            <X className="w-4 h-4 text-[color:var(--ink-tertiary)]/70" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Results */}
                            <div className="overflow-y-auto max-h-[60vh] p-2">
                                {isSearching && (
                                    <div className="flex items-center justify-center p-8">
                                        <Loader2 className="w-6 h-6 animate-spin text-[var(--masters)]" />
                                    </div>
                                )}

                                {!isSearching && searchQuery && searchResults.length === 0 && (
                                    <div className="text-center p-8 text-[var(--ink-tertiary)]">
                                        <Search className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                        <p>No courses found</p>
                                        <p className="text-sm">Try a different search term</p>
                                    </div>
                                )}

                                {!isSearching && searchResults.map(course => {
                                    const isSelected = selectedCourses.some(c => c.id === course.id);
                                    return (
                                        <button
                                            key={course.id}
                                            onClick={() => !isSelected && addCourse(course)}
                                            disabled={isSelected}
                                            className={cn(
                                                'w-full p-3 rounded-xl text-left transition-colors mb-1',
                                                isSelected
                                                    ? 'bg-[color:var(--masters)]/10 cursor-default'
                                                    : 'hover:bg-[var(--surface-secondary)]'
                                            )}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-12 h-12 rounded-lg bg-[var(--surface-secondary)] flex items-center justify-center">
                                                    <TreePine className="w-6 h-6 text-[var(--masters)]" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium truncate">{course.name}</p>
                                                    <p className="text-sm text-[var(--ink-tertiary)]">
                                                        {course.city}, {course.state}
                                                    </p>
                                                    <div className="flex items-center gap-3 mt-1 text-xs text-[var(--ink-tertiary)]">
                                                        {course.par && <span>Par {course.par}</span>}
                                                        {course.rating && <span>{course.rating} rating</span>}
                                                        {course.slope && <span>{course.slope} slope</span>}
                                                    </div>
                                                </div>
                                                {isSelected ? (
                                                    <Check className="w-5 h-5 text-[var(--masters)]" />
                                                ) : (
                                                    <Plus className="w-5 h-5 text-[color:var(--ink-tertiary)]/70" />
                                                )}
                                            </div>
                                        </button>
                                    );
                                })}

                                {/* Show popular courses when no search */}
                                {!searchQuery && (
                                    <div>
                                        <p className="text-xs font-medium text-[var(--ink-tertiary)] px-3 py-2">
                                            Popular Courses
                                        </p>
                                        {DEMO_COURSES.map(course => {
                                            const isSelected = selectedCourses.some(c => c.id === course.id);
                                            return (
                                                <button
                                                    key={course.id}
                                                    onClick={() => !isSelected && addCourse(course)}
                                                    disabled={isSelected}
                                                    className={cn(
                                                        'w-full p-3 rounded-xl text-left transition-colors mb-1',
                                                        isSelected
                                                            ? 'bg-[color:var(--masters)]/10 cursor-default'
                                                            : 'hover:bg-[var(--surface-secondary)]'
                                                    )}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-12 h-12 rounded-lg bg-[var(--surface-secondary)] flex items-center justify-center">
                                                            <Star className="w-6 h-6 text-yellow-500" />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium truncate">{course.name}</p>
                                                            <p className="text-sm text-[var(--ink-tertiary)]">
                                                                {course.city}, {course.state}
                                                            </p>
                                                        </div>
                                                        {isSelected ? (
                                                            <Check className="w-5 h-5 text-[var(--masters)]" />
                                                        ) : (
                                                            <Plus className="w-5 h-5 text-[color:var(--ink-tertiary)]/70" />
                                                        )}
                                                    </div>
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-4 border-t border-[var(--rule)]">
                                <button
                                    onClick={() => setShowSearch(false)}
                                    className="btn-secondary w-full"
                                >
                                    Done
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default CourseSelection;
