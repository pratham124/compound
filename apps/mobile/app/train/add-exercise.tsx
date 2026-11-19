import { uuid } from 'expo';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../src/components/Button.tsx';
import { ExerciseList } from '../../src/exercises/ExerciseList.tsx';
import { useAppearance } from '../../src/theme/useAppearance.ts';
import { useWorkouts } from '../../src/workout/WorkoutProvider.tsx';
import { WorkoutExerciseId, WorkoutSetId } from '../../src/workout/workout.ts';

export default function AddExerciseScreen() {
  const { state, change } = useWorkouts();
  const router = useRouter();
  const { palette } = useAppearance();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }}>
      <Button palette={palette} label="Back to workout" variant="quiet" onPress={() => router.back()} />
      <ExerciseList onSelect={(exerciseId) => {
        if (state.kind !== 'ready' || state.active === null) {
          return;
        }

        change({ ...state.active, exercises: [...state.active.exercises, { id: WorkoutExerciseId.parse(uuid.v4()), exerciseId, sets: [{ id: WorkoutSetId.parse(uuid.v4()), reps: '', weight: '', unit: state.unit, done: false }] }] });
        router.back();
      }} />
    </SafeAreaView>
  );
}
