import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExerciseList } from '../../src/exercises/ExerciseList.tsx';
import { useAppearance } from '../../src/theme/useAppearance.ts';
import { SheetBar } from '../../src/workout/SheetBar.tsx';
import { useWorkouts } from '../../src/workout/WorkoutProvider.tsx';
import { catalogueIdsIn, pickExercise } from '../../src/workout/pickExercise.ts';
import { uuidv7 } from '../../src/workout/uuidv7.ts';
import { WorkoutExerciseId, WorkoutSetId } from '../../src/workout/workout.ts';

export default function AddExerciseScreen() {
  const { state, change, requestFocus } = useWorkouts();
  const router = useRouter();
  const { palette } = useAppearance();
  const added = useMemo(() => state.kind === 'ready' && state.active !== null ? catalogueIdsIn(state.active) : new Set<never>(), [state]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }}>
      <SheetBar title="Add exercise" onClose={() => router.back()} />
      <ExerciseList compact inWorkout={added} onSelect={(exerciseId) => {
        if (state.kind !== 'ready' || state.active === null) {
          return;
        }

        const picked = pickExercise(state.active, exerciseId, state.unit, { exercise: WorkoutExerciseId.parse(uuidv7()), set: WorkoutSetId.parse(uuidv7()) });

        switch (picked.kind) {
          case 'existing':
            break;
          case 'added':
            change(picked.workout);
            break;
          default: {
            const _exhaustive: never = picked;

            return _exhaustive;
          }
        }

        requestFocus(picked.focus);
        router.back();
      }} />
    </SafeAreaView>
  );
}
