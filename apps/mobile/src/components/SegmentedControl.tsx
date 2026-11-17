import * as Haptics from 'expo-haptics';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useReduceMotion } from '../accessibility/useReduceMotion.ts';
import { layout, motion, radius, shadow, type, type Palette } from '../theme/tokens.ts';
import { PressScale } from './PressScale.tsx';

export type SegmentOption<Value extends string> = { value: Value; label: string };

export type SegmentedControlProps<Value extends string> = {
  palette: Palette;
  /** What the choice is, for screen readers (the visible label sits beside the control). */
  label: string;
  options: readonly [SegmentOption<Value>, SegmentOption<Value>];
  selected: Value;
  disabled: boolean;
  onChoose: (value: Value) => void;
};

/** Half the track inside its inset: how wide the thumb is, and how far it travels. */
export const THUMB_WIDTH = (layout.segmentWidth - 2 * layout.segmentInset) / 2;

export const THUMB_TEST_ID = 'segment-thumb';

const slide = { duration: motion.segmentSlideMs, easing: Easing.bezier(...motion.segmentSlideEasing) };

/**
 * Two choices in a capsule track (`.segc` in the mockup). One raised thumb slides under the chosen label, on the UI thread
 * with transform only, and stays interruptible because a new target retargets from where the thumb is. Under Reduce Motion
 * the thumb jumps; the label colours still change.
 */
export function SegmentedControl<Value extends string>({
  palette,
  label,
  options,
  selected,
  disabled,
  onChoose,
}: SegmentedControlProps<Value>) {
  const reduceMotion = useReduceMotion();
  const index = options[1].value === selected ? 1 : 0;
  const position = useSharedValue(index);

  useEffect(() => {
    position.set(reduceMotion ? index : withTiming(index, slide));
  }, [index, reduceMotion, position]);

  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: position.get() * THUMB_WIDTH }] }));

  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={[styles.track, { backgroundColor: palette.bg }]}>
      <Animated.View
        pointerEvents="none"
        testID={THUMB_TEST_ID}
        style={[styles.thumb, { backgroundColor: palette.card }, shadow.segment, thumbStyle]}
      />
      {options.map(({ value, label: text }, slot) => (
        <SegmentLabel
          key={value}
          palette={palette}
          position={position}
          slot={slot}
          checked={value === selected}
          disabled={disabled}
          onPress={() => {
            // A tick only when the choice changes, like the system's own segmented controls.
            if (value !== selected) {
              void Haptics.selectionAsync();
            }

            onChoose(value);
          }}
        >
          {text}
        </SegmentLabel>
      ))}
    </View>
  );
}

type SegmentLabelProps = {
  palette: Palette;
  position: ReturnType<typeof useSharedValue<number>>;
  slot: number;
  checked: boolean;
  disabled: boolean;
  onPress: () => void;
  children: string;
};

function SegmentLabel({ palette, position, slot, checked, disabled, onPress, children }: SegmentLabelProps) {
  // The colour follows the thumb's position, so the label and the slide stay in step.
  const colorStyle = useAnimatedStyle(() => ({
    color: interpolateColor(position.get(), [0, 1], slot === 0 ? [palette.label, palette.secondary] : [palette.secondary, palette.label]),
  }));

  return (
    <PressScale
      accessibilityRole="radio"
      accessibilityState={{ checked, disabled }}
      haptic="none"
      disabled={disabled}
      onPress={onPress}
      pressableStyle={styles.slot}
      style={styles.segment}
    >
      <Animated.Text style={[type.subheadline, styles.text, colorStyle]}>{children}</Animated.Text>
    </PressScale>
  );
}

const styles = StyleSheet.create({
  track: {
    width: layout.segmentWidth,
    flexDirection: 'row',
    padding: layout.segmentInset,
    borderRadius: radius.capsule,
  },
  thumb: {
    position: 'absolute',
    top: layout.segmentInset,
    left: layout.segmentInset,
    bottom: layout.segmentInset,
    width: THUMB_WIDTH,
    borderRadius: radius.capsule,
  },
  slot: { flex: 1 },
  segment: {
    flexGrow: 1,
    minHeight: layout.minTouch,
    borderRadius: radius.capsule,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontWeight: '600' },
});
