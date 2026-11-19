import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { Easing, FadeIn, ReduceMotion } from 'react-native-reanimated';

import { Button } from '../../src/components/Button.tsx';
import { TabScreen } from '../../src/components/TabScreen.tsx';
import { press, radius, space, type } from '../../src/theme/tokens.ts';
import { useAppearance } from '../../src/theme/useAppearance.ts';
import { useWorkouts } from '../../src/workout/WorkoutProvider.tsx';
import { completedSets, WorkoutId, type Workout } from '../../src/workout/workout.ts';

// Fades remain under Reduce Motion; this entrance never translates or scales.
const summaryEntrance = FadeIn.duration(180).easing(Easing.bezier(...press.easing)).reduceMotion(ReduceMotion.Never);

export default function WorkoutFinishedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { find, state } = useWorkouts();
  const { palette } = useAppearance();
  const router = useRouter();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let live = true;
    const parsed = WorkoutId.safeParse(id);

    if (state.kind !== 'ready' || !parsed.success) {
      return;
    }

    void find(parsed.data).then((saved) => {
      if (live) {
        setWorkout(saved);
        setFailed(saved === null);
      }
    }, () => live && setFailed(true));

    return () => { live = false; };
  }, [id, state.kind]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: palette.bg }}>
      <TabScreen title="Workout done" subtitle={<Text style={[type.body, { color: palette.secondary }]}>Empty workout</Text>}>
        {workout === null ? <Text style={[type.body, { color: palette.label }]}>{failed ? 'Could not load this workout.' : 'Loading workout…'}</Text> : (
          <Animated.View entering={summaryEntrance} style={[styles.card, { backgroundColor: palette.card }]}>
            <Text style={[type.body, { color: palette.label }]}>Time: {Math.max(0, Math.floor(((workout.finishedAt ?? workout.startedAt) - workout.startedAt) / 60000))} min</Text>
            <Text style={[type.body, { color: palette.label }]}>Sets done: {completedSets(workout)}</Text>
            <Text style={[type.footnote, { color: palette.secondary }]}>Saved on this phone</Text>
          </Animated.View>
        )}
        <Button palette={palette} label="Done" onPress={() => router.dismissTo('/train')} />
      </TabScreen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({ card: { borderRadius: radius.card, padding: space.lg, gap: space.md } });
