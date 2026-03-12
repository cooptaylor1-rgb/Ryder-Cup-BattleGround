import { db } from '@/lib/db';

import type { ImportedTripEntities } from './exportImportTypes';

export async function applyImportTransaction(entities: ImportedTripEntities): Promise<void> {
  await db.transaction(
    'rw',
    [
      db.trips,
      db.players,
      db.teams,
      db.teamMembers,
      db.sessions,
      db.matches,
      db.holeResults,
      db.courses,
      db.teeSets,
    ],
    async () => {
      await db.trips.add(entities.trip);
      if (entities.players.length > 0) await db.players.bulkAdd(entities.players);
      if (entities.teams.length > 0) await db.teams.bulkAdd(entities.teams);
      if (entities.teamMembers.length > 0) await db.teamMembers.bulkAdd(entities.teamMembers);
      if (entities.sessions.length > 0) await db.sessions.bulkAdd(entities.sessions);
      if (entities.matches.length > 0) await db.matches.bulkAdd(entities.matches);
      if (entities.holeResults.length > 0) await db.holeResults.bulkAdd(entities.holeResults);
      if (entities.courses.length > 0) await db.courses.bulkAdd(entities.courses);
      if (entities.teeSets.length > 0) await db.teeSets.bulkAdd(entities.teeSets);
    }
  );
}
