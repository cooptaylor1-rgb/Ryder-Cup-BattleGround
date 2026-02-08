/**
 * Scoring Mode Coverage Tests
 *
 * Verifies that every format in FORMAT_CONFIGS has a valid scoringMode
 * and that values are appropriate for each format's handicapMethod.
 */

import { describe, it, expect } from 'vitest';
import { FORMAT_CONFIGS, getFormatConfig } from '@/lib/types/matchFormats';
import type { MatchFormat } from '@/lib/types/matchFormats';

const ALL_FORMAT_IDS = Object.keys(FORMAT_CONFIGS) as MatchFormat[];

describe('scoringMode coverage', () => {
    it('every format has a scoringMode', () => {
        for (const id of ALL_FORMAT_IDS) {
            const config = getFormatConfig(id);
            expect(config.scoringMode, `${id} missing scoringMode`).toBeDefined();
            expect(['net', 'gross', 'both']).toContain(config.scoringMode);
        }
    });

    it('formats with handicapMethod "none" are gross-only', () => {
        const noHandicap = ALL_FORMAT_IDS.filter(
            id => FORMAT_CONFIGS[id].handicapMethod === 'none'
        );
        for (const id of noHandicap) {
            expect(
                FORMAT_CONFIGS[id].scoringMode,
                `${id} has no handicap but scoringMode is not 'gross'`
            ).toBe('gross');
        }
    });

    it('net-stroke-play is net-only', () => {
        expect(FORMAT_CONFIGS['net-stroke-play'].scoringMode).toBe('net');
    });

    it('modified-stableford is gross-only', () => {
        expect(FORMAT_CONFIGS['modified-stableford'].scoringMode).toBe('gross');
    });

    it('most match play formats support both', () => {
        const matchPlayIds: MatchFormat[] = [
            'singles', 'fourball', 'foursomes', 'greensomes', 'pinehurst'
        ];
        for (const id of matchPlayIds) {
            expect(FORMAT_CONFIGS[id].scoringMode, `${id}`).toBe('both');
        }
    });

    it('skins supports both net and gross', () => {
        expect(FORMAT_CONFIGS['skins'].scoringMode).toBe('both');
    });

    it('progressive formats support both', () => {
        const progressive: MatchFormat[] = ['one-two-three', 'cha-cha-cha', 'irish-fourball'];
        for (const id of progressive) {
            expect(FORMAT_CONFIGS[id].scoringMode, `${id}`).toBe('both');
        }
    });

    it('total format count is 41', () => {
        expect(ALL_FORMAT_IDS.length).toBe(41);
    });
});
