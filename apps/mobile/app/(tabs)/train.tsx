import { Platform, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';

import { TabScreen } from '../../src/components/TabScreen.tsx';
import { ExerciseSearchButton } from '../../src/exercises/ExerciseSearchButton.tsx';
import { useAppearance } from '../../src/theme/useAppearance.ts';
import { Button } from '../../src/components/Button.tsx';
import { radius, space, type } from '../../src/theme/tokens.ts';
import { useWorkouts } from '../../src/workout/WorkoutProvider.tsx';
import { WorkoutLogger } from '../../src/workout/WorkoutLogger.tsx';

function Placeholder({ title, text }: { title: string; text: string }) {
  const { palette } = useAppearance();

  return <View accessibilityLabel={title} style={[styles.section, { backgroundColor: palette.card }]}><Text accessibilityRole="header" style={[type.headline, { color: palette.label }]}>{title}</Text><Text style={[type.subheadline, { color: palette.secondary }]}>{text}</Text></View>;
}

export default function TrainScreen() {
  const { palette } = useAppearance();
  const router = useRouter();
  const workouts = useWorkouts();
  const [finishing, setFinishing] = useState(false);
  const reload = workouts.reload;

  useFocusEffect(useCallback(() => { reload(); }, [reload]));

  async function finish() {
    setFinishing(true);
    const id = await workouts.finish();

    if (id !== null) {
      router.push({ pathname: '/train/workout-finished', params: { id } });
    }

    setFinishing(false);
  }

  return (
    <SafeAreaView edges={Platform.OS === 'android' ? ['top'] : []} style={[styles.screen, { backgroundColor: palette.bg }]}>
      {workouts.state.kind === 'ready' && workouts.state.active !== null ? (
        <WorkoutLogger workout={workouts.state.active} unit={workouts.state.unit} saving={workouts.saving} error={workouts.error} finishing={finishing} onChange={workouts.change} onFinish={() => void finish()} onAddExercise={() => router.push('/train/add-exercise')} />
      ) : (
        <TabScreen title="Train" trailing={<ExerciseSearchButton />}>
          {workouts.state.kind === 'failed' ? <Button palette={palette} label="Could not open workouts. Retry" onPress={reload} /> : null}
          {workouts.error ? <Text style={[type.body, { color: palette.secondary }]}>Could not save the workout. Try again.</Text> : null}
          <Placeholder title="Next day" text="No routines yet. Create one to see what's next." />
          <Placeholder title="Past workouts" text="Your workout calendar will be here." />
          <View style={[styles.section, { backgroundColor: palette.card }]}>
            <Text accessibilityRole="header" style={[type.headline, { color: palette.label }]}>Routines</Text>
            <Text style={[type.subheadline, { color: palette.secondary }]}>Your routines will be here.</Text>
            <Button palette={palette} label="Start empty workout" disabled={workouts.state.kind !== 'ready'} busy={workouts.saving} onPress={() => void workouts.start()} />
          </View>
          <Placeholder title="Personal records" text="Your personal records will be here." />
          <View style={[styles.section, { backgroundColor: palette.card }]}>
            <Text accessibilityRole="header" style={[type.headline, { color: palette.label }]}>Exercise list</Text>
            <Button palette={palette} label="Browse exercises" variant="quiet" onPress={() => router.push('/exercises')} />
          </View>
        </TabScreen>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ screen: { flex: 1 }, section: { padding: space.lg, borderRadius: radius.card, gap: space.sm } });
