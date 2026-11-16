import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, Text } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { useReduceMotion } from '../accessibility/useReduceMotion.ts';
import { motion, press, type } from '../theme/tokens.ts';
import { groupRow } from './groupRow.ts';
import { createPressTracker } from './pressTracker.ts';
import { PressScale } from './PressScale.tsx';

export const HOLD_FILL_TEST_ID = 'hold-fill';

export type HoldToConfirmRowProps = {
  label: string;
  labelColor: string;
  /** What fills the row while it is held. */
  tint: string;
  /** How long the row has to be held. */
  durationMs: number;
  disabled: boolean;
  /** Tells screen reader users how to hold: their double-tap-and-hold passes the press through. */
  accessibilityHint: string;
  /** The hold finished. */
  onConfirm: () => void;
  /** A tap, or a hold let go of before it finished. Not called when a scroll takes the touch away. */
  onReleasedEarly: () => void;
  /** A new press started, so any message left by the last one can go. */
  onPressStart: () => void;
};

const hold = (durationMs: number) => ({ duration: durationMs, easing: Easing.linear });

// Slow while the person is deciding, fast when they let go.
const release = { duration: motion.holdReleaseMs, easing: Easing.bezier(...press.easing) };

/**
 * A button row that fills from the left while it is held and confirms when the fill reaches the end. The fill moves
 * with transform only, on the UI thread. Under Reduce Motion it fades in over the same time instead of sweeping.
 */
export function HoldToConfirmRow({
  label,
  labelColor,
  tint,
  durationMs,
  disabled,
  accessibilityHint,
  onConfirm,
  onReleasedEarly,
  onPressStart,
}: HoldToConfirmRowProps) {
  const reduceMotion = useReduceMotion();
  const progress = useSharedValue(0);
  const width = useSharedValue(0);
  const [tracker] = useState(createPressTracker);

  const fillStyle = useAnimatedStyle(() =>
    reduceMotion
      ? { opacity: progress.get() }
      : {
          // Until the row has been measured the fill would sit across all of it, so it stays hidden.
          opacity: width.get() === 0 ? 0 : 1,
          transform: [{ translateX: (progress.get() - 1) * width.get() }],
        },
  );

  function holdFinished(id: number) {
    // A release (or a newer press) that got here first has already decided this press, so it can't confirm.
    if (tracker.tryConfirm(id)) {
      // A warning, not a success, until deleting is real: the outcome so far is "not available yet".
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      onConfirm();
      progress.set(withTiming(0, release));
    }
  }

  function pressStart() {
    const id = tracker.start();

    onPressStart();
    progress.set(
      withTiming(1, hold(durationMs), (finished) => {
        if (finished) {
          scheduleOnRN(holdFinished, id);
        }
      }),
    );
  }

  function pressEnd() {
    tracker.end();
    progress.set(withTiming(0, release));
  }

  // onPress only fires for a real release, so a scroll that takes the touch away doesn't show the hint.
  function pressed() {
    if (!tracker.confirmed()) {
      onReleasedEarly();
    }
  }

  return (
    <PressScale
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPressIn={pressStart}
      onPress={pressed}
      onPressOut={pressEnd}
      style={[groupRow, styles.row]}
    >
      <Animated.View
        pointerEvents="none"
        testID={HOLD_FILL_TEST_ID}
        onLayout={(event: LayoutChangeEvent) => width.set(event.nativeEvent.layout.width)}
        style={[styles.fill, { backgroundColor: tint }, fillStyle]}
      />
      <Text style={[type.body, styles.label, { color: labelColor }]}>{label}</Text>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  row: { overflow: 'hidden' },
  fill: { ...StyleSheet.absoluteFill },
  label: { fontWeight: '600' },
});
