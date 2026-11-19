import { UserId } from '@compound/contracts';

import { openLocalDatabase } from '../localDatabase/localDatabase.ts';
import { migrateLocalDatabase } from '../localDatabase/migrations.ts';
import { createWorkoutStore } from './workoutStore.ts';

let opening: ReturnType<typeof openLocalDatabase> | undefined;

export function workoutDatabase() {
  opening ??= openLocalDatabase('compound.db').then(async (db) => {
    await migrateLocalDatabase(db);

    return db;
  }).catch((error: Error) => {
    opening = undefined;
    throw error;
  });

  return opening;
}

export async function deviceWorkoutStore(userId: string) {
  return createWorkoutStore(await workoutDatabase(), UserId.parse(userId));
}
