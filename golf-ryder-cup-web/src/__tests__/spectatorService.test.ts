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
            expect(view.teamB.points).toBe(0);
            expect(view.recentResults).toHaveLength(0);
            expect(view.liveMatches[0]).toMatchObject({
                id: 'm1',
                currentScore: 'B 1 UP',
            });
        });

        it('excludes practice matches from spectator cup points and live feed', () => {
            const trip = {
                id: 'trip-practice',
                name: 'Trip',
                startDate: '2026-06-01',
                endDate: '2026-06-03',
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
            } as const;

            const teams = [
                { id: 't1', tripId: 'trip-practice', name: 'USA', color: 'usa', createdAt: '', updatedAt: '' },
                { id: 't2', tripId: 'trip-practice', name: 'EUR', color: 'europe', createdAt: '', updatedAt: '' },
            ] as const;

            const sessions = [
                {
                    id: 's-cup',
                    tripId: 'trip-practice',
                    name: 'Singles',
                    sessionNumber: 1,
                    sessionType: 'singles',
                    isPracticeSession: false,
                    status: 'inProgress',
                    createdAt: '',
                    updatedAt: '',
                },
                {
                    id: 's-practice',
                    tripId: 'trip-practice',
                    name: 'Warm-up',
                    sessionNumber: 0,
                    sessionType: 'fourball',
                    isPracticeSession: true,
                    status: 'inProgress',
                    createdAt: '',
                    updatedAt: '',
                },
            ] as const;

            const matches = [
                {
                    id: 'm-cup',
                    sessionId: 's-cup',
                    matchOrder: 1,
                    status: 'completed',
                    currentHole: 10,
                    teamAPlayerIds: ['p1'],
                    teamBPlayerIds: ['p2'],
                    teamAHandicapAllowance: 0,
                    teamBHandicapAllowance: 0,
                    result: 'notFinished',
                    margin: 10,
                    holesRemaining: 8,
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-01-01T00:03:00.000Z',
                },
                {
                    id: 'm-practice-session',
                    sessionId: 's-practice',
                    matchOrder: 2,
                    status: 'completed',
                    currentHole: 10,
                    teamAPlayerIds: ['p1'],
                    teamBPlayerIds: ['p2'],
                    teamAHandicapAllowance: 0,
                    teamBHandicapAllowance: 0,
                    result: 'notFinished',
                    margin: 10,
                    holesRemaining: 8,
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-01-01T00:04:00.000Z',
                },
                {
                    id: 'm-practice-mode',
                    sessionId: 's-cup',
                    matchOrder: 3,
                    status: 'inProgress',
                    mode: 'practice',
                    currentHole: 2,
                    teamAPlayerIds: ['p1'],
                    teamBPlayerIds: [],
                    teamAHandicapAllowance: 0,
                    teamBHandicapAllowance: 0,
                    result: 'notFinished',
                    margin: 1,
                    holesRemaining: 17,
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-01-01T00:05:00.000Z',
                },
            ] as const;

            const holeResults = [
                ...Array.from({ length: 10 }, (_, index) => ({
                    id: `cup-${index + 1}`,
                    matchId: 'm-cup',
                    holeNumber: index + 1,
                    winner: 'teamB' as const,
                    timestamp: `2026-01-01T00:${String(index).padStart(2, '0')}:00.000Z`,
                })),
                ...Array.from({ length: 10 }, (_, index) => ({
                    id: `practice-session-${index + 1}`,
                    matchId: 'm-practice-session',
                    holeNumber: index + 1,
                    winner: 'teamA' as const,
                    timestamp: `2026-01-01T01:${String(index).padStart(2, '0')}:00.000Z`,
                })),
                {
                    id: 'practice-mode-1',
                    matchId: 'm-practice-mode',
                    holeNumber: 1,
                    winner: 'teamA' as const,
                    timestamp: '2026-01-01T02:00:00.000Z',
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
            expect(view.currentStatus).toBe('completed');
            expect(view.liveMatches).toHaveLength(0);
            expect(view.recentResults.map((match) => match.id)).toEqual(['m-cup']);
        });

        it('treats a score-complete match as completed before the stored status catches up', () => {
            const trip = {
                id: 'trip-stale-status',
                name: 'Trip',
                startDate: '2026-06-01',
                endDate: '2026-06-03',
                createdAt: '2026-01-01T00:00:00.000Z',
                updatedAt: '2026-01-01T00:00:00.000Z',
            } as const;

            const teams = [
                { id: 't1', tripId: 'trip-stale-status', name: 'USA', color: 'usa', createdAt: '', updatedAt: '' },
                { id: 't2', tripId: 'trip-stale-status', name: 'EUR', color: 'europe', createdAt: '', updatedAt: '' },
            ] as const;

            const sessions = [
                {
                    id: 's1',
                    tripId: 'trip-stale-status',
                    name: 'Singles',
                    sessionNumber: 1,
                    sessionType: 'singles',
                    isPracticeSession: false,
                    status: 'inProgress',
                    createdAt: '',
                    updatedAt: '',
                },
            ] as const;

            const matches = [
                {
                    id: 'm-stale',
                    sessionId: 's1',
                    matchOrder: 1,
                    status: 'inProgress',
                    currentHole: 18,
                    teamAPlayerIds: ['p1'],
                    teamBPlayerIds: ['p2'],
                    teamAHandicapAllowance: 0,
                    teamBHandicapAllowance: 0,
                    result: 'notFinished',
                    margin: 0,
                    holesRemaining: 0,
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-01-01T00:03:00.000Z',
                },
            ] as const;

            const holeResults = Array.from({ length: 18 }, (_, index) => ({
                id: `stale-${index + 1}`,
                matchId: 'm-stale',
                holeNumber: index + 1,
                winner: (index % 2 === 0 ? 'teamA' : 'teamB') as 'teamA' | 'teamB',
                timestamp: `2026-01-01T00:${String(index).padStart(2, '0')}:00.000Z`,
            }));

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

            expect(view.teamA.points).toBe(0.5);
            expect(view.teamB.points).toBe(0.5);
            expect(view.currentStatus).toBe('completed');
            expect(view.liveMatches).toHaveLength(0);
            expect(view.recentResults[0]).toMatchObject({
                id: 'm-stale',
                status: 'completed',
                result: 'Halved',
            });
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
