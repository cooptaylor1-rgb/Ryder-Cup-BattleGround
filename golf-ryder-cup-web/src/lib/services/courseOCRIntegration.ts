/**
 * Course OCR Integration Service
 *
 * Integrates OCR scorecard extraction with the cloud course library.
 * - Searches cloud for existing courses before creating new ones
 * - Fuzzy matches course names
 * - Deduplicates courses across users
 */

import { searchCloudCourses, syncCourseToCloud, type CourseLibraryRecord } from './courseLibrarySyncService';
import { db } from '../db';
import type { Course, TeeSet } from '../types/models';
import { ocrLogger } from '@/lib/utils/logger';

// ============================================
// TYPES
// ============================================

export interface OCRHoleData {
    par: number;
    handicap: number;
    yardage: number | null;
}

export interface OCRTeeSetData {
    name: string;
    color?: string;
    rating?: number;
    slope?: number;
    yardages: (number | null)[];
}

export interface OCRScorecardData {
    courseName?: string;
    teeName?: string;
    rating?: number;
    slope?: number;
    holes: OCRHoleData[];
    teeSets?: OCRTeeSetData[];
}

export interface CourseMatchResult {
    found: boolean;
    course?: Course;
    teeSets?: TeeSet[];
    confidence: number;
    source: 'cloud' | 'local' | 'new';
}

// ============================================
// MAIN FUNCTIONS
// ============================================

/**
 * Process OCR data and find/create a course
 *
 * 1. Search cloud for matching course
 * 2. If found, import and return
 * 3. If not found, create new course
 * 4. Sync new course to cloud for future matching
 */
export async function processOCRCourse(ocrData: OCRScorecardData): Promise<CourseMatchResult> {
    const courseName = ocrData.courseName?.trim();

    if (!courseName) {
        // No course name - create unnamed course locally
        return createNewCourse(ocrData, 'Unknown Course');
    }

    // Step 1: Search cloud for existing course
    ocrLogger.log(`Searching for: "${courseName}"`);
    const cloudMatches = await searchCloudCourses(courseName);

    // Step 2: Check for high-confidence match
    const bestMatch = findBestMatch(courseName, cloudMatches);

    if (bestMatch && bestMatch.confidence >= 0.8) {
        ocrLogger.log(`Found cloud match: ${bestMatch.course.name} (${bestMatch.confidence})`);
        return importFromCloud(bestMatch.course);
    }

    // Step 3: Check local database for existing course
    const localMatch = await findLocalCourse(courseName);
    if (localMatch) {
        ocrLogger.log(`Found local match: ${localMatch.name}`);
        // Merge OCR data with existing course
        return mergeWithExisting(localMatch, ocrData);
    }

    // Step 4: Create new course and sync to cloud
    ocrLogger.log(`Creating new course: ${courseName}`);
    const result = await createNewCourse(ocrData, courseName);

    // Sync to cloud asynchronously for future matching
    if (result.course) {
        syncNewCourseToCloud(result.course, result.teeSets || []).catch((err) => {
            ocrLogger.error('Failed to sync new course:', err);
        });
    }

    return result;
}

// ============================================
// MATCHING
// ============================================

interface MatchResult {
    course: CourseLibraryRecord;
    confidence: number;
}

function findBestMatch(searchName: string, courses: CourseLibraryRecord[]): MatchResult | null {
    if (courses.length === 0) return null;

    let bestMatch: MatchResult | null = null;
    const searchLower = searchName.toLowerCase();

    for (const course of courses) {
        const confidence = calculateNameSimilarity(searchLower, course.name.toLowerCase());

        if (!bestMatch || confidence > bestMatch.confidence) {
            bestMatch = { course, confidence };
        }
    }

    return bestMatch;
}

function calculateNameSimilarity(s1: string, s2: string): number {
    if (s1 === s2) return 1;

    // Exact word matching
    const words1 = s1.split(/\s+/).filter((w) => w.length > 2);
    const words2 = s2.split(/\s+/).filter((w) => w.length > 2);
    const matchingWords = words1.filter((w) => words2.includes(w));
    const wordScore = matchingWords.length / Math.max(words1.length, words2.length, 1);

    // Containment (one name contains the other)
    if (s1.includes(s2) || s2.includes(s1)) {
        return Math.max(0.75, wordScore);
    }

    // Levenshtein distance
    const maxLen = Math.max(s1.length, s2.length);
    const distance = levenshtein(s1, s2);
    const editScore = 1 - distance / maxLen;

    // Combined score
    return wordScore * 0.6 + editScore * 0.4;
}

function levenshtein(a: string, b: string): number {
    const m = a.length;
    const n = b.length;
    const dp: number[][] = Array(m + 1)
        .fill(null)
        .map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
        }
    }

    return dp[m][n];
}

// ============================================
// LOCAL DATABASE
// ============================================

async function findLocalCourse(name: string): Promise<Course | null> {
    const nameLower = name.toLowerCase();

    // Search all courses
    const courses = await db.courses.toArray();

    for (const course of courses) {
        const similarity = calculateNameSimilarity(nameLower, course.name.toLowerCase());
        if (similarity >= 0.85) {
            return course;
        }
    }

    return null;
}

// ============================================
// IMPORT FROM CLOUD
// ============================================

async function importFromCloud(cloudCourse: CourseLibraryRecord): Promise<CourseMatchResult> {
    try {
        // Get course with tee sets from cloud
        const response = await fetch(`/api/course-library/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ courseId: cloudCourse.id }),
        });

        if (!response.ok) {
            throw new Error('Failed to fetch course details');
        }

        const data = await response.json();
        const { course: fullCourse } = data;

        // Save to local database
        const now = new Date().toISOString();
        const localCourse: Course = {
            id: fullCourse.id,
            name: fullCourse.name,
            location: fullCourse.location,
            createdAt: now,
            updatedAt: now,
        };
        await db.courses.put(localCourse);

        // Save tee sets
        const localTeeSets: TeeSet[] = [];
        for (const ts of fullCourse.teeSets || []) {
            const localTeeSet: TeeSet = {
                id: ts.id,
                courseId: ts.courseId,
                name: ts.name,
                color: ts.color,
                rating: ts.rating,
                slope: ts.slope,
                par: ts.par,
                holeHandicaps: ts.holeHandicaps,
                holePars: ts.holePars,
                yardages: ts.yardages,
                totalYardage: ts.totalYardage,
                createdAt: now,
                updatedAt: now,
            };
            await db.teeSets.put(localTeeSet);
            localTeeSets.push(localTeeSet);
        }

        return {
            found: true,
            course: localCourse,
            teeSets: localTeeSets,
            confidence: 1.0,
            source: 'cloud',
        };
    } catch (error) {
        ocrLogger.error('Cloud import failed:', error);
        // Fall back to creating new course
        return {
            found: false,
            confidence: 0,
            source: 'cloud',
        };
    }
}

// ============================================
// CREATE NEW COURSE
// ============================================

async function createNewCourse(ocrData: OCRScorecardData, name: string): Promise<CourseMatchResult> {
    const courseId = crypto.randomUUID();

    // Calculate total par from holes
    const totalPar = ocrData.holes.reduce((sum, h) => sum + h.par, 0);
    const holePars = ocrData.holes.map((h) => h.par);
    const holeHandicaps = ocrData.holes.map((h) => h.handicap);

    // Create course
    const now = new Date().toISOString();
    const course: Course = {
        id: courseId,
        name,
        location: undefined,
        createdAt: now,
        updatedAt: now,
    };
    await db.courses.put(course);

    // Create tee sets
    const teeSets: TeeSet[] = [];
    const teeNow = new Date().toISOString();

    if (ocrData.teeSets && ocrData.teeSets.length > 0) {
        for (const ocrTeeSet of ocrData.teeSets) {
            const yardagesArray = ocrTeeSet.yardages.map((y) => y || 0);
            const teeSet: TeeSet = {
                id: crypto.randomUUID(),
                courseId,
                name: ocrTeeSet.name,
                color: ocrTeeSet.color,
                rating: ocrTeeSet.rating || 72.0,
                slope: ocrTeeSet.slope || 113,
                par: totalPar,
                holeHandicaps,
                holePars,
                yardages: yardagesArray,
                totalYardage: yardagesArray.reduce((sum, y) => sum + y, 0),
                createdAt: teeNow,
                updatedAt: teeNow,
            };
            await db.teeSets.put(teeSet);
            teeSets.push(teeSet);
        }
    } else {
        // Create a single default tee set from hole data
        const defaultYardages = ocrData.holes.map((h) => h.yardage || 0);
        const defaultTeeSet: TeeSet = {
            id: crypto.randomUUID(),
            courseId,
            name: ocrData.teeName || 'Default',
            color: undefined,
            rating: ocrData.rating || 72.0,
            slope: ocrData.slope || 113,
            par: totalPar,
            holeHandicaps,
            holePars,
            yardages: defaultYardages,
            totalYardage: defaultYardages.reduce((sum, y) => sum + y, 0),
            createdAt: teeNow,
            updatedAt: teeNow,
        };
        await db.teeSets.put(defaultTeeSet);
        teeSets.push(defaultTeeSet);
    }

    return {
        found: false,
        course,
        teeSets,
        confidence: 0,
        source: 'new',
    };
}

// ============================================
// MERGE WITH EXISTING
// ============================================

async function mergeWithExisting(existing: Course, ocrData: OCRScorecardData): Promise<CourseMatchResult> {
    // Get existing tee sets
    const existingTeeSets = await db.teeSets.where('courseId').equals(existing.id).toArray();

    // Add any new tee sets from OCR that don't exist
    const newTeeSets: TeeSet[] = [];
    const mergeNow = new Date().toISOString();

    if (ocrData.teeSets) {
        for (const ocrTeeSet of ocrData.teeSets) {
            const existsAlready = existingTeeSets.some(
                (t) => t.name.toLowerCase() === ocrTeeSet.name.toLowerCase()
            );

            if (!existsAlready) {
                const totalPar = ocrData.holes.reduce((sum, h) => sum + h.par, 0);
                const holePars = ocrData.holes.map((h) => h.par);
                const holeHandicaps = ocrData.holes.map((h) => h.handicap);
                const yardagesArray = ocrTeeSet.yardages.map((y) => y || 0);

                const teeSet: TeeSet = {
                    id: crypto.randomUUID(),
                    courseId: existing.id,
                    name: ocrTeeSet.name,
                    color: ocrTeeSet.color,
                    rating: ocrTeeSet.rating || 72.0,
                    slope: ocrTeeSet.slope || 113,
                    par: totalPar,
                    holeHandicaps,
                    holePars,
                    yardages: yardagesArray,
                    totalYardage: yardagesArray.reduce((sum, y) => sum + y, 0),
                    createdAt: mergeNow,
                    updatedAt: mergeNow,
                };
                await db.teeSets.put(teeSet);
                newTeeSets.push(teeSet);
            }
        }
    }

    return {
        found: true,
        course: existing,
        teeSets: [...existingTeeSets, ...newTeeSets],
        confidence: 0.85,
        source: 'local',
    };
}

// ============================================
// SYNC TO CLOUD
// ============================================

async function syncNewCourseToCloud(course: Course, teeSets: TeeSet[]): Promise<void> {
    // Use existing sync service
    const now = new Date().toISOString();

    // Convert to CourseProfile format
    const courseProfile = {
        id: course.id,
        name: course.name,
        location: course.location,
        createdAt: now,
        updatedAt: now,
    };

    // Convert TeeSet[] to TeeSetProfile[]
    const teeSetProfiles = teeSets.map((ts) => ({
        id: ts.id,
        courseProfileId: course.id,
        name: ts.name,
        color: ts.color,
        rating: ts.rating,
        slope: ts.slope,
        par: ts.par,
        holePars: ts.holePars || [],
        holeHandicaps: ts.holeHandicaps || [],
        yardages: ts.yardages,
        totalYardage: ts.totalYardage,
        createdAt: ts.createdAt || now,
        updatedAt: ts.updatedAt || now,
    }));

    await syncCourseToCloud(courseProfile, teeSetProfiles, 'ocr');
}
