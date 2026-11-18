import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ExerciseDetail } from '../../src/exercises/ExerciseDetail.tsx';
import { findExercise } from '../../src/exercises/catalogue.ts';
import { layout, space, type } from '../../src/theme/tokens.ts';
import { useAppearance } from '../../src/theme/useAppearance.ts';

export default function ExerciseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const exercise = findExercise(id);
  const { palette } = useAppearance();

  if (exercise === undefined) {
    return (
      <View style={[styles.missing, { backgroundColor: palette.bg }]}>
        <Text accessibilityRole="header" style={[type.title2, { color: palette.label }]}>Exercise not found</Text>
        <Text style={[type.body, { color: palette.secondary }]}>Go back to Exercises and choose another exercise.</Text>
      </View>
    );
  }

  return <ExerciseDetail key={exercise.id} exercise={exercise} />;
}

const styles = StyleSheet.create({
  missing: { flex: 1, justifyContent: 'center', gap: space.md, padding: layout.screenMargin },
});
