/**
 * Spectator Service Tests
 *
 * Tests for spectator mode, live updates, and read-only views.
 */

import { describe, it, expect } from 'vitest';
import {
    formatSpectatorMatchScore,
    calculateProjectedScore,
    generateScoreboardText,
    buildSpectatorView,
} from '@/lib/services/spectatorService';
import type { SpectatorView } from '@/lib/types/captain';

describe('Spectator Service', () => {
    describe('formatSpectatorMatchScore', () => {
        it('should format score when halved', () => {
            const score = formatSpectatorMatchScore('halved', 0, 0);
            expect(score).toContain('Halved');
        });

        it('should format score when team A is up', () => {
            const score = formatSpectatorMatchScore('teamA', 3, 6);
            expect(score).toContain('3');
            expect(score).toContain('UP');
        });

        it('should format score when team B is up', () => {
            const score = formatSpectatorMatchScore('teamB', 2, 4);
            expect(score).toContain('2');
        });

        it('should format closed out match', () => {
            const score = formatSpectatorMatchScore('teamA', 4, 2);
            expect(score).toContain('4&2');
        });
    });

    describe('calculateProjectedScore', () => {
        it('should project final score with no live matches', () => {
            const projected = calculateProjectedScore(10, 8, []);
            expect(projected.teamA).toBe(10);
            expect(projected.teamB).toBe(8);
        });
    });



    describe('buildSpectatorView', () => {
        it('uses shared scoring logic for completed final-hole 1 UP result', () => {
            const trip = {
                id: 'trip-1',
                name: 'Trip',
                startDate: '2026-06-01',
                endDate: '2026-06-03',
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
            } as const;

            const teams = [
                { id: 't1', tripId: 'trip-1', name: 'USA', color: 'usa', createdAt: '', updatedAt: '' },
                { id: 't2', tripId: 'trip-1', name: 'EUR', color: 'europe', createdAt: '', updatedAt: '' },
            ] as const;

            const sessions = [
                {
                    id: 's1',
                    tripId: 'trip-1',
                    name: 'Singles',
                    sessionNumber: 1,
                    sessionType: 'singles',
                    isComplete: false,
                    isSessionLocked: false,
                    createdAt: '',
                    updatedAt: '',
                },
            ] as const;

            const matches = [
                {
                    id: 'm1',
                    sessionId: 's1',
                    matchOrder: 1,
                    status: 'completed',
                    currentHole: 18,
                    teamAPlayerIds: ['p1'],
                    teamBPlayerIds: ['p2'],
                    teamAHandicapAllowance: 0,
                    teamBHandicapAllowance: 0,
                    result: 'notFinished',
                    margin: 1,
                    holesRemaining: 0,
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-01-01T00:00:00.000Z',
                },
            ] as const;

            const holeResults = [
                ...Array.from({ length: 17 }, (_, i) => ({
                    id: `h-${i + 1}`,
                    matchId: 'm1',
                    holeNumber: i + 1,
                    winner: (i % 3 === 0 ? 'teamA' : i % 3 === 1 ? 'teamB' : 'halved') as
                        | 'teamA'
                        | 'teamB'
                        | 'halved',
                    timestamp: `2026-01-01T00:${String(i).padStart(2, '0')}:00.000Z`,
                })),
                {
                    id: 'h-18',
                    matchId: 'm1',
                    holeNumber: 18,
                    winner: 'teamA' as const,
                    timestamp: '2026-01-01T00:18:00.000Z',
                },
            ];

            const players = [
                { id: 'p1', firstName: 'Ann', lastName: 'A', createdAt: '', updatedAt: '' },
                { id: 'p2', firstName: 'Bob', lastName: 'B', createdAt: '', updatedAt: '' },
            ] as const;

            const view = buildSpectatorView(
                trip as never,
                teams as never,
                sessions as never,
                matches as never,
                holeResults as never,
                players as never
            );

            expect(view.recentResults[0]?.result).toBe('1 UP');
        });

        it('uses canonical snapshot winner when hole corrections create duplicate hole entries', () => {
            const trip = {
                id: 'trip-2',
                name: 'Trip',
                startDate: '2026-06-01',
                endDate: '2026-06-03',
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
            } as const;

            const teams = [
                { id: 't1', tripId: 'trip-2', name: 'USA', color: 'usa', createdAt: '', updatedAt: '' },
                { id: 't2', tripId: 'trip-2', name: 'EUR', color: 'europe', createdAt: '', updatedAt: '' },
            ] as const;

            const sessions = [
                {
                    id: 's1',
                    tripId: 'trip-2',
                    name: 'Singles',
                    sessionNumber: 1,
                    sessionType: 'singles',
                    isComplete: false,
                    isSessionLocked: false,
                    createdAt: '',
                    updatedAt: '',
                },
            ] as const;

            const matches = [
                {
                    id: 'm1',
                    sessionId: 's1',
                    matchOrder: 1,
                    status: 'completed',
                    currentHole: 3,
                    teamAPlayerIds: ['p1'],
                    teamBPlayerIds: ['p2'],
                    teamAHandicapAllowance: 0,
                    teamBHandicapAllowance: 0,
                    result: 'notFinished',
                    margin: 1,
                    holesRemaining: 15,
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-01-01T00:00:00.000Z',
                },
            ] as const;

            const holeResults = [
                {
                    id: 'h-1-old',
                    matchId: 'm1',
                    holeNumber: 1,
                    winner: 'teamA' as const,
                    timestamp: '2026-01-01T00:00:00.000Z',
                },
                {
                    id: 'h-1-correction',
                    matchId: 'm1',
                    holeNumber: 1,
                    winner: 'teamB' as const,
                    timestamp: '2026-01-01T00:01:00.000Z',
                },
                {
                    id: 'h-2',
                    matchId: 'm1',
                    holeNumber: 2,
                    winner: 'teamB' as const,
                    timestamp: '2026-01-01T00:02:00.000Z',
                },
                {
                    id: 'h-3',
                    matchId: 'm1',
                    holeNumber: 3,
                    winner: 'teamA' as const,
                    timestamp: '2026-01-01T00:03:00.000Z',
                },
            ];

            const players = [
                { id: 'p1', firstName: 'Ann', lastName: 'A', createdAt: '', updatedAt: '' },
                { id: 'p2', firstName: 'Bob', lastName: 'B', createdAt: '', updatedAt: '' },
            ] as const;

            const view = buildSpectatorView(
                trip as never,
                teams as never,
                sessions as never,
                matches as never,
                holeResults as never,
                players as never
            );

            expect(view.teamA.points).toBe(0);
            expect(view.teamB.points).toBe(1);
            expect(view.recentResults[0]?.result).toBe('1 DN');
        });
    });

    describe('generateScoreboardText', () => {
        it('should generate shareable text', () => {
            const view: SpectatorView = {
                tripId: 'trip-1',
                tripName: 'Annual Ryder Cup 2026',
                teamA: { name: 'Team USA', points: 10, color: 'red' },
                teamB: { name: 'Team Europe', points: 8, color: 'blue' },
                currentStatus: 'live',
                liveMatches: [],
                recentResults: [],
                pointsToWin: 14.5,
            };

            const text = generateScoreboardText(view);

            expect(text).toBeDefined();
            expect(typeof text).toBe('string');
            expect(text.length).toBeGreaterThan(0);
            expect(text).toContain('Team USA');
            expect(text).toContain('Team Europe');
        });
    });
});
