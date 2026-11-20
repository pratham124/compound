import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../components/Button.tsx';
import { PressableScale } from '../components/PressableScale.tsx';
import { layout, radius, space, type } from '../theme/tokens.ts';
import { useAppearance } from '../theme/useAppearance.ts';
import { ExerciseCard } from './ExerciseCard.tsx';
import { closeGap } from './loggerMotion.ts';
import { WorkoutBar } from './WorkoutBar.tsx';
import { useJumpToCard } from './useJumpToCard.ts';
import { completedSets, type WeightUnit, type Workout, type WorkoutExerciseId } from './workout.ts';
import type { WorkoutEdit } from './workoutEdit.ts';
import { totalSets, upNextSet } from './workoutProgress.ts';
import type { WorkoutRemoval } from './workoutRemoval.ts';

type LoggerProps = {
  workout: Workout;
  unit: WeightUnit;
  error: boolean;
  finishing: boolean;
  onEdit: (edit: WorkoutEdit) => void;
  onRemove: (removal: WorkoutRemoval) => void;
  onRetry: () => void;
  onFinish: () => void;
  onAddExercise: () => void;
  focus: WorkoutExerciseId | null;
  onFocusHandled: () => void;
};

export function WorkoutLogger({ workout, unit, error, finishing, onEdit, onRemove, onRetry, onFinish, onAddExercise, focus, onFocusHandled }: LoggerProps) {
  const { palette } = useAppearance();
  const { scrollRef, flashTokenFor, onCardLaidOut } = useJumpToCard({ cards: workout.exercises, focus, onFocusHandled });
  const upNext = upNextSet(workout);
  const empty = workout.exercises.length === 0;

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={styles.fill}>
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <WorkoutBar
          startedAt={workout.startedAt}
          done={completedSets(workout)}
          total={totalSets(workout)}
          error={error}
          finishing={finishing}
          onFinish={onFinish}
          onRetry={onRetry}
        />
        <ScrollView
          ref={scrollRef}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          contentContainerStyle={styles.content}
        >
          {empty ? (
            <View style={[styles.emptyCard, { backgroundColor: palette.card }]}>
              <Text accessibilityRole="header" style={[type.title2, { color: palette.label }]}>No exercises yet</Text>
              <Text style={[type.subheadline, { color: palette.secondary }]}>Add one to start logging sets.</Text>
              <View style={styles.emptyAction}>
                <Button palette={palette} label="Add exercise" disabled={finishing} onPress={onAddExercise} />
              </View>
            </View>
          ) : null}
          {workout.exercises.map((exercise) => (
            <ExerciseCard
              key={exercise.id}
              exercise={exercise}
              flashToken={flashTokenFor(exercise.id)}
              onLaidOut={onCardLaidOut}
              upNext={upNext}
              unit={unit}
              disabled={finishing}
              onEdit={onEdit}
              onRemove={onRemove}
            />
          ))}
          {empty ? null : (
            <Animated.View layout={closeGap}>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel="Add exercise"
                accessibilityState={{ disabled: finishing }}
                disabled={finishing}
                onPress={onAddExercise}
                style={[styles.addExercise, { borderColor: palette.accent }]}
              >
                <Text style={[type.callout, styles.strong, { color: palette.accent }]}>Add exercise</Text>
              </PressableScale>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { paddingHorizontal: layout.screenMargin, paddingTop: space.xs, paddingBottom: space.lg, gap: layout.cardGap },
  emptyCard: { borderRadius: radius.card, padding: layout.cardPadding, gap: space.xs },
  emptyAction: { marginTop: space.sm },
  addExercise: {
    minHeight: layout.buttonHeight,
    borderWidth: 1.5,
    borderRadius: radius.capsule,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space.sm,
  },
  strong: { fontWeight: '600' },
});
