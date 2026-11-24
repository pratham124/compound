import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View, useWindowDimensions, type LayoutChangeEvent } from 'react-native';
import type { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { Easing, interpolateColor, ReduceMotion, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { PressableScale } from '../components/PressableScale.tsx';
import { displayEquipment, findExercise } from '../exercises/catalogue.ts';
import { layout, press, radius, space, type } from '../theme/tokens.ts';
import { useAppearance } from '../theme/useAppearance.ts';
import { closeGap, FLASH_MS } from './loggerMotion.ts';
import { SetRow } from './SetRow.tsx';
import { showWorkoutMenu } from './workoutMenu.ts';
import type { WorkoutEdit } from './workoutEdit.ts';
import type { WorkoutRemoval } from './workoutRemoval.ts';
import { uuidv7 } from '../localDatabase/uuidv7.ts';
import { WorkoutSetId, type WeightUnit, type WorkoutExercise, type WorkoutExerciseId } from './workout.ts';

const DOT_X = [5, 12, 19];

type ExerciseCardProps = {
  exercise: WorkoutExercise;
  unit: WeightUnit;
  disabled: boolean;
  flashToken: number;
  upNext: WorkoutSetId | null;
  onLaidOut: (id: WorkoutExerciseId, top: number) => void;
  onEdit: (edit: WorkoutEdit) => void;
  onRemove: (removal: WorkoutRemoval) => void;
};

export function ExerciseCard({ exercise, unit, disabled, flashToken, upNext, onLaidOut, onEdit, onRemove }: ExerciseCardProps) {
  const { palette } = useAppearance();
  const router = useRouter();
  const entry = findExercise(exercise.exerciseId);
  const { fontScale } = useWindowDimensions();
  const large = fontScale >= layout.largerTextFrom;
  const rows = useRef(new Map<WorkoutSetId, SwipeableMethods>());
  const name = entry?.name ?? 'Exercise unavailable';
  const flash = useSharedValue(0);
  const cardStyle = useAnimatedStyle(() => ({ backgroundColor: interpolateColor(flash.get(), [0, 1], [palette.card, palette.accentSoft]) }));

  useEffect(() => {
    if (flashToken > 0) {
      flash.set(1);
      flash.set(withTiming(0, { duration: FLASH_MS, easing: Easing.bezier(...press.easing), reduceMotion: ReduceMotion.Never }));
    }
  }, [flashToken, flash]);

  function closeOtherRows(openId: WorkoutSetId) {
    for (const [id, row] of rows.current) {
      if (id !== openId) {
        row.close();
      }
    }
  }

  function registerRow(setId: WorkoutSetId) {
    return (methods: SwipeableMethods | null) => {
      if (methods === null) {
        rows.current.delete(setId);
      } else {
        rows.current.set(setId, methods);
      }
    };
  }

  function reportLayout(event: LayoutChangeEvent) {
    onLaidOut(exercise.id, event.nativeEvent.layout.y);
  }

  function openInstructions() {
    if (entry !== undefined) {
      router.push({ pathname: '/exercises/[id]', params: { id: entry.id, from: 'workout' } });
    }
  }

  function openMenu() {
    showWorkoutMenu(exercise, name, onRemove);
  }

  function addSet() {
    onEdit({ kind: 'add-set', exerciseId: exercise.id, setId: WorkoutSetId.parse(uuidv7()), unit });
  }

  return (
    <Animated.View layout={closeGap} onLayout={reportLayout} style={[styles.card, cardStyle]}>
      <View style={styles.header}>
        <View style={styles.heading}>
          {entry === undefined ? (
            <Text accessibilityRole="header" style={[type.headline, { color: palette.label }]}>Exercise unavailable</Text>
          ) : (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={entry.name}
              accessibilityHint="Opens exercise instructions and pictures."
              accessibilityState={{ disabled }}
              disabled={disabled}
              onPress={openInstructions}
              style={styles.name}
            >
              <Text accessibilityRole="header" style={[type.headline, { color: palette.label }]}>{entry.name}</Text>
            </PressableScale>
          )}
          <Text style={[type.footnote, { color: palette.secondary }]}>
            {entry === undefined ? exercise.exerciseId : displayEquipment(entry.equipment)}
          </Text>
        </View>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`More for ${name}`}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={openMenu}
          style={styles.more}
        >
          <Svg width={22} height={22} viewBox="0 0 24 24" accessible={false}>
            {DOT_X.map((cx) => <Circle key={cx} cx={cx} cy={12} r={1.7} fill={palette.secondary} />)}
          </Svg>
        </PressableScale>
      </View>
      <View accessible={false} importantForAccessibility="no-hide-descendants" style={[styles.tableRow, styles.tableHeader]}>
        <Text style={[type.caption, styles.setNumber, large ? styles.setNumberLarge : null, { color: palette.secondary }]}>Set</Text>
        {large ? null : <Text style={[type.caption, styles.lastTime, { color: palette.secondary }]}>Last time</Text>}
        <Text style={[type.caption, large ? styles.flexColumn : styles.weightColumn, styles.columnTitle, { color: palette.secondary }]}>{unit}</Text>
        <Text style={[type.caption, large ? styles.flexColumn : styles.repsColumn, styles.columnTitle, { color: palette.secondary }]}>Reps</Text>
        <View style={styles.checkColumn} />
      </View>
      {exercise.sets.map((set, index) => (
        <SetRow
          key={set.id}
          exerciseId={exercise.id}
          set={set}
          index={index}
          upNext={set.id === upNext}
          unit={unit}
          disabled={disabled}
          onEdit={onEdit}
          onRemove={() => onRemove({ kind: 'set', exerciseId: exercise.id, setId: set.id })}
          onOpen={() => closeOtherRows(set.id)}
          register={registerRow(set.id)}
        />
      ))}
      <Animated.View layout={closeGap}>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel={`Add set to ${entry?.name ?? 'exercise'}`}
          accessibilityState={{ disabled }}
          disabled={disabled}
          onPress={addSet}
          style={styles.addSet}
        >
          <Text style={[type.callout, styles.strong, { color: palette.accent }]}>Add set</Text>
        </PressableScale>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, padding: layout.cardPadding, gap: space.xxs },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  heading: { flex: 1 },
  name: { minHeight: layout.minTouch, justifyContent: 'center' },
  more: { marginRight: -10, width: layout.minTouch, minHeight: layout.minTouch, alignItems: 'center', justifyContent: 'center' },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tableHeader: { marginTop: space.md },
  columnTitle: { textAlign: 'center' },
  setNumber: { width: 30 },
  setNumberLarge: { width: 44 },
  lastTime: { flex: 1, minWidth: 0, textAlign: 'center' },
  weightColumn: { width: 76 },
  repsColumn: { width: 66 },
  flexColumn: { flex: 1, minWidth: 0 },
  checkColumn: { width: layout.minTouch },
  addSet: { minHeight: layout.minTouch, alignItems: 'center', justifyContent: 'center', marginTop: space.xs },
  strong: { fontWeight: '600' },
});
