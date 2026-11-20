import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ExerciseList } from '../../src/exercises/ExerciseList.tsx';
import { useAppearance } from '../../src/theme/useAppearance.ts';
import { SheetBar } from '../../src/workout/SheetBar.tsx';
import { useWorkouts } from '../../src/workout/WorkoutProvider.tsx';
import { catalogueIdsIn } from '../../src/workout/pickExercise.ts';

export default function AddExerciseScreen() {
  const { state, addExercise } = useWorkouts();
  const router = useRouter();
  const { palette } = useAppearance();
  const added = useMemo(() => state.kind === 'ready' && state.active !== null ? catalogueIdsIn(state.active) : new Set<never>(), [state]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }}>
      <SheetBar onClose={() => router.back()} />
      <ExerciseList compact inWorkout={added} onSelect={(exerciseId) => {
        addExercise(exerciseId);
        router.back();
      }} />
    </SafeAreaView>
  );
}
