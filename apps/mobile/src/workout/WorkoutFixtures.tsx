import { Exercise } from '@compound/contracts';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button } from '../components/Button.tsx';
import { exercises } from '../exercises/catalogue.ts';
import { useAppearance } from '../theme/useAppearance.ts';
import { WorkoutLogger } from './WorkoutLogger.tsx';
import { Workout } from './workout.ts';
import { TrainHome } from './TrainHome.tsx';
import { removeWorkoutItem } from './workoutRemoval.ts';
import { TabScreen } from '../components/TabScreen.tsx';

const demo = Workout.parse({
  id: '00000000-0000-4000-8000-000000000003', startedAt: Date.now() - 1000 * 1450, finishedAt: null,
  exercises: [{ id: '00000000-0000-4000-8000-000000000004', exerciseId: 'Barbell_Bench_Press_-_Medium_Grip', sets: [
    { id: '00000000-0000-4000-8000-000000000005', reps: '8', weight: '72.5', unit: 'kg', done: true },
    { id: '00000000-0000-4000-8000-000000000006', reps: '7', weight: '72.5', unit: 'kg', done: false },
  ] }],
});

const longest = exercises.reduce((found, exercise) => exercise.name.length > found.name.length ? exercise : found, exercises[0] ?? { id: Exercise.shape.id.parse('none'), name: '' });

const worst: Workout = { ...demo, startedAt: Date.now() - 1000 * 360000, exercises: demo.exercises.map((exercise) => ({ ...exercise, exerciseId: longest.id, sets: exercise.sets.map((set) => ({ ...set, reps: '999', weight: '99999', done: false })) })) };

export function WorkoutFixtures() {
  const { workoutData, workoutView } = useLocalSearchParams<{ workoutData?: string; workoutView?: string }>();
  const router = useRouter();
  const { palette } = useAppearance();
  const selected = workoutData ?? 'Demo';
  const initial = selected === 'Worst' ? worst : selected === 'Empty' ? { ...demo, exercises: [] } : demo;
  const [workout, setWorkout] = useState(initial);

  if (workoutView === 'home') {
    return <TabScreen title="Train"><TrainHome disabled={false} starting={false} onStart={() => {}} /></TabScreen>;
  }

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {['Demo', 'Worst', 'Empty'].map((label) => <Button key={label} palette={palette} label={`Workout ${label}`} variant="quiet" onPress={() => {
          router.setParams({ workoutData: label });
          setWorkout(label === 'Worst' ? worst : label === 'Empty' ? { ...demo, exercises: [] } : demo);
        }} />)}
      </View>
      <WorkoutLogger workout={workout} unit="kg" error={selected === 'Worst'} finishing={false} onChange={setWorkout} onRemove={(removal) => setWorkout((current) => removeWorkoutItem(current, removal) ?? current)} onFinish={() => {}} onAddExercise={() => {}} focus={null} onFocusHandled={() => {}} />
    </View>
  );
}
