/**
 * Course Library Sync Service (Production Quality)
 *
 * Synchronizes the local course library (IndexedDB) with Supabase.
 *
 * Features:
 * - Offline-first with queue-based sync
 * - Exponential backoff retry (up to 5 attempts)
 * - Batch upsert operations (reduces N+1 queries)
 * - Network reconnection detection
 * - Device ID tracking for RLS
 * - Sync status tracking per course
 * - Deduplication based on course name
 */

import { v4 as uuidv4 } from 'uuid';
import { supabase, isSupabaseConfigured } from '../supabase/client';
import { db, type CourseSyncQueueEntry } from '../db';
import type { CourseProfile, TeeSetProfile } from '../types/courseProfile';

// ============================================
// CONSTANTS
// ============================================

const MAX_RETRY_COUNT = 5;
const BASE_RETRY_DELAY_MS = 1000;
const MAX_RETRY_DELAY_MS = 30000;
const BATCH_SIZE = 50;
const SYNC_DEBOUNCE_MS = 2000;

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
    queued?: boolean;
}

export interface BulkSyncResult {
    success: boolean;
    synced: number;
    failed: number;
    queued: number;
    errors: string[];
}

export type SyncStatus = 'synced' | 'pending' | 'syncing' | 'failed' | 'offline';

// ============================================
// DEVICE ID MANAGEMENT
// ============================================

const DEVICE_ID_KEY = 'golf_ryder_cup_device_id';

/**
 * Get or create a persistent device ID for tracking course ownership
 */
export function getDeviceId(): string {
    if (typeof window === 'undefined') return 'server';

    let deviceId = localStorage.getItem(DEVICE_ID_KEY);
    if (!deviceId) {
        deviceId = uuidv4();
        localStorage.setItem(DEVICE_ID_KEY, deviceId);
    }
    return deviceId;
}

// ============================================
// NETWORK STATUS
// ============================================

let isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
let syncInProgress = false;
let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Initialize network listeners for automatic sync on reconnect
 */
export function initNetworkListeners(): void {
    if (typeof window === 'undefined') return;

    window.addEventListener('online', () => {
        isOnline = true;
        console.log('[CourseSync] Network online - triggering sync');
        debouncedProcessQueue();
    });

    window.addEventListener('offline', () => {
        isOnline = false;
        console.log('[CourseSync] Network offline - queuing syncs');
    });

    // Initial check
    isOnline = navigator.onLine;
}

/**
 * Check if we're online and Supabase is configured
 */
function canSync(): boolean {
    return isOnline && isSupabaseConfigured && !!supabase;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getTable(name: string): any {
    if (!supabase) throw new Error('Supabase not configured');
    return supabase.from(name);
}

/**
 * Calculate exponential backoff delay
 */
function getRetryDelay(retryCount: number): number {
    const delay = Math.min(
        BASE_RETRY_DELAY_MS * Math.pow(2, retryCount),
        MAX_RETRY_DELAY_MS
    );
    // Add jitter (±20%)
    return delay * (0.8 + Math.random() * 0.4);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

// ============================================
// SYNC QUEUE MANAGEMENT
// ============================================

/**
 * Add a course to the sync queue
 */
export async function queueCourseSync(
    courseProfileId: string,
    source: 'user' | 'ocr' | 'api' | 'import' = 'user'
): Promise<void> {
    // Check if already queued
    const existing = await db.courseSyncQueue
        .where('courseProfileId')
        .equals(courseProfileId)
        .and((item) => item.status === 'pending' || item.status === 'syncing')
        .first();

    if (existing) {
        console.log(`[CourseSync] Course ${courseProfileId} already in queue`);
        return;
    }

    const entry: CourseSyncQueueEntry = {
        courseProfileId,
        source,
        status: 'pending',
        retryCount: 0,
        createdAt: new Date().toISOString(),
    };

    await db.courseSyncQueue.add(entry);
    console.log(`[CourseSync] Queued course ${courseProfileId} for sync`);

    // Trigger sync if online
    if (canSync()) {
        debouncedProcessQueue();
    }
}

/**
 * Debounced queue processor to batch nearby sync requests
 */
function debouncedProcessQueue(): void {
    if (syncDebounceTimer) {
        clearTimeout(syncDebounceTimer);
    }
    syncDebounceTimer = setTimeout(() => {
        processQueue().catch((err) => {
            console.error('[CourseSync] Queue processing error:', err);
        });
    }, SYNC_DEBOUNCE_MS);
}

/**
 * Process the sync queue
 */
export async function processQueue(): Promise<BulkSyncResult> {
    if (!canSync()) {
        return {
            success: false,
            synced: 0,
            failed: 0,
            queued: 0,
            errors: ['Offline or Supabase not configured'],
        };
    }

    if (syncInProgress) {
        console.log('[CourseSync] Sync already in progress');
        return { success: true, synced: 0, failed: 0, queued: 0, errors: [] };
    }

    syncInProgress = true;
    let synced = 0;
    let failed = 0;
    const errors: string[] = [];

    try {
        // Get pending items (limit batch size)
        const pendingItems = await db.courseSyncQueue
            .where('status')
            .equals('pending')
            .limit(BATCH_SIZE)
            .toArray();

        // Also retry failed items that haven't exceeded max retries
        const failedItems = await db.courseSyncQueue
            .where('status')
            .equals('failed')
            .and((item) => item.retryCount < MAX_RETRY_COUNT)
            .limit(BATCH_SIZE - pendingItems.length)
            .toArray();

        const itemsToProcess = [...pendingItems, ...failedItems];

        if (itemsToProcess.length === 0) {
            return { success: true, synced: 0, failed: 0, queued: 0, errors: [] };
        }

        console.log(`[CourseSync] Processing ${itemsToProcess.length} queued items`);

        for (const item of itemsToProcess) {
            // Mark as syncing
            await db.courseSyncQueue.update(item.queueId!, {
                status: 'syncing',
                lastAttemptAt: new Date().toISOString(),
            });

            // Get course and tee sets from local DB
            const course = await db.courseProfiles.get(item.courseProfileId);
            if (!course) {
                await db.courseSyncQueue.update(item.queueId!, {
                    status: 'failed',
                    lastError: 'Course not found in local database',
                    retryCount: MAX_RETRY_COUNT, // Don't retry
                });
                failed++;
                errors.push(`Course ${item.courseProfileId}: Not found locally`);
                continue;
            }

            const teeSets = await db.teeSetProfiles
                .where('courseProfileId')
                .equals(item.courseProfileId)
                .toArray();

            // Attempt sync with retry
            const result = await syncCourseToCloudWithRetry(
                course,
                teeSets,
                item.source,
                item.retryCount
            );

            if (result.success) {
                await db.courseSyncQueue.update(item.queueId!, {
                    status: 'completed',
                    completedAt: new Date().toISOString(),
                });
                synced++;
            } else {
                const newRetryCount = item.retryCount + 1;
                await db.courseSyncQueue.update(item.queueId!, {
                    status: newRetryCount >= MAX_RETRY_COUNT ? 'failed' : 'pending',
                    lastError: result.error,
                    retryCount: newRetryCount,
                });

                if (newRetryCount >= MAX_RETRY_COUNT) {
                    failed++;
                    errors.push(`${course.name}: ${result.error} (max retries exceeded)`);
                }
            }
        }

        // Clean up old completed entries (keep last 100)
        const completedCount = await db.courseSyncQueue.where('status').equals('completed').count();

        if (completedCount > 100) {
            const oldCompleted = await db.courseSyncQueue
                .where('status')
                .equals('completed')
                .sortBy('completedAt');

            const toDelete = oldCompleted.slice(0, completedCount - 100);
            await db.courseSyncQueue.bulkDelete(toDelete.map((e) => e.queueId!));
        }

        const remainingQueued = await db.courseSyncQueue
            .where('status')
            .anyOf(['pending', 'syncing'])
            .count();

        return { success: errors.length === 0, synced, failed, queued: remainingQueued, errors };
    } finally {
        syncInProgress = false;
    }
}

/**
 * Get sync status for a course
 */
export async function getCourseSyncStatus(courseProfileId: string): Promise<SyncStatus> {
    if (!isOnline) return 'offline';

    const queueEntry = await db.courseSyncQueue
        .where('courseProfileId')
        .equals(courseProfileId)
        .last();

    if (!queueEntry) return 'synced'; // Never queued = assume synced or local-only

    switch (queueEntry.status) {
        case 'completed':
            return 'synced';
        case 'syncing':
            return 'syncing';
        case 'pending':
            return 'pending';
        case 'failed':
            return queueEntry.retryCount >= MAX_RETRY_COUNT ? 'failed' : 'pending';
        default:
            return 'synced';
    }
}

/**
 * Get counts for sync queue by status
 */
export async function getSyncQueueStats(): Promise<{
    pending: number;
    syncing: number;
    failed: number;
    completed: number;
}> {
    const [pending, syncing, failed, completed] = await Promise.all([
        db.courseSyncQueue.where('status').equals('pending').count(),
        db.courseSyncQueue.where('status').equals('syncing').count(),
        db.courseSyncQueue
            .where('status')
            .equals('failed')
            .and((e) => e.retryCount >= MAX_RETRY_COUNT)
            .count(),
        db.courseSyncQueue.where('status').equals('completed').count(),
    ]);
    return { pending, syncing, failed, completed };
}

// ============================================
// SYNC TO CLOUD (with retry)
// ============================================

/**
 * Sync a course to cloud with exponential backoff retry
 */
async function syncCourseToCloudWithRetry(
    courseProfile: CourseProfile,
    teeSetProfiles: TeeSetProfile[],
    source: 'user' | 'ocr' | 'api' | 'import',
    currentRetry: number
): Promise<CourseSyncResult> {
    // Wait with exponential backoff if this is a retry
    if (currentRetry > 0) {
        const delay = getRetryDelay(currentRetry - 1);
        console.log(
            `[CourseSync] Retry ${currentRetry} for ${courseProfile.name}, waiting ${Math.round(delay)}ms`
        );
        await sleep(delay);
    }

    return syncCourseToCloudInternal(courseProfile, teeSetProfiles, source);
}

/**
 * Internal sync implementation with batch upsert
 */
async function syncCourseToCloudInternal(
    courseProfile: CourseProfile,
    teeSetProfiles: TeeSetProfile[],
    source: 'user' | 'ocr' | 'api' | 'import'
): Promise<CourseSyncResult> {
    if (!canSync()) {
        return { success: false, courseId: courseProfile.id, error: 'Offline', queued: true };
    }

    const deviceId = getDeviceId();

    try {
        // Check if course already exists in cloud by name (case-insensitive)
        const { data: existing, error: searchError } = await getTable('course_library')
            .select('id, created_by')
            .ilike('name', courseProfile.name)
            .maybeSingle();

        if (searchError) {
            throw new Error(`Search failed: ${searchError.message}`);
        }

        let cloudCourseId: string;

        if (existing) {
            // Course exists - update it
            cloudCourseId = existing.id;

            const { error: updateError } = await getTable('course_library')
                .update({
                    location: courseProfile.location || null,
                    notes: courseProfile.notes || null,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', cloudCourseId);

            if (updateError) {
                throw new Error(`Update failed: ${updateError.message}`);
            }
        } else {
            // Insert new course
            cloudCourseId = courseProfile.id;
            const courseData = {
                id: cloudCourseId,
                name: courseProfile.name,
                location: courseProfile.location || null,
                notes: courseProfile.notes || null,
                source,
                created_by: deviceId,
                created_at: courseProfile.createdAt,
                updated_at: new Date().toISOString(),
            };

            const { error: insertError } = await getTable('course_library').insert(courseData);

            if (insertError) {
                throw new Error(`Insert failed: ${insertError.message}`);
            }
        }

        // Batch upsert tee sets
        if (teeSetProfiles.length > 0) {
            const teeSetData = teeSetProfiles.map((teeSet) => ({
                id: teeSet.id,
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
                updated_at: new Date().toISOString(),
            }));

            const { error: upsertError } = await getTable('course_library_tee_sets').upsert(
                teeSetData,
                { onConflict: 'id' }
            );

            if (upsertError) {
                throw new Error(`Tee set upsert failed: ${upsertError.message}`);
            }
        }

        return { success: true, courseId: courseProfile.id, cloudId: cloudCourseId };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('[CourseSync] Error syncing course to cloud:', errorMessage);
        return {
            success: false,
            courseId: courseProfile.id,
            error: errorMessage,
        };
    }
}

// ============================================
// PUBLIC API
// ============================================

/**
 * Save a course to the cloud database (queued)
 * Called automatically when a course is added to the local library
 */
export async function syncCourseToCloud(
    courseProfile: CourseProfile,
    teeSetProfiles: TeeSetProfile[],
    source: 'user' | 'ocr' | 'api' | 'import' = 'user'
): Promise<CourseSyncResult> {
    // Always queue the sync (even if online) for reliability
    await queueCourseSync(courseProfile.id, source);

    // If online, also try immediate sync
    if (canSync()) {
        const result = await syncCourseToCloudInternal(courseProfile, teeSetProfiles, source);
        if (result.success) {
            // Mark queue entry as completed
            const queueEntry = await db.courseSyncQueue
                .where('courseProfileId')
                .equals(courseProfile.id)
                .last();
            if (queueEntry) {
                await db.courseSyncQueue.update(queueEntry.queueId!, {
                    status: 'completed',
                    completedAt: new Date().toISOString(),
                });
            }
        }
        return result;
    }

    return { success: true, courseId: courseProfile.id, queued: true };
}

/**
 * Sync all local courses to cloud
 */
export async function syncAllCoursesToCloud(): Promise<BulkSyncResult> {
    const errors: string[] = [];
    let queued = 0;

    try {
        const courses = await db.courseProfiles.toArray();

        for (const course of courses) {
            await queueCourseSync(course.id, 'user');
            queued++;
        }

        // Process queue
        if (canSync()) {
            return await processQueue();
        }

        return { success: true, synced: 0, failed: 0, queued, errors: [] };
    } catch (error) {
        return {
            success: false,
            synced: 0,
            failed: 0,
            queued,
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
    if (!canSync()) {
        return {
            success: false,
            synced: 0,
            failed: 0,
            queued: 0,
            errors: ['Offline or Supabase not configured'],
        };
    }

    const errors: string[] = [];
    let synced = 0;
    let failed = 0;

    try {
        // Fetch all courses with their tee sets in one query (batch)
        const { data: cloudCourses, error: coursesError } = await getTable('course_library')
            .select(
                `
                *,
                course_library_tee_sets (*)
            `
            )
            .order('name');

        if (coursesError) {
            throw new Error(`Failed to fetch courses: ${coursesError.message}`);
        }

        if (!cloudCourses || cloudCourses.length === 0) {
            return { success: true, synced: 0, failed: 0, queued: 0, errors: [] };
        }

        // Process in transaction for consistency
        await db.transaction('rw', [db.courseProfiles, db.teeSetProfiles], async () => {
            for (const cloudCourse of cloudCourses) {
                try {
                    const courseProfile: CourseProfile = {
                        id: cloudCourse.id,
                        name: cloudCourse.name,
                        location: cloudCourse.location || undefined,
                        notes: cloudCourse.notes || undefined,
                        createdAt: cloudCourse.created_at,
                        updatedAt: cloudCourse.updated_at,
                    };

                    // Check if course exists locally
                    const localCourse = await db.courseProfiles.get(cloudCourse.id);

                    if (localCourse) {
                        // Update if cloud is newer
                        if (new Date(cloudCourse.updated_at) > new Date(localCourse.updatedAt)) {
                            await db.courseProfiles.put(courseProfile);
                        }
                    } else {
                        await db.courseProfiles.add(courseProfile);
                    }

                    // Process tee sets
                    const cloudTeeSets = cloudCourse.course_library_tee_sets || [];
                    for (const cloudTee of cloudTeeSets) {
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

                        await db.teeSetProfiles.put(teeSetProfile);
                    }

                    synced++;
                } catch (err) {
                    failed++;
                    errors.push(`${cloudCourse.name}: ${err}`);
                }
            }
        });

        return { success: errors.length === 0, synced, failed, queued: 0, errors };
    } catch (error) {
        return {
            success: false,
            synced,
            failed,
            queued: 0,
            errors: [...errors, error instanceof Error ? error.message : 'Unknown error'],
        };
    }
}

/**
 * Search cloud course library by name
 */
export async function searchCloudCourses(query: string): Promise<CourseLibraryRecord[]> {
    if (!canSync()) {
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
    if (!canSync()) {
        return null;
    }

    try {
        const { data: course, error } = await getTable('course_library')
            .select(
                `
                *,
                course_library_tee_sets (*)
            `
            )
            .eq('id', courseId)
            .single();

        if (error || !course) {
            return null;
        }

        return {
            course: course as CourseLibraryRecord,
            teeSets: (course.course_library_tee_sets || []) as CourseLibraryTeeSetRecord[],
        };
    } catch {
        return null;
    }
}

/**
 * Increment usage count when a course is used
 */
export async function incrementCourseUsage(courseId: string): Promise<void> {
    if (!canSync()) {
        return;
    }

    try {
        // First try RPC for atomic increment (if available)
        if (supabase?.rpc) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const { error: rpcError } = await (supabase.rpc as any)('increment_course_usage', {
                course_id: courseId,
            });

            // If RPC succeeded, we're done
            if (!rpcError) {
                return;
            }
            // If RPC failed (e.g., function doesn't exist), fall back to update
            console.log('[CourseSync] RPC not available, using update fallback');
        }

        // Fallback: manual update
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

/**
 * Force retry all failed syncs
 */
export async function retryFailedSyncs(): Promise<BulkSyncResult> {
    // Reset failed items to pending
    const failedItems = await db.courseSyncQueue.where('status').equals('failed').toArray();

    for (const item of failedItems) {
        await db.courseSyncQueue.update(item.queueId!, {
            status: 'pending',
            retryCount: 0,
        });
    }

    return processQueue();
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

    // Save locally first (offline-first)
    await db.transaction('rw', [db.courseProfiles, db.teeSetProfiles], async () => {
        await db.courseProfiles.add(profile);
        if (teeSetProfiles.length > 0) {
            await db.teeSetProfiles.bulkAdd(teeSetProfiles);
        }
    });

    // Queue for cloud sync (non-blocking)
    syncCourseToCloud(profile, teeSetProfiles, source).catch((err) => {
        console.error('[CourseSync] Background sync failed:', err);
    });

    return profile;
}

// ============================================
// INITIALIZATION
// ============================================

/**
 * Initialize the sync service
 * Call this on app startup
 */
export function initCourseSyncService(): void {
    initNetworkListeners();

    // Process any pending items on startup (if online)
    if (canSync()) {
        setTimeout(() => {
            processQueue().catch((err) => {
                console.error('[CourseSync] Startup queue processing error:', err);
            });
        }, 3000); // Delay to let app initialize
    }
}
