import * as Haptics from 'expo-haptics';
import type { ComponentProps, ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { press } from '../theme/tokens.ts';

export type PressScaleProps = Omit<PressableProps, 'style' | 'children'> & {
  style: ComponentProps<typeof Animated.View>['style'];
  /** Sizes the touch target itself, e.g. `flex: 1` in a row. `style` only shapes the scaled view inside it. */
  pressableStyle?: StyleProp<ViewStyle>;
  /** A light tap on a real press, not when the finger lands, so a scroll that starts on the button stays silent. Turn it off where something else already gives feedback. */
  haptic?: 'light' | 'none';
  children: ReactNode;
};

const timing = { duration: press.durationMs, easing: Easing.bezier(...press.easing) };

/** A pressable that scales down the moment a finger lands and back on release, driven from the UI thread. */
export function PressScale({ style, pressableStyle, haptic = 'light', children, ...pressable }: PressScaleProps) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <Pressable
      {...pressable}
      style={pressableStyle}
      onPressIn={(event) => {
        if (!reduceMotion) {
          scale.set(withTiming(press.scale, timing));
        }

        pressable.onPressIn?.(event);
      }}
      onPressOut={(event) => {
        scale.set(withTiming(1, timing));
        pressable.onPressOut?.(event);
      }}
      onPress={(event) => {
        if (haptic === 'light') {
          void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        pressable.onPress?.(event);
      }}
    >
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}
