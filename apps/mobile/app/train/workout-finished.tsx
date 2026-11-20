import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { Easing, FadeIn, ReduceMotion } from 'react-native-reanimated';

import { Button } from '../../src/components/Button.tsx';
import { MochiFlex } from '../../src/components/MochiFlex.tsx';
import { layout, press, radius, space, type } from '../../src/theme/tokens.ts';
import { useAppearance } from '../../src/theme/useAppearance.ts';
import { useWorkouts } from '../../src/workout/WorkoutProvider.tsx';
import { completedSets, WorkoutId, type Workout } from '../../src/workout/workout.ts';
import { durationText, workoutDateText } from '../../src/workout/workoutSummary.ts';

const SUMMARY_MS = 180;

// A fade isn't movement, so it stays under Reduce Motion.
const summaryFade = FadeIn.duration(SUMMARY_MS).easing(Easing.bezier(...press.easing)).reduceMotion(ReduceMotion.Never);

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
      <ScrollView contentInsetAdjustmentBehavior="never" contentContainerStyle={styles.content}>
        <View style={styles.heading}>
          <MochiFlex palette={palette} play={workout !== null} />
          <View style={styles.headingText}>
            <Text accessibilityRole="header" style={[type.largeTitle, { color: palette.label }]}>Workout done</Text>
            <Text style={[type.body, { color: palette.secondary }]}>{workout === null ? '' : workoutDateText(workout.startedAt)}</Text>
          </View>
        </View>
        {workout === null ? <Text style={[type.body, { color: palette.label }]}>{failed ? 'Could not load this workout.' : 'Loading workout…'}</Text> : <Summary workout={workout} />}
        <Button palette={palette} label="Done" onPress={() => router.dismissTo('/train')} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Summary({ workout }: { workout: Workout }) {
  const { palette } = useAppearance();
  const time = durationText(workout);
  const sets = completedSets(workout);

  return (
    <Animated.View entering={summaryFade} style={[styles.card, { backgroundColor: palette.card }]}>
      <View accessible accessibilityLabel={`Time: ${time}`} style={styles.summaryRow}>
        <Text style={[type.body, { color: palette.secondary }]}>Time</Text>
        <Text style={[type.body, styles.value, { color: palette.label }]}>{time}</Text>
      </View>
      <View style={[styles.separator, { backgroundColor: palette.separator }]} />
      <View accessible accessibilityLabel={`Sets done: ${sets}`} style={styles.summaryRow}>
        <Text style={[type.body, { color: palette.secondary }]}>Sets done</Text>
        <Text style={[type.body, styles.value, { color: palette.label }]}>{sets}</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, padding: layout.screenMargin, gap: space.lg },
  heading: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginTop: space.sm },
  headingText: { flex: 1 },
  card: { borderRadius: radius.card, padding: space.sm },
  summaryRow: { minHeight: layout.minTouch, paddingHorizontal: 10, paddingVertical: space.sm, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  value: { fontWeight: '600', fontVariant: ['tabular-nums'] },
  separator: { height: StyleSheet.hairlineWidth, marginHorizontal: 10 },
});
