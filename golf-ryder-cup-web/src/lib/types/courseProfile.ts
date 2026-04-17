/**
 * Course Profile Types
 *
 * Reusable course profiles stored independently from trips.
 * Allows saving and reusing course data across multiple trips.
 */

import type { UUID, ISODateString } from './models';

/**
 * Course profile - stored independently from trips
 */
export interface CourseProfile {
    id: UUID;
    name: string;
    location?: string;
    notes?: string;
    sourceUrl?: string;
    canonicalKey?: string;
    createdAt: ISODateString;
    updatedAt: ISODateString;
}

/**
 * Tee set profile - part of a course profile
 */
export interface TeeSetProfile {
    id: UUID;
    courseProfileId: UUID;
    name: string;
    color?: string;
    rating: number;
    slope: number;
    par: number;
    /** Par for each hole. Length equals the course's hole count (typically 18, but short courses may be 9-17). */
    holePars: number[];
    /** Handicap rank per hole, 1 = hardest. Values must be 1..holePars.length with each appearing exactly once. */
    holeHandicaps: number[];
    /** Yardage for each hole. Length should match holePars.length when provided. */
    yardages?: number[];
    totalYardage?: number;
    createdAt: ISODateString;
    updatedAt: ISODateString;
}

/**
 * Default hole pars (par 72 course)
 */
export const DEFAULT_HOLE_PARS: number[] = [
    4, 4, 4, 3, 5, 4, 4, 3, 5, // Front 9 = 36
    4, 4, 4, 3, 5, 4, 4, 3, 5, // Back 9 = 36
];

/**
 * Default hole handicaps (typical distribution)
 */
export const DEFAULT_HOLE_HANDICAPS: number[] = [
    7, 15, 3, 11, 1, 9, 13, 17, 5,  // Front 9
    8, 16, 4, 12, 2, 10, 14, 18, 6, // Back 9
];

/**
 * Calculate total par from hole pars
 */
export function calculateTotalPar(holePars: number[]): number {
    return holePars.reduce((sum, par) => sum + par, 0);
}

/**
 * Validate hole handicaps — each value 1..N must appear exactly once,
 * where N is the number of holes (typically 18 but may be less for
 * short courses like par-3 loops).
 */
export function validateHoleHandicaps(handicaps: number[]): boolean {
    const count = handicaps.length;
    if (count < 1) return false;
    const sorted = [...handicaps].sort((a, b) => a - b);
    for (let i = 0; i < count; i++) {
        if (sorted[i] !== i + 1) return false;
    }
    return true;
}

/**
 * Validate hole pars. Par 3-6 is accepted to allow par-3 courses and the
 * occasional par-6 hole. The array length is not constrained here — short
 * courses may have fewer than 18 holes.
 */
export function validateHolePars(pars: number[]): boolean {
    if (pars.length < 1) return false;
    return pars.every(par => par >= 3 && par <= 6);
}
