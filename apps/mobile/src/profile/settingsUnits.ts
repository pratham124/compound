import type { Profile, Units } from '@compound/contracts';

import type { WeightUnit } from '../workout/workout.ts';
import type { WorkoutStore } from '../workout/workoutStore.ts';

type OpenStore = () => Promise<WorkoutStore>;

function weightUnit(units: Units): WeightUnit {
  return units === 'metric' ? 'kg' : 'lb';
}

// Module scope, not component state: a save sent from a Settings screen that has since closed must still lose to a later save from a reopened one.
let savesSent = 0;
let newestSaveCached = 0;

/** Loads the profile and caches its unit for offline Train, unless a unit was saved on the phone while the request was out. Caching is best effort. */
export async function loadProfileAndCacheUnit(openStore: OpenStore | null, load: () => Promise<Profile>): Promise<Profile> {
  const store = await openStore?.().catch(() => null) ?? null;
  const before = await store?.preference().catch(() => null) ?? null;
  const profile = await load();

  if (store !== null && before !== null) {
    await store.refreshUnit(weightUnit(profile.units), before.revision).catch(() => {});
  }

  return profile;
}

/** Saves the units and caches them for offline Train, unless a save sent after this one has already been cached. Caching is best effort. */
export async function saveUnitsAndCache(openStore: OpenStore | null, save: () => Promise<Profile>): Promise<Profile> {
  const sent = ++savesSent;
  const profile = await save();

  if (sent > newestSaveCached) {
    newestSaveCached = sent;
    await openStore?.().then((store) => store.saveUnit(weightUnit(profile.units))).catch(() => {});
  }

  return profile;
}
