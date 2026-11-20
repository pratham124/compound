import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { ExerciseDetail } from '../../src/exercises/ExerciseDetail.tsx';
import { findExercise } from '../../src/exercises/catalogue.ts';
import { layout, space, type } from '../../src/theme/tokens.ts';
import { useAppearance } from '../../src/theme/useAppearance.ts';
import { ModalCloseButton } from '../../src/workout/ModalCloseButton.tsx';

export default function ExerciseScreen() {
  const { id, from } = useLocalSearchParams<{ id: string; from?: string }>();
  const router = useRouter();
  const exercise = findExercise(id);
  const { palette } = useAppearance();
  const header = from === 'workout' ? <Stack.Screen options={{ presentation: 'modal', headerBackVisible: false, headerRight: () => <ModalCloseButton onPress={() => router.back()} /> }} /> : null;

  if (exercise === undefined) {
    return (
      <>
      {header}
      <View style={[styles.missing, { backgroundColor: palette.bg }]}>
        <Text accessibilityRole="header" style={[type.title2, { color: palette.label }]}>Exercise not found</Text>
        <Text style={[type.body, { color: palette.secondary }]}>Go back to Exercises and choose another exercise.</Text>
      </View>
      </>
    );
  }

  return <>{header}<ExerciseDetail key={exercise.id} exercise={exercise} /></>;
}

const styles = StyleSheet.create({
  missing: { flex: 1, justifyContent: 'center', gap: space.md, padding: layout.screenMargin },
});
