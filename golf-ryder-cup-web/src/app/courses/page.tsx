'use client';

import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, MapPin, Flag, Trash2, Copy, ChevronRight, Globe, Camera, Sparkles, Plus } from 'lucide-react';
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
import { BottomNav } from '@/components/layout';

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
        <div className="bg-surface-card rounded-xl border border-surface-border shadow-card overflow-hidden">
            <div
                className={cn(
                    "p-4 cursor-pointer hover:bg-surface-highlight transition-colors",
                    onSelect && "active:bg-surface-elevated"
                )}
                onClick={() => onSelect?.(course)}
            >
                <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-lg bg-masters-green/10 flex items-center justify-center shrink-0">
                        <Flag className="w-6 h-6 text-masters-green-light" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-canvas truncate">{course.name}</h3>
                        {course.location && (
                            <div className="flex items-center gap-1 text-sm text-text-secondary mt-1">
                                <MapPin className="w-4 h-4" />
                                <span className="truncate">{course.location}</span>
                            </div>
                        )}
                        <div className="flex items-center gap-3 mt-2 text-xs text-text-tertiary">
                            <span>{teeSets.length} tee set(s)</span>
                        </div>
                    </div>
                    {onSelect && <ChevronRight className="w-5 h-5 text-text-tertiary" />}
                </div>
            </div>

            {/* Tee Sets Preview */}
            {teeSets.length > 0 && (
                <div className="px-4 py-2 bg-surface-elevated border-t border-surface-border/50">
                    <div className="flex flex-wrap gap-2">
                        {teeSets.map((tee) => (
                            <span
                                key={tee.id}
                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium"
                                style={{
                                    backgroundColor: `${tee.color || '#888'}20`,
                                    color: tee.color || '#888',
                                }}
                            >
                                <span
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: tee.color || '#888' }}
                                />
                                {tee.name} • {tee.rating}/{tee.slope}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* Actions */}
            <div className="px-4 py-2 bg-surface-elevated border-t border-surface-border/50 flex justify-end">
                {!showDeleteConfirm ? (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowDeleteConfirm(true);
                        }}
                        className="p-2 text-error hover:bg-error/10 rounded-lg transition-colors"
                    >
                        <Trash2 className="w-4 h-4" />
                    </button>
                ) : (
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <span className="text-sm text-text-secondary">Delete?</span>
                        <button
                            onClick={handleDelete}
                            className="px-3 py-1 bg-error text-white text-sm rounded-lg hover:bg-error/90"
                        >
                            Yes
                        </button>
                        <button
                            onClick={() => setShowDeleteConfirm(false)}
                            className="px-3 py-1 bg-surface-muted text-text-primary text-sm rounded-lg hover:bg-surface-highlight"
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
            <div
              className="min-h-screen pb-nav page-premium-enter texture-grain"
              style={{ background: 'var(--canvas)' }}
            >
                <header className="bg-masters-green text-canvas px-4 py-4 shadow-lg">
                    <div className="max-w-4xl mx-auto flex items-center gap-3">
                        <button
                            onClick={() => setShowDatabaseSearch(false)}
                            className="p-2 hover:bg-white/10 rounded-lg"
                        >
                            <ArrowLeft className="w-5 h-5" />
                        </button>
                        <h1 className="font-serif text-lg font-semibold">Search Course Database</h1>
                    </div>
                </header>
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
        <div
          className="min-h-screen pb-nav page-premium-enter texture-grain"
          style={{ background: 'var(--canvas)' }}
        >
            {/* Header */}
            <header className="bg-masters-green text-canvas px-4 py-4 shadow-lg">
                <div className="max-w-4xl mx-auto flex items-center gap-3">
                    <Link href="/more" className="p-2 hover:bg-white/10 rounded-lg">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <h1 className="font-serif text-lg font-semibold flex-1">Course Library</h1>
                </div>
            </header>

            <main className="max-w-4xl mx-auto p-4 space-y-4">
                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-tertiary" />
                    <input
                        type="text"
                        placeholder="Search courses..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-surface-card rounded-xl border border-surface-border text-text-primary placeholder:text-text-tertiary focus:ring-2 focus:ring-gold/50 focus:border-gold"
                    />
                </div>

                {/* Info Banner */}
                <div className="bg-masters-green/5 border border-masters-green/20 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-masters-green/10 flex items-center justify-center shrink-0">
                            <Copy className="w-4 h-4 text-masters-green-light" />
                        </div>
                        <div>
                            <div className="font-medium text-masters-green-light">Reusable Course Profiles</div>
                            <div className="text-sm text-text-secondary mt-1">
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
                    className="w-full p-4 rounded-xl border-2 border-dashed transition-all hover:border-[var(--masters)] hover:bg-[var(--masters-soft)]"
                    style={{
                        borderColor: 'var(--masters)',
                        background: 'linear-gradient(135deg, var(--masters-soft) 0%, transparent 100%)',
                    }}
                >
                    <div className="flex items-center justify-center gap-3">
                        <div
                            className="flex items-center justify-center shrink-0"
                            style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: 'var(--radius-lg)',
                                background: 'var(--masters)',
                            }}
                        >
                            <Camera size={24} style={{ color: 'var(--color-accent)' }} />
                        </div>
                        <div className="text-left">
                            <div className="flex items-center gap-2">
                                <span className="type-title-sm">Scan Scorecard</span>
                                <Sparkles size={14} style={{ color: 'var(--masters)' }} />
                            </div>
                            <p className="type-caption" style={{ color: 'var(--ink-secondary)' }}>
                                Upload a photo or PDF to auto-fill hole data
                            </p>
                        </div>
                    </div>
                </button>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => setShowDatabaseSearch(true)}
                        className={cn(
                            "p-4 bg-surface-card rounded-xl border-2 border-dashed text-left transition-colors",
                            apiConfigured
                                ? "border-masters-green/30 hover:border-masters-green hover:bg-masters-green/5"
                                : "border-surface-border hover:border-gold/50"
                        )}
                    >
                        <Globe className={cn("w-6 h-6 mb-2", apiConfigured ? "text-masters-green-light" : "text-text-tertiary")} />
                        <div className="font-medium text-canvas">Search Database</div>
                        <div className="text-xs text-text-secondary mt-1">
                            {apiConfigured ? "Import from 30,000+ courses" : "API not configured"}
                        </div>
                    </button>
                    <Link
                        href="/courses/new"
                        className="p-4 bg-surface-card rounded-xl border-2 border-dashed border-surface-border text-left hover:border-gold hover:bg-gold/5 transition-colors"
                    >
                        <Plus className="w-6 h-6 mb-2 text-text-tertiary" />
                        <div className="font-medium text-canvas">Add Manually</div>
                        <div className="text-xs text-text-secondary mt-1">Enter course details</div>
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
