import { createContext, useContext } from 'react';

export type WorkoutStatus = { kind: 'idle' } | { kind: 'in-progress' };

/** The workout logger provides this. Until it exists, no workout is ever in progress. */
export const WorkoutStatusContext = createContext<WorkoutStatus>({ kind: 'idle' });

export function useWorkoutStatus(): WorkoutStatus {
  return useContext(WorkoutStatusContext);
}
