/**
 * API Input Validation Schemas
 *
 * Centralized Zod schemas for all API route input validation.
 * Provides type-safe parsing and descriptive error messages.
 */

import { z } from 'zod';
import { NextResponse } from 'next/server';

// ============================================
// COMMON SCHEMAS
// ============================================

/**
 * UUID v4 validation
 */
export const uuidSchema = z.string().uuid('Invalid UUID format');

/**
 * ISO timestamp validation
 */
export const isoTimestampSchema = z.string().datetime({ message: 'Invalid ISO timestamp' });

/**
 * Positive integer validation
 */
export const positiveIntSchema = z.number().int().positive();

/**
 * Hole number validation (1-18)
 */
export const holeNumberSchema = z.number().int().min(1).max(18, 'Hole number must be 1-18');

// ============================================
// SCORE SYNC SCHEMAS
// ============================================

/**
 * Individual scoring event
 */
export const scoringEventSchema = z.object({
    id: uuidSchema,
    type: z.string().min(1, 'Event type is required'),
    holeNumber: holeNumberSchema.optional(),
    data: z.record(z.string(), z.unknown()),
    timestamp: isoTimestampSchema,
});

/**
 * Score sync payload
 */
export const scoreSyncPayloadSchema = z.object({
    matchId: uuidSchema.describe('matchId is required'),
    tripId: uuidSchema.optional().describe('tripId for authorization'),
    events: z.array(scoringEventSchema).describe('events array is required'),
});

export type ScoreSyncPayload = z.infer<typeof scoreSyncPayloadSchema>;
export type ScoringEvent = z.infer<typeof scoringEventSchema>;

// ============================================
// GOLF COURSE API SCHEMAS
// ============================================

/**
 * Golf course search parameters
 */
export const courseSearchParamsSchema = z.object({
    action: z.enum(['search', 'get', 'check'], {
        message: 'Action must be search, get, or check',
    }),
    q: z.string().min(2, 'Search query must be at least 2 characters').optional(),
    id: z.string().uuid('Invalid course ID').optional(),
}).refine(
    (data) => {
        if (data.action === 'search') return !!data.q;
        if (data.action === 'get') return !!data.id;
        return true; // 'check' doesn't need params
    },
    { message: 'search requires q parameter, get requires id parameter' }
);

export type CourseSearchParams = z.infer<typeof courseSearchParamsSchema>;

/**
 * Golf course discovery search parameters
 */
export const golfCourseDiscoverySearchSchema = z.object({
    q: z.string().trim().min(2, 'Search query must be at least 2 characters').max(100, 'Search query is too long'),
    state: z.string().trim().min(2, 'State filter must be at least 2 characters').max(50, 'State filter is too long').optional(),
    limit: z.coerce.number().int('Limit must be a whole number').min(1, 'Limit must be at least 1').max(50, 'Limit must be 50 or fewer').default(20),
});

export type GolfCourseDiscoverySearch = z.infer<typeof golfCourseDiscoverySearchSchema>;

/**
 * Golf course details route parameters
 */
export const golfCourseDetailsParamsSchema = z.object({
    courseId: z
        .string()
        .trim()
        .min(1, 'Course ID is required')
        .max(200, 'Course ID is too long')
        .regex(/^[A-Za-z0-9-]+$/, 'Course ID contains invalid characters'),
});

export type GolfCourseDetailsParams = z.infer<typeof golfCourseDetailsParamsSchema>;

// ============================================
// COURSE LIBRARY SCHEMAS
// ============================================

/**
 * Course library search query
 */
export const courseLibrarySearchSchema = z.object({
    q: z.string().min(2, 'Search query must be at least 2 characters'),
});

/**
 * Course library get request
 */
export const courseLibraryGetSchema = z.object({
    courseId: uuidSchema,
});

export type CourseLibrarySearch = z.infer<typeof courseLibrarySearchSchema>;
export type CourseLibraryGet = z.infer<typeof courseLibraryGetSchema>;

// ============================================
// SCORECARD OCR SCHEMAS
// ============================================

/**
 * Supported image MIME types
 */
const imageMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;

/**
 * Individual image data for OCR
 */
export const ocrImageDataSchema = z.object({
    image: z.string().min(100, 'Image data appears too short - ensure base64 encoding'),
    mimeType: z.enum(imageMimeTypes, {
        message: 'Unsupported image type. Use JPEG, PNG, WebP, or GIF.',
    }),
    label: z.enum(['front', 'back', 'ratings', 'full']).optional(),
});

/**
 * OCR request body
 */
export const ocrRequestSchema = z.object({
    image: z.string().min(100).optional(),
    mimeType: z.enum(imageMimeTypes).optional(),
    images: z.array(ocrImageDataSchema).max(5, 'Maximum 5 images allowed').optional(),
    provider: z.enum(['claude', 'openai', 'auto']).optional().default('auto'),
}).refine(
    (data) => !!(data.image || (data.images && data.images.length > 0)),
    { message: 'Either image or images array must be provided' }
).refine(
    (data) => {
        if (data.image && !data.mimeType) return false;
        return true;
    },
    { message: 'mimeType is required when image is provided' }
);

export type OcrRequest = z.infer<typeof ocrRequestSchema>;
export type OcrImageData = z.infer<typeof ocrImageDataSchema>;

// ============================================
// VALIDATION HELPERS
// ============================================

/**
 * Parse and validate request body with Zod schema.
 * Returns parsed data or a NextResponse error.
 */
export function parseBody<T>(
    schema: z.ZodSchema<T>,
    data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError<T> } {
    const result = schema.safeParse(data);
    if (result.success) {
        return { success: true, data: result.data };
    }
    return { success: false, error: result.error };
}

/**
 * Format Zod errors into a user-friendly message
 */
export function formatZodError(error: z.ZodError<unknown>): string {
    const issues = error.issues || [];
    return issues
        .map((e) => {
            const path = e.path.length > 0 ? `${e.path.join('.')}: ` : '';
            return `${path}${e.message}`;
        })
        .join('; ');
}

/**
 * Create a standardized validation error response
 */
export function validationErrorResponse(error: z.ZodError<unknown>) {
    const issues = error.issues || [];
    return NextResponse.json(
        {
            error: 'Validation failed',
            details: formatZodError(error),
            issues: issues.map((e) => ({
                path: e.path,
                message: e.message,
                code: e.code,
            })),
        },
        { status: 400 }
    );
}
