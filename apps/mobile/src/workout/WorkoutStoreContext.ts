import { createContext, useContext } from 'react';

import { deviceWorkoutStore } from './deviceWorkoutStore.ts';

export const WorkoutStoreContext = createContext(deviceWorkoutStore);

export function useWorkoutStoreFactory() {
  return useContext(WorkoutStoreContext);
}
