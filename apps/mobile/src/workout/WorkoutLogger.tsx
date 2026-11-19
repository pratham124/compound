import { uuid } from 'expo';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';

import { Button } from '../components/Button.tsx';
import { PressableScale } from '../components/PressableScale.tsx';
import { displayEquipment, findExercise } from '../exercises/catalogue.ts';
import { layout, radius, space, type } from '../theme/tokens.ts';
import { useAppearance } from '../theme/useAppearance.ts';
import { WorkoutClock } from './WorkoutClock.tsx';
import { completedSets, validSet, weightInUnit, WorkoutSetId, type WeightUnit, type Workout, type WorkoutExercise, type WorkoutSet } from './workout.ts';

type LoggerProps = {
  workout: Workout;
  unit: WeightUnit;
  saving: boolean;
  error: boolean;
  finishing: boolean;
  onChange: (workout: Workout) => void;
  onFinish: () => void;
  onAddExercise: () => void;
};

export function WorkoutLogger({ workout, unit, saving, error, finishing, onChange, onFinish, onAddExercise }: LoggerProps) {
  const { palette } = useAppearance();
  const { fontScale } = useWindowDimensions();
  const total = workout.exercises.reduce((count, exercise) => count + exercise.sets.length, 0);

  function changeExercise(changed: WorkoutExercise) {
    onChange({ ...workout, exercises: workout.exercises.map((exercise) => exercise.id === changed.id ? changed : exercise) });
  }

  return (
    <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.bar, { backgroundColor: palette.bg }]}>
        <View style={[styles.top, fontScale >= layout.largerTextFrom ? styles.topLarge : null]}>
          <WorkoutClock startedAt={workout.startedAt} />
          <Text accessibilityRole="header" style={[type.headline, styles.title, { color: palette.label }]}>Empty workout</Text>
          <Button palette={palette} label="Finish" onPress={onFinish} busy={finishing} minHeight={layout.minTouch} />
        </View>
        <Text style={[type.footnote, { color: palette.secondary }]}>{completedSets(workout)} of {total} sets done</Text>
        {error ? (
          <Button palette={palette} label="Save failed. Retry" variant="quiet" onPress={() => onChange(workout)} />
        ) : <Text accessibilityLiveRegion="polite" style={[type.caption, { color: palette.secondary }]}>{saving ? 'Saving on this phone…' : 'Saved on this phone'}</Text>}
      </View>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.content}>
        {workout.exercises.length === 0 ? <Text style={[type.body, { color: palette.secondary }]}>Add your first exercise to get started.</Text> : null}
        {workout.exercises.map((exercise) => (
          <ExerciseCard key={exercise.id} exercise={exercise} unit={unit} disabled={finishing} onChange={changeExercise} />
        ))}
        <Button palette={palette} label="Add exercise" variant="quiet" onPress={onAddExercise} disabled={finishing} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function ExerciseCard({ exercise, unit, disabled, onChange }: { exercise: WorkoutExercise; unit: WeightUnit; disabled: boolean; onChange: (exercise: WorkoutExercise) => void }) {
  const { palette } = useAppearance();
  const entry = findExercise(exercise.exerciseId);

  function changeSet(changed: WorkoutSet) {
    onChange({ ...exercise, sets: exercise.sets.map((set) => set.id === changed.id ? changed : set) });
  }

  return (
    <View style={[styles.card, { backgroundColor: palette.card }]}>
      <Text accessibilityRole="header" style={[type.headline, { color: palette.label }]}>{entry?.name ?? 'Exercise unavailable'}</Text>
      <Text style={[type.footnote, { color: palette.secondary }]}>{entry === undefined ? exercise.exerciseId : displayEquipment(entry.equipment)}</Text>
      {exercise.sets.map((set, index) => <SetRow key={set.id} set={set} index={index} unit={unit} disabled={disabled} onChange={changeSet} />)}
      <Button palette={palette} label={`Add set to ${entry?.name ?? 'exercise'}`} variant="quiet" disabled={disabled} onPress={() => onChange({ ...exercise, sets: [...exercise.sets, { id: WorkoutSetId.parse(uuid.v4()), reps: '', weight: '', unit, done: false }] })} />
    </View>
  );
}

function SetRow({ set, index, unit, disabled, onChange }: { set: WorkoutSet; index: number; unit: WeightUnit; disabled: boolean; onChange: (set: WorkoutSet) => void }) {
  const { palette } = useAppearance();
  const { fontScale } = useWindowDimensions();
  const label = `Set ${index + 1}`;
  const wideText = fontScale >= layout.largerTextFrom;

  return (
    <View style={[styles.set, wideText ? styles.setLarge : null]}>
      <Text style={[type.subheadline, { color: palette.secondary }]}>{index + 1}</Text>
      <View style={styles.fields}>
        <View style={styles.fieldGroup}>
          <Text style={[type.caption, { color: palette.secondary }]}>{unit} (optional)</Text>
          <TextInput accessibilityLabel={`${label} weight in ${unit}`} editable={!disabled && !set.done} keyboardType="decimal-pad" value={weightInUnit(set, unit)} placeholder="—" placeholderTextColor={palette.secondary} onChangeText={(weight) => onChange({ ...set, weight, unit })} style={[type.body, styles.input, { color: palette.label, backgroundColor: palette.bg }]} />
        </View>
        <View style={styles.fieldGroup}>
          <Text style={[type.caption, { color: palette.secondary }]}>Reps</Text>
          <TextInput accessibilityLabel={`${label} reps`} editable={!disabled && !set.done} keyboardType="number-pad" value={set.reps} placeholder="0" placeholderTextColor={palette.secondary} onChangeText={(reps) => onChange({ ...set, reps })} style={[type.body, styles.input, { color: palette.label, backgroundColor: palette.bg }]} />
        </View>
      </View>
      <PressableScale accessibilityRole="checkbox" accessibilityLabel={`${label} done`} accessibilityState={{ checked: set.done, disabled: disabled || !validSet(set) }} disabled={disabled || !validSet(set)} haptic="none" onPress={() => onChange({ ...set, done: !set.done })} style={[styles.check, { backgroundColor: set.done ? palette.accent : palette.accentSoft }]}>
        <Text style={[type.headline, { color: set.done ? palette.onAccent : palette.accent }]}>{set.done ? '✓' : '○'}</Text>
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  bar: { paddingHorizontal: layout.screenMargin, paddingTop: space.md, paddingBottom: space.sm, gap: space.xs },
  top: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: space.sm },
  topLarge: { flexDirection: 'column', alignItems: 'stretch' },
  title: { flexGrow: 1, flexShrink: 1, textAlign: 'center' },
  content: { padding: layout.screenMargin, paddingBottom: layout.tabBarHeight + layout.tabBarBottom + space.xxl, gap: space.lg },
  card: { borderRadius: radius.card, padding: space.lg, gap: space.sm },
  set: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  setLarge: { flexWrap: 'wrap' },
  fields: { flex: 1, flexDirection: 'row', gap: space.sm },
  fieldGroup: { flex: 1, gap: space.xxs },
  input: { minHeight: layout.minTouch, paddingHorizontal: space.sm, paddingVertical: space.sm, borderRadius: radius.field, textAlign: 'center', fontVariant: ['tabular-nums'] },
  check: { minWidth: layout.minTouch, minHeight: layout.minTouch, alignItems: 'center', justifyContent: 'center', borderRadius: radius.capsule },
});
