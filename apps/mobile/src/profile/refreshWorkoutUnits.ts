import type { Profile } from '@compound/contracts';

import type { WorkoutStore } from '../workout/workoutStore.ts';

export async function refreshWorkoutUnits(store: WorkoutStore, loadProfile: () => Promise<Profile | null>, isCurrent = () => true) {
  const before = await store.preference();

  if (!isCurrent()) {
    return before.unit;
  }

  const profile = await loadProfile();

  if (profile === null || !isCurrent()) {
    return before.unit;
  }

  const refreshed = await store.refreshUnit(profile.units === 'metric' ? 'kg' : 'lb', before.revision);

  return refreshed.unit;
}
