/**
 * Course Library Sync Service
 *
 * Synchronizes the local course library (IndexedDB) with Supabase.
 * Provides:
 * - Automatic sync when courses are created/updated locally
 * - Pull from cloud to get shared courses
 * - Deduplication based on course name/location
 */

import { v4 as uuidv4 } from 'uuid';
import { supabase, isSupabaseConfigured } from '../supabase/client';
import { db } from '../db';
import type { CourseProfile, TeeSetProfile } from '../types/courseProfile';

// ============================================
// TYPES
// ============================================

export interface CourseLibraryRecord {
    id: string;
    name: string;
    location: string | null;
    city: string | null;
    state: string | null;
    country: string;
    latitude: number | null;
    longitude: number | null;
    phone: string | null;
    website: string | null;
    notes: string | null;
    source: string;
    api_course_id: string | null;
    is_verified: boolean;
    usage_count: number;
    last_used_at: string | null;
    created_at: string;
    updated_at: string;
    created_by: string | null;
}

export interface CourseLibraryTeeSetRecord {
    id: string;
    course_library_id: string;
    name: string;
    color: string | null;
    color_hex: string | null;
    gender: string;
    rating: number | null;
    slope: number | null;
    par: number;
    total_yardage: number | null;
    hole_pars: number[];
    hole_handicaps: number[] | null;
    hole_yardages: number[] | null;
    created_at: string;
    updated_at: string;
}

export interface CourseSyncResult {
    success: boolean;
    courseId: string;
    cloudId?: string;
    error?: string;
}

export interface BulkSyncResult {
    success: boolean;
    synced: number;
    failed: number;
    errors: string[];
}

// Helper to access tables with any typing (Supabase types may not include our new tables)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getTable(name: string): any {
    if (!supabase) throw new Error('Supabase not configured');
    return supabase.from(name);
}

// ============================================
// SYNC TO CLOUD
// ============================================

/**
 * Save a course to the cloud database
 * Called automatically when a course is added to the local library
 */
export async function syncCourseToCloud(
    courseProfile: CourseProfile,
    teeSetProfiles: TeeSetProfile[],
    source: 'user' | 'ocr' | 'api' | 'import' = 'user'
): Promise<CourseSyncResult> {
    if (!isSupabaseConfigured || !supabase) {
        // Store locally only - will sync when online
        return { success: true, courseId: courseProfile.id };
    }

    try {
        // Check if course already exists in cloud by name (case-insensitive)
        const { data: existing } = await getTable('course_library')
            .select('id')
            .ilike('name', courseProfile.name)
            .maybeSingle();

        let cloudCourseId: string;

        if (existing) {
            // Course exists - update it
            cloudCourseId = existing.id;
            await getTable('course_library')
                .update({
                    location: courseProfile.location || null,
                    notes: courseProfile.notes || null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', cloudCourseId);
        } else {
            // Insert new course
            cloudCourseId = courseProfile.id;
            const courseData = {
                id: cloudCourseId,
                name: courseProfile.name,
                location: courseProfile.location || null,
                notes: courseProfile.notes || null,
                source,
                created_at: courseProfile.createdAt,
                updated_at: new Date().toISOString(),
            };

            const { error: insertError } = await getTable('course_library').insert(courseData);

            if (insertError) {
                throw new Error(`Failed to insert course: ${insertError.message}`);
            }
        }

        // Sync tee sets
        for (const teeSet of teeSetProfiles) {
            // Check if tee set exists
            const { data: existingTee } = await getTable('course_library_tee_sets')
                .select('id')
                .eq('course_library_id', cloudCourseId)
                .ilike('name', teeSet.name)
                .maybeSingle();

            const teeSetData = {
                id: existingTee?.id || teeSet.id,
                course_library_id: cloudCourseId,
                name: teeSet.name,
                color: teeSet.color || null,
                rating: teeSet.rating || null,
                slope: teeSet.slope || null,
                par: teeSet.par,
                total_yardage: teeSet.totalYardage || null,
                hole_pars: teeSet.holePars || [],
                hole_handicaps: teeSet.holeHandicaps || null,
                hole_yardages: teeSet.yardages || null,
            };

            if (existingTee) {
                await getTable('course_library_tee_sets')
                    .update(teeSetData)
                    .eq('id', existingTee.id);
            } else {
                await getTable('course_library_tee_sets').insert(teeSetData);
            }
        }

        return { success: true, courseId: courseProfile.id, cloudId: cloudCourseId };
    } catch (error) {
        console.error('[CourseSync] Error syncing course to cloud:', error);
        return {
            success: false,
            courseId: courseProfile.id,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Sync all local courses to cloud
 */
export async function syncAllCoursesToCloud(): Promise<BulkSyncResult> {
    if (!isSupabaseConfigured) {
        return { success: false, synced: 0, failed: 0, errors: ['Supabase not configured'] };
    }

    const errors: string[] = [];
    let synced = 0;
    let failed = 0;

    try {
        const courses = await db.courseProfiles.toArray();

        for (const course of courses) {
            const teeSets = await db.teeSetProfiles
                .where('courseProfileId')
                .equals(course.id)
                .toArray();

            const result = await syncCourseToCloud(course, teeSets);
            if (result.success) {
                synced++;
            } else {
                failed++;
                errors.push(`${course.name}: ${result.error}`);
            }
        }

        return { success: errors.length === 0, synced, failed, errors };
    } catch (error) {
        return {
            success: false,
            synced,
            failed,
            errors: [...errors, error instanceof Error ? error.message : 'Unknown error'],
        };
    }
}

// ============================================
// SYNC FROM CLOUD
// ============================================

/**
 * Fetch all courses from cloud and merge into local database
 */
export async function pullCoursesFromCloud(): Promise<BulkSyncResult> {
    if (!isSupabaseConfigured || !supabase) {
        return { success: false, synced: 0, failed: 0, errors: ['Supabase not configured'] };
    }

    const errors: string[] = [];
    let synced = 0;
    let failed = 0;

    try {
        // Fetch all courses from cloud
        const { data: cloudCourses, error: coursesError } = await getTable('course_library')
            .select('*')
            .order('name');

        if (coursesError) {
            throw new Error(`Failed to fetch courses: ${coursesError.message}`);
        }

        if (!cloudCourses) {
            return { success: true, synced: 0, failed: 0, errors: [] };
        }

        for (const cloudCourse of cloudCourses as CourseLibraryRecord[]) {
            try {
                // Check if course exists locally
                const localCourse = await db.courseProfiles
                    .where('id')
                    .equals(cloudCourse.id)
                    .first();

                const courseProfile: CourseProfile = {
                    id: cloudCourse.id,
                    name: cloudCourse.name,
                    location: cloudCourse.location || undefined,
                    notes: cloudCourse.notes || undefined,
                    createdAt: cloudCourse.created_at,
                    updatedAt: cloudCourse.updated_at,
                };

                if (localCourse) {
                    // Update if cloud is newer
                    if (new Date(cloudCourse.updated_at) > new Date(localCourse.updatedAt)) {
                        await db.courseProfiles.update(cloudCourse.id, courseProfile);
                    }
                } else {
                    // Insert new course
                    await db.courseProfiles.add(courseProfile);
                }

                // Fetch and sync tee sets
                const { data: cloudTeeSets } = await getTable('course_library_tee_sets')
                    .select('*')
                    .eq('course_library_id', cloudCourse.id);

                if (cloudTeeSets) {
                    for (const cloudTee of cloudTeeSets as CourseLibraryTeeSetRecord[]) {
                        const teeSetProfile: TeeSetProfile = {
                            id: cloudTee.id,
                            courseProfileId: cloudCourse.id,
                            name: cloudTee.name,
                            color: cloudTee.color || undefined,
                            rating: cloudTee.rating ?? 72.0,
                            slope: cloudTee.slope ?? 113,
                            par: cloudTee.par,
                            holePars: cloudTee.hole_pars || [],
                            holeHandicaps: cloudTee.hole_handicaps || [],
                            yardages: cloudTee.hole_yardages || [],
                            totalYardage: cloudTee.total_yardage || undefined,
                            createdAt: cloudTee.created_at,
                            updatedAt: cloudTee.updated_at,
                        };

                        const existingTee = await db.teeSetProfiles
                            .where('id')
                            .equals(cloudTee.id)
                            .first();

                        if (existingTee) {
                            await db.teeSetProfiles.put(teeSetProfile);
                        } else {
                            await db.teeSetProfiles.add(teeSetProfile);
                        }
                    }
                }

                synced++;
            } catch (err) {
                failed++;
                errors.push(`${cloudCourse.name}: ${err}`);
            }
        }

        return { success: errors.length === 0, synced, failed, errors };
    } catch (error) {
        return {
            success: false,
            synced,
            failed,
            errors: [...errors, error instanceof Error ? error.message : 'Unknown error'],
        };
    }
}

/**
 * Search cloud course library by name
 */
export async function searchCloudCourses(query: string): Promise<CourseLibraryRecord[]> {
    if (!isSupabaseConfigured || !supabase) {
        return [];
    }

    try {
        const { data, error } = await getTable('course_library')
            .select('*')
            .ilike('name', `%${query}%`)
            .order('usage_count', { ascending: false })
            .limit(20);

        if (error) {
            console.error('[CourseSync] Search error:', error);
            return [];
        }

        return (data || []) as CourseLibraryRecord[];
    } catch {
        return [];
    }
}

/**
 * Get cloud course with tee sets by ID
 */
export async function getCloudCourse(courseId: string): Promise<{
    course: CourseLibraryRecord;
    teeSets: CourseLibraryTeeSetRecord[];
} | null> {
    if (!isSupabaseConfigured || !supabase) {
        return null;
    }

    try {
        const { data: course, error: courseError } = await getTable('course_library')
            .select('*')
            .eq('id', courseId)
            .single();

        if (courseError || !course) {
            return null;
        }

        const { data: teeSets } = await getTable('course_library_tee_sets')
            .select('*')
            .eq('course_library_id', courseId);

        return {
            course: course as CourseLibraryRecord,
            teeSets: (teeSets || []) as CourseLibraryTeeSetRecord[]
        };
    } catch {
        return null;
    }
}

/**
 * Increment usage count when a course is used
 */
export async function incrementCourseUsage(courseId: string): Promise<void> {
    if (!isSupabaseConfigured || !supabase) {
        return;
    }

    try {
        // Get current count and increment
        const { data: course } = await getTable('course_library')
            .select('usage_count')
            .eq('id', courseId)
            .single();

        if (course) {
            await getTable('course_library')
                .update({
                    usage_count: (course.usage_count || 0) + 1,
                    last_used_at: new Date().toISOString(),
                })
                .eq('id', courseId);
        }
    } catch {
        // Silently fail - not critical
    }
}

// ============================================
// EXPORT: Enhanced createCourseProfile with sync
// ============================================

/**
 * Create a new course profile and sync to cloud
 * This wraps the local courseLibraryService.createCourseProfile
 */
export async function createAndSyncCourseProfile(
    data: Omit<CourseProfile, 'id' | 'createdAt' | 'updatedAt'>,
    teeSets?: Omit<TeeSetProfile, 'id' | 'courseProfileId' | 'createdAt' | 'updatedAt'>[],
    source: 'user' | 'ocr' | 'api' | 'import' = 'user'
): Promise<CourseProfile> {
    const now = new Date().toISOString();
    const profileId = uuidv4();

    const profile: CourseProfile = {
        id: profileId,
        name: data.name,
        location: data.location,
        notes: data.notes,
        createdAt: now,
        updatedAt: now,
    };

    const teeSetProfiles: TeeSetProfile[] = (teeSets || []).map((ts) => ({
        id: uuidv4(),
        courseProfileId: profileId,
        name: ts.name,
        color: ts.color,
        rating: ts.rating,
        slope: ts.slope,
        par: ts.par,
        holePars: ts.holePars,
        holeHandicaps: ts.holeHandicaps,
        yardages: ts.yardages,
        totalYardage: ts.totalYardage,
        createdAt: now,
        updatedAt: now,
    }));

    // Save locally
    await db.transaction('rw', [db.courseProfiles, db.teeSetProfiles], async () => {
        await db.courseProfiles.add(profile);
        if (teeSetProfiles.length > 0) {
            await db.teeSetProfiles.bulkAdd(teeSetProfiles);
        }
    });

    // Sync to cloud (async, don't wait)
    syncCourseToCloud(profile, teeSetProfiles, source).catch((err) => {
        console.error('[CourseSync] Background sync failed:', err);
    });

    return profile;
}
