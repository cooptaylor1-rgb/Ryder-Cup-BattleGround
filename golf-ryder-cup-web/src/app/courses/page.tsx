'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, MapPin, Flag, Trash2, Copy, ChevronRight, Globe, Camera, Sparkles, Plus } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { deleteCourseProfile, createCourseProfile } from '@/lib/services/courseLibraryService';
import { isGolfCourseAPIConfigured } from '@/lib/services/golfCourseAPIService';
import { CourseSearch } from '@/components/CourseSearch';
import { ScorecardUpload, type HoleData } from '@/components/course';
import type { CourseProfile, TeeSetProfile } from '@/lib/types/courseProfile';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/lib/stores';
import { NoCoursesPremiumEmpty, NoSearchResultsEmpty } from '@/components/ui';
import { BottomNav, PageHeader } from '@/components/layout';

/**
 * COURSE LIBRARY PAGE - Masters-inspired design
 *
 * Elegant course management with warm tones
 * and refined typography.
 */

function CourseCard({
    course,
    teeSets,
    onDelete,
    onSelect,
}: {
    course: CourseProfile;
    teeSets: TeeSetProfile[];
    onDelete: (id: string) => void;
    onSelect?: (course: CourseProfile) => void;
}) {
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleDelete = () => {
        onDelete(course.id);
        setShowDeleteConfirm(false);
    };

    return (
        <div className="card overflow-hidden">
            <div
                className={cn(
                    "p-4 cursor-pointer hover:bg-[var(--surface)] transition-colors",
                    onSelect && "active:bg-[var(--surface-secondary)]"
                )}
                onClick={() => onSelect?.(course)}
            >
                <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-lg bg-[color:var(--masters)]/10 flex items-center justify-center shrink-0">
                        <Flag className="w-6 h-6 text-[var(--masters)]" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-[var(--ink-primary)] truncate">{course.name}</h3>
                        {course.location && (
                            <div className="flex items-center gap-1 text-sm text-[var(--ink-secondary)] mt-1">
                                <MapPin className="w-4 h-4" />
                                <span className="truncate">{course.location}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-[var(--ink-tertiary)]">
                            <span>{teeSets.length} tee set(s)</span>
                        </div>
                    </div>
                    {onSelect && <ChevronRight className="w-5 h-5 text-[var(--ink-tertiary)]" />}
                </div>
            </div>

            {/* Tee Sets Preview */}
            {teeSets.length > 0 && (
                <div className="px-4 py-2 bg-[var(--surface-secondary)] border-t border-[color:var(--rule)]/40">
                    <div className="flex flex-wrap gap-2">
                        {teeSets.map((tee) => (
                            <span
                                key={tee.id}
                                style={{
                                    '--tee-color': tee.color || '#888',
                                } as React.CSSProperties}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-[color-mix(in_srgb,var(--tee-color),transparent_88%)] text-[var(--tee-color)]"
                            >
                                <span className="w-2 h-2 rounded-full bg-[var(--tee-color)]" />
                                {tee.name} • {tee.rating}/{tee.slope}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="px-4 py-2 bg-[var(--surface-secondary)] border-t border-[color:var(--rule)]/40 flex justify-end">
                {!showDeleteConfirm ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteConfirm(true);
                        }}
                        className="p-2 text-[var(--error)] hover:bg-[color:var(--error)]/10 rounded-lg transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                ) : (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <span className="text-sm text-[var(--ink-secondary)]">Delete?</span>
                        <button
                            onClick={handleDelete}
                            className="px-3 py-1 bg-[var(--error)] text-[var(--canvas)] text-sm rounded-lg hover:bg-[color:var(--error)]/90"
                        >
                            Yes
                        </button>
                        <button
                            onClick={() => setShowDeleteConfirm(false)}
                            className="px-3 py-1 bg-[var(--surface)] text-[var(--ink-primary)] text-sm rounded-lg border border-[color:var(--rule)]/50 hover:bg-[var(--surface-secondary)]"
                        >
                            No
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function CourseLibraryPage() {
    const router = useRouter();
    const { showToast } = useUIStore();
    const [searchQuery, setSearchQuery] = useState('');
    const [showDatabaseSearch, setShowDatabaseSearch] = useState(false);
    const [showScorecardUpload, setShowScorecardUpload] = useState(false);

    const apiConfigured = isGolfCourseAPIConfigured();

    // Load course profiles from Dexie
    const courseProfiles = useLiveQuery(
        () => db.courseProfiles.toArray(),
        [],
        []
    );

    // Load tee sets for all courses
    const teeSetProfiles = useLiveQuery(
        () => db.teeSetProfiles.toArray(),
        [],
        []
    );

    // Create a map of course ID to tee sets
    const teeSetsByCourse = new Map<string, TeeSetProfile[]>();
    teeSetProfiles.forEach(tee => {
        const existing = teeSetsByCourse.get(tee.courseProfileId) || [];
        existing.push(tee);
        teeSetsByCourse.set(tee.courseProfileId, existing);
    });

    // Filter courses by search query
    const filteredCourses = courseProfiles.filter((course) => {
        const query = searchQuery.toLowerCase();
        return (
            course.name.toLowerCase().includes(query) ||
            (course.location?.toLowerCase().includes(query) ?? false)
        );
    });

    const handleDelete = async (courseId: string) => {
        try {
            await deleteCourseProfile(courseId);
            showToast('success', 'Course deleted');
        } catch {
            showToast('error', 'Could not delete course');
        }
    };

    // Handle scorecard OCR data - creates a new course with the extracted tee set
    const handleScorecardData = useCallback(async (data: {
        courseName?: string;
        teeName?: string;
        rating?: number;
        slope?: number;
        holes: HoleData[];
    }) => {
        try {
            const totalPar = data.holes.reduce((sum, h) => sum + h.par, 0);
            const totalYardage = data.holes.reduce((sum, h) => sum + (h.yardage || 0), 0);

            // Create course with the scanned tee set
            await createCourseProfile(
                {
                    name: data.courseName || 'Scanned Course',
                    location: '',
                },
                [{
                    name: data.teeName || 'Scanned Tees',
                    color: '#2563eb',
                    rating: data.rating || 72,
                    slope: data.slope || 113,
                    par: totalPar,
                    holePars: data.holes.map(h => h.par),
                    holeHandicaps: data.holes.map(h => h.handicap),
                    totalYardage: totalYardage > 0 ? totalYardage : undefined,
                }]
            );

            showToast('success', `Course "${data.courseName || 'Scanned Course'}" created from scorecard!`);
            setShowScorecardUpload(false);
        } catch {
            showToast('error', 'Could not create course from scorecard');
        }
    }, [showToast]);

    const handleImportFromDatabase = async (courseData: {
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
    }) => {
        try {
            await createCourseProfile(
                {
                    name: courseData.name,
                    location: courseData.location,
                },
                courseData.teeSets.map(tee => ({
                    name: tee.name,
                    color: tee.color,
                    rating: tee.rating,
                    slope: tee.slope,
                    par: tee.par,
                    holePars: tee.holePars,
                    holeHandicaps: tee.holeHandicaps,
                    totalYardage: tee.yardage,
                }))
            );
            showToast('success', `${courseData.name} imported to library`);
            setShowDatabaseSearch(false);
        } catch {
            showToast('error', 'Could not import course');
        }
    };

    // Database search modal
    if (showDatabaseSearch) {
        return (
            <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
                <PageHeader
                    title="Search Courses"
                    subtitle="Course database"
                    icon={<Globe size={16} className="text-[var(--color-accent)]" />}
                    onBack={() => setShowDatabaseSearch(false)}
                />
                <main className="max-w-4xl mx-auto">
                    <CourseSearch
                        onSelectCourse={handleImportFromDatabase}
                        onClose={() => setShowDatabaseSearch(false)}
                    />
                </main>
                <BottomNav />
            </div>
        );
    }

    return (
        <div className="min-h-screen pb-nav page-premium-enter texture-grain bg-[var(--canvas)]">
            <PageHeader
                title="Course Library"
                subtitle="Reusable course profiles"
                icon={<Flag size={16} className="text-[var(--color-accent)]" />}
                onBack={() => router.back()}
            />

            <main className="max-w-4xl mx-auto p-4 space-y-4">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--ink-tertiary)]" />
                    <input
                        type="text"
                        placeholder="Search courses..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-[var(--surface-raised)] rounded-xl border border-[var(--rule)] text-[var(--ink-primary)] placeholder:text-[var(--ink-tertiary)] focus:outline-none focus:ring-2 focus:ring-gold/50 focus:border-gold"
                    />
                </div>

                {/* Info Banner */}
                <div className="bg-[color:var(--masters)]/5 border border-[color:var(--masters)]/20 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-[color:var(--masters)]/10 flex items-center justify-center shrink-0">
                            <Copy className="w-4 h-4 text-[var(--masters)]" />
                        </div>
                        <div>
                            <div className="font-medium text-[var(--masters)]">Reusable Course Profiles</div>
                            <div className="text-sm text-[var(--ink-secondary)] mt-1">
                                Save courses to your library and quickly add them to any trip.
                                Hole pars, handicaps, and tee sets are preserved.
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quick Actions */}
                {/* Featured: Scan Scorecard with AI */}
                <button
                    onClick={() => setShowScorecardUpload(true)}
                    className="w-full p-4 rounded-xl border-2 border-dashed transition-all border-[var(--masters)] bg-[linear-gradient(135deg,var(--masters-soft)_0%,transparent_100%)] hover:border-[var(--masters)] hover:bg-[var(--masters-soft)]"
                >
                    <div className="flex items-center justify-center gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[var(--radius-lg)] bg-[var(--masters)]">
                            <Camera size={24} className="text-[var(--color-accent)]" />
                        </div>
                        <div className="text-left">
                            <div className="flex items-center gap-2">
                                <span className="type-title-sm">Scan Scorecard</span>
                                <Sparkles size={14} className="text-[var(--masters)]" />
                            </div>
                            <p className="type-caption text-[var(--ink-secondary)]">
                                Upload a photo or PDF to auto-fill hole data
                            </p>
                        </div>
                    </div>
                </button>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => setShowDatabaseSearch(true)}
                        className={cn(
                            "p-4 bg-[var(--surface-raised)] rounded-xl border-2 border-dashed text-left transition-colors",
                            apiConfigured
                                ? "border-[color:var(--masters)]/40 hover:border-[var(--masters)] hover:bg-[color:var(--masters)]/10"
                                : "border-[color:var(--rule)]/50 hover:border-gold/50"
                        )}
>
                        <Globe className={cn("w-6 h-6 mb-2", apiConfigured ? "text-[var(--masters)]" : "text-[var(--ink-tertiary)]")} />
                        <div className="font-medium text-[var(--ink-primary)]">Search Database</div>
                        <div className="text-xs text-[var(--ink-secondary)] mt-1">
                            {apiConfigured ? "Import from 30,000+ courses" : "API not configured"}
                        </div>
                    </button>
                    <Link
                        href="/courses/new"
                        className="p-4 bg-[var(--surface-raised)] rounded-xl border-2 border-dashed border-[color:var(--rule)]/50 text-left hover:border-gold hover:bg-gold/5 transition-colors"
                    >
                        <Plus className="w-6 h-6 mb-2 text-[var(--ink-tertiary)]" />
                        <div className="font-medium text-[var(--ink-primary)]">Add Manually</div>
                        <div className="text-xs text-[var(--ink-secondary)] mt-1">Enter course details</div>
                    </Link>
                </div>

                {/* Scorecard Upload Modal */}
                {showScorecardUpload && (
                    <ScorecardUpload
                        onDataExtracted={handleScorecardData}
                        onClose={() => setShowScorecardUpload(false)}
                    />
                )}

                {/* Course List */}
                {filteredCourses.length > 0 ? (
                    <div className="space-y-3">
                        {filteredCourses.map((course) => (
                            <CourseCard
                                key={course.id}
                                course={course}
                                teeSets={teeSetsByCourse.get(course.id) || []}
                                onDelete={handleDelete}
                            />
                        ))}
                    </div>
                ) : searchQuery ? (
                    <NoSearchResultsEmpty
                        query={searchQuery}
                        onClear={() => setSearchQuery('')}
                    />
                ) : (
                    <NoCoursesPremiumEmpty onSearchCourses={() => setShowDatabaseSearch(true)} />
                )}
            </main>
            <BottomNav />
        </div>
    );
}
