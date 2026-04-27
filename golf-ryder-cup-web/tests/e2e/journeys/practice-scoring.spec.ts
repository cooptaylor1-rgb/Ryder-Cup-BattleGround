import { expect, test } from '../fixtures/test-fixtures';
import { dismissAllBlockingModals, seedUserProfile, waitForStableDOM } from '../utils/test-helpers';

test.describe('Practice scoring cockpit', () => {
  test.beforeEach(async ({ page, clearDatabase }) => {
    await clearDatabase();
    await page.goto('/');
    await waitForStableDOM(page);
    await dismissAllBlockingModals(page);
  });

  test('renders the practice scoring cockpit and accepts one-tap scores @smoke', async ({
    page,
    seedSmallDataset,
  }) => {
    const [trip] = await seedSmallDataset();
    if (!trip) throw new Error('Expected seeded trip');

    const practiceMatchId = await page.evaluate(
      async ({ tripId, playerIds }) => {
        const now = new Date().toISOString();
        const teeSetId = 'practice-tee-e2e';
        const sessionId = 'practice-session-e2e';
        const matchId = 'practice-match-e2e';

        const db = await new Promise<IDBDatabase>((resolve, reject) => {
          const request = indexedDB.open('GolfTripDB');
          request.onerror = () => reject(request.error);
          request.onsuccess = () => resolve(request.result);
        });

        await new Promise<void>((resolve, reject) => {
          const tx = db.transaction(
            ['teeSets', 'sessions', 'matches', 'practiceScores'],
            'readwrite'
          );

          tx.objectStore('teeSets').put({
            id: teeSetId,
            courseId: 'practice-course-e2e',
            name: 'Tournament',
            rating: 72.1,
            slope: 127,
            par: 72,
            holeHandicaps: [7, 11, 3, 15, 1, 13, 5, 17, 9, 8, 12, 4, 16, 2, 14, 6, 18, 10],
            holePars: Array(18).fill(4),
            yardages: [
              394, 421, 176, 536, 442, 389, 202, 521, 412, 398, 451, 183, 545, 428, 377, 214, 533,
              436,
            ],
            totalYardage: 7212,
            createdAt: now,
            updatedAt: now,
          });

          tx.objectStore('sessions').put({
            id: sessionId,
            tripId,
            name: 'Practice AM',
            sessionNumber: 99,
            sessionType: 'one-two-three',
            scheduledDate: now,
            timeSlot: 'AM',
            pointsPerMatch: 0,
            status: 'inProgress',
            isLocked: false,
            isPracticeSession: true,
            defaultTeeSetId: teeSetId,
            createdAt: now,
            updatedAt: now,
          });

          tx.objectStore('matches').put({
            id: matchId,
            tripId,
            sessionId,
            matchOrder: 1,
            mode: 'practice',
            teamAPlayerIds: playerIds,
            teamBPlayerIds: [],
            status: 'inProgress',
            currentHole: 2,
            teeSetId,
            teeTime: '12:12',
            teamAHandicapAllowance: 0,
            teamBHandicapAllowance: 0,
            result: 'notFinished',
            margin: 0,
            holesRemaining: 17,
            createdAt: now,
            updatedAt: now,
          });

          playerIds.forEach((playerId, index) => {
            tx.objectStore('practiceScores').put({
              id: `practice-score-${playerId}-1`,
              matchId,
              playerId,
              holeNumber: 1,
              gross: 4 + (index % 2),
              createdAt: now,
              updatedAt: now,
            });
          });

          tx.objectStore('practiceScores').put({
            id: `practice-score-${playerIds[0]}-2`,
            matchId,
            playerId: playerIds[0],
            holeNumber: 2,
            gross: 4,
            createdAt: now,
            updatedAt: now,
          });

          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => {
            db.close();
            reject(tx.error);
          };
        });

        return matchId;
      },
      {
        tripId: trip.id,
        playerIds: trip.players.slice(0, 4).map((player) => player.id),
      }
    );

    await seedUserProfile(page);
    await page.goto(`/score/${practiceMatchId}`);
    await waitForStableDOM(page);
    await dismissAllBlockingModals(page);

    await expect(page.getByText(/Live practice scoring/i)).toBeVisible();
    await expect(page.getByText(/Live net board/i)).toBeVisible();
    await expect(page.getByText(/Every player, one pass/i)).toBeVisible();

    await page
      .getByRole('button', { name: /Set .* to par 4/i })
      .first()
      .click();
    await expect(page.getByText(/Hole entered/i)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Back' })).toBeVisible();
  });
});
