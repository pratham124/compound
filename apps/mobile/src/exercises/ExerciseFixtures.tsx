import { Exercise } from '@compound/contracts';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '../components/PressableScale.tsx';
import { layout, radius, space, type } from '../theme/tokens.ts';
import { useAppearance } from '../theme/useAppearance.ts';
import { findExercise } from './catalogue.ts';
import { ExerciseDetail } from './ExerciseDetail.tsx';
import { ExerciseRow } from './ExerciseList.tsx';

const worst = Exercise.parse({
  id: 'fixture-long-name',
  name: 'Single-arm landmine press with rotation (half kneeling)',
  equipment: 'Adjustable cable machine with independent pulley attachments',
  primaryMuscles: ['shoulders', 'abdominals', 'middle back'],
  secondaryMuscles: [],
  instructions: [
    'Begin in a half-kneeling position with your left knee on a comfortable pad, keeping your hips square and your ribs stacked above your pelvis throughout the movement.',
    'Press smoothly while rotating through your upper back, then return slowly to the starting position. Keep your breathing steady and avoid leaning away from the weight.',
  ],
  images: ['not-an-exercise/0.jpg'],
  category: 'strength', force: 'push', level: 'intermediate', mechanic: 'compound',
});

const missing = Exercise.parse({ ...worst, id: 'fixture-missing', name: '体幹の安定性 🏋️', equipment: null, primaryMuscles: [], instructions: [], images: [] });

const demo = findExercise('Incline_Dumbbell_Press') ?? worst;
const fixtures = { Demo: demo, Worst: worst, Missing: missing };

export function ExerciseFixtures() {
  const { palette } = useAppearance();
  const router = useRouter();
  const { exerciseData } = useLocalSearchParams<{ exerciseData?: string }>();
  const selected = exerciseData === 'Demo' ? 'Demo' : exerciseData === 'Missing' ? 'Missing' : 'Worst';
  const exercise = fixtures[selected];

  return (
    <View style={[styles.screen, { backgroundColor: palette.bg }]}>
      <ScrollView horizontal style={styles.controls} contentContainerStyle={styles.controlContent}>
        {Object.keys(fixtures).map((label) => (
          <PressableScale
            key={label}
            accessibilityRole="button"
            accessibilityLabel={`Exercises ${label}`}
            accessibilityState={{ selected: selected === label }}
            onPress={() => router.setParams({ exerciseData: label })}
            style={[styles.chip, { backgroundColor: selected === label ? palette.accent : palette.card }]}
          >
            <Text style={[type.footnote, { color: selected === label ? palette.onAccent : palette.label }]}>{label}</Text>
          </PressableScale>
        ))}
      </ScrollView>
      <View style={styles.row}>
        <ExerciseRow id={exercise.id} name={exercise.name} equipment={exercise.equipment} palette={palette} onSelect={() => {}} />
      </View>
      <ExerciseDetail key={selected} exercise={exercise} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingTop: space.xxl * 3 },
  controls: { flexGrow: 0, flexShrink: 0 },
  controlContent: { gap: space.sm, paddingHorizontal: layout.screenMargin },
  chip: { minHeight: layout.minTouch, paddingHorizontal: space.lg, justifyContent: 'center', borderRadius: radius.capsule },
  row: { padding: layout.screenMargin },
});
