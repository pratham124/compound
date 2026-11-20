import type { ReactNode } from 'react';

import { AccountWorkouts } from './WorkoutProvider.tsx';

export function WorkoutTestProvider({ children }: { children: ReactNode }) {
  return <AccountWorkouts userId={null}>{children}</AccountWorkouts>;
}
