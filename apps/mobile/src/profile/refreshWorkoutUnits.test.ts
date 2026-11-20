import { Profile, UserId } from '@compound/contracts';

import { migrateLocalDatabase } from '../localDatabase/migrations.ts';
import { createWorkoutStore } from '../workout/workoutStore.ts';
import { openTestDatabase } from '../workout/workoutTestDatabase.ts';
import { refreshWorkoutUnits } from './refreshWorkoutUnits.ts';

it('adopts the existing server preference, but a late refresh cannot overwrite a newer Settings save', async () => {
  const { db, native } = openTestDatabase();

  try {
    await migrateLocalDatabase(db);
    const store = createWorkoutStore(db, UserId.parse('00000000-0000-4000-8000-000000000001'));

    expect(await refreshWorkoutUnits(store, async () => Profile.parse({ units: 'imperial', timeZone: 'America/Vancouver' }))).toBe('lb');
    expect(await store.unit()).toBe('lb');

    await refreshWorkoutUnits(store, async () => {
      await store.saveUnit('kg');

      return Profile.parse({ units: 'imperial', timeZone: 'America/Vancouver' });
    });
    expect(await store.unit()).toBe('kg');
  } finally {
    native.close();
  }
});

it('does not write a profile response after its account refresh has been cancelled', async () => {
  const { db, native } = openTestDatabase();

  try {
    await migrateLocalDatabase(db);
    const store = createWorkoutStore(db, UserId.parse('00000000-0000-4000-8000-000000000001'));

    await store.saveUnit('lb');
    let current = true;

    await refreshWorkoutUnits(store, async () => {
      current = false;

      return Profile.parse({ units: 'metric', timeZone: 'America/Vancouver' });
    }, () => current);
    expect(await store.unit()).toBe('lb');
  } finally {
    native.close();
  }
});
