import type { ComponentProps, ReactNode } from 'react';
import { Pressable, type PressableProps } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

import { press } from '../theme/tokens.ts';

export type PressScaleProps = Omit<PressableProps, 'style' | 'children'> & {
  style: ComponentProps<typeof Animated.View>['style'];
  children: ReactNode;
};

const timing = { duration: press.durationMs, easing: Easing.bezier(...press.easing) };

/** A pressable that scales down the moment a finger lands and back on release, driven from the UI thread. */
export function PressScale({ style, children, ...pressable }: PressScaleProps) {
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <Pressable
      {...pressable}
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
    >
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}
