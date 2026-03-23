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
    /** 18 elements: par for each hole */
    holePars: number[];
    /** 18 elements: handicap rank 1-18 (1 = hardest) */
    holeHandicaps: number[];
    /** 18 elements: yardage for each hole */
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
 * Validate hole handicaps (should be 1-18, each appearing once)
 */
export function validateHoleHandicaps(handicaps: number[]): boolean {
    if (handicaps.length !== 18) return false;
    const sorted = [...handicaps].sort((a, b) => a - b);
    for (let i = 0; i < 18; i++) {
        if (sorted[i] !== i + 1) return false;
    }
    return true;
}

/**
 * Validate hole pars (should be 3-5 for each hole)
 */
export function validateHolePars(pars: number[]): boolean {
    if (pars.length !== 18) return false;
    return pars.every(par => par >= 3 && par <= 5);
}
