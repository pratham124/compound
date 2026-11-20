import { Profile, UserId, type Units } from '@compound/contracts';

import { migrateLocalDatabase } from '../localDatabase/migrations.ts';
import { createWorkoutStore } from '../workout/workoutStore.ts';
import { openTestDatabase } from '../workout/workoutTestDatabase.ts';
import { loadProfileAndCacheUnit, saveUnitsAndCache } from './settingsUnits.ts';

function profile(units: Units) {
  return Profile.parse({ units, timeZone: 'America/Vancouver' });
}

function heldResponse(units: Units) {
  let release = () => {};
  let markRequested = () => {};
  const response = new Promise<Profile>((resolve) => { release = () => resolve(profile(units)); });
  const requested = new Promise<void>((resolve) => { markRequested = resolve; });

  function respond() {
    markRequested();

    return response;
  }

  return { response: respond, requested, release };
}

async function openStore() {
  const { db, native } = openTestDatabase();

  await migrateLocalDatabase(db);
  const store = createWorkoutStore(db, UserId.parse('00000000-0000-4000-8000-000000000001'));

  return { store, open: async () => store, close: () => native.close() };
}

it('does not let a late save response from a closed Settings screen overwrite a unit saved after it', async () => {
  const { store, open, close } = await openStore();

  try {
    const first = heldResponse('imperial');
    const firstSave = saveUnitsAndCache(open, first.response);

    await saveUnitsAndCache(open, async () => profile('metric'));
    expect(await store.unit()).toBe('kg');
    first.release();
    await firstSave;
    expect(await store.unit()).toBe('kg');
  } finally {
    close();
  }
});

it('does not let a late profile load overwrite a unit saved while it was out', async () => {
  const { store, open, close } = await openStore();

  try {
    await store.saveUnit('lb');
    const read = heldResponse('imperial');
    const load = loadProfileAndCacheUnit(open, read.response);

    await read.requested;
    await saveUnitsAndCache(open, async () => profile('metric'));
    read.release();
    await load;
    expect(await store.unit()).toBe('kg');
  } finally {
    close();
  }
});

it('still returns the profile when the phone database cannot open', async () => {
  const broken = async () => { throw new Error('Disk full'); };

  await expect(loadProfileAndCacheUnit(broken, async () => profile('imperial'))).resolves.toEqual(profile('imperial'));
  await expect(saveUnitsAndCache(broken, async () => profile('metric'))).resolves.toEqual(profile('metric'));
});
