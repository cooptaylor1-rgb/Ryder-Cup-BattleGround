/**
 * Trip course import orchestration.
 *
 * importLibraryCourseIntoTrip has to keep three surfaces in sync or
 * the captain's selection evaporates on the next render or the
 * cloud loses the course for every other device. These tests cover
 * the contract at each seam: Dexie (via the injected createCourseFromProfile
 * mock), the Zustand store, and the trip-sync queue.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { Course, TeeSet } from '@/lib/types/models';

const courseFromProfileMock = vi.fn();
const queueSyncOperationMock = vi.fn();

vi.mock('@/lib/services/courseLibraryService', () => ({
  createCourseFromProfile: (profileId: string) => courseFromProfileMock(profileId),
}));

vi.mock('@/lib/services/tripSyncService', () => ({
  queueSyncOperation: (...args: unknown[]) => queueSyncOperationMock(...args),
}));

// Minimal tripStore shim — the real store boots IndexedDB/Capacitor
// which vitest's jsdom can't resolve. We only care that setState
// mutates the courses/teeSets arrays the service passes in.
const storeState: { courses: Course[]; teeSets: TeeSet[]; currentTrip: null } = {
  courses: [],
  teeSets: [],
  currentTrip: null,
};
const setStateMock = vi.fn((updater: (state: typeof storeState) => Partial<typeof storeState>) => {
  const patch = updater(storeState);
  Object.assign(storeState, patch);
});

vi.mock('@/lib/stores/tripStore', () => ({
  useTripStore: {
    setState: (updater: (state: typeof storeState) => Partial<typeof storeState>) =>
      setStateMock(updater),
    getState: () => storeState,
  },
}));

const course: Course = {
  id: 'course-1',
  name: 'Pine Valley',
  location: 'Clementon, NJ',
  createdAt: '2026-04-01T00:00:00.000Z',
  updatedAt: '2026-04-01T00:00:00.000Z',
};

const teeSets: TeeSet[] = [
  {
    id: 'tee-1',
    courseId: 'course-1',
    name: 'Blue',
    rating: 73.4,
    slope: 150,
    par: 72,
    holePars: Array(18).fill(4),
    holeHandicaps: Array.from({ length: 18 }, (_, i) => i + 1),
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
  },
  {
    id: 'tee-2',
    courseId: 'course-1',
    name: 'White',
    rating: 71.2,
    slope: 138,
    par: 72,
    holePars: Array(18).fill(4),
    holeHandicaps: Array.from({ length: 18 }, (_, i) => i + 1),
    createdAt: '2026-04-01T00:00:00.000Z',
    updatedAt: '2026-04-01T00:00:00.000Z',
  },
];

async function importService() {
  const mod = await import('@/lib/services/tripCourseImportService');
  return mod.importLibraryCourseIntoTrip;
}

describe('importLibraryCourseIntoTrip', () => {
  beforeEach(() => {
    courseFromProfileMock.mockReset();
    queueSyncOperationMock.mockReset();
    setStateMock.mockClear();
    storeState.courses = [];
    storeState.teeSets = [];
  });

  it('copies the profile into Dexie and returns the new trip rows', async () => {
    courseFromProfileMock.mockResolvedValueOnce({ course, teeSets });
    const run = await importService();

    const result = await run('profile-abc', { tripId: 'trip-1' });

    expect(courseFromProfileMock).toHaveBeenCalledWith('profile-abc');
    expect(result).toEqual({ course, teeSets });
  });

  it('pushes the imported rows into the trip store so consumers see them', async () => {
    courseFromProfileMock.mockResolvedValueOnce({ course, teeSets });
    const run = await importService();

    await run('profile-abc', { tripId: 'trip-1' });

    expect(storeState.courses).toEqual([course]);
    expect(storeState.teeSets).toEqual(teeSets);
  });

  it('de-dupes by id so a double-tap does not stack a duplicate row', async () => {
    storeState.courses = [course];
    storeState.teeSets = [teeSets[0]];
    courseFromProfileMock.mockResolvedValueOnce({ course, teeSets });
    const run = await importService();

    await run('profile-abc', { tripId: 'trip-1' });

    expect(storeState.courses).toHaveLength(1);
    // The second tee was new; it should have been appended without
    // duplicating the first.
    expect(storeState.teeSets).toEqual([teeSets[0], teeSets[1]]);
  });

  it('queues a course + one teeSet sync op per imported tee when a tripId is given', async () => {
    courseFromProfileMock.mockResolvedValueOnce({ course, teeSets });
    const run = await importService();

    await run('profile-abc', { tripId: 'trip-1' });

    expect(queueSyncOperationMock).toHaveBeenCalledTimes(1 + teeSets.length);
    expect(queueSyncOperationMock).toHaveBeenNthCalledWith(
      1,
      'course',
      course.id,
      'create',
      'trip-1',
      course,
    );
    expect(queueSyncOperationMock).toHaveBeenNthCalledWith(
      2,
      'teeSet',
      teeSets[0].id,
      'create',
      'trip-1',
      teeSets[0],
    );
    expect(queueSyncOperationMock).toHaveBeenNthCalledWith(
      3,
      'teeSet',
      teeSets[1].id,
      'create',
      'trip-1',
      teeSets[1],
    );
  });

  it('skips the sync queue when no tripId is provided but still updates the store', async () => {
    courseFromProfileMock.mockResolvedValueOnce({ course, teeSets });
    const run = await importService();

    await run('profile-abc');

    expect(queueSyncOperationMock).not.toHaveBeenCalled();
    expect(storeState.courses).toEqual([course]);
  });
});
