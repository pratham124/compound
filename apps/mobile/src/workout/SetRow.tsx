import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, useWindowDimensions, type AccessibilityActionEvent } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, { Easing, useReducedMotion, useSharedValue, withTiming, type ExitAnimationsValues, type LayoutAnimation, type SharedValue } from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { PressableScale } from '../components/PressableScale.tsx';
import { layout, press, radius, space, type } from '../theme/tokens.ts';
import { useAppearance } from '../theme/useAppearance.ts';
import { closeGap, ringFade, ROW_EXIT_MS, ROW_SLIDE_MS, upNextColour } from './loggerMotion.ts';
import { DELETE_WIDTH, SwipeDelete } from './SwipeDelete.tsx';
import { validSet, weightInUnit, type WeightUnit, type WorkoutSet } from './workout.ts';

const CHECK_PATH = 'M5 12.5l4.5 4.5L19 7.5';
const DELETE_ACTION = [{ name: 'delete', label: 'Delete set' }];

type TypingField = 'weight' | 'reps' | null;

type SetRowProps = {
  set: WorkoutSet;
  index: number;
  upNext: boolean;
  unit: WeightUnit;
  disabled: boolean;
  onChange: (set: WorkoutSet) => void;
  onRemove: () => void;
  onOpen: () => void;
  register: (methods: SwipeableMethods | null) => void;
};

export function SetRow({ set, index, upNext, unit, disabled, onChange, onRemove, onOpen, register }: SetRowProps) {
  const { palette } = useAppearance();
  const { fontScale } = useWindowDimensions();
  const label = `Set ${index + 1}`;
  const wideText = fontScale >= layout.largerTextFrom;
  const armed = useSharedValue(false);
  const rowWidth = useSharedValue(0);
  const [typing, setTyping] = useState<TypingField>(null);
  const reduceMotion = useReducedMotion();
  const canCheck = !disabled && validSet(set);

  // A full swipe keeps the row travelling the way the finger pushed it; any other removal just fades.
  const leave = (values: ExitAnimationsValues): LayoutAnimation => {
    'worklet';
    const slide = armed.get() && !reduceMotion ? -values.currentWidth : 0;

    return {
      initialValues: { opacity: 1, transform: [{ translateX: 0 }] },
      animations: {
        opacity: withTiming(0, { duration: ROW_EXIT_MS, easing: Easing.bezier(...press.easing) }),
        transform: [{ translateX: withTiming(slide, { duration: ROW_SLIDE_MS, easing: Easing.bezier(...press.easing) }) }],
      },
    };
  };

  function removeIfFullySwiped() {
    if (armed.get()) {
      onRemove();
    }
  }

  function deleteFromAccessibility(event: AccessibilityActionEvent) {
    if (event.nativeEvent.actionName === 'delete' && !disabled) {
      onRemove();
    }
  }

  function toggleDone() {
    if (!set.done) {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    onChange({ ...set, done: !set.done });
  }

  function changeWeight(weight: string) {
    onChange({ ...set, weight, unit });
  }

  function changeReps(reps: string) {
    onChange({ ...set, reps });
  }

  function renderDelete(_progress: SharedValue<number>, translation: SharedValue<number>) {
    return <SwipeDelete translation={translation} armed={armed} rowWidth={rowWidth} onDelete={onRemove} />;
  }

  return (
    <Animated.View layout={closeGap} exiting={leave}>
      <ReanimatedSwipeable
        ref={register}
        enabled={!disabled}
        rightThreshold={DELETE_WIDTH / 2}
        dragOffsetFromRight={-20}
        onSwipeableOpenStartDrag={onOpen}
        onSwipeableWillOpen={removeIfFullySwiped}
        containerStyle={styles.swipeRow}
        childrenContainerStyle={{ backgroundColor: palette.card }}
        renderRightActions={renderDelete}
      >
        <View onLayout={(event) => rowWidth.set(event.nativeEvent.layout.width)}>
          <View style={[styles.tableRow, styles.set]}>
            <View
              accessible
              accessibilityLabel={label}
              accessibilityValue={upNext ? { text: 'Up next' } : undefined}
              accessibilityActions={DELETE_ACTION}
              onAccessibilityAction={deleteFromAccessibility}
              style={[styles.setNumber, wideText ? styles.setNumberLarge : null]}
            >
              <Animated.Text style={[type.body, styles.strong, upNextColour, { color: upNext ? palette.accent : palette.label }]}>
                {index + 1}
              </Animated.Text>
            </View>
            {wideText ? null : (
              <Text accessibilityLabel="No previous set available" style={[type.subheadline, styles.lastTime, { color: palette.secondary }]}>—</Text>
            )}
            <View style={wideText ? styles.flexColumn : styles.weightColumn}>
              <TextInput
                accessibilityLabel={`${label} weight in ${unit}`}
                accessibilityHint="Optional; leave blank for bodyweight."
                editable={!disabled && !set.done}
                keyboardType="decimal-pad"
                value={weightInUnit(set, unit)}
                placeholder="—"
                placeholderTextColor={palette.secondary}
                onFocus={() => setTyping('weight')}
                onBlur={() => setTyping(null)}
                onChangeText={changeWeight}
                style={[type.body, styles.input, { color: palette.label, backgroundColor: palette.bg }]}
              />
              <Animated.View
                pointerEvents="none"
                style={[styles.focusRing, ringFade, { borderColor: palette.accent, opacity: typing === 'weight' ? 1 : 0 }]}
              />
            </View>
            <View style={wideText ? styles.flexColumn : styles.repsColumn}>
              <TextInput
                accessibilityLabel={`${label} reps`}
                editable={!disabled && !set.done}
                keyboardType="number-pad"
                value={set.reps}
                placeholder="0"
                placeholderTextColor={palette.secondary}
                onFocus={() => setTyping('reps')}
                onBlur={() => setTyping(null)}
                onChangeText={changeReps}
                style={[type.body, styles.input, { color: palette.label, backgroundColor: palette.bg }]}
              />
              <Animated.View
                pointerEvents="none"
                style={[styles.focusRing, ringFade, { borderColor: palette.accent, opacity: typing === 'reps' ? 1 : 0 }]}
              />
            </View>
            <PressableScale
              accessibilityRole="checkbox"
              accessibilityLabel={`${label} done`}
              accessibilityState={{ checked: set.done, disabled: !canCheck }}
              disabled={!canCheck}
              haptic="none"
              onPress={toggleDone}
              style={styles.checkTarget}
            >
              <View
                style={[
                  styles.checkCircle,
                  {
                    borderColor: set.done ? palette.accent : palette.separatorStrong,
                    backgroundColor: set.done ? palette.accent : 'transparent',
                  },
                ]}
              >
                {set.done ? (
                  <Svg width={16} height={16} viewBox="0 0 24 24" accessible={false}>
                    <Path
                      d={CHECK_PATH}
                      fill="none"
                      stroke={palette.onAccent}
                      strokeWidth={3}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </Svg>
                ) : null}
              </View>
            </PressableScale>
          </View>
          {wideText ? (
            <Text style={[type.footnote, styles.previousLarge, { color: palette.secondary }]}>Last time —</Text>
          ) : null}
        </View>
      </ReanimatedSwipeable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  swipeRow: { borderRadius: radius.field },
  tableRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  set: { minHeight: 52, paddingVertical: space.xs },
  setNumber: { width: 30 },
  setNumberLarge: { width: 44 },
  strong: { fontWeight: '600' },
  lastTime: { flex: 1, minWidth: 0, textAlign: 'center' },
  weightColumn: { width: 76 },
  repsColumn: { width: 66 },
  flexColumn: { flex: 1, minWidth: 0 },
  input: {
    minHeight: layout.fieldHeight,
    paddingHorizontal: space.xs,
    paddingVertical: space.xs,
    borderRadius: radius.field,
    textAlign: 'center',
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  focusRing: { ...StyleSheet.absoluteFill, borderRadius: radius.field, borderWidth: 2 },
  checkTarget: { width: layout.minTouch, minHeight: layout.minTouch, alignItems: 'center', justifyContent: 'center' },
  checkCircle: { width: 28, height: 28, borderWidth: 2, borderRadius: radius.capsule, alignItems: 'center', justifyContent: 'center' },
  previousLarge: { paddingLeft: 36, paddingBottom: space.xs },
});
