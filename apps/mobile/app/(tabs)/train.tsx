import { Platform, StyleSheet, View } from 'react-native';
import { useFocusEffect, useIsFocused, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TabScreen } from '../../src/components/TabScreen.tsx';
import { ExerciseSearchButton } from '../../src/exercises/ExerciseSearchButton.tsx';
import { useAppearance } from '../../src/theme/useAppearance.ts';
import { Button } from '../../src/components/Button.tsx';
import { useWorkouts } from '../../src/workout/WorkoutProvider.tsx';
import { WorkoutLogger } from '../../src/workout/WorkoutLogger.tsx';
import { TrainHome } from '../../src/workout/TrainHome.tsx';
import type { WeightUnit, Workout } from '../../src/workout/workout.ts';

export default function TrainScreen() {
  const { palette } = useAppearance();
  const { state, reload } = useWorkouts();

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  const active = state.kind === 'ready' ? state.active : null;

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}>
      {state.kind === 'ready' && active !== null ? <ActiveWorkout workout={active} unit={state.unit} /> : <NoActiveWorkout />}
    </View>
  );
}

function ActiveWorkout({ workout, unit }: { workout: Workout; unit: WeightUnit }) {
  const router = useRouter();
  const isFocused = useIsFocused();
  const workouts = useWorkouts();
  const [finishing, setFinishing] = useState(false);

  async function finish() {
    setFinishing(true);
    const id = await workouts.finish();

    if (id !== null) {
      router.push({ pathname: '/train/workout-finished', params: { id } });
    }

    setFinishing(false);
  }

  function addExercise() {
    router.push('/train/add-exercise');
  }

  return (
    <WorkoutLogger
      workout={workout}
      unit={unit}
      error={workouts.error}
      finishing={finishing}
      onChange={workouts.change}
      onRemove={workouts.remove}
      onFinish={() => void finish()}
      onAddExercise={addExercise}
      // Only jump to a card once the Add exercise sheet has closed and Train is showing again.
      focus={isFocused ? workouts.focus : null}
      onFocusHandled={workouts.clearFocus}
    />
  );
}

function NoActiveWorkout() {
  const { palette } = useAppearance();
  const { state, error, saving, reload, start } = useWorkouts();

  function startWorkout() {
    void start();
  }

  return (
    <SafeAreaView edges={Platform.OS === 'android' ? ['top'] : []} style={styles.screen}>
      <TabScreen title="Train" trailing={<ExerciseSearchButton />}>
        {state.kind === 'failed' ? <Button palette={palette} label="Could not open workouts. Retry" onPress={reload} /> : null}
        {error ? <Button palette={palette} label="Could not save the workout. Retry" variant="quiet" onPress={startWorkout} /> : null}
        <TrainHome starting={saving} disabled={state.kind !== 'ready'} onStart={startWorkout} />
      </TabScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ screen: { flex: 1 } });
