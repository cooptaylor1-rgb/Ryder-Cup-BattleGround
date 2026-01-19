/**
 * Course Library Service
 *
 * Manages reusable course profiles stored independently from trips.
 * Allows saving and reusing course data across multiple trips.
 *
 * NOTE: All courses are automatically synced to Supabase when online.
 */

import { v4 as uuidv4 } from 'uuid';
import { db } from '../db';
import type { Course, TeeSet } from '../types/models';
import type { CourseProfile, TeeSetProfile } from '../types/courseProfile';
import { syncCourseToCloud } from './courseLibrarySyncService';
import { createLogger } from '../utils/logger';

const logger = createLogger('CourseLibrary');

/**
 * Get all course profiles
 */
export async function getCourseProfiles(): Promise<CourseProfile[]> {
    return db.courseProfiles.toArray();
}

/**
 * Get a course profile by ID
 */
export async function getCourseProfile(id: string): Promise<CourseProfile | undefined> {
    return db.courseProfiles.get(id);
}

/**
 * Get tee sets for a course profile
 */
export async function getTeeSetProfiles(courseProfileId: string): Promise<TeeSetProfile[]> {
    return db.teeSetProfiles.where('courseProfileId').equals(courseProfileId).toArray();
}

/**
 * Search course profiles by name
 */
export async function searchCourseProfiles(query: string): Promise<CourseProfile[]> {
    const lowerQuery = query.toLowerCase();
    const all = await db.courseProfiles.toArray();
    return all.filter(
        (profile) =>
            profile.name.toLowerCase().includes(lowerQuery) ||
            profile.location?.toLowerCase().includes(lowerQuery)
    );
}

/**
 * Create a new course profile
 * Automatically syncs to Supabase cloud database
 */
export async function createCourseProfile(
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

    // Save locally first
    await db.transaction('rw', [db.courseProfiles, db.teeSetProfiles], async () => {
        await db.courseProfiles.add(profile);
        if (teeSetProfiles.length > 0) {
            await db.teeSetProfiles.bulkAdd(teeSetProfiles);
        }
    });

    // Sync to cloud in background (don't block UI)
    syncCourseToCloud(profile, teeSetProfiles, source).catch((err) => {
        logger.error('Background sync to cloud failed:', err);
    });

    return profile;
}

/**
 * Update a course profile
 */
export async function updateCourseProfile(
    id: string,
    data: Partial<Omit<CourseProfile, 'id' | 'createdAt'>>
): Promise<void> {
    await db.courseProfiles.update(id, {
        ...data,
        updatedAt: new Date().toISOString(),
    });
}

/**
 * Delete a course profile and its tee sets
 */
export async function deleteCourseProfile(id: string): Promise<void> {
    await db.transaction('rw', [db.courseProfiles, db.teeSetProfiles], async () => {
        await db.teeSetProfiles.where('courseProfileId').equals(id).delete();
        await db.courseProfiles.delete(id);
    });
}

/**
 * Add a tee set to a course profile
 */
export async function addTeeSetProfile(
    courseProfileId: string,
    data: Omit<TeeSetProfile, 'id' | 'courseProfileId' | 'createdAt' | 'updatedAt'>
): Promise<TeeSetProfile> {
    const now = new Date().toISOString();
    const teeSet: TeeSetProfile = {
        id: uuidv4(),
        courseProfileId,
        name: data.name,
        color: data.color,
        rating: data.rating,
        slope: data.slope,
        par: data.par,
        holePars: data.holePars,
        holeHandicaps: data.holeHandicaps,
        yardages: data.yardages,
        totalYardage: data.totalYardage,
        createdAt: now,
        updatedAt: now,
    };

    await db.teeSetProfiles.add(teeSet);
    return teeSet;
}

/**
 * Update a tee set profile
 */
export async function updateTeeSetProfile(
    id: string,
    data: Partial<Omit<TeeSetProfile, 'id' | 'courseProfileId' | 'createdAt'>>
): Promise<void> {
    await db.teeSetProfiles.update(id, {
        ...data,
        updatedAt: new Date().toISOString(),
    });
}

/**
 * Delete a tee set profile
 */
export async function deleteTeeSetProfile(id: string): Promise<void> {
    await db.teeSetProfiles.delete(id);
}

/**
 * Save a course from a trip to the library
 * Automatically syncs to Supabase cloud database
 */
export async function saveCourseToLibrary(course: Course, teeSets: TeeSet[]): Promise<CourseProfile> {
    const now = new Date().toISOString();
    const profileId = uuidv4();

    const profile: CourseProfile = {
        id: profileId,
        name: course.name,
        location: course.location,
        createdAt: now,
        updatedAt: now,
    };

    const teeSetProfiles: TeeSetProfile[] = teeSets.map((ts) => ({
        id: uuidv4(),
        courseProfileId: profileId,
        name: ts.name,
        color: ts.color,
        rating: ts.rating,
        slope: ts.slope,
        par: ts.par,
        holePars: ts.holePars || [],
        holeHandicaps: ts.holeHandicaps,
        yardages: ts.yardages,
        totalYardage: ts.totalYardage,
        createdAt: now,
        updatedAt: now,
    }));

    // Save locally first
    await db.transaction('rw', [db.courseProfiles, db.teeSetProfiles], async () => {
        await db.courseProfiles.add(profile);
        if (teeSetProfiles.length > 0) {
            await db.teeSetProfiles.bulkAdd(teeSetProfiles);
        }
    });

    // Sync to cloud in background
    syncCourseToCloud(profile, teeSetProfiles, 'user').catch((err) => {
        logger.error('Background sync to cloud failed:', err);
    });

    return profile;
}

/**
 * Create a trip course from a profile
 */
export async function createCourseFromProfile(
    profileId: string,
    options?: { tripId?: string }
): Promise<{ course: Course; teeSets: TeeSet[] }> {
    const profile = await getCourseProfile(profileId);
    if (!profile) {
        throw new Error(`Course profile not found: ${profileId}`);
    }

    const teeSetProfiles = await getTeeSetProfiles(profileId);
    const now = new Date().toISOString();
    const courseId = uuidv4();

    const course: Course = {
        id: courseId,
        name: profile.name,
        location: profile.location,
        createdAt: now,
        updatedAt: now,
    };

    const teeSets: TeeSet[] = teeSetProfiles.map((tsp) => ({
        id: uuidv4(),
        courseId,
        name: tsp.name,
        color: tsp.color,
        rating: tsp.rating,
        slope: tsp.slope,
        par: tsp.par,
        holePars: tsp.holePars,
        holeHandicaps: tsp.holeHandicaps,
        yardages: tsp.yardages,
        totalYardage: tsp.totalYardage,
        createdAt: now,
        updatedAt: now,
    }));

    await db.transaction('rw', [db.courses, db.teeSets], async () => {
        await db.courses.add(course);
        if (teeSets.length > 0) {
            await db.teeSets.bulkAdd(teeSets);
        }
    });

    return { course, teeSets };
}

/**
 * Get usage count for a course profile
 */
export async function getProfileUsageCount(profileId: string): Promise<number> {
    // Count courses with the same name as the profile
    const profile = await getCourseProfile(profileId);
    if (!profile) return 0;

    const courses = await db.courses.where('name').equals(profile.name).toArray();
    return courses.length;
}
